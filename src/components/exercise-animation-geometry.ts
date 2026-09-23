/**
 * Shared 2D pose geometry for exercise animations.
 *
 * Conventions (all animations use one articulated side-view figure):
 * - SVG coordinates: x grows to the right, y grows downward; the floor line is at FLOOR_Y.
 * - Angles are measured from straight up ("from vertical"), in radians, clockwise positive:
 *   0 = up, PI/2 = right (+x), PI = down, -PI/2 = left (−x). This matches `polar`.
 * - LEN is the single source of truth for segment lengths. New pose code should place every
 *   child joint at its canonical distance from its parent (polar / extend / chain) instead of
 *   interpolating joint coordinates independently, which stretches and shrinks limbs.
 */

export type Point = {
  x: number;
  y: number;
};

export type Pose = {
  head: Point;
  shoulder: Point;
  elbow: Point;
  wrist: Point;
  hip: Point;
  knee: Point;
  ankle: Point;
  toe: Point;
  elbow2?: Point;
  wrist2?: Point;
  knee2?: Point;
  ankle2?: Point;
  toe2?: Point;
};

export type PoseJoint = keyof Pose;

export type PoseBuilder = (t: number) => Pose;

export const FLOOR_Y = 300;

export const LEN = {
  torso: 64,
  thigh: 66,
  shin: 64,
  upper: 44,
  lower: 42,
  head: 24,
};

export type SegmentLength = keyof typeof LEN;

/** Canonical rigid segments of the skeleton (second-side limbs included when present). */
export const SEGMENTS: readonly { from: PoseJoint; to: PoseJoint; length: SegmentLength }[] = [
  { from: 'hip', to: 'shoulder', length: 'torso' },
  { from: 'shoulder', to: 'elbow', length: 'upper' },
  { from: 'elbow', to: 'wrist', length: 'lower' },
  { from: 'hip', to: 'knee', length: 'thigh' },
  { from: 'knee', to: 'ankle', length: 'shin' },
  { from: 'shoulder', to: 'elbow2', length: 'upper' },
  { from: 'elbow2', to: 'wrist2', length: 'lower' },
  { from: 'hip', to: 'knee2', length: 'thigh' },
  { from: 'knee2', to: 'ankle2', length: 'shin' },
];

export function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

/** Child joint at `length` from `origin`, in the direction `fromVertical` (see conventions). */
export function polar(origin: Point, fromVertical: number, length: number): Point {
  return {
    x: origin.x + Math.sin(fromVertical) * length,
    y: origin.y - Math.cos(fromVertical) * length,
  };
}

/** Point at exactly `length` from `from`, pointing toward `toward` (fixed-length segment). */
export function extend(from: Point, toward: Point, length: number): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const d = Math.max(Math.hypot(dx, dy), 0.0001);
  return {
    x: from.x + (dx / d) * length,
    y: from.y + (dy / d) * length,
  };
}

/** Direction of `to` as seen from `from`, as an angle from vertical (inverse of `polar`). */
export function angleFromVertical(from: Point, to: Point): number {
  return Math.atan2(to.x - from.x, from.y - to.y);
}

/** Interpolates between two angles along the shorter arc. */
export function lerpAngle(a: number, b: number, t: number): number {
  const delta = Math.atan2(Math.sin(b - a), Math.cos(b - a));
  return a + delta * t;
}

/**
 * Child joint swinging from angle `a` to angle `b` around `origin` at a constant `length`.
 * Use this instead of lerping two joint positions: the segment keeps its canonical length.
 */
export function swingJoint(origin: Point, a: number, b: number, t: number, length: number): Point {
  return polar(origin, lerpAngle(a, b, t), length);
}

/**
 * Builds a chain of joints from `root`, each link at its own absolute angle and length.
 * Returns the joints after the root, in order (e.g. [knee, ankle] for a thigh + shin chain).
 */
export function chain(root: Point, links: readonly { angle: number; length: number }[]): Point[] {
  const joints: Point[] = [];
  let cursor = root;
  for (const link of links) {
    cursor = polar(cursor, link.angle, link.length);
    joints.push(cursor);
  }
  return joints;
}

/** Arm from the shoulder with canonical upper-arm / forearm lengths. */
export function armChain(shoulder: Point, upperAngle: number, lowerAngle: number) {
  const [elbow, wrist] = chain(shoulder, [
    { angle: upperAngle, length: LEN.upper },
    { angle: lowerAngle, length: LEN.lower },
  ]);
  return { elbow, wrist };
}

/** Leg from the hip with canonical thigh / shin lengths. */
export function legChain(hip: Point, thighAngle: number, shinAngle: number) {
  const [knee, ankle] = chain(hip, [
    { angle: thighAngle, length: LEN.thigh },
    { angle: shinAngle, length: LEN.shin },
  ]);
  return { knee, ankle };
}

/**
 * Two-segment limb (arm or leg) from `root` toward `target` with canonical segment lengths.
 * `bend` fixes which side of the root→target direction the middle joint sits on (+1: the side
 * of the direction rotated 90° clockwise on screen), so an elbow or knee never flips to the
 * other side between frames. If the target is out of reach the limb straightens toward it and
 * `end` stops short of the target; segments are never stretched.
 */
export function limb(
  root: Point,
  target: Point,
  upper: number,
  lower: number,
  bend: 1 | -1
): { joint: Point; end: Point } {
  const dx = target.x - root.x;
  const dy = target.y - root.y;
  const d = Math.max(Math.hypot(dx, dy), 0.0001);
  const ux = dx / d;
  const uy = dy / d;
  const reach = Math.min(upper + lower, Math.max(Math.abs(upper - lower), d));
  const along = (upper * upper - lower * lower + reach * reach) / (2 * reach);
  const height = Math.sqrt(Math.max(upper * upper - along * along, 0));
  return {
    joint: { x: root.x + ux * along - uy * height * bend, y: root.y + uy * along + ux * height * bend },
    end: { x: root.x + ux * reach, y: root.y + uy * reach },
  };
}

/**
 * Contact vocabulary for pose families. A contact says that a joint should stay at a fixed
 * reference point (a planted foot, a hand on the floor or bar, a knee on the mat, a hand on a
 * wall or support). Builders declare contacts; the dev validator checks that the joint stays there.
 */
export type ContactKind =
  | 'planted-foot'
  | 'planted-hand'
  | 'knee'
  | 'bar'
  | 'bench'
  | 'wall'
  | 'support';

export type Contact = {
  joint: PoseJoint;
  kind: ContactKind;
  at: Point;
  /** Allowed drift in px before the contact counts as sliding. */
  tolerance?: number;
};

export function contact(joint: PoseJoint, kind: ContactKind, at: Point, tolerance?: number): Contact {
  return { joint, kind, at, tolerance };
}
