'use client'

import React, { useState, useEffect } from 'react'
import { WorkItemType, GeneratedContent, AIModel, JiraInstance } from '../types'
import { ContentEditor } from './content-editor'
import { ToastContainer } from './ui/toast'
import { useToast } from '../hooks/use-toast'
import { devsAIService } from '../lib/devs-ai-service'
import { templateService, type WorkItemTemplate } from '../lib/template-service'
import { type DevsAIConnection } from './devs-ai-connection'
import { FieldValidationModal } from './field-validation-modal'
import { fieldValidationService, type MissingField } from '../lib/field-validation-service'
import { jiraFieldService, type JiraField } from '../lib/jira-field-service'

interface EnhancedWorkItemCreatorProps {
  jiraConnection: JiraInstance | null
  devsAIConnection?: DevsAIConnection | null
}

// Helper function to parse generated content into structured format
function parseGeneratedContent(content: string, workItemType: WorkItemType): GeneratedContent {
  const lines = content.split('\n')
  const title = lines.find(line => line.startsWith('#'))?.replace(/^#+\s*/, '') || `Generated ${workItemType}`
  
  // Extract acceptance criteria if present
  const acceptanceCriteria: string[] = []
  let inAcceptanceCriteria = false
  
  for (const line of lines) {
    if (line.toLowerCase().includes('acceptance criteria')) {
      inAcceptanceCriteria = true
      continue
    }
    if (inAcceptanceCriteria && line.trim().startsWith('-')) {
      acceptanceCriteria.push(line.replace(/^-\s*/, '').trim())
    } else if (inAcceptanceCriteria && line.trim() === '') {
      continue
    } else if (inAcceptanceCriteria && !line.startsWith(' ') && line.trim() !== '') {
      inAcceptanceCriteria = false
    }
  }
  
  return {
    title,
    description: content,
    acceptanceCriteria,
    priority: 'Medium',
    labels: [],
    storyPoints: workItemType === 'story' ? 5 : undefined,
    customFields: {}
  }
}

export function EnhancedWorkItemCreator({ jiraConnection, devsAIConnection }: EnhancedWorkItemCreatorProps) {
  const [workItemType, setWorkItemType] = useState<WorkItemType>('epic')
  const [description, setDescription] = useState('')
  const [aiModel, setAiModel] = useState<AIModel>('auto')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isPushing, setIsPushing] = useState(false)
  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [jiraIssueUrl, setJiraIssueUrl] = useState<string | null>(null)
  const [isDevsAIReady, setIsDevsAIReady] = useState(false)
  const [selectedDevsAIModel, setSelectedDevsAIModel] = useState('gpt-4')
  const [selectedTemplate, setSelectedTemplate] = useState<string>('default')
  
  // Client-side template state
  const [availableTemplates, setAvailableTemplates] = useState<WorkItemTemplate[]>([])
  const [currentTemplate, setCurrentTemplate] = useState<WorkItemTemplate | null>(null)
  const [isTemplatesLoaded, setIsTemplatesLoaded] = useState(false)
  
  // Field validation state
  const [showValidationModal, setShowValidationModal] = useState(false)
  const [validationMissingFields, setValidationMissingFields] = useState<MissingField[]>([])
  const [jiraFields, setJiraFields] = useState<JiraField[]>([])
  const [isLoadingFields, setIsLoadingFields] = useState(false)
  const [pendingContent, setPendingContent] = useState<GeneratedContent | null>(null)
  const [extractedFields, setExtractedFields] = useState<Record<string, any>>({})
  const [fieldSuggestions, setFieldSuggestions] = useState<Record<string, any[]>>({})
  
  const { toasts, removeToast, success, error, warning, info } = useToast()

  // Load templates on client-side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const templates = templateService.getTemplatesByType(workItemType)
        setAvailableTemplates(templates)
        
        const template = templates.find(t => t.id === selectedTemplate) || templateService.getDefaultTemplate(workItemType)
        setCurrentTemplate(template)
        setIsTemplatesLoaded(true)
      } catch (error) {
        console.error('Failed to load templates:', error)
        // Fallback to default template
        const defaultTemplate = templateService.getDefaultTemplate(workItemType)
        setAvailableTemplates([defaultTemplate])
        setCurrentTemplate(defaultTemplate)
        setIsTemplatesLoaded(true)
      }
    }
  }, [workItemType, selectedTemplate])

  // Load Jira fields when connection is available
  useEffect(() => {
    if (jiraConnection) {
      const loadJiraFields = async () => {
        try {
          setIsLoadingFields(true)
          console.log('Loading Jira fields for', workItemType)
          
          // Use the new field discovery API
          const response = await fetch('/api/jira/discover-fields', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              jiraConnection,
              workItemType
            }),
          })

          if (response.ok) {
            const data = await response.json()
            console.log(`Discovered ${data.fields.length} Jira fields for ${workItemType}`)
            
            // Convert the discovered fields to our JiraField format
            const jiraFieldsData = data.fields.map((field: any) => ({
              id: field.id,
              name: field.name,
              type: field.type,
              required: field.required,
              allowedValues: field.allowedValues?.map((v: any) => 
                typeof v === 'object' ? (v.name || v.value || v.id) : v
              ),
              description: field.description,
              schema: field.schema,
              isMultiSelect: field.isMultiSelect
            }))
            
            setJiraFields(jiraFieldsData)
            
            // Show info about discovered fields
            const requiredFields = jiraFieldsData.filter((f: any) => f.required)
            if (requiredFields.length > 0) {
              info(
                'Jira Fields Discovered', 
                `Found ${requiredFields.length} required field(s) for ${workItemType}. These will be validated before creating issues.`
              )
            }
          } else {
            console.warn('Failed to discover Jira fields, falling back to error-based discovery')
            // Fallback to the old method
            let fieldMapping = jiraFieldService.getFieldMapping(workItemType)
            
            if (!fieldMapping) {
              fieldMapping = await jiraFieldService.discoverFields(jiraConnection, workItemType)
            }
            
            if (fieldMapping) {
              setJiraFields(fieldMapping.fields)
            }
          }
        } catch (error) {
          console.error('Error loading Jira fields:', error)
          warning('Field Discovery Failed', 'Unable to discover Jira fields. Some validation may be limited.')
        } finally {
          setIsLoadingFields(false)
        }
      }

      loadJiraFields()
    } else {
      setJiraFields([])
    }
  }, [jiraConnection, workItemType])

  // Check for DevS.ai connection on component mount
  useEffect(() => {
    if (devsAIConnection) {
      devsAIService.initialize(devsAIConnection.apiToken)
      setIsDevsAIReady(true)
    } else {
      const savedConnection = devsAIService.loadSavedConnection()
      if (savedConnection) {
        devsAIService.initialize(savedConnection.apiToken)
        setIsDevsAIReady(true)
      }
    }
  }, [devsAIConnection])

  // Reset template selection when work item type changes
  useEffect(() => {
    setSelectedTemplate('default')
  }, [workItemType])

  const handleGenerate = async () => {
    if (!description.trim()) {
      warning('Missing Description', 'Please enter a description for the work item.')
      return
    }

    if (!currentTemplate) {
      warning('Template Not Loaded', 'Please wait for templates to load.')
      return
    }

    // Handle DevS.ai setup first if needed
    if (aiModel === 'devs-ai' && !isDevsAIReady) {
      warning('DevS.ai Not Connected', 'Please connect to DevS.ai first in the DevS.ai Connection tab.')
      return
    }

    setIsGenerating(true)
    setGeneratedContent(null)
    setJiraIssueUrl(null)

    try {
      // Generate custom prompt using template
      const customPrompt = templateService.generatePrompt(currentTemplate, description)
      
      // Handle DevS.ai separately
      if (aiModel === 'devs-ai') {
        // Use DevS.ai service to generate content with custom prompt
        const devsAIContent = await devsAIService.generateContent(customPrompt, selectedDevsAIModel)
        
        // Parse the generated content into the expected format
        const content = parseGeneratedContent(devsAIContent, workItemType)
        setGeneratedContent(content)
        
        success('Content Generated', `${workItemType} content has been generated successfully using DevS.ai (${selectedDevsAIModel}) with ${currentTemplate.name}.`)
      } else {
        // Handle other AI models with custom prompt
        const response = await fetch('/api/generate-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            type: workItemType,
            description: customPrompt, // Use the template-generated prompt
            context: {
              preferredModel: aiModel,
              template: currentTemplate.name
            }
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to generate content')
        }
        
        // Parse the generated content into the expected format
        const content = parseGeneratedContent(data.content, workItemType)
        setGeneratedContent(content)
        
        const modelInfo = data.metadata?.model || 'AI'
        success('Content Generated', `${workItemType} content has been generated successfully using ${modelInfo} with ${currentTemplate.name}.`)
      }
    } catch (err) {
      console.error('Error generating content:', err)
      error('Generation Failed', 'Failed to generate content. Please try again.')
    } finally {
      setIsGenerating(false)
    }
  }

  const handlePushToJira = async (content: GeneratedContent) => {
    if (!jiraConnection) {
      warning('Jira Not Connected', 'Please connect to Jira first in the Jira Connection tab.')
      return
    }

    if (!content.title.trim() || !content.description.trim()) {
      warning('Missing Required Fields', 'Title and description are required to create a Jira issue.')
      return
    }

    // Ensure we have Jira fields loaded
    if (jiraFields.length === 0) {
      console.log('No Jira fields loaded, attempting to discover them now...')
      try {
        const fieldMapping = await jiraFieldService.discoverFields(jiraConnection, workItemType)
        if (fieldMapping) {
          setJiraFields(fieldMapping.fields)
        }
      } catch (error) {
        console.error('Failed to discover fields during push:', error)
      }
    }

    // Validate fields with smart extraction before pushing
    if (jiraFields.length > 0) {
      try {
        // Get AI provider info for field extraction
        let aiProvider: string | undefined
        let apiKey: string | undefined
        
        if (aiModel === 'devs-ai' && isDevsAIReady) {
          aiProvider = 'devs-ai'
          const savedConnection = devsAIService.loadSavedConnection()
          apiKey = savedConnection?.apiToken
        }

        console.log('Starting field validation with extraction...')
        const validationResult = await fieldValidationService.validateContentWithExtraction(
          content,
          workItemType,
          currentTemplate,
          jiraFields,
          aiProvider,
          apiKey
        )

        // Store extracted fields and suggestions for the modal
        setExtractedFields(validationResult.extractedFields || {})
        setFieldSuggestions(validationResult.suggestions || {})

        if (validationResult.extractedFields && Object.keys(validationResult.extractedFields).length > 0) {
          info('Smart Fields Extracted', `Automatically extracted ${Object.keys(validationResult.extractedFields).length} field(s) from your description.`)
        }

        if (!validationResult.isValid) {
          console.log(`Validation failed: ${validationResult.missingFields.length} missing fields`)
          // Show validation modal with missing fields and suggestions
          setValidationMissingFields(validationResult.missingFields)
          setPendingContent({
            ...content,
            customFields: {
              ...content.customFields,
              ...validationResult.extractedFields
            }
          })
          setShowValidationModal(true)
          return
        }

        // If validation passed, update content with extracted fields
        if (validationResult.extractedFields && Object.keys(validationResult.extractedFields).length > 0) {
          content = {
            ...content,
            customFields: {
              ...content.customFields,
              ...validationResult.extractedFields
            }
          }
        }
      } catch (validationError) {
        console.error('Field validation error:', validationError)
        warning('Validation Error', 'Unable to validate fields. Proceeding with basic validation.')
      }
    }

    // Proceed with Jira creation
    await createJiraIssue(content)
  }

  const createJiraIssue = async (content: GeneratedContent) => {
    if (!jiraConnection) {
      error('Jira Not Connected', 'Jira connection is required to create an issue.')
      return
    }

    setIsPushing(true)

    try {
      const response = await fetch('/api/jira/create-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jiraConnection,
          workItemType,
          content,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        
        // Check if this is a field discovery error
        if (errorData.fieldDiscovery && errorData.jiraError) {
          console.log('Field discovery error detected, discovering fields from error...')
          
          try {
            // Discover fields from the error
            const fieldMapping = await jiraFieldService.discoverFieldsFromError(
              jiraConnection,
              workItemType,
              errorData.jiraError
            )
            
            if (fieldMapping) {
              // Update the jiraFields state with discovered fields
              setJiraFields(fieldMapping.fields)
              
              // Show info about discovered fields
              info(
                'Required Fields Discovered', 
                `Discovered ${fieldMapping.fields.length} required fields from Jira. Please fill in the missing information.`
              )
              
              // Trigger field validation with the discovered fields
              const validationResult = await fieldValidationService.validateContent(
                content,
                workItemType,
                currentTemplate,
                fieldMapping.fields
              )
              
              if (!validationResult.isValid) {
                // Show validation modal with the newly discovered fields
                setValidationMissingFields(validationResult.missingFields)
                setPendingContent(content)
                setShowValidationModal(true)
                return
              }
            }
          } catch (discoveryError) {
            console.error('Field discovery failed:', discoveryError)
          }
        }
        
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const issueUrl = `${jiraConnection.url}/browse/${data.issue.key}`
      setJiraIssueUrl(issueUrl)
      
      success(
        'Issue Created Successfully!', 
        `${workItemType.charAt(0).toUpperCase() + workItemType.slice(1)} ${data.issue.key} has been created in Jira.`
      )
    } catch (err) {
      console.error('Error creating Jira issue:', err)
      error('Jira Creation Failed', err instanceof Error ? err.message : 'Failed to create issue in Jira.')
    } finally {
      setIsPushing(false)
    }
  }

  const handleValidationSubmit = async (updatedContent: GeneratedContent, customFields: Record<string, any>) => {
    setShowValidationModal(false)
    await createJiraIssue(updatedContent)
  }

  const handleValidationCancel = () => {
    setShowValidationModal(false)
    setPendingContent(null)
    setValidationMissingFields([])
  }

  const handleContentSave = (content: GeneratedContent) => {
    setGeneratedContent(content)
    setIsEditing(false)
    info('Content Updated', 'Your changes have been saved.')
  }

  const handleReset = () => {
    setDescription('')
    setGeneratedContent(null)
    setIsEditing(false)
    setJiraIssueUrl(null)
    info('Form Reset', 'The form has been reset.')
  }

  // Show loading state while templates are loading
  if (!isTemplatesLoaded) {
    return (
      <div className="space-y-6">
        <div className="bg-blue-100 border border-blue-300 rounded-md p-3 text-sm text-blue-800 font-medium">
          🔄 Loading templates...
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />
      
      {/* Debug indicator */}
      <div className="bg-green-100 border border-green-300 rounded-md p-3 text-sm text-green-800 font-medium">
        ✅ Enhanced Work Item Creator - Push to Jira functionality is available!
      </div>
      
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Create Work Item</h2>
        <p className="text-gray-600">Generate professional Jira content with AI and push directly to your instance</p>
      </div>

      {/* Input Form */}
      <div className="bg-white rounded-lg shadow-sm border p-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Item Type
            </label>
            <select
              value={workItemType}
              onChange={(e) => {
                setWorkItemType(e.target.value as WorkItemType)
                setSelectedTemplate('default') // Reset template when work item type changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating || isPushing}
            >
              <option value="epic">Epic</option>
              <option value="story">Story</option>
              <option value="initiative">Initiative</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Content Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating || isPushing}
            >
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              AI Model
            </label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value as AIModel)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={isGenerating || isPushing}
            >
              <option value="auto">Auto (Free - Gemini)</option>
              <option value="gemini">Google Gemini (Free)</option>
              <option value="openai">OpenAI GPT-4</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="devs-ai">
                {isDevsAIReady ? 'DevS.ai (Multiple LLMs) ✓' : 'DevS.ai (Multiple LLMs) - Setup Required'}
              </option>
            </select>
          </div>

          {/* DevS.ai Model Selection */}
          {aiModel === 'devs-ai' && isDevsAIReady && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                DevS.ai Model
              </label>
              <select
                value={selectedDevsAIModel}
                onChange={(e) => setSelectedDevsAIModel(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isGenerating || isPushing}
              >
                {devsAIService.getAvailableModels().map((model) => (
                  <option key={model} value={model}>
                    {model}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder={`Describe your ${workItemType} in detail...`}
            disabled={isGenerating || isPushing}
          />
        </div>

        {/* Template Preview */}
        {currentTemplate && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <h4 className="text-sm font-medium text-blue-800 mb-2">
              Template: {currentTemplate.name}
            </h4>
            <div className="text-xs text-blue-700">
              <p className="mb-2">
                <strong>Fields to generate:</strong> {currentTemplate.fields.map(f => f.name).join(', ')}
              </p>
              {currentTemplate.aiPrompt && (
                <p>
                  <strong>Custom prompt:</strong> {currentTemplate.aiPrompt.substring(0, 100)}
                  {currentTemplate.aiPrompt.length > 100 ? '...' : ''}
                </p>
              )}
            </div>
          </div>
        )}

        <div className="flex justify-between items-center">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 transition-colors"
            disabled={isGenerating || isPushing}
          >
            Reset Form
          </button>
          
          <button
            onClick={handleGenerate}
            disabled={isGenerating || isPushing || !description.trim()}
            className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                isGenerating || isPushing || !description.trim()
                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
              }`}
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Generating...</span>
              </div>
            ) : aiModel === 'devs-ai' && !isDevsAIReady ? (
              'Setup DevS.ai API Key'
            ) : (
              'Generate Content'
            )}
          </button>
        </div>
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Generated Content</h3>
              <div className="flex space-x-2">
                {!isEditing && (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                    disabled={isPushing}
                  >
                    ✏️ Edit Content
                  </button>
                )}
                <button
                  onClick={() => handlePushToJira(generatedContent)}
                  disabled={isPushing || !jiraConnection}
                  className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                    isPushing || !jiraConnection
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
                >
                  {isPushing ? (
                    <div className="flex items-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Pushing to Jira...</span>
                    </div>
                  ) : (
                    '🚀 Push to Jira'
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="p-6">
            <ContentEditor
              content={generatedContent}
              workItemType={workItemType}
              onSave={handleContentSave}
              onCancel={() => setIsEditing(false)}
              isEditing={isEditing}
            />
          </div>

          {/* Push to Jira Action Section */}
          {!isEditing && (
            <div className="bg-gray-50 px-6 py-4 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${jiraConnection ? 'bg-green-500' : 'bg-red-500'}`}></div>
                  <span className="text-sm font-medium text-gray-700">
                    {jiraConnection ? 'Jira Connected' : 'Jira Not Connected'}
                  </span>
                  {jiraConnection && (
                    <span className="text-xs text-gray-500">({jiraConnection.url})</span>
                  )}
                </div>
                
                {jiraConnection ? (
                  <button
                    onClick={() => handlePushToJira(generatedContent)}
                    disabled={isPushing}
                    className={`px-6 py-3 rounded-lg text-sm font-semibold transition-all duration-200 ${
                      isPushing
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl transform hover:-translate-y-1'
                    }`}
                  >
                    {isPushing ? (
                      <div className="flex items-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Creating in Jira...</span>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-2">
                        <span>🚀</span>
                        <span>Create {workItemType.charAt(0).toUpperCase() + workItemType.slice(1)} in Jira</span>
                      </div>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      // Navigate to Jira connection tab
                      window.dispatchEvent(new CustomEvent('navigate-to-jira'))
                    }}
                    className="px-6 py-3 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                  >
                    <div className="flex items-center space-x-2">
                      <span>🔗</span>
                      <span>Connect to Jira</span>
                    </div>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Success Message with Jira Link */}
      {jiraIssueUrl && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
            </svg>
            <div>
              <h4 className="text-sm font-medium text-green-800">Issue Created Successfully!</h4>
              <p className="text-sm text-green-700 mt-1">
                Your {workItemType} has been created in Jira.{' '}
                <a
                  href={jiraIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium underline hover:text-green-900 transition-colors"
                >
                  View in Jira →
                </a>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!jiraConnection && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center">
            <svg className="w-5 h-5 text-yellow-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
            <div>
              <h4 className="text-sm font-medium text-yellow-800">Jira Not Connected</h4>
              <p className="text-sm text-yellow-700 mt-1">
                Connect to Jira in the &quot;Jira Connection&quot; tab to push generated content directly to your instance.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Field Validation Modal */}
      <FieldValidationModal
        isOpen={showValidationModal}
        onClose={handleValidationCancel}
        onSubmit={handleValidationSubmit}
        content={pendingContent || generatedContent!}
        template={currentTemplate}
        jiraFields={jiraFields}
        missingFields={validationMissingFields}
        extractedFields={extractedFields}
        suggestions={fieldSuggestions}
        jiraConnection={jiraConnection}
        workItemType={workItemType}
      />

    </div>
  )
} 