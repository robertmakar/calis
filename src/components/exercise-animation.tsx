import { useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { useCalisTheme } from '@/components/calis-theme';
import { type AnimationType } from '@/constants/exercises';

type ExerciseAnimationProps = {
  exerciseName: string;
  animationType?: string;
  maxHeight?: number;
};

type Point = {
  x: number;
  y: number;
};

type Pose = {
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

type Prefer = 'maxX' | 'minX' | 'maxY' | 'minY';

/** Dev-only pose inspector. Keep 'animate' for the workout UI. */
const DEBUG_POSE: 'animate' | 'start' | 'mid' | 'end' | 'all' = 'animate';

const VIEW_W = 400;
const VIEW_H = 340;
const FLOOR_Y = 300;
/** One-way duration for a single start→end pose interpolation (exercise animations). */
const POSE_CYCLE_MS = 2000;

const LIGHT_INK = { figure: '#1C1C1C', floor: '#D4D0C8', equipment: '#C5C0B7' };
const DARK_INK = { figure: '#EDECE8', floor: '#4A4742', equipment: '#5C5852' };

function useAnimationInk() {
  const { scheme } = useCalisTheme();
  return scheme === 'dark' ? DARK_INK : LIGHT_INK;
}

const HEAD_R = 13;
const LIMB_W = 10;
const TORSO_W = 15;
const JOINT_R = 5;
const HAND_R = 4.5;
const FOOT_W = 9;
const NECK_W = 7;
const EQUIP_W = 2.5;
const FLOOR_W = 1.5;

const LEN = {
  torso: 64,
  thigh: 66,
  shin: 64,
  upper: 44,
  lower: 42,
  head: 24,
};

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function lerpPoint(a: Point, b: Point, t: number): Point {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function ik2(origin: Point, target: Point, l1: number, l2: number, prefer: Prefer): Point {
  const dx = target.x - origin.x;
  const dy = target.y - origin.y;
  const d = Math.max(Math.hypot(dx, dy), 0.0001);
  const clamped = Math.min(l1 + l2, Math.max(Math.abs(l1 - l2), d));
  const ux = dx / d;
  const uy = dy / d;
  const along = (l1 * l1 - l2 * l2 + clamped * clamped) / (2 * clamped);
  const height = Math.sqrt(Math.max(l1 * l1 - along * along, 0));
  const mx = origin.x + ux * along;
  const my = origin.y + uy * along;
  const px = -uy * height;
  const py = ux * height;
  const a = { x: mx + px, y: my + py };
  const b = { x: mx - px, y: my - py };

  switch (prefer) {
    case 'maxX':
      return a.x >= b.x ? a : b;
    case 'minX':
      return a.x < b.x ? a : b;
    case 'maxY':
      return a.y >= b.y ? a : b;
    case 'minY':
      return a.y < b.y ? a : b;
  }
}

function polar(origin: Point, fromVertical: number, length: number): Point {
  return {
    x: origin.x + Math.sin(fromVertical) * length,
    y: origin.y - Math.cos(fromVertical) * length,
  };
}

function extend(from: Point, toward: Point, length: number): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const d = Math.max(Math.hypot(dx, dy), 0.0001);
  return {
    x: from.x + (dx / d) * length,
    y: from.y + (dy / d) * length,
  };
}

function spine(hip: Point, lean: number) {
  const shoulder = polar(hip, lean, LEN.torso);
  const head = polar(shoulder, lean * 0.96, LEN.head);
  return { shoulder, head };
}

function alignedSpine(hip: Point, towardHead: Point) {
  const shoulder = extend(hip, towardHead, LEN.torso);
  const head = extend(shoulder, towardHead, LEN.head);
  return { shoulder, head };
}

function foot(x: number, y = FLOOR_Y, dir = 1): { ankle: Point; toe: Point } {
  return { ankle: { x, y }, toe: { x: x + 22 * dir, y } };
}

function useCycle() {
  const progress = useRef(new Animated.Value(0)).current;
  const [t, setT] = useState(0);

  useEffect(() => {
    if (DEBUG_POSE !== 'animate') {
      return;
    }

    const listener = progress.addListener(({ value }) => setT(value));
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration: POSE_CYCLE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration: POSE_CYCLE_MS,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
      progress.removeListener(listener);
    };
  }, [progress]);

  if (DEBUG_POSE === 'start') {
    return 0;
  }
  if (DEBUG_POSE === 'mid') {
    return 0.5;
  }
  if (DEBUG_POSE === 'end') {
    return 1;
  }
  return t;
}

function Floor() {
  const { floor } = useAnimationInk();
  return (
    <Line
      x1={48}
      y1={FLOOR_Y}
      x2={352}
      y2={FLOOR_Y}
      stroke={floor}
      strokeWidth={FLOOR_W}
      strokeLinecap="round"
    />
  );
}

function EquipLine({
  x1,
  y1,
  x2,
  y2,
  width = EQUIP_W,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width?: number;
}) {
  const { equipment } = useAnimationInk();
  return (
    <Line
      x1={x1}
      y1={y1}
      x2={x2}
      y2={y2}
      stroke={equipment}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function Bench() {
  return (
    <>
      <EquipLine x1={244} y1={200} x2={358} y2={200} width={3} />
      <EquipLine x1={262} y1={200} x2={262} y2={FLOOR_Y} />
      <EquipLine x1={340} y1={200} x2={340} y2={FLOOR_Y} />
    </>
  );
}

function Bar() {
  const { figure } = useAnimationInk();
  return (
    <>
      <EquipLine x1={82} y1={148} x2={82} y2={FLOOR_Y} />
      <EquipLine x1={318} y1={148} x2={318} y2={FLOOR_Y} />
      <Line
        x1={70}
        y1={148}
        x2={330}
        y2={148}
        stroke={figure}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </>
  );
}

function Wall() {
  return <EquipLine x1={338} y1={40} x2={338} y2={FLOOR_Y} width={3} />;
}

function Support() {
  return <EquipLine x1={82} y1={96} x2={82} y2={FLOOR_Y} width={3} />;
}

function Step() {
  return (
    <>
      <EquipLine x1={236} y1={248} x2={336} y2={248} width={3} />
      <EquipLine x1={250} y1={248} x2={250} y2={FLOOR_Y} />
      <EquipLine x1={322} y1={248} x2={322} y2={FLOOR_Y} />
    </>
  );
}

function Seat() {
  return (
    <>
      <EquipLine x1={118} y1={226} x2={178} y2={226} width={3} />
      <EquipLine x1={126} y1={226} x2={126} y2={FLOOR_Y} />
      <EquipLine x1={170} y1={226} x2={170} y2={FLOOR_Y} />
    </>
  );
}

function RearFootRest() {
  return (
    <>
      <EquipLine x1={70} y1={232} x2={132} y2={232} width={3} />
      <EquipLine x1={78} y1={232} x2={78} y2={FLOOR_Y} />
      <EquipLine x1={124} y1={232} x2={124} y2={FLOOR_Y} />
    </>
  );
}

function LowBench() {
  return (
    <>
      <EquipLine x1={60} y1={250} x2={122} y2={250} width={3} />
      <EquipLine x1={68} y1={250} x2={68} y2={FLOOR_Y} />
      <EquipLine x1={114} y1={250} x2={114} y2={FLOOR_Y} />
    </>
  );
}

function HighBar() {
  const { figure } = useAnimationInk();
  return (
    <>
      <EquipLine x1={82} y1={HIGH_BAR_Y} x2={82} y2={FLOOR_Y} />
      <EquipLine x1={318} y1={HIGH_BAR_Y} x2={318} y2={FLOOR_Y} />
      <Line
        x1={70}
        y1={HIGH_BAR_Y}
        x2={330}
        y2={HIGH_BAR_Y}
        stroke={figure}
        strokeWidth={4}
        strokeLinecap="round"
      />
    </>
  );
}

function RowFootRest() {
  return (
    <>
      <EquipLine x1={342} y1={212} x2={392} y2={212} width={3} />
      <EquipLine x1={348} y1={212} x2={348} y2={FLOOR_Y} />
      <EquipLine x1={386} y1={212} x2={386} y2={FLOOR_Y} />
    </>
  );
}

function FootRest() {
  return (
    <>
      <EquipLine x1={306} y1={212} x2={366} y2={212} width={3} />
      <EquipLine x1={316} y1={212} x2={316} y2={FLOOR_Y} />
      <EquipLine x1={356} y1={212} x2={356} y2={FLOOR_Y} />
    </>
  );
}

function Segment({
  from,
  to,
  width,
}: {
  from: Point;
  to: Point;
  width: number;
}) {
  const { figure } = useAnimationInk();
  return (
    <Line
      x1={from.x}
      y1={from.y}
      x2={to.x}
      y2={to.y}
      stroke={figure}
      strokeWidth={width}
      strokeLinecap="round"
    />
  );
}

function Joint({ point }: { point: Point }) {
  const { figure } = useAnimationInk();
  return <Circle cx={point.x} cy={point.y} r={JOINT_R} fill={figure} />;
}

function Hand({ point }: { point: Point }) {
  const { figure } = useAnimationInk();
  return <Circle cx={point.x} cy={point.y} r={HAND_R} fill={figure} />;
}

function Skeleton({ pose }: { pose: Pose }) {
  const { figure } = useAnimationInk();
  return (
    <>
      {pose.knee2 && pose.ankle2 ? (
        <>
          <Segment from={pose.hip} to={pose.knee2} width={LIMB_W} />
          <Segment from={pose.knee2} to={pose.ankle2} width={LIMB_W} />
          {pose.toe2 ? <Segment from={pose.ankle2} to={pose.toe2} width={FOOT_W} /> : null}
          <Joint point={pose.knee2} />
          <Joint point={pose.ankle2} />
        </>
      ) : null}
      {pose.elbow2 && pose.wrist2 ? (
        <>
          <Segment from={pose.shoulder} to={pose.elbow2} width={LIMB_W} />
          <Segment from={pose.elbow2} to={pose.wrist2} width={LIMB_W} />
          <Joint point={pose.elbow2} />
          <Hand point={pose.wrist2} />
        </>
      ) : null}
      <Segment from={pose.hip} to={pose.knee} width={LIMB_W} />
      <Segment from={pose.knee} to={pose.ankle} width={LIMB_W} />
      <Segment from={pose.ankle} to={pose.toe} width={FOOT_W} />
      <Segment from={pose.hip} to={pose.shoulder} width={TORSO_W} />
      <Segment from={pose.shoulder} to={pose.head} width={NECK_W} />
      <Segment from={pose.shoulder} to={pose.elbow} width={LIMB_W} />
      <Segment from={pose.elbow} to={pose.wrist} width={LIMB_W} />
      <Joint point={pose.hip} />
      <Joint point={pose.knee} />
      <Joint point={pose.shoulder} />
      <Joint point={pose.elbow} />
      <Joint point={pose.ankle} />
      <Circle cx={pose.head.x} cy={pose.head.y} r={HEAD_R} fill={figure} />
      <Hand point={pose.wrist} />
    </>
  );
}

function pulse(t: number, start: number, peak: number, end: number) {
  if (t <= start || t >= end) {
    return 0;
  }
  if (t < peak) {
    return (t - start) / (peak - start);
  }
  return (end - t) / (end - peak);
}

function hangingArm(shoulder: Point): { elbow: Point; wrist: Point } {
  const wrist = {
    x: shoulder.x + 6,
    y: shoulder.y + LEN.upper + LEN.lower - 12,
  };
  return {
    wrist,
    elbow: ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxX'),
  };
}

function squatArms(shoulder: Point, depth: number): { elbow: Point; wrist: Point } {
  const wrist = {
    x: shoulder.x + lerp(8, 26, depth),
    y: shoulder.y + lerp(LEN.upper + LEN.lower - 14, LEN.upper + 6, depth),
  };
  return {
    wrist,
    elbow: ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxX'),
  };
}

function toesPlanted(ankleX: number, dir = 1): { ankle: Point; toe: Point } {
  return {
    ankle: { x: ankleX, y: FLOOR_Y - 9 },
    toe: { x: ankleX + 20 * dir, y: FLOOR_Y },
  };
}

function raisedArm(shoulder: Point, lift: number): { elbow: Point; wrist: Point } {
  const wrist = polar(shoulder, lerp(1.12, 0.1, lift), LEN.upper + LEN.lower - 6);
  return {
    wrist,
    elbow: ik2(shoulder, wrist, LEN.upper, LEN.lower, 'minX'),
  };
}

function standingPose(options?: { squat?: number; hinge?: number; reach?: number }): Pose {
  const squat = options?.squat ?? 0;
  const hinge = options?.hinge ?? 0;
  const reach = options?.reach ?? 0;
  const { ankle, toe } = foot(200);
  const shinFromVertical = lerp(0.04, 0.28, squat) + hinge * 0.07;
  const thighFromVertical = lerp(0.04, -1.0, squat) + hinge * -0.16;
  const torsoLean = lerp(0.05, 0.3, squat) + hinge * 0.88;
  const knee = polar(ankle, shinFromVertical, LEN.shin);
  const hip = polar(knee, thighFromVertical, LEN.thigh);
  const { shoulder, head } = spine(hip, torsoLean);
  const arm = reach > 0.02 ? raisedArm(shoulder, reach) : hangingArm(shoulder);
  return { head, shoulder, hip, knee, ankle, toe, ...arm };
}

function lerpOpt(a: Point | undefined, b: Point | undefined, t: number): Point | undefined {
  if (!a && !b) {
    return undefined;
  }
  if (!a) {
    return b;
  }
  if (!b) {
    return a;
  }
  return lerpPoint(a, b, t);
}

function lerpPose(a: Pose, b: Pose, t: number): Pose {
  return {
    head: lerpPoint(a.head, b.head, t),
    shoulder: lerpPoint(a.shoulder, b.shoulder, t),
    elbow: lerpPoint(a.elbow, b.elbow, t),
    wrist: lerpPoint(a.wrist, b.wrist, t),
    hip: lerpPoint(a.hip, b.hip, t),
    knee: lerpPoint(a.knee, b.knee, t),
    ankle: lerpPoint(a.ankle, b.ankle, t),
    toe: lerpPoint(a.toe, b.toe, t),
    elbow2: lerpOpt(a.elbow2, b.elbow2, t),
    wrist2: lerpOpt(a.wrist2, b.wrist2, t),
    knee2: lerpOpt(a.knee2, b.knee2, t),
    ankle2: lerpOpt(a.ankle2, b.ankle2, t),
    toe2: lerpOpt(a.toe2, b.toe2, t),
  };
}

function buildFullBodyHero(t: number): Pose {
  const stand = standingPose();
  const squat = standingPose({ squat: 0.72 });
  const hinge = standingPose({ hinge: 0.82 });
  const reach = standingPose({ reach: 1 });
  const frames = [
    { at: 0, pose: stand },
    { at: 1 / 6, pose: squat },
    { at: 2 / 6, pose: stand },
    { at: 3 / 6, pose: hinge },
    { at: 4 / 6, pose: stand },
    { at: 5 / 6, pose: reach },
    { at: 1, pose: stand },
  ];
  let index = 0;
  while (index < frames.length - 1 && frames[index + 1].at < t) {
    index += 1;
  }
  const current = frames[index];
  const next = frames[index + 1] ?? current;
  const span = Math.max(next.at - current.at, 0.0001);
  return lerpPose(current.pose, next.pose, (t - current.at) / span);
}

function buildSquat(t: number): Pose {
  const { ankle, toe } = foot(200);
  const shinFromVertical = lerp(0.04, 0.32, t);
  const thighFromVertical = lerp(0.04, -1.22, t);
  const torsoLean = lerp(0.06, 0.34, t);
  const knee = polar(ankle, shinFromVertical, LEN.shin);
  const hip = polar(knee, thighFromVertical, LEN.thigh);
  const { shoulder, head } = spine(hip, torsoLean);
  const arm = squatArms(shoulder, t);
  return { head, shoulder, hip, knee, ankle, toe, ...arm };
}

function buildBridge(t: number): Pose {
  const shoulder = { x: 108, y: 280 };
  const { ankle, toe } = foot(250);
  const wrist = { x: 92, y: FLOOR_Y };
  const torsoAngle = lerp(0.16, -0.86, t);
  const hip = {
    x: shoulder.x + Math.cos(torsoAngle) * LEN.torso,
    y: shoulder.y + Math.sin(torsoAngle) * LEN.torso,
  };
  const head = polar(shoulder, -1.48 + torsoAngle * 0.08, LEN.head);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildIncline(t: number): Pose {
  const { ankle, toe } = toesPlanted(96);
  const wrist = { x: 268, y: 200 };
  const hip = lerpPoint({ x: 148, y: 208 }, { x: 160, y: 236 }, t);
  const { shoulder, head } = alignedSpine(hip, { x: hip.x + 82, y: hip.y - 12 });
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minX');
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildPlank(t: number): Pose {
  const breath = Math.sin(t * Math.PI) * 0.5;
  const { ankle, toe } = toesPlanted(318);
  const hip = { x: 206, y: 228 + breath };
  const { shoulder, head } = alignedSpine(hip, { x: 114, y: 226 + breath });
  const elbow = { x: shoulder.x + 2, y: FLOOR_Y };
  const wrist = { x: shoulder.x - 30, y: FLOOR_Y };
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildReverseLunge(t: number): Pose {
  const front = foot(240);
  const backAnkle = {
    x: lerp(224, 122, t),
    y: FLOOR_Y - Math.sin(t * Math.PI) * 18,
  };
  const backToe = {
    x: backAnkle.x + lerp(20, 16, t),
    y: Math.min(FLOOR_Y, backAnkle.y + 8),
  };
  const hip = lerpPoint({ x: 232, y: 168 }, { x: 214, y: 214 }, t);
  const lean = lerp(0.04, 0.1, t);
  const { shoulder, head } = spine(hip, lean);
  const arm = hangingArm(shoulder);
  return {
    head,
    shoulder,
    hip,
    ...arm,
    knee: ik2(hip, front.ankle, LEN.thigh, LEN.shin, 'maxX'),
    ankle: front.ankle,
    toe: front.toe,
    knee2: ik2(hip, backAnkle, LEN.thigh, LEN.shin, 'maxY'),
    ankle2: backAnkle,
    toe2: backToe,
  };
}

function buildDeadBug(t: number): Pose {
  const hip = { x: 176, y: 278 };
  const shoulder = { x: 112, y: 276 };
  const head = polar(shoulder, -1.42, LEN.head);
  const sideA = pulse(t, 0, 0.25, 0.5);
  const sideB = pulse(t, 0.5, 0.75, 1);
  const wristHome = { x: 118, y: 198 };
  const wristReach = { x: 56, y: 252 };
  const wrist = lerpPoint(wristHome, wristReach, sideA);
  const wrist2 = lerpPoint(wristHome, wristReach, sideB);
  const kneeHome = polar(hip, 0.55, LEN.thigh);
  const kneeExt = polar(hip, 1.42, LEN.thigh);
  const knee = lerpPoint(kneeHome, kneeExt, sideB);
  const knee2 = lerpPoint(kneeHome, kneeExt, sideA);
  const ankle = polar(knee, 1.05, LEN.shin);
  const ankle2 = polar(knee2, 1.05, LEN.shin);
  return {
    head,
    shoulder,
    hip,
    elbow: ik2(shoulder, wrist, LEN.upper, LEN.lower, 'minX'),
    wrist,
    elbow2: ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'minX'),
    wrist2,
    knee,
    ankle,
    toe: polar(ankle, 1.2, 16),
    knee2,
    ankle2,
    toe2: polar(ankle2, 1.2, 16),
  };
}

function buildSidePlank(t: number): Pose {
  const breath = Math.sin(t * Math.PI) * 0.45;
  const elbow = { x: 114, y: FLOOR_Y };
  const wrist = { x: 148, y: FLOOR_Y };
  const shoulder = { x: 120, y: 246 + breath };
  const hip = { x: 206, y: 247 + breath };
  const { ankle, toe } = toesPlanted(312);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const head = polar(shoulder, -0.58, LEN.head);
  const wrist2 = polar(shoulder, 0.04, LEN.upper + LEN.lower - 10);
  const elbow2 = ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'minX');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, elbow2, wrist2 };
}

function rotatePoint(p: Point, pivot: Point, angle: number): Point {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c };
}

function buildKneePlank(t: number): Pose {
  const breath = Math.sin(t * Math.PI) * 0.5;
  const knee = { x: 262, y: FLOOR_Y - 4 };
  const ankle = { x: 318, y: FLOOR_Y - 26 };
  const toe = { x: 334, y: FLOOR_Y - 32 };
  const toward = { x: 118, y: 226 + breath };
  const hip = extend(knee, toward, LEN.thigh);
  const { shoulder, head } = alignedSpine(hip, toward);
  const elbow = { x: shoulder.x + 2, y: FLOOR_Y };
  const wrist = { x: shoulder.x - 30, y: FLOOR_Y };
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildShoulderTaps(t: number): Pose {
  const tap = pulse(t, 0, 0.25, 0.5) + pulse(t, 0.5, 0.75, 1);
  const { ankle, toe } = toesPlanted(312);
  const hip = { x: 214, y: 216 };
  const { shoulder, head } = alignedSpine(hip, { x: hip.x - 88, y: hip.y - 8 });
  const wrist = { x: shoulder.x - 4, y: FLOOR_Y };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxX');
  const wrist2 = lerpPoint({ x: shoulder.x + 4, y: FLOOR_Y }, { x: shoulder.x + 8, y: shoulder.y + 12 }, tap);
  const elbow2 = ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'maxY');
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, elbow2, wrist2 };
}

function buildLongLeverPlank(t: number): Pose {
  const breath = Math.sin(t * Math.PI) * 0.5;
  const { ankle, toe } = toesPlanted(326);
  const hip = { x: 220, y: 244 + breath };
  const { shoulder, head } = alignedSpine(hip, { x: 128, y: 240 + breath });
  const elbow = { x: shoulder.x - 30, y: FLOOR_Y };
  const wrist = { x: elbow.x - 34, y: FLOOR_Y };
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildExtendedDeadBug(t: number): Pose {
  const hip = { x: 176, y: 278 };
  const shoulder = { x: 112, y: 276 };
  const head = polar(shoulder, -1.42, LEN.head);
  const sideA = pulse(t, 0, 0.25, 0.5);
  const sideB = pulse(t, 0.5, 0.75, 1);
  const wristHome = { x: 118, y: 198 };
  const wristReach = { x: 34, y: 270 };
  const wrist = lerpPoint(wristHome, wristReach, sideA);
  const wrist2 = lerpPoint(wristHome, wristReach, sideB);
  const kneeHome = polar(hip, 0.55, LEN.thigh);
  const kneeLong = polar(hip, 1.5, LEN.thigh);
  const ankleHome = polar(kneeHome, 1.05, LEN.shin);
  const ankleLong = polar(kneeLong, 1.5, LEN.shin);
  const knee = lerpPoint(kneeHome, kneeLong, sideB);
  const knee2 = lerpPoint(kneeHome, kneeLong, sideA);
  const ankle = lerpPoint(ankleHome, ankleLong, sideB);
  const ankle2 = lerpPoint(ankleHome, ankleLong, sideA);
  return {
    head,
    shoulder,
    hip,
    elbow: ik2(shoulder, wrist, LEN.upper, LEN.lower, 'minX'),
    wrist,
    elbow2: ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'minX'),
    wrist2,
    knee,
    ankle,
    toe: polar(ankle, lerp(1.2, 1.9, sideB), 16),
    knee2,
    ankle2,
    toe2: polar(ankle2, lerp(1.2, 1.9, sideA), 16),
  };
}

function buildTuckHollowHold(t: number): Pose {
  const breath = Math.sin(t * Math.PI) * 0.6;
  const hip = { x: 196, y: 286 };
  const shoulder = { x: 146, y: 256 + breath };
  const head = polar(shoulder, -0.95, LEN.head);
  const knee = polar(hip, 0.3, LEN.thigh);
  const ankle = polar(knee, 1.75, LEN.shin);
  const wrist = { x: knee.x + 14, y: knee.y + 12 };
  const elbow = lerpPoint(shoulder, wrist, LEN.upper / (LEN.upper + LEN.lower));
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe: polar(ankle, 1.2, 16) };
}

