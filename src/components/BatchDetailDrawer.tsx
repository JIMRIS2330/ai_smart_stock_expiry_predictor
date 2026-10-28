import React, { useState } from 'react';
import { 
  X, 
  Thermometer, 
  Droplets, 
  Clock, 
  Calendar, 
  AlertCircle, 
  TrendingDown, 
  DollarSign, 
  Sparkles, 
  CheckCircle2, 
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import { StockBatch } from '../types/inventory';
import { getRiskBadgeClasses } from '../utils/kineticPredictor';

interface BatchDetailDrawerProps {
  batch: StockBatch | null;
  onClose: () => void;
  onApplyMarkdown: (batchId: string, discountPct: number) => void;
  onDispatchFifo: (batchId: string) => void;
}

export const BatchDetailDrawer: React.FC<BatchDetailDrawerProps> = ({
  batch,
  onClose,
  onApplyMarkdown,
  onDispatchFifo,
}) => {
  if (!batch) return null;

  const [customDiscount, setCustomDiscount] = useState<number>(
    batch.recommendedAction.recommendedDiscountPct || 20
  );
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const riskBadge = getRiskBadgeClasses(batch.riskLevel);

  // Dynamic calculations for markdown recovery
  const discountedPrice = Math.max(0, batch.retailPrice * (1 - customDiscount / 100));
  const estimatedRevenue = Math.round(batch.quantity * discountedPrice);
  const totalCost = Math.round(batch.quantity * batch.unitCost);
  const netRecovery = estimatedRevenue - totalCost;

  const handleApplyDiscount = () => {
    onApplyMarkdown(batch.id, customDiscount);
    setActionFeedback(`Promotional markdown of ${customDiscount}% applied to POS & warehouse dispatch!`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  const handleFifoPush = () => {
    onDispatchFifo(batch.id);
    setActionFeedback(`Batch queued for immediate priority outbound FIFO pick.`);
    setTimeout(() => setActionFeedback(null), 4000);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-right duration-200">
      {/* Top Header */}
      <div className="p-4 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-200/80 text-slate-800">
              {batch.sku}
            </span>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${riskBadge.bg} ${riskBadge.text} ${riskBadge.border}`}>
              {batch.riskLevel.toUpperCase()}
            </span>
          </div>
          <h2 className="text-base font-bold text-slate-900 leading-snug">{batch.name}</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {batch.category} • {batch.zone}
          </p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 rounded-lg cursor-pointer transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Main Drawer Content */}
      <div className="p-4 space-y-4 flex-1">
        {/* Feedback alert banner */}
        {actionFeedback && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionFeedback}</span>
          </div>
        )}

        {/* Expiry Prediction Card */}
        <div className="bg-gradient-to-br from-indigo-50/50 via-white to-slate-50 border border-indigo-100/80 rounded-2xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>AI Shelf-Life Forecast</span>
            </div>
            <div className="text-[11px] text-slate-500 font-mono">
              Q10 Kinetic Model: {batch.q10Factor}x / 10°C
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200/70">
              <span className="text-[10px] text-slate-500 block">Nominal Expiry</span>
              <div className="text-sm font-bold text-slate-700 flex items-center gap-1 mt-0.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{batch.originalExpiryDate}</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                ({batch.remainingDaysOriginal} days remaining)
              </span>
            </div>

            <div className="bg-white p-2.5 rounded-xl border border-indigo-200">
              <span className="text-[10px] text-indigo-600 font-semibold block">AI Adjusted Expiry</span>
              <div className="text-sm font-bold text-indigo-900 flex items-center gap-1 mt-0.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>{batch.predictedExpiryDate}</span>
              </div>
              <span className={`text-[10px] font-semibold block mt-0.5 ${batch.remainingDaysPredicted <= 3 ? 'text-rose-600 font-bold' : 'text-indigo-700'}`}>
                {batch.remainingDaysPredicted <= 0 ? 'EXPIRED' : `${batch.remainingDaysPredicted} days remaining`}
              </span>
            </div>
          </div>

          {/* Freshness score meter */}
          <div className="space-y-1">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Freshness Viability</span>
              <span className="font-mono font-bold text-slate-900">{batch.freshnessScore}%</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  batch.freshnessScore > 65
                    ? 'bg-emerald-500'
                    : batch.freshnessScore > 35
                    ? 'bg-amber-500'
                    : 'bg-rose-500'
                }`}
                style={{ width: `${batch.freshnessScore}%` }}
              />
            </div>
          </div>
        </div>

        {/* IoT Live Sensor Telemetry */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2.5">
            <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-slate-600" />
              <span>Real-Time Environmental Telemetry</span>
            </h3>
            <span className="text-[10px] text-slate-400">Updated {batch.telemetry.lastUpdated}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Core Temp</span>
                <span className={`font-mono font-bold ${batch.telemetry.currentTemp > batch.telemetry.targetTemp + 1.5 ? 'text-rose-600' : 'text-slate-800'}`}>
                  {batch.telemetry.currentTemp.toFixed(1)}°C
                </span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Target: {batch.telemetry.targetTemp}°C</span>
            </div>

            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Rel. Humidity</span>
                <span className="font-mono font-bold text-slate-800">{batch.telemetry.humidity}%</span>
              </div>
              <span className="text-[10px] text-slate-400 block mt-0.5">Target: {batch.telemetry.targetHumidity}%</span>
            </div>

            {batch.telemetry.ethylenePpm !== undefined && (
              <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 col-span-2">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Ethylene Gas Level</span>
                  <span className={`font-mono font-bold ${batch.telemetry.ethylenePpm > 1.5 ? 'text-amber-600' : 'text-slate-800'}`}>
                    {batch.telemetry.ethylenePpm} ppm
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Threshold: 1.0 ppm (Elevated ethylene triggers autocatalytic senescence)
                </span>
              </div>
            )}

            <div className="p-2 rounded-lg bg-slate-50 border border-slate-100 col-span-2 flex items-center justify-between">
              <span className="text-slate-500">Thermal Excursion Duration:</span>
              <span className={`font-mono font-bold ${batch.telemetry.coldChainBreachMinutes > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {batch.telemetry.coldChainBreachMinutes} minutes
              </span>
            </div>
          </div>
        </div>

        {/* Arrhenius Kinetic Degradation Curve (Procedural SVG Graph) */}
        <div className="border border-slate-200 rounded-xl p-3.5 bg-white shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold text-slate-800 flex items-center gap-1.5">
              <TrendingDown className="w-3.5 h-3.5 text-indigo-600" />
              <span>Decay Kinetic Curve</span>
            </h3>
            <span className="text-[10px] text-slate-500">Nominal vs Kinetic Actual</span>
          </div>

          <div className="h-28 w-full bg-slate-50 rounded-lg p-2 relative flex flex-col justify-end">
            <svg className="w-full h-full overflow-visible" viewBox="0 0 300 80">
              {/* Grid lines */}
              <line x1="0" y1="20" x2="300" y2="20" stroke="#e2e8f0" strokeDasharray="3,3" />
              <line x1="0" y1="50" x2="300" y2="50" stroke="#e2e8f0" strokeDasharray="3,3" />
              
              {/* Baseline Nominal decay line (dashed slate) */}
              <path
                d="M 10 10 Q 150 40 290 75"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="2"
                strokeDasharray="4,4"
              />

              {/* Kinetic actual accelerated curve (emerald or rose) */}
              <path
                d={`M 10 10 Q 120 ${batch.freshnessScore < 50 ? 55 : 30} 250 75`}
                fill="none"
                stroke={batch.riskLevel === 'critical' ? '#f43f5e' : batch.riskLevel === 'warning' ? '#f59e0b' : '#10b981'}
                strokeWidth="2.5"
              />

              {/* Current state indicator dot */}
              <circle
                cx={Math.max(20, Math.min(270, 280 - (batch.freshnessScore / 100) * 260))}
                cy={75 - (batch.freshnessScore / 100) * 65}
                r="4.5"
                fill={batch.riskLevel === 'critical' ? '#f43f5e' : '#10b981'}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </svg>
            <div className="flex justify-between text-[9px] text-slate-400 mt-1">
              <span>Day 0 (Manufacture)</span>
              <span>Today (Viability: {batch.freshnessScore}%)</span>
              <span>Expiry Threshold</span>
            </div>
          </div>
        </div>

        {/* Biochemical Spoilage Analysis */}
        {batch.aiRiskSummary && (
          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900">
            <div className="flex items-center gap-1.5 font-semibold mb-1 text-amber-950">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              <span>Biochemical Spoilage Mechanism</span>
            </div>
            <p className="leading-relaxed text-amber-800">{batch.aiRiskSummary}</p>
          </div>
        )}

        {/* Dynamic Markdown & Liquidation Engine */}
        <div className="border border-indigo-100 bg-indigo-50/30 rounded-xl p-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
              <DollarSign className="w-3.5 h-3.5 text-indigo-600" />
              <span>Dynamic Markdown Optimizer</span>
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold">
              {batch.quantity} {batch.unit} in stock
            </span>
          </div>

          <p className="text-xs text-slate-600 leading-normal">
            {batch.recommendedAction.reasoning}
          </p>

          {/* Discount Slider */}
          <div className="space-y-1.5 bg-white p-2.5 rounded-lg border border-slate-200/80">
            <div className="flex justify-between text-xs">
              <span className="text-slate-600 font-medium">Clearance Discount Rate</span>
              <span className="font-mono font-bold text-indigo-600">{customDiscount}% OFF</span>
            </div>
            <input
              type="range"
              min="0"
              max="75"
              step="5"
              value={customDiscount}
              onChange={(e) => setCustomDiscount(parseInt(e.target.value))}
              className="w-full accent-indigo-600 h-1.5 cursor-pointer bg-slate-200 rounded-lg"
            />
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-100 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[9px]">Sale Price</span>
                <span className="font-bold text-slate-800">${discountedPrice.toFixed(2)}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Est. Revenue</span>
                <span className="font-bold text-emerald-700">${estimatedRevenue.toLocaleString()}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[9px]">Net Recovery</span>
                <span className={`font-bold ${netRecovery >= 0 ? 'text-indigo-700' : 'text-rose-600'}`}>
                  {netRecovery >= 0 ? `+$${netRecovery.toLocaleString()}` : `-$${Math.abs(netRecovery).toLocaleString()}`}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Drawer Bottom Action Buttons */}
      <div className="p-4 border-t border-slate-100 bg-slate-50 flex items-center gap-2">
        <button
          onClick={handleApplyDiscount}
          className="flex-1 flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs py-2.5 px-3 rounded-xl shadow-xs cursor-pointer transition-colors"
        >
          <DollarSign className="w-3.5 h-3.5" />
          <span>Apply {customDiscount}% Markdown</span>
        </button>

        <button
          onClick={handleFifoPush}
          className="flex items-center justify-center gap-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 font-semibold text-xs py-2.5 px-3 rounded-xl cursor-pointer transition-colors"
        >
          <span>Priority FIFO</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
