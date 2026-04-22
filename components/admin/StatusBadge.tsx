import { Badge } from '../ui/Badge'

const tones = {
  draft: 'neutral',
  submitted: 'accent',
  approved: 'accent',
  rejected: 'danger',
  published: 'success',
  archived: 'warn',
} as const

type Status = keyof typeof tones

export function StatusBadge({ status }: { status: Status }) {
  return (
    <Badge tone={tones[status]} className="capitalize">
      {status}
    </Badge>
  )
}
