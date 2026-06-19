import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ActivityEvent, HabitState, Trajectory, HypotheticalScenario } from '../engine/types';
import { projectTrajectory, forkTrajectory } from '../engine/simulation';
import { DEFAULT_HABIT_STATE } from '../engine/defaults';

/**
 * Core application state for Pulse.
 * Manages habit state, activity log, and simulation trajectories.
 * Persisted to localStorage for hackathon scope.
 */
interface PulseState {
  // --- Core State ---
  habitState: HabitState;
  activityEvents: ActivityEvent[];
  baselineTrajectory: Trajectory;
  hypotheticalTrajectory: Trajectory | null;
  activeScenario: HypotheticalScenario | null;

  // --- UI State ---
  captureMode: 'quick' | 'photo' | 'voice';
  showHypothetical: boolean;
  isOnboarded: boolean;

  // --- Actions ---
  /** Log a new activity event and recompute baseline trajectory */
  logActivity: (event: ActivityEvent) => void;

  /** Update the habit state directly and recompute baseline */
  updateHabitState: (updates: Partial<HabitState>) => void;

  /** Fork the trajectory with a hypothetical change */
  forkHypothetical: (scenario: HypotheticalScenario) => void;

  /** Commit the hypothetical — it becomes the new baseline */
  commitHypothetical: () => void;

  /** Discard the hypothetical and return to baseline only */
  discardHypothetical: () => void;

  /** Set the capture mode (quick/photo/voice) */
  setCaptureMode: (mode: 'quick' | 'photo' | 'voice') => void;

  /** Toggle the hypothetical panel visibility */
  toggleHypothetical: () => void;

  /** Mark the user as onboarded */
  completeOnboarding: () => void;

  /** Reset all state to defaults */
  resetAll: () => void;
}

/**
 * Infer habit adjustments from a moving window of recent activities.
 * Requires consistent patterns rather than single-event spikes to shift core habits.
 */
function inferHabitAdjustment(
  currentState: HabitState,
  events: ActivityEvent[]
): Partial<HabitState> {
  const adjustments: Partial<HabitState> = {};
  if (events.length === 0) return adjustments;

  // Filter for events in the last 7 days
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  
  const recentEvents = events.filter(e => {
    const d = new Date(e.timestamp);
    return d >= sevenDaysAgo && d <= now;
  });

  // Tally recent occurrences
  let redMeatCount = 0;
  let carDriveCount = 0;
  let activeTransportCount = 0; // bike/walk
  let consumptionCount = 0;

  for (const event of recentEvents) {
    if (event.category === 'food') {
      if (event.subtype === 'beef' || event.subtype === 'pork') redMeatCount++;
    } else if (event.category === 'transport') {
      if (event.subtype === 'car_drive') carDriveCount++;
      else if (event.subtype === 'bike' || event.subtype === 'walk') activeTransportCount++;
    } else if (event.category === 'consumption') {
      consumptionCount++;
    }
  }

  // Dietary Shifts
  if (redMeatCount >= 5 && currentState.diet.profile !== 'omnivore_high') {
    adjustments.diet = { profile: 'omnivore_high' };
  } else if (redMeatCount >= 2 && ['vegetarian', 'vegan'].includes(currentState.diet.profile)) {
    adjustments.diet = { profile: 'flexitarian' };
  }

  // Commute Shifts
  if (carDriveCount >= 5 && currentState.commute.mode !== 'car') {
    adjustments.commute = { ...currentState.commute, mode: 'car' };
  } else if (activeTransportCount >= 5 && currentState.commute.mode === 'car') {
    adjustments.commute = { ...currentState.commute, mode: 'mixed' };
  }

  // Consumption Intensity (Rolling average logic)
  // If user buys items frequently (e.g. >3 items in 7 days), slightly bump intensity
  if (consumptionCount > 0) {
    const intensityTarget = Math.min(1, consumptionCount * 0.1);
    // Move towards target by 10%
    const current = currentState.consumption.intensityIndex;
    const smoothedIndex = current + (intensityTarget - current) * 0.1;
    adjustments.consumption = { intensityIndex: smoothedIndex };
  }

  return adjustments;
}

