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
async function resolveAndValidatePath(relativePath: string, workspacePathParam?: string): Promise<{ basePath: string; targetPath: string } | null> {
  const sandboxSettings = await getSandboxSettings();
  const workspaceSource = workspacePathParam || sandboxSettings.workspacePath;
  const basePath = workspaceSource.startsWith('/')
    ? workspaceSource
    : path.resolve(process.cwd(), workspaceSource);

  const targetPath = path.resolve(basePath, relativePath);

  // Security check: ensure target is within base path
  if (!targetPath.startsWith(basePath)) {
    return null;
  }

  return { basePath, targetPath };
}

// Helper to check if MIME type is text-based
function isTextMimeType(mimeType: string): boolean {
  if (mimeType.startsWith('text/')) return true;
  if (mimeType.startsWith('application/json')) return true;
  if (mimeType.startsWith('application/javascript')) return true;
  if (mimeType.startsWith('application/typescript')) return true;
  if (mimeType.startsWith('application/xml')) return true;
  if (mimeType.includes('+xml')) return true;
  if (mimeType.includes('+json')) return true;
  // Common text-based types
  const textTypes = [
    'application/x-sh',
    'application/x-httpd-php',
    'application/x-python',
    'application/x-ruby',
    'application/x-perl',
  ];
  return textTypes.includes(mimeType);
}

// GET: Read file content
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const relativePath = searchParams.get('path');
    const workspacePathParam = searchParams.get('workspacePath') || undefined;

    if (!relativePath) {
      return NextResponse.json(
        { error: 'Path parameter is required' },
        { status: 400 }
      );
    }

    const resolved = await resolveAndValidatePath(relativePath, workspacePathParam);
    if (!resolved) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    const { targetPath } = resolved;

    // Check if file exists
    let stats;
    try {
      stats = await fs.stat(targetPath);
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

    const mimeType = mime.lookup(targetPath) || 'application/octet-stream';
    const isText = isTextMimeType(mimeType);

    // Read file content with appropriate encoding
    let content: string;
    let encoding: 'utf-8' | 'base64';

    if (isText) {
      content = await fs.readFile(targetPath, 'utf-8');
      encoding = 'utf-8';
    } else {
      const buffer = await fs.readFile(targetPath);
      content = buffer.toString('base64');
      encoding = 'base64';
    }

    const response: FileReadResponse = {
      content,
      path: relativePath,
      size: stats.size,
      mimeType,
      encoding,
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
    const { path: relativePath, content, encoding, workspacePath: workspacePathParam } = body;

    if (!relativePath) {
      return NextResponse.json(
        { error: 'Path is required' },
        { status: 400 }
      );
    }

    const resolved = await resolveAndValidatePath(relativePath, workspacePathParam);
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

    // Write file content with appropriate encoding
    if (encoding === 'base64') {
      const buffer = Buffer.from(content, 'base64');
      await fs.writeFile(targetPath, buffer);
    } else {
      await fs.writeFile(targetPath, content, 'utf-8');
    }

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
