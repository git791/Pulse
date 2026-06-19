import { X, Globe2 } from 'lucide-react';
import { usePulseStore } from '../../store/store';
import type { RegionType } from '../../engine/types';

export function SettingsModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { habitState, updateHabitState } = usePulseStore();

  if (!isOpen) return null;

  const handleRegionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateHabitState({ region: e.target.value as RegionType });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-base-100 rounded-2xl w-full max-w-md shadow-2xl border border-base-300 overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-base-200">
          <h2 className="text-lg font-semibold flex items-center gap-2 text-base-content">
            <Globe2 className="text-secondary" />
            Settings
          </h2>
          <button
            onClick={onClose}
            className="btn btn-ghost btn-sm btn-circle"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text font-medium">Localization Region</span>
            </label>
            <p className="text-xs text-base-content/60 mb-3">
              We use this to calculate accurate emission factors based on your local power grid mix.
            </p>
            <select
              className="select select-bordered w-full"
              value={habitState.region}
              onChange={handleRegionChange}
            >
              <option value="global_avg">🌍 Global Average (420 kg/mo)</option>
              <option value="us_avg">🇺🇸 US Average (450 kg/mo)</option>
              <option value="eu_avg">🇪🇺 EU Average (210 kg/mo)</option>
              <option value="california">☀️ California (240 kg/mo)</option>
              <option value="india_avg">🇮🇳 India Average (710 kg/mo)</option>
              <option value="india_karnataka">🇮🇳 Karnataka, India (340 kg/mo)</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
