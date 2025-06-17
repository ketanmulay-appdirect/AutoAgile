'use client'

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Alert, AlertTitle, AlertDescription } from './ui/alert';
import { Icons } from './ui/icons';
import { Badge } from './ui/badge';
import { anthropicService, type AnthropicConnection } from '../lib/anthropic-service';

interface AnthropicConnectionProps {
  onConnectionSaved: (connection: AnthropicConnection) => void;
  onConnectionRemoved: () => void;
}

export function AnthropicConnection({ onConnectionSaved, onConnectionRemoved }: AnthropicConnectionProps) {
  const [connection, setConnection] = useState<Partial<AnthropicConnection>>({ apiKey: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  useEffect(() => {
    const existingConnection = anthropicService.getConnection();
    if (existingConnection) {
      setConnection(existingConnection);
      setIsConnected(true);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setConnection({ apiKey: value });
    setTestResult(null);
  };

  const handleTestConnection = async () => {
    if (!connection.apiKey) {
      setTestResult({ success: false, message: 'Please provide an API key.' });
      return;
    }
    setIsTesting(true);
    const result = await anthropicService.testConnection(connection.apiKey);
    setTestResult({ success: result.success, message: result.error || 'Connection successful!' });
    if (result.success) {
      setIsConnected(true);
    }
    setIsTesting(false);
  };

  const handleSaveConnection = () => {
    if (connection.apiKey && isConnected) {
      anthropicService.saveConnection(connection as AnthropicConnection);
      onConnectionSaved(connection as AnthropicConnection);
      setTestResult({ success: true, message: 'Connection saved successfully!' });
    } else {
       setTestResult({ success: false, message: 'Please test the connection successfully before saving.' });
    }
  };

  const handleRemoveConnection = () => {
    anthropicService.removeConnection();
    setConnection({ apiKey: '' });
    setIsConnected(false);
    setTestResult(null);
    onConnectionRemoved();
  };
  
  const maskToken = (token: string) => {
    if (!token) return '';
    return `${token.substring(0, 5)}...${token.substring(token.length - 4)}`;
  }

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center">
              <Icons.Sparkles size="md" autoContrast className="mr-2" />
              Anthropic Connection
            </CardTitle>
            <CardDescription>
              Configure your Anthropic API key for Claude access.
            </CardDescription>
          </div>
          {isConnected && (
            <Badge variant="success">Connected</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-navy-950 mb-2">
            API Key *
          </label>
          <Input
            type={isConnected ? "password" : "text"}
            value={isConnected ? maskToken(connection.apiKey || '') : (connection.apiKey || '')}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Your Anthropic API key"
            readOnly={isConnected}
          />
           <p className="mt-1 text-sm text-cloud-600">
            Get your key from the <a href="https://console.anthropic.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">Anthropic dashboard</a>.
          </p>
        </div>

        {testResult && (
          <Alert variant={testResult.success ? 'success' : 'destructive'}>
            <Icons.AlertCircle size="sm" />
            <AlertTitle>
              {testResult.success ? 'Success' : 'Error'}
            </AlertTitle>
            <AlertDescription>
              {testResult.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end space-x-2">
          {isConnected ? (
            <Button variant="destructive" onClick={handleRemoveConnection}>
              Remove Connection
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleTestConnection} disabled={isTesting}>
                {isTesting ? <Icons.Loader className="mr-2 h-4 w-4 animate-spin" /> : null}
                Test Connection
              </Button>
              <Button onClick={handleSaveConnection} disabled={!isConnected || isTesting}>
                Save Connection
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 