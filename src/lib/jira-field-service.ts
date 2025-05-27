import { JiraInstance, WorkItemType } from '../types'

export interface JiraField {
  id: string
  name: string
  type: string
  required: boolean
  allowedValues?: string[]
  description?: string
}

export interface JiraFieldMapping {
  workItemType: WorkItemType
  issueType: string
  fields: JiraField[]
  discoveredAt: string
}

class JiraFieldService {
  private readonly STORAGE_KEY = 'jira-field-mappings'

  // Get Jira issue types for the connected instance
  async getIssueTypes(jiraConnection: JiraInstance): Promise<any[]> {
    try {
      const response = await fetch('/api/jira/get-issue-types', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jiraConnection }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get issue types: ${response.status}`)
      }

      const data = await response.json()
      return data.issueTypes || []
    } catch (error) {
      console.error('Error getting issue types:', error)
      return []
    }
  }

  // Get field metadata for a specific issue type
  async getFieldsForIssueType(jiraConnection: JiraInstance, issueTypeId: string): Promise<JiraField[]> {
    try {
      const response = await fetch('/api/jira/get-create-meta', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraConnection,
          issueTypeId 
        }),
      })

      if (!response.ok) {
        throw new Error(`Failed to get field metadata: ${response.status}`)
      }

      const data = await response.json()
      return this.parseFieldMetadata(data.fields || {})
    } catch (error) {
      console.error('Error getting field metadata:', error)
      return []
    }
  }

  // Parse Jira field metadata into our format
  private parseFieldMetadata(fieldsData: any): JiraField[] {
    const fields: JiraField[] = []

    for (const [fieldId, fieldInfo] of Object.entries(fieldsData as any)) {
      const field = fieldInfo as any
      
      fields.push({
        id: fieldId,
        name: field.name || fieldId,
        type: this.mapJiraFieldType(field.schema?.type || 'string'),
        required: field.required || false,
        allowedValues: field.allowedValues?.map((v: any) => v.name || v.value) || undefined,
        description: field.description || undefined
      })
    }

    return fields.sort((a, b) => {
      // Sort required fields first, then by name
      if (a.required && !b.required) return -1
      if (!a.required && b.required) return 1
      return a.name.localeCompare(b.name)
    })
  }

  // Map Jira field types to our simplified types
  private mapJiraFieldType(jiraType: string): string {
    const typeMap: Record<string, string> = {
      'string': 'text',
      'number': 'number',
      'date': 'date',
      'datetime': 'date',
      'option': 'select',
      'array': 'select',
      'user': 'text',
      'project': 'text',
      'issuetype': 'select',
      'priority': 'select',
      'resolution': 'select',
      'status': 'select'
    }

    return typeMap[jiraType] || 'text'
  }

  // Discover fields by attempting to create a test issue
  async discoverFieldsByTestCreation(jiraConnection: JiraInstance, issueTypeId: string): Promise<JiraField[]> {
    try {
      const response = await fetch('/api/jira/test-create-issue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraConnection,
          issueTypeId,
          testData: {
            summary: 'TEST - Field Discovery (will be deleted)',
            description: 'This is a test issue for field discovery'
          }
        }),
      })

      const data = await response.json()
      
      if (response.ok) {
        // Test creation succeeded, we have minimal required fields
        return [
          { id: 'summary', name: 'Summary', type: 'text', required: true },
          { id: 'description', name: 'Description', type: 'textarea', required: false }
        ]
      } else {
        // Parse error response for required fields
        return this.parseErrorForRequiredFields(data.error || '')
      }
    } catch (error) {
      console.error('Error in test creation:', error)
      return []
    }
  }

  // Parse Jira error messages to extract required fields
  private parseErrorForRequiredFields(errorMessage: string): JiraField[] {
    const fields: JiraField[] = []
    
    // Common patterns in Jira error messages
    const patterns = [
      /Field '([^']+)' is required/gi,
      /([^,\s]+) is required/gi,
      /"([^"]+)" is required/gi
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(errorMessage)) !== null) {
        const fieldName = match[1]
        if (fieldName && !fields.some(f => f.name === fieldName)) {
          fields.push({
            id: fieldName.toLowerCase().replace(/\s+/g, ''),
            name: fieldName,
            type: 'text',
            required: true,
            description: `Required field discovered from error: ${fieldName}`
          })
        }
      }
    }

    // Add common required fields if none found
    if (fields.length === 0) {
      fields.push(
        { id: 'summary', name: 'Summary', type: 'text', required: true },
        { id: 'description', name: 'Description', type: 'textarea', required: false },
        { id: 'issuetype', name: 'Issue Type', type: 'select', required: true },
        { id: 'project', name: 'Project', type: 'select', required: true }
      )
    }

    return fields
  }

  // Main method to discover fields for a work item type
  async discoverFields(jiraConnection: JiraInstance, workItemType: WorkItemType): Promise<JiraFieldMapping | null> {
    try {
      // First, get issue types
      const issueTypes = await this.getIssueTypes(jiraConnection)
      
      // Map work item type to Jira issue type
      const issueType = this.mapWorkItemTypeToJiraIssueType(workItemType, issueTypes)
      if (!issueType) {
        console.warn(`No matching issue type found for ${workItemType}`)
        return null
      }

      console.log(`Discovering fields for ${workItemType} using issue type: ${issueType.name}`)

      // Try metadata API first
      let fields = await this.getFieldsForIssueType(jiraConnection, issueType.id)
      
      // If metadata API fails or returns insufficient data, try test creation
      if (fields.length === 0) {
        console.log('Metadata API returned no fields, trying test creation...')
        fields = await this.discoverFieldsByTestCreation(jiraConnection, issueType.id)
      }

      const mapping: JiraFieldMapping = {
        workItemType,
        issueType: issueType.name,
        fields,
        discoveredAt: new Date().toISOString()
      }

      // Save the mapping
      this.saveFieldMapping(mapping)

      return mapping
    } catch (error) {
      console.error('Error discovering fields:', error)
      return null
    }
  }

  // Map our work item types to Jira issue types
  private mapWorkItemTypeToJiraIssueType(workItemType: WorkItemType, issueTypes: any[]): any | null {
    const mappings: Record<WorkItemType, string[]> = {
      story: ['Story', 'User Story', 'Task'],
      epic: ['Epic'],
      initiative: ['Initiative', 'Epic', 'Story'] // Fallback order
    }

    const candidates = mappings[workItemType] || []
    
    for (const candidate of candidates) {
      const found = issueTypes.find(type => 
        type.name.toLowerCase().includes(candidate.toLowerCase())
      )
      if (found) return found
    }

    // If no specific match, return the first available type
    return issueTypes[0] || null
  }

  // Save field mapping to localStorage
  private saveFieldMapping(mapping: JiraFieldMapping): void {
    if (typeof window === 'undefined') return

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      const mappings: JiraFieldMapping[] = stored ? JSON.parse(stored) : []
      
      // Remove existing mapping for this work item type
      const filtered = mappings.filter(m => m.workItemType !== mapping.workItemType)
      filtered.push(mapping)
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered))
    } catch (error) {
      console.error('Failed to save field mapping:', error)
    }
  }

  // Get saved field mapping
  getFieldMapping(workItemType: WorkItemType): JiraFieldMapping | null {
    if (typeof window === 'undefined') return null

    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return null

      const mappings: JiraFieldMapping[] = JSON.parse(stored)
      return mappings.find(m => m.workItemType === workItemType) || null
    } catch (error) {
      console.error('Failed to load field mapping:', error)
      return null
    }
  }

  // Clear all field mappings
  clearFieldMappings(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.STORAGE_KEY)
  }
}

export const jiraFieldService = new JiraFieldService() 