'use client'

import React from 'react'
import { JiraWorkItem } from '../types'

interface WorkItemCardProps {
  workItem: JiraWorkItem
  isSelected: boolean
  onClick: () => void
}

export function WorkItemCard({ workItem, isSelected, onClick }: WorkItemCardProps) {
  const truncateText = (text: string, maxLength: number) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  // Function to extract plain text from ADF for truncation
  const extractTextFromADF = (description: any): string => {
    if (!description) return 'No description available'
    
    // If it's already a string, return it
    if (typeof description === 'string') {
      return description
    }
    
    // If it's ADF, extract text content
    if (description.content && Array.isArray(description.content)) {
      const extractText = (node: any): string => {
        if (!node) return ''
        
        if (node.type === 'text') {
          return node.text || ''
        }
        
        if (node.content && Array.isArray(node.content)) {
          return node.content.map(extractText).join('')
        }
        
        return ''
      }
      
      return description.content.map(extractText).join(' ').trim()
    }
    
    return 'No description available'
  }

  // Function to render formatted description for work item cards (truncated)
  const renderWorkItemDescription = (description: any, maxLength: number = 180): React.ReactElement => {
    if (!description) {
      return <span className="text-gray-500 italic">No description available</span>
    }

    // If it's a string, format it with basic line breaks and truncate
    if (typeof description === 'string') {
      const truncated = truncateText(description, maxLength)
      return <span>{truncated}</span>
    }

    // If it's ADF, render a simplified version for the card
    if (description.content && Array.isArray(description.content)) {
      const renderSimpleADF = (node: any, key: string): React.ReactNode => {
        switch (node.type) {
          case 'paragraph':
            return (
              <span key={key} className="block mb-1 last:mb-0">
                {node.content ? node.content.map((child: any, childIndex: number) => 
                  renderSimpleADF(child, `${key}-${childIndex}`)
                ).filter(Boolean) : ''}
              </span>
            )
          
          case 'text':
            let textElement: React.ReactNode = node.text || ''
            
            // Apply basic formatting
            if (node.marks) {
              node.marks.forEach((mark: any) => {
                switch (mark.type) {
                  case 'strong':
                    textElement = <strong key={key} className="font-semibold">{textElement}</strong>
                    break
                  case 'em':
                    textElement = <em key={key} className="italic">{textElement}</em>
                    break
                  case 'code':
                    textElement = <code key={key} className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{textElement}</code>
                    break
                }
              })
            }
            
            return textElement
          
          case 'bulletList':
          case 'orderedList':
            // For lists in cards, just show the first few items
            const listItems = node.content ? node.content.slice(0, 2) : []
            return (
              <div key={key} className="ml-2 my-1">
                {listItems.map((item: any, itemIndex: number) => (
                  <div key={`${key}-${itemIndex}`} className="flex items-start">
                    <span className="text-gray-400 mr-1 text-xs">•</span>
                    <span className="text-sm">
                      {item.content ? item.content.map((child: any, childIndex: number) => 
                        renderSimpleADF(child, `${key}-${itemIndex}-${childIndex}`)
                      ).filter(Boolean) : ''}
                    </span>
                  </div>
                ))}
                {node.content && node.content.length > 2 && (
                  <div className="text-gray-500 text-xs ml-3">...and {node.content.length - 2} more</div>
                )}
              </div>
            )
          
          case 'listItem':
            return (
              <span key={key}>
                {node.content ? node.content.map((child: any, childIndex: number) => 
                  renderSimpleADF(child, `${key}-${childIndex}`)
                ).filter(Boolean) : ''}
              </span>
            )
          
          case 'heading':
            return (
              <span key={key} className="font-semibold text-gray-900 block mb-1">
                {node.content ? node.content.map((child: any, childIndex: number) => 
                  renderSimpleADF(child, `${key}-${childIndex}`)
                ).filter(Boolean) : ''}
              </span>
            )
          
          case 'hardBreak':
            return <br key={key} />
          
          default:
            if (node.content) {
              return (
                <span key={key}>
                  {node.content.map((child: any, childIndex: number) => 
                    renderSimpleADF(child, `${key}-${childIndex}`)
                  ).filter(Boolean)}
                </span>
              )
            }
            return node.text ? <span key={key}>{node.text}</span> : null
        }
      }

      const renderedContent = description.content.map((node: any, index: number) => 
        renderSimpleADF(node, index.toString())
      ).filter(Boolean)

      // Convert to string to check length and truncate if needed
      const textContent = extractTextFromADF(description)
      const shouldTruncate = textContent.length > maxLength

      return (
        <div className="space-y-1">
          {renderedContent}
          {shouldTruncate && <span className="text-gray-400">...</span>}
        </div>
      )
    }

    return <span className="text-gray-500 italic">Description format not supported</span>
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'done':
        return 'bg-green-100 text-green-800';
      case 'in progress':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 border rounded-lg text-left transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex flex-col space-y-3">
        {/* Header with key and status */}
        <div className="flex items-center flex-wrap gap-2">
          <span className="font-mono text-sm font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
            {workItem.key}
          </span>
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${getStatusColor(workItem.status)}`}>
            {workItem.status}
          </span>
          <span className="text-xs font-medium px-2 py-1 bg-purple-50 text-purple-700 rounded-full">
            {workItem.issueType}
          </span>
        </div>

        {/* Title */}
        <h3 className="font-medium text-gray-900 text-base leading-snug">
          {workItem.summary}
        </h3>

        {/* Description - Now properly formatted */}
        {workItem.description && (
          <div className="text-gray-600 text-sm leading-relaxed">
            {renderWorkItemDescription(workItem.description, 180)}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500 mt-3">
        <div className="flex items-center space-x-4">
          <span>Project: {workItem.project}</span>
          {workItem.fixVersions && workItem.fixVersions.length > 0 && (
            <span>Versions: {workItem.fixVersions.join(', ')}</span>
          )}
        </div>
        
        {workItem.labels && workItem.labels.length > 0 && (
          <div className="flex items-center space-x-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span>{workItem.labels.slice(0, 2).join(', ')}</span>
            {workItem.labels.length > 2 && <span>+{workItem.labels.length - 2}</span>}
          </div>
        )}
      </div>

      {isSelected && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <div className="flex items-center text-blue-600 text-sm">
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Selected for content generation
          </div>
        </div>
      )}
    </button>
  )
} 