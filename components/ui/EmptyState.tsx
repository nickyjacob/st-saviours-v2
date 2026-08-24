import { LucideIcon } from 'lucide-react'
import Card from './Card'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  message?: string
  className?: string
}

export default function EmptyState({ icon: Icon, title, message, className = '' }: EmptyStateProps) {
  return (
    <Card className={`py-10 px-6 text-center ${className}`.trim()}>
      {Icon && (
        <Icon className="mx-auto mb-3 h-8 w-8 text-neutral" aria-hidden="true" />
      )}
      <p className="text-[15px] text-neutral">{title}</p>
      {message && (
        <p className="mt-1 text-sm text-neutral/80">{message}</p>
      )}
    </Card>
  )
}
