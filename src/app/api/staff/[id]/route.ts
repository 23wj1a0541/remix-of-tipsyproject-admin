import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staff, restaurants, users } from '@/db/schema';
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

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const staffId = parseInt(params.id);
    if (!staffId || isNaN(staffId)) {
      return NextResponse.json({ 
        error: "Valid staff ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Get staff record with restaurant and user details
    const staffRecord = await db
      .select({
        staff: staff,
        restaurant: restaurants,
        staffUser: {
          name: users.name,
          email: users.email
        }
      })
      .from(staff)
      .innerJoin(restaurants, eq(staff.restaurantId, restaurants.id))
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.id, staffId))
      .limit(1);

    if (staffRecord.length === 0) {
      return NextResponse.json({ error: 'Staff record not found' }, { status: 404 });
    }

    const record = staffRecord[0];

    // Check if current user is owner of the restaurant
    if (record.restaurant.ownerUserId !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied. Owner role required.',
        code: 'ACCESS_DENIED' 
      }, { status: 403 });
    }

    // Delete staff record
    const deleted = await db.delete(staff)
      .where(eq(staff.id, staffId))
      .returning();

    if (deleted.length === 0) {
      return NextResponse.json({ error: 'Failed to delete staff record' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Staff member ${record.staffUser.name} removed from ${record.restaurant.name}`,
      deletedStaff: {
        id: record.staff.id,
        qrSlug: record.staff.qrSlug,
        roleInRestaurant: record.staff.roleInRestaurant,
        user: record.staffUser,
        restaurant: {
          id: record.restaurant.id,
          name: record.restaurant.name
        }
      }
    });

  } catch (error) {
    console.error('DELETE error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}