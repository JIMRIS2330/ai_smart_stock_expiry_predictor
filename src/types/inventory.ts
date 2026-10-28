export type ProductCategory = 
  | 'Dairy & Eggs'
  | 'Fresh Produce'
  | 'Meat & Seafood'
  | 'Biopharmaceuticals'
  | 'Beverages & Juices'
  | 'Bakery & Deli';

export type StorageZone = 'Cold Storage (2-4°C)' | 'Deep Freeze (-18°C)' | 'Controlled Ambient (18-22°C)' | 'Dry Pantry (15-25°C)';

export type RiskLevel = 'fresh' | 'warning' | 'critical' | 'expired';

export interface EnvironmentalTelemetry {
  currentTemp: number; // in Celsius
  targetTemp: number;
  humidity: number; // in percentage (0 - 100)
  targetHumidity: number;
  ethylenePpm?: number; // for produce
  vibrationG?: number; // transit vibration
  coldChainBreachMinutes: number; // cumulative minutes outside safe range
  sensorStatus: 'online' | 'degraded' | 'offline';
  lastUpdated: string;
}

export interface StockBatch {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  zone: StorageZone;
  rackLocation: {
    aisle: number; // 1 or 2
    rack: number;  // 1, 2, or 3
    shelf: number; // 1, 2, or 3 (height tier)
    slot: number;  // 1 to 4
  };
  quantity: number;
  unit: string;
  unitCost: number;
  retailPrice: number;
  totalValue: number;
  
  manufactureDate: string; // ISO date YYYY-MM-DD
  originalExpiryDate: string; // ISO date YYYY-MM-DD
  predictedExpiryDate: string; // AI adjusted ISO date YYYY-MM-DD
  
  nominalShelfLifeDays: number;
  remainingDaysOriginal: number;
  remainingDaysPredicted: number;
  
  freshnessScore: number; // 0 to 100
  spoilageRiskScore: number; // 0 to 100
  riskLevel: RiskLevel;
  
  telemetry: EnvironmentalTelemetry;
  
  // Kinetic parameters
  q10Factor: number; // usually 2.0 to 3.5 for bio/food products
  baseActivationEnergy: number; // kJ/mol
  packagingIntegrity: number; // 0 to 100%
  turnoverVelocityDaily: number; // estimated units sold per day
  
  // AI insights
  aiRiskSummary?: string;
  spoilageMechanisms?: string[];
  recommendedAction: {
    actionType: 'NORMAL' | 'PRIORITIZE_FIFO' | 'DYNAMIC_MARKDOWN' | 'EMERGENCY_DISPATCH' | 'DONATE' | 'DISPOSE';
    recommendedDiscountPct: number;
    targetDaysToLiquidate: number;
    expectedLossMitigation: number; // in $
    reasoning: string;
  };
}

export interface SimulationEnvironment {
  tempOffsetCelsius: number; // e.g. +4°C
  humidityOffsetPct: number; // e.g. +20%
  coldChainFailure: boolean;
  transitDelayDays: number;
  salesVelocityMultiplier: number; // e.g. 0.5 (sluggish) or 1.5 (fast)
}

export interface SpoilagePredictionResult {
  predictedRemainingDays: number;
  adjustedExpiryDate: string;
  freshnessScore: number;
  spoilageRiskScore: number;
  riskLevel: RiskLevel;
  decayRateMultiplier: number;
  biochemicalPathwayExplanation: string;
  recommendedAction: StockBatch['recommendedAction'];
}
