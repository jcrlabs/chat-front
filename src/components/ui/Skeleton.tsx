import { cn } from '@/lib/utils'
import type { CSSProperties } from 'react'

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div className={cn('animate-pulse rounded-md bg-gray-700', className)} style={style} />
}

export function MessageSkeleton() {
  return (
    <div className="flex flex-col gap-3 p-4">
      {[80, 60, 90, 50].map((w, i) => (
        <div key={i} className="flex items-start gap-2">
          <Skeleton className="size-8 shrink-0 rounded-full" />
          <div className="flex flex-col gap-1">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-4" style={{ width: `${w}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}
