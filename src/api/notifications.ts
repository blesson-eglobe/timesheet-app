import apiClient from './client';
export const notificationsApi = {
  list: () => apiClient.get('/notifications').then(r => r.data),
  markRead: (id: string) => apiClient.put(`/notifications/${id}/read`).then(r => r.data),
  markAllRead: () => apiClient.put('/notifications/mark-all-read').then(r => r.data),
  sendReminder: (message?: string) => apiClient.post('/notifications/reminder', { message }).then(r => r.data),
};
