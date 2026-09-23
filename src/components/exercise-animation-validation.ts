/**
 * Development diagnostics for exercise-animation poses. Pure functions: nothing here runs
 * unless dev code calls it, and nothing throws — problems are returned as issues.
 */
import {
  FLOOR_Y,
  LEN,
  SEGMENTS,
  type Contact,
  type Point,
  type Pose,
  type PoseBuilder,
  type PoseJoint,
} from '@/components/exercise-animation-geometry';

/** The audit's sample points: start, quarter, mid, three-quarter and end of one pose interpolation. */
export const POSE_SAMPLE_TS = [0, 0.25, 0.5, 0.75, 1] as const;

/** Dense samples used for continuity checks. */
export const DENSE_SAMPLE_COUNT = 400;

export type PoseIssue =
  | { kind: 'invalid'; joint: PoseJoint; message: string }
  | { kind: 'bone'; joint: PoseJoint; message: string; actual: number; expected: number }
  | { kind: 'floor'; joint: PoseJoint; message: string; depth: number }
  | { kind: 'contact'; joint: PoseJoint; message: string; drift: number };

export type PoseValidationOptions = {
  /** Allowed segment-length error in px. */
  boneTolerance?: number;
  /** Allowed depth below the floor line in px. */
  floorTolerance?: number;
  contacts?: readonly Contact[];
};

const DEFAULT_BONE_TOLERANCE = 1.5;
const DEFAULT_FLOOR_TOLERANCE = 0.5;
const DEFAULT_CONTACT_TOLERANCE = 1.5;
const DEFAULT_JUMP_THRESHOLD = 10;

function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function isFinitePoint(point: Point) {
  return Number.isFinite(point.x) && Number.isFinite(point.y);
}

function presentJoints(pose: Pose): [PoseJoint, Point][] {
  return (Object.keys(pose) as PoseJoint[])
    .map((joint): [PoseJoint, Point | undefined] => [joint, pose[joint]])
    .filter((entry): entry is [PoseJoint, Point] => entry[1] != null);
}

/** Checks one pose: finite coordinates, canonical segment lengths, floor penetration, contacts. */
export function validatePose(pose: Pose, options: PoseValidationOptions = {}): PoseIssue[] {
  const boneTolerance = options.boneTolerance ?? DEFAULT_BONE_TOLERANCE;
  const floorTolerance = options.floorTolerance ?? DEFAULT_FLOOR_TOLERANCE;
  const issues: PoseIssue[] = [];
  const invalid = new Set<PoseJoint>();

  for (const [joint, point] of presentJoints(pose)) {
    if (!isFinitePoint(point)) {
      invalid.add(joint);
      issues.push({ kind: 'invalid', joint, message: `${joint} has a non-finite coordinate` });
      continue;
    }
    const depth = point.y - FLOOR_Y;
    if (depth > floorTolerance) {
      issues.push({ kind: 'floor', joint, depth, message: `${joint} is ${depth.toFixed(1)}px below the floor` });
    }
  }

  for (const segment of SEGMENTS) {
    const from = pose[segment.from];
    const to = pose[segment.to];
    if (!from || !to || invalid.has(segment.from) || invalid.has(segment.to)) {
      continue;
    }
    const actual = distance(from, to);
    const expected = LEN[segment.length];
    if (Math.abs(actual - expected) > boneTolerance) {
      issues.push({
        kind: 'bone',
        joint: segment.to,
        actual,
        expected,
        message: `${segment.from}→${segment.to} (${segment.length}) is ${actual.toFixed(1)}px, expected ${expected}`,
      });
    }
  }

  if (options.contacts) {
    issues.push(...checkContacts(pose, options.contacts));
  }
  return issues;
}

/** Reports contacts whose joint has drifted away from its reference point. */
export function checkContacts(pose: Pose, contacts: readonly Contact[]): PoseIssue[] {
  const issues: PoseIssue[] = [];
  for (const item of contacts) {
    const point = pose[item.joint];
    if (!point || !isFinitePoint(point)) {
      continue;
    }
    const drift = distance(point, item.at);
    if (drift > (item.tolerance ?? DEFAULT_CONTACT_TOLERANCE)) {
      issues.push({
        kind: 'contact',
        joint: item.joint,
        drift,
        message: `${item.joint} (${item.kind}) drifted ${drift.toFixed(1)}px from its contact point`,
      });
    }
  }
  return issues;
}

export type PoseJump = { joint: PoseJoint; distance: number; fromT: number; toT: number };

/** Joints that move more than `threshold` px between two successive samples. */
export function findDiscontinuities(
  samples: readonly { t: number; pose: Pose }[],
  threshold = DEFAULT_JUMP_THRESHOLD
): PoseJump[] {
  const jumps: PoseJump[] = [];
  for (let index = 1; index < samples.length; index += 1) {
    const previous = samples[index - 1];
    const current = samples[index];
    for (const [joint, point] of presentJoints(current.pose)) {
      const before = previous.pose[joint];
      if (!before || !isFinitePoint(before) || !isFinitePoint(point)) {
        continue;
      }
      const moved = distance(before, point);
      if (moved > threshold) {
        jumps.push({ joint, distance: moved, fromT: previous.t, toT: current.t });
      }
    }
  }
  return jumps;
}

