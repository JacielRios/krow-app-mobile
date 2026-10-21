import type { DialogAction, DialogType } from './Dialog';
export interface AlertOptions {
  cancelable?: boolean;
  onDismiss?: () => void;
  type?: DialogType;
  icon?: string;
}
interface Request {
  id: number;
  title: string;
  message: string;
  actions: DialogAction[];
  options: AlertOptions;
}
let sequence = 0;
let queue: Request[] = [];
const listeners = new Set<() => void>();
function emit() {
  listeners.forEach(listener => listener());
}
const getSnapshot = () => queue[0] ?? null;
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
function resolve(id: number, index?: number) {
  const current = queue[0];
  if (!current || current.id !== id) return;
  queue = queue.slice(1);
  emit();
  if (index !== undefined) current.actions[index]?.onPress?.();
  else current.options.onDismiss?.();
}
/** Alert-compatible entry point, rendered by the themed host in AppContent. */
export const KrowAlert = {
  alert(
    title: string,
    message = '',
    buttons?: DialogAction[],
    options: AlertOptions = {},
  ) {
    const actions = buttons?.length ? buttons : [{ text: 'Entendido' }];
    queue = [
      ...queue,
      {
        id: ++sequence,
        title,
        message,
        actions,
        options: {
          ...options,
          type:
            options.type ??
            (actions.some(a => a.style === 'destructive')
              ? 'warning'
              : actions.length > 1
              ? 'confirmation'
              : 'info'),
        },
      },
    ];
    emit();
    return sequence;
  },
  cancel(id: number) {
    const next = queue.filter(request => request.id !== id);
    if (next.length !== queue.length) {
      queue = next;
      emit();
    }
  },
  clear() {
    queue = [];
    emit();
  },
};
export const dialogStore = { getSnapshot, subscribe, resolve };
