import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staff, restaurants, users } from '@/db/schema';
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

// Generate unique QR slug
function generateQrSlug(restaurantName: string, userName: string): string {
  const timestamp = Date.now();
  const cleanRestaurant = restaurantName.toLowerCase().replace(/[^a-z0-9]/g, '');
  const cleanUser = userName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${cleanRestaurant}-${cleanUser}-${timestamp}`;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');

    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      return NextResponse.json({ 
        error: "Valid restaurant ID is required",
        code: "MISSING_RESTAURANT_ID" 
      }, { status: 400 });
    }

    const restId = parseInt(restaurantId);

    // Check if user is owner of the restaurant
    const restaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.id, restId))
      .limit(1);

    if (restaurant.length === 0) {
      return NextResponse.json({ 
        error: 'Restaurant not found',
        code: 'RESTAURANT_NOT_FOUND' 
      }, { status: 404 });
    }

    if (restaurant[0].ownerUserId !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied. Owner role required.',
        code: 'ACCESS_DENIED' 
      }, { status: 403 });
    }

    // Get staff list with user details
    const staffList = await db
      .select({
        id: staff.id,
        restaurantId: staff.restaurantId,
        userId: staff.userId,
        roleInRestaurant: staff.roleInRestaurant,
        qrSlug: staff.qrSlug,
        joinedAt: staff.joinedAt,
        user: {
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatarUrl: users.avatarUrl,
          role: users.role
        }
      })
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.restaurantId, restId));

    return NextResponse.json(staffList);

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

    const requestBody = await request.json();
    const { restaurantId, userEmail, roleInRestaurant = 'staff' } = requestBody;

    // Security check: reject if user ID provided in body
    if ('userId' in requestBody || 'user_id' in requestBody) {
      return NextResponse.json({ 
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!restaurantId || isNaN(parseInt(restaurantId))) {
      return NextResponse.json({ 
        error: "Valid restaurant ID is required",
        code: "MISSING_RESTAURANT_ID" 
      }, { status: 400 });
    }

    if (!userEmail || typeof userEmail !== 'string' || !userEmail.includes('@')) {
      return NextResponse.json({ 
        error: "Valid user email is required",
        code: "INVALID_USER_EMAIL" 
      }, { status: 400 });
    }

    const restId = parseInt(restaurantId);

    // Check if user is owner of the restaurant
    const restaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.id, restId))
      .limit(1);

    if (restaurant.length === 0) {
      return NextResponse.json({ 
        error: 'Restaurant not found',
        code: 'RESTAURANT_NOT_FOUND' 
      }, { status: 404 });
    }

    if (restaurant[0].ownerUserId !== user.id) {
      return NextResponse.json({ 
        error: 'Access denied. Owner role required.',
        code: 'ACCESS_DENIED' 
      }, { status: 403 });
    }

    // Find user by email
    const targetUser = await db.select()
      .from(users)
      .where(eq(users.email, userEmail.toLowerCase()))
      .limit(1);

    if (targetUser.length === 0) {
      return NextResponse.json({ 
        error: 'User not found with this email',
        code: 'USER_NOT_FOUND' 
      }, { status: 404 });
    }

    const staffUser = targetUser[0];

    // Check if user is already staff at this restaurant
    const existingStaff = await db.select()
      .from(staff)
      .where(and(
        eq(staff.restaurantId, restId),
        eq(staff.userId, staffUser.id)
      ))
      .limit(1);

    if (existingStaff.length > 0) {
      return NextResponse.json({ 
        error: 'User is already staff member at this restaurant',
        code: 'DUPLICATE_STAFF' 
      }, { status: 400 });
    }

    // Generate unique QR slug
    const qrSlug = generateQrSlug(restaurant[0].name, staffUser.name);

    // Create staff record
    const newStaff = await db.insert(staff)
      .values({
        restaurantId: restId,
        userId: staffUser.id,
        roleInRestaurant: roleInRestaurant || 'staff',
        qrSlug: qrSlug,
        joinedAt: new Date()
      })
      .returning();

    // Return complete staff record with user details
    const staffWithUser = await db
      .select({
        id: staff.id,
        restaurantId: staff.restaurantId,
        userId: staff.userId,
        roleInRestaurant: staff.roleInRestaurant,
        qrSlug: staff.qrSlug,
        joinedAt: staff.joinedAt,
        user: {
          name: users.name,
          email: users.email,
          phone: users.phone,
          avatarUrl: users.avatarUrl,
          role: users.role
        }
      })
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.id, newStaff[0].id))
      .limit(1);

    return NextResponse.json(staffWithUser[0], { status: 201 });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}