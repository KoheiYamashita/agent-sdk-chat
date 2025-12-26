import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import type { SandboxSettings } from '@/types';

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

export interface DirectoryItem {
  name: string;
  path: string;
  isDirectory: boolean;
  hasChildren?: boolean;
}

export interface DirectoryListResponse {
  items: DirectoryItem[];
  basePath: string;
  currentPath: string;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path') || '';

    // Get sandbox settings for base workspace path
    const sandboxSettings = await getSandboxSettings();
    const basePath = sandboxSettings.workspacePath.startsWith('/')
      ? sandboxSettings.workspacePath
      : path.resolve(process.cwd(), sandboxSettings.workspacePath);

    // Resolve the target directory
    const targetPath = relativePath
      ? path.resolve(basePath, relativePath)
      : basePath;

    // Security check: ensure target is within base path
    if (!targetPath.startsWith(basePath)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Ensure base directory exists
    await fs.mkdir(basePath, { recursive: true });

    // Check if target exists
    try {
      await fs.access(targetPath);
    } catch {
      return NextResponse.json(
        { error: 'Directory not found' },
        { status: 404 }
      );
    }

    // Read directory contents
    const entries = await fs.readdir(targetPath, { withFileTypes: true });

    // Filter and map to DirectoryItem
    const items: DirectoryItem[] = [];

    for (const entry of entries) {
      // Skip hidden files/directories
      if (entry.name.startsWith('.')) continue;

      if (entry.isDirectory()) {
        const itemPath = path.join(targetPath, entry.name);
        const relPath = path.relative(basePath, itemPath);

        // Check if directory has subdirectories
        let hasChildren = false;
        try {
          const subEntries = await fs.readdir(itemPath, { withFileTypes: true });
          hasChildren = subEntries.some(
            (e) => e.isDirectory() && !e.name.startsWith('.')
          );
        } catch {
          // If we can't read, assume no children
        }

        items.push({
          name: entry.name,
          path: relPath,
          isDirectory: true,
          hasChildren,
        });
      }
    }

    // Sort alphabetically
    items.sort((a, b) => a.name.localeCompare(b.name));

    const response: DirectoryListResponse = {
      items,
      basePath: sandboxSettings.workspacePath,
      currentPath: relativePath || '.',
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to list workspace directory:', error);
    return NextResponse.json(
      { error: 'Failed to list directory' },
      { status: 500 }
    );
  }
}
