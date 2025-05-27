'use client'

import React, { useState, useEffect } from 'react'
import { WorkItemType, FieldDefinition } from '../types'
import { WorkItemTemplate } from '../lib/template-service'

interface WorkTypeFormatConfigProps {
  workItemType: WorkItemType
  template?: WorkItemTemplate
  onSave: (template: WorkItemTemplate) => void
  onCancel: () => void
}

export function WorkTypeFormatConfig({ 
  workItemType, 
  template, 
  onSave, 
  onCancel 
}: WorkTypeFormatConfigProps) {
  const [templateName, setTemplateName] = useState(template?.name || `${workItemType} Template`)
  const [fields, setFields] = useState<FieldDefinition[]>(template?.fields || [
    { id: 'title', name: 'Title', type: 'text', required: true, description: 'The main title/summary of the work item' },
    { id: 'description', name: 'Description', type: 'textarea', required: true, description: 'Detailed description of the work item' },
    { id: 'priority', name: 'Priority', type: 'select', required: false, description: 'Priority level for the work item' }
  ])
  const [aiPrompt, setAiPrompt] = useState(template?.aiPrompt || '')
  const [showPromptPreview, setShowPromptPreview] = useState(false)
  const [sampleDescription, setSampleDescription] = useState('')

  // Default prompts for each work item type
  const defaultPrompts = {
    initiative: 'Generate a comprehensive initiative based on: {description}. Include business value, success metrics, and high-level scope. Structure the response with clear sections for business justification, expected outcomes, and implementation timeline.',
    epic: 'Generate a detailed epic based on: {description}. Include acceptance criteria and suggest user stories. Focus on the user journey and break down the epic into manageable components with clear dependencies.',
    story: 'Generate a detailed user story based on: {description}. Include specific acceptance criteria and suggest story points. Follow the "As a [user], I want [goal] so that [benefit]" format and provide clear, testable acceptance criteria.'
  }

  // Update AI prompt when work item type changes
  useEffect(() => {
    if (!aiPrompt && !template?.aiPrompt) {
      setAiPrompt(defaultPrompts[workItemType])
    }
  }, [workItemType, aiPrompt, template?.aiPrompt])

  const addField = () => {
    const newField: FieldDefinition = {
      id: `custom_field_${Date.now()}`,
      name: 'New Field',
      type: 'text',
      required: false,
      description: ''
    }
    setFields([...fields, newField])
  }

  const updateField = (index: number, updates: Partial<FieldDefinition>) => {
    const updatedFields = [...fields]
    updatedFields[index] = { ...updatedFields[index], ...updates }
    setFields(updatedFields)
  }

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index))
  }

  const resetToDefault = () => {
    setAiPrompt(defaultPrompts[workItemType])
  }

  const generatePromptPreview = () => {
    if (!sampleDescription.trim()) {
      return aiPrompt
    }
    return aiPrompt.replace('{description}', sampleDescription)
  }

  const handleSave = () => {
    const newTemplate: WorkItemTemplate = {
      id: template?.id || `template_${workItemType}_${Date.now()}`,
      name: templateName,
      workItemType,
      fields,
      aiPrompt: aiPrompt || defaultPrompts[workItemType],
      createdAt: template?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
    onSave(newTemplate)
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">Configure {workItemType.charAt(0).toUpperCase() + workItemType.slice(1)} Format</h2>
        <div className="space-x-2">
          <button 
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Save Template
          </button>
        </div>
      </div>

      <div className="space-y-8">
        {/* Template Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Template Name
          </label>
          <input
            type="text"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Enter template name"
          />
        </div>

        {/* AI Prompt Customization */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">AI Prompt Instructions</h3>
            <div className="flex space-x-2">
              <button
                onClick={resetToDefault}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                Reset to Default
              </button>
              <button
                onClick={() => setShowPromptPreview(!showPromptPreview)}
                className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
              >
                {showPromptPreview ? 'Hide Preview' : 'Show Preview'}
              </button>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Custom AI Prompt
              </label>
              <textarea
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                placeholder={`Enter custom AI prompt for generating ${workItemType}s...`}
                className="w-full h-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
              <p className="mt-2 text-sm text-gray-500">
                Use <code className="bg-gray-100 px-1 rounded">{'{description}'}</code> as a placeholder for the user's input description.
              </p>
            </div>

            {/* Default Prompt Reference */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Default Prompt for {workItemType}:</h4>
              <p className="text-sm text-gray-600 italic">
                {defaultPrompts[workItemType]}
              </p>
            </div>

            {/* Prompt Preview */}
            {showPromptPreview && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-blue-800 mb-3">Prompt Preview</h4>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-blue-700 mb-1">
                    Sample Description (for preview):
                  </label>
                  <input
                    type="text"
                    value={sampleDescription}
                    onChange={(e) => setSampleDescription(e.target.value)}
                    placeholder={`Enter a sample ${workItemType} description...`}
                    className="w-full px-3 py-2 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="bg-white border border-blue-200 rounded-md p-3">
                  <h5 className="text-xs font-medium text-blue-700 mb-2">Generated Prompt:</h5>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap">
                    {generatePromptPreview()}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Field Mappings */}
        <div className="border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold">Field Mappings</h3>
            <button 
              onClick={addField}
              className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
            >
              Add Field
            </button>
          </div>

          <div className="space-y-4">
            {fields.map((field, index) => (
              <div key={field.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field Name
                    </label>
                    <input
                      type="text"
                      value={field.name}
                      onChange={(e) => updateField(index, { name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Field Type
                    </label>
                    <select
                      value={field.type}
                      onChange={(e) => updateField(index, { type: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="textarea">Textarea</option>
                      <option value="select">Select</option>
                      <option value="number">Number</option>
                      <option value="date">Date</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center">
                      <input
                        type="checkbox"
                        checked={field.required}
                        onChange={(e) => updateField(index, { required: e.target.checked })}
                        className="mr-2"
                      />
                      <span className="text-sm text-gray-700">Required</span>
                    </label>
                    <button
                      onClick={() => removeField(index)}
                      className="px-2 py-1 text-xs text-red-600 border border-red-300 rounded hover:bg-red-50 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>

                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={field.description || ''}
                    onChange={(e) => updateField(index, { description: e.target.value })}
                    placeholder="Field description or help text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Template Summary */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-3">Template Summary</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p><strong>Template Name:</strong> {templateName}</p>
              <p><strong>Work Item Type:</strong> {workItemType}</p>
              <p><strong>Total Fields:</strong> {fields.length}</p>
              <p><strong>Required Fields:</strong> {fields.filter(f => f.required).length}</p>
            </div>
            <div>
              <p><strong>Custom AI Prompt:</strong> {aiPrompt ? 'Yes' : 'Using Default'}</p>
              <p><strong>Prompt Length:</strong> {aiPrompt.length} characters</p>
              <p><strong>Uses Placeholder:</strong> {aiPrompt.includes('{description}') ? 'Yes' : 'No'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 