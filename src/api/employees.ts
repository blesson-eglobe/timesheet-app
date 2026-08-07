import apiClient from './client';
export const employeesApi = {
  list: (params?: { search?: string; department?: string }) =>
    apiClient.get('/users', { params }).then(r => r.data),
  getById: (id: string) => apiClient.get(`/users/${id}`).then(r => r.data),
  create: (data: { firstName: string; lastName: string; email: string; department?: string; designation?: string; role?: string; password?: string }) =>
    apiClient.post('/users', data).then(r => r.data),
  update: (id: string, data: Record<string, unknown>) => apiClient.put(`/users/${id}`, data).then(r => r.data),
};
