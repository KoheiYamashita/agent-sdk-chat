import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import type { SettingsData } from '@/types';

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
};

export async function GET() {
  try {
    const settings = await prisma.settings.findMany();

    const settingsMap: Record<string, unknown> = {};
    for (const setting of settings) {
      settingsMap[setting.key] = JSON.parse(setting.value);
    }

    const result: SettingsData = {
      general: (settingsMap.general as SettingsData['general']) ?? DEFAULT_SETTINGS.general,
      permissions:
        (settingsMap.permissions as SettingsData['permissions']) ??
        DEFAULT_SETTINGS.permissions,
      sandbox: (settingsMap.sandbox as SettingsData['sandbox']) ?? DEFAULT_SETTINGS.sandbox,
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

    // Upsert each settings category
    const categories = ['general', 'permissions', 'sandbox'] as const;

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
