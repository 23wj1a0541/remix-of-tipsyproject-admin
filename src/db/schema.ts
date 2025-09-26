import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

// Users table with role-based access and auth mapping
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  authUserId: text('auth_user_id').notNull().unique(), // maps to better-auth user id (string)
  role: text('role').notNull().default('worker'), // 'worker', 'owner', 'admin'
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  phone: text('phone'),
  avatarUrl: text('avatar_url'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Restaurants table
export const restaurants = sqliteTable('restaurants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  ownerUserId: integer('owner_user_id').references(() => users.id).notNull(),
  name: text('name').notNull(),
  address: text('address'),
  upiHandle: text('upi_handle'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Staff table (junction table for restaurant-user relationships)
export const staff = sqliteTable('staff', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
  userId: integer('user_id').references(() => users.id).notNull(),
  roleInRestaurant: text('role_in_restaurant').notNull().default('staff'),
  qrSlug: text('qr_slug').notNull().unique(), // used in public tipping URLs
  joinedAt: integer('joined_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Tips table
export const tips = sqliteTable('tips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workerUserId: integer('worker_user_id').references(() => users.id).notNull(),
  restaurantId: integer('restaurant_id').references(() => restaurants.id),
  amountCents: integer('amount_cents').notNull(),
  currency: text('currency').notNull().default('INR'),
  payerName: text('payer_name'),
  message: text('message'),
  rating: integer('rating'), // 1-5
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Reviews table
export const reviews = sqliteTable('reviews', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  workerUserId: integer('worker_user_id').references(() => users.id).notNull(),
  restaurantId: integer('restaurant_id').references(() => restaurants.id),
  rating: integer('rating').notNull(), // 1-5
  comment: text('comment'),
  tipId: integer('tip_id').references(() => tips.id),
  status: text('status').notNull().default('pending'), // 'pending', 'approved', 'rejected'
  moderatedByUserId: integer('moderated_by_user_id').references(() => users.id),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Feature toggles table
export const features = sqliteTable('features', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  key: text('key').notNull().unique(),
  name: text('name').notNull(),
  description: text('description'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Notifications table
export const notifications = sqliteTable('notifications', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  userId: integer('user_id').references(() => users.id).notNull(),
  type: text('type').notNull(), // e.g., 'tip_received', 'review_posted'
  title: text('title').notNull(),
  body: text('body').notNull(),
  read: integer('read', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

// Auth tables for better-auth
export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" })
    .$defaultFn(() => false)
    .notNull(),
  image: text("image"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .$defaultFn(() => new Date())
    .notNull(),
});

export const session = sqliteTable("session", {
  id: text("id").primaryKey(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  token: text("token").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
});

export const account = sqliteTable("account", {
  id: text("id").primaryKey(),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  userId: text("user_id")
    .notNull()
    .references(() => user.id, { onDelete: "cascade" }),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", {
    mode: "timestamp",
  }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", {
    mode: "timestamp",
  }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).$defaultFn(
    () => new Date(),
  ),
});