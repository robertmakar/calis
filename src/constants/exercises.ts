import { type ExperienceLevel } from '@/lib/user-preferences';

export type ExerciseCategory =
  | 'push'
  | 'legs'
  | 'glutes'
  | 'pull'
  | 'core'
  | 'mobility'
  | 'conditioning';

export type ExerciseDifficulty = 'beginner' | 'intermediate' | 'advanced';

export type ExerciseEquipment = 'none' | 'chair' | 'pull-up-bar' | 'gym';

export type ExerciseType = 'reps' | 'hold';

export type MuscleGroup =
  | 'chest'
  | 'shoulders'
  | 'triceps'
  | 'quads'
  | 'glutes'
  | 'hamstrings'
  | 'calves'
  | 'back'
  | 'biceps'
  | 'core'
  | 'hip-flexors';

export type AnimationType =
  | 'inclinePushUp'
  | 'kneePushUp'
  | 'wallPushUp'
  | 'pushUp'
  | 'diamondPushUp'
  | 'declinePushUp'
  | 'archerPushUp'
  | 'squat'
  | 'reverseLunge'
  | 'splitSquat'
  | 'assistedSplitSquat'
  | 'calfRaise'
  | 'boxSquat'
  | 'assistedPistolSquat'
  | 'pistolSquat'
  | 'bulgarianSplitSquat'
  | 'shrimpSquat'
  | 'singleLegCalfRaise'
  | 'gluteBridge'
  | 'singleLegGluteBridge'
  | 'goodMorning'
  | 'australianRow'
  | 'assistedAustralianRow'
  | 'feetElevatedAustralianRow'
  | 'archerAustralianRow'
  | 'deadHang'
  | 'scapularPullUp'
  | 'negativePullUp'
  | 'chinUp'
  | 'pullUp'
  | 'archerPullUp'
  | 'plank'
  | 'deadBug'
  | 'birdDog'
  | 'sidePlank'
  | 'kneePlank'
  | 'shoulderTaps'
  | 'longLeverPlank'
  | 'extendedDeadBug'
  | 'tuckHollowHold'
  | 'hollowHold'
  | 'hollowRocks'
  | 'kneeSidePlank'
  | 'sidePlankHipDip'
  | 'starPlank'
  | 'crunch'
  | 'reverseCrunch'
  | 'catCow'
  | 'childPose'
  | 'shoulderCircles'
  | 'hipCircles'
  | 'deepSquatHold'
  | 'mountainClimbers'
  | 'bearCrawl'
  | 'jumpingJacks'
  | 'stepUp'
  | 'highKnees';

export type ProgressionGroup =
  | 'push-up'
  | 'split-squat'
  | 'glute-bridge'
  | 'australian-row'
  | 'plank'
  | 'hollow'
  | 'side-plank'
  | 'squat'
  | 'calf-raise'
  | 'pull-up';

/**
 * Optional per-exercise ladder override. When absent, the ladder is
 * reps: default → max(12, default) step 1; holds: default → max(40, default) step 5.
 * The ceiling must be reachable from the default in whole steps.
 */
export type ExerciseProgressionConfig = {
  ceiling?: number;
  step?: number;
};

export type Exercise = {
  id: string;
  name: string;
  category: ExerciseCategory;
  difficulty: ExerciseDifficulty;
  equipment: ExerciseEquipment;
  primaryMuscles: MuscleGroup[];
  type: ExerciseType;
  defaultSets: number;
  defaultRepsOrDuration: number;
  animationType: AnimationType;
  cue: string;
  instructions: string;
  progressionGroup?: ProgressionGroup;
  progressionLevel?: number;
  easierVariationId?: string;
  harderVariationId?: string;
  progression?: ExerciseProgressionConfig;
  /**
   * Reached only through progression (level-ups, saved variation preferences, replacement lists);
   * never picked by default workout generation. Does not affect progression traversal.
   */
  progressionOnly?: boolean;
  /**
   * Keeps its own default-generation slot even as a chain member: chain collapse and chain
   * generation caps treat it as a standalone exercise. Progression is unaffected.
   */
  independentDefault?: boolean;
  /**
   * Lowest experience level that can earn this variation through progression (level-ups).
   * Checked in addition to the difficulty rules; generation and manual selection are unaffected.
   */
  minProgressionExperience?: ExperienceLevel;
};

