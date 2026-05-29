
import { Level, Region, PricingResult, ArticleType, MasterCategory, ReverseLogisticsMode, Marketplace, Brand, ManualRateCard, ManualRateRule, BusinessBuffers, MarginType, FeeRule } from '../types';
import { 
  PLATFORM_LOGISTICS_FEES, 
  REVERSE_LOGISTICS_FEES, 
  GST_RATE, 
  PRODUCT_GST_RATE,
  TCS_RATE_VAL,
  TDS_RATE_VAL,
  BRAND_FIXED_FEE_SLABS,
  BRAND_COMMISSION_SLABS,
  ARTICLE_SPECIFICATIONS,
  FREE_ITEMS_COMMISSION_SLABS
} from '../constants';
import { AppMasterData } from './sheetsService';

let globalMasterData: AppMasterData | null = null;

export const setMasterDataForCalculator = (data: AppMasterData) => {
  globalMasterData = data;
};

export const calculateBaseCost = (
  tp: number,
  brand: string,
  articleType: ArticleType,
  buffers: BusinessBuffers,
  fixedFeeRules?: FeeRule[]
): number => {
  // 1. Get Fixed Fee
  const fixedFee = getFixedFee(tp, articleType, brand, fixedFeeRules);

  return tp + fixedFee;
};

export const calculateReturnCost = (
  basisPrice: number,
  level: string,
  region: Region,
  mode: ReverseLogisticsMode,
  percent: number
): number => {
  let baseFee = 0;
  if (mode === ReverseLogisticsMode.FIXED) {
    const revFees = globalMasterData?.globalReverseLogistics || REVERSE_LOGISTICS_FEES;
    const regionFees = revFees[level] || revFees.Default || REVERSE_LOGISTICS_FEES.Default;
    const rate = regionFees[region] || 157;
    baseFee = rate * (percent / 100);
    return baseFee * 1.18; // Including 18% GST for fixed logistics charges
  } else {
    baseFee = (basisPrice * percent) / 100;
    return baseFee; // Simple direct percentage of cost
  }
};

export const calculateTargetFromTP = (
  tp: number,
  brand: string,
  articleType: ArticleType,
  buffers: BusinessBuffers,
  level: string = 'Level 2',
  reverseRegion: Region = Region.LOCAL,
  reverseMode: ReverseLogisticsMode = ReverseLogisticsMode.FIXED
): number => {
  let baseTarget = 0;
  if (buffers.marginType === MarginType.PERCENT) {
    baseTarget = tp * (1 + buffers.marginAdjustment / 100);
  } else {
    baseTarget = tp + buffers.marginAdjustment;
  }
  
  let returnCost = 0;
  if (buffers?.returnType === MarginType.VALUE) {
    returnCost = buffers.returnPercent;
  } else {
    returnCost = calculateReturnCost(tp, level, reverseRegion, reverseMode, buffers?.returnPercent ?? 0);
  }
  return baseTarget + returnCost;
};

const getCommissionRate = (price: number, articleType: ArticleType, brand: string, commissionRules: FeeRule[] = [], log: boolean = false): number => {
  if (log) {
    console.log(`getCommissionRate input - price: ${price}, articleType: ${articleType}, brand: ${brand}, commissionRules length: ${commissionRules?.length}`);
  }
  
  const specs = globalMasterData?.globalCategoryMapping || ARTICLE_SPECIFICATIONS;
  const spec = specs[articleType];
  if (spec && spec.category === MasterCategory.FREE_ITEMS) {
    const slab = FREE_ITEMS_COMMISSION_SLABS.find(s => price >= s.lower && price <= s.upper) || FREE_ITEMS_COMMISSION_SLABS[0];
    return slab.rate;
  }

  if (commissionRules && commissionRules.length > 0) {
    const activeRules = commissionRules.filter(r => {
      const brandMatch = r.brand === brand;
      const typeMatch = r.articleType === articleType || r.articleType.toUpperCase() === 'ALL';
      return brandMatch && typeMatch;
    });
    
    // Sort specific articleType before generic 'ALL' rules
    activeRules.sort((a, b) => {
      const aIsSpecific = a.articleType === articleType;
      const bIsSpecific = b.articleType === articleType;
      if (aIsSpecific && !bIsSpecific) return -1;
      if (!aIsSpecific && bIsSpecific) return 1;
      return 0;
    });

    if (log) {
      console.log(`getCommissionRate sorted activeRules count: ${activeRules.length}`, activeRules);
    }
    if (activeRules.length > 0) {
      const match = activeRules.find(r => price >= r.lowerLimit && price < r.upperLimit);
      if (match) {
        if (log) console.log(`getCommissionRate custom rule MATCHED:`, match);
        return match.commissionPercent;
      } else {
        const specificRules = activeRules.filter(r => r.articleType === articleType);
        const fallbackRule = specificRules.length > 0 ? specificRules[specificRules.length - 1] : activeRules[activeRules.length - 1];
        if (log) console.log(`getCommissionRate custom rule fallback:`, fallbackRule);
        return fallbackRule.commissionPercent;
      }
    }
  }

  // Fallback to constants if no dynamic rule
  if (log) {
    console.log(`getCommissionRate falling back to constants for brand: ${brand}, articleType: ${articleType}`);
  }
  const brandRules = BRAND_COMMISSION_SLABS[brand] || BRAND_COMMISSION_SLABS.default;
  const articleRules = brandRules[articleType] || brandRules.ALL || BRAND_COMMISSION_SLABS.default.ALL;
  const slab = articleRules.find(s => price >= s.lower && price < s.upper) || articleRules[articleRules.length - 1];
  if (log) {
    console.log(`getCommissionRate fallback constant slab found:`, slab);
  }
  return slab.rate;
};

