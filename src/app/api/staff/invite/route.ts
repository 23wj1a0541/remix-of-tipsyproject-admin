import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { staff, restaurants, users, notifications } from '@/db/schema';
import { eq, and, or } from 'drizzle-orm';
import crypto from 'crypto';

// Helper function to get user from authorization header (simulated auth)
async function getCurrentUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  const token = authHeader.substring(7);
  const userId = parseInt(token);
  if (isNaN(userId)) return null;

  const user = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return user.length > 0 ? user[0] : null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const requestBody = await request.json();
    const { restaurantId, workerEmail, role } = requestBody;

    // Security check: reject if userId provided in body
    if ('userId' in requestBody || 'user_id' in requestBody || 'inviterId' in requestBody) {
      return NextResponse.json({
        error: "User ID cannot be provided in request body",
        code: "USER_ID_NOT_ALLOWED"
      }, { status: 400 });
    }

    // Validate required fields
    if (!restaurantId || !workerEmail || !role) {
      return NextResponse.json({
        error: "Restaurant ID, worker email, and role are required",
        code: "MISSING_REQUIRED_FIELDS"
      }, { status: 400 });
    }

    // Validate restaurantId is valid integer
    if (isNaN(parseInt(restaurantId))) {
      return NextResponse.json({
        error: "Valid restaurant ID is required",
        code: "INVALID_RESTAURANT_ID"
      }, { status: 400 });
    }

    // Validate role is valid
    const validRoles = ['worker', 'owner', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({
        error: "Role must be one of: worker, owner, admin",
        code: "INVALID_ROLE"
      }, { status: 400 });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(workerEmail)) {
      return NextResponse.json({
        error: "Valid email address is required",
        code: "INVALID_EMAIL"
      }, { status: 400 });
    }

    // Verify restaurant exists and user has permission to invite
    const restaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.id, parseInt(restaurantId)))
      .limit(1);

    if (restaurant.length === 0) {
      return NextResponse.json({
        error: "Restaurant not found",
        code: "RESTAURANT_NOT_FOUND"
      }, { status: 404 });
    }

    // Check if user is owner of the restaurant or admin
    if (restaurant[0].ownerUserId !== user.id && user.role !== 'admin') {
      return NextResponse.json({
        error: "Permission denied: Only restaurant owners can invite staff",
        code: "PERMISSION_DENIED"
      }, { status: 403 });
    }

    // Check if worker already exists in the system
    const existingUser = await db.select()
      .from(users)
      .where(eq(users.email, workerEmail.toLowerCase()))
      .limit(1);

    let workerId = null;
    if (existingUser.length > 0) {
      workerId = existingUser[0].id;

      // Check for duplicate invitation/existing staff relationship
      const existingStaff = await db.select()
        .from(staff)
        .where(and(
          eq(staff.restaurantId, parseInt(restaurantId)),
          eq(staff.workerId, workerId)
        ))
        .limit(1);

      if (existingStaff.length > 0) {
        // Handle duplicate gracefully based on current status
        if (existingStaff[0].status === 'invited') {
          return NextResponse.json({
            error: "Invitation already sent to this worker",
            code: "DUPLICATE_INVITATION",
            data: {
              status: existingStaff[0].status,
              invitedAt: existingStaff[0].createdAt
            }
          }, { status: 409 });
        } else if (existingStaff[0].status === 'active') {
          return NextResponse.json({
            error: "Worker is already active staff member",
            code: "ALREADY_ACTIVE_STAFF"
          }, { status: 409 });
        }
      }
    }

    // Generate invitation token
    const invitationToken = crypto.randomBytes(32).toString('hex');
    const invitationTimestamp = new Date().toISOString();

    // Create invitation metadata
    const invitationMetadata = {
      token: invitationToken,
      restaurantId: parseInt(restaurantId),
      restaurantName: restaurant[0].name,
      inviterName: user.name,
      inviterEmail: user.email,
      role: role,
      workerEmail: workerEmail.toLowerCase(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      invitationLink: `${process.env.NEXT_PUBLIC_APP_URL}/accept-invitation?token=${invitationToken}`
    };

    // If user exists, create staff record with invited status
    if (workerId) {
      const newStaffInvitation = await db.insert(staff)
        .values({
          restaurantId: parseInt(restaurantId),
          workerId: workerId,
          status: 'invited',
          createdAt: invitationTimestamp,
          updatedAt: invitationTimestamp
        })
        .returning();

      // Create notification for existing user
      await db.insert(notifications)
        .values({
          userId: workerId,
          type: 'staff_invitation',
          title: `Staff Invitation from ${restaurant[0].name}`,
          message: `You've been invited to join ${restaurant[0].name} as ${role}. Click to accept the invitation.`,
          read: false,
          metadata: invitationMetadata,
          createdAt: invitationTimestamp
        });

      return NextResponse.json({
        message: "Staff invitation sent successfully",
        invitation: {
          id: newStaffInvitation[0].id,
          restaurantId: parseInt(restaurantId),
          restaurantName: restaurant[0].name,
          workerEmail: workerEmail.toLowerCase(),
          role: role,
          status: 'invited',
          invitationToken: invitationToken,
          invitationLink: invitationMetadata.invitationLink,
          invitedAt: invitationTimestamp,
          expiresAt: invitationMetadata.expiresAt,
          inviterDetails: {
            name: user.name,
            email: user.email
          }
        }
      }, { status: 201 });
    } else {
      // For new users, create a pending invitation record without workerId
      // This would typically be stored in a separate invitations table, 
      // but using staff table with workerId as null for this implementation
      const newStaffInvitation = await db.insert(staff)
        .values({
          restaurantId: parseInt(restaurantId),
          workerId: 0, // Placeholder for non-existent user
          status: 'invited',
          createdAt: invitationTimestamp,
          updatedAt: invitationTimestamp
        })
        .returning();

      // Store invitation metadata in notifications table for tracking
      await db.insert(notifications)
        .values({
          userId: user.id, // Store under inviter for tracking
          type: 'pending_staff_invitation',
          title: `Pending Staff Invitation`,
          message: `Invitation sent to ${workerEmail} for ${restaurant[0].name}`,
          read: false,
          metadata: invitationMetadata,
          createdAt: invitationTimestamp
        });

      return NextResponse.json({
        message: "Staff invitation sent successfully to new user",
        invitation: {
          id: newStaffInvitation[0].id,
          restaurantId: parseInt(restaurantId),
          restaurantName: restaurant[0].name,
          workerEmail: workerEmail.toLowerCase(),
          role: role,
          status: 'invited',
          invitationToken: invitationToken,
          invitationLink: invitationMetadata.invitationLink,
          invitedAt: invitationTimestamp,
          expiresAt: invitationMetadata.expiresAt,
          inviterDetails: {
            name: user.name,
            email: user.email
          },
          note: "User will need to register first before accepting invitation"
        }
      }, { status: 201 });
    }

  } catch (error) {
    console.error('POST staff invitation error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const restaurantId = searchParams.get('restaurantId');
    const status = searchParams.get('status');
    const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!restaurantId) {
      return NextResponse.json({
        error: "Restaurant ID is required",
        code: "MISSING_RESTAURANT_ID"
      }, { status: 400 });
    }

    // Verify restaurant exists and user has permission
    const restaurant = await db.select()
      .from(restaurants)
      .where(eq(restaurants.id, parseInt(restaurantId)))
      .limit(1);

    if (restaurant.length === 0) {
      return NextResponse.json({
        error: "Restaurant not found",
        code: "RESTAURANT_NOT_FOUND"
      }, { status: 404 });
    }

    if (restaurant[0].ownerUserId !== user.id && user.role !== 'admin') {
      return NextResponse.json({
        error: "Permission denied: Only restaurant owners can view invitations",
        code: "PERMISSION_DENIED"
      }, { status: 403 });
    }

    // Build query conditions
    let whereConditions = [eq(staff.restaurantId, parseInt(restaurantId))];
    
    if (status) {
      whereConditions.push(eq(staff.status, status));
    }

    const invitations = await db.select({
      id: staff.id,
      restaurantId: staff.restaurantId,
      workerId: staff.workerId,
      status: staff.status,
      createdAt: staff.createdAt,
      updatedAt: staff.updatedAt
    })
      .from(staff)
      .where(and(...whereConditions))
      .limit(limit)
      .offset(offset);

    return NextResponse.json(invitations);

  } catch (error) {
    console.error('GET staff invitations error:', error);
    return NextResponse.json({
      error: 'Internal server error: ' + error
    }, { status: 500 });
  }
}