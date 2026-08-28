import { relations, sql } from 'drizzle-orm';
import {
  boolean,
  check,
  date,
  index,
  inet,
  pgTable,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';
import { userRole, userStatus } from './enums';
import { programs } from './content';

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    fullName: text().notNull(),
    /** Stored lower-cased by the API; the unique index is what enforces it. */
    email: text(),
    phone: text(),
    avatarUrl: text(),
    /** IANA zone. Required for streaks and reminders — see README §2.5. */
    timezone: text().notNull().default('Asia/Kolkata'),
    role: userRole().notNull().default('member'),
    status: userStatus().notNull().default('invited'),
    /** Null for admins: staff are not on a rehab program. */
    activeProgramId: uuid().references(() => programs.id),
    passwordHash: text(),
    memberSince: date({ mode: 'string' }).notNull().defaultNow(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp({ withTimezone: true }),
  },
  (t) => [
    uniqueIndex('users_email_lower_idx').on(sql`lower(${t.email})`),
    uniqueIndex('users_phone_idx').on(t.phone),
    check('users_identity_present', sql`${t.email} is not null or ${t.phone} is not null`),
  ]
);

/** Access is provisioned by an admin — there is no public sign-up. */
export const invites = pgTable('invites', {
  id: uuid().primaryKey().defaultRandom(),
  email: text(),
  phone: text(),
  programId: uuid().references(() => programs.id),
  createdBy: uuid()
    .notNull()
    .references(() => users.id),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  redeemedAt: timestamp({ withTimezone: true }),
  redeemedBy: uuid().references(() => users.id),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    /** Hashed. A raw refresh token must never be readable from the database. */
    tokenHash: text().notNull().unique(),
    deviceId: text(),
    /** Rotation lineage, so replaying an old token can revoke the whole family. */
    familyId: uuid().notNull(),
    expiresAt: timestamp({ withTimezone: true }).notNull(),
    revokedAt: timestamp({ withTimezone: true }),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('refresh_tokens_user_idx').on(t.userId)]
);

export const passwordResets = pgTable('password_resets', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  tokenHash: text().notNull().unique(),
  expiresAt: timestamp({ withTimezone: true }).notNull(),
  consumedAt: timestamp({ withTimezone: true }),
  requestIp: inet(),
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const loginAttempts = pgTable(
  'login_attempts',
  {
    id: uuid().primaryKey().defaultRandom(),
    email: text().notNull(),
    succeeded: boolean().notNull(),
    requestIp: inet(),
    createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('login_attempts_email_idx').on(t.email, t.createdAt)]
);

export const pushTokens = pgTable('push_tokens', {
  id: uuid().primaryKey().defaultRandom(),
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  expoToken: text().notNull().unique(),
  platform: text().notNull(),
  lastSeenAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  disabledAt: timestamp({ withTimezone: true }),
});

export const usersRelations = relations(users, ({ one, many }) => ({
  activeProgram: one(programs, {
    fields: [users.activeProgramId],
    references: [programs.id],
  }),
  refreshTokens: many(refreshTokens),
  pushTokens: many(pushTokens),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
