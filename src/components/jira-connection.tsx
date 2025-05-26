'use client'

import React, { useState, useEffect } from 'react'
import { JiraInstance } from '../types'

interface JiraConnectionProps {
  onConnectionSaved: (connection: JiraInstance) => void
  onConnectionRemoved?: () => void
}

export function JiraConnection({ onConnectionSaved, onConnectionRemoved }: JiraConnectionProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connection, setConnection] = useState<Partial<JiraInstance>>({
    url: '',
    email: '',
    apiToken: '',
    projectKey: ''
  })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    // Load saved connection from localStorage
    const savedConnection = localStorage.getItem('jira-connection')
    if (savedConnection) {
      const parsed = JSON.parse(savedConnection)
      setConnection(parsed)
      setIsConnected(true)
    }
  }, [])

  const handleInputChange = (field: keyof JiraInstance, value: string) => {
    setConnection(prev => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  const testConnection = async () => {
    if (!connection.url || !connection.email || !connection.apiToken) {
      setTestResult({ success: false, message: 'Please fill in all required fields' })
      return
    }

    setIsConnecting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/jira/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(connection),
      })

      const result = await response.json()

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' })
        setIsConnected(true)
        
        // Save connection to localStorage
        localStorage.setItem('jira-connection', JSON.stringify(connection))
        
        onConnectionSaved(connection as JiraInstance)
      } else {
        setTestResult({ success: false, message: result.error || 'Connection failed' })
        setIsConnected(false)
      }
    } catch (error) {
      setTestResult({ success: false, message: 'Network error. Please check your connection.' })
      setIsConnected(false)
    } finally {
      setIsConnecting(false)
    }
  }

  const disconnect = () => {
    setConnection({
      url: '',
      email: '',
      apiToken: '',
      projectKey: ''
    })
    setIsConnected(false)
    setTestResult(null)
    localStorage.removeItem('jira-connection')
    onConnectionRemoved?.()
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Jira Connection</h2>
        {isConnected && (
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-600 font-medium">Connected</span>
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Jira Instance URL *
          </label>
          <input
            type="url"
            value={connection.url || ''}
            onChange={(e) => handleInputChange('url', e.target.value)}
            placeholder="https://your-domain.atlassian.net"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isConnected}
          />
          <p className="mt-1 text-sm text-gray-500">
            Your Jira Cloud instance URL
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address *
          </label>
          <input
            type="email"
            value={connection.email || ''}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="your-email@company.com"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isConnected}
          />
          <p className="mt-1 text-sm text-gray-500">
            Your Jira account email address
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            API Token *
          </label>
          <input
            type="password"
            value={connection.apiToken || ''}
            onChange={(e) => handleInputChange('apiToken', e.target.value)}
            placeholder="Your Jira API token"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isConnected}
          />
          <p className="mt-1 text-sm text-gray-500">
            <a 
              href="https://id.atlassian.com/manage-profile/security/api-tokens" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Create an API token here
            </a>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Default Project Key
          </label>
          <input
            type="text"
            value={connection.projectKey || ''}
            onChange={(e) => handleInputChange('projectKey', e.target.value)}
            placeholder="PROJ"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isConnected}
          />
          <p className="mt-1 text-sm text-gray-500">
            Default project key for creating issues (optional)
          </p>
        </div>

        {testResult && (
          <div className={`p-3 rounded-md ${
            testResult.success 
              ? 'bg-green-50 border border-green-200 text-green-800' 
              : 'bg-red-50 border border-red-200 text-red-800'
          }`}>
            {testResult.message}
          </div>
        )}

        <div className="flex space-x-3">
          {!isConnected ? (
            <button 
              onClick={testConnection}
              disabled={isConnecting || !connection.url || !connection.email || !connection.apiToken}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isConnecting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Testing Connection...
                </>
              ) : (
                'Test & Save Connection'
              )}
            </button>
          ) : (
            <button 
              onClick={disconnect}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Disconnect
            </button>
          )}
        </div>
      </div>

      {!isConnected && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="text-sm font-medium text-blue-800 mb-2">Setup Instructions:</h3>
          <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
            <li>Go to your Jira Cloud instance</li>
            <li>Navigate to Account Settings → Security → API tokens</li>
            <li>Create a new API token</li>
            <li>Copy the token and paste it above</li>
            <li>Test the connection to verify it works</li>
          </ol>
        </div>
      )}
    </div>
  )
} 