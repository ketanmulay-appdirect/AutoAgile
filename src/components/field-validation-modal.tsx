'use client'

import React, { useState, useEffect } from 'react'
import { JiraField } from '../lib/jira-field-service'
import { WorkItemTemplate } from '../lib/template-service'
import { GeneratedContent } from '../types'

interface MissingField {
  jiraFieldId: string
  jiraField: JiraField
  templateFieldId?: string
  currentValue?: any
}

interface FieldValidationModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (updatedContent: GeneratedContent, customFields: Record<string, any>) => void
  content: GeneratedContent
  template: WorkItemTemplate | null
  jiraFields: JiraField[]
  missingFields: MissingField[]
  extractedFields?: Record<string, any>
  suggestions?: Record<string, any[]>
  jiraConnection?: any
  workItemType?: string
}

export function FieldValidationModal({
  isOpen,
  onClose,
  onSubmit,
  content,
  template,
  jiraFields,
  missingFields,
  extractedFields = {},
  suggestions = {},
  jiraConnection,
  workItemType
}: FieldValidationModalProps) {
  const [fieldValues, setFieldValues] = useState<Record<string, any>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // Initialize field values when modal opens
  useEffect(() => {
    if (isOpen && missingFields.length > 0) {
      const initialValues: Record<string, any> = {}
      missingFields.forEach(field => {
        let defaultValue = extractedFields[field.jiraFieldId] || field.currentValue || ''
        
        // Auto-fill known fields
        if (field.jiraFieldId === 'issuetype' && workItemType) {
          // Map work item type to Jira issue type
          const issueTypeMap: Record<string, string> = {
            'epic': 'Epic',
            'story': 'Story',
            'initiative': 'Initiative'
          }
          defaultValue = issueTypeMap[workItemType] || workItemType
        } else if (field.jiraFieldId === 'project' && jiraConnection?.projectKey) {
          defaultValue = jiraConnection.projectKey
        } else if (field.jiraFieldId === 'reporter' && jiraConnection?.email) {
          defaultValue = jiraConnection.email
        }
        
        initialValues[field.jiraFieldId] = defaultValue
      })
      setFieldValues(initialValues)
      setValidationErrors({})
    }
  }, [isOpen, missingFields, extractedFields, jiraConnection, workItemType])

  const handleFieldChange = (fieldId: string, value: any) => {
    setFieldValues(prev => ({
      ...prev,
      [fieldId]: value
    }))
    
    // Clear validation error for this field
    if (validationErrors[fieldId]) {
      setValidationErrors(prev => {
        const newErrors = { ...prev }
        delete newErrors[fieldId]
        return newErrors
      })
    }
  }

  const validateFields = (): boolean => {
    const errors: Record<string, string> = {}
    
    missingFields.forEach(field => {
      const value = fieldValues[field.jiraFieldId]
      
      if (field.jiraField.required && (!value || value.toString().trim() === '')) {
        errors[field.jiraFieldId] = `${field.jiraField.name} is required`
      }
      
      // Additional validation based on field type
      if (value && field.jiraField.type === 'number' && isNaN(Number(value))) {
        errors[field.jiraFieldId] = `${field.jiraField.name} must be a valid number`
      }
    })
    
    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async () => {
    if (!validateFields()) {
      return
    }

    setIsSubmitting(true)
    
    try {
      // Create updated content with filled fields
      const updatedContent = { ...content }
      const customFields: Record<string, any> = {}
      
      // Map field values to custom fields, but handle standard fields separately
      missingFields.forEach(field => {
        const value = fieldValues[field.jiraFieldId]
        if (value !== undefined && value !== '') {
          // Standard Jira fields that should not go into customFields
          const standardFields = ['project', 'issuetype', 'summary', 'description', 'reporter', 'assignee', 'priority', 'labels']
          
          if (standardFields.includes(field.jiraFieldId)) {
            // Handle standard fields in the content object
            if (field.jiraFieldId === 'priority') {
              updatedContent.priority = value
            } else if (field.jiraFieldId === 'labels') {
              updatedContent.labels = Array.isArray(value) ? value : [value]
            } else {
              // For project, issuetype, reporter, assignee - put them in customFields so the API can handle them
              customFields[field.jiraFieldId] = value
            }
          } else {
            // Custom fields go into customFields
            // Handle special formatting for known fields
            if (field.jiraFieldId === 'customfield_26360') {
              // Include on Roadmap - ensure it's the right format
              customFields[field.jiraFieldId] = value
            } else if (field.jiraFieldId === 'customfield_26362') {
              // Delivery Quarter - ensure it's the right format
              customFields[field.jiraFieldId] = value
            } else {
              customFields[field.jiraFieldId] = value
            }
          }
        }
      })
      
      // Update content custom fields
      updatedContent.customFields = {
        ...updatedContent.customFields,
        ...customFields
      }
      
      onSubmit(updatedContent, customFields)
    } catch (error) {
      console.error('Error submitting fields:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderFieldInput = (field: MissingField) => {
    const jiraField = field.jiraField
    const value = fieldValues[field.jiraFieldId] || ''
    const error = validationErrors[field.jiraFieldId]
    
    // Handle different field types based on Jira schema
    switch (jiraField.type) {
      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          >
            <option value="">-- Select {jiraField.name} --</option>
            {jiraField.allowedValues?.map((option) => {
              const optionValue = typeof option === 'object' ? (option.value || option.name || option.id || '') : option
              const optionLabel = typeof option === 'object' ? (option.name || option.value || option.id || '') : option
              return (
                <option key={optionValue} value={optionValue}>
                  {optionLabel}
                </option>
              )
            })}
          </select>
        )
      
      case 'multiselect':
        return (
          <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
            {jiraField.allowedValues?.map((option) => {
              const optionValue = typeof option === 'object' ? (option.value || option.name || option.id || '') : option
              const optionLabel = typeof option === 'object' ? (option.name || option.value || option.id || '') : option
              const currentValues = Array.isArray(value) ? value : []
              
              return (
                <label key={optionValue} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={currentValues.includes(optionValue)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handleFieldChange(field.jiraFieldId, [...currentValues, optionValue])
                      } else {
                        handleFieldChange(field.jiraFieldId, currentValues.filter(v => v !== optionValue))
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{optionLabel}</span>
                </label>
              )
            })}
          </div>
        )
      
      case 'checkbox':
        // For simple Yes/No checkboxes, render as radio buttons for better UX
        if (jiraField.allowedValues?.length === 2 && 
            jiraField.allowedValues.includes('Yes') && 
            jiraField.allowedValues.includes('No')) {
          return (
            <div className="flex items-center space-x-4">
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.jiraFieldId}
                  value="Yes"
                  checked={value === 'Yes'}
                  onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">Yes</span>
              </label>
              <label className="flex items-center space-x-2">
                <input
                  type="radio"
                  name={field.jiraFieldId}
                  value="No"
                  checked={value === 'No'}
                  onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
                  className="border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">No</span>
              </label>
            </div>
          )
        }
        
        // For other checkbox fields, render as checkboxes
        return (
          <div className="space-y-2">
                         {jiraField.allowedValues?.map((option) => {
               const optionValue = typeof option === 'object' ? (option.value || option.name || option.id || '') : option
               const optionLabel = typeof option === 'object' ? (option.name || option.value || option.id || '') : option
               
               return (
                 <label key={optionValue} className="flex items-center space-x-2">
                   <input
                     type="checkbox"
                     checked={Array.isArray(value) ? value.includes(optionValue) : value === optionValue}
                     onChange={(e) => {
                       if (e.target.checked) {
                         const currentValues = Array.isArray(value) ? value : []
                         handleFieldChange(field.jiraFieldId, [...currentValues, optionValue])
                       } else {
                         const currentValues = Array.isArray(value) ? value : []
                         handleFieldChange(field.jiraFieldId, currentValues.filter(v => v !== optionValue))
                       }
                     }}
                     className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                   />
                   <span className="text-sm text-gray-700">{optionLabel}</span>
                 </label>
               )
             }) || (
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={value === true || value === 'true' || value === 'Yes'}
                  onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.checked ? 'Yes' : 'No')}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm text-gray-700">{jiraField.name}</span>
              </label>
            )}
          </div>
        )
      
      case 'radio':
        return (
                     <div className="space-y-2">
             {jiraField.allowedValues?.map((option) => {
               const optionValue = typeof option === 'object' ? (option.value || option.name || option.id || '') : option
               const optionLabel = typeof option === 'object' ? (option.name || option.value || option.id || '') : option
               
               return (
                 <label key={optionValue} className="flex items-center space-x-2">
                   <input
                     type="radio"
                     name={field.jiraFieldId}
                     value={optionValue}
                     checked={value === optionValue}
                     onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
                     className="border-gray-300 text-blue-600 focus:ring-blue-500"
                   />
                   <span className="text-sm text-gray-700">{optionLabel}</span>
                 </label>
               )
             })}
           </div>
        )
      
      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
            rows={3}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`Enter ${jiraField.name.toLowerCase()}...`}
          />
        )
      
      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`Enter ${jiraField.name.toLowerCase()}...`}
          />
        )
      
      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          />
        )
      
      case 'user':
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter username or email..."
          />
        )
      
      case 'project':
        return (
          <input
            type="text"
            value={value || jiraConnection?.projectKey || ''}
            onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder="Enter project key..."
          />
        )
      
      case 'issuetype':
        const issueTypeMap: Record<string, string> = {
          'epic': 'Epic',
          'story': 'Story',
          'initiative': 'Initiative'
        }
        const defaultIssueType = issueTypeMap[workItemType || 'story'] || 'Story'
        
        return (
          <select
            value={value || defaultIssueType}
            onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
                     >
             {jiraField.allowedValues?.map((option) => {
               const optionValue = typeof option === 'object' ? (option.value || option.name || option.id || '') : option
               const optionLabel = typeof option === 'object' ? (option.name || option.value || option.id || '') : option
               return (
                 <option key={optionValue} value={optionValue}>
                   {optionLabel}
                 </option>
               )
             }) || (
               <>
                 <option value="Epic">Epic</option>
                 <option value="Story">Story</option>
                 <option value="Initiative">Initiative</option>
               </>
             )}
           </select>
        )
      
      case 'priority':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
          >
                         <option value="">Select priority...</option>
             {jiraField.allowedValues?.map((option) => {
               const optionValue = typeof option === 'object' ? (option.value || option.name || option.id || '') : option
               const optionLabel = typeof option === 'object' ? (option.name || option.value || option.id || '') : option
               return (
                 <option key={optionValue} value={optionValue}>
                   {optionLabel}
                 </option>
               )
             }) || (
               <>
                 <option value="Highest">Highest</option>
                 <option value="High">High</option>
                 <option value="Medium">Medium</option>
                 <option value="Low">Low</option>
                 <option value="Lowest">Lowest</option>
               </>
             )}
          </select>
        )
      
      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.jiraFieldId, e.target.value)}
            className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              error ? 'border-red-500' : 'border-gray-300'
            }`}
            placeholder={`Enter ${jiraField.name.toLowerCase()}...`}
          />
        )
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="bg-red-50 border-b border-red-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-red-800">Required Fields Missing</h3>
                <p className="text-sm text-red-600">
                  Please fill in the required fields before creating the Jira issue
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 max-h-[60vh] overflow-y-auto">
          <div className="space-y-6">
            {/* Summary */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">
                Missing Required Fields ({missingFields.length})
              </h4>
              <p className="text-sm text-blue-700">
                Your Jira instance requires the following fields to create a {content.title ? 'work item' : 'issue'}. 
                Please provide values for all required fields.
              </p>
            </div>

            {/* Extracted Fields Info */}
            {Object.keys(extractedFields).length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-green-800 mb-2">
                  🤖 Smart Fields Extracted ({Object.keys(extractedFields).length})
                </h4>
                <p className="text-sm text-green-700 mb-3">
                  AI automatically extracted the following field values from your description:
                </p>
                <div className="space-y-2">
                  {Object.entries(extractedFields).map(([fieldId, value]) => {
                    const field = jiraFields.find(f => f.id === fieldId)
                    return (
                      <div key={fieldId} className="flex justify-between items-center text-sm">
                        <span className="font-medium text-green-800">
                          {field?.name || fieldId}:
                        </span>
                        <span className="text-green-700 bg-green-100 px-2 py-1 rounded">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Missing Fields Form */}
            <div className="space-y-4">
              {missingFields.map((field, index) => (
                <div key={field.jiraFieldId} className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">
                    {field.jiraField.name}
                    {field.jiraField.required && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  
                  {field.jiraField.description && (
                    <p className="text-xs text-gray-500 mb-2">
                      {field.jiraField.description}
                    </p>
                  )}
                  
                  {renderFieldInput(field)}
                  
                  {/* Show suggestions if available */}
                  {suggestions[field.jiraFieldId] && suggestions[field.jiraFieldId].length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-600 mb-1">💡 Suggestions:</p>
                      <div className="flex flex-wrap gap-1">
                        {suggestions[field.jiraFieldId].slice(0, 3).map((suggestion, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => handleFieldChange(field.jiraFieldId, suggestion)}
                            className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition-colors"
                          >
                            {String(suggestion)}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {validationErrors[field.jiraFieldId] && (
                    <p className="text-sm text-red-600">
                      {validationErrors[field.jiraFieldId]}
                    </p>
                  )}
                  
                  <div className="text-xs text-gray-500">
                    Field ID: {field.jiraFieldId} | Type: {field.jiraField.type}
                  </div>
                </div>
              ))}
            </div>

            {/* Field Mapping Info */}
            {template && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
                <h4 className="text-sm font-medium text-gray-700 mb-2">
                  Template Information
                </h4>
                <p className="text-sm text-gray-600">
                  Using template: <strong>{template.name}</strong>
                </p>
                {template.jiraFieldMappings && Object.keys(template.jiraFieldMappings).length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    {Object.keys(template.jiraFieldMappings).length} field mappings configured
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {missingFields.filter(f => f.jiraField.required).length} required fields
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`px-6 py-2 rounded-md text-sm font-medium transition-all duration-200 ${
                  isSubmitting
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {isSubmitting ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Creating Issue...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>🚀</span>
                    <span>Create Jira Issue</span>
                  </div>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
} 