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

// POST: Upload file(s)
export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const targetPath = formData.get('path') as string || '';
    const workspacePathParam = formData.get('workspacePath') as string || undefined;
    const files = formData.getAll('files') as File[];

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      );
    }

    const sandboxSettings = await getSandboxSettings();
    const workspaceSource = workspacePathParam || sandboxSettings.workspacePath;
    const basePath = workspaceSource.startsWith('/')
      ? workspaceSource
      : path.resolve(process.cwd(), workspaceSource);

    const targetAbsPath = targetPath
      ? path.resolve(basePath, targetPath)
      : basePath;

    // Security check: ensure target is within base path
    if (!targetAbsPath.startsWith(basePath)) {
      return NextResponse.json(
        { error: 'Access denied: path outside workspace' },
        { status: 403 }
      );
    }

    // Ensure target directory exists
    await fs.mkdir(targetAbsPath, { recursive: true });

    const uploadedFiles: string[] = [];
    const errors: string[] = [];

    for (const file of files) {
      try {
        // Validate file name
        if (file.name.includes('/') || file.name.includes('\\') || file.name.includes('..')) {
          errors.push(`Invalid file name: ${file.name}`);
          continue;
        }

        const filePath = path.join(targetAbsPath, file.name);

        // Security check: ensure file path is within base path
        if (!filePath.startsWith(basePath)) {
          errors.push(`Access denied for file: ${file.name}`);
          continue;
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        await fs.writeFile(filePath, buffer);
        uploadedFiles.push(path.relative(basePath, filePath));
      } catch (err) {
        errors.push(`Failed to upload: ${file.name}`);
      }
    }

    return NextResponse.json({
      success: true,
      uploadedFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('Failed to upload files:', error);
    return NextResponse.json(
      { error: 'Failed to upload files' },
      { status: 500 }
    );
  }
}
