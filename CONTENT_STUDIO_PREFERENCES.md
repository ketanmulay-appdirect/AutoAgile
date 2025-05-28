# Content Studio Preferences

The Content Studio now remembers your last used dropdown selections and automatically restores them when you return to the page.

## Features

### Automatic Preference Saving
- **Project Selection**: Your last selected project is remembered
- **Work Type**: Your last selected work type (Epic, Story, Initiative, etc.) is saved
- **Delivery Quarter**: Your last selected quarter/fix version is preserved

### Automatic Restoration
- When you return to Content Studio, your previous selections are automatically restored
- Work items are automatically loaded using your saved preferences
- A notification appears to inform you that preferences have been restored

### Preference Management
- **Expiration**: Preferences automatically expire after 30 days
- **Clear Preferences**: Use the "Clear Saved Preferences" button to reset all saved selections
- **Dismiss Notification**: Click the X button to hide the restoration notification without clearing preferences

## How It Works

1. **First Visit**: Make your selections and search for work items
2. **Subsequent Visits**: Your previous selections are automatically restored and work items are loaded
3. **Notification**: A blue notification bar shows that preferences were restored
4. **Management**: Use the "Clear Saved Preferences" button if you want to start fresh

## Technical Implementation

- Preferences are stored in browser localStorage
- Data includes: project key, work type, and selected quarter
- Automatic expiration prevents stale data
- Graceful fallback if saved project no longer exists

## Privacy

- All preferences are stored locally in your browser
- No data is sent to external servers
- Clearing browser data will remove saved preferences 