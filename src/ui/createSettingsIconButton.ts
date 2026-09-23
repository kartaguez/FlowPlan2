const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

export function createSettingsIconButton(
  document: Document,
  accessibleName: string,
): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "settings-icon-button";
  button.setAttribute("aria-label", accessibleName);
  button.setAttribute("title", "Settings");

  const icon = document.createElementNS(SVG_NAMESPACE, "svg");
  icon.setAttribute("class", "settings-icon");
  icon.setAttribute("viewBox", "0 0 24 24");
  icon.setAttribute("width", "18");
  icon.setAttribute("height", "18");
  icon.setAttribute("aria-hidden", "true");
  icon.setAttribute("focusable", "false");
  const path = document.createElementNS(SVG_NAMESPACE, "path");
  path.setAttribute(
    "d",
    "M19.14 12.94c.04-.31.06-.63.06-.94s-.02-.63-.07-.94l2.03-1.58-1.92-3.32-2.39.96a7.4 7.4 0 0 0-1.62-.94L14.87 3h-3.84l-.37 3.18c-.58.24-1.12.56-1.62.94l-2.39-.96-1.92 3.32 2.03 1.58a6.5 6.5 0 0 0 0 1.88l-2.03 1.58 1.92 3.32 2.39-.96c.5.38 1.04.7 1.62.94l.37 3.18h3.84l.37-3.18c.58-.24 1.12-.56 1.62-.94l2.39.96 1.92-3.32-2.03-1.58ZM12.95 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7Z",
  );
  icon.append(path);
  button.append(icon);
  return button;
}
