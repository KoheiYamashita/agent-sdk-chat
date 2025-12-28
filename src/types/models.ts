/**
 * Model-related type definitions
 */

// Standard model from SDK (matches SDK's ModelInfo type)
export interface StandardModel {
  id: string; // SDK ModelInfo.value - the actual model ID used in API calls
  displayName: string; // SDK ModelInfo.displayName
  description: string; // SDK ModelInfo.description
}

// Custom model (matches Prisma CustomModel)
export interface CustomModel {
  id: string;
  name: string;
  displayName: string;
  baseModel: string; // Standard model ID from SDK
  systemPrompt?: string | null;
  description?: string | null;
  icon?: string | null; // Lucide icon name or emoji
  iconColor?: string | null;
  iconImageUrl?: string | null; // Custom image URL for icon
  isEnabled: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

// Unified model type for selection UI
export interface SelectableModel {
  type: 'standard' | 'custom';
  id: string; // For standard: model ID, for custom: cuid
  displayName: string;
  description?: string;
  icon?: string | null;
  iconColor?: string | null;
  iconImageUrl?: string | null; // Custom image URL for icon
  baseModelId: string; // The actual model ID to use in API calls
  systemPrompt?: string | null;
}

// API Request types
export interface CustomModelCreateRequest {
  name: string;
  displayName: string;
  baseModel: string;
  systemPrompt?: string;
  description?: string;
  icon?: string;
  iconColor?: string;
  iconImageUrl?: string;
}

export interface CustomModelUpdateRequest {
  name?: string;
  displayName?: string;
  baseModel?: string;
  systemPrompt?: string | null;
  description?: string | null;
  icon?: string | null;
  iconColor?: string | null;
  iconImageUrl?: string | null;
  isEnabled?: boolean;
  sortOrder?: number;
}

// API Response types
export interface StandardModelsResponse {
  models: StandardModel[];
}

export interface CustomModelsResponse {
  models: CustomModel[];
}

export interface AllModelsResponse {
  standardModels: StandardModel[];
  customModels: CustomModel[];
}
