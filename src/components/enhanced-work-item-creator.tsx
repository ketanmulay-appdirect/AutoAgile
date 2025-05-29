'use client'

import React, { useState, useEffect } from 'react'
import { WorkItemType, GeneratedContent, AIModel, JiraInstance, WorkItemTemplate, JiraField } from '../types'
import { ContentEditor } from './content-editor'
import { ToastContainer } from './ui/toast'
import { useToast } from '../hooks/use-toast'
import { devsAIService } from '../lib/devs-ai-service'
import { templateService } from '../lib/template-service'
import { type DevsAIConnection } from './devs-ai-connection'
import { FieldValidationModal } from './field-validation-modal'
import { fieldValidationService, type MissingField } from '../lib/field-validation-service'
import { jiraFieldService } from '../lib/jira-field-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { LoadingSpinner } from './ui/loading-spinner'
import { Icons, StatusIcons } from './ui/icons'
import { PageLoader } from './ui/page-loader'
import { workItemStorage } from '../lib/work-item-storage'
import { ContentChatRefiner } from './content-chat-refiner'

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
  const [generatingStep, setGeneratingStep] = useState(0)
  const [isPushing, setIsPushing] = useState(false)
  const [pushingStep, setPushingStep] = useState(0)
  const [isValidating, setIsValidating] = useState(false)
  const [validatingStep, setValidatingStep] = useState(0)
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
  
  // Store original prompt for chat refiner
  const [originalPrompt, setOriginalPrompt] = useState<string>('')
  
  // Track if mock content is being used
  const [isUsingMockContent, setIsUsingMockContent] = useState(false)

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

  // Check for Devs.ai connection on component mount
  useEffect(() => {
    if (devsAIConnection) {
      devsAIService.initialize(devsAIConnection.apiToken)
      setIsDevsAIReady(true)
      setAiModel('devs-ai') // Set devs-ai as default when connection is active
    } else {
      const savedConnection = devsAIService.loadSavedConnection()
      if (savedConnection) {
        devsAIService.initialize(savedConnection.apiToken)
        setIsDevsAIReady(true)
        setAiModel('devs-ai') // Set devs-ai as default when connection is active
      } else {
        setIsDevsAIReady(false)
        // Reset to auto if currently set to devs-ai but connection is not available
        setAiModel(prevModel => prevModel === 'devs-ai' ? 'auto' : prevModel)
      }
    }
  }, [devsAIConnection])

  // Reset template selection when work item type changes
  useEffect(() => {
    setSelectedTemplate('default')
  }, [workItemType])

  const handleGenerate = async () => {
    if (!description.trim()) {
      error('Missing Description', 'Please provide a description for the work item.')
      return
    }

    if (!currentTemplate) {
      warning('Template Not Loaded', 'Please wait for templates to load.')
      return
    }

    // Handle Devs.ai setup first if needed
    if (aiModel === 'devs-ai' && !isDevsAIReady) {
      warning('Devs.ai Not Connected', 'Please connect to Devs.ai first in the Devs.ai Connection tab.')
      return
    }

    setIsGenerating(true)
    setGeneratingStep(0)
    setGeneratedContent(null)
    setJiraIssueUrl(null)

    try {
      // Step 1: Preparing request
      setGeneratingStep(1)
      await new Promise(resolve => setTimeout(resolve, 300))

      // Generate custom prompt using template
      const customPrompt = templateService.generatePrompt(currentTemplate, description)
      
      // Store the original prompt for chat refiner
      setOriginalPrompt(customPrompt)
      
      // Step 2: Sending to AI
      setGeneratingStep(2)
      
      // Handle Devs.ai separately
      if (aiModel === 'devs-ai') {
        if (!devsAIConnection?.apiToken) {
          throw new Error('DevS.ai connection not configured. Please set up your DevS.ai connection first.')
        }

        // Use Devs.ai service to generate content with custom prompt
        const devsAIContent = await devsAIService.generateContent(customPrompt, selectedDevsAIModel)
        
        // Step 3: Processing response
        setGeneratingStep(3)
        await new Promise(resolve => setTimeout(resolve, 200))
        
        // Parse the generated content into the expected format
        const content = parseGeneratedContent(devsAIContent, workItemType)
        
        // Step 4: Finalizing content
        setGeneratingStep(4)
        await new Promise(resolve => setTimeout(resolve, 300))
        
        setGeneratedContent(content)
        
        success('Content Generated', `${workItemType} content has been generated successfully using Devs.ai (${selectedDevsAIModel}) with ${currentTemplate.name}.`)
        setIsUsingMockContent(false) // Real AI was used
      } else {
        // Handle other AI models with custom prompt
        const response = await fetch('/api/generate-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt: customPrompt, // Use the template-generated prompt
            contentType: workItemType, // This should be contentType, not type
            workItem: {
              key: 'generated',
              summary: description.substring(0, 100) + '...',
              description: description,
              issueType: workItemType,
              project: 'Generated Content'
            },
            useDevsAI: false, // We're not using DevS.ai in this path
            apiToken: null, // No API token for this path
            context: {
              preferredModel: aiModel,
              template: currentTemplate.name
            }
          }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        // Step 3: Processing response
        setGeneratingStep(3)
        await new Promise(resolve => setTimeout(resolve, 200))

        const data = await response.json()
        
        if (!data.success) {
          throw new Error(data.error || 'Failed to generate content')
        }
        
        // Step 4: Finalizing content
        setGeneratingStep(4)
        await new Promise(resolve => setTimeout(resolve, 300))
        
        // Parse the generated content into the expected format
        const content = parseGeneratedContent(data.content, workItemType)
        setGeneratedContent(content)
        
        const modelInfo = data.metadata?.model || 'AI'
        const isUsingMock = data.metadata?.model === 'mock-ai'
        setIsUsingMockContent(isUsingMock) // Track if mock content was used
        
        if (isUsingMock) {
          success('Content Generated (Mock)', `${workItemType} content has been generated using enhanced mock content. For real AI generation, configure OpenAI or Anthropic API keys in your environment.`)
        } else {
          success('Content Generated', `${workItemType} content has been generated successfully using ${modelInfo} with ${currentTemplate.name}.`)
        }
      }
    } catch (err) {
      console.error('Error generating content:', err)
      error('Generation Failed', 'Failed to generate content. Please try again.')
    } finally {
      setIsGenerating(false)
      setGeneratingStep(0)
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

    // Start validation loader
    setIsValidating(true)
    setValidatingStep(0)

    try {
      // Step 1: Checking Jira field requirements
      setValidatingStep(1)
      await new Promise(resolve => setTimeout(resolve, 300)) // Brief pause for UX

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

      // Step 2: Validating content structure
      setValidatingStep(2)
      await new Promise(resolve => setTimeout(resolve, 200))

      // Validate fields with smart extraction before pushing
      if (jiraFields.length > 0) {
        try {
          // Step 3: Extracting field values with AI
          setValidatingStep(3)
          
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

          // Step 4: Processing validation results
          setValidatingStep(4)
          await new Promise(resolve => setTimeout(resolve, 200))

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
      } else {
        // Skip AI extraction if no fields available
        setValidatingStep(4)
        await new Promise(resolve => setTimeout(resolve, 400))
      }

      // Proceed with Jira creation
      await createJiraIssue(content)
    } finally {
      // Always stop validation loader
      setIsValidating(false)
      setValidatingStep(0)
    }
  }

  const createJiraIssue = async (content: GeneratedContent) => {
    if (!jiraConnection) {
      error('Jira Not Connected', 'Jira connection is required to create an issue.')
      return
    }

    setIsPushing(true)
    setPushingStep(0)

    const pushSteps = [
      'Validating content and fields',
      'Converting markdown to Jira format',
      'Creating issue in Jira',
      'Finalizing and generating link'
    ]

    try {
      // Step 1: Validation
      setPushingStep(1)
      await new Promise(resolve => setTimeout(resolve, 500)) // Brief pause for UX

      // Step 2: Format conversion
      setPushingStep(2)
      await new Promise(resolve => setTimeout(resolve, 300))

      // Step 3: Create issue
      setPushingStep(3)
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

      // Step 4: Finalize
      setPushingStep(4)
      const data = await response.json()
      const issueUrl = `${jiraConnection.url}/browse/${data.issue.key}`
      setJiraIssueUrl(issueUrl)
      
      await new Promise(resolve => setTimeout(resolve, 500)) // Brief pause to show completion
      
      success(
        'Issue Created Successfully!', 
        <span>
          {workItemType.charAt(0).toUpperCase() + workItemType.slice(1)} {' '}
          <a 
            href={issueUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline hover:text-forest-800 transition-colors"
          >
            {data.issue.key}
          </a>
          {' '} has been created in Jira. Click the link to view it.
        </span>
      )

      // Automatically save the work item
      try {
        await workItemStorage.saveWorkItem({
          type: workItemType,
          title: content.title,
          description: content.description,
          originalPrompt: originalPrompt || description,
          generatedContent: content,
          jiraIssue: {
            id: data.issue.id,
            key: data.issue.key,
            summary: content.title,
            description: content.description,
            issueType: workItemType,
            status: 'Open', // Default status
            url: issueUrl,
            createdAt: new Date()
          },
          jiraUrl: issueUrl,
          templateUsed: currentTemplate?.name || 'Default Template',
          status: 'pushed'
        })
      } catch (storageError) {
        console.error('Failed to save work item to storage:', storageError)
        // Don't fail the whole operation if storage fails
      }
    } catch (err) {
      console.error('Error creating Jira issue:', err)
      error('Jira Creation Failed', err instanceof Error ? err.message : 'Failed to create issue in Jira.')
    } finally {
      setIsPushing(false)
      setPushingStep(0)
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
    setOriginalPrompt('')
    setIsUsingMockContent(false) // Reset mock content flag
  }

  // Show loading state while templates are loading
  if (!isTemplatesLoaded) {
    return (
      <div className="space-y-6">
        <Alert variant="info">
          <LoadingSpinner size="sm" className="mr-2" />
          <AlertTitle>Loading Templates</AlertTitle>
          <AlertDescription>
            Loading content templates for work item creation...
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Loader for Content Generation */}
      <PageLoader
        isVisible={isGenerating}
        variant="ai"
        title="Generating Content"
        subtitle="Creating your work item with AI assistance..."
        steps={[
          'Preparing your request',
          'Sending to AI service',
          'Processing AI response',
          'Finalizing content'
        ]}
        currentStep={generatingStep}
      />

      {/* Page Loader for Validation */}
      <PageLoader
        isVisible={isValidating}
        variant="jira"
        title="Validating Data"
        subtitle="Checking required fields and preparing for Jira..."
        steps={[
          'Checking Jira field requirements',
          'Validating content structure',
          'Extracting field values with AI',
          'Processing validation results'
        ]}
        currentStep={validatingStep}
      />

      {/* Page Loader for Jira Push */}
      <PageLoader
        isVisible={isPushing}
        variant="jira"
        title="Pushing to Jira"
        subtitle="Creating your work item with rich formatting..."
        steps={[
          'Validating content and fields',
          'Converting markdown to Jira format',
          'Creating issue in Jira',
          'Finalizing and generating link'
        ]}
        currentStep={pushingStep}
      />

      {/* Input Form - Simplified */}
      <Card>
        <CardContent className="space-y-6 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
              <label className="block text-sm font-medium text-navy-950 mb-2">
              Work Item Type
            </label>
            <select
              value={workItemType}
              onChange={(e) => {
                setWorkItemType(e.target.value as WorkItemType)
                setSelectedTemplate('default') // Reset template when work item type changes
              }}
                className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 bg-white text-navy-950"
              disabled={isGenerating || isPushing || isValidating}
            >
              <option value="epic">Epic</option>
              <option value="story">Story</option>
              <option value="initiative">Initiative</option>
            </select>
          </div>

          <div>
              <label className="block text-sm font-medium text-navy-950 mb-2">
              Content Template
            </label>
            <select
              value={selectedTemplate}
              onChange={(e) => setSelectedTemplate(e.target.value)}
                className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 bg-white text-navy-950"
              disabled={isGenerating || isPushing || isValidating}
            >
              {availableTemplates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </div>

          <div>
              <label className="block text-sm font-medium text-navy-950 mb-2">
              AI Model
            </label>
            <select
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value as AIModel)}
                className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 bg-white text-navy-950"
              disabled={isGenerating || isPushing || isValidating}
            >
              <option value="auto">Auto (Free - Gemini)</option>
              <option value="openai">OpenAI GPT-4</option>
              <option value="anthropic">Anthropic Claude</option>
              <option value="devs-ai">
                {isDevsAIReady ? 'Devs.ai (Multiple LLMs)' : 'Devs.ai (Multiple LLMs) - Setup Required'}
              </option>
            </select>
          </div>

          {/* Devs.ai Model Selection */}
          {aiModel === 'devs-ai' && isDevsAIReady && (
            <div>
                <label className="block text-sm font-medium text-navy-950 mb-2">
                Devs.ai Model
              </label>
              <select
                value={selectedDevsAIModel}
                onChange={(e) => setSelectedDevsAIModel(e.target.value)}
                  className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 bg-white text-navy-950"
                disabled={isGenerating || isPushing || isValidating}
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
            <label className="block text-sm font-medium text-navy-950 mb-2">
            Description *
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
              className="w-full px-3 py-2 border border-cloud-300 rounded-md focus:outline-none focus:ring-2 focus:ring-royal-500 focus:border-royal-500 resize-none bg-white text-navy-950"
            placeholder={`Describe your ${workItemType} in detail...`}
            disabled={isGenerating || isPushing || isValidating}
          />
        </div>

        {/* Template Preview */}
        {currentTemplate && (
            <Alert variant="info">
              <Icons.FileText size="sm" />
              <AlertTitle>Template: {currentTemplate.name}</AlertTitle>
              <AlertDescription>
                <div className="space-y-2 mt-2">
                  <p>
                <strong>Fields to generate:</strong> {currentTemplate.fields.map(f => f.name).join(', ')}
              </p>
              {currentTemplate.aiPrompt && (
                <p>
                  <strong>Custom prompt:</strong> {currentTemplate.aiPrompt.substring(0, 100)}
                  {currentTemplate.aiPrompt.length > 100 ? '...' : ''}
                </p>
              )}
            </div>
              </AlertDescription>
            </Alert>
        )}

        <div className="flex justify-between items-center">
            <Button
              variant="outline"
            onClick={handleReset}
            disabled={isGenerating || isPushing || isValidating}
          >
              <Icons.RotateCcw size="sm" autoContrast className="mr-2" />
            Reset Form
            </Button>
          
            <Button
            onClick={handleGenerate}
            disabled={isGenerating || isPushing || isValidating || !description.trim()}
              className="min-w-[160px]"
          >
            {isGenerating ? (
                <>
                  <LoadingSpinner size="sm" variant="white" className="mr-2" />
                  Generating...
                </>
            ) : aiModel === 'devs-ai' && !isDevsAIReady ? (
                <>
                  <Icons.Settings size="sm" autoContrast className="mr-2" />
                  Setup Devs.ai API Key
                </>
            ) : (
                <>
                  <Icons.Sparkles size="sm" autoContrast className="mr-2" />
                  Generate Content
                </>
            )}
            </Button>
        </div>
        </CardContent>
      </Card>

      {/* Generated Content */}
      {generatedContent && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center">
                <Icons.FileText size="md" autoContrast className="mr-2" />
                Generated Content
              </CardTitle>
              <div className="flex space-x-2">
                {!isEditing && (
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    disabled={isPushing || isValidating}
                  >
                    <Icons.Edit size="sm" autoContrast className="mr-2" />
                    Edit Content
                  </Button>
                )}
                <Button
                  onClick={() => handlePushToJira(generatedContent)}
                  disabled={isPushing || isValidating || !jiraConnection}
                  variant={jiraConnection ? "default" : "secondary"}
                >
                  {isPushing ? (
                    <>
                      <LoadingSpinner size="sm" variant="white" className="mr-2" />
                      Creating in Jira...
                    </>
                  ) : (
                    <>
                      <Icons.Upload size="sm" autoContrast className="mr-2" />
                      Push to Jira
                    </>
                  )}
                </Button>
              </div>
            </div>
            
            {/* Mock Content Indicator */}
            {isUsingMockContent && (
              <Alert variant="warning" className="mt-4">
                <Icons.AlertTriangle size="sm" />
                <AlertTitle>Enhanced Mock Content</AlertTitle>
                <AlertDescription>
                  This content was generated using our enhanced mock AI system. For real AI-powered generation:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Configure OpenAI or Anthropic API keys in your environment (.env.local file)</li>
                    <li>Or set up DevS.ai connection for access to multiple premium models</li>
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardHeader>

          <CardContent>
            <ContentEditor
              content={generatedContent}
              workItemType={workItemType}
              onSave={handleContentSave}
              onCancel={() => setIsEditing(false)}
              isEditing={isEditing}
              originalPrompt={originalPrompt}
            />
          </CardContent>

          {/* Push to Jira Action Section */}
          {!isEditing && (
            <CardContent className="bg-cloud-50 border-t">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {jiraConnection ? (
                    <>
                      <StatusIcons.Done size="sm" />
                      <Badge variant="success">Jira Connected</Badge>
                      <span className="text-xs text-cloud-600">({jiraConnection.url})</span>
                    </>
                  ) : (
                    <>
                      <StatusIcons.Error size="sm" />
                      <Badge variant="destructive">Jira Not Connected</Badge>
                    </>
                  )}
                </div>
                
                {!jiraConnection && (
                  <Button
                    onClick={() => {
                      // Navigate to Jira connection tab
                      window.dispatchEvent(new CustomEvent('navigate-to-jira'))
                    }}
                    variant="outline"
                    size="lg"
                  >
                    <Icons.Link size="sm" autoContrast className="mr-2" />
                    Connect to Jira
                  </Button>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      )}

      {/* Success Message with Jira Link */}
      {jiraIssueUrl && (
        <Alert variant="success">
          <Icons.CheckCircle size="sm" />
          <AlertTitle>Issue Created Successfully!</AlertTitle>
          <AlertDescription>
                Your {workItemType} has been created in Jira.{' '}
                <a
                  href={jiraIssueUrl}
                  target="_blank"
                  rel="noopener noreferrer"
              className="font-medium underline hover:text-forest-800 transition-colors"
                >
                  View in Jira →
                </a>
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status */}
      {!jiraConnection && (
        <Alert variant="warning">
          <Icons.AlertTriangle size="sm" />
          <AlertTitle>Jira Not Connected</AlertTitle>
          <AlertDescription>
            Connect to Jira in the "Jira Connection" tab to push generated content directly to your instance.
          </AlertDescription>
        </Alert>
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