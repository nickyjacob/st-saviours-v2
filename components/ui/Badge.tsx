import { ReactNode } from 'react'

export type StatusTone = 'approved' | 'pending' | 'rejected' | 'info' | 'neutral' | 'accent'

interface BadgeProps {
  tone: StatusTone
  variant: 'solid' | 'tint'
  children: ReactNode
  className?: string
}

const solidClasses: Record<StatusTone, string> = {
  approved: 'bg-approved text-white',
  pending: 'bg-pending text-white',
  rejected: 'bg-rejected text-white',
  info: 'bg-info text-white',
  neutral: 'bg-neutral text-white',
  accent: 'bg-accent text-white',
}

const tintClasses: Record<StatusTone, string> = {
  approved: 'bg-approved/10 text-approved',
  pending: 'bg-pending/10 text-pending',
  rejected: 'bg-rejected/10 text-rejected',
  info: 'bg-info/10 text-info',
  neutral: 'bg-neutral/10 text-neutral',
  accent: 'bg-accent/10 text-accent',
}

export default function Badge({ tone, variant, children, className = '' }: BadgeProps) {
  const variantClass = variant === 'solid' ? solidClasses[tone] : tintClasses[tone]

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variantClass} ${className}`.trim()}
    >
      {children}
    </span>
  )
}
