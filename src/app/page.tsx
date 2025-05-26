'use client'

import React, { useState } from 'react'
import { JiraInstance } from '../types'
import { JiraConnection } from '../components/jira-connection'
import { EnhancedWorkItemCreator } from '../components/enhanced-work-item-creator'
// import { WorkTypeFormatConfig } from '../components/work-type-format-config'

export default function Home() {
  const [currentView, setCurrentView] = useState<'create' | 'jira' | 'config'>('create')
  const [jiraConnection, setJiraConnection] = useState<JiraInstance | null>(null)

  // Load Jira connection from localStorage on mount
  React.useEffect(() => {
    const savedConnection = localStorage.getItem('jira-connection')
    if (savedConnection) {
      try {
        const parsed = JSON.parse(savedConnection)
        setJiraConnection(parsed)
      } catch (error) {
        console.error('Failed to parse saved Jira connection:', error)
        localStorage.removeItem('jira-connection')
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

  const handleJiraConnectionRequired = () => {
    setCurrentView('jira')
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
{/* Temporarily disabled due to build issues
            <button
              onClick={() => setCurrentView('config')}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                currentView === 'config'
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
              }`}
            >
              Configure Formats
            </button>
            */}
          </div>
        </div>

        {/* Content */}
        <div className="max-w-4xl mx-auto">
          {currentView === 'create' && (
            <EnhancedWorkItemCreator
              jiraConnection={jiraConnection}
            />
          )}

          {currentView === 'jira' && (
            <JiraConnection 
              onConnectionSaved={handleJiraConnectionSaved}
              onConnectionRemoved={handleJiraConnectionRemoved}
            />
          )}

{/* Temporarily disabled due to build issues
          {currentView === 'config' && (
            <WorkTypeFormatConfig
              workItemType="story"
              onSave={(template) => {
                console.log('Template saved:', template)
                // TODO: Save to database
              }}
              onCancel={() => setCurrentView('create')}
            />
          )}
          */}
        </div>
      </div>
    </div>
  )
} 