function hollowShape(breath: number): Pose {
  const hip = { x: 204, y: 288 };
  const shoulder = { x: 142, y: 274 + breath };
  const head = polar(shoulder, -1.2, LEN.head);
  const knee = polar(hip, 1.3, LEN.thigh);
  const ankle = polar(knee, 1.3, LEN.shin);
  const wrist = { x: shoulder.x - 82, y: shoulder.y - 26 };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'minY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe: polar(ankle, 1.0, 16) };
}

function buildHollowHold(t: number): Pose {
  return hollowShape(Math.sin(t * Math.PI) * 0.6);
}

function buildHollowRocks(t: number): Pose {
  const pose = hollowShape(0);
  const pivot = { x: 176, y: FLOOR_Y - 8 };
  const angle = lerp(-0.16, 0.16, t);
  const rotated = Object.fromEntries(
    Object.entries(pose).map(([key, point]) => [key, rotatePoint(point as Point, pivot, angle)])
  ) as Pose;
  return rotated;
}

function buildKneeSidePlank(t: number): Pose {
  const breath = Math.sin(t * Math.PI) * 0.45;
  const elbow = { x: 114, y: FLOOR_Y };
  const wrist = { x: 148, y: FLOOR_Y };
  const shoulder = { x: 120, y: 246 + breath };
  const knee = { x: 262, y: FLOOR_Y - 4 };
  const hip = extend(shoulder, knee, LEN.torso + 8);
  const ankle = { x: 300, y: FLOOR_Y - 48 };
  const toe = { x: 314, y: FLOOR_Y - 58 };
  const head = polar(shoulder, -0.58, LEN.head);
  const wrist2 = polar(shoulder, 0.04, LEN.upper + LEN.lower - 10);
  const elbow2 = ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'minX');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, elbow2, wrist2 };
}

