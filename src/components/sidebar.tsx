'use client'

import React, { useState } from 'react'
import { Icons } from './ui/icons'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { cn } from '../lib/utils'

interface SidebarProps {
  currentView: string
  onViewChange: (view: string) => void
  jiraConnection: any
  devsAIConnection: any
}

export function Sidebar({ currentView, onViewChange, jiraConnection, devsAIConnection }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const navigationItems = [
    {
      id: 'create',
      label: 'Create & Push',
      icon: Icons.Plus,
      description: 'Create and push work items to Jira'
    },
    {
      id: 'content-studio',
      label: 'Content Studio',
      icon: Icons.FileText,
      description: 'Generate content for existing work items'
    },
    {
      id: 'jira',
      label: 'Jira Connection',
      icon: Icons.Link,
      description: 'Configure Jira instance connection',
      status: jiraConnection ? 'connected' : 'disconnected'
    },
    {
      id: 'devs-ai',
      label: 'Devs.ai Connection',
      icon: Icons.Zap,
      description: 'Configure AI content generation',
      status: devsAIConnection ? 'connected' : 'disconnected'
    },
    {
      id: 'config',
      label: 'Configure Templates',
      icon: Icons.Settings,
      description: 'Manage work item templates'
    }
  ] as const

  return (
    <div className={cn(
      "bg-white border-r border-cloud-300 shadow-sm transition-all duration-300 ease-in-out flex flex-col",
      isCollapsed ? "w-16" : "w-64"
    )}>
      {/* Sidebar Header */}
      <div className="p-4 border-b border-cloud-200">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <div className="flex items-center space-x-2">
              <Icons.Target size="md" variant="accent" />
              <span className="font-semibold text-navy-950">AutoAgile</span>
            </div>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-2"
          >
            <Icons.Menu size="sm" />
          </Button>
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 p-2">
        <div className="space-y-1">
          {navigationItems.map((item) => {
            const IconComponent = item.icon
            const isActive = currentView === item.id
            
            return (
              <Button
                key={item.id}
                variant={isActive ? "default" : "ghost"}
                className={cn(
                  "w-full justify-start h-auto p-3 relative",
                  isCollapsed ? "px-3" : "px-3"
                )}
                onClick={() => onViewChange(item.id)}
              >
                <div className={cn(
                  "flex items-center",
                  isCollapsed ? "justify-center" : "space-x-3"
                )}>
                  <IconComponent 
                    size="sm" 
                    autoContrast={isActive}
                  />
                  {!isCollapsed && (
                    <div className="flex-1 text-left">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs opacity-75 mt-0.5">{item.description}</div>
                    </div>
                  )}
                </div>
                
                {!isCollapsed && 'status' in item && item.status && (
                  <Badge 
                    variant={item.status === 'connected' ? 'success' : 'secondary'}
                    className="text-xs ml-2"
                  >
                    {item.status === 'connected' ? 'Connected' : 'Disconnected'}
                  </Badge>
                )}
                
                {isCollapsed && 'status' in item && item.status && (
                  <div className={cn(
                    "absolute -top-1 -right-1 w-3 h-3 rounded-full",
                    item.status === 'connected' ? 'bg-mint-500' : 'bg-cloud-400'
                  )} />
                )}
              </Button>
            )
          })}
        </div>
      </nav>

      {/* Sidebar Footer */}
      {!isCollapsed && (
        <div className="p-4 border-t border-cloud-200">
          <div className="text-xs text-cloud-600 text-center">
            AutoAgile v1.0
          </div>
        </div>
      )}
    </div>
  )
} 