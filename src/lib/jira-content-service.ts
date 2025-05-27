import { JiraInstance, JiraProject, JiraWorkItem, WorkItemType } from '../types'

class JiraContentService {
  async getProjects(jiraInstance: JiraInstance): Promise<JiraProject[]> {
    try {
      const response = await fetch('/api/jira/get-projects', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jiraInstance })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.projects || []
    } catch (error) {
      console.error('Failed to fetch projects:', error)
      throw new Error('Failed to fetch projects from Jira')
    }
  }

  async getProjectVersions(jiraInstance: JiraInstance, projectKey: string): Promise<string[]> {
    try {
      const response = await fetch('/api/jira/get-versions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jiraInstance, projectKey })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.quarters || []
    } catch (error) {
      console.error('Failed to fetch project versions:', error)
      // Return default quarters if versions are not available
      const currentYear = new Date().getFullYear()
      return [
        `Q1 ${currentYear}`,
        `Q2 ${currentYear}`,
        `Q3 ${currentYear}`,
        `Q4 ${currentYear}`,
        `Q1 ${currentYear + 1}`
      ]
    }
  }

  async getWorkItems(
    jiraInstance: JiraInstance,
    projectKey: string,
    workItemType: WorkItemType = 'epic',
    deliveryQuarter?: string
  ): Promise<JiraWorkItem[]> {
    try {
      const response = await fetch('/api/jira/get-work-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraInstance, 
          projectKey, 
          workItemType, 
          deliveryQuarter 
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      return data.workItems || []
    } catch (error) {
      console.error('Failed to fetch work items:', error)
      throw new Error('Failed to fetch work items from Jira')
    }
  }

  async getWorkItem(
    jiraInstance: JiraInstance,
    issueKey: string
  ): Promise<JiraWorkItem> {
    try {
      const response = await fetch('/api/jira/get-work-items', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jiraInstance, 
          projectKey: issueKey.split('-')[0], // Extract project key from issue key
          workItemType: 'epic' // Default, could be improved
        })
      })

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      const workItem = data.workItems?.find((item: JiraWorkItem) => item.key === issueKey)
      
      if (!workItem) {
        throw new Error('Work item not found')
      }

      return workItem
    } catch (error) {
      console.error('Failed to fetch work item:', error)
      throw new Error('Failed to fetch work item from Jira')
    }
  }
}

export const jiraContentService = new JiraContentService() 