function buildSidePlankHipDip(t: number): Pose {
  const elbow = { x: 114, y: FLOOR_Y };
  const wrist = { x: 148, y: FLOOR_Y };
  const shoulder = { x: 120, y: 246 };
  const hip = lerpPoint({ x: 206, y: 247 }, { x: 200, y: 284 }, t);
  const { ankle, toe } = toesPlanted(312);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const head = polar(shoulder, -0.58, LEN.head);
  const wrist2 = { x: hip.x - 8, y: hip.y - 16 };
  const elbow2 = ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'minY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, elbow2, wrist2 };
}

function buildStarPlank(t: number): Pose {
  const breath = Math.sin(t * Math.PI) * 0.45;
  const wrist = { x: 128, y: FLOOR_Y };
  const shoulder = { x: 132, y: 216 + breath };
  const elbow = lerpPoint(shoulder, wrist, LEN.upper / (LEN.upper + LEN.lower));
  const hip = { x: 212, y: 236 + breath };
  const { ankle, toe } = toesPlanted(316);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const head = polar(shoulder, -0.5, LEN.head);
  const wrist2 = polar(shoulder, 0.08, LEN.upper + LEN.lower);
  const elbow2 = lerpPoint(shoulder, wrist2, LEN.upper / (LEN.upper + LEN.lower));
  const knee2 = polar(hip, 0.95, LEN.thigh);
  const ankle2 = polar(knee2, 0.95, LEN.shin);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, elbow2, wrist2, knee2, ankle2, toe2: polar(ankle2, 1.9, 14) };
}

