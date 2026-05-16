// const int = Math.trunc;
const int = Math.round;
export type Rect = { x?: number; y?: number; w: number; h: number };
export type ImageRect = Rect & { type: "image"; image: ImageBitmap };
export type DummyRect = Rect & { type: "dummy" };
export type SourceRect = ImageRect | DummyRect;
export const vals = (...rects: Partial<Rect>[]) => {
  const { x = 0, y = 0, w = 1, h = 1 } = Object.assign({}, ...rects);
  return [x, y, w, h] as [number, number, number, number];
};
export interface Padding {
  top?: number;
  left?: number;
  right?: number;
  bottom?: number;
}

export const newImageRect = (
  image: ImageBitmap,
  { top = 0, left = 0, right = 0, bottom = 0 }: Padding = {},
): ImageRect => ({
  w: image.width - left - right,
  h: image.height - top - bottom,
  x: left,
  y: top,
  type: "image",
  image,
});

const isWindowFrame = (
  { width, height }: ImageBitmap,
  { ratio = 16 / 9 } = {},
) =>
  ((width - 2) - (height - 32) * ratio) ** 2 < 2 ||
  (width - (height - 30) * ratio) ** 2 < 2;
const windowFramePadding = { top: 31, left: 1, right: 1, bottom: 1 };
const countBlackPix = (data: Uint8ClampedArray) => {
  let pix = 0;
  for (let i = 0; i < data.length; i += 4, pix++) {
    if (data[i] > 5 || data[i + 1] > 5 || data[i + 2] > 5) break;
  }
  return pix;
};
interface CacheOptions {
  cache?: Map<string, Padding>;
}
export const newBlackbarCache = () => new Map<string, Padding>();
const getBlackbar = (image: ImageBitmap, { cache }: CacheOptions = {}) => {
  const MAX_BAR = 300;
  const ctx = new OffscreenCanvas(MAX_BAR, MAX_BAR).getContext("2d")!;
  const { w, h } = newImageRect(image);
  const id = `${w},${h}`;
  if (cache?.has(id)) return cache.get(id)!;

  const rectH = { w: MAX_BAR, h: 1 };
  const rectV = { w: 1, h: MAX_BAR };
  const rectRevH = { w: -MAX_BAR, h: 1, x: w, y: int(h * 0.7) };
  const rectRevV = { w: 1, h: -MAX_BAR, x: int(w * 0.7), y: h };

  ctx.drawImage(image, ...vals(rectH, { y: int(h * 0.3) }), ...vals(rectH));
  const left = countBlackPix(ctx.getImageData(...vals(rectH)).data);
  ctx.drawImage(image, ...vals(rectV, { x: int(w * 0.3) }), ...vals(rectV));
  const top = countBlackPix(ctx.getImageData(...vals(rectV)).data);

  ctx.drawImage(image, ...vals(rectRevH), ...vals(rectH));
  const right = countBlackPix(ctx.getImageData(...vals(rectH)).data);
  ctx.drawImage(image, ...vals(rectRevV), ...vals(rectV));
  const bottom = countBlackPix(ctx.getImageData(...vals(rectV)).data);

  cache?.set(id, { left, top, right, bottom });
  return { left, top, right, bottom };
};

interface TrimOptions {
  window?: boolean;
  blackbar?: boolean;
}
export const trim = (
  image: ImageBitmap,
  { window = true, blackbar = true, cache }: TrimOptions & CacheOptions = {},
) => {
  if (window && isWindowFrame(image)) {
    return windowFramePadding;
  }
  if (blackbar) {
    return getBlackbar(image, { cache });
  }
  return {};
};

export const getDummy = (
  { w = 320, h = 320 }: Partial<Rect> = {},
) => ({ type: "dummy", w, h } satisfies DummyRect);

type Fit = "cover" | "contain";
type cropOptions = { ratio?: number; fit?: Fit };
export const crop = <R extends Rect>(
  rect: R,
  { ratio = (16 / 9), fit = "cover" }: cropOptions = {},
): R => {
  if (ratio <= 0) return rect;
  let { x = 0, y = 0, w, h } = rect;
  if (fit === "cover" && w / h > ratio || fit === "contain" && w / h < ratio) {
    w = int(h * ratio);
    x += int((rect.w - w) / 2);
    return { ...rect, w, x };
  }
  h = int(w / ratio);
  y += int((rect.h - h) / 2);
  return { ...rect, h, y };
};

type MergeOptions = Partial<Rect> & { fit?: Fit };
export const mergeVertical = (
  srcs: Rect[],
  options: MergeOptions = {},
): Rect & { dists: Rect[] } => {
  if (!srcs.length) return { w: 1, h: 1, dists: [] };
  const ratio = 1 / srcs.reduce((sum, { w, h }) => sum + h / w, 0);

  let { x = 0, y = 0, w, h } = options;
  if (h) {
    w ??= int(h * ratio);
  } else {
    w ??= Math.min(...srcs.map(({ w }) => w));
    h = int(w / ratio);
  }
  const canvasRect = { w, h };
  ({ x, y, w, h } = crop({ x, y, w, h }, { ratio, fit: "contain" }));
  let nextY = y;
  const dists = srcs.map((rect) => {
    const h = int(rect.h * w / rect.w);
    const y = nextY;
    nextY += h;
    return { x, y, w, h };
  });
  return { ...canvasRect, dists };
};
export const mergeHorizontal = (
  srcs: Rect[],
  options: MergeOptions = {},
): Rect & { dists: Rect[] } => {
  if (!srcs.length) return { w: 1, h: 1, dists: [] };
  const ratio = srcs.reduce((sum, { w, h }) => sum + w / h, 0);
  let { x = 0, y = 0, w, h } = options;
  if (w) {
    h ??= int(w / ratio);
  } else {
    h ??= Math.min(...srcs.map(({ h }) => h));
    w = int(h * ratio);
  }
  const canvasRect = { w, h };
  ({ x, y, w, h } = crop({ x, y, w, h }, { ratio, fit: "contain" }));
  let nextX = x;
  const dists = srcs.map((rect) => {
    const w = int(rect.w * h / rect.h);
    const x = nextX;
    nextX += w;
    return { x, y, w, h };
  });
  return { ...canvasRect, dists };
};
