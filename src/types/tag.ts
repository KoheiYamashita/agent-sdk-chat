export interface Tag {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
}

export interface TagWithSessionCount extends Tag {
  sessionCount: number;
}

export interface TagsResponse {
  tags: TagWithSessionCount[];
}

export interface TagCreateRequest {
  name: string;
}

export interface TagUpdateRequest {
  name?: string;
}
