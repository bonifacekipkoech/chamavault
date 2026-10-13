import { cn } from '@/lib/utils'
import type { BadgeVariant } from '@/lib/utils'

interface StatusBadgeProps {
  status: string
  variant: BadgeVariant
  className?: string
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  error:   'badge-error',
  info:    'badge-info',
  default: 'badge-default',
}

const STATUS_LABELS: Record<string, string> = {
  // Contribution
  PAID:              'Paid',
  PENDING:           'Pending',
  LATE:              'Overdue',
  WAIVED:            'Waived',
  PARTIAL:           'Partial',
  // Loan
  PENDING_APPROVAL:  'Pending',
  APPROVED:          'Approved',
  DISBURSED:         'Disbursed',
  ACTIVE:            'Active',
  FULLY_REPAID:      'Repaid',
  DEFAULTED:         'Defaulted',
  REJECTED:          'Rejected',
  // Member
  INACTIVE:          'Inactive',
  SUSPENDED:         'Suspended',
  LEFT:              'Left',
  // Resolution
  DRAFT:             'Draft',
  OPEN:              'Open',
  PASSED:            'Passed',
  TIED:              'Tied',
  CANCELLED:         'Cancelled',
  // Meeting
  SCHEDULED:         'Scheduled',
  IN_PROGRESS:       'In Progress',
  COMPLETED:         'Completed',
}

export function StatusBadge({ status, variant, className }: StatusBadgeProps) {
  const label = STATUS_LABELS[status] ?? status.replace(/_/g, ' ')

  return (
    <span className={cn(VARIANT_CLASSES[variant], className)}>
      {label}
    </span>
  )
}
