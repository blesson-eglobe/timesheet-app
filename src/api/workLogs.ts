import apiClient from './client';

export const workLogsApi = {
  list: (params?: { weekStart?: string; search?: string; page?: number }) =>
    apiClient.get('/work-logs', { params }).then(r => r.data),

  create: (data: {
    projectId: string; taskName: string; taskDescription?: string;
    hours: number; date: string; status: string; taskStatus?: string;
    tickets?: { ticketNumber: string; ticketUrl?: string; provider?: string }[];
  }) => apiClient.post('/work-logs', data).then(r => r.data),

  update: (id: string, data: Partial<{ projectId: string; taskName: string; taskDescription: string; hours: number; date: string; status: string; taskStatus: string }>) =>
    apiClient.put(`/work-logs/${id}`, data).then(r => r.data),

  delete: (id: string) =>
    apiClient.delete(`/work-logs/${id}`).then(r => r.data),

  submitWeek: (weekStart: string) =>
    apiClient.post('/work-logs/submit-week', { weekStart }).then(r => r.data),
};
