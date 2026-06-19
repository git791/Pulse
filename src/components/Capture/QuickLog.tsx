import { useState, useCallback, useEffect, type FC } from 'react';
import {
  Car,
  Plane,
  Bus,
  Train,
  Bike,
  Footprints,
  Beef,
  Egg,
  Fish,
  Milk,
  Salad,
  Zap,
  Flame,
  Droplets,
  Shirt,
  Monitor,
  Armchair,
  Plus,
  Minus,
  Check,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ActivityEvent, Category } from '../../engine/types';
import { computeCo2ForActivity, generateId } from '../../engine/simulation';

// ─── Preset Data ─────────────────────────────────────────────────────────────

interface SubtypePreset {
  key: string;
  label: string;
  icon: LucideIcon;
  emoji: string;
  unit: string;
  defaultQty: number;
  step: number;
  min: number;
  max: number;
}

const CATEGORY_META: Record<
  Category,
  { label: string; emoji: string }
> = {
  transport: { label: 'Transport', emoji: '🚗' },
  food: { label: 'Food', emoji: '🍽️' },
  energy: { label: 'Energy', emoji: '⚡' },
  consumption: { label: 'Goods', emoji: '🛍️' },
};

const PRESETS: Record<Category, SubtypePreset[]> = {
  transport: [
    { key: 'car_drive', label: 'Car Drive', icon: Car, emoji: '🚗', unit: 'km', defaultQty: 20, step: 5, min: 1, max: 1000 },
    { key: 'flight', label: 'Flight', icon: Plane, emoji: '✈️', unit: 'miles', defaultQty: 500, step: 50, min: 50, max: 15000 },
    { key: 'bus', label: 'Bus', icon: Bus, emoji: '🚌', unit: 'km', defaultQty: 10, step: 5, min: 1, max: 500 },
    { key: 'train', label: 'Train', icon: Train, emoji: '🚆', unit: 'km', defaultQty: 50, step: 10, min: 1, max: 2000 },
    { key: 'bike', label: 'Bike', icon: Bike, emoji: '🚲', unit: 'km', defaultQty: 5, step: 1, min: 1, max: 200 },
    { key: 'walk', label: 'Walk', icon: Footprints, emoji: '🚶', unit: 'km', defaultQty: 2, step: 0.5, min: 0.5, max: 50 },
  ],
  food: [
    { key: 'beef', label: 'Beef', icon: Beef, emoji: '🥩', unit: 'kg', defaultQty: 0.3, step: 0.1, min: 0.1, max: 10 },
    { key: 'poultry', label: 'Poultry', icon: Egg, emoji: '🍗', unit: 'kg', defaultQty: 0.3, step: 0.1, min: 0.1, max: 10 },
    { key: 'pork', label: 'Pork', icon: Beef, emoji: '🐖', unit: 'kg', defaultQty: 0.3, step: 0.1, min: 0.1, max: 10 },
    { key: 'fish', label: 'Fish', icon: Fish, emoji: '🐟', unit: 'kg', defaultQty: 0.3, step: 0.1, min: 0.1, max: 10 },
    { key: 'dairy', label: 'Dairy', icon: Milk, emoji: '🥛', unit: 'L', defaultQty: 1, step: 0.25, min: 0.25, max: 20 },
    { key: 'vegetables', label: 'Vegetables', icon: Salad, emoji: '🥗', unit: 'kg', defaultQty: 0.5, step: 0.1, min: 0.1, max: 20 },
  ],
  energy: [
    { key: 'grid_electricity', label: 'Electricity', icon: Zap, emoji: '⚡', unit: 'kWh', defaultQty: 10, step: 5, min: 1, max: 2000 },
    { key: 'natural_gas', label: 'Natural Gas', icon: Flame, emoji: '🔥', unit: 'therms', defaultQty: 5, step: 1, min: 1, max: 500 },
    { key: 'heating_oil', label: 'Heating Oil', icon: Droplets, emoji: '🛢️', unit: 'L', defaultQty: 20, step: 5, min: 1, max: 1000 },
  ],
  consumption: [
    { key: 'clothing', label: 'Clothing', icon: Shirt, emoji: '👕', unit: 'items', defaultQty: 1, step: 1, min: 1, max: 50 },
    { key: 'electronics', label: 'Electronics', icon: Monitor, emoji: '📱', unit: 'items', defaultQty: 1, step: 1, min: 1, max: 20 },
    { key: 'furniture', label: 'Furniture', icon: Armchair, emoji: '🪑', unit: 'items', defaultQty: 1, step: 1, min: 1, max: 10 },
  ],
};

const CATEGORIES: Category[] = ['transport', 'food', 'energy', 'consumption'];

// ─── Props ───────────────────────────────────────────────────────────────────

interface QuickLogProps {
  onLog: (event: ActivityEvent) => void;
}

// ─── Component ───────────────────────────────────────────────────────────────

