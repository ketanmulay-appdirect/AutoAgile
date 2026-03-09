/**
 * Markdown to Jira Wiki Markup Converter
 * Converts markdown content to Jira wiki format for Jira Server/Data Center
 */

export class MarkdownToWikiConverter {
  
  /**
   * Convert markdown text to Jira wiki markup format
   */
  convert(markdown: string): string {
    if (!markdown) return ''
    
    let result = markdown
    
    // Convert headings (### -> h3., ## -> h2., # -> h1.)
    result = result.replace(/^######\s+(.+)$/gm, 'h6. $1')
    result = result.replace(/^#####\s+(.+)$/gm, 'h5. $1')
    result = result.replace(/^####\s+(.+)$/gm, 'h4. $1')
    result = result.replace(/^###\s+(.+)$/gm, 'h3. $1')
    result = result.replace(/^##\s+(.+)$/gm, 'h2. $1')
    result = result.replace(/^#\s+(.+)$/gm, 'h1. $1')
    
    // Convert bold (**text** -> *text*)
    result = result.replace(/\*\*([^*]+)\*\*/g, '*$1*')
    
    // Convert italic (_text_ stays the same, *text* -> _text_)
    // Be careful not to convert already-converted bold
    result = result.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '_$1_')
    
    // Convert inline code (`code` -> {{code}})
    result = result.replace(/`([^`]+)`/g, '{{$1}}')
    
    // Convert code blocks (```lang\ncode\n``` -> {code:lang}\ncode\n{code})
    result = result.replace(/```(\w*)\n([\s\S]*?)```/g, (match, lang, code) => {
      if (lang) {
        return `{code:${lang}}\n${code.trim()}\n{code}`
      }
      return `{code}\n${code.trim()}\n{code}`
    })
    
    // Convert links [text](url) -> [text|url]
    result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '[$1|$2]')
    
    // Convert bullet lists (- item -> * item)
    result = result.replace(/^(\s*)-\s+/gm, (match, spaces) => {
      const level = Math.floor(spaces.length / 2)
      return '*'.repeat(level + 1) + ' '
    })
    
    // Convert numbered lists (1. item -> # item)
    result = result.replace(/^(\s*)\d+\.\s+/gm, (match, spaces) => {
      const level = Math.floor(spaces.length / 2)
      return '#'.repeat(level + 1) + ' '
    })
    
    // Convert horizontal rules (--- or *** -> ----)
    result = result.replace(/^[-*]{3,}$/gm, '----')
    
    // Convert blockquotes (> text -> {quote}text{quote})
    const lines = result.split('\n')
    const processedLines: string[] = []
    let inQuote = false
    
    for (const line of lines) {
      if (line.startsWith('> ')) {
        if (!inQuote) {
          processedLines.push('{quote}')
          inQuote = true
        }
        processedLines.push(line.substring(2))
      } else {
        if (inQuote) {
          processedLines.push('{quote}')
          inQuote = false
        }
        processedLines.push(line)
      }
    }
    
    if (inQuote) {
      processedLines.push('{quote}')
    }
    
    return processedLines.join('\n')
  }
}

// Export a singleton instance
export const markdownToWikiConverter = new MarkdownToWikiConverter()
