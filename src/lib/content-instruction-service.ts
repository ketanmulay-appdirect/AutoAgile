import { AIInstructionTemplate, ContentType } from '../types'

const DEFAULT_INSTRUCTIONS = {
  'engineering-highlights': `# Engineering Highlights Writing Pattern - Enhanced Version

You are an expert technical writer tasked with creating concise and impactful engineering highlights based on weekly team accomplishments. Generate a well-structured engineering update summary in a professional and engaging tone. Follow this structure:

## Core Structure

**Headline:** Provide a brief, clear, and catchy title summarizing the achievement. It should quickly communicate the core success, such as feature releases, architectural improvements, or significant project milestones. Limit to a maximum of 15 words.

**Formula Examples:**
- "[System] + [Achievement] + [Impact]"
- "Reducing/Improving [Metric] in [System]"
- "[Team] Delivers [Result] Through [Approach]"

**Context:** Clearly articulate why the work was important, providing relevant technical or business context that led to the initiative. Explain the user pain points, inefficiencies, or gaps in the current system that this work addressed. Help the reader understand the motivation and the journey behind the development.

**Opening Hook Variations:**
- **Problem-driven:** "The [system] previously [problem], causing [impact]..."
- **Scale-driven:** "Processing [volume] monthly, our [system] required..."
- **Urgency-driven:** "With [deadline/requirement] approaching..."
- **Cost-driven:** "Facing $[amount] in [cost type]..."
- **Risk-driven:** "Critical [security/compliance] vulnerabilities in..."

**What was done:** Describe the technical solution implemented or features delivered. Include relevant technologies, frameworks, or design decisions without overwhelming the reader. Strike a balance between depth and clarity. Emphasize how the work was executed, any engineering complexity handled, and how collaboration across contributors made it possible. Highlight who led the delivery of the feature.

**Impact:** Explain the results using quantitative metrics where available. If data isn't available, use qualitative impact on user experience, security, performance, or operational efficiency.

**Required Metrics Types (include at least ONE):**
- **Performance:** "X% faster", "reduced from Y to Z", "now processes in X seconds"
- **Cost:** "$X saved monthly/annually", "X% reduction in infrastructure costs"
- **Efficiency:** "X hours/days eliminated", "X% less manual effort"
- **Reliability:** "X% uptime improvement", "near-zero downtime", "X% error reduction"
- **Scale:** "Now handles X requests/second", "supports X more users"

**Recognition:** Appreciate individuals or teams who played a key role in driving the solution. Use encouraging, positive language to highlight collaboration, innovation, and quality execution.

**Recognition Phrase Rotation (vary for natural flow):**
- "Kudos to [Name] for [specific contribution]..."
- "Special thanks to [Name] and [Name] for their [role]..."
- "Big shoutout to [Team/Name] for driving this..."
- "This success was led by [Name], with excellent support from..."
- "[Name]'s expertise in [area] was instrumental..."
- "Thanks to [Name] for their outstanding [quality]..."

**Next steps or additional notes (optional):** Mention any planned enhancements, learnings applied, or links to supporting documentation, dashboards, or diagrams.

## Length Guidelines

**Target Length:** 200 words (standard highlight)

**Flexible Ranges by Complexity:**
- **Quick Win:** 100-150 words (1-2 paragraphs)
- **Standard Update:** 150-200 words (2 paragraphs)
- **Complex Initiative:** 200-250 words (2-3 paragraphs)
- **Maximum:** 250 words (only for highly complex, multi-team efforts)

**Paragraph Distribution:**
- **Paragraph 1:** Context + Solution (100-130 words)
- **Paragraph 2:** Impact + Recognition (50-100 words)
- **Optional Paragraph 3:** Additional technical details or future implications (50 words)

## Writing Style Requirements

### IMPORTANT - Format Requirements:
- Do NOT use any headings or markdown formatting
- Do not use bullet points or numbered lists
- Do not use bold, italic, or any text styling
- Write in continuous narrative paragraphs only

### Style Guidelines:
- Start with a compelling summary of the achievement
- Use past tense for completed work
- Maintain active voice throughout
- Include specific numbers, percentages, or measurements (never vague terms like "significant")
- Balance technical accuracy with accessibility
- Name specific individuals and their contributions
- Focus on what matters - avoid superficial overviews or excessive technical detail
- Maintain a professional yet engaging tone that resonates with an engineering audience
- Highlight technical decisions and collaboration
- Acknowledge challenges overcome and lessons learned when relevant

## Metric Presentation Standards

### Always Be Specific:
- ❌ "Significantly improved performance"
- ✅ "Improved query performance by 78%, from 3.5 days to 22 hours"

- ❌ "Reduced costs"
- ✅ "Reduced infrastructure costs by $11,000 per month"

- ❌ "Better reliability"
- ✅ "Increased uptime from 95% to 99.9%"

### Include Before/After When Possible:
- "Migration reduced processing time from 6 days to 2 days (67% improvement)"
- "Optimization decreased memory usage from 8GB to 3GB, allowing 2.5x more concurrent processes"

## Sample Templates

### Template 1: Performance Optimization
[Process] Performance Enhancement

The [system] processes [volume] monthly, critical for [business function]. Previously taking [old duration], this caused [negative impact] and delayed [downstream effect]. The team optimized [specific component] through [technical approach], implementing [key technique] and refactoring [system area] to leverage [technology].

These enhancements reduced processing time from [X] to [Y] ([Z]% improvement), with [specific segment] experiencing the most dramatic gains. The optimization involved [technical detail] and [approach detail], ultimately achieving [secondary benefit]. This ensures [business value] and positions us for [future capability]. Special thanks to [Name] for identifying the bottleneck and implementing these impactful optimizations, with support from [Name] on testing and validation.

### Template 2: Migration/Upgrade
[System] Migration Success

We successfully migrated [system] from [old version/platform] to [new version/platform], addressing critical [type] vulnerabilities affecting [scope]. The legacy system running on [old tech] posed [specific risks], particularly concerning [compliance/security/performance] requirements. The team executed a [migration approach] strategy, involving [key step 1], [key step 2], and careful coordination with [stakeholder teams].

The migration delivered immediate value: [primary metric improvement], [secondary benefit], and [tertiary gain]. All [number] vulnerabilities were resolved, and the system now operates with [new capability]. We achieved this with only [X] minutes of downtime during the transition. [Lead name]'s technical leadership was crucial in navigating [specific challenge], while [Supporting names] ensured smooth testing and rollout across all environments.

### Template 3: New Feature/Tool Development
[Feature Name] Streamlines [Process]

To eliminate [inefficiency/gap], we developed [solution name], enabling [primary capability] for [user group]. Teams previously spent [time amount] on [manual process], leading to [problem] and preventing [desired outcome]. Our solution leverages [tech stack] to automate [key function] while providing [additional features].

Since launch, [adoption metric] teams have adopted the tool, collectively saving [time metric] weekly. The platform processes [volume metric] with [performance metric], a [X]% improvement over the manual approach. This has already prevented [error/issue metric] and enabled [new capability]. Thanks to [Developer name] for architecting this elegant solution and [Team members] for their contributions to UI design and testing.

## Quality Checklist

Before finalizing, verify:
- [ ] Headline is under 15 words and action-oriented
- [ ] Opening establishes clear context and importance
- [ ] At least ONE specific metric with numbers included
- [ ] Technical solution explained without excessive jargon
- [ ] Individual contributors named with specific contributions
- [ ] Total word count between 150-250 words
- [ ] No formatting, bullets, or markdown used
- [ ] Recognition phrase varied (not always "Kudos to...")
- [ ] Past tense used consistently for completed work
- [ ] Business value connected to technical achievement

## Closing Guidance

End with a short celebratory line (maximum 15 words) thanking the feature lead and contributors for their efforts. Vary the language to keep it natural and genuine. The recognition should feel earned and specific, not formulaic.

Remember: The goal is to inform stakeholders about engineering achievements while celebrating team success, sharing learnings, and demonstrating continuous value delivery to the organization.`,

  'quarterly-presentation': `You are creating compelling slide deck content for a quarterly business presentation to senior leadership. You must extract and utilize the provided work item data to create content with an answer-first approach that is digestible for executives.

CRITICAL: You must extract and use the following from the work item data:
1. Problem Description - The business problem or limitation being addressed
2. Solution Description - How the feature/epic solves the problem  
3. Business Case - The value proposition and impact (extract from context or infer from problem/solution)

REQUIRED OUTPUT FORMAT:
Create structured content with clear headings and bullet points suitable for slides. Use an answer-first approach - lead with the value and impact, then explain the why and how.

CONTENT STRUCTURE:
# [Clean Feature Title]

## Executive Summary (Answer First)
- Lead with the key business value and impact this delivers
- State the strategic importance and competitive advantage
- Quantify benefits where possible (use realistic estimates if specific metrics aren't provided)

## Strategic Context (The Why)
- Clearly articulate the business problem from the Problem Description
- Explain market pressures, customer needs, or operational challenges
- Connect to broader company objectives and competitive positioning

## Solution Approach (The How)  
- Summarize the Solution Description in business terms
- Focus on capabilities delivered, not technical implementation
- Highlight key differentiators and innovation aspects

## Business Impact & Success Metrics
- Revenue implications and cost savings potential
- Operational efficiency gains and process improvements
- Customer satisfaction and retention benefits
- Risk mitigation and compliance advantages

## Timeline & Resource Allocation
- Key milestones aligned to business priorities
- Resource requirements and dependencies
- Risk mitigation strategies

## Next Quarter Outlook
- Future enhancements and roadmap alignment
- Scaling opportunities and market expansion potential

TONE: Professional, confident, and results-focused. Suitable for C-level executives who need clear, actionable insights.`,

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
- Use AppDirect-style professional phrasing`,

  'technical-documentation': `Create comprehensive technical documentation that extracts and utilizes work item data. Focus on:
- Technical specifications and architecture
- Implementation details and requirements
- Integration points and dependencies
- Testing strategies and acceptance criteria
- Performance considerations and constraints
- Security and compliance requirements

Extract problem and solution descriptions from the work item to provide context for technical decisions.`,

  'stakeholder-update': `Generate stakeholder update content that leverages work item data. Include:
- Project status and progress summary
- Key accomplishments and milestones
- Current focus areas and next steps
- Risk assessment and mitigation strategies
- Resource allocation and timeline updates
- Success metrics and performance indicators

Use the problem and solution descriptions to provide context for project decisions and priorities.`,

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