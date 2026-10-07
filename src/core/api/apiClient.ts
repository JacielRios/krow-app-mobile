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
  constructor(
    public readonly status: number,
    public readonly body: ApiErrorBody,
  ) {
    super(body.message ?? `La API respondió HTTP ${status}`);
  }
}

const developmentUrl = Platform.select({
  android: 'http://10.0.2.2:3000',
  ios: 'http://localhost:3000',
});
const baseUrl = (
  Config.KROW_API_URL?.trim() || (__DEV__ ? developmentUrl : undefined)
)?.replace(/\/$/, '');

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return versionedApiRequest<T>('v1', path, options);
}

export function apiBaseUrl(): string {
  if (!baseUrl) throw new Error('KROW_API_URL no está configurada');
  return baseUrl;
}

export async function versionedApiRequest<T>(
  version: 'v1' | 'v2',
  path: string,
  options: RequestInit = {},
): Promise<T> {
  if (!baseUrl) throw new Error('KROW_API_URL no está configurada en .env');
  const { data } = await sessionAdapter.getSession();
  const token = data.session?.access_token;
  if (!token)
    throw new ApiError(401, {
      code: 'UNAUTHENTICATED',
      message: 'No hay una sesión activa',
    });

  const controller = new AbortController();
  let timedOut = false;
  const cancel = () => controller.abort();
  if (options.signal?.aborted) cancel();
  else options.signal?.addEventListener('abort', cancel, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 15_000);
  try {
    const response = await fetch(`${baseUrl}/${version}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
    const body = await response.json().catch(error => {
      if (controller.signal.aborted) throw error;
      if (response.ok && response.status !== 204)
        throw new ApiError(502, {
          code: 'INVALID_RESPONSE',
          message: 'KROW devolvió una respuesta incompleta. Vuelve a intentar.',
        });
      return null;
    });
    if (!response.ok)
      throw new ApiError(
        response.status,
        body ?? { message: 'Respuesta inválida de la API' },
      );
    return body as T;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    if (timedOut)
      throw new ApiError(408, {
        code: 'REQUEST_TIMEOUT',
        message:
          'KROW tardó demasiado en responder. Revisa tu conexión y vuelve a intentar.',
      });
    if (error instanceof TypeError)
      throw new ApiError(0, {
        code: 'NETWORK_UNAVAILABLE',
        message:
          'No pudimos conectar con KROW. Revisa tu conexión e intenta de nuevo.',
      });
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', cancel);
  }
}

export function apiQuery(
  params: Record<string, string | number | undefined>,
): string {
  return Object.entries(params)
    .filter(([, value]) => value !== undefined)
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`,
    )
    .join('&');
}
