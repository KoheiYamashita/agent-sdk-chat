import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string[];
  subscriptionType: string;
}

interface ClaudeCredentials {
  claudeAiOauth?: OAuthTokens;
}

interface TokenRefreshResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  token_type: string;
}

const CREDENTIALS_PATH = path.join(os.homedir(), '.claude', '.credentials.json');
// Refresh token 5 minutes before expiry to avoid edge cases
const TOKEN_EXPIRY_BUFFER_MS = 5 * 60 * 1000;

async function getCredentials(): Promise<ClaudeCredentials | null> {
  try {
    const content = await fs.readFile(CREDENTIALS_PATH, 'utf-8');
    return JSON.parse(content) as ClaudeCredentials;
  } catch {
    return null;
  }
}

async function saveCredentials(credentials: ClaudeCredentials): Promise<void> {
  await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), 'utf-8');
}

async function refreshAccessToken(oauth: OAuthTokens): Promise<OAuthTokens | null> {
  try {
    const response = await fetch('https://api.anthropic.com/oauth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: oauth.refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      console.error('Token refresh failed:', response.status, await response.text());
      return null;
    }

    const data = await response.json() as TokenRefreshResponse;

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? oauth.refreshToken,
      expiresAt: Date.now() + data.expires_in * 1000,
      scopes: oauth.scopes,
      subscriptionType: oauth.subscriptionType,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    return null;
  }
}

async function getValidAccessToken(): Promise<{ token: string } | { error: string; message: string }> {
  const credentials = await getCredentials();

  if (!credentials?.claudeAiOauth?.accessToken) {
    return { error: 'credentials_not_found', message: '認証情報が見つかりません。Claude Codeにログインしてください。' };
  }

  const oauth = credentials.claudeAiOauth;
  const isExpired = oauth.expiresAt < Date.now() + TOKEN_EXPIRY_BUFFER_MS;

  if (!isExpired) {
    return { token: oauth.accessToken };
  }

  // Token is expired or about to expire, try to refresh
  console.log('Access token expired, attempting refresh...');
  const newOauth = await refreshAccessToken(oauth);

  if (!newOauth) {
    return { error: 'refresh_failed', message: 'トークンの更新に失敗しました。再ログインしてください。' };
  }

  // Save the new credentials
  credentials.claudeAiOauth = newOauth;
  await saveCredentials(credentials);
  console.log('Access token refreshed successfully');

  return { token: newOauth.accessToken };
}

export async function GET() {
  try {
    // 1. Get valid access token (refresh if needed)
    const tokenResult = await getValidAccessToken();

    if ('error' in tokenResult) {
      return NextResponse.json(
        { error: tokenResult.error, message: tokenResult.message },
        { status: 401 }
      );
    }

    // 2. Fetch usage data from Anthropic API
    const response = await fetch('https://api.anthropic.com/api/oauth/usage', {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/plain, */*',
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${tokenResult.token}`,
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
