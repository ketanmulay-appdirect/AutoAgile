// Work item types
export type WorkItemType = 'initiative' | 'epic' | 'story'

// AI model types
export type AIModel = 'auto' | 'gemini' | 'openai' | 'anthropic'

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