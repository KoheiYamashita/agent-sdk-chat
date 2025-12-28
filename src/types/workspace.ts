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

export interface CreateDirectoryRequest {
  parentPath: string;
  name: string;
}

export interface CreateDirectoryResponse {
  success: boolean;
  path: string;
  relativePath: string;
}

// Git Clone Types
export interface GitCloneRequest {
  repositoryUrl: string;
  targetFolderName?: string;
}

export interface GitCloneResponse {
  success: true;
  relativePath: string;
  displayPath: string;
  repositoryName: string;
}

export type GitCloneErrorCode =
  | 'INVALID_URL'
  | 'REPOSITORY_NOT_FOUND'
  | 'AUTHENTICATION_FAILED'
  | 'FOLDER_EXISTS'
  | 'CLONE_FAILED'
  | 'TIMEOUT'
  | 'PATH_OUTSIDE_WORKSPACE';

export interface GitCloneErrorResponse {
  success: false;
  error: string;
  errorCode: GitCloneErrorCode;
}

export type GitCloneResult = GitCloneResponse | GitCloneErrorResponse;

// File Operations Types
export interface FileReadResponse {
  content: string;
  path: string;
  size: number;
  mimeType: string;
  encoding: 'utf-8' | 'base64';
}

export interface FileSaveRequest {
  path: string;
  content: string;
  encoding?: 'utf-8' | 'base64';
  workspacePath?: string;
}

export interface FileSaveResponse {
  success: boolean;
  path: string;
}

export interface FileCreateRequest {
  parentPath: string;
  name: string;
  isDirectory: boolean;
  workspacePath?: string;
}

export interface FileCreateResponse {
  success: boolean;
  path: string;
  relativePath: string;
  isDirectory: boolean;
}

export interface DeleteRequest {
  path: string;
  workspacePath?: string;
}

export interface DeleteResponse {
  success: boolean;
  path: string;
}

export interface RenameRequest {
  oldPath: string;
  newName: string;
  workspacePath?: string;
}

export interface RenameResponse {
  success: boolean;
  oldPath: string;
  newPath: string;
}
