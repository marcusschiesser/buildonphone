import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      Allow: 'POST, OPTIONS',
    },
  });
}

export async function POST(req: NextRequest) {
  const serverKey = process.env.ANTHROPIC_API_KEY?.trim();
  const clientKey = req.headers.get('x-api-key')?.trim();
  const apiKey = serverKey || clientKey;
  if (!apiKey) {
    return NextResponse.json({ error: 'Missing x-api-key header.' }, { status: 400 });
  }

  const body = await req.text();

  const headers: Record<string, string> = {
    'x-api-key': apiKey,
    'anthropic-version': req.headers.get('anthropic-version') ?? '2023-06-01',
    'content-type': req.headers.get('content-type') ?? 'application/json',
    accept: req.headers.get('accept') ?? 'application/json',
  };

  const beta = req.headers.get('anthropic-beta');
  if (beta && beta.trim().length > 0) {
    headers['anthropic-beta'] = beta;
  }

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers,
    body,
  });

  const contentType = upstream.headers.get('content-type') ?? 'application/json';
  const responseHeaders = new Headers({ 'content-type': contentType });

  if (!upstream.ok) {
    const errorText = await upstream.text();
    return new NextResponse(errorText, {
      status: upstream.status,
      headers: responseHeaders,
    });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}
