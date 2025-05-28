'use client'

import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../../lib/utils'

const bannerVariants = cva(
  'relative w-full rounded-lg border p-4',
  {
    variants: {
      variant: {
        default: 'bg-cloud-50 text-cloud-950 border-cloud-200',
        destructive: 'bg-coral-50 text-coral-950 border-coral-200',
        success: 'bg-mint-50 text-mint-950 border-mint-200',
        warning: 'bg-marigold-50 text-marigold-950 border-marigold-200',
        info: 'bg-sky-50 text-sky-950 border-sky-200',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

export interface BannerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof bannerVariants> {
  title?: string
  description?: string
  onDismiss?: () => void
}

const getIndicator = (variant: string) => {
  switch (variant) {
    case 'success':
      return '✓'
    case 'destructive':
      return '✗'
    case 'warning':
      return '⚠'
    case 'info':
      return 'ℹ'
    default:
      return '•'
  }
}

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
  ({ className, variant = 'default', title, description, onDismiss, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(bannerVariants({ variant }), className)}
        {...props}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            <span className="text-lg font-semibold">
              {getIndicator(variant || 'default')}
            </span>
          </div>
          
          <div className="flex-1 min-w-0">
            {title && (
              <h3 className="text-sm font-semibold mb-1">
                {title}
              </h3>
            )}
            
            {description && (
              <div className="text-sm opacity-90">
                {description}
              </div>
            )}
            
            {children && (
              <div className="mt-2">
                {children}
              </div>
            )}
          </div>
          
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="flex-shrink-0 ml-auto pl-3 opacity-70 hover:opacity-100 transition-opacity"
              aria-label="Dismiss"
            >
              <span className="text-lg">×</span>
            </button>
          )}
        </div>
      </div>
    )
  }
)

Banner.displayName = 'Banner'

export { Banner, bannerVariants } 