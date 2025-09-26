import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, tips, restaurants } from '@/db/schema';
import { eq, sum, count } from 'drizzle-orm';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Find or create user profile using auth user ID
    let userProfile = await db.select()
      .from(users)
      .where(eq(users.authUserId, authUser.id))
      .limit(1);

    if (userProfile.length === 0) {
      // Auto-create user record with default role "worker"
      const newUser = await db.insert(users)
        .values({
          authUserId: authUser.id,
          role: 'worker',
          name: authUser.name,
          email: authUser.email,
          createdAt: new Date()
        })
        .returning();

      userProfile = newUser;
    }

    const user = userProfile[0];

    // Calculate derived stats based on role
    let stats = {};

    if (user.role === 'worker') {
      // Get total earnings and tips count for worker
      const earningsResult = await db.select({
        totalEarningsCents: sum(tips.amountCents),
        tipsCount: count(tips.id)
      })
      .from(tips)
      .where(eq(tips.workerUserId, user.id));

      stats = {
        total_earnings_cents: earningsResult[0]?.totalEarningsCents || 0,
        tips_count: earningsResult[0]?.tipsCount || 0
      };
    } else if (user.role === 'owner') {
      // Get restaurants count for owner
      const restaurantsResult = await db.select({
        restaurantsCount: count(restaurants.id)
      })
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, user.id));

      stats = {
        restaurants_count: restaurantsResult[0]?.restaurantsCount || 0
      };
    }

    return NextResponse.json({
      ...user,
      ...stats
    });

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const authUser = await getCurrentUser(request);
    if (!authUser) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const requestBody = await request.json();
    const { name, phone, avatar_url } = requestBody;

    // Security check: reject if user ID provided in body
    if ('userId' in requestBody || 'user_id' in requestBody || 'authUserId' in requestBody || 'auth_user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Find existing user profile
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.authUserId, authUser.id))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User profile not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Validate required fields
    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ 
        error: 'Name must be a non-empty string',
        code: 'INVALID_NAME' 
      }, { status: 400 });
    }

    if (phone !== undefined && phone !== null && typeof phone !== 'string') {
      return NextResponse.json({ 
        error: 'Phone must be a string',
        code: 'INVALID_PHONE' 
      }, { status: 400 });
    }

    if (avatar_url !== undefined && avatar_url !== null && typeof avatar_url !== 'string') {
      return NextResponse.json({ 
        error: 'Avatar URL must be a string',
        code: 'INVALID_AVATAR_URL' 
      }, { status: 400 });
    }

    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) {
      updateData.name = name.trim();
    }
    if (phone !== undefined) {
      updateData.phone = phone?.trim() || null;
    }
    if (avatar_url !== undefined) {
      updateData.avatarUrl = avatar_url?.trim() || null;
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields provided for update',
        code: 'NO_UPDATES' 
      }, { status: 400 });
    }

    // Perform update
    const updatedUser = await db.update(users)
      .set(updateData)
      .where(eq(users.authUserId, authUser.id))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update user profile',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    const user = updatedUser[0];

    // Calculate derived stats based on role
    let stats = {};

    if (user.role === 'worker') {
      // Get total earnings and tips count for worker
      const earningsResult = await db.select({
        totalEarningsCents: sum(tips.amountCents),
        tipsCount: count(tips.id)
      })
      .from(tips)
      .where(eq(tips.workerUserId, user.id));

      stats = {
        total_earnings_cents: earningsResult[0]?.totalEarningsCents || 0,
        tips_count: earningsResult[0]?.tipsCount || 0
      };
    } else if (user.role === 'owner') {
      // Get restaurants count for owner
      const restaurantsResult = await db.select({
        restaurantsCount: count(restaurants.id)
      })
      .from(restaurants)
      .where(eq(restaurants.ownerUserId, user.id));

      stats = {
        restaurants_count: restaurantsResult[0]?.restaurantsCount || 0
      };
    }

    return NextResponse.json({
      ...user,
      ...stats
    });

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}