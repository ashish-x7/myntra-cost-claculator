import { findAISPForTarget, calculateBreakdown } from './services/calculatorService';
import { ArticleType, Region, ReverseLogisticsMode, Marketplace, MarginType } from './types';

const buffers = {
  marginType: MarginType.PERCENT,
  marginAdjustment: 15,
  returnType: MarginType.VALUE,
  returnPercent: 165,
  adsPercent: 0,
  dealDiscountPercent: 0,
  reviewValue: 0,
  marginPercent: 0
};

const tp = 500;
const target = 500 * 1.15 + 165; // 740

const aisp = findAISPForTarget(
  target,
  'Level 2',
  ArticleType.SHIRTS,
  true,
  Region.LOCAL,
  ReverseLogisticsMode.FIXED,
  0,
  Marketplace.MYNTRA,
  'Bellstone',
  undefined,
  buffers,
  tp
);

const res = calculateBreakdown(
  aisp,
  'Level 2',
  ArticleType.SHIRTS,
  true,
  Region.LOCAL,
  ReverseLogisticsMode.FIXED,
  0,
  Marketplace.MYNTRA,
  'Bellstone',
  undefined,
  buffers,
  tp,
  target
);

console.log('Target Payout: ' + target);
console.log('AISP: ' + aisp);
console.log('Seller Price: ' + (aisp - res.logisticsFee));
console.log('GTA Fee: ' + res.logisticsFee);
