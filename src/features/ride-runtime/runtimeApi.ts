import { versionedApiRequest } from '../../core/api/apiClient';
import type {
  LocationSample,
  RuntimeCommand,
  RuntimeSnapshot,
} from './protocol';

export const runtimeApi = {
  snapshot: (rideId: string) =>
    versionedApiRequest<RuntimeSnapshot>('v2', `/rides/${rideId}/session`),
  enroll: (rideId: string) =>
    versionedApiRequest('v2', `/rides/${rideId}/session`, { method: 'POST' }),
  command: (rideId: string, command: RuntimeCommand) =>
    versionedApiRequest<{ version: number }>(
      'v2',
      `/rides/${rideId}/commands`,
      { method: 'POST', body: JSON.stringify(command) },
    ),
  prepareRoute: (rideId: string, expectedVersion: number) =>
    versionedApiRequest('v2', `/rides/${rideId}/route`, {
      method: 'POST',
      body: JSON.stringify({ expectedVersion, reason: 'initial' }),
    }),
  session: (rideId: string, deviceId: string) =>
    versionedApiRequest<{ sessionId: string }>(
      'v2',
      `/rides/${rideId}/location-sessions`,
      { method: 'POST', body: JSON.stringify({ deviceId }) },
    ),
  locations: (rideId: string, samples: LocationSample[]) =>
    versionedApiRequest('v2', `/rides/${rideId}/locations`, {
      method: 'POST',
      body: JSON.stringify({ samples }),
    }),
  closeSession: (rideId: string, sessionId: string) =>
    versionedApiRequest(
      'v2',
      `/rides/${rideId}/location-sessions/${sessionId}`,
      { method: 'DELETE' },
    ),
  incident: (rideId: string, incidentId: string) =>
    versionedApiRequest<{ humanAcknowledged: boolean }>(
      'v2',
      `/rides/${rideId}/incidents`,
      {
        method: 'POST',
        body: JSON.stringify({ incidentId, severity: 'critical' }),
      },
    ),
};

export function newCommandId(): string {
  const bytes = new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 15) | 64;
  bytes[8] = (bytes[8] & 63) | 128;
  const hex = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(
    12,
    16,
  )}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
