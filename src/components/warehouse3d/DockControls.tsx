import React, { useState } from 'react';
import { 
  Camera, 
  Layers, 
  ThermometerSnowflake, 
  AlertTriangle, 
  DollarSign, 
  Flame, 
  Droplets, 
  ChevronDown, 
  ChevronUp,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { SimulationEnvironment } from '../../types/inventory';

interface DockControlsProps {
  activeCameraPreset: 'overview' | 'cold-storage' | 'aisle-1' | 'aisle-2' | 'top-down';
  onCameraPresetChange: (preset: 'overview' | 'cold-storage' | 'aisle-1' | 'aisle-2' | 'top-down') => void;
  filterMode: 'all' | 'critical' | 'cold-breach' | 'high-value';
  onFilterModeChange: (mode: 'all' | 'critical' | 'cold-breach' | 'high-value') => void;
  simulation: SimulationEnvironment;
  onSimulationChange: (sim: SimulationEnvironment) => void;
  onResetSimulation: () => void;
  onOpenCopilot: () => void;
}

export const DockControls: React.FC<DockControlsProps> = ({
  activeCameraPreset,
  onCameraPresetChange,
  filterMode,
  onFilterModeChange,
  simulation,
  onSimulationChange,
  onResetSimulation,
  onOpenCopilot,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'camera' | 'filters' | 'simulation'>('camera');

  const hasActiveSim = 
    simulation.tempOffsetCelsius !== 0 ||
    simulation.humidityOffsetPct !== 0 ||
    simulation.coldChainFailure ||
    simulation.transitDelayDays !== 0;

  return (
    <div 
      className="absolute bottom-5 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center transition-all duration-300 ease-in-out"
      style={{ maxWidth: 'min(940px, 94vw)', width: '100%' }}
    >
      {/* Collapse / Expand Tab */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="mb-1.5 flex items-center gap-1.5 px-3 py-1 bg-white/95 text-slate-600 hover:text-slate-900 text-xs font-medium rounded-full shadow-md border border-slate-200/80 cursor-pointer transition-colors"
        title="Toggle Control Dock"
      >
        {isCollapsed ? (
          <>
            <ChevronUp className="w-3.5 h-3.5" />
            <span>Show 3D Warehouse Controls</span>
          </>
        ) : (
          <>
            <ChevronDown className="w-3.5 h-3.5" />
            <span>Hide Dock (Zen View)</span>
          </>
        )}
      </button>

      {/* Main Glassmorphic Dock Container */}
      {!isCollapsed && (
        <div className="w-full bg-white/95 border border-slate-200/90 rounded-2xl shadow-xl p-3 sm:p-4 text-slate-800">
          {/* Top Bar inside Dock: Tab navigation & Quick Reset */}
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100 flex-wrap gap-2">
            <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-xs font-medium">
              <button
                onClick={() => setActiveTab('camera')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'camera'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>3D Viewpoints</span>
              </button>
              <button
                onClick={() => setActiveTab('filters')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'filters'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Rack Filters</span>
              </button>
              <button
                onClick={() => setActiveTab('simulation')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-colors ${
                  activeTab === 'simulation'
                    ? 'bg-white text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <ThermometerSnowflake className="w-3.5 h-3.5 text-amber-500" />
                <span>Stress Simulator</span>
                {hasActiveSim && (
                  <span className="w-2 h-2 rounded-full bg-amber-500 ml-0.5" />
                )}
              </button>
            </div>

            <div className="flex items-center gap-2">
              {hasActiveSim && (
                <button
                  onClick={onResetSimulation}
                  className="flex items-center gap-1 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1 rounded-lg font-medium cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset Stress</span>
                </button>
              )}
              <button
                onClick={onOpenCopilot}
                className="flex items-center gap-1.5 text-xs text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-3 py-1 rounded-lg font-semibold cursor-pointer transition-colors"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                <span>AI Expiry Copilot</span>
              </button>
            </div>
          </div>

          {/* Tab 1: Camera Presets */}
          {activeTab === 'camera' && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {[
                { id: 'overview', label: 'Warehouse Overview', desc: 'Full facility read' },
                { id: 'cold-storage', label: 'Cold Bay (-2°C to 4°C)', desc: 'Meat, Dairy & Vaccine' },
                { id: 'aisle-1', label: 'Aisle 01 (Chilled)', desc: 'Dairy & Produce' },
                { id: 'aisle-2', label: 'Aisle 02 (Pharma/Bakery)', desc: 'Controlled ambient' },
                { id: 'top-down', label: '2D Floor Plan (Top)', desc: 'Bird-eye layout' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => onCameraPresetChange(preset.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-left border transition-all text-xs shrink-0 cursor-pointer ${
                    activeCameraPreset === preset.id
                      ? 'border-indigo-600 bg-indigo-50/70 text-indigo-900 font-semibold shadow-xs'
                      : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="font-medium">{preset.label}</div>
                  <div className="text-[10px] text-slate-500">{preset.desc}</div>
                </button>
              ))}
            </div>
          )}

          {/* Tab 2: Rack Filters */}
          {activeTab === 'filters' && (
            <div className="flex items-center gap-2 overflow-x-auto py-1">
              {[
                { id: 'all', label: 'All Batches (16)', icon: Layers, color: 'text-slate-600' },
                { id: 'critical', label: 'Expiring ≤3 Days', icon: AlertTriangle, color: 'text-rose-600' },
                { id: 'cold-breach', label: 'Cold-Chain Breaches', icon: ThermometerSnowflake, color: 'text-cyan-600' },
                { id: 'high-value', label: 'High Value (> $3,000)', icon: DollarSign, color: 'text-emerald-600' },
              ].map((item) => {
                const Icon = item.icon;
                const isActive = filterMode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onFilterModeChange(item.id as any)}
                    className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs border transition-all shrink-0 cursor-pointer ${
                      isActive
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-900 font-semibold'
                        : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${item.color}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tab 3: Stress Simulator */}
          {activeTab === 'simulation' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 py-1">
              {/* Temperature Spike */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    <Flame className="w-3.5 h-3.5 text-amber-500" />
                    Temp Deviation
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {simulation.tempOffsetCelsius > 0 ? `+${simulation.tempOffsetCelsius}` : simulation.tempOffsetCelsius}°C
                  </span>
                </div>
                <input
                  type="range"
                  min="-3"
                  max="8"
                  step="0.5"
                  value={simulation.tempOffsetCelsius}
                  onChange={(e) =>
                    onSimulationChange({
                      ...simulation,
                      tempOffsetCelsius: parseFloat(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-600 h-1.5 cursor-pointer bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>-3°C Chill</span>
                  <span>Normal (0°C)</span>
                  <span>+8°C Heatwave</span>
                </div>
              </div>

              {/* Humidity Offset */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-cyan-500" />
                    Relative Humidity
                  </span>
                  <span className="font-mono font-bold text-slate-900">
                    {simulation.humidityOffsetPct > 0 ? `+${simulation.humidityOffsetPct}` : simulation.humidityOffsetPct}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-20"
                  max="30"
                  step="5"
                  value={simulation.humidityOffsetPct}
                  onChange={(e) =>
                    onSimulationChange({
                      ...simulation,
                      humidityOffsetPct: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-indigo-600 h-1.5 cursor-pointer bg-slate-200 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                  <span>-20% Arid</span>
                  <span>Baseline</span>
                  <span>+30% Damp</span>
                </div>
              </div>

              {/* Emergency Cold Chain Failure Toggle */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/80 flex flex-col justify-between">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
                    Chiller Compressor Failure
                  </span>
                  <input
                    type="checkbox"
                    checked={simulation.coldChainFailure}
                    onChange={(e) =>
                      onSimulationChange({
                        ...simulation,
                        coldChainFailure: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Simulates immediate power outage (+12°C jump) to preview accelerated microbial kinetics and batch triage.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
