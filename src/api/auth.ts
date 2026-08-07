import apiClient from './client';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'supersecret_aes_key_2026';

const encryptPassword = (password: string) => {
  return CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();
};

export interface LoginResponse {
  token: string;
  user: {
    id: string; name: string; firstName: string; lastName: string;
    email: string; role: 'employee' | 'manager'; department: string;
    designation: string; initials: string; color: string; avatar: string; status: string;
  };
}

export const authApi = {
  login: (email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/login', { email, password: encryptPassword(password) }).then(r => r.data),

  register: (firstName: string, lastName: string, username: string, email: string, password: string) =>
    apiClient.post<LoginResponse>('/auth/register', { firstName, lastName, username, email, password: encryptPassword(password) }).then(r => r.data),

  me: () =>
    apiClient.get<LoginResponse['user']>('/auth/me').then(r => r.data),

  checkUsername: (username: string, fullName?: string) =>
    apiClient.post('/auth/check-username', { username, fullName }).then(r => r.data),
};
