'use client'

import React, { useState } from 'react'
import { JiraInstance, WorkItemType } from '../types'
import { JiraConnection } from '../components/jira-connection'
import { DevsAIConnection, type DevsAIConnection as DevsAIConnectionType } from '../components/devs-ai-connection'
import { EnhancedWorkItemCreator } from '../components/enhanced-work-item-creator'
import { WorkTypeFormatConfig } from '../components/work-type-format-config'
import { templateService, type WorkItemTemplate } from '../lib/template-service'

export default function Home() {
  const [currentView, setCurrentView] = useState<'create' | 'jira' | 'devs-ai' | 'config'>('create')
  const [jiraConnection, setJiraConnection] = useState<JiraInstance | null>(null)
  const [devsAIConnection, setDevsAIConnection] = useState<DevsAIConnectionType | null>(null)
  const [configWorkItemType, setConfigWorkItemType] = useState<WorkItemType>('story')

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

    // Load DevS.ai connection
    const savedDevsAIConnection = localStorage.getItem('devs-ai-connection')
    if (savedDevsAIConnection) {
      try {
        const parsed = JSON.parse(savedDevsAIConnection)
        setDevsAIConnection(parsed)
      } catch (error) {
        console.error('Failed to parse saved DevS.ai connection:', error)
        localStorage.removeItem('devs-ai-connection')
      }
    }
  }, [])

  // Listen for navigation events from components
  React.useEffect(() => {
    const handleNavigateToJira = () => {
      setCurrentView('jira')
    }

    window.addEventListener('navigate-to-jira', handleNavigateToJira)
    return () => window.removeEventListener('navigate-to-jira', handleNavigateToJira)
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

  const handleJiraConnectionRequired = () => {
    setCurrentView('jira')
  }

  const handleTemplateSaved = (template: WorkItemTemplate) => {
    try {
      templateService.saveTemplate(template)
      setCurrentView('create')
      // Show success message (you could add a toast notification here)
      console.log('Template saved successfully:', template.name)
    } catch (error) {
      console.error('Failed to save template:', error)
      // Show error message (you could add a toast notification here)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Jira AI Content Generator
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Generate professional Jira initiatives, epics, and stories using AI. 
            Create content and push directly to your Jira instance.
          </p>
        </div>

        {/* Navigation */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setCurrentView('create')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentView === 'create'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Create & Push
            </button>
            <button
              onClick={() => setCurrentView('jira')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentView === 'jira'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Jira Connection
              {jiraConnection && (
                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block"></span>
              )}
            </button>
            <button
              onClick={() => setCurrentView('devs-ai')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentView === 'devs-ai'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              DevS.ai Connection
              {devsAIConnection && (
                <span className="ml-2 w-2 h-2 bg-green-500 rounded-full inline-block"></span>
              )}
            </button>
            <button
              onClick={() => setCurrentView('config')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentView === 'config'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Configure Templates
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {currentView === 'create' && (
            <EnhancedWorkItemCreator
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
            <div className="space-y-6">
              {/* Work Item Type Selector */}
              <div className="bg-white rounded-lg shadow-lg p-6">
                <h2 className="text-xl font-bold mb-4">Configure Content Templates</h2>
                <p className="text-gray-600 mb-6">
                  Customize the fields and AI prompts for different work item types.
                </p>
                
                <div className="flex space-x-4 mb-6">
                  {(['story', 'epic', 'initiative'] as WorkItemType[]).map((type) => (
                    <button
                      key={type}
                      onClick={() => setConfigWorkItemType(type)}
                      className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                        configWorkItemType === type
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <WorkTypeFormatConfig
                workItemType={configWorkItemType}
                template={templateService.getDefaultTemplate(configWorkItemType)}
                onSave={handleTemplateSaved}
                onCancel={() => setCurrentView('create')}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
} 