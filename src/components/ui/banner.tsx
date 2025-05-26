import React, { useState, useEffect } from 'react'

interface BannerProps {
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message?: string
  action?: {
    label: string
    onClick: () => void
  }
  onDismiss?: () => void
  autoHide?: boolean
  duration?: number
}

export function Banner({
  type,
  title,
  message,
  action,
  onDismiss,
  autoHide = false,
  duration = 5000
}: BannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (autoHide) {
      const timer = setTimeout(() => {
        handleDismiss()
      }, duration)
      return () => clearTimeout(timer)
    }
  }, [autoHide, duration])

  const handleDismiss = () => {
    setIsAnimating(true)
    setTimeout(() => {
      setIsVisible(false)
      onDismiss?.()
    }, 300)
  }

  const getIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
          </svg>
        )
      case 'error':
        return (
          <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
          </svg>
        )
      case 'warning':
        return (
          <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
          </svg>
        )
      case 'info':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
          </svg>
        )
    }
  }

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return 'bg-green-50 border-green-200'
      case 'error': return 'bg-red-50 border-red-200'
      case 'warning': return 'bg-yellow-50 border-yellow-200'
      case 'info': return 'bg-blue-50 border-blue-200'
    }
  }

  const getTextColor = () => {
    switch (type) {
      case 'success': return 'text-green-800'
      case 'error': return 'text-red-800'
      case 'warning': return 'text-yellow-800'
      case 'info': return 'text-blue-800'
    }
  }

  const getActionColor = () => {
    switch (type) {
      case 'success': return 'text-green-700 hover:text-green-900'
      case 'error': return 'text-red-700 hover:text-red-900'
      case 'warning': return 'text-yellow-700 hover:text-yellow-900'
      case 'info': return 'text-blue-700 hover:text-blue-900'
    }
  }

  if (!isVisible) return null

  return (
    <div
      className={`
        transform transition-all duration-300 ease-in-out
        ${isAnimating ? 'translate-y-[-100%] opacity-0' : 'translate-y-0 opacity-100'}
        ${getBackgroundColor()}
        border rounded-lg p-4 mb-4
      `}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 flex-1">
          <h3 className={`text-sm font-medium ${getTextColor()}`}>
            {title}
          </h3>
          {message && (
            <p className={`mt-1 text-sm ${getTextColor()} opacity-90`}>
              {message}
            </p>
          )}
          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={`text-sm font-medium ${getActionColor()} underline hover:no-underline transition-all`}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={handleDismiss}
            className="ml-4 flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
            </svg>
          </button>
        )}
      </div>
    </div>
  )
} 