import React, { useEffect, useRef, useState, useCallback } from 'react'
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  Bug,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Circle,
  Clock,
  Copy,
  Edit,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  Flag,
  Folder,
  GitBranch,
  HelpCircle,
  Home,
  Info,
  Layers,
  Link,
  List,
  Loader2,
  Lock,
  Mail,
  Menu,
  MoreHorizontal,
  MoreVertical,
  Plus,
  RefreshCw,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Star,
  Target,
  Trash2,
  Upload,
  User,
  Users,
  X,
  Zap,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '../../lib/utils'

// Icon size variants
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

// Icon color variants based on brand colors
export type IconVariant = 
  | 'default' 
  | 'primary' 
  | 'secondary' 
  | 'accent' 
  | 'success' 
  | 'warning' 
  | 'danger' 
  | 'info'
  | 'muted'
  | 'auto-contrast'

interface IconProps {
  size?: IconSize
  variant?: IconVariant
  className?: string
  autoContrast?: boolean
}

const iconSizes: Record<IconSize, string> = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8',
}

const iconVariants: Record<IconVariant, string> = {
  default: 'text-navy-950',
  primary: 'text-navy-950',
  secondary: 'text-cloud-600',
  accent: 'text-royal-950',
  success: 'text-forest-900',
  warning: 'text-marigold-500',
  danger: 'text-coral-500',
  info: 'text-sky-600',
  muted: 'text-cloud-500',
  'auto-contrast': '', // Will be determined dynamically
}

// Auto-contrast color variants
const autoContrastVariants = {
  light: 'text-navy-950', // Dark color for light backgrounds
  dark: 'text-cloud-100', // Light color for dark backgrounds
}

// Function to determine if a color is dark
function isColorDark(rgb: { r: number; g: number; b: number }): boolean {
  // Calculate relative luminance using WCAG formula
  const { r, g, b } = rgb
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance < 0.5
}

// Function to get RGB values from computed style
function getRGBFromComputedStyle(color: string): { r: number; g: number; b: number } | null {
  // Handle rgb() format
  const rgbMatch = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/)
  if (rgbMatch) {
    return {
      r: parseInt(rgbMatch[1]),
      g: parseInt(rgbMatch[2]),
      b: parseInt(rgbMatch[3])
    }
  }

  // Handle rgba() format
  const rgbaMatch = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/)
  if (rgbaMatch) {
    return {
      r: parseInt(rgbaMatch[1]),
      g: parseInt(rgbaMatch[2]),
      b: parseInt(rgbaMatch[3])
    }
  }

  // Handle hex format
  const hexMatch = color.match(/^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (hexMatch) {
    return {
      r: parseInt(hexMatch[1], 16),
      g: parseInt(hexMatch[2], 16),
      b: parseInt(hexMatch[3], 16)
    }
  }

  return null
}

// Hook to detect background color and determine contrast
function useAutoContrast(enabled: boolean) {
  const ref = useRef<SVGSVGElement>(null)
  const [contrastClass, setContrastClass] = useState(autoContrastVariants.light)
  const [isClient, setIsClient] = useState(false)

  // Ensure we only run contrast detection on the client
  useEffect(() => {
    setIsClient(true)
  }, [])

  const detectContrast = useCallback(() => {
    if (!enabled || !ref.current || !isClient) return

    const element = ref.current
    let currentElement: Element | null = element

    // Walk up the DOM tree to find the first element with a background color
    while (currentElement) {
      const computedStyle = window.getComputedStyle(currentElement)
      const backgroundColor = computedStyle.backgroundColor

      // Skip transparent/inherit backgrounds
      if (backgroundColor && backgroundColor !== 'rgba(0, 0, 0, 0)' && backgroundColor !== 'transparent') {
        const rgb = getRGBFromComputedStyle(backgroundColor)
        if (rgb) {
          const isDark = isColorDark(rgb)
          const newContrastClass = isDark ? autoContrastVariants.light : autoContrastVariants.dark
          setContrastClass(newContrastClass)
          return
        }
      }

      currentElement = currentElement.parentElement
    }

    // Default to light variant if no background found
    setContrastClass(autoContrastVariants.light)
  }, [enabled, isClient])

  // Run detection when component mounts and becomes visible (client-side only)
  useEffect(() => {
    if (!isClient) return

    detectContrast()

    // Set up observers and listeners
    const observer = new MutationObserver(detectContrast)
    const resizeHandler = () => setTimeout(detectContrast, 10)
    const visibilityHandler = () => {
      if (!document.hidden) {
        setTimeout(detectContrast, 10)
      }
    }

    if (ref.current) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ['class', 'style'],
        childList: true,
        subtree: true
      })
    }

    window.addEventListener('resize', resizeHandler)
    document.addEventListener('visibilitychange', visibilityHandler)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', resizeHandler)
      document.removeEventListener('visibilitychange', visibilityHandler)
    }
  }, [detectContrast, isClient])

  // Also re-run detection when enabled state changes (client-side only)
  useEffect(() => {
    if (enabled && isClient) {
      setTimeout(detectContrast, 10)
    }
  }, [enabled, detectContrast, isClient])

  // Return consistent class for server-side rendering
  return { 
    ref, 
    contrastClass: isClient ? contrastClass : autoContrastVariants.light 
  }
}

