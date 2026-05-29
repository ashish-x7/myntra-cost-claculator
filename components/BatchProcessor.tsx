
import React, { useState, useRef, useMemo, useEffect } from 'react';
// @ts-ignore
import * as XLSX from 'xlsx-js-style';
import { Level, Region, ArticleType, ReverseLogisticsMode, Gender, BusinessBuffers, Marketplace, Brand, ManualRateCard, MarginType, FeeRule } from '../types';
import { findAISPForTarget, calculateBreakdown, calculateTargetFromTP, calculateBaseCost, calculateReturnCost } from '../services/calculatorService';
import { ARTICLE_SPECIFICATIONS, GST_RATE, REVERSE_LOGISTICS_FEES, ARTICLE_LEVEL_MAPPING } from '../constants';

export const FIXED_HEADERS = [
  "A-No.", "B-Seller Name", "C-Item Name", "D-Category", "E-Brand", "F-Type", 
  "G-ASIN Number", "H-SKU Number", "I-HSN Number", "J-MRP Price", "K-Item Color", 
  "L-Weight", "M-Weight Unit", "N-Length", "O-Length Unit", "P-Width", "Q-Width Unit", 
  "R-Height", "S-Height Unit", "T-Channel Price", "U-Purchase Margin(%)", "V-Tax", 
  "W-Purchase Cost", "X-Purchase Tax", "Y-Final Purchase Cost", "Z-Type", "AA-Level", "AB-Company Profit Margin", "AC-Return %",
  "AD-Target Settlement", "AE-MRP", "AF-Seller Price", "AG-GTA Shipping", "AH-Cust. Price",
  "AI-Platform Comm.%", "AJ-Base Comm:", "AK-IGST (18%):", "AL-Total Comm:", "AM-Base Fixed:", "AN-IGST (18%):", "AO-Total Fixed:", "AP-TCS (0.47%):", "AQ-TDS (0.095%):", "AR-Taxes:", "AS-BANK SETTLEMENT",
  "AT-Style ID", "AU-SKU ID"
];
export const excelColToIdx = (col: string): number => {
  let idx = 0;
  for (let i = 0; i < col.length; i++) {
    idx = idx * 26 + (col.charCodeAt(i) - 64);
  }
  return idx - 1;
};