export const EXERCISES: Exercise[] = [
  {
    id: 'incline-push-ups',
    name: 'Incline Push-ups',
    category: 'push',
    difficulty: 'beginner',
    equipment: 'chair',
    primaryMuscles: ['chest', 'shoulders', 'triceps'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'inclinePushUp',
    cue: 'Keep your body straight. Lower your chest toward the surface, then push yourself back up.',
    instructions: 'Place your hands on a bench and walk your feet back. Lower your chest toward the bench, then press away.',
    progressionGroup: 'push-up',
    progressionLevel: 2,
    easierVariationId: 'wall-push-ups',
    harderVariationId: 'knee-push-ups',
  },
  {
    id: 'knee-push-ups',
    name: 'Knee Push-ups',
    category: 'push',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['chest', 'shoulders', 'triceps'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'kneePushUp',
    cue: 'Keep a straight line from knees to shoulders. Lower your chest, then press up.',
    instructions: 'Start on your knees with hands under your shoulders. Lower your chest toward the floor, then push back up.',
    progressionGroup: 'push-up',
    progressionLevel: 3,
    easierVariationId: 'incline-push-ups',
    harderVariationId: 'push-ups',
  },
  {
    id: 'wall-push-ups',
    name: 'Wall Push-ups',
    category: 'push',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['chest', 'shoulders', 'triceps'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 10,
    animationType: 'wallPushUp',
    cue: 'Stand at a slight lean. Bend your elbows and press away from the wall.',
    instructions: 'Place your hands on a wall at chest height. Bend your elbows to bring your chest closer, then press back.',
    progressionGroup: 'push-up',
    progressionLevel: 1,
    harderVariationId: 'incline-push-ups',
  },
  {
    id: 'push-ups',
    name: 'Push-ups',
    category: 'push',
    difficulty: 'intermediate',
    equipment: 'none',
    primaryMuscles: ['chest', 'shoulders', 'triceps', 'core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 6,
    animationType: 'pushUp',
    cue: 'Keep your body in a straight line. Lower your chest, then press up.',
    instructions: 'Start in a plank with hands under your shoulders. Lower your chest toward the floor, then push back up.',
    progressionGroup: 'push-up',
    progressionLevel: 4,
    easierVariationId: 'knee-push-ups',
    harderVariationId: 'diamond-push-ups',
  },
  {
    id: 'diamond-push-ups',
    name: 'Diamond Push-ups',
    category: 'push',
    difficulty: 'intermediate',
    equipment: 'none',
    primaryMuscles: ['triceps', 'chest', 'shoulders', 'core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 6,
    animationType: 'diamondPushUp',
    cue: 'Hands together under your chest. Keep your elbows close as you lower and press up.',
    instructions: 'Start in a plank with your hands together under your chest, thumbs and index fingers forming a diamond. Lower your chest to your hands, then press back up.',
    progressionGroup: 'push-up',
    progressionLevel: 5,
    easierVariationId: 'push-ups',
    harderVariationId: 'decline-push-ups',
    progression: { ceiling: 10 },
  },
  {
    id: 'decline-push-ups',
    name: 'Decline Push-ups',
    category: 'push',
    difficulty: 'intermediate',
    equipment: 'chair',
    primaryMuscles: ['chest', 'shoulders', 'triceps', 'core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 6,
    animationType: 'declinePushUp',
    cue: 'Feet up on the chair, body in one line. Lower your chest toward the floor, then press up.',
    instructions: 'Place your feet on a sturdy chair and your hands on the floor under your shoulders. Lower your chest toward the floor, then press back up.',
    progressionGroup: 'push-up',
    progressionLevel: 6,
    easierVariationId: 'diamond-push-ups',
    harderVariationId: 'archer-push-ups',
    progression: { ceiling: 10 },
  },
  {
    id: 'archer-push-ups',
    name: 'Archer Push-ups',
    category: 'push',
    difficulty: 'advanced',
    equipment: 'none',
    primaryMuscles: ['chest', 'shoulders', 'triceps', 'core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 4,
    animationType: 'archerPushUp',
    cue: 'Reps are per side. Hands wide — lower toward one hand while the other arm stays straight, then switch.',
    instructions: 'Reps are per side. Start in a plank with your hands placed wide. Bend one arm and lower toward that hand while keeping the other arm straight, then press up. Alternate sides.',
    progressionGroup: 'push-up',
    progressionLevel: 7,
    easierVariationId: 'decline-push-ups',
    progression: { ceiling: 8 },
  },
  {
    id: 'box-squats',
    name: 'Box Squats',
    category: 'legs',
    difficulty: 'beginner',
    equipment: 'chair',
    primaryMuscles: ['quads', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 10,
    animationType: 'boxSquat',
    cue: 'Sit back until you lightly touch the chair, then stand up tall.',
    instructions: 'Stand in front of a sturdy chair with feet shoulder-width apart. Sit your hips back until you lightly touch the seat, then stand up by pressing through your feet.',
    progressionGroup: 'squat',
    progressionLevel: 1,
    harderVariationId: 'bodyweight-squats',
    progression: { ceiling: 15 },
    progressionOnly: true,
  },
  {
    id: 'bodyweight-squats',
    name: 'Bodyweight Squats',
    category: 'legs',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['quads', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 12,
    animationType: 'squat',
    cue: 'Stand tall with your feet about shoulder-width apart. Sit your hips back, then stand up.',
    instructions: 'Sit your hips back and down while keeping your heels down. Stand up by pressing through your feet.',
    progressionGroup: 'squat',
    progressionLevel: 2,
    easierVariationId: 'box-squats',
    harderVariationId: 'assisted-pistol-squats',
  },
  {
    id: 'assisted-pistol-squats',
    name: 'Assisted Pistol Squats',
    category: 'legs',
    difficulty: 'intermediate',
    equipment: 'none',
    primaryMuscles: ['quads', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 6,
    animationType: 'assistedPistolSquat',
    cue: 'Reps are per side. Hold a support, reach one leg forward and squat down on the other.',
    instructions: 'Reps are per side. Hold a wall, door frame or sturdy post. Stand on one leg with the other reaching forward, sit down as low as you can control, then stand up using the support only as needed.',
    progressionGroup: 'squat',
    progressionLevel: 3,
    easierVariationId: 'bodyweight-squats',
    harderVariationId: 'pistol-squats',
    progression: { ceiling: 10 },
    progressionOnly: true,
  },
  {
    id: 'pistol-squats',
    name: 'Pistol Squats',
    category: 'legs',
    difficulty: 'advanced',
    equipment: 'none',
    primaryMuscles: ['quads', 'glutes', 'core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 4,
    animationType: 'pistolSquat',
    cue: 'Reps are per side. Reach one leg forward and squat all the way down on the other, then stand.',
    instructions: 'Reps are per side. Stand on one leg with the other held straight out in front. Sit all the way down with control, keeping your heel down, then stand back up without support.',
    progressionGroup: 'squat',
    progressionLevel: 4,
    easierVariationId: 'assisted-pistol-squats',
    progression: { ceiling: 8 },
    progressionOnly: true,
  },
  {
    id: 'reverse-lunges',
    name: 'Reverse Lunges',
    category: 'legs',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['quads', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'reverseLunge',
    cue: 'Step one foot back, lower with control, then return to standing.',
    instructions: 'From standing, step one leg backward and bend both knees. Push through the front foot to stand back up. Alternate sides.',
    progressionGroup: 'split-squat',
    progressionLevel: 3,
    easierVariationId: 'split-squats',
    harderVariationId: 'bulgarian-split-squats',
    independentDefault: true,
  },
  {
    id: 'bulgarian-split-squats',
    name: 'Bulgarian Split Squats',
    category: 'legs',
    difficulty: 'intermediate',
    equipment: 'chair',
    primaryMuscles: ['quads', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 6,
    animationType: 'bulgarianSplitSquat',
    cue: 'Reps are per side. Back foot on the chair, lower straight down, then drive up through the front foot.',
    instructions: 'Reps are per side. Stand a stride in front of a sturdy chair and rest the top of your back foot on the seat. Lower until your front thigh is near parallel, then press back up.',
    progressionGroup: 'split-squat',
    progressionLevel: 4,
    easierVariationId: 'reverse-lunges',
    harderVariationId: 'shrimp-squats',
    progression: { ceiling: 10 },
    progressionOnly: true,
  },
  {
    id: 'shrimp-squats',
    name: 'Shrimp Squats',
    category: 'legs',
    difficulty: 'advanced',
    equipment: 'none',
    primaryMuscles: ['quads', 'glutes', 'core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 4,
    animationType: 'shrimpSquat',
    cue: 'Reps are per side. Hold your back foot behind you and lower until that knee touches down, then stand.',
    instructions: 'Reps are per side. Stand on one leg and bend the other knee, holding that foot behind you. Lower slowly until the back knee touches the floor, then drive up through the standing leg.',
    progressionGroup: 'split-squat',
    progressionLevel: 5,
    easierVariationId: 'bulgarian-split-squats',
    progression: { ceiling: 8 },
    progressionOnly: true,
  },
  {
    id: 'split-squats',
    name: 'Split Squats',
    category: 'legs',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['quads', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'splitSquat',
    cue: 'Keep your stance split. Lower straight down, then stand up.',
    instructions: 'Stand in a staggered stance. Lower the back knee toward the floor, then press up. Switch legs after the set.',
    progressionGroup: 'split-squat',
    progressionLevel: 2,
    easierVariationId: 'assisted-split-squats',
    harderVariationId: 'reverse-lunges',
  },
  {
    id: 'assisted-split-squats',
    name: 'Assisted Split Squats',
    category: 'legs',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['quads', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'assistedSplitSquat',
    cue: 'Hold a support for balance. Lower straight down, then stand up.',
    instructions: 'Use a wall or chair for balance. Keep a staggered stance, lower with control, then stand up.',
    progressionGroup: 'split-squat',
    progressionLevel: 1,
    harderVariationId: 'split-squats',
  },
  {
    id: 'calf-raises',
    name: 'Calf Raises',
    category: 'legs',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['calves'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 12,
    animationType: 'calfRaise',
    cue: 'Rise onto your toes, pause, then lower slowly.',
    instructions: 'Stand tall and lift your heels as high as you can. Pause, then lower with control.',
    progressionGroup: 'calf-raise',
    progressionLevel: 1,
    harderVariationId: 'single-leg-calf-raises',
  },
  {
    id: 'single-leg-calf-raises',
    name: 'Single-Leg Calf Raises',
    category: 'legs',
    difficulty: 'intermediate',
    equipment: 'none',
    primaryMuscles: ['calves'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'singleLegCalfRaise',
    cue: 'Reps are per side. Balance on one foot, rise onto your toes, pause, then lower slowly.',
    instructions: 'Reps are per side. Stand on one foot with a fingertip on a wall for balance. Lift your heel as high as you can, pause, then lower with control.',
    progressionGroup: 'calf-raise',
    progressionLevel: 2,
    easierVariationId: 'calf-raises',
    progression: { ceiling: 15 },
    progressionOnly: true,
  },
  {
    id: 'glute-bridges',
    name: 'Glute Bridges',
    category: 'glutes',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['glutes', 'hamstrings'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 12,
    animationType: 'gluteBridge',
    cue: 'Lie on your back with your knees bent. Squeeze your glutes and lift your hips, then lower slowly.',
    instructions: 'Press through your heels to lift your hips until your body forms a line from shoulders to knees.',
    progressionGroup: 'glute-bridge',
    progressionLevel: 1,
    harderVariationId: 'single-leg-glute-bridges',
  },
  {
    id: 'single-leg-glute-bridges',
    name: 'Single-Leg Glute Bridges',
    category: 'glutes',
    difficulty: 'intermediate',
    equipment: 'none',
    primaryMuscles: ['glutes', 'hamstrings'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 6,
    animationType: 'singleLegGluteBridge',
    cue: 'Keep one foot planted. Lift your hips without twisting.',
    instructions: 'From a bridge position, extend one leg and lift your hips using the planted foot. Switch sides.',
    progressionGroup: 'glute-bridge',
    progressionLevel: 2,
    easierVariationId: 'glute-bridges',
  },
  {
    id: 'good-mornings',
    name: 'Good Mornings',
    category: 'glutes',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['hamstrings', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 10,
    animationType: 'goodMorning',
    cue: 'Hinge at your hips with a flat back, then stand tall.',
    instructions: 'Softly bend your knees, push your hips back, and keep your back long. Return to standing by squeezing your glutes.',
  },
  {
    id: 'australian-rows',
    name: 'Australian Rows',
    category: 'pull',
    difficulty: 'beginner',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'biceps'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'australianRow',
    cue: 'Keep your body in a straight line. Pull your chest toward the bar, then lower with control.',
    instructions: 'Hold a low bar with your body straight and heels down. Pull your chest to the bar, then lower slowly.',
    progressionGroup: 'australian-row',
    progressionLevel: 2,
    easierVariationId: 'assisted-australian-rows',
    harderVariationId: 'feet-elevated-australian-rows',
  },
  {
    id: 'feet-elevated-australian-rows',
    name: 'Feet-Elevated Australian Rows',
    category: 'pull',
    difficulty: 'intermediate',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'biceps'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 6,
    animationType: 'feetElevatedAustralianRow',
    cue: 'Feet up so your body is level. Pull your chest to the bar, then lower with control.',
    instructions: 'Hold a low bar and rest your heels on a raised surface so your body is level. Keep it straight, pull your chest to the bar, then lower slowly.',
    progressionGroup: 'australian-row',
    progressionLevel: 3,
    easierVariationId: 'australian-rows',
    harderVariationId: 'archer-australian-rows',
    progression: { ceiling: 10 },
    progressionOnly: true,
    minProgressionExperience: 'some-experience',
  },
  {
    id: 'archer-australian-rows',
    name: 'Archer Australian Rows',
    category: 'pull',
    difficulty: 'advanced',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'biceps', 'core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 4,
    animationType: 'archerAustralianRow',
    cue: 'Reps are per side. Hands wide — pull toward one hand while the other arm stays straight.',
    instructions: 'Reps are per side. Take a wide grip under a low bar. Pull your chest toward one hand while keeping the other arm straight along the bar, lower with control, then switch sides.',
    progressionGroup: 'australian-row',
    progressionLevel: 4,
    easierVariationId: 'feet-elevated-australian-rows',
    progression: { ceiling: 8 },
    progressionOnly: true,
  },
  {
    id: 'assisted-australian-rows',
    name: 'Assisted Australian Rows',
    category: 'pull',
    difficulty: 'beginner',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'biceps'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'assistedAustralianRow',
    cue: 'Bend your knees to make the row easier. Pull your chest to the bar.',
    instructions: 'Set up under a low bar with bent knees. Pull your chest toward the bar, then lower with control.',
    progressionGroup: 'australian-row',
    progressionLevel: 1,
    harderVariationId: 'australian-rows',
  },
  {
    id: 'dead-hang',
    name: 'Dead Hang',
    category: 'pull',
    difficulty: 'beginner',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'shoulders'],
    type: 'hold',
    defaultSets: 3,
    defaultRepsOrDuration: 15,
    animationType: 'deadHang',
    cue: 'Hang from the bar with straight arms. Keep your shoulders active and breathe steadily.',
    instructions: 'Grip the bar slightly wider than your shoulders and hang with straight arms. Pull your shoulders gently away from your ears and hold.',
    progressionGroup: 'pull-up',
    progressionLevel: 1,
    harderVariationId: 'scapular-pull-ups',
  },
  {
    id: 'scapular-pull-ups',
    name: 'Scapular Pull-ups',
    category: 'pull',
    difficulty: 'beginner',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'shoulders'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 6,
    animationType: 'scapularPullUp',
    cue: 'Arms stay straight. Pull your shoulder blades down to lift your body slightly, then lower.',
    instructions: 'Hang from the bar with straight arms. Without bending your elbows, draw your shoulder blades down and back so your body rises a little, then lower with control.',
    progressionGroup: 'pull-up',
    progressionLevel: 2,
    easierVariationId: 'dead-hang',
    harderVariationId: 'negative-pull-ups',
    progressionOnly: true,
  },
  {
    id: 'negative-pull-ups',
    name: 'Negative Pull-ups',
    category: 'pull',
    difficulty: 'intermediate',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'biceps'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 3,
    animationType: 'negativePullUp',
    cue: 'Start with your chin over the bar, then lower slowly for 3–5 seconds until your arms are straight.',
    instructions: 'Step or jump up so your chin is over the bar. Lower yourself slowly and under control, taking 3–5 seconds, until your arms are straight. Step back up and repeat.',
    progressionGroup: 'pull-up',
    progressionLevel: 3,
    easierVariationId: 'scapular-pull-ups',
    harderVariationId: 'chin-ups',
    progression: { ceiling: 6 },
    progressionOnly: true,
  },
  {
    id: 'chin-ups',
    name: 'Chin-ups',
    category: 'pull',
    difficulty: 'intermediate',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'biceps'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 3,
    animationType: 'chinUp',
    cue: 'Palms facing you. Pull until your chin clears the bar, then lower with control.',
    instructions: 'Hang with your palms facing you, hands about shoulder-width apart. Pull your chest toward the bar until your chin clears it, then lower to straight arms.',
    progressionGroup: 'pull-up',
    progressionLevel: 4,
    easierVariationId: 'negative-pull-ups',
    harderVariationId: 'pull-ups',
    progression: { ceiling: 8 },
    progressionOnly: true,
  },
  {
    id: 'pull-ups',
    name: 'Pull-ups',
    category: 'pull',
    difficulty: 'intermediate',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'biceps'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 3,
    animationType: 'pullUp',
    cue: 'Palms facing away. Pull your elbows down until your chin clears the bar, then lower with control.',
    instructions: 'Hang with your palms facing away, hands slightly wider than your shoulders. Drive your elbows down to pull your chin over the bar, then lower to straight arms.',
    progressionGroup: 'pull-up',
    progressionLevel: 5,
    easierVariationId: 'chin-ups',
    harderVariationId: 'archer-pull-ups',
    progression: { ceiling: 8 },
    progressionOnly: true,
  },
  {
    id: 'archer-pull-ups',
    name: 'Archer Pull-ups',
    category: 'pull',
    difficulty: 'advanced',
    equipment: 'pull-up-bar',
    primaryMuscles: ['back', 'biceps', 'core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 2,
    animationType: 'archerPullUp',
    cue: 'Reps are per side. Hands wide — pull toward one hand while the other arm stays straight.',
    instructions: 'Reps are per side. Take a wide grip. Pull your chin toward one hand while keeping the other arm straight along the bar, lower with control, then switch sides.',
    progressionGroup: 'pull-up',
    progressionLevel: 6,
    easierVariationId: 'pull-ups',
    progression: { ceiling: 5 },
    progressionOnly: true,
  },
  {
    id: 'knee-plank',
    name: 'Knee Plank',
    category: 'core',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core', 'shoulders'],
    type: 'hold',
    defaultSets: 3,
    defaultRepsOrDuration: 20,
    animationType: 'kneePlank',
    cue: 'Forearms and knees down. Keep a straight line from knees to shoulders and breathe steadily.',
    instructions: 'Support yourself on your forearms and knees. Keep your hips in line with your shoulders and knees, and hold.',
    progressionGroup: 'plank',
    progressionLevel: 1,
    harderVariationId: 'plank',
    progressionOnly: true,
  },
  {
    id: 'plank',
    name: 'Plank',
    category: 'core',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core', 'shoulders'],
    type: 'hold',
    defaultSets: 3,
    defaultRepsOrDuration: 20,
    animationType: 'plank',
    cue: 'Keep your body in a straight line from head to heels. Brace your core and breathe steadily.',
    instructions: 'Support yourself on your forearms and toes. Keep your hips in line with your shoulders and heels.',
    progressionGroup: 'plank',
    progressionLevel: 2,
    easierVariationId: 'knee-plank',
    harderVariationId: 'shoulder-taps',
  },
  {
    id: 'shoulder-taps',
    name: 'Plank Shoulder Taps',
    category: 'core',
    difficulty: 'intermediate',
    equipment: 'none',
    primaryMuscles: ['core', 'shoulders'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'shoulderTaps',
    cue: 'Each tap counts as one rep. From a high plank, tap one hand to the opposite shoulder, then alternate. Keep your hips still.',
    instructions: 'Start in a high plank with your hands under your shoulders and feet a little wider than hips. Lift one hand to tap the opposite shoulder, place it back, then switch. Each tap counts as one rep.',
    progressionGroup: 'plank',
    progressionLevel: 3,
    easierVariationId: 'plank',
    harderVariationId: 'long-lever-plank',
    progression: { ceiling: 16, step: 2 },
    progressionOnly: true,
  },
  {
    id: 'long-lever-plank',
    name: 'Long-Lever Plank',
    category: 'core',
    difficulty: 'advanced',
    equipment: 'none',
    primaryMuscles: ['core', 'shoulders'],
    type: 'hold',
    defaultSets: 3,
    defaultRepsOrDuration: 15,
    animationType: 'longLeverPlank',
    cue: 'Forearms placed ahead of your shoulders. Brace hard and keep your hips level.',
    instructions: 'Set up in a forearm plank, then walk your elbows forward so they sit ahead of your shoulders. Keep a straight line from head to heels and hold.',
    progressionGroup: 'plank',
    progressionLevel: 4,
    easierVariationId: 'shoulder-taps',
    progressionOnly: true,
  },
  {
    id: 'dead-bug',
    name: 'Dead Bug',
    category: 'core',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'deadBug',
    cue: 'Keep your low back down. Extend opposite arm and leg, then return.',
    instructions: 'Lie on your back with arms up and knees bent. Slowly extend one arm and the opposite leg, then switch.',
    progressionGroup: 'hollow',
    progressionLevel: 1,
    harderVariationId: 'extended-dead-bug',
  },
  {
    id: 'extended-dead-bug',
    name: 'Extended Dead Bug',
    category: 'core',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'extendedDeadBug',
    cue: 'Keep your low back down. Reach one arm overhead and the opposite leg long, then switch.',
    instructions: 'Lie on your back with arms up and knees bent. Lower one arm all the way overhead while straightening the opposite leg just above the floor, then return and switch.',
    progressionGroup: 'hollow',
    progressionLevel: 2,
    easierVariationId: 'dead-bug',
    harderVariationId: 'tuck-hollow-hold',
    progressionOnly: true,
  },
  {
    id: 'tuck-hollow-hold',
    name: 'Tuck Hollow Hold',
    category: 'core',
    difficulty: 'intermediate',
    equipment: 'none',
    primaryMuscles: ['core', 'hip-flexors'],
    type: 'hold',
    defaultSets: 3,
    defaultRepsOrDuration: 15,
    animationType: 'tuckHollowHold',
    cue: 'Low back pressed down, knees tucked, shoulders lifted. Hold still and breathe.',
    instructions: 'Lie on your back, press your lower back into the floor, and lift your shoulders. Pull your knees in over your hips with arms reaching forward, and hold.',
    progressionGroup: 'hollow',
    progressionLevel: 3,
    easierVariationId: 'extended-dead-bug',
    harderVariationId: 'hollow-hold',
    progression: { ceiling: 30 },
    progressionOnly: true,
  },
  {
    id: 'hollow-hold',
    name: 'Hollow Hold',
    category: 'core',
    difficulty: 'intermediate',
    equipment: 'none',
    primaryMuscles: ['core', 'hip-flexors'],
    type: 'hold',
    defaultSets: 3,
    defaultRepsOrDuration: 15,
    animationType: 'hollowHold',
    cue: 'Low back pressed down. Arms overhead and legs long, shoulders and feet just off the floor.',
    instructions: 'Lie on your back and press your lower back into the floor. Lift your shoulders and legs, reach your arms overhead, and hold a shallow banana shape.',
    progressionGroup: 'hollow',
    progressionLevel: 4,
    easierVariationId: 'tuck-hollow-hold',
    harderVariationId: 'hollow-rocks',
    progressionOnly: true,
  },
  {
    id: 'hollow-rocks',
    name: 'Hollow Rocks',
    category: 'core',
    difficulty: 'advanced',
    equipment: 'none',
    primaryMuscles: ['core', 'hip-flexors'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 6,
    animationType: 'hollowRocks',
    cue: 'Hold the hollow shape and rock from shoulders to hips without bending.',
    instructions: 'Get into a hollow hold. Keeping the shape rigid, rock back toward your shoulders and forward toward your hips. Each rock back and forth counts as one rep.',
    progressionGroup: 'hollow',
    progressionLevel: 5,
    easierVariationId: 'hollow-hold',
    progressionOnly: true,
  },
  {
    id: 'bird-dog',
    name: 'Bird Dog',
    category: 'core',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core', 'glutes', 'back'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'birdDog',
    cue: 'Stay level. Reach one arm forward and the opposite leg back.',
    instructions: 'From hands and knees, extend opposite arm and leg without rotating your hips. Return and switch sides.',
  },
  {
    id: 'knee-side-plank',
    name: 'Knee Side Plank',
    category: 'core',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core', 'shoulders'],
    type: 'hold',
    defaultSets: 3,
    defaultRepsOrDuration: 15,
    animationType: 'kneeSidePlank',
    cue: 'Forearm under your shoulder, knees bent. Lift your hips in line and hold, then switch sides.',
    instructions: 'Lie on your side with your knees bent and forearm under your shoulder. Lift your hips so they line up with your knees and shoulders. Hold, then switch sides.',
    progressionGroup: 'side-plank',
    progressionLevel: 1,
    harderVariationId: 'side-plank',
    progression: { ceiling: 30 },
    progressionOnly: true,
  },
  {
    id: 'side-plank',
    name: 'Side Plank',
    category: 'core',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core', 'shoulders'],
    type: 'hold',
    defaultSets: 3,
    defaultRepsOrDuration: 15,
    animationType: 'sidePlank',
    cue: 'Stack your hips. Hold a straight line from head to feet.',
    instructions: 'Lie on your side and lift your hips, supporting on your forearm. Hold, then switch sides.',
    progressionGroup: 'side-plank',
    progressionLevel: 2,
    easierVariationId: 'knee-side-plank',
    harderVariationId: 'side-plank-hip-dips',
  },
  {
    id: 'side-plank-hip-dips',
    name: 'Side Plank Hip Dips',
    category: 'core',
    difficulty: 'intermediate',
    equipment: 'none',
    primaryMuscles: ['core', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'sidePlankHipDip',
    cue: 'Reps are per side. From a side plank, lower your hip toward the floor and lift it back up.',
    instructions: 'Reps are per side. Set up in a forearm side plank. Lower your hip until it nearly touches the floor, then lift it back into line. Finish the reps, then switch sides.',
    progressionGroup: 'side-plank',
    progressionLevel: 3,
    easierVariationId: 'side-plank',
    harderVariationId: 'star-plank',
    progression: { ceiling: 16, step: 2 },
    progressionOnly: true,
  },
  {
    id: 'star-plank',
    name: 'Star Plank',
    category: 'core',
    difficulty: 'advanced',
    equipment: 'none',
    primaryMuscles: ['core', 'shoulders', 'glutes'],
    type: 'hold',
    defaultSets: 3,
    defaultRepsOrDuration: 10,
    animationType: 'starPlank',
    cue: 'Side plank on a straight arm with your top arm and top leg raised. Hold, then switch sides.',
    instructions: 'Set up in a side plank on your hand. Raise your top arm toward the ceiling and lift your top leg, keeping your hips high. Hold, then switch sides.',
    progressionGroup: 'side-plank',
    progressionLevel: 4,
    easierVariationId: 'side-plank-hip-dips',
    progression: { ceiling: 30 },
    progressionOnly: true,
  },
  {
    id: 'crunches',
    name: 'Crunches',
    category: 'core',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 12,
    animationType: 'crunch',
    cue: 'Lift your shoulders slightly, then lower with control.',
    instructions: 'Lie on your back with knees bent. Curl your ribcage toward your hips, then lower slowly.',
  },
  {
    id: 'reverse-crunches',
    name: 'Reverse Crunches',
    category: 'core',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core', 'hip-flexors'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 10,
    animationType: 'reverseCrunch',
    cue: 'Lift your hips gently toward the ceiling, then lower.',
    instructions: 'Lie on your back with knees bent. Curl your hips off the floor, then return with control.',
  },
  {
    id: 'cat-cow',
    name: 'Cat Cow',
    category: 'mobility',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core', 'back'],
    type: 'reps',
    defaultSets: 2,
    defaultRepsOrDuration: 8,
    animationType: 'catCow',
    cue: 'Round your spine, then gently arch it. Move slowly.',
    instructions: 'On hands and knees, alternate between rounding your back and lifting your chest.',
  },
  {
    id: "childs-pose",
    name: "Child's Pose",
    category: 'mobility',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['back', 'hip-flexors'],
    type: 'hold',
    defaultSets: 2,
    defaultRepsOrDuration: 30,
    animationType: 'childPose',
    cue: 'Sit your hips toward your heels and reach your arms forward.',
    instructions: 'Kneel, sit back toward your heels, and rest your torso down with arms reaching forward.',
  },
  {
    id: 'shoulder-circles',
    name: 'Shoulder Circles',
    category: 'mobility',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['shoulders'],
    type: 'reps',
    defaultSets: 2,
    defaultRepsOrDuration: 10,
    animationType: 'shoulderCircles',
    cue: 'Draw slow, controlled circles with your shoulders.',
    instructions: 'Stand tall and circle your shoulders backward, then forward, keeping the movement smooth.',
  },
  {
    id: 'hip-circles',
    name: 'Hip Circles',
    category: 'mobility',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['glutes', 'hip-flexors'],
    type: 'reps',
    defaultSets: 2,
    defaultRepsOrDuration: 8,
    animationType: 'hipCircles',
    cue: 'Keep your feet planted and draw slow circles with your hips.',
    instructions: 'Stand with hands on your hips and circle your pelvis in one direction, then the other.',
  },
  {
    id: 'deep-squat-hold',
    name: 'Deep Squat Hold',
    category: 'mobility',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['quads', 'glutes'],
    type: 'hold',
    defaultSets: 2,
    defaultRepsOrDuration: 20,
    animationType: 'deepSquatHold',
    cue: 'Sit into a deep squat and keep your heels down.',
    instructions: 'Lower into a comfortable squat and hold, using your elbows against your knees for space if needed.',
  },
  {
    id: 'mountain-climbers',
    name: 'Mountain Climbers',
    category: 'conditioning',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core', 'hip-flexors', 'shoulders'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 16,
    animationType: 'mountainClimbers',
    cue: 'Keep a strong plank while driving your knees in one at a time.',
    instructions: 'From a plank, bring one knee toward your chest, then switch at a steady pace.',
  },
  {
    id: 'bear-crawl',
    name: 'Bear Crawl',
    category: 'conditioning',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['core', 'shoulders', 'quads'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'bearCrawl',
    cue: 'Keep your knees hovering and move opposite hand and foot.',
    instructions: 'From a tabletop hover, crawl forward slowly without letting your knees rest on the floor.',
  },
  {
    id: 'jumping-jacks',
    name: 'Jumping Jacks',
    category: 'conditioning',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['calves', 'shoulders'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 20,
    animationType: 'jumpingJacks',
    cue: 'Jump your feet out as your arms rise, then return.',
    instructions: 'From standing, jump your feet wide while raising your arms, then jump back to start.',
  },
  {
    id: 'step-ups',
    name: 'Step-ups',
    category: 'conditioning',
    difficulty: 'beginner',
    equipment: 'chair',
    primaryMuscles: ['quads', 'glutes'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 8,
    animationType: 'stepUp',
    cue: 'Step up with control, then step down slowly.',
    instructions: 'Place one foot on a sturdy step, stand up tall, then lower back down. Alternate legs.',
  },
  {
    id: 'high-knees',
    name: 'High Knees',
    category: 'conditioning',
    difficulty: 'beginner',
    equipment: 'none',
    primaryMuscles: ['hip-flexors', 'core', 'calves'],
    type: 'reps',
    defaultSets: 3,
    defaultRepsOrDuration: 20,
    animationType: 'highKnees',
    cue: 'Lift your knees toward hip height and stay light on your feet.',
    instructions: 'Jog in place, driving one knee up at a time while keeping your torso tall.',
  },
];

export type ExerciseGuide = {
  description: string;
  howTo: string[];
  formTips: string[];
};

const EXERCISE_GUIDES: Record<string, ExerciseGuide> = {
  'incline-push-ups': {
    description: 'A push-up variation that reduces the load while helping you build pressing strength.',
    howTo: [
      'Place your hands on a sturdy chair, slightly wider than your shoulders.',
      'Walk your feet back until your body is straight.',
      'Lower your chest toward the chair with control.',
      'Press away until your arms are straight.',
    ],
    formTips: ['Keep your body in one line.', 'Keep your elbows slightly tucked.', 'Move slowly and with control.'],
  },
  'knee-push-ups': {
    description: 'A floor push-up from the knees that builds chest and arm strength with less load.',
    howTo: [
      'Start on your knees with your hands under your shoulders.',
      'Keep a straight line from knees to shoulders.',
      'Lower your chest toward the floor.',
      'Press back to the starting position.',
    ],
    formTips: ['Do not let your hips sag.', 'Keep your core tight.', 'Lower with control, then press up.'],
  },
  'wall-push-ups': {
    description: 'The easiest push-up variation. Use a wall to learn the pressing pattern with very little load.',
    howTo: [
      'Stand facing a wall and place your hands at chest height.',
      'Step your feet back slightly so you are leaning in.',
      'Bend your elbows and bring your chest toward the wall.',
      'Press away until your arms are straight.',
    ],
    formTips: ['Keep your body straight.', 'Do not shrug your shoulders.', 'Move slowly.'],
  },
  'push-ups': {
    description: 'A full-body press from a plank. Stronger than knee or incline variations.',
    howTo: [
      'Start in a plank with your hands under your shoulders.',
      'Keep your body in a straight line.',
      'Lower your chest toward the floor.',
      'Press back up without letting your hips drop.',
    ],
    formTips: ['Brace your core.', 'Keep your elbows slightly tucked.', 'Do not let your head hang.'],
  },
  'diamond-push-ups': {
    description: 'A close-hand push-up that shifts more of the work to your triceps.',
    howTo: [
      'Start in a plank with your hands together under your chest.',
      'Touch thumbs and index fingers to form a diamond.',
      'Lower your chest toward your hands, elbows close to your sides.',
      'Press back up until your arms are straight.',
    ],
    formTips: ['Keep your body in one line.', 'Keep your elbows close.', 'Move slowly and with control.'],
  },
  'decline-push-ups': {
    description: 'A push-up with your feet raised, putting more load on your chest and shoulders.',
    howTo: [
      'Place your feet on a sturdy chair behind you.',
      'Put your hands on the floor under your shoulders.',
      'Lower your chest toward the floor.',
      'Press back up without letting your hips sag.',
    ],
    formTips: ['Use a stable chair that will not slide.', 'Brace your core.', 'Keep your neck neutral.'],
  },
  'archer-push-ups': {
    description: 'An advanced one-sided push-up that builds toward single-arm strength. Reps are counted per side.',
    howTo: [
      'Start in a plank with your hands placed wide.',
      'Bend one arm and shift your chest toward that hand.',
      'Keep the other arm straight as it slides out to the side.',
      'Press back to the middle, then repeat on the other side.',
    ],
    formTips: ['Reps are per side.', 'Keep your hips level.', 'Only lower as far as you can control.'],
  },
  'bodyweight-squats': {
    description: 'A simple lower-body strength move. Sit your hips back, then stand up tall.',
    howTo: [
      'Stand with your feet about shoulder-width apart.',
      'Sit your hips back and down.',
      'Keep your heels on the floor.',
      'Stand up by pressing through your feet.',
    ],
    formTips: ['Keep your chest lifted.', 'Do not let your knees collapse inward.', 'Move at a steady pace.'],
  },
  'reverse-lunges': {
    description: 'A split-stance leg exercise. Stepping back is often easier to control than stepping forward.',
    howTo: [
      'Stand tall with your feet together.',
      'Step one foot back and bend both knees.',
      'Lower until your back knee is close to the floor.',
      'Press through the front foot to stand, then switch sides.',
    ],
    formTips: ['Keep your torso upright.', 'Take a comfortable step, not a huge one.', 'Move with control.'],
  },
  'split-squats': {
    description: 'A stationary lunge that builds single-leg strength and balance.',
    howTo: [
      'Stand in a staggered stance.',
      'Keep most of your weight on the front foot.',
      'Lower the back knee toward the floor.',
      'Press up, then switch legs after the set.',
    ],
    formTips: ['Keep your front heel down.', 'Lower straight down, not forward.', 'Hold a wall if you need balance.'],
  },
  'assisted-split-squats': {
    description: 'A split squat with a light support so you can learn the movement with more balance.',
    howTo: [
      'Hold a wall or chair lightly for balance.',
      'Stand in a staggered stance.',
      'Lower the back knee with control.',
      'Stand up, then switch legs after the set.',
    ],
    formTips: ['Use the support for balance, not to pull yourself up.', 'Keep your torso tall.', 'Move slowly.'],
  },
  'calf-raises': {
    description: 'A simple move to strengthen your calves and ankles.',
    howTo: [
      'Stand tall with your feet under your hips.',
      'Rise onto the balls of your feet.',
      'Pause at the top.',
      'Lower your heels slowly.',
    ],
    formTips: ['Keep your ankles steady.', 'Do not bounce.', 'Hold a wall if you need balance.'],
  },
  'box-squats': {
    description: 'A squat to a chair that teaches depth and control with a safe target.',
    howTo: [
      'Stand in front of a sturdy chair, feet shoulder-width apart.',
      'Sit your hips back and down.',
      'Lightly touch the seat without sitting down.',
      'Stand up by pressing through your feet.',
    ],
    formTips: ['Use a chair that will not slide.', 'Keep your chest up.', 'Touch the seat lightly.'],
  },
  'assisted-pistol-squats': {
    description: 'A single-leg squat with light support, building toward the full pistol.',
    howTo: [
      'Hold a wall, door frame or sturdy post.',
      'Stand on one leg with the other reaching forward.',
      'Sit down as low as you can control.',
      'Stand up, using the support only as needed.',
    ],
    formTips: ['Reps are per side.', 'Keep your standing heel down.', 'Use less support over time.'],
  },
  'pistol-squats': {
    description: 'An advanced single-leg squat through full depth without support.',
    howTo: [
      'Stand on one leg with the other held straight out in front.',
      'Reach your arms forward for balance.',
      'Sit all the way down with control.',
      'Stand back up without support.',
    ],
    formTips: ['Reps are per side.', 'Keep your heel down.', 'Return to assisted pistols if you lose balance.'],
  },
  'bulgarian-split-squats': {
    description: 'A rear-foot-elevated split squat that loads the front leg harder.',
    howTo: [
      'Stand a stride in front of a sturdy chair.',
      'Rest the top of your back foot on the seat.',
      'Lower until your front thigh is near parallel.',
      'Press back up through the front foot.',
    ],
    formTips: ['Reps are per side.', 'Keep your torso tall.', 'Use a chair that will not slide.'],
  },
  'shrimp-squats': {
    description: 'An advanced single-leg squat with the back leg bent behind you.',
    howTo: [
      'Stand on one leg.',
      'Bend the other knee and hold that foot behind you.',
      'Lower slowly until the back knee touches the floor.',
      'Drive up through the standing leg.',
    ],
    formTips: ['Reps are per side.', 'Lean forward slightly for balance.', 'Use a soft surface under the back knee.'],
  },
  'single-leg-calf-raises': {
    description: 'A one-leg calf raise that doubles the load on each calf.',
    howTo: [
      'Stand on one foot.',
      'Rest a fingertip on a wall for balance.',
      'Lift your heel as high as you can.',
      'Pause, then lower with control.',
    ],
    formTips: ['Reps are per side.', 'Move slowly.', 'Keep the knee soft, not locked.'],
  },
  'glute-bridges': {
    description: 'A floor exercise that strengthens the glutes and the back of your legs.',
    howTo: [
      'Lie on your back with your knees bent and feet flat.',
      'Press through your heels.',
      'Lift your hips until your body forms a line from shoulders to knees.',
      'Lower with control.',
    ],
    formTips: ['Squeeze your glutes at the top.', 'Do not arch your lower back.', 'Keep your ribs down.'],
  },
  'single-leg-glute-bridges': {
    description: 'A harder bridge. One leg does the work, so your glutes have to work more.',
    howTo: [
      'Set up as you would for a glute bridge.',
      'Extend one leg.',
      'Lift your hips using the planted foot.',
      'Lower slowly, then switch sides.',
    ],
    formTips: ['Keep your hips level.', 'Do not twist.', 'Press through the heel that stays down.'],
  },
  'good-mornings': {
    description: 'A hip hinge that teaches you to bend at the hips while keeping a long, strong back.',
    howTo: [
      'Stand tall with a soft bend in your knees.',
      'Push your hips back as your torso leans forward.',
      'Keep your back long and your chest open.',
      'Stand up by squeezing your glutes.',
    ],
    formTips: ['Hinge from the hips, not the waist.', 'Do not round your back.', 'Keep the movement slow.'],
  },
  'australian-rows': {
    description: 'A horizontal pulling exercise using a low bar. It builds back and arm strength.',
    howTo: [
      'Hold a low bar with your body straight and heels on the floor.',
      'Keep your arms long at the start.',
      'Pull your chest toward the bar.',
      'Lower with control.',
    ],
    formTips: ['Keep your body in one line.', 'Squeeze your shoulder blades.', 'Do not shrug your neck.'],
  },
  'assisted-australian-rows': {
    description: 'An easier row. Bent knees reduce the load so you can learn the pulling pattern.',
    howTo: [
      'Set up under a low bar with your knees bent.',
      'Hold the bar with straight arms.',
      'Pull your chest toward the bar.',
      'Lower slowly.',
    ],
    formTips: ['Keep your shoulders down.', 'Move your chest to the bar, not your hips.', 'Use a range you can control.'],
  },
  'feet-elevated-australian-rows': {
    description: 'A level-body row with your feet raised, which puts more of your weight on your back and arms.',
    howTo: [
      'Hold a low bar with an overhand grip.',
      'Rest your heels on a raised surface so your body is level.',
      'Keep your body straight and pull your chest to the bar.',
      'Lower with control.',
    ],
    formTips: ['Squeeze your shoulder blades together.', 'Do not let your hips sag.', 'Lower your feet if you cannot reach the bar.'],
  },
  'archer-australian-rows': {
    description: 'An advanced one-sided row that builds toward single-arm pulling strength.',
    howTo: [
      'Take a wide grip under a low bar.',
      'Pull your chest toward one hand.',
      'Keep the other arm straight along the bar.',
      'Lower with control, then switch sides.',
    ],
    formTips: ['Reps are per side.', 'Keep your hips level.', 'Do not twist your torso.'],
  },
  'dead-hang': {
    description: 'A simple hang that builds grip and shoulder strength for pulling.',
    howTo: [
      'Grip the bar slightly wider than your shoulders.',
      'Hang with straight arms.',
      'Pull your shoulders gently away from your ears.',
      'Breathe steadily and hold.',
    ],
    formTips: ['Keep your shoulders active, not shrugged.', 'Keep your body still.', 'Use a step to get on and off the bar.'],
  },
  'scapular-pull-ups': {
    description: 'A small shoulder-blade movement that teaches the first part of every pull-up.',
    howTo: [
      'Hang from the bar with straight arms.',
      'Draw your shoulder blades down and back.',
      'Let your body rise a little without bending your elbows.',
      'Lower with control.',
    ],
    formTips: ['Keep your elbows straight.', 'Move slowly.', 'Think of pulling your shoulders away from your ears.'],
  },
  'negative-pull-ups': {
    description: 'A slow lowering from the top of a pull-up that builds strength for full reps.',
    howTo: [
      'Step or jump up so your chin is over the bar.',
      'Hold the top briefly.',
      'Lower slowly for 3–5 seconds.',
      'Stop at straight arms, then step back up.',
    ],
    formTips: ['Take 3–5 seconds on the way down.', 'Do not drop at the bottom.', 'Use a sturdy step to reach the top.'],
  },
  'chin-ups': {
    description: 'A vertical pull with palms facing you, which lets your biceps help more.',
    howTo: [
      'Hang with palms facing you, hands shoulder-width apart.',
      'Pull your chest toward the bar.',
      'Clear the bar with your chin.',
      'Lower to straight arms with control.',
    ],
    formTips: ['Avoid swinging.', 'Keep your shoulders down.', 'Lower all the way each rep.'],
  },
  'pull-ups': {
    description: 'A vertical pull with palms facing away, the classic upper-body strength test.',
    howTo: [
      'Hang with palms facing away, hands slightly wider than your shoulders.',
      'Drive your elbows down toward your ribs.',
      'Pull until your chin clears the bar.',
      'Lower to straight arms with control.',
    ],
    formTips: ['Avoid kicking or swinging.', 'Keep your shoulders down.', 'Lower all the way each rep.'],
  },
  'archer-pull-ups': {
    description: 'An advanced one-sided pull-up that builds toward single-arm strength.',
    howTo: [
      'Take a wide grip on the bar.',
      'Pull your chin toward one hand.',
      'Keep the other arm straight along the bar.',
      'Lower with control, then switch sides.',
    ],
    formTips: ['Reps are per side.', 'Keep your body still.', 'Only go as high as you can control.'],
  },
  plank: {
    description: 'A still hold that builds core strength and teaches you to keep a straight body line.',
    howTo: [
      'Place your forearms on the floor, elbows under your shoulders.',
      'Step your feet back onto your toes.',
      'Keep your body in a straight line.',
      'Breathe steadily and hold.',
    ],
    formTips: ['Do not let your hips sag or pike up.', 'Press the floor away.', 'Keep your neck long.'],
  },
  'dead-bug': {
    description: 'A floor core exercise that teaches you to move your arms and legs without arching your back.',
    howTo: [
      'Lie on your back with your arms up and knees bent above your hips.',
      'Press your lower back gently into the floor.',
      'Extend one arm and the opposite leg.',
      'Return to the start, then switch sides.',
    ],
    formTips: ['Keep your lower back down.', 'Move slowly.', 'If your back lifts, make the movement smaller.'],
  },
  'bird-dog': {
    description: 'A balance and core move from hands and knees. Reach opposite arm and leg without rotating.',
    howTo: [
      'Start on your hands and knees.',
      'Reach one arm forward and the opposite leg back.',
      'Pause while staying level.',
      'Return, then switch sides.',
    ],
    formTips: ['Keep your hips square.', 'Do not let your back sag.', 'Reach long, do not lift high.'],
  },
  'side-plank': {
    description: 'A side-body hold that strengthens the core and shoulders.',
    howTo: [
      'Lie on your side with your forearm on the floor.',
      'Stack your feet or stagger them for balance.',
      'Lift your hips so your body forms a straight line.',
      'Hold, then switch sides.',
    ],
    formTips: ['Keep your hips stacked.', 'Do not roll forward.', 'Start with a shorter hold if needed.'],
  },
  'knee-plank': {
    description: 'An easier plank on your knees that builds the same braced position.',
    howTo: [
      'Place your forearms on the floor with elbows under your shoulders.',
      'Rest on your knees with your feet behind you.',
      'Lift your hips so your body is straight from knees to shoulders.',
      'Hold while breathing steadily.',
    ],
    formTips: ['Keep your hips in line.', 'Brace your core.', 'Do not hold your breath.'],
  },
  'shoulder-taps': {
    description: 'A high plank with alternating shoulder taps that trains your core to resist rotation.',
    howTo: [
      'Start in a high plank with hands under your shoulders.',
      'Set your feet a little wider than your hips.',
      'Tap one hand to the opposite shoulder, then place it back.',
      'Alternate sides. Each tap counts as one rep.',
    ],
    formTips: ['Keep your hips still.', 'Move slowly.', 'Widen your feet if you rock side to side.'],
  },
  'long-lever-plank': {
    description: 'A harder plank with your elbows ahead of your shoulders, which lengthens the lever on your core.',
    howTo: [
      'Start in a forearm plank.',
      'Walk your elbows forward a few inches past your shoulders.',
      'Brace hard and keep your body straight.',
      'Hold while breathing steadily.',
    ],
    formTips: ['Keep your hips level.', 'Squeeze your glutes.', 'Move your elbows closer if your back arches.'],
  },
  'extended-dead-bug': {
    description: 'A dead bug with a longer reach that adds more load to your core.',
    howTo: [
      'Lie on your back with arms up and knees bent above your hips.',
      'Press your lower back gently into the floor.',
      'Lower one arm overhead while straightening the opposite leg just above the floor.',
      'Return, then switch sides.',
    ],
    formTips: ['Keep your lower back down.', 'Move slowly.', 'Shorten the reach if your back lifts.'],
  },
  'tuck-hollow-hold': {
    description: 'A tucked version of the hollow hold that teaches the gymnastics core position.',
    howTo: [
      'Lie on your back and press your lower back into the floor.',
      'Lift your head and shoulders.',
      'Pull your knees in over your hips.',
      'Reach your arms forward and hold.',
    ],
    formTips: ['Keep your lower back down.', 'Keep your chin slightly tucked.', 'Breathe steadily.'],
  },
  'hollow-hold': {
    description: 'The classic gymnastics core hold with long arms and legs.',
    howTo: [
      'Lie on your back and press your lower back into the floor.',
      'Lift your shoulders and reach your arms overhead.',
      'Straighten your legs and lift them just off the floor.',
      'Hold the shallow banana shape.',
    ],
    formTips: ['Keep your lower back down.', 'Raise your legs higher if your back lifts.', 'Breathe steadily.'],
  },
  'hollow-rocks': {
    description: 'An advanced dynamic hollow hold that rocks while staying rigid.',
    howTo: [
      'Get into a hollow hold.',
      'Keep your arms and legs still.',
      'Rock back toward your shoulders, then forward toward your hips.',
      'Each rock back and forth counts as one rep.',
    ],
    formTips: ['Stay rigid.', 'Keep your lower back pressed down.', 'Make the rock smaller if the shape breaks.'],
  },
  'knee-side-plank': {
    description: 'An easier side plank on your knees that builds side-body strength.',
    howTo: [
      'Lie on your side with knees bent and forearm under your shoulder.',
      'Lift your hips so they line up with your knees and shoulders.',
      'Hold.',
      'Switch sides.',
    ],
    formTips: ['Keep your hips stacked.', 'Do not roll forward.', 'Push the floor away with your forearm.'],
  },
  'side-plank-hip-dips': {
    description: 'A side plank with controlled hip dips that works your obliques through a range of motion.',
    howTo: [
      'Set up in a forearm side plank.',
      'Lower your hip until it nearly touches the floor.',
      'Lift it back into a straight line.',
      'Finish the reps, then switch sides.',
    ],
    formTips: ['Reps are per side.', 'Move slowly.', 'Keep your hips stacked.'],
  },
  'star-plank': {
    description: 'An advanced side plank with the top arm and leg raised.',
    howTo: [
      'Set up in a side plank on your hand.',
      'Raise your top arm toward the ceiling.',
      'Lift your top leg while keeping your hips high.',
      'Hold, then switch sides.',
    ],
    formTips: ['Keep your hips high.', 'Stack your shoulder over your wrist.', 'Lower the top leg if you lose balance.'],
  },
  crunches: {
    description: 'A small sit-up that trains the front of your core without using momentum.',
    howTo: [
      'Lie on your back with your knees bent.',
      'Rest your hands lightly by your head or across your chest.',
      'Curl your ribs toward your hips.',
      'Lower slowly.',
    ],
    formTips: ['Do not pull on your neck.', 'Keep the movement small and controlled.', 'Exhale as you lift.'],
  },
  'reverse-crunches': {
    description: 'A core move that lifts the hips instead of the chest. Keep it small and controlled.',
    howTo: [
      'Lie on your back with your knees bent.',
      'Keep your arms by your sides.',
      'Gently curl your hips off the floor.',
      'Lower with control.',
    ],
    formTips: ['Do not swing your legs.', 'Keep the lift small.', 'Move slowly.'],
  },
  'cat-cow': {
    description: 'A gentle spine mobility drill. Round and arch slowly to warm up your back.',
    howTo: [
      'Start on your hands and knees.',
      'Round your back and drop your head.',
      'Then lift your chest and look slightly forward.',
      'Flow between the two positions slowly.',
    ],
    formTips: ['Move with your breath.', 'Keep it comfortable, not forced.', 'Spread the movement through your whole spine.'],
  },
  "childs-pose": {
    description: 'A resting stretch for your back, hips, and shoulders.',
    howTo: [
      'Kneel on the floor.',
      'Sit your hips toward your heels.',
      'Reach your arms forward and rest your torso down.',
      'Breathe slowly and hold.',
    ],
    formTips: ['Let your chest be heavy.', 'Widen your knees if that feels better.', 'Do not force the stretch.'],
  },
  'shoulder-circles': {
    description: 'A simple mobility drill to warm up your shoulders.',
    howTo: [
      'Stand tall with your arms relaxed.',
      'Circle your shoulders backward slowly.',
      'Then circle them forward.',
      'Keep the circles smooth.',
    ],
    formTips: ['Move slowly.', 'Keep your neck relaxed.', 'Make the circle as large as is comfortable.'],
  },
  'hip-circles': {
    description: 'A gentle mobility drill to loosen your hips before training.',
    howTo: [
      'Stand with your feet under your hips.',
      'Place your hands on your hips.',
      'Draw slow circles with your pelvis.',
      'Switch directions after a few circles.',
    ],
    formTips: ['Keep your feet planted.', 'Stay tall.', 'Keep the movement smooth.'],
  },
  'deep-squat-hold': {
    description: 'A resting squat that opens the hips and trains a comfortable bottom position.',
    howTo: [
      'Stand with your feet a little wider than your hips.',
      'Sit down into a deep squat.',
      'Keep your heels down if you can.',
      'Hold and breathe.',
    ],
    formTips: ['Use a support if you feel wobbly.', 'Keep your chest as lifted as is comfortable.', 'Do not force depth.'],
  },
  'mountain-climbers': {
    description: 'A plank with alternating knees. It raises your heart rate while training the core.',
    howTo: [
      'Start in a strong plank.',
      'Drive one knee toward your chest.',
      'Switch legs at a steady pace.',
      'Keep your shoulders over your hands.',
    ],
    formTips: ['Do not bounce your hips.', 'Keep a firm plank.', 'Choose a pace you can control.'],
  },
  'bear-crawl': {
    description: 'A slow crawl with your knees hovering. It challenges core strength and coordination.',
    howTo: [
      'Start on your hands and knees, then hover your knees.',
      'Move opposite hand and foot forward.',
      'Keep your back fairly flat.',
      'Crawl slowly for the prescribed reps.',
    ],
    formTips: ['Keep your knees close to the floor.', 'Do not rush.', 'Stay quiet through your shoulders.'],
  },
  'jumping-jacks': {
    description: 'A simple conditioning move that warms you up and gets your heart rate going.',
    howTo: [
      'Stand tall with your feet together.',
      'Jump your feet out as your arms rise.',
      'Jump back to the start.',
      'Keep a light, steady rhythm.',
    ],
    formTips: ['Land softly.', 'Keep your knees soft.', 'If jumping is too much, step the feet out instead.'],
  },
  'step-ups': {
    description: 'A single-leg strength move using a sturdy chair or step.',
    howTo: [
      'Place one foot fully on a sturdy chair or step.',
      'Press through that foot to stand up tall.',
      'Step down with control.',
      'Alternate legs.',
    ],
    formTips: ['Use a stable surface.', 'Do not push off the back foot too much.', 'Stand all the way up at the top.'],
  },
  'high-knees': {
    description: 'A light running drill in place. Lift your knees and stay tall.',
    howTo: [
      'Stand tall.',
      'Jog in place and lift one knee toward hip height.',
      'Switch legs quickly but under control.',
      'Keep your arms moving naturally.',
    ],
    formTips: ['Stay light on your feet.', 'Keep your torso upright.', 'Use a march if jogging feels like too much.'],
  },
};

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find((exercise) => exercise.id === id);
}

export function getExerciseGuide(id: string): ExerciseGuide | undefined {
  return EXERCISE_GUIDES[id];
}

export function getProgressionChain(exercise: Exercise): Exercise[] {
  if (!exercise.progressionGroup) {
    return [];
  }

  return EXERCISES.filter((item) => item.progressionGroup === exercise.progressionGroup).sort(
    (a, b) => (a.progressionLevel ?? 0) - (b.progressionLevel ?? 0)
  );
}

export function getRelatedExercises(exercise: Exercise): Exercise[] {
  const grouped = getProgressionChain(exercise).filter((item) => item.id !== exercise.id);
  if (grouped.length > 0) {
    return grouped;
  }

  const seen = new Set<string>([exercise.id]);
  const related: Exercise[] = [];

  function walk(startId: string | undefined, key: 'easierVariationId' | 'harderVariationId') {
    let cursor = startId ? getExerciseById(startId) : undefined;
    while (cursor && !seen.has(cursor.id)) {
      seen.add(cursor.id);
      related.push(cursor);
      const nextId = cursor[key];
      cursor = nextId ? getExerciseById(nextId) : undefined;
    }
  }

  walk(exercise.easierVariationId, 'easierVariationId');
  walk(exercise.harderVariationId, 'harderVariationId');
  return related;
}

export function formatExerciseEquipment(equipment: ExerciseEquipment): string {
  switch (equipment) {
    case 'none':
      return 'NO EQUIPMENT';
    case 'chair':
      return 'CHAIR';
    case 'pull-up-bar':
      return 'PULL-UP BAR';
    case 'gym':
      return 'GYM';
  }
}

export function getExercisesByCategory(category: ExerciseCategory): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.category === category);
}

export function isExerciseAvailable(
  exercise: Exercise,
  userEquipment: readonly ExerciseEquipment[]
): boolean {
  const owned = new Set(userEquipment);
  if (owned.has('gym')) {
    return true;
  }
  if (exercise.equipment === 'none') {
    return true;
  }
  return owned.has(exercise.equipment);
}

function findAvailableVariation(
  exercise: Exercise,
  key: 'harderVariationId' | 'easierVariationId',
  userEquipment: readonly ExerciseEquipment[],
  isWithinLimit?: (candidate: Exercise) => boolean
): Exercise | undefined {
  const seen = new Set<string>([exercise.id]);
  let cursor = exercise[key] ? getExerciseById(exercise[key]) : undefined;
  while (cursor && !seen.has(cursor.id)) {
    if (isWithinLimit && !isWithinLimit(cursor)) {
      return undefined;
    }
    if (isExerciseAvailable(cursor, userEquipment)) {
      return cursor;
    }
    seen.add(cursor.id);
    const nextId = cursor[key];
    cursor = nextId ? getExerciseById(nextId) : undefined;
  }
  return undefined;
}

/**
 * Nearest harder variation in the chain the user can perform, skipping unavailable steps.
 * `isWithinLimit` (e.g. the experience difficulty ceiling) ends the walk at the first
 * variation that fails it, since everything further up the chain is harder still.
 */
export function getNextAvailableVariation(
  exercise: Exercise,
  userEquipment: readonly ExerciseEquipment[],
  isWithinLimit?: (candidate: Exercise) => boolean
): Exercise | undefined {
  return findAvailableVariation(exercise, 'harderVariationId', userEquipment, isWithinLimit);
}

/** Nearest easier variation in the chain the user can perform, skipping unavailable steps. */
export function getPreviousAvailableVariation(
  exercise: Exercise,
  userEquipment: readonly ExerciseEquipment[]
): Exercise | undefined {
  return findAvailableVariation(exercise, 'easierVariationId', userEquipment);
}

export type ExerciseProgressionIssue = {
  exerciseId?: string;
  message: string;
};

export function validateExerciseProgression(
  exercises: Exercise[] = EXERCISES
): ExerciseProgressionIssue[] {
  const issues: ExerciseProgressionIssue[] = [];
  const byId = new Map(exercises.map((exercise) => [exercise.id, exercise]));

  if (byId.size !== exercises.length) {
    issues.push({ message: 'Duplicate exercise IDs' });
  }

  for (const exercise of exercises) {
    const { id, easierVariationId, harderVariationId, progressionGroup, progressionLevel } =
      exercise;

    if (easierVariationId === id) {
      issues.push({ exerciseId: id, message: 'easierVariationId points to itself' });
    }
    if (harderVariationId === id) {
      issues.push({ exerciseId: id, message: 'harderVariationId points to itself' });
    }
    if (easierVariationId && !byId.has(easierVariationId)) {
      issues.push({
        exerciseId: id,
        message: `easierVariationId "${easierVariationId}" does not exist`,
      });
    }
    if (harderVariationId && !byId.has(harderVariationId)) {
      issues.push({
        exerciseId: id,
        message: `harderVariationId "${harderVariationId}" does not exist`,
      });
    }

    if (exercise.progression) {
      const { ceiling, step } = exercise.progression;
      if (step != null && (!Number.isInteger(step) || step < 1)) {
        issues.push({ exerciseId: id, message: 'progression.step must be a positive integer' });
      }
      if (ceiling != null) {
        const start = exercise.defaultRepsOrDuration;
        const increment = step ?? (exercise.type === 'hold' ? 5 : 1);
        if (!Number.isInteger(ceiling) || ceiling < start) {
          issues.push({
            exerciseId: id,
            message: 'progression.ceiling must be an integer at or above defaultRepsOrDuration',
          });
        } else if (increment >= 1 && (ceiling - start) % increment !== 0) {
          issues.push({
            exerciseId: id,
            message: 'progression.ceiling must be reachable from defaultRepsOrDuration in whole steps',
          });
        }
      }
    }

    if (exercise.independentDefault && exercise.progressionOnly) {
      issues.push({ exerciseId: id, message: 'independentDefault and progressionOnly are contradictory' });
    }

    const hasLink = Boolean(easierVariationId || harderVariationId);
    if (hasLink && !progressionGroup) {
      issues.push({ exerciseId: id, message: 'Linked variation is missing progressionGroup' });
    }
    if (hasLink && progressionLevel == null) {
      issues.push({ exerciseId: id, message: 'Linked variation is missing progressionLevel' });
    }
    if (progressionLevel != null && !progressionGroup) {
      issues.push({ exerciseId: id, message: 'progressionLevel without progressionGroup' });
    }
    if (
      progressionGroup != null &&
      (progressionLevel == null || !Number.isInteger(progressionLevel) || progressionLevel < 1)
    ) {
      issues.push({
        exerciseId: id,
        message: 'progressionLevel must be an integer of 1 or higher',
      });
    }

    const easier = easierVariationId ? byId.get(easierVariationId) : undefined;
    if (easierVariationId && easier) {
      if (easier.harderVariationId !== id) {
        issues.push({
          exerciseId: id,
          message: `"${easierVariationId}" does not point back via harderVariationId`,
        });
      }
      if (easier.progressionGroup !== progressionGroup) {
        issues.push({
          exerciseId: id,
          message: 'easier variation belongs to a different progressionGroup',
        });
      }
      if (
        easier.progressionLevel != null &&
        progressionLevel != null &&
        easier.progressionLevel >= progressionLevel
      ) {
        issues.push({
          exerciseId: id,
          message: 'easier variation must have a lower progressionLevel',
        });
      }
    }

    const harder = harderVariationId ? byId.get(harderVariationId) : undefined;
    if (harderVariationId && harder) {
      if (harder.easierVariationId !== id) {
        issues.push({
          exerciseId: id,
          message: `"${harderVariationId}" does not point back via easierVariationId`,
        });
      }
      if (harder.progressionGroup !== progressionGroup) {
        issues.push({
          exerciseId: id,
          message: 'harder variation belongs to a different progressionGroup',
        });
      }
      if (
        harder.progressionLevel != null &&
        progressionLevel != null &&
        harder.progressionLevel <= progressionLevel
      ) {
        issues.push({
          exerciseId: id,
          message: 'harder variation must have a higher progressionLevel',
        });
      }
    }

    const seen = new Set<string>();
    let cursor: Exercise | undefined = exercise;
    while (cursor?.harderVariationId) {
      if (seen.has(cursor.id)) {
        issues.push({ exerciseId: id, message: 'circular harderVariationId chain' });
        break;
      }
      seen.add(cursor.id);
      cursor = byId.get(cursor.harderVariationId);
    }
  }

  const groups = new Map<string, Exercise[]>();
  for (const exercise of exercises) {
    if (!exercise.progressionGroup) {
      continue;
    }
    const members = groups.get(exercise.progressionGroup) ?? [];
    members.push(exercise);
    groups.set(exercise.progressionGroup, members);
  }

  for (const [group, members] of groups) {
    const levels = members.map((member) => member.progressionLevel);
    if (new Set(levels).size !== members.length) {
      issues.push({ message: `Duplicate progressionLevel in group "${group}"` });
    }

    const roots = members.filter((member) => !member.easierVariationId);
    if (roots.length !== 1) {
      issues.push({
        message: `Group "${group}" must have exactly one easiest exercise`,
      });
      continue;
    }

    const visited = new Set<string>();
    let cursor: Exercise | undefined = roots[0];
    while (cursor) {
      if (visited.has(cursor.id)) {
        issues.push({ message: `Group "${group}" contains a circular chain` });
        break;
      }
      visited.add(cursor.id);
      cursor = cursor.harderVariationId ? byId.get(cursor.harderVariationId) : undefined;
    }

    if (visited.size !== members.length) {
      issues.push({
        message: `Group "${group}" is not a single connected harder/easier chain`,
      });
    }
  }

  return issues;
}

if (__DEV__) {
  const progressionIssues = validateExerciseProgression();
  if (progressionIssues.length > 0) {
    console.warn('Exercise progression validation failed', progressionIssues);
  }
}
