import apiClient from './client';

export const dashboardApi = {
  employee: () => apiClient.get('/dashboard/employee').then(r => r.data),
  manager:  () => apiClient.get('/dashboard/manager').then(r => r.data),
};
