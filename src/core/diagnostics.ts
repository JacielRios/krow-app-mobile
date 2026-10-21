import { NativeModules, Platform, Share } from 'react-native';
const native = NativeModules.KrowDiagnostics as
  | {
      recordScreenFailure?: (type: string) => void;
      getReport?: () => Promise<string>;
    }
  | undefined;
export function recordScreenFailure(error: Error) {
  try {
    native?.recordScreenFailure?.(error.name);
  } catch {
    /* Diagnostics must never break recovery. */
  }
}
export async function shareDiagnostics() {
  const message =
    (await native?.getReport?.()) ??
    JSON.stringify({ platform: Platform.OS, version: Platform.Version });
  await Share.share({ title: 'Diagnóstico de KROW', message });
}
