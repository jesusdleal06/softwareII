/** Small DOM helpers for component specs (jsdom). */

export function text(root: ParentNode): string {
  return (root as HTMLElement).textContent?.replace(/\s+/g, ' ').trim() ?? '';
}

/** First element matching `selector` whose normalized text contains `label`. */
export function findByText<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string,
  label: string,
): T | null {
  const items = Array.from(root.querySelectorAll<T>(selector));
  return items.find((el) => text(el).includes(label)) ?? null;
}

export function getByText<T extends HTMLElement = HTMLElement>(
  root: ParentNode,
  selector: string,
  label: string,
): T {
  const el = findByText<T>(root, selector, label);
  if (!el) throw new Error(`No <${selector}> containing "${label}"`);
  return el;
}

export function clickButton(root: ParentNode, label: string): void {
  getByText<HTMLButtonElement>(root, 'button', label).click();
}

/** Sets an input value and dispatches the `input` event. */
export function typeInto(input: HTMLInputElement, value: string): void {
  input.value = value;
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Lets pending microtasks and timers run before the next assertion. */
export async function settle(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}
