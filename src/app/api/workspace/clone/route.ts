import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db/prisma';
import type {
  SandboxSettings,
  GitCloneRequest,
  GitCloneResult,
  GitCloneErrorCode,
} from '@/types';

// Default sandbox settings
const DEFAULT_SANDBOX_SETTINGS: SandboxSettings = {
  enabled: true,
  workspacePath: './workspace',
};

// Clone timeout: 5 minutes
const CLONE_TIMEOUT_MS = 5 * 60 * 1000;

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

// Extract repository name from URL
function extractRepositoryName(url: string): string | null {
  // Handle various URL formats:
  // https://github.com/user/repo.git -> repo
  // https://github.com/user/repo -> repo
  // git@github.com:user/repo.git -> repo
  const httpsMatch = url.match(/\/([^\/]+?)(\.git)?$/);
  if (httpsMatch) {
    return httpsMatch[1];
  }

  const sshMatch = url.match(/:([^\/]+\/)?([^\/]+?)(\.git)?$/);
  if (sshMatch) {
    return sshMatch[2];
  }

  return null;
}

// Validate URL format (basic check)
function isValidGitUrl(url: string): boolean {
  // Must start with https://, git@, or git://
  if (!url.match(/^(https:\/\/|git@|git:\/\/)/)) {
    return false;
  }

  // Reject dangerous characters for command injection
  if (/[;&|`$(){}[\]<>\\'\"]/.test(url)) {
    return false;
  }

  return true;
}

// Sanitize folder name
function sanitizeFolderName(name: string): string {
  return name.replace(/[\/\\:*?"<>|]/g, '-').replace(/^\.+/, '');
}

// Execute git clone
async function executeGitClone(
  repositoryUrl: string,
  targetPath: string
): Promise<{ success: boolean; error?: string; errorCode?: GitCloneErrorCode }> {
  return new Promise((resolve) => {
    const gitProcess = spawn('git', ['clone', '--', repositoryUrl, targetPath], {
      timeout: CLONE_TIMEOUT_MS,
    });

    let stderr = '';

    gitProcess.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    gitProcess.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true });
      } else {
        // Determine error type from stderr
        let errorCode: GitCloneErrorCode = 'CLONE_FAILED';
        if (
          stderr.includes('could not read Username') ||
          stderr.includes('Authentication failed') ||
          stderr.includes('Permission denied')
        ) {
          errorCode = 'AUTHENTICATION_FAILED';
        } else if (
          stderr.includes('not found') ||
          stderr.includes('does not exist') ||
          stderr.includes('Could not resolve host')
        ) {
          errorCode = 'REPOSITORY_NOT_FOUND';
        }
        resolve({ success: false, error: stderr.trim(), errorCode });
      }
    });

    gitProcess.on('error', (err) => {
      if (err.message.includes('ETIMEDOUT') || err.message.includes('timeout')) {
        resolve({ success: false, error: 'Clone operation timed out', errorCode: 'TIMEOUT' });
      } else {
        resolve({ success: false, error: err.message, errorCode: 'CLONE_FAILED' });
      }
    });
  });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as GitCloneRequest;
    const { repositoryUrl, targetFolderName } = body;

    // Validate URL
    if (!repositoryUrl || !isValidGitUrl(repositoryUrl)) {
      const result: GitCloneResult = {
        success: false,
        error: 'Invalid Git repository URL',
        errorCode: 'INVALID_URL',
      };
      return NextResponse.json(result, { status: 400 });
    }

    // Extract repository name or use custom folder name
    const repoName = targetFolderName?.trim()
      ? sanitizeFolderName(targetFolderName)
      : extractRepositoryName(repositoryUrl);

    if (!repoName) {
      const result: GitCloneResult = {
        success: false,
        error: 'Could not determine repository name from URL',
        errorCode: 'INVALID_URL',
      };
      return NextResponse.json(result, { status: 400 });
    }

    // Get sandbox settings for base workspace path
    const sandboxSettings = await getSandboxSettings();
    const basePath = sandboxSettings.workspacePath.startsWith('/')
      ? sandboxSettings.workspacePath
      : path.resolve(process.cwd(), sandboxSettings.workspacePath);

    // Resolve target path
    const targetPath = path.resolve(basePath, repoName);

    // Security check: ensure target is within base path
    if (!targetPath.startsWith(basePath + path.sep) && targetPath !== basePath) {
      const result: GitCloneResult = {
        success: false,
        error: 'Access denied: path outside workspace',
        errorCode: 'PATH_OUTSIDE_WORKSPACE',
      };
      return NextResponse.json(result, { status: 403 });
    }

    // Check if folder already exists
    try {
      await fs.access(targetPath);
      const result: GitCloneResult = {
        success: false,
        error: `Folder "${repoName}" already exists. Please specify a different folder name.`,
        errorCode: 'FOLDER_EXISTS',
      };
      return NextResponse.json(result, { status: 409 });
    } catch {
      // Folder doesn't exist, which is what we want
    }

    // Ensure base path exists
    await fs.mkdir(basePath, { recursive: true });

    // Execute git clone
    const cloneResult = await executeGitClone(repositoryUrl, targetPath);

    if (!cloneResult.success) {
      const result: GitCloneResult = {
        success: false,
        error: cloneResult.error || 'Clone failed',
        errorCode: cloneResult.errorCode || 'CLONE_FAILED',
      };
      return NextResponse.json(result, { status: 500 });
    }

    // Return success
    const relativePath = path.relative(basePath, targetPath);
    // Create display path: remove leading ./ from workspacePath and append relativePath
    const cleanWorkspacePath = sandboxSettings.workspacePath.replace(/^\.\//, '');
    const displayPath = `${cleanWorkspacePath}/${relativePath}`;

    const result: GitCloneResult = {
      success: true,
      relativePath,
      displayPath,
      repositoryName: repoName,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to clone repository:', error);
    const result: GitCloneResult = {
      success: false,
      error: 'Failed to clone repository',
      errorCode: 'CLONE_FAILED',
    };
    return NextResponse.json(result, { status: 500 });
  }
}
