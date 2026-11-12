/**
 * Actually Free Taxes - Tax Calculation Engine (TypeScript)
 * Supports 2024 & 2025 IRS federal tax rules, brackets, and transparent formula builders.
 */

import {
  TaxYear,
  FilingStatus,
  TaxAppState,
  W2Data,
  StateTaxLine,
  BracketDef,
  BracketDetail,
  CalculationResult,
  TaxBeforeCreditsResult,
  FinalResultCalculation,
  FicaCalculation,
  ScheduleECalculation,
  OtherTaxesCalculation,
  EffectiveRateCalculation,
  StateTaxCalculation,
  StateReturnCalculation,
  UnifiedTaxSummary,
  StateOtherStateCredit,
  UnifiedTaxJurisdictionLine,
  ItemizedDeductionCalculation,
  CapitalGainsCalculation,
  TaxCalculationSummary
} from './types.js';

interface YearTaxRules {
  standardDeduction: Record<FilingStatus, number>;
  ssWageLimit: number;
  ssRate: number;
  medicareRate: number;
  additionalMedicareRate: number;
  additionalMedicareThreshold: Record<FilingStatus, number>;
  niitRate: number;
  niitThreshold: Record<FilingStatus, number>;
  childTaxCreditPerChild: number;
  childTaxCreditRefundableMax: number;
  childTaxCreditPhaseout: Record<FilingStatus, number>;
  brackets: Record<FilingStatus, BracketDef[]>;
  ltcgBrackets: Record<FilingStatus, BracketDef[]>;
}

export const TAX_CONSTANTS: Record<TaxYear, YearTaxRules> = {
  2024: {
    standardDeduction: {
      single: 14600,
      married_joint: 29200,
      married_separate: 14600,
      head_of_household: 21900
    },
    ssWageLimit: 168600,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: {
      single: 200000,
      married_joint: 250000,
      married_separate: 125000,
      head_of_household: 200000
    },
    niitRate: 0.038,
    niitThreshold: {
      single: 200000,
      married_joint: 250000,
      married_separate: 125000,
      head_of_household: 200000
    },
    childTaxCreditPerChild: 2000,
    childTaxCreditRefundableMax: 1700,
    childTaxCreditPhaseout: {
      single: 200000,
      married_joint: 400000,
      married_separate: 200000,
      head_of_household: 200000
    },
    brackets: {
      single: [
        { rate: 0.10, min: 0, max: 11600 },
        { rate: 0.12, min: 11600, max: 47150 },
        { rate: 0.22, min: 47150, max: 100525 },
        { rate: 0.24, min: 100525, max: 191950 },
        { rate: 0.32, min: 191950, max: 243725 },
        { rate: 0.35, min: 243725, max: 609350 },
        { rate: 0.37, min: 609350, max: Infinity }
      ],
      married_joint: [
        { rate: 0.10, min: 0, max: 23200 },
        { rate: 0.12, min: 23200, max: 94300 },
        { rate: 0.22, min: 94300, max: 201050 },
        { rate: 0.24, min: 201050, max: 383900 },
        { rate: 0.32, min: 383900, max: 487450 },
        { rate: 0.35, min: 487450, max: 731200 },
        { rate: 0.37, min: 731200, max: Infinity }
      ],
      married_separate: [
        { rate: 0.10, min: 0, max: 11600 },
        { rate: 0.12, min: 11600, max: 47150 },
        { rate: 0.22, min: 47150, max: 100525 },
        { rate: 0.24, min: 100525, max: 191950 },
        { rate: 0.32, min: 191950, max: 243725 },
        { rate: 0.35, min: 243725, max: 365600 },
        { rate: 0.37, min: 365600, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.10, min: 0, max: 16550 },
        { rate: 0.12, min: 16550, max: 63100 },
        { rate: 0.22, min: 63100, max: 100500 },
        { rate: 0.24, min: 100500, max: 191950 },
        { rate: 0.32, min: 191950, max: 243700 },
        { rate: 0.35, min: 243700, max: 609350 },
        { rate: 0.37, min: 609350, max: Infinity }
      ]
    },
    ltcgBrackets: {
      single: [
        { rate: 0.00, min: 0, max: 47025 },
        { rate: 0.15, min: 47025, max: 518900 },
        { rate: 0.20, min: 518900, max: Infinity }
      ],
      married_joint: [
        { rate: 0.00, min: 0, max: 94050 },
        { rate: 0.15, min: 94050, max: 583750 },
        { rate: 0.20, min: 583750, max: Infinity }
      ],
      married_separate: [
        { rate: 0.00, min: 0, max: 47025 },
        { rate: 0.15, min: 47025, max: 291850 },
        { rate: 0.20, min: 291850, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.00, min: 0, max: 63000 },
        { rate: 0.15, min: 63000, max: 551350 },
        { rate: 0.20, min: 551350, max: Infinity }
      ]
    }
  },
  2025: {
    standardDeduction: {
      single: 15000,
      married_joint: 30000,
      married_separate: 15000,
      head_of_household: 22500
    },
    ssWageLimit: 176100,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: {
      single: 200000,
      married_joint: 250000,
      married_separate: 125000,
      head_of_household: 200000
    },
    niitRate: 0.038,
    niitThreshold: {
      single: 200000,
      married_joint: 250000,
      married_separate: 125000,
      head_of_household: 200000
    },
    childTaxCreditPerChild: 2000,
    childTaxCreditRefundableMax: 1700,
    childTaxCreditPhaseout: {
      single: 200000,
      married_joint: 400000,
      married_separate: 200000,
      head_of_household: 200000
    },
    brackets: {
      single: [
        { rate: 0.10, min: 0, max: 11925 },
        { rate: 0.12, min: 11925, max: 48475 },
        { rate: 0.22, min: 48475, max: 103350 },
        { rate: 0.24, min: 103350, max: 197300 },
        { rate: 0.32, min: 197300, max: 250525 },
        { rate: 0.35, min: 250525, max: 626350 },
        { rate: 0.37, min: 626350, max: Infinity }
      ],
      married_joint: [
        { rate: 0.10, min: 0, max: 23850 },
        { rate: 0.12, min: 23850, max: 96950 },
        { rate: 0.22, min: 96950, max: 206700 },
        { rate: 0.24, min: 206700, max: 394600 },
        { rate: 0.32, min: 394600, max: 501050 },
        { rate: 0.35, min: 501050, max: 751600 },
        { rate: 0.37, min: 751600, max: Infinity }
      ],
      married_separate: [
        { rate: 0.10, min: 0, max: 11925 },
        { rate: 0.12, min: 11925, max: 48475 },
        { rate: 0.22, min: 48475, max: 103350 },
        { rate: 0.24, min: 103350, max: 197300 },
        { rate: 0.32, min: 197300, max: 250525 },
        { rate: 0.35, min: 250525, max: 375800 },
        { rate: 0.37, min: 375800, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.10, min: 0, max: 17000 },
        { rate: 0.12, min: 17000, max: 64850 },
        { rate: 0.22, min: 64850, max: 103350 },
        { rate: 0.24, min: 103350, max: 197300 },
        { rate: 0.32, min: 197300, max: 250500 },
        { rate: 0.35, min: 250500, max: 626350 },
        { rate: 0.37, min: 626350, max: Infinity }
      ]
    },
    ltcgBrackets: {
      single: [
        { rate: 0.00, min: 0, max: 48350 },
        { rate: 0.15, min: 48350, max: 533400 },
        { rate: 0.20, min: 533400, max: Infinity }
      ],
      married_joint: [
        { rate: 0.00, min: 0, max: 96700 },
        { rate: 0.15, min: 96700, max: 600050 },
        { rate: 0.20, min: 600050, max: Infinity }
      ],
      married_separate: [
        { rate: 0.00, min: 0, max: 48350 },
        { rate: 0.15, min: 48350, max: 300000 },
        { rate: 0.20, min: 300000, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.00, min: 0, max: 64750 },
        { rate: 0.15, min: 64750, max: 566700 },
        { rate: 0.20, min: 566700, max: Infinity }
      ]
    }
  }
};

export const NYC_LOCAL_BRACKETS: Record<FilingStatus, BracketDef[]> = {
  single: [
    { rate: 0.03078, min: 0, max: 12000 },
    { rate: 0.03762, min: 12000, max: 25000 },
    { rate: 0.03819, min: 25000, max: 50000 },
    { rate: 0.03876, min: 50000, max: Infinity }
  ],
  married_joint: [
    { rate: 0.03078, min: 0, max: 21600 },
    { rate: 0.03762, min: 21600, max: 45000 },
    { rate: 0.03819, min: 45000, max: 90000 },
    { rate: 0.03876, min: 90000, max: Infinity }
  ],
  married_separate: [
    { rate: 0.03078, min: 0, max: 12000 },
    { rate: 0.03762, min: 12000, max: 25000 },
    { rate: 0.03819, min: 25000, max: 50000 },
    { rate: 0.03876, min: 50000, max: Infinity }
  ],
  head_of_household: [
    { rate: 0.03078, min: 0, max: 14400 },
    { rate: 0.03762, min: 14400, max: 30000 },
    { rate: 0.03819, min: 30000, max: 60000 },
    { rate: 0.03876, min: 60000, max: Infinity }
  ]
};

export interface StateTaxRuleDefinition {
  code: string;
  name: string;
  hasIncomeTax: boolean;
  formResident: string;
  formNonResident: string;
  standardDeduction: Record<FilingStatus, number>;
  isFlat: boolean;
  flatRate?: number;
  brackets?: Record<FilingStatus, BracketDef[]>;
  reciprocalWith?: string[];
  notes?: string;
}

function makeBrackets(singleBrackets: BracketDef[], jointMultiplier = 2): Record<FilingStatus, BracketDef[]> {
  const jointBrackets = singleBrackets.map(b => ({
    rate: b.rate,
    min: Math.round(b.min * jointMultiplier),
    max: b.max === Infinity ? Infinity : Math.round(b.max * jointMultiplier)
  }));
  const hohBrackets = singleBrackets.map(b => ({
    rate: b.rate,
    min: Math.round(b.min * 1.4),
    max: b.max === Infinity ? Infinity : Math.round(b.max * 1.4)
  }));
  return {
    single: singleBrackets,
    married_joint: jointBrackets,
    married_separate: singleBrackets,
    head_of_household: hohBrackets
  };
}

