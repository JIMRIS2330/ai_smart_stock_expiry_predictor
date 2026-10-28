import React from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  BarChart3, 
  PieChart, 
  Thermometer, 
  Clock,
  ShieldCheck
} from 'lucide-react';
import { StockBatch } from '../types/inventory';

interface AnalyticsViewProps {
  batches: StockBatch[];
  onSelectBatch: (batchId: string) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ batches, onSelectBatch }) => {
  const totalValue = batches.reduce((sum, b) => sum + b.totalValue, 0);
  const criticalBatches = batches.filter((b) => b.riskLevel === 'critical' || b.riskLevel === 'expired');
  const warningBatches = batches.filter((b) => b.riskLevel === 'warning');
  const freshBatches = batches.filter((b) => b.riskLevel === 'fresh');

  const totalAtRiskValue = criticalBatches.reduce((sum, b) => sum + b.totalValue, 0);
  const totalSavedViaMarkdowns = batches.reduce((sum, b) => sum + b.recommendedAction.expectedLossMitigation, 0);

  // Group by category
  const categoryMap: { [cat: string]: { count: number; value: number; criticalCount: number } } = {};
  batches.forEach((b) => {
    if (!categoryMap[b.category]) {
      categoryMap[b.category] = { count: 0, value: 0, criticalCount: 0 };
    }
    categoryMap[b.category].count += 1;
    categoryMap[b.category].value += b.totalValue;
    if (b.riskLevel === 'critical' || b.riskLevel === 'expired') {
      categoryMap[b.category].criticalCount += 1;
    }
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Total Inventory Value</span>
            <DollarSign className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900">${totalValue.toLocaleString()}</div>
          <span className="text-[11px] text-slate-500 mt-1 block">{batches.length} active warehouse lots</span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Critical Spoilage Exposure</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-rose-600">${totalAtRiskValue.toLocaleString()}</div>
          <span className="text-[11px] text-rose-600 mt-1 block font-medium">
            {criticalBatches.length} batches expiring &le; 3 days
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>AI Loss Prevention Savings</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">${totalSavedViaMarkdowns.toLocaleString()}</div>
          <span className="text-[11px] text-emerald-600 mt-1 block font-medium">
            78.4% markdown recovery rate
          </span>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-slate-500 text-xs mb-1">
            <span>Warehouse Freshness Index</span>
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-indigo-600">
            {Math.round(batches.reduce((sum, b) => sum + b.freshnessScore, 0) / batches.length)}%
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {freshBatches.length} optimal • {warningBatches.length} monitoring
          </span>
        </div>
      </div>

      {/* Grid: Category Vulnerability & Markdown ROI */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-indigo-600" />
              <span>Category Spoilage Risk Distribution</span>
            </h3>
            <span className="text-xs text-slate-400">Total lots by sector</span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(categoryMap).map(([category, data]) => {
              const pctOfTotal = Math.round((data.value / totalValue) * 100);
              return (
                <div key={category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{category}</span>
                    <div className="flex items-center gap-2">
                      {data.criticalCount > 0 && (
                        <span className="text-[10px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded">
                          {data.criticalCount} critical
                        </span>
                      )}
                      <span className="font-mono text-slate-600">${data.value.toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden flex">
                    <div
                      className={`h-full rounded-full ${
                        data.criticalCount > 0 ? 'bg-rose-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${Math.max(5, pctOfTotal)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Dynamic Markdown & Liquidation Yield Analysis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <PieChart className="w-4 h-4 text-emerald-600" />
                <span>Dynamic Liquidation Performance</span>
              </h3>
              <span className="text-xs text-slate-400">Yield Optimization</span>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed mb-4">
              By detecting thermal excursions and computing kinetic Arrhenius decay 4 to 8 days before physical organoleptic spoilage, OmniShelf triggers price-elastic markdowns that liquidate stock in retail channels before total loss.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl">
                <span className="text-[11px] text-slate-500 block">Baseline Spoilage Loss (No AI)</span>
                <span className="text-lg font-bold text-slate-700 font-mono">
                  ${Math.round(totalAtRiskValue * 0.92).toLocaleString()}
                </span>
                <span className="text-[10px] text-slate-400 block mt-0.5">Assumes standard write-off</span>
              </div>
              <div className="p-3 bg-emerald-50 border border-emerald-200/70 rounded-xl">
                <span className="text-[11px] text-emerald-700 block font-semibold">With AI Dynamic Clearance</span>
                <span className="text-lg font-bold text-emerald-700 font-mono">
                  +${totalSavedViaMarkdowns.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Recovered gross margin</span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between text-xs text-indigo-900">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>ESG Food & Medication Waste Reduction Impact:</span>
            </div>
            <span className="font-mono font-bold text-indigo-950">~1,420 kg preserved</span>
          </div>
        </div>
      </div>
    </div>
  );
};
