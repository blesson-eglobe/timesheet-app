import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { workLogsApi } from '../api/workLogs';

export const useWorkLogs = (params?: { weekStart?: string; search?: string }) =>
  useQuery({ queryKey: ['workLogs', params], queryFn: () => workLogsApi.list(params), staleTime: 30_000, placeholderData: (prev) => prev });

export const useCreateWorkLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workLogsApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workLogs'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useUpdateWorkLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Parameters<typeof workLogsApi.update>[1] }) =>
      workLogsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workLogs'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useDeleteWorkLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workLogsApi.delete,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workLogs'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};

export const useSubmitWeek = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: workLogsApi.submitWeek,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['workLogs'] });
      qc.invalidateQueries({ queryKey: ['projects'] });
      qc.invalidateQueries({ queryKey: ['project'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
      qc.invalidateQueries({ queryKey: ['reports'] });
    },
  });
};
