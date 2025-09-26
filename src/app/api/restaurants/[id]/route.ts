import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { restaurants, users, staff } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const restaurantId = parseInt(params.id);
    if (!restaurantId || isNaN(restaurantId)) {
      return NextResponse.json({ 
        error: "Valid restaurant ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Get restaurant with owner details
    const restaurantQuery = await db
      .select({
        restaurant: restaurants,
        owner: {
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role
        }
      })
      .from(restaurants)
      .innerJoin(users, eq(restaurants.ownerUserId, users.id))
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (restaurantQuery.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    const restaurantData = restaurantQuery[0];

    // Check access permissions - owner or staff member
    const isOwner = restaurantData.restaurant.ownerUserId === user.id;
    
    let isStaffMember = false;
    if (!isOwner) {
      const staffMembership = await db.select()
        .from(staff)
        .where(and(
          eq(staff.restaurantId, restaurantId),
          eq(staff.userId, user.id)
        ))
        .limit(1);
      
      isStaffMember = staffMembership.length > 0;
    }

    if (!isOwner && !isStaffMember) {
      return NextResponse.json({ 
        error: 'Access denied. Must be owner or staff member.',
        code: 'ACCESS_DENIED' 
      }, { status: 403 });
    }

    // Get staff list with user details
    const staffList = await db
      .select({
        id: staff.id,
        userId: staff.userId,
        roleInRestaurant: staff.roleInRestaurant,
        qrSlug: staff.qrSlug,
        joinedAt: staff.joinedAt,
        user: {
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatarUrl: users.avatarUrl
        }
      })
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.restaurantId, restaurantId));

    const response = {
      ...restaurantData.restaurant,
      owner: restaurantData.owner,
      staff: staffList
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const restaurantId = parseInt(params.id);
    if (!restaurantId || isNaN(restaurantId)) {
      return NextResponse.json({ 
        error: "Valid restaurant ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    const requestBody = await request.json();
    const { name, address, upi_handle } = requestBody;

    // Security check: reject if owner_user_id provided
    if ('ownerUserId' in requestBody || 'owner_user_id' in requestBody) {
      return NextResponse.json({ 
        error: "Owner user ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Check if restaurant exists and user is owner
    const existingRestaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (existingRestaurant.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Only owner can update restaurant
    if (existingRestaurant[0].ownerUserId !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied. Owner role required.',
        code: 'ACCESS_DENIED' 
      }, { status: 403 });
    }

    // Validate fields
    if (name !== undefined && (!name || typeof name !== 'string' || name.trim().length === 0)) {
      return NextResponse.json({ 
        error: "Name cannot be empty",
        code: "INVALID_NAME" 
      }, { status: 400 });
    }

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

    // Prepare update data
    const updateData: any = {};
    
    if (name !== undefined) updateData.name = name.trim();
    if (address !== undefined) updateData.address = address?.trim() || null;
    if (upi_handle !== undefined) updateData.upiHandle = upi_handle?.trim() || null;

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ 
        error: 'No valid fields provided for update',
        code: 'NO_UPDATES' 
      }, { status: 400 });
    }

    const updated = await db.update(restaurants)
      .set(updateData)
      .where(eq(restaurants.id, restaurantId))
      .returning();

    return NextResponse.json(updated[0]);

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const restaurantId = parseInt(params.id);
    if (!restaurantId || isNaN(restaurantId)) {
      return NextResponse.json({ 
        error: "Valid restaurant ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if restaurant exists and user is owner
    const existingRestaurant = await db
      .select()
      .from(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .limit(1);

    if (existingRestaurant.length === 0) {
      return NextResponse.json({ error: 'Restaurant not found' }, { status: 404 });
    }

    // Only owner can delete restaurant
    if (existingRestaurant[0].ownerUserId !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied. Owner role required.',
        code: 'ACCESS_DENIED' 
      }, { status: 403 });
    }

    // Delete associated staff first (cascade)
    await db.delete(staff)
      .where(eq(staff.restaurantId, restaurantId));

    // Delete restaurant
    const deleted = await db.delete(restaurants)
      .where(eq(restaurants.id, restaurantId))
      .returning();

    return NextResponse.json({
      message: 'Restaurant deleted successfully',
      deletedRestaurant: deleted[0]
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}