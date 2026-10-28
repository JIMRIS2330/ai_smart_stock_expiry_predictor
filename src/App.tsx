import React, { useState, useMemo } from 'react';
import { initialBatches } from './data/mockBatches';
import { StockBatch, SimulationEnvironment } from './types/inventory';
import { calculateKineticPrediction } from './utils/kineticPredictor';
import { SmartWarehouse3D } from './components/warehouse3d/SmartWarehouse3D';
import { DockControls } from './components/warehouse3d/DockControls';
import { Header } from './components/Header';
import { BatchDetailDrawer } from './components/BatchDetailDrawer';
import { InventoryTableView } from './components/InventoryTableView';
import { AnalyticsView } from './components/AnalyticsView';
import { AddBatchModal } from './components/AddBatchModal';
import { AiCopilotModal } from './components/AiCopilotModal';

export default function App() {
  const [baseBatches, setBaseBatches] = useState<StockBatch[]>(initialBatches);
  const [currentView, setCurrentView] = useState<'3d' | 'table' | 'analytics'>('3d');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  
  // 3D Dock filter & camera states
  const [filterMode, setFilterMode] = useState<'all' | 'critical' | 'cold-breach' | 'high-value'>('all');
  const [activeCameraPreset, setActiveCameraPreset] = useState<'overview' | 'cold-storage' | 'aisle-1' | 'aisle-2' | 'top-down'>('overview');

  // Simulation environment
  const [simulation, setSimulation] = useState<SimulationEnvironment>({
    tempOffsetCelsius: 0,
    humidityOffsetPct: 0,
    coldChainFailure: false,
    transitDelayDays: 0,
    salesVelocityMultiplier: 1.0,
  });

  // Modals
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);

  // Recalculate dynamic kinetic predictions whenever base batches or simulation environment changes
  const computedBatches = useMemo(() => {
    return baseBatches.map((batch) => {
      const prediction = calculateKineticPrediction(batch, simulation);
      return {
        ...batch,
        predictedExpiryDate: prediction.adjustedExpiryDate,
        remainingDaysPredicted: prediction.predictedRemainingDays,
        freshnessScore: prediction.freshnessScore,
        spoilageRiskScore: prediction.spoilageRiskScore,
        riskLevel: prediction.riskLevel,
        aiRiskSummary: prediction.biochemicalPathwayExplanation,
        recommendedAction: {
          ...batch.recommendedAction,
          ...prediction.recommendedAction,
          // Preserve custom discounts if manually modified
          recommendedDiscountPct:
            batch.recommendedAction.recommendedDiscountPct > 0 &&
            batch.recommendedAction.actionType === 'DYNAMIC_MARKDOWN'
              ? batch.recommendedAction.recommendedDiscountPct
              : prediction.recommendedAction.recommendedDiscountPct,
        },
      };
    });
  }, [baseBatches, simulation]);

  // Selected batch object
  const selectedBatch = useMemo(() => {
    if (!selectedBatchId) return null;
    return computedBatches.find((b) => b.id === selectedBatchId) || null;
  }, [computedBatches, selectedBatchId]);

  // Handlers
  const handleApplyMarkdown = (batchId: string, discountPct: number) => {
    setBaseBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          recommendedAction: {
            ...b.recommendedAction,
            actionType: 'DYNAMIC_MARKDOWN',
            recommendedDiscountPct: discountPct,
            reasoning: `Manual dynamic clearance markdown of ${discountPct}% applied to accelerate liquidation.`,
          },
        };
      })
    );
  };

  const handleDispatchFifo = (batchId: string) => {
    setBaseBatches((prev) =>
      prev.map((b) => {
        if (b.id !== batchId) return b;
        return {
          ...b,
          recommendedAction: {
            ...b.recommendedAction,
            actionType: 'PRIORITIZE_FIFO',
            reasoning: `Batch marked as Priority FIFO outbound dispatch.`,
          },
        };
      })
    );
  };

  const handleAddBatch = (newBatch: StockBatch) => {
    setBaseBatches((prev) => [newBatch, ...prev]);
    setSelectedBatchId(newBatch.id);
  };

  const handleResetSimulation = () => {
    setSimulation({
      tempOffsetCelsius: 0,
      humidityOffsetPct: 0,
      coldChainFailure: false,
      transitDelayDays: 0,
      salesVelocityMultiplier: 1.0,
    });
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#f8fafc] text-slate-900 font-sans antialiased overflow-hidden select-none">
      {/* Top Header */}
      <Header
        currentView={currentView}
        onViewChange={(v) => setCurrentView(v)}
        batches={computedBatches}
        onOpenAddBatch={() => setIsAddBatchOpen(true)}
        onOpenCopilot={() => setIsCopilotOpen(true)}
        simulation={simulation}
        onResetSimulation={handleResetSimulation}
      />

      {/* Main View Area */}
      <main className="flex-1 relative overflow-hidden">
        {currentView === '3d' && (
          <div className="w-full h-full relative">
            <SmartWarehouse3D
              batches={computedBatches}
              selectedBatchId={selectedBatchId}
              onSelectBatch={(id) => setSelectedBatchId(id)}
              filterMode={filterMode}
              activeCameraPreset={activeCameraPreset}
              onCameraPresetChange={setActiveCameraPreset}
            />

            {/* Collapsible Bottom Dock (Zero Viewport Occlusion) */}
            <DockControls
              activeCameraPreset={activeCameraPreset}
              onCameraPresetChange={setActiveCameraPreset}
              filterMode={filterMode}
              onFilterModeChange={setFilterMode}
              simulation={simulation}
              onSimulationChange={setSimulation}
              onResetSimulation={handleResetSimulation}
              onOpenCopilot={() => setIsCopilotOpen(true)}
            />
          </div>
        )}

        {currentView === 'table' && (
          <div className="w-full h-full overflow-y-auto">
            <InventoryTableView
              batches={computedBatches}
              onSelectBatch={(id) => setSelectedBatchId(id)}
              onApplyMarkdown={handleApplyMarkdown}
              onSwitchTo3D={() => setCurrentView('3d')}
            />
          </div>
        )}

        {currentView === 'analytics' && (
          <div className="w-full h-full overflow-y-auto">
            <AnalyticsView
              batches={computedBatches}
              onSelectBatch={(id) => {
                setSelectedBatchId(id);
                setCurrentView('3d');
              }}
            />
          </div>
        )}

        {/* Slide-out Batch Detail Inspection Drawer */}
        <BatchDetailDrawer
          batch={selectedBatch}
          onClose={() => setSelectedBatchId(null)}
          onApplyMarkdown={handleApplyMarkdown}
          onDispatchFifo={handleDispatchFifo}
        />
      </main>

      {/* Add New Batch Modal */}
      <AddBatchModal
        isOpen={isAddBatchOpen}
        onClose={() => setIsAddBatchOpen(false)}
        onAddBatch={handleAddBatch}
      />

      {/* AI Copilot Modal */}
      <AiCopilotModal
        isOpen={isCopilotOpen}
        onClose={() => setIsCopilotOpen(false)}
        batches={computedBatches}
        onSelectBatch={(id) => {
          setSelectedBatchId(id);
          setCurrentView('3d');
        }}
      />
    </div>
  );
}
