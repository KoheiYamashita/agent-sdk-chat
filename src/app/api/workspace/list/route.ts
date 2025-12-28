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
    const includeFiles = searchParams.get('includeFiles') === 'true';
    const workspacePathParam = searchParams.get('workspacePath');

    // Get sandbox settings for base workspace path
    const sandboxSettings = await getSandboxSettings();

    // Use workspacePath param if provided, otherwise fall back to sandbox settings
    const workspaceSource = workspacePathParam || sandboxSettings.workspacePath;
    const basePath = workspaceSource.startsWith('/')
      ? workspaceSource
      : path.resolve(process.cwd(), workspaceSource);

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

    // Ensure target directory exists (auto-create if deleted)
    await fs.mkdir(targetPath, { recursive: true });

    // Read directory contents
    const entries = await fs.readdir(targetPath, { withFileTypes: true });

    // Filter and map to DirectoryItem
    const directories: DirectoryItem[] = [];
    const files: DirectoryItem[] = [];

    for (const entry of entries) {
      // Skip hidden files/directories
      if (entry.name.startsWith('.')) continue;

      const itemPath = path.join(targetPath, entry.name);
      const relPath = path.relative(basePath, itemPath);

      if (entry.isDirectory()) {
        // Check if directory has children (files or subdirectories)
        let hasChildren = false;
        try {
          const subEntries = await fs.readdir(itemPath, { withFileTypes: true });
          hasChildren = includeFiles
            ? subEntries.some((e) => !e.name.startsWith('.'))
            : subEntries.some((e) => e.isDirectory() && !e.name.startsWith('.'));
        } catch {
          // If we can't read, assume no children
        }

        directories.push({
          name: entry.name,
          path: relPath,
          isDirectory: true,
          hasChildren,
        });
      } else if (includeFiles && entry.isFile()) {
        files.push({
          name: entry.name,
          path: relPath,
          isDirectory: false,
        });
      }
    }

    // Sort alphabetically: directories first, then files
    directories.sort((a, b) => a.name.localeCompare(b.name));
    files.sort((a, b) => a.name.localeCompare(b.name));
    const items = [...directories, ...files];

    const response: DirectoryListResponse = {
      items,
      basePath: workspaceSource,
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
