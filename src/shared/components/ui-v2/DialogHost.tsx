import React, { useEffect, useSyncExternalStore } from 'react';
import { Dialog } from './Dialog';
import { dialogStore, KrowAlert } from './dialogService';
import { DialogLayerContext, modalLayers } from './modalLayers';
export function DialogHost({ layer }: { layer?: symbol } = {}) {
  const request = useSyncExternalStore(
    dialogStore.subscribe,
    dialogStore.getSnapshot,
  );
  const top = useSyncExternalStore(
    modalLayers.subscribe,
    modalLayers.getSnapshot,
  );
  if (layer ? top !== layer : top !== null) return null;
  return (
    <Dialog
      visible={!!request}
      embedded={!!layer}
      title={request?.title ?? ''}
      message={request?.message ?? ''}
      type={request?.options.type}
      icon={request?.options.icon}
      dismissible={request?.options.cancelable ?? false}
      onDismiss={() => {
        if (request) dialogStore.resolve(request.id);
      }}
      actions={(request?.actions ?? []).map((action, index) => ({
        ...action,
        onPress: () => {
          if (request) dialogStore.resolve(request.id, index);
        },
      }))}
    />
  );
}
function EmbeddedDialogHost({ layer }: { layer: symbol }) {
  return <DialogHost layer={layer} />;
}
export function DialogProvider({ children }: React.PropsWithChildren) {
  useEffect(() => () => KrowAlert.clear(), []);
  return (
    <DialogLayerContext.Provider value={EmbeddedDialogHost}>
      {children}
      <DialogHost />
    </DialogLayerContext.Provider>
  );
}
