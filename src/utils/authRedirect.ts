import type { UserSession } from '../contexts/AuthContext';

type SessionLike = Pick<UserSession, 'is_staff' | 'role'> | null | undefined;

const CALENDAR_ROLES = ['MUSICO', 'LOUVOR', 'INTERCESSAO', 'PROFESSOR_EBD'];

export function resolvePostLoginRoute(user: SessionLike): string {
  if (!user) return '/login';
  if (user.is_staff) return '/admin/churches';
  if (user.role && CALENDAR_ROLES.includes(user.role)) return '/calendar';
  return '/dashboard';
}