export const STATE_TAX_RULES: Record<string, StateTaxRuleDefinition> = {
  AL: {
    code: 'AL', name: 'Alabama', hasIncomeTax: true,
    formResident: 'Form 40', formNonResident: 'Form 40NR',
    standardDeduction: { single: 3000, married_joint: 8500, married_separate: 4250, head_of_household: 5200 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.02, min: 0, max: 500 },
      { rate: 0.04, min: 500, max: 3000 },
      { rate: 0.05, min: 3000, max: Infinity }
    ], 2),
    notes: 'Alabama progressive rates (2%–5%). Allows a state deduction for federal income tax paid.'
  },
  AK: {
    code: 'AK', name: 'Alaska', hasIncomeTax: false,
    formResident: 'No State Return Required', formNonResident: 'No State Return Required',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true, flatRate: 0,
    notes: 'Alaska has no state personal income tax.'
  },
  AZ: {
    code: 'AZ', name: 'Arizona', hasIncomeTax: true,
    formResident: 'Form 140', formNonResident: 'Form 140NR',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: true, flatRate: 0.025,
    reciprocalWith: ['CA', 'IN', 'OR', 'VA'],
    notes: 'Arizona imposes a flat 2.5% individual income tax rate.'
  },
  AR: {
    code: 'AR', name: 'Arkansas', hasIncomeTax: true,
    formResident: 'Form AR1000F', formNonResident: 'Form AR1000NR',
    standardDeduction: { single: 2340, married_joint: 4680, married_separate: 2340, head_of_household: 2340 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.02, min: 0, max: 5299 },
      { rate: 0.03, min: 5299, max: 10599 },
      { rate: 0.034, min: 10599, max: 15099 },
      { rate: 0.039, min: 15099, max: Infinity }
    ], 1),
    notes: 'Arkansas top marginal rate is 3.9% for 2024.'
  },
  CA: {
    code: 'CA',
    name: 'California',
    hasIncomeTax: true,
    formResident: 'FTB Form 540',
    formNonResident: 'FTB Form 540NR',
    standardDeduction: {
      single: 5540,
      married_joint: 11080,
      married_separate: 5540,
      head_of_household: 11080
    },
    isFlat: false,
    brackets: {
      single: [
        { rate: 0.01, min: 0, max: 10412 },
        { rate: 0.02, min: 10412, max: 24684 },
        { rate: 0.04, min: 24684, max: 38959 },
        { rate: 0.06, min: 38959, max: 54081 },
        { rate: 0.08, min: 54081, max: 68350 },
        { rate: 0.093, min: 68350, max: 349137 },
        { rate: 0.103, min: 349137, max: 418961 },
        { rate: 0.113, min: 418961, max: 698271 },
        { rate: 0.123, min: 698271, max: Infinity }
      ],
      married_joint: [
        { rate: 0.01, min: 0, max: 20824 },
        { rate: 0.02, min: 20824, max: 49368 },
        { rate: 0.04, min: 49368, max: 77918 },
        { rate: 0.06, min: 77918, max: 108162 },
        { rate: 0.08, min: 108162, max: 136700 },
        { rate: 0.093, min: 136700, max: 698274 },
        { rate: 0.103, min: 698274, max: 837922 },
        { rate: 0.113, min: 837922, max: 1396542 },
        { rate: 0.123, min: 1396542, max: Infinity }
      ],
      married_separate: [
        { rate: 0.01, min: 0, max: 10412 },
        { rate: 0.02, min: 10412, max: 24684 },
        { rate: 0.04, min: 24684, max: 38959 },
        { rate: 0.06, min: 38959, max: 54081 },
        { rate: 0.08, min: 54081, max: 68350 },
        { rate: 0.093, min: 68350, max: 349137 },
        { rate: 0.103, min: 349137, max: 418961 },
        { rate: 0.113, min: 418961, max: 698271 },
        { rate: 0.123, min: 698271, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.01, min: 0, max: 20839 },
        { rate: 0.02, min: 20839, max: 49369 },
        { rate: 0.04, min: 49369, max: 63641 },
        { rate: 0.06, min: 63641, max: 78761 },
        { rate: 0.08, min: 78761, max: 93033 },
        { rate: 0.093, min: 93033, max: 474824 },
        { rate: 0.103, min: 474824, max: 569790 },
        { rate: 0.113, min: 569790, max: 949649 },
        { rate: 0.123, min: 949649, max: Infinity }
      ]
    },
    notes: 'California Schedule S provides credit for taxes paid to other states.'
  },
  CO: {
    code: 'CO', name: 'Colorado', hasIncomeTax: true,
    formResident: 'Form DR 0104', formNonResident: 'Form DR 0104PN',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: true, flatRate: 0.044,
    notes: 'Colorado imposes a flat 4.4% income tax starting from federal taxable income.'
  },
  CT: {
    code: 'CT', name: 'Connecticut', hasIncomeTax: true,
    formResident: 'Form CT-1040', formNonResident: 'Form CT-1040NR/PY',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.02, min: 0, max: 10000 },
      { rate: 0.045, min: 10000, max: 50000 },
      { rate: 0.055, min: 50000, max: 100000 },
      { rate: 0.06, min: 100000, max: 200000 },
      { rate: 0.065, min: 200000, max: 250000 },
      { rate: 0.069, min: 250000, max: 500000 },
      { rate: 0.0699, min: 500000, max: Infinity }
    ], 2),
    notes: 'Connecticut progressive brackets (2.0% to 6.99%).'
  },
  DE: {
    code: 'DE', name: 'Delaware', hasIncomeTax: true,
    formResident: 'Form PIT-RES', formNonResident: 'Form PIT-NON',
    standardDeduction: { single: 3250, married_joint: 6500, married_separate: 3250, head_of_household: 3250 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.00, min: 0, max: 2000 },
      { rate: 0.022, min: 2000, max: 5000 },
      { rate: 0.039, min: 5000, max: 10000 },
      { rate: 0.048, min: 10000, max: 20000 },
      { rate: 0.052, min: 20000, max: 25000 },
      { rate: 0.0555, min: 25000, max: 60000 },
      { rate: 0.066, min: 60000, max: Infinity }
    ], 1),
    notes: 'Delaware progressive rates (2.2% to 6.6% over $60,000).'
  },
  DC: {
    code: 'DC', name: 'District of Columbia', hasIncomeTax: true,
    formResident: 'Form D-40', formNonResident: 'Form D-30 (Unincorporated Business Franchise Tax)',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.04, min: 0, max: 10000 },
      { rate: 0.06, min: 10000, max: 40000 },
      { rate: 0.065, min: 40000, max: 60000 },
      { rate: 0.085, min: 60000, max: 250000 },
      { rate: 0.0925, min: 250000, max: 500000 },
      { rate: 0.0975, min: 500000, max: 1000000 },
      { rate: 0.1075, min: 1000000, max: Infinity }
    ], 1),
    notes: 'D.C. taxes residents on Form D-40 (4%–10.75%). Nonresidents are exempt from D-40 wage tax, but nonresident D.C. rental properties (gross rents > $12,000) are taxed via Form D-30 Unincorporated Business Franchise Tax (8.25% after 30% salary allowance and $5,000 exemption; $250 minimum tax).'
  },
  FL: {
    code: 'FL', name: 'Florida', hasIncomeTax: false,
    formResident: 'No State Return Required', formNonResident: 'No State Return Required',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true, flatRate: 0,
    notes: 'Florida has no state personal income tax.'
  },
  GA: {
    code: 'GA', name: 'Georgia', hasIncomeTax: true,
    formResident: 'Form 500', formNonResident: 'Form 500 (Schedule 3)',
    standardDeduction: { single: 12000, married_joint: 24000, married_separate: 12000, head_of_household: 12000 },
    isFlat: true, flatRate: 0.0539,
    notes: 'Georgia transitioned to a flat 5.39% income tax rate in 2024.'
  },
  HI: {
    code: 'HI', name: 'Hawaii', hasIncomeTax: true,
    formResident: 'Form N-11', formNonResident: 'Form N-15',
    standardDeduction: { single: 4400, married_joint: 8800, married_separate: 4400, head_of_household: 6424 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.014, min: 0, max: 9600 },
      { rate: 0.032, min: 9600, max: 14400 },
      { rate: 0.055, min: 14400, max: 19200 },
      { rate: 0.064, min: 19200, max: 24000 },
      { rate: 0.068, min: 24000, max: 36000 },
      { rate: 0.072, min: 36000, max: 48000 },
      { rate: 0.076, min: 48000, max: 125000 },
      { rate: 0.079, min: 125000, max: 175000 },
      { rate: 0.0825, min: 175000, max: 225000 },
      { rate: 0.09, min: 225000, max: 275000 },
      { rate: 0.10, min: 275000, max: 325000 },
      { rate: 0.11, min: 325000, max: Infinity }
    ], 2),
    notes: 'Hawaii has 12 progressive brackets from 1.4% to 11.0%.'
  },
  ID: {
    code: 'ID', name: 'Idaho', hasIncomeTax: true,
    formResident: 'Form 40', formNonResident: 'Form 43',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: true, flatRate: 0.05695,
    notes: 'Idaho imposes a flat 5.695% income tax rate.'
  },
  IL: {
    code: 'IL',
    name: 'Illinois',
    hasIncomeTax: true,
    formResident: 'Form IL-1040',
    formNonResident: 'Form IL-1040 Schedule NR',
    standardDeduction: { single: 2775, married_joint: 5550, married_separate: 2775, head_of_household: 2775 },
    isFlat: true,
    flatRate: 0.0495,
    reciprocalWith: ['IA', 'KY', 'MI', 'WI'],
    notes: 'Flat 4.95% individual income tax rate. Reciprocal agreements with IA, KY, MI, WI.'
  },
  IN: {
    code: 'IN', name: 'Indiana', hasIncomeTax: true,
    formResident: 'Form IT-40', formNonResident: 'Form IT-40PNR',
    standardDeduction: { single: 1000, married_joint: 2000, married_separate: 1000, head_of_household: 1000 },
    isFlat: true, flatRate: 0.0305,
    reciprocalWith: ['KY', 'MI', 'OH', 'PA', 'WI'],
    notes: 'Indiana imposes a flat 3.05% state income tax rate plus county income taxes.'
  },
  IA: {
    code: 'IA', name: 'Iowa', hasIncomeTax: true,
    formResident: 'Form IA 1040', formNonResident: 'Form IA 1040 (Schedule IA 126)',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.044, min: 0, max: 6210 },
      { rate: 0.0482, min: 6210, max: 31050 },
      { rate: 0.057, min: 31050, max: Infinity }
    ], 2),
    reciprocalWith: ['IL'],
    notes: 'Iowa progressive brackets (4.4% to 5.7% in 2024; 3.8% flat starting 2025). Reciprocal with IL.'
  },
  KS: {
    code: 'KS', name: 'Kansas', hasIncomeTax: true,
    formResident: 'Form K-40', formNonResident: 'Form K-40 (Schedule S)',
    standardDeduction: { single: 3605, married_joint: 8240, married_separate: 4120, head_of_household: 6180 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.052, min: 0, max: 23000 },
      { rate: 0.0558, min: 23000, max: Infinity }
    ], 2),
    notes: 'Kansas uses two brackets (5.2% and 5.58%) for 2024.'
  },
  KY: {
    code: 'KY', name: 'Kentucky', hasIncomeTax: true,
    formResident: 'Form 740', formNonResident: 'Form 740-NP',
    standardDeduction: { single: 3160, married_joint: 6320, married_separate: 3160, head_of_household: 3160 },
    isFlat: true, flatRate: 0.04,
    reciprocalWith: ['IL', 'IN', 'MI', 'OH', 'VA', 'WV', 'WI'],
    notes: 'Kentucky imposes a flat 4.0% income tax rate.'
  },
  LA: {
    code: 'LA', name: 'Louisiana', hasIncomeTax: true,
    formResident: 'Form IT-540', formNonResident: 'Form IT-540B',
    standardDeduction: { single: 4500, married_joint: 9000, married_separate: 4500, head_of_household: 9000 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.0185, min: 0, max: 12500 },
      { rate: 0.035, min: 12500, max: 50000 },
      { rate: 0.0425, min: 50000, max: Infinity }
    ], 2),
    notes: 'Louisiana 2024 brackets (1.85%, 3.5%, 4.25%; transitioning to 3.0% flat in 2025).'
  },
  ME: {
    code: 'ME', name: 'Maine', hasIncomeTax: true,
    formResident: 'Form 1040ME', formNonResident: 'Form 1040ME (Schedule NR)',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.058, min: 0, max: 26050 },
      { rate: 0.0675, min: 26050, max: 61600 },
      { rate: 0.0715, min: 61600, max: Infinity }
    ], 2),
    notes: 'Maine progressive rates (5.8%, 6.75%, 7.15%).'
  },
  MD: {
    code: 'MD', name: 'Maryland', hasIncomeTax: true,
    formResident: 'Form 502', formNonResident: 'Form 505',
    standardDeduction: { single: 2550, married_joint: 5150, married_separate: 2550, head_of_household: 5150 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.02, min: 0, max: 1000 },
      { rate: 0.03, min: 1000, max: 2000 },
      { rate: 0.04, min: 2000, max: 3000 },
      { rate: 0.0475, min: 3000, max: 100000 },
      { rate: 0.05, min: 100000, max: 125000 },
      { rate: 0.0525, min: 125000, max: 150000 },
      { rate: 0.055, min: 150000, max: 250000 },
      { rate: 0.0575, min: 250000, max: Infinity }
    ], 1.2),
    reciprocalWith: ['DC', 'PA', 'VA', 'WV'],
    notes: 'Maryland state brackets (2%–5.75%) plus mandatory county local income tax (2.25%–3.20%).'
  },
  MA: {
    code: 'MA',
    name: 'Massachusetts',
    hasIncomeTax: true,
    formResident: 'Form 1',
    formNonResident: 'Form 1-NR/PY',
    standardDeduction: { single: 4400, married_joint: 8800, married_separate: 4400, head_of_household: 6800 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.05, min: 0, max: 1053750 },
      { rate: 0.09, min: 1053750, max: Infinity }
    ], 1),
    notes: 'Flat 5.0% income tax rate plus 4% Fair Share surtax (9% total) on income over $1,053,750.'
  },
  MI: {
    code: 'MI', name: 'Michigan', hasIncomeTax: true,
    formResident: 'Form MI-1040', formNonResident: 'Form MI-1040 (Schedule NR)',
    standardDeduction: { single: 5600, married_joint: 11200, married_separate: 5600, head_of_household: 5600 },
    isFlat: true, flatRate: 0.0425,
    reciprocalWith: ['IL', 'IN', 'KY', 'MN', 'OH', 'WI'],
    notes: 'Michigan imposes a flat 4.25% income tax rate.'
  },
  MN: {
    code: 'MN', name: 'Minnesota', hasIncomeTax: true,
    formResident: 'Form M1', formNonResident: 'Form M1 (Schedule M1NR)',
    standardDeduction: { single: 14575, married_joint: 29150, married_separate: 14575, head_of_household: 21850 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.0535, min: 0, max: 31690 },
      { rate: 0.068, min: 31690, max: 104090 },
      { rate: 0.0785, min: 104090, max: 193240 },
      { rate: 0.0985, min: 193240, max: Infinity }
    ], 1.46),
    reciprocalWith: ['MI', 'ND'],
    notes: 'Minnesota progressive brackets (5.35% to 9.85%).'
  },
  MS: {
    code: 'MS', name: 'Mississippi', hasIncomeTax: true,
    formResident: 'Form 80-105', formNonResident: 'Form 80-205',
    standardDeduction: { single: 2300, married_joint: 4600, married_separate: 2300, head_of_household: 3400 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.00, min: 0, max: 10000 },
      { rate: 0.047, min: 10000, max: Infinity }
    ], 1),
    notes: 'Mississippi exempts the first $10,000 of taxable income and taxes excess at 4.7% in 2024.'
  },
  MO: {
    code: 'MO', name: 'Missouri', hasIncomeTax: true,
    formResident: 'Form MO-1040', formNonResident: 'Form MO-1040 (Form MO-NRI)',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.00, min: 0, max: 1273 },
      { rate: 0.02, min: 1273, max: 2546 },
      { rate: 0.025, min: 2546, max: 3819 },
      { rate: 0.03, min: 3819, max: 5092 },
      { rate: 0.035, min: 5092, max: 6365 },
      { rate: 0.04, min: 6365, max: 7638 },
      { rate: 0.045, min: 7638, max: 8911 },
      { rate: 0.048, min: 8911, max: Infinity }
    ], 1),
    notes: 'Missouri top marginal rate is 4.8% for 2024.'
  },
  MT: {
    code: 'MT', name: 'Montana', hasIncomeTax: true,
    formResident: 'Form 2', formNonResident: 'Form 2 (Nonresident Schedule)',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.047, min: 0, max: 20500 },
      { rate: 0.059, min: 20500, max: Infinity }
    ], 2),
    reciprocalWith: ['ND'],
    notes: 'Montana uses two brackets (4.7% and 5.9%) starting from federal taxable income in 2024.'
  },
  NE: {
    code: 'NE', name: 'Nebraska', hasIncomeTax: true,
    formResident: 'Form 1040N', formNonResident: 'Form 1040N (Schedule III)',
    standardDeduction: { single: 8250, married_joint: 16500, married_separate: 8250, head_of_household: 12150 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.0246, min: 0, max: 3700 },
      { rate: 0.0351, min: 3700, max: 22170 },
      { rate: 0.0501, min: 22170, max: 35730 },
      { rate: 0.0584, min: 35730, max: Infinity }
    ], 2),
    notes: 'Nebraska progressive brackets (2.46% to 5.84% in 2024).'
  },
  NV: {
    code: 'NV', name: 'Nevada', hasIncomeTax: false,
    formResident: 'No State Return Required', formNonResident: 'No State Return Required',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true, flatRate: 0,
    notes: 'Nevada has no state personal income tax.'
  },
  NH: {
    code: 'NH', name: 'New Hampshire', hasIncomeTax: false,
    formResident: 'No State Wage Return Required', formNonResident: 'No State Return Required',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true, flatRate: 0,
    notes: 'New Hampshire has no tax on W-2 wages (and repealed its Interest & Dividends tax after 2024).'
  },
  NJ: {
    code: 'NJ',
    name: 'New Jersey',
    hasIncomeTax: true,
    formResident: 'Form NJ-1040',
    formNonResident: 'Form NJ-1040NR',
    standardDeduction: {
      single: 1000,
      married_joint: 2000,
      married_separate: 1000,
      head_of_household: 1000
    },
    isFlat: false,
    brackets: {
      single: [
        { rate: 0.014, min: 0, max: 20000 },
        { rate: 0.0175, min: 20000, max: 35000 },
        { rate: 0.035, min: 35000, max: 40000 },
        { rate: 0.05525, min: 40000, max: 75000 },
        { rate: 0.0637, min: 75000, max: 500000 },
        { rate: 0.0897, min: 500000, max: 1000000 },
        { rate: 0.1075, min: 1000000, max: Infinity }
      ],
      married_joint: [
        { rate: 0.014, min: 0, max: 20000 },
        { rate: 0.0175, min: 20000, max: 50000 },
        { rate: 0.0245, min: 50000, max: 70000 },
        { rate: 0.035, min: 70000, max: 80000 },
        { rate: 0.05525, min: 80000, max: 150000 },
        { rate: 0.0637, min: 150000, max: 500000 },
        { rate: 0.0897, min: 500000, max: 1000000 },
        { rate: 0.1075, min: 1000000, max: Infinity }
      ],
      married_separate: [
        { rate: 0.014, min: 0, max: 20000 },
        { rate: 0.0175, min: 20000, max: 35000 },
        { rate: 0.035, min: 35000, max: 40000 },
        { rate: 0.05525, min: 40000, max: 75000 },
        { rate: 0.0637, min: 75000, max: 500000 },
        { rate: 0.0897, min: 500000, max: 1000000 },
        { rate: 0.1075, min: 1000000, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.014, min: 0, max: 20000 },
        { rate: 0.0175, min: 20000, max: 35000 },
        { rate: 0.035, min: 35000, max: 40000 },
        { rate: 0.05525, min: 40000, max: 75000 },
        { rate: 0.0637, min: 75000, max: 500000 },
        { rate: 0.0897, min: 500000, max: 1000000 },
        { rate: 0.1075, min: 1000000, max: Infinity }
      ]
    },
    reciprocalWith: ['PA'],
    notes: 'NJ and PA have a reciprocal agreement: W-2 wages are taxed only in your resident state. Schedule NJ-CO provides credit for other states (such as NY).'
  },
  NM: {
    code: 'NM', name: 'New Mexico', hasIncomeTax: true,
    formResident: 'Form PIT-1', formNonResident: 'Form PIT-1 (Schedule PIT-B)',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.017, min: 0, max: 5500 },
      { rate: 0.032, min: 5500, max: 11000 },
      { rate: 0.047, min: 11000, max: 16000 },
      { rate: 0.049, min: 16000, max: 210000 },
      { rate: 0.059, min: 210000, max: Infinity }
    ], 1.5),
    notes: 'New Mexico progressive brackets (1.7% to 5.9%).'
  },
  NY: {
    code: 'NY',
    name: 'New York',
    hasIncomeTax: true,
    formResident: 'Form IT-201',
    formNonResident: 'Form IT-203',
    standardDeduction: {
      single: 8000,
      married_joint: 16050,
      married_separate: 8000,
      head_of_household: 11200
    },
    isFlat: false,
    brackets: {
      single: [
        { rate: 0.04, min: 0, max: 8500 },
        { rate: 0.045, min: 8500, max: 11700 },
        { rate: 0.0525, min: 11700, max: 13900 },
        { rate: 0.055, min: 13900, max: 80650 },
        { rate: 0.06, min: 80650, max: 215400 },
        { rate: 0.0685, min: 215400, max: 1077550 },
        { rate: 0.0965, min: 1077550, max: 5000000 },
        { rate: 0.103, min: 5000000, max: 25000000 },
        { rate: 0.109, min: 25000000, max: Infinity }
      ],
      married_joint: [
        { rate: 0.04, min: 0, max: 17150 },
        { rate: 0.045, min: 17150, max: 23600 },
        { rate: 0.0525, min: 23600, max: 27900 },
        { rate: 0.055, min: 27900, max: 161550 },
        { rate: 0.06, min: 161550, max: 323200 },
        { rate: 0.0685, min: 323200, max: 2155350 },
        { rate: 0.0965, min: 2155350, max: 5000000 },
        { rate: 0.103, min: 5000000, max: 25000000 },
        { rate: 0.109, min: 25000000, max: Infinity }
      ],
      married_separate: [
        { rate: 0.04, min: 0, max: 8500 },
        { rate: 0.045, min: 8500, max: 11700 },
        { rate: 0.0525, min: 11700, max: 13900 },
        { rate: 0.055, min: 13900, max: 80650 },
        { rate: 0.06, min: 80650, max: 215400 },
        { rate: 0.0685, min: 215400, max: 1077550 },
        { rate: 0.0965, min: 1077550, max: 5000000 },
        { rate: 0.103, min: 5000000, max: 25000000 },
        { rate: 0.109, min: 25000000, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.04, min: 0, max: 12800 },
        { rate: 0.045, min: 12800, max: 17650 },
        { rate: 0.0525, min: 17650, max: 20900 },
        { rate: 0.055, min: 20900, max: 107650 },
        { rate: 0.06, min: 107650, max: 269300 },
        { rate: 0.0685, min: 269300, max: 1616450 },
        { rate: 0.0965, min: 1616450, max: 5000000 },
        { rate: 0.103, min: 5000000, max: 25000000 },
        { rate: 0.109, min: 25000000, max: Infinity }
      ]
    },
    notes: 'New York Form IT-201 includes NY State tax (4%–10.9%), Form IT-196 NY Itemized Deductions, NYC Municipal Resident Tax (3.078%–3.876%), and Form IT-112-R Resident Credit.'
  },
  NC: {
    code: 'NC', name: 'North Carolina', hasIncomeTax: true,
    formResident: 'Form D-400', formNonResident: 'Form D-400 (Schedule PN)',
    standardDeduction: { single: 12750, married_joint: 25500, married_separate: 12750, head_of_household: 19125 },
    isFlat: true, flatRate: 0.045,
    notes: 'North Carolina imposes a flat 4.5% personal income tax rate for 2024 (4.25% in 2025).'
  },
  ND: {
    code: 'ND', name: 'North Dakota', hasIncomeTax: true,
    formResident: 'Form ND-1', formNonResident: 'Form ND-1 (Schedule ND-1NR)',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.00, min: 0, max: 44725 },
      { rate: 0.0195, min: 44725, max: 225975 },
      { rate: 0.025, min: 225975, max: Infinity }
    ], 1.67),
    reciprocalWith: ['MN', 'MT'],
    notes: 'North Dakota exempts the first $44,725 of single taxable income and caps rates at 2.5%.'
  },
  OH: {
    code: 'OH', name: 'Ohio', hasIncomeTax: true,
    formResident: 'Form IT 1040', formNonResident: 'Form IT 1040 (Schedule IT NRC)',
    standardDeduction: { single: 2400, married_joint: 4800, married_separate: 2400, head_of_household: 2400 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.00, min: 0, max: 26050 },
      { rate: 0.0275, min: 26050, max: 100000 },
      { rate: 0.035, min: 100000, max: Infinity }
    ], 1),
    reciprocalWith: ['IN', 'KY', 'MI', 'PA', 'WV'],
    notes: 'Ohio exempts the first $26,050 of income and has two brackets (2.75% and 3.5%).'
  },
  OK: {
    code: 'OK', name: 'Oklahoma', hasIncomeTax: true,
    formResident: 'Form 511', formNonResident: 'Form 511NR',
    standardDeduction: { single: 6350, married_joint: 12700, married_separate: 6350, head_of_household: 9350 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.0025, min: 0, max: 1000 },
      { rate: 0.0075, min: 1000, max: 2500 },
      { rate: 0.0175, min: 2500, max: 3750 },
      { rate: 0.0275, min: 3750, max: 4900 },
      { rate: 0.0375, min: 4900, max: 7200 },
      { rate: 0.0475, min: 7200, max: Infinity }
    ], 2),
    notes: 'Oklahoma progressive brackets (0.25% to 4.75%).'
  },
  OR: {
    code: 'OR', name: 'Oregon', hasIncomeTax: true,
    formResident: 'Form OR-40', formNonResident: 'Form OR-40-N',
    standardDeduction: { single: 2745, married_joint: 5495, married_separate: 2745, head_of_household: 4420 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.0475, min: 0, max: 4300 },
      { rate: 0.0675, min: 4300, max: 10750 },
      { rate: 0.0875, min: 10750, max: 125000 },
      { rate: 0.099, min: 125000, max: Infinity }
    ], 2),
    notes: 'Oregon progressive brackets (4.75% to 9.9%).'
  },
  PA: {
    code: 'PA',
    name: 'Pennsylvania',
    hasIncomeTax: true,
    formResident: 'Form PA-40',
    formNonResident: 'Form PA-40 Non-Resident',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true,
    flatRate: 0.0307,
    reciprocalWith: ['NJ', 'MD', 'OH', 'VA', 'WV', 'IN'],
    notes: 'Pennsylvania imposes a flat 3.07% tax rate with no standard deduction. Reciprocal with NJ, MD, OH, VA, WV, IN.'
  },
  RI: {
    code: 'RI', name: 'Rhode Island', hasIncomeTax: true,
    formResident: 'Form RI-1040', formNonResident: 'Form RI-1040NR',
    standardDeduction: { single: 10550, married_joint: 21150, married_separate: 10575, head_of_household: 15850 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.0375, min: 0, max: 77450 },
      { rate: 0.0475, min: 77450, max: 176050 },
      { rate: 0.0599, min: 176050, max: Infinity }
    ], 1),
    notes: 'Rhode Island progressive brackets (3.75%, 4.75%, 5.99%).'
  },
  SC: {
    code: 'SC', name: 'South Carolina', hasIncomeTax: true,
    formResident: 'Form SC1040', formNonResident: 'Form SC1040 (Schedule NR)',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.00, min: 0, max: 3460 },
      { rate: 0.03, min: 3460, max: 17330 },
      { rate: 0.062, min: 17330, max: Infinity }
    ], 1),
    notes: 'South Carolina top marginal rate is 6.2% for 2024.'
  },
  SD: {
    code: 'SD', name: 'South Dakota', hasIncomeTax: false,
    formResident: 'No State Return Required', formNonResident: 'No State Return Required',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true, flatRate: 0,
    notes: 'South Dakota has no state personal income tax.'
  },
  TN: {
    code: 'TN', name: 'Tennessee', hasIncomeTax: false,
    formResident: 'No State Return Required', formNonResident: 'No State Return Required',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true, flatRate: 0,
    notes: 'Tennessee has no state personal wage income tax.'
  },
  TX: {
    code: 'TX', name: 'Texas', hasIncomeTax: false,
    formResident: 'No State Return Required', formNonResident: 'No State Return Required',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true, flatRate: 0,
    notes: 'Texas has no state personal income tax.'
  },
  UT: {
    code: 'UT', name: 'Utah', hasIncomeTax: true,
    formResident: 'Form TC-40', formNonResident: 'Form TC-40 (TC-40B)',
    standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
    isFlat: true, flatRate: 0.0455,
    notes: 'Utah imposes a flat 4.55% personal income tax rate.'
  },
  VT: {
    code: 'VT', name: 'Vermont', hasIncomeTax: true,
    formResident: 'Form IN-111', formNonResident: 'Form IN-111 (Schedule IN-113)',
    standardDeduction: { single: 7000, married_joint: 14050, married_separate: 7000, head_of_household: 10550 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.0335, min: 0, max: 45400 },
      { rate: 0.066, min: 45400, max: 110050 },
      { rate: 0.076, min: 110050, max: 229550 },
      { rate: 0.0875, min: 229550, max: Infinity }
    ], 1.67),
    notes: 'Vermont progressive brackets (3.35% to 8.75%).'
  },
  VA: {
    code: 'VA', name: 'Virginia', hasIncomeTax: true,
    formResident: 'Form 760', formNonResident: 'Form 763',
    standardDeduction: { single: 8500, married_joint: 17000, married_separate: 8500, head_of_household: 8500 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.02, min: 0, max: 3000 },
      { rate: 0.03, min: 3000, max: 5000 },
      { rate: 0.05, min: 5000, max: 17000 },
      { rate: 0.0575, min: 17000, max: Infinity }
    ], 1),
    reciprocalWith: ['DC', 'KY', 'MD', 'PA', 'WV'],
    notes: 'Virginia progressive brackets up to 5.75% over $17,000. Reciprocal with DC, KY, MD, PA, WV.'
  },
  WA: {
    code: 'WA', name: 'Washington', hasIncomeTax: false,
    formResident: 'No State Wage Return Required', formNonResident: 'No State Return Required',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true, flatRate: 0,
    notes: 'Washington has no state wage income tax (imposes a 7% excise tax on long-term capital gains over $270,000).'
  },
  WV: {
    code: 'WV', name: 'West Virginia', hasIncomeTax: true,
    formResident: 'Form IT-140', formNonResident: 'Form IT-140 (ScheduleNR)',
    standardDeduction: { single: 2000, married_joint: 4000, married_separate: 2000, head_of_household: 2000 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.0236, min: 0, max: 10000 },
      { rate: 0.0315, min: 10000, max: 25000 },
      { rate: 0.0354, min: 25000, max: 40000 },
      { rate: 0.0472, min: 40000, max: 60000 },
      { rate: 0.0512, min: 60000, max: Infinity }
    ], 1),
    reciprocalWith: ['KY', 'MD', 'OH', 'PA', 'VA'],
    notes: 'West Virginia progressive brackets (2.36% to 5.12%). Reciprocal with KY, MD, OH, PA, VA.'
  },
  WI: {
    code: 'WI', name: 'Wisconsin', hasIncomeTax: true,
    formResident: 'Form 1', formNonResident: 'Form 1NPR',
    standardDeduction: { single: 13230, married_joint: 24490, married_separate: 11640, head_of_household: 17090 },
    isFlat: false,
    brackets: makeBrackets([
      { rate: 0.035, min: 0, max: 14320 },
      { rate: 0.044, min: 14320, max: 28640 },
      { rate: 0.053, min: 28640, max: 315310 },
      { rate: 0.0765, min: 315310, max: Infinity }
    ], 1.33),
    reciprocalWith: ['IL', 'IN', 'KY', 'MI'],
    notes: 'Wisconsin progressive brackets (3.5% to 7.65%). Reciprocal with IL, IN, KY, MI.'
  },
  WY: {
    code: 'WY', name: 'Wyoming', hasIncomeTax: false,
    formResident: 'No State Return Required', formNonResident: 'No State Return Required',
    standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
    isFlat: true, flatRate: 0,
    notes: 'Wyoming has no state personal income tax.'
  }
};

export function getStateTaxRule(code: string): StateTaxRuleDefinition {
  const upper = (code || '').toUpperCase().trim();
  if (STATE_TAX_RULES[upper]) return STATE_TAX_RULES[upper];
  return {
    code: upper || 'OTHER',
    name: upper || 'State',
    hasIncomeTax: true,
    formResident: `${upper} Resident Return`,
    formNonResident: `${upper} Non-Resident Return`,
    standardDeduction: { single: 4000, married_joint: 8000, married_separate: 4000, head_of_household: 6000 },
    isFlat: true,
    flatRate: 0.045,
    notes: `Individual income tax return for ${upper}.`
  };
}

export function computeStateTaxFromBrackets(taxable: number, brackets: BracketDef[]): number {
  if (taxable <= 0) return 0;
  let tax = 0;
  for (const b of brackets) {
    if (taxable > b.min) {
      const chunk = Math.min(taxable, b.max) - b.min;
      tax += chunk * b.rate;
    }
  }
  return tax;
}

export function formatCurrency(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return "$0";
  const roundedCents = Math.round(num * 100) / 100;
  const hasCents = Math.abs(roundedCents - Math.round(roundedCents)) > 0.001;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0
  }).format(roundedCents);
}

export function formatCurrencyExact(num: number | null | undefined): string {
  return formatCurrency(num);
}

export function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

export function filingStatusLabel(status: FilingStatus): string {
  switch (status) {
    case 'single': return 'Single';
    case 'married_joint': return 'Married Filing Jointly';
    case 'married_separate': return 'Married Filing Separately';
    case 'head_of_household': return 'Head of Household';
    default: return 'Single';
  }
}

/**
 * Perform complete tax calculation with fully annotated general & plugged-in equations.
 */
export function calculateTaxes(state: TaxAppState): TaxCalculationSummary {
  const year = state.year || 2024;
  const filingStatus = state.filingStatus || 'single';
  const rules = TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];

  const w2List: W2Data[] = state.w2s && state.w2s.length > 0
    ? state.w2s
    : [{ id: 0, employer: '', ein: '', box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0, states: [] }];

  // 1. Total W-2 Wages (Box 1)
  const box1Values = w2List.map(w => Number(w.box1) || 0);
  const totalW2Wages = box1Values.reduce((sum, val) => sum + val, 0);
  const w2WageFieldIds = w2List.map((w, idx) => `w2-${w.id || idx}-box1`);

  const w2WagesCalc: CalculationResult = {
    result: totalW2Wages,
    sourceFields: w2WageFieldIds,
    generalFormula: w2List.length === 1 ? 'Total Wages = W-2 Box 1' : 'Total Wages = ∑(W-2 Box 1)',
    pluggedFormula: w2List.length === 1
      ? `Total Wages = ${formatCurrency(box1Values[0])}`
      : `Total Wages = ${box1Values.map(v => formatCurrency(v)).join(' + ')} = ${formatCurrency(totalW2Wages)}`
  };

  // State & Local Tax Summary (Boxes 15-20 across all W-2s) - Computed early for SALT deduction
  const stateLines = w2List.flatMap(w => (w.states || []).map((s: StateTaxLine) => ({ ...s, w2Id: w.id })));
  const totalStateWages = stateLines.reduce((sum, s) => sum + (Number(s.stateWages) || 0), 0);
  const totalStateTaxWithheld = stateLines.reduce((sum, s) => sum + (Number(s.stateTaxWithheld) || 0), 0);
  const totalLocalTaxWithheld = stateLines.reduce((sum, s) => sum + (Number(s.localTaxWithheld) || 0), 0);

  const stateMap = new Map<string, { state: string; stateWages: number; stateTaxWithheld: number; localTaxWithheld: number; sourceFieldIds: string[] }>();
  stateLines.forEach(s => {
    const st = (s.state || 'OTHER').toUpperCase().trim();
    if (!stateMap.has(st)) {
      stateMap.set(st, { state: st, stateWages: 0, stateTaxWithheld: 0, localTaxWithheld: 0, sourceFieldIds: [] });
    }
    const item = stateMap.get(st)!;
    item.stateWages += Number(s.stateWages) || 0;
    item.stateTaxWithheld += Number(s.stateTaxWithheld) || 0;
    item.localTaxWithheld += Number(s.localTaxWithheld) || 0;
    item.sourceFieldIds.push(`w2-${s.w2Id}-state-${s.id}-box17`);
  });

  const byState = Array.from(stateMap.values());
  const stateWithheldValues = stateLines.map(s => ({
    state: (s.state || 'State').toUpperCase(),
    amount: Number(s.stateTaxWithheld) || 0
  })).filter(x => x.amount > 0);

  const stateTaxCalc: StateTaxCalculation = {
    result: totalStateTaxWithheld,
    totalStateWages,
    totalStateWithheld: totalStateTaxWithheld,
    totalLocalWithheld: totalLocalTaxWithheld,
    byState,
    sourceFields: stateLines.map(s => `w2-${s.w2Id}-state-${s.id}-box17`),
    generalFormula: 'Total State Withholding = ∑(W-2 Box 17)',
    pluggedFormula: stateWithheldValues.length > 0
      ? `Total State Tax = ${stateWithheldValues.map(v => `${v.state}: ${formatCurrencyExact(v.amount)}`).join(' + ')} = ${formatCurrencyExact(totalStateTaxWithheld)}`
      : 'Total State Tax = $0'
  };

  // Capital Gains / Losses (Schedule D / Line 7)
  const stGain = Number(state.otherIncome?.capitalGains?.shortTerm) || 0;
  const ltGain = Number(state.otherIncome?.capitalGains?.longTerm) || 0;
  const netGainLoss = stGain + ltGain;
  const maxLoss = filingStatus === 'married_separate' ? -1500 : -3000;
  const allowableCapitalNet = netGainLoss < 0 ? Math.max(maxLoss, netGainLoss) : netGainLoss;

  const capitalGainsCalc: CapitalGainsCalculation = {
    result: allowableCapitalNet,
    netTotal: netGainLoss,
    allowableLoss: allowableCapitalNet,
    sourceFields: ['input-capital-gains-st', 'input-capital-gains-lt'],
    generalFormula: 'Net Capital Gain/Loss = Short-Term + Long-Term (Losses capped at -$3,000/yr)',
    pluggedFormula: netGainLoss < 0
      ? `Net = ${formatCurrency(stGain)} + ${formatCurrency(ltGain)} = ${formatCurrency(netGainLoss)} ➔ Capped at ${formatCurrency(allowableCapitalNet)}`
      : `Net = ${formatCurrency(stGain)} + ${formatCurrency(ltGain)} = ${formatCurrency(allowableCapitalNet)}`
  };

  // Schedule C Business Expenses
  const scheduleCExpenses = Math.max(0, Number(state.otherIncome?.scheduleCExpenses) || 0);

  // Additional Incomes (including Accrued Interest offset on 1099-INT and Qualified Dividends on 1099-DIV)
  const interestIncome = Number(state.otherIncome?.interest) || 0;
  const extraSources = state.otherIncome?.sources || [];
  let extraSourcesTotal = 0;
  let qualifiedDividendsTotal = 0;
  let net1099InterestTotal = 0;
  let total1099Dividends = 0;

  extraSources.forEach(s => {
    let amt = Number(s.amount) || 0;
    if (s.type === '1099-NEC' && scheduleCExpenses > 0) {
      amt = Math.max(0, amt - scheduleCExpenses);
    } else if (s.type === '1099-INT') {
      const accrued = Math.max(0, Number(s.accruedInterestPaid) || 0);
      amt = Math.max(0, amt - accrued);
      net1099InterestTotal += amt;
    } else if (s.type === '1099-DIV') {
      total1099Dividends += amt;
      const qDiv = Math.min(amt, Math.max(0, Number(s.qualifiedDividends) || 0));
      qualifiedDividendsTotal += qDiv;
    }
    extraSourcesTotal += amt;
  });

  // Schedule E Rental Real Estate (Schedule 1, Line 5 & Form 8582 Passive Activity Loss Rules)
  const rentalGross = Math.max(0, Number(state.otherIncome?.scheduleERental?.grossRents) || 0);
  const rentalExpenses = Math.max(0, Number(state.otherIncome?.scheduleERental?.expenses) || 0);
  const rentalDepreciation = Math.max(0, Number(state.otherIncome?.scheduleERental?.depreciation) || 0);
  const rentalPropertyState = (state.otherIncome?.scheduleERental?.propertyState || '').toUpperCase().trim();
  const hasScheduleEInput = rentalGross > 0 || rentalExpenses > 0 || rentalDepreciation > 0;
  const rentalNetBeforePal = rentalGross - rentalExpenses - rentalDepreciation;

  // Compute MAGI before passive rental loss for Form 8582 $25,000 active participation allowance phaseout ($100k–$150k)
  const studentLoanInterest = Math.min(2500, Number(state.adjustments?.studentLoan) || 0);
  const iraDeduction = Number(state.adjustments?.ira) || 0;
  const hsaDeduction = Number(state.adjustments?.hsa) || 0;
  const totalAdjustments = studentLoanInterest + iraDeduction + hsaDeduction;

  const magiBeforeRental = Math.max(0, totalW2Wages + interestIncome + extraSourcesTotal + allowableCapitalNet - totalAdjustments);
  let allowableRentalNet = rentalNetBeforePal;
  let disallowedPassiveLoss = 0;

  if (rentalNetBeforePal < 0) {
    const maxPalAllowance = filingStatus === 'married_separate' ? 12500 : 25000;
    const palPhaseoutStart = filingStatus === 'married_separate' ? 50000 : 100000;
    const palReduction = Math.max(0, (magiBeforeRental - palPhaseoutStart) * 0.5);
    const allowedLossCap = Math.max(0, maxPalAllowance - palReduction);
    allowableRentalNet = -Math.min(Math.abs(rentalNetBeforePal), allowedLossCap);
    disallowedPassiveLoss = Math.abs(rentalNetBeforePal) - Math.abs(allowableRentalNet);
  }

  const scheduleECalc: ScheduleECalculation = {
    result: allowableRentalNet,
    grossRents: rentalGross,
    expenses: rentalExpenses,
    depreciation: rentalDepreciation,
    netBeforePal: rentalNetBeforePal,
    allowableNet: allowableRentalNet,
    disallowedPassiveLoss,
    propertyState: rentalPropertyState,
    sourceFields: ['input-rental-gross', 'input-rental-expenses', 'input-rental-depreciation'],
    generalFormula: 'Schedule E Net Rental Income = Gross Rents − Operating Expenses − MACRS Depreciation (Losses subject to Form 8582 PAL rules)',
    pluggedFormula: hasScheduleEInput
      ? (disallowedPassiveLoss > 0
          ? `Net Rent = ${formatCurrency(rentalGross)} − ${formatCurrency(rentalExpenses)} − ${formatCurrency(rentalDepreciation)} = ${formatCurrency(rentalNetBeforePal)} ➔ Form 8582 Allowed: ${formatCurrency(allowableRentalNet)} (${formatCurrency(disallowedPassiveLoss)} suspended)`
          : `Net Rent = ${formatCurrency(rentalGross)} − ${formatCurrency(rentalExpenses)} − ${formatCurrency(rentalDepreciation)} = ${formatCurrency(allowableRentalNet)}`)
      : 'Schedule E Net Rental Income = $0'
  };

  const otherIncomeTotal = interestIncome + extraSourcesTotal + allowableCapitalNet + allowableRentalNet;

  // 2. Total Gross Income
  const grossIncome = Math.max(0, totalW2Wages + otherIncomeTotal);
  const grossIncomeSourceFields = [
    'calc-total-w2-wages',
    ...(interestIncome > 0 ? ['input-other-interest'] : []),
    ...(allowableCapitalNet !== 0 ? ['calc-capital-gains'] : []),
    ...(allowableRentalNet !== 0 ? ['calc-schedule-e'] : []),
    ...extraSources.filter(s => (Number(s.amount) || 0) > 0).map(s => `input-income-source-${s.id}`)
  ];

  const pluggedFormulaParts = [formatCurrency(totalW2Wages)];
  if (interestIncome > 0) {
    pluggedFormulaParts.push(formatCurrency(interestIncome));
  }
  extraSources.forEach(s => {
    if ((Number(s.amount) || 0) > 0) {
      let amt = Number(s.amount) || 0;
      if (s.type === '1099-NEC' && scheduleCExpenses > 0) {
        amt = Math.max(0, amt - scheduleCExpenses);
      } else if (s.type === '1099-INT' && (Number(s.accruedInterestPaid) || 0) > 0) {
        amt = Math.max(0, amt - (Number(s.accruedInterestPaid) || 0));
      }
      pluggedFormulaParts.push(formatCurrency(amt));
    }
  });
  if (allowableRentalNet !== 0) {
    pluggedFormulaParts.push(formatCurrency(allowableRentalNet));
  }
  if (allowableCapitalNet !== 0) {
    pluggedFormulaParts.push(formatCurrency(allowableCapitalNet));
  }
  if (pluggedFormulaParts.length === 1) {
    pluggedFormulaParts.push('$0');
  }

  const grossIncomeCalc: CalculationResult = {
    result: grossIncome,
    sourceFields: grossIncomeSourceFields,
    generalFormula: (extraSources.length > 0 || allowableRentalNet !== 0)
      ? 'Gross Income = Total W-2 Wages + Interest + Additional Incomes + Schedule E Rental + Net Capital Gains'
      : 'Gross Income = Total W-2 Wages + Other Incomes',
    pluggedFormula: `Gross Income = ${pluggedFormulaParts.join(' + ')} = ${formatCurrency(grossIncome)}`
  };

  // 3. Adjustments to Income (Above-the-line deductions)
  const adjustmentsCalc: CalculationResult = {
    result: totalAdjustments,
    sourceFields: ['input-adj-student-loan', 'input-adj-ira', 'input-adj-hsa'],
    generalFormula: 'Adjustments = Student Loan Interest + Traditional IRA + HSA Deduction',
    pluggedFormula: `Adjustments = ${formatCurrency(studentLoanInterest)} + ${formatCurrency(iraDeduction)} + ${formatCurrency(hsaDeduction)} = ${formatCurrency(totalAdjustments)}`
  };

  // 4. Adjusted Gross Income (AGI) - Line 11 on Form 1040
  const agi = Math.max(0, grossIncome - totalAdjustments);
  const agiCalc: CalculationResult = {
    result: agi,
    sourceFields: ['calc-gross-income', 'calc-total-adjustments'],
    generalFormula: 'Adjusted Gross Income (AGI) = Gross Income − Adjustments',
    pluggedFormula: `AGI = ${formatCurrency(grossIncome)} − ${formatCurrency(totalAdjustments)} = ${formatCurrency(agi)}`
  };

  // 5. Standard vs Itemized Deductions (Schedule A)
  const standardDeductionBase = rules.standardDeduction[filingStatus] || 14600;

  const medicalRaw = Number(state.itemizedDeductions?.medicalExpenses) || 0;
  const medicalThreshold = 0.075 * agi;
  const allowableMedical = Math.max(0, medicalRaw - medicalThreshold);

  const realEstateTax = Number(state.itemizedDeductions?.realEstateTax) || 0;
  const totalSaltPaid = realEstateTax + totalStateTaxWithheld + totalLocalTaxWithheld;
  const saltCap = filingStatus === 'married_separate' ? 5000 : 10000;
  const allowableSalt = Math.min(saltCap, totalSaltPaid);

  const mortgageInterest = Number(state.itemizedDeductions?.mortgageInterest) || 0;
  const charity = Number(state.itemizedDeductions?.charity) || 0;

  const totalItemized = allowableMedical + allowableSalt + mortgageInterest + charity;

  const method = state.deductionMethod || 'auto';
  let chosenMethod: 'standard' | 'itemized' = 'standard';
  let chosenDeduction = standardDeductionBase;

  if (method === 'auto') {
    if (totalItemized > standardDeductionBase) {
      chosenMethod = 'itemized';
      chosenDeduction = totalItemized;
    } else {
      chosenMethod = 'standard';
      chosenDeduction = standardDeductionBase;
    }
  } else if (method === 'itemized') {
    chosenMethod = 'itemized';
    chosenDeduction = totalItemized;
  } else {
    chosenMethod = 'standard';
    chosenDeduction = standardDeductionBase;
  }

  const isItemizedBetter = totalItemized > standardDeductionBase;
  const savingsOverAlternate = Math.abs(totalItemized - standardDeductionBase);

  const itemizedCalc: ItemizedDeductionCalculation = {
    result: totalItemized,
    sourceFields: [
      'input-itemized-medical',
      'input-itemized-salt',
      'input-itemized-mortgage',
      'input-itemized-charity',
      'calc-agi',
      'select-filing-status'
    ],
    generalFormula: 'Schedule A Itemized Total = Medical (>7.5% AGI) + SALT (capped at $10,000) + Mortgage Interest + Charity',
    pluggedFormula: `Schedule A Total = ${formatCurrency(allowableMedical)} (Medical) + ${formatCurrency(allowableSalt)} (SALT) + ${formatCurrency(mortgageInterest)} (Mortgage) + ${formatCurrency(charity)} (Charity) = ${formatCurrency(totalItemized)}`,
    isItemizedBetter,
    totalItemized,
    totalItemizedDeductions: totalItemized,
    allowableMedical,
    medicalDeductible: allowableMedical,
    allowableSalt,
    saltDeduction: allowableSalt,
    mortgage: mortgageInterest,
    charity,
    standardDeductionAmount: standardDeductionBase,
    standardDeduction: standardDeductionBase,
    chosenDeduction,
    chosenMethod,
    savingsOverAlternate
  };

  const deductionCalc: CalculationResult = {
    result: chosenDeduction,
    sourceFields: chosenMethod === 'itemized' 
      ? ['calc-itemized-deductions', 'select-filing-status'] 
      : ['select-filing-status', 'select-tax-year'],
    generalFormula: `Form 1040 Line 12 Deduction = ${method === 'auto' ? 'max(Standard Deduction, Schedule A Itemized Total)' : (chosenMethod === 'itemized' ? 'Schedule A Itemized Total' : 'Standard Deduction')}`,
    pluggedFormula: `Line 12 Deduction = max(Standard: ${formatCurrency(standardDeductionBase)}, Itemized: ${formatCurrency(totalItemized)}) = ${formatCurrency(chosenDeduction)} (${chosenMethod === 'itemized' ? 'Itemized Applied' : 'Standard Applied'})`
  };

  // 6. Taxable Income - Line 15 on Form 1040
  const taxableIncome = Math.max(0, agi - chosenDeduction);
  const taxableIncomeCalc: CalculationResult = {
    result: taxableIncome,
    sourceFields: ['calc-agi', 'calc-standard-deduction'],
    generalFormula: 'Taxable Income = max(0, AGI − Deductions)',
    pluggedFormula: `Taxable Income = max(0, ${formatCurrency(agi)} − ${formatCurrency(chosenDeduction)}) = ${formatCurrency(taxableIncome)}`
  };

  // 7. Federal Income Tax (Marginal Tax Brackets + Qualified Dividends and Capital Gain Tax Worksheet)
  const brackets = rules.brackets[filingStatus] || rules.brackets.single;
  const ltcgBrackets = rules.ltcgBrackets[filingStatus] || rules.ltcgBrackets.single;

  const netLtcgEligible = (allowableCapitalNet > 0 && ltGain > 0)
    ? Math.min(allowableCapitalNet, ltGain)
    : 0;
  const preferentialIncome = Math.min(taxableIncome, qualifiedDividendsTotal + netLtcgEligible);
  const ordinaryTaxableIncome = Math.max(0, taxableIncome - preferentialIncome);

  const bracketDetails: BracketDetail[] = [];
  let ordinaryTax = 0;
  const bracketFormulaParts: string[] = [];

  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    if (ordinaryTaxableIncome > b.min) {
      const taxableInBracket = Math.min(ordinaryTaxableIncome, b.max) - b.min;
      const taxFromBracket = taxableInBracket * b.rate;
      ordinaryTax += taxFromBracket;

      const maxLabel = b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`;
      bracketDetails.push({
        bracketIndex: i + 1,
        rate: b.rate,
        ratePercent: formatPercent(b.rate),
        range: `${formatCurrency(b.min)}${maxLabel}`,
        taxableAmount: taxableInBracket,
        taxAmount: taxFromBracket,
        formula: `${formatCurrency(taxableInBracket)} × ${formatPercent(b.rate)} = ${formatCurrency(taxFromBracket)}`
      });

      bracketFormulaParts.push(`(${formatCurrency(taxableInBracket)} × ${formatPercent(b.rate)})`);
    } else {
      bracketDetails.push({
        bracketIndex: i + 1,
        rate: b.rate,
        ratePercent: formatPercent(b.rate),
        range: `${formatCurrency(b.min)}${b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`}`,
        taxableAmount: 0,
        taxAmount: 0,
        formula: `$0 × ${formatPercent(b.rate)} = $0`
      });
    }
  }

  // Stack preferential income (Qualified Dividends + Net LTCG) from ordinaryTaxableIncome to taxableIncome across 0% / 15% / 20% brackets
  let preferentialTax = 0;
  const prefFormulaParts: string[] = [];
  if (preferentialIncome > 0) {
    for (const lb of ltcgBrackets) {
      const sliceBottom = Math.max(ordinaryTaxableIncome, lb.min);
      const sliceTop = Math.min(taxableIncome, lb.max);
      if (sliceTop > sliceBottom) {
        const chunk = sliceTop - sliceBottom;
        const chunkTax = chunk * lb.rate;
        preferentialTax += chunkTax;
        prefFormulaParts.push(`(${formatCurrency(chunk)} LTCG/QDiv × ${formatPercent(lb.rate)})`);
      }
    }
  }

  const tentativeTax = Math.round((ordinaryTax + preferentialTax) * 100) / 100;
  const taxBeforeCredits = tentativeTax;
  const taxBeforeCreditsCalc: TaxBeforeCreditsResult = {
    result: taxBeforeCredits,
    sourceFields: ['calc-taxable-income', 'select-filing-status'],
    generalFormula: preferentialIncome > 0
      ? 'Tentative Tax = Ordinary Bracket Tax on (Taxable Income − Preferential Income) + Qualified Dividends & LTCG Tax (0% / 15% / 20%)'
      : 'Tentative Tax = ∑(Taxable Income in Bracket i × Bracket Rate i)',
    pluggedFormula: preferentialIncome > 0
      ? `Ordinary Tax (${formatCurrencyExact(ordinaryTax)} on ${formatCurrency(ordinaryTaxableIncome)}) + Preferential LTCG/QDiv Tax (${prefFormulaParts.join(' + ')} = ${formatCurrencyExact(preferentialTax)}) = ${formatCurrencyExact(taxBeforeCredits)}`
      : (bracketFormulaParts.length > 0
          ? `Tentative Tax = ${bracketFormulaParts.join(' + ')} = ${formatCurrencyExact(taxBeforeCredits)}`
          : `Tentative Tax = $0 × 10% = $0`),
    brackets: bracketDetails,
    qualifiedDividendsTotal,
    preferentialIncome,
    preferentialTax,
    ordinaryTaxableIncome,
    ordinaryTax
  };

  // 8. Tax Credits (Child Tax Credit)
  const numChildren = Math.max(0, parseInt(String(state.dependents?.childrenCount), 10) || 0);
  let childCreditAllowed = 0;
  let childCreditPhaseoutAmount = 0;

  if (numChildren > 0) {
    const maxPotentialCredit = numChildren * rules.childTaxCreditPerChild;
    const threshold = rules.childTaxCreditPhaseout[filingStatus] || 200000;
    if (agi > threshold) {
      const excess = agi - threshold;
      const chunks = Math.ceil(excess / 1000);
      childCreditPhaseoutAmount = chunks * 50;
    }
    childCreditAllowed = Math.max(0, Math.min(taxBeforeCredits, maxPotentialCredit - childCreditPhaseoutAmount));
  }

  const creditsCalc: CalculationResult = {
    result: childCreditAllowed,
    sourceFields: ['input-children-count', 'calc-agi', 'calc-tax-before-credits'],
    generalFormula: 'Tax Credits = min(Tax Liability, Qualifying Children × $2,000 − Phaseout)',
    pluggedFormula: numChildren > 0
      ? `Credits = min(${formatCurrency(taxBeforeCredits)}, ${numChildren} × $2,000 ${childCreditPhaseoutAmount > 0 ? `− ${formatCurrency(childCreditPhaseoutAmount)}` : ''}) = ${formatCurrency(childCreditAllowed)}`
      : `Credits = 0 qualifying children = $0`
  };

  // 8b. FICA & Other Taxes (Form 8959 Additional Medicare Tax & Form 8960 Net Investment Income Tax)
  const box3Values = w2List.map(w => Number(w.box3) || 0);
  const box4Values = w2List.map(w => Number(w.box4) || 0);
  const box5Values = w2List.map(w => Number(w.box5) || 0);
  const box6Values = w2List.map(w => Number(w.box6) || 0);

  const totalSSWages = box3Values.reduce((s, v) => s + v, 0);
  const totalSSTax = box4Values.reduce((s, v) => s + v, 0);
  const totalMedWages = box5Values.reduce((s, v) => s + v, 0);
  const totalMedTax = box6Values.reduce((s, v) => s + v, 0);
  const totalFicaWithheld = totalSSTax + totalMedTax;

  // Excess Social Security Tax Credit (Schedule 3, Line 11): applies when 2+ employers withhold SS tax above the annual cap
  const maxAnnualSSTax = Math.round(rules.ssWageLimit * rules.ssRate * 100) / 100;
  const excessSSTaxCredit = w2List.length > 1 && totalSSTax > maxAnnualSSTax
    ? Math.round((totalSSTax - maxAnnualSSTax) * 100) / 100
    : 0;

  // Form 8959: 0.9% Additional Medicare Tax on combined Medicare wages (Box 5) above threshold ($200k Single / $250k MFJ)
  const addMedThreshold = rules.additionalMedicareThreshold[filingStatus] || 200000;
  const excessMedWages = Math.max(0, totalMedWages - addMedThreshold);
  const additionalMedicareTax = Math.round(excessMedWages * rules.additionalMedicareRate * 100) / 100;

  // Form 8960: 3.8% Net Investment Income Tax (NIIT) on min(Net Investment Income, max(0, MAGI - threshold))
  const niitThreshold = rules.niitThreshold[filingStatus] || 200000;
  const netInvestmentIncome = Math.max(
    0,
    interestIncome +
      net1099InterestTotal +
      total1099Dividends +
      Math.max(0, allowableCapitalNet) +
      Math.max(0, allowableRentalNet)
  );
  const magiExcessOverNiit = Math.max(0, agi - niitThreshold);
  const niitBase = Math.min(netInvestmentIncome, magiExcessOverNiit);
  const niit = Math.round(niitBase * rules.niitRate * 100) / 100;
  const totalOtherTaxes = Math.round((additionalMedicareTax + niit) * 100) / 100;

  const otherTaxesCalc: OtherTaxesCalculation = {
    result: totalOtherTaxes,
    additionalMedicareTax,
    niit,
    netInvestmentIncome,
    totalOtherTaxes,
    sourceFields: ['calc-agi', ...w2List.map((w, idx) => `w2-${w.id || idx}-box5`)],
    generalFormula: 'Schedule 2 Other Taxes = Form 8959 Additional Medicare Tax (0.9% over $200k) + Form 8960 NIIT (3.8% on min(NII, MAGI − $200k))',
    pluggedFormula: totalOtherTaxes > 0
      ? `Form 8959 (${formatCurrency(excessMedWages)} × 0.9% = ${formatCurrencyExact(additionalMedicareTax)}) + Form 8960 (min(NII ${formatCurrency(netInvestmentIncome)}, MAGI Excess ${formatCurrency(magiExcessOverNiit)}) × 3.8% = ${formatCurrencyExact(niit)}) = ${formatCurrencyExact(totalOtherTaxes)}`
      : 'Schedule 2 Other Taxes (Form 8959 + Form 8960) = $0'
  };

  // 9. Total Federal Tax Liability (Form 1040 Line 24 = max(0, Tentative Tax − Credits) + Schedule 2 Other Taxes)
  const totalTaxLiability = Math.round((Math.max(0, taxBeforeCredits - childCreditAllowed) + totalOtherTaxes) * 100) / 100;
  const totalTaxCalc: CalculationResult = {
    result: totalTaxLiability,
    sourceFields: [
      'calc-tax-before-credits',
      'calc-total-credits',
      ...(totalOtherTaxes > 0 ? ['calc-other-taxes'] : [])
    ],
    generalFormula: totalOtherTaxes > 0
      ? 'Total Tax Liability = max(0, Tentative Tax − Total Credits) + Schedule 2 Other Taxes (Form 8959 & Form 8960)'
      : 'Total Tax Liability = max(0, Tentative Tax − Total Credits)',
    pluggedFormula: totalOtherTaxes > 0
      ? `Total Tax Liability = max(0, ${formatCurrencyExact(taxBeforeCredits)} − ${formatCurrency(childCreditAllowed)}) + ${formatCurrencyExact(totalOtherTaxes)} = ${formatCurrencyExact(totalTaxLiability)}`
      : `Total Tax Liability = max(0, ${formatCurrencyExact(taxBeforeCredits)} − ${formatCurrency(childCreditAllowed)}) = ${formatCurrencyExact(totalTaxLiability)}`
  };

  // 10. Total Federal Income Tax Withheld & Payments (Box 2 from all W-2s + Schedule 3 Line 11 Excess SS Tax Credit)
  const box2Values = w2List.map(w => Number(w.box2) || 0);
  const w2Box2Total = box2Values.reduce((sum, val) => sum + val, 0);
  const totalWithheld = Math.round((w2Box2Total + excessSSTaxCredit) * 100) / 100;
  const w2WithheldFieldIds = [
    ...w2List.map((w, idx) => `w2-${w.id || idx}-box2`),
    ...(excessSSTaxCredit > 0 ? ['calc-fica-breakdown'] : [])
  ];

  const withholdingCalc: CalculationResult = {
    result: totalWithheld,
    sourceFields: w2WithheldFieldIds,
    generalFormula: excessSSTaxCredit > 0
      ? 'Total Federal Payments = ∑(W-2 Box 2) + Schedule 3 Line 11 Excess Social Security Tax Credit'
      : (w2List.length === 1 ? 'Total Withholding = W-2 Box 2' : 'Total Withholding = ∑(W-2 Box 2)'),
    pluggedFormula: excessSSTaxCredit > 0
      ? `Total Payments = ${box2Values.map(v => formatCurrencyExact(v)).join(' + ')} + ${formatCurrencyExact(excessSSTaxCredit)} (Excess SS Credit) = ${formatCurrencyExact(totalWithheld)}`
      : (w2List.length === 1
          ? `Total Withholding = ${formatCurrencyExact(box2Values[0])}`
          : `Total Withholding = ${box2Values.map(v => formatCurrencyExact(v)).join(' + ')} = ${formatCurrencyExact(totalWithheld)}`)
  };

  // 11. Final Refund or Amount You Owe
  const netDifference = Math.round((totalWithheld - totalTaxLiability) * 100) / 100;
  const isRefund = netDifference >= 0;
  const finalAmount = Math.abs(netDifference);

  const finalResultCalc: FinalResultCalculation = {
    result: finalAmount,
    isRefund: isRefund,
    netDifference: netDifference,
    sourceFields: ['calc-total-withholding', 'calc-total-tax-liability'],
    generalFormula: isRefund
      ? 'Refund = Total Payments (Withholding) − Total Tax Liability'
      : 'Amount Owed = Total Tax Liability − Total Payments (Withholding)',
    pluggedFormula: isRefund
      ? `Refund = ${formatCurrencyExact(totalWithheld)} − ${formatCurrencyExact(totalTaxLiability)} = ${formatCurrencyExact(finalAmount)}`
      : `Amount Owed = ${formatCurrencyExact(totalTaxLiability)} − ${formatCurrencyExact(totalWithheld)} = ${formatCurrencyExact(finalAmount)}`
  };

  // 12. FICA Breakdown (Social Security & Medicare from W2 boxes 3, 4, 5, 6 + Excess SS Tax Credit)
  const ficaCalc: FicaCalculation = {
    result: totalFicaWithheld,
    ssWages: totalSSWages,
    ssTax: totalSSTax,
    medWages: totalMedWages,
    medTax: totalMedTax,
    totalFica: totalFicaWithheld,
    excessSSTaxCredit,
    sourceFields: [
      ...w2List.map((w, idx) => `w2-${w.id || idx}-box4`),
      ...w2List.map((w, idx) => `w2-${w.id || idx}-box6`)
    ],
    generalFormula: excessSSTaxCredit > 0
      ? `Total FICA Withheld = Box 4 SS + Box 6 Medicare (Excess SS over ${formatCurrencyExact(maxAnnualSSTax)} cap = ${formatCurrencyExact(excessSSTaxCredit)} credited on Schedule 3 Line 11)`
      : 'Total FICA Taxes = Social Security Tax (Box 4) + Medicare Tax (Box 6)',
    pluggedFormula: excessSSTaxCredit > 0
      ? `Total FICA = ${formatCurrencyExact(totalSSTax)} (SS) + ${formatCurrencyExact(totalMedTax)} (Medicare) = ${formatCurrencyExact(totalFicaWithheld)} ➔ Schedule 3 Excess SS Credit = ${formatCurrencyExact(excessSSTaxCredit)}`
      : `Total FICA = ${formatCurrencyExact(totalSSTax)} + ${formatCurrencyExact(totalMedTax)} = ${formatCurrencyExact(totalFicaWithheld)}`
  };

  // Effective Tax Rate
  const effectiveRate = grossIncome > 0 ? (totalTaxLiability / grossIncome) : 0;
  const effectiveRateCalc: EffectiveRateCalculation = {
    rate: effectiveRate,
    sourceFields: ['calc-total-tax-liability', 'calc-gross-income'],
    generalFormula: 'Effective Tax Rate = Total Tax Liability ÷ Gross Income',
    pluggedFormula: `Effective Rate = ${formatCurrencyExact(totalTaxLiability)} ÷ ${formatCurrency(grossIncome)} = ${formatPercent(effectiveRate)}`
  };

  // 14. Multi-State Tax Return Engine & Unified Summary (Handles OSTC, Reciprocity, NYC Local Tax, DC Form D-30, & State Itemized Deductions)
  const { stateReturnsCalc, unifiedSummaryCalc } = calculateStateReturnsAndUnifiedSummary(
    state,
    w2List,
    totalW2Wages,
    grossIncome,
    agi,
    filingStatus,
    totalTaxLiability,
    totalWithheld,
    netDifference,
    isRefund,
    scheduleECalc,
    itemizedCalc
  );

  return {
    year,
    filingStatus,
    w2Count: w2List.length,
    w2WagesCalc,
    grossIncomeCalc,
    adjustmentsCalc,
    agiCalc,
    deductionCalc,
    itemizedCalc,
    capitalGainsCalc,
    scheduleECalc,
    taxableIncomeCalc,
    taxBeforeCreditsCalc,
    creditsCalc,
    otherTaxesCalc,
    totalTaxCalc,
    withholdingCalc,
    finalResultCalc,
    ficaCalc,
    stateTaxCalc,
    stateReturnsCalc,
    unifiedSummaryCalc,
    effectiveRateCalc
  };
}

