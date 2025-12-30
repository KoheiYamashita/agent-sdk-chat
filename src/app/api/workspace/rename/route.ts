import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import type { SandboxSettings } from '@/types';
import type { RenameRequest, RenameResponse } from '@/types/workspace';

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

// POST: Rename file or directory
export async function POST(request: Request) {
  try {
    const body: RenameRequest = await request.json();
    const { oldPath, newName, workspacePath: workspacePathParam } = body;

    if (!oldPath || !newName) {
      return NextResponse.json(
        { error: 'Old path and new name are required' },
        { status: 400 }
      );
    }

    // Validate new name (no path separators or dangerous characters)
    if (newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
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

    const oldAbsPath = path.resolve(basePath, oldPath);
    const parentDir = path.dirname(oldAbsPath);
    const newAbsPath = path.join(parentDir, newName);

    // Security check: ensure both paths are within base path
    if (!oldAbsPath.startsWith(basePath) || !newAbsPath.startsWith(basePath)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Check if old path exists
    try {
      await fs.access(oldAbsPath);
    } catch {
      return NextResponse.json(
        { error: 'File or directory not found' },
        { status: 404 }
      );
    }

    // Check if new path already exists
    try {
      await fs.access(newAbsPath);
      return NextResponse.json(
        { error: 'A file or directory with that name already exists' },
        { status: 409 }
      );
    } catch {
      // Good, doesn't exist
    }

    // Rename
    await fs.rename(oldAbsPath, newAbsPath);

    const newRelativePath = path.relative(basePath, newAbsPath);

    const response: RenameResponse = {
      success: true,
      oldPath,
      newPath: newRelativePath,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to rename:', error);
    return NextResponse.json(
      { error: 'Failed to rename' },
      { status: 500 }
    );
  }
}
