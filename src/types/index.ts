// Work item types
export type WorkItemType = 'all' | 'initiative' | 'epic' | 'story' | 'task' | 'bug'

// Content generation types
export type ContentType = 'quarterly-presentation' | 'customer-webinar' | 'feature-newsletter' | 'technical-documentation' | 'stakeholder-update'

export interface ContentGenerationRequest {
  projectKey: string
  workItemId: string
  workItemType: WorkItemType
  contentType: ContentType
  deliveryQuarter: string
  customInstructions?: string
}

export interface ContentGenerationResponse {
  success: boolean
  content: string
  contentType: ContentType
  metadata?: {
    model: string
    tokensUsed?: number
    generatedAt: Date
  }
  error?: string
}

export interface JiraProject {
  id: string
  key: string
  name: string
  description?: string
}

export interface JiraWorkItem {
  id: string
  key: string
  summary: string
  description: string | any // Can be string or ADF object
  issueType: string
  status: string
  project: string
  fixVersions: string[]
  labels: string[]
  deliveryQuarter?: string
  assignee?: string | null
  reporter?: string | null
  created?: string | null
  updated?: string | null
}

export interface AIInstructionTemplate {
  id: string
  contentType: ContentType
  name: string
  defaultInstructions: string
  userInstructions?: string
  isCustomized: boolean
  updatedAt: Date
}

// AI model types
export type AIModel = 'auto' | 'openai' | 'anthropic' | 'devs-ai'

// Jira field types
export interface JiraField {
  id: string
  name: string
  required: boolean
  type: 'string' | 'number' | 'select' | 'multiselect' | 'date' | 'user' | 'textarea'
  allowedValues?: string[]
}

// Work item template configuration
export interface WorkItemTemplate {
  id: string
  type: WorkItemType
  name: string
  description: string
  fields: JiraField[]
  aiPrompt: string
  createdAt: Date
  updatedAt: Date
}

// AI generated content
export interface GeneratedContent {
  title: string
  description: string
  acceptanceCriteria?: string[]
  storyPoints?: number
  priority?: string
  labels?: string[]
  customFields: Record<string, any>
}

// Jira integration types
export interface JiraInstance {
  url: string
  email: string
  apiToken: string
  projectKey: string
}

export interface JiraIssue {
  id: string
  key: string
  summary: string
  description: string
  issueType: string
  status: string
  url: string
  createdAt: Date
}

// User and session types
export interface User {
  id: string
  email: string
  name: string
  jiraInstance?: JiraInstance
  templates: WorkItemTemplate[]
  createdAt: Date
}

// API request/response types
export interface CreateWorkItemRequest {
  type: WorkItemType
  description: string
  templateId?: string
}

export interface CreateWorkItemResponse {
  success: boolean
  content: GeneratedContent
  missingFields: string[]
  jiraIssue?: JiraIssue
  error?: string
}

export interface GenerateContentRequest {
  type: WorkItemType
  description: string
  context?: {
    preferredModel?: AIModel
  }
}

export interface GenerateContentResponse {
  success: boolean
  content: string
  metadata?: {
    model: string
    tokensUsed?: number
  }
  error?: string
}

export interface AIGenerationOptions {
  model?: AIModel
  temperature?: number
  maxTokens?: number
}

export interface FieldDefinition {
  id: string
  name: string
  type: string
  required: boolean
  description?: string
}

export interface ValidationRequest {
  content: GeneratedContent
  template: WorkItemTemplate
}

export interface ValidationResponse {
  isValid: boolean
  missingFields: JiraField[]
  suggestions: Record<string, string>
}

// History and analytics
export interface WorkItemHistory {
  id: string
  userId: string
  type: WorkItemType
  originalDescription: string
  generatedContent: GeneratedContent
  jiraIssue?: JiraIssue
  templateUsed: string
  createdAt: Date
} 