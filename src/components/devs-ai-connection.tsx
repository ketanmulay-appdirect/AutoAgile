'use client'

import React, { useState, useEffect } from 'react'

export interface DevsAIConnection {
  apiToken: string
}

interface DevsAIConnectionProps {
  onConnectionSaved: (connection: DevsAIConnection) => void
  onConnectionRemoved?: () => void
}

export function DevsAIConnection({ onConnectionSaved, onConnectionRemoved }: DevsAIConnectionProps) {
  const [isConnected, setIsConnected] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connection, setConnection] = useState<Partial<DevsAIConnection>>({
    apiToken: ''
  })
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null)

  useEffect(() => {
    // Load saved connection from localStorage
    const savedConnection = localStorage.getItem('devs-ai-connection')
    if (savedConnection) {
      const parsed = JSON.parse(savedConnection)
      setConnection(parsed)
      setIsConnected(true)
    }
  }, [])

  const handleInputChange = (field: keyof DevsAIConnection, value: string) => {
    setConnection(prev => ({ ...prev, [field]: value }))
    setTestResult(null)
  }

  const testConnection = async () => {
    if (!connection.apiToken) {
      setTestResult({ success: false, message: 'Please provide your Devs.ai API token' })
      return
    }

    setIsConnecting(true)
    setTestResult(null)

    try {
      const response = await fetch('/api/devs-ai/test-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiToken: connection.apiToken }),
      })

      const result = await response.json()

      if (response.ok) {
        setTestResult({ success: true, message: 'Connection successful!' })
        setIsConnected(true)
        
        // Save connection to localStorage
        localStorage.setItem('devs-ai-connection', JSON.stringify(connection))
        
        onConnectionSaved(connection as DevsAIConnection)
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
      apiToken: ''
    })
    setIsConnected(false)
    setTestResult(null)
    localStorage.removeItem('devs-ai-connection')
    onConnectionRemoved?.()
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Devs.ai Connection</h2>
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
            API Token *
          </label>
          <input
            type="password"
            value={connection.apiToken || ''}
            onChange={(e) => handleInputChange('apiToken', e.target.value)}
            placeholder="Your Devs.ai secret key (starts with sk-)"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={isConnected}
          />
          <p className="mt-1 text-sm text-gray-500">
            Your Devs.ai secret key from the API Keys page
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
              disabled={isConnecting || !connection.apiToken}
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
        <div className="mt-6 space-y-4">
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="text-sm font-medium text-blue-800 mb-2">Setup Instructions:</h3>
            <ol className="text-sm text-blue-700 space-y-1 list-decimal list-inside">
              <li>Create an account at <a href="https://devs.ai" target="_blank" rel="noopener noreferrer" className="underline">Devs.ai</a></li>
              <li><strong>Log into your Devs.ai dashboard and keep it open</strong></li>
              <li>Navigate to <a href="https://devs.ai/api-keys" target="_blank" rel="noopener noreferrer" className="underline">API Keys page</a></li>
              <li>Click "Create new secret key" and add appropriate scopes</li>
              <li>Copy the generated secret key (starts with "sk-")</li>
              <li>Paste the key above and test the connection</li>
            </ol>
          </div>

          <div className="p-4 bg-amber-50 border border-amber-200 rounded-md">
            <h3 className="text-sm font-medium text-amber-800 mb-2">Important Authentication Notes:</h3>
            <ul className="text-sm text-amber-700 space-y-1 list-disc list-inside">
              <li><strong>You must be logged into Devs.ai in your browser</strong> for API calls to work</li>
              <li>Devs.ai uses both session authentication and API keys</li>
              <li>Required scopes: ai.read.self, ai.write.self, chats.read.self, chats.write.self</li>
              <li>Keep your secret key secure and never share it publicly</li>
              <li>If you get authentication errors, ensure you're logged into Devs.ai</li>
            </ul>
          </div>

          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h3 className="text-sm font-medium text-green-800 mb-2">Available Models:</h3>
            <div className="text-sm text-green-700 grid grid-cols-2 gap-2">
              <div>• GPT-4 & GPT-4 Turbo</div>
              <div>• Claude 3 (Opus, Sonnet, Haiku)</div>
              <div>• Gemini Pro & 1.5 Pro</div>
              <div>• GPT-3.5 Turbo</div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
} 