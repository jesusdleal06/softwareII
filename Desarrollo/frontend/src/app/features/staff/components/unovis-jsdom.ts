/**
 * jsdom gaps that Unovis hits while rendering charts. Test support only: nothing
 * in the application imports this file, so it never reaches the browser bundle.
 *
 * Unovis measures labels with `SVGTextContentElement.getComputedTextLength()`,
 * which jsdom does not implement. Without a stand-in the axis throws while
 * measuring tick labels and the tests report an unhandled error.
 */
type TextMeasurable = {
  getComputedTextLength?: () => number;
  getBBox?: () => { x: number; y: number; width: number; height: number };
};

const svgProto = globalThis.SVGElement?.prototype as (SVGElement & TextMeasurable) | undefined;

if (svgProto && typeof svgProto.getComputedTextLength !== 'function') {
  Object.defineProperty(svgProto, 'getComputedTextLength', {
    configurable: true,
    writable: true,
    value(this: SVGElement): number {
      return (this.textContent ?? '').length * 7;
    },
  });
}

if (svgProto && typeof svgProto.getBBox !== 'function') {
  Object.defineProperty(svgProto, 'getBBox', {
    configurable: true,
    writable: true,
    value(): { x: number; y: number; width: number; height: number } {
      return { x: 0, y: 0, width: 0, height: 0 };
    },
  });
}

export {};
