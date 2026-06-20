import { describe, it, expect, beforeEach } from 'vitest';
import { usePulseStore } from './store';
import type { ActivityEvent, HypotheticalScenario } from '../engine/types';

describe('PulseStore', () => {
  beforeEach(() => {
    usePulseStore.getState().resetAll();
  });

  it('initializes with default state', () => {
    const state = usePulseStore.getState();
    expect(state.activityEvents).toEqual([]);
    expect(state.captureMode).toBe('quick');
    expect(state.isOnboarded).toBe(false);
    expect(state.showHypothetical).toBe(false);
    expect(state.baselineTrajectory).toBeDefined();
    expect(state.hypotheticalTrajectory).toBeNull();
  });

  it('logActivity adds an event and updates trajectory', () => {
    const event: ActivityEvent = {
      id: 'test-1',
      timestamp: new Date().toISOString(),
      category: 'transport',
      subtype: 'car_drive',
      quantity: 10,
      unit: 'km',
      source: 'manual',
      confidence: 1.0,
      co2_kg: 2.1
    };

    usePulseStore.getState().logActivity(event);
    
    const state = usePulseStore.getState();
    expect(state.activityEvents.length).toBe(1);
    expect(state.activityEvents[0]).toEqual(event);
  });

  it('forkHypothetical creates a hypothetical trajectory', () => {
    const scenario: HypotheticalScenario = {
      id: 'scen-1',
      title: 'Go Vegan',
      description: 'Switch to a vegan diet',
      icon: '🥦',
      delta: {
        diet: { profile: 'vegan' }
      }
    };

    usePulseStore.getState().forkHypothetical(scenario);
    
    const state = usePulseStore.getState();
    expect(state.activeScenario).toEqual(scenario);
    expect(state.hypotheticalTrajectory).toBeDefined();
    expect(state.showHypothetical).toBe(true);
  });

  it('commitHypothetical merges hypothetical into baseline', () => {
    const scenario: HypotheticalScenario = {
      id: 'scen-1',
      title: 'Go Vegan',
      description: 'Switch to a vegan diet',
      icon: '🥦',
      delta: {
        diet: { profile: 'vegan' }
      }
    };

    const store = usePulseStore.getState();
    store.forkHypothetical(scenario);
    store.commitHypothetical();

    const newState = usePulseStore.getState();
    expect(newState.activeScenario).toBeNull();
    expect(newState.hypotheticalTrajectory).toBeNull();
    expect(newState.habitState.diet.profile).toBe('vegan');
  });
});
