import {
  type EquipmentOption,
  type ExperienceLevel,
  type Goal,
} from '@/lib/user-preferences';

export const EXPERIENCE_OPTIONS: { id: ExperienceLevel; label: string }[] = [
  { id: 'beginner', label: 'Beginner' },
  { id: 'some-experience', label: 'Some experience' },
  { id: 'experienced', label: 'Experienced' },
];

export const EQUIPMENT_OPTIONS: { id: EquipmentOption; label: string }[] = [
  { id: 'none', label: 'Nothing' },
  { id: 'chair', label: 'Chair' },
  { id: 'pull-up-bar', label: 'Pull-up bar' },
  { id: 'gym', label: 'Gym' },
];

export const GOAL_OPTIONS: { id: Goal; label: string }[] = [
  { id: 'strength', label: 'Get stronger' },
  { id: 'muscle', label: 'Build muscle' },
  { id: 'calisthenics', label: 'Learn calisthenics' },
  { id: 'consistency', label: 'Stay consistent' },
];

export function labelForExperience(id: ExperienceLevel) {
  return EXPERIENCE_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

export function labelForGoal(id: Goal) {
  return GOAL_OPTIONS.find((option) => option.id === id)?.label ?? id;
}

export function labelForEquipment(values: EquipmentOption[]) {
  if (values.includes('none') || values.length === 0) {
    return 'Nothing';
  }

  return values
    .map((value) => EQUIPMENT_OPTIONS.find((option) => option.id === value)?.label ?? value)
    .join(', ');
}
