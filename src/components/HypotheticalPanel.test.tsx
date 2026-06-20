import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HypotheticalPanel } from './HypotheticalPanel';
import { usePulseStore } from '../store/store';

describe('HypotheticalPanel', () => {
  beforeEach(() => {
    usePulseStore.getState().resetAll();
  });

  it('renders correctly and can be expanded', () => {
    render(<HypotheticalPanel />);
    
    expect(screen.getByText('What If?')).toBeInTheDocument();
    expect(screen.getByText('Explore hypothetical changes')).toBeInTheDocument();
    
    // It should expand on click
    const button = screen.getByRole('button', { name: /What If\?/i });
    fireEvent.click(button);
    
    // Check if some of the default scenarios are rendered
    expect(screen.getByText('Go Vegan')).toBeInTheDocument();
  });

  it('shows commit/discard buttons when a scenario is active', () => {
    render(<HypotheticalPanel />);
    
    const button = screen.getByRole('button', { name: /What If\?/i });
    fireEvent.click(button);

    // Select a scenario
    const selectScenarioButton = screen.getByText('Go Vegan');
    fireEvent.click(selectScenarioButton);

    // After selection, we should see Commit and Discard
    expect(screen.getByText('Commit Change')).toBeInTheDocument();
    expect(screen.getByText('Discard')).toBeInTheDocument();
  });
});
