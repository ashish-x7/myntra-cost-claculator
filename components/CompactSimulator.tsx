import React from 'react';
import * as XLSX from 'xlsx';
import { Brand, ArticleType, BusinessBuffers, Level, PricingResult, MarginType, ReverseLogisticsMode, Region, FeeRule } from '../types';
import SearchableSelect from './SearchableSelect';
import { calculateReturnCost } from '../services/calculatorService';

interface CompactSimulatorProps {
  brand: string;
  setBrand: (val: string) => void;
  parties: string[];
  categoryMap: Record<string, string>;
  commissionRules: FeeRule[];
  fixedFeeRules: FeeRule[];
  articleType: ArticleType;
  setArticleType: (val: ArticleType) => void;
  level: Level;
  setLevel: (val: Level) => void;
  tpPrice: number;
  setTpPrice: (val: number) => void;
  targetSettlement: number;
  setTargetSettlement: (val: number) => void;
  buffers: BusinessBuffers;
  setBuffers: (val: BusinessBuffers) => void;
  reverseMode: ReverseLogisticsMode;
  setReverseMode: (val: ReverseLogisticsMode) => void;
  reverseRegion?: Region;
  result: PricingResult;
}

const InputField = ({ label, value, onChange, prefix = "", className = "", suffix = "" }: any) => {
  const [localValue, setLocalValue] = React.useState(value?.toString() || '');

  React.useEffect(() => {
    const numValue = Number(value);
    const numLocal = parseFloat(localValue);
    if (isNaN(numLocal) || Math.abs(numLocal - numValue) > 0.001) {
      setLocalValue(value === 0 ? '0' : (value?.toString() || ''));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9.]/g, ''); 
    setLocalValue(val);
    const num = parseFloat(val);
    if (!isNaN(num)) {
      onChange(num);
    } else if (val === '') {
      onChange(0);
    }
  };

  return (
    <div className={`flex flex-col gap-1 ${className || 'w-[70px]'}`}>
      <label className="text-[10px] font-normal text-slate-500 uppercase tracking-widest whitespace-nowrap px-1">
        {label}
      </label>
      <div className="relative group/field flex items-center gap-1">
        <div className="flex-1 flex items-center bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 shadow-inner focus-within:bg-white focus-within:border-slate-400 transition-all">
          {prefix && <span className="text-slate-400 font-normal mr-0.5 text-[9px]">{prefix}</span>}
          <input 
            type="text"
            inputMode="decimal"
            value={localValue}
            onChange={handleChange}
            className="w-full bg-transparent outline-none font-normal text-[10px] text-slate-700"
          />
        </div>
        {suffix && <span className="text-[9px] font-normal text-slate-400 whitespace-nowrap">{suffix}</span>}
      </div>
    </div>
  );
};

const CompactSimulator: React.FC<CompactSimulatorProps> = ({
  brand, setBrand,
  parties,
  categoryMap,
  commissionRules,
  fixedFeeRules,
  articleType, setArticleType,
  level, setLevel,
  tpPrice, setTpPrice,
  targetSettlement, setTargetSettlement,
  buffers, setBuffers,
  reverseMode, setReverseMode,
  reverseRegion = Region.LOCAL,
  result
}) => {

  const marginValue = buffers.marginType === MarginType.PERCENT 
    ? (tpPrice * buffers.marginAdjustment) / 100 
    : buffers.marginAdjustment;

  const returnCostValue = calculateReturnCost(
    tpPrice,
    level,
    reverseRegion,
    reverseMode,
    buffers.returnPercent
  );

  return (
    <div className="w-full bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
      {/* INPUT PANEL */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div className="flex flex-wrap items-center gap-4">
          {/* BRAND & TYPE GROUP */}
          <div className="flex flex-row gap-2 border-r border-slate-200 pr-4 shrink-0">
            <div className="flex flex-col gap-1 w-[90px]">
              <label className="text-[10px] font-normal text-slate-500 uppercase tracking-widest px-1">Brand</label>
              <select 
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="bg-slate-50 border border-slate-200 rounded-md px-1.5 py-1 text-[10px] font-normal text-slate-700 outline-none focus:ring-1 focus:ring-slate-300 shadow-sm"
              >
                {parties.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1 w-[90px]">
              <label className="text-[10px] font-normal text-slate-500 uppercase tracking-widest px-1">Type</label>
              <SearchableSelect
                value={articleType}
                onChange={(val) => setArticleType(val as ArticleType)}
                options={Object.keys(categoryMap).map(t => ({ value: t, label: t }))}
                placeholder="Type"
                compact={true}
              />
            </div>
            <div className="flex flex-col gap-1 w-[90px]">
              <label className="text-[10px] font-normal text-slate-500 uppercase tracking-widest px-1">Level</label>
              <div className="bg-slate-500 text-white border border-slate-500 text-[10px] font-normal px-1.5 py-1 rounded-md text-center shrink-0 uppercase tracking-widest leading-normal">
                {level.replace('Level ', 'L')}
              </div>
            </div>
          </div>

          {/* PARAMETERS GROUP */}
          <div className="flex items-center gap-2 pr-4 border-r border-slate-200">
            <InputField label="TP COST" value={tpPrice} onChange={setTpPrice} prefix="₹" />
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-normal text-slate-500 uppercase tracking-widest px-1">Margin Type</label>
              <div className="flex bg-slate-50 p-0.5 rounded-md border border-slate-200">
                {(['PERCENT', 'VALUE'] as MarginType[]).map(type => (
                  <button 
                    key={type}
                    onClick={() => setBuffers({...buffers, marginType: type})}
                    className={`px-2 py-0.5 text-[10px] font-normal uppercase rounded-sm transition-all ${buffers.marginType === type ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {type === 'PERCENT' ? '%' : '₹'}
                  </button>
                ))}
              </div>
            </div>
            <InputField 
              label={buffers.marginType === MarginType.PERCENT ? "MARGIN %" : "MARGIN ₹"} 
              value={buffers.marginAdjustment} 
              onChange={(v: any) => setBuffers({...buffers, marginAdjustment: v})} 
              suffix={buffers.marginType === MarginType.PERCENT ? `(₹${marginValue.toFixed(2)})` : ""}
              className="w-[100px]"
            />
          </div>

          {/* RETURN GROUP */}
          <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
            <div className="flex flex-col gap-1 text-[9px]">
              <label className="text-[10px] font-normal text-slate-500 uppercase tracking-widest px-1">Return Type</label>
              <div className="flex bg-slate-50 p-0.5 rounded-md border border-slate-200">
                {['PERCENT', 'VALUE'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setBuffers({...buffers, returnType: type as MarginType})}
                    className={`px-2 py-0.5 text-[10px] font-normal uppercase rounded-sm transition-all ${((buffers.returnType || MarginType.PERCENT) === type) ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {type === 'PERCENT' ? '%' : '₹'}
                  </button>
                ))}
              </div>
            </div>
            <InputField 
              label={(buffers.returnType || MarginType.PERCENT) === MarginType.PERCENT ? "RETURN %" : "RETURN ₹"} 
              value={buffers.returnPercent} 
              onChange={(v: any) => setBuffers({...buffers, returnPercent: v})} 
              suffix={(buffers.returnType || MarginType.PERCENT) === MarginType.PERCENT ? `(₹${returnCostValue.toFixed(2)})` : ""}
              className="w-[115px]"
            />
          </div>

          {/* PURCHASE GST GROUP */}
          <div className="flex items-center gap-3 pr-4 border-r border-slate-200">
            <InputField 
              label="PURCHASE GST %" 
              value={buffers.purchaseTaxPercent !== undefined ? buffers.purchaseTaxPercent : 5} 
              onChange={(v: number) => setBuffers({...buffers, purchaseTaxPercent: v})} 
              suffix="%"
              className="w-[100px]"
            />
          </div>

          {/* GOAL GROUP */}
          <div className="bg-slate-50 p-2 rounded-md">
            <InputField 
              label="TARGET SETTLEMENT" 
              value={targetSettlement} 
              onChange={setTargetSettlement} 
              prefix="₹" 
              className="w-[105px]" 
              suffix=""
            />
          </div>

          {/* MRP DISPLAY */}
          <div className="bg-emerald-50/60 border border-emerald-100 p-2 rounded-md flex flex-col justify-center min-w-[90px] shadow-sm">
            <label className="text-[10px] font-medium text-emerald-700 uppercase tracking-widest px-1">MRP</label>
            <div className="font-semibold text-emerald-800 px-1 pt-1 text-sm">₹{Math.round(result.aisp)}</div>
          </div>
        </div>

      </div>

      {/* RESULTS GRID OF CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-4">
        
        {/* Card 0: Purchase Details */}
        {(() => {
          const gstRate = buffers.purchaseTaxPercent !== undefined ? buffers.purchaseTaxPercent : 5;
          const gstAmount = Math.round(((tpPrice * gstRate) / 100 + Number.EPSILON) * 100) / 100;
          return (
            <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between h-full">
              <div className="flex justify-between items-start mb-1">
                <span className="text-[9px] font-normal uppercase text-indigo-600">Purchase Details</span>
                <span className="text-[8px] font-normal bg-indigo-50 px-1 py-0.5 rounded text-indigo-600">{gstRate}%</span>
              </div>
              <div className="space-y-1 my-2">
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">Purchase w/o Tax:</span>
                  <span className="font-normal text-slate-700">₹{(tpPrice - gstAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span className="text-slate-500">GST Amount:</span>
                  <span className="font-normal text-slate-700">₹{gstAmount.toFixed(2)}</span>
                </div>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline mt-auto">
                <span className="text-[9px] font-normal text-slate-400">Purchase with Tax:</span>
                <span className="text-xs font-normal text-indigo-600">₹{tpPrice.toFixed(2)}</span>
              </div>
            </div>
          );
        })()}

        {/* Card 1: Revenue Structure */}
        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-normal uppercase text-emerald-600">Price Structure</span>
            <span className="text-[8px] font-normal text-slate-400">Invoice</span>
          </div>
          <div className="space-y-1 my-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Seller Price:</span>
              <span className="font-normal text-slate-700">₹{Math.round(result.aisp - result.logisticsFee)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">GTA Shipping:</span>
              <span className="font-normal text-slate-700">₹{Math.round(result.logisticsFee)}</span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline mt-auto">
            <span className="text-[9px] font-normal uppercase tracking-tight text-slate-700">Cust. Price:</span>
            <span className="text-xs font-normal text-emerald-600">₹{Math.round(result.aisp + result.logisticsFee)}</span>
          </div>
        </div>

        {/* Card 2: Platform Commission */}
        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-normal uppercase text-rose-600">Platform Comm.</span>
            <span className="text-[8px] font-normal bg-rose-50 px-1 py-0.5 rounded text-rose-600">{result.commissionRate}%</span>
          </div>
          <div className="space-y-1 my-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Base Comm:</span>
              <span className="font-normal text-slate-700">₹{result.baseCommission.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">IGST (18%):</span>
              <span className="font-normal text-rose-500">₹{(result.commission - result.baseCommission).toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline mt-auto">
            <span className="text-[9px] font-normal text-slate-400">Total Comm:</span>
            <span className="text-xs font-normal text-rose-600">₹{result.commission.toFixed(2)}</span>
          </div>
        </div>

        {/* Card 3: Fixed Fee */}
        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-normal uppercase text-rose-600">Fixed Fee</span>
            <span className="text-[8px] font-normal text-slate-400">Slab</span>
          </div>
          <div className="space-y-1 my-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">Base Fixed:</span>
              <span className="font-normal text-slate-700">₹{result.baseFixedFee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">IGST (18%):</span>
              <span className="font-normal text-rose-500">₹{(result.fixedFee - result.baseFixedFee).toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline mt-auto">
            <span className="text-[9px] font-normal text-slate-400">Total Fixed:</span>
            <span className="text-xs font-normal text-rose-600">₹{result.fixedFee.toFixed(2)}</span>
          </div>
        </div>


        <div className="bg-slate-50/50 p-3 rounded-lg border border-slate-200 flex flex-col justify-between h-full">
          <div className="flex justify-between items-start mb-1">
            <span className="text-[9px] font-normal uppercase text-amber-600">TCS & TDS</span>
            <span className="text-[8px] font-normal text-slate-400">Withhold</span>
          </div>
          <div className="space-y-1 my-2">
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">TCS (0.47%):</span>
              <span className="font-normal text-slate-700">₹{result.tcs.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-[10px]">
              <span className="text-slate-500">TDS (0.095%):</span>
              <span className="font-normal text-slate-700">₹{result.tds.toFixed(2)}</span>
            </div>
          </div>
          <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline mt-auto">
            <span className="text-[9px] font-normal text-slate-400">Taxes:</span>
            <span className="text-xs font-normal text-amber-600">₹{(result.tcs + result.tds).toFixed(2)}</span>
          </div>
        </div>

        {/* Card 5: Settlement & Profit Margin */}
        <div className={`p-3 rounded-lg border flex flex-col justify-between h-full transition-all duration-300 relative overflow-hidden shadow-sm ${result.totalActualSettlement - tpPrice >= 0 ? 'bg-emerald-50/40 border-emerald-200' : 'bg-rose-50/40 border-rose-200'}`}>
          <div className="flex justify-between items-center mb-1 pb-1 border-b border-dashed border-slate-200">
            <span className={`text-[10px] font-normal uppercase tracking-wider ${result.totalActualSettlement - tpPrice >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>BANK SETTLEMENT</span>
            <span className={`text-[8px] font-normal px-1.5 py-0.5 rounded uppercase tracking-tighter ${result.totalActualSettlement - tpPrice >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
              {result.totalActualSettlement - tpPrice >= 0 ? 'Profit' : 'Loss'}
            </span>
          </div>

          <div className="my-2 text-center py-1">
            <div className={`text-2xl font-normal tracking-tight leading-none ${result.totalActualSettlement - tpPrice >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
              ₹{result.totalActualSettlement.toFixed(2)}
            </div>
            <span className="text-[8px] font-normal text-slate-500 uppercase tracking-widest mt-0.5 block">Estimated Payout</span>
          </div>

          <div className="border-t pt-1.5 flex justify-between items-center border-dashed border-slate-200 text-[10px]">
            <div className="flex flex-col text-left">
              <span className="text-[8px] text-slate-400 font-normal uppercase">Sourcing TP</span>
              <span className="font-normal text-slate-700">₹{Math.round(tpPrice)}</span>
            </div>
            <div className="flex flex-col text-right">
              <span className="text-[8px] text-slate-400 font-normal uppercase">{result.totalActualSettlement - tpPrice >= 0 ? 'Margin' : 'Shortfall'}</span>
              <span className={`font-normal ${result.totalActualSettlement - tpPrice >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                ₹{Math.round(result.totalActualSettlement - tpPrice)}
              </span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CompactSimulator;
