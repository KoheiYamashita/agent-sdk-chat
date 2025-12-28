import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import type { SandboxSettings } from '@/types';
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

// GET: Stream file content directly
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

    // Create a ReadableStream from the file
    const stream = createReadStream(targetPath);
    const readableStream = new ReadableStream({
      start(controller) {
        stream.on('data', (chunk) => {
          controller.enqueue(chunk);
        });
        stream.on('end', () => {
          controller.close();
        });
        stream.on('error', (err) => {
          controller.error(err);
        });
      },
      cancel() {
        stream.destroy();
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': mimeType,
        'Content-Length': stats.size.toString(),
        'Cache-Control': 'private, max-age=3600',
      },
    });
  } catch (error) {
    console.error('Failed to stream file:', error);
    return NextResponse.json(
      { error: 'Failed to stream file' },
      { status: 500 }
    );
  }
}
