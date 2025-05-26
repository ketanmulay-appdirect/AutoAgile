import { NextRequest, NextResponse } from 'next/server'
import { GenerateContentRequest, GenerateContentResponse } from '../../../types'
import { getAIService } from '../../../lib/ai-service'

export async function POST(request: NextRequest) {
  try {
    const body: GenerateContentRequest = await request.json()
    const { type, description, context } = body

    // Validate input
    if (!type || !description?.trim()) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Type and description are required' 
        } as GenerateContentResponse,
        { status: 400 }
      )
    }

    const aiService = getAIService()
    const startTime = Date.now()

    // Check if AI is configured, otherwise use mock
    if (!aiService.isConfigured()) {
      console.log('No AI providers configured, using mock content')
      const mockContent = generateMockContent(type, description)
      
      return NextResponse.json({
        success: true,
        content: mockContent,
        metadata: {
          model: 'mock',
          generationTime: Date.now() - startTime
        }
      } as GenerateContentResponse)
    }

    // Use real AI generation
    try {
      const result = await aiService.generateContent(type, description, {
        model: context?.preferredModel as 'openai' | 'anthropic' | undefined,
        temperature: 0.7,
        maxTokens: 2000
      })

      return NextResponse.json({
        success: true,
        content: result.content,
        metadata: {
          model: `${result.provider}:${result.model}`,
          generationTime: Date.now() - startTime
        }
      } as GenerateContentResponse)

    } catch (aiError) {
      console.error('AI generation failed, falling back to mock:', aiError)
      
      // Fallback to mock content if AI fails
      const mockContent = generateMockContent(type, description)
      
      return NextResponse.json({
        success: true,
        content: mockContent,
        metadata: {
          model: 'mock-fallback',
          generationTime: Date.now() - startTime,
          note: 'AI generation failed, using fallback content'
        }
      } as GenerateContentResponse)
    }

  } catch (error) {
    console.error('Error generating content:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: 'Internal server error' 
      } as GenerateContentResponse,
      { status: 500 }
    )
  }
}

function generateMockContent(type: string, description: string): string {
  const baseTitle = description.split('.')[0] || description.substring(0, 50)
  
  switch (type) {
    case 'initiative':
      return `# Initiative: ${baseTitle}

## Overview
${description}

## Business Objectives
- Increase user engagement and retention
- Improve platform scalability and performance
- Enhance user experience across all touchpoints

## Success Metrics
- 25% increase in user engagement
- 40% improvement in system performance
- 90% user satisfaction score

## Timeline
- Q1: Planning and initial development
- Q2: Core feature development
- Q3: Testing and optimization
- Q4: Launch and monitoring

## Dependencies
- Engineering team capacity
- Design system updates
- Infrastructure improvements

## Risks & Mitigation
- **Risk**: Technical complexity
  **Mitigation**: Phased approach with regular checkpoints
- **Risk**: Resource constraints
  **Mitigation**: Prioritize core features first`

    case 'epic':
      return `# Epic: ${baseTitle}

## Description
${description}

## User Value
This epic will enable users to have a more streamlined and efficient experience, reducing friction and improving overall satisfaction with the platform.

## Technical Approach
- Implement modern UI components
- Optimize backend APIs for performance
- Add comprehensive error handling
- Ensure mobile responsiveness

## Acceptance Criteria
- [ ] All user flows are intuitive and accessible
- [ ] Performance meets or exceeds current benchmarks
- [ ] Error states are handled gracefully
- [ ] Mobile experience is optimized

## Story Point Estimate: 21

## Stories Included
1. User interface redesign
2. Backend API optimization
3. Error handling implementation
4. Mobile responsiveness
5. Testing and quality assurance

## Definition of Done
- All acceptance criteria met
- Code reviewed and approved
- Tests written and passing
- Documentation updated
- Deployed to production`

    case 'story':
      return `# User Story: ${baseTitle}

## Story
As a user, I want ${description.toLowerCase()}, so that I can have a better experience with the platform.

## Acceptance Criteria

### Given/When/Then Format:
**Given** I am a logged-in user
**When** I navigate to the relevant section
**Then** I should see the expected functionality working correctly

**Given** I interact with the new feature
**When** I perform the intended action
**Then** The system should respond appropriately and provide feedback

**Given** An error occurs during the process
**When** The system encounters the error
**Then** I should see a clear error message and guidance on next steps

## Technical Notes
- Ensure responsive design for mobile devices
- Implement proper error handling
- Add analytics tracking for user interactions
- Follow accessibility guidelines (WCAG 2.1)

## Story Points: 5

## Definition of Done
- [ ] Feature implemented according to acceptance criteria
- [ ] Unit tests written and passing
- [ ] Integration tests passing
- [ ] Code reviewed and approved
- [ ] Accessibility requirements met
- [ ] Documentation updated
- [ ] QA testing completed
- [ ] Deployed to staging environment`

    default:
      return `# ${type}: ${baseTitle}\n\n${description}\n\nThis is a generated template for a ${type}.`
  }
} 