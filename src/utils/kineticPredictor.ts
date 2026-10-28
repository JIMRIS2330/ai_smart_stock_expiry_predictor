import { StockBatch, SimulationEnvironment, SpoilagePredictionResult, RiskLevel } from '../types/inventory';

/**
 * Calculates kinetic spoilage rate and adjusted shelf-life based on
 * Arrhenius reaction kinetics, Q10 temperature coefficient, humidity deviations,
 * and environmental stresses.
 */
export function calculateKineticPrediction(
  batch: StockBatch,
  sim: SimulationEnvironment = {
    tempOffsetCelsius: 0,
    humidityOffsetPct: 0,
    coldChainFailure: false,
    transitDelayDays: 0,
    salesVelocityMultiplier: 1.0,
  }
): SpoilagePredictionResult {
  const currentTemp = batch.telemetry.currentTemp + sim.tempOffsetCelsius + (sim.coldChainFailure ? 12 : 0);
  const targetTemp = batch.telemetry.targetTemp;
  const tempDelta = Math.max(-5, currentTemp - targetTemp);
  
  // Q10 temperature reaction rate acceleration
  // Standard rule: rate = Q10 ^ (deltaT / 10)
  const q10 = batch.q10Factor || 2.5;
  const tempRateMultiplier = Math.pow(q10, tempDelta / 10);
  
  // Humidity degradation multiplier
  const effectiveHumidity = Math.min(100, Math.max(10, batch.telemetry.humidity + sim.humidityOffsetPct));
  const humidityDelta = Math.max(0, effectiveHumidity - batch.telemetry.targetHumidity);
  const humidityRateMultiplier = 1 + (humidityDelta / 100) * 0.8;
  
  // Ethylene sensitivity for fresh produce
  let ethyleneMultiplier = 1.0;
  if (batch.category === 'Fresh Produce' && batch.telemetry.ethylenePpm) {
    if (batch.telemetry.ethylenePpm > 1.5) {
      ethyleneMultiplier = 1.0 + (batch.telemetry.ethylenePpm - 1.5) * 0.45;
    }
  }

  // Packaging barrier degradation
  const packagingShield = Math.max(0.3, batch.packagingIntegrity / 100);
  const packagingVulnerability = 1 + (1 - packagingShield) * 0.6;

  // Cold chain breach legacy impact
  const breachHours = (batch.telemetry.coldChainBreachMinutes + (sim.coldChainFailure ? 180 : 0)) / 60;
  const breachDeductionDays = breachHours * 0.15 * (tempDelta > 0 ? 1.5 : 0.8);

  // Overall kinetic decay rate multiplier relative to standard shelf conditions
  const decayRateMultiplier = Math.max(
    0.5,
    tempRateMultiplier * humidityRateMultiplier * ethyleneMultiplier * packagingVulnerability
  );

  // Remaining nominal days without simulation transit delay
  const baseRemaining = Math.max(0, batch.remainingDaysOriginal - sim.transitDelayDays);
  
  // Adjusted remaining shelf life in days
  const predictedRemainingDays = Math.max(
    0,
    Math.round((baseRemaining / decayRateMultiplier - breachDeductionDays) * 10) / 10
  );

  // Calculate adjusted calendar expiry date
  const now = new Date();
  const adjustedDate = new Date(now.getTime() + predictedRemainingDays * 24 * 60 * 60 * 1000);
  const adjustedExpiryDate = adjustedDate.toISOString().split('T')[0];

  // Freshness score (0 - 100)
  const freshnessScore = Math.max(
    0,
    Math.min(100, Math.round((predictedRemainingDays / Math.max(1, batch.nominalShelfLifeDays)) * 100))
  );

  // Spoilage risk score (0 - 100)
  const spoilageRiskScore = Math.max(0, Math.min(100, 100 - freshnessScore));

  // Determine risk level category
  let riskLevel: RiskLevel = 'fresh';
  if (predictedRemainingDays <= 0) {
    riskLevel = 'expired';
  } else if (predictedRemainingDays <= 3 || spoilageRiskScore >= 75) {
    riskLevel = 'critical';
  } else if (predictedRemainingDays <= 7 || spoilageRiskScore >= 45) {
    riskLevel = 'warning';
  } else {
    riskLevel = 'fresh';
  }

  // Biochemical pathway analysis text
  let biochemicalExplanation = '';
  if (batch.category === 'Dairy & Eggs') {
    biochemicalExplanation = tempDelta > 2
      ? `Lactic acid bacterial proliferation accelerated by +${tempDelta.toFixed(1)}°C thermal breach; rapid casein coagulation expected.`
      : 'Optimal refrigeration maintains psychrotrophic bacterial counts below threshold.';
  } else if (batch.category === 'Fresh Produce') {
    biochemicalExplanation = (batch.telemetry.ethylenePpm || 0) > 1.2
      ? `Ethylene receptor binding triggered autocatalytic pectin hydrolysis and rapid respiration breakdown.`
      : 'Chlorophyll preservation and respiration velocity are balanced.';
  } else if (batch.category === 'Meat & Seafood') {
    biochemicalExplanation = tempDelta > 1
      ? `Elevated lipid peroxidation and Pseudomonas spp. enzymatic cleavage accelerating volatile amine (TVB-N) release.`
      : 'Myoglobin stability is preserved under sub-4°C controlled atmosphere.';
  } else if (batch.category === 'Biopharmaceuticals') {
    biochemicalExplanation = tempDelta > 2
      ? `Critical thermal break risk: tertiary protein denaturation and monoclonal aggregation likely above standard 2-8°C corridor.`
      : 'Cold-chain integrity verified. Monomer stability within high USP spec.';
  } else {
    biochemicalExplanation = `Kinetics indicate ${(decayRateMultiplier).toFixed(2)}x baseline degradation rate driven by atmospheric gradient.`;
  }

  // Dynamic Markdown & Liquidation Recommendation
  const effectiveVelocity = Math.max(1, batch.turnoverVelocityDaily * sim.salesVelocityMultiplier);
  const projectedNormalSalesInRemaining = effectiveVelocity * Math.max(1, predictedRemainingDays);
  const surplusUnsoldUnits = Math.max(0, batch.quantity - projectedNormalSalesInRemaining);
  
  let actionType: StockBatch['recommendedAction']['actionType'] = 'NORMAL';
  let recommendedDiscountPct = 0;
  let targetDaysToLiquidate = Math.max(1, Math.floor(predictedRemainingDays));
  let reasoning = 'Inventory velocity matches shelf-life horizon. Maintain regular pricing.';

  if (riskLevel === 'expired') {
    actionType = 'DISPOSE';
    recommendedDiscountPct = 0;
    reasoning = 'Shelf-life expired. Immediate safe disposal or chemical reclamation protocol required.';
  } else if (surplusUnsoldUnits > 0 || riskLevel === 'critical') {
    if (predictedRemainingDays <= 2) {
      actionType = 'DYNAMIC_MARKDOWN';
      recommendedDiscountPct = 50;
      targetDaysToLiquidate = 2;
      reasoning = `Urgent: ${batch.quantity} units will spoil in ${predictedRemainingDays}d. Apply 50% liquidation markdown immediately to recover cost.`;
    } else if (predictedRemainingDays <= 5) {
      actionType = 'DYNAMIC_MARKDOWN';
      recommendedDiscountPct = 25;
      targetDaysToLiquidate = 4;
      reasoning = `Surplus of ${Math.round(surplusUnsoldUnits)} units at risk. A 25% promotional markdown increases sell-through velocity to clear batch.`;
    } else {
      actionType = 'PRIORITIZE_FIFO';
      recommendedDiscountPct = 10;
      targetDaysToLiquidate = 6;
      reasoning = `Prioritize forward dispatch in FIFO pick sequence to fast-moving regional distribution centers.`;
    }
  }

  const expectedLossMitigation = Math.round(
    batch.quantity * batch.retailPrice * (1 - recommendedDiscountPct / 100) * (recommendedDiscountPct > 0 ? 0.85 : 0)
  );

  return {
    predictedRemainingDays,
    adjustedExpiryDate,
    freshnessScore,
    spoilageRiskScore,
    riskLevel,
    decayRateMultiplier,
    biochemicalPathwayExplanation: biochemicalExplanation,
    recommendedAction: {
      actionType,
      recommendedDiscountPct,
      targetDaysToLiquidate,
      expectedLossMitigation,
      reasoning,
    },
  };
}

/**
 * Returns color hex string matching risk level for 3D meshes and UI
 */
export function getRiskColorHex(risk: RiskLevel): string {
  switch (risk) {
    case 'fresh':
      return '#10b981'; // vibrant emerald
    case 'warning':
      return '#f59e0b'; // amber
    case 'critical':
      return '#f43f5e'; // rose/crimson
    case 'expired':
      return '#64748b'; // slate/gray
  }
}

export function getRiskBadgeClasses(risk: RiskLevel): { bg: string; text: string; border: string } {
  switch (risk) {
    case 'fresh':
      return { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200' };
    case 'warning':
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    case 'critical':
      return { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200' };
    case 'expired':
      return { bg: 'bg-slate-100', text: 'text-slate-700', border: 'border-slate-300' };
  }
}
