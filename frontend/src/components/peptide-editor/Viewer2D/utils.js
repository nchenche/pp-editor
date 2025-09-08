// src/utils/svgDom.js
export function addClassName(element, className) {
  if (element) element.classList.add(className);
}

export function removeClassName(element, className) {
  if (element) element.classList.remove(className);
}

export function createRect(group, attr, pad = 10) {
  const bbox = group.getBBox();
  const paddedX = bbox.x - pad;
  const paddedY = bbox.y - pad;
  const paddedWidth = bbox.width + pad * 2;
  const paddedHeight = bbox.height + pad * 2;
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
  rect.setAttribute("x", paddedX);
  rect.setAttribute("y", paddedY);
  rect.setAttribute("width", paddedWidth);
  rect.setAttribute("height", paddedHeight);
  Object.entries(attr).forEach(([key, value]) => rect.setAttribute(key, value));
  return rect;
}

