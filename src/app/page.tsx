'use client'

import React, { useState } from 'react'
import { JiraInstance } from '../types'
import { JiraConnection } from '../components/jira-connection'
import { DevsAIConnection, type DevsAIConnection as DevsAIConnectionType } from '../components/devs-ai-connection'
import { EnhancedWorkItemCreator } from '../components/enhanced-work-item-creator'
import { TemplateConfiguration } from '../components/template-configuration'
import { ContentStudio } from '../components/content-studio'
import { AppLayout } from '../components/app-layout'
import { Icons } from '../components/ui/icons'

export default function Home() {
  const [currentView, setCurrentView] = useState<'create' | 'jira' | 'devs-ai' | 'config' | 'content-studio'>('create')
  const [jiraConnection, setJiraConnection] = useState<JiraInstance | null>(null)
  const [devsAIConnection, setDevsAIConnection] = useState<DevsAIConnectionType | null>(null)

  // Load connections from localStorage on mount
  React.useEffect(() => {
    // Load Jira connection
    const savedJiraConnection = localStorage.getItem('jira-connection')
    if (savedJiraConnection) {
      try {
        const parsed = JSON.parse(savedJiraConnection)
        setJiraConnection(parsed)
      } catch (error) {
        console.error('Failed to parse saved Jira connection:', error)
        localStorage.removeItem('jira-connection')
      }
    }

    // Load Devs.ai connection
    const savedDevsAIConnection = localStorage.getItem('devs-ai-connection')
    if (savedDevsAIConnection) {
      try {
        const parsed = JSON.parse(savedDevsAIConnection)
        setDevsAIConnection(parsed)
      } catch (error) {
        console.error('Failed to parse saved Devs.ai connection:', error)
        localStorage.removeItem('devs-ai-connection')
      }
    }
  }, [])

  // Listen for navigation events from components
  React.useEffect(() => {
    const handleNavigateToJira = () => {
      setCurrentView('jira')
    }

    const handleNavigateToConfig = () => {
      setCurrentView('config')
    }

    window.addEventListener('navigate-to-jira', handleNavigateToJira)
    window.addEventListener('navigate-to-config', handleNavigateToConfig)
    
    return () => {
      window.removeEventListener('navigate-to-jira', handleNavigateToJira)
      window.removeEventListener('navigate-to-config', handleNavigateToConfig)
    }
  }, [])

  const handleJiraConnectionSaved = (connection: JiraInstance) => {
    setJiraConnection(connection)
    setCurrentView('create')
  }

  const handleJiraConnectionRemoved = () => {
    setJiraConnection(null)
  }

  const handleDevsAIConnectionSaved = (connection: DevsAIConnectionType) => {
    setDevsAIConnection(connection)
    setCurrentView('create')
  }

  const handleDevsAIConnectionRemoved = () => {
    setDevsAIConnection(null)
  }

  const handleViewChange = (view: string) => {
    setCurrentView(view as 'create' | 'jira' | 'devs-ai' | 'config' | 'content-studio')
  }

  return (
    <AppLayout
      currentView={currentView}
      onViewChange={handleViewChange}
      jiraConnection={jiraConnection}
      devsAIConnection={devsAIConnection}
    >
      {/* Header */}
      <header className="bg-white border-b border-cloud-300 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <Icons.Target size="xl" variant="accent" className="mr-3" />
              <h1 className="text-4xl font-bold text-navy-950">
                AutoAgile
              </h1>
            </div>
            <p className="text-lg text-cloud-700 max-w-4xl mx-auto">
              Generate and push professional Jira and presentation materials using AI.
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 container mx-auto px-6 py-8">
        <div className="max-w-7xl mx-auto">
          {currentView === 'create' && (
            <EnhancedWorkItemCreator
              jiraConnection={jiraConnection}
              devsAIConnection={devsAIConnection}
            />
          )}

          {currentView === 'content-studio' && (
            <ContentStudio
              jiraConnection={jiraConnection}
              devsAIConnection={devsAIConnection}
            />
          )}

          {currentView === 'jira' && (
            <JiraConnection 
              onConnectionSaved={handleJiraConnectionSaved}
              onConnectionRemoved={handleJiraConnectionRemoved}
            />
          )}

          {currentView === 'devs-ai' && (
            <DevsAIConnection 
              onConnectionSaved={handleDevsAIConnectionSaved}
              onConnectionRemoved={handleDevsAIConnectionRemoved}
            />
          )}

          {currentView === 'config' && (
            <TemplateConfiguration
              onClose={() => setCurrentView('create')}
            />
          )}
        </div>
      </div>
    </AppLayout>
  )
} 