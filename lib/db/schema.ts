import {
  mysqlTable,
  varchar,
  timestamp,
  int,
} from 'drizzle-orm/mysql-core';

/**
 * Users table — stores registered user accounts
 */
export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),
  phone: varchar('phone', { length: 11 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 255 }).notNull(),
  displayName: varchar('display_name', { length: 50 }).notNull().default('学员'),
  avatar: varchar('avatar', { length: 500 }),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  lastLoginAt: timestamp('last_login_at').notNull().defaultNow(),
});

/**
 * OTP tickets table — stores verification codes for phone auth
 */
export const otpTickets = mysqlTable('otp_tickets', {
  phone: varchar('phone', { length: 11 }).primaryKey(),
  code: varchar('code', { length: 6 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  lastSentAt: timestamp('last_sent_at').notNull(),
  attempts: int('attempts').notNull().default(0),
});
