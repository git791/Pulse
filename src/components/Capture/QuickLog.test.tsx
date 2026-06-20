import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import QuickLog from './QuickLog';

describe('QuickLog', () => {
  it('renders QuickLog component', () => {
    const handleLog = vi.fn();
    render(<QuickLog onLog={handleLog} />);
    
    // Check if category tabs exist
    expect(screen.getByText(/Transport/i)).toBeInTheDocument();
    expect(screen.getByText(/Food/i)).toBeInTheDocument();
    expect(screen.getByText(/Energy/i)).toBeInTheDocument();
    expect(screen.getByText(/Goods/i)).toBeInTheDocument();
  });

  it('selects a preset and logs an activity', () => {
    const handleLog = vi.fn();
    render(<QuickLog onLog={handleLog} />);
    
    // Click on "Car" preset
    const carPreset = screen.getByText(/Car/i);
    fireEvent.click(carPreset);
    
    // Verify default quantity is set (20)
    expect(screen.getAllByDisplayValue('20').length).toBeGreaterThan(0);
    
    // Adjust quantity
    const increaseBtn = screen.getByLabelText(/Increase quantity/i);
    fireEvent.click(increaseBtn);
    // 20 + 5 = 25
    expect(screen.getAllByDisplayValue('25').length).toBeGreaterThan(0);
    
    // Click Log Activity button
    const logBtn = screen.getByText(/Log Activity/i);
    fireEvent.click(logBtn);
    
    // Verify onLog was called
    expect(handleLog).toHaveBeenCalledTimes(1);
    const event = handleLog.mock.calls[0][0];
    expect(event.category).toBe('transport');
    expect(event.subtype).toBe('car_drive');
    expect(event.quantity).toBe(25);
  });

  it('can cancel a selected preset', () => {
    const handleLog = vi.fn();
    render(<QuickLog onLog={handleLog} />);
    
    // Click on "Car" preset
    const carPreset = screen.getByText(/Car/i);
    fireEvent.click(carPreset);
    
    // Verify preset is selected
    const cancelBtn = screen.getByLabelText(/Cancel preset/i);
    expect(cancelBtn).toBeInTheDocument();
    
    // Click cancel
    fireEvent.click(cancelBtn);
    
    // Log Activity button should not be rendered
    const logBtn = screen.queryByText(/Log Activity/i);
    expect(logBtn).not.toBeInTheDocument();
  });
});
