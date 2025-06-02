'use client'

import React, { useState, useEffect } from 'react'
import { WorkItemType, FieldExtractionConfig, ExtractionPreferences, EnhancedWorkItemTemplate } from '../types'
import { JiraField } from '../lib/jira-field-service'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Icons } from './ui/icons'

interface FieldExtractionConfigEditorProps {
  workItemType: WorkItemType
  template: EnhancedWorkItemTemplate
  jiraFields: JiraField[]
  onSave: (config: FieldExtractionConfig[], preferences: ExtractionPreferences) => void
  onCancel: () => void
}

export function FieldExtractionConfigEditor({
  workItemType,
  template,
  jiraFields,
  onSave,
  onCancel
}: FieldExtractionConfigEditorProps) {
  const [fieldConfigs, setFieldConfigs] = useState<FieldExtractionConfig[]>([])
  const [preferences, setPreferences] = useState<ExtractionPreferences>({
    defaultMethod: 'ai',
    globalConfidenceThreshold: 0.7,
    requireConfirmationForAll: false,
    enableSmartDefaults: true
  })
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    initializeConfigs()
  }, [template, jiraFields])

  const initializeConfigs = () => {
    // Load existing config or create defaults
    const existingConfigs = template.fieldExtractionConfig || []
    const existingPrefs = template.extractionPreferences || preferences

    const configs: FieldExtractionConfig[] = []

    // Create configs for all required Jira fields
    jiraFields.forEach(jiraField => {
      if (jiraField.required) {
        const existingConfig = existingConfigs.find(c => c.jiraFieldId === jiraField.id)
        
        configs.push({
          fieldId: existingConfig?.fieldId || jiraField.id,
          jiraFieldId: jiraField.id,
          extractionEnabled: existingConfig?.extractionEnabled ?? true,
          extractionMethod: existingConfig?.extractionMethod || getDefaultExtractionMethod(jiraField),
          confirmationRequired: existingConfig?.confirmationRequired ?? false,
          confidenceThreshold: existingConfig?.confidenceThreshold || existingPrefs.globalConfidenceThreshold,
          autoApply: existingConfig?.autoApply ?? true,
          displayName: existingConfig?.displayName || jiraField.name
        })
      }
    })

    setFieldConfigs(configs)
    setPreferences(existingPrefs)
    setHasChanges(false)
  }

  const getDefaultExtractionMethod = (jiraField: JiraField): 'ai' | 'pattern' | 'manual' => {
    const fieldName = jiraField.name.toLowerCase()
    const fieldId = jiraField.id.toLowerCase()

    // Pattern matching works well for these fields
    if (fieldName.includes('priority') || 
        fieldName.includes('quarter') || 
        fieldId.includes('customfield_26362') ||
        fieldId.includes('customfield_26360')) {
      return 'pattern'
    }

    // AI works better for complex fields
    if (fieldName.includes('description') || 
        fieldName.includes('summary') ||
        fieldName.includes('title')) {
      return 'ai'
    }

    // Default to AI for most fields
    return 'ai'
  }

  const updateFieldConfig = (index: number, updates: Partial<FieldExtractionConfig>) => {
    const newConfigs = [...fieldConfigs]
    newConfigs[index] = { ...newConfigs[index], ...updates }
    setFieldConfigs(newConfigs)
    setHasChanges(true)
  }

  const updatePreferences = (updates: Partial<ExtractionPreferences>) => {
    setPreferences(prev => ({ ...prev, ...updates }))
    setHasChanges(true)
  }

  const applyGlobalSettings = (setting: 'enable' | 'disable' | 'ai' | 'pattern' | 'manual') => {
    const newConfigs = fieldConfigs.map(config => {
      switch (setting) {
        case 'enable':
          return { ...config, extractionEnabled: true }
        case 'disable':
          return { ...config, extractionEnabled: false }
        case 'ai':
        case 'pattern':
        case 'manual':
          return { ...config, extractionMethod: setting }
        default:
          return config
      }
    })
    setFieldConfigs(newConfigs)
    setHasChanges(true)
  }

  const handleSave = () => {
    onSave(fieldConfigs, preferences)
  }

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'ai': return '🤖'
      case 'pattern': return '🔍'
      case 'manual': return '✋'
      default: return '❓'
    }
  }

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'ai': return 'bg-blue-100 text-blue-700'
      case 'pattern': return 'bg-green-100 text-green-700'
      case 'manual': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icons.Settings size="md" autoContrast className="mr-2" />
            Field Extraction Configuration - {workItemType.charAt(0).toUpperCase() + workItemType.slice(1)}
          </CardTitle>
          <CardDescription>
            Configure how fields are extracted from your content when pushing to Jira. 
            Choose extraction methods, confidence thresholds, and confirmation requirements.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <Icons.Info size="sm" className="text-blue-600 mr-2" />
              <h4 className="font-medium text-blue-900">Extraction Methods</h4>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-blue-800">
              <div className="flex items-center">
                <span className="mr-2">🤖</span>
                <div>
                  <strong>AI:</strong> Uses AI to understand context and extract complex values
                </div>
              </div>
              <div className="flex items-center">
                <span className="mr-2">🔍</span>
                <div>
                  <strong>Pattern:</strong> Uses regex patterns for structured fields like priorities, quarters
                </div>
              </div>
              <div className="flex items-center">
                <span className="mr-2">✋</span>
                <div>
                  <strong>Manual:</strong> Always requires manual input from user
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Global Preferences */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icons.Settings size="sm" autoContrast className="mr-2" />
            Global Preferences
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Default Extraction Method
              </label>
              <select
                value={preferences.defaultMethod}
                onChange={(e) => updatePreferences({ defaultMethod: e.target.value as any })}
                className="jira-select w-full"
              >
                <option value="ai">🤖 AI Extraction</option>
                <option value="pattern">🔍 Pattern Matching</option>
                <option value="manual">✋ Manual Only</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Global Confidence Threshold
              </label>
              <select
                value={preferences.globalConfidenceThreshold}
                onChange={(e) => updatePreferences({ globalConfidenceThreshold: parseFloat(e.target.value) })}
                className="jira-select w-full"
              >
                <option value="0.5">50% - Relaxed</option>
                <option value="0.7">70% - Balanced</option>
                <option value="0.8">80% - Strict</option>
                <option value="0.9">90% - Very Strict</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.requireConfirmationForAll}
                onChange={(e) => updatePreferences({ requireConfirmationForAll: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Require confirmation for all extractions</span>
            </label>

            <label className="flex items-center">
              <input
                type="checkbox"
                checked={preferences.enableSmartDefaults}
                onChange={(e) => updatePreferences({ enableSmartDefaults: e.target.checked })}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Enable smart defaults</span>
            </label>
          </div>

          {/* Bulk Actions */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Bulk Actions</h4>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyGlobalSettings('enable')}
              >
                Enable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyGlobalSettings('disable')}
              >
                Disable All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyGlobalSettings('ai')}
              >
                🤖 Set All to AI
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyGlobalSettings('pattern')}
              >
                🔍 Set All to Pattern
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => applyGlobalSettings('manual')}
              >
                ✋ Set All to Manual
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Field Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Icons.FileText size="sm" autoContrast className="mr-2" />
            Field Configuration ({fieldConfigs.length} required fields)
          </CardTitle>
          <CardDescription>
            Configure extraction settings for each required Jira field
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fieldConfigs.map((config, index) => {
              const jiraField = jiraFields.find(f => f.id === config.jiraFieldId)
              return (
                <div key={config.jiraFieldId} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center">
                      <div className="flex items-center mr-4">
                        <input
                          type="checkbox"
                          checked={config.extractionEnabled}
                          onChange={(e) => updateFieldConfig(index, { extractionEnabled: e.target.checked })}
                          className="mr-2"
                        />
                        <div>
                          <h4 className="font-medium text-gray-900">{config.displayName}</h4>
                          <p className="text-sm text-gray-500">
                            {jiraField?.id} • {jiraField?.type}
                          </p>
                        </div>
                      </div>
                      <Badge variant="secondary">Required</Badge>
                    </div>
                    <Badge className={getMethodColor(config.extractionMethod)}>
                      {getMethodIcon(config.extractionMethod)} {config.extractionMethod.toUpperCase()}
                    </Badge>
                  </div>

                  {config.extractionEnabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Extraction Method
                        </label>
                        <select
                          value={config.extractionMethod}
                          onChange={(e) => updateFieldConfig(index, { extractionMethod: e.target.value as any })}
                          className="jira-select w-full text-sm"
                        >
                          <option value="ai">🤖 AI Extraction</option>
                          <option value="pattern">🔍 Pattern Matching</option>
                          <option value="manual">✋ Manual Only</option>
                        </select>
                      </div>

                      {config.extractionMethod !== 'manual' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Confidence Threshold
                          </label>
                          <select
                            value={config.confidenceThreshold}
                            onChange={(e) => updateFieldConfig(index, { confidenceThreshold: parseFloat(e.target.value) })}
                            className="jira-select w-full text-sm"
                          >
                            <option value="0.5">50%</option>
                            <option value="0.7">70%</option>
                            <option value="0.8">80%</option>
                            <option value="0.9">90%</option>
                          </select>
                        </div>
                      )}

                      <div className="flex flex-col justify-end">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={config.confirmationRequired}
                            onChange={(e) => updateFieldConfig(index, { confirmationRequired: e.target.checked })}
                            className="mr-2"
                          />
                          Require confirmation
                        </label>
                        {config.extractionMethod !== 'manual' && (
                          <label className="flex items-center text-sm mt-1">
                            <input
                              type="checkbox"
                              checked={config.autoApply}
                              onChange={(e) => updateFieldConfig(index, { autoApply: e.target.checked })}
                              className="mr-2"
                            />
                            Auto-apply when confident
                          </label>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!hasChanges}
          className="jira-btn-primary"
        >
          Save Configuration
        </Button>
      </div>
    </div>
  )
} 