import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import type { SandboxSettings } from '@/types';
import type { DeleteRequest, DeleteResponse } from '@/types/workspace';

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

// DELETE: Delete file or directory
export async function DELETE(request: Request) {
  try {
    const body: DeleteRequest = await request.json();
    const { path: relativePath, workspacePath: workspacePathParam } = body;

    if (!relativePath) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    const sandboxSettings = await getSandboxSettings();
    const workspaceSource = workspacePathParam || sandboxSettings.workspacePath;
    const basePath = workspaceSource.startsWith('/')
      ? workspaceSource
      : path.resolve(process.cwd(), workspaceSource);

    const targetPath = path.resolve(basePath, relativePath);

    // Security check: ensure target is within base path and not the base path itself
    if (!targetPath.startsWith(basePath) || targetPath === basePath) {
      return NextResponse.json(
        { error: 'Access denied: cannot delete this path' },
        { status: 403 }
      );
    }

    // Check if exists
    try {
      await fs.access(targetPath);
    } catch {
      return NextResponse.json(
        { error: 'File or directory not found' },
        { status: 404 }
      );
    }

    // Delete file or directory
    await fs.rm(targetPath, { recursive: true, force: true });

    const response: DeleteResponse = {
      success: true,
      path: relativePath,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to delete:', error);
    return NextResponse.json(
      { error: 'Failed to delete' },
      { status: 500 }
    );
  }
}
