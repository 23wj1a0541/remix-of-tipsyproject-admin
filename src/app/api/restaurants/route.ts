import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { restaurants, users, staff } from '@/db/schema';
import { eq, count } from 'drizzle-orm';

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

    // Only owners can list restaurants
    if (user.role !== 'owner') {
      return NextResponse.json({ 
        error: 'Access denied. Owner role required.',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // Get restaurants owned by current user with staff count
    const ownerRestaurants = await db
      .select({
        id: restaurants.id,
        name: restaurants.name,
        address: restaurants.address,
        upiHandle: restaurants.upiHandle,
        createdAt: restaurants.createdAt,
        staffCount: count(staff.id)
      })
      .from(restaurants)
      .leftJoin(staff, eq(restaurants.id, staff.restaurantId))
      .where(eq(restaurants.ownerUserId, user.id))
      .groupBy(restaurants.id)
      .limit(limit)
      .offset(offset);

    return NextResponse.json(ownerRestaurants);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only owners can create restaurants
    if (user.role !== 'owner') {
      return NextResponse.json({ 
        error: 'Access denied. Owner role required.',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const requestBody = await request.json();
    const { name, address, upi_handle } = requestBody;

    // Security check: reject if owner_user_id provided in body
    if ('ownerUserId' in requestBody || 'owner_user_id' in requestBody) {
      return NextResponse.json({ 
        error: "Owner user ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ 
        error: "Restaurant name is required",
        code: "MISSING_REQUIRED_FIELD" 
      }, { status: 400 });
    }

    // Validate optional fields
    if (address !== undefined && address !== null && typeof address !== 'string') {
      return NextResponse.json({ 
        error: "Address must be a string",
        code: "INVALID_ADDRESS" 
      }, { status: 400 });
    }

    if (upi_handle !== undefined && upi_handle !== null && typeof upi_handle !== 'string') {
      return NextResponse.json({ 
        error: "UPI handle must be a string",
        code: "INVALID_UPI_HANDLE" 
      }, { status: 400 });
    }

    const insertData = {
      ownerUserId: user.id,
      name: name.trim(),
      address: address?.trim() || null,
      upiHandle: upi_handle?.trim() || null,
      createdAt: new Date()
    };

    const newRestaurant = await db.insert(restaurants)
      .values(insertData)
      .returning();

    return NextResponse.json(newRestaurant[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}