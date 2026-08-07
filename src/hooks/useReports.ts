import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/reports';

export const useReports = (params?: { from?: string; to?: string; userId?: string }) =>
  useQuery({ queryKey: ['reports', params], queryFn: () => reportsApi.get(params), staleTime: 120_000 });