export const usePulseStore = create<PulseState>()(
  persist(
    (set, get) => {
      const initialState = DEFAULT_HABIT_STATE;
      const initialTrajectory = projectTrajectory(initialState);

      return {
        // --- Initial State ---
        habitState: initialState,
        activityEvents: [],
        baselineTrajectory: initialTrajectory,
        hypotheticalTrajectory: null,
        activeScenario: null,
        captureMode: 'quick',
        showHypothetical: false,
        isOnboarded: false,

        // --- Actions ---
        logActivity: (event: ActivityEvent) => {
          const state = get();
          const newEvents = [...state.activityEvents, event];

          // Infer habit adjustments from the recent history
          const adjustment = inferHabitAdjustment(state.habitState, newEvents);
          const newHabitState = Object.keys(adjustment).length > 0
            ? deepMergeHabit(state.habitState, adjustment)
            : state.habitState;

          const newBaseline = projectTrajectory(newHabitState);

          set({
            activityEvents: newEvents,
            habitState: newHabitState,
            baselineTrajectory: newBaseline,
            // If there's an active hypothetical, re-fork it against the new baseline
            hypotheticalTrajectory: state.activeScenario
              ? forkTrajectory(newBaseline, newHabitState, state.activeScenario.delta)
              : null,
          });
        },

        updateHabitState: (updates: Partial<HabitState>) => {
          const state = get();
          const newHabitState = deepMergeHabit(state.habitState, updates);
          const newBaseline = projectTrajectory(newHabitState);

          set({
            habitState: newHabitState,
            baselineTrajectory: newBaseline,
            hypotheticalTrajectory: state.activeScenario
              ? forkTrajectory(newBaseline, newHabitState, state.activeScenario.delta)
              : null,
          });
        },

        forkHypothetical: (scenario: HypotheticalScenario) => {
          const state = get();
          const hypothetical = forkTrajectory(
            state.baselineTrajectory,
            state.habitState,
            scenario.delta
          );

          set({
            hypotheticalTrajectory: hypothetical,
            activeScenario: scenario,
            showHypothetical: true,
          });
        },

        commitHypothetical: () => {
          const state = get();
          if (!state.activeScenario) return;

          // Apply the hypothetical delta to the actual habit state
          const newHabitState = deepMergeHabit(state.habitState, state.activeScenario.delta);
          const newBaseline = projectTrajectory(newHabitState);

          set({
            habitState: newHabitState,
            baselineTrajectory: newBaseline,
            hypotheticalTrajectory: null,
            activeScenario: null,
          });
        },

        discardHypothetical: () => {
          set({
            hypotheticalTrajectory: null,
            activeScenario: null,
          });
        },

        setCaptureMode: (mode) => set({ captureMode: mode }),
        toggleHypothetical: () => set((s) => ({ showHypothetical: !s.showHypothetical })),
        completeOnboarding: () => set({ isOnboarded: true }),

        resetAll: () => {
          const fresh = DEFAULT_HABIT_STATE;
          set({
            habitState: fresh,
            activityEvents: [],
            baselineTrajectory: projectTrajectory(fresh),
            hypotheticalTrajectory: null,
            activeScenario: null,
            captureMode: 'quick',
            showHypothetical: false,
          });
        },
      };
    },
    {
      name: 'pulse-store',
      partialize: (state) => ({
        habitState: state.habitState,
        activityEvents: state.activityEvents,
        isOnboarded: state.isOnboarded,
      }),
    }
  )
);

/**
 * Deep merge utility for HabitState.
 * Handles nested objects like commute, diet, energy, consumption.
 */
function deepMergeHabit(target: HabitState, source: Partial<HabitState>): HabitState {
  const result = { ...target };

  if (source.commute) {
    result.commute = { ...target.commute, ...source.commute };
  }
  if (source.diet) {
    result.diet = { ...target.diet, ...source.diet };
  }
  if (source.energy) {
    result.energy = { ...target.energy, ...source.energy };
  }
  if (source.consumption) {
    result.consumption = { ...target.consumption, ...source.consumption };
  }
  if (source.region) {
    result.region = source.region;
  }

  return result;
}
