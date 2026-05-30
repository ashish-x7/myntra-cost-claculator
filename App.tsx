
import React, { useState, useMemo, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Level, Region, ArticleType, ReverseLogisticsMode, BusinessBuffers, Marketplace, Brand, ManualRateCard, MarginType, Gender, FeeRule } from './types';
import { findAISPForTarget, calculateBreakdown, calculateTargetFromTP, calculateBaseCost, setMasterDataForCalculator } from './services/calculatorService';
import { parseMyntraAnnexureText, parseMyntraAnnexureWithGemini } from './services/pdfParserService';
import { fetchMasterData, saveCommissionRules, saveFixedFeeRules, saveGlobalLogistics, saveGlobalCategoryMapping, saveGlobalReverseLogistics, saveParties, AppMasterData } from './services/sheetsService';
import { BRAND_FIXED_FEE_SLABS, REVERSE_LOGISTICS_FEES, ARTICLE_LEVEL_MAPPING, ARTICLE_SPECIFICATIONS } from './constants';
import CompactSimulator from './components/CompactSimulator';
import ResultCard from './components/ResultCard';
import BatchProcessor from './components/BatchProcessor';
import logoImg from './logo.png';
import sheetLogo from './sheet-logo.png';
import ajioLogo from './ajio-logo.png';
import Chatbot from './components/Chatbot';

const DEFAULT_BUFFERS: BusinessBuffers = {
  marginPercent: 0,
  marginType: 'PERCENT' as any,
  marginAdjustment: 0,
  returnPercent: 0,
  returnType: 'PERCENT' as any,
  purchaseTaxPercent: 5
};

const DEFAULT_MANUAL_RATE_CARD: ManualRateCard = {
  enabled: false,
  rules: []
};