function buildBirdDog(t: number): Pose {
  const hip = { x: 210, y: 230 };
  const shoulder = { x: 138, y: 230 };
  const head = polar(shoulder, -0.52, LEN.head);
  const supportWrist = { x: 138, y: FLOOR_Y };
  const supportKnee = { x: 210, y: FLOOR_Y };
  const supportAnkle = { x: 236, y: FLOOR_Y };
  const supportToe = { x: 258, y: FLOOR_Y };
  const wristReach = lerpPoint(supportWrist, { x: 46, y: 230 }, t);
  const kneeReach = lerpPoint(supportKnee, { x: 278, y: 230 }, t);
  const ankleReach = lerpPoint(supportAnkle, { x: 342, y: 230 }, t);
  const toeReach = lerpPoint(supportToe, { x: 364, y: 226 }, t);
  return {
    head,
    shoulder,
    hip,
    elbow: ik2(shoulder, supportWrist, LEN.upper, LEN.lower, 'maxY'),
    wrist: supportWrist,
    elbow2: ik2(shoulder, wristReach, LEN.upper, LEN.lower, 'minY'),
    wrist2: wristReach,
    knee: supportKnee,
    ankle: supportAnkle,
    toe: supportToe,
    knee2: kneeReach,
    ankle2: ankleReach,
    toe2: toeReach,
  };
}

function buildCrunch(t: number): Pose {
  const hip = { x: 172, y: 280 };
  const { ankle, toe } = foot(254);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const torsoAngle = lerp(-1.52, -1.04, t);
  const { shoulder, head } = spine(hip, torsoAngle);
  const wrist = { x: head.x + 8, y: head.y + 18 };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildSingleLegBridge(t: number): Pose {
  const pose = buildBridge(t);
  const raise = lerp(-0.02, 0.06, t);
  const knee2 = polar(pose.hip, raise, LEN.thigh);
  const ankle2 = polar(knee2, raise, LEN.shin);
  const toe2 = polar(ankle2, raise + 0.35, 16);
  return { ...pose, knee2, ankle2, toe2 };
}

function buildSingleLegHipThrust(t: number): Pose {
  const shoulder = { x: 108, y: 244 };
  const { ankle, toe } = foot(256);
  const torsoAngle = lerp(0.72, 0, t);
  const hip = {
    x: shoulder.x + Math.cos(torsoAngle) * LEN.torso,
    y: shoulder.y + Math.sin(torsoAngle) * LEN.torso,
  };
  const head = polar(shoulder, -1.3 + torsoAngle * 0.2, LEN.head);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const wrist = { x: 96, y: 252 };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  const lift = lerp(0.9, 0.55, t);
  const knee2 = polar(hip, lift, LEN.thigh);
  const ankle2 = polar(knee2, lift + 0.1, LEN.shin);
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, knee2, ankle2, toe2: polar(ankle2, lift + 0.5, 14) };
}

function buildSingleLegRdl(t: number): Pose {
  const { ankle, toe } = foot(206);
  const knee = polar(ankle, lerp(0.03, 0.14, t), LEN.shin);
  const hip = polar(knee, lerp(0.02, -0.08, t), LEN.thigh);
  const { shoulder, head } = spine(hip, lerp(0.05, 1.32, t));
  const arm = hangingArm(shoulder);
  const back = lerp(Math.PI + 0.06, Math.PI + 1.36, t);
  const knee2 = polar(hip, back, LEN.thigh);
  const ankle2 = polar(knee2, back, LEN.shin);
  return { head, shoulder, hip, knee, ankle, toe, ...arm, knee2, ankle2, toe2: polar(ankle2, back + 1.5, 14) };
}

function buildRow(t: number): Pose {
  const { ankle, toe } = foot(258);
  const wrist = { x: 156, y: 148 };
  const hip = lerpPoint({ x: 198, y: 248 }, { x: 208, y: 226 }, t);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const { shoulder, head } = alignedSpine(hip, { x: hip.x - 70, y: hip.y - 18 });
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildFeetElevatedRow(t: number): Pose {
  const ankle = { x: 364, y: 203 };
  const toe = { x: 384, y: 212 };
  const wrist = { x: 156, y: 148 };
  const tilt = lerp(0.16, -0.1, t);
  const toward = { x: ankle.x - Math.cos(tilt) * 100, y: ankle.y + Math.sin(tilt) * 100 };
  const hip = extend(ankle, toward, LEN.thigh + LEN.shin);
  const { shoulder, head } = alignedSpine(hip, extend(ankle, toward, 400));
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxX');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildArcherRow(t: number): Pose {
  const pose = buildRow(t);
  const wrist2 = { x: 100, y: 148 };
  const elbow2 = lerpPoint(pose.shoulder, wrist2, LEN.upper / (LEN.upper + LEN.lower));
  return { ...pose, elbow2, wrist2 };
}

const HIGH_BAR_Y = 24;

function hangingBody(shoulder: Point, lean: number, kneeBend: number) {
  const head = polar(shoulder, lean * 0.6, LEN.head);
  const hip = polar(shoulder, Math.PI + lean, LEN.torso);
  const knee = polar(hip, Math.PI - 0.12 + lean, LEN.thigh);
  const ankle = polar(knee, Math.PI + kneeBend, LEN.shin);
  const toe = polar(ankle, Math.PI / 2 + kneeBend * 0.4, 14);
  return { head, hip, knee, ankle, toe };
}

function straightArm(shoulder: Point, wrist: Point) {
  return lerpPoint(shoulder, wrist, LEN.upper / (LEN.upper + LEN.lower));
}

function buildDeadHang(t: number): Pose {
  const sway = Math.sin(t * Math.PI) * 1.5;
  const wrist = { x: 200, y: HIGH_BAR_Y };
  const shoulder = { x: 200 + sway, y: HIGH_BAR_Y + LEN.upper + LEN.lower - 1 };
  return { shoulder, elbow: straightArm(shoulder, wrist), wrist, ...hangingBody(shoulder, 0, 0.9) };
}

function buildScapularPullUp(t: number): Pose {
  const wrist = { x: 200, y: HIGH_BAR_Y };
  const shoulder = { x: lerp(200, 197, t), y: HIGH_BAR_Y + lerp(LEN.upper + LEN.lower - 1, LEN.upper + LEN.lower - 9, t) };
  return { shoulder, elbow: straightArm(shoulder, wrist), wrist, ...hangingBody(shoulder, lerp(0, -0.12, t), 0.9) };
}

function pullUpPose(p: number, elbowSide: 'maxX' | 'minX', lean: number, kneeBend = 0.9): Pose {
  const wrist = { x: 200, y: HIGH_BAR_Y };
  const shoulder = { x: 200 - lean * 30 * p, y: HIGH_BAR_Y + lerp(LEN.upper + LEN.lower - 1, 40, p) };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, elbowSide);
  return { shoulder, elbow, wrist, ...hangingBody(shoulder, -lean * p, kneeBend) };
}

function buildChinUp(t: number): Pose {
  return pullUpPose(t, 'maxX', 0.04);
}

function buildPullUp(t: number): Pose {
  return pullUpPose(t, 'minX', 0.2);
}

function buildNegativePullUp(t: number): Pose {
  return pullUpPose(1 - t, 'minX', 0.2, lerp(1.5, 0.9, t));
}

function buildArcherPullUp(t: number): Pose {
  const wrist = { x: 200, y: HIGH_BAR_Y };
  const wrist2 = { x: 110, y: HIGH_BAR_Y };
  const shoulder = { x: lerp(186, 196, t), y: HIGH_BAR_Y + lerp(LEN.upper + LEN.lower - 6, 40, t) };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'minX');
  return { shoulder, elbow, wrist, elbow2: straightArm(shoulder, wrist2), wrist2, ...hangingBody(shoulder, -0.1 * t, 0.9) };
}

