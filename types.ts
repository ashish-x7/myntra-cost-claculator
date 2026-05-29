export enum Level {
  LEVEL_1 = 'Level 1',
  LEVEL_2 = 'Level 2',
  LEVEL_3 = 'Level 3',
  LEVEL_4 = 'Level 4',
  LEVEL_5 = 'Level 5'
}

export enum Marketplace {
  MYNTRA = 'Myntra'
}

export enum Brand {
  BELLSTONE = 'Bellstone',
  INDOPRIMO = 'INDOPRIMO',
  DEELMO = 'Deelmo',
  CB_COLEBROOK = 'CB-COLEBROOK',
  OTHER = 'Other'
}

export enum Region {
  LOCAL = 'Local',
  ZONE = 'Zone',
  NATIONAL = 'National'
}

export enum ReverseLogisticsMode {
  FIXED = 'Fixed Value',
  PERCENTAGE = 'Percentage %'
}

export enum Gender {
  MEN = 'Men',
  WOMEN = 'Women',
  UNISEX = 'Unisex'
}

export enum MasterCategory {
  APPAREL = 'APPAREL',
  FREE_ITEMS = 'FREE_ITEMS'
}

export enum ArticleType {
  BOXERS = 'Boxers',
  TSHIRTS = 'Tshirts',
  JEANS = 'Jeans',
  TROUSERS = 'Trousers',
  SHORTS = 'Shorts',
  INNERWEAR_VESTS = 'Innerwear Vests',
  SWEATSHIRTS = 'Sweatshirts',
  SWEATERS = 'Sweaters',
  JACKETS = 'Jackets',
  PYJAMAS = 'Pyjamas',
  SHIRTS = 'Shirts',
  KURTAS = 'Kurtas',
  DRESSES = 'Dresses',
  TRACK_PANTS = 'Track Pants',
  TOPS = 'Tops',
  NIGHTDRESS = 'Nightdress',
  FLIP_FLOPS = 'Flip Flops',
  TRACKSUITS = 'Tracksuits',
  WAISTCOAT = 'Waistcoat',
  SOCKS = 'Socks',
  ETHNIC_DRESSES = 'Ethnic Dresses',
  HANDBAGS = 'Handbags',
  SUITS = 'Suits',
  DUNGREES = 'Dungarees',
  BLAZERS = 'Blazers',
  SAREE_ACCESSORIES = 'Saree Accessories',
  SAREES = 'Sarees',
  BRA = 'Bra',
  BRIEFS = 'Briefs',
  TRUNK = 'Trunk',
  LEGGINGS = 'Leggings',
  SKIRTS = 'Skirts',
  JUMPSUIT = 'Jumpsuit',
  ROMPERS = 'Rompers',
  KURTA_SETS = 'Kurta Sets',
  LEHENGA_CHOLI = 'Lehenga Choli',
  BODY_CREAM_LOTION = 'Body Cream and Lotion',
  FACIAL_OIL = 'Facial Oil',
  LOUNGE_PANTS = 'Lounge Pants',
  UNDER_EYE_CREAM = 'Under Eye Creams and Serums',
  FLATS = 'Flats',
  INTIMATE_HYGIENE = 'Intimate Hygiene',
  HEELS = 'Heels',
  BINDI = 'Bindi',
  CLUTCHES = 'Clutches',
  MAKEUP_KIT = 'Makeup Kit',
  ACCESSORY_GIFT_SET = 'Accessory Gift Set',
  HEADBAND = 'Headband',
  CAPS = 'Caps',
  NIGHT_CREAM = 'Night Cream',
  ORGANISERS = 'Organisers',
  PROTEINS = 'Proteins',
  SOAP = 'Soap',
  SKIN_CARE_COMBO = 'Skin Care Combo',
  TRAVEL_ACCESSORY = 'Travel Accessory',
  PERFUME = 'Perfume',
  FREE_GIFTS = 'Free Gifts',
  OTHER = 'Other'
}

export interface ArticleConfig {
  category: MasterCategory;
  gender: Gender;
  defaultLevel: Level;
}

export enum MarginType {
  PERCENT = 'PERCENT',
  VALUE = 'VALUE'
}

export interface BusinessBuffers {
  marginPercent: number;
  marginType: MarginType;
  marginAdjustment: number; // The manual extra
  returnPercent: number;
  returnType?: MarginType;
  purchaseTaxPercent?: number;
}

// Added missing interface ManualRateRule
export interface ManualRateRule {
  articleType: ArticleType | 'ALL';
  level: Level | 'ALL';
  minPrice: number;
  maxPrice: number;
  gtaFee: number;
  commissionPercent: number;
  fixedFee: number;
}

// Added missing interface ManualRateCard
export interface ManualRateCard {
  enabled: boolean;
  rules: ManualRateRule[];
}

export interface FeeRule {
  brand: string;
  category: string;
  articleType: string;
  gender: string;
  lowerLimit: number;
  upperLimit: number;
  commissionPercent: number;
  fixedFee: number;
}

export interface PricingResult {
  aisp: number;
  customerPrice: number;
  mrp: number;
  tradePercent: number;
  commissionRate: number;
  commission: number;
  fixedFee: number;
  logisticsFee: number;
  reverseLogisticsFee: number;
  reverseMode: ReverseLogisticsMode;
  reversePercent?: number;
  gstOnFees: number;
  productGst: number;
  baseCommission: number;
  baseFixedFee: number;
  tcs: number;
  tds: number;
  totalActualSettlement: number;
  marketplace?: Marketplace;
  brand?: string;
  
  // Metadata
  styleId?: string;
  articleType?: ArticleType;
  gender?: Gender;
  masterCategory?: MasterCategory;
  level?: Level;
  baseTp?: number;
  targetSettlement?: number;
}
