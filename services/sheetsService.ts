import { ArticleConfig, Level, FeeRule } from '../types';

const SCRIPT_URL = import.meta.env.VITE_GOOGLE_APPS_SCRIPT_URL;

export interface AppMasterData {
  parties: string[];
  globalCategoryMapping: Record<string, ArticleConfig>;
  globalLogistics: Record<string, number[]>;
  globalReverseLogistics: Record<string, { Local: number; Zone: number; National: number }>;
  commissionRules: FeeRule[];
  fixedFeeRules: FeeRule[];
}

export const fetchMasterData = async (): Promise<AppMasterData> => {
  if (!SCRIPT_URL) throw new Error("Google Apps Script URL is missing");

  const response = await fetch(SCRIPT_URL);
  if (!response.ok) throw new Error("Failed to fetch from Google Sheets");

  const data = await response.json();

  const categoryMapping: Record<string, ArticleConfig> = {};
  if (data.global_category_mapping) {
    data.global_category_mapping.forEach((row: any) => {
      if (row.ArticleType) {
        categoryMapping[row.ArticleType] = {
          category: row.MasterCategory as any,
          gender: row.Gender as any,
          defaultLevel: row.DefaultLevel as Level
        };
      }
    });
  }

  const logistics: Record<string, number[]> = {};
  if (data.global_logistics) {
    data.global_logistics.forEach((row: any) => {
      if (row.Level) {
        logistics[row.Level] = [0, Number(row.Tier1), Number(row.Tier2), Number(row.Tier3), Number(row.Tier4), Number(row.Tier5)];
      }
    });
  }

  const reverseLogistics: Record<string, { Local: number; Zone: number; National: number }> = {};
  if (data.global_reverse_logistics) {
    data.global_reverse_logistics.forEach((row: any) => {
      if (row.Level) {
        reverseLogistics[row.Level] = {
          Local: Number(row.LocalFee),
          Zone: Number(row.ZoneFee),
          National: Number(row.NationalFee)
        };
      }
    });
  }

  const commissions: FeeRule[] = (data.vendor_commissions || []).map((row: any) => ({
    brand: row.brand,
    category: 'ALL',
    articleType: row.ArticleType,
    gender: 'ALL',
    lowerLimit: Number(row.LowerLimit),
    upperLimit: row.UpperLimit === 'MAX' || row.UpperLimit === '' || row.UpperLimit === 'Infinity' ? Infinity : Number(row.UpperLimit),
    commissionPercent: Number(row.CommissionPercent),
    fixedFee: 0
  }));

  const fixedFees: FeeRule[] = (data.vendor_fixed_fees || []).map((row: any) => ({
    brand: row.brand,
    category: 'ALL',
    articleType: row.ArticleType,
    gender: 'ALL',
    lowerLimit: Number(row.LowerLimit),
    upperLimit: row.UpperLimit === 'MAX' || row.UpperLimit === '' || row.UpperLimit === 'Infinity' ? Infinity : Number(row.UpperLimit),
    commissionPercent: 0,
    fixedFee: Number(row.FixedFee)
  }));

  return {
    parties: data.parties || [],
    globalCategoryMapping: categoryMapping,
    globalLogistics: logistics,
    globalReverseLogistics: reverseLogistics,
    commissionRules: commissions,
    fixedFeeRules: fixedFees
  };
};

export const saveCommissionRules = async (party: string, rules: FeeRule[]): Promise<boolean> => {
  if (!SCRIPT_URL) throw new Error("Google Apps Script URL is missing");

  const payload = {
    action: 'save_commission',
    party,
    rules: rules.map(r => ({
      articleType: r.articleType,
      lowerLimit: r.lowerLimit,
      upperLimit: r.upperLimit === Infinity ? 'MAX' : r.upperLimit,
      commissionPercent: r.commissionPercent
    }))
  };

  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain'
    }
  });

  const data = await response.json();
  return data.status === 'success';
};

export const saveFixedFeeRules = async (party: string, rules: FeeRule[]): Promise<boolean> => {
  if (!SCRIPT_URL) throw new Error("Google Apps Script URL is missing");

  const payload = {
    action: 'save_fixed_fee',
    party,
    rules: rules.map(r => ({
      articleType: r.articleType,
      lowerLimit: r.lowerLimit,
      upperLimit: r.upperLimit === Infinity ? 'MAX' : r.upperLimit,
      fixedFee: r.fixedFee
    }))
  };

  const response = await fetch(SCRIPT_URL, {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'text/plain'
    }
  });

  const data = await response.json();
  return data.status === 'success';
};

export const saveGlobalLogistics = async (logisticsMap: Record<string, number[]>): Promise<boolean> => {
  if (!SCRIPT_URL) throw new Error("Google Apps Script URL is missing");

  const rules = Object.keys(logisticsMap).map(level => {
    const fees = logisticsMap[level];
    return {
      Level: level,
      Tier1: fees[1] || 0,
      Tier2: fees[2] || 0,
      Tier3: fees[3] || 0,
      Tier4: fees[4] || 0,
      Tier5: fees[5] || 0
    };
  });

  const payload = { action: 'save_global_logistics', rules };
  const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain' } });
  return (await response.json()).status === 'success';
};

export const saveGlobalCategoryMapping = async (categoryMap: Record<string, ArticleConfig>): Promise<boolean> => {
  if (!SCRIPT_URL) throw new Error("Google Apps Script URL is missing");

  const rules = Object.keys(categoryMap).map(articleType => ({
    ArticleType: articleType,
    MasterCategory: categoryMap[articleType].category,
    Gender: categoryMap[articleType].gender,
    DefaultLevel: categoryMap[articleType].defaultLevel
  }));

  const payload = { action: 'save_global_category', rules };
  const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain' } });
  return (await response.json()).status === 'success';
};

export const saveGlobalReverseLogistics = async (reverseLogisticsMap: Record<string, { Local: number; Zone: number; National: number }>): Promise<boolean> => {
  if (!SCRIPT_URL) throw new Error("Google Apps Script URL is missing");

  const rules = Object.keys(reverseLogisticsMap).map(level => ({
    Level: level,
    LocalFee: reverseLogisticsMap[level].Local,
    ZoneFee: reverseLogisticsMap[level].Zone,
    NationalFee: reverseLogisticsMap[level].National
  }));

  const payload = { action: 'save_global_reverse_logistics', rules };
  const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain' } });
  return (await response.json()).status === 'success';
};

export const saveParties = async (parties: string[]): Promise<boolean> => {
  if (!SCRIPT_URL) throw new Error("Google Apps Script URL is missing");
  const payload = { action: 'save_parties', parties };
  const response = await fetch(SCRIPT_URL, { method: 'POST', body: JSON.stringify(payload), headers: { 'Content-Type': 'text/plain' } });
  return (await response.json()).status === 'success';
};
