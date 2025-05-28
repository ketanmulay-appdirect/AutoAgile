import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, contentType, workItem, useDevsAI, apiToken } = await request.json()

    if (!prompt || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt and contentType' },
        { status: 400 }
      )
    }

    // If DevS.ai is requested and API token is provided, use real AI
    if (useDevsAI && apiToken) {
      try {
        // Use DevS.ai API through the proxy
        const devsAIResponse = await fetch(`${process.env.NODE_ENV === 'development' ? 'http://localhost:3001' : ''}/api/devs-ai-proxy`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            apiToken,
            requestBody: {
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert product manager and technical writer who creates professional, detailed content for business communications. Generate comprehensive, well-structured content that follows industry best practices.'
                },
                {
                  role: 'user',
                  content: prompt
                }
              ],
              model: 'gpt-4',
              stream: false
            }
          })
        })

        if (devsAIResponse.ok) {
          const devsAIData = await devsAIResponse.json()
          const aiContent = devsAIData.choices?.[0]?.message?.content || 'No content generated'
          
          return NextResponse.json({
            success: true,
            content: aiContent,
            metadata: {
              model: 'devs-ai-gpt-4',
              tokensUsed: devsAIData.usage?.total_tokens || 0,
              generatedAt: new Date().toISOString()
            }
          })
        } else {
          console.error('DevS.ai API error:', await devsAIResponse.text())
          // Fall back to mock content if DevS.ai fails
        }
      } catch (error) {
        console.error('DevS.ai integration error:', error)
        // Fall back to mock content if DevS.ai fails
      }
    }
    
    // Simulate API delay for mock content
    await new Promise(resolve => setTimeout(resolve, 1500))

    // Mock content generation based on content type
    const mockContent = generateMockContent(contentType, workItem)

    return NextResponse.json({
      success: true,
      content: mockContent,
      metadata: {
        model: 'mock-ai',
        tokensUsed: 150,
        generatedAt: new Date().toISOString()
      }
    })

  } catch (error) {
    console.error('Content generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    )
  }
}

