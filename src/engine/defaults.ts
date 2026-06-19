import type { HabitState, HypotheticalScenario } from './types';

/**
 * The baseline default habit state for a new user.
 * Grounded in a rough "average American" profile.
 */
export const DEFAULT_HABIT_STATE: HabitState = {
  commute: { mode: 'car', daysPerWeek: 5, distanceKm: 25 },
  diet: { profile: 'omnivore_avg' },
  energy: { source: 'grid_avg', homeSizeFactor: 1.0 },
  consumption: { intensityIndex: 0.5 },
  region: 'global_avg',
};

/**
 * Predefined hypothetical scenarios for the "What If?" panel.
 */
export const HYPOTHETICAL_SCENARIOS: HypotheticalScenario[] = [
  {
    id: 'cycle_commute',
    title: 'Cycle to Work',
    description: 'Swap 2 driving days for cycling',
    icon: '🚲',
    delta: { commute: { mode: 'mixed', daysPerWeek: 3, distanceKm: 25 } },
  },
  {
    id: 'go_vegetarian',
    title: 'Go Vegetarian',
    description: 'Eliminate all meat from your diet',
    icon: '🥗',
    delta: { diet: { profile: 'vegetarian' } },
  },
  {
    id: 'renewable_energy',
    title: 'Renewable Grid',
    description: 'Switch home electricity to 100% renewables',
    icon: '⚡',
    delta: { energy: { source: 'grid_renewable', homeSizeFactor: 1.0 } }, // Keep current size factor if we could
  },
  {
    id: 'reduce_consumption',
    title: 'Buy Less Stuff',
    description: 'Cut discretionary shopping by half',
    icon: '🛍️',
    delta: { consumption: { intensityIndex: 0.25 } },
  },
  {
    id: 'public_transit',
    title: 'Public Transit',
    description: 'Switch to bus/train for daily commute',
    icon: '🚆',
    delta: { commute: { mode: 'transit', daysPerWeek: 5, distanceKm: 25 } },
  },
  {
    id: 'go_vegan',
    title: 'Go Vegan',
    description: 'Eliminate all animal products',
    icon: '🌱',
    delta: { diet: { profile: 'vegan' } },
  },
];
