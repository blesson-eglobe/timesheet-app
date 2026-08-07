import apiClient from './client';
export const approvalsApi = {
  list: (filter?: string, role?: string, searchName?: string, searchDate?: string) => apiClient.get('/approvals', { params: { filter, role, searchName, searchDate } }).then(r => r.data),
  getDetails: (id: string) => apiClient.get(`/approvals/${id}/details`).then(r => r.data),
  approve: (id: string) => apiClient.put(`/approvals/${id}/approve`).then(r => r.data),
  reject: (id: string, comments?: string) => apiClient.put(`/approvals/${id}/reject`, { comments }).then(r => r.data),
  update: (id: string, data: any) => apiClient.put(`/approvals/${id}/update`, data).then(r => r.data),
  bulkApprove: (ids: string[]) => apiClient.post('/approvals/bulk-approve', { ids }).then(r => r.data),
  bulkReject: (ids: string[], comments?: string) => apiClient.post('/approvals/bulk-reject', { ids, comments }).then(r => r.data),
};
