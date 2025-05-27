'use client'

import React, { useState } from 'react'
import { WorkItemType, ContentType } from '../types'
import { WorkTypeFormatConfig } from './work-type-format-config'
import { templateService, type WorkItemTemplate } from '../lib/template-service'
import { contentInstructionService } from '../lib/content-instruction-service'

interface TemplateConfigurationProps {
  onTemplateSaved: (template: WorkItemTemplate) => void
  onCancel: () => void
}

type ConfigSection = 'work-items' | 'content-generation'
type ContentTemplateType = 'quarterly-presentation' | 'customer-webinar' | 'feature-newsletter'

export function TemplateConfiguration({ onTemplateSaved, onCancel }: TemplateConfigurationProps) {
  const [activeSection, setActiveSection] = useState<ConfigSection>('work-items')
  const [selectedWorkItemType, setSelectedWorkItemType] = useState<WorkItemType>('epic')
  const [selectedContentType, setSelectedContentType] = useState<ContentTemplateType>('quarterly-presentation')
  const [editingContentInstructions, setEditingContentInstructions] = useState<ContentTemplateType | null>(null)
  const [contentInstructions, setContentInstructions] = useState('')

  const handleEditContentInstructions = (contentType: ContentTemplateType) => {
    const instructions = contentInstructionService.getActiveInstructions(contentType)
    setContentInstructions(instructions)
    setEditingContentInstructions(contentType)
  }

  const handleSaveContentInstructions = () => {
    if (editingContentInstructions) {
      const template = contentInstructionService.getTemplate(editingContentInstructions)
      const updatedTemplate = {
        ...template,
        userInstructions: contentInstructions,
        isCustomized: true
      }
      contentInstructionService.saveTemplate(updatedTemplate)
      setEditingContentInstructions(null)
      setContentInstructions('')
    }
  }

  const handleResetContentInstructions = () => {
    if (editingContentInstructions) {
      contentInstructionService.resetToDefault(editingContentInstructions)
      const defaultInstructions = contentInstructionService.getActiveInstructions(editingContentInstructions)
      setContentInstructions(defaultInstructions)
    }
  }

  const contentTemplates = [
    {
      type: 'quarterly-presentation' as ContentTemplateType,
      title: 'Quarterly Presentation',
      description: 'Executive slide deck for quarterly business reviews',
      icon: '📊',
      phase: 'Planning Phase'
    },
    {
      type: 'customer-webinar' as ContentTemplateType,
      title: 'Customer Webinar',
      description: 'Customer-facing presentation content',
      icon: '🎯',
      phase: 'Planning Phase'
    },
    {
      type: 'feature-newsletter' as ContentTemplateType,
      title: 'Feature Newsletter',
      description: 'Newsletter content for feature announcement',
      icon: '📰',
      phase: 'Post-Completion'
    }
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Configure Templates</h2>
        <p className="text-gray-600 mb-6">
          Customize AI instructions and templates for work item creation and content generation.
        </p>

        {/* Section Selector */}
        <div className="flex space-x-4">
          <button
            onClick={() => setActiveSection('work-items')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeSection === 'work-items'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Work Item Templates
          </button>
          <button
            onClick={() => setActiveSection('content-generation')}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeSection === 'content-generation'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Content Generation Templates
          </button>
        </div>
      </div>

      {/* Work Item Templates Section */}
      {activeSection === 'work-items' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Work Item Templates</h3>
            <p className="text-gray-600 mb-6">
              Configure fields and AI prompts for creating different types of Jira work items.
            </p>
            
            <div className="flex space-x-4 mb-6">
              {(['epic', 'story', 'initiative'] as WorkItemType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedWorkItemType(type)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    selectedWorkItemType === type
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <WorkTypeFormatConfig
            workItemType={selectedWorkItemType}
            template={templateService.getDefaultTemplate(selectedWorkItemType)}
            onSave={onTemplateSaved}
            onCancel={onCancel}
          />
        </div>
      )}

      {/* Content Generation Templates Section */}
      {activeSection === 'content-generation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">Content Generation Templates</h3>
            <p className="text-gray-600 mb-6">
              Configure AI instructions for generating different types of presentation and marketing content.
            </p>

            {/* Content Template Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contentTemplates.map((template) => {
                const templateData = contentInstructionService.getTemplate(template.type)
                const isCustomized = templateData.isCustomized
                
                return (
                  <div key={template.type} className="border border-gray-200 rounded-lg p-6 hover:border-blue-300 hover:shadow-md transition-all duration-200">
                    <div className="text-3xl mb-4">{template.icon}</div>
                    <h4 className="font-semibold text-gray-900 mb-2">{template.title}</h4>
                    <p className="text-gray-600 text-sm mb-3">{template.description}</p>
                    <div className="flex items-center justify-between mb-4">
                      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {template.phase}
                      </span>
                      {isCustomized && (
                        <span className="inline-block px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                          Customized
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleEditContentInstructions(template.type)}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Edit Instructions
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Content Instructions Editor Modal */}
          {editingContentInstructions && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
              <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">
                        Edit {contentTemplates.find(t => t.type === editingContentInstructions)?.title} Instructions
                      </h3>
                      <p className="text-gray-600 mt-1">
                        Customize the AI instructions for generating this type of content.
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingContentInstructions(null)}
                      className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>

                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        AI Instructions
                      </label>
                      <textarea
                        value={contentInstructions}
                        onChange={(e) => setContentInstructions(e.target.value)}
                        className="w-full h-64 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                        placeholder="Enter AI instructions for content generation..."
                      />
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-medium text-blue-900 mb-2">💡 Tips for Writing Instructions</h4>
                      <ul className="text-sm text-blue-800 space-y-1">
                        <li>• Be specific about the desired format and structure</li>
                        <li>• Include examples of the tone and style you want</li>
                        <li>• Specify what information should be included or excluded</li>
                        <li>• Use placeholders like {`{workItem.summary}`} to reference work item data</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="p-6 border-t border-gray-200 flex justify-between">
                  <button
                    onClick={handleResetContentInstructions}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors font-medium"
                  >
                    Reset to Default
                  </button>
                  <div className="flex space-x-3">
                    <button
                      onClick={() => setEditingContentInstructions(null)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveContentInstructions}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      Save Instructions
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
} 