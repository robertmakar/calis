import { useEffect, useMemo, useRef, useState, type JSX, type ReactNode } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, G, Line, Text as SvgText } from 'react-native-svg';

import { useCalisTheme } from '@/components/calis-theme';
import {
  angleFromVertical,
  armChain,
  extend,
  FLOOR_Y,
  legChain,
  LEN,
  lerp,
  lerpPoint,
  lerpAngle,
  limb,
  polar,
  swingJoint,
  contact,
  type Contact,
  type Point,
  type Pose,
  type PoseBuilder,
} from '@/components/exercise-animation-geometry';
import { type AnimationType } from '@/constants/exercises';

type ExerciseAnimationProps = {
  exerciseName: string;
  animationType: AnimationType;
  maxHeight?: number;
};

type Prefer = 'maxX' | 'minX' | 'maxY' | 'minY';

/** Dev-only pose inspector. Keep 'animate' for the workout UI. */
const DEBUG_POSE: 'animate' | 'start' | 'mid' | 'end' | 'all' = 'animate';

const VIEW_W = 400;
const VIEW_H = 340;
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
  return <EquipLine x1={SUPPORT_X} y1={96} x2={SUPPORT_X} y2={FLOOR_Y} width={3} />;
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

// ---------------------------------------------------------------------------------------------
// Supine / core family. Lying figures keep canonical arms: resting on the mat alongside the body,
// or straight arms that swing or reach as one rigid chain (never interpolated joint positions).
// ---------------------------------------------------------------------------------------------

/** Straight arm pointing at `angle` from the shoulder (canonical upper arm + forearm). */
function straightArmAt(shoulder: Point, angle: number) {
  return armChain(shoulder, angle, angle);
}

/** Arm lying on the mat alongside the body toward the feet, hand resting on the mat. */
function armAlongMat(shoulder: Point) {
  const drop = Math.asin(Math.min(1, Math.max(0, (MAT_Y - shoulder.y) / (LEN.upper + LEN.lower))));
  return straightArmAt(shoulder, Math.PI / 2 + drop);
}

function buildBridge(t: number): Pose {
  const shoulder = { x: 108, y: 280 };
  const { ankle, toe } = foot(250);
  const torsoAngle = lerp(0.16, -0.86, t);
  const hip = {
    x: shoulder.x + Math.cos(torsoAngle) * LEN.torso,
    y: shoulder.y + Math.sin(torsoAngle) * LEN.torso,
  };
  const head = polar(shoulder, -1.48 + torsoAngle * 0.08, LEN.head);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  return { head, shoulder, ...armAlongMat(shoulder), hip, knee, ankle, toe };
}

// ---------------------------------------------------------------------------------------------
// Plank / push-up family. One rigid body line (ankle → knee → hip → shoulder → head, canonical
// LEN segments) pivots on planted toes or knees; hands stay planted and the arm bends between
// them with a fixed elbow side. `facing` is the direction the head points along x.
// ---------------------------------------------------------------------------------------------

type Facing = 1 | -1;

/** Length of the foot from ankle to the planted toes in plank positions. */
const PLANK_FOOT = 20;
/** Knees, elbows and forearms resting on the mat sit this far above the floor line. */
const MAT_Y = FLOOR_Y - 4;

/** Angle-from-vertical of the body line (feet → head) tilted `tilt` rad above horizontal. */
function bodyAngle(tilt: number, facing: Facing) {
  return facing * (Math.PI / 2 - tilt);
}

/** Rigid plank line from toes planted at `toe`; the foot stays perpendicular to the shin. */
function plankFromToes(toe: Point, tilt: number, facing: Facing) {
  const angle = bodyAngle(tilt, facing);
  const ankle = polar(toe, angle - facing * (Math.PI / 2), PLANK_FOOT);
  const knee = polar(ankle, angle, LEN.shin);
  const hip = polar(knee, angle, LEN.thigh);
  const shoulder = polar(hip, angle, LEN.torso);
  const head = polar(shoulder, angle, LEN.head);
  return { toe, ankle, knee, hip, shoulder, head };
}

/** Rigid line from a knee resting on the mat up through the hip, shoulder and head. */
function plankFromKnee(knee: Point, tilt: number, facing: Facing) {
  const angle = bodyAngle(tilt, facing);
  const hip = polar(knee, angle, LEN.thigh);
  const shoulder = polar(hip, angle, LEN.torso);
  const head = polar(shoulder, angle, LEN.head);
  return { knee, hip, shoulder, head };
}

/** Shins resting behind a kneeling knee, feet lifted off the mat. */
function liftedShin(knee: Point, facing: Facing) {
  const ankle = polar(knee, -facing * 1.15, LEN.shin);
  return { ankle, toe: polar(ankle, -facing * 1.75, 16) };
}

/** Arm from the shoulder to a planted hand; the elbow always bends toward the feet. */
function plantedArm(shoulder: Point, hand: Point, facing: Facing) {
  const { joint, end } = limb(shoulder, hand, LEN.upper, LEN.lower, facing);
  return { elbow: joint, wrist: end };
}

/** Forearm on the mat: elbow at the end of the upper arm, forearm reaching toward the head. */
function forearmOnMat(shoulder: Point, upperAngle: number, facing: Facing) {
  const elbow = polar(shoulder, upperAngle, LEN.upper);
  return { elbow, wrist: polar(elbow, facing * (Math.PI / 2), LEN.lower) };
}

/**
 * A straight arm reaching sideways (archer push-up). Seen from the side it is foreshortened, so
 * its projected length is shorter than LEN.upper + LEN.lower; it is never longer.
 */
function lateralStraightArm(shoulder: Point, hand: Point) {
  return { elbow2: lerpPoint(shoulder, hand, LEN.upper / (LEN.upper + LEN.lower)), wrist2: hand };
}

const deg = Math.PI / 180;

/** High-plank push-up line shared by push-ups, diamond, archer, shoulder taps and climbers. */
const PUSH_UP_TOE = { x: 318, y: FLOOR_Y };
const PUSH_UP_HAND = { x: 138, y: FLOOR_Y };
/** Planted points of the other variants (also declared as contacts for dev validation). */
const DIAMOND_HANDS = [{ x: 152, y: FLOOR_Y }, { x: 157, y: FLOOR_Y }] as const;
const ARCHER_SIDE_HAND = { x: 120, y: FLOOR_Y };
const INCLINE_TOE = { x: 70, y: FLOOR_Y };
const INCLINE_HAND = { x: 268, y: 197 };
const DECLINE_TOE = { x: 350, y: 212 };
const DECLINE_HAND = { x: 150, y: FLOOR_Y };
const KNEE_PUSH_UP_KNEE = { x: 252, y: MAT_Y };
const KNEE_PUSH_UP_HAND = { x: 148, y: FLOOR_Y };
const WALL_HAND = { x: 332, y: 120 };
const WALL_FOOT_X = 188;
const PLANK_TOE = { x: 318, y: FLOOR_Y };
const LONG_LEVER_TOE = { x: 324, y: FLOOR_Y };
const KNEE_PLANK_KNEE = { x: 262, y: MAT_Y };
const PUSH_UP_TOP = 19.9 * deg;
const PUSH_UP_BOTTOM = 10.65 * deg;

function pushUpBody(t: number, bottom = PUSH_UP_BOTTOM, top = PUSH_UP_TOP) {
  return plankFromToes(PUSH_UP_TOE, lerp(top, bottom, t), -1);
}

function buildIncline(t: number): Pose {
  const body = plankFromToes(INCLINE_TOE, lerp(43.76 * deg, 34.9 * deg, t), 1);
  return { ...body, ...plantedArm(body.shoulder, INCLINE_HAND, 1) };
}

function buildPlank(_t: number): Pose {
  // Forearm plank: tilt solved so the elbow rests on the mat straight under the shoulder.
  const body = plankFromToes(PLANK_TOE, 8.36 * deg, -1);
  return { ...body, ...forearmOnMat(body.shoulder, Math.PI, -1) };
}

