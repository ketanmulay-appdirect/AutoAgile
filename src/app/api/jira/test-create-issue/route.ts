import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection, issueTypeId, testData } = await request.json()

    if (!jiraConnection?.url || !jiraConnection?.email || !jiraConnection?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    if (!issueTypeId) {
      return NextResponse.json(
        { error: 'Missing issue type ID' },
        { status: 400 }
      )
    }

    const auth = Buffer.from(`${jiraConnection.email}:${jiraConnection.apiToken}`).toString('base64')
    const cleanUrl = jiraConnection.url.replace(/\/$/, '')
    
    // Detect if this is Jira Cloud or Server
    const isJiraCloud = cleanUrl.includes('.atlassian.net')
    const apiVersion = isJiraCloud ? '3' : '2'
    
    // Get project key from the first project
    const projectsResponse = await fetch(`${cleanUrl}/rest/api/${apiVersion}/project`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    })

    if (!projectsResponse.ok) {
      return NextResponse.json(
        { error: 'Failed to get projects' },
        { status: projectsResponse.status }
      )
    }

    const projects = await projectsResponse.json()
    const projectKey = projects[0]?.key

    if (!projectKey) {
      return NextResponse.json(
        { error: 'No projects found' },
        { status: 404 }
      )
    }

    // Attempt to create a test issue with minimal data
    const descriptionText = testData?.description || 'This is a test for field discovery'
    
    // Use ADF for Jira Cloud, plain text for Jira Server
    let description: any
    if (isJiraCloud) {
      description = {
        type: 'doc',
        version: 1,
        content: [{
          type: 'paragraph',
          content: [{
            type: 'text',
            text: descriptionText
          }]
        }]
      }
    } else {
      description = descriptionText
    }
    
    const issueData = {
      fields: {
        project: {
          key: projectKey
        },
        issuetype: {
          id: issueTypeId
        },
        summary: testData?.summary || 'TEST - Field Discovery',
        description: description
      }
    }

    const response = await fetch(`${cleanUrl}/rest/api/${apiVersion}/issue`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(issueData)
    })

    const responseData = await response.json()

    if (response.ok) {
      // If successful, immediately delete the test issue
      const issueKey = responseData.key
      if (issueKey) {
        try {
          await fetch(`${cleanUrl}/rest/api/${apiVersion}/issue/${issueKey}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Basic ${auth}`,
            },
          })
        } catch (deleteError) {
          console.warn('Failed to delete test issue:', deleteError)
        }
      }

      return NextResponse.json({
        success: true,
        message: 'Test issue creation successful (and deleted)',
        minimalFields: ['summary', 'description', 'project', 'issuetype']
      })
    } else {
      // Return the error for field discovery
      return NextResponse.json(
        { 
          error: responseData.errorMessages?.join(', ') || 'Unknown error',
          details: responseData
        },
        { status: response.status }
      )
    }

  } catch (error) {
    console.error('Error in test issue creation:', error)
    return NextResponse.json(
      { error: 'Failed to test issue creation' },
      { status: 500 }
    )
  }
} 