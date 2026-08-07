import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { notificationsApi } from '../api/notifications';

export const getLocalReminders = (): any[] => {
  try {
    const raw = localStorage.getItem('hr_reminder_notifications');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const useNotifications = () =>
  useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      let serverNotifs: any[] = [];
      try {
        serverNotifs = await notificationsApi.list();
      } catch {
        serverNotifs = [];
      }
      const localNotifs = getLocalReminders();
      const combined = [...localNotifs, ...serverNotifs];
      return combined;
    },
    staleTime: 10_000,
  });

export const useMarkRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const local = getLocalReminders();
      if (local.some((n: any) => n.id === id)) {
        const updated = local.map((n: any) => (n.id === id ? { ...n, read: true } : n));
        localStorage.setItem('hr_reminder_notifications', JSON.stringify(updated));
        return { ok: true };
      }
      return notificationsApi.markRead(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notifications'] }),
  });
};

export const useSendReminder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ message }: { message: string }) => {
      const existing = getLocalReminders();
      const newNotif = {
        id: 'rem_' + Date.now(),
        type: 'reminder',
        message: message || 'HR (Reshma) sent a reminder to review and approve pending timesheets.',
        time: 'Just now',
        read: false,
      };
      const updated = [newNotif, ...existing];
      localStorage.setItem('hr_reminder_notifications', JSON.stringify(updated));
      localStorage.setItem('hr_reminder_active', JSON.stringify({ active: true, timestamp: Date.now(), message }));

      try {
        await notificationsApi.sendReminder(message);
      } catch (e) {
        console.warn('Backend sendReminder call failed, stored locally:', e);
      }
      return { ok: true, notif: newNotif };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['hr_reminder'] });
    },
  });
};
