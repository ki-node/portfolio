export interface ViewportPoint {
  clientX: number;
  clientY: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface NormalizedPoint {
  clientX: number;
  clientY: number;
  xPercent: number;
  yPercent: number;
}

export interface CorePose {
  panX: number;
  panY: number;
  rotateX: number;
  rotateY: number;
  velocityX: number;
  velocityY: number;
}

export type CoreTarget = Pick<CorePose, 'panX' | 'panY' | 'rotateX' | 'rotateY'>;

export const clamp = (value: number, minimum: number, maximum: number): number =>
  Math.min(maximum, Math.max(minimum, value));

export const normalizeViewportPoint = (
  point: ViewportPoint,
  viewport: ViewportSize,
): NormalizedPoint => {
  const width = Math.max(1, viewport.width);
  const height = Math.max(1, viewport.height);
  const clientX = clamp(point.clientX, 0, width);
  const clientY = clamp(point.clientY, 0, height);

  return {
    clientX,
    clientY,
    xPercent: (clientX / width) * 100,
    yPercent: (clientY / height) * 100,
  };
};

export const calculateCoreTarget = (
  point: Pick<NormalizedPoint, 'xPercent' | 'yPercent'>,
  active: boolean,
): CoreTarget => {
  if (!active) {
    return { panX: 0, panY: 0, rotateX: 0, rotateY: 0 };
  }

  return {
    panX: ((point.xPercent - 50) / 50) * 1.35,
    panY: ((point.yPercent - 50) / 50) * 1.05,
    rotateX: ((50 - point.yPercent) / 50) * 4,
    rotateY: ((point.xPercent - 50) / 50) * 6,
  };
};

export const advanceCorePose = (pose: CorePose, target: CoreTarget): CorePose => ({
  panX: pose.panX + (target.panX - pose.panX) * 0.1 + pose.velocityX,
  panY: pose.panY + (target.panY - pose.panY) * 0.1 + pose.velocityY,
  rotateX: pose.rotateX + (target.rotateX - pose.rotateX) * 0.12,
  rotateY: pose.rotateY + (target.rotateY - pose.rotateY) * 0.12,
  velocityX: pose.velocityX * 0.82,
  velocityY: pose.velocityY * 0.82,
});

export const isCoreSettled = (pose: CorePose, target: CoreTarget): boolean =>
  Math.abs(target.panX - pose.panX) < 0.005 &&
  Math.abs(target.panY - pose.panY) < 0.005 &&
  Math.abs(target.rotateX - pose.rotateX) < 0.01 &&
  Math.abs(target.rotateY - pose.rotateY) < 0.01 &&
  Math.abs(pose.velocityX) < 0.001 &&
  Math.abs(pose.velocityY) < 0.001;

export const formatCoordinateLabel = (point: NormalizedPoint): string => {
  const x = Math.round(point.xPercent).toString().padStart(2, '0');
  const y = Math.round(point.yPercent).toString().padStart(2, '0');

  return `X ${x} / Y ${y}`;
};
