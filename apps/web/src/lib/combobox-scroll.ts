/**
 * Keep the keyboard-selected combobox option visible inside its OWN listbox.
 * The input retains DOM focus and aria-activedescendant; no page-level
 * scrollIntoView call should move the whole clinical workspace.
 */
export function revealActiveSuggestion(list: Pick<HTMLElement, 'scrollTop' | 'clientHeight' | 'offsetTop' | 'children'> | null, index: number) {
  if (!list || !Number.isInteger(index) || index < 0) return;
  const row = list.children.item(index) as HTMLElement | null;
  if (!row) return;
  const top = row.offsetTop - list.offsetTop;
  const bottom = top + row.offsetHeight;
  if (top < list.scrollTop) list.scrollTop = Math.max(0, top);
  else if (bottom > list.scrollTop + list.clientHeight)
    list.scrollTop = Math.max(0, bottom - list.clientHeight);
}
