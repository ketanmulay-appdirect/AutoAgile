import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraInstance } = await request.json()

    if (!jiraInstance?.url || !jiraInstance?.email || !jiraInstance?.apiToken) {
      return NextResponse.json(
        { error: 'Missing Jira connection details' },
        { status: 400 }
      )
    }

    const auth = btoa(`${jiraInstance.email}:${jiraInstance.apiToken}`)
    
    const response = await fetch(`${jiraInstance.url}/rest/api/3/project/search`, {
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
    
    const projects = data.values.map((project: { id: string; key: string; name: string; description?: string }) => ({
      id: project.id,
      key: project.key,
      name: project.name,
      description: project.description
    }))

    console.log('Found projects:', projects.map((p: { key: string; name: string }) => ({ key: p.key, name: p.name })))
    return NextResponse.json({ projects })

  } catch (error) {
    console.error('Failed to fetch projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects from Jira' },
      { status: 500 }
    )
  }
} 