const getFixedFee = (aisp: number, articleType: ArticleType, brand: string, fixedFeeRules: FeeRule[] = [], log: boolean = false): number => {
  if (log) {
    console.log(`getFixedFee input - aisp: ${aisp}, articleType: ${articleType}, brand: ${brand}, fixedFeeRules length: ${fixedFeeRules?.length}`);
  }
  if (fixedFeeRules && fixedFeeRules.length > 0) {
    const activeRules = fixedFeeRules.filter(r => r.brand === brand && (r.articleType === articleType || r.articleType.toUpperCase() === 'ALL'));
    
    // Sort specific articleType before generic 'ALL' rules
    activeRules.sort((a, b) => {
      const aIsSpecific = a.articleType === articleType;
      const bIsSpecific = b.articleType === articleType;
      if (aIsSpecific && !bIsSpecific) return -1;
      if (!aIsSpecific && bIsSpecific) return 1;
      return 0;
    });

    if (log) {
      console.log(`getFixedFee sorted activeRules count: ${activeRules.length}`, activeRules);
    }
    if (activeRules.length > 0) {
      const match = activeRules.find(r => aisp >= r.lowerLimit && aisp < r.upperLimit);
      if (match) {
        if (log) console.log(`getFixedFee custom rule MATCHED:`, match);
        return match.fixedFee;
      } else {
        const specificRules = activeRules.filter(r => r.articleType === articleType);
        const fallbackRule = specificRules.length > 0 ? specificRules[specificRules.length - 1] : activeRules[activeRules.length - 1];
        if (log) console.log(`getFixedFee custom rule fallback:`, fallbackRule);
        return fallbackRule.fixedFee;
      }
    }
  }

  // Fallback
  if (log) {
    console.log(`getFixedFee falling back to constants for brand: ${brand}, articleType: ${articleType}`);
  }
  const brandRules = BRAND_FIXED_FEE_SLABS[brand] || BRAND_FIXED_FEE_SLABS.default;
  const articleRules = brandRules[articleType] || brandRules.ALL || BRAND_FIXED_FEE_SLABS.default.ALL;
  
  const slab = articleRules.find(s => aisp >= s.lower && aisp < s.upper) || articleRules[articleRules.length - 1];
  if (log) {
    console.log(`getFixedFee fallback constant slab found:`, slab);
  }
  return slab.fee;
};

const findManualRule = (rules: ManualRateRule[], aisp: number, articleType: ArticleType, level: string): ManualRateRule | undefined => {
  const sorted = [...rules].sort((a, b) => {
    let scoreA = 0;
    if (a.articleType !== 'ALL') scoreA += 10;
    if (a.level !== 'ALL') scoreA += 5;
    let scoreB = 0;
    if (b.articleType !== 'ALL') scoreB += 10;
    if (b.level !== 'ALL') scoreB += 5;
    return scoreB - scoreA;
  });

  return sorted.find(r => {
    const articleMatch = r.articleType === 'ALL' || r.articleType === articleType;
    const levelMatch = r.level === 'ALL' || r.level === level;
    const priceMatch = aisp >= r.minPrice && aisp < r.maxPrice;
    return articleMatch && levelMatch && priceMatch;
  });
};

