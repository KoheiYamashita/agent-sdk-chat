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
