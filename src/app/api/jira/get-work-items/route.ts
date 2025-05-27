import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraInstance, projectKey, workItemType = 'epic', deliveryQuarter } = await request.json()

    if (!jiraInstance?.url || !jiraInstance?.email || !jiraInstance?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    if (!projectKey) {
      return NextResponse.json(
        { error: 'Project key is required' },
        { status: 400 }
      )
    }

    const auth = btoa(`${jiraInstance.email}:${jiraInstance.apiToken}`)
    
    let jql = `project = "${projectKey}"`
    
    // Add issue type filter - be more flexible with case and naming
    if (workItemType && workItemType !== 'all') {
      jql += ` AND issuetype = "${workItemType}"`
    }
    
    if (deliveryQuarter) {
      // Try to filter by fixVersion if quarter is specified
      jql += ` AND fixVersion ~ "${deliveryQuarter}"`
    }
    
    // Order by created date descending to get most recent items first
    jql += ' ORDER BY created DESC'

    console.log('Search parameters:', { projectKey, workItemType, deliveryQuarter })
    console.log('JQL Query:', jql)
    const searchUrl = `${jiraInstance.url}/rest/api/3/search?jql=${encodeURIComponent(jql)}&fields=summary,description,issuetype,status,project,fixVersions,labels&maxResults=50`
    console.log('Search URL:', searchUrl)

    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Jira API error: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    console.log('Work items search response:', {
      total: data.total,
      issueCount: data.issues?.length || 0,
      issues: data.issues?.slice(0, 3).map((issue: any) => ({
        key: issue.key,
        summary: issue.fields?.summary,
        issueType: issue.fields?.issuetype?.name
      }))
    })

    const workItems = data.issues.map((issue: { id: string; key: string; fields: any }) => ({
      id: issue.id,
      key: issue.key,
      summary: issue.fields.summary,
      description: issue.fields.description || '',
      issueType: issue.fields.issuetype.name,
      status: issue.fields.status.name,
      project: issue.fields.project.key,
      fixVersions: issue.fields.fixVersions?.map((v: any) => v.name) || [],
      labels: issue.fields.labels || []
    }))

    console.log('Processed work items count:', workItems.length)
    return NextResponse.json({ workItems })

  } catch (error) {
    console.error('Failed to fetch work items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch work items from Jira' },
      { status: 500 }
    )
  }
} 