import React, { useState } from 'react';
import { X, Plus, Sparkles } from 'lucide-react';
import { StockBatch, ProductCategory, StorageZone } from '../types/inventory';
import { calculateKineticPrediction } from '../utils/kineticPredictor';

interface AddBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddBatch: (batch: StockBatch) => void;
}

export const AddBatchModal: React.FC<AddBatchModalProps> = ({ isOpen, onClose, onAddBatch }) => {
  if (!isOpen) return null;

  const [name, setName] = useState('');
  const [sku, setSku] = useState(`SKU-${Math.floor(1000 + Math.random() * 9000)}`);
  const [category, setCategory] = useState<ProductCategory>('Fresh Produce');
  const [zone, setZone] = useState<StorageZone>('Cold Storage (2-4°C)');
  const [quantity, setQuantity] = useState(250);
  const [unit, setUnit] = useState('units');
  const [unitCost, setUnitCost] = useState(3.5);
  const [retailPrice, setRetailPrice] = useState(7.99);
  const [shelfLifeDays, setShelfLifeDays] = useState(10);
  const [temp, setTemp] = useState(3.8);
  const [humidity, setHumidity] = useState(85);
  const [aisle, setAisle] = useState<1 | 2>(1);
  const [rack, setRack] = useState<1 | 2 | 3>(2);
  const [shelf, setShelf] = useState<1 | 2 | 3>(2);
  const [slot, setSlot] = useState<1 | 2>(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const now = new Date();
    const manufactureDate = now.toISOString().split('T')[0];
    const expiryDate = new Date(now.getTime() + shelfLifeDays * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0];

    const targetTemp = zone.includes('Deep Freeze')
      ? -20
      : zone.includes('Cold')
      ? 3.5
      : 20;

    const rawBatch: StockBatch = {
      id: `BATCH-${Date.now().toString().slice(-4)}`,
      sku: sku.trim(),
      name: name.trim(),
      category,
      zone,
      rackLocation: { aisle, rack, shelf, slot },
      quantity: Number(quantity),
      unit,
      unitCost: Number(unitCost),
      retailPrice: Number(retailPrice),
      totalValue: Number(quantity) * Number(retailPrice),
      manufactureDate,
      originalExpiryDate: expiryDate,
      predictedExpiryDate: expiryDate,
      nominalShelfLifeDays: Number(shelfLifeDays),
      remainingDaysOriginal: Number(shelfLifeDays),
      remainingDaysPredicted: Number(shelfLifeDays),
      freshnessScore: 100,
      spoilageRiskScore: 0,
      riskLevel: 'fresh',
      telemetry: {
        currentTemp: Number(temp),
        targetTemp,
        humidity: Number(humidity),
        targetHumidity: category === 'Fresh Produce' ? 88 : 60,
        coldChainBreachMinutes: 0,
        sensorStatus: 'online',
        lastUpdated: 'Just now',
      },
      q10Factor: category === 'Biopharmaceuticals' ? 3.5 : category === 'Meat & Seafood' ? 3.2 : 2.5,
      baseActivationEnergy: 75,
      packagingIntegrity: 98,
      turnoverVelocityDaily: Math.max(5, Math.round(Number(quantity) / Number(shelfLifeDays))),
      recommendedAction: {
        actionType: 'NORMAL',
        recommendedDiscountPct: 0,
        targetDaysToLiquidate: Number(shelfLifeDays),
        expectedLossMitigation: 0,
        reasoning: 'Newly registered batch in optimal preservation state.',
      },
    };

    // Run prediction to compute adjusted days
    const prediction = calculateKineticPrediction(rawBatch);
    const enrichedBatch: StockBatch = {
      ...rawBatch,
      predictedExpiryDate: prediction.adjustedExpiryDate,
      remainingDaysPredicted: prediction.predictedRemainingDays,
      freshnessScore: prediction.freshnessScore,
      spoilageRiskScore: prediction.spoilageRiskScore,
      riskLevel: prediction.riskLevel,
      aiRiskSummary: prediction.biochemicalPathwayExplanation,
      recommendedAction: prediction.recommendedAction,
    };

    onAddBatch(enrichedBatch);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Plus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Register New Stock Lot</h2>
              <p className="text-xs text-slate-500">Add inventory with baseline kinetic telemetry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 max-h-[75vh] overflow-y-auto">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Product Title</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Organic Honeycrisp Apples"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Batch / SKU</label>
              <input
                type="text"
                required
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 font-mono focus:outline-hidden focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as ProductCategory)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600"
              >
                <option value="Dairy & Eggs">Dairy & Eggs</option>
                <option value="Fresh Produce">Fresh Produce</option>
                <option value="Meat & Seafood">Meat & Seafood</option>
                <option value="Biopharmaceuticals">Biopharmaceuticals</option>
                <option value="Beverages & Juices">Beverages & Juices</option>
                <option value="Bakery & Deli">Bakery & Deli</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Storage Zone</label>
              <select
                value={zone}
                onChange={(e) => setZone(e.target.value as StorageZone)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-indigo-600"
              >
                <option value="Cold Storage (2-4°C)">Cold Storage (2-4°C)</option>
                <option value="Deep Freeze (-18°C)">Deep Freeze (-18°C)</option>
                <option value="Controlled Ambient (18-22°C)">Controlled Ambient (18-22°C)</option>
                <option value="Dry Pantry (15-25°C)">Dry Pantry (15-25°C)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Unit Cost ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={unitCost}
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Retail Price ($)</label>
              <input
                type="number"
                step="0.01"
                required
                value={retailPrice}
                onChange={(e) => setRetailPrice(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Shelf Life (Days)</label>
              <input
                type="number"
                min="1"
                required
                value={shelfLifeDays}
                onChange={(e) => setShelfLifeDays(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Sensor Temp (°C)</label>
              <input
                type="number"
                step="0.1"
                required
                value={temp}
                onChange={(e) => setTemp(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-700 block mb-1">Humidity (%)</label>
              <input
                type="number"
                min="10"
                max="100"
                required
                value={humidity}
                onChange={(e) => setHumidity(Number(e.target.value))}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">3D Warehouse Rack Location</label>
            <div className="grid grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-500">Aisle</span>
                <select
                  value={aisle}
                  onChange={(e) => setAisle(Number(e.target.value) as 1 | 2)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value={1}>Aisle 1</option>
                  <option value={2}>Aisle 2</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Bay</span>
                <select
                  value={rack}
                  onChange={(e) => setRack(Number(e.target.value) as 1 | 2 | 3)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value={1}>Bay 1</option>
                  <option value={2}>Bay 2</option>
                  <option value={3}>Bay 3</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Tier (Shelf)</span>
                <select
                  value={shelf}
                  onChange={(e) => setShelf(Number(e.target.value) as 1 | 2 | 3)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value={1}>Tier 1 (Lower)</option>
                  <option value={2}>Tier 2 (Mid)</option>
                  <option value={3}>Tier 3 (Upper)</option>
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-500">Slot</span>
                <select
                  value={slot}
                  onChange={(e) => setSlot(Number(e.target.value) as 1 | 2)}
                  className="w-full mt-0.5 px-2 py-1.5 border border-slate-300 rounded-lg bg-white"
                >
                  <option value={1}>Slot Left</option>
                  <option value={2}>Slot Right</option>
                </select>
              </div>
            </div>
          </div>

          <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-indigo-900 flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Automated Kinetic Induction</p>
              <p className="text-[11px] text-indigo-800">
                The AI engine will automatically compute Arrhenius reaction rate multipliers, temperature delta variances, and dynamic sell-through thresholds.
              </p>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 rounded-xl border border-slate-300 hover:bg-slate-50 cursor-pointer transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs cursor-pointer transition-colors"
            >
              Induct Batch & Place on Shelf
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
