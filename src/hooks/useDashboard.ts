import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../api/dashboard';

export const useEmployeeDashboard = () =>
  useQuery({ queryKey: ['dashboard', 'employee'], queryFn: dashboardApi.employee, staleTime: 60_000 });

export const useManagerDashboard = () =>
  useQuery({ queryKey: ['dashboard', 'manager'], queryFn: dashboardApi.manager, staleTime: 60_000 });
