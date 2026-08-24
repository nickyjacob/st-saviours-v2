import { LucideIcon } from 'lucide-react'
import type { StatusTone } from './Badge'

interface IconTileProps {
  icon: LucideIcon
  label: string
  href: string
  tone: StatusTone
  className?: string
}

const toneClasses: Record<StatusTone, { bg: string; text: string }> = {
  approved: { bg: 'bg-approved/10', text: 'text-approved' },
  pending: { bg: 'bg-pending/10', text: 'text-pending' },
  rejected: { bg: 'bg-rejected/10', text: 'text-rejected' },
  info: { bg: 'bg-info/10', text: 'text-info' },
  neutral: { bg: 'bg-neutral/10', text: 'text-neutral' },
  accent: { bg: 'bg-accent/10', text: 'text-accent' },
}

export default function IconTile({ icon: Icon, label, href, tone, className = '' }: IconTileProps) {
  const colors = toneClasses[tone]

  return (
    <a
      href={href}
      className={`flex flex-col items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-3 py-4 text-center no-underline shadow-sm transition-shadow hover:shadow-md ${className}`.trim()}
    >
      <div className={`rounded-lg p-2.5 ${colors.bg}`}>
        <Icon className={`h-6 w-6 ${colors.text}`} aria-hidden="true" />
      </div>
      <span className={`text-sm font-semibold ${colors.text}`}>{label}</span>
    </a>
  )
}