interface BatchProcessorProps {
  buffers: BusinessBuffers;
  setBuffers: (val: BusinessBuffers) => void;
  marketplaceData: Record<string, any[]>;
  setMarketplaceData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  manualRateCard: ManualRateCard;
  isReverse: boolean;
  reverseRegion: Region;
  reverseMode: ReverseLogisticsMode;
  reversePercent: number;
  parties: string[];
  showConfirm: (message: string, callback: () => void) => void;
  showAlert: (message: string) => void;
  gtaRanges: { min: number; max: number; label: string }[];
  gtaFees: Record<string, number[]>;
  commissionRules: FeeRule[];
  fixedFeeRules: FeeRule[];
  categoryMap?: Record<string, string>;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ 
  buffers, 
  setBuffers, 
  marketplaceData, 
  setMarketplaceData,
  manualRateCard,
  isReverse,
  reverseRegion,
  reverseMode,
  reversePercent,
  parties,
  showConfirm,
  showAlert,
  gtaRanges,
  gtaFees,
  commissionRules,
  fixedFeeRules,
  categoryMap
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [purchaseGst, setPurchaseGst] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFileName, setExportFileName] = useState('myntra_bulk_export');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [selectedParty, setSelectedParty] = useState('');
  const currentMarketplace = Marketplace.MYNTRA;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const round = (num: number) => typeof num === 'number' && !isNaN(num) ? Math.round((num + Number.EPSILON) * 100) / 100 : 0;

  const getRowCalculatedFields = (row: any) => {
    if (row._breakdown) return row;

    const lowerKeys = Object.keys(row).reduce((acc, k) => {
      acc[k.trim().toLowerCase()] = k;
      return acc;
    }, {} as Record<string, string>);

    const getTypeVal = () => {
      if (row._rawRowArray && row._rawRowArray.length > 25) {
        const zVal = row._rawRowArray[25];
        if (zVal !== undefined && zVal !== '') return zVal;
      }
      const priorities = ['z-type', 'type'];
      for (const p of priorities) {
        if (lowerKeys[p] && row[lowerKeys[p]] !== undefined && row[lowerKeys[p]] !== '') return row[lowerKeys[p]];
      }
      return '';
    };

    const typeVal = getTypeVal();
    const derivedLevel = categoryMap?.[String(typeVal)] || (ARTICLE_LEVEL_MAPPING as any)[String(typeVal)];
    const level = derivedLevel as Level || Level.LEVEL_1;

    const yKey = lowerKeys['y-final purchase cost'] || lowerKeys['final purchase cost'];
    const yVal = yKey ? row[yKey] : 0;
    const tpCost = parseFloat(String(yVal)) || 0;

    const profit = buffers.marginType === MarginType.PERCENT ? (tpCost * (buffers.marginAdjustment || 0)) / 100 : (buffers.marginAdjustment || 0);
    const tpWithMargin = tpCost + profit;

    const returnCost = buffers.returnType === MarginType.VALUE ? (buffers.returnPercent || 0) : calculateReturnCost(
      tpWithMargin, 
      level, 
      reverseRegion, 
      reverseMode, 
      buffers.returnPercent || 0
    );

    const targetAISP = tpWithMargin + returnCost;

    const aisp = findAISPForTarget(
      targetAISP,
      level,
      String(typeVal) as ArticleType,
      isReverse,
      reverseRegion,
      reverseMode,
      reversePercent,
      Marketplace.MYNTRA,
      selectedParty || parties[0] || 'Bellstone',
      manualRateCard,
      buffers,
      tpCost,
      gtaRanges,
      gtaFees,
      commissionRules,
      fixedFeeRules
    );

    const breakdown = calculateBreakdown(
      aisp,
      level,
      String(typeVal) as ArticleType,
      isReverse,
      reverseRegion,
      reverseMode,
      reversePercent,
      Marketplace.MYNTRA,
      selectedParty || parties[0] || 'Bellstone',
      manualRateCard,
      buffers,
      tpCost,
      targetAISP,
      gtaRanges,
      gtaFees,
      commissionRules,
      fixedFeeRules
    );

    return {
      ...row,
      _typeVal: typeVal,
      _derivedLevel: level,
      _targetAISP: targetAISP,
      _breakdown: breakdown,
      _tpCost: tpCost
    };
  };

  const getValueForHeader = (h: string, row: any) => {
    const prefixMatch = h.match(/^([A-Z]+)-/);
    const colLetter = prefixMatch ? prefixMatch[1] : '';
    const keyWithoutPrefix = prefixMatch ? h.substring(prefixMatch[0].length) : h;

    let val: any = undefined;

    // 1. If we have the raw row array, get the value by column letter index (except for calculated fields)
    const isCalculatedField = /^(A[D-S])-/.test(h) || h === 'AA-Level' || h === 'AB-Company Profit Margin' || h === 'AC-Return %' || h === 'Z-Type' || (h === 'X-Purchase Tax' && purchaseGst) || (h === 'W-Purchase Cost' && purchaseGst);
    
    if (row._rawRowArray && colLetter && !isCalculatedField) {
      const colIdx = excelColToIdx(colLetter);
      if (colIdx >= 0 && colIdx < row._rawRowArray.length) {
        val = row._rawRowArray[colIdx];
      }
    }

    if (val === undefined || val === '') {
      const lowerKeys = Object.keys(row).reduce((acc, k) => {
        acc[k.trim().toLowerCase()] = k;
        return acc;
      }, {} as Record<string, string>);

      if (h === 'AB-Company Profit Margin') {
        const tpCost = row._tpCost !== undefined ? row._tpCost : 0;
        if (tpCost > 0) {
          const profit = buffers.marginType === MarginType.PERCENT ? (tpCost * (buffers.marginAdjustment || 0)) / 100 : (buffers.marginAdjustment || 0);
          return round(profit);
        }
        return '';
      }

      if (h === 'X-Purchase Tax' && purchaseGst) {
        const tpCost = row._tpCost !== undefined ? row._tpCost : 0;
        const taxPercent = (buffers.purchaseTaxPercent !== undefined && buffers.purchaseTaxPercent !== null) ? buffers.purchaseTaxPercent : 5;
        return round((tpCost * taxPercent) / 100);
      }

      if (h === 'W-Purchase Cost' && purchaseGst) {
        const tpCost = row._tpCost !== undefined ? row._tpCost : 0;
        const taxPercent = (buffers.purchaseTaxPercent !== undefined && buffers.purchaseTaxPercent !== null) ? buffers.purchaseTaxPercent : 5;
        const tax = round((tpCost * taxPercent) / 100);
        return round(tpCost - tax);
      }

      if (h === 'AC-Return %') {
        const tpCost = row._tpCost !== undefined ? row._tpCost : 0;
        if (tpCost > 0) {
          const rType = buffers.returnType || MarginType.PERCENT;
          const ret = rType === MarginType.PERCENT ? (tpCost * (buffers.returnPercent || 0)) / 100 : (buffers.returnPercent || 0);
          return round(ret);
        }
        return '';
      }

      if (/^(A[D-S])-/.test(h)) {
        const breakdown = row._breakdown;
        if (!breakdown) return '';
        
        if (h === 'AD-Target Settlement') return round(row._targetAISP);
        
        if (h === 'AE-MRP') {
          const mrpKey = lowerKeys['j-mrp price'] || lowerKeys['mrp price'] || lowerKeys['mrp'];
          const mrpRaw = mrpKey ? row[mrpKey] : 0;
          return parseFloat(String(mrpRaw)) || 0;
        }

        if (h === 'AF-Seller Price') return round(breakdown.aisp - breakdown.logisticsFee);
        if (h === 'AG-GTA Shipping') return round(breakdown.logisticsFee);
        if (h === 'AH-Cust. Price') return round(breakdown.customerPrice);
        if (h === 'AI-Platform Comm.%') return breakdown.commissionRate + '%';
        if (h === 'AJ-Base Comm:') return round(breakdown.baseCommission);
        if (h === 'AK-IGST (18%):') return round(breakdown.commission - breakdown.baseCommission);
        if (h === 'AL-Total Comm:') return round(breakdown.commission);
        if (h === 'AM-Base Fixed:') return round(breakdown.baseFixedFee);
        if (h === 'AN-IGST (18%):') return round(breakdown.fixedFee - breakdown.baseFixedFee);
        if (h === 'AO-Total Fixed:') return round(breakdown.fixedFee);
        if (h === 'AP-TCS (0.47%):') return round(breakdown.tcs);
        if (h === 'AQ-TDS (0.095%):') return round(breakdown.tds);
        if (h === 'AR-Taxes:') return round(breakdown.tcs + breakdown.tds);
        if (h === 'AS-BANK SETTLEMENT') return round(breakdown.totalActualSettlement);
      }

      if (h === 'Z-Type') {
        return row._typeVal !== undefined ? row._typeVal : '';
      }

      if (h === 'AA-Level') {
        return row._derivedLevel !== undefined ? row._derivedLevel : '';
      }

      // Check direct headers first
      val = row[h];
      if (val === undefined || val === '') {
        if (lowerKeys[h.trim().toLowerCase()]) {
          val = row[lowerKeys[h.trim().toLowerCase()]];
        } else if (!/^(A[A-U])-/.test(h)) {
          if (lowerKeys[keyWithoutPrefix.trim().toLowerCase()]) {
            val = row[lowerKeys[keyWithoutPrefix.trim().toLowerCase()]];
          } else {
            val = '';
          }
        } else {
          val = '';
        }
      }
    }

    return val;
  };

  const bufferLabelMap: Record<string, string> = {
    adsPercent: 'ADS %',
    dealDiscountPercent: 'DEAL DISCOUNT %',
    reviewPercent: 'REVIEW %',
    profitMarginPercent: 'PROFIT %',
    returnPercent: 'RETURNS %'
  };

  const downloadTemplate = () => {
    const templateHeaders = [
      "No.", "Seller Name", "Item Name", "Category", "Brand", "Type", 
      "ASIN Number", "SKU Number", "HSN Number", "MRP Price", "Item Color", 
      "Weight", "Weight Unit", "Length", "Length Unit", "Width", "Width Unit", 
      "Height", "Height Unit", "Channel Price", "Purchase Margin(%)", "Tax", 
      "Purchase Cost", "Purchase Tax", "Final Purchase Cost", "Type", "Level"
    ];
    
    const ws = XLSX.utils.aoa_to_sheet([templateHeaders]);
    
    // Set auto-fit column spacing for template
    const colWidths = templateHeaders.map(h => ({ wch: Math.max(12, h.length + 3) }));
    ws['!cols'] = colWidths;
    ws['!rows'] = [{ hpt: 18 }];

    // Apply Styles: full borders, Calibri bold font, centered, single line
    const range = XLSX.utils.decode_range(ws['!ref'] || 'A1:A1');
    for (let r = range.s.r; r <= range.e.r; ++r) {
      for (let c = range.s.c; c <= range.e.c; ++c) {
        const cellAddress = XLSX.utils.encode_cell({ r, c });
        if (!ws[cellAddress]) {
          ws[cellAddress] = { t: 'z', v: '' };
        }
        const cell = ws[cellAddress];
        if (!cell.s) cell.s = {};
        
        cell.s.border = {
          top: { style: 'thin', color: { rgb: '000000' } },
          bottom: { style: 'thin', color: { rgb: '000000' } },
          left: { style: 'thin', color: { rgb: '000000' } },
          right: { style: 'thin', color: { rgb: '000000' } }
        };
        
        cell.s.font = { bold: true, name: 'Calibri', size: 10 };
        cell.s.alignment = { horizontal: 'center', vertical: 'center', wrapText: false };
      }
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Myntra_Bulk_Template.xlsx`);
  };

  const handleFileChoose = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const triggerUpload = () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        // Parse raw rows as 2D array to preserve exact column positions
        const sheetArray = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' }) as any[][];
        
        // Find header row: scan first 5 rows for typical keywords
        let headerRowIdx = 1;
        for (let i = 0; i < Math.min(sheetArray.length, 5); i++) {
          const rowCells = sheetArray[i] || [];
          const isHeader = rowCells.some(cell => {
            const s = String(cell).toLowerCase();
            return s.includes('purchase cost') || s.includes('final purchase') || s.includes('seller price') || s.includes('target settlement');
          });
          if (isHeader) {
            headerRowIdx = i;
            break;
          }
        }
        
        const json = XLSX.utils.sheet_to_json(ws, { range: headerRowIdx, defval: '' }) as any[];
        const rows = json.map((rowObj, index) => {
          const rawRowIdx = headerRowIdx + 1 + index;
          const rawRowArray = sheetArray[rawRowIdx] || [];
          return {
            ...rowObj,
            _rawRowArray: rawRowArray
          };
        }).filter(row => {
          return Object.keys(row).some(k => k !== '_rawRowArray' && row[k] !== '');
        });

        setMarketplaceData(prev => ({ ...prev, [currentMarketplace]: rows }));
        setCurrentPage(1);
      } catch (err) {
        console.error(err);
        showAlert("Excel error. Check file format.");
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsBinaryString(selectedFile);
  };

  // No custom results calculation yet; we just store the raw data

  const triggerExportModal = () => {
    if (!hasCurrentData) return;
    setExportFileName('myntra_bulk_export');
    setShowExportModal(true);
  };

  const executeExport = async () => {
    setIsExporting(true);
    try {
      const activeData = marketplaceData[currentMarketplace] || [];
      if (activeData.length === 0) {
        setIsExporting(false);
        return;
      }

      const cleanHeadersList = FIXED_HEADERS.map(h => {
        const prefixMatch = h.match(/^[A-Z]+-/);
        return prefixMatch ? h.substring(prefixMatch[0].length) : h;
      });
      
      const rows = activeData.map((row: any) => {
        const calculatedRow = getRowCalculatedFields(row);
        return FIXED_HEADERS.map((h) => {
          const val = getValueForHeader(h, calculatedRow);
          return (typeof val === 'string' && val.trim() === '') || val === undefined || val === null
            ? '' 
            : !isNaN(Number(val)) && val !== ''
            ? Number(val) 
            : val;
        });
      });

      const response = await fetch('/api/export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filename: exportFileName,
          headers: cleanHeadersList,
          rows: rows,
        }),
      });

      if (!response.ok) {
        throw new Error('Export request failed');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${exportFileName || 'export'}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setShowExportModal(false);
    } catch (err) {
      console.error(err);
      showAlert("Failed to export Excel file.");
    } finally {
      setIsExporting(false);
    }
  };

  const [localMargin, setLocalMargin] = useState(buffers.marginAdjustment?.toString() || '0');
  useEffect(() => {
    if (parseFloat(localMargin) !== buffers.marginAdjustment) {
      setLocalMargin(buffers.marginAdjustment?.toString() || '0');
    }
  }, [buffers.marginAdjustment]);

  const hasAnyData = Object.values(marketplaceData).some((arr) => (arr as any[]).length > 0);
  const hasCurrentData = ((marketplaceData[currentMarketplace] || []) as any[]).length > 0;

  const clearAllData = () => {
    showConfirm("Are you sure you want to clear all imported data?", () => {
      setMarketplaceData({
        [Marketplace.MYNTRA]: []
      });
      setCurrentPage(1);
    });
  };

  const activeData = marketplaceData[currentMarketplace] || [];
  const totalPages = Math.max(1, Math.ceil(activeData.length / itemsPerPage));
  const currentDataSlice = activeData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const calculatedDataSlice = useMemo(() => {
    return currentDataSlice.map(row => getRowCalculatedFields(row));
  }, [currentDataSlice, buffers, selectedParty, reverseRegion, reverseMode, reversePercent, isReverse, manualRateCard, gtaRanges, gtaFees, commissionRules, fixedFeeRules, categoryMap, parties]);

  return (
    <div className="w-full flex flex-col items-stretch gap-6">
      {/* custom upload action bar */}
      <div className="w-full bg-[#f8fafc] px-5 py-3 rounded-xl border border-slate-200 flex flex-wrap items-center gap-4 shadow-sm">
        
        {/* Choose File box */}
        <div 
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-lg cursor-pointer min-w-[200px] hover:border-slate-300 transition-all group"
        >
          <span className="text-lg">📁</span>
          <span className="text-xs font-normal text-slate-600 truncate">
            {selectedFile ? selectedFile.name : "Choose File"}
          </span>
        </div>
        <input 
          type="file" 
          ref={fileInputRef}
          className="hidden" 
          accept=".xlsx, .xls, .csv"
          onChange={handleFileChoose}
        />

        {/* Party Select */}
        <div className="flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] font-normal text-slate-500 uppercase tracking-wider">Party</span>
          <select 
            value={selectedParty}
            onChange={(e) => setSelectedParty(e.target.value)}
            className="text-[11px] font-medium text-slate-700 outline-none bg-transparent"
          >
            <option value="">-- Select Party --</option>
            {parties.map(p => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Purchase GST switch */}
        <div className="flex items-center gap-3 px-4 py-2 bg-white border border-slate-200 rounded-lg shadow-sm">
          <span className="text-[11px] font-normal text-slate-500 uppercase tracking-wider">Purchase GST</span>
          <button 
            type="button"
            onClick={() => setPurchaseGst(!purchaseGst)}
            className={`w-9 h-5 flex items-center rounded-full p-0.5 transition-colors focus:outline-none ${purchaseGst ? 'bg-slate-700' : 'bg-slate-200'}`}
          >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${purchaseGst ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* Upload button */}
        <button
          onClick={triggerUpload}
          disabled={!selectedFile || isProcessing}
          className={`px-6 py-2 rounded-lg font-normal text-[11px] uppercase tracking-wider text-white transition-all shadow-sm active:scale-95 ${(!selectedFile || isProcessing) ? 'bg-slate-300 opacity-50 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-800'}`}
        >
          {isProcessing ? "Processing..." : "Upload"}
        </button>

        {/* Download Sample Excel link */}
        <button 
          onClick={downloadTemplate}
          className="text-[11px] font-normal text-slate-600 hover:text-slate-800 transition-colors uppercase tracking-wider underline"
        >
          Download Sample Excel
        </button>

        {/* Right side controls */}
        <div className="ml-auto flex items-center gap-2">
          <button 
            onClick={triggerExportModal}
            disabled={!hasCurrentData}
            className={`px-6 py-2 text-white rounded-lg font-normal text-[11px] uppercase tracking-wider transition-all shadow-sm ${!hasCurrentData ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-slate-700 hover:bg-slate-800'}`}
          >
            Export
          </button>
          <button 
            onClick={clearAllData}
            disabled={!hasCurrentData}
            className={`px-6 py-2 text-white rounded-lg font-normal text-[11px] uppercase tracking-wider transition-all shadow-sm ${!hasCurrentData ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-rose-500 hover:bg-rose-600'}`}
          >
            Clear Data
          </button>
        </div>
      </div>

      {/* RESULTS TABLE */}
      <div className="w-full px-2 space-y-4">
        <div className="bg-white rounded-lg border border-slate-200 shadow-md overflow-hidden">
          <div className="overflow-x-auto min-w-full max-h-[60vh]">
            <table className="w-full text-[10px] text-left border-collapse min-w-[1200px] relative">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10 shadow-sm">
                <tr className="divide-x divide-slate-200 text-[10px] font-normal uppercase text-slate-600 bg-slate-50">
                  {FIXED_HEADERS.map((h, i) => (
                    <th key={i} className="px-4 py-3 whitespace-nowrap bg-slate-50">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {calculatedDataSlice.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-all divide-x divide-slate-100">
                    {FIXED_HEADERS.map((h, i) => {
                      const val = getValueForHeader(h, row);
                      return (
                        <td key={i} className="px-4 py-2.5 font-normal text-slate-700 whitespace-nowrap">
                          {val !== undefined && val !== null ? String(val) : ''}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {!hasCurrentData && (
                  <tr>
                    <td colSpan={FIXED_HEADERS.length} className="px-4 py-12 text-center text-slate-400 font-medium text-[12px]">
                      No data uploaded yet. Please upload an Excel file.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {hasCurrentData && (
            <div className="p-3 bg-slate-50 flex items-center justify-between sticky bottom-0 border-t border-slate-200 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] px-6">
              <div className="flex items-center gap-2 text-[13px] text-slate-600 font-medium">
                <span>Show</span>
                <select 
                  value={itemsPerPage} 
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="border border-slate-300 rounded px-2 py-1 outline-none focus:border-slate-400 bg-white"
                >
                  <option value={20}>20</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                  <option value={500}>500</option>
                </select>
                <span>entries</span>
              </div>
              
              {totalPages > 1 && (
                <div className="flex items-center gap-4">
                  <button 
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-5 py-1.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Prev
                  </button>
                  <span className="text-[13px] font-semibold text-indigo-800 tracking-wide bg-indigo-50 px-4 py-1 rounded-full border border-indigo-100">
                    Page {currentPage} of {totalPages}
                  </span>
                  <button 
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-5 py-1.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-full hover:bg-slate-50 hover:border-slate-300 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">Export Excel</h3>
              <button 
                onClick={() => !isExporting && setShowExportModal(false)} 
                disabled={isExporting}
                className="text-slate-400 hover:text-slate-600 transition-colors disabled:opacity-30"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Enter the name for the exported file. File will be downloaded in <span className="font-semibold text-slate-700">.xlsx</span> format.
              </p>
              
              <div className="relative">
                <input
                  type="text"
                  value={exportFileName}
                  onChange={(e) => setExportFileName(e.target.value)}
                  disabled={isExporting}
                  className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 outline-none focus:bg-white focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 transition-all disabled:opacity-50"
                  placeholder="Enter file name..."
                  autoFocus
                />
              </div>
            </div>
 
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                onClick={() => !isExporting && setShowExportModal(false)}
                disabled={isExporting}
                className="px-5 py-2 text-xs font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button 
                onClick={executeExport}
                disabled={isExporting}
                className={`px-5 py-2 text-xs font-medium text-white rounded-lg transition-colors shadow-sm ${isExporting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
              >
                {isExporting ? 'Exporting...' : 'Download File'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;
