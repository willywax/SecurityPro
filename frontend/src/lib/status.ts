import type { BadgeVariant } from '../components/ui/Badge';

export const statusBadgeVariantMap: Record<string, BadgeVariant> = {
  draft: 'warning',
  locked: 'info',
  paid: 'success',
  sent: 'info',
  void: 'danger',
  available: 'success',
  issued: 'warning',
  lost: 'danger',
};

export const resolveStatusVariant = (status?: string): BadgeVariant => {
  if (!status) return 'neutral';
  return statusBadgeVariantMap[status.toLowerCase()] ?? 'neutral';
};