function buildWallPushUp(t: number): Pose {
  const { ankle, toe } = foot(188);
  const lean = lerp(0.24, 0.58, t);
  const knee = polar(ankle, lean, LEN.shin);
  const hip = polar(knee, lean, LEN.thigh);
  const { shoulder, head } = spine(hip, lean * 0.98);
  const wrist = { x: 338, y: shoulder.y + 10 };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildPushUp(t: number): Pose {
  const { ankle, toe } = toesPlanted(312);
  const wrist = { x: 108, y: FLOOR_Y };
  const hip = lerpPoint({ x: 214, y: 216 }, { x: 224, y: 246 }, t);
  const { shoulder, head } = alignedSpine(hip, { x: hip.x - 88, y: hip.y - 8 });
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildKneePushUp(t: number): Pose {
  const knee = { x: 250, y: FLOOR_Y };
  const { ankle, toe } = foot(298);
  const wrist = { x: 112, y: FLOOR_Y };
  const hip = lerpPoint({ x: 228, y: 224 }, { x: 236, y: 250 }, t);
  const { shoulder, head } = alignedSpine(hip, { x: hip.x - 84, y: hip.y - 8 });
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildDiamondPushUp(t: number): Pose {
  const { ankle, toe } = toesPlanted(312);
  const hip = lerpPoint({ x: 214, y: 216 }, { x: 224, y: 246 }, t);
  const { shoulder, head } = alignedSpine(hip, { x: hip.x - 88, y: hip.y - 8 });
  const wrist = { x: 150, y: FLOOR_Y };
  const wrist2 = { x: 160, y: FLOOR_Y };
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxX');
  const elbow2 = ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'maxX');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, elbow2, wrist2 };
}

function buildDeclinePushUp(t: number): Pose {
  const ankle = { x: 334, y: 203 };
  const toe = { x: 354, y: 212 };
  const wrist = { x: 126, y: FLOOR_Y };
  const tilt = lerp(0.06, 0.23, t);
  const toward = { x: ankle.x - Math.cos(tilt) * 100, y: ankle.y + Math.sin(tilt) * 100 };
  const hip = extend(ankle, toward, LEN.thigh + LEN.shin);
  const { shoulder, head } = alignedSpine(hip, extend(ankle, toward, 400));
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildArcherPushUp(t: number): Pose {
  const { ankle, toe } = toesPlanted(312);
  const hip = lerpPoint({ x: 216, y: 226 }, { x: 226, y: 252 }, t);
  const { shoulder, head } = alignedSpine(hip, { x: hip.x - 88, y: hip.y - 6 });
  const wrist = { x: 158, y: FLOOR_Y };
  const wrist2 = { x: 96, y: FLOOR_Y };
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxX');
  const elbow2 = lerpPoint(shoulder, wrist2, LEN.upper / (LEN.upper + LEN.lower));
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, elbow2, wrist2 };
}

function buildSplitSquat(t: number): Pose {
  const front = foot(250);
  const back = foot(128);
  const hip = lerpPoint({ x: 214, y: 168 }, { x: 210, y: 214 }, t);
  const lean = lerp(0.06, 0.12, t);
  const { shoulder, head } = spine(hip, lean);
  const arm = hangingArm(shoulder);
  return {
    head,
    shoulder,
    hip,
    ...arm,
    knee: ik2(hip, front.ankle, LEN.thigh, LEN.shin, 'maxX'),
    ankle: front.ankle,
    toe: front.toe,
    knee2: ik2(hip, back.ankle, LEN.thigh, LEN.shin, 'maxY'),
    ankle2: back.ankle,
    toe2: back.toe,
  };
}

function buildAssistedSplitSquat(t: number): Pose {
  const pose = buildSplitSquat(t);
  const wrist = { x: 86, y: lerp(152, 170, t) };
  const elbow = ik2(pose.shoulder, wrist, LEN.upper, LEN.lower, 'minX');
  return { ...pose, elbow, wrist };
}

function buildBoxSquat(t: number): Pose {
  return buildSquat(t);
}

function freeLegForward(hip: Point, t: number) {
  const knee2 = polar(hip, lerp(Math.PI - 0.35, 1.5, t), LEN.thigh);
  const ankle2 = polar(knee2, lerp(Math.PI - 0.3, 1.55, t), LEN.shin);
  return { knee2, ankle2, toe2: polar(ankle2, lerp(1.6, 0.3, t), 14) };
}

function buildAssistedPistolSquat(t: number): Pose {
  const { ankle, toe } = foot(200);
  const knee = polar(ankle, lerp(0.04, 0.46, t), LEN.shin);
  const hip = polar(knee, lerp(0.04, -1.34, t), LEN.thigh);
  const { shoulder, head } = spine(hip, lerp(0.06, 0.42, t));
  const wrist = { x: 86, y: lerp(150, 196, t) };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'minX');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, ...freeLegForward(hip, t) };
}

function buildPistolSquat(t: number): Pose {
  const { ankle, toe } = foot(200);
  const knee = polar(ankle, lerp(0.04, 0.5, t), LEN.shin);
  const hip = polar(knee, lerp(0.04, -1.42, t), LEN.thigh);
  const { shoulder, head } = spine(hip, lerp(0.06, 0.5, t));
  const arm = squatArms(shoulder, t);
  return { head, shoulder, hip, knee, ankle, toe, ...arm, ...freeLegForward(hip, t) };
}

function buildBulgarianSplitSquat(t: number): Pose {
  const front = foot(252);
  const backAnkle = { x: 112, y: 224 };
  const backToe = { x: 96, y: 232 };
  const hip = lerpPoint({ x: 200, y: 170 }, { x: 196, y: 216 }, t);
  const { shoulder, head } = spine(hip, lerp(0.08, 0.16, t));
  const arm = hangingArm(shoulder);
  return {
    head,
    shoulder,
    hip,
    ...arm,
    knee: ik2(hip, front.ankle, LEN.thigh, LEN.shin, 'maxX'),
    ankle: front.ankle,
    toe: front.toe,
    knee2: ik2(hip, backAnkle, LEN.thigh, LEN.shin, 'maxY'),
    ankle2: backAnkle,
    toe2: backToe,
  };
}

function buildShrimpSquat(t: number): Pose {
  const { ankle, toe } = foot(224);
  const knee = polar(ankle, lerp(0.04, 0.56, t), LEN.shin);
  const hip = polar(knee, lerp(0.04, -1.3, t), LEN.thigh);
  const { shoulder, head } = spine(hip, lerp(0.1, 0.5, t));
  const knee2 = extend(hip, { x: hip.x - lerp(8, 30, t), y: FLOOR_Y }, LEN.thigh);
  const ankle2 = polar(knee2, -0.75, LEN.shin);
  const wrist = { x: ankle2.x + 4, y: ankle2.y + 6 };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  const wrist2 = { x: shoulder.x + 78, y: shoulder.y + lerp(24, 6, t) };
  const elbow2 = ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, hip, knee, ankle, toe, elbow, wrist, elbow2, wrist2, knee2, ankle2, toe2: polar(ankle2, -2.3, 14) };
}

function buildSingleLegCalfRaise(t: number): Pose {
  const lift = lerp(0, 18, t);
  const ankle = { x: 200, y: FLOOR_Y - lift };
  const toe = { x: 224, y: FLOOR_Y };
  const knee = polar(ankle, 0.02, LEN.shin);
  const hip = polar(knee, 0.02, LEN.thigh);
  const { shoulder, head } = spine(hip, 0.04);
  const knee2 = polar(hip, Math.PI - 0.12, LEN.thigh);
  const ankle2 = polar(knee2, -1.35, LEN.shin);
  const wrist = { x: 330, y: shoulder.y + 22 };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe, knee2, ankle2, toe2: polar(ankle2, -2.9, 12) };
}

function buildCalfRaise(t: number): Pose {
  const lift = lerp(0, 18, t);
  const ankle = { x: 200, y: FLOOR_Y - lift };
  const toe = { x: 224, y: FLOOR_Y };
  const knee = polar(ankle, 0.02, LEN.shin);
  const hip = polar(knee, 0.02, LEN.thigh);
  const { shoulder, head } = spine(hip, 0.04);
  const arm = hangingArm(shoulder);
  return { head, shoulder, hip, knee, ankle, toe, ...arm };
}

function buildGoodMorning(t: number): Pose {
  const { ankle, toe } = foot(214);
  const shinFromVertical = lerp(0.04, 0.1, t);
  const thighFromVertical = lerp(0.04, -0.18, t);
  const torsoLean = lerp(0.05, 1.18, t);
  const knee = polar(ankle, shinFromVertical, LEN.shin);
  const hip = polar(knee, thighFromVertical, LEN.thigh);
  const { shoulder, head } = spine(hip, torsoLean);
  const arm = hangingArm(shoulder);
  return { head, shoulder, hip, knee, ankle, toe, ...arm };
}

