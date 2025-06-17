// src/lib/anthropic-service.ts

export interface AnthropicConnection {
  apiKey: string;
}

const STORAGE_KEY = 'anthropic-connection';

class AnthropicService {
  private connection: AnthropicConnection | null = null;

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
        console.error('Failed to parse Anthropic connection:', error);
        localStorage.removeItem(STORAGE_KEY);
      }
    }
  }

  getConnection(): AnthropicConnection | null {
    return this.connection;
  }

  saveConnection(connection: AnthropicConnection): void {
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
    try {
        const response = await fetch('/api/anthropic/test-connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ apiKey }),
        });

        if (response.ok) {
            return { success: true };
        } else {
            const errorData = await response.json();
            return { success: false, error: errorData.error || 'Failed to connect to Anthropic.' };
        }
    } catch (error) {
        return { success: false, error: 'Network error or failed to fetch.' };
    }
  }
}

export const anthropicService = new AnthropicService(); 