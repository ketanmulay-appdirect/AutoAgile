'use client'

import React from 'react'
import { Sidebar } from './sidebar'

interface AppLayoutProps {
  children: React.ReactNode
  currentView: string
  onViewChange: (view: string) => void
  jiraConnection: any
  devsAIConnection: any
  openAIConnection?: any
  anthropicConnection?: any
}

export function AppLayout({ 
  children, 
  currentView, 
  onViewChange, 
  jiraConnection, 
  devsAIConnection,
  openAIConnection,
  anthropicConnection
}: AppLayoutProps) {
  return (
    <div className="min-h-screen bg-cloud-100 flex">
      {/* Sidebar */}
      <Sidebar
        currentView={currentView}
        onViewChange={onViewChange}
        jiraConnection={jiraConnection}
        devsAIConnection={devsAIConnection}
        openAIConnection={openAIConnection}
        anthropicConnection={anthropicConnection}
      />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {children}
      </div>
    </div>
  )
} 