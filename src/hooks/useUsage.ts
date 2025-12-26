'use client';

import { useQuery } from '@tanstack/react-query';
import type { UsageData } from '@/types';

const USAGE_QUERY_KEY = ['usage'];

interface UsageApiResponse {
  data?: UsageData;
  error?: string;
  message?: string;
}

async function fetchUsage(): Promise<UsageApiResponse> {
  const response = await fetch('/api/usage');
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'Failed to fetch usage');
  }

  return data;
}

export function useUsage() {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: USAGE_QUERY_KEY,
    queryFn: fetchUsage,
    staleTime: 1000 * 60 * 1, // 1 minute
    retry: false,
  });

  return {
    usage: data?.data ?? null,
    isLoading,
    error: error instanceof Error ? error.message : null,
    refetch,
  };
}
