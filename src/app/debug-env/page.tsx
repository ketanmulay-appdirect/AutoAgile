'use client'

import { useEffect, useState } from 'react'

export default function DebugEnvPage() {
  const [envInfo, setEnvInfo] = useState<any>(null)

  useEffect(() => {
    const info = {
      devsAiApiKey: process.env.DEVS_AI_API_KEY ? 'PRESENT' : 'NOT_PRESENT',
      devsAiApiKeyLength: process.env.DEVS_AI_API_KEY?.length || 0,
      openaiApiKey: process.env.OPENAI_API_KEY ? 'PRESENT' : 'NOT_PRESENT',
      anthropicApiKey: process.env.ANTHROPIC_API_KEY ? 'PRESENT' : 'NOT_PRESENT',
      nodeEnv: process.env.NODE_ENV,
      envKeys: Object.keys(process.env).filter(key => key.includes('AI')),
      allEnvKeysCount: Object.keys(process.env).length
    }
    setEnvInfo(info)
    console.log('Environment Debug Info:', info)
  }, [])

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Debug</h1>
      <div className="bg-gray-100 p-4 rounded-lg">
        <pre className="text-sm">
          {JSON.stringify(envInfo, null, 2)}
        </pre>
      </div>
      <div className="mt-4">
        <p className="text-sm text-gray-600">
          Check the browser console for additional debug information.
        </p>
      </div>
    </div>
  )
} 