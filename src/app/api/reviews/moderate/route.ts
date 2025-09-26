import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { reviews, users, restaurants } from '@/db/schema';
import { eq } from 'drizzle-orm';

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

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners and admins can moderate reviews
    if (user.role !== 'owner' && user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Access denied. Owner or admin role required.',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const requestBody = await request.json();
    const { reviewId, action } = requestBody;

    // Security check: reject if user ID provided in body
    if ('userId' in requestBody || 'user_id' in requestBody || 'moderatedByUserId' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!reviewId || isNaN(parseInt(reviewId))) {
      return NextResponse.json({ 
        error: "Valid review ID is required",
        code: "MISSING_REVIEW_ID" 
      }, { status: 400 });
    }

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json({ 
        error: "Action must be 'approve' or 'reject'",
        code: "INVALID_ACTION" 
      }, { status: 400 });
    }

    const revId = parseInt(reviewId);

    // Get review with restaurant details
    const reviewRecord = await db.select({
      review: reviews,
      restaurant: restaurants
    })
    .from(reviews)
    .leftJoin(restaurants, eq(reviews.restaurantId, restaurants.id))
    .where(eq(reviews.id, revId))
    .limit(1);

    if (reviewRecord.length === 0) {
      return NextResponse.json({ 
        error: 'Review not found',
        code: 'REVIEW_NOT_FOUND' 
      }, { status: 404 });
    }

    const record = reviewRecord[0];

    // Check permissions
    if (user.role === 'owner') {
      // Owners can only moderate reviews for their restaurant staff
      if (!record.restaurant || record.restaurant.ownerUserId !== user.id) {
        return NextResponse.json({ 
          error: 'Access denied. You can only moderate reviews for your restaurant staff.',
          code: 'ACCESS_DENIED' 
        }, { status: 403 });
      }
    }
    // Admins can moderate any review (no additional check needed)

    // Update review status
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    const updatedReview = await db.update(reviews)
      .set({
        status: newStatus,
        moderatedByUserId: user.id
      })
      .where(eq(reviews.id, revId))
      .returning();

    if (updatedReview.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update review',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    // Get complete updated review with details
    const reviewWithDetails = await db.select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      status: reviews.status,
      createdAt: reviews.createdAt,
      moderatedBy: {
        id: users.id,
        name: users.name
      },
      worker: {
        name: users.name
      },
      restaurant: {
        name: restaurants.name
      }
    })
    .from(reviews)
    .leftJoin(users, eq(reviews.moderatedByUserId, users.id))
    .leftJoin(users.as('worker_user'), eq(reviews.workerUserId, users.id))
    .leftJoin(restaurants, eq(reviews.restaurantId, restaurants.id))
    .where(eq(reviews.id, revId))
    .limit(1);

    const response = {
      ...updatedReview[0],
      moderationAction: action,
      moderatedBy: {
        id: user.id,
        name: user.name
      }
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}