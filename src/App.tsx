import { AppShell } from './components/Layout/AppShell';
import CarbonTwin from './components/CarbonTwin/CarbonTwin';
import TrajectoryChart from './components/TrajectoryChart';
import QuickLog from './components/Capture/QuickLog';
import PhotoCapture from './components/Capture/PhotoCapture';
import VoiceCapture from './components/Capture/VoiceCapture';
import { HypotheticalPanel } from './components/HypotheticalPanel';
import { InsightBar } from './components/InsightBar';
import { usePulseStore } from './store/store';
import type { ActivityEvent } from './engine/types';

/**
 * Pulse — A Living Carbon Twin
 * Main application component that wires together all subsystems.
 */
function App() {
  const {
    baselineTrajectory,
    hypotheticalTrajectory,
    captureMode,
    logActivity,
  } = usePulseStore();

  const handleLog = (event: ActivityEvent) => {
    logActivity(event);
  };

  // Render the active capture component
  const captureComponent = (() => {
    switch (captureMode) {
      case 'photo':
        return <PhotoCapture onLog={handleLog} />;
      case 'voice':
        return <VoiceCapture onLog={handleLog} />;
      case 'quick':
      default:
        return <QuickLog onLog={handleLog} />;
    }
  })();

  return (
    <AppShell
      sidebar={
        <>
          <InsightBar />
          <HypotheticalPanel />
          <TrajectoryChart
            baseline={baselineTrajectory}
            hypothetical={hypotheticalTrajectory}
          />
        </>
      }
      capture={captureComponent}
    >
      {/* Center: The Carbon Twin organism */}
      <CarbonTwin
        baseline={baselineTrajectory}
        hypothetical={hypotheticalTrajectory}
        className="w-full h-full min-h-[400px]"
      />
    </AppShell>
  );
}

export default App;