export type BuilderDiagnostics = {
  /** Issues found at POSE_SAMPLE_TS, keyed by sample t. */
  samples: { t: number; issues: PoseIssue[] }[];
  /** Worst segment length seen per segment over the dense sweep (only segments out of tolerance). */
  bones: { segment: string; min: number; max: number; expected: number }[];
  /** Deepest floor penetration over the dense sweep, if any. */
  floor: { joint: PoseJoint; depth: number } | null;
  /** Non-finite joints over the dense sweep. */
  invalid: PoseJoint[];
  /** Largest drift per declared contact over the dense sweep (only contacts out of tolerance). */
  contacts: { joint: PoseJoint; drift: number }[];
  /** Discontinuities over the dense sweep. */
  jumps: PoseJump[];
  issueCount: number;
};

export type BuilderDiagnosticsOptions = PoseValidationOptions & {
  /** Dense samples for continuity (0 disables the dense sweep). */
  denseSamples?: number;
  jumpThreshold?: number;
};

/** Samples one builder at POSE_SAMPLE_TS and densely, and summarises what the validator finds. */
export function diagnosePoseBuilder(
  build: PoseBuilder,
  options: BuilderDiagnosticsOptions = {}
): BuilderDiagnostics {
  const samples = POSE_SAMPLE_TS.map((t) => ({ t, issues: validatePose(build(t), options) }));
  const denseCount = options.denseSamples ?? DENSE_SAMPLE_COUNT;
  const dense =
    denseCount > 0
      ? Array.from({ length: denseCount + 1 }, (_, index) => {
          const t = index / denseCount;
          return { t, pose: build(t) };
        })
      : [];

  const boneRanges = new Map<string, { min: number; max: number; expected: number }>();
  let floor: BuilderDiagnostics['floor'] = null;
  const invalid = new Set<PoseJoint>();
  const drifts = new Map<PoseJoint, number>();
  for (const { pose } of dense) {
    for (const issue of validatePose(pose, options)) {
      if (issue.kind === 'bone') {
        const segment = SEGMENTS.find((item) => item.to === issue.joint);
        const key = segment ? `${segment.from}→${segment.to}` : issue.joint;
        const range = boneRanges.get(key) ?? { min: issue.actual, max: issue.actual, expected: issue.expected };
        range.min = Math.min(range.min, issue.actual);
        range.max = Math.max(range.max, issue.actual);
        boneRanges.set(key, range);
      } else if (issue.kind === 'floor') {
        if (!floor || issue.depth > floor.depth) {
          floor = { joint: issue.joint, depth: issue.depth };
        }
      } else if (issue.kind === 'invalid') {
        invalid.add(issue.joint);
      } else if (issue.kind === 'contact') {
        drifts.set(issue.joint, Math.max(drifts.get(issue.joint) ?? 0, issue.drift));
      }
    }
  }
  const jumps = dense.length ? findDiscontinuities(dense, options.jumpThreshold) : [];
  const bones = [...boneRanges].map(([segment, range]) => ({ segment, ...range }));
  const contacts = [...drifts].map(([joint, drift]) => ({ joint, drift }));
  // Distinct problems: the dense sweep includes every POSE_SAMPLE_TS point, so only fall back to
  // the sample issues when the dense sweep is disabled.
  const issueCount = dense.length
    ? bones.length +
      (floor ? 1 : 0) +
      invalid.size +
      contacts.length +
      new Set(jumps.map((jump) => jump.joint)).size
    : samples.reduce((count, sample) => count + sample.issues.length, 0);

  return { samples, bones, floor, invalid: [...invalid], contacts, jumps, issueCount };
}

/** Runs diagnosePoseBuilder over every builder in a registry (e.g. all animation types). */
export function diagnosePoseBuilders<Key extends string>(
  builders: Record<Key, PoseBuilder>,
  options?: BuilderDiagnosticsOptions
): Record<Key, BuilderDiagnostics> {
  const result = {} as Record<Key, BuilderDiagnostics>;
  for (const key of Object.keys(builders) as Key[]) {
    result[key] = diagnosePoseBuilder(builders[key], options);
  }
  return result;
}

/** One-line human summary of a builder's diagnostics, for dev screens and logs. */
export function summarizeDiagnostics(diagnostics: BuilderDiagnostics): string[] {
  const lines: string[] = [];
  for (const bone of diagnostics.bones) {
    lines.push(`length ${bone.segment}: ${bone.min.toFixed(0)}–${bone.max.toFixed(0)}px (expected ${bone.expected})`);
  }
  if (diagnostics.floor) {
    lines.push(`floor: ${diagnostics.floor.joint} ${diagnostics.floor.depth.toFixed(1)}px below`);
  }
  for (const joint of diagnostics.invalid) {
    lines.push(`invalid: ${joint} has non-finite coordinates`);
  }
  for (const item of diagnostics.contacts) {
    lines.push(`contact: ${item.joint} slides up to ${item.drift.toFixed(1)}px`);
  }
  const worstJumps = new Map<PoseJoint, PoseJump>();
  for (const jump of diagnostics.jumps) {
    const current = worstJumps.get(jump.joint);
    if (!current || jump.distance > current.distance) {
      worstJumps.set(jump.joint, jump);
    }
  }
  for (const jump of worstJumps.values()) {
    lines.push(`jump: ${jump.joint} moves ${jump.distance.toFixed(0)}px near t=${jump.toT.toFixed(2)}`);
  }
  return lines;
}
