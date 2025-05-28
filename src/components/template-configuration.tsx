'use client'

import React, { useState, useEffect } from 'react'
import { WorkItemType, ContentType } from '../types'
import { WorkTypeFormatConfig } from './work-type-format-config'
import { templateService, type WorkItemTemplate } from '../lib/template-service'
import { contentInstructionService } from '../lib/content-instruction-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { Icons } from './ui/icons'

interface TemplateConfigurationProps {
  onClose: () => void
}

type ConfigSection = 'work-items' | 'content-generation'
type ContentTemplateType = 'quarterly-presentation' | 'customer-webinar' | 'feature-newsletter'

export function TemplateConfiguration({ onClose }: TemplateConfigurationProps) {
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
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex items-center">
            <Icons.Settings size="lg" className="mr-3" />
            Configure Templates
          </CardTitle>
          <CardDescription>
          Customize AI instructions and templates for work item creation and content generation.
          </CardDescription>
        </CardHeader>
        <CardContent>
        {/* Section Selector */}
        <div className="flex space-x-4">
            <Button
              variant={activeSection === 'work-items' ? 'default' : 'outline'}
            onClick={() => setActiveSection('work-items')}
          >
              <Icons.FileText size="sm" className="mr-2" />
            Work Item Templates
            </Button>
            <Button
              variant={activeSection === 'content-generation' ? 'default' : 'outline'}
            onClick={() => setActiveSection('content-generation')}
          >
              <Icons.FileText size="sm" className="mr-2" />
            Content Generation Templates
            </Button>
        </div>
        </CardContent>
      </Card>

      {/* Work Item Templates Section */}
      {activeSection === 'work-items' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.FileText size="md" className="mr-2" />
                Work Item Templates
              </CardTitle>
              <CardDescription>
              Configure fields and AI prompts for creating different types of Jira work items.
              </CardDescription>
            </CardHeader>
            <CardContent>
            <div className="flex space-x-4 mb-6">
              {(['epic', 'story', 'initiative'] as WorkItemType[]).map((type) => (
                  <Button
                  key={type}
                    variant={selectedWorkItemType === type ? 'default' : 'outline'}
                  onClick={() => setSelectedWorkItemType(type)}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                  </Button>
              ))}
            </div>
            </CardContent>
          </Card>

          <WorkTypeFormatConfig
            workItemType={selectedWorkItemType}
            template={templateService.getDefaultTemplate(selectedWorkItemType)}
            onSave={onClose}
            onCancel={onClose}
          />
        </div>
      )}

      {/* Content Generation Templates Section */}
      {activeSection === 'content-generation' && (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Icons.FileText size="md" className="mr-2" />
                Content Generation Templates
              </CardTitle>
              <CardDescription>
              Configure AI instructions for generating different types of presentation and marketing content.
              </CardDescription>
            </CardHeader>
            <CardContent>
            {/* Content Template Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {contentTemplates.map((template) => {
                const templateData = contentInstructionService.getTemplate(template.type)
                const isCustomized = templateData.isCustomized
                
                return (
                    <Card key={template.type} className="hover:shadow-md transition-all duration-200">
                      <CardHeader>
                        <div className="text-3xl mb-2">{template.icon}</div>
                        <CardTitle className="text-lg">{template.title}</CardTitle>
                        <CardDescription>{template.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                    <div className="flex items-center justify-between mb-4">
                          <Badge variant="secondary">
                        {template.phase}
                          </Badge>
                      {isCustomized && (
                            <Badge variant="success">
                          Customized
                            </Badge>
                      )}
                    </div>
                        <Button
                      onClick={() => handleEditContentInstructions(template.type)}
                          className="w-full"
                          size="sm"
                    >
                          <Icons.Edit size="sm" className="mr-2" />
                      Edit Instructions
                        </Button>
                      </CardContent>
                    </Card>
                )
              })}
            </div>
            </CardContent>
          </Card>

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