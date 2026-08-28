import { UserRole } from '@/data';

/**
 * Every gated capability in the app, named for what it lets you do rather than
 * who you are. Screens ask for a permission, never for a role — so widening
 * what a coach can do is a change to this file and nowhere else.
 */
export type Permission =
  | 'program.train'
  | 'clients.view'
  | 'clients.assign_exercise'
  | 'clients.create'
  | 'clients.manage_status';

/**
 * Training is a persona, not a rank. A physio is not a patient with extra
 * buttons, so `program.train` deliberately does NOT cascade upward the way the
 * clients.* permissions do — staff have no prescription, no schedule and no
 * pain log of their own.
 */
const MEMBER: Permission[] = ['program.train'];

const ADMIN: Permission[] = [
  'clients.view',
  'clients.assign_exercise',
  'clients.create',
  'clients.manage_status',
];

const ROLE_PERMISSIONS: Record<UserRole, readonly Permission[]> = {
  member: MEMBER,
  admin: ADMIN,
};

export function can(role: UserRole | null, permission: Permission): boolean {
  if (!role) return false;
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Whether the back office exists for this user at all. */
export function isAdmin(role: UserRole | null): boolean {
  return role === 'admin';
}

export const ROLE_LABEL: Record<UserRole, string> = {
  member: 'Member',
  admin: 'Admin',
};
