import OpenAI from 'openai'
import Anthropic from '@anthropic-ai/sdk'
import { WorkItemType, AIGenerationOptions } from '../types'

export type AIProvider = 'openai' | 'anthropic' | 'devs-ai'

interface AIServiceConfig {
  openaiApiKey?: string
  anthropicApiKey?: string
  defaultProvider: AIProvider
}

export class AIService {
  private openai?: OpenAI
  private anthropic?: Anthropic
  private config: AIServiceConfig

  constructor(config: AIServiceConfig) {
    this.config = config

    if (config.openaiApiKey) {
      this.openai = new OpenAI({
        apiKey: config.openaiApiKey,
      })
    }

    if (config.anthropicApiKey) {
      this.anthropic = new Anthropic({
        apiKey: config.anthropicApiKey,
      })
    }
  }

  async generateContent(
    type: WorkItemType,
    description: string,
    options: AIGenerationOptions = {}
  ): Promise<{ content: string; provider: AIProvider; model: string }> {
    const provider = options.model || this.config.defaultProvider
    const prompt = this.buildPrompt(type, description)

    console.log(`[AI-DEBUG] ${new Date().toISOString()} - generateContent called`, {
      type,
      provider,
      options,
      promptLength: prompt.length
    })

    try {
      if (provider === 'devs-ai') {
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Using DevS.ai provider`)
        return await this.generateWithDevsAI(prompt, options)
      } else if (provider === 'openai' && this.openai) {
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Using OpenAI provider`)
        return await this.generateWithOpenAI(prompt, options)
      } else if (provider === 'anthropic' && this.anthropic) {
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Using Anthropic provider`)
        return await this.generateWithAnthropic(prompt, options)
      } else {
        // Fallback to the other provider if the requested one isn't available
        if (provider === 'openai' && this.anthropic) {
          console.log(`[AI-DEBUG] ${new Date().toISOString()} - OpenAI requested but not available, falling back to Anthropic`)
          return await this.generateWithAnthropic(prompt, options)
        } else if (provider === 'anthropic' && this.openai) {
          console.log(`[AI-DEBUG] ${new Date().toISOString()} - Anthropic requested but not available, falling back to OpenAI`)
          return await this.generateWithOpenAI(prompt, options)
        } else {
          console.error(`[AI-DEBUG] ${new Date().toISOString()} - No AI providers configured`)
          throw new Error('No AI providers configured')
        }
      }
    } catch (error) {
      console.error(`[AI-DEBUG] ${new Date().toISOString()} - Error with ${provider}:`, error)
      
      // Try fallback provider (but not devs-ai as it's client-side only)
      if (provider !== 'devs-ai') {
        const fallbackProvider = provider === 'openai' ? 'anthropic' : 'openai'
        console.log(`[AI-DEBUG] ${new Date().toISOString()} - Attempting fallback to ${fallbackProvider}`)
        if (fallbackProvider === 'anthropic' && this.anthropic) {
          return await this.generateWithAnthropic(prompt, options)
        } else if (fallbackProvider === 'openai' && this.openai) {
          return await this.generateWithOpenAI(prompt, options)
        }
      }
      
      throw error
    }
  }

  private async generateWithOpenAI(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<{ content: string; provider: AIProvider; model: string }> {
    if (!this.openai) throw new Error('OpenAI not configured')

    const model = 'gpt-4o' // Latest GPT-4 model
    console.log(`[AI-DEBUG] ${new Date().toISOString()} - generateWithOpenAI starting`, {
      model,
      maxTokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7
    })

    const response = await this.openai.chat.completions.create({
      model,
      messages: [
        {
          role: 'system',
          content: 'You are an expert product manager and technical writer who creates professional, detailed Jira work items. Generate comprehensive, well-structured content that follows industry best practices.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
    })

    const content = response.choices[0]?.message?.content
    if (!content) throw new Error('No content generated from OpenAI')

    console.log(`[AI-DEBUG] ${new Date().toISOString()} - generateWithOpenAI completed`, {
      model,
      contentLength: content.length,
      usage: response.usage
    })

    return {
      content,
      provider: 'openai',
      model
    }
  }

  private async generateWithAnthropic(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<{ content: string; provider: AIProvider; model: string }> {
    if (!this.anthropic) throw new Error('Anthropic not configured')

    const model = 'claude-3-5-sonnet-20241022' // Latest Claude model
    console.log(`[AI-DEBUG] ${new Date().toISOString()} - generateWithAnthropic starting`, {
      model,
      maxTokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7
    })

    const response = await this.anthropic.messages.create({
      model,
      max_tokens: options.maxTokens || 2000,
      temperature: options.temperature || 0.7,
      system: 'You are an expert product manager and technical writer who creates professional, detailed Jira work items. Generate comprehensive, well-structured content that follows industry best practices.',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ]
    })

    const content = response.content[0]
    if (content.type !== 'text') throw new Error('Unexpected response type from Anthropic')

    console.log(`[AI-DEBUG] ${new Date().toISOString()} - generateWithAnthropic completed`, {
      model,
      contentLength: content.text.length,
      usage: response.usage
    })

    return {
      content: content.text,
      provider: 'anthropic',
      model
    }
  }

  private async generateWithDevsAI(
    prompt: string,
    options: AIGenerationOptions
  ): Promise<{ content: string; provider: AIProvider; model: string }> {
    console.log(`[AI-DEBUG] ${new Date().toISOString()} - generateWithDevsAI called - this should not happen on server-side`)
    // DevS.ai is handled on the client-side, so this method should not be called on the server
    // This is a placeholder that will be overridden by client-side logic
    throw new Error('DevS.ai generation must be handled on the client-side')
  }

  private buildPrompt(type: WorkItemType, description: string): string {
    const baseContext = `Create a professional ${type} for a software development team based on this description: "${description}"`

    switch (type) {
      case 'initiative':
        return `${baseContext}

Generate a comprehensive initiative that includes:
- Clear title and overview
- Business objectives and value proposition
- Success metrics and KPIs
- Timeline with quarterly milestones
- Dependencies and requirements
- Risk assessment and mitigation strategies
- Resource requirements

Format the output in Markdown with clear sections and bullet points. Make it strategic, business-focused, and spanning multiple quarters.`

      case 'epic':
        return `${baseContext}

Generate a detailed epic that includes:
- Clear title and description
- User value and business impact
- Technical approach and architecture considerations
- Acceptance criteria (checkbox format)
- Story point estimate (use Fibonacci: 1,2,3,5,8,13,21,34)
- List of constituent user stories
- Definition of done
- Dependencies and assumptions

Format the output in Markdown with clear sections. Make it feature-focused and spanning multiple sprints.`

      case 'story':
        return `${baseContext}

Generate a comprehensive user story that includes:
- User story in "As a [user], I want [goal] so that [benefit]" format
- Detailed acceptance criteria in Given/When/Then format (at least 3 scenarios)
- Technical implementation notes
- Story point estimate (use Fibonacci: 1,2,3,5,8,13)
- Definition of done checklist
- Edge cases and error handling considerations

Format the output in Markdown with clear sections. Follow INVEST principles (Independent, Negotiable, Valuable, Estimable, Small, Testable).`

      default:
        return `${baseContext}

Generate a well-structured ${type} with appropriate sections and professional formatting.`
    }
  }

  getAvailableProviders(): AIProvider[] {
    const providers: AIProvider[] = []
    if (this.openai) providers.push('openai')
    if (this.anthropic) providers.push('anthropic')
    return providers
  }

  isConfigured(): boolean {
    return this.getAvailableProviders().length > 0
  }
}

// Singleton instance
let aiServiceInstance: AIService | null = null

export function getAIService(): AIService {
  if (aiServiceInstance) {
    return aiServiceInstance
  }

  let openaiApiKey = process.env.OPENAI_API_KEY
  let anthropicApiKey = process.env.ANTHROPIC_API_KEY

  // If on the client-side, try to load from localStorage
  if (typeof window !== 'undefined') {
    const savedOpenAI = localStorage.getItem('openai-connection')
    if (savedOpenAI) {
      try {
        openaiApiKey = JSON.parse(savedOpenAI).apiKey
      } catch (e) {
        console.error('Failed to parse openai-connection from localStorage', e)
      }
    }

    const savedAnthropic = localStorage.getItem('anthropic-connection')
    if (savedAnthropic) {
      try {
        anthropicApiKey = JSON.parse(savedAnthropic).apiKey
      } catch (e) {
        console.error('Failed to parse anthropic-connection from localStorage', e)
      }
    }
  }

  aiServiceInstance = new AIService({
    openaiApiKey,
    anthropicApiKey,
    defaultProvider: openaiApiKey ? 'openai' : 'anthropic'
  })
  
  return aiServiceInstance
} 