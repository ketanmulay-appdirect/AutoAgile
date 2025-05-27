# Smart Field Extraction Feature

## Overview

The Smart Field Extraction feature automatically extracts field values from user descriptions using AI models and pattern matching as a fallback. This helps users avoid manually filling required Jira fields by intelligently parsing their natural language descriptions.

## How It Works

### 1. AI-Powered Extraction
- Uses the same AI model selected for content generation (DevS.ai, OpenAI, Anthropic, Gemini)
- Sends a structured prompt with field definitions and user description
- Returns extracted values with confidence scores
- Only accepts extractions with confidence > 0.5

### 2. Pattern Matching Fallback
- Automatically falls back to pattern matching if AI extraction fails
- Uses regex patterns to identify common field values
- Supports multiple field types and patterns

### 3. Smart Suggestions
- Generates contextual suggestions for select fields
- Scores suggestions based on relevance to description
- Provides quick-fill buttons in the validation modal

## Supported Field Types

### Priority Fields
**Patterns Detected:**
- `high`, `highest`, `critical`, `urgent` → High/Highest priority
- `medium`, `normal` → Medium priority  
- `low`, `lowest`, `minor`, `later` → Low/Lowest priority

**Example:** "This is a high priority task" → Priority: High

### Quarter Fields
**Patterns Detected:**
- `Q1`, `Q2`, `Q3`, `Q4`
- `Quarter 1`, `Quarter 2`, etc.
- `1Q`, `2Q`, etc.
- Auto-defaults to current quarter if none specified

**Example:** "Deliver in Q2 2024" → Delivery Quarter: Q2 2024

### Boolean/Roadmap Fields
**Patterns Detected:**
- `yes`, `include`, `add`, `roadmap` → Yes
- `no`, `exclude`, `skip`, `not roadmap` → No

**Example:** "Include on roadmap" → Include on Roadmap?: Yes

### Component Fields
**Patterns Detected:**
- Matches component names from allowed values
- `frontend`, `backend`, `database`, `api`, `ui/ux`

**Example:** "Frontend and backend work" → Components: Frontend, Backend

### Story Points
**Patterns Detected:**
- `5 story points`, `8 points`, `3 story points`
- Extracts numeric values

**Example:** "Estimated at 8 story points" → Story Points: 8

### Epic Links
**Patterns Detected:**
- Jira issue keys: `ABC-123`, `PROJ-456`

**Example:** "Related to EPIC-123" → Epic Link: EPIC-123

## User Experience

### 1. Automatic Extraction
When pushing content to Jira, the system automatically:
1. Analyzes the description using AI (if available)
2. Falls back to pattern matching for remaining fields
3. Shows a notification of how many fields were extracted
4. Pre-fills the validation modal with extracted values

### 2. Validation Modal Enhancements
- **Extracted Fields Section**: Shows AI-extracted values with confidence indicators
- **Smart Suggestions**: Provides contextual suggestions for each field
- **Pre-filled Forms**: Automatically populates fields with extracted values
- **Quick Actions**: Click suggestion buttons to instantly fill fields

### 3. Error Prevention
- Validates extracted values against field constraints
- Ensures required fields are filled before Jira creation
- Provides clear error messages and suggestions

## Implementation Details

### Core Services

#### FieldExtractionService (`src/lib/field-extraction-service.ts`)
- Main service for extracting field values
- Handles AI provider communication
- Implements pattern matching algorithms
- Generates contextual suggestions

#### FieldValidationService (`src/lib/field-validation-service.ts`)
- Validates content against Jira field requirements
- Integrates with field extraction service
- Provides comprehensive validation results

#### Enhanced Components
- **FieldValidationModal**: Shows extracted fields and suggestions
- **EnhancedWorkItemCreator**: Integrates smart extraction into workflow

### AI Integration
- Supports all configured AI providers (DevS.ai, OpenAI, Anthropic, Gemini)
- Uses low temperature (0.1) for consistent extraction
- Structured prompts with field definitions and constraints
- JSON response parsing with error handling

### Pattern Matching
- Regex-based extraction for common patterns
- Field-type specific matching algorithms
- Confidence scoring for extracted values
- Fallback to default values where appropriate

## Testing the Feature

### Test Description
Use this description to test the smart field extraction:

```
Create a high priority epic for Q2 2024 that should be included on the roadmap. 
This will involve frontend and backend components and is estimated at 8 story points.
This is urgent and critical for our product launch.
```

### Expected Extractions
- **Delivery Quarter**: Q2 2024
- **Include on Roadmap?**: Yes  
- **Priority**: High
- **Components**: Frontend, Backend
- **Story Points**: 8

### Testing Steps
1. Open the application at http://localhost:3000
2. Connect to your Jira instance
3. Generate content using the test description above
4. Click "Push to Jira"
5. Observe the smart field extraction in action
6. Review the validation modal with pre-filled fields

## Configuration

### AI Provider Setup
The feature automatically uses your configured AI provider:
- **DevS.ai**: Uses your connected DevS.ai API key
- **Other Providers**: Falls back to pattern matching only

### Field Discovery
- Automatically discovers required fields from your Jira instance
- Caches field mappings for performance
- Supports custom field types and constraints

## Benefits

### For Users
- **Faster Workflow**: Reduces manual field entry
- **Error Reduction**: Prevents missing required fields
- **Smart Suggestions**: Contextual field value recommendations
- **Seamless Integration**: Works with existing content generation

### For Teams
- **Consistency**: Standardized field value extraction
- **Efficiency**: Reduced time spent on form filling
- **Quality**: AI-powered accuracy with pattern matching fallback
- **Flexibility**: Supports various field types and Jira configurations

## Future Enhancements

### Planned Features
- **Learning System**: Improve extraction based on user corrections
- **Custom Patterns**: Allow users to define custom extraction patterns
- **Bulk Operations**: Extract fields for multiple work items
- **Integration Expansion**: Support for other project management tools

### Advanced AI Features
- **Context Awareness**: Use project context for better extraction
- **Multi-language Support**: Extract fields from non-English descriptions
- **Semantic Understanding**: Better interpretation of complex requirements
- **Confidence Tuning**: Adjustable confidence thresholds per field type

## Troubleshooting

### Common Issues

#### No Fields Extracted
- **Cause**: AI provider not configured or description too vague
- **Solution**: Check AI provider connection or add more specific keywords

#### Incorrect Extractions
- **Cause**: Ambiguous description or pattern matching limitations
- **Solution**: Use more specific language or manually correct in validation modal

#### Missing Required Fields
- **Cause**: Fields not mentioned in description or not in allowed values
- **Solution**: Use the validation modal to fill missing fields manually

### Debug Information
- Check browser console for extraction logs
- Validation modal shows field IDs and types
- Confidence scores indicate extraction reliability

## API Reference

### FieldExtractionService Methods

```typescript
// Extract field values from description
extractFieldValues(
  description: string,
  jiraFields: JiraField[],
  aiProvider?: string,
  apiKey?: string
): Promise<FieldExtractionResult>

// Generate suggestions for a field
generateSuggestions(field: JiraField, description: string): any[]
```

### FieldValidationService Methods

```typescript
// Validate content with smart extraction
validateContentWithExtraction(
  content: GeneratedContent,
  workItemType: WorkItemType,
  template: WorkItemTemplate | null,
  jiraFields: JiraField[],
  aiProvider?: string,
  apiKey?: string
): Promise<ValidationResult>
```

---

**Note**: This feature requires a connected Jira instance and discovered field mappings to function properly. The AI extraction component requires a configured AI provider for optimal results. 