import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { jiraConnection } = await request.json()

    if (!jiraConnection) {
      return NextResponse.json(
        { error: 'Jira connection is required' },
        { status: 400 }
      )
    }

    const { url, email, apiToken } = jiraConnection

    if (!url || !email || !apiToken) {
      return NextResponse.json(
        { error: 'Invalid Jira connection. Missing url, email, or apiToken.' },
        { status: 400 }
      )
    }

    // Clean up the URL
    const cleanUrl = url.replace(/\/+$/, '')
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')

    // Get all projects
    const response = await fetch(`${cleanUrl}/rest/api/3/project`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Jira API error:', response.status, response.statusText, errorData)
      
      if (response.status === 401) {
        return NextResponse.json(
          { error: 'Authentication failed. Please check your credentials.' },
          { status: 401 }
        )
      } else if (response.status === 403) {
        return NextResponse.json(
          { error: 'Permission denied. You may not have permission to view projects.' },
          { status: 403 }
        )
      } else {
        return NextResponse.json(
          { error: `Jira API error: ${response.status} ${response.statusText}` },
          { status: response.status }
        )
      }
    }

    const projects = await response.json()

    // Format projects for easier consumption
    const formattedProjects = projects.map((project: any) => ({
      id: project.id,
      key: project.key,
      name: project.name,
      projectTypeKey: project.projectTypeKey,
      simplified: project.simplified,
      style: project.style,
      isPrivate: project.isPrivate
    }))

    return NextResponse.json({
      success: true,
      projects: formattedProjects,
      count: formattedProjects.length
    })
  } catch (error) {
    console.error('Get projects error:', error)
    
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