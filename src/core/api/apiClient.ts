import Config from 'react-native-config';
import { Platform } from 'react-native';
import { sessionAdapter } from '../auth/sessionAdapter';

export interface ApiErrorBody {
  code?: string;
  message?: string;
  details?: unknown;
  requestId?: string;
}

export class ApiError extends Error {
  constructor(public readonly status: number, public readonly body: ApiErrorBody) {
    super(body.message ?? `La API respondió HTTP ${status}`);
  }
}

const developmentUrl = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
});
const baseUrl = (Config.KROW_API_URL?.trim() || (__DEV__ ? developmentUrl : undefined))?.replace(/\/$/, '');

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  if (!baseUrl) throw new Error('KROW_API_URL no está configurada en .env');
  const { data } = await sessionAdapter.getSession();
  const token = data.session?.access_token;
  if (!token) throw new ApiError(401, { code: 'UNAUTHENTICATED', message: 'No hay una sesión activa' });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15_000);
  let response: Response;
  try {
    response = await fetch(`${baseUrl}/v1${path}`, {
      ...options,
      signal: options.signal ?? controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } finally {
    clearTimeout(timeout);
  }
  const body = await response.json().catch(() => null);
  if (!response.ok) throw new ApiError(response.status, body ?? { message: 'Respuesta inválida de la API' });
  return body as T;
}

export function apiQuery(params: Record<string, string | number | undefined>): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
}
