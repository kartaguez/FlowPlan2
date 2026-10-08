/** Owns listener lifetime without owning UI state or drafts. No reattachment after destroy. */
export function createInteractionLifecycle(onSuspend: () => void = () => {}) {
  const listeners: { target: EventTarget; type: string; listener: EventListener; capture: boolean }[] = [];
  let suspended = false, destroyed = false;
  const listen = <E extends Event>(target: EventTarget | undefined, type: string, handler: (event: E) => void, capture = false): void => {
    if (!target) return;
    const listener = handler as EventListener;
    listeners.push({ target, type, listener, capture });
    if (!suspended && !destroyed) target.addEventListener?.(type, listener, capture);
  };
  const suspend = (): void => {
    if (suspended || destroyed) return;
    suspended = true;
    for (const { target, type, listener, capture } of listeners) target.removeEventListener?.(type, listener, capture);
    onSuspend();
  };
  const resume = (): void => {
    if (!suspended || destroyed) return;
    suspended = false;
    for (const { target, type, listener, capture } of listeners) target.addEventListener?.(type, listener, capture);
  };
  const destroy = (): void => { if (destroyed) return; suspend(); destroyed = true; listeners.length = 0; };
  return { listen, suspend, resume, destroy };
}