const THEMES = [
  { id: 'forest', name: 'Forest', class: '', color: '#2D5A3A' },
  { id: 'midnight', name: 'Midnight', class: 'theme-midnight', color: '#102A43' },
  { id: 'cyberpunk', name: 'Cyberpunk', class: 'theme-cyberpunk', color: '#FF0055' },
  { id: 'royal', name: 'Royal', class: 'theme-royal', color: '#5A189A' },
  { id: 'ocean', name: 'Ocean', class: 'theme-ocean', color: '#0077B6' },
  { id: 'sakura', name: 'Sakura', class: 'theme-sakura', color: '#D81B60' },
  { id: 'desert', name: 'Desert', class: 'theme-desert', color: '#99582A' },
  { id: 'nordic', name: 'Nordic', class: 'theme-nordic', color: '#495057' },
  { id: 'volcano', name: 'Volcano', class: 'theme-volcano', color: '#FF4D00' },
  { id: 'coffee', name: 'Coffee', class: 'theme-coffee', color: '#3E2723' },
  { id: 'glass', name: 'Glass', class: 'theme-glass', color: '#0EA5E9' },
  { id: 'glass-blur', name: 'Glass Blur', class: 'theme-glass-blur', color: '#818CF8' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'batch'>('single');
  const [loadingMaster, setLoadingMaster] = useState(true);
  const [masterData, setMasterData] = useState<AppMasterData | null>(null);

  const [parties, setParties] = useState<string[]>(['Bellstone', 'INDOPRIMO', 'Deelmo', 'CB-COLEBROOK', 'Other']);
  const [brand, setBrand] = useState<string>('Bellstone');

  const fetchAndLoadMasterData = async () => {
    setLoadingMaster(true);
    try {
      const data = await fetchMasterData();
      setMasterData(data);
      setMasterDataForCalculator(data);
      if (data.commissionRules.length > 0) setCommissionRules(data.commissionRules);
      if (data.fixedFeeRules.length > 0) setFixedFeeRules(data.fixedFeeRules);
      if (Object.keys(data.globalLogistics).length > 0) setGtaFees(data.globalLogistics);
      if (Object.keys(data.globalReverseLogistics).length > 0) setReverseLogisticsFees(data.globalReverseLogistics);
      if (Object.keys(data.globalCategoryMapping).length > 0) {
        const catMap = Object.keys(data.globalCategoryMapping).reduce((acc, curr) => {
           acc[curr] = data.globalCategoryMapping[curr].defaultLevel;
           return acc;
        }, {} as Record<string, string>);
        setCategoryMap(catMap);
        localStorage.setItem('category-map', JSON.stringify(catMap));
      }
      let allParties = data.parties && data.parties.length > 0 
        ? data.parties.filter(p => p !== 'Party Name') 
        : ['default'];
        
      // Also ensure any brands in the rules are in the parties list, just in case
      const brandNames = [...new Set([...data.commissionRules, ...data.fixedFeeRules].map(r => r.brand))];
      brandNames.forEach(b => {
        if (b && !allParties.includes(b)) {
          allParties.push(b);
        }
      });
      
      setParties(allParties);
      
      // Only reset brand if current is not in the list and list is not empty
      setBrand(prev => (allParties.length > 0 && !allParties.includes(prev)) ? allParties[0] : prev);
    } catch (err) {
      console.error("Failed to load from sheets", err);
    } finally {
      setLoadingMaster(false);
    }
  };



  // Category Master: article type name -> level string (e.g. 'Level 1')
  const [categoryMap, setCategoryMap] = useState<Record<string, string>>(() => {
    const saved = localStorage.getItem('category-map');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    // Default from existing ArticleType enum + ARTICLE_LEVEL_MAPPING
    return {
      'Boxers': 'Level 1', 'Tshirts': 'Level 1', 'Jeans': 'Level 1', 'Trousers': 'Level 1',
      'Shorts': 'Level 1', 'Innerwear Vests': 'Level 1', 'Sweatshirts': 'Level 2',
      'Sweaters': 'Level 2', 'Jackets': 'Level 2', 'Pyjamas': 'Level 2', 'Shirts': 'Level 1',
      'Kurtas': 'Level 1', 'Dresses': 'Level 1', 'Track Pants': 'Level 1', 'Tops': 'Level 2',
      'Nightdress': 'Level 1', 'Flip Flops': 'Level 1', 'Tracksuits': 'Level 3',
      'Waistcoat': 'Level 2', 'Socks': 'Level 1', 'Ethnic Dresses': 'Level 1',
      'Handbags': 'Level 3', 'Suits': 'Level 4', 'Dungarees': 'Level 2', 'Blazers': 'Level 3',
      'Saree Accessories': 'Level 1', 'Sarees': 'Level 2', 'Bra': 'Level 1', 'Briefs': 'Level 1',
      'Trunk': 'Level 1', 'Leggings': 'Level 1', 'Skirts': 'Level 1', 'Jumpsuit': 'Level 1',
      'Rompers': 'Level 1', 'Kurta Sets': 'Level 1', 'Lehenga Choli': 'Level 4',
      'Body Cream and Lotion': 'Level 1', 'Facial Oil': 'Level 1', 'Lounge Pants': 'Level 1',
      'Under Eye Creams and Serums': 'Level 1', 'Flats': 'Level 1', 'Intimate Hygiene': 'Level 1',
      'Heels': 'Level 1', 'Bindi': 'Level 1', 'Clutches': 'Level 1', 'Makeup Kit': 'Level 2',
      'Accessory Gift Set': 'Level 3', 'Headband': 'Level 1', 'Caps': 'Level 1',
      'Night Cream': 'Level 1', 'Organisers': 'Level 2', 'Proteins': 'Level 2', 'Soap': 'Level 1',
      'Skin Care Combo': 'Level 2', 'Travel Accessory': 'Level 1', 'Perfume': 'Level 2',
      'Free Gifts': 'Level 1', 'Hair Care Combo': 'Level 1', 'Loose Powder': 'Level 1', 'Other': 'Level 1'
    };
  });
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryLevel, setNewCategoryLevel] = useState<string>('Level 1');

  // Dynamic Commission & Fixed Fee Master State
  const [commissionRules, setCommissionRules] = useState<FeeRule[]>([]);
  const [fixedFeeRules, setFixedFeeRules] = useState<FeeRule[]>([]);
  const [selectedPartyForPdf, setSelectedPartyForPdf] = useState<string>('');
  const [pdfRulesPreview, setPdfRulesPreview] = useState<FeeRule[] | null>(null);
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return import.meta.env.VITE_GEMINI_API_KEY || localStorage.getItem('gemini-api-key') || '';
  });
  const [pdfParsingStatus, setPdfParsingStatus] = useState<string>('');


  const [gtaRanges, setGtaRanges] = useState<{ min: number; max: number; label: string }[]>(() => {
    const saved = localStorage.getItem('gta-ranges');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      { min: 0, max: 100, label: '0-100' },
      { min: 100, max: 300, label: '100-300' },
      { min: 300, max: 500, label: '300-500' },
      { min: 500, max: 1000, label: '500-1000' },
      { min: 1000, max: 2000, label: '1000-2000' },
      { min: 2000, max: 999999, label: '>2000' }
    ];
  });

  const [gtaFees, setGtaFees] = useState<Record<string, number[]>>(() => {
    return {
      'Level 1': [0, 59, 59, 94, 171, 207],
      'Level 2': [0, 83, 83, 118, 194, 230],
      'Level 3': [0, 100, 106, 148, 230, 266],
      'Level 4': [0, 100, 153, 189, 277, 313],
      'Level 5': [0, 100, 189, 283, 395, 431],
      'Level 10': [0, 100, 295, 472, 944, 979],
      'Level 11': [0, 100, 295, 472, 944, 1204],
      'Level 12': [0, 100, 295, 472, 944, 1534],
      'Level 13': [0, 100, 295, 472, 944, 1770],
      'Level 14': [0, 100, 295, 472, 944, 1770]
    };
  });

  const [activeMasterModal, setActiveMasterModal] = useState<string | null>(null);

  useEffect(() => {
    fetchAndLoadMasterData();
  }, []);

  useEffect(() => {
    if (activeMasterModal) {
      fetchAndLoadMasterData();
    }
  }, [activeMasterModal]);
  const [newPartyName, setNewPartyName] = useState<string>('');

  const [customConfirm, setCustomConfirm] = useState<{
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const [customAlert, setCustomAlert] = useState<{
    message: string;
  } | null>(null);

  const handleAddParty = async () => {
    const trimmed = newPartyName.trim();
    if (!trimmed) return;
    if (parties.some(p => p.toLowerCase() === trimmed.toLowerCase())) {
      setCustomAlert({ message: "Party already exists!" });
      return;
    }
    const updated = [...parties, trimmed];
    setParties(updated);
    localStorage.setItem('parties-list', JSON.stringify(updated));
    setNewPartyName('');
    
    // Auto-sync to Google Sheets
    try {
      await saveParties(updated);
      // Optional: don't show alert for every add to keep it seamless
    } catch (err) {
      console.error("Failed to auto-sync party", err);
    }
  };

  const handleDeleteParty = (partyToDelete: string) => {
    setCustomConfirm({
      message: `Are you sure you want to delete "${partyToDelete}"?`,
      onConfirm: async () => {
        const updated = parties.filter(p => p !== partyToDelete);
        setParties(updated);
        localStorage.setItem('parties-list', JSON.stringify(updated));
        if (brand === partyToDelete) {
          setBrand(updated[0] || '');
        }
        
        // Auto-sync to Google Sheets
        try {
          await saveParties(updated);
        } catch (err) {
          console.error("Failed to auto-sync party deletion", err);
        }
      }
    });
  };

  const handleAddCategory = async () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    
    const updated = { ...categoryMap, [trimmed]: newCategoryLevel };
    setCategoryMap(updated);
    localStorage.setItem('category-map', JSON.stringify(updated));
    
    if (articleType === trimmed) {
      setLevel(newCategoryLevel as Level);
    }
    setNewCategoryName('');
    
    // Auto-sync
    try {
      const mappingToSave: Record<string, any> = {};
      Object.keys(updated).forEach(key => {
        const existing = masterData?.globalCategoryMapping?.[key];
        mappingToSave[key] = {
          category: existing?.category || 'APPAREL',
          gender: existing?.gender || 'Unisex',
          defaultLevel: updated[key] as Level
        };
      });
      await saveGlobalCategoryMapping(mappingToSave);
    } catch (e) {
      console.error("Auto-sync category failed", e);
    }
  };

  const handleDeleteCategory = (catToDelete: string) => {
    setCustomConfirm({
      message: `Are you sure you want to delete category "${catToDelete}"?`,
      onConfirm: async () => {
        const updated = { ...categoryMap };
        delete updated[catToDelete];
        setCategoryMap(updated);
        localStorage.setItem('category-map', JSON.stringify(updated));
        
        if (articleType === catToDelete) {
          const firstCat = Object.keys(updated)[0];
          if (firstCat) setArticleType(firstCat as any);
        }
        
        // Auto-sync
        try {
          const mappingToSave: Record<string, any> = {};
          Object.keys(updated).forEach(key => {
            const existing = masterData?.globalCategoryMapping?.[key];
            mappingToSave[key] = {
              category: existing?.category || 'APPAREL',
              gender: existing?.gender || 'Unisex',
              defaultLevel: updated[key] as Level
            };
          });
          await saveGlobalCategoryMapping(mappingToSave);
        } catch (e) {
          console.error("Auto-sync delete category failed", e);
        }
      }
    });
  };
  const handlePdfUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedPartyForPdf) {
      setCustomAlert({ message: "Please select a party and upload a valid PDF." });
      return;
    }
    
    setPdfParsingStatus("Extracting text from PDF...");
    const fileReader = new FileReader();
    fileReader.onload = async function() {
      const typedarray = new Uint8Array(this.result as ArrayBuffer);
      try {
        // @ts-ignore
        const pdf = await pdfjsLib.getDocument(typedarray).promise;
        const maxPages = pdf.numPages;
        const textItems: string[] = [];

        for (let j = 1; j <= maxPages; j++) {
          const page = await pdf.getPage(j);
          const textContent = await page.getTextContent();
          const pageItems = textContent.items.map((s: any) => s.str);
          textItems.push(...pageItems);
        }

        const mode = activeMasterModal === 'commission' ? 'commission' : 'fixed_fee';

        // Always try backend AI proxy first, fall back to local regex parser
        setPdfParsingStatus("Parsing text with Gemini AI (via server)...");
        try {
          const parsedRules = await parseMyntraAnnexureWithGemini(textItems, selectedPartyForPdf, mode);
          setPdfRulesPreview(parsedRules);
          setPdfParsingStatus("");
        } catch (geminiErr: any) {
          console.error("Backend Gemini Parsing Error:", geminiErr);
          setPdfParsingStatus("AI parsing failed. Falling back to local Regex parser...");
          const parsedRules = parseMyntraAnnexureText(textItems, selectedPartyForPdf, mode);
          if (parsedRules.length === 0) {
            console.log("PDF Text Items:", textItems);
            const fullText = textItems.join(' ');
            const idx = fullText.toLowerCase().indexOf(selectedPartyForPdf.toLowerCase());
            let context = "Selected Brand not found in PDF text.";
            if (idx !== -1) {
              context = fullText.substring(Math.max(0, idx - 50), Math.min(fullText.length, idx + 600));
            }
            setCustomAlert({ message: `AI parsing failed, and local Regex parser found no rules. Error: ${geminiErr.message}` });
          } else {
            setPdfRulesPreview(parsedRules);
          }
          setPdfParsingStatus("");
        }
      } catch (err) {
        console.error(err);
        setCustomAlert({ message: "Failed to read PDF." });
        setPdfParsingStatus("");
      }
    };
    fileReader.readAsArrayBuffer(file);
  };

  const handleSavePdfRules = async () => {
    if (!pdfRulesPreview) return;
    
    setLoadingMaster(true);
    try {
      if (activeMasterModal === 'commission') {
        const clearedRules = pdfRulesPreview.map(r => ({ ...r, fixedFee: 0 }));
        await saveCommissionRules(selectedPartyForPdf, clearedRules);
        setCustomAlert({ message: `Successfully saved ${clearedRules.length} commission rules to Google Sheets for ${selectedPartyForPdf}.` });
      } else if (activeMasterModal === 'fixed_fee') {
        const clearedRules = pdfRulesPreview.map(r => ({ ...r, commissionPercent: 0 }));
        await saveFixedFeeRules(selectedPartyForPdf, clearedRules);
        setCustomAlert({ message: `Successfully saved ${clearedRules.length} fixed fee rules to Google Sheets for ${selectedPartyForPdf}.` });
      }
      
      await fetchAndLoadMasterData();
      setPdfRulesPreview(null);
    } catch (err: any) {
      setCustomAlert({ message: `Failed to save to Google Sheets: ${err.message}` });
    } finally {
      setLoadingMaster(false);
    }
  };

  const syncPartiesToSheets = async () => {
    setLoadingMaster(true);
    try {
      await saveParties(parties);
      setCustomAlert({ message: "Party Master successfully synced to Google Sheets." });
    } catch (err) {
      console.error(err);
      setCustomAlert({ message: "Failed to sync Party Master to sheets." });
    } finally {
      setLoadingMaster(false);
    }
  };

  const syncCategoryToSheets = async () => {
    setLoadingMaster(true);
    try {
      const mappingToSave: Record<string, any> = {};
      Object.keys(categoryMap).forEach(key => {
        const existing = masterData?.globalCategoryMapping?.[key];
        mappingToSave[key] = {
          category: existing?.category || 'APPAREL',
          gender: existing?.gender || 'Unisex',
          defaultLevel: categoryMap[key] as Level
        };
      });
      await saveGlobalCategoryMapping(mappingToSave);
      setCustomAlert({ message: "Category mapping successfully synced to Google Sheets." });
    } catch (err) {
      setCustomAlert({ message: "Failed to sync Category Mapping to sheets." });
    } finally {
      setLoadingMaster(false);
    }
  };

  const syncLogisticsToSheets = async () => {
    setLoadingMaster(true);
    try {
      await saveGlobalLogistics(gtaFees);
      setCustomAlert({ message: "Global Logistics fees successfully synced to Google Sheets." });
    } catch (err) {
      setCustomAlert({ message: "Failed to sync Logistics fees to sheets." });
    } finally {
      setLoadingMaster(false);
    }
  };

  const syncReverseLogisticsToSheets = async () => {
    setLoadingMaster(true);
    try {
      await saveGlobalReverseLogistics(reverseLogisticsFees);
      setCustomAlert({ message: "Global Reverse Logistics fees successfully synced to Google Sheets." });
    } catch (err) {
      console.error(err);
      setCustomAlert({ message: "Failed to sync Reverse Logistics fees to sheets." });
    } finally {
      setLoadingMaster(false);
    }
  };

  // Auto-sync functions for individual updates have been implemented directly in their respective handlers.

  const handleDeleteRule = (idx: number, type: 'commission' | 'fixed_fee') => {
    setCustomConfirm({
      message: "Are you sure you want to delete this rule?",
      onConfirm: () => {
        if (type === 'commission') {
          const updated = [...commissionRules];
          updated.splice(idx, 1);
          setCommissionRules(updated);
          localStorage.setItem('commission-rules', JSON.stringify(updated));
        } else {
          const updated = [...fixedFeeRules];
          updated.splice(idx, 1);
          setFixedFeeRules(updated);
          localStorage.setItem('fixed-fee-rules', JSON.stringify(updated));
        }
      }
    });
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  
  const [currentThemeClass, setCurrentThemeClass] = useState<string>(() => {
    return localStorage.getItem('visual-theme') || '';
  });

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const headers = ['Brand*', 'ASIN*', 'Amazon sku*', 'Myntra sku*', 'Sku id*', 'Style id*', 'Gender*', 'Article type*', 'TP (Cost)*'];
    const sampleData = [['BELLSTONE', 'B0SAMPLE', 'AMZ-101', 'MYN-101', 'SKU-01', 'STYLE-A', 'Men', 'Tshirts', 350]];
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `Myntra_Bulk_Template.xlsx`);
  };

  const [tpPrice, setTpPrice] = useState<number>(300);
  const [targetSettlement, setTargetSettlement] = useState<number>(397.83);
  const [articleType, setArticleType] = useState<ArticleType>('Boxers' as any);
  const [level, setLevel] = useState<Level>('Level 1' as any);
  const [isReverse, setIsReverse] = useState<boolean>(false);
  const [reverseRegion, setReverseRegion] = useState<Region>('National' as any);
  const [reverseMode, setReverseMode] = useState<ReverseLogisticsMode>('Fixed Value' as any);
  const [reversePercent, setReversePercent] = useState<number>(10);
  
  const [marketplaceData, setMarketplaceData] = useState<Record<string, any[]>>({
    [Marketplace.MYNTRA]: []
  });

  const [buffers, setBuffers] = useState<BusinessBuffers>(DEFAULT_BUFFERS);
  const [manualRateCard, setManualRateCard] = useState<ManualRateCard>(DEFAULT_MANUAL_RATE_CARD);



  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    THEMES.forEach(t => {
      if (t.class) root.classList.remove(t.class);
    });
    if (currentThemeClass) {
      root.classList.add(currentThemeClass);
    }

    localStorage.setItem('theme', theme);
    localStorage.setItem('visual-theme', currentThemeClass);
  }, [theme, currentThemeClass]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const newTarget = calculateTargetFromTP(tpPrice, brand, articleType, buffers, level, reverseRegion, reverseMode);
    setTargetSettlement(parseFloat(newTarget.toFixed(2)));
  }, [tpPrice, brand, articleType, buffers.marginAdjustment, buffers.marginType, buffers.returnPercent, level, reverseRegion, reverseMode]);  useEffect(() => {
    // Use dynamic categoryMap first, fallback to hardcoded ARTICLE_LEVEL_MAPPING
    const mappedLevel = categoryMap[articleType as string];
    if (mappedLevel) {
      setLevel(mappedLevel as Level);
    } else if (ARTICLE_LEVEL_MAPPING[articleType]) {
      setLevel(ARTICLE_LEVEL_MAPPING[articleType]);
    }
  }, [articleType, categoryMap]);

  // Global File Upload Handler for Compact Simulator
  useEffect(() => {
    (window as any).handleGlobalFileUpload = (file: File) => {
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

          if (rows.length === 0) {
            setCustomAlert({ message: "No valid rows with TP cost found in Excel file." });
            return;
          }

          setMarketplaceData(prev => ({
            ...prev,
            [Marketplace.MYNTRA]: rows
          }));
          setActiveTab('batch');
        } catch (err) {
          console.error(err);
          setCustomAlert({ message: "Excel error. Check file format." });
        }
      };
      reader.readAsBinaryString(file);
    };
  }, []);

  const handleRefreshApp = () => {
    setCustomConfirm({
      message: "REFRESH APP? This will clear all calculations and imported data.",
      onConfirm: () => {
        setTpPrice(300);
        setArticleType('Boxers' as any);
        setLevel('Level 1' as any);
        setBuffers(DEFAULT_BUFFERS);
        setBrand(parties[0] || 'Bellstone');
        setIsReverse(false);
        setReverseRegion('National' as any);
        setReverseMode('Fixed Value' as any);
        setReversePercent(10);
        setMarketplaceData({
          [Marketplace.MYNTRA]: []
        });
        setManualRateCard(DEFAULT_MANUAL_RATE_CARD);
        setActiveTab('single');
      }
    });
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const result = useMemo(() => {
    const aisp = findAISPForTarget(
      targetSettlement, 
      level, 
      articleType, 
      isReverse, 
      reverseRegion, 
      reverseMode, 
      reversePercent, 
      Marketplace.MYNTRA,
      brand,
      manualRateCard,
      buffers,
      tpPrice,
      gtaRanges,
      gtaFees,
      commissionRules,
      fixedFeeRules
    );
    return calculateBreakdown(
      aisp, 
      level, 
      articleType, 
      isReverse, 
      reverseRegion, 
      reverseMode, 
      reversePercent, 
      Marketplace.MYNTRA,
      brand,
      manualRateCard,
      buffers,
      tpPrice,
      targetSettlement,
      gtaRanges,
      gtaFees,
      commissionRules,
      fixedFeeRules
    );
  }, [targetSettlement, level, articleType, isReverse, reverseRegion, reverseMode, reversePercent, brand, manualRateCard, buffers, tpPrice, gtaRanges, gtaFees, commissionRules, fixedFeeRules]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-700 font-sans selection:bg-slate-200 selection:text-slate-800">

      <div className="w-full mx-auto px-4 py-6">
        <header className="mb-6 flex flex-row items-center justify-between gap-4 border-b border-slate-200 pb-4">
          <div className="flex items-center gap-4">
            <img src={logoImg} alt="Logo" className="w-12 h-12 object-contain" />
            <div>
              <h1 id="app-header-title" className="text-3xl font-normal tracking-tight text-slate-800">Myntra Cost Calculator</h1>
            </div>
          </div>
          <div className="relative flex items-center gap-2">
            <a 
              href="https://ajio-cost-sheet-new-3.onrender.com" 
              target="_blank" 
              rel="noreferrer" 
              title="Open AJIO Calculator" 
              className="flex items-center justify-center gap-1.5 bg-white border border-slate-200 rounded-md px-2 py-1.5 hover:bg-slate-50 transition-colors shadow-sm font-medium text-xs text-slate-700"
            >
               <img src={ajioLogo} alt="AJIO Logo" className="w-4 h-4 object-contain" />
               AJIO
            </a>
            <a 
              href="https://docs.google.com/spreadsheets/d/19UETYbqUuP6XNRAtlT77M87vZAnnnSPMmjrj9uO0EwE/edit?gid=1717816390#gid=1717816390" 
              target="_blank" 
              rel="noreferrer" 
              title="Open Google Sheet" 
              className="flex items-center justify-center bg-white border border-slate-200 rounded-md p-1.5 hover:bg-slate-50 transition-colors shadow-sm"
            >
               <img src={sheetLogo} alt="Sheet Logo" className="w-5 h-5 object-contain" />
            </a>
            <button 
              onClick={fetchAndLoadMasterData}
              disabled={loadingMaster}
              className={`px-3 py-1.5 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200 text-xs font-medium rounded-md transition-all flex items-center gap-1 shadow-sm ${loadingMaster ? 'opacity-70 cursor-not-allowed' : ''}`}
              title="Pull latest data from Google Sheets"
            >
              <svg className={`w-3 h-3 ${loadingMaster ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
              {loadingMaster ? 'Syncing...' : 'Real-Time Sync'}
            </button>
            <select 
              onChange={(e) => {
                if (e.target.value) {
                  setActiveMasterModal(e.target.value);
                }
                e.target.value = '';
              }}
              className="bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-normal text-slate-700 outline-none focus:ring-1 focus:ring-slate-300 shadow-sm appearance-none cursor-pointer pr-8 min-w-[160px]"
            >
              <option value="">Master</option>
              <option value="party">Party Master</option>
              <option value="gta">GTA Master</option>
              <option value="category">Category Master</option>
              <option value="commission">Commission Master</option>
              <option value="fixed_fee">Fixed Fee Master</option>
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
              <svg className="w-2.5 h-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7" /></svg>
            </div>
          </div>
        </header>

        <main className="space-y-6">
          {/* Tab Selector */}
          <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 max-w-sm">
            <button
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2 text-[10px] font-normal uppercase tracking-wider rounded-lg transition-all ${activeTab === 'single' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
            >
              Single Calculation
            </button>
            <button
              onClick={() => setActiveTab('batch')}
              className={`flex-1 py-2 text-[10px] font-normal uppercase tracking-wider rounded-lg transition-all ${activeTab === 'batch' ? 'bg-slate-700 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200/50'}`}
            >
              Bulk Upload
            </button>
          </div>

          {activeTab === 'single' ? (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
              <CompactSimulator 
                brand={brand}
                setBrand={setBrand}
                parties={parties}
                categoryMap={categoryMap}
                commissionRules={commissionRules}
                fixedFeeRules={fixedFeeRules}
                articleType={articleType} 
                setArticleType={setArticleType} 
                level={level}
                setLevel={setLevel}
                tpPrice={tpPrice} 
                setTpPrice={setTpPrice} 
                targetSettlement={targetSettlement} 
                setTargetSettlement={setTargetSettlement} 
                buffers={buffers} 
                setBuffers={setBuffers}
                reverseMode={reverseMode}
                setReverseMode={setReverseMode}
                reverseRegion={reverseRegion}
                result={result}
              />
            </div>
          ) : (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 space-y-6">
              {/* Batch Settings Card */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-6 animate-in fade-in duration-300 max-w-4xl">
                <div className="space-y-1 max-w-xs">
                  <label className="text-[10px] font-normal uppercase tracking-wider text-slate-500">
                    Margin / Markup Amount
                  </label>
                  <div className="relative flex items-stretch">
                    <input
                      type="number"
                      step="any"
                      value={buffers.marginAdjustment}
                      onChange={(e) => setBuffers({...buffers, marginAdjustment: parseFloat(e.target.value) || 0})}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-l-md text-xs font-normal text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="Enter adjustment"
                    />
                    <select
                      value={buffers.marginType}
                      onChange={(e) => setBuffers({...buffers, marginType: e.target.value as MarginType})}
                      className="px-3 py-1.5 bg-white border-y border-r border-slate-200 rounded-r-md text-[10px] font-normal text-slate-700 focus:outline-none"
                    >
                      <option value={MarginType.PERCENT}>Percentage (%)</option>
                      <option value={MarginType.VALUE}>Amount (₹)</option>
                    </select>
                  </div>
                  <p className="text-[8px] text-slate-400 font-normal">
                    Added directly on top of the row's TP cost to specify the goal.
                  </p>
                </div>

                <div className="space-y-1 max-w-xs">
                  <label className="text-[10px] font-normal uppercase tracking-wider text-slate-500">
                    Return Rate / Amount
                  </label>
                  <div className="relative flex items-stretch">
                    <input
                      type="number"
                      step="any"
                      value={buffers.returnPercent}
                      onChange={(e) => setBuffers({...buffers, returnPercent: parseFloat(e.target.value) || 0})}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-l-md text-xs font-normal text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="Enter return amount or %"
                    />
                    <select
                      value={buffers.returnType || MarginType.PERCENT}
                      onChange={(e) => setBuffers({...buffers, returnType: e.target.value as MarginType})}
                      className="px-3 py-1.5 bg-white border-y border-r border-slate-200 rounded-r-md text-[10px] font-normal text-slate-700 focus:outline-none"
                    >
                      <option value={MarginType.PERCENT}>Percentage (%)</option>
                      <option value={MarginType.VALUE}>Amount (₹)</option>
                    </select>
                  </div>
                  <p className="text-[8px] text-slate-400 font-normal">
                    Calculates dynamic returns cost for each article type.
                  </p>
                </div>

                <div className="space-y-1 max-w-xs">
                  <label className="text-[10px] font-normal uppercase tracking-wider text-slate-500">
                    Purchase GST %
                  </label>
                  <div className="relative flex items-stretch">
                    <input
                      type="number"
                      step="any"
                      value={buffers.purchaseTaxPercent !== undefined ? buffers.purchaseTaxPercent : 5}
                      onChange={(e) => setBuffers({...buffers, purchaseTaxPercent: parseFloat(e.target.value) || 0})}
                      className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-l-md text-xs font-normal text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-400"
                      placeholder="Enter purchase tax %"
                    />
                    <span className="px-3 py-1.5 bg-white border-y border-r border-slate-200 rounded-r-md text-[10px] font-normal text-slate-500 flex items-center justify-center">
                      %
                    </span>
                  </div>
                  <p className="text-[8px] text-slate-400 font-normal">
                    Calculates purchase tax and cost without tax for bulk upload.
                  </p>
                </div>
              </div>


              <BatchProcessor 
                buffers={buffers}
                categoryMap={categoryMap}
                commissionRules={commissionRules}
                fixedFeeRules={fixedFeeRules}
                setBuffers={setBuffers} 
                marketplaceData={marketplaceData} 
                setMarketplaceData={setMarketplaceData}
                manualRateCard={manualRateCard}
                isReverse={isReverse}
                reverseRegion={reverseRegion}
                reverseMode={reverseMode}
                reversePercent={reversePercent}
                parties={parties}
                showConfirm={(msg: string, callback: () => void) => setCustomConfirm({ message: msg, onConfirm: callback })}
                showAlert={(msg: string) => setCustomAlert({ message: msg })}
                gtaRanges={gtaRanges}
                gtaFees={gtaFees}
              />
            </div>
          )}
        </main>

        {/* Party Master Modal */}
        {activeMasterModal === 'party' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-normal uppercase tracking-wider text-slate-700">Party Master</h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={syncPartiesToSheets}
                    className="text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  >
                    Sync to Google Sheets
                  </button>
                  <button 
                    onClick={() => {
                      setActiveMasterModal(null);
                      setNewPartyName('');
                    }}
                    className="text-slate-400 hover:text-slate-600 text-lg focus:outline-none"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Add new party form */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newPartyName}
                  onChange={(e) => setNewPartyName(e.target.value)}
                  placeholder="Enter Party Name"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddParty();
                    }
                  }}
                />
                <button
                  onClick={handleAddParty}
                  className="px-4 py-1.5 bg-slate-700 text-white text-xs font-normal rounded-lg hover:bg-slate-800 transition-all uppercase tracking-wider"
                >
                  Add
                </button>
              </div>

              {/* List of parties */}
              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {parties.map((p, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                    <span className="font-normal">{p}</span>
                    <button
                      onClick={() => handleDeleteParty(p)}
                      className="text-rose-500 hover:text-rose-700 text-[10px] uppercase tracking-wider font-normal px-2 py-0.5 rounded hover:bg-rose-50 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                ))}
                {parties.length === 0 && (
                  <div className="p-4 text-center text-xs text-slate-400 font-normal italic">
                    No parties added yet.
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  onClick={() => {
                    setActiveMasterModal(null);
                    setNewPartyName('');
                  }}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-normal rounded-lg transition-all uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* GTA Master Modal */}
        {activeMasterModal === 'gta' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h3 className="text-sm font-normal uppercase tracking-wider text-slate-700">GTA Master (Forward Shipping)</h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={syncLogisticsToSheets}
                    className="text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  >
                    Sync to Google Sheets
                  </button>
                  <button 
                    onClick={() => setActiveMasterModal(null)}
                    className="text-slate-400 hover:text-slate-600 text-lg focus:outline-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Threshold management */}
              <div className="bg-slate-50 p-4 rounded-lg space-y-2 shrink-0 border border-slate-200">
                <h4 className="text-[10px] font-normal uppercase tracking-wider text-slate-500">Price Slabs Thresholds</h4>
                <div className="flex flex-wrap items-center gap-4">
                  {gtaRanges.slice(0, gtaRanges.length - 1).map((r, i) => (
                    <div key={i} className="flex flex-col gap-1 w-24">
                      <label className="text-[9px] text-slate-400 font-normal">Threshold {i+1} (₹)</label>
                      <input
                        type="number"
                        value={r.max}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const newRanges = [...gtaRanges];
                          newRanges[i].max = val;
                          if (newRanges[i+1]) {
                            newRanges[i+1].min = val;
                          }
                          // Also adjust labels
                          newRanges[i].label = `${newRanges[i].min}-${newRanges[i].max}`;
                          if (newRanges[i+1]) {
                            if (newRanges[i+1].max === 999999) {
                              newRanges[i+1].label = `>${newRanges[i+1].min}`;
                            } else {
                              newRanges[i+1].label = `${newRanges[i+1].min}-${newRanges[i+1].max}`;
                            }
                          }
                          setGtaRanges(newRanges);
                          localStorage.setItem('gta-ranges', JSON.stringify(newRanges));
                        }}
                        className="px-2 py-1 bg-white border border-slate-200 rounded-md text-xs font-normal text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Level Form */}
              <div className="flex gap-3 shrink-0 items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    id="new-level-input"
                    placeholder="e.g. Level 10"
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        const newL = input?.value?.trim();
                        if (!newL) return;
                        if (gtaFees[newL]) {
                          setCustomAlert({ message: "Level already exists!" });
                          return;
                        }
                        const updated = {
                          ...gtaFees,
                          [newL]: Array(gtaRanges.length).fill(0)
                        };
                        setGtaFees(updated);
                        localStorage.setItem('gta-fees', JSON.stringify(updated));
                        input.value = '';
                        saveGlobalLogistics(updated).catch(e => console.error(e));
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      const input = document.getElementById('new-level-input') as HTMLInputElement;
                      const newL = input?.value?.trim();
                      if (!newL) return;
                      if (gtaFees[newL]) {
                        setCustomAlert({ message: "Level already exists!" });
                        return;
                      }
                      const updated = {
                        ...gtaFees,
                        [newL]: Array(gtaRanges.length).fill(0)
                      };
                      setGtaFees(updated);
                      localStorage.setItem('gta-fees', JSON.stringify(updated));
                      if (input) input.value = '';
                      saveGlobalLogistics(updated).catch(e => console.error(e));
                    }}
                    className="px-4 py-1.5 bg-slate-700 text-white text-xs font-normal rounded-lg hover:bg-slate-800 transition-all uppercase tracking-wider"
                  >
                    Add Level
                  </button>
                </div>
              </div>

              {/* Spreadsheet Grid */}
              <div className="flex-1 overflow-auto border border-slate-200 rounded-lg shadow-inner">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                    <tr className="divide-x divide-slate-200">
                      <th className="px-4 py-2 text-slate-600 font-normal uppercase tracking-wider w-24">Level</th>
                      {gtaRanges.map((r, i) => (
                        <th key={i} className="px-4 py-2 text-slate-600 font-normal uppercase tracking-wider text-center">
                          {r.label}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-slate-600 font-normal uppercase tracking-wider text-center w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {Object.keys(gtaFees).map((levelKey) => (
                      <tr key={levelKey} className="divide-x divide-slate-100 hover:bg-slate-50/50">
                        <td className="px-4 py-2 font-normal text-slate-700 whitespace-nowrap bg-slate-50/20">{levelKey}</td>
                        {gtaRanges.map((r, i) => (
                          <td key={i} className="p-1">
                            <input
                              type="number"
                              value={gtaFees[levelKey][i] ?? 0}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                const updatedFees = { ...gtaFees };
                                updatedFees[levelKey] = [...(updatedFees[levelKey] || [])];
                                updatedFees[levelKey][i] = val;
                                setGtaFees(updatedFees);
                                localStorage.setItem('gta-fees', JSON.stringify(updatedFees));
                              }}
                              onBlur={() => saveGlobalLogistics(gtaFees).catch(e => console.error(e))}
                              className="w-full text-center px-2 py-1 bg-transparent border-0 outline-none text-xs font-normal text-slate-700 focus:bg-white focus:ring-1 focus:ring-slate-200 rounded"
                            />
                          </td>
                        ))}
                        <td className="px-2 py-1 text-center">
                          <button
                            onClick={() => {
                              setCustomConfirm({
                                message: `Are you sure you want to delete "${levelKey}"?`,
                                onConfirm: async () => {
                                  const updated = { ...gtaFees };
                                  delete updated[levelKey];
                                  setLevel('Level 1' as any);
                                  setArticleType('Boxers' as any);
                                  setGtaFees(updated);
                                  localStorage.setItem('gta-fees', JSON.stringify(updated));
                                  try { await saveGlobalLogistics(updated); } catch(e) { console.error(e); }
                                }
                              });
                            }}
                            className="text-rose-500 hover:text-rose-700 text-[10px] uppercase tracking-wider font-normal px-2 py-0.5 rounded hover:bg-rose-50 transition-colors"
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => setActiveMasterModal(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-normal rounded-lg transition-all uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Category Master Modal */}
        {activeMasterModal === 'category' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h3 className="text-sm font-normal uppercase tracking-wider text-slate-700">Category Master</h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={syncCategoryToSheets}
                    className="text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  >
                    Sync to Google Sheets
                  </button>
                  <button 
                    onClick={() => {
                      setActiveMasterModal(null);
                      setNewCategoryName('');
                    }}
                    className="text-slate-400 hover:text-slate-600 text-lg focus:outline-none"
                  >
                    ×
                  </button>
                </div>
              </div>
              
              {/* Add new category form */}
              <div className="flex gap-2 shrink-0">
                <input
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="Article Type (e.g. Tshirts)"
                  className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-normal text-slate-700 focus:outline-none focus:ring-1 focus:ring-slate-300"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                  }}
                />
                <select
                  value={newCategoryLevel}
                  onChange={(e) => setNewCategoryLevel(e.target.value)}
                  className="w-24 bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-normal text-slate-700 outline-none focus:ring-1 focus:ring-slate-300"
                >
                  {Object.keys(gtaFees).map(l => (
                    <option key={l} value={l}>{l}</option>
                  ))}
                  {/* Fallbacks if empty */}
                  {!Object.keys(gtaFees).includes('Level 1') && <option value="Level 1">Level 1</option>}
                  {!Object.keys(gtaFees).includes('Level 2') && <option value="Level 2">Level 2</option>}
                  {!Object.keys(gtaFees).includes('Level 3') && <option value="Level 3">Level 3</option>}
                  {!Object.keys(gtaFees).includes('Level 4') && <option value="Level 4">Level 4</option>}
                  {!Object.keys(gtaFees).includes('Level 5') && <option value="Level 5">Level 5</option>}
                </select>
                <button
                  onClick={handleAddCategory}
                  className="px-4 py-1.5 bg-slate-700 text-white text-xs font-normal rounded-lg hover:bg-slate-800 transition-all uppercase tracking-wider"
                >
                  Save
                </button>
              </div>

              {/* List of categories */}
              <div className="flex-1 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100">
                {Object.entries(categoryMap).sort((a,b) => a[0].localeCompare(b[0])).map(([catName, lvl]) => (
                  <div key={catName} className="flex items-center justify-between px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 transition-colors">
                    <span className="font-normal">{catName}</span>
                    <div className="flex items-center gap-3">
                      <span className="bg-slate-200 px-1.5 py-0.5 rounded text-[10px] text-slate-600 font-medium">{lvl}</span>
                      <button
                        onClick={() => handleDeleteCategory(catName)}
                        className="text-rose-500 hover:text-rose-700 text-[10px] uppercase tracking-wider font-normal px-1 py-0.5 rounded hover:bg-rose-50 transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
                {Object.keys(categoryMap).length === 0 && (
                  <div className="p-4 flex flex-col items-center justify-center gap-3">
                    <span className="text-xs text-slate-400 font-normal italic">
                      No categories found in Google Sheet.
                    </span>
                    <button
                      onClick={async () => {
                        setLoadingMaster(true);
                        try {
                          await saveGlobalCategoryMapping(ARTICLE_SPECIFICATIONS);
                          await fetchAndLoadMasterData();
                          setCustomAlert({ message: "Default categories restored successfully!" });
                        } catch (e) {
                          console.error(e);
                          setCustomAlert({ message: "Failed to restore categories." });
                        } finally {
                          setLoadingMaster(false);
                        }
                      }}
                      className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-medium rounded-lg hover:bg-indigo-700 transition-colors"
                    >
                      Restore Default Categories
                    </button>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    setActiveMasterModal(null);
                    setNewCategoryName('');
                  }}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-normal rounded-lg transition-all uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reverse Logistics Master Modal */}
        {activeMasterModal === 'reverse' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-4xl w-full p-6 space-y-4 max-h-[90vh] flex flex-col animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h3 className="text-sm font-normal uppercase tracking-wider text-slate-700">Reverse Logistics Master</h3>
                <div className="flex items-center gap-3">
                  <button 
                    onClick={syncReverseLogisticsToSheets}
                    className="text-[10px] uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 px-2 py-1 rounded hover:bg-emerald-100 transition-colors flex items-center gap-1"
                  >
                    Sync to Google Sheets
                  </button>
                  <button 
                    onClick={() => setActiveMasterModal(null)}
                    className="text-slate-400 hover:text-slate-600 text-lg focus:outline-none"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto pr-2 custom-scrollbar space-y-4 flex-1">
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-100 border-b border-slate-200 text-slate-600 uppercase tracking-wider">
                        <th className="px-3 py-2.5 font-medium">Level</th>
                        <th className="px-3 py-2.5 font-medium text-center">Local Fee</th>
                        <th className="px-3 py-2.5 font-medium text-center">Zone Fee</th>
                        <th className="px-3 py-2.5 font-medium text-center">National Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {['Level 1', 'Level 2', 'Level 3', 'Level 4', 'Level 5'].map(level => (
                        <tr key={level} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-3 py-2.5 font-medium text-slate-700 whitespace-nowrap">{level}</td>
                          {['Local', 'Zone', 'National'].map(region => (
                            <td key={region} className="px-3 py-1.5">
                              <input 
                                type="number" 
                                className="w-full text-center py-1.5 px-2 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-slate-300 focus:bg-white text-slate-700"
                                value={reverseLogisticsFees[level]?.[region as 'Local' | 'Zone' | 'National'] || 0}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setReverseLogisticsFees(prev => ({
                                    ...prev,
                                    [level]: {
                                      ...prev[level],
                                      [region]: val
                                    }
                                  }));
                                }}
                                onBlur={() => saveGlobalReverseLogistics(reverseLogisticsFees).catch(e => console.error(e))}
                              />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="p-3 bg-blue-50 text-blue-700 text-xs rounded-lg border border-blue-100">
                  <p className="flex items-start gap-1.5">
                    <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    <span>Update fees here and click "Sync to Google Sheets". Reverse logistics costs will be calculated based on these mapped slabs.</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Commission Master Modal */}
        {activeMasterModal === 'commission' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-4xl w-full p-6 space-y-4 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h3 className="text-sm font-normal uppercase tracking-wider text-slate-700">Commission Master</h3>
                <button 
                  onClick={() => {
                    setActiveMasterModal(null);
                    setPdfRulesPreview(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-lg focus:outline-none"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-3 shrink-0 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1 w-1/3">
                    <label className="text-[10px] font-normal uppercase tracking-wider text-slate-500">Select Party</label>
                    <select 
                      value={selectedPartyForPdf}
                      onChange={(e) => setSelectedPartyForPdf(e.target.value)}
                      className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-normal text-slate-700 outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="">-- Choose Party --</option>
                      {parties.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] font-normal uppercase tracking-wider text-slate-500">Upload Myntra Annexure PDF</label>
                    <input 
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      disabled={!selectedPartyForPdf}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-800 disabled:opacity-50 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t border-slate-200/60 pt-3">
                  {pdfParsingStatus && (
                    <div className="flex items-center gap-2 text-xs font-normal text-amber-600 pt-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>{pdfParsingStatus}</span>
                    </div>
                  )}
                </div>
              </div>

              {pdfRulesPreview ? (
                <div className="flex-1 overflow-auto flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Preview Parsed Commission Rules (Please Review)</h4>
                    <button onClick={handleSavePdfRules} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs rounded shadow-sm">Confirm & Save Rules</button>
                  </div>
                  <div className="border border-slate-200 rounded-lg shadow-inner overflow-auto h-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                        <tr className="divide-x divide-slate-200">
                          <th className="px-2 py-1">Type</th>
                          <th className="px-2 py-1 text-center">Lower</th>
                          <th className="px-2 py-1 text-center">Upper</th>
                          <th className="px-2 py-1 text-center">Comm %</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pdfRulesPreview.map((r, i) => (
                          <tr key={i} className="divide-x divide-slate-100">
                            <td className="px-2 py-1 font-normal text-slate-700">{r.articleType}</td>
                            <td className="px-2 py-1 text-center">{r.lowerLimit}</td>
                            <td className="px-2 py-1 text-center">{r.upperLimit === Infinity ? 'MAX' : r.upperLimit}</td>
                            <td className="px-2 py-1 text-center">
                              <input type="number" value={r.commissionPercent} onChange={(e) => {
                                const newP = [...pdfRulesPreview]; newP[i].commissionPercent = parseFloat(e.target.value)||0; setPdfRulesPreview(newP);
                              }} className="w-16 text-center border rounded px-1" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-auto border border-slate-200 rounded-lg shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr className="divide-x divide-slate-200">
                        <th className="px-2 py-1">Party</th>
                        <th className="px-2 py-1">Type</th>
                        <th className="px-2 py-1 text-center">Lower</th>
                        <th className="px-2 py-1 text-center">Upper</th>
                        <th className="px-2 py-1 text-center">Comm %</th>
                        <th className="px-2 py-1 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {commissionRules.map((r, i) => (
                        <tr key={i} className="divide-x divide-slate-100 hover:bg-slate-50/50">
                          <td className="px-2 py-1 font-medium">{r.brand}</td>
                          <td className="px-2 py-1">{r.articleType}</td>
                          <td className="px-2 py-1 text-center">{r.lowerLimit}</td>
                          <td className="px-2 py-1 text-center">{r.upperLimit === Infinity ? 'MAX' : r.upperLimit}</td>
                          <td className="px-2 py-1 text-center">{r.commissionPercent}%</td>
                          <td className="px-2 py-1 text-center">
                            <button onClick={() => handleDeleteRule(i, 'commission')} className="text-rose-500 hover:text-rose-700 text-[9px] uppercase">Del</button>
                          </td>
                        </tr>
                      ))}
                      {commissionRules.length === 0 && (
                        <tr><td colSpan={6} className="p-4 text-center text-xs text-slate-400">No custom commission rules saved.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    setActiveMasterModal(null);
                    setPdfRulesPreview(null);
                  }}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-normal rounded-lg transition-all uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Fixed Fee Master Modal */}
        {activeMasterModal === 'fixed_fee' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-4xl w-full p-6 space-y-4 flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
                <h3 className="text-sm font-normal uppercase tracking-wider text-slate-700">Fixed Fee Master</h3>
                <button 
                  onClick={() => {
                    setActiveMasterModal(null);
                    setPdfRulesPreview(null);
                  }}
                  className="text-slate-400 hover:text-slate-600 text-lg focus:outline-none"
                >
                  ×
                </button>
              </div>

              <div className="flex flex-col gap-3 shrink-0 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1 w-1/3">
                    <label className="text-[10px] font-normal uppercase tracking-wider text-slate-500">Select Party</label>
                    <select 
                      value={selectedPartyForPdf}
                      onChange={(e) => setSelectedPartyForPdf(e.target.value)}
                      className="bg-white border border-slate-200 rounded-md px-2 py-1.5 text-xs font-normal text-slate-700 outline-none focus:ring-1 focus:ring-slate-300"
                    >
                      <option value="">-- Choose Party --</option>
                      {parties.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                  </div>
                  
                  <div className="flex flex-col gap-1 flex-1">
                    <label className="text-[10px] font-normal uppercase tracking-wider text-slate-500">Upload Myntra Annexure PDF</label>
                    <input 
                      type="file"
                      accept=".pdf"
                      onChange={handlePdfUpload}
                      disabled={!selectedPartyForPdf}
                      className="block w-full text-xs text-slate-500 file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-slate-700 file:text-white hover:file:bg-slate-800 disabled:opacity-50 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t border-slate-200/60 pt-3">
                  {pdfParsingStatus && (
                    <div className="flex items-center gap-2 text-xs font-normal text-amber-600 pt-1">
                      <span className="inline-block w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                      <span>{pdfParsingStatus}</span>
                    </div>
                  )}
                </div>
              </div>

              {pdfRulesPreview ? (
                <div className="flex-1 overflow-auto flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[11px] font-medium text-amber-600 uppercase tracking-wider">Preview Parsed Fixed Fee Rules (Please Review)</h4>
                    <button onClick={handleSavePdfRules} className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 text-xs rounded shadow-sm">Confirm & Save Rules</button>
                  </div>
                  <div className="border border-slate-200 rounded-lg shadow-inner overflow-auto h-full">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                        <tr className="divide-x divide-slate-200">
                          <th className="px-2 py-1">Type</th>
                          <th className="px-2 py-1 text-center">Lower</th>
                          <th className="px-2 py-1 text-center">Upper</th>
                          <th className="px-2 py-1 text-center">Fixed ₹</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pdfRulesPreview.map((r, i) => (
                          <tr key={i} className="divide-x divide-slate-100">
                            <td className="px-2 py-1 font-normal text-slate-700">{r.articleType}</td>
                            <td className="px-2 py-1 text-center">{r.lowerLimit}</td>
                            <td className="px-2 py-1 text-center">{r.upperLimit === Infinity ? 'MAX' : r.upperLimit}</td>
                            <td className="px-2 py-1 text-center">
                              <input type="number" value={r.fixedFee} onChange={(e) => {
                                const newP = [...pdfRulesPreview]; newP[i].fixedFee = parseFloat(e.target.value)||0; setPdfRulesPreview(newP);
                              }} className="w-16 text-center border rounded px-1" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="flex-1 overflow-auto border border-slate-200 rounded-lg shadow-inner">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-50 sticky top-0 border-b border-slate-200">
                      <tr className="divide-x divide-slate-200">
                        <th className="px-2 py-1">Party</th>
                        <th className="px-2 py-1">Type</th>
                        <th className="px-2 py-1 text-center">Lower</th>
                        <th className="px-2 py-1 text-center">Upper</th>
                        <th className="px-2 py-1 text-center">Fixed ₹</th>
                        <th className="px-2 py-1 text-center w-16">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {fixedFeeRules.map((r, i) => (
                        <tr key={i} className="divide-x divide-slate-100 hover:bg-slate-50/50">
                          <td className="px-2 py-1 font-medium">{r.brand}</td>
                          <td className="px-2 py-1">{r.articleType}</td>
                          <td className="px-2 py-1 text-center">{r.lowerLimit}</td>
                          <td className="px-2 py-1 text-center">{r.upperLimit === Infinity ? 'MAX' : r.upperLimit}</td>
                          <td className="px-2 py-1 text-center">₹{r.fixedFee}</td>
                          <td className="px-2 py-1 text-center">
                            <button onClick={() => handleDeleteRule(i, 'fixed_fee')} className="text-rose-500 hover:text-rose-700 text-[9px] uppercase">Del</button>
                          </td>
                        </tr>
                      ))}
                      {fixedFeeRules.length === 0 && (
                        <tr><td colSpan={6} className="p-4 text-center text-xs text-slate-400">No custom fixed fee rules saved.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
                <button
                  onClick={() => {
                    setActiveMasterModal(null);
                    setPdfRulesPreview(null);
                  }}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-normal rounded-lg transition-all uppercase tracking-wider"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Confirmation Modal */}
        {customConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-sm font-normal text-slate-700 uppercase tracking-wider">Confirm Action</h3>
              <p className="text-xs text-slate-500 font-normal">{customConfirm.message}</p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setCustomConfirm(null)}
                  className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-normal rounded-lg transition-all uppercase tracking-wider"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    customConfirm.onConfirm();
                    setCustomConfirm(null);
                  }}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-normal rounded-lg transition-all uppercase tracking-wider"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Custom Alert Modal */}
        {customAlert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xs">
            <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-sm w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-sm font-normal text-slate-700 uppercase tracking-wider">Alert</h3>
              <p className="text-xs text-slate-500 font-normal">{customAlert.message}</p>
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setCustomAlert(null)}
                  className="px-4 py-1.5 bg-slate-700 hover:bg-slate-800 text-white text-xs font-normal rounded-lg transition-all uppercase tracking-wider"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}

        {/* AJ Chatbot */}
        <Chatbot />

      </div>
    </div>
  );
};

export default App;
