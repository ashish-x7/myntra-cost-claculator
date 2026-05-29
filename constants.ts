
import { Level, ArticleType, MasterCategory, Gender, ArticleConfig, Brand } from './types';

export const LOGISTICS_RANGES = [
  { min: 0, max: 299, label: '0-299' },
  { min: 300, max: 499, label: '300-499' },
  { min: 500, max: 999, label: '500-999' },
  { min: 1000, max: 1999, label: '1000-1999' },
  { min: 2000, max: Infinity, label: '>2000' }
];

export const PLATFORM_LOGISTICS_FEES: Record<Level, number[]> = {
  [Level.LEVEL_1]: [0, 59, 59, 94, 171, 207],
  [Level.LEVEL_2]: [0, 83, 83, 118, 195, 230],
  [Level.LEVEL_3]: [0, 100, 106, 148, 230, 266],
  [Level.LEVEL_4]: [0, 100, 153, 189, 277, 313],
  [Level.LEVEL_5]: [0, 100, 189, 283, 395, 431]
};

export const REVERSE_LOGISTICS_FEES: Record<string, { Local: number; Zone: number; National: number }> = {
  [Level.LEVEL_1]: { Local: 106, Zone: 127, National: 182 },
  [Level.LEVEL_2]: { Local: 127, Zone: 168, National: 233 },
  [Level.LEVEL_3]: { Local: 157, Zone: 209, National: 274 },
  [Level.LEVEL_4]: { Local: 229, Zone: 291, National: 346 },
  [Level.LEVEL_5]: { Local: 475, Zone: 557, National: 664 },
  'Level 94': { Local: 831, Zone: 1191, National: 1833 },
  'Level 95': { Local: 1012, Zone: 1490, National: 2240 },
  'Level 96': { Local: 1356, Zone: 1994, National: 2799 },
  'Level 97': { Local: 2066, Zone: 3019, National: 4502 },
  'Level 98': { Local: 3562, Zone: 5168, National: 6710 },
  'Default': { Local: 157, Zone: 209, National: 274 }
};

export const ARTICLE_SPECIFICATIONS: Record<ArticleType, ArticleConfig> = {
  [ArticleType.BOXERS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.TSHIRTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.JEANS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.TROUSERS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.SHORTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.INNERWEAR_VESTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.SWEATSHIRTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.SWEATERS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.JACKETS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.PYJAMAS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.SHIRTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.KURTAS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.DRESSES]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.TRACK_PANTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.TOPS]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.NIGHTDRESS]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.FLIP_FLOPS]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.TRACKSUITS]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_3 },
  [ArticleType.WAISTCOAT]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.SOCKS]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.ETHNIC_DRESSES]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.HANDBAGS]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_3 },
  [ArticleType.SUITS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_4 },
  [ArticleType.DUNGREES]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_2 },
  [ArticleType.BLAZERS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_3 },
  [ArticleType.SAREE_ACCESSORIES]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.SAREES]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.BRA]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.BRIEFS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.TRUNK]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.LEGGINGS]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.SKIRTS]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.JUMPSUIT]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.ROMPERS]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.KURTA_SETS]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.LEHENGA_CHOLI]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_4 },
  [ArticleType.BODY_CREAM_LOTION]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.FACIAL_OIL]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.LOUNGE_PANTS]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.UNDER_EYE_CREAM]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.FLATS]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.INTIMATE_HYGIENE]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.HEELS]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.BINDI]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.CLUTCHES]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.MAKEUP_KIT]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.ACCESSORY_GIFT_SET]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_3 },
  [ArticleType.HEADBAND]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.CAPS]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.NIGHT_CREAM]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.ORGANISERS]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_2 },
  [ArticleType.PROTEINS]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_2 },
  [ArticleType.SOAP]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.SKIN_CARE_COMBO]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_2 },
  [ArticleType.TRAVEL_ACCESSORY]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.PERFUME]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_2 },
  [ArticleType.FREE_GIFTS]: { category: MasterCategory.FREE_ITEMS, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
  [ArticleType.OTHER]: { category: MasterCategory.APPAREL, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
};

export const ARTICLE_LEVEL_MAPPING: Record<ArticleType, Level> = Object.entries(ARTICLE_SPECIFICATIONS).reduce((acc, [key, value]) => {
  acc[key as ArticleType] = value.defaultLevel;
  return acc;
}, {} as Record<ArticleType, Level>);

// Commission Slabs (inclusive of 18% GST as per user screenshots)
export const BRAND_COMMISSION_SLABS: Record<string, Record<string, { lower: number; upper: number; rate: number }[]>> = {
  default: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ]
  },
  [Brand.CB_COLEBROOK]: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ],
    [ArticleType.TROUSERS]: [
      { lower: 0, upper: 500, rate: 1.0 },
      { lower: 500, upper: 600, rate: 1.0 },
      { lower: 600, upper: 800, rate: 7.0 },
      { lower: 800, upper: 1000, rate: 15.0 },
      { lower: 1000, upper: 2000, rate: 15.0 },
      { lower: 2000, upper: Infinity, rate: 15.0 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 600, rate: 1.0 },
      { lower: 600, upper: 800, rate: 3.0 },
      { lower: 800, upper: 1000, rate: 15.0 },
      { lower: 1000, upper: 2000, rate: 15.0 },
      { lower: 2000, upper: Infinity, rate: 15.0 }
    ],
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 750, rate: 2.0 },
      { lower: 750, upper: Infinity, rate: 15.0 }
    ]
  },
  [Brand.INDOPRIMO]: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ],
    [ArticleType.DRESSES]: [
      { lower: 0, upper: 800, rate: 4.0 },
      { lower: 800, upper: 1000, rate: 18.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 17.0 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 600, rate: 1.0 },
      { lower: 600, upper: 800, rate: 3.0 },
      { lower: 800, upper: 1000, rate: 15.0 },
      { lower: 1000, upper: 2000, rate: 15.0 },
      { lower: 2000, upper: Infinity, rate: 15.0 }
    ],
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 750, rate: 2.0 },
      { lower: 750, upper: Infinity, rate: 15.0 }
    ]
  },
  [Brand.DEELMO]: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ],
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 750, rate: 2.0 },
      { lower: 750, upper: Infinity, rate: 15.0 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 600, rate: 1.0 },
      { lower: 600, upper: 800, rate: 3.0 },
      { lower: 800, upper: 1000, rate: 15.0 },
      { lower: 1000, upper: 2000, rate: 15.0 },
      { lower: 2000, upper: Infinity, rate: 15.0 }
    ]
  },
  [Brand.BELLSTONE]: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ],
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 750, rate: 2.0 },
      { lower: 750, upper: Infinity, rate: 15.0 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 600, rate: 1.0 },
      { lower: 600, upper: 800, rate: 3.0 },
      { lower: 800, upper: 1000, rate: 15.0 },
      { lower: 1000, upper: 2000, rate: 15.0 },
      { lower: 2000, upper: Infinity, rate: 15.0 }
    ]
  }
};

