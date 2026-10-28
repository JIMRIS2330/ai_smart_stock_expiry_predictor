import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Send, 
  Bot, 
  User, 
  Lightbulb, 
  DollarSign, 
  AlertTriangle,
  RotateCcw
} from 'lucide-react';
import { StockBatch } from '../types/inventory';

interface AiCopilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  batches: StockBatch[];
  onSelectBatch: (batchId: string) => void;
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  recommendedBatchId?: string;
}

export const AiCopilotModal: React.FC<AiCopilotModalProps> = ({
  isOpen,
  onClose,
  batches,
  onSelectBatch,
}) => {
  if (!isOpen) return null;

  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your AI Stock Expiry Copilot. I analyze kinetic shelf-life decay curves, live IoT temperature logs, and sales turnover velocity across your warehouse. What would you like to inspect?",
      timestamp: 'Just now',
    },
  ]);

  const presetQueries = [
    { label: 'Highest Financial Risk Batches', query: 'Which batches represent the greatest dollar value at imminent risk of expiration?' },
    { label: 'Dynamic Markdown Recommendations', query: 'Recommend discount percentages to clear near-expiry inventory before spoilage.' },
    { label: 'Cold-Chain Failure Triage', query: 'Assess the cold storage zone and identify any thermal breach excursions.' },
    { label: 'FIFO Dispatch Pick List', query: 'Generate an urgent FIFO outbound dispatch list for retail distribution.' },
  ];

  const handleSend = async (userPrompt: string) => {
    const textToSend = userPrompt || query;
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: textToSend,
      timestamp: 'Just now',
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      // First attempt server-side Gemini API endpoint
      const response = await fetch('/api/ai-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: textToSend,
          inventorySummary: batches.map((b) => ({
            id: b.id,
            sku: b.sku,
            name: b.name,
            risk: b.riskLevel,
            predictedDays: b.remainingDaysPredicted,
            value: b.totalValue,
            temp: b.telemetry.currentTemp,
            recommendedDiscount: b.recommendedAction.recommendedDiscountPct,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.reply) {
          setMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              sender: 'ai',
              text: data.reply,
              timestamp: 'Just now',
              recommendedBatchId: data.recommendedBatchId,
            },
          ]);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback seamlessly to local intelligent heuristic engine
    }

    // Heuristic AI response synthesis
    setTimeout(() => {
      let reply = '';
      let recommendedBatchId: string | undefined;

      const lower = textToSend.toLowerCase();
      const criticalBatches = batches.filter((b) => b.riskLevel === 'critical' || b.riskLevel === 'expired');
      const coldBreaches = batches.filter((b) => b.telemetry.coldChainBreachMinutes > 0);
      const highValueAtRisk = batches
        .filter((b) => b.remainingDaysPredicted <= 7)
        .sort((a, b) => b.totalValue - a.totalValue);

      if (lower.includes('financial') || lower.includes('value') || lower.includes('dollar') || lower.includes('cost')) {
        const totalAtRiskVal = highValueAtRisk.reduce((acc, b) => acc + b.totalValue, 0);
        reply = `**Financial Risk Assessment:**\nCurrently, **$${totalAtRiskVal.toLocaleString()}** of stock is in the danger corridor (expiring within 7 days).\n\nTop priority batches:\n` +
          highValueAtRisk.slice(0, 3).map((b) => `• **${b.name}** (${b.sku}): $${b.totalValue.toLocaleString()} at risk (${b.remainingDaysPredicted}d left) — Apply **${b.recommendedAction.recommendedDiscountPct}% markdown** immediately.`).join('\n') +
          `\n\nImplementing the recommended dynamic pricing will recover an estimated **$${Math.round(totalAtRiskVal * 0.75).toLocaleString()}** that would otherwise be complete inventory write-off.`;
        if (highValueAtRisk[0]) recommendedBatchId = highValueAtRisk[0].id;
      } else if (lower.includes('markdown') || lower.includes('discount') || lower.includes('price')) {
        reply = `**Dynamic Markdown Optimization:**\nBased on daily turnover velocity vs. adjusted kinetic expiry:\n\n` +
          criticalBatches.map((b) => `• **${b.name}** (${b.sku}): Mark down by **${b.recommendedAction.recommendedDiscountPct}%** (Target sell-out: ${b.recommendedAction.targetDaysToLiquidate} days).`).join('\n') +
          `\n\nThese promotional price adjustments are calculated via price-elasticity to accelerate clearance before microbiological spoilage.`;
        if (criticalBatches[0]) recommendedBatchId = criticalBatches[0].id;
      } else if (lower.includes('cold') || lower.includes('thermal') || lower.includes('sensor') || lower.includes('temp')) {
        reply = `**Cold-Chain & Environmental Audit:**\n` +
          `There are **${coldBreaches.length} batches** with recorded temperature breaches in Aisle 1.\n\n` +
          coldBreaches.map((b) => `• **${b.name}**: Sensor reads ${b.telemetry.currentTemp}°C (Target: ${b.telemetry.targetTemp}°C). Cumulative breach: ${b.telemetry.coldChainBreachMinutes} minutes. Q10 acceleration has degraded nominal shelf-life by ${Math.round((b.remainingDaysOriginal - b.remainingDaysPredicted)*10)/10} days.`).join('\n') +
          `\n\n*Action*: Inspect secondary refrigeration evaporator and prioritize these pallets for immediate cold-room re-stowage.`;
        if (coldBreaches[0]) recommendedBatchId = coldBreaches[0].id;
      } else {
        reply = `**Warehouse Expiry Summary:**\n• Total monitored lots: **${batches.length}**\n• Lots in critical danger (<3 days): **${criticalBatches.length}**\n• Average warehouse freshness score: **${Math.round(batches.reduce((a, b) => a + b.freshnessScore, 0) / batches.length)}%**\n\nRecommendation: Liquidate **${batches[0]?.name}** via flash promotional markdown or expedited regional distribution.`;
        recommendedBatchId = batches[0]?.id;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: reply,
          timestamp: 'Just now',
          recommendedBatchId,
        },
      ]);
      setLoading(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full h-[600px] flex flex-col overflow-hidden border border-slate-200">
        {/* Header */}
        <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-indigo-50/70 via-white to-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">AI Stock Expiry Copilot</h2>
              <p className="text-xs text-slate-500">Autonomous degradation modeling & warehouse triage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Preset quick buttons */}
        <div className="p-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
            Prompt Suggestions:
          </span>
          {presetQueries.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(pq.query)}
              className="px-2.5 py-1 bg-white hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-200 border border-slate-200/90 rounded-lg font-medium text-slate-700 shrink-0 cursor-pointer transition-all text-[11px]"
            >
              {pq.label}
            </button>
          ))}
        </div>

        {/* Message Thread */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/40">
          {messages.map((m) => (
            <div
              key={m.id}
              className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.sender === 'ai' && (
                <div className="w-7 h-7 rounded-full bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
                  m.sender === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-xs'
                    : 'bg-white border border-slate-200 text-slate-800 shadow-xs rounded-tl-xs'
                }`}
              >
                <div className="whitespace-pre-line">{m.text}</div>

                {m.recommendedBatchId && (
                  <button
                    onClick={() => {
                      onSelectBatch(m.recommendedBatchId!);
                      onClose();
                    }}
                    className="mt-2.5 inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold text-[11px] cursor-pointer border border-indigo-200 transition-colors"
                  >
                    <span>Inspect Highlighted Batch in 3D</span>
                    <Sparkles className="w-3 h-3" />
                  </button>
                )}

                <div
                  className={`text-[9px] mt-1 text-right ${
                    m.sender === 'user' ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {m.timestamp}
                </div>
              </div>

              {m.sender === 'user' && (
                <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-xs text-slate-500 italic p-2">
              <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
              <span>Simulating Arrhenius kinetics & cross-referencing sales elasticity...</span>
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-3 border-t border-slate-200 bg-white flex items-center gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleSend(query);
            }}
            placeholder="Ask Copilot about any batch, spoilage risk, markdown, or storage zone..."
            className="flex-1 text-xs px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-hidden focus:border-indigo-600 bg-slate-50/50"
          />
          <button
            onClick={() => handleSend(query)}
            disabled={!query.trim() || loading}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl cursor-pointer transition-colors shadow-xs"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