// Base icon wrapper component
function createIcon(LucideIcon: LucideIcon) {
  return function Icon({ 
    size = 'md', 
    variant = 'default', 
    className, 
    autoContrast = false,
    ...props 
  }: IconProps & React.ComponentProps<LucideIcon>) {
    const { ref, contrastClass } = useAutoContrast(autoContrast || variant === 'auto-contrast')
    
    const finalVariant = autoContrast || variant === 'auto-contrast' ? 'auto-contrast' : variant
    const colorClass = finalVariant === 'auto-contrast' ? contrastClass : iconVariants[finalVariant]
    
    return (
      <LucideIcon
        ref={ref}
        className={cn(iconSizes[size], colorClass, className)}
        suppressHydrationWarning={autoContrast || variant === 'auto-contrast'}
        {...props}
      />
    )
  }
}

// Export all icons with consistent styling
export const Icons = {
  // Navigation & Actions
  ArrowLeft: createIcon(ArrowLeft),
  ArrowRight: createIcon(ArrowRight),
  ArrowUp: createIcon(ArrowUp),
  ArrowDown: createIcon(ArrowDown),
  ChevronLeft: createIcon(ChevronLeft),
  ChevronRight: createIcon(ChevronRight),
  ChevronUp: createIcon(ChevronUp),
  ChevronDown: createIcon(ChevronDown),
  Menu: createIcon(Menu),
  MoreHorizontal: createIcon(MoreHorizontal),
  MoreVertical: createIcon(MoreVertical),
  Plus: createIcon(Plus),
  X: createIcon(X),
  ExternalLink: createIcon(ExternalLink),
  Link: createIcon(Link),
  Upload: createIcon(Upload),
  
  // Status & Feedback
  Check: createIcon(Check),
  CheckCircle: createIcon(CheckCircle),
  AlertCircle: createIcon(AlertCircle),
  AlertTriangle: createIcon(AlertTriangle),
  Info: createIcon(Info),
  HelpCircle: createIcon(HelpCircle),
  Circle: createIcon(Circle),
  
  // Content & Data
  FileText: createIcon(FileText),
  List: createIcon(List),
  Search: createIcon(Search),
  Filter: createIcon(Filter),
  Copy: createIcon(Copy),
  Edit: createIcon(Edit),
  Trash2: createIcon(Trash2),
  Eye: createIcon(Eye),
  EyeOff: createIcon(EyeOff),
  
  // User & Team
  User: createIcon(User),
  Users: createIcon(Users),
  Mail: createIcon(Mail),
  
  // Time & Planning
  Calendar: createIcon(Calendar),
  Clock: createIcon(Clock),
  
  // Development & Project
  Bug: createIcon(Bug),
  GitBranch: createIcon(GitBranch),
  Target: createIcon(Target),
  Flag: createIcon(Flag),
  Star: createIcon(Star),
  Zap: createIcon(Zap),
  Layers: createIcon(Layers),
  Sparkles: createIcon(Sparkles),
  
  // System
  Settings: createIcon(Settings),
  Refresh: createIcon(RefreshCw),
  RotateCcw: createIcon(RotateCcw),
  Lock: createIcon(Lock),
  Home: createIcon(Home),
  Folder: createIcon(Folder),
  
  // Loading
  Loader: createIcon(Loader2),
}

// Jira-specific status icons with predefined colors
export const StatusIcons = {
  Todo: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-cloud-500'
    return (
      <Circle ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  InProgress: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-royal-950'
    return (
      <Circle ref={ref} className={cn(iconSizes[size], colorClass, 'fill-current', className)} suppressHydrationWarning />
    )
  },
  InReview: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-marigold-500'
    return (
      <Circle ref={ref} className={cn(iconSizes[size], colorClass, 'fill-current', className)} suppressHydrationWarning />
    )
  },
  Done: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-forest-900'
    return (
      <CheckCircle ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  Error: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-coral-500'
    return (
      <AlertCircle ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
}

// Priority icons with predefined colors
export const PriorityIcons = {
  Highest: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-coral-500'
    return (
      <ArrowUp ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  High: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-marigold-500'
    return (
      <ArrowUp ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  Medium: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-royal-950'
    return (
      <ArrowRight ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  Low: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-forest-900'
    return (
      <ArrowDown ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  Lowest: ({ size = 'sm', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-cloud-500'
    return (
      <ArrowDown ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
}

// Work item type icons
export const WorkItemIcons = {
  Epic: ({ size = 'md', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-purple-900'
    return (
      <Zap ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  Story: ({ size = 'md', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-forest-900'
    return (
      <FileText ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  Task: ({ size = 'md', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-royal-950'
    return (
      <CheckCircle ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  Bug: ({ size = 'md', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-coral-500'
    return (
      <Bug ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
  Subtask: ({ size = 'md', className, autoContrast = false }: { size?: IconSize; className?: string; autoContrast?: boolean }) => {
    const { ref, contrastClass } = useAutoContrast(autoContrast)
    const colorClass = autoContrast ? contrastClass : 'text-cloud-600'
    return (
      <List ref={ref} className={cn(iconSizes[size], colorClass, className)} suppressHydrationWarning />
    )
  },
} 