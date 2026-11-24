/** One effective index for highlight, ARIA, scrolling and Enter.
 * Counts can shrink when status, specialty or async request scope changes;
 * a formerly valid index must never point to a visually unselected option.
 */
export function effectiveSuggestionIndex(index: number, count: number): number {
  if (!Number.isSafeInteger(count) || count <= 0) return -1;
  if (!Number.isSafeInteger(index) || index < 0) return 0;
  return Math.min(index, count - 1);
}

/**
 * Keep the keyboard-selected combobox option visible inside its OWN listbox.
 * The input retains DOM focus and aria-activedescendant; no page-level
 * scrollIntoView call should move the whole clinical workspace.
 */
export function revealActiveSuggestion(list: Pick<HTMLElement, 'scrollTop' | 'clientHeight' | 'offsetTop' | 'children'> | null, index: number) {
  if (!list || !Number.isInteger(index) || index < 0) return;
  const row = list.children.item(index) as HTMLElement | null;
  if (!row) return;
  // Rows use the positioned listbox as offsetParent. Subtracting the
  // listbox's offsetTop (relative to the form) would shift every row.
  const top = row.offsetTop;
  const bottom = top + row.offsetHeight;
  if (top < list.scrollTop) list.scrollTop = Math.max(0, top);
  else if (bottom > list.scrollTop + list.clientHeight)
    list.scrollTop = Math.max(0, bottom - list.clientHeight);
}
