import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection, workItemType, content } = await request.json()

    if (!jiraConnection || !workItemType || !content) {
      return NextResponse.json(
        { error: 'Missing required fields: jiraConnection, workItemType, and content' },
        { status: 400 }
      )
    }

    const { url, email, apiToken, projectKey } = jiraConnection

    if (!url || !email || !apiToken) {
      return NextResponse.json(
        { error: 'Invalid Jira connection. Missing url, email, or apiToken.' },
        { status: 400 }
      )
    }

    // Clean up the URL
    const cleanUrl = url.replace(/\/$/, '')
    
    // Create Basic Auth header
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')

    // Map work item type to Jira issue type
    const issueTypeMap = {
      'initiative': 'Epic', // or 'Initiative' if available
      'epic': 'Epic',
      'story': 'Story'
    }

    // Convert description to Atlassian Document Format (ADF)
    const descriptionADF: any = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: content.description
            }
          ]
        }
      ]
    }

    // Add acceptance criteria if present
    if (content.acceptanceCriteria && content.acceptanceCriteria.length > 0) {
      descriptionADF.content.push({
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Acceptance Criteria' }]
      })

      const criteriaList = {
        type: 'bulletList',
        content: content.acceptanceCriteria.map((criteria: string) => ({
          type: 'listItem',
          content: [{
            type: 'paragraph',
            content: [{ type: 'text', text: criteria }]
          }]
        }))
      }

      descriptionADF.content.push(criteriaList)
    }

    // Prepare the basic issue data with only required fields
    const issueData: any = {
      fields: {
        project: {
          key: projectKey || 'AC' // Default project key
        },
        summary: content.title,
        description: descriptionADF,
        issuetype: {
          name: issueTypeMap[workItemType as keyof typeof issueTypeMap] || 'Task'
        }
      }
    }

    // Add optional fields only if they have values
    // We'll try to create the issue first with basic fields, then retry without problematic fields if needed
    
    if (content.labels && content.labels.length > 0) {
      issueData.fields.labels = content.labels
    }

    // Add custom fields if present
    if (content.customFields) {
      Object.entries(content.customFields).forEach(([key, value]) => {
        if (value !== null && value !== undefined && value !== '') {
          issueData.fields[key] = value
        }
      })
    }

    // Function to create issue with given data
    const createIssue = async (data: any) => {
      console.log('Creating Jira issue with data:', JSON.stringify(data, null, 2))
      
      return await fetch(`${cleanUrl}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })
    }

    // Try to create the issue with all fields first
    let response = await createIssue(issueData)

    // If we get a 400 error due to field issues, try with just basic fields
    if (!response.ok && response.status === 400) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Jira API error:', response.status, response.statusText, errorData)
      
      // Check if the error is related to field availability
      if (errorData.errors && (
        errorData.errors.priority || 
        errorData.errors.customfield_10002 ||
        Object.keys(errorData.errors).some(key => key.startsWith('customfield_'))
      )) {
        console.log('Retrying with basic fields only due to field availability issues')
        
        // Create a minimal issue data with only required fields
        const basicIssueData: any = {
          fields: {
            project: {
              key: projectKey || 'AC'
            },
            summary: content.title,
            description: descriptionADF,
            issuetype: {
              name: issueTypeMap[workItemType as keyof typeof issueTypeMap] || 'Task'
            }
          }
        }

        // Add labels if they were in the original data (usually safe)
        if (content.labels && content.labels.length > 0) {
          basicIssueData.fields.labels = content.labels
        }

        // Retry with basic fields
        response = await createIssue(basicIssueData)
      }
    }

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Jira API error:', response.status, response.statusText, errorData)
      
      if (response.status === 400) {
        const errorMessages = errorData.errors 
          ? Object.values(errorData.errors).join(', ')
          : 'Invalid request data'
        return NextResponse.json(
          { error: `Bad request: ${errorMessages}` },
          { status: 400 }
        )
      } else if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check your credentials.' },
          { status: 401 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: 'Permission denied. You may not have permission to create issues in this project.' },
          { status: 403 }
        )
      } else {
        return NextResponse.json(
          { error: `Jira API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        )
      }
    }

    const createdIssue = await response.json()

    return NextResponse.json({
      success: true,
      message: 'Issue created successfully!',
      issue: {
        id: createdIssue.id,
        key: createdIssue.key,
        url: `${cleanUrl}/browse/${createdIssue.key}`,
        self: createdIssue.self
      },
    })
  } catch (error) {
    console.error('Create issue error:', error)
    
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'Network error. Please check your connection to Jira.' },
        { status: 500 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error. Please try again.' },
      { status: 500 }
    )
  }
} 