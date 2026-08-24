'use client'

import { LucideIcon } from 'lucide-react'
import Button from './Button'

interface PageHeaderProps {
  icon: LucideIcon
  title: string
  subtitle?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
}

export default function PageHeader({
  icon: Icon,
  title,
  subtitle,
  actionLabel,
  onAction,
  className = '',
}: PageHeaderProps) {
  return (
    <div className={`flex items-center justify-between flex-wrap gap-3 mb-5 ${className}`.trim()}>
      <div>
        <h1 className="text-xl font-bold text-ink flex items-center gap-2">
          <Icon className="w-5 h-5 shrink-0" aria-hidden="true" />
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm text-neutral mt-0.5">{subtitle}</p>
        )}
      </div>
      {actionLabel && onAction && (
        <Button onClick={onAction} className="shrink-0">
          {actionLabel}
        </Button>
      )}
    </div>
  )
}
