import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tips, users, restaurants, staff, reviews, notifications } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get tips for current user (worker role only)
    const userTips = await db.select({
      id: tips.id,
      amountCents: tips.amountCents,
      currency: tips.currency,
      payerName: tips.payerName,
      message: tips.message,
      rating: tips.rating,
      createdAt: tips.createdAt,
      restaurant: {
        id: restaurants.id,
        name: restaurants.name
      }
    })
    .from(tips)
    .leftJoin(restaurants, eq(tips.restaurantId, restaurants.id))
    .where(eq(tips.workerUserId, user.id))
    .orderBy(desc(tips.createdAt))
    .limit(limit)
    .offset(offset);

    return NextResponse.json(userTips);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // This is a public endpoint (no auth required) for customers to submit tips
    const requestBody = await request.json();
    const { 
      qr_slug, 
      amount_cents, 
      currency = 'INR', 
      payer_name, 
      message, 
      rating 
    } = requestBody;

    // Validate required fields
    if (!qr_slug || typeof qr_slug !== 'string') {
      return NextResponse.json({ 
        error: "QR slug is required",
        code: "MISSING_QR_SLUG" 
      }, { status: 400 });
    }

    if (!amount_cents || typeof amount_cents !== 'number' || amount_cents <= 0) {
      return NextResponse.json({ 
        error: "Valid amount in cents is required",
        code: "INVALID_AMOUNT" 
      }, { status: 400 });
    }

    // Validate rating if provided
    if (rating !== undefined && (typeof rating !== 'number' || rating < 1 || rating > 5)) {
      return NextResponse.json({ 
        error: "Rating must be between 1 and 5",
        code: "INVALID_RATING" 
      }, { status: 400 });
    }

    // Find staff record by QR slug to get worker and restaurant
    const staffRecord = await db.select({
      staffId: staff.id,
      userId: staff.userId,
      restaurantId: staff.restaurantId,
      workerName: users.name,
      restaurantName: restaurants.name
    })
    .from(staff)
    .innerJoin(users, eq(staff.userId, users.id))
    .innerJoin(restaurants, eq(staff.restaurantId, restaurants.id))
    .where(eq(staff.qrSlug, qr_slug))
    .limit(1);

    if (staffRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Invalid QR code',
        code: 'INVALID_QR_SLUG' 
      }, { status: 404 });
    }

    const worker = staffRecord[0];

    // Create tip record
    const newTip = await db.insert(tips)
      .values({
        workerUserId: worker.userId,
        restaurantId: worker.restaurantId,
        amountCents: amount_cents,
        currency: currency || 'INR',
        payerName: payer_name?.trim() || null,
        message: message?.trim() || null,
        rating: rating || null,
        createdAt: new Date()
      })
      .returning();

    const tip = newTip[0];

    // Create notification for worker about the tip
    await db.insert(notifications)
      .values({
        userId: worker.userId,
        type: 'tip_received',
        title: 'New Tip Received!',
        body: `You received a tip of ₹${(amount_cents / 100).toFixed(2)} ${payer_name ? 'from ' + payer_name : ''}${message ? ': "' + message + '"' : ''}`,
        read: false,
        createdAt: new Date()
      });

    // If rating provided, create review record
    let review = null;
    if (rating && rating >= 1 && rating <= 5) {
      const newReview = await db.insert(reviews)
        .values({
          workerUserId: worker.userId,
          restaurantId: worker.restaurantId,
          rating: rating,
          comment: message?.trim() || null,
          tipId: tip.id,
          status: 'pending', // Reviews start as pending and need moderation
          createdAt: new Date()
        })
        .returning();

      review = newReview[0];

      // Create notification about new review
      await db.insert(notifications)
        .values({
          userId: worker.userId,
          type: 'review_posted',
          title: 'New Review Received',
          body: `You received a ${rating}-star review${payer_name ? ' from ' + payer_name : ''}`,
          read: false,
          createdAt: new Date()
        });
    }

    const response = {
      tip: {
        id: tip.id,
        amountCents: tip.amountCents,
        currency: tip.currency,
        payerName: tip.payerName,
        message: tip.message,
        rating: tip.rating,
        createdAt: tip.createdAt
      },
      worker: {
        name: worker.workerName
      },
      restaurant: {
        name: worker.restaurantName
      },
      review: review ? {
        id: review.id,
        rating: review.rating,
        status: review.status
      } : null
    };

    return NextResponse.json(response, { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}