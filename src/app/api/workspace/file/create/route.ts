import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import type { SandboxSettings } from '@/types';
import type { FileCreateRequest, FileCreateResponse } from '@/types/workspace';

// Default sandbox settings
const DEFAULT_SANDBOX_SETTINGS: SandboxSettings = {
  enabled: true,
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

// POST: Create new file or directory
export async function POST(request: Request) {
  try {
    const body: FileCreateRequest = await request.json();
    const { parentPath, name, isDirectory, workspacePath: workspacePathParam } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      );
    }

    // Validate name (no path separators or dangerous characters)
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      return NextResponse.json(
        { error: 'Invalid name' },
        { status: 400 }
      );
    }

    const sandboxSettings = await getSandboxSettings();
    const workspaceSource = workspacePathParam || sandboxSettings.workspacePath;
    const basePath = workspaceSource.startsWith('/')
      ? workspaceSource
      : path.resolve(process.cwd(), workspaceSource);

    // Resolve parent path
    const parentAbsPath = parentPath
      ? path.resolve(basePath, parentPath)
      : basePath;

    // Security check: ensure parent is within base path
    if (!parentAbsPath.startsWith(basePath)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    const targetPath = path.join(parentAbsPath, name);
    const relativePath = path.relative(basePath, targetPath);

    // Check if already exists
    try {
      await fs.access(targetPath);
      return NextResponse.json(
        { error: 'File or directory already exists' },
        { status: 409 }
      );
    } catch {
      // Good, doesn't exist
    }

    // Create file or directory
    if (isDirectory) {
      await fs.mkdir(targetPath, { recursive: true });
    } else {
      // Ensure parent directory exists
      await fs.mkdir(parentAbsPath, { recursive: true });
      await fs.writeFile(targetPath, '', 'utf-8');
    }

    const response: FileCreateResponse = {
      success: true,
      path: targetPath,
      relativePath,
      isDirectory,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to create file/directory:', error);
    return NextResponse.json(
      { error: 'Failed to create file/directory' },
      { status: 500 }
    );
  }
}
