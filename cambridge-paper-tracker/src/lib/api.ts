import axios from 'axios';
import { getToken, setToken } from './storage';
import type {
  AuthResponse,
  Filters,
  IgnoredPaper,
  PaperDetailResponse,
  PapersResponse,
  Stats,
  Subject,
  SubjectDetailResponse,
  ToggleResponse,
} from './types';

// Base URL of the backend API.
// - Android emulator reaches the host PC via 10.0.2.2 (http://10.0.2.2:5000/api)
// - A physical phone (Expo Go) needs the PC's LAN IP, e.g. http://192.168.x.x:5000/api
export const API_BASE_URL = 'http://192.168.123.107:5000/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

let cachedToken: string | null = null;
export function setAuthToken(token: string | null) {
  cachedToken = token;
}

api.interceptors.request.use(async (config) => {
  let token = cachedToken;
  if (!token) token = await getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      setAuthToken(null);
      setToken(null);
    }
    return Promise.reject(error);
  }
);

export function errorMessage(error: unknown, fallback: string): string {
  const e = error as { response?: { data?: { error?: string } }; message?: string };
  return e?.response?.data?.error || e?.message || fallback;
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/login', { email, password });
  return data;
}

export async function register(name: string, email: string, password: string): Promise<AuthResponse> {
  const { data } = await api.post('/auth/register', { name, email, password });
  return data;
}

export async function getSubjects(): Promise<Subject[]> {
  const { data } = await api.get('/papers/subjects');
  return data;
}

export async function getFilters(): Promise<Filters> {
  const { data } = await api.get('/papers/filters');
  return data;
}

export async function getPapers(params: Record<string, unknown>): Promise<PapersResponse> {
  const { data } = await api.get('/papers', { params });
  return data;
}

export async function getSubjectDetail(id: number): Promise<SubjectDetailResponse> {
  const { data } = await api.get(`/papers/subject/${id}`);
  return data;
}

export async function getPaperDetail(id: number): Promise<PaperDetailResponse> {
  const { data } = await api.get(`/papers/${id}`);
  return data;
}

export async function getStats(): Promise<Stats> {
  const { data } = await api.get('/papers/stats');
  return data;
}

export async function getProgress(): Promise<{ variant_id: number; completed: number; ignored: number; completed_at?: string | null }[]> {
  const { data } = await api.get('/progress');
  return data;
}

export async function toggleProgress(paperId: number): Promise<ToggleResponse> {
  const { data } = await api.post('/progress/toggle', { paperId });
  return data;
}

export async function toggleIgnore(paperId: number): Promise<ToggleResponse> {
  const { data } = await api.post('/progress/ignore', { paperId });
  return data;
}

export async function updateMe(payload: { name?: string; currentPassword?: string; newPassword?: string }): Promise<{ message: string }> {
  const { data } = await api.put('/auth/me', payload);
  return data;
}

export async function deleteMe(): Promise<{ message: string }> {
  const { data } = await api.delete('/auth/me');
  return data;
}

export type { IgnoredPaper };
