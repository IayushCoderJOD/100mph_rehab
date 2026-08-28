import { pgEnum } from 'drizzle-orm/pg-core';

/** Mirrors UserRole in the app. Coach was removed: the practice has admins and members. */
export const userRole = pgEnum('user_role', ['member', 'admin']);
export const userStatus = pgEnum('user_status', ['active', 'invited', 'suspended']);

export const dayOfWeek = pgEnum('day_of_week', [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

/** How a session got logged: ticked off exercise by exercise, or marked done in one tap. */
export const sessionSource = pgEnum('session_source', ['guided', 'logged']);

export const progressionMetric = pgEnum('progression_metric', ['time', 'reps']);
export const progressionReason = pgEnum('progression_reason', ['self_reported', 'coach_set', 'auto']);

export const learnKind = pgEnum('learn_kind', ['mini_lesson', 'longform']);

export const subscriptionStatus = pgEnum('subscription_status', [
  'pending',
  'trialing',
  'active',
  'past_due',
  'cancelled',
  'expired',
]);

export const mediaKind = pgEnum('media_kind', ['video', 'image']);
export const mediaStatus = pgEnum('media_status', ['uploading', 'processing', 'ready', 'failed']);
