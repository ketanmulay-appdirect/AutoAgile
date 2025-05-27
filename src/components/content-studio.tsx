'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { JiraInstance, JiraProject, JiraWorkItem, WorkItemType, ContentType } from '../types'
import { jiraContentService } from '../lib/jira-content-service'
import { WorkItemCard } from './work-item-card'
import { ContentGenerator } from './content-generator'
import { InstructionEditor } from './instruction-editor'

interface ContentStudioProps {
  jiraConnection: JiraInstance | null
  devsAIConnection: unknown
}

export function ContentStudio({ jiraConnection, devsAIConnection }: ContentStudioProps) {
  const [projects, setProjects] = useState<JiraProject[]>([])
  const [selectedProject, setSelectedProject] = useState<string>('')
  const [quarters, setQuarters] = useState<string[]>([])
  const [selectedQuarter, setSelectedQuarter] = useState<string>('')
  const [workItemType, setWorkItemType] = useState<WorkItemType>('all')
  const [workItems, setWorkItems] = useState<JiraWorkItem[]>([])
  const [selectedWorkItem, setSelectedWorkItem] = useState<JiraWorkItem | null>(null)
  const [selectedContentType, setSelectedContentType] = useState<ContentType | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showInstructionEditor, setShowInstructionEditor] = useState(false)

  const loadProjects = useCallback(async () => {
    if (!jiraConnection) return
    
    setLoading(true)
    setError(null)
    
    try {
      const projectList = await jiraContentService.getProjects(jiraConnection)
      setProjects(projectList)
    } catch (err) {
      setError('Failed to load projects. Please check your Jira connection.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [jiraConnection])

  const loadQuarters = useCallback(async () => {
    if (!jiraConnection || !selectedProject) return
    
    try {
      const quarterList = await jiraContentService.getProjectVersions(jiraConnection, selectedProject)
      setQuarters(quarterList)
    } catch (err) {
      console.error('Failed to load quarters:', err)
      // Set default quarters as fallback
      const currentYear = new Date().getFullYear()
      setQuarters([
        `Q1 ${currentYear}`,
        `Q2 ${currentYear}`,
        `Q3 ${currentYear}`,
        `Q4 ${currentYear}`,
        `Q1 ${currentYear + 1}`
      ])
    }
  }, [jiraConnection, selectedProject])

  const loadWorkItems = useCallback(async () => {
    if (!jiraConnection || !selectedProject) return
    
    setLoading(true)
    setError(null)
    
    try {
      const items = await jiraContentService.getWorkItems(
        jiraConnection,
        selectedProject,
        workItemType,
        selectedQuarter
      )
      setWorkItems(items)
      setSelectedWorkItem(null)
    } catch (err) {
      setError('Failed to load work items.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [jiraConnection, selectedProject, workItemType, selectedQuarter])

  // Load projects when Jira connection is available
  useEffect(() => {
    if (jiraConnection) {
      loadProjects()
    }
  }, [jiraConnection, loadProjects])

  // Load quarters when project is selected
  useEffect(() => {
    if (jiraConnection && selectedProject) {
      loadQuarters()
    }
  }, [jiraConnection, selectedProject, loadQuarters])

  // Load work items when project is selected (quarter is optional)
  useEffect(() => {
    if (jiraConnection && selectedProject) {
      loadWorkItems()
    }
  }, [jiraConnection, selectedProject, selectedQuarter, workItemType, loadWorkItems])

  const handleWorkItemSelect = (workItem: JiraWorkItem) => {
    setSelectedWorkItem(workItem)
    setSelectedContentType(null)
  }

  const handleContentTypeSelect = (contentType: ContentType) => {
    setSelectedContentType(contentType)
  }

  const handleBackToSelection = () => {
    setSelectedContentType(null)
  }

  const handleBackToWorkItems = () => {
    setSelectedWorkItem(null)
    setSelectedContentType(null)
  }

  if (!jiraConnection) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">Jira Connection Required</h3>
        <p className="text-gray-600 mb-6">
          Connect to your Jira instance to access the Content Studio features.
        </p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('navigate-to-jira'))}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Setup Jira Connection
        </button>
      </div>
    )
  }

  if (selectedContentType && selectedWorkItem) {
    return (
      <ContentGenerator
        jiraConnection={jiraConnection}
        devsAIConnection={devsAIConnection}
        workItem={selectedWorkItem}
        contentType={selectedContentType}
        deliveryQuarter={selectedQuarter}
        onBack={handleBackToSelection}
        onEditInstructions={() => setShowInstructionEditor(true)}
      />
    )
  }

  if (selectedWorkItem) {
    return (
      <div className="space-y-6">
        {/* Header with back button */}
        <div className="flex items-center justify-between">
          <button
            onClick={handleBackToWorkItems}
            className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Work Items
          </button>
          <button
            onClick={() => setShowInstructionEditor(true)}
            className="text-blue-600 hover:text-blue-700 transition-colors text-sm font-medium"
          >
            Customize AI Instructions
          </button>
        </div>

        {/* Selected work item */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Selected Work Item</h2>
          <WorkItemCard workItem={selectedWorkItem} isSelected={true} onClick={() => {}} />
        </div>

        {/* Content type selection */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">Choose Content Type</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <ContentTypeCard
              type="quarterly-presentation"
              title="Quarterly Presentation"
              description="Executive slide deck for quarterly business reviews"
              phase="Planning Phase"
              icon="📊"
              onClick={() => handleContentTypeSelect('quarterly-presentation')}
            />
            <ContentTypeCard
              type="customer-webinar"
              title="Customer Webinar"
              description="Customer-facing presentation content"
              phase="Planning Phase"
              icon="🎯"
              onClick={() => handleContentTypeSelect('customer-webinar')}
            />
            <ContentTypeCard
              type="feature-newsletter"
              title="Feature Newsletter"
              description="Newsletter content for feature announcement"
              phase="Post-Completion"
              icon="📰"
              onClick={() => handleContentTypeSelect('feature-newsletter')}
            />
          </div>
        </div>

        {showInstructionEditor && (
          <InstructionEditor
            onClose={() => setShowInstructionEditor(false)}
          />
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Content Studio</h2>
        <p className="text-gray-600">
          Generate presentation and marketing content from your Jira work items
        </p>
      </div>

      {/* Selection Form */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Project Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Project
            </label>
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={loading}
            >
              <option value="">Select Project</option>
              {projects.map((project) => (
                <option key={project.key} value={project.key}>
                  {project.name} ({project.key})
                </option>
              ))}
            </select>
          </div>

          {/* Work Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Work Type
            </label>
            <select
              value={workItemType}
              onChange={(e) => setWorkItemType(e.target.value as WorkItemType)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Issue Types</option>
              <option value="epic">Epic</option>
              <option value="story">Story</option>
              <option value="initiative">Initiative</option>
              <option value="task">Task</option>
              <option value="bug">Bug</option>
            </select>
          </div>

          {/* Quarter Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Delivery Quarter
            </label>
            <select
              value={selectedQuarter}
              onChange={(e) => setSelectedQuarter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              disabled={!selectedProject}
            >
              <option value="">All Quarters (Optional)</option>
              {quarters.map((quarter) => (
                <option key={quarter} value={quarter}>
                  {quarter}
                </option>
              ))}
            </select>
          </div>

          {/* Search Button */}
          <div className="flex items-end">
            <button
              onClick={loadWorkItems}
              disabled={!selectedProject || loading}
              className="w-full bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Loading...' : 'Find Work Items'}
            </button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <svg className="w-5 h-5 text-red-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Work Items List */}
      {workItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            Work Items ({workItems.length} found)
          </h3>
          <div className="grid grid-cols-1 gap-4">
            {workItems.map((workItem) => (
              <WorkItemCard
                key={workItem.id}
                workItem={workItem}
                isSelected={false}
                onClick={() => handleWorkItemSelect(workItem)}
              />
            ))}
          </div>
        </div>
      )}

      {/* No Work Items Found */}
      {!loading && selectedProject && workItems.length === 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Work Items Found</h3>
          <p className="text-gray-600 mb-4">
            No {workItemType}s found for the selected criteria. Try:
          </p>
          <ul className="text-sm text-gray-500 space-y-1">
            <li>• Selecting a different work type</li>
            <li>• Removing the quarter filter</li>
            <li>• Checking if the project has any {workItemType}s</li>
          </ul>
        </div>
      )}

      {showInstructionEditor && (
        <InstructionEditor
          onClose={() => setShowInstructionEditor(false)}
        />
      )}
    </div>
  )
}

interface ContentTypeCardProps {
  type: ContentType
  title: string
  description: string
  phase: string
  icon: string
  onClick: () => void
}

function ContentTypeCard({ title, description, phase, icon, onClick }: ContentTypeCardProps) {
  return (
    <button
      onClick={onClick}
      className="p-6 border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all duration-200 text-left group"
    >
      <div className="text-2xl mb-3">{icon}</div>
      <h4 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
        {title}
      </h4>
      <p className="text-gray-600 text-sm mb-3">{description}</p>
      <span className="inline-block px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
        {phase}
      </span>
    </button>
  )
} 