const QuickLog: FC<QuickLogProps> = ({ onLog }) => {
  const [activeCategory, setActiveCategory] = useState<Category>('transport');
  const [selectedPreset, setSelectedPreset] = useState<SubtypePreset | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [toast, setToast] = useState<string | null>(null);

  // Reset quantity when preset changes
  useEffect(() => {
    if (selectedPreset) setQuantity(selectedPreset.defaultQty);
  }, [selectedPreset]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSubmit = useCallback(() => {
    if (!selectedPreset || quantity <= 0) return;

    const co2 = computeCo2ForActivity(selectedPreset.key, quantity);

    const event: ActivityEvent = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      category: activeCategory,
      subtype: selectedPreset.key,
      quantity,
      unit: selectedPreset.unit,
      co2_kg: co2,
      source: 'manual',
      confidence: 1.0,
    };

    onLog(event);
    setToast(`${selectedPreset.emoji} ${selectedPreset.label} logged — ${co2} kg CO₂`);
    setSelectedPreset(null);
  }, [selectedPreset, quantity, activeCategory, onLog]);

  const adjustQty = useCallback(
    (delta: number) => {
      if (!selectedPreset) return;
      setQuantity((q) =>
        Math.round(
          Math.max(selectedPreset.min, Math.min(selectedPreset.max, q + delta)) * 100,
        ) / 100,
      );
    },
    [selectedPreset],
  );

  const previewCo2 = selectedPreset
    ? computeCo2ForActivity(selectedPreset.key, quantity)
    : 0;

  return (
    <div className="flex flex-col gap-4">
      {/* ── Category Tab Bar ── */}
      <div className="flex gap-0.5 p-1 rounded-xl bg-base-200 border border-base-300">
        {CATEGORIES.map((cat) => {
          const meta = CATEGORY_META[cat];
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => {
                setActiveCategory(cat);
                setSelectedPreset(null);
              }}
              className={`
                flex-1 flex items-center justify-center gap-1 py-2 px-1.5
                rounded-lg text-xs font-medium transition-all duration-150
                ${
                  isActive
                    ? 'bg-base-100 text-base-content shadow-sm'
                    : 'text-base-content/60 hover:text-base-content/80 hover:bg-base-300/50'
                }
              `}
            >
              <span className="text-sm">{meta.emoji}</span>
              <span className="hidden sm:inline">{meta.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Subtype Grid ── */}
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-2">
        {PRESETS[activeCategory].map((preset) => {
          const Icon = preset.icon;
          const isSelected = selectedPreset?.key === preset.key;
          return (
            <button
              key={preset.key}
              onClick={() => setSelectedPreset(isSelected ? null : preset)}
              className={`
                flex flex-col items-center gap-2 p-4 rounded-xl border
                transition-all duration-150 cursor-pointer group
                ${
                  isSelected
                    ? 'border-primary bg-primary/10 shadow-sm'
                    : 'bg-base-100 border-base-300 hover:bg-base-200'
                }
              `}
            >
              <div
                className={`
                  w-10 h-10 rounded-lg flex items-center justify-center
                  transition-colors duration-150
                  ${
                    isSelected
                      ? 'bg-primary text-primary-content'
                      : 'bg-base-200 text-base-content/60 group-hover:text-base-content'
                  }
                `}
              >
                <Icon size={20} />
              </div>
              <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-base-content/70'}`}>
                {preset.label}
              </span>
              <span className="text-[10px] text-base-content/50">
                {preset.unit}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Quantity Input Panel ── */}
      {selectedPreset && (
        <div className="bg-base-100 border border-base-300 p-5 rounded-xl animate-slide-up flex flex-col gap-4 shadow-sm">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xl">{selectedPreset.emoji}</span>
              <span className="font-medium text-base-content">
                {selectedPreset.label}
              </span>
            </div>
            <button onClick={() => setSelectedPreset(null)} className="btn btn-ghost btn-sm btn-circle">
              <X size={16} />
            </button>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center gap-3">
            <button onClick={() => adjustQty(-selectedPreset.step)} className="btn btn-circle btn-sm btn-outline" disabled={quantity <= selectedPreset.min}>
              <Minus size={16} />
            </button>

            <div className="flex-1 flex flex-col items-center gap-1">
              <input
                type="number"
                value={quantity}
                onChange={(e) => {
                  const v = parseFloat(e.target.value);
                  if (!isNaN(v)) {
                    setQuantity(Math.max(selectedPreset.min, Math.min(selectedPreset.max, v)));
                  }
                }}
                className="input text-center text-2xl font-semibold !bg-transparent !border-none !shadow-none w-full [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none"
                min={selectedPreset.min}
                max={selectedPreset.max}
                step={selectedPreset.step}
              />
              <span className="text-xs text-base-content/50">
                {selectedPreset.unit}
              </span>
            </div>

            <button onClick={() => adjustQty(selectedPreset.step)} className="btn btn-circle btn-sm btn-outline" disabled={quantity >= selectedPreset.max}>
              <Plus size={16} />
            </button>
          </div>

          {/* Slider */}
          <input
            type="range"
            min={selectedPreset.min}
            max={selectedPreset.max}
            step={selectedPreset.step}
            value={quantity}
            onChange={(e) => setQuantity(parseFloat(e.target.value))}
            className="range range-primary range-sm"
          />

          {/* CO₂ Preview + Submit */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex flex-col">
              <span className="text-xs text-base-content/50">Estimated impact</span>
              <span className="text-lg font-semibold text-primary">{previewCo2} kg CO₂</span>
            </div>
            <button onClick={handleSubmit} className="btn btn-primary gap-2" disabled={quantity <= 0}>
              <Check size={16} />
              Log Activity
            </button>
          </div>
        </div>
      )}

      {/* ── Success Toast ── */}
      {toast && (
        <div className="toast toast-center z-50 animate-slide-up">
          <div className="alert alert-success shadow-lg">
            <Check size={18} />
            <span>{toast}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default QuickLog;
