import type { ProjectId } from "../../domain/index.js";

export interface ProjectReorderCard {
  readonly handle: HTMLButtonElement;
  readonly item: HTMLElement;
}

export interface CreateProjectReorderControllerInput {
  readonly list: HTMLElement;
  readonly order: readonly ProjectId[];
  readonly cards: ReadonlyMap<ProjectId, ProjectReorderCard>;
  readonly setPreview: (projectId?: ProjectId, targetPosition?: number) => void;
  readonly onReorder: (projectId: ProjectId, targetPosition: number) => void;
}

interface ActiveDrag {
  readonly projectId: ProjectId;
  readonly pointerId: number;
  readonly startX: number;
  readonly startY: number;
  readonly handle: HTMLButtonElement;
  moving: boolean;
}

export function createProjectReorderController(input: CreateProjectReorderControllerInput): { destroy: () => void } {
  const document = input.list.ownerDocument;
  const listeners: Array<{ handle: HTMLButtonElement; down: (event: PointerEvent) => void;
    move: (event: PointerEvent) => void; up: (event: PointerEvent) => void;
    cancel: (event: PointerEvent) => void; key: (event: KeyboardEvent) => void }> = [];
  let active: ActiveDrag | undefined;

  const release = (drag: ActiveDrag): void => {
    if (typeof drag.handle.releasePointerCapture !== "function") return;
    if (typeof drag.handle.hasPointerCapture === "function" && !drag.handle.hasPointerCapture(drag.pointerId)) return;
    drag.handle.releasePointerCapture(drag.pointerId);
  };
  const finish = (commit: boolean, event?: PointerEvent): void => {
    const drag = active;
    if (!drag) return;
    // Clear before release: lostpointercapture may fire synchronously.
    active = undefined;
    const target = commit && drag.moving && event ? positionAt(event.clientX, event.clientY, drag.projectId) : undefined;
    input.setPreview();
    release(drag);
    if (target !== undefined && target !== input.order.indexOf(drag.projectId) + 1) {
      input.onReorder(drag.projectId, target);
    }
  };
  const positionAt = (clientX: number, clientY: number, source: ProjectId): number | undefined => {
    const bounds = input.list.getBoundingClientRect();
    if (clientX < bounds.left || clientX > bounds.right || clientY < bounds.top || clientY > bounds.bottom) return undefined;
    const others = input.order.filter((id) => id !== source);
    for (let index = 0; index < others.length; index += 1) {
      const item = input.cards.get(others[index]!)?.item;
      if (item && clientY < (item.getBoundingClientRect().top + item.getBoundingClientRect().bottom) / 2) {
        return index + 1;
      }
    }
    return others.length + 1;
  };
  const onEscape = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !active) return;
    event.preventDefault();
    finish(false);
  };
  const onVisibility = (): void => { if (document.hidden) finish(false); };
  document.addEventListener("keydown", onEscape);
  document.addEventListener("visibilitychange", onVisibility);

  for (const [projectId, card] of input.cards) {
    const down = (event: PointerEvent): void => {
      if (active || event.isPrimary === false || (event.button !== undefined && event.button !== 0)) return;
      active = { projectId, pointerId: event.pointerId, startX: event.clientX,
        startY: event.clientY, handle: card.handle, moving: false };
      card.handle.setPointerCapture?.(event.pointerId);
      event.preventDefault();
    };
    const move = (event: PointerEvent): void => {
      if (active?.pointerId !== event.pointerId || active.projectId !== projectId) return;
      if (!active.moving && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 4) return;
      active.moving = true;
      input.setPreview(projectId, positionAt(event.clientX, event.clientY, projectId));
    };
    const up = (event: PointerEvent): void => {
      if (active?.pointerId === event.pointerId && active.projectId === projectId) finish(true, event);
    };
    const cancel = (event: PointerEvent): void => {
      if (active?.pointerId === event.pointerId && active.projectId === projectId) finish(false);
    };
    const key = (event: KeyboardEvent): void => {
      if (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey) return;
      const current = input.order.indexOf(projectId) + 1;
      let target: number;
      switch (event.key) {
        case "ArrowUp": target = Math.max(1, current - 1); break;
        case "ArrowDown": target = Math.min(input.order.length, current + 1); break;
        case "Home": target = 1; break;
        case "End": target = input.order.length; break;
        default: return;
      }
      event.preventDefault();
      if (target !== current) input.onReorder(projectId, target);
    };
    card.handle.addEventListener("pointerdown", down);
    card.handle.addEventListener("pointermove", move);
    card.handle.addEventListener("pointerup", up);
    card.handle.addEventListener("pointercancel", cancel);
    card.handle.addEventListener("lostpointercapture", cancel);
    card.handle.addEventListener("keydown", key);
    listeners.push({ handle: card.handle, down, move, up, cancel, key });
  }
  return { destroy: () => {
    finish(false);
    document.removeEventListener("keydown", onEscape);
    document.removeEventListener("visibilitychange", onVisibility);
    for (const listener of listeners) {
      listener.handle.removeEventListener("pointerdown", listener.down);
      listener.handle.removeEventListener("pointermove", listener.move);
      listener.handle.removeEventListener("pointerup", listener.up);
      listener.handle.removeEventListener("pointercancel", listener.cancel);
      listener.handle.removeEventListener("lostpointercapture", listener.cancel);
      listener.handle.removeEventListener("keydown", listener.key);
    }
  } };
}
