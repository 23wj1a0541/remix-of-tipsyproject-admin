import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, staff, restaurants, reviews } from '@/db/schema';
import { eq, desc, avg } from 'drizzle-orm';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const workerId = parseInt(params.id);
    if (!workerId || isNaN(workerId)) {
      return NextResponse.json({ 
        error: "Valid worker ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Get worker details (public profile)
    const worker = await db.select({
      id: users.id,
      name: users.name,
      avatarUrl: users.avatarUrl
    })
    .from(users)
    .where(eq(users.id, workerId))
    .limit(1);

    if (worker.length === 0) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const workerData = worker[0];

    // Get restaurant info where worker is staff
    const workerRestaurants = await db.select({
      restaurant: {
        id: restaurants.id,
        name: restaurants.name,
        address: restaurants.address
      },
      staff: {
        qrSlug: staff.qrSlug,
        roleInRestaurant: staff.roleInRestaurant
      }
    })
    .from(staff)
    .innerJoin(restaurants, eq(staff.restaurantId, restaurants.id))
    .where(eq(staff.userId, workerId));

    // Calculate average rating from approved reviews only
    const avgRatingResult = await db.select({
      avgRating: avg(reviews.rating)
    })
    .from(reviews)
    .where(eq(reviews.workerUserId, workerId))
    .where(eq(reviews.status, 'approved'));

    const averageRating = avgRatingResult[0]?.avgRating || 0;

    // Get recent approved reviews (limit 5)
    const recentReviews = await db.select({
      id: reviews.id,
      rating: reviews.rating,
      comment: reviews.comment,
      createdAt: reviews.createdAt,
      restaurant: {
        name: restaurants.name
      }
    })
    .from(reviews)
    .leftJoin(restaurants, eq(reviews.restaurantId, restaurants.id))
    .where(eq(reviews.workerUserId, workerId))
    .where(eq(reviews.status, 'approved'))
    .orderBy(desc(reviews.createdAt))
    .limit(5);

    const response = {
      id: workerData.id,
      name: workerData.name,
      avatarUrl: workerData.avatarUrl,
      averageRating: Math.round(averageRating * 10) / 10, // Round to 1 decimal
      restaurants: workerRestaurants,
      recentReviews: recentReviews
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}