import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staff, users, restaurants, reviews } from '@/db/schema';
import { eq, and, desc, avg } from 'drizzle-orm';

export async function GET(
  request: NextRequest,
  { params }: { params: { qr_slug: string } }
) {
  try {
    const { qr_slug } = params;

    if (!qr_slug) {
      return NextResponse.json({ 
        error: "QR slug is required",
        code: "MISSING_QR_SLUG" 
      }, { status: 400 });
    }

    // Find staff record by QR slug with worker and restaurant details
    const staffRecord = await db
      .select({
        staffId: staff.id,
        roleInRestaurant: staff.roleInRestaurant,
        joinedAt: staff.joinedAt,
        workerName: users.name,
        workerAvatarUrl: users.avatarUrl,
        workerUserId: users.id,
        restaurantId: restaurants.id,
        restaurantName: restaurants.name,
        restaurantAddress: restaurants.address,
        restaurantUpiHandle: restaurants.upiHandle,
      })
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .innerJoin(restaurants, eq(staff.restaurantId, restaurants.id))
      .where(eq(staff.qrSlug, qr_slug))
      .limit(1);

    if (staffRecord.length === 0) {
      return NextResponse.json({ 
        error: 'QR slug not found' 
      }, { status: 404 });
    }

    const worker = staffRecord[0];

    // Get average rating for the worker from approved reviews
    const avgRatingResult = await db
      .select({
        avgRating: avg(reviews.rating)
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.workerUserId, worker.workerUserId),
          eq(reviews.status, 'approved')
        )
      );

    const averageRating = avgRatingResult[0]?.avgRating ? 
      Number(avgRatingResult[0].avgRating) : 0;

    // Get recent approved reviews (limit 3)
    const recentReviews = await db
      .select({
        id: reviews.id,
        rating: reviews.rating,
        comment: reviews.comment,
        createdAt: reviews.createdAt,
      })
      .from(reviews)
      .where(
        and(
          eq(reviews.workerUserId, worker.workerUserId),
          eq(reviews.status, 'approved')
        )
      )
      .orderBy(desc(reviews.createdAt))
      .limit(3);

    // Build response object
    const response = {
      worker: {
        name: worker.workerName,
        avatarUrl: worker.workerAvatarUrl,
        averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
        roleInRestaurant: worker.roleInRestaurant,
        joinedAt: worker.joinedAt,
      },
      restaurant: {
        id: worker.restaurantId,
        name: worker.restaurantName,
        address: worker.restaurantAddress,
        upiHandle: worker.restaurantUpiHandle,
      },
      reviews: recentReviews,
      qrSlug: qr_slug,
    };

    return NextResponse.json(response, { status: 200 });

  } catch (error) {
    console.error('GET by-slug error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}