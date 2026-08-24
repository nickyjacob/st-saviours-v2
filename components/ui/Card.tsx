import { HTMLAttributes } from 'react'

export type StatusColor = 'approved' | 'pending' | 'rejected' | 'info' | 'neutral' | 'accent'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  statusColor?: StatusColor
}

const statusBorderClasses: Record<StatusColor, string> = {
  approved: 'border-l-approved',
  pending: 'border-l-pending',
  rejected: 'border-l-rejected',
  info: 'border-l-info',
  neutral: 'border-l-neutral',
  accent: 'border-l-accent',
}

export default function Card({ statusColor, className = '', children, ...props }: CardProps) {
  const statusClass = statusColor ? `border-l-4 ${statusBorderClasses[statusColor]}` : ''

  return (
    <div
      className={`bg-white border border-gray-200 rounded-lg ${statusClass} ${className}`.trim()}
      {...props}
    >
      {children}
    </div>
  )
}
