import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { features, users } from '@/db/schema';
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

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can view feature toggles
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Access denied. Admin role required.',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    // Get all feature toggles
    const allFeatures = await db.select({
      id: features.id,
      key: features.key,
      name: features.name,
      description: features.description,
      enabled: features.enabled,
      createdAt: features.createdAt
    })
    .from(features);

    return NextResponse.json(allFeatures);

  } catch (error) {
    console.error('GET error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Only admins can update feature toggles
    if (user.role !== 'admin') {
      return NextResponse.json({ 
        error: 'Access denied. Admin role required.',
        code: 'INSUFFICIENT_PERMISSIONS' 
      }, { status: 403 });
    }

    const requestBody = await request.json();

    // Validate that body is an array
    if (!Array.isArray(requestBody)) {
      return NextResponse.json({ 
        error: "Request body must be an array of feature toggles",
        code: "INVALID_BODY_FORMAT" 
      }, { status: 400 });
    }

    if (requestBody.length === 0) {
      return NextResponse.json({ 
        error: "At least one feature toggle is required",
        code: "EMPTY_ARRAY" 
      }, { status: 400 });
    }

    const results = [];

    // Process each feature toggle
    for (const toggle of requestBody) {
      const { key, name, description, enabled } = toggle;

      // Validate required fields
      if (!key || typeof key !== 'string' || key.trim().length === 0) {
        return NextResponse.json({ 
          error: `Invalid key for feature toggle: ${JSON.stringify(toggle)}`,
          code: "INVALID_KEY" 
        }, { status: 400 });
      }

      if (!name || typeof name !== 'string' || name.trim().length === 0) {
        return NextResponse.json({ 
          error: `Invalid name for feature toggle with key '${key}'`,
          code: "INVALID_NAME" 
        }, { status: 400 });
      }

      if (enabled !== undefined && typeof enabled !== 'boolean') {
        return NextResponse.json({ 
          error: `Enabled field must be boolean for feature toggle with key '${key}'`,
          code: "INVALID_ENABLED" 
        }, { status: 400 });
      }

      // Check if feature exists
      const existingFeature = await db.select()
        .from(features)
        .where(eq(features.key, key.trim()))
        .limit(1);

      if (existingFeature.length > 0) {
        // Update existing feature
        const updateData: any = {
          name: name.trim(),
          description: description?.trim() || null
        };
        
        if (enabled !== undefined) {
          updateData.enabled = enabled;
        }

        const updated = await db.update(features)
          .set(updateData)
          .where(eq(features.key, key.trim()))
          .returning();

        results.push({
          action: 'updated',
          feature: updated[0]
        });

      } else {
        // Create new feature
        const newFeature = await db.insert(features)
          .values({
            key: key.trim(),
            name: name.trim(),
            description: description?.trim() || null,
            enabled: enabled !== undefined ? enabled : true,
            createdAt: new Date()
          })
          .returning();

        results.push({
          action: 'created',
          feature: newFeature[0]
        });
      }
    }

    const response = {
      message: `Processed ${results.length} feature toggles`,
      results: results
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('PATCH error:', error);
    return NextResponse.json({ 
      error: 'Internal server error: ' + error 
    }, { status: 500 });
  }
}