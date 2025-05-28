'use client'

import React, { useState } from 'react'
import { JiraInstance } from '../types'
import { JiraConnection } from '../components/jira-connection'
import { DevsAIConnection } from '../components/devs-ai-connection'
import { EnhancedWorkItemCreator } from '../components/enhanced-work-item-creator'
import { TemplateConfiguration } from '../components/template-configuration'
import { ContentStudio } from '../components/content-studio'
import { Button } from '../components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { DevsAIConnection as DevsAIConnectionType } from '../components/devs-ai-connection'

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

  const navigationItems = [
    {
      id: 'create-push',
      label: 'Create & Push',
      description: 'Create and push work items to Jira',
      status: jiraConnection ? 'connected' : 'not-connected'
    },
    {
      id: 'content-studio',
      label: 'Content Studio',
      description: 'Generate content for existing work items'
    },
    {
      id: 'jira-connection',
      label: 'Jira Connection',
      description: 'Configure Jira instance connection',
      status: jiraConnection ? 'connected' : 'not-connected'
    },
    {
      id: 'devs-ai-connection',
      label: 'Devs.ai Connection',
      description: 'Configure AI service connection',
      status: devsAIConnection ? 'connected' : 'not-connected'
    },
    {
      id: 'template-configuration',
      label: 'Template Configuration',
      description: 'Customize AI instructions and templates'
    }
  ] as const

  return (
    <div className="min-h-screen bg-cloud-100">
      {/* Header */}
      <header className="bg-white border-b border-cloud-300 shadow-sm">
        <div className="container mx-auto px-6 py-6">
          <div className="text-center">
            <div className="flex items-center justify-center mb-4">
              <h1 className="text-3xl font-bold text-navy-950">AutoAgile</h1>
            </div>
            <p className="text-lg text-cloud-700 max-w-4xl mx-auto">
              Generate and push professional Jira and presentation materials items using AI.
            </p>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-6 py-8">
        {/* Navigation */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Button
                variant="outline"
                onClick={() => setCurrentView('create')}
                className="md:hidden"
              >
                Navigation
              </Button>
            </CardTitle>
            <CardDescription>
              Choose a section to get started with your Jira AI workflow
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {navigationItems.map((item) => {
                const isActive = currentView === item.id
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? "default" : "outline"}
                    className="h-auto p-4 flex flex-col items-center space-y-2 relative"
                    onClick={() => setCurrentView(item.id as any)}
                  >
                    <div className="text-center">
                      <div className="font-medium text-sm">{item.label}</div>
                      <div className="text-xs opacity-75 mt-1">{item.description}</div>
                    </div>
                    {'status' in item && item.status && (
                      <Badge 
                        variant={item.status === 'connected' ? 'success' : 'secondary'}
                        className="text-xs"
                      >
                        {item.status === 'connected' ? 'Connected' : 'Not Connected'}
                      </Badge>
                    )}
                  </Button>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Content */}
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
    </div>
  )
} 