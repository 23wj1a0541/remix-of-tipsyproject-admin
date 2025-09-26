import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications, users } from '@/db/schema';
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

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const notificationId = parseInt(params.id);
    if (!notificationId || isNaN(notificationId)) {
      return NextResponse.json({ 
        error: "Valid notification ID is required",
        code: "INVALID_ID" 
      }, { status: 400 });
    }

    // Check if notification exists and belongs to current user
    const existingNotification = await db.select()
      .from(notifications)
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.id)
      ))
      .limit(1);

    if (existingNotification.length === 0) {
      return NextResponse.json({ 
        error: 'Notification not found or access denied',
        code: 'NOTIFICATION_NOT_FOUND' 
      }, { status: 404 });
    }

    // Mark notification as read
    const updatedNotification = await db.update(notifications)
      .set({
        read: true
      })
      .where(and(
        eq(notifications.id, notificationId),
        eq(notifications.userId, user.id)
      ))
      .returning();

    if (updatedNotification.length === 0) {
      return NextResponse.json({ 
        error: 'Failed to update notification',
        code: 'UPDATE_FAILED' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Notification marked as read',
      notification: updatedNotification[0]
    });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}