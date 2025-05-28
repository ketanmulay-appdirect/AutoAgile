import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { prompt, contentType, workItem } = await request.json()

    if (!prompt || !contentType) {
      return NextResponse.json(
        { error: 'Missing required fields: prompt and contentType' },
        { status: 400 }
      )
    }

    // Here you would integrate with your AI service (DevS.ai, OpenAI, etc.)
    // For now, we'll return a mock response
    
    // Simulate API delay
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
  const timestamp = new Date().toLocaleString()
  
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
      problemDescription: problemDescription || 'No problem description available',
      solutionDescription: solutionDescription || 'No solution description available'
    }
  }
  
  const { problemDescription, solutionDescription } = extractProblemAndSolution(workItemDescription)
  
  switch (contentType) {
    case 'quarterly-presentation':
      return `# Quarterly Business Review - ${workItemSummary}

## Executive Summary
This quarter's focus on **${workItemSummary}** (${workItemKey}) represents a strategic investment in our platform capabilities, designed to deliver measurable business value and enhanced customer experience.

### Project Context
- **Project**: ${workItemProject}
- **Work Item Type**: ${workItemType}
- **Key**: ${workItemKey}

## Feature Overview
${problemDescription}

## Key Achievements
- ✅ Requirements gathering and stakeholder alignment completed
- ✅ Technical architecture and design finalized
- ✅ Development milestones on track for delivery
- ✅ Quality assurance processes established

## Business Impact Metrics
- **Customer Satisfaction**: Target 85% positive feedback
- **User Adoption**: Projected 60% uptake within 30 days
- **Performance**: 25% improvement in key workflows
- **Revenue Impact**: Estimated positive impact on quarterly revenue

## Technical Highlights
- Scalable architecture supporting future growth
- Enhanced security and compliance measures
- Improved performance and reliability
- Seamless integration with existing systems

## Risk Management
- **Technical Risks**: Mitigated through thorough testing and staged rollout
- **Timeline Risks**: Buffer time allocated for critical path items
- **Resource Risks**: Cross-training and backup resources identified

## Next Quarter Roadmap
- Feature enhancement based on user feedback
- Performance optimization initiatives
- Integration with additional third-party services
- Advanced analytics and reporting capabilities

---
*Generated on ${timestamp} using AI-powered content generation*`

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
*Generated on ${timestamp} for customer webinar presentation*`

    case 'feature-newsletter':
      // Extract a clean title from the work item summary
      const cleanTitle = workItemSummary.replace(/^\d{4}Q\d\s*-\s*\[[^\]]+\]\s*-\s*/, '').trim()
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
      return `# Content Generated for ${workItemSummary}

**Work Item**: ${workItemKey}
**Project**: ${workItemProject}
**Type**: ${workItemType}

## Description
${problemDescription}

This is a placeholder content generated for ${contentType}.

The actual content would be generated based on the specific requirements and AI instructions provided.

Generated on: ${timestamp}`
  }
} 