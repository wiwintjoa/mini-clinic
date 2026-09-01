import axios from 'axios';
let accessToken: string | null = null;
export const setAccessToken = (token: string | null) => { accessToken = token; };
export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3000/api', withCredentials: true, timeout: 15_000 });
api.interceptors.request.use((config) => { if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`; return config; });
export type Identity = { id: string; email: string; fullName: string; role: 'ADMIN'|'RECEPTIONIST'|'DOCTOR'|'PHARMACIST'|'PATIENT'; permissions: string[] };
export const authApi = {
  login: async (credentials: { email: string; password: string }) => (await api.post<{ data: { accessToken: string; user: Identity } }>('/auth/login', credentials)).data.data,
  refresh: async () => (await api.post<{ data: { accessToken: string; user: Identity } }>('/auth/refresh')).data.data,
  logout: async () => { await api.post('/auth/logout'); },
};
