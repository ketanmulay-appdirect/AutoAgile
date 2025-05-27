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
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength) + '...'
  }

  const stripHtml = (html: string) => {
    const doc = new DOMParser().parseFromString(html, 'text/html')
    return doc.body.textContent || ''
  }

  const getStatusColor = (status: string) => {
    const lowerStatus = status.toLowerCase()
    if (lowerStatus.includes('done') || lowerStatus.includes('complete')) {
      return 'bg-green-100 text-green-800'
    }
    if (lowerStatus.includes('progress') || lowerStatus.includes('active')) {
      return 'bg-blue-100 text-blue-800'
    }
    if (lowerStatus.includes('todo') || lowerStatus.includes('open')) {
      return 'bg-gray-100 text-gray-800'
    }
    return 'bg-yellow-100 text-yellow-800'
  }

  return (
    <button
      onClick={onClick}
      className={`w-full p-6 border rounded-lg text-left transition-all duration-200 hover:shadow-md ${
        isSelected
          ? 'border-blue-500 bg-blue-50 shadow-md'
          : 'border-gray-200 bg-white hover:border-gray-300'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center space-x-3">
          <span className="font-mono text-sm text-blue-600 bg-blue-100 px-2 py-1 rounded">
            {workItem.key}
          </span>
          <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(workItem.status)}`}>
            {workItem.status}
          </span>
          <span className="px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded-full">
            {workItem.issueType}
          </span>
        </div>
      </div>

      <h3 className="font-semibold text-gray-900 mb-2 text-lg leading-tight">
        {workItem.summary}
      </h3>

      {workItem.description && (
        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          {truncateText(stripHtml(workItem.description), 200)}
        </p>
      )}

      <div className="flex items-center justify-between text-xs text-gray-500">
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