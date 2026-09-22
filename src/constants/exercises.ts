export type ExerciseCategory =
  | 'push'
  | 'legs'
  | 'glutes'
  | 'pull'
  | 'core'
  | 'mobility'
  | 'conditioning';

export type ExerciseDifficulty = 'beginner' | 'intermediate';

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
  | 'squat'
  | 'reverseLunge'
  | 'splitSquat'
  | 'assistedSplitSquat'
  | 'calfRaise'
  | 'gluteBridge'
  | 'singleLegGluteBridge'
  | 'goodMorning'
  | 'australianRow'
  | 'assistedAustralianRow'
  | 'plank'
  | 'deadBug'
  | 'birdDog'
  | 'sidePlank'
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
  | 'australian-row';

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
