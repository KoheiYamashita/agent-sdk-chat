import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import type { SandboxSettings } from '@/types';

// Default sandbox settings
const DEFAULT_SANDBOX_SETTINGS: SandboxSettings = {
  workspacePath: './workspace',
};

// Helper to get sandbox settings
async function getSandboxSettings(): Promise<SandboxSettings> {
  const settings = await prisma.settings.findUnique({ where: { key: 'sandbox' } });
  if (!settings) return DEFAULT_SANDBOX_SETTINGS;
  try {
    return JSON.parse(settings.value) as SandboxSettings;
  } catch {
    return DEFAULT_SANDBOX_SETTINGS;
  }
}

export interface CreateDirectoryRequest {
  parentPath: string;
  name: string;
}

export interface CreateDirectoryResponse {
  success: boolean;
  path: string;
  relativePath: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreateDirectoryRequest;
    const { parentPath, name } = body;

    // Validate name
    if (!name || name.includes('/') || name.includes('\\') || name.startsWith('.')) {
      return NextResponse.json(
        { error: 'Invalid directory name' },
        { status: 400 }
      );
    }

    // Get sandbox settings for base workspace path
    const sandboxSettings = await getSandboxSettings();
    const basePath = sandboxSettings.workspacePath.startsWith('/')
      ? sandboxSettings.workspacePath
      : path.resolve(process.cwd(), sandboxSettings.workspacePath);

    // Resolve parent directory
    const parentFullPath = parentPath && parentPath !== '.'
      ? path.resolve(basePath, parentPath)
      : basePath;

    // Security check: ensure parent is within base path
    if (!parentFullPath.startsWith(basePath)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Full path for new directory
    const newDirPath = path.join(parentFullPath, name);
    const relativePath = path.relative(basePath, newDirPath);

    // Security check for the new path too
    if (!newDirPath.startsWith(basePath)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Check if already exists
    try {
      await fs.access(newDirPath);
      return NextResponse.json(
        { error: 'Directory already exists' },
        { status: 409 }
      );
    } catch {
      // Directory doesn't exist, which is what we want
    }

    // Create the directory
    await fs.mkdir(newDirPath, { recursive: true });

    const response: CreateDirectoryResponse = {
      success: true,
      path: newDirPath,
      relativePath,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to create directory:', error);
    return NextResponse.json(
      { error: 'Failed to create directory' },
      { status: 500 }
    );
  }
}
