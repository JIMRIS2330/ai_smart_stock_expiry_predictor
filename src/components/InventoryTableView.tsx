import React, { useState } from 'react';
import { 
  Search, 
  Filter, 
  ArrowUpDown, 
  Download, 
  Eye, 
  Sparkles, 
  ThermometerSnowflake, 
  Clock, 
  AlertTriangle,
  Tag
} from 'lucide-react';
import { StockBatch, ProductCategory, RiskLevel } from '../types/inventory';
import { getRiskBadgeClasses } from '../utils/kineticPredictor';

interface InventoryTableViewProps {
  batches: StockBatch[];
  onSelectBatch: (batchId: string) => void;
  onApplyMarkdown: (batchId: string, discountPct: number) => void;
  onSwitchTo3D: () => void;
}

export const InventoryTableView: React.FC<InventoryTableViewProps> = ({
  batches,
  onSelectBatch,
  onApplyMarkdown,
  onSwitchTo3D,
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedRisk, setSelectedRisk] = useState<string>('all');
  const [sortField, setSortField] = useState<keyof StockBatch>('remainingDaysPredicted');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  // Filter logic
  const filtered = batches.filter((b) => {
    const matchesSearch =
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.sku.toLowerCase().includes(search.toLowerCase()) ||
      b.category.toLowerCase().includes(search.toLowerCase());

    const matchesCategory = selectedCategory === 'all' || b.category === selectedCategory;
    const matchesRisk = selectedRisk === 'all' || b.riskLevel === selectedRisk;

    return matchesSearch && matchesCategory && matchesRisk;
  });

  // Sort logic
  const sorted = [...filtered].sort((a, b) => {
    let aVal = a[sortField];
    let bVal = b[sortField];

    if (typeof aVal === 'string') {
      return sortAsc
        ? (aVal as string).localeCompare(bVal as string)
        : (bVal as string).localeCompare(aVal as string);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (field: keyof StockBatch) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'SKU',
      'Product Name',
      'Category',
      'Storage Zone',
      'Quantity',
      'Unit',
      'Value ($)',
      'Nominal Expiry',
      'AI Adjusted Expiry',
      'Remaining Days',
      'Freshness (%)',
      'Risk Status',
      'Recommended Action',
      'Discount (%)',
    ];

    const rows = sorted.map((b) => [
      `"${b.sku}"`,
      `"${b.name}"`,
      `"${b.category}"`,
      `"${b.zone}"`,
      b.quantity,
      b.unit,
      b.totalValue.toFixed(2),
      b.originalExpiryDate,
      b.predictedExpiryDate,
      b.remainingDaysPredicted,
      b.freshnessScore,
      b.riskLevel,
      `"${b.recommendedAction.actionType}"`,
      b.recommendedAction.recommendedDiscountPct,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `omnishelf_stock_expiry_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-4">
      {/* Top Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search SKU, product title, category..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-700"
          >
            <option value="all">All Categories</option>
            <option value="Dairy & Eggs">Dairy & Eggs</option>
            <option value="Fresh Produce">Fresh Produce</option>
            <option value="Meat & Seafood">Meat & Seafood</option>
            <option value="Biopharmaceuticals">Biopharmaceuticals</option>
            <option value="Beverages & Juices">Beverages & Juices</option>
            <option value="Bakery & Deli">Bakery & Deli</option>
          </select>

          <select
            value={selectedRisk}
            onChange={(e) => setSelectedRisk(e.target.value)}
            className="text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white font-medium text-slate-700"
          >
            <option value="all">All Risk Levels</option>
            <option value="critical">Critical (&le; 3d)</option>
            <option value="warning">Warning (&le; 7d)</option>
            <option value="fresh">Fresh (&gt; 7d)</option>
            <option value="expired">Expired</option>
          </select>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition-colors shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Batch / SKU</th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    <span>Product Name</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Warehouse Bay</th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort('totalValue')}
                >
                  <div className="flex items-center gap-1">
                    <span>Value</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Telemetry</th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort('remainingDaysPredicted')}
                >
                  <div className="flex items-center gap-1">
                    <span>AI Shelf Life</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th 
                  className="py-3 px-4 cursor-pointer hover:text-slate-800"
                  onClick={() => handleSort('freshnessScore')}
                >
                  <div className="flex items-center gap-1">
                    <span>Viability</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-4">Recommended Action</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sorted.map((b) => {
                const badge = getRiskBadgeClasses(b.riskLevel);
                return (
                  <tr key={b.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {b.sku}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900 max-w-xs truncate">
                      {b.name}
                      <span className="block text-[10px] text-slate-400 font-normal">
                        Qty: {b.quantity} {b.unit}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {b.category}
                    </td>
                    <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                      Aisle {b.rackLocation.aisle} • Bay {b.rackLocation.rack} • T{b.rackLocation.shelf}
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      ${b.totalValue.toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className={`font-mono font-semibold ${b.telemetry.currentTemp > b.telemetry.targetTemp + 1.5 ? 'text-rose-600' : 'text-slate-700'}`}>
                          {b.telemetry.currentTemp.toFixed(1)}°C
                        </span>
                        <span className="text-slate-400">/</span>
                        <span className="text-slate-500 font-mono">{b.telemetry.humidity}% RH</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`font-bold font-mono ${b.remainingDaysPredicted <= 3 ? 'text-rose-600' : b.remainingDaysPredicted <= 7 ? 'text-amber-600' : 'text-slate-800'}`}>
                          {b.remainingDaysPredicted}d
                        </span>
                        <span className="text-[10px] text-slate-400">
                          (orig {b.remainingDaysOriginal}d)
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badge.bg} ${badge.text} ${badge.border}`}>
                          {b.freshnessScore}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {b.recommendedAction.actionType === 'DYNAMIC_MARKDOWN' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md">
                          <Tag className="w-3 h-3" />
                          <span>{b.recommendedAction.recommendedDiscountPct}% Markdown</span>
                        </span>
                      ) : b.recommendedAction.actionType === 'PRIORITIZE_FIFO' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-md">
                          <Clock className="w-3 h-3" />
                          <span>Priority FIFO</span>
                        </span>
                      ) : b.recommendedAction.actionType === 'DISPOSE' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-md">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Dispose</span>
                        </span>
                      ) : (
                        <span className="text-[11px] text-emerald-700 font-medium">Optimal</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => {
                          onSelectBatch(b.id);
                          onSwitchTo3D();
                        }}
                        className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg cursor-pointer transition-colors"
                        title="Locate & Inspect in 3D"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
