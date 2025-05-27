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

  async getDeliveryQuarters(jiraInstance: JiraInstance, projectKey: string): Promise<{ quarters: string[], defaultQuarter: string }> {
    try {
      const response = await fetch('/api/jira/get-delivery-quarters', {
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
      return {
        quarters: data.quarters || [],
        defaultQuarter: data.defaultQuarter || ''
      }
    } catch (error) {
      console.error('Failed to fetch delivery quarters:', error)
      // Return default quarters if API fails
      const currentDate = new Date()
      const currentYear = currentDate.getFullYear()
      const currentMonth = currentDate.getMonth() + 1
      
      let currentQuarter = 1
      if (currentMonth >= 4 && currentMonth <= 6) currentQuarter = 2
      else if (currentMonth >= 7 && currentMonth <= 9) currentQuarter = 3
      else if (currentMonth >= 10 && currentMonth <= 12) currentQuarter = 4

      const quarters = []
      for (let q = 1; q <= 4; q++) {
        quarters.push(`Q${q} ${currentYear}`)
      }
      for (let q = 1; q <= 4; q++) {
        quarters.push(`Q${q} ${currentYear + 1}`)
      }

      return {
        quarters,
        defaultQuarter: `Q${currentQuarter} ${currentYear}`
      }
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
        const errorText = await response.text()
        console.error('Work items API error:', {
          status: response.status,
          statusText: response.statusText,
          errorBody: errorText,
          params: { projectKey, workItemType, deliveryQuarter }
        })
        return [] // Return empty array instead of throwing
      }

      const data = await response.json()
      return data.workItems || []
    } catch (error) {
      console.error('Failed to fetch work items:', error)
      return [] // Return empty array instead of throwing
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