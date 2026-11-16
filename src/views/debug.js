// #/debug: contact sheet of every animation's start and end pose, for checking poses.
import { ANIMS } from '../three/poses.js';
import { renderSheet } from '../three/viewer.js';

export function debugView(root) {
  const sheet = renderSheet(Object.keys(ANIMS), 360);
  root.innerHTML = `<div class="sheet">${sheet.map((s) => `<figure>${s.shots.map((u) => `<img src="${u}" alt="" />`).join('')}<figcaption>${s.key}</figcaption></figure>`).join('')}</div>`;
}