function buildReverseLunge(t: number): Pose {
  // From standing, the rear foot steps back in an arc and lands on its toes in the split stance.
  const front = foot(SPLIT_FRONT_FOOT_X);
  const hip = lerpPoint({ x: 232, y: 172 }, SPLIT_BOTTOM_HIP, t);
  const { shoulder, head } = spine(hip, lerp(0.04, 0.1, t));
  const rearAnkle = {
    x: lerp(228, SPLIT_REAR_ANKLE.x, t),
    y: lerp(FLOOR_Y, SPLIT_REAR_ANKLE.y, t) - Math.sin(t * Math.PI) * 16,
  };
  const frontLeg = standingLeg(hip, front.ankle);
  const rearLeg = standingLeg(hip, rearAnkle);
  return {
    head,
    shoulder,
    hip,
    ...hangingArm(shoulder),
    knee: frontLeg.knee,
    ankle: frontLeg.ankle,
    toe: front.toe,
    knee2: rearLeg.knee,
    ankle2: rearLeg.ankle,
    toe2: polar(rearLeg.ankle, lerp(Math.PI / 2, (3 * Math.PI) / 4, t), 20),
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
  // Thigh and shin swing at canonical length from tabletop to a long, slightly bent leg; the
  // shin never passes the thigh's line, so the knee cannot bend backwards.
  const knee = swingJoint(hip, 0.55, 1.3, sideB, LEN.thigh);
  const knee2 = swingJoint(hip, 0.55, 1.3, sideA, LEN.thigh);
  const ankle = polar(knee, lerp(1.05, 1.45, sideB), LEN.shin);
  const ankle2 = polar(knee2, lerp(1.05, 1.45, sideA), LEN.shin);
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

// ---------------------------------------------------------------------------------------------
// Side-plank family (side view). One straight line from the stacked feet (or knees) to the head
// rests on a forearm with the elbow under the shoulder, or on a straight arm for the star plank.
// All segments are canonical; the top arm/leg are straight canonical chains.
// ---------------------------------------------------------------------------------------------

/** Elbow of the supporting forearm on the mat; the shoulder sits straight above it. */
const SIDE_ELBOW = { x: 124, y: MAT_Y };
/** Side of the stacked feet resting on the mat. */
const SIDE_ANKLE_Y = FLOOR_Y - 6;
const KNEE_SIDE_KNEE = { x: 262, y: MAT_Y };
const STAR_HAND = { x: 128, y: FLOOR_Y };
const STAR_SHOULDER = { x: 132, y: 215 };

/** Straight line from the shoulder down to the stacked feet at SIDE_ANKLE_Y. */
function sideLineFromShoulder(shoulder: Point) {
  const tilt = Math.asin((SIDE_ANKLE_Y - shoulder.y) / (LEN.torso + LEN.thigh + LEN.shin));
  const angle = bodyAngle(tilt, -1);
  const toFeet = angle + Math.PI;
  const hip = polar(shoulder, toFeet, LEN.torso);
  const knee = polar(hip, toFeet, LEN.thigh);
  const ankle = polar(knee, toFeet, LEN.shin);
  return {
    shoulder,
    head: polar(shoulder, angle, LEN.head),
    hip,
    knee,
    ankle,
    toe: { x: ankle.x + 18, y: FLOOR_Y },
  };
}

/** Top arm reaching straight up from the shoulder. */
function topArmUp(shoulder: Point, lean = 0.04) {
  const arm = straightArmAt(shoulder, lean);
  return { elbow2: arm.elbow, wrist2: arm.wrist };
}

function buildSidePlank(_t: number): Pose {
  // Forearm side plank: elbow under the shoulder, straight line to the stacked feet, top arm up.
  const shoulder = polar(SIDE_ELBOW, 0, LEN.upper);
  const body = sideLineFromShoulder(shoulder);
  return { ...body, ...forearmOnMat(shoulder, Math.PI, -1), ...topArmUp(shoulder) };
}

function rotatePoint(p: Point, pivot: Point, angle: number): Point {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  const dx = p.x - pivot.x;
  const dy = p.y - pivot.y;
  return { x: pivot.x + dx * c - dy * s, y: pivot.y + dx * s + dy * c };
}

function buildKneePlank(_t: number): Pose {
  const body = plankFromKnee(KNEE_PLANK_KNEE, 19.78 * deg, -1);
  return { ...body, ...liftedShin(KNEE_PLANK_KNEE, -1), ...forearmOnMat(body.shoulder, Math.PI, -1) };
}

function buildShoulderTaps(t: number): Pose {
  const body = pushUpBody(0);
  // The tapping hand comes up in front of the chest to the opposite shoulder; elbow points down.
  const tapTarget = { x: body.shoulder.x - 14, y: body.shoulder.y + 6 };
  const tapHand = (amount: number) => ({
    x: lerp(PUSH_UP_HAND.x, tapTarget.x, amount) - Math.sin(amount * Math.PI) * 8,
    y: lerp(PUSH_UP_HAND.y, tapTarget.y, amount),
  });
  const armA = plantedArm(body.shoulder, tapHand(pulse(t, 0, 0.25, 0.5)), -1);
  const armB = plantedArm(body.shoulder, tapHand(pulse(t, 0.5, 0.75, 1)), -1);
  return { ...body, ...armA, elbow2: armB.elbow, wrist2: armB.wrist };
}

function buildLongLeverPlank(_t: number): Pose {
  // Elbows reach ahead of the shoulders; tilt solved so they rest on the mat.
  const body = plankFromToes(LONG_LEVER_TOE, 5.8 * deg, -1);
  return { ...body, ...forearmOnMat(body.shoulder, Math.PI + 0.63, -1) };
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
  // Thigh and shin both swing at canonical length until the leg is long and straight.
  const knee = swingJoint(hip, 0.55, 1.5, sideB, LEN.thigh);
  const knee2 = swingJoint(hip, 0.55, 1.5, sideA, LEN.thigh);
  const ankle = polar(knee, lerp(1.05, 1.5, sideB), LEN.shin);
  const ankle2 = polar(knee2, lerp(1.05, 1.5, sideA), LEN.shin);
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
  // Low back on the mat, shoulders lifted, knees pulled in over the chest with shins level;
  // straight arms reach toward the shins.
  const breath = Math.sin(t * Math.PI) * 0.6;
  const hip = { x: 196, y: 286 };
  const shoulder = polar(hip, angleFromVertical(hip, { x: 146, y: 256 + breath }), LEN.torso);
  const head = polar(shoulder, -0.95, LEN.head);
  const { knee, ankle } = legChain(hip, -0.2, 1.45);
  return {
    head,
    shoulder,
    ...straightArmAt(shoulder, angleFromVertical(shoulder, lerpPoint(knee, ankle, 0.6))),
    hip,
    knee,
    ankle,
    toe: polar(ankle, 1.2, 16),
  };
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

function buildKneeSidePlank(_t: number): Pose {
  // Knees are the base: forearm under the shoulder, straight knee → head line, shins behind.
  const tilt = Math.asin(LEN.upper / (LEN.thigh + LEN.torso));
  const body = plankFromKnee(KNEE_SIDE_KNEE, tilt, -1);
  return {
    ...body,
    ...liftedShin(KNEE_SIDE_KNEE, -1),
    ...forearmOnMat(body.shoulder, Math.PI, -1),
    ...topArmUp(body.shoulder),
  };
}

function buildSidePlankHipDip(t: number): Pose {
  // Elbow and feet stay planted; the hips drop below the side-plank line and lift back. With a
  // rigid torso and straight legs this needs the shoulder to tip slightly over the elbow.
  const shoulder = polar(SIDE_ELBOW, lerp(0, 0.11, t), LEN.upper);
  const line = sideLineFromShoulder(polar(SIDE_ELBOW, 0, LEN.upper));
  const { joint: hip } = limb(shoulder, line.ankle, LEN.torso, LEN.thigh + LEN.shin, 1);
  const knee = extend(hip, line.ankle, LEN.thigh);
  const top = limb(shoulder, { x: hip.x - 4, y: hip.y - 12 }, LEN.upper, LEN.lower, -1);
  return {
    head: polar(shoulder, angleFromVertical(hip, shoulder), LEN.head),
    shoulder,
    ...forearmOnMat(shoulder, angleFromVertical(shoulder, SIDE_ELBOW), -1),
    hip,
    knee,
    ankle: line.ankle,
    toe: line.toe,
    elbow2: top.joint,
    wrist2: top.end,
  };
}

function buildStarPlank(_t: number): Pose {
  // Straight-arm side plank with the top arm straight up and the top leg raised: a star.
  const body = sideLineFromShoulder(STAR_SHOULDER);
  const topLeg = legChain(body.hip, 0.95, 0.95);
  return {
    ...body,
    ...limbToArm(limb(STAR_SHOULDER, STAR_HAND, LEN.upper, LEN.lower, -1)),
    ...topArmUp(STAR_SHOULDER, 0.08),
    knee2: topLeg.knee,
    ankle2: topLeg.ankle,
    toe2: polar(topLeg.ankle, 1.9, 14),
  };
}

function limbToArm({ joint, end }: { joint: Point; end: Point }) {
  return { elbow: joint, wrist: end };
}

// ---------------------------------------------------------------------------------------------
// Quadruped family. Hands under the shoulders, knees (or feet) under the hips, the one-segment
// torso between them at canonical length. Arms bend with the elbow toward the knees; every limb
// is a canonical chain with a fixed bend side, so nothing flips between frames.
// ---------------------------------------------------------------------------------------------

const QUAD_KNEE = { x: 210, y: MAT_Y };
const QUAD_HAND = { x: 140, y: FLOOR_Y };
const CAT_COW_HAND = { x: 148, y: FLOOR_Y };
const BEAR_HAND = { x: 144, y: FLOOR_Y };
const BEAR_ANKLE = { x: 277.5, y: FLOOR_Y - 10 };
const BEAR_TOE = { x: 266, y: FLOOR_Y };
const CHILD_KNEE = { x: 210, y: MAT_Y };
const CHILD_HAND = { x: 124, y: MAT_Y };

/** Shin and instep resting on the mat behind a kneeling knee. */
function kneelingShin(knee: Point) {
  const ankle = polar(knee, Math.PI / 2, LEN.shin);
  return { ankle, toe: polar(ankle, Math.PI / 2 + 0.2, 14) };
}

/** Arm from the shoulder to a hand on (or leaving) the floor; the elbow bends toward the knees. */
function quadArm(shoulder: Point, hand: Point) {
  const { joint, end } = limb(shoulder, hand, LEN.upper, LEN.lower, -1);
  return { elbow: joint, wrist: end };
}

function buildBirdDog(t: number): Pose {
  // Opposite arm and leg extend in turn from a stable tabletop: the arm swings forward to
  // shoulder height, the leg swings back to hip height, both at full canonical length.
  const reachA = pulse(t, 0, 0.25, 0.5);
  const reachB = pulse(t, 0.5, 0.75, 1);
  const hip = polar(QUAD_KNEE, 0, LEN.thigh);
  const shoulder = polar(hip, -1.35, LEN.torso);
  const head = polar(shoulder, -1.6, LEN.head);
  const plantedAngle = angleFromVertical(shoulder, QUAD_HAND);
  const plantedReach = Math.hypot(QUAD_HAND.x - shoulder.x, QUAD_HAND.y - shoulder.y);
  const arm = (reach: number) =>
    quadArm(
      shoulder,
      polar(shoulder, lerp(plantedAngle, -Math.PI / 2, reach), lerp(plantedReach, LEN.upper + LEN.lower, reach))
    );
  const leg = (reach: number) => {
    const { knee, ankle } = legChain(hip, lerp(Math.PI, Math.PI / 2, reach), Math.PI / 2);
    return { knee, ankle, toe: polar(ankle, Math.PI / 2 + lerp(0.2, 0.1, reach), 14) };
  };
  const armA = arm(reachA);
  const armB = arm(reachB);
  const legA = leg(reachB);
  const legB = leg(reachA);
  return {
    head,
    shoulder,
    hip,
    ...armA,
    elbow2: armB.elbow,
    wrist2: armB.wrist,
    ...legA,
    knee2: legB.knee,
    ankle2: legB.ankle,
    toe2: legB.toe,
  };
}

function buildCrunch(t: number): Pose {
  // Shoulders curl up about 30° from the mat while the arms reach straight toward the knees.
  const hip = { x: 172, y: 280 };
  const { ankle, toe } = foot(254);
  const knee = ik2(hip, ankle, LEN.thigh, LEN.shin, 'minY');
  const torsoAngle = lerp(-1.52, -1.04, t);
  const { shoulder, head } = spine(hip, torsoAngle);
  return { head, shoulder, ...straightArmAt(shoulder, angleFromVertical(shoulder, knee)), hip, knee, ankle, toe };
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

// ---------------------------------------------------------------------------------------------
// Horizontal pull / row family. Hands stay fixed on the bar; a rigid body hangs from them and
// pivots on the heels (or on bent knees for the assisted row), rotating toward the bar. Arms use
// canonical lengths and the elbows always bend toward the hips.
// ---------------------------------------------------------------------------------------------

/** Height of the Bar prop the rows hold. */
const ROW_BAR_Y = 148;
const ROW_HAND = { x: 150, y: ROW_BAR_Y };
/** Ankle resting on the heel on the floor; the straight body rotates around it. */
const ROW_HEEL = { x: 300, y: FLOOR_Y - 5 };
const ROW_BOTTOM = 20.85 * deg;
const ROW_TOP = 32.77 * deg;
const ARCHER_ROW_SIDE_HAND = { x: 100, y: ROW_BAR_Y };
const ELEVATED_ROW_HAND = { x: 188, y: ROW_BAR_Y };
/** Heels resting on the RowFootRest prop (top at y = 212). */
const ELEVATED_ROW_HEEL = { x: 366, y: 207 };
const ASSISTED_ROW_HAND = { x: 160, y: ROW_BAR_Y };
const ASSISTED_ROW_FOOT_X = 262;

/** Straight body from heels at `heel`, head toward −x, toes pointing up (perpendicular to shin). */
function rowBodyFromHeels(heel: Point, tilt: number) {
  const angle = bodyAngle(tilt, -1);
  const knee = polar(heel, angle, LEN.shin);
  const hip = polar(knee, angle, LEN.thigh);
  const shoulder = polar(hip, angle, LEN.torso);
  const head = polar(shoulder, angle, LEN.head);
  return { ankle: heel, toe: polar(heel, tilt, 18), knee, hip, shoulder, head };
}

/** Arm from the shoulder to a hand fixed on the bar; the elbow bends toward the hips. */
function barArm(shoulder: Point, hand: Point) {
  const { joint, end } = limb(shoulder, hand, LEN.upper, LEN.lower, 1);
  return { elbow: joint, wrist: end };
}

function buildRow(t: number): Pose {
  const body = rowBodyFromHeels(ROW_HEEL, lerp(ROW_BOTTOM, ROW_TOP, t));
  return { ...body, ...barArm(body.shoulder, ROW_HAND) };
}

function buildFeetElevatedRow(t: number): Pose {
  // Heels on the foot rest: the body hangs lower than the feet at the bottom and rows up level.
  const body = rowBodyFromHeels(ELEVATED_ROW_HEEL, lerp(-7.03 * deg, 5.62 * deg, t));
  return { ...body, ...barArm(body.shoulder, ELEVATED_ROW_HAND) };
}

function buildArcherRow(t: number): Pose {
  // One arm rows; the other stays straight out along the bar.
  const pose = buildRow(t);
  return { ...pose, ...lateralStraightArm(pose.shoulder, ARCHER_ROW_SIDE_HAND) };
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

// ---------------------------------------------------------------------------------------------
// Hanging pulls. Hands stay fixed on the high bar; arms are canonical limb() chains whose elbows
// bend forward (+x, the direction the hanging figure faces); the body hangs from the shoulder via
// hangingBody. Dead hang and the hanging leg raises keep their original builders.
// ---------------------------------------------------------------------------------------------

const HANG_HAND = { x: 200, y: HIGH_BAR_Y };
/** Near-straight hanging arm (elbow ≈ 170°), the shared bottom of every pull. */
const HANG_REACH = 85.6;
const HANG_BOTTOM = { x: HANG_HAND.x, y: HIGH_BAR_Y + HANG_REACH };
/** Top of a pull-up: shoulders just under and behind the bar, chin level with it. */
const PULL_UP_TOP = { x: 176, y: HIGH_BAR_Y + 16 };
/** Top of a chin-up: torso more upright and closer under the bar than a pull-up. */
const CHIN_UP_TOP = { x: 194, y: HIGH_BAR_Y + 14 };
const ARCHER_PULL_SIDE_HAND = { x: 140, y: HIGH_BAR_Y };

function hangArm(shoulder: Point, hand: Point, bend: 1 | -1 = 1) {
  const { joint, end } = limb(shoulder, hand, LEN.upper, LEN.lower, bend);
  return { elbow: joint, wrist: end };
}

/** A pull at progress `p` (0 = bottom hang, 1 = top) toward `top`, leaning back by `lean` at the top. */
function pullPose(p: number, top: Point, lean: number): Pose {
  const shoulder = lerpPoint(HANG_BOTTOM, top, p);
  return { shoulder, ...hangArm(shoulder, HANG_HAND), ...hangingBody(shoulder, lean * p, 0.9) };
}

function buildScapularPullUp(t: number): Pose {
  // Straight arms at canonical length: the shoulder can only swing on the arm's arc under the
  // hand, so the scapular action shows as the chest lifting and the body tipping back slightly
  // from a relaxed hang, not as an elbow bend.
  const shoulder = polar(HANG_HAND, Math.PI + lerp(0, 0.12, t), HANG_REACH);
  return { shoulder, ...hangArm(shoulder, HANG_HAND), ...hangingBody(shoulder, lerp(0.06, -0.2, t), 0.9) };
}

function buildChinUp(t: number): Pose {
  return pullPose(t, CHIN_UP_TOP, 0);
}

function buildPullUp(t: number): Pose {
  return pullPose(t, PULL_UP_TOP, -0.2);
}

function buildNegativePullUp(t: number): Pose {
  // Eccentric: t = 0 is the top (chin at the bar), t = 1 the straight-arm hang. The shared cycle
  // plays t back from 1 to 0 afterwards, so the return is shown as the same path in reverse.
  return pullPose(1 - t, PULL_UP_TOP, -0.2);
}

function buildArcherPullUp(t: number): Pose {
  // The straight arm pivots on its own hand at full length while the other arm pulls, so the
  // shoulder travels on that arm's arc toward the working hand.
  const bottom = angleFromVertical(ARCHER_PULL_SIDE_HAND, { x: 170, y: HIGH_BAR_Y + 80.4 });
  const top = angleFromVertical(ARCHER_PULL_SIDE_HAND, { x: 221.8, y: HIGH_BAR_Y + 26 });
  const shoulder = polar(ARCHER_PULL_SIDE_HAND, lerp(bottom, top, t), HANG_REACH);
  const side = hangArm(shoulder, ARCHER_PULL_SIDE_HAND);
  return {
    shoulder,
    ...hangArm(shoulder, HANG_HAND, -1),
    elbow2: side.elbow,
    wrist2: side.wrist,
    ...hangingBody(shoulder, 0, 0.9),
  };
}

function buildWallPushUp(t: number): Pose {
  // Standing lean: a straight body pivots on the planted feet toward hands fixed on the wall.
  const { ankle, toe } = foot(WALL_FOOT_X);
  const angle = lerp(0.31, 0.52, t);
  const knee = polar(ankle, angle, LEN.shin);
  const hip = polar(knee, angle, LEN.thigh);
  const shoulder = polar(hip, angle, LEN.torso);
  const head = polar(shoulder, angle, LEN.head);
  return { head, shoulder, hip, knee, ankle, toe, ...plantedArm(shoulder, WALL_HAND, 1) };
}

function buildPushUp(t: number): Pose {
  const body = pushUpBody(t);
  return { ...body, ...plantedArm(body.shoulder, PUSH_UP_HAND, -1) };
}

function buildKneePushUp(t: number): Pose {
  const body = plankFromKnee(KNEE_PUSH_UP_KNEE, lerp(38.5 * deg, 21 * deg, t), -1);
  return {
    ...body,
    ...liftedShin(KNEE_PUSH_UP_KNEE, -1),
    ...plantedArm(body.shoulder, KNEE_PUSH_UP_HAND, -1),
  };
}

function buildDiamondPushUp(t: number): Pose {
  // Same body line as the push-up, hands together under the chest.
  const body = pushUpBody(t, 11 * deg, 19.8 * deg);
  const near = plantedArm(body.shoulder, DIAMOND_HANDS[0], -1);
  const far = plantedArm(body.shoulder, DIAMOND_HANDS[1], -1);
  return { ...body, ...near, elbow2: far.elbow, wrist2: far.wrist };
}

function buildDeclinePushUp(t: number): Pose {
  // Toes planted on the footrest; the body slopes down toward hands on the floor.
  const body = plankFromToes(DECLINE_TOE, lerp(-6.8 * deg, -15.5 * deg, t), -1);
  return { ...body, ...plantedArm(body.shoulder, DECLINE_HAND, -1) };
}

function buildArcherPushUp(t: number): Pose {
  // The working arm bends under the shoulder; the other arm stays straight out to the side.
  // Top stays a little lower so the sideways arm is never longer than a real arm.
  const body = pushUpBody(t, 13.5 * deg, 19.3 * deg);
  return {
    ...body,
    ...plantedArm(body.shoulder, PUSH_UP_HAND, -1),
    ...lateralStraightArm(body.shoulder, ARCHER_SIDE_HAND),
  };
}

// ---------------------------------------------------------------------------------------------
// Standing lower body / support hand. Legs are canonical limb() chains from the hip to planted
// feet with knees bending forward (the figure faces +x); every stance is chosen so each leg can
// reach its foot. Support hands hold fixed points the arm can reach at canonical length.
// ---------------------------------------------------------------------------------------------

/** Pole of the Support prop, in front of the figure; hands hold it at SUPPORT_HAND. */
const SUPPORT_X = 270;
const SUPPORT_HAND = { x: SUPPORT_X - 4, y: 150 };
/** Split-squat stance shared by the split squat, assisted split squat and reverse lunge. */
const SPLIT_FRONT_FOOT_X = 236;
const SPLIT_REAR_ANKLE = { x: 124, y: FLOOR_Y - 14 };
const SPLIT_REAR_TOE = { x: 138, y: FLOOR_Y };
const SPLIT_TOP_HIP = { x: 186, y: 182 };
const SPLIT_BOTTOM_HIP = { x: 190, y: 226 };
const BULGARIAN_REAR_ANKLE = { x: 112, y: 224 };
const BULGARIAN_REAR_TOE = { x: 96, y: 232 };
const STEP_TOP_Y = 248;
const STEP_FOOT = { x: 262, y: STEP_TOP_Y };
const CALF_TOE = { x: 286, y: FLOOR_Y };
const CALF_HAND = { x: 333, y: 120 };

/** Leg from the hip to a planted ankle; the knee bends forward (+x). */
function standingLeg(hip: Point, ankle: Point) {
  const { joint, end } = limb(hip, ankle, LEN.thigh, LEN.shin, -1);
  return { knee: joint, ankle: end };
}

/** Arm from the shoulder to a fixed hand hold; the elbow bends down/away from the hold. */
function supportArm(shoulder: Point, hand: Point) {
  const { joint, end } = limb(shoulder, hand, LEN.upper, LEN.lower, 1);
  return { elbow: joint, wrist: end };
}

function buildSplitSquat(t: number): Pose {
  // Front foot flat, rear foot on its toes; the hips drop straight down between them.
  const front = foot(SPLIT_FRONT_FOOT_X);
  const hip = lerpPoint(SPLIT_TOP_HIP, SPLIT_BOTTOM_HIP, t);
  const { shoulder, head } = spine(hip, lerp(0.06, 0.12, t));
  const frontLeg = standingLeg(hip, front.ankle);
  const rearLeg = standingLeg(hip, SPLIT_REAR_ANKLE);
  return {
    head,
    shoulder,
    hip,
    ...hangingArm(shoulder),
    knee: frontLeg.knee,
    ankle: frontLeg.ankle,
    toe: front.toe,
    knee2: rearLeg.knee,
    ankle2: rearLeg.ankle,
    toe2: SPLIT_REAR_TOE,
  };
}

function buildAssistedSplitSquat(t: number): Pose {
  const pose = buildSplitSquat(t);
  return { ...pose, ...supportArm(pose.shoulder, SUPPORT_HAND) };
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
  // The hand holds the support in front; the arm reaches further forward as the hips sit back.
  return { head, shoulder, ...supportArm(shoulder, SUPPORT_HAND), hip, knee, ankle, toe, ...freeLegForward(hip, t) };
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
  // Rear instep on the bench; the front leg does the work.
  const front = foot(252);
  const hip = lerpPoint({ x: 206, y: 182 }, { x: 200, y: 222 }, t);
  const { shoulder, head } = spine(hip, lerp(0.08, 0.16, t));
  const frontLeg = standingLeg(hip, front.ankle);
  const rearLeg = standingLeg(hip, BULGARIAN_REAR_ANKLE);
  return {
    head,
    shoulder,
    hip,
    ...hangingArm(shoulder),
    knee: frontLeg.knee,
    ankle: frontLeg.ankle,
    toe: front.toe,
    knee2: rearLeg.knee,
    ankle2: rearLeg.ankle,
    toe2: BULGARIAN_REAR_TOE,
  };
}

function buildShrimpSquat(t: number): Pose {
  // The rear leg stays folded (heel to glute) with the hand holding the foot; the rear knee
  // lowers toward the floor behind the working heel.
  const { ankle, toe } = foot(224);
  const knee = polar(ankle, lerp(0.04, 0.56, t), LEN.shin);
  const hip = polar(knee, lerp(0.04, -1.3, t), LEN.thigh);
  const { shoulder, head } = spine(hip, lerp(0.1, 0.5, t));
  // Thigh angled back and shin folded up behind form a visible V, kept within the arm's reach.
  const rearShin = lerp(-0.35, -0.2, t);
  const rear = legChain(hip, lerp(Math.PI + 0.3, Math.PI + 0.15, t), rearShin);
  const wrist2 = { x: shoulder.x + 78, y: shoulder.y + lerp(24, 6, t) };
  const elbow2 = ik2(shoulder, wrist2, LEN.upper, LEN.lower, 'maxY');
  return {
    head,
    shoulder,
    hip,
    knee,
    ankle,
    toe,
    ...supportArm(shoulder, rear.ankle),
    elbow2,
    wrist2,
    knee2: rear.knee,
    ankle2: rear.ankle,
    toe2: polar(rear.ankle, rearShin - 0.6, 14),
  };
}

function buildSingleLegCalfRaise(t: number): Pose {
  // The foot rolls up onto the ball (toe fixed), lifting the heel; the straight body rises with
  // it while one hand rests on the wall and the free foot is tucked behind.
  const ankle = polar(CALF_TOE, lerp(-Math.PI / 2, 0.73 - Math.PI / 2, t), 24);
  const knee = polar(ankle, 0.02, LEN.shin);
  const hip = polar(knee, 0.02, LEN.thigh);
  const { shoulder, head } = spine(hip, 0.04);
  const knee2 = polar(hip, Math.PI - 0.12, LEN.thigh);
  const ankle2 = polar(knee2, -1.35, LEN.shin);
  return {
    head,
    shoulder,
    ...supportArm(shoulder, CALF_HAND),
    hip,
    knee,
    ankle,
    toe: CALF_TOE,
    knee2,
    ankle2,
    toe2: polar(ankle2, -2.9, 12),
  };
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
  // Feet flat and knees bent at 90°: the knee → head line rows up, pivoting on the knee.
  const { ankle, toe } = foot(ASSISTED_ROW_FOOT_X);
  const knee = polar(ankle, 0, LEN.shin);
  const body = plankFromKnee(knee, lerp(3.84 * deg, 21.76 * deg, t), -1);
  return { ...body, ankle, toe, ...barArm(body.shoulder, ASSISTED_ROW_HAND) };
}

function buildReverseCrunch(t: number): Pose {
  // Upper back stays on the mat; the pelvis curls up (torso pivots on the shoulders) and the
  // bent knees (≈ 90°) travel from above the hips toward the chest.
  const shoulder = { x: 112, y: 278 };
  const head = polar(shoulder, -1.45, LEN.head);
  const hip = polar(shoulder, Math.PI / 2 + lerp(0.03, -0.26, t), LEN.torso);
  const thigh = lerp(0.02, -0.85, t);
  const shin = thigh + lerp(Math.PI / 2, 1.45, t);
  const { knee, ankle } = legChain(hip, thigh, shin);
  return { head, shoulder, ...armAlongMat(shoulder), hip, knee, ankle, toe: polar(ankle, shin + 0.35, 16) };
}

function buildLyingLegRaise(t: number): Pose {
  const shoulder = { x: 112, y: 278 };
  const head = polar(shoulder, -1.45, LEN.head);
  const hip = { x: 176, y: 280 };
  const legAngle = lerp(1.45, 0.12, t);
  const knee = polar(hip, legAngle, LEN.thigh);
  const ankle = polar(knee, legAngle, LEN.shin);
  const toe = polar(ankle, legAngle - 1.35, 14);
  return { head, shoulder, ...armAlongMat(shoulder), hip, knee, ankle, toe };
}

function hangingUpperBody() {
  const wrist = { x: 200, y: HIGH_BAR_Y };
  const shoulder = { x: 200, y: HIGH_BAR_Y + LEN.upper + LEN.lower - 1 };
  const head = polar(shoulder, 0, LEN.head);
  const hip = polar(shoulder, Math.PI, LEN.torso);
  return { wrist, shoulder, head, hip, elbow: straightArm(shoulder, wrist) };
}

function buildHangingKneeRaise(t: number): Pose {
  const upper = hangingUpperBody();
  const thigh = lerp(Math.PI - 0.08, 1.45, t);
  const knee = polar(upper.hip, thigh, LEN.thigh);
  const ankle = polar(knee, lerp(Math.PI + 0.9, Math.PI - 0.15, t), LEN.shin);
  const toe = polar(ankle, lerp(Math.PI / 2 + 0.36, 1.5, t), 14);
  return { ...upper, knee, ankle, toe };
}

function buildHangingLegRaise(t: number): Pose {
  const upper = hangingUpperBody();
  const legAngle = lerp(Math.PI - 0.55, 1.5, t);
  const knee = polar(upper.hip, legAngle, LEN.thigh);
  const ankle = polar(knee, legAngle, LEN.shin);
  const toe = polar(ankle, legAngle - 1.3, 14);
  return { ...upper, knee, ankle, toe };
}

function buildTuckVUp(t: number): Pose {
  // From a long hollow (arms overhead, legs out) the torso and tucked knees fold together while
  // the straight arms swing over to reach for the shins.
  const hip = { x: 196, y: 288 };
  const torso = lerp(-1.2, -0.5, t);
  const { shoulder, head } = spine(hip, torso);
  const thigh = lerp(1.32, 0.4, t);
  const knee = polar(hip, thigh, LEN.thigh);
  const ankle = polar(knee, lerp(1.4, 1.85, t), LEN.shin);
  const toe = polar(ankle, 0.9, 14);
  const reach = angleFromVertical(shoulder, lerpPoint(knee, ankle, 0.3));
  return { head, shoulder, ...straightArmAt(shoulder, lerpAngle(torso, reach, t)), hip, knee, ankle, toe };
}

function buildVUp(t: number): Pose {
  // Straight legs and torso fold into a V; the straight arms swing from overhead to the shins.
  const hip = { x: 196, y: 290 };
  const torso = lerp(-1.5, -0.62, t);
  const { shoulder, head } = spine(hip, torso);
  const legAngle = lerp(1.5, 0.6, t);
  const knee = polar(hip, legAngle, LEN.thigh);
  const ankle = polar(knee, legAngle, LEN.shin);
  const toe = polar(ankle, legAngle - 1.3, 14);
  const reach = angleFromVertical(shoulder, lerpPoint(knee, ankle, 0.5));
  return { head, shoulder, ...straightArmAt(shoulder, lerpAngle(torso, reach, t)), hip, knee, ankle, toe };
}

function buildCatCow(t: number): Pose {
  // One-segment torso: t = 0 is cat (pelvis tucked forward, shoulders pushed tall, head down),
  // t = 1 is cow (hips back, chest dropped toward the hands, head up). Hands and knees stay put.
  const hip = polar(QUAD_KNEE, lerp(-0.12, 0.14, t), LEN.thigh);
  const rise = lerp(214.5, 224, t) - hip.y;
  const shoulder = { x: hip.x - Math.sqrt(LEN.torso * LEN.torso - rise * rise), y: hip.y + rise };
  const head = polar(shoulder, angleFromVertical(hip, shoulder) + lerp(-1, 0.7, t), LEN.head);
  return {
    head,
    shoulder,
    hip,
    ...quadArm(shoulder, CAT_COW_HAND),
    knee: QUAD_KNEE,
    ...kneelingShin(QUAD_KNEE),
  };
}

function buildChildPose(t: number): Pose {
  // Knees and shins on the mat, hips sinking back toward the heels, chest folded over the thighs,
  // forehead toward the mat and arms reaching forward with the hands resting in place.
  const hip = polar(CHILD_KNEE, lerp(1.0, 1.12, t), LEN.thigh);
  const shoulder = polar(hip, angleFromVertical(hip, { x: lerp(204, 208, t), y: lerp(282, 286, t) }), LEN.torso);
  const { joint, end } = limb(shoulder, CHILD_HAND, LEN.upper, LEN.lower, 1);
  return {
    head: polar(shoulder, -Math.PI / 2, LEN.head),
    shoulder,
    elbow: joint,
    wrist: end,
    hip,
    knee: CHILD_KNEE,
    ...kneelingShin(CHILD_KNEE),
  };
}

// ---------------------------------------------------------------------------------------------
// Front-facing figures (jumping jacks, shoulder and hip circles). The same skeleton seen from the
// front: the torso is the spine from pelvis (hip) to neck base (shoulder); both arms leave the
// shoulder point and both legs the hip point, mirrored about FRONT_X. Primary limbs are the
// figure's right side (+x), the "2" limbs its left. Every segment keeps its canonical length.
// ---------------------------------------------------------------------------------------------

type Side = 1 | -1;

const FRONT_X = 200;
const FRONT_STANCE = 10;

/** Leg from the pelvis to a foot on its side; the knee gives outward, never across the body. */
function frontLeg(hip: Point, ankle: Point, side: Side) {
  const { joint, end } = limb(hip, ankle, LEN.thigh, LEN.shin, side === 1 ? -1 : 1);
  return { knee: joint, ankle: end, toe: { x: end.x + side * 12, y: end.y } };
}

/** Arm from the neck base toward a hand target on its side; the elbow stays low. */
function frontArm(shoulder: Point, hand: Point, side: Side) {
  const { joint, end } = limb(shoulder, hand, LEN.upper, LEN.lower, side);
  return { elbow: joint, wrist: end };
}

/** Standing front-facing body with feet planted slightly apart. */
function frontStance(hip: Point) {
  const right = frontLeg(hip, { x: FRONT_X + FRONT_STANCE, y: FLOOR_Y }, 1);
  const left = frontLeg(hip, { x: FRONT_X - FRONT_STANCE, y: FLOOR_Y }, -1);
  return { ...right, knee2: left.knee, ankle2: left.ankle, toe2: left.toe };
}

function buildShoulderCircles(t: number): Pose {
  // Front view, arms out to the sides: each nearly straight arm sweeps its hand around a small
  // ellipse beside the shoulder (mostly up/down, slightly in/out), mirrored left and right and
  // driven through the canonical arm chain, so the elbow only softens a little.
  const hip = { x: FRONT_X, y: 171 };
  const shoulder = polar(hip, 0, LEN.torso);
  const angle = t * Math.PI * 2;
  const reach = 82 + Math.cos(angle) * 3.5;
  const sweep = Math.PI / 2 + 0.12 + Math.sin(angle) * 0.22;
  const hand = (side: Side) => polar(shoulder, side * sweep, reach);
  const right = frontArm(shoulder, hand(1), 1);
  const left = frontArm(shoulder, hand(-1), -1);
  return {
    head: polar(shoulder, 0, LEN.head),
    shoulder,
    hip,
    ...right,
    elbow2: left.elbow,
    wrist2: left.wrist,
    ...frontStance(hip),
  };
}

function buildHipCircles(t: number): Pose {
  // Front view, hands on hips, feet planted: the pelvis travels an ellipse (side to side with a
  // slight dip) while the torso leans back over it so the shoulders stay nearly centred.
  const angle = t * Math.PI * 2;
  const hip = { x: FRONT_X + Math.cos(angle) * 12, y: 176 + Math.sin(angle) * 4 };
  const tilt = Math.asin(((FRONT_X - hip.x) * 0.8) / LEN.torso);
  const shoulder = polar(hip, tilt, LEN.torso);
  const hand = (side: Side) => ({ x: hip.x + side * 18, y: hip.y - 6 });
  const right = frontArm(shoulder, hand(1), -1);
  const left = frontArm(shoulder, hand(-1), 1);
  return {
    head: polar(shoulder, tilt * 0.5, LEN.head),
    shoulder,
    hip,
    ...right,
    elbow2: left.elbow,
    wrist2: left.wrist,
    ...frontStance(hip),
  };
}

function buildDeepSquatHold(t: number): Pose {
  const settle = 0.9 + Math.sin(t * Math.PI) * 0.015;
  return buildSquat(settle);
}

function buildMountainClimbers(t: number): Pose {
  const driveA = pulse(t, 0, 0.25, 0.5);
  const driveB = pulse(t, 0.5, 0.75, 1);
  const rest = pushUpBody(0);
  const { shoulder } = rest;
  // Hips rise slightly while a knee drives through under them (hands stay planted).
  const lift = Math.max(driveA, driveB) * 14 * deg;
  const torsoAngle = angleFromVertical(shoulder, rest.hip) - lift;
  const hip = polar(shoulder, torsoAngle, LEN.torso);
  const head = polar(shoulder, torsoAngle + Math.PI, LEN.head);
  // Support leg stays straight to the planted toes.
  const supportAnkle = extend(hip, rest.ankle, LEN.thigh + LEN.shin);
  const supportKnee = extend(hip, supportAnkle, LEN.thigh);
  const restLeg = angleFromVertical(hip, supportAnkle);
  const leg = (drive: number) => {
    if (drive <= 0) {
      return { knee: supportKnee, ankle: supportAnkle, toe: rest.toe };
    }
    const thigh = lerp(restLeg, Math.PI + 0.8, drive);
    const shin = lerp(restLeg, Math.PI / 2 + 0.15, drive) - Math.sin(drive * Math.PI) * 0.8;
    const { knee, ankle } = legChain(hip, thigh, shin);
    return { knee, ankle, toe: polar(ankle, shin + Math.PI / 2, PLANK_FOOT) };
  };
  const legA = leg(driveA);
  const legB = leg(driveB);
  return {
    head,
    shoulder,
    hip,
    ...plantedArm(shoulder, PUSH_UP_HAND, -1),
    ...legA,
    knee2: legB.knee,
    ankle2: legB.ankle,
    toe2: legB.toe,
  };
}

function buildBearCrawl(t: number): Pose {
  // Hips level with the shoulders, knees hovering: diagonal pairs (hand + opposite foot) lift and
  // step in turn while the other pair stays planted. It steps in place; the body does not travel.
  const stepA = pulse(t, 0, 0.25, 0.5);
  const stepB = pulse(t, 0.5, 0.75, 1);
  const hip = { x: 214, y: 216 };
  const shoulder = polar(hip, -Math.PI / 2, LEN.torso);
  const head = polar(shoulder, -1.9, LEN.head);
  const hand = (step: number) => ({ x: BEAR_HAND.x - step * 8, y: BEAR_HAND.y - step * 16 });
  const leg = (step: number) => {
    const lift = { x: -step * 6, y: -step * 14 };
    const { joint, end } = limb(
      hip,
      { x: BEAR_ANKLE.x + lift.x, y: BEAR_ANKLE.y + lift.y },
      LEN.thigh,
      LEN.shin,
      1
    );
    return { knee: joint, ankle: end, toe: { x: BEAR_TOE.x + lift.x, y: BEAR_TOE.y + lift.y } };
  };
  const armA = quadArm(shoulder, hand(stepA));
  const armB = quadArm(shoulder, hand(stepB));
  const legA = leg(stepB);
  const legB = leg(stepA);
  return {
    head,
    shoulder,
    hip,
    ...armA,
    elbow2: armB.elbow,
    wrist2: armB.wrist,
    ...legA,
    knee2: legB.knee,
    ankle2: legB.ankle,
    toe2: legB.toe,
  };
}

function buildJumpingJacks(t: number): Pose {
  // Front view. t = 0: feet together, arms down; t = 1: feet wide, arms overhead. Each half of the
  // cycle is one jump: the body leaves the floor mid-way (JUMP_HEIGHT) and lands on the next
  // stance. Straight canonical legs swing out from the pelvis; straight arms sweep through the side.
  const JUMP_HEIGHT = 14;
  const spread = lerp(0.03, 0.313, t);
  const standingHipY = FLOOR_Y - Math.cos(spread) * (LEN.thigh + LEN.shin);
  const hip = { x: FRONT_X, y: standingHipY - Math.sin(t * Math.PI) * JUMP_HEIGHT };
  const shoulder = polar(hip, 0, LEN.torso);
  const legRight = legChain(hip, Math.PI - spread, Math.PI - spread);
  const legLeft = legChain(hip, Math.PI + spread, Math.PI + spread);
  const armAngle = lerp(Math.PI - 0.15, 0.35, t);
  const armRight = straightArmAt(shoulder, armAngle);
  const armLeft = straightArmAt(shoulder, -armAngle);
  return {
    head: polar(shoulder, 0, LEN.head),
    shoulder,
    hip,
    ...armRight,
    elbow2: armLeft.elbow,
    wrist2: armLeft.wrist,
    knee: legRight.knee,
    ankle: legRight.ankle,
    toe: { x: legRight.ankle.x + 12, y: legRight.ankle.y },
    knee2: legLeft.knee,
    ankle2: legLeft.ankle,
    toe2: { x: legLeft.ankle.x - 12, y: legLeft.ankle.y },
  };
}

function buildStepUp(t: number): Pose {
  // Working foot starts on the step; that leg straightens to lift the body while the trailing
  // foot pushes off, swings over the step edge and lands beside it.
  const hip = lerpPoint({ x: 228, y: 180 }, { x: 256, y: 120 }, t);
  const { shoulder, head } = spine(hip, lerp(0.18, 0.04, t));
  const swing = Math.min(Math.max((t - 0.08) / 0.92, 0), 1);
  // The trailing foot rises before it travels forward, so it clears the front of the step.
  const trailAnkle = {
    x: lerp(206, 250, swing * swing),
    y: lerp(FLOOR_Y, STEP_TOP_Y, swing) - Math.sin(swing * Math.PI) * 24,
  };
  const working = standingLeg(hip, STEP_FOOT);
  const trailing = standingLeg(hip, trailAnkle);
  return {
    head,
    shoulder,
    hip,
    ...hangingArm(shoulder),
    knee: working.knee,
    ankle: working.ankle,
    toe: { x: STEP_FOOT.x + 22, y: STEP_TOP_Y },
    knee2: trailing.knee,
    ankle2: trailing.ankle,
    toe2: polar(trailing.ankle, Math.PI / 2 - Math.sin(swing * Math.PI) * 0.35, 20),
  };
}

function buildHighKnees(t: number): Pose {
  // Side view (the knee drive is invisible from the front). One leg supports straight while the
  // other thigh swings up past horizontal with the shin hanging; then they swap. Arms pump
  // opposite to the legs with elbows bent.
  const driveA = pulse(t, 0, 0.25, 0.5);
  const driveB = pulse(t, 0.5, 0.75, 1);
  const hip = { x: 200, y: FLOOR_Y - LEN.thigh - LEN.shin };
  const { shoulder, head } = spine(hip, 0.05);
  const leg = (drive: number) => {
    const shin = lerp(Math.PI, Math.PI + 0.15, drive);
    const { knee, ankle } = legChain(hip, lerp(Math.PI, Math.PI / 2 - 0.1, drive), shin);
    return { knee, ankle, toe: polar(ankle, shin - Math.PI / 2, 20) };
  };
  const arm = (swing: number) => {
    const upper = Math.PI - swing * 0.55;
    return armChain(shoulder, upper, upper - 1.45);
  };
  const legA = leg(driveA);
  const legB = leg(driveB);
  const armA = arm(driveB - driveA);
  const armB = arm(driveA - driveB);
  return {
    head,
    shoulder,
    hip,
    ...armA,
    elbow2: armB.elbow,
    wrist2: armB.wrist,
    ...legA,
    knee2: legB.knee,
    ankle2: legB.ankle,
    toe2: legB.toe,
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

function LyingLegRaise() {
  return <Stage build={buildLyingLegRaise} />;
}

function HangingKneeRaise() {
  return (
    <Stage build={buildHangingKneeRaise}>
      <HighBar />
    </Stage>
  );
}

function HangingLegRaise() {
  return (
    <Stage build={buildHangingLegRaise}>
      <HighBar />
    </Stage>
  );
}

function TuckVUp() {
  return <Stage build={buildTuckVUp} />;
}

function VUp() {
  return <Stage build={buildVUp} />;
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
  'lying leg raises': LyingLegRaise,
  'hanging knee raises': HangingKneeRaise,
  'hanging leg raises': HangingLegRaise,
  'tuck v-ups': TuckVUp,
  'v-ups': VUp,
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
  lyingLegRaise: LyingLegRaise,
  hangingKneeRaise: HangingKneeRaise,
  hangingLegRaise: HangingLegRaise,
  tuckVUp: TuckVUp,
  vUp: VUp,
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

/**
 * Pose builder behind each animation type, for dev diagnostics (validation, galleries).
 * Keep in sync with the `build` each component in ANIMATIONS_BY_TYPE passes to <Stage>.
 */
export const POSE_BUILDERS_BY_TYPE = {
  inclinePushUp: buildIncline,
  kneePushUp: buildKneePushUp,
  wallPushUp: buildWallPushUp,
  pushUp: buildPushUp,
  diamondPushUp: buildDiamondPushUp,
  declinePushUp: buildDeclinePushUp,
  archerPushUp: buildArcherPushUp,
  squat: buildSquat,
  reverseLunge: buildReverseLunge,
  splitSquat: buildSplitSquat,
  assistedSplitSquat: buildAssistedSplitSquat,
  calfRaise: buildCalfRaise,
  boxSquat: buildBoxSquat,
  assistedPistolSquat: buildAssistedPistolSquat,
  pistolSquat: buildPistolSquat,
  bulgarianSplitSquat: buildBulgarianSplitSquat,
  shrimpSquat: buildShrimpSquat,
  singleLegCalfRaise: buildSingleLegCalfRaise,
  gluteBridge: buildBridge,
  singleLegGluteBridge: buildSingleLegBridge,
  goodMorning: buildGoodMorning,
  singleLegHipThrust: buildSingleLegHipThrust,
  singleLegRdl: buildSingleLegRdl,
  australianRow: buildRow,
  assistedAustralianRow: buildAssistedRow,
  feetElevatedAustralianRow: buildFeetElevatedRow,
  archerAustralianRow: buildArcherRow,
  deadHang: buildDeadHang,
  scapularPullUp: buildScapularPullUp,
  negativePullUp: buildNegativePullUp,
  chinUp: buildChinUp,
  pullUp: buildPullUp,
  archerPullUp: buildArcherPullUp,
  plank: buildPlank,
  deadBug: buildDeadBug,
  birdDog: buildBirdDog,
  sidePlank: buildSidePlank,
  kneePlank: buildKneePlank,
  shoulderTaps: buildShoulderTaps,
  longLeverPlank: buildLongLeverPlank,
  extendedDeadBug: buildExtendedDeadBug,
  tuckHollowHold: buildTuckHollowHold,
  hollowHold: buildHollowHold,
  hollowRocks: buildHollowRocks,
  kneeSidePlank: buildKneeSidePlank,
  sidePlankHipDip: buildSidePlankHipDip,
  starPlank: buildStarPlank,
  crunch: buildCrunch,
  reverseCrunch: buildReverseCrunch,
  lyingLegRaise: buildLyingLegRaise,
  hangingKneeRaise: buildHangingKneeRaise,
  hangingLegRaise: buildHangingLegRaise,
  tuckVUp: buildTuckVUp,
  vUp: buildVUp,
  catCow: buildCatCow,
  childPose: buildChildPose,
  shoulderCircles: buildShoulderCircles,
  hipCircles: buildHipCircles,
  deepSquatHold: buildDeepSquatHold,
  mountainClimbers: buildMountainClimbers,
  bearCrawl: buildBearCrawl,
  jumpingJacks: buildJumpingJacks,
  stepUp: buildStepUp,
  highKnees: buildHighKnees,
} satisfies Record<AnimationType, PoseBuilder>;

/**
 * Planted contacts per animation type, for dev validation: each joint must stay on its point
 * for the whole cycle. Only families rebuilt on the canonical geometry declare contacts so far.
 */
export const POSE_CONTACTS_BY_TYPE: Partial<Record<AnimationType, readonly Contact[]>> = {
  wallPushUp: [
    contact('wrist', 'wall', WALL_HAND),
    contact('ankle', 'planted-foot', foot(WALL_FOOT_X).ankle),
    contact('toe', 'planted-foot', foot(WALL_FOOT_X).toe),
  ],
  inclinePushUp: [contact('wrist', 'bench', INCLINE_HAND), contact('toe', 'planted-foot', INCLINE_TOE)],
  kneePushUp: [
    contact('wrist', 'planted-hand', KNEE_PUSH_UP_HAND),
    contact('knee', 'knee', KNEE_PUSH_UP_KNEE),
  ],
  pushUp: [contact('wrist', 'planted-hand', PUSH_UP_HAND), contact('toe', 'planted-foot', PUSH_UP_TOE)],
  diamondPushUp: [
    contact('wrist', 'planted-hand', DIAMOND_HANDS[0]),
    contact('wrist2', 'planted-hand', DIAMOND_HANDS[1]),
    contact('toe', 'planted-foot', PUSH_UP_TOE),
  ],
  declinePushUp: [contact('wrist', 'planted-hand', DECLINE_HAND), contact('toe', 'bench', DECLINE_TOE)],
  archerPushUp: [
    contact('wrist', 'planted-hand', PUSH_UP_HAND),
    contact('wrist2', 'planted-hand', ARCHER_SIDE_HAND),
    contact('toe', 'planted-foot', PUSH_UP_TOE),
  ],
  plank: [
    contact('elbow', 'planted-hand', buildPlank(0).elbow),
    contact('wrist', 'planted-hand', buildPlank(0).wrist),
    contact('toe', 'planted-foot', PLANK_TOE),
  ],
  kneePlank: [
    contact('elbow', 'planted-hand', buildKneePlank(0).elbow),
    contact('wrist', 'planted-hand', buildKneePlank(0).wrist),
    contact('knee', 'knee', KNEE_PLANK_KNEE),
  ],
  longLeverPlank: [
    contact('elbow', 'planted-hand', buildLongLeverPlank(0).elbow),
    contact('wrist', 'planted-hand', buildLongLeverPlank(0).wrist),
    contact('toe', 'planted-foot', LONG_LEVER_TOE),
  ],
  australianRow: [contact('wrist', 'bar', ROW_HAND), contact('ankle', 'planted-foot', ROW_HEEL)],
  archerAustralianRow: [
    contact('wrist', 'bar', ROW_HAND),
    contact('wrist2', 'bar', ARCHER_ROW_SIDE_HAND),
    contact('ankle', 'planted-foot', ROW_HEEL),
  ],
  feetElevatedAustralianRow: [
    contact('wrist', 'bar', ELEVATED_ROW_HAND),
    contact('ankle', 'bench', ELEVATED_ROW_HEEL),
  ],
  assistedAustralianRow: [
    contact('wrist', 'bar', ASSISTED_ROW_HAND),
    contact('ankle', 'planted-foot', foot(ASSISTED_ROW_FOOT_X).ankle),
    contact('toe', 'planted-foot', foot(ASSISTED_ROW_FOOT_X).toe),
  ],
  deadHang: [contact('wrist', 'bar', HANG_HAND)],
  scapularPullUp: [contact('wrist', 'bar', HANG_HAND)],
  negativePullUp: [contact('wrist', 'bar', HANG_HAND)],
  chinUp: [contact('wrist', 'bar', HANG_HAND)],
  pullUp: [contact('wrist', 'bar', HANG_HAND)],
  archerPullUp: [contact('wrist', 'bar', HANG_HAND), contact('wrist2', 'bar', ARCHER_PULL_SIDE_HAND)],
  hangingKneeRaise: [contact('wrist', 'bar', HANG_HAND)],
  hangingLegRaise: [contact('wrist', 'bar', HANG_HAND)],
  gluteBridge: [
    contact('ankle', 'planted-foot', foot(250).ankle),
    contact('toe', 'planted-foot', foot(250).toe),
    contact('wrist', 'planted-hand', buildBridge(0).wrist),
  ],
  singleLegGluteBridge: [
    contact('ankle', 'planted-foot', foot(250).ankle),
    contact('toe', 'planted-foot', foot(250).toe),
    contact('wrist', 'planted-hand', buildBridge(0).wrist),
  ],
  singleLegHipThrust: [
    contact('ankle', 'planted-foot', foot(256).ankle),
    contact('toe', 'planted-foot', foot(256).toe),
    contact('wrist', 'bench', buildSingleLegHipThrust(0).wrist),
  ],
  crunch: [contact('ankle', 'planted-foot', foot(254).ankle), contact('toe', 'planted-foot', foot(254).toe)],
  reverseCrunch: [contact('wrist', 'planted-hand', buildReverseCrunch(0).wrist)],
  lyingLegRaise: [contact('wrist', 'planted-hand', buildLyingLegRaise(0).wrist)],
  splitSquat: [
    contact('ankle', 'planted-foot', foot(SPLIT_FRONT_FOOT_X).ankle),
    contact('ankle2', 'planted-foot', SPLIT_REAR_ANKLE),
    contact('toe2', 'planted-foot', SPLIT_REAR_TOE),
  ],
  assistedSplitSquat: [
    contact('ankle', 'planted-foot', foot(SPLIT_FRONT_FOOT_X).ankle),
    contact('ankle2', 'planted-foot', SPLIT_REAR_ANKLE),
    contact('wrist', 'support', SUPPORT_HAND),
  ],
  reverseLunge: [
    contact('ankle', 'planted-foot', foot(SPLIT_FRONT_FOOT_X).ankle),
    contact('toe', 'planted-foot', foot(SPLIT_FRONT_FOOT_X).toe),
  ],
  bulgarianSplitSquat: [
    contact('ankle', 'planted-foot', foot(252).ankle),
    contact('ankle2', 'bench', BULGARIAN_REAR_ANKLE),
  ],
  shrimpSquat: [contact('ankle', 'planted-foot', foot(224).ankle), contact('toe', 'planted-foot', foot(224).toe)],
  assistedPistolSquat: [
    contact('ankle', 'planted-foot', foot(200).ankle),
    contact('wrist', 'support', SUPPORT_HAND),
  ],
  stepUp: [contact('ankle', 'bench', STEP_FOOT)],
  singleLegCalfRaise: [contact('toe', 'planted-foot', CALF_TOE), contact('wrist', 'wall', CALF_HAND)],
  catCow: [
    contact('wrist', 'planted-hand', CAT_COW_HAND),
    contact('knee', 'knee', QUAD_KNEE),
    contact('ankle', 'planted-foot', kneelingShin(QUAD_KNEE).ankle),
  ],
  childPose: [
    contact('wrist', 'planted-hand', CHILD_HAND),
    contact('knee', 'knee', CHILD_KNEE),
    contact('ankle', 'planted-foot', kneelingShin(CHILD_KNEE).ankle),
  ],
  sidePlank: [
    contact('elbow', 'planted-hand', SIDE_ELBOW),
    contact('wrist', 'planted-hand', buildSidePlank(0).wrist),
    contact('ankle', 'planted-foot', buildSidePlank(0).ankle),
  ],
  kneeSidePlank: [
    contact('elbow', 'planted-hand', buildKneeSidePlank(0).elbow),
    contact('wrist', 'planted-hand', buildKneeSidePlank(0).wrist),
    contact('knee', 'knee', KNEE_SIDE_KNEE),
  ],
  sidePlankHipDip: [
    contact('elbow', 'planted-hand', SIDE_ELBOW),
    contact('ankle', 'planted-foot', buildSidePlank(0).ankle),
  ],
  starPlank: [
    contact('wrist', 'planted-hand', STAR_HAND),
    contact('ankle', 'planted-foot', buildStarPlank(0).ankle),
  ],
  shoulderCircles: [
    contact('ankle', 'planted-foot', { x: FRONT_X + FRONT_STANCE, y: FLOOR_Y }),
    contact('ankle2', 'planted-foot', { x: FRONT_X - FRONT_STANCE, y: FLOOR_Y }),
  ],
  hipCircles: [
    contact('ankle', 'planted-foot', { x: FRONT_X + FRONT_STANCE, y: FLOOR_Y }),
    contact('ankle2', 'planted-foot', { x: FRONT_X - FRONT_STANCE, y: FLOOR_Y }),
  ],
  // Tapping hands and driving feet leave the floor in turn, so only permanent contacts are listed.
  shoulderTaps: [contact('toe', 'planted-foot', PUSH_UP_TOE)],
  mountainClimbers: [contact('wrist', 'planted-hand', PUSH_UP_HAND)],
};

/** Unknown types already reported in this session, so the dev warning fires once per type. */
const reportedUnknownAnimationTypes = new Set<string>();

function resolveAnimation(exerciseName: string, animationType: AnimationType) {
  // Typed callers always pass a registered type; the lookup stays defensive for untyped values.
  const byType: (() => JSX.Element) | undefined = animationType
    ? ANIMATIONS_BY_TYPE[animationType]
    : undefined;
  if (byType) {
    return byType;
  }

  const byName = ANIMATIONS[exerciseName.trim().toLowerCase()] as (() => JSX.Element) | undefined;
  if (__DEV__ && !reportedUnknownAnimationTypes.has(String(animationType))) {
    reportedUnknownAnimationTypes.add(String(animationType));
    console.warn(
      `[ExerciseAnimation] Unknown animationType "${String(animationType)}" for "${exerciseName}" — ` +
        `falling back to ${byName ? 'the exercise-name match' : 'the bodyweight squat'}.`
    );
  }
  return byName ?? BodyweightSquat;
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
