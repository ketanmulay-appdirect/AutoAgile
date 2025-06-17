import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { apiKey } = await request.json();

    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 400 });
    }

    const response = await fetch('https://api.openai.com/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (response.ok) {
      return NextResponse.json({ success: true, message: 'Connection successful!' });
    } else {
      const errorData = await response.json();
      const errorMessage = errorData?.error?.message || 'Invalid API key or network issue.';
      return NextResponse.json({ error: errorMessage }, { status: response.status });
    }
  } catch (error) {
    console.error('OpenAI connection test error:', error);
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 });
  }
} 