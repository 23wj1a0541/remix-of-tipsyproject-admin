import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { workers, users, restaurants, tips, reviews } from '@/db/schema';
import { eq, like, and, or, desc, asc, sum, avg, count } from 'drizzle-orm';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const restaurantId = searchParams.get('restaurant_id');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const sort = searchParams.get('sort') || 'createdAt';
    const order = searchParams.get('order') || 'desc';

    // Single worker fetch
    if (id) {
      if (!id || isNaN(parseInt(id))) {
        return NextResponse.json({ 
          error: "Valid ID is required",
          code: "INVALID_ID" 
        }, { status: 400 });
      }

      const worker = await db.select({
        id: workers.id,
        userId: workers.userId,
        restaurantId: workers.restaurantId,
        displayName: workers.displayName,
        bio: workers.bio,
        qrcodeUrl: workers.qrcodeUrl,
        upiVpa: workers.upiVpa,
        earningsTotal: workers.earningsTotal,
        ratingAvg: workers.ratingAvg,
        createdAt: workers.createdAt,
        updatedAt: workers.updatedAt,
        userEmail: users.email,
        userName: users.name,
        userAvatarUrl: users.avatarUrl,
        restaurantName: restaurants.name,
        restaurantAddress: restaurants.address,
        restaurantCity: restaurants.city
      })
      .from(workers)
      .leftJoin(users, eq(workers.userId, users.id))
      .leftJoin(restaurants, eq(workers.restaurantId, restaurants.id))
      .where(eq(workers.id, parseInt(id)))
      .limit(1);

      if (worker.length === 0) {
        return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
      }

      // Get earnings statistics
      const earningsStats = await db.select({
        totalTips: sum(tips.amount),
        tipCount: count(tips.id),
        avgTip: avg(tips.amount)
      })
      .from(tips)
      .where(eq(tips.workerId, parseInt(id)));

      // Get review statistics
      const reviewStats = await db.select({
        totalReviews: count(reviews.id),
        avgRating: avg(reviews.rating)
      })
      .from(reviews)
      .where(eq(reviews.workerId, parseInt(id)));

      const workerData = {
        ...worker[0],
        earnings: {
          total: earningsStats[0]?.totalTips || 0,
          tipCount: earningsStats[0]?.tipCount || 0,
          average: earningsStats[0]?.avgTip || 0
        },
        reviews: {
          total: reviewStats[0]?.totalReviews || 0,
          avgRating: reviewStats[0]?.avgRating || 0
        }
      };

      return NextResponse.json(workerData);
    }

    // List workers with filtering and search
    let query = db.select({
      id: workers.id,
      userId: workers.userId,
      restaurantId: workers.restaurantId,
      displayName: workers.displayName,
      bio: workers.bio,
      qrcodeUrl: workers.qrcodeUrl,
      upiVpa: workers.upiVpa,
      earningsTotal: workers.earningsTotal,
      ratingAvg: workers.ratingAvg,
      createdAt: workers.createdAt,
      updatedAt: workers.updatedAt,
      userEmail: users.email,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
      restaurantName: restaurants.name,
      restaurantAddress: restaurants.address,
      restaurantCity: restaurants.city
    })
    .from(workers)
    .leftJoin(users, eq(workers.userId, users.id))
    .leftJoin(restaurants, eq(workers.restaurantId, restaurants.id));

    const conditions = [];

    // Filter by restaurant
    if (restaurantId) {
      if (isNaN(parseInt(restaurantId))) {
        return NextResponse.json({ 
          error: "Valid restaurant ID is required",
          code: "INVALID_RESTAURANT_ID" 
        }, { status: 400 });
      }
      conditions.push(eq(workers.restaurantId, parseInt(restaurantId)));
    }

    // Search by display name
    if (search) {
      conditions.push(like(workers.displayName, `%${search}%`));
    }

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    // Apply sorting
    const orderFn = order === 'asc' ? asc : desc;
    switch (sort) {
      case 'displayName':
        query = query.orderBy(orderFn(workers.displayName));
        break;
      case 'earningsTotal':
        query = query.orderBy(orderFn(workers.earningsTotal));
        break;
      case 'ratingAvg':
        query = query.orderBy(orderFn(workers.ratingAvg));
        break;
      default:
        query = query.orderBy(orderFn(workers.createdAt));
    }

    const results = await query.limit(limit).offset(offset);

    return NextResponse.json(results);
  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const requestBody = await request.json();
    const { user_id, restaurant_id, display_name, bio, upi_vpa } = requestBody;

    // Security check: reject if userId provided in body
    if ('userId' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!user_id) {
      return NextResponse.json({ 
        error: "User ID is required",
        code: "MISSING_USER_ID" 
      }, { status: 400 });
    }

    if (!restaurant_id) {
      return NextResponse.json({ 
        error: "Restaurant ID is required",
        code: "MISSING_RESTAURANT_ID" 
      }, { status: 400 });
    }

    if (!display_name || display_name.trim() === '') {
      return NextResponse.json({ 
        error: "Display name is required",
        code: "MISSING_DISPLAY_NAME" 
      }, { status: 400 });
    }

    // Validate user exists and has worker role
    const user = await db.select()
      .from(users)
      .where(eq(users.id, parseInt(user_id)))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ 
        error: "User not found",
        code: "USER_NOT_FOUND" 
      }, { status: 400 });
    }

    if (user[0].role !== 'worker') {
      return NextResponse.json({ 
        error: "User must have worker role",
        code: "INVALID_USER_ROLE" 
      }, { status: 400 });
    }

    // Validate restaurant exists
    const restaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.id, parseInt(restaurant_id)))
      .limit(1);

    if (restaurant.length === 0) {
      return NextResponse.json({ 
        error: "Restaurant not found",
        code: "RESTAURANT_NOT_FOUND" 
      }, { status: 400 });
    }

    // Check if worker already exists for this user
    const existingWorker = await db.select()
      .from(workers)
      .where(eq(workers.userId, parseInt(user_id)))
      .limit(1);

    if (existingWorker.length > 0) {
      return NextResponse.json({ 
        error: "Worker profile already exists for this user",
        code: "WORKER_ALREADY_EXISTS" 
      }, { status: 400 });
    }

    // Generate QR code URL for tips
    const qrcodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`tips://worker/${user_id}`)}`;

    // Create worker profile
    const newWorker = await db.insert(workers)
      .values({
        userId: parseInt(user_id),
        restaurantId: parseInt(restaurant_id),
        displayName: display_name.trim(),
        bio: bio ? bio.trim() : null,
        qrcodeUrl,
        upiVpa: upi_vpa ? upi_vpa.trim() : null,
        earningsTotal: 0,
        ratingAvg: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .returning();

    // Get complete worker data with user and restaurant info
    const workerWithDetails = await db.select({
      id: workers.id,
      userId: workers.userId,
      restaurantId: workers.restaurantId,
      displayName: workers.displayName,
      bio: workers.bio,
      qrcodeUrl: workers.qrcodeUrl,
      upiVpa: workers.upiVpa,
      earningsTotal: workers.earningsTotal,
      ratingAvg: workers.ratingAvg,
      createdAt: workers.createdAt,
      updatedAt: workers.updatedAt,
      userEmail: users.email,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
      restaurantName: restaurants.name,
      restaurantAddress: restaurants.address,
      restaurantCity: restaurants.city
    })
    .from(workers)
    .leftJoin(users, eq(workers.userId, users.id))
    .leftJoin(restaurants, eq(workers.restaurantId, restaurants.id))
    .where(eq(workers.id, newWorker[0].id))
    .limit(1);

    const workerData = {
      ...workerWithDetails[0],
      earnings: {
        total: 0,
        tipCount: 0,
        average: 0
      },
      reviews: {
        total: 0,
        avgRating: 0
      }
    };

    return NextResponse.json(workerData, { status: 201 });
  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { display_name, bio, upi_vpa } = requestBody;

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if worker exists
    const existingWorker = await db.select()
      .from(workers)
      .where(eq(workers.id, parseInt(id)))
      .limit(1);

    if (existingWorker.length === 0) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    if (display_name !== undefined) {
      if (display_name.trim() === '') {
        return NextResponse.json({ 
          error: "Display name cannot be empty",
          code: "INVALID_DISPLAY_NAME" 
        }, { status: 400 });
      }
      updates.displayName = display_name.trim();
    }

    if (bio !== undefined) {
      updates.bio = bio ? bio.trim() : null;
    }

    if (upi_vpa !== undefined) {
      updates.upiVpa = upi_vpa ? upi_vpa.trim() : null;
    }

    const updated = await db.update(workers)
      .set(updates)
      .where(eq(workers.id, parseInt(id)))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    // Get complete worker data with user and restaurant info
    const workerWithDetails = await db.select({
      id: workers.id,
      userId: workers.userId,
      restaurantId: workers.restaurantId,
      displayName: workers.displayName,
      bio: workers.bio,
      qrcodeUrl: workers.qrcodeUrl,
      upiVpa: workers.upiVpa,
      earningsTotal: workers.earningsTotal,
      ratingAvg: workers.ratingAvg,
      createdAt: workers.createdAt,
      updatedAt: workers.updatedAt,
      userEmail: users.email,
      userName: users.name,
      userAvatarUrl: users.avatarUrl,
      restaurantName: restaurants.name,
      restaurantAddress: restaurants.address,
      restaurantCity: restaurants.city
    })
    .from(workers)
    .leftJoin(users, eq(workers.userId, users.id))
    .leftJoin(restaurants, eq(workers.restaurantId, restaurants.id))
    .where(eq(workers.id, parseInt(id)))
    .limit(1);

    // Get earnings statistics
    const earningsStats = await db.select({
      totalTips: sum(tips.amount),
      tipCount: count(tips.id),
      avgTip: avg(tips.amount)
    })
    .from(tips)
    .where(eq(tips.workerId, parseInt(id)));

    // Get review statistics
    const reviewStats = await db.select({
      totalReviews: count(reviews.id),
      avgRating: avg(reviews.rating)
    })
    .from(reviews)
    .where(eq(reviews.workerId, parseInt(id)));

    const workerData = {
      ...workerWithDetails[0],
      earnings: {
        total: earningsStats[0]?.totalTips || 0,
        tipCount: earningsStats[0]?.tipCount || 0,
        average: earningsStats[0]?.avgTip || 0
      },
      reviews: {
        total: reviewStats[0]?.totalReviews || 0,
        avgRating: reviewStats[0]?.avgRating || 0
      }
    };

    return NextResponse.json(workerData);
  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(parseInt(id))) {
      return NextResponse.json({ 
        error: "Valid ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if worker exists
    const existingWorker = await db.select()
      .from(workers)
      .where(eq(workers.id, parseInt(id)))
      .limit(1);

    if (existingWorker.length === 0) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    const deleted = await db.delete(workers)
      .where(eq(workers.id, parseInt(id)))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Worker not found' }, { status: 404 });
    }

    return NextResponse.json({
      message: 'Worker deleted successfully',
      worker: deleted[0]
    });
  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}