function buildAssistedRow(t: number): Pose {
  const { ankle, toe } = foot(258);
  const wrist = { x: 156, y: 148 };
  const hip = lerpPoint({ x: 204, y: 214 }, { x: 196, y: 190 }, t);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'maxX');
  const { shoulder, head } = alignedSpine(hip, { x: hip.x - 40, y: hip.y - 28 });
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildReverseCrunch(t: number): Pose {
  const shoulder = { x: 112, y: 278 };
  const head = polar(shoulder, -1.45, LEN.head);
  const wrist = { x: 94, y: FLOOR_Y };
  const hip = lerpPoint({ x: 176, y: 280 }, { x: 158, y: 254 }, t);
  const knee = polar(hip, lerp(0.85, 0.15, t), LEN.thigh);
  const ankle = polar(knee, lerp(1.2, 0.2, t), LEN.shin);
  const toe = polar(ankle, lerp(1.35, 0.15, t), 16);
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildCatCow(t: number): Pose {
  const wrist = { x: 128, y: FLOOR_Y };
  const knee = { x: 232, y: FLOOR_Y };
  const { ankle, toe } = foot(258);
  const hip = lerpPoint({ x: 236, y: 216 }, { x: 226, y: 252 }, t);
  const shoulder = lerpPoint({ x: 146, y: 214 }, { x: 128, y: 250 }, t);
  const head = lerpPoint({ x: 114, y: 250 }, { x: 96, y: 206 }, t);
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildChildPose(t: number): Pose {
  const breath = Math.sin(t * Math.PI) * 0.45;
  const knee = { x: 210, y: FLOOR_Y };
  const { ankle, toe } = foot(242);
  const hip = { x: 226, y: 262 - breath * 0.12 };
  const shoulder = { x: 122, y: 278 + breath * 0.08 };
  const head = { x: 94, y: 286 };
  const wrist = { x: 62, y: FLOOR_Y };
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'minY');
  return { head, shoulder, elbow, wrist, hip, knee, ankle, toe };
}

function buildShoulderCircles(t: number): Pose {
  const { ankle, toe } = foot(200);
  const knee = polar(ankle, 0.03, LEN.shin);
  const hip = polar(knee, 0.03, LEN.thigh);
  const angle = t * Math.PI * 2;
  const base = polar(hip, 0.05, LEN.torso);
  const shoulder = {
    x: base.x + Math.cos(angle) * 7,
    y: base.y + Math.sin(angle) * 6,
  };
  const head = polar(shoulder, 0.05, LEN.head);
  const arm = hangingArm(shoulder);
  const wrist2 = { x: arm.wrist.x - 16, y: arm.wrist.y + 2 };
  const elbow2 = ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'minX');
  return { head, shoulder, hip, knee, ankle, toe, ...arm, elbow2, wrist2 };
}

function buildHipCircles(t: number): Pose {
  const { ankle, toe } = foot(200);
  const angle = t * Math.PI * 2;
  const hip = {
    x: 200 + Math.cos(angle) * 12,
    y: 170 + Math.sin(angle) * 7,
  };
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'maxX');
  const shoulder = {
    x: 200 + Math.cos(angle) * 4,
    y: hip.y - LEN.torso + 2,
  };
  const head = { x: shoulder.x, y: shoulder.y - LEN.head };
  const arm = hangingArm(shoulder);
  return { head, shoulder, hip, knee, ankle, toe, ...arm };
}

function buildDeepSquatHold(t: number): Pose {
  const settle = 0.9 + Math.sin(t * Math.PI) * 0.015;
  return buildSquat(settle);
}

function buildMountainClimbers(t: number): Pose {
  const wrist = { x: 124, y: FLOOR_Y };
  const hip = { x: 214, y: 224 };
  const { shoulder, head } = alignedSpine(hip, { x: 126, y: 218 });
  const elbow = ik2(shoulder, wrist, LEN.upper, LEN.lower, 'maxY');
  const a = pulse(t, 0, 0.25, 0.5);
  const b = pulse(t, 0.5, 0.75, 1);
  const backKnee = polar(hip, 1.15, LEN.thigh);
  const frontKnee = polar(hip, 0.35, LEN.thigh);
  const backAnkle = polar(backKnee, 1.35, LEN.shin);
  const frontAnkle = polar(frontKnee, 0.85, LEN.shin);
  return {
    head,
    shoulder,
    elbow,
    wrist,
    hip,
    knee: lerpPoint(backKnee, frontKnee, a),
    ankle: lerpPoint(backAnkle, frontAnkle, a),
    toe: lerpPoint({ x: backAnkle.x + 16, y: FLOOR_Y }, polar(frontAnkle, 0.6, 14), a),
    knee2: lerpPoint(backKnee, frontKnee, b),
    ankle2: lerpPoint(backAnkle, frontAnkle, b),
    toe2: lerpPoint({ x: backAnkle.x + 16, y: FLOOR_Y }, polar(frontAnkle, 0.6, 14), b),
  };
}

function buildBearCrawl(t: number): Pose {
  const a = pulse(t, 0, 0.25, 0.5);
  const b = pulse(t, 0.5, 0.75, 1);
  const hover = 18;
  const hip = { x: 214, y: 226 };
  const shoulder = { x: 142, y: 226 };
  const head = polar(shoulder, -0.5, LEN.head);
  const wristA = { x: 120 + a * 28, y: FLOOR_Y };
  const wristB = { x: 164 + b * 28, y: FLOOR_Y };
  const kneeA = { x: 198 + b * 28, y: FLOOR_Y - hover };
  const kneeB = { x: 244 + a * 28, y: FLOOR_Y - hover };
  const ankleA = { x: 226 + b * 28, y: FLOOR_Y };
  const ankleB = { x: 272 + a * 28, y: FLOOR_Y };
  return {
    head,
    shoulder,
    hip,
    elbow: ik2(shoulder, wristA, LEN.upper, LEN.lower, 'maxY'),
    wrist: wristA,
    elbow2: ik2(shoulder, wristB, LEN.upper, LEN.lower, 'maxY'),
    wrist2: wristB,
    knee: kneeA,
    ankle: ankleA,
    toe: { x: ankleA.x + 16, y: FLOOR_Y },
    knee2: kneeB,
    ankle2: ankleB,
    toe2: { x: ankleB.x + 16, y: FLOOR_Y },
  };
}

function buildJumpingJacks(t: number): Pose {
  const lift = Math.sin(t * Math.PI) * 8;
  const hip = { x: 200, y: 170 - lift };
  const { shoulder, head } = spine(hip, 0);
  const ankle = { x: lerp(194, 154, t), y: FLOOR_Y - lift * 0.12 };
  const ankle2 = { x: lerp(206, 246, t), y: FLOOR_Y - lift * 0.12 };
  const wrist = polar(shoulder, lerp(1.15, -0.15, t), LEN.upper + LEN.lower - 8);
  const wrist2 = {
    x: 400 - wrist.x,
    y: wrist.y,
  };
  return {
    head,
    shoulder,
    hip,
    elbow: ik2(shoulder, wrist, LEN.upper, LEN.lower, 'minX'),
    wrist,
    elbow2: ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'maxX'),
    wrist2,
    knee: ik2(hip, ankle, LEN.thigh, LEN.shin, 'maxX'),
    ankle,
    toe: { x: ankle.x + 12, y: ankle.y },
    knee2: ik2(hip, ankle2, LEN.thigh, LEN.shin, 'minX'),
    ankle2,
    toe2: { x: ankle2.x + 12, y: ankle2.y },
  };
}

function buildStepUp(t: number): Pose {
  const stepY = 248;
  const plantOnStep = Math.min(t / 0.45, 1);
  const standUp = Math.max((t - 0.45) / 0.55, 0);
  const frontAnkle = lerpPoint({ x: 188, y: FLOOR_Y }, { x: 268, y: stepY }, plantOnStep);
  const frontToe = { x: frontAnkle.x + 22, y: frontAnkle.y };
  const backAnkle = lerpPoint({ x: 158, y: FLOOR_Y }, { x: 248, y: stepY }, standUp);
  const backToe = { x: backAnkle.x + 22, y: backAnkle.y };
  const hip = lerpPoint(
    { x: 176, y: 168 },
    { x: 256, y: stepY - LEN.shin - LEN.thigh + 8 },
    Math.max(plantOnStep * 0.35, standUp)
  );
  const lean = lerp(0.1, 0.04, standUp);
  const { shoulder, head } = spine(hip, lean);
  const arm = hangingArm(shoulder);
  return {
    head,
    shoulder,
    hip,
    ...arm,
    knee: ik2(hip, frontAnkle, LEN.thigh, LEN.shin, 'maxX'),
    ankle: frontAnkle,
    toe: frontToe,
    knee2: ik2(hip, backAnkle, LEN.thigh, LEN.shin, 'maxY'),
    ankle2: backAnkle,
    toe2: backToe,
  };
}

