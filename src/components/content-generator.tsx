'use client'

import React, { useState, useRef } from 'react'
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

  const generateContent = async () => {
    setIsGenerating(true)
    setError(null)
    setGeneratedContent('')

    try {
      const instructions = contentInstructionService.getActiveInstructions(contentType)
      
      const prompt = `${instructions}

Work Item Details:
- Title: ${workItem.summary}
- Type: ${workItem.issueType}
- Status: ${workItem.status}
- Project: ${workItem.project}
- Delivery Quarter: ${deliveryQuarter}
- Description: ${workItem.description}
- Labels: ${workItem.labels?.join(', ') || 'None'}
- Fix Versions: ${workItem.fixVersions?.join(', ') || 'None'}

Please generate the content based on the above work item details and instructions. Format the output as structured content suitable for the specified content type.`

      // Use DevS.ai API if available, otherwise use a mock response
      if (devsAIConnection) {
        const response = await fetch('/api/generate-content', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            contentType,
            workItem: workItem.key
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
  }

  const generateMockContent = (type: ContentType, item: JiraWorkItem): string => {
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
        return `# 🎉 Exciting News: ${item.summary} is Here!

## What's New
We're thrilled to announce the launch of ${item.summary}, a game-changing addition to our platform that will revolutionize how you work.

## Why This Matters
Based on your feedback and our commitment to continuous improvement, this feature addresses key pain points and opens up new possibilities for your workflows.

## Key Benefits
✅ **Improved Efficiency**: Streamline your daily tasks
✅ **Better Insights**: Make data-driven decisions faster  
✅ **Enhanced Collaboration**: Work seamlessly with your team
✅ **Increased Productivity**: Focus on what matters most

## How to Access
The feature is now available in your dashboard. Look for the new [Feature Name] section in your main navigation.

## Getting Started Guide
1. Navigate to the new feature section
2. Complete the quick setup wizard
3. Explore the tutorial for best practices
4. Start using the feature in your workflow

## Resources & Support
- 📖 **Documentation**: Comprehensive guides and tutorials
- 🎥 **Video Tutorials**: Step-by-step walkthroughs
- 💬 **Support**: Our team is here to help
- 🌟 **Community**: Join the discussion in our user forum

## We Want Your Feedback
Your input drives our innovation. Share your experience and suggestions:
- Email us at feedback@company.com
- Join our user feedback sessions
- Rate the feature in your dashboard

## Coming Soon
This is just the beginning! We're already working on exciting enhancements based on early user feedback.

## Stay Connected
Follow us for the latest updates and feature announcements.

---
*Thank you for being part of our journey. Together, we're building something amazing!*`

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
              <div className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Generating Content...
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