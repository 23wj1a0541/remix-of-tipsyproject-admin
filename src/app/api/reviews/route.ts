import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews, users, restaurants, staff, tips } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

// Helper function to get current authenticated user
async function getCurrentUser(request: NextRequest) {
  // TODO: Replace with actual better-auth integration
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  // For demo purposes, using token as auth user ID
  
  // Find or create user profile using auth user ID
  let userProfile = await db.select()
    .from(users)
    .where(eq(users.authUserId, token))
    .limit(1);

  if (userProfile.length === 0) {
    // Auto-create user record with default role "worker"
    const newUser = await db.insert(users)
      .values({
        authUserId: token,
        role: 'worker',
        name: `User ${token}`,
        email: `${token}@example.com`,
        createdAt: new Date()
      })
      .returning();

    userProfile = newUser;
  }

  return userProfile[0];
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    let reviewsQuery;

    if (user.role === 'worker') {
      // Workers see their own reviews
      reviewsQuery = db.select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        status: reviews.status,
        createdAt: reviews.createdAt,
        restaurant: {
          id: restaurants.id,
          name: restaurants.name
        },
        tip: {
          id: tips.id,
          amountCents: tips.amountCents,
          payerName: tips.payerName
        }
      })
      .from(reviews)
      .leftJoin(restaurants, eq(reviews.restaurantId, restaurants.id))
      .leftJoin(tips, eq(reviews.tipId, tips.id))
      .where(eq(reviews.workerUserId, user.id))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    } else if (user.role === 'owner' && restaurantId) {
      // Owners see reviews for their restaurant staff
      const restId = parseInt(restaurantId);
      
      // Check if user owns the restaurant
      const restaurant = await db.select()
        .from(restaurants)
        .where(eq(restaurants.id, restId))
        .limit(1);

      if (restaurant.length === 0 || restaurant[0].ownerUserId !== user.id) {
        return NextResponse.json({ 
          error: 'Access denied or restaurant not found',
          code: 'ACCESS_DENIED' 
        }, { status: 403 });
      }

      reviewsQuery = db.select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        status: reviews.status,
        createdAt: reviews.createdAt,
        worker: {
          id: users.id,
          name: users.name
        },
        tip: {
          id: tips.id,
          amountCents: tips.amountCents,
          payerName: tips.payerName
        }
      })
      .from(reviews)
      .leftJoin(users, eq(reviews.workerUserId, users.id))
      .leftJoin(tips, eq(reviews.tipId, tips.id))
      .where(eq(reviews.restaurantId, restId))
      .orderBy(desc(reviews.createdAt))
      .limit(limit)
      .offset(offset);

    } else {
      return NextResponse.json({ 
        error: 'Invalid request. Workers see their reviews, owners need restaurantId',
        code: 'INVALID_REQUEST' 
      }, { status: 400 });
    }

    const reviewsList = await reviewsQuery;
    return NextResponse.json(reviewsList);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Public endpoint for customers to add reviews
    const requestBody = await request.json();
    const { tip_id, qr_slug, rating, comment } = requestBody;

    // Validate required fields
    if (!rating || typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: "Valid rating (1-5) is required",
        code: "INVALID_RATING" 
      }, { status: 400 });
    }

    // Must provide either tip_id or qr_slug
    if (!tip_id && !qr_slug) {
      return NextResponse.json({ 
        error: "Either tip_id or qr_slug is required",
        code: "MISSING_REFERENCE" 
      }, { status: 400 });
    }

    let workerUserId, restaurantId, tipId = null;

    if (tip_id) {
      // Find tip and get worker/restaurant info
      const tip = await db.select({
        id: tips.id,
        workerUserId: tips.workerUserId,
        restaurantId: tips.restaurantId
      })
      .from(tips)
      .where(eq(tips.id, parseInt(tip_id)))
      .limit(1);

      if (tip.length === 0) {
        return NextResponse.json({ 
          error: 'Tip not found',
          code: 'TIP_NOT_FOUND' 
        }, { status: 404 });
      }

      workerUserId = tip[0].workerUserId;
      restaurantId = tip[0].restaurantId;
      tipId = tip[0].id;

    } else if (qr_slug) {
      // Find staff by QR slug
      const staffRecord = await db.select({
        userId: staff.userId,
        restaurantId: staff.restaurantId
      })
      .from(staff)
      .where(eq(staff.qrSlug, qr_slug))
      .limit(1);

      if (staffRecord.length === 0) {
        return NextResponse.json({ 
          error: 'Invalid QR code',
          code: 'INVALID_QR_SLUG' 
        }, { status: 404 });
      }

      workerUserId = staffRecord[0].userId;
      restaurantId = staffRecord[0].restaurantId;
    }

    // Create review
    const newReview = await db.insert(reviews)
      .values({
        workerUserId: workerUserId,
        restaurantId: restaurantId,
        rating: rating,
        comment: comment?.trim() || null,
        tipId: tipId,
        status: 'pending', // Reviews start as pending
        createdAt: new Date()
      })
      .returning();

    const review = newReview[0];

    // Get worker and restaurant details for response
    const workerDetails = await db.select({
      worker: {
        name: users.name
      },
      restaurant: {
        name: restaurants.name
      }
    })
    .from(users)
    .leftJoin(restaurants, eq(restaurants.id, restaurantId))
    .where(eq(users.id, workerUserId))
    .limit(1);

    const response = {
      review: {
        id: review.id,
        rating: review.rating,
        comment: review.comment,
        status: review.status,
        createdAt: review.createdAt
      },
      worker: workerDetails[0]?.worker || null,
      restaurant: workerDetails[0]?.restaurant || null
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}