/** data-drop value for a drop zone while a task is dragged: the hovered zone is the target, the rest are candidates. */
export function dropState(dragging: boolean, isTarget: boolean): 'target' | 'candidate' | undefined {
  if (!dragging) return undefined;
  return isTarget ? 'target' : 'candidate';
}