function buildHighKnees(t: number): Pose {
  const a = pulse(t, 0, 0.25, 0.5);
  const b = pulse(t, 0.5, 0.75, 1);
  const bounce = Math.abs(Math.sin(t * Math.PI * 2)) * 4;
  const hip = { x: 200, y: 168 - bounce };
  const { shoulder, head } = spine(hip, 0.05);
  const plantL = foot(186);
  const plantR = foot(214);
  const kneeL = ik2(hip, plantL.ankle, LEN.thigh, LEN.shin, 'maxX');
  const kneeR = ik2(hip, plantR.ankle, LEN.thigh, LEN.shin, 'minX');
  const raisedKneeL = polar(hip, 0.55, LEN.thigh * 0.72);
  const raisedAnkleL = polar(raisedKneeL, 0.2, LEN.shin * 0.72);
  const raisedToeL = polar(raisedAnkleL, 0.05, 14);
  const raisedKneeR = polar(hip, 0.55, LEN.thigh * 0.72);
  const raisedAnkleR = polar(raisedKneeR, 0.2, LEN.shin * 0.72);
  const raisedToeR = polar(raisedAnkleR, 0.05, 14);
  const frontWrist = { x: shoulder.x + 16, y: shoulder.y + 26 };
  const backWrist = { x: shoulder.x - 10, y: shoulder.y + 48 };
  return {
    head,
    shoulder,
    hip,
    elbow: ik2(shoulder, lerpPoint(backWrist, frontWrist, a), LEN.upper, LEN.lower, 'maxX'),
    wrist: lerpPoint(backWrist, frontWrist, a),
    elbow2: ik2(shoulder, lerpPoint(frontWrist, backWrist, b), LEN.upper, LEN.lower, 'minX'),
    wrist2: lerpPoint(frontWrist, backWrist, b),
    knee: lerpPoint(kneeL, raisedKneeL, a),
    ankle: lerpPoint(plantL.ankle, raisedAnkleL, a),
    toe: lerpPoint(plantL.toe, raisedToeL, a),
    knee2: lerpPoint(kneeR, raisedKneeR, b),
    ankle2: lerpPoint(plantR.ankle, raisedAnkleR, b),
    toe2: lerpPoint(plantR.toe, raisedToeR, b),
  };
}

function DebugStrip({ build }: { build: (t: number) => Pose }) {
  const { figure } = useAnimationInk();
  const frames = [
    { t: 0, label: 'START', x: -28 },
    { t: 0.5, label: 'MID', x: 108 },
    { t: 1, label: 'END', x: 244 },
  ];

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      {frames.map((frame) => (
        <G key={frame.label} transform={`translate(${frame.x}, 36) scale(0.52)`}>
          <Floor />
          <Skeleton pose={build(frame.t)} />
          <SvgText x={200} y={40} fill={figure} fontSize={28} fontWeight="700" textAnchor="middle">
            {frame.label}
          </SvgText>
        </G>
      ))}
    </Svg>
  );
}

function Stage({
  build,
  children,
}: {
  build: (t: number) => Pose;
  children?: ReactNode;
}) {
  const t = useCycle();
  const pose = useMemo(() => build(t), [build, t]);

  if (DEBUG_POSE === 'all') {
    return <DebugStrip build={build} />;
  }

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Floor />
      {children}
      <Skeleton pose={pose} />
    </Svg>
  );
}

function useHeroCycle() {
  const progress = useRef(new Animated.Value(0)).current;
  const [t, setT] = useState(0);
  const duration = POSE_CYCLE_MS * 6;

  useEffect(() => {
    if (DEBUG_POSE !== 'animate') {
      return;
    }

    const listener = progress.addListener(({ value }) => setT(value));
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(progress, {
          toValue: 1,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
        Animated.timing(progress, {
          toValue: 0,
          duration,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: false,
        }),
      ])
    );
    animation.start();
    return () => {
      animation.stop();
      progress.removeListener(listener);
    };
  }, [duration, progress]);

  if (DEBUG_POSE === 'start') {
    return 0;
  }
  if (DEBUG_POSE === 'mid') {
    return 0.5;
  }
  if (DEBUG_POSE === 'end') {
    return 1;
  }
  return t;
}

function HeroStage({ build }: { build: (t: number) => Pose }) {
  const t = useHeroCycle();
  const pose = useMemo(() => build(t), [build, t]);

  return (
    <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}>
      <Floor />
      <Skeleton pose={pose} />
    </Svg>
  );
}

function InclinePushUp() {
  return (
    <Stage build={buildIncline}>
      <Bench />
    </Stage>
  );
}

function BodyweightSquat() {
  return <Stage build={buildSquat} />;
}

function AustralianRow() {
  return (
    <Stage build={buildRow}>
      <Bar />
    </Stage>
  );
}

function FeetElevatedAustralianRow() {
  return (
    <Stage build={buildFeetElevatedRow}>
      <Bar />
      <RowFootRest />
    </Stage>
  );
}

function ArcherAustralianRow() {
  return (
    <Stage build={buildArcherRow}>
      <Bar />
    </Stage>
  );
}

function DeadHang() {
  return (
    <Stage build={buildDeadHang}>
      <HighBar />
    </Stage>
  );
}

function ScapularPullUp() {
  return (
    <Stage build={buildScapularPullUp}>
      <HighBar />
    </Stage>
  );
}

function NegativePullUp() {
  return (
    <Stage build={buildNegativePullUp}>
      <HighBar />
    </Stage>
  );
}

function ChinUp() {
  return (
    <Stage build={buildChinUp}>
      <HighBar />
    </Stage>
  );
}

function PullUp() {
  return (
    <Stage build={buildPullUp}>
      <HighBar />
    </Stage>
  );
}

function ArcherPullUp() {
  return (
    <Stage build={buildArcherPullUp}>
      <HighBar />
    </Stage>
  );
}

function GluteBridge() {
  return <Stage build={buildBridge} />;
}

function Plank() {
  return <Stage build={buildPlank} />;
}

function ReverseLunge() {
  return <Stage build={buildReverseLunge} />;
}

function DeadBug() {
  return <Stage build={buildDeadBug} />;
}

function SidePlank() {
  return <Stage build={buildSidePlank} />;
}

function KneePlank() {
  return <Stage build={buildKneePlank} />;
}

function ShoulderTaps() {
  return <Stage build={buildShoulderTaps} />;
}

function LongLeverPlank() {
  return <Stage build={buildLongLeverPlank} />;
}

function ExtendedDeadBug() {
  return <Stage build={buildExtendedDeadBug} />;
}

function TuckHollowHold() {
  return <Stage build={buildTuckHollowHold} />;
}

function HollowHold() {
  return <Stage build={buildHollowHold} />;
}

function HollowRocks() {
  return <Stage build={buildHollowRocks} />;
}

function KneeSidePlank() {
  return <Stage build={buildKneeSidePlank} />;
}

function SidePlankHipDip() {
  return <Stage build={buildSidePlankHipDip} />;
}

function StarPlank() {
  return <Stage build={buildStarPlank} />;
}

function BirdDog() {
  return <Stage build={buildBirdDog} />;
}

function Crunch() {
  return <Stage build={buildCrunch} />;
}

function SingleLegGluteBridge() {
  return <Stage build={buildSingleLegBridge} />;
}

function WallPushUp() {
  return (
    <Stage build={buildWallPushUp}>
      <Wall />
    </Stage>
  );
}

function FloorPushUp() {
  return <Stage build={buildPushUp} />;
}

function KneePushUp() {
  return <Stage build={buildKneePushUp} />;
}

function DiamondPushUp() {
  return <Stage build={buildDiamondPushUp} />;
}

function DeclinePushUp() {
  return (
    <Stage build={buildDeclinePushUp}>
      <FootRest />
    </Stage>
  );
}

function ArcherPushUp() {
  return <Stage build={buildArcherPushUp} />;
}

function SplitSquat() {
  return <Stage build={buildSplitSquat} />;
}

function AssistedSplitSquat() {
  return (
    <Stage build={buildAssistedSplitSquat}>
      <Support />
    </Stage>
  );
}

function CalfRaise() {
  return <Stage build={buildCalfRaise} />;
}

function BoxSquat() {
  return (
    <Stage build={buildBoxSquat}>
      <Seat />
    </Stage>
  );
}

function AssistedPistolSquat() {
  return (
    <Stage build={buildAssistedPistolSquat}>
      <Support />
    </Stage>
  );
}

function PistolSquat() {
  return <Stage build={buildPistolSquat} />;
}

function BulgarianSplitSquat() {
  return (
    <Stage build={buildBulgarianSplitSquat}>
      <RearFootRest />
    </Stage>
  );
}

function ShrimpSquat() {
  return <Stage build={buildShrimpSquat} />;
}

function SingleLegCalfRaise() {
  return (
    <Stage build={buildSingleLegCalfRaise}>
      <Wall />
    </Stage>
  );
}

function GoodMorning() {
  return <Stage build={buildGoodMorning} />;
}