function generateMockContent(contentType: string, workItem: unknown): string {
  // Extract work item details
  const workItemKey = typeof workItem === 'string' ? workItem : (workItem as any)?.key || 'Unknown'
  const workItemSummary = typeof workItem === 'object' ? (workItem as any)?.summary || 'Unknown Feature' : 'Unknown Feature'
  const workItemDescription = typeof workItem === 'object' ? (workItem as any)?.description || 'No description available' : 'No description available'
  const workItemProject = typeof workItem === 'object' ? (workItem as any)?.project || 'Unknown Project' : 'Unknown Project'
  const workItemType = typeof workItem === 'object' ? (workItem as any)?.issueType || 'Unknown Type' : 'Unknown Type'
  
  // Helper function to extract text from Jira ADF (Atlassian Document Format)
  const extractTextFromDescription = (description: unknown): string => {
    if (typeof description === 'string') {
      return description
    }
    
    if (description && typeof description === 'object' && (description as any).content) {
      const extractText = (node: any): string => {
        if (node.text) {
          return node.text
        }
        if (node.content && Array.isArray(node.content)) {
          return node.content.map(extractText).join(' ')
        }
        return ''
      }
      
      return (description as any).content.map(extractText).join('\n').trim()
    }
    
    return 'No description available'
  }
  
  // Helper function to extract Problem Description and Solution Description sections
  const extractProblemAndSolution = (description: unknown): { problemDescription: string; solutionDescription: string } => {
    const fullText = extractTextFromDescription(description)
    
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
      problemDescription: problemDescription || 'Current operational challenges require strategic intervention to optimize business processes and enhance customer satisfaction.',
      solutionDescription: solutionDescription || 'Implementation of advanced capabilities will streamline workflows, reduce operational overhead, and deliver measurable improvements in user experience and business outcomes.'
    }
  }
  
  const { problemDescription, solutionDescription } = extractProblemAndSolution(workItemDescription)
  
  switch (contentType) {
    case 'quarterly-presentation':
      return `# ${workItemSummary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()}

## Executive Summary

This initiative represents a critical advancement in our platform capabilities, directly addressing key customer pain points while positioning us for sustained competitive advantage. The implementation will deliver immediate operational benefits and establish the foundation for future innovation.

## Strategic Context

Market dynamics and customer feedback have highlighted the urgent need for enhanced functionality in this domain. Our analysis indicates that addressing these requirements will significantly improve user satisfaction scores and reduce support overhead by an estimated 35-40%.

## Business Impact

**Revenue Implications**
- Projected 15-20% improvement in customer retention rates
- Estimated $2.3M annual cost savings through operational efficiency gains
- Enhanced upselling opportunities through improved feature adoption

**Operational Benefits**
- Streamlined workflows reducing manual intervention by 60%
- Improved system reliability and performance metrics
- Enhanced data visibility and actionable insights for stakeholders

## Technical Approach

${solutionDescription.replace(/\\n/g, ' ').trim()}

The solution architecture leverages industry best practices and proven technologies to ensure scalability, maintainability, and optimal performance. Integration points have been carefully designed to minimize disruption to existing workflows while maximizing the value delivered to end users.

## Success Metrics & KPIs

- User adoption rate: Target 75% within 30 days of release
- Customer satisfaction improvement: +25 points on NPS scale
- System performance: <200ms response time for core operations
- Support ticket reduction: 40% decrease in related inquiries

## Risk Mitigation

Comprehensive testing protocols and phased rollout strategies will ensure minimal business disruption. Rollback procedures and monitoring systems are in place to address any unforeseen issues promptly.

## Timeline & Next Steps

Development is progressing according to schedule with key milestones aligned to business priorities. Regular stakeholder updates and feedback loops ensure continuous alignment with strategic objectives.`

    case 'customer-webinar':
      return `# Introducing Our Latest Innovation: ${workItemSummary}

## Welcome & Agenda
Thank you for joining us today! We're excited to showcase how **${workItemSummary}** (${workItemKey}) will transform your daily workflows and drive better business outcomes.

**Today's Agenda:**
- The challenge we're solving
- Feature demonstration
- Customer success stories
- Implementation guidance
- Q&A session

## The Challenge
${problemDescription}

Based on extensive customer feedback, we identified key pain points in your current workflows that this feature addresses.

## Solution Overview
**${workItemSummary}** addresses these challenges through:
- **Automated Workflows**: Reduce manual effort by up to 50%
- **Real-time Analytics**: Instant insights into performance
- **Enhanced Collaboration**: Seamless team coordination
- **Unified Experience**: Consistent interface across all touchpoints

## Live Demonstration
Let's explore the key features that make this solution powerful:

### Core Capabilities
- Intuitive dashboard with customizable widgets
- One-click automation for routine tasks
- Advanced filtering and search functionality
- Mobile-responsive design for on-the-go access

### Advanced Features
- AI-powered recommendations
- Predictive analytics and forecasting
- Custom reporting and data export
- Enterprise-grade security and compliance

## Customer Success Story
*"Since implementing this solution, our team has seen a 40% reduction in processing time and significantly improved accuracy in our reporting. It's been a game-changer for our operations."*
— Sarah Johnson, Operations Manager at TechCorp

## Getting Started
Ready to transform your workflows? Here's how to begin:

1. **Access**: Feature available in your dashboard starting next week
2. **Setup**: Follow our guided onboarding process
3. **Training**: Join our live training sessions
4. **Support**: Dedicated support team ready to assist

## Implementation Best Practices
- Start with a pilot group for initial rollout
- Leverage our training resources and documentation
- Establish success metrics and monitoring
- Gather feedback for continuous improvement

## What's Coming Next
This is just the beginning of our innovation journey:
- Enhanced mobile capabilities
- Additional integration options
- Advanced AI features
- Expanded customization options

## Q&A Session
We'd love to hear your questions and discuss how this solution can benefit your specific use case.

## Thank You
Thank you for your time today. We're excited to partner with you on this journey and look forward to seeing the positive impact on your business.

---
*Generated on ${new Date().toISOString()} for customer webinar presentation*`

    case 'feature-newsletter':
      // Extract a clean title from the work item summary
      const cleanTitle = workItemSummary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()
      const shortTitle = cleanTitle.length > 60 ? cleanTitle.substring(0, 57) + '...' : cleanTitle
      
      return `${shortTitle}

${problemDescription.length > 0 ? 
  problemDescription.replace(/\\n/g, ' ').trim() :
  `Current market demands require enhanced platform capabilities to address evolving customer needs and competitive pressures. Users have consistently requested improved functionality that streamlines their daily workflows and reduces operational complexity. This gap in our offering has created friction points that impact user satisfaction and limit our ability to capture additional market share.`
}

${solutionDescription.length > 0 ? 
  solutionDescription.replace(/\\n/g, ' ').trim() :
  `Our engineering team has developed an innovative solution that leverages cutting-edge technology to deliver seamless user experiences. The implementation introduces intelligent automation, enhanced data processing capabilities, and intuitive interface improvements that significantly reduce time-to-value for our customers. This advancement positions us as the industry leader in providing comprehensive, user-centric solutions that drive measurable business outcomes.`
}`

    case 'technical-documentation':
      return `# ${workItemSummary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()} - Technical Specification

## Overview

This document outlines the technical implementation details, architecture decisions, and integration requirements for the proposed solution. The design prioritizes scalability, maintainability, and optimal performance while adhering to established security and compliance standards.

## Problem Statement

${problemDescription.replace(/\\n/g, ' ').trim()}

## Solution Architecture

${solutionDescription.replace(/\\n/g, ' ').trim()}

### Core Components

**Data Layer**
- Optimized database schemas with appropriate indexing strategies
- Caching mechanisms for frequently accessed data
- Data validation and integrity constraints

**Business Logic Layer**
- Modular service architecture enabling independent scaling
- Comprehensive error handling and logging
- Asynchronous processing for resource-intensive operations

**Presentation Layer**
- Responsive user interface with accessibility compliance
- Real-time updates through WebSocket connections
- Progressive enhancement for optimal performance

### Integration Points

The solution integrates seamlessly with existing systems through well-defined APIs and standardized data formats. Authentication and authorization mechanisms ensure secure access while maintaining user experience quality.

### Performance Considerations

- Load balancing strategies for high availability
- Database optimization and query performance tuning
- CDN implementation for static asset delivery
- Monitoring and alerting for proactive issue resolution

## Implementation Timeline

Development follows agile methodologies with iterative delivery cycles. Each sprint delivers functional increments that can be independently tested and validated by stakeholders.

## Testing Strategy

Comprehensive testing protocols include unit tests, integration tests, and end-to-end validation scenarios. Performance testing ensures the solution meets specified SLA requirements under various load conditions.`

    case 'stakeholder-update':
      return `# Project Update: ${workItemSummary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()}

## Current Status: On Track

Development is progressing according to plan with all major milestones achieved on schedule. The team has successfully completed the initial design phase and is now focused on core implementation activities.

## Key Accomplishments

**Technical Progress**
- Architecture design finalized and approved by technical review board
- Core infrastructure components deployed to development environment
- Initial integration testing completed with positive results

**Business Alignment**
- Stakeholder requirements validated through user research sessions
- Success metrics defined and measurement frameworks established
- Risk assessment completed with mitigation strategies in place

## Current Focus Areas

${solutionDescription.replace(/\\n/g, ' ').trim()}

The development team is prioritizing the most critical user-facing features to ensure early value delivery. Parallel workstreams are addressing infrastructure requirements and integration dependencies.

## Upcoming Milestones

- **Week 1-2**: Core feature implementation and unit testing
- **Week 3**: Integration testing and performance validation
- **Week 4**: User acceptance testing and feedback incorporation
- **Week 5**: Production deployment preparation and documentation

## Metrics & Performance

Early indicators suggest the solution will exceed initial performance targets. User feedback from prototype demonstrations has been overwhelmingly positive, with particular praise for the intuitive interface design and improved workflow efficiency.

## Resource Requirements

The project remains within approved budget parameters. No additional resources are required at this time, though we continue to monitor capacity requirements as development progresses.

## Risk Management

All identified risks remain within acceptable tolerance levels. Contingency plans are in place for potential integration challenges, and the team maintains regular communication with dependent system owners.

## Next Steps

Focus continues on delivering high-quality, user-centric functionality that addresses core business requirements. Regular stakeholder updates will ensure continued alignment with strategic objectives.`

    default:
      return `# ${workItemSummary.replace(/^\\d{4}Q\\d\\s*-\\s*\\[[^\\]]+\\]\\s*-\\s*/, '').trim()}

## Overview

This initiative addresses critical business requirements through innovative technology solutions that enhance user experience and operational efficiency. The implementation leverages industry best practices to deliver measurable value to stakeholders.

## Business Context

${problemDescription.replace(/\\n/g, ' ').trim()}

## Proposed Solution

${solutionDescription.replace(/\\n/g, ' ').trim()}

## Expected Outcomes

The successful implementation of this solution will result in improved operational metrics, enhanced user satisfaction, and strengthened competitive positioning. Key performance indicators will be monitored to ensure objectives are met and value is delivered as expected.

## Implementation Approach

Development follows proven methodologies with emphasis on quality, security, and maintainability. Regular stakeholder engagement ensures alignment with business priorities throughout the delivery lifecycle.`
  }
} 