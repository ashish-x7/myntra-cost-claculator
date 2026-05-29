
import React from 'react';
import { Level, Region, ReverseLogisticsMode, ArticleType, BusinessBuffers, Marketplace, Brand, MarginType } from '../types';
import { ARTICLE_SPECIFICATIONS } from '../constants';
import { calculateTargetFromTP, calculateBaseCost } from '../services/calculatorService';
import SearchableSelect from './SearchableSelect';

interface CalculatorFormProps {
  brand: Brand;
  setBrand: (val: Brand) => void;
  articleType: ArticleType;
  setArticleType: (val: ArticleType) => void;
  tpPrice: number;
  setTpPrice: (val: number) => void;
  targetSettlement: number;
  setTargetSettlement: (val: number) => void;
  level: Level;
  setLevel: (val: Level) => void;
  isReverse: boolean;
  setIsReverse: (val: boolean) => void;
  reverseRegion: Region;
  setReverseRegion: (val: Region) => void;
  reverseMode: ReverseLogisticsMode;
  setReverseMode: (val: ReverseLogisticsMode) => void;
  reversePercent: number;
  setReversePercent: (val: number) => void;
  buffers: BusinessBuffers;
  setBuffers: (val: BusinessBuffers) => void;
  manualRateCardActive?: boolean;
}

const CalculatorForm: React.FC<CalculatorFormProps> = ({
  brand,
  setBrand,
  articleType,
  setArticleType,
  tpPrice,
  setTpPrice,
  targetSettlement,
  setTargetSettlement,
  level,
  setLevel,
  buffers,
  setBuffers,
  manualRateCardActive
}) => {
  const handleArticleChange = (newType: ArticleType) => {
    setArticleType(newType);
    const spec = ARTICLE_SPECIFICATIONS[newType];
    if (spec) setLevel(spec.defaultLevel);
  };

  return (
    <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-lg ring-1 ring-inset ring-white/60 space-y-4 dark:bg-forest-pine/40 dark:border-forest-leaf/30 relative overflow-hidden group">
      <div className="relative z-10 flex items-center justify-between border-b border-forest-accent/50 pb-3 dark:border-forest-leaf/20">
        <h2 className="text-[9px] font-black text-forest-pine uppercase tracking-widest dark:text-forest-mint">Configuration</h2>
      </div>
      
      {manualRateCardActive && (
        <div className="relative z-10 px-2 py-1 bg-amber-50 border border-amber-200 rounded flex items-center gap-1.5 dark:bg-amber-900/20 dark:border-amber-800/40">
          <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span>
          <span className="text-[7px] font-black text-amber-700 uppercase dark:text-amber-400">Manual Card Active</span>
        </div>
      )}

      <div className="relative z-10 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[8px] font-black text-forest-leaf uppercase block dark:text-forest-sage">Partner Brand</label>
            <div className="relative">
              <select 
                value={brand}
                onChange={(e) => setBrand(e.target.value as Brand)}
                className="w-full pl-2 pr-6 py-1.5 bg-white border border-forest-accent rounded-lg font-bold text-xs text-gray-900 outline-none focus:border-forest-leaf appearance-none cursor-pointer dark:bg-white dark:border-forest-leaf/40 shadow-sm"
              >
                {Object.values(Brand).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-forest-leaf opacity-40">
                <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[8px] font-black text-forest-leaf uppercase block dark:text-forest-sage">Article Type</label>
            <SearchableSelect
              value={articleType}
              onChange={(val) => handleArticleChange(val as ArticleType)}
              options={Object.values(ArticleType).map(type => ({ value: type, label: type }))}
              placeholder="Article Type"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-[8px] font-black text-forest-leaf uppercase tracking-widest block dark:text-forest-sage">Manufacturing Cost (TP)</label>
          <div className="relative group/input">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-forest-pine font-black text-lg opacity-20 dark:text-forest-mint">₹</span>
            <input
              type="number"
              value={tpPrice || ''}
              onChange={(e) => setTpPrice(Number(e.target.value))}
              className="w-full pl-8 pr-4 py-2 bg-white border border-forest-accent rounded-xl font-black text-xl text-forest-pine outline-none focus:border-forest-leaf transition-all shadow-inner dark:bg-forest-pine/60 dark:border-forest-leaf/40 dark:text-forest-mint"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="p-4 bg-forest-accent/10 rounded-xl border border-forest-accent/30 space-y-3 dark:bg-forest-leaf/10 dark:border-forest-leaf/20 shadow-inner">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 bg-forest-leaf rounded-full shadow-sm"></span>
              <h3 className="text-[8px] font-black text-forest-leaf uppercase tracking-widest dark:text-forest-sage">Margin Builder</h3>
            </div>
            <div className="flex bg-forest-accent/30 p-0.5 rounded-lg border border-forest-accent/20">
               {(['PERCENT', 'VALUE'] as MarginType[]).map(type => (
                 <button 
                  key={type}
                  onClick={() => setBuffers({...buffers, marginType: type})}
                  className={`px-2 py-0.5 text-[7px] font-black uppercase rounded transition-all ${buffers.marginType === type ? 'bg-forest-pine text-white shadow-sm' : 'text-forest-pine/40 hover:text-forest-pine'}`}
                 >
                   {type}
                 </button>
               ))}
            </div>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
             <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[7px] font-black text-forest-leaf/40 uppercase">Markup Adj</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] font-black text-forest-leaf opacity-60">
                      Amt: ₹{Math.round(calculateTargetFromTP(tpPrice, brand, articleType, buffers) - calculateBaseCost(tpPrice, brand, articleType, buffers))}
                    </span>
                    <div className="flex gap-1">
                      {[40, 60].map(v => (
                        <button 
                          key={v}
                          onClick={() => setBuffers({...buffers, marginAdjustment: v})}
                          className="text-[6px] font-black px-1.5 py-0.5 bg-forest-accent/20 rounded hover:bg-forest-leaf hover:text-white transition-colors"
                        >
                          {v}{buffers.marginType === MarginType.PERCENT ? '%' : ''}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    value={buffers.marginAdjustment} 
                    onChange={(e) => setBuffers({...buffers, marginAdjustment: Number(e.target.value)})}
                    className="w-full px-2 py-1.5 bg-white border border-forest-accent rounded-lg font-black text-xs text-forest-pine outline-none focus:border-forest-leaf shadow-sm dark:bg-forest-pine/60 dark:text-forest-mint" 
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-forest-pine/30 text-[9px] font-black dark:text-forest-mint/30">
                    {buffers.marginType === MarginType.PERCENT ? '%' : '₹'}
                  </span>
                </div>
             </div>
          </div>
        </div>

        <div className="p-4 bg-forest-accent/10 rounded-xl border border-forest-accent/30 space-y-3 dark:bg-forest-leaf/10 dark:border-forest-leaf/20 shadow-inner">
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-forest-leaf rounded-full shadow-sm"></span>
            <h3 className="text-[8px] font-black text-forest-leaf uppercase tracking-widest dark:text-forest-sage">Purchase Details</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-3">
             <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-[7px] font-black text-forest-leaf/40 uppercase">Purchase Tax %</label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[7px] font-black text-forest-leaf opacity-60">
                      Amt: ₹{Math.round((calculateTargetFromTP(tpPrice, brand, articleType, buffers) * (buffers.purchaseTaxPercent || 0)) / 100)}
                    </span>
                    <div className="flex gap-1">
                      {[5, 12].map(v => (
                        <button 
                          key={v}
                          onClick={() => setBuffers({...buffers, purchaseTaxPercent: v})}
                          className="text-[6px] font-black px-1.5 py-0.5 bg-forest-accent/20 rounded hover:bg-forest-leaf hover:text-white transition-colors"
                        >
                          {v}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="relative">
                  <input 
                    type="number" 
                    value={buffers.purchaseTaxPercent || ''} 
                    onChange={(e) => setBuffers({...buffers, purchaseTaxPercent: Number(e.target.value)})}
                    className="w-full px-2 py-1.5 bg-white border border-forest-accent rounded-lg font-black text-xs text-forest-pine outline-none focus:border-forest-leaf shadow-sm dark:bg-forest-pine/60 dark:text-forest-mint" 
                    placeholder="0"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-forest-pine/30 text-[9px] font-black dark:text-forest-mint/30">
                    %
                  </span>
                </div>
             </div>
          </div>
        </div>

        <div className="bg-forest-pine p-4 rounded-2xl flex flex-col gap-1 shadow-lg border border-white/20 dark:bg-forest-leaf/80 relative overflow-hidden">
          <label className="text-[7px] font-black text-forest-accent uppercase tracking-widest opacity-60">Global Settlement Goal</label>
          <div className="relative flex items-center">
            <span className="text-white/40 font-black text-lg mr-1">₹</span>
            <input
              type="number"
              value={targetSettlement}
              onChange={(e) => setTargetSettlement(Number(e.target.value))}
              className="bg-transparent border-none outline-none text-2xl font-black text-white tracking-tighter italic w-full"
              placeholder="0.00"
            />
            <div className="bg-white/10 px-2 py-1 rounded-lg border border-white/10">
              <span className="text-[7px] font-black text-white uppercase">Target</span>
            </div>
          </div>
        </div>

        <div className="space-y-1.5 pt-1.5 border-t border-forest-accent/20 dark:border-forest-leaf/20">
          <label className="text-[8px] font-black text-forest-leaf uppercase block tracking-widest dark:text-forest-sage">GTA Shipping Level</label>
          <div className="flex items-center gap-2 bg-slate-50 dark:bg-forest-pine/20 border border-slate-100 dark:border-forest-leaf/10 p-2 rounded-xl">
            <span className="px-2.5 py-1 bg-forest-leaf text-white font-black text-[10px] rounded-lg uppercase tracking-wider shadow-sm flex items-center justify-center shrink-0 min-w-[65px]">
              {level.replace('Level ', 'L')}
            </span>
            <span className="text-[9px] font-bold text-slate-500 dark:text-forest-sage leading-tight">
              Automatically determined based on {articleType}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CalculatorForm;
