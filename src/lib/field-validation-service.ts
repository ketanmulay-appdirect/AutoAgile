import { GeneratedContent, WorkItemType } from '../types'
import { JiraField, jiraFieldService } from './jira-field-service'
import { WorkItemTemplate } from './template-service'
import { fieldExtractionService, FieldExtractionResult } from './field-extraction-service'

export interface MissingField {
  jiraFieldId: string
  jiraField: JiraField
  templateFieldId?: string
  currentValue?: any
}

export interface ValidationResult {
  isValid: boolean
  missingFields: MissingField[]
  errors: string[]
  extractedFields?: Record<string, any>
  suggestions?: Record<string, any[]>
}

class FieldValidationService {
  /**
   * Validate content with smart field extraction
   */
  async validateContentWithExtraction(
    content: GeneratedContent,
    workItemType: WorkItemType,
    template: WorkItemTemplate | null,
    jiraFields: JiraField[],
    aiProvider?: string,
    apiKey?: string
  ): Promise<ValidationResult> {
    let extractedFields: Record<string, any> = {}
    let suggestions: Record<string, any[]> = {}

    // Try to extract field values from description
    if (content.description && jiraFields.length > 0) {
      try {
        console.log('Starting field extraction for', jiraFields.length, 'fields');
        const extractionResult = await fieldExtractionService.extractFieldValues(
          content.description,
          jiraFields,
          aiProvider,
          apiKey
        )

        // Convert extracted fields to a record
        for (const extracted of extractionResult.extractedFields) {
          extractedFields[extracted.fieldId] = extracted.value
          console.log(`Extracted field ${extracted.fieldId}: ${extracted.value} (${extracted.extractionMethod})`);
        }

        suggestions = extractionResult.suggestions
        console.log('Field extraction completed successfully');
      } catch (error) {
        console.warn('Field extraction failed, continuing with validation:', error)
        // Continue with validation even if extraction fails
        extractedFields = {}
        suggestions = {}
      }
    } else {
      console.log('Skipping field extraction: no description or no Jira fields');
    }

    // Create enhanced content with extracted fields
    const enhancedContent: GeneratedContent = {
      ...content,
      customFields: {
        ...content.customFields,
        ...extractedFields
      }
    }

    // Validate the enhanced content
    const validationResult = await this.validateContent(
      enhancedContent,
      workItemType,
      template,
      jiraFields
    )

    return {
      ...validationResult,
      extractedFields,
      suggestions
    }
  }

  /**
   * Validate content against required Jira fields
   */
  async validateContent(
    content: GeneratedContent,
    workItemType: WorkItemType,
    template: WorkItemTemplate | null,
    jiraFields: JiraField[]
  ): Promise<ValidationResult> {
    const missingFields: MissingField[] = []
    const errors: string[] = []

    // Get required Jira fields
    const requiredFields = jiraFields.filter(field => field.required)

    // Check each required field
    for (const jiraField of requiredFields) {
      const fieldValue = this.getFieldValue(content, jiraField, template)
      
      if (this.isFieldEmpty(fieldValue)) {
        missingFields.push({
          jiraFieldId: jiraField.id,
          jiraField,
          templateFieldId: this.getTemplateFieldId(jiraField, template),
          currentValue: fieldValue
        })
      }
    }

    // Add validation errors
    if (missingFields.length > 0) {
      errors.push(`${missingFields.length} required field(s) are missing`)
    }

    return {
      isValid: missingFields.length === 0,
      missingFields,
      errors
    }
  }

  /**
   * Get field value from content based on field mapping
   */
  private getFieldValue(
    content: GeneratedContent,
    jiraField: JiraField,
    template: WorkItemTemplate | null
  ): any {
    // Check custom fields first
    if (content.customFields && content.customFields[jiraField.id]) {
      return content.customFields[jiraField.id]
    }

    // Check template field mappings
    if (template?.jiraFieldMappings) {
      const templateFieldId = Object.keys(template.jiraFieldMappings).find(
        key => template.jiraFieldMappings![key] === jiraField.id
      )
      
      if (templateFieldId) {
        return this.getContentFieldValue(content, templateFieldId)
      }
    }

    // Check standard field mappings
    return this.getStandardFieldValue(content, jiraField)
  }

  /**
   * Get value from content based on template field ID
   */
  private getContentFieldValue(content: GeneratedContent, fieldId: string): any {
    switch (fieldId) {
      case 'title':
      case 'summary':
        return content.title
      case 'description':
        return content.description
      case 'priority':
        return content.priority
      case 'labels':
        return content.labels
      case 'storyPoints':
        return content.storyPoints
      default:
        return content.customFields?.[fieldId]
    }
  }

