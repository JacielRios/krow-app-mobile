import { createContext, type ComponentType } from 'react';
let layers: symbol[] = [];
const listeners = new Set<() => void>();
export const modalLayers = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => layers.at(-1) ?? null,
  open(id: symbol) {
    if (layers.includes(id)) return;
    layers = [...layers, id];
    listeners.forEach(fn => fn());
  },
  close(id: symbol) {
    layers = layers.filter(layer => layer !== id);
    listeners.forEach(fn => fn());
  },
};
export const DialogLayerContext = createContext<ComponentType<{
  layer: symbol;
}> | null>(null);
