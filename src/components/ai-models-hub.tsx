'use client'

import React from 'react';
import { OpenAIConnection } from './openai-connection';
import { AnthropicConnection } from './anthropic-connection';
import { DevsAIConnection, type DevsAIConnection as DevsAIConnectionType } from './devs-ai-connection';
import { type OpenAIConnection as OpenAIConnectionType } from '../lib/openai-service';
import { type AnthropicConnection as AnthropicConnectionType } from '../lib/anthropic-service';

interface AIModelsHubProps {
  onOpenAIConnectionSaved: (connection: OpenAIConnectionType) => void;
  onOpenAIConnectionRemoved: () => void;
  onAnthropicConnectionSaved: (connection: AnthropicConnectionType) => void;
  onAnthropicConnectionRemoved: () => void;
  onDevsAIConnectionSaved: (connection: DevsAIConnectionType) => void;
  onDevsAIConnectionRemoved: () => void;
}

export function AIModelsHub({
  onOpenAIConnectionSaved,
  onOpenAIConnectionRemoved,
  onAnthropicConnectionSaved,
  onAnthropicConnectionRemoved,
  onDevsAIConnectionSaved,
  onDevsAIConnectionRemoved,
}: AIModelsHubProps) {
  return (
    <div className="space-y-8">
      <OpenAIConnection
        onConnectionSaved={onOpenAIConnectionSaved}
        onConnectionRemoved={onOpenAIConnectionRemoved}
      />
      <hr className="my-6 border-cloud-300" />
      <AnthropicConnection
        onConnectionSaved={onAnthropicConnectionSaved}
        onConnectionRemoved={onAnthropicConnectionRemoved}
      />
      <hr className="my-6 border-cloud-300" />
      <DevsAIConnection
        onConnectionSaved={onDevsAIConnectionSaved}
        onConnectionRemoved={onDevsAIConnectionRemoved}
      />
    </div>
  );
} 