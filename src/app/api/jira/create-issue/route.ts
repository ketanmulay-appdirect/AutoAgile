import { NextRequest, NextResponse } from 'next/server'
import { jiraFieldFormatter } from '../../../../lib/jira-field-formatter'
import { jiraFieldService } from '../../../../lib/jira-field-service'
import { markdownToADFConverter, ADFDocument } from '../../../../lib/markdown-to-adf-converter'
import { markdownToWikiConverter } from '../../../../lib/markdown-to-wiki-converter'

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
    
    console.log('Received jiraConnection:', { 
      url, 
      email, 
      projectKey, 
      hasApiToken: !!apiToken,
      allKeys: Object.keys(jiraConnection)
    })

    if (!url || !email || !apiToken) {
      return NextResponse.json(
        { error: 'Invalid Jira connection. Missing url, email, or apiToken.' },
        { status: 400 }
      )
    }

    // Validate project key
    if (!projectKey) {
      return NextResponse.json(
        { error: 'Project key is required. Please configure your Jira connection with a valid project key.' },
        { status: 400 }
      )
    }

    console.log('Creating Jira issue with project key:', projectKey, 'for work item type:', workItemType)

    // Clean up the URL
    const cleanUrl = url.replace(/\/$/, '')
    
    // Detect if this is Jira Cloud or Server based on URL
    const isJiraCloud = cleanUrl.includes('.atlassian.net')
    const apiVersion = isJiraCloud ? '3' : '2'
    console.log(`Detected Jira type: ${isJiraCloud ? 'Cloud' : 'Server/Data Center'}, using API v${apiVersion}`)
    
    // Create Basic Auth header
    const auth = Buffer.from(`${email}:${apiToken}`).toString('base64')

    // First, verify the project exists and get its ID (more reliable than key for some Jira instances)
    let projectId: string | null = null
    try {
      const projectCheckUrl = `${cleanUrl}/rest/api/${apiVersion}/project/${projectKey}`
      const projectResponse = await fetch(projectCheckUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      })
      
      if (!projectResponse.ok) {
        if (projectResponse.status === 404) {
          return NextResponse.json(
            { error: `Project "${projectKey}" not found. Please go to Jira Connection settings and select a valid project using the Discover button.` },
            { status: 400 }
          )
        } else if (projectResponse.status === 403) {
          return NextResponse.json(
            { error: `You don't have permission to access project "${projectKey}". Please contact your Jira administrator or select a different project.` },
            { status: 403 }
          )
        } else {
          console.warn(`Project check failed with status ${projectResponse.status}`)
        }
      } else {
        const projectData = await projectResponse.json()
        projectId = projectData.id
        console.log(`Verified project: ${projectData.key} - ${projectData.name} (ID: ${projectId})`)
      }
    } catch (projectError) {
      console.warn('Error verifying project:', projectError)
    }

    // Get available issue types for this project
    let issueTypeId: string | null = null
    let issueTypeName: string = 'Task' // fallback
    
    try {
      // Try the newer createmeta endpoint first (Jira Cloud)
      const createMetaUrl = `${cleanUrl}/rest/api/${apiVersion}/issue/createmeta/${projectKey}/issuetypes`
      console.log('Fetching issue types from:', createMetaUrl)
      
      const metaResponse = await fetch(createMetaUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Accept': 'application/json',
        },
      })
      
      if (metaResponse.ok) {
        const metaData = await metaResponse.json()
        // Handle different response formats from Jira API
        let availableTypes = metaData.issueTypes || metaData.values || metaData || []
        // If the response is an array directly
        if (Array.isArray(metaData)) {
          availableTypes = metaData
        }
        
        console.log('Raw metadata response:', JSON.stringify(metaData).substring(0, 500))
        console.log('Available issue types:', availableTypes.map((t: any) => ({ id: t.id, name: t.name })))
        
        // Map our work item types to possible Jira issue type names (in order of preference)
        const typePreferences: Record<string, string[]> = {
          'initiative': ['Initiative', 'Epic', 'Feature'],
          'epic': ['Epic', 'Initiative', 'Feature'],
          'story': ['Story', 'User Story', 'Task'],
        }
        
        const preferredNames = typePreferences[workItemType] || ['Task']
        
        // Find the first matching issue type (case-insensitive)
        for (const preferred of preferredNames) {
          const found = availableTypes.find((t: any) => 
            t.name.toLowerCase() === preferred.toLowerCase()
          )
          if (found) {
            issueTypeId = found.id
            issueTypeName = found.name
            console.log(`Found matching issue type: ${issueTypeName} (ID: ${issueTypeId}) for work item type: ${workItemType}`)
            break
          }
        }
        
        // If no preferred type found, try to use any available type
        if (!issueTypeId && availableTypes.length > 0) {
          // Prefer non-subtask types
          const nonSubtask = availableTypes.find((t: any) => !t.subtask)
          if (nonSubtask) {
            issueTypeId = nonSubtask.id
            issueTypeName = nonSubtask.name
            console.log(`Using fallback issue type: ${issueTypeName} (ID: ${issueTypeId})`)
          }
        }
        
        if (!issueTypeId && availableTypes.length > 0) {
          // Return helpful error with available types
          const availableTypeNames = availableTypes.map((t: any) => t.name).join(', ')
          console.warn('No suitable issue type found. Available types:', availableTypeNames)
          return NextResponse.json(
            { 
              error: `No matching issue type found for "${workItemType}". Available types in project ${projectKey}: ${availableTypeNames}. Please check your Jira project configuration.`,
              availableTypes: availableTypes.map((t: any) => ({ id: t.id, name: t.name }))
            },
            { status: 400 }
          )
        } else if (availableTypes.length === 0) {
          console.warn('No issue types returned from API')
        }
      } else {
        const errorText = await metaResponse.text()
        console.warn('Failed to fetch issue types from createmeta:', metaResponse.status, errorText)
        
        // Try legacy endpoint as fallback
        const legacyUrl = `${cleanUrl}/rest/api/${apiVersion}/issue/createmeta?projectKeys=${projectKey}&expand=projects.issuetypes`
        const legacyResponse = await fetch(legacyUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        })
        
        if (legacyResponse.ok) {
          const legacyData = await legacyResponse.json()
          const project = legacyData.projects?.[0]
          const availableTypes = project?.issuetypes || []
          
          const typePreferences: Record<string, string[]> = {
            'initiative': ['Initiative', 'Epic', 'Feature'],
            'epic': ['Epic', 'Initiative', 'Feature'],
            'story': ['Story', 'User Story', 'Task'],
          }
          
          const preferredNames = typePreferences[workItemType] || ['Task']
          
          for (const preferred of preferredNames) {
            const found = availableTypes.find((t: any) => 
              t.name.toLowerCase() === preferred.toLowerCase()
            )
            if (found) {
              issueTypeId = found.id
              issueTypeName = found.name
              break
            }
          }
        }
      }
    } catch (metaError) {
      console.warn('Error fetching issue type metadata:', metaError)
    }
    
    // If we still don't have an issue type, try the global issuetype endpoint
    if (!issueTypeId) {
      try {
        console.log('Trying global issue types endpoint as fallback')
        const globalTypesUrl = `${cleanUrl}/rest/api/${apiVersion}/issuetype`
        const globalResponse = await fetch(globalTypesUrl, {
          method: 'GET',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Accept': 'application/json',
          },
        })
        
        if (globalResponse.ok) {
          const globalTypes = await globalResponse.json()
          console.log('Global issue types:', globalTypes.map((t: any) => ({ id: t.id, name: t.name })))
          
          const typePreferences: Record<string, string[]> = {
            'initiative': ['Initiative', 'Epic', 'Feature'],
            'epic': ['Epic', 'Initiative', 'Feature'],
            'story': ['Story', 'User Story', 'Task'],
          }
          
          const preferredNames = typePreferences[workItemType] || ['Task']
          
          for (const preferred of preferredNames) {
            const found = globalTypes.find((t: any) => 
              t.name.toLowerCase() === preferred.toLowerCase() && !t.subtask
            )
            if (found) {
              issueTypeId = found.id
              issueTypeName = found.name
              console.log(`Found global issue type: ${issueTypeName} (ID: ${issueTypeId})`)
              break
            }
          }
          
          // If still not found, use any non-subtask type
          if (!issueTypeId) {
            const anyType = globalTypes.find((t: any) => !t.subtask)
            if (anyType) {
              issueTypeId = anyType.id
              issueTypeName = anyType.name
              console.log(`Using first available non-subtask type: ${issueTypeName} (ID: ${issueTypeId})`)
            }
          }
        }
      } catch (globalError) {
        console.warn('Error fetching global issue types:', globalError)
      }
    }
    
    // Final fallback - use name-based approach
    if (!issueTypeId) {
      const issueTypeMap: Record<string, string> = {
        'initiative': 'Epic',
        'epic': 'Epic',
        'story': 'Story'
      }
      issueTypeName = issueTypeMap[workItemType] || 'Task'
      console.log(`Using final fallback issue type name: ${issueTypeName}`)
    }

    // Convert description based on API version
    // API v3 (Jira Cloud) uses ADF, API v2 (Jira Server) uses plain text/wiki markup
    let description: string | ADFDocument
    
    if (isJiraCloud) {
      // Use ADF for Jira Cloud
      let descriptionADF: ADFDocument
      
      if (content.description && content.description.trim()) {
        descriptionADF = markdownToADFConverter.convert(content.description)
      } else {
        descriptionADF = {
          type: 'doc',
          version: 1,
          content: [{
            type: 'paragraph',
            content: [{
              type: 'text',
              text: content.description || ''
            }]
          }]
        }
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
      
      description = descriptionADF
    } else {
      // Use Jira wiki markup for Jira Server/Data Center
      let descriptionText = content.description || ''
      
      // Convert markdown to Jira wiki markup
      descriptionText = markdownToWikiConverter.convert(descriptionText)
      
      // Add acceptance criteria if present (already in wiki format)
      if (content.acceptanceCriteria && content.acceptanceCriteria.length > 0) {
        descriptionText += '\n\nh3. Acceptance Criteria\n'
        content.acceptanceCriteria.forEach((criteria: string) => {
          descriptionText += `* ${criteria}\n`
        })
      }
      
      description = descriptionText
    }

    // Prepare the basic issue data with only required fields
    const issueData: any = {
      fields: {
        project: projectId 
          ? { id: projectId }  // Use ID if available (more reliable for some Jira instances)
          : { key: projectKey },  // Fall back to key
        summary: content.title,
        description: description,
        issuetype: issueTypeId 
          ? { id: issueTypeId }  // Use ID if available (more reliable)
          : { name: issueTypeName }  // Fall back to name
      }
    }
    
    console.log(`Creating issue in project: ${projectKey}${projectId ? ` (ID: ${projectId})` : ''}, type: ${issueTypeName}${issueTypeId ? ` (ID: ${issueTypeId})` : ''}`)

    // Add optional fields only if they have values
    // We'll try to create the issue first with basic fields, then retry without problematic fields if needed
    
    if (content.labels && content.labels.length > 0) {
      issueData.fields.labels = content.labels
    }

    // Add custom fields if present - with proper formatting
    if (content.customFields) {
      // Process custom fields with proper formatting
      for (const [key, value] of Object.entries(content.customFields)) {
        if (value !== null && value !== undefined && value !== '') {
          // Handle special fields that need specific formatting
          if (key === 'project') {
            // Project should be an object with key - handle if value is already an object
            if (typeof value === 'object' && value !== null && (value as any).key) {
              issueData.fields.project = value  // Already properly formatted
            } else {
              issueData.fields.project = { key: value }
            }
          } else if (key === 'issuetype') {
            // Issue type should be an object with name - handle if value is already an object
            if (typeof value === 'object' && value !== null && ((value as any).name || (value as any).id)) {
              issueData.fields.issuetype = value  // Already properly formatted
            } else {
              issueData.fields.issuetype = { name: value }
            }
          } else if (key === 'assignee') {
            // User fields should be objects with accountId or emailAddress
            issueData.fields[key] = { emailAddress: value }
          } else if (key === 'reporter') {
            // Skip reporter field as it's often not settable by API
            console.log('Skipping reporter field - not settable via API')
          } else if (key === 'priority') {
            // Priority field needs to be an object with name
            issueData.fields[key] = { name: value }
          } else if (key.startsWith('customfield_')) {
            // For custom fields, get metadata and format properly
            try {
              const fieldMetadata = await jiraFieldService.getFieldMetadata(jiraConnection, key)
              if (fieldMetadata) {
                const formatInfo = jiraFieldFormatter.getFieldFormatInfo(fieldMetadata)
                const formattedValue = jiraFieldFormatter.formatFieldValue(formatInfo, value)
                if (formattedValue !== null) {
                  issueData.fields[key] = formattedValue
                  console.log(`Formatted field ${key}:`, formattedValue)
                }
              } else {
                // Fallback formatting for unknown custom fields
                console.log(`No metadata found for ${key}, using fallback formatting`)
                if (key === 'customfield_26360') {
                  // Include on Roadmap (Internal/External) - needs array format.
                  // For multiselect fields, Jira expects an array of objects with 'value' property
                  const values = Array.isArray(value) ? value : [value];
                  const formattedValues = values
                    .filter(v => v && v.toString().trim()) // Remove empty values
                    .map(v => {
                      const trimmedValue = String(v).trim();
                      // Try multiple format variations that Jira might accept
                      return { value: trimmedValue };
                    });
                  
                  console.log(`Formatting customfield_26360: input=${JSON.stringify(value)} -> output=${JSON.stringify(formattedValues)}`);
                  issueData.fields[key] = formattedValues;
                } else if (key === 'customfield_26362') {
                  // Delivery Quarter - needs object format
                  issueData.fields[key] = { value: value }
                } else {
                  // Default object format for custom fields
                  issueData.fields[key] = { value: value }
                }
              }
            } catch (error) {
              console.error(`Error formatting field ${key}:`, error)
              // Fallback to simple formatting
              issueData.fields[key] = { value: value }
            }
          } else {
            issueData.fields[key] = value
          }
        }
      }
    }

    // Function to create issue with given data
    const createIssue = async (data: any) => {
      console.log('Creating Jira issue with data:', JSON.stringify(data, null, 2))
      
      return await fetch(`${cleanUrl}/rest/api/${apiVersion}/issue`, {
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
    let consumedErrorData: any = null  // Track if we've already consumed the response body

    // If we get a 400 error, check for field discovery opportunities first
    if (!response.ok && response.status === 400) {
      const errorData = await response.json().catch(() => ({}))
      consumedErrorData = errorData  // Store the consumed error data
      console.error('Jira API error:', response.status, response.statusText, errorData)

      // Check for invalid option value error for custom fields
      if (errorData.errors) {
        for (const fieldId in errorData.errors) {
          if (fieldId.startsWith('customfield_') && typeof errorData.errors[fieldId] === 'string' && errorData.errors[fieldId].includes('is not valid')) {
            console.log(`Invalid option detected for ${fieldId}: ${errorData.errors[fieldId]}`);
            try {
              const fieldMetadata = await jiraFieldService.getFieldMetadata(jiraConnection, fieldId);
              let allowedOptions = [];
              if (fieldMetadata && fieldMetadata.options) {
                allowedOptions = fieldMetadata.options.map((opt: any) => ({
                  id: opt.id,
                  value: opt.value,
                  name: opt.name || opt.value // Fallback to value if name is not present
                }));
              }
              
              // Find the original value sent for this field from issueData
              let originalValue = issueData.fields[fieldId];
              if (typeof originalValue === 'object' && originalValue !== null) {
                // If it's an array of objects like [{id: "123"}] or [{value: "abc"}], extract the primitive
                if (Array.isArray(originalValue) && originalValue.length > 0) {
                    originalValue = originalValue[0].id || originalValue[0].value;
                } else { // If it's a single object like {id: "123"} or {value: "abc"}
                    originalValue = originalValue.id || originalValue.value;
                }
              }


              return NextResponse.json({
                error: 'Invalid field option',
                fieldId: fieldId,
                errorMessage: errorData.errors[fieldId],
                invalidValue: originalValue, // Attempt to send back the value that was problematic
                allowedOptions: allowedOptions,
                jiraError: errorData
              }, { status: 400 });
            } catch (metaError) {
              console.error(`Failed to get metadata for ${fieldId} after invalid option error:`, metaError);
              // Fallback if metadata fetch fails
              return NextResponse.json({
                error: 'Invalid field option and failed to fetch options',
                fieldId: fieldId,
                errorMessage: errorData.errors[fieldId],
                jiraError: errorData
              }, { status: 400 });
            }
          }
        }
      }
      
      // Check if this is a required fields error that can be used for field discovery
      const hasRequiredFieldsError = errorData.errors && Object.keys(errorData.errors).some(key => 
        typeof errorData.errors[key] === 'string' && 
        (errorData.errors[key].toLowerCase().includes('required') || 
         errorData.errors[key].toLowerCase().includes('is required'))
      )
      
      if (hasRequiredFieldsError) {
        console.log('Required fields error detected, triggering field discovery')
        console.log('Error details:', errorData.errors)
        // Return the full error data for field discovery
        return NextResponse.json({
          error: 'Required fields missing',
          fieldDiscovery: true,
          jiraError: errorData,
          workItemType: workItemType
        }, { status: 400 })
      }
      
      // If not a required fields error, try with basic fields only
      // Only retry for non-required field errors (like priority, optional custom fields)
      if (errorData.errors && !hasRequiredFieldsError && (
        errorData.errors.priority || 
        errorData.errors.duedate ||
        errorData.errors.reporter ||
        (errorData.errors.customfield_10002 && !errorData.errors.customfield_10002.toLowerCase().includes('required')) ||
        // Add a check for the problematic custom field if it's not a 'required' error but an 'invalid option'
        (errorData.errors.customfield_26360 && !errorData.errors.customfield_26360.toLowerCase().includes('required'))
      )) {
        console.log('Retrying with basic fields only due to field availability/validity issues')
        
        // Create a minimal issue data with only required fields
        const basicIssueData: any = {
          fields: {
            project: projectId 
              ? { id: projectId }
              : { key: projectKey },
            summary: content.title,
            description: description,
            issuetype: issueTypeId 
              ? { id: issueTypeId }
              : { name: issueTypeName }
          }
        }

        // Add any required fields from customFields with proper formatting
        if (content.customFields) {
          for (const [key, value] of Object.entries(content.customFields)) {
            if (value !== null && value !== undefined && value !== '') {
              if (key === 'project') {
                // Project should be an object with key - handle if value is already an object
                if (typeof value === 'object' && value !== null && (value as any).key) {
                  basicIssueData.fields.project = value
                } else {
                  basicIssueData.fields.project = { key: value }
                }
              } else if (key === 'issuetype') {
                // Issue type should be an object with name - handle if value is already an object
                if (typeof value === 'object' && value !== null && ((value as any).name || (value as any).id)) {
                  basicIssueData.fields.issuetype = value
                } else {
                  basicIssueData.fields.issuetype = { name: value }
                }
              } else if (key === 'assignee') {
                basicIssueData.fields[key] = { emailAddress: value }
              } else if (key === 'reporter') {
                // Skip reporter field - not settable via API
                console.log('Skipping reporter field in retry')
              } else if (key === 'priority') {
                // Skip priority field - may not be available
                console.log('Skipping priority field in retry')
              } else if (key.startsWith('customfield_')) {
                // Include custom fields that might be required with proper formatting
                try {
                  const fieldMetadata = await jiraFieldService.getFieldMetadata(jiraConnection, key)
                  if (fieldMetadata) {
                    const formatInfo = jiraFieldFormatter.getFieldFormatInfo(fieldMetadata)
                    const formattedValue = jiraFieldFormatter.formatFieldValue(formatInfo, value)
                    if (formattedValue !== null) {
                      basicIssueData.fields[key] = formattedValue
                      console.log(`Formatted field ${key} in retry:`, formattedValue)
                    }
                  } else {
                    // Fallback formatting
                    if (key === 'customfield_26360') {
                      basicIssueData.fields[key] = Array.isArray(value) ? value.map(v => ({ id: String(v) })) : [{ id: String(value) }]
                    } else if (key === 'customfield_26362') {
                      basicIssueData.fields[key] = { value: value }
                    } else {
                      basicIssueData.fields[key] = { value: value }
                    }
                  }
                } catch (error) {
                  console.error(`Error formatting field ${key} in retry:`, error)
                  basicIssueData.fields[key] = { value: value }
                }
              }
            }
          }
        }

        // Add labels if they were in the original data (usually safe)
        if (content.labels && content.labels.length > 0) {
          basicIssueData.fields.labels = content.labels
        }

        // Retry with basic fields
        response = await createIssue(basicIssueData)
        consumedErrorData = null  // Reset since we have a new response
      }
    }

    if (!response.ok) {
      let errorData: any = {}
      
      // Use already consumed error data if available, otherwise read fresh
      if (consumedErrorData !== null) {
        errorData = consumedErrorData
      } else {
        let rawResponseText = ''
        try {
          rawResponseText = await response.text()
          errorData = rawResponseText ? JSON.parse(rawResponseText) : {}
        } catch (parseError) {
          console.error('Failed to parse Jira error response:', rawResponseText)
          errorData = { rawResponse: rawResponseText }
        }
      }
      console.error('Jira API error:', response.status, response.statusText, errorData)
      
      // Check if this is an invalid field option error that was re-thrown after a retry
      // This check is simplified as the detailed parsing is now done before the retry block
      if (response.status === 400 && errorData.error === 'Invalid field option') {
          return NextResponse.json(errorData, { status: 400 });
      }

      if (response.status === 400) {
        // Check if this is a project key error
        if (errorData.errors && errorData.errors.project) {
          return NextResponse.json(
            { error: `Project error: ${errorData.errors.project}. Project key used: "${projectKey}". Please check your Jira connection and ensure this project exists and you have access to it.` },
            { status: 400 }
          )
        }
        

        
        let errorMessages = 'Invalid request data'
        if (errorData.errors && Object.keys(errorData.errors).length > 0) {
          errorMessages = Object.values(errorData.errors).join(', ')
        } else if (errorData.errorMessages) {
          errorMessages = Array.isArray(errorData.errorMessages) ? errorData.errorMessages.join(', ') : errorData.errorMessages
        } else if (errorData.message) {
          errorMessages = errorData.message
        } else if (errorData.rawResponse) {
          errorMessages = `Jira returned: ${errorData.rawResponse.substring(0, 500)}`
        } else if (Object.keys(errorData).length > 0) {
          errorMessages = JSON.stringify(errorData)
        }
        console.error('Jira API 400 error details:', JSON.stringify(errorData, null, 2))
        return NextResponse.json(
          { error: `Bad request: ${errorMessages}`, details: errorData },
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