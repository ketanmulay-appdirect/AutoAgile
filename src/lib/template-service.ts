import { WorkItemType, FieldDefinition } from '../types'

// Define the template interface
export interface WorkItemTemplate {
  id: string
  name: string
  workItemType: WorkItemType
  fields: FieldDefinition[]
  aiPrompt: string
  createdAt: string
  updatedAt: string
}

// Default templates for each work item type
const DEFAULT_TEMPLATES: Record<WorkItemType, WorkItemTemplate> = {
  initiative: {
    id: 'default_initiative',
    name: 'Default Initiative Template',
    workItemType: 'initiative',
    fields: [
      { id: 'title', name: 'Title', type: 'text', required: true, description: 'Initiative title/summary' },
      { id: 'description', name: 'Description', type: 'textarea', required: true, description: 'Detailed description of the initiative' },
      { id: 'business_value', name: 'Business Value', type: 'textarea', required: false, description: 'Expected business value and outcomes' },
      { id: 'success_metrics', name: 'Success Metrics', type: 'textarea', required: false, description: 'How success will be measured' },
      { id: 'timeline', name: 'Timeline', type: 'text', required: false, description: 'Expected timeline or duration' }
    ],
    aiPrompt: 'Generate a comprehensive initiative based on: {description}. Include business value, success metrics, and high-level scope.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  epic: {
    id: 'default_epic',
    name: 'Default Epic Template',
    workItemType: 'epic',
    fields: [
      { id: 'title', name: 'Title', type: 'text', required: true, description: 'Epic title/summary' },
      { id: 'description', name: 'Description', type: 'textarea', required: true, description: 'Detailed description of the epic' },
      { id: 'acceptance_criteria', name: 'Acceptance Criteria', type: 'textarea', required: false, description: 'High-level acceptance criteria' },
      { id: 'user_stories', name: 'User Stories', type: 'textarea', required: false, description: 'List of user stories to be created' },
      { id: 'priority', name: 'Priority', type: 'select', required: false, description: 'Priority level' }
    ],
    aiPrompt: 'Generate a detailed epic based on: {description}. Include acceptance criteria and suggest user stories.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  story: {
    id: 'default_story',
    name: 'Default Story Template',
    workItemType: 'story',
    fields: [
      { id: 'title', name: 'Title', type: 'text', required: true, description: 'Story title/summary' },
      { id: 'description', name: 'Description', type: 'textarea', required: true, description: 'User story description' },
      { id: 'acceptance_criteria', name: 'Acceptance Criteria', type: 'textarea', required: true, description: 'Specific acceptance criteria' },
      { id: 'story_points', name: 'Story Points', type: 'number', required: false, description: 'Estimated story points' },
      { id: 'priority', name: 'Priority', type: 'select', required: false, description: 'Priority level' }
    ],
    aiPrompt: 'Generate a detailed user story based on: {description}. Include specific acceptance criteria and suggest story points.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
}

class TemplateService {
  private readonly STORAGE_KEY = 'work-item-templates'

  // Get all templates
  getTemplates(): WorkItemTemplate[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (stored) {
        return JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
    
    // Return default templates if none stored
    return Object.values(DEFAULT_TEMPLATES)
  }

  // Get templates by work item type
  getTemplatesByType(workItemType: WorkItemType): WorkItemTemplate[] {
    return this.getTemplates().filter(template => template.workItemType === workItemType)
  }

  // Get a specific template by ID
  getTemplate(id: string): WorkItemTemplate | null {
    const templates = this.getTemplates()
    return templates.find(template => template.id === id) || null
  }

  // Get default template for a work item type
  getDefaultTemplate(workItemType: WorkItemType): WorkItemTemplate {
    const templates = this.getTemplatesByType(workItemType)
    return templates.find(t => t.id.startsWith('default_')) || DEFAULT_TEMPLATES[workItemType]
  }

  // Save a template
  saveTemplate(template: WorkItemTemplate): void {
    try {
      const templates = this.getTemplates()
      const existingIndex = templates.findIndex(t => t.id === template.id)
      
      const updatedTemplate = {
        ...template,
        updatedAt: new Date().toISOString()
      }

      if (existingIndex >= 0) {
        templates[existingIndex] = updatedTemplate
      } else {
        templates.push({
          ...updatedTemplate,
          createdAt: new Date().toISOString()
        })
      }

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates))
    } catch (error) {
      console.error('Failed to save template:', error)
      throw new Error('Failed to save template')
    }
  }

  // Delete a template
  deleteTemplate(id: string): void {
    try {
      const templates = this.getTemplates()
      const filtered = templates.filter(template => template.id !== id)
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to delete template:', error)
      throw new Error('Failed to delete template')
    }
  }

  // Validate template fields
  validateTemplate(template: WorkItemTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = []

    if (!template.name.trim()) {
      errors.push('Template name is required')
    }

    if (!template.fields.length) {
      errors.push('At least one field is required')
    }

    // Check for required title and description fields
    const hasTitle = template.fields.some(f => f.id === 'title' || f.name.toLowerCase().includes('title'))
    const hasDescription = template.fields.some(f => f.id === 'description' || f.name.toLowerCase().includes('description'))

    if (!hasTitle) {
      errors.push('Template should include a title field')
    }

    if (!hasDescription) {
      errors.push('Template should include a description field')
    }

    // Check for duplicate field names
    const fieldNames = template.fields.map(f => f.name.toLowerCase())
    const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index)
    if (duplicates.length > 0) {
      errors.push(`Duplicate field names: ${duplicates.join(', ')}`)
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  // Generate content using template
  generatePrompt(template: WorkItemTemplate, userDescription: string): string {
    if (template.aiPrompt) {
      return template.aiPrompt.replace('{description}', userDescription)
    }

    // Default prompt generation
    const fieldDescriptions = template.fields
      .filter(f => f.required)
      .map(f => f.name)
      .join(', ')

    return `Generate a ${template.workItemType} with the following required fields: ${fieldDescriptions}. Base it on this description: ${userDescription}`
  }
}

export const templateService = new TemplateService() 