function SingleLegHipThrust() {
  return (
    <Stage build={buildSingleLegHipThrust}>
      <LowBench />
    </Stage>
  );
}

function SingleLegRdl() {
  return <Stage build={buildSingleLegRdl} />;
}

function AssistedAustralianRow() {
  return (
    <Stage build={buildAssistedRow}>
      <Bar />
    </Stage>
  );
}

function ReverseCrunch() {
  return <Stage build={buildReverseCrunch} />;
}

function CatCow() {
  return <Stage build={buildCatCow} />;
}

function ChildPose() {
  return <Stage build={buildChildPose} />;
}

function ShoulderCircles() {
  return <Stage build={buildShoulderCircles} />;
}

function HipCircles() {
  return <Stage build={buildHipCircles} />;
}

function DeepSquatHold() {
  return <Stage build={buildDeepSquatHold} />;
}

function MountainClimbers() {
  return <Stage build={buildMountainClimbers} />;
}

function BearCrawl() {
  return <Stage build={buildBearCrawl} />;
}

function JumpingJacks() {
  return <Stage build={buildJumpingJacks} />;
}

function StepUp() {
  return (
    <Stage build={buildStepUp}>
      <Step />
    </Stage>
  );
}

function HighKnees() {
  return <Stage build={buildHighKnees} />;
}

const ANIMATIONS: Record<string, () => JSX.Element> = {
  'incline push-ups': InclinePushUp,
  'incline push-up': InclinePushUp,
  'knee push-ups': KneePushUp,
  'knee push-up': KneePushUp,
  'wall push-ups': WallPushUp,
  'wall push-up': WallPushUp,
  'push-ups': FloorPushUp,
  'push-up': FloorPushUp,
  'diamond push-ups': DiamondPushUp,
  'diamond push-up': DiamondPushUp,
  'decline push-ups': DeclinePushUp,
  'decline push-up': DeclinePushUp,
  'archer push-ups': ArcherPushUp,
  'archer push-up': ArcherPushUp,
  'bodyweight squats': BodyweightSquat,
  'bodyweight squat': BodyweightSquat,
  'reverse lunges': ReverseLunge,
  'reverse lunge': ReverseLunge,
  'split squats': SplitSquat,
  'split squat': SplitSquat,
  'assisted split squats': AssistedSplitSquat,
  'assisted split squat': AssistedSplitSquat,
  'calf raises': CalfRaise,
  'box squats': BoxSquat,
  'assisted pistol squats': AssistedPistolSquat,
  'pistol squats': PistolSquat,
  'bulgarian split squats': BulgarianSplitSquat,
  'shrimp squats': ShrimpSquat,
  'single-leg calf raises': SingleLegCalfRaise,
  'calf raise': CalfRaise,
  'glute bridges': GluteBridge,
  'glute bridge': GluteBridge,
  'single-leg glute bridges': SingleLegGluteBridge,
  'single-leg glute bridge': SingleLegGluteBridge,
  'good mornings': GoodMorning,
  'single-leg hip thrusts': SingleLegHipThrust,
  'single-leg rdls': SingleLegRdl,
  'good morning': GoodMorning,
  'australian rows': AustralianRow,
  'feet-elevated australian rows': FeetElevatedAustralianRow,
  'archer australian rows': ArcherAustralianRow,
  'dead hang': DeadHang,
  'scapular pull-ups': ScapularPullUp,
  'negative pull-ups': NegativePullUp,
  'chin-ups': ChinUp,
  'pull-ups': PullUp,
  'archer pull-ups': ArcherPullUp,
  'australian row': AustralianRow,
  'assisted australian rows': AssistedAustralianRow,
  'assisted australian row': AssistedAustralianRow,
  plank: Plank,
  planks: Plank,
  'dead bug': DeadBug,
  'bird dog': BirdDog,
  'side plank': SidePlank,
  'knee plank': KneePlank,
  'plank shoulder taps': ShoulderTaps,
  'shoulder taps': ShoulderTaps,
  'long-lever plank': LongLeverPlank,
  'extended dead bug': ExtendedDeadBug,
  'tuck hollow hold': TuckHollowHold,
  'hollow hold': HollowHold,
  'hollow rocks': HollowRocks,
  'knee side plank': KneeSidePlank,
  'side plank hip dips': SidePlankHipDip,
  'star plank': StarPlank,
  crunches: Crunch,
  crunch: Crunch,
  'reverse crunches': ReverseCrunch,
  'reverse crunch': ReverseCrunch,
  'cat cow': CatCow,
  "child's pose": ChildPose,
  'shoulder circles': ShoulderCircles,
  'hip circles': HipCircles,
  'deep squat hold': DeepSquatHold,
  'mountain climbers': MountainClimbers,
  'bear crawl': BearCrawl,
  'jumping jacks': JumpingJacks,
  'step-ups': StepUp,
  'step-up': StepUp,
  'high knees': HighKnees,
};

const ANIMATIONS_BY_TYPE: Record<string, () => JSX.Element> = {
  inclinePushUp: InclinePushUp,
  kneePushUp: KneePushUp,
  wallPushUp: WallPushUp,
  pushUp: FloorPushUp,
  diamondPushUp: DiamondPushUp,
  declinePushUp: DeclinePushUp,
  archerPushUp: ArcherPushUp,
  squat: BodyweightSquat,
  reverseLunge: ReverseLunge,
  splitSquat: SplitSquat,
  assistedSplitSquat: AssistedSplitSquat,
  calfRaise: CalfRaise,
  boxSquat: BoxSquat,
  assistedPistolSquat: AssistedPistolSquat,
  pistolSquat: PistolSquat,
  bulgarianSplitSquat: BulgarianSplitSquat,
  shrimpSquat: ShrimpSquat,
  singleLegCalfRaise: SingleLegCalfRaise,
  gluteBridge: GluteBridge,
  singleLegGluteBridge: SingleLegGluteBridge,
  goodMorning: GoodMorning,
  singleLegHipThrust: SingleLegHipThrust,
  singleLegRdl: SingleLegRdl,
  australianRow: AustralianRow,
  assistedAustralianRow: AssistedAustralianRow,
  feetElevatedAustralianRow: FeetElevatedAustralianRow,
  archerAustralianRow: ArcherAustralianRow,
  deadHang: DeadHang,
  scapularPullUp: ScapularPullUp,
  negativePullUp: NegativePullUp,
  chinUp: ChinUp,
  pullUp: PullUp,
  archerPullUp: ArcherPullUp,
  plank: Plank,
  deadBug: DeadBug,
  birdDog: BirdDog,
  sidePlank: SidePlank,
  kneePlank: KneePlank,
  shoulderTaps: ShoulderTaps,
  longLeverPlank: LongLeverPlank,
  extendedDeadBug: ExtendedDeadBug,
  tuckHollowHold: TuckHollowHold,
  hollowHold: HollowHold,
  hollowRocks: HollowRocks,
  kneeSidePlank: KneeSidePlank,
  sidePlankHipDip: SidePlankHipDip,
  starPlank: StarPlank,
  crunch: Crunch,
  reverseCrunch: ReverseCrunch,
  catCow: CatCow,
  childPose: ChildPose,
  shoulderCircles: ShoulderCircles,
  hipCircles: HipCircles,
  deepSquatHold: DeepSquatHold,
  mountainClimbers: MountainClimbers,
  bearCrawl: BearCrawl,
  jumpingJacks: JumpingJacks,
  stepUp: StepUp,
  highKnees: HighKnees,
} satisfies Record<AnimationType, () => JSX.Element>;

function resolveAnimation(exerciseName: string, animationType?: string) {
  if (animationType && ANIMATIONS_BY_TYPE[animationType]) {
    return ANIMATIONS_BY_TYPE[animationType];
  }

  return ANIMATIONS[exerciseName.trim().toLowerCase()] ?? BodyweightSquat;
}

export function ExerciseAnimation({
  exerciseName,
  animationType,
  maxHeight = 280,
}: ExerciseAnimationProps) {
  const Animation = resolveAnimation(exerciseName, animationType);
  const { colors } = useCalisTheme();

  return (
    <View
      style={[styles.card, { backgroundColor: colors.background }]}
      accessibilityRole="image"
      accessibilityLabel={`${exerciseName} demonstration`}>
      <View style={[styles.stage, { maxHeight }]}>
        <Animation />
      </View>
    </View>
  );
}

export function FullBodyHero({ maxHeight = 168 }: { maxHeight?: number }) {
  const { colors } = useCalisTheme();
  return (
    <View
      style={[styles.card, { backgroundColor: colors.background }]}
      accessibilityRole="image"
      accessibilityLabel="Full body workout">
      <View style={[styles.stage, { maxHeight }]}>
        <HeroStage build={buildFullBodyHero} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: '100%',
    maxWidth: '100%',
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  stage: {
    width: '100%',
    maxWidth: '100%',
    aspectRatio: VIEW_W / VIEW_H,
  },
});
