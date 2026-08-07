import apiClient from './client';

export const projectsApi = {
  list: (params?: { search?: string; status?: string }) =>
    apiClient.get('/projects', { params }).then(r => r.data),

  getById: (id: string) =>
    apiClient.get(`/projects/${id}`).then(r => r.data),

  create: (data: { name: string; description: string; status: string; priority: string; type?: string; projectType?: string; estimatedHours?: number; endDate?: string; memberIds?: string[] }) =>
    apiClient.post('/projects', data).then(r => r.data),

  update: (id: string, data: Partial<{ name: string; description: string; status: string; priority: string; type?: string; projectType?: string; estimatedHours?: number; endDate?: string; memberIds?: string[] }>) =>
    apiClient.put(`/projects/${id}`, data).then(r => r.data),

  addMember: (id: string, userId: string) =>
    apiClient.post(`/projects/${id}/members`, { userId }).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/projects/${id}`).then(r => r.data),
};

