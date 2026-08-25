import { LucideIcon } from 'lucide-react'
import type { StatusTone } from './Badge'

export type IconTileTone = StatusTone | 'ink'

interface IconTileProps {
  icon: LucideIcon
  label: string
  href: string
  tone: IconTileTone
  className?: string
}

const toneClasses: Record<IconTileTone, { bg: string; icon: string; label: string }> = {
  approved: { bg: 'bg-approved/10', icon: 'text-approved', label: 'text-approved' },
  pending: { bg: 'bg-pending/10', icon: 'text-pending', label: 'text-pending' },
  rejected: { bg: 'bg-rejected/10', icon: 'text-rejected', label: 'text-rejected' },
  info: { bg: 'bg-info/10', icon: 'text-info', label: 'text-info' },
  neutral: { bg: 'bg-neutral/10', icon: 'text-neutral', label: 'text-neutral' },
  accent: { bg: 'bg-accent/10', icon: 'text-accent', label: 'text-accent' },
  ink: { bg: 'bg-ink', icon: 'text-white', label: 'text-ink' },
}

export default function IconTile({ icon: Icon, label, href, tone, className = '' }: IconTileProps) {
  const colors = toneClasses[tone]

  return (
    <a
      href={href}
      className={`flex flex-col items-center gap-1.5 rounded-[10px] border border-gray-200 bg-white px-3 py-4 text-center no-underline shadow-sm transition-shadow hover:shadow-md ${className}`.trim()}
    >
      <div className={`rounded-lg p-2.5 ${colors.bg}`}>
        <Icon className={`h-6 w-6 ${colors.icon}`} aria-hidden="true" />
      </div>
      <span className={`text-sm font-semibold ${colors.label}`}>{label}</span>
    </a>
  )
}
