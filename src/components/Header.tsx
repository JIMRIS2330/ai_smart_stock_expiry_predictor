import React from 'react';
import { 
  Box, 
  Table, 
  BarChart3, 
  Plus, 
  Sparkles, 
  Flame, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { StockBatch, SimulationEnvironment } from '../types/inventory';

interface HeaderProps {
  currentView: '3d' | 'table' | 'analytics';
  onViewChange: (view: '3d' | 'table' | 'analytics') => void;
  batches: StockBatch[];
  onOpenAddBatch: () => void;
  onOpenCopilot: () => void;
  simulation: SimulationEnvironment;
  onResetSimulation: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  onViewChange,
  batches,
  onOpenAddBatch,
  onOpenCopilot,
  simulation,
  onResetSimulation,
}) => {
  const criticalCount = batches.filter((b) => b.riskLevel === 'critical' || b.riskLevel === 'expired').length;
  const warningCount = batches.filter((b) => b.riskLevel === 'warning').length;
  const hasActiveStress =
    simulation.tempOffsetCelsius !== 0 ||
    simulation.humidityOffsetPct !== 0 ||
    simulation.coldChainFailure;

  return (
    <header className="h-16 border-b border-slate-200/90 bg-white/95 px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 select-none">
      {/* Brand & Status */}
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 text-white flex items-center justify-center shadow-xs">
          <Box className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-sm sm:text-base font-bold text-slate-900 tracking-tight">OmniShelf AI</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Stock Expiry Predictor
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>{batches.length} Batches Active</span>
            <span>•</span>
            {criticalCount > 0 ? (
              <span className="text-rose-600 font-semibold flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {criticalCount} Critical
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">All Optimal</span>
            )}
            {warningCount > 0 && (
              <span className="text-amber-600 hidden sm:inline">
                • {warningCount} Nearing Expiry
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center Navigation Tabs */}
      <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
        <button
          onClick={() => onViewChange('3d')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            currentView === '3d'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Box className="w-3.5 h-3.5 text-indigo-600" />
          <span>3D Warehouse</span>
        </button>

        <button
          onClick={() => onViewChange('table')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            currentView === 'table'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Table className="w-3.5 h-3.5 text-indigo-600" />
          <span>Stock Ledger</span>
        </button>

        <button
          onClick={() => onViewChange('analytics')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
            currentView === 'analytics'
              ? 'bg-white text-indigo-900 shadow-xs'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
          <span>Yield & Loss</span>
        </button>
      </div>

      {/* Right Action Buttons */}
      <div className="flex items-center gap-2">
        {hasActiveStress && (
          <button
            onClick={onResetSimulation}
            className="hidden md:flex items-center gap-1.5 text-xs text-rose-700 bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-xl font-medium cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Stress ({simulation.tempOffsetCelsius > 0 ? `+${simulation.tempOffsetCelsius}°C` : ''})</span>
          </button>
        )}

        <button
          onClick={onOpenCopilot}
          className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 cursor-pointer transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
          <span className="hidden sm:inline">AI Copilot</span>
        </button>

        <button
          onClick={onOpenAddBatch}
          className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-xl text-white bg-indigo-600 hover:bg-indigo-700 cursor-pointer shadow-xs transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Register Batch</span>
        </button>
      </div>
    </header>
  );
};
