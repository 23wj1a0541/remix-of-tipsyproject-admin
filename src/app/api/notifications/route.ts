import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { notifications, users } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

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

    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');
    const unreadOnly = searchParams.get('unread_only') === 'true';

    let query = db.select({
      id: notifications.id,
      type: notifications.type,
      title: notifications.title,
      body: notifications.body,
      read: notifications.read,
      createdAt: notifications.createdAt
    })
    .from(notifications)
    .where(eq(notifications.userId, user.id))
    .orderBy(desc(notifications.createdAt))
    .limit(limit)
    .offset(offset);

    // Filter for unread only if requested
    if (unreadOnly) {
      query = db.select({
        id: notifications.id,
        type: notifications.type,
        title: notifications.title,
        body: notifications.body,
        read: notifications.read,
        createdAt: notifications.createdAt
      })
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .where(eq(notifications.read, false))
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);
    }

    const userNotifications = await query;

    // Get counts for headers
    const unreadCount = await db.select()
      .from(notifications)
      .where(eq(notifications.userId, user.id))
      .where(eq(notifications.read, false));

    const response = NextResponse.json(userNotifications);
    response.headers.set('X-Unread-Count', unreadCount.length.toString());

    return response;

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}