// Exact Fixed Fee Slaps from User Screenshots (Myntra only) - Base Fees (exclusive of GST)
export const BRAND_FIXED_FEE_SLABS: Record<string, Record<string, { lower: number; upper: number; fee: number }[]>> = {
  default: {
    ALL: [
      { lower: 0, upper: 300, fee: 27 },
      { lower: 300, upper: 500, fee: 27 },
      { lower: 500, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  },
  [Brand.CB_COLEBROOK]: {
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 300, fee: 4 },
      { lower: 300, upper: 400, fee: 5 },
      { lower: 400, upper: 500, fee: 6 },
      { lower: 500, upper: 600, fee: 7 },
      { lower: 600, upper: 800, fee: 27 },
      { lower: 800, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ],
    [ArticleType.TROUSERS]: [
      { lower: 0, upper: 500, fee: 0 },
      { lower: 500, upper: 600, fee: 3 },
      { lower: 600, upper: 800, fee: 27 },
      { lower: 800, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  },
  [Brand.INDOPRIMO]: {
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 300, fee: 4 },
      { lower: 300, upper: 400, fee: 5 },
      { lower: 400, upper: 500, fee: 6 },
      { lower: 500, upper: 600, fee: 7 },
      { lower: 600, upper: 800, fee: 27 },
      { lower: 800, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ],
    [ArticleType.DRESSES]: [
      { lower: 0, upper: 400, fee: 0 },
      { lower: 400, upper: 500, fee: 0 },
      { lower: 500, upper: 600, fee: 3 },
      { lower: 600, upper: 700, fee: 27 },
      { lower: 700, upper: 800, fee: 27 },
      { lower: 800, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  },
  [Brand.DEELMO]: {
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 400, fee: 0 },
      { lower: 400, upper: 500, fee: 4 },
      { lower: 500, upper: 600, fee: 9 },
      { lower: 600, upper: 750, fee: 27 },
      { lower: 750, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 300, fee: 4 },
      { lower: 300, upper: 400, fee: 5 },
      { lower: 400, upper: 500, fee: 6 },
      { lower: 500, upper: 600, fee: 7 },
      { lower: 600, upper: 800, fee: 27 },
      { lower: 800, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  },
  [Brand.BELLSTONE]: {
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 400, fee: 0 },
      { lower: 400, upper: 500, fee: 4 },
      { lower: 500, upper: 600, fee: 9 },
      { lower: 600, upper: 750, fee: 27 },
      { lower: 750, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 300, fee: 4 },
      { lower: 300, upper: 400, fee: 5 },
      { lower: 400, upper: 500, fee: 6 },
      { lower: 500, upper: 600, fee: 7 },
      { lower: 600, upper: 800, fee: 27 },
      { lower: 800, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  }
};

export const FREE_ITEMS_COMMISSION_SLABS = [
  { lower: 0, upper: 499, rate: 10.62 }, // 9 * 1.18
  { lower: 500, upper: Infinity, rate: 21.24 } // 18 * 1.18
];

export const GST_RATE = 0.18;
export const PRODUCT_GST_RATE = 0.18;
export const TCS_RATE_VAL = 0.0047; 
export const TDS_RATE_VAL = 0.00095;
