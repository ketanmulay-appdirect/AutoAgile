'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { JiraInstance, JiraWorkItem, ContentType } from '../types'
import { contentInstructionService } from '../lib/content-instruction-service'

interface ContentGeneratorProps {
  jiraConnection: JiraInstance
  devsAIConnection: unknown
  workItem: JiraWorkItem
  contentType: ContentType
  deliveryQuarter: string
  onBack: () => void
}

export function ContentGenerator({
  devsAIConnection,
  workItem,
  contentType,
  deliveryQuarter,
  onBack
}: ContentGeneratorProps) {
  const [generatedContent, setGeneratedContent] = useState<string>('')
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const getContentTypeInfo = (type: ContentType) => {
    switch (type) {
      case 'quarterly-presentation':
        return {
          title: 'Quarterly Presentation',
          description: 'Executive slide deck for quarterly business reviews',
          icon: '📊'
        }
      case 'customer-webinar':
        return {
          title: 'Customer Webinar',
          description: 'Customer-facing presentation content',
          icon: '🎯'
        }
      case 'feature-newsletter':
        return {
          title: 'Feature Newsletter',
          description: 'Newsletter content for feature announcement',
          icon: '📰'
        }
    }
  }

  const generateContent = useCallback(async () => {
    if (!workItem) return
    
    setIsGenerating(true)
    setGeneratedContent(null)
    
    try {
      const instructions = contentInstructionService.getActiveInstructions(contentType)
      
      // Extract problem and solution descriptions
      const extractProblemAndSolution = (description: any): { problemDescription: string; solutionDescription: string } => {
        let fullText = ''
        
        // Extract text from description (handle both string and ADF formats)
        if (typeof description === 'string') {
          fullText = description
        } else if (description && typeof description === 'object' && description.content) {
          const extractText = (node: any): string => {
            if (node.text) {
              return node.text
            }
            if (node.content && Array.isArray(node.content)) {
              return node.content.map(extractText).join(' ')
            }
            return ''
          }
          fullText = description.content.map(extractText).join('\n').trim()
        }
        
        // Initialize result
        let problemDescription = ''
        let solutionDescription = ''
        
        // Split text into lines for processing
        const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
        
        let currentSection = ''
        let problemLines: string[] = []
        let solutionLines: string[] = []
        
        for (const line of lines) {
          // Check for section headings (case insensitive)
          const lowerLine = line.toLowerCase()
          
          if (lowerLine.includes('problem description') || 
              lowerLine.includes('problem statement') ||
              lowerLine.includes('the problem') ||
              (lowerLine.startsWith('problem') && lowerLine.includes(':'))) {
            currentSection = 'problem'
            continue
          }
          
          if (lowerLine.includes('solution description') || 
              lowerLine.includes('solution statement') ||
              lowerLine.includes('the solution') ||
              lowerLine.includes('proposed solution') ||
              (lowerLine.startsWith('solution') && lowerLine.includes(':'))) {
            currentSection = 'solution'
            continue
          }
          
          // Skip obvious headings (lines that are very short and might be section headers)
          if (line.length < 10 && (line.includes('#') || line.includes('###'))) {
            continue
          }
          
          // Add content to appropriate section
          if (currentSection === 'problem' && line.length > 10) {
            problemLines.push(line)
          } else if (currentSection === 'solution' && line.length > 10) {
            solutionLines.push(line)
          }
        }
        
        // Join the lines and clean up
        problemDescription = problemLines.join(' ').trim()
        solutionDescription = solutionLines.join(' ').trim()
        
        // If we didn't find specific sections, try to extract from the beginning of the description
        if (!problemDescription && !solutionDescription && fullText.length > 50) {
          // Take first half as problem, second half as solution (fallback)
          const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 10)
          if (sentences.length >= 2) {
            const midPoint = Math.ceil(sentences.length / 2)
            problemDescription = sentences.slice(0, midPoint).join('. ').trim() + '.'
            solutionDescription = sentences.slice(midPoint).join('. ').trim() + '.'
          } else {
            // If very short, use the whole thing as problem description
            problemDescription = fullText
          }
        }
        
        return {
          problemDescription: problemDescription || 'No problem description available',
          solutionDescription: solutionDescription || 'No solution description available'
        }
      }
      
      const { problemDescription, solutionDescription } = extractProblemAndSolution(workItem.description)
      
      const prompt = `${instructions}

Work Item Details:
- Title: ${workItem.summary}
- Type: ${workItem.issueType}
- Status: ${workItem.status}
- Project: ${workItem.project}
- Delivery Quarter: ${deliveryQuarter}
- Problem Description: ${problemDescription}
- Solution Description: ${solutionDescription}
- Labels: ${workItem.labels?.join(', ') || 'None'}
- Fix Versions: ${workItem.fixVersions?.join(', ') || 'None'}

${contentType === 'feature-newsletter' ? 
`CRITICAL: You must output EXACTLY this format with NO headings, NO markdown, NO numbered lists:

[Clean feature title - max 12 words]

[The Why paragraph - up to 150 words (80 recommended) about the problem/limitation]

[The How paragraph - up to 150 words (80 recommended) about how the feature solves it]

Do NOT include any headings like "# Title" or "## The Why". Just provide the title followed by two paragraphs.` : 
''}`

      // Use Devs.ai API if available, otherwise use a mock response
      if (devsAIConnection) {
        const response = await fetch('/api/generate-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            contentType,
            workItem: workItem
          })
        })

        if (!response.ok) {
          throw new Error('Failed to generate content')
        }

        const data = await response.json()
        setGeneratedContent(data.content)
      } else {
        // Mock content generation for demo purposes
        await new Promise(resolve => setTimeout(resolve, 2000))
        setGeneratedContent(generateMockContent(contentType, workItem))
      }
    } catch (err) {
      setError('Failed to generate content. Please try again.')
      console.error(err)
    } finally {
      setIsGenerating(false)
    }
  }, [devsAIConnection, contentType, workItem.key, workItem.summary, workItem.issueType, workItem.status, workItem.project, deliveryQuarter, workItem.description])

  const generateMockContent = (type: ContentType, item: JiraWorkItem): string => {
    const timestamp = new Date().toLocaleString()
    
    // Helper function to extract Problem Description and Solution Description sections
    const extractProblemAndSolution = (description: any): { problemDescription: string; solutionDescription: string } => {
      let fullText = ''
      
      // Extract text from description (handle both string and ADF formats)
      if (typeof description === 'string') {
        fullText = description
      } else if (description && typeof description === 'object' && description.content) {
        const extractText = (node: any): string => {
          if (node.text) {
            return node.text
          }
          if (node.content && Array.isArray(node.content)) {
            return node.content.map(extractText).join(' ')
          }
          return ''
        }
        fullText = description.content.map(extractText).join('\n').trim()
      }
      
      // Initialize result
      let problemDescription = ''
      let solutionDescription = ''
      
      // Split text into lines for processing
      const lines = fullText.split('\n').map(line => line.trim()).filter(line => line.length > 0)
      
      let currentSection = ''
      let problemLines: string[] = []
      let solutionLines: string[] = []
      
      for (const line of lines) {
        // Check for section headings (case insensitive)
        const lowerLine = line.toLowerCase()
        
        if (lowerLine.includes('problem description') || 
            lowerLine.includes('problem statement') ||
            lowerLine.includes('the problem') ||
            (lowerLine.startsWith('problem') && lowerLine.includes(':'))) {
          currentSection = 'problem'
          continue
        }
        
        if (lowerLine.includes('solution description') || 
            lowerLine.includes('solution statement') ||
            lowerLine.includes('the solution') ||
            lowerLine.includes('proposed solution') ||
            (lowerLine.startsWith('solution') && lowerLine.includes(':'))) {
          currentSection = 'solution'
          continue
        }
        
        // Skip obvious headings (lines that are very short and might be section headers)
        if (line.length < 10 && (line.includes('#') || line.includes('###'))) {
          continue
        }
        
        // Add content to appropriate section
        if (currentSection === 'problem' && line.length > 10) {
          problemLines.push(line)
        } else if (currentSection === 'solution' && line.length > 10) {
          solutionLines.push(line)
        }
      }
      
      // Join the lines and clean up
      problemDescription = problemLines.join(' ').trim()
      solutionDescription = solutionLines.join(' ').trim()
      
      // If we didn't find specific sections, try to extract from the beginning of the description
      if (!problemDescription && !solutionDescription && fullText.length > 50) {
        // Take first half as problem, second half as solution (fallback)
        const sentences = fullText.split(/[.!?]+/).filter(s => s.trim().length > 10)
        if (sentences.length >= 2) {
          const midPoint = Math.ceil(sentences.length / 2)
          problemDescription = sentences.slice(0, midPoint).join('. ').trim() + '.'
          solutionDescription = sentences.slice(midPoint).join('. ').trim() + '.'
        } else {
          // If very short, use the whole thing as problem description
          problemDescription = fullText
        }
      }
      
      return {
        problemDescription: problemDescription || 'No problem description available',
        solutionDescription: solutionDescription || 'No solution description available'
      }
    }
    
    const { problemDescription, solutionDescription } = extractProblemAndSolution(item.description)

    switch (type) {
      case 'quarterly-presentation':
        return `# ${item.summary} - Quarterly Review

## Executive Summary
${item.summary} represents a strategic initiative for ${deliveryQuarter} that will deliver significant value to our customers and business objectives.

## Business Impact
- **Customer Value**: Enhanced user experience and functionality
- **Revenue Impact**: Expected to drive user engagement and retention
- **Strategic Alignment**: Supports our core product vision

## Key Deliverables
- Feature development and testing
- User documentation and training materials
- Performance monitoring and analytics setup

## Success Metrics
- User adoption rate: Target 70% within first month
- Customer satisfaction score improvement
- Performance benchmarks achievement

## Timeline & Milestones
- **${deliveryQuarter} Planning**: Requirements finalization
- **Development Phase**: Core feature implementation
- **Testing & QA**: Comprehensive quality assurance
- **Release**: Production deployment and monitoring

## Risk Mitigation
- Regular stakeholder check-ins
- Phased rollout approach
- Rollback procedures in place

## Next Quarter Outlook
Building on this foundation, we plan to expand functionality and explore additional use cases.`

      case 'customer-webinar':
        return `# Introducing ${item.summary}

## Welcome & Agenda
Welcome to our exclusive webinar showcasing the latest innovation in our product suite.

## The Challenge We're Solving
Our customers have been asking for better ways to [describe the problem this feature solves].

## Feature Overview
${item.summary} is designed to:
- Streamline your workflow
- Improve efficiency
- Enhance user experience
- Provide better insights

## Live Demo Highlights
Let's explore the key capabilities:

### Core Functionality
- Intuitive interface design
- Seamless integration with existing tools
- Real-time data processing

### Advanced Features
- Customizable dashboards
- Automated reporting
- Enhanced security measures

## Customer Success Story
"This feature has transformed how we approach [relevant business process]" - [Customer Name]

## Getting Started
- Available in your dashboard starting [date]
- Step-by-step setup guide provided
- Support team ready to assist

## Q&A Session
We'll now address your questions about this exciting new feature.

## What's Next
- Additional enhancements planned for next quarter
- Beta program for advanced features
- Community feedback integration

## Thank You
Thank you for joining us today. We're excited to see how you'll use this new capability!`

      case 'feature-newsletter':
        // Extract a clean title from the work item summary
        const cleanTitle = item.summary.replace(/^\d{4}Q\d\s*-\s*\[[^\]]+\]\s*-\s*/, '').trim()
        const shortTitle = cleanTitle.length > 60 ? cleanTitle.substring(0, 57) + '...' : cleanTitle
        
        return `${shortTitle}

${problemDescription.length > 0 ? 
  `${problemDescription.substring(0, 300).replace(/\n/g, ' ').trim()}${problemDescription.length > 300 ? '...' : ''}` :
  `This feature addresses critical business pain points and user friction that have been limiting productivity and efficiency in daily operations. Our customers have been requesting enhanced capabilities to streamline workflows and reduce manual overhead in their core business processes.`
}

${solutionDescription.length > 0 ? 
  `${solutionDescription.substring(0, 300).replace(/\n/g, ' ').trim()}${solutionDescription.length > 300 ? '...' : ''}` :
  `${shortTitle} solves these challenges by providing an integrated solution that streamlines workflows, enhances data visibility, and improves collaboration across teams. The feature seamlessly integrates into our existing platform, giving customers immediate value while maintaining the familiar user experience they trust, enabling teams to focus on strategic initiatives rather than manual tasks.`
}`

      default:
        return 'Content generation not implemented for this type.'
    }
  }

  const copyToClipboard = async () => {
    if (!generatedContent) return

    try {
      await navigator.clipboard.writeText(generatedContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy content:', err)
    }
  }

  const contentTypeInfo = getContentTypeInfo(contentType)

  useEffect(() => {
    generateContent()
  }, [generateContent])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Content Types
        </button>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-config'))}
          className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
        >
          Configure Templates
        </button>
      </div>

      {/* Content Type Info */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center mb-4">
          <span className="text-3xl mr-4">{contentTypeInfo.icon}</span>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{contentTypeInfo.title}</h2>
            <p className="text-gray-600">{contentTypeInfo.description}</p>
          </div>
        </div>

        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2">Work Item: {workItem.key}</h3>
          <p className="text-gray-700">{workItem.summary}</p>
          <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
            <span>Project: {workItem.project}</span>
            <span>Quarter: {deliveryQuarter}</span>
            <span>Type: {workItem.issueType}</span>
          </div>
        </div>
      </div>

      {/* Generation Controls */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-900">Generate Content</h3>
          {generatedContent && (
            <button
              onClick={copyToClipboard}
              className={`flex items-center px-4 py-2 rounded-lg transition-colors ${
                copied
                  ? 'bg-green-100 text-green-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copied ? 'Copied!' : 'Copy Content'}
            </button>
          )}
        </div>

        {!generatedContent && (
          <button
            onClick={generateContent}
            disabled={isGenerating}
            className="w-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isGenerating ? (
              <div className="flex items-center justify-center space-x-3">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span>Generating Content...</span>
              </div>
            ) : (
              'Generate Content'
            )}
          </button>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
            <div className="flex">
              <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700">{error}</p>
            </div>
          </div>
        )}
      </div>

      {/* Generated Content */}
      {generatedContent && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-semibold text-gray-900">Generated Content</h3>
            <button
              onClick={generateContent}
              className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
            >
              Regenerate
            </button>
          </div>
          
          <div 
            ref={contentRef}
            className="prose max-w-none bg-gray-50 rounded-lg p-6 border"
            style={{ whiteSpace: 'pre-wrap' }}
          >
            {generatedContent}
          </div>
        </div>
      )}
    </div>
  )
} 