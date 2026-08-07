import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '../api/employees';

export const useEmployees = (params?: { search?: string; department?: string }) =>
  useQuery({ queryKey: ['employees', params], queryFn: () => employeesApi.list(params), staleTime: 60_000, placeholderData: (prev) => prev });

export const useEmployee = (id: string) =>
  useQuery({ queryKey: ['employee', id], queryFn: () => employeesApi.getById(id), enabled: !!id });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
};

export const useUpdateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      employeesApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: ['employee'] });
      qc.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
};