export const calculateBreakdown = (
  aisp: number, 
  level: string,
  articleType: ArticleType,
  isReverseLogistics: boolean,
  reverseRegion: Region,
  reverseMode: ReverseLogisticsMode = ReverseLogisticsMode.FIXED,
  reversePercent: number = 0,
  marketplace: Marketplace = Marketplace.MYNTRA,
  brand: string = 'Bellstone',
  manualRateCard?: ManualRateCard,
  buffers?: BusinessBuffers,
  tp?: number,
  targetSettlement?: number,
  gtaRanges?: { min: number; max: number; label: string }[],
  gtaFees?: Record<string, number[]>,
  commissionRules?: FeeRule[],
  fixedFeeRules?: FeeRule[]
): PricingResult => {
  let gtaFee = 0;
  let commissionRate = 0;
  let fixedFee = 0;

  const isFinal = targetSettlement !== undefined && targetSettlement > 0;

  const rule = manualRateCard?.enabled && marketplace === Marketplace.MYNTRA 
    ? findManualRule(manualRateCard.rules, aisp, articleType, level)
    : undefined;

  if (rule) {
    gtaFee = rule.gtaFee;
    commissionRate = rule.commissionPercent;
    fixedFee = rule.fixedFee;
  } else {
    const activeGtaRanges = gtaRanges || [
      { min: 0, max: 299, label: '0-299' },
      { min: 300, max: 499, label: '300-499' },
      { min: 500, max: 999, label: '500-999' },
      { min: 1000, max: 1999, label: '1000-1999' },
      { min: 2000, max: Infinity, label: '>2000' }
    ];
    
    const activeGtaFees = gtaFees || {
      'Level 1': [0, 59, 59, 94, 171, 207],
      'Level 2': [0, 83, 83, 118, 195, 230],
      'Level 3': [0, 100, 106, 148, 230, 266],
      'Level 4': [0, 100, 153, 189, 277, 313],
      'Level 5': [0, 100, 189, 283, 395, 431]
    };

    const feesForLevel = activeGtaFees[level] || activeGtaFees['Level 2'] || [0, 0, 0, 0, 0, 0];
    
    // Default fallback calculation matches index offset if structure differs
    const offset = (feesForLevel.length > activeGtaRanges.length) ? 1 : 0;
    
    gtaFee = feesForLevel[offset]; 
    for (let i = 0; i < activeGtaRanges.length; i++) {
      const feeCandidate = feesForLevel[i + offset] ?? 0; 
      const range = activeGtaRanges[i];
      const potentialCP = aisp + feeCandidate;
      if (potentialCP >= range.min && potentialCP <= range.max) {
        gtaFee = feeCandidate;
        break;
      }
    }

    const sellerPrice = aisp - gtaFee;
    commissionRate = getCommissionRate(sellerPrice, articleType, brand, commissionRules, isFinal);
    fixedFee = getFixedFee(sellerPrice, articleType, brand, fixedFeeRules, isFinal);
  }

  const customerPrice = aisp + gtaFee;
  const sellerPrice = aisp - gtaFee; 

  const productGstRate = aisp >= 1000 ? 0.18 : 0.12;
  const taxableValue = aisp / (1 + productGstRate);
  const tcs = sellerPrice * TCS_RATE_VAL;
  const tds = sellerPrice * TDS_RATE_VAL;
  
  // Myntra commission is calculated on Seller Price (aisp - gtaFee).
  // The rate card specifies the BASE commission % exclusive of GST.
  // We calculate base commission, then add 18% GST on top.
  const baseCommission = (sellerPrice * commissionRate) / 100;
  const gstOnCommission = baseCommission * GST_RATE;
  const totalCommission = baseCommission + gstOnCommission;

  const baseFixedFee = fixedFee;
  const gstOnFixedFee = baseFixedFee * GST_RATE;
  const totalFixedFee = baseFixedFee + gstOnFixedFee;

  let reverseLogisticsBaseFee = 0;
  let totalReverseFee = 0;
  const gstOnReverse = 0; // Not applicable or included for custom manual fixed value
  if (isReverseLogistics || (buffers && buffers.returnPercent > 0)) {
    if (buffers && buffers.returnType === MarginType.VALUE) {
      totalReverseFee = buffers.returnPercent;
    } else {
      if (reverseMode === ReverseLogisticsMode.FIXED) {
        const feesMap = REVERSE_LOGISTICS_FEES[level] || REVERSE_LOGISTICS_FEES.Default;
        reverseLogisticsBaseFee = feesMap[reverseRegion] || 157;
        if (buffers && buffers.returnPercent > 0) {
          reverseLogisticsBaseFee = reverseLogisticsBaseFee * (buffers.returnPercent / 100);
        }
      } else {
        const percent = buffers ? buffers.returnPercent : reversePercent;
        const basis = tp !== undefined ? tp : aisp;
        reverseLogisticsBaseFee = (basis * percent) / 100;
      }
      const gstOnReverseFlat = reverseLogisticsBaseFee * GST_RATE;
      totalReverseFee = reverseMode === ReverseLogisticsMode.FIXED 
        ? (reverseLogisticsBaseFee + gstOnReverseFlat)
        : reverseLogisticsBaseFee;
    }
  }
  
  // New buffers logic removed for Marketing & Offers
  const totalActualSettlement = aisp - totalCommission - totalFixedFee - tcs - tds - totalReverseFee;

  let finalCommission = totalCommission;
  let finalBaseCommission = baseCommission;
  let finalActualSettlement = totalActualSettlement;

  // Absorb the jump discrepancy into platform commission to offer 100% exact settlement matching
  if (targetSettlement !== undefined && targetSettlement > 0) {
    const discrepancy = targetSettlement - totalActualSettlement;
    finalCommission = totalCommission - discrepancy;
    finalBaseCommission = baseCommission - (discrepancy / 1.18);
    finalActualSettlement = targetSettlement;
  }

  // Derive MRP for display purposes (just an estimate or mock for the format)
  const mrp = Math.round(aisp / 0.35); // Example: assuming 65% trade discount as per screenshot
  const tradePercent = 65;

  return {
    aisp, 
    customerPrice, 
    mrp,
    tradePercent,
    commissionRate, 
    commission: finalCommission, 
    baseCommission: finalBaseCommission,
    fixedFee: totalFixedFee, 
    baseFixedFee,
    logisticsFee: gtaFee,
    reverseLogisticsFee: totalReverseFee, 
    reverseMode, 
    reversePercent, 
    gstOnFees: gstOnCommission + gstOnFixedFee + (reverseMode === ReverseLogisticsMode.FIXED ? gstOnReverse : 0),
    productGst: aisp - taxableValue,
    tcs, 
    tds, 
    totalActualSettlement: finalActualSettlement, 
    marketplace: Marketplace.MYNTRA, 
    brand, 
    articleType, 
    level
  };
};

