import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
    }

    // Anthropic's API requires a version header.
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json'
      },
      // We send a minimal body to test the key without incurring significant cost.
      body: JSON.stringify({
        model: "claude-3-haiku-20240307",
        max_tokens: 1,
        messages: [{ role: "user", content: "test" }]
      })
    });

    if (response.ok) {
      return NextResponse.json({ success: true, message: 'Connection successful!' });
    } else {
      const errorData = await response.json();
      const errorMessage = errorData?.error?.message || 'Invalid API key or network issue.';
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
  } catch (error) {
    console.error('Anthropic connection test error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
} 