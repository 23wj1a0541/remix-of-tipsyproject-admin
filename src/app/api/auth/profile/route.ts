import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users, restaurants, workers, staff } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

// Helper function to get user ID from authorization header (simulated auth)
async function getCurrentUserId(request: NextRequest): Promise<number | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  // For now, assume token is the user ID (in production, decode JWT)
  const userId = parseInt(token);
  return isNaN(userId) ? null : userId;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED' 
      }, { status: 401 });
    }

    // Get user data
    const user = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    const userData = user[0];
    const profileData: any = {
      id: userData.id,
      email: userData.email,
      name: userData.name,
      role: userData.role,
      avatarUrl: userData.avatarUrl,
      restaurantId: userData.restaurantId,
      createdAt: userData.createdAt,
      updatedAt: userData.updatedAt
    };

    // Add role-specific data
    if (userData.role === 'worker') {
      // Get worker profile
      const workerProfile = await db.select()
        .from(workers)
        .where(eq(workers.userId, userId))
        .limit(1);

      if (workerProfile.length > 0) {
        profileData.workerProfile = workerProfile[0];

        // Get restaurant info for worker
        if (workerProfile[0].restaurantId) {
          const restaurant = await db.select()
            .from(restaurants)
            .where(eq(restaurants.id, workerProfile[0].restaurantId))
            .limit(1);

          if (restaurant.length > 0) {
            profileData.restaurant = restaurant[0];
          }
        }
      }
    } else if (userData.role === 'owner') {
      // Get restaurants owned by this user
      const ownedRestaurants = await db.select()
        .from(restaurants)
        .where(eq(restaurants.ownerUserId, userId));

      profileData.restaurants = ownedRestaurants;
    } else if (userData.role === 'admin') {
      // Admin-specific data (can be extended as needed)
      profileData.adminData = {
        permissions: ['manage_users', 'manage_restaurants', 'manage_features'],
        lastLogin: userData.updatedAt
      };
    }

    return NextResponse.json(profileData);

  } catch (error) {
    console.error('GET profile error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await getCurrentUserId(request);
    if (!userId) {
      return NextResponse.json({ 
        error: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED' 
      }, { status: 401 });
    }

    const requestBody = await request.json();

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody || 'id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate user exists
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (existingUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    // Extract updatable fields
    const { name, avatarUrl, passwordHash } = requestBody;
    const updates: any = {
      updatedAt: new Date().toISOString()
    };

    // Validate and add fields if provided
    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ 
          error: 'Name must be a non-empty string',
          code: 'INVALID_NAME' 
        }, { status: 400 });
      }
      updates.name = name.trim();
    }

    if (avatarUrl !== undefined) {
      if (avatarUrl !== null && typeof avatarUrl !== 'string') {
        return NextResponse.json({ 
          error: 'Avatar URL must be a string or null',
          code: 'INVALID_AVATAR_URL' 
        }, { status: 400 });
      }
      updates.avatarUrl = avatarUrl;
    }

    if (passwordHash !== undefined) {
      if (typeof passwordHash !== 'string' || passwordHash.length === 0) {
        return NextResponse.json({ 
          error: 'Password hash must be a non-empty string',
          code: 'INVALID_PASSWORD_HASH' 
        }, { status: 400 });
      }
      updates.passwordHash = passwordHash;
    }

    // If no valid updates provided
    if (Object.keys(updates).length === 1) { // Only updatedAt
      return NextResponse.json({ 
        error: 'No valid fields to update',
        code: 'NO_UPDATES_PROVIDED' 
      }, { status: 400 });
    }

    // Update user
    const updatedUser = await db.update(users)
      .set(updates)
      .where(eq(users.id, userId))
      .returning();

    if (updatedUser.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update user',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    // Return updated profile data (excluding password hash)
    const { passwordHash: _, ...profileData } = updatedUser[0];
    
    return NextResponse.json(profileData);

  } catch (error) {
    console.error('PUT profile error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}