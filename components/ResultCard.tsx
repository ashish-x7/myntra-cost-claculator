
import React from 'react';
import { PricingResult, Marketplace } from '../types';
import { GST_RATE } from '../constants';

interface ResultCardProps {
  result: PricingResult;
  baseTp: number;
  targetSettlement: number;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, baseTp, targetSettlement }) => {
  const format = (val: number, decimals: number = 2) => 
    `₹${val.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  const marketplaceCosts = (result.commission || 0) + (result.fixedFee || 0) + (result.reverseLogisticsFee || 0) + (result.tcs || 0) + (result.tds || 0);
  const netProfit = result.totalActualSettlement - baseTp;
  const roi = (baseTp > 0) ? (netProfit / baseTp) * 100 : 0;
  const markupAmount = targetSettlement - baseTp;

  // Check if target and payout match within a tight tolerance
  const isMatched = Math.abs(result.totalActualSettlement - targetSettlement) < 0.1;

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      <div className="bg-forest-pine p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden dark:bg-forest-leaf/80 ring-1 ring-white/10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-[60px] -mr-16 -mt-16"></div>
        <div className="relative z-10 space-y-4 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              <span className="text-[7px] font-black uppercase tracking-widest text-forest-accent">Selling Price (AISP)</span>
            </div>
            {result.brand && (
              <span className="text-[8px] font-black uppercase tracking-[0.05em] text-white/40">
                {result.brand} • {result.articleType}
              </span>
            )}
          </div>
          
          <h3 className="text-4xl font-black tracking-tighter leading-none italic drop-shadow-xl">
            {format(result.aisp)}
          </h3>
          
          <div className="flex justify-center gap-8 pt-4 border-t border-white/10">
            <div className="flex flex-col items-center">
              <span className="text-white/60 uppercase text-[8px] font-black tracking-widest mb-0.5">Customer Price</span>
              <span className="text-xl font-black tracking-tight">{format(result.customerPrice)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-white/60 uppercase text-[8px] font-black tracking-widest mb-0.5">Logistics Cost</span>
              <span className="text-xl font-black tracking-tight text-forest-sage">{format(result.logisticsFee)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Net Profit */}
        <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-md text-center flex flex-col justify-center items-center dark:bg-forest-pine/40 dark:border-forest-leaf/30 transition-all hover:scale-[1.01]">
          <span className="text-[8px] font-black text-forest-leaf/60 uppercase tracking-widest mb-2">Net Profit</span>
          <span className={`text-3xl font-black tracking-tighter ${netProfit >= 0 ? 'text-forest-pine dark:text-forest-mint' : 'text-rose-600'}`}>
            {format(netProfit)}
          </span>
        </div>
        
        {/* ROI */}
        <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-md text-center flex flex-col justify-center items-center dark:bg-forest-pine/40 dark:border-forest-leaf/30 transition-all hover:scale-[1.01]">
          <span className="text-[8px] font-black text-forest-leaf/60 uppercase tracking-widest mb-2">ROI</span>
          <span className={`text-3xl font-black tracking-tighter ${netProfit >= 0 ? 'text-forest-pine dark:text-forest-mint' : 'text-rose-600'}`}>
            {roi.toFixed(2)}%
          </span>
        </div>

        {/* Platform Deductions */}
        <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-sm space-y-3 dark:bg-forest-pine/40 dark:border-forest-leaf/30 flex flex-col justify-center">
          <h4 className="text-[10px] font-black text-forest-leaf uppercase tracking-widest flex items-center gap-2 dark:text-forest-sage">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Platform Fees & Taxes
          </h4>
          <div className="space-y-1.5 text-[10px] text-forest-pine/80 dark:text-forest-mint/80">
            <div className="flex justify-between items-center text-[9px] font-bold text-forest-pine/40 uppercase">
              <span>Commission ({result.commissionRate}%)</span>
            </div>
            <div className="flex justify-between items-center pl-2">
              <span className="text-forest-pine/50">Base Amt:</span>
              <span className="font-bold">{format(result.baseCommission)}</span>
            </div>
            <div className="flex justify-between items-center pl-2 pb-1 border-b border-forest-accent/20 dark:border-forest-leaf/10">
              <span className="text-forest-pine/50">GST (18%):</span>
              <span className="font-bold text-rose-500">+{format(result.commission - result.baseCommission)}</span>
            </div>

            <div className="flex justify-between items-center pt-1 text-[9px] font-bold text-forest-pine/40 uppercase">
              <span>Fixed Fee</span>
            </div>
            <div className="flex justify-between items-center pl-2">
              <span className="text-forest-pine/50">Base Amt:</span>
              <span className="font-bold">{format(result.baseFixedFee)}</span>
            </div>
            <div className="flex justify-between items-center pl-2 pb-1 border-b border-forest-accent/20 dark:border-forest-leaf/10">
              <span className="text-forest-pine/50">GST (18%):</span>
              <span className="font-bold text-rose-500">+{format(result.fixedFee - result.baseFixedFee)}</span>
            </div>

            <div className="flex justify-between items-center pt-1 text-[9px] font-bold text-forest-pine/40 uppercase">
              <span>Statutory Taxes</span>
            </div>
            <div className="flex justify-between items-center pl-2">
              <span className="text-forest-pine/50">TCS (0.47%):</span>
              <span className="font-bold">{format(result.tcs)}</span>
            </div>
            <div className="flex justify-between items-center pl-2 pb-1 border-b border-forest-accent/20 dark:border-forest-leaf/10">
              <span className="text-forest-pine/50">TDS (0.095%):</span>
              <span className="font-bold">{format(result.tds)}</span>
            </div>

            <div className="pt-2 border-t border-forest-accent flex justify-between items-center dark:border-forest-leaf/20">
              <span className="text-[10px] font-black text-forest-pine uppercase dark:text-forest-mint">Total Leakage</span>
              <span className="font-black text-rose-600 text-sm">-{format(marketplaceCosts)}</span>
            </div>
          </div>
        </div>
        
        {/* Value Allocation */}
        <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-sm space-y-3 dark:bg-forest-pine/40 dark:border-forest-leaf/30 flex flex-col justify-center">
          <h4 className="text-[8px] font-black text-forest-leaf uppercase tracking-widest flex items-center gap-2 dark:text-forest-sage">
            <span className="w-1 h-1 bg-forest-leaf rounded-full"></span> Value Allocation
          </h4>
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-bold text-forest-pine/40 uppercase">Transfer Cost</span>
              <span className="font-black text-xs text-forest-pine dark:text-forest-mint">{format(baseTp)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[8px] font-bold text-forest-pine/40 uppercase">Business Markup</span>
              <span className="font-black text-xs text-forest-leaf dark:text-forest-sage">+{format(markupAmount)}</span>
            </div>
            <div className="pt-2 border-t border-forest-accent flex justify-between items-center dark:border-forest-leaf/20">
              <span className="text-[8px] font-black text-forest-pine uppercase dark:text-forest-mint">Global Settlement Goal</span>
              <span className="font-black text-forest-pine text-sm dark:text-forest-mint">{format(targetSettlement)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`bg-white border rounded-2xl p-5 flex justify-between items-center shadow-lg dark:bg-forest-pine/60 relative overflow-hidden group/final transition-all duration-500 ${isMatched ? 'border-forest-leaf dark:border-forest-sage ring-2 ring-forest-leaf/5 shadow-[0_0_20px_rgba(45,90,58,0.05)]' : 'border-forest-accent'}`}>
        {isMatched && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-forest-leaf/10 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
        )}
        <div className="flex flex-col relative z-10">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[8px] font-black text-forest-leaf uppercase tracking-widest dark:text-forest-sage">Settlement Payout</span>
            {isMatched && (
              <div className="flex items-center gap-1 px-1.5 py-0.5 bg-forest-leaf text-white text-[6px] font-black uppercase rounded shadow-sm animate-in slide-in-from-left-2 duration-500">
                Verified
              </div>
            )}
          </div>
          <span className="text-4xl font-black text-forest-pine tracking-tighter italic dark:text-forest-mint transition-all drop-shadow-lg">
            {format(result.totalActualSettlement)}
          </span>
        </div>
        <div className={`w-10 h-10 text-white flex items-center justify-center rounded-xl shadow-md relative z-10 transition-all duration-700 ${isMatched ? 'bg-forest-leaf dark:bg-forest-sage scale-105' : 'bg-forest-accent/50'}`}>
           <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
        </div>
      </div>
    </div>
  );
};

export default ResultCard;
