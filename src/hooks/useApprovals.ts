import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { approvalsApi } from '../api/approvals';
import { useAppStore } from '../store/useAppStore';

export const useApprovals = (filter?: string, searchName?: string, searchDate?: string) => {
  const { role } = useAppStore();
  return useQuery({ queryKey: ['approvals', filter, role, searchName, searchDate], queryFn: () => approvalsApi.list(filter, role, searchName, searchDate), placeholderData: (prev) => prev });
};

export const useApprovalDetails = (id?: string | null) =>
  useQuery({
    queryKey: ['approvals', 'details', id],
    queryFn: () => approvalsApi.getDetails(id!),
    enabled: !!id,
    staleTime: 30_000,
  });

export const useApproveTimesheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approvalsApi.approve,
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['approvals'] });
      qc.setQueriesData({ queryKey: ['approvals'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map(item => item.id === id ? { ...item, status: 'Approved' } : item);
      });
    },
    onSuccess: (updated, id) => {
      qc.setQueriesData({ queryKey: ['approvals'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map(item => item.id === id ? { ...item, status: 'Approved', ...updated } : item);
      });
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useRejectTimesheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      approvalsApi.reject(id, comments),
    onMutate: async ({ id, comments }) => {
      await qc.cancelQueries({ queryKey: ['approvals'] });
      qc.setQueriesData({ queryKey: ['approvals'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map(item => item.id === id ? { ...item, status: 'Rejected', comments: comments || item.comments } : item);
      });
    },
    onSuccess: (updated, { id }) => {
      qc.setQueriesData({ queryKey: ['approvals'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map(item => item.id === id ? { ...item, status: 'Rejected', ...updated } : item);
      });
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useBulkApprove = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: approvalsApi.bulkApprove,
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ['approvals'] });
      qc.setQueriesData({ queryKey: ['approvals'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map(item => ids.includes(item.id) ? { ...item, status: 'Approved' } : item);
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};

export const useBulkReject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, comments }: { ids: string[]; comments?: string }) =>
      approvalsApi.bulkReject(ids, comments),
    onMutate: async ({ ids, comments }) => {
      await qc.cancelQueries({ queryKey: ['approvals'] });
      qc.setQueriesData({ queryKey: ['approvals'] }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.map(item => ids.includes(item.id) ? { ...item, status: 'Rejected', comments: comments || item.comments } : item);
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['approvals'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
