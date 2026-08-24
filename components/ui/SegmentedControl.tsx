'use client'

import type { StatusTone } from './Badge'

interface SegmentedOption {
  label: string
  value: string
  tone?: StatusTone
}

interface SegmentedControlProps {
  options: SegmentedOption[]
  value: string
  onChange: (value: string) => void
  className?: string
}

const toneSelectedClasses: Record<StatusTone, string> = {
  approved: 'bg-approved text-white',
  pending: 'bg-pending text-white',
  rejected: 'bg-rejected text-white',
  info: 'bg-info text-white',
  neutral: 'bg-neutral text-white',
  accent: 'bg-accent text-white',
}

export default function SegmentedControl({ options, value, onChange, className = '' }: SegmentedControlProps) {
  return (
    <div className={`inline-flex border border-gray-300 rounded-lg overflow-hidden ${className}`.trim()}>
      {options.map(option => {
        const isSelected = value === option.value
        const selectedClass = isSelected
          ? option.tone
            ? toneSelectedClasses[option.tone]
            : 'bg-ink text-white'
          : 'bg-white text-gray-700 hover:bg-gray-50'

        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`px-3.5 py-1.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-approved ${selectedClass}`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
