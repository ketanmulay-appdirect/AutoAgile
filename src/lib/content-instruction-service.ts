import { AIInstructionTemplate, ContentType } from '../types'

const DEFAULT_INSTRUCTIONS = {
  'quarterly-presentation': `Create compelling slide deck content for a quarterly business presentation. Focus on:
- Executive summary of the feature/epic
- Business value and impact metrics
- Key milestones and deliverables
- Success criteria and KPIs
- Timeline and resource allocation
- Risk mitigation strategies
- Next quarter outlook

Format as structured content with clear headings and bullet points suitable for slides.`,

  'customer-webinar': `Generate engaging webinar content for customer-facing presentation. Include:
- Feature overview and benefits
- Customer pain points addressed
- Live demo talking points
- Use case scenarios
- Customer success stories (placeholder)
- Q&A preparation points
- Call-to-action items

Create content that is customer-friendly, avoids technical jargon, and focuses on value proposition.`,

  'feature-newsletter': `You are writing newsletter content for a feature announcement. You must follow this EXACT format with NO headings, NO markdown formatting, and NO numbered lists:

REQUIRED OUTPUT FORMAT:
[Feature Title - max 12 words]

[The Why paragraph - up to 150 words (80 recommended) describing the problem/limitation being addressed. Use professional, user-friendly tone appropriate for enterprise SaaS audience. Focus on business pain or user friction this solves.]

[The How paragraph - up to 150 words (80 recommended) explaining how the feature solves the problem. Emphasize value/control it gives customers, how it fits into the platform, and outcomes it enables. Stay solution-focused.]

IMPORTANT: 
- Do NOT use any headings like "# Title" or "## The Why" 
- Do NOT use numbered lists like "1. Title:"
- Do NOT use markdown formatting
- Just provide the title followed by two paragraphs
- Keep tone informative yet exciting, suitable for both technical and non-technical audiences
- Use AppDirect-style professional phrasing`
}

class ContentInstructionService {
  private readonly STORAGE_KEY = 'content-instruction-templates'

  getDefaultInstructions(contentType: ContentType): string {
    return DEFAULT_INSTRUCTIONS[contentType]
  }

  getTemplate(contentType: ContentType): AIInstructionTemplate {
    const templates = this.getAllTemplates()
    const existing = templates.find(t => t.contentType === contentType)
    
    if (existing) {
      return existing
    }

    // Return default template
    return {
      id: `default-${contentType}`,
      contentType,
      name: this.getContentTypeName(contentType),
      defaultInstructions: DEFAULT_INSTRUCTIONS[contentType],
      userInstructions: undefined,
      isCustomized: false,
      updatedAt: new Date()
    }
  }

  saveTemplate(template: AIInstructionTemplate): void {
    const templates = this.getAllTemplates()
    const existingIndex = templates.findIndex(t => t.contentType === template.contentType)
    
    const updatedTemplate = {
      ...template,
      updatedAt: new Date(),
      isCustomized: Boolean(template.userInstructions)
    }

    if (existingIndex >= 0) {
      templates[existingIndex] = updatedTemplate
    } else {
      templates.push(updatedTemplate)
    }

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(templates))
  }

  resetToDefault(contentType: ContentType): AIInstructionTemplate {
    const templates = this.getAllTemplates()
    const filteredTemplates = templates.filter(t => t.contentType !== contentType)
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filteredTemplates))
    
    return this.getTemplate(contentType)
  }

  getAllTemplates(): AIInstructionTemplate[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY)
      if (!stored) return []
      
      const templates = JSON.parse(stored)
      return templates.map((t: AIInstructionTemplate) => ({
        ...t,
        updatedAt: new Date(t.updatedAt)
      }))
    } catch (error) {
      console.error('Failed to load instruction templates:', error)
      return []
    }
  }

  getActiveInstructions(contentType: ContentType): string {
    const template = this.getTemplate(contentType)
    return template.userInstructions || template.defaultInstructions
  }

  private getContentTypeName(contentType: ContentType): string {
    switch (contentType) {
      case 'quarterly-presentation':
        return 'Quarterly Presentation'
      case 'customer-webinar':
        return 'Customer Webinar'
      case 'feature-newsletter':
        return 'Feature Newsletter'
      default:
        return contentType
    }
  }
}

export const contentInstructionService = new ContentInstructionService() 