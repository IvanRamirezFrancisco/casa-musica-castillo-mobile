export interface Point { x: number; y: number }
export interface Size { width: number; height: number }
export interface PhotoTransform extends Point { scale: number }

export const MAX_PHOTO_ZOOM = 4;
export const ORIGINAL_PHOTO: PhotoTransform = { scale: 1, x: 0, y: 0 };
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export function containPhoto(viewport: Size, natural: Size): Size {
  if (!viewport.width || !viewport.height || !natural.width || !natural.height) return { width: 0, height: 0 };
  const ratio = Math.min(viewport.width / natural.width, viewport.height / natural.height);
  return { width: natural.width * ratio, height: natural.height * ratio };
}

export function boundPhoto(transform: PhotoTransform, viewport: Size, photo: Size): PhotoTransform {
  const limitX = Math.max(0, (photo.width * transform.scale - viewport.width) / 2);
  const limitY = Math.max(0, (photo.height * transform.scale - viewport.height) / 2);
  return { scale: transform.scale, x: clamp(transform.x, -limitX, limitX), y: clamp(transform.y, -limitY, limitY) };
}

/** Both points are relative to the center of the viewport. */
export function zoomPhoto(start: PhotoTransform, scale: number, anchor: Point, destination = anchor): PhotoTransform {
  const nextScale = clamp(scale, 1, MAX_PHOTO_ZOOM);
  const ratio = nextScale / start.scale;
  return { scale: nextScale, x: destination.x - (anchor.x - start.x) * ratio, y: destination.y - (anchor.y - start.y) * ratio };
}
