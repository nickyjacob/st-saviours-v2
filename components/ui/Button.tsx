import { ButtonHTMLAttributes } from 'react'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'approved' | 'rejected' | 'outline'
}

const variantClasses: Record<NonNullable<ButtonProps['variant']>, string> = {
  primary: 'bg-ink text-white hover:bg-ink/90',
  approved: 'bg-approved text-white hover:bg-approved/90',
  rejected: 'bg-rejected text-white hover:bg-rejected/90',
  outline: 'bg-white border border-gray-200 text-ink hover:bg-gray-50',
}

export default function Button({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-approved focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variantClasses[variant]} ${className}`.trim()}
      {...props}
    >
      {children}
    </button>
  )
}