/**
 * Multi-Pass State Return & Unified Tax Ledger Engine
 * Handles order independence, reciprocity agreements (e.g. NJ & PA), Other State Tax Credits (OSTC),
 * NYC Local Municipal Income Tax (Form IT-201), NY Itemized Deductions (Form IT-196), and D.C. Form D-30 UBT.
 */
export function calculateStateReturnsAndUnifiedSummary(
  state: TaxAppState,
  w2List: W2Data[],
  totalFederalWages: number,
  grossIncome: number,
  agi: number,
  filingStatus: FilingStatus,
  totalFederalLiability: number,
  totalFederalWithholding: number,
  federalNetDifference: number,
  federalIsRefund: boolean,
  scheduleECalc?: ScheduleECalculation,
  itemizedCalc?: ItemizedDeductionCalculation
): { stateReturnsCalc: StateReturnCalculation[]; unifiedSummaryCalc: UnifiedTaxSummary } {
  // 1. Determine resident state:
  let residentState = 'CA';
  if (state.residentState && state.residentState.trim().length > 0) {
    residentState = state.residentState.toUpperCase().trim();
  } else if (w2List[0]?.states?.[0]?.state && w2List[0].states[0].state.trim().length > 0) {
    residentState = w2List[0].states[0].state.toUpperCase().trim();
  }

  // 2. Discover all relevant states from W-2s, 1099s, and Schedule E Rental Property:
  const stateCodesSet = new Set<string>();
  stateCodesSet.add(residentState);
  w2List.forEach(w => {
    (w.states || []).forEach(s => {
      const code = (s.state || '').toUpperCase().trim();
      if (code) stateCodesSet.add(code);
    });
  });
  (state.otherIncome?.sources || []).forEach(src => {
    if (src.state) {
      const code = src.state.toUpperCase().trim();
      if (code) stateCodesSet.add(code);
    }
  });
  if (scheduleECalc && scheduleECalc.propertyState && (scheduleECalc.grossRents > 0 || scheduleECalc.allowableNet !== 0)) {
    stateCodesSet.add(scheduleECalc.propertyState);
  }

  const stateCodes = Array.from(stateCodesSet);
  const residentRule = getStateTaxRule(residentState);

  interface StateRawData {
    code: string;
    w2Wages: number;
    w2Withheld: number;
    localWages: number;
    localWithheld: number;
    hasNycLocality: boolean;
    other1099: number;
    rentalNet: number;
    rentalGross: number;
    sourceFieldIds: string[];
  }

  const rawMap = new Map<string, StateRawData>();
  stateCodes.forEach(c => {
    rawMap.set(c, {
      code: c,
      w2Wages: 0,
      w2Withheld: 0,
      localWages: 0,
      localWithheld: 0,
      hasNycLocality: false,
      other1099: 0,
      rentalNet: 0,
      rentalGross: 0,
      sourceFieldIds: []
    });
  });

  w2List.forEach((w, wIdx) => {
    (w.states || []).forEach((s, sIdx) => {
      const code = (s.state || residentState).toUpperCase().trim();
      if (!rawMap.has(code)) {
        rawMap.set(code, {
          code, w2Wages: 0, w2Withheld: 0, localWages: 0, localWithheld: 0,
          hasNycLocality: false, other1099: 0, rentalNet: 0, rentalGross: 0, sourceFieldIds: []
        });
      }
      const item = rawMap.get(code)!;
      item.w2Wages += Number(s.stateWages) || 0;
      item.w2Withheld += Number(s.stateTaxWithheld) || 0;
      item.localWages += Number(s.localWages) || 0;
      item.localWithheld += Number(s.localTaxWithheld) || 0;
      const loc = (s.localityName || '').toUpperCase().trim();
      if (loc.includes('NYC') || loc.includes('NEW YORK') || (code === 'NY' && (Number(s.localTaxWithheld) || 0) > 0)) {
        item.hasNycLocality = true;
      }
      item.sourceFieldIds.push(`w2-${w.id || wIdx}-state-${s.id || sIdx}-box16`);
      item.sourceFieldIds.push(`w2-${w.id || wIdx}-state-${s.id || sIdx}-box17`);
    });
  });

  (state.otherIncome?.sources || []).forEach((src, srcIdx) => {
    const code = (src.state || residentState).toUpperCase().trim();
    if (!rawMap.has(code)) {
      rawMap.set(code, {
        code, w2Wages: 0, w2Withheld: 0, localWages: 0, localWithheld: 0,
        hasNycLocality: false, other1099: 0, rentalNet: 0, rentalGross: 0, sourceFieldIds: []
      });
    }
    const item = rawMap.get(code)!;
    let amt = Number(src.amount) || 0;
    if (src.type === '1099-INT' && (Number(src.accruedInterestPaid) || 0) > 0) {
      amt = Math.max(0, amt - (Number(src.accruedInterestPaid) || 0));
    }
    item.other1099 += amt;
    item.sourceFieldIds.push(`input-source-${src.id || srcIdx}-amount`);
  });

  if (scheduleECalc && scheduleECalc.propertyState) {
    const pCode = scheduleECalc.propertyState;
    if (!rawMap.has(pCode)) {
      rawMap.set(pCode, {
        code: pCode, w2Wages: 0, w2Withheld: 0, localWages: 0, localWithheld: 0,
        hasNycLocality: false, other1099: 0, rentalNet: 0, rentalGross: 0, sourceFieldIds: []
      });
    }
    const item = rawMap.get(pCode)!;
    item.rentalNet += scheduleECalc.allowableNet;
    item.rentalGross += scheduleECalc.grossRents;
    item.sourceFieldIds.push('calc-schedule-e');
  }

  // PASS 1: Calculate all Non-Resident States first!
  const nonResidentReturns: StateReturnCalculation[] = [];
  const nonResidentCodes = stateCodes.filter(c => c !== residentState);

  for (const code of nonResidentCodes) {
    const rule = getStateTaxRule(code);
    const raw = rawMap.get(code)!;
    const stateWages = raw.w2Wages + raw.other1099 + Math.max(0, raw.rentalNet);
    const withholding = raw.w2Withheld;
    const localTax = raw.localWithheld;

    // Special Case: Washington, D.C. Nonresident Rental Property (Form D-30 Unincorporated Business Franchise Tax)
    if (code === 'DC' && raw.w2Wages === 0 && (raw.rentalGross > 0 || raw.other1099 > 0)) {
      const dcGrossReceipts = raw.rentalGross > 0 ? raw.rentalGross : raw.other1099;
      const dcNetRental = raw.rentalGross > 0 ? Math.max(0, raw.rentalNet) : raw.other1099;
      const salaryAllowance = Math.round(dcNetRental * 0.30 * 100) / 100;
      const specificExemption = 5000;
      const dcTaxableUbt = Math.max(0, dcNetRental - salaryAllowance - specificExemption);
      const rawUbtTax = Math.round(dcTaxableUbt * 0.0825 * 100) / 100;
      const dcLiability = dcGrossReceipts > 12000 ? Math.max(250, rawUbtTax) : 0;
      const netDiff = withholding - dcLiability;
      const isRefund = netDiff >= 0;
      const netOutcome = Math.abs(netDiff);

      nonResidentReturns.push({
        result: dcLiability,
        state: 'DC',
        stateName: rule.name,
        residentStatus: 'non_resident',
        formName: 'Form D-30 (Unincorporated Business Franchise Tax)',
        hasIncomeTax: true,
        stateWages: dcNetRental,
        stateStandardDeduction: Math.round((salaryAllowance + specificExemption) * 100) / 100,
        stateTaxableIncome: dcTaxableUbt,
        stateTaxBeforeCredit: dcLiability,
        creditForOtherStates: 0,
        creditedStates: [],
        reciprocityExemption: false,
        stateTaxLiability: dcLiability,
        localTaxLiability: 0,
        stateWithholding: withholding,
        localTaxWithheld: localTax,
        netOutcome,
        isRefund,
        sourceFields: raw.sourceFieldIds,
        generalFormula: 'DC Form D-30 UBT = max($250 Min, (Net Rental Income − 30% Salary Allowance − $5,000 Exemption) × 8.25%)',
        pluggedFormula: `DC Taxable UBT = ${formatCurrency(dcNetRental)} − ${formatCurrency(salaryAllowance)} (30% Allowance) − $5,000 (Exemption) = ${formatCurrency(dcTaxableUbt)} × 8.25% = ${formatCurrencyExact(dcLiability)}`
      });
      continue;
    }

    // Check Reciprocity (applies to W-2 wage compensation)
    const isReciprocal = ((rule.reciprocalWith && rule.reciprocalWith.includes(residentState)) ||
                         (residentRule.reciprocalWith && residentRule.reciprocalWith.includes(code))) &&
                         raw.rentalNet <= 0;

    if (isReciprocal) {
      const netOutcome = withholding; // 100% refund of any tax withheld in error
      nonResidentReturns.push({
        result: 0,
        state: code,
        stateName: rule.name,
        residentStatus: 'non_resident',
        formName: rule.formNonResident,
        hasIncomeTax: rule.hasIncomeTax,
        stateWages,
        stateStandardDeduction: 0,
        stateTaxableIncome: 0,
        stateTaxBeforeCredit: 0,
        creditForOtherStates: 0,
        creditedStates: [],
        reciprocityExemption: true,
        reciprocityNote: `Reciprocal agreement active between ${residentRule.name} (${residentState}) and ${rule.name} (${code}). Your compensation is legally exempt from ${code} state tax and taxable only in your home state of ${residentState}.`,
        stateTaxLiability: 0,
        localTaxLiability: 0,
        stateWithholding: withholding,
        localTaxWithheld: localTax,
        netOutcome,
        isRefund: true,
        sourceFields: raw.sourceFieldIds,
        generalFormula: `Tax = $0 (Reciprocal Agreement: ${residentState} & ${code})`,
        pluggedFormula: `State Wages: ${formatCurrency(stateWages)} ➔ State Tax Liability = $0 (Exempt via ${residentState}/${code} Reciprocity)`
      });
      continue;
    }

    if (!rule.hasIncomeTax) {
      nonResidentReturns.push({
        result: 0,
        state: code,
        stateName: rule.name,
        residentStatus: 'non_resident',
        formName: rule.formNonResident,
        hasIncomeTax: false,
        stateWages,
        stateStandardDeduction: 0,
        stateTaxableIncome: 0,
        stateTaxBeforeCredit: 0,
        creditForOtherStates: 0,
        creditedStates: [],
        reciprocityExemption: false,
        stateTaxLiability: 0,
        localTaxLiability: 0,
        stateWithholding: withholding,
        localTaxWithheld: localTax,
        netOutcome: withholding,
        isRefund: true,
        sourceFields: raw.sourceFieldIds,
        generalFormula: `${rule.name} imposes 0% personal income tax on wage compensation`,
        pluggedFormula: `State Tax = $0 (No ${rule.name} State Return Required)`
      });
      continue;
    }

    // Standard Non-Resident Calculation
    const stdDed = rule.standardDeduction[filingStatus] || 0;
    const taxable = Math.max(0, stateWages - stdDed);
    let tax = 0;
    if (rule.isFlat) {
      tax = taxable * (rule.flatRate || 0);
    } else {
      const bList = rule.brackets?.[filingStatus] || rule.brackets?.['single'] || [];
      tax = computeStateTaxFromBrackets(taxable, bList);
    }
    const stateTaxLiability = Math.round(tax * 100) / 100;
    const netDiff = withholding - stateTaxLiability;
    const isRefund = netDiff >= 0;
    const netOutcome = Math.abs(netDiff);

    nonResidentReturns.push({
      result: stateTaxLiability,
      state: code,
      stateName: rule.name,
      residentStatus: 'non_resident',
      formName: rule.formNonResident,
      hasIncomeTax: true,
      stateWages,
      stateStandardDeduction: stdDed,
      stateTaxableIncome: taxable,
      stateTaxBeforeCredit: stateTaxLiability,
      creditForOtherStates: 0,
      creditedStates: [],
      reciprocityExemption: false,
      stateTaxLiability,
      localTaxLiability: 0,
      stateWithholding: withholding,
      localTaxWithheld: localTax,
      netOutcome,
      isRefund,
      sourceFields: raw.sourceFieldIds,
      generalFormula: `${rule.formNonResident}: State Tax = max(0, State Sourced Wages − State Standard Deduction) × Rates`,
      pluggedFormula: `Taxable Income = ${formatCurrency(stateWages)} − ${formatCurrency(stdDed)} = ${formatCurrency(taxable)} ➔ State Tax Liability = ${formatCurrencyExact(stateTaxLiability)}`
    });
  }

  // PASS 2: Calculate Resident State Return (with Other State Tax Credit - OSTC, State Itemized Deductions, & NYC Local Tax)
  const resRaw = rawMap.get(residentState)!;
  const residentTotalWages = Math.max(resRaw.w2Wages + resRaw.other1099, agi > 0 ? agi : grossIncome, totalFederalWages);
  const resWithholding = resRaw.w2Withheld;
  const resLocalTax = resRaw.localWithheld;

  let residentReturn: StateReturnCalculation;

  if (!residentRule.hasIncomeTax) {
    residentReturn = {
      result: 0,
      state: residentState,
      stateName: residentRule.name,
      residentStatus: 'resident',
      formName: residentRule.formResident,
      hasIncomeTax: false,
      stateWages: residentTotalWages,
      stateStandardDeduction: 0,
      stateTaxableIncome: 0,
      stateTaxBeforeCredit: 0,
      creditForOtherStates: 0,
      creditedStates: [],
      reciprocityExemption: false,
      stateTaxLiability: 0,
      localTaxLiability: 0,
      stateWithholding: resWithholding,
      localTaxWithheld: resLocalTax,
      netOutcome: resWithholding,
      isRefund: true,
      sourceFields: resRaw.sourceFieldIds,
      generalFormula: `${residentRule.name} imposes 0% personal income tax on wage compensation`,
      pluggedFormula: `Tax = $0 (No ${residentRule.name} State Return Required)`
    };
  } else {
    const baseStdDed = residentRule.standardDeduction[filingStatus] || 0;
    // Support State Itemized Deductions (e.g., NY Form IT-196: Medical + Property Tax (up to $10k) + Mortgage Interest + Charity)
    let stateItemizedDed = 0;
    if (itemizedCalc && (residentState === 'NY' || residentState === 'CA' || residentState === 'DC' || residentState === 'MD' || residentState === 'VA')) {
      const propTax = Math.min(10000, Number(state.itemizedDeductions?.realEstateTax) || 0);
      stateItemizedDed = itemizedCalc.allowableMedical + propTax + itemizedCalc.mortgage + itemizedCalc.charity;
    }
    const useStateItemized = state.deductionMethod !== 'standard' && stateItemizedDed > baseStdDed;
    const resStdDed = useStateItemized ? stateItemizedDed : baseStdDed;

    const resTaxable = Math.max(0, residentTotalWages - resStdDed);
    let resTentativeTax = 0;
    if (residentRule.isFlat) {
      resTentativeTax = resTaxable * (residentRule.flatRate || 0);
    } else {
      const bList = residentRule.brackets?.[filingStatus] || residentRule.brackets?.['single'] || [];
      resTentativeTax = computeStateTaxFromBrackets(resTaxable, bList);
    }
    resTentativeTax = Math.round(resTentativeTax * 100) / 100;

    // NYC Municipal Resident Income Tax (Form IT-201 Lines 47–48) when NY resident has NYC local wages/withholding
    let nycLocalTaxLiability = 0;
    if (residentState === 'NY' && resRaw.hasNycLocality) {
      const nycBList = NYC_LOCAL_BRACKETS[filingStatus] || NYC_LOCAL_BRACKETS.single;
      nycLocalTaxLiability = Math.round(computeStateTaxFromBrackets(resTaxable, nycBList) * 100) / 100;
    }

    // Compute OSTC: Credit for taxes paid to non-resident states
    const creditedStates: StateOtherStateCredit[] = [];
    let totalOtherStateCredit = 0;

    for (const nr of nonResidentReturns) {
      if (nr.stateTaxLiability > 0 && !nr.reciprocityExemption && nr.hasIncomeTax) {
        const ratio = residentTotalWages > 0 ? Math.min(1.0, nr.stateWages / residentTotalWages) : 0;
        const homeAttributable = Math.round(resTentativeTax * ratio * 100) / 100;
        const creditAllowed = Math.min(nr.stateTaxLiability, homeAttributable);
        if (creditAllowed > 0) {
          creditedStates.push({
            fromState: nr.state,
            sourceTaxPaid: nr.stateTaxLiability,
            homeAttributableTax: homeAttributable,
            creditAllowed
          });
          totalOtherStateCredit += creditAllowed;
        }
      }
    }

    const netStateOnlyLiability = Math.max(0, Math.round((resTentativeTax - totalOtherStateCredit) * 100) / 100);
    const finalResLiability = Math.round((netStateOnlyLiability + nycLocalTaxLiability) * 100) / 100;
    const totalResWithholding = nycLocalTaxLiability > 0 ? (resWithholding + resLocalTax) : resWithholding;
    const resNetDiff = Math.round((totalResWithholding - finalResLiability) * 100) / 100;
    const resIsRefund = resNetDiff >= 0;
    const resNetOutcome = Math.abs(resNetDiff);

    const formLabel = nycLocalTaxLiability > 0
      ? `${residentRule.formResident} (NY State + NYC Local Tax)`
      : residentRule.formResident;

    let pluggedStr = '';
    if (nycLocalTaxLiability > 0) {
      pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)}${useStateItemized ? ' (Form IT-196 Itemized)' : ''} = ${formatCurrency(resTaxable)} ➔ NY State Tax: ${formatCurrencyExact(resTentativeTax)}${totalOtherStateCredit > 0 ? ` − ${creditedStates.map(c => c.fromState).join('/')} Credit: ${formatCurrencyExact(totalOtherStateCredit)}` : ''} + NYC Local Tax: ${formatCurrencyExact(nycLocalTaxLiability)} = ${formatCurrencyExact(finalResLiability)}`;
    } else if (creditedStates.length > 0) {
      pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)} = ${formatCurrency(resTaxable)} ➔ Tentative Tax: ${formatCurrencyExact(resTentativeTax)} − ${creditedStates.map(c => c.fromState).join('/')} Credit: ${formatCurrencyExact(totalOtherStateCredit)} = ${formatCurrencyExact(finalResLiability)}`;
    } else {
      pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)} = ${formatCurrency(resTaxable)} ➔ State Tax Liability = ${formatCurrencyExact(finalResLiability)}`;
    }

    residentReturn = {
      result: finalResLiability,
      state: residentState,
      stateName: nycLocalTaxLiability > 0 ? 'New York State & NYC' : residentRule.name,
      residentStatus: 'resident',
      formName: formLabel,
      hasIncomeTax: true,
      stateWages: residentTotalWages,
      stateStandardDeduction: resStdDed,
      stateTaxableIncome: resTaxable,
      stateTaxBeforeCredit: resTentativeTax,
      creditForOtherStates: totalOtherStateCredit,
      creditedStates,
      reciprocityExemption: false,
      stateTaxLiability: finalResLiability,
      localTaxLiability: nycLocalTaxLiability,
      stateWithholding: totalResWithholding,
      localTaxWithheld: resLocalTax,
      netOutcome: resNetOutcome,
      isRefund: resIsRefund,
      sourceFields: [
        ...resRaw.sourceFieldIds,
        ...creditedStates.map(c => `calc-state-${c.fromState.toLowerCase()}-liability`)
      ],
      generalFormula: nycLocalTaxLiability > 0
        ? `${residentRule.formResident}: Total NY/NYC Tax = max(0, NY State Tax − OSTC Credit) + NYC Municipal Resident Tax`
        : `${residentRule.formResident}: Net State Tax = max(0, (State Wages − Standard Deduction) × Rates − Other State Tax Credit)`,
      pluggedFormula: pluggedStr
    };
  }

  // Combined list of all state returns: resident state first, then non-resident states
  const allStateReturns = [residentReturn, ...nonResidentReturns];

  // PASS 3: Compute Unified Tax Summary (Federal + All States = Grand Total)
  const lines: UnifiedTaxJurisdictionLine[] = [];

  // Federal Line
  lines.push({
    jurisdiction: 'United States (Federal)',
    formName: 'IRS Form 1040',
    taxLiability: totalFederalLiability,
    withholding: totalFederalWithholding,
    netOutcome: federalNetDifference,
    isRefund: federalIsRefund,
    badge: federalIsRefund ? 'Federal Refund (Line 35a)' : 'Federal Tax Owed (Line 37)'
  });

  // State Lines
  let totalStateWithholding = 0;
  let totalStateLiability = 0;
  let totalStateNet = 0;

  for (const sr of allStateReturns) {
    totalStateWithholding += sr.stateWithholding;
    totalStateLiability += sr.stateTaxLiability;
    const signedNet = sr.isRefund ? sr.netOutcome : -sr.netOutcome;
    totalStateNet += signedNet;

    let badge: string | undefined = undefined;
    if (sr.creditForOtherStates > 0) {
      badge = `🛡️ OSTC Credit (-${formatCurrency(sr.creditForOtherStates)})`;
    } else if (sr.reciprocityExemption) {
      badge = `🤝 Reciprocity Active (100% Refund)`;
    } else if (!sr.hasIncomeTax) {
      badge = `🌴 0% Wage Tax State`;
    }

    lines.push({
      jurisdiction: `${sr.stateName} (${sr.residentStatus === 'resident' ? 'Resident' : 'Nonresident'})`,
      formName: sr.formName,
      taxLiability: sr.stateTaxLiability,
      withholding: sr.stateWithholding,
      netOutcome: signedNet,
      isRefund: sr.isRefund,
      badge
    });
  }

  totalStateNet = Math.round(totalStateNet * 100) / 100;
  const grandTotalNet = Math.round((federalNetDifference + totalStateNet) * 100) / 100;
  const isGrandTotalRefund = grandTotalNet >= 0;

  const unifiedSummaryCalc: UnifiedTaxSummary = {
    result: Math.abs(grandTotalNet),
    lines,
    federalNet: federalNetDifference,
    federalIsRefund,
    totalStateWithholding,
    totalStateLiability,
    totalStateNet,
    grandTotalNet,
    isGrandTotalRefund,
    sourceFields: [
      'calc-final-verdict',
      ...allStateReturns.map(s => `calc-state-${s.state.toLowerCase()}-outcome`)
    ],
    generalFormula: 'Grand Total Net Outcome = Federal Net (Withholding − Tax) + ∑ State Nets (Withholding − Tax)',
    pluggedFormula: `Grand Total = ${federalNetDifference >= 0 ? `+${formatCurrencyExact(federalNetDifference)}` : `-${formatCurrencyExact(Math.abs(federalNetDifference))}`} (Federal) + ${totalStateNet >= 0 ? `+${formatCurrencyExact(totalStateNet)}` : `-${formatCurrencyExact(Math.abs(totalStateNet))}`} (States) = ${grandTotalNet >= 0 ? `+${formatCurrencyExact(grandTotalNet)}` : `-${formatCurrencyExact(Math.abs(grandTotalNet))}`}`
  };

  return { stateReturnsCalc: allStateReturns, unifiedSummaryCalc };
}