export const findAISPForTarget = (
  target: number,
  level: string,
  articleType: ArticleType,
  isReverseLogistics: boolean,
  reverseRegion: Region,
  reverseMode: ReverseLogisticsMode = ReverseLogisticsMode.FIXED,
  reversePercent: number = 0,
  marketplace: Marketplace = Marketplace.MYNTRA,
  brand: string = 'Bellstone',
  manualRateCard?: ManualRateCard,
  buffers?: BusinessBuffers,
  tp?: number,
  gtaRanges?: { min: number; max: number; label: string }[],
  gtaFees?: Record<string, number[]>,
  commissionRules?: FeeRule[],
  fixedFeeRules?: FeeRule[]
): number => {
  // PLATFORM FEE SOLVER 2.0
  // Since payout is piecewise linear with jumps, we use a robust search
  
  // Optimized Search: 
  // AISP is generally between target and target * 2 (with fees and commissions)
  // We use a wider bracket to be safe.
  let left = target;
  let right = target * 10; // Extremely safe upper bound

  for (let i = 0; i < 60; i++) {
    const mid = (left + right) / 2;
    const res = calculateBreakdown(
      mid, 
      level, 
      articleType, 
      isReverseLogistics, 
      reverseRegion, 
      reverseMode, 
      reversePercent, 
      Marketplace.MYNTRA, 
      brand, 
      manualRateCard, 
      buffers, 
      tp, 
      undefined, 
      gtaRanges, 
      gtaFees, 
      commissionRules,
      fixedFeeRules
    );
    
    if (res.totalActualSettlement < target) {
      left = mid;
    } else {
      right = mid;
    }
  }

  return (left + right) / 2;
};
