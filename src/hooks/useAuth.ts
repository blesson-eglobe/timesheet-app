import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/auth';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

export const useCurrentUser = () =>
  useQuery({
    queryKey: ['currentUser'],
    queryFn: authApi.me,
    retry: false,
    enabled: !!localStorage.getItem('auth_token'),
  });

export const useLogin = () => {
  const { setAuthUser } = useAppStore();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token);
      setAuthUser(data.user, data.token);
      navigate('/dashboard');
    },
  });
};

export const useRegister = () => {
  const { setAuthUser } = useAppStore();
  const navigate = useNavigate();
  return useMutation({
    mutationFn: ({ firstName, lastName, username, email, password }: { firstName: string; lastName: string; username: string; email: string; password: string }) =>
      authApi.register(firstName, lastName, username, email, password),
    onSuccess: (data) => {
      localStorage.setItem('auth_token', data.token);
      setAuthUser(data.user, data.token);
      navigate('/dashboard');
    },
  });
};

export const useLogout = () => {
  const { clearAuth } = useAppStore();
  const navigate = useNavigate();
  const qc = useQueryClient();
  return () => {
    localStorage.removeItem('auth_token');
    clearAuth();
    qc.clear();
    navigate('/login');
  };
};
