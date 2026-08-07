import apiClient from './client';
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'supersecret_aes_key_2026';
const encryptPassword = (password: string) =>
  CryptoJS.AES.encrypt(password, ENCRYPTION_KEY).toString();

export interface InviteInfo {
  email: string;
  role: 'employee' | 'manager' | 'admin';
  department: string;
  invitedBy: string;
}

export interface CreateInviteResponse {
  token: string;
  inviteUrl: string;
  expiresAt: string;
}

export const invitesApi = {
  /** Admin creates an invite (authenticated) */
  create: (data: { email: string; role: string; department: string }): Promise<CreateInviteResponse> =>
    apiClient.post('/invites', data).then(r => r.data),

  /** Validate token before the accept-invite page renders (public) */
  validate: (token: string): Promise<InviteInfo> =>
    apiClient.get('/invites/validate', { params: { token } }).then(r => r.data),

  /** Accept the invite — create account and return auth data (public) */
  accept: (data: {
    token: string;
    firstName: string;
    lastName: string;
    username: string;
    password: string;
  }) =>
    apiClient
      .post('/invites/accept', {
        ...data,
        password: encryptPassword(data.password),
      })
      .then(r => r.data),
};
