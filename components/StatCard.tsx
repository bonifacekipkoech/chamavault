import { cn } from '@/lib/utils'

type Color = 'green' | 'blue' | 'yellow' | 'red' | 'purple' | 'gray'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: string
  icon?: React.ReactNode
  color?: Color
  trend?: { value: number; label: string }
}

const COLOR_MAP: Record<Color, { bg: string; icon: string; text: string }> = {
  green:  { bg: 'bg-green-50',  icon: 'text-green-600',  text: 'text-green-700'  },
  blue:   { bg: 'bg-blue-50',   icon: 'text-blue-600',   text: 'text-blue-700'   },
  yellow: { bg: 'bg-yellow-50', icon: 'text-yellow-600', text: 'text-yellow-700' },
  red:    { bg: 'bg-red-50',    icon: 'text-red-600',    text: 'text-red-700'    },
  purple: { bg: 'bg-purple-50', icon: 'text-purple-600', text: 'text-purple-700' },
  gray:   { bg: 'bg-gray-100',  icon: 'text-gray-500',   text: 'text-gray-700'   },
}

export function StatCard({ title, value, subtitle, icon, color = 'green', trend }: StatCardProps) {
  const c = COLOR_MAP[color]

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        {icon && (
          <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', c.bg)}>
            <span className={c.icon}>{icon}</span>
          </div>
        )}
      </div>
      <p className={cn('text-2xl font-bold', c.text)}>{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
      {trend && (
        <div className={cn(
          'flex items-center gap-1 text-xs mt-2 font-medium',
          trend.value >= 0 ? 'text-green-600' : 'text-red-600'
        )}>
          <span>{trend.value >= 0 ? '↑' : '↓'} {Math.abs(trend.value)}%</span>
          <span className="text-gray-400 font-normal">{trend.label}</span>
        </div>
      )}
    </div>
  )
}
