import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface ClaudeCredentials {
  claudeAiOauth?: {
    accessToken: string;
    refreshToken: string;
    expiresAt: number;
    scopes: string[];
    subscriptionType: string;
  };
}

async function getCredentials(): Promise<ClaudeCredentials | null> {
  try {
    const credentialsPath = path.join(os.homedir(), '.claude', '.credentials.json');
    const content = await fs.readFile(credentialsPath, 'utf-8');
    return JSON.parse(content) as ClaudeCredentials;
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    // 1. Read credentials from ~/.claude/.credentials.json
    const credentials = await getCredentials();

    if (!credentials?.claudeAiOauth?.accessToken) {
      return NextResponse.json(
        { error: 'credentials_not_found', message: '認証情報が見つかりません。Claude Codeにログインしてください。' },
        { status: 401 }
      );
    }

    // 2. Check if token is expired
    if (credentials.claudeAiOauth.expiresAt < Date.now()) {
      return NextResponse.json(
        { error: 'token_expired', message: 'アクセストークンの有効期限が切れています。再ログインしてください。' },
        { status: 401 }
      );
    }

    // 3. Fetch usage data from Anthropic API
    const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${credentials.claudeAiOauth.accessToken}`,
        'anthropic-beta': 'oauth-2025-04-20',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Anthropic API error:', response.status, errorText);

      if (response.status === 401) {
        return NextResponse.json(
          { error: 'unauthorized', message: '認証に失敗しました。再ログインしてください。' },
          { status: 401 }
        );
      }

      return NextResponse.json(
        { error: 'api_error', message: '使用量データの取得に失敗しました。' },
        { status: 500 }
      );
    }

    const data = await response.json();
    return NextResponse.json({ data });

  } catch (error) {
    console.error('Failed to fetch usage:', error);
    return NextResponse.json(
      { error: 'internal_error', message: '内部エラーが発生しました。' },
      { status: 500 }
    );
  }
}
