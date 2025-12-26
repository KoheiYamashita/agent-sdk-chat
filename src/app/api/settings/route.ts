import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { SettingsData, AppearanceSettings } from '@/types';

// セキュリティ: 画像URLの検証（data: URLまたは有効なhttps URLのみ許可）
function isValidImageUrl(url: string): boolean {
  if (!url) return true; // 空文字は許可
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

// セキュリティ: イニシャルのサニタイズ（英数字のみ許可）
function sanitizeInitials(input: string): string {
  return input.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase();
}

// セキュリティ: 名前のサニタイズ（スクリプトインジェクション防止）
function sanitizeName(input: string): string {
  return input.replace(/[<>'"&]/g, '').slice(0, 50);
}

// セキュリティ: AppearanceSettingsのサニタイズ
function sanitizeAppearanceSettings(settings: AppearanceSettings): AppearanceSettings {
  return {
    ...settings,
    userInitials: sanitizeInitials(settings.userInitials || ''),
    botInitials: sanitizeInitials(settings.botInitials || ''),
    userImageUrl: isValidImageUrl(settings.userImageUrl || '') ? settings.userImageUrl : '',
    botImageUrl: isValidImageUrl(settings.botImageUrl || '') ? settings.botImageUrl : '',
    userName: sanitizeName(settings.userName || ''),
  };
}

const DEFAULT_SETTINGS: SettingsData = {
  general: {
    defaultModel: 'claude-sonnet-4-20250514',
    defaultPermissionMode: 'default',
    theme: 'system',
    language: 'ja',
  },
  permissions: {
    mode: 'acceptEdits',
    allowedTools: [],
    disallowedTools: [],
  },
  sandbox: {
    enabled: true,
    workspacePath: './workspace',
  },
  appearance: {
    userIcon: 'user',
    userInitials: '',
    userImageUrl: '',
    userName: '',
    botIcon: 'bot',
    botInitials: '',
    botImageUrl: '',
  },
};

export async function GET() {
  try {
    const settings = await prisma.settings.findMany();

    const settingsMap: Record<string, unknown> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = JSON.parse(setting.value);
    }

    // セキュリティ: DBから読み取ったappearance設定もサニタイズ
    const rawAppearance = (settingsMap.appearance as SettingsData['appearance']) ?? DEFAULT_SETTINGS.appearance;
    const sanitizedAppearance = sanitizeAppearanceSettings(rawAppearance);

    const result: SettingsData = {
      general: (settingsMap.general as SettingsData['general']) ?? DEFAULT_SETTINGS.general,
      permissions:
        (settingsMap.permissions as SettingsData['permissions']) ??
        DEFAULT_SETTINGS.permissions,
      sandbox: (settingsMap.sandbox as SettingsData['sandbox']) ?? DEFAULT_SETTINGS.sandbox,
      appearance: sanitizedAppearance,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as SettingsData;

    // セキュリティ: appearanceセクションをサニタイズ
    if (body.appearance) {
      body.appearance = sanitizeAppearanceSettings(body.appearance);
    }

    // Upsert each settings category
    const categories = ['general', 'permissions', 'sandbox', 'appearance'] as const;

    for (const category of categories) {
      if (body[category]) {
        await prisma.settings.upsert({
          where: { key: category },
          update: { value: JSON.stringify(body[category]) },
          create: { key: category, value: JSON.stringify(body[category]) },
        });
      }
    }

    return NextResponse.json(body);
  } catch (error) {
    console.error('Failed to update settings:', error);
    return NextResponse.json(
      { error: 'Failed to update settings' },
      { status: 500 }
    );
  }
}