  /**
   * Get value from content based on standard Jira field mapping
   */
  private getStandardFieldValue(content: GeneratedContent, jiraField: JiraField): any {
    const fieldId = jiraField.id.toLowerCase()
    const fieldName = jiraField.name.toLowerCase()

    // Map common fields
    if (fieldId === 'summary' || fieldName.includes('summary') || fieldName.includes('title')) {
      return content.title
    }
    
    if (fieldId === 'description' || fieldName.includes('description')) {
      return content.description
    }
    
    if (fieldId === 'priority' || fieldName.includes('priority')) {
      return content.priority
    }
    
    if (fieldId === 'labels' || fieldName.includes('labels')) {
      return content.labels
    }

    // For project, issuetype, assignee - these should be considered empty unless explicitly set in customFields
    if (fieldId === 'project' || fieldId === 'issuetype' || fieldId === 'assignee') {
      return content.customFields?.[jiraField.id]
    }
    
    // Reporter and priority fields are often auto-set by Jira or not settable via API
    if (fieldId === 'reporter' || fieldId === 'priority') {
      return 'auto-set'
    }

    // Check custom fields for everything else
    return content.customFields?.[jiraField.id]
  }

  /**
   * Get template field ID that maps to a Jira field
   */
  private getTemplateFieldId(jiraField: JiraField, template: WorkItemTemplate | null): string | undefined {
    if (!template?.jiraFieldMappings) return undefined

    return Object.keys(template.jiraFieldMappings).find(
      key => template.jiraFieldMappings![key] === jiraField.id
    )
  }

  /**
   * Check if a field value is empty
   */
  private isFieldEmpty(value: any): boolean {
    if (value === null || value === undefined) return true
    if (typeof value === 'string' && value.trim() === '') return true
    if (Array.isArray(value) && value.length === 0) return true
    return false
  }

  /**
   * Validate field value based on field type
   */
  validateFieldValue(field: JiraField, value: any): { isValid: boolean; error?: string } {
    if (field.required && this.isFieldEmpty(value)) {
      return {
        isValid: false,
        error: `${field.name} is required`
      }
    }

    if (!this.isFieldEmpty(value)) {
      switch (field.type) {
        case 'number':
          if (isNaN(Number(value))) {
            return {
              isValid: false,
              error: `${field.name} must be a valid number`
            }
          }
          break
        
        case 'select':
          if (field.allowedValues && !field.allowedValues.includes(value)) {
            return {
              isValid: false,
              error: `${field.name} must be one of: ${field.allowedValues.join(', ')}`
            }
          }
          break
        
        case 'date':
          if (value && isNaN(Date.parse(value))) {
            return {
              isValid: false,
              error: `${field.name} must be a valid date`
            }
          }
          break
      }
    }

    return { isValid: true }
  }

  /**
   * Get field suggestions based on content
   */
  getFieldSuggestions(content: GeneratedContent, jiraField: JiraField): string[] {
    const suggestions: string[] = []
    
    switch (jiraField.type) {
      case 'select':
        if (jiraField.allowedValues) {
          // For priority fields, suggest based on content
          if (jiraField.name.toLowerCase().includes('priority')) {
            if (content.description.toLowerCase().includes('urgent') || 
                content.description.toLowerCase().includes('critical')) {
              suggestions.push('High', 'Critical')
            } else if (content.description.toLowerCase().includes('minor') ||
                       content.description.toLowerCase().includes('nice to have')) {
              suggestions.push('Low', 'Minor')
            } else {
              suggestions.push('Medium', 'Normal')
            }
          }
          
          // Filter suggestions to only include allowed values
          return suggestions.filter(s => jiraField.allowedValues!.includes(s))
        }
        break
      
      case 'text':
        // For quarter fields, suggest current quarter
        if (jiraField.name.toLowerCase().includes('quarter')) {
          const now = new Date()
          const quarter = Math.ceil((now.getMonth() + 1) / 3)
          const year = now.getFullYear()
          suggestions.push(`Q${quarter} ${year}`)
        }
        break
    }
    
    return suggestions
  }

  /**
   * Auto-fill fields based on content analysis
   */
  autoFillFields(content: GeneratedContent, missingFields: MissingField[]): Record<string, any> {
    const autoFilledValues: Record<string, any> = {}
    
    missingFields.forEach(field => {
      const suggestions = this.getFieldSuggestions(content, field.jiraField)
      if (suggestions.length > 0) {
        autoFilledValues[field.jiraFieldId] = suggestions[0]
      }
    })
    
    return autoFilledValues
  }
}

export const fieldValidationService = new FieldValidationService() 