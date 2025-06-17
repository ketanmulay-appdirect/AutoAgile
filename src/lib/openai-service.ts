export interface OpenAIConnection {
  apiKey: string;
}

const STORAGE_KEY = 'openai-connection';

class OpenAIService {
  private connection: OpenAIConnection | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.loadConnection();
    }
  }

  loadConnection(): void {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        this.connection = JSON.parse(saved);
      } catch (error) {
        console.error('Failed to parse OpenAI connection:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  getConnection(): OpenAIConnection | null {
    return this.connection;
  }

  saveConnection(connection: OpenAIConnection): void {
    this.connection = connection;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(connection));
  }

  removeConnection(): void {
    this.connection = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  isConnected(): boolean {
    return this.connection !== null && this.connection.apiKey.length > 0;
  }

  async testConnection(apiKey: string): Promise<{ success: boolean; error?: string }> {
    if (!apiKey) {
      return { success: false, error: 'API key is missing.' };
    }

    // In a real app, we would make a call to an API route
    // that then calls the OpenAI API to validate the key.
    // For now, we simulate this.
    // The actual API call will be to `/api/openai/test-connection`
    try {
        const response = await fetch('/api/openai/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey }),
        });

        if (response.ok) {
            return { success: true };
        } else {
            const errorData = await response.json();
            return { success: false, error: errorData.error || 'Failed to connect to OpenAI.' };
        }
    } catch (error) {
        return { success: false, error: 'Network error or failed to fetch.' };
    }
  }
}

export const openAIService = new OpenAIService(); 