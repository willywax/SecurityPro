import { useAuth } from '@/context/AuthContext';

const ZONE_SCOPED_ROLES = new Set(['zone_manager']);
const ALL_ACCESS_ROLES = new Set(['admin', 'director', 'hr']);

/**
 * Returns scope information for the current user.
 *
 * isZoneScoped — true when the user only sees data for their assigned zones.
 * isFullAccess — true when the user sees all data (admin/director/hr).
 */
export function useZoneScope() {
  const { user } = useAuth();
  const role = user?.role;
  const isZoneScoped = ZONE_SCOPED_ROLES.has(role);
  const isFullAccess = ALL_ACCESS_ROLES.has(role);

  return { isZoneScoped, isFullAccess };
}
