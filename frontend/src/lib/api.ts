import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

// ============================================================================
// Types
// ============================================================================

export interface Site {
  id: string;
  name: string;
  location: string;
  emission_limit: string;
  total_emissions_to_date: string;
  status: 'Within Limit' | 'Limit Exceeded';
  created_at?: string;
}

export interface SiteMetrics {
  site_id: string;
  name: string;
  location: string;
  emission_limit: string;
  total_emissions_to_date: string;
  status: 'Within Limit' | 'Limit Exceeded';
  readings_count: number;
  last_reading_at: string | null;
}

export interface Reading {
  value: number;
  recorded_at: string;
}

export interface IngestionResponse {
  batch_key: string;
  readings_processed: number;
  total_value: number;
  duplicate: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: number | string;
    message: string;
    details?: any;
  };
}

// ============================================================================
// Raw API Calls
// ============================================================================

async function apiCall<T>(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse<T>> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    throw {
      status: response.status,
      ...data,
    };
  }

  return data;
}

// ============================================================================
// Site API Calls
// ============================================================================

export async function createSite(payload: {
  name: string;
  location: string;
  emission_limit: number;
}): Promise<Site> {
  const response = await apiCall<Site>('/sites', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data!;
}

export async function listSites(): Promise<Site[]> {
  const response = await apiCall<Site[]>('/sites');
  return response.data!;
}

export async function getSiteMetrics(siteId: string): Promise<SiteMetrics> {
  const response = await apiCall<SiteMetrics>(`/sites/${siteId}/metrics`);
  return response.data!;
}

// ============================================================================
// Ingestion API Calls
// ============================================================================

export async function submitIngestion(payload: {
  site_id: string;
  batch_key: string;
  readings: Reading[];
}): Promise<IngestionResponse> {
  const response = await apiCall<IngestionResponse>('/ingest', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data!;
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Fetch all sites
 */
export function useSites() {
  return useQuery({
    queryKey: ['sites'],
    queryFn: listSites,
    staleTime: 30 * 1000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
  });
}

/**
 * Fetch metrics for a specific site
 */
export function useSiteMetrics(siteId: string | null) {
  return useQuery({
    queryKey: ['site', siteId, 'metrics'],
    queryFn: () => getSiteMetrics(siteId!),
    enabled: !!siteId,
    staleTime: 10 * 1000, // 10 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Create a new site
 */
export function useCreateSite() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  return useMutation({
    mutationFn: createSite,
    onSuccess: () => {
      // Invalidate sites list to refetch
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setError(null);
    },
    onError: (err: any) => {
      const errorMessage =
        err.error?.message ||
        err.message ||
        'Failed to create site';
      setError(errorMessage);
    },
  });
}

/**
 * Submit batch ingestion
 */
export function useSubmitIngestion() {
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  return useMutation({
    mutationFn: submitIngestion,
    onSuccess: (data, variables) => {
      // Invalidate the specific site's metrics to refetch
      queryClient.invalidateQueries({
        queryKey: ['site', variables.site_id, 'metrics'],
      });
      // Also invalidate sites list in case total changed
      queryClient.invalidateQueries({ queryKey: ['sites'] });
      setError(null);
    },
    onError: (err: any) => {
      const errorMessage =
        err.error?.message ||
        err.message ||
        'Failed to submit ingestion';
      setError(errorMessage);
    },
  });
}
