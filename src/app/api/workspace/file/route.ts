import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import type { SandboxSettings } from '@/types';
import type { FileReadResponse, FileSaveRequest, FileSaveResponse } from '@/types/workspace';
import mime from 'mime-types';

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

// Helper to resolve and validate path
async function resolveAndValidatePath(relativePath: string): Promise<{ basePath: string; targetPath: string } | null> {
  const sandboxSettings = await getSandboxSettings();
  const basePath = sandboxSettings.workspacePath.startsWith('/')
    ? sandboxSettings.workspacePath
    : path.resolve(process.cwd(), sandboxSettings.workspacePath);

  const targetPath = path.resolve(basePath, relativePath);

  // Security check: ensure target is within base path
  if (!targetPath.startsWith(basePath)) {
    return null;
  }

  return { basePath, targetPath };
}

// GET: Read file content
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path');

    if (!relativePath) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    const resolved = await resolveAndValidatePath(relativePath);
    if (!resolved) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    const { targetPath } = resolved;

    // Check if file exists
    try {
      const stats = await fs.stat(targetPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Path is not a file' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Read file content
    const content = await fs.readFile(targetPath, 'utf-8');
    const stats = await fs.stat(targetPath);
    const mimeType = mime.lookup(targetPath) || 'application/octet-stream';

    const response: FileReadResponse = {
      content,
      path: relativePath,
      size: stats.size,
      mimeType,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to read file:', error);
    return NextResponse.json(
      { error: 'Failed to read file' },
      { status: 500 }
    );
  }
}

// PUT: Save file content
export async function PUT(request: Request) {
  try {
    const body: FileSaveRequest = await request.json();
    const { path: relativePath, content } = body;

    if (!relativePath) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    const resolved = await resolveAndValidatePath(relativePath);
    if (!resolved) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    const { targetPath } = resolved;

    // Check if file exists
    try {
      const stats = await fs.stat(targetPath);
      if (!stats.isFile()) {
        return NextResponse.json(
          { error: 'Path is not a file' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'File not found' },
        { status: 404 }
      );
    }

    // Write file content
    await fs.writeFile(targetPath, content, 'utf-8');

    const response: FileSaveResponse = {
      success: true,
      path: relativePath,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to save file:', error);
    return NextResponse.json(
      { error: 'Failed to save file' },
      { status: 500 }
    );
  }
}
