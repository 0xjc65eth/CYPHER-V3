'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { type AlertUnion } from '@/lib/alerts/alert-engine';

interface CreateAlertInput {
  type: string;
  asset: string;
  assetType?: string;
  name: string;
  description?: string;
  condition?: string;
  targetPrice?: number;
  targetValue?: number;
  multiplier?: number;
  timeframe?: string;
  threshold?: number;
  direction?: string;
  milestone?: string;
  trendType?: string;
  sensitivity?: string;
  notifyInApp?: boolean;
  notifyEmail?: boolean;
  notifyPush?: boolean;
  oneTime?: boolean;
  expiresAt?: number;
}

interface UpdateAlertInput extends Partial<CreateAlertInput> {
  id: string;
  status?: 'active' | 'inactive' | 'triggered';
}

export function useAlerts(userId?: string) {
  const queryClient = useQueryClient();

  // Fetch all alerts
  const { data, isLoading, error, refetch } = useQuery<{
    success: boolean;
    data: AlertUnion[];
    count: number;
  }>({
    queryKey: ['alerts', userId],
    queryFn: async () => {
      const url = userId ? `/api/alerts?userId=${userId}` : '/api/alerts';
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch alerts: ${response.statusText}`);
      }

      return response.json();
    },
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });

  // Create alert mutation
  const createAlert = useMutation({
    mutationFn: async (input: CreateAlertInput) => {
      const response = await fetch('/api/alerts/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...input,
          userId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create alert');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] });
    },
  });

  // Update alert mutation
  const updateAlert = useMutation({
    mutationFn: async (input: UpdateAlertInput) => {
      const response = await fetch('/api/alerts/', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update alert');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] });
    },
  });

  // Delete alert mutation
  const deleteAlert = useMutation({
    mutationFn: async (alertId: string) => {
      const response = await fetch(`/api/alerts/?id=${alertId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete alert');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts', userId] });
    },
  });

  // Toggle alert status
  const toggleAlert = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: 'active' | 'inactive' }) => {
      return updateAlert.mutateAsync({ id, status });
    },
  });

  return {
    alerts: data?.data || [],
    alertCount: data?.count || 0,
    isLoading,
    error,
    refetch,
    createAlert,
    updateAlert,
    deleteAlert,
    toggleAlert,
  };
}
