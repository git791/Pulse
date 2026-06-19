import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Leaf,
  Activity,
  Camera,
  Mic,
  Keyboard,
  RotateCcw,
  Menu,
  X,
  Info,
  Settings,
} from 'lucide-react';
import { usePulseStore } from '../../store/store';
import { NatureBackground } from '../CarbonTwin/NatureBackground';
import { SettingsModal } from '../Settings/SettingsModal';

interface AppShellProps {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  capture: React.ReactNode;
}

export function AppShell({ children, sidebar, capture }: AppShellProps) {
  const { captureMode, setCaptureMode, resetAll, activityEvents } = usePulseStore();
  const [mobilePanel, setMobilePanel] = useState<'twin' | 'sidebar' | 'capture'>('twin');
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="min-h-screen flex flex-col text-base-content">
      {/* === TOP NAVBAR === */}
      <header className="glass-card sticky top-0 z-50 px-4 py-3 flex items-center justify-between border-b border-base-200">
        {/* Logo */}
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary/20 text-primary">
            <Leaf size={18} />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">PULSE</h1>
            <p className="text-[10px] -mt-0.5 opacity-70">A Living Carbon Twin</p>
          </div>
        </div>

        {/* Desktop Capture Mode Tabs */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-lg bg-base-200">
          <TabButton
            active={captureMode === 'quick'}
            onClick={() => setCaptureMode('quick')}
            icon={<Keyboard size={14} />}
            label="Quick Log"
          />
          <TabButton
            active={captureMode === 'photo'}
            onClick={() => setCaptureMode('photo')}
            icon={<Camera size={14} />}
            label="Photo"
          />
          <TabButton
            active={captureMode === 'voice'}
            onClick={() => setCaptureMode('voice')}
            icon={<Mic size={14} />}
            label="Voice"
          />
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {activityEvents.length > 0 && (
            <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs bg-primary/20 text-primary">
              <Activity size={12} />
              {activityEvents.length}
            </div>
          )}
          <button onClick={() => setShowSettings(true)} className="btn btn-ghost btn-sm btn-circle hidden md:flex" title="Settings">
            <Settings size={16} />
          </button>
          <button onClick={resetAll} className="btn btn-ghost btn-sm btn-circle hidden md:flex" title="Reset all data">
            <RotateCcw size={16} />
          </button>

          {/* Mobile menu toggle */}
          <button onClick={() => setShowMobileMenu(!showMobileMenu)} className="btn btn-ghost btn-sm btn-circle md:hidden">
            {showMobileMenu ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </header>

      {/* === MOBILE MENU === */}
      <AnimatePresence>
        {showMobileMenu && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="md:hidden glass-card overflow-hidden z-40 border-b border-base-200"
          >
            <div className="p-3 flex flex-col gap-1">
              <button onClick={() => { setCaptureMode('quick'); setShowMobileMenu(false); }} className="btn btn-ghost btn-sm justify-start">
                <Keyboard size={14} /> Quick Log
              </button>
              <button onClick={() => { setCaptureMode('photo'); setShowMobileMenu(false); }} className="btn btn-ghost btn-sm justify-start">
                <Camera size={14} /> Photo Capture
              </button>
              <button onClick={() => { setCaptureMode('voice'); setShowMobileMenu(false); }} className="btn btn-ghost btn-sm justify-start">
                <Mic size={14} /> Voice Note
              </button>
              <div className="divider my-1"></div>
              <button onClick={() => { setShowSettings(true); setShowMobileMenu(false); }} className="btn btn-ghost btn-sm justify-start">
                <Settings size={14} /> Settings
              </button>
              <button onClick={() => { resetAll(); setShowMobileMenu(false); }} className="btn btn-ghost btn-sm justify-start text-error">
                <RotateCcw size={14} /> Reset All Data
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* === MAIN CONTENT === */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
        <aside className="hidden md:flex md:flex-col md:w-80 lg:w-96 p-4 gap-4 overflow-y-auto border-r border-base-200">
          {sidebar}
        </aside>

        <main className="flex-1 flex flex-col items-center justify-center p-4 relative overflow-hidden bg-base-200/30">
          <NatureBackground />
          <div className="z-10 w-full h-full flex flex-col items-center justify-center">
            {children}
          </div>
        </main>

        <aside className="hidden md:flex md:flex-col md:w-80 lg:w-96 p-4 overflow-y-auto border-l border-base-200">
          {capture}
        </aside>
      </div>

      {/* === MOBILE BOTTOM TABS === */}
      <div className="md:hidden flex items-center justify-around p-2 glass-card border-t border-base-200">
        <MobileTab active={mobilePanel === 'sidebar'} onClick={() => setMobilePanel('sidebar')} icon={<Info size={18} />} label="Insights" />
        <MobileTab active={mobilePanel === 'twin'} onClick={() => setMobilePanel('twin')} icon={<Leaf size={18} />} label="Twin" />
        <MobileTab active={mobilePanel === 'capture'} onClick={() => setMobilePanel('capture')} icon={<Activity size={18} />} label="Log" />
      </div>

      {/* === MOBILE PANELS === */}
      <AnimatePresence mode="wait">
        {mobilePanel === 'sidebar' && (
          <MobileOverlay key="sidebar" onClose={() => setMobilePanel('twin')}>
            {sidebar}
          </MobileOverlay>
        )}
        {mobilePanel === 'capture' && (
          <MobileOverlay key="capture" onClose={() => setMobilePanel('twin')}>
            <div className="flex gap-1 mb-4 p-1 rounded-lg bg-base-200">
              <TabButton active={captureMode === 'quick'} onClick={() => setCaptureMode('quick')} icon={<Keyboard size={14} />} label="Quick" />
              <TabButton active={captureMode === 'photo'} onClick={() => setCaptureMode('photo')} icon={<Camera size={14} />} label="Photo" />
              <TabButton active={captureMode === 'voice'} onClick={() => setCaptureMode('voice')} icon={<Mic size={14} />} label="Voice" />
            </div>
            {capture}
          </MobileOverlay>
        )}
      </AnimatePresence>

      {/* === MODALS === */}
      <SettingsModal isOpen={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        active ? 'bg-primary text-primary-content shadow-sm' : 'text-base-content/70 hover:text-base-content hover:bg-base-300/50'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MobileTab({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string; }) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-0.5 p-2 rounded-lg transition-colors ${
        active ? 'text-primary' : 'text-base-content/50'
      }`}
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </button>
  );
}

function MobileOverlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <motion.div
      initial={{ y: '100%' }}
      animate={{ y: 0 }}
      exit={{ y: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      className="md:hidden fixed inset-0 z-30 overflow-y-auto p-4 pt-20 bg-base-100"
    >
      <button onClick={onClose} className="absolute top-4 right-4 btn btn-ghost btn-sm btn-circle">
        <X size={18} />
      </button>
      {children}
    </motion.div>
  );
}
