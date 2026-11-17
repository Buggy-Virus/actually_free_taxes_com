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
  CreditsCalculation,
  TaxCalculationSummary,
  CalcBlockDefinition,
  CalcLineItem,
  CalcVariableBreakdown,
  CalcVariableContributor,
  FormulaToken,
  StateModificationItem,
  AutoPanelItem
} from './types.js';
import {
  FormulaNode,
  inputNode,
  constNode,
  opNode,
  bracketsNode,
  compileFormulaToLines,
  extractSourceIds,
  BracketSliceNode
} from './formula-graph.js';

export type CoreFilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

interface YearTaxRules {
  standardDeduction: Record<CoreFilingStatus, number>;
  ssWageLimit: number;
  ssRate: number;
  medicareRate: number;
  additionalMedicareRate: number;
  additionalMedicareThreshold: Record<CoreFilingStatus, number>;
  niitRate: number;
  niitThreshold: Record<CoreFilingStatus, number>;
  childTaxCreditPerChild: number;
  childTaxCreditRefundableMax: number;
  childTaxCreditPhaseout: Record<CoreFilingStatus, number>;
  brackets: Record<CoreFilingStatus, BracketDef[]>;
  ltcgBrackets: Record<CoreFilingStatus, BracketDef[]>;
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

export const NYC_LOCAL_BRACKETS: Record<CoreFilingStatus, BracketDef[]> = {
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
  standardDeduction: Record<CoreFilingStatus, number>;
  isFlat: boolean;
  flatRate?: number;
  brackets?: Record<CoreFilingStatus, BracketDef[]>;
  reciprocalWith?: string[];
  notes?: string;
}

function makeBrackets(singleBrackets: BracketDef[], jointMultiplier = 2): Record<CoreFilingStatus, BracketDef[]> {
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

export function computeStateBracketDetails(taxable: number, brackets: BracketDef[]): BracketDetail[] {
  const details: BracketDetail[] = [];
  let remaining = Math.max(0, taxable);
  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    const bracketWidth = b.max === Infinity ? Infinity : b.max - b.min;
    const maxLabel = b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`;
    if (taxable > b.min) {
      const taxableInBracket = Math.min(taxable, b.max) - b.min;
      const taxFromBracket = taxableInBracket * b.rate;
      const remBefore = remaining;
      remaining = Math.max(0, remaining - taxableInBracket);
      details.push({
        bracketIndex: i + 1,
        rate: b.rate,
        ratePercent: formatPercent(b.rate),
        range: `${formatCurrency(b.min)}${maxLabel}`,
        taxableAmount: taxableInBracket,
        taxAmount: taxFromBracket,
        formula: `${formatCurrency(taxableInBracket)} × ${formatPercent(b.rate)} = ${formatCurrency(taxFromBracket)}`,
        bracketWidth,
        remainingBefore: remBefore,
        remainingAfter: remaining
      });
    } else {
      details.push({
        bracketIndex: i + 1,
        rate: b.rate,
        ratePercent: formatPercent(b.rate),
        range: `${formatCurrency(b.min)}${maxLabel}`,
        taxableAmount: 0,
        taxAmount: 0,
        formula: `$0 × ${formatPercent(b.rate)} = $0`,
        bracketWidth,
        remainingBefore: 0,
        remainingAfter: 0
      });
    }
  }
  return details;
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
    case 'qualifying_surviving_spouse': return 'Qualifying Surviving Spouse';
    default: return 'Single';
  }
}

export function normalizeFilingStatus(status: FilingStatus): CoreFilingStatus {
  if (status === 'qualifying_surviving_spouse') return 'married_joint';
  return status || 'single';
}

/**
 * Perform complete tax calculation with fully annotated general & plugged-in equations.
 */
export function calculateTaxes(state: TaxAppState): TaxCalculationSummary {
  const year = state.year || 2024;
  const filingStatus = state.filingStatus || 'single';
  const effectiveStatus = normalizeFilingStatus(filingStatus);
  const rules = TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];

  const w2List: W2Data[] = state.w2s && state.w2s.length > 0
    ? state.w2s
    : [{ id: 0, employer: '', ein: '', box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0, states: [] }];

  // 1. Total W-2 Wages (Box 1) & FICA W-2 Totals
  const box1Values = w2List.map(w => Number(w.box1) || 0);
  const totalW2Wages = box1Values.reduce((sum, val) => sum + val, 0);
  const w2WageFieldIds = w2List.map((w, idx) => `w2-${w.id || idx}-box1`);

  const box3Values = w2List.map(w => Number(w.box3) || 0);
  const box4Values = w2List.map(w => Number(w.box4) || 0);
  const box5Values = w2List.map(w => Number(w.box5) || 0);
  const box6Values = w2List.map(w => Number(w.box6) || 0);

  const totalSSWages = box3Values.reduce((s, v) => s + v, 0);
  const totalSSTax = box4Values.reduce((s, v) => s + v, 0);
  const totalMedWages = box5Values.reduce((s, v) => s + v, 0);
  const totalMedTax = box6Values.reduce((s, v) => s + v, 0);
  const totalFicaWithheld = totalSSTax + totalMedTax;

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

  // Capital Gains / Losses (Schedule D / Line 7 + 28% Collectibles & 25% Unrecaptured Sec. 1250 Gain)
  const stGain = Number(state.otherIncome?.capitalGains?.shortTerm) || 0;
  const ltGain = Number(state.otherIncome?.capitalGains?.longTerm) || 0;
  const carryoverLoss = Math.max(0, Number(state.otherIncome?.capitalGains?.carryoverLoss) || 0);
  const collectiblesGain = Math.max(0, Number(state.otherIncome?.capitalGains?.collectiblesGain) || 0);
  const unrecaptured1250Gain = Math.max(0, Number(state.otherIncome?.capitalGains?.unrecaptured1250Gain) || 0);
  const netGainLoss = stGain + ltGain - carryoverLoss;
  const maxLoss = effectiveStatus === 'married_separate' ? -1500 : -3000;
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

  // Additional Incomes (1099-NEC, 1099-K, Schedule F, 1099-DIV, 1099-INT, 1099-MISC, 1099-R, SSA-1099, Schedule K-1, 1099-G, W-2G)
  const interestIncome = Number(state.otherIncome?.interest) || 0;
  const alimonyReceived = Math.max(0, Number(state.otherIncome?.alimonyReceived) || 0);
  const feieLimit = year === 2025 ? 130000 : 126500;
  const foreignEarnedExclusion = Math.min(feieLimit, Math.max(0, Number(state.otherIncome?.foreignEarnedIncomeExclusion) || 0));
  const unreportedTips = Math.max(0, Number(state.otherIncome?.unreportedTips) || 0);
  const unreportedTipsFicaTax = Math.round(unreportedTips * 0.0765 * 100) / 100;
  const extraSources = state.otherIncome?.sources || [];
  let nonSsaExtraSourcesTotal = 0;
  let qualifiedDividendsTotal = 0;
  let net1099InterestTotal = 0;
  let taxExemptInterestTotal = 0;
  let total1099Dividends = 0;
  let netScheduleCProfit = 0;
  let k1IncomeTotal = 0;
  let ssaGrossTotal = 0;
  let gamblingWinningsTotal = 0;
  let retirement1099RTotal = 0;
  let earlyDist1099RTotal = 0;
  let extra1099WithheldTotal = 0;

  let remainingSchedCExpenses = scheduleCExpenses;
  extraSources.forEach(s => {
    let amt = Number(s.amount) || 0;
    extra1099WithheldTotal += Math.max(0, Number(s.federalTaxWithheld) || 0);

    if (s.type === '1099-NEC' || s.type === '1099-K' || s.type === 'Schedule F') {
      const expUsed = Math.min(Math.max(0, amt), remainingSchedCExpenses);
      remainingSchedCExpenses -= expUsed;
      amt = Math.max(0, amt - expUsed);
      netScheduleCProfit += amt;
      nonSsaExtraSourcesTotal += amt;
    } else if (s.type === '1099-INT') {
      const accrued = Math.max(0, Number(s.accruedInterestPaid) || 0);
      amt = Math.max(0, amt - accrued);
      net1099InterestTotal += amt;
      taxExemptInterestTotal += Math.max(0, Number(s.taxExemptInterest) || 0);
      nonSsaExtraSourcesTotal += amt;
    } else if (s.type === '1099-DIV') {
      total1099Dividends += amt;
      const qDiv = Math.min(amt, Math.max(0, Number(s.qualifiedDividends) || 0));
      qualifiedDividendsTotal += qDiv;
      nonSsaExtraSourcesTotal += amt;
    } else if (s.type === 'Schedule K-1') {
      k1IncomeTotal += amt;
      nonSsaExtraSourcesTotal += amt;
    } else if (s.type === '1099-R') {
      retirement1099RTotal += amt;
      if (s.earlyDistributionPenalty) {
        earlyDist1099RTotal += Math.max(0, amt);
      }
      nonSsaExtraSourcesTotal += amt;
    } else if (s.type === 'W-2G') {
      gamblingWinningsTotal += Math.max(0, amt);
      nonSsaExtraSourcesTotal += amt;
    } else if (s.type === 'SSA-1099') {
      ssaGrossTotal += Math.max(0, amt);
    } else {
      nonSsaExtraSourcesTotal += amt;
    }
  });

  // Schedule SE Self-Employment Tax (15.3% on 92.35% of Net Schedule C Profit when >= $400)
  let selfEmploymentTax = 0;
  let halfSelfEmploymentTaxDeduction = 0;
  let seTaxableEarnings = 0;
  let seSSPortion = 0;
  let seMedPortion = 0;
  if (netScheduleCProfit >= 400) {
    seTaxableEarnings = netScheduleCProfit * 0.9235;
    const remainingSSCap = Math.max(0, rules.ssWageLimit - totalSSWages);
    seSSPortion = Math.round(Math.min(seTaxableEarnings, remainingSSCap) * 0.124 * 100) / 100;
    seMedPortion = Math.round(seTaxableEarnings * 0.029 * 100) / 100;
    selfEmploymentTax = Math.round((seSSPortion + seMedPortion) * 100) / 100;
    halfSelfEmploymentTaxDeduction = Math.round(selfEmploymentTax * 0.50 * 100) / 100;
  }

  // Above-the-Line Adjustments (Schedule 1 Part II)
  const studentLoanInterest = Math.min(2500, Math.max(0, Number(state.adjustments?.studentLoan) || 0));
  const iraDeduction = Math.max(0, Number(state.adjustments?.ira) || 0);
  const hsaDeduction = Math.max(0, Number(state.adjustments?.hsa) || 0);
  const maxEducator = effectiveStatus === 'married_joint' ? 600 : 300;
  const educatorExpenses = Math.min(maxEducator, Math.max(0, Number(state.adjustments?.educatorExpenses) || 0));
  const seRetirement = Math.max(0, Number(state.adjustments?.seRetirement) || 0);
  const seHealthInsurance = Math.max(0, Number(state.adjustments?.seHealthInsurance) || 0);
  const alimonyPaid = Math.max(0, Number(state.adjustments?.alimonyPaid) || 0);
  const militaryMoving = Math.max(0, Number(state.adjustments?.militaryMoving) || 0);
  const earlyWithdrawalPenalty = Math.max(0, Number(state.adjustments?.earlyWithdrawalPenalty) || 0);
  const juryDutyPay = Math.max(0, Number(state.adjustments?.juryDutyPay) || 0);

  const manualAdjustments = studentLoanInterest + iraDeduction + hsaDeduction + educatorExpenses + seRetirement + seHealthInsurance + alimonyPaid + militaryMoving + earlyWithdrawalPenalty + juryDutyPay;
  const totalAdjustments = Math.round((manualAdjustments + halfSelfEmploymentTaxDeduction) * 100) / 100;

  // Schedule E Rental Real Estate (Schedule 1, Line 5 & Form 8582 Passive Activity Loss Rules)
  const rentalGross = Math.max(0, Number(state.otherIncome?.scheduleERental?.grossRents) || 0);
  const rentalExpenses = Math.max(0, Number(state.otherIncome?.scheduleERental?.expenses) || 0);
  const rentalDepreciation = Math.max(0, Number(state.otherIncome?.scheduleERental?.depreciation) || 0);
  const rentalPropertyState = (state.otherIncome?.scheduleERental?.propertyState || '').toUpperCase().trim();
  const hasScheduleEInput = rentalGross > 0 || rentalExpenses > 0 || rentalDepreciation > 0;
  const rentalNetBeforePal = rentalGross - rentalExpenses - rentalDepreciation;

  // Compute MAGI before passive rental loss for Form 8582 $25,000 active participation allowance phaseout ($100k–$150k)
  const magiBeforeRental = Math.max(0, totalW2Wages + interestIncome + nonSsaExtraSourcesTotal + allowableCapitalNet - totalAdjustments);
  let allowableRentalNet = rentalNetBeforePal;
  let disallowedPassiveLoss = 0;

  if (rentalNetBeforePal < 0) {
    const maxPalAllowance = effectiveStatus === 'married_separate' ? 12500 : 25000;
    const palPhaseoutStart = effectiveStatus === 'married_separate' ? 50000 : 100000;
    const palReduction = Math.max(0, (magiBeforeRental - palPhaseoutStart) * 0.5);
    const allowedLossCap = Math.max(0, maxPalAllowance - palReduction);
    allowableRentalNet = -Math.min(Math.abs(rentalNetBeforePal), allowedLossCap);
    disallowedPassiveLoss = Math.abs(rentalNetBeforePal) - Math.abs(allowableRentalNet);
  }

  // IRS Social Security Benefits Worksheet (Form 1040 Lines 6a & 6b: 0% / 50% / 85% taxable based on Provisional Income)
  let taxableSocialSecurity = 0;
  if (ssaGrossTotal > 0) {
    const provisionalIncome = Math.max(
      0,
      totalW2Wages +
        interestIncome +
        nonSsaExtraSourcesTotal +
        allowableCapitalNet +
        allowableRentalNet +
        taxExemptInterestTotal +
        0.5 * ssaGrossTotal -
        totalAdjustments
    );
    const ssBase1 = effectiveStatus === 'married_joint' ? 32000 : (effectiveStatus === 'married_separate' ? 0 : 25000);
    const ssBase2 = effectiveStatus === 'married_joint' ? 44000 : (effectiveStatus === 'married_separate' ? 0 : 34000);

    if (provisionalIncome > ssBase2) {
      const tier1Max = (ssBase2 - ssBase1) * 0.5;
      const tier1 = Math.min(0.5 * ssaGrossTotal, tier1Max);
      const excessOverBase2 = (provisionalIncome - ssBase2) * 0.85;
      taxableSocialSecurity = Math.round(Math.min(0.85 * ssaGrossTotal, tier1 + excessOverBase2) * 100) / 100;
    } else if (provisionalIncome > ssBase1) {
      taxableSocialSecurity = Math.round(Math.min(0.5 * ssaGrossTotal, (provisionalIncome - ssBase1) * 0.5) * 100) / 100;
    }
  }

  const extraSourcesTotal = Math.round((nonSsaExtraSourcesTotal + taxableSocialSecurity) * 100) / 100;

  const scheduleECalc: ScheduleECalculation = {
    result: allowableRentalNet,
    grossRents: rentalGross,
    expenses: rentalExpenses,
    depreciation: rentalDepreciation,
    netBeforePal: rentalNetBeforePal,
    allowableNet: allowableRentalNet,
    disallowedPassiveLoss,
    k1Income: k1IncomeTotal,
    propertyState: rentalPropertyState,
    sourceFields: ['input-rental-gross', 'input-rental-expenses', 'input-rental-depreciation'],
    generalFormula: 'Schedule E Net Rental Income = Gross Rents − Operating Expenses − MACRS Depreciation (Losses subject to Form 8582 PAL rules)',
    pluggedFormula: hasScheduleEInput
      ? (disallowedPassiveLoss > 0
          ? `Net Rent = ${formatCurrency(rentalGross)} − ${formatCurrency(rentalExpenses)} − ${formatCurrency(rentalDepreciation)} = ${formatCurrency(rentalNetBeforePal)} ➔ Form 8582 Allowed: ${formatCurrency(allowableRentalNet)} (${formatCurrency(disallowedPassiveLoss)} suspended)`
          : `Net Rent = ${formatCurrency(rentalGross)} − ${formatCurrency(rentalExpenses)} − ${formatCurrency(rentalDepreciation)} = ${formatCurrency(allowableRentalNet)}`)
      : 'Schedule E Net Rental Income = $0'
  };

  const otherIncomeTotal = interestIncome + extraSourcesTotal + allowableCapitalNet + allowableRentalNet + alimonyReceived + unreportedTips - foreignEarnedExclusion;

  // 2. Total Gross Income
  const grossIncome = Math.round(Math.max(0, totalW2Wages + otherIncomeTotal) * 100) / 100;
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
  let remSchedCForDisplay = scheduleCExpenses;
  extraSources.forEach(s => {
    if ((Number(s.amount) || 0) !== 0) {
      let amt = Number(s.amount) || 0;
      if (s.type === '1099-NEC' && remSchedCForDisplay > 0) {
        const expUsed = Math.min(Math.max(0, amt), remSchedCForDisplay);
        remSchedCForDisplay -= expUsed;
        amt = Math.max(0, amt - expUsed);
      } else if (s.type === '1099-INT' && (Number(s.accruedInterestPaid) || 0) > 0) {
        amt = Math.max(0, amt - (Number(s.accruedInterestPaid) || 0));
      } else if (s.type === 'SSA-1099') {
        amt = taxableSocialSecurity;
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
  const extraAdjParts: string[] = [];
  if (halfSelfEmploymentTaxDeduction > 0) extraAdjParts.push(`${formatCurrencyExact(halfSelfEmploymentTaxDeduction)} (½ SE Tax)`);
  if (educatorExpenses > 0) extraAdjParts.push(`${formatCurrency(educatorExpenses)} (Educator)`);
  if (seRetirement > 0) extraAdjParts.push(`${formatCurrency(seRetirement)} (SEP/SIMPLE)`);
  if (seHealthInsurance > 0) extraAdjParts.push(`${formatCurrency(seHealthInsurance)} (SE Health)`);
  if (alimonyPaid > 0) extraAdjParts.push(`${formatCurrency(alimonyPaid)} (Alimony)`);

  const adjustmentsCalc: CalculationResult = {
    result: totalAdjustments,
    sourceFields: ['input-adj-student-loan', 'input-adj-ira', 'input-adj-hsa'],
    generalFormula: extraAdjParts.length > 0
      ? 'Adjustments = Student Loan Interest + Traditional IRA + HSA + ½ SE Tax & Schedule 1 Adjustments'
      : 'Adjustments = Student Loan Interest + Traditional IRA + HSA Deduction',
    pluggedFormula: extraAdjParts.length > 0
      ? `Adjustments = ${formatCurrency(studentLoanInterest)} + ${formatCurrency(iraDeduction)} + ${formatCurrency(hsaDeduction)} + ${extraAdjParts.join(' + ')} = ${formatCurrencyExact(totalAdjustments)}`
      : `Adjustments = ${formatCurrency(studentLoanInterest)} + ${formatCurrency(iraDeduction)} + ${formatCurrency(hsaDeduction)} = ${formatCurrency(totalAdjustments)}`
  };

  // 4. Adjusted Gross Income (AGI) - Line 11 on Form 1040
  const agi = Math.round(Math.max(0, grossIncome - totalAdjustments) * 100) / 100;
  const agiCalc: CalculationResult = {
    result: agi,
    sourceFields: ['calc-gross-income', 'calc-total-adjustments'],
    generalFormula: 'Adjusted Gross Income (AGI) = Gross Income − Adjustments',
    pluggedFormula: `AGI = ${formatCurrency(grossIncome)} − ${formatCurrencyExact(totalAdjustments)} = ${formatCurrencyExact(agi)}`
  };

  // 5. Standard vs Itemized Deductions (Schedule A) + Age 65+/Blind Additional Standard Deduction + 20% QBI Deduction
  const age65OrBlindCount = Math.max(0, Math.min(4, parseInt(String(state.dependents?.age65OrBlindCount), 10) || 0));
  const perBoxAddStdDed = (effectiveStatus === 'single' || effectiveStatus === 'head_of_household')
    ? (year === 2025 ? 2000 : 1950)
    : (year === 2025 ? 1600 : 1550);
  const additionalStandardDeduction = age65OrBlindCount * perBoxAddStdDed;
  const standardDeductionBase = (rules.standardDeduction[effectiveStatus] || 14600) + additionalStandardDeduction;

  const medicalRaw = Number(state.itemizedDeductions?.medicalExpenses) || 0;
  const medicalThreshold = 0.075 * agi;
  const allowableMedical = Math.max(0, medicalRaw - medicalThreshold);

  const realEstateTax = Number(state.itemizedDeductions?.realEstateTax) || 0;
  const totalSaltPaid = realEstateTax + totalStateTaxWithheld + totalLocalTaxWithheld;
  const saltCap = effectiveStatus === 'married_separate' ? 5000 : 10000;
  const allowableSalt = Math.min(saltCap, totalSaltPaid);

  const mortgageInterest = Number(state.itemizedDeductions?.mortgageInterest) || 0;
  const charity = Number(state.itemizedDeductions?.charity) || 0;
  const gamblingLossesRaw = Math.max(0, Number(state.itemizedDeductions?.gamblingLosses) || 0);
  const allowableGamblingLosses = Math.min(gamblingWinningsTotal, gamblingLossesRaw);
  const investmentInterestRaw = Math.max(0, Number(state.itemizedDeductions?.investmentInterest) || 0);
  const netInvFor4952 = Math.max(0, interestIncome + net1099InterestTotal + Math.max(0, allowableCapitalNet));
  const allowableInvestmentInterest = Math.min(netInvFor4952, investmentInterestRaw);
  const casualtyLoss = Math.max(0, Number(state.itemizedDeductions?.casualtyLoss) || 0);

  const totalItemized = allowableMedical + allowableSalt + mortgageInterest + charity + allowableGamblingLosses + allowableInvestmentInterest + casualtyLoss;

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

  // Form 8995: 20% Qualified Business Income (QBI) Deduction (Form 1040 Line 13)
  const netLtcgEligible = (allowableCapitalNet > 0 && ltGain > 0)
    ? Math.min(allowableCapitalNet, ltGain)
    : 0;
  const taxableIncomeBeforeQbi = Math.max(0, agi - chosenDeduction);
  const qbiBaseIncome = Math.max(0, netScheduleCProfit - halfSelfEmploymentTaxDeduction - seRetirement - seHealthInsurance) + Math.max(0, k1IncomeTotal);
  const qbiCapBase = Math.max(0, taxableIncomeBeforeQbi - (qualifiedDividendsTotal + netLtcgEligible));
  const qbiDeduction = qbiBaseIncome > 0
    ? Math.round(Math.min(qbiBaseIncome * 0.20, qbiCapBase * 0.20) * 100) / 100
    : 0;

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
    pluggedFormula: `Schedule A Total = ${formatCurrency(allowableMedical)} (Medical) + ${formatCurrency(allowableSalt)} (SALT) + ${formatCurrency(mortgageInterest)} (Mortgage) + ${formatCurrency(charity)} (Charity)${allowableGamblingLosses > 0 ? ` + ${formatCurrency(allowableGamblingLosses)} (Gambling Loss)` : ''} = ${formatCurrency(totalItemized)}`,
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
    qbiDeduction,
    chosenDeduction,
    chosenMethod,
    savingsOverAlternate
  };

  const deductionCalc: CalculationResult = {
    result: chosenDeduction,
    sourceFields: chosenMethod === 'itemized' 
      ? ['calc-itemized-deductions', 'select-filing-status'] 
      : ['select-filing-status', 'select-tax-year'],
    generalFormula: `Form 1040 Line 12 Deduction = ${method === 'auto' ? 'max(Standard Deduction, Schedule A Itemized Total)' : (chosenMethod === 'itemized' ? 'Schedule A Itemized Total' : 'Standard Deduction')}${qbiDeduction > 0 ? ' (+ Line 13 20% QBI Deduction)' : ''}`,
    pluggedFormula: `Line 12 Deduction = max(Standard: ${formatCurrency(standardDeductionBase)}, Itemized: ${formatCurrency(totalItemized)}) = ${formatCurrency(chosenDeduction)} (${chosenMethod === 'itemized' ? 'Itemized Applied' : 'Standard Applied'})${qbiDeduction > 0 ? ` + Line 13 QBI Deduction: ${formatCurrencyExact(qbiDeduction)}` : ''}`
  };

  // 6. Taxable Income - Line 15 on Form 1040 (AGI − Line 12 Deduction − Line 13 QBI Deduction)
  const taxableIncome = Math.round(Math.max(0, agi - chosenDeduction - qbiDeduction) * 100) / 100;
  const taxableIncomeCalc: CalculationResult = {
    result: taxableIncome,
    sourceFields: ['calc-agi', 'calc-standard-deduction'],
    generalFormula: qbiDeduction > 0
      ? 'Taxable Income = max(0, AGI − Line 12 Deduction − Line 13 QBI Deduction)'
      : 'Taxable Income = max(0, AGI − Deductions)',
    pluggedFormula: qbiDeduction > 0
      ? `Taxable Income = max(0, ${formatCurrencyExact(agi)} − ${formatCurrency(chosenDeduction)} − ${formatCurrencyExact(qbiDeduction)} QBI) = ${formatCurrencyExact(taxableIncome)}`
      : `Taxable Income = max(0, ${formatCurrencyExact(agi)} − ${formatCurrency(chosenDeduction)}) = ${formatCurrencyExact(taxableIncome)}`
  };

  // 7. Federal Income Tax (Marginal Tax Brackets + Qualified Dividends & Schedule D Tax Worksheet incl. 25%/28% gains)
  const brackets = rules.brackets[effectiveStatus] || rules.brackets.single;
  const ltcgBrackets = rules.ltcgBrackets[effectiveStatus] || rules.ltcgBrackets.single;

  const specialCapGains = Math.min(netLtcgEligible, collectiblesGain + unrecaptured1250Gain);
  const standardLtcgEligible = Math.max(0, netLtcgEligible - specialCapGains);
  const preferentialIncome = Math.min(taxableIncome, qualifiedDividendsTotal + standardLtcgEligible + specialCapGains);
  const ordinaryTaxableIncome = Math.max(0, taxableIncome - preferentialIncome);

  const bracketDetails: BracketDetail[] = [];
  let ordinaryTax = 0;
  const bracketFormulaParts: string[] = [];

  let remainingOrdinary = ordinaryTaxableIncome;
  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    const bracketWidth = b.max === Infinity ? Infinity : b.max - b.min;
    if (ordinaryTaxableIncome > b.min) {
      const taxableInBracket = Math.min(ordinaryTaxableIncome, b.max) - b.min;
      const taxFromBracket = taxableInBracket * b.rate;
      const remBefore = remainingOrdinary;
      remainingOrdinary = Math.max(0, remainingOrdinary - taxableInBracket);
      ordinaryTax += taxFromBracket;

      const maxLabel = b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`;
      bracketDetails.push({
        bracketIndex: i + 1,
        rate: b.rate,
        ratePercent: formatPercent(b.rate),
        range: `${formatCurrency(b.min)}${maxLabel}`,
        taxableAmount: taxableInBracket,
        taxAmount: taxFromBracket,
        formula: `${formatCurrency(taxableInBracket)} × ${formatPercent(b.rate)} = ${formatCurrency(taxFromBracket)}`,
        bracketWidth,
        remainingBefore: remBefore,
        remainingAfter: remainingOrdinary
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
        formula: `$0 × ${formatPercent(b.rate)} = $0`,
        bracketWidth,
        remainingBefore: 0,
        remainingAfter: 0
      });
    }
  }

  // Stack standard preferential income (Qualified Dividends + 0/15/20% LTCG) and 25%/28% Schedule D gains
  let preferentialTax = 0;
  let collectiblesTax = 0;
  let unrecaptured1250Tax = 0;
  const prefFormulaParts: string[] = [];

  const stdPrefIncome = Math.min(preferentialIncome, qualifiedDividendsTotal + standardLtcgEligible);
  const stdPrefTop = ordinaryTaxableIncome + stdPrefIncome;

  if (stdPrefIncome > 0) {
    for (const lb of ltcgBrackets) {
      const sliceBottom = Math.max(ordinaryTaxableIncome, lb.min);
      const sliceTop = Math.min(stdPrefTop, lb.max);
      if (sliceTop > sliceBottom) {
        const chunk = sliceTop - sliceBottom;
        const chunkTax = chunk * lb.rate;
        preferentialTax += chunkTax;
        prefFormulaParts.push(`(${formatCurrency(chunk)} LTCG/QDiv × ${formatPercent(lb.rate)})`);
      }
    }
  }

  const remainingSpecialPref = Math.max(0, preferentialIncome - stdPrefIncome);
  if (remainingSpecialPref > 0) {
    const applied1250 = Math.min(remainingSpecialPref, unrecaptured1250Gain);
    const appliedCollectibles = Math.max(0, remainingSpecialPref - applied1250);
    if (applied1250 > 0) {
      unrecaptured1250Tax = applied1250 * 0.25;
      preferentialTax += unrecaptured1250Tax;
      prefFormulaParts.push(`(${formatCurrency(applied1250)} Sec. 1250 × 25%)`);
    }
    if (appliedCollectibles > 0) {
      collectiblesTax = appliedCollectibles * 0.28;
      preferentialTax += collectiblesTax;
      prefFormulaParts.push(`(${formatCurrency(appliedCollectibles)} Collectibles × 28%)`);
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
    ordinaryTax,
    collectiblesTax,
    unrecaptured1250Tax
  };

  // 8. Tax Credits (Child Tax Credit, Other Dependents Credit, Child Care Form 2441, Education Form 8863, Saver's Form 8880, Foreign Tax Form 1116, Clean Energy Form 5695, Refundable ACTC & EITC)
  const numChildren = Math.max(0, parseInt(String(state.dependents?.childrenCount), 10) || 0);
  const numOtherDependents = Math.max(0, parseInt(String(state.dependents?.otherDependentsCount), 10) || 0);
  let childCreditPhaseoutAmount = 0;

  const maxPotentialCtc = numChildren * rules.childTaxCreditPerChild;
  const maxPotentialOdc = numOtherDependents * 500;
  const combinedCtcOdcMax = maxPotentialCtc + maxPotentialOdc;

  if (combinedCtcOdcMax > 0) {
    const threshold = rules.childTaxCreditPhaseout[effectiveStatus] || 200000;
    if (agi > threshold) {
      const excess = agi - threshold;
      const chunks = Math.ceil(excess / 1000);
      childCreditPhaseoutAmount = chunks * 50;
    }
  }

  const netCtcOdcAfterPhaseout = Math.max(0, combinedCtcOdcMax - childCreditPhaseoutAmount);
  const ctcAfterPhaseout = Math.min(maxPotentialCtc, netCtcOdcAfterPhaseout);
  const odcAfterPhaseout = Math.max(0, netCtcOdcAfterPhaseout - ctcAfterPhaseout);

  // Form 2441: Child & Dependent Care Credit (20% to 35% of up to $3,000 for 1 person / $6,000 for 2+)
  const rawCareExpenses = Math.max(0, Number(state.dependents?.childCareExpenses) || 0);
  const carePersons = Math.max(1, numChildren + numOtherDependents);
  const careCap = carePersons >= 2 ? 6000 : 3000;
  const eligibleCareExpenses = Math.min(careCap, rawCareExpenses);
  const careRate = agi <= 15000 ? 0.35 : Math.max(0.20, 0.35 - Math.ceil((agi - 15000) / 2000) * 0.01);
  const childCareCreditRaw = effectiveStatus === 'married_separate' ? 0 : Math.round(eligibleCareExpenses * careRate * 100) / 100;

  // Form 8863: Education Credits (AOTC up to $2,500 w/ 40% refundable + LLC 20% up to $2,000)
  const aotcTuition = Math.max(0, Number(state.dependents?.educationExpensesAotc) || 0);
  const llcTuition = Math.max(0, Number(state.dependents?.educationExpensesLlc) || 0);
  const eduPhaseStart = effectiveStatus === 'married_joint' ? 160000 : 80000;
  const eduPhaseSpan = effectiveStatus === 'married_joint' ? 20000 : 10000;
  const eduPhaseFactor = effectiveStatus === 'married_separate'
    ? 0
    : Math.max(0, Math.min(1, 1 - Math.max(0, agi - eduPhaseStart) / eduPhaseSpan));

  const rawAotc = aotcTuition > 0
    ? (Math.min(2000, aotcTuition) + Math.max(0, Math.min(4000, aotcTuition) - 2000) * 0.25) * eduPhaseFactor
    : 0;
  const educationCreditRefundable = Math.round(rawAotc * 0.40 * 100) / 100;
  const aotcNonRefundable = Math.round(rawAotc * 0.60 * 100) / 100;
  const llcNonRefundable = Math.round(Math.min(10000, llcTuition) * 0.20 * eduPhaseFactor * 100) / 100;
  const educationCreditNonRefundableRaw = aotcNonRefundable + llcNonRefundable;

  // Form 8880: Saver's Credit (10% / 20% / 50% of up to $2,000 / $4,000 MFJ IRA contribution for low/mod AGI)
  const saversMaxContribution = effectiveStatus === 'married_joint' ? 4000 : 2000;
  const saversEligibleContrib = Math.min(saversMaxContribution, iraDeduction);
  let saversRate = 0;
  if (saversEligibleContrib > 0) {
    const t50 = effectiveStatus === 'married_joint' ? 46000 : (effectiveStatus === 'head_of_household' ? 34500 : 23000);
    const t20 = effectiveStatus === 'married_joint' ? 50000 : (effectiveStatus === 'head_of_household' ? 37500 : 25000);
    const t10 = effectiveStatus === 'married_joint' ? 76500 : (effectiveStatus === 'head_of_household' ? 57375 : 38250);
    if (agi <= t50) saversRate = 0.50;
    else if (agi <= t20) saversRate = 0.20;
    else if (agi <= t10) saversRate = 0.10;
  }
  const saversCreditRaw = Math.round(saversEligibleContrib * saversRate * 100) / 100;

  const foreignTaxCreditRaw = Math.max(0, Number(state.dependents?.foreignTaxCredit) || 0);
  const cleanEnergyCreditRaw = Math.max(0, Number(state.dependents?.cleanEnergyCredit) || 0);
  const adoptionCreditRaw = Math.min(year === 2025 ? 17280 : 16810, Math.max(0, Number(state.dependents?.adoptionCredit) || 0));
  const elderlyDisabledCreditRaw = Math.max(0, Number(state.dependents?.elderlyDisabledCredit) || 0);
  const premiumTaxCreditRaw = Math.max(0, Number(state.dependents?.premiumTaxCredit) || 0);

  const totalNonRefundableRaw = ctcAfterPhaseout + odcAfterPhaseout + childCareCreditRaw + educationCreditNonRefundableRaw + saversCreditRaw + foreignTaxCreditRaw + cleanEnergyCreditRaw + adoptionCreditRaw + elderlyDisabledCreditRaw;
  const totalNonRefundableCredits = Math.round(Math.min(taxBeforeCredits, totalNonRefundableRaw) * 100) / 100;
  const childCreditAllowed = Math.min(taxBeforeCredits, ctcAfterPhaseout);
  const otherDependentsCredit = Math.min(Math.max(0, taxBeforeCredits - childCreditAllowed), odcAfterPhaseout);

  // Schedule 8812: Refundable Additional Child Tax Credit (ACTC - up to $1,700/child at 15% of earned income over $2,500)
  const earnedIncomeTotal = totalW2Wages + Math.max(0, netScheduleCProfit);
  const unusedCtc = Math.max(0, ctcAfterPhaseout - childCreditAllowed);
  const actcMaxPerKids = numChildren * rules.childTaxCreditRefundableMax;
  const actcEarnedIncomeFormula = Math.max(0, (earnedIncomeTotal - 2500) * 0.15);
  const additionalChildTaxCredit = numChildren > 0
    ? Math.round(Math.min(unusedCtc, actcMaxPerKids, actcEarnedIncomeFormula) * 100) / 100
    : 0;

  // Schedule EIC: Earned Income Tax Credit (EITC - automatic for eligible low/moderate earned income)
  const investmentIncomeForEitc = interestIncome + net1099InterestTotal + taxExemptInterestTotal + total1099Dividends + Math.max(0, allowableCapitalNet) + Math.max(0, allowableRentalNet);
  const eitcInvCap = year === 2025 ? 11950 : 11600;
  let eitc = 0;
  if (effectiveStatus !== 'married_separate' && earnedIncomeTotal > 0 && investmentIncomeForEitc <= eitcInvCap) {
    const kidsBucket = Math.min(3, numChildren) as 0 | 1 | 2 | 3;
    const eitcParams: Record<0 | 1 | 2 | 3, { maxCredit: number; phaseInRate: number; phaseOutRate: number; singleEnd: number; mfjEnd: number }> = {
      0: { maxCredit: 632, phaseInRate: 0.0765, phaseOutRate: 0.0765, singleEnd: 18591, mfjEnd: 25511 },
      1: { maxCredit: 4213, phaseInRate: 0.34, phaseOutRate: 0.1598, singleEnd: 49084, mfjEnd: 56004 },
      2: { maxCredit: 6960, phaseInRate: 0.40, phaseOutRate: 0.2106, singleEnd: 55768, mfjEnd: 62688 },
      3: { maxCredit: 7830, phaseInRate: 0.45, phaseOutRate: 0.2106, singleEnd: 59899, mfjEnd: 66819 }
    };
    const p = eitcParams[kidsBucket];
    const agiLimit = effectiveStatus === 'married_joint' ? p.mfjEnd : p.singleEnd;
    const baseIncome = Math.max(earnedIncomeTotal, agi);
    if (baseIncome < agiLimit) {
      const phaseIn = Math.min(p.maxCredit, earnedIncomeTotal * p.phaseInRate);
      const phaseOutStart = agiLimit - (p.maxCredit / p.phaseOutRate);
      const phaseOutReduction = Math.max(0, (baseIncome - phaseOutStart) * p.phaseOutRate);
      eitc = Math.round(Math.max(0, Math.min(phaseIn, p.maxCredit - phaseOutReduction)) * 100) / 100;
    }
  }

  const totalRefundableCredits = Math.round((additionalChildTaxCredit + eitc + educationCreditRefundable + premiumTaxCreditRaw) * 100) / 100;

  const creditsCalc: CreditsCalculation = {
    result: totalNonRefundableCredits,
    childTaxCredit: childCreditAllowed,
    additionalChildTaxCredit,
    otherDependentsCredit,
    eitc,
    childCareCredit: childCareCreditRaw,
    educationCreditNonRefundable: educationCreditNonRefundableRaw,
    educationCreditRefundable,
    saversCredit: saversCreditRaw,
    foreignTaxCredit: foreignTaxCreditRaw,
    cleanEnergyCredit: cleanEnergyCreditRaw,
    totalNonRefundableCredits,
    totalRefundableCredits,
    sourceFields: ['input-children-count', 'calc-agi', 'calc-tax-before-credits'],
    generalFormula: totalRefundableCredits > 0
      ? 'Tax Credits = Nonrefundable Credits (CTC/ODC/Care/Edu/Energy) + Refundable Credits (ACTC/EITC/AOTC)'
      : 'Tax Credits = min(Tax Liability, Qualifying Children × $2,000 + Other Credits − Phaseout)',
    pluggedFormula: (totalNonRefundableCredits > 0 || totalRefundableCredits > 0)
      ? `Nonrefundable Credits = ${formatCurrencyExact(totalNonRefundableCredits)}${totalRefundableCredits > 0 ? ` (+ ${formatCurrencyExact(totalRefundableCredits)} Refundable ACTC/EITC/AOTC on Line 27–29)` : ''}`
      : `Credits = 0 qualifying children = $0`
  };

  // 8b. FICA & Other Taxes (Schedule SE, Form 8959 Additional Medicare, Form 8960 NIIT, Form 6251 AMT, Form 5329 Early Withdrawal Penalty)
  // Excess Social Security Tax Credit (Schedule 3, Line 11): applies when 2+ employers withhold SS tax above the annual cap
  const maxAnnualSSTax = Math.round(rules.ssWageLimit * rules.ssRate * 100) / 100;
  const excessSSTaxCredit = w2List.length > 1 && totalSSTax > maxAnnualSSTax
    ? Math.round((totalSSTax - maxAnnualSSTax) * 100) / 100
    : 0;

  // Form 8959: 0.9% Additional Medicare Tax on combined Medicare wages (Box 5) + SE earnings above threshold ($200k Single / $250k MFJ)
  const addMedThreshold = rules.additionalMedicareThreshold[effectiveStatus] || 200000;
  const combinedMedAndSeWages = totalMedWages + seTaxableEarnings;
  const excessMedWages = Math.max(0, combinedMedAndSeWages - addMedThreshold);
  const additionalMedicareTax = Math.round(excessMedWages * rules.additionalMedicareRate * 100) / 100;

  // Form 8960: 3.8% Net Investment Income Tax (NIIT) on min(Net Investment Income, max(0, MAGI - threshold))
  const niitThreshold = rules.niitThreshold[effectiveStatus] || 200000;
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

  // Form 6251: Alternative Minimum Tax (AMT)
  // AMTI = AGI - AMT-allowed itemized deductions (Medical + Mortgage + Charity, i.e., SALT and Standard Deduction added back)
  const amtAllowedDeductions = allowableMedical + mortgageInterest + charity + allowableGamblingLosses;
  const amti = Math.max(0, agi - amtAllowedDeductions - qbiDeduction);
  const amtExemptionBase = effectiveStatus === 'married_joint'
    ? (year === 2025 ? 137000 : 133300)
    : (effectiveStatus === 'married_separate' ? (year === 2025 ? 68500 : 66650) : (year === 2025 ? 88100 : 85700));
  const amtPhaseoutThreshold = effectiveStatus === 'married_joint'
    ? (year === 2025 ? 1252700 : 1218700)
    : (year === 2025 ? 626350 : 609350);
  const amtExemptionReduction = Math.max(0, (amti - amtPhaseoutThreshold) * 0.25);
  const amtExemption = Math.max(0, amtExemptionBase - amtExemptionReduction);
  const amtTaxableExcess = Math.max(0, amti - amtExemption);
  const amtOrdinaryExcess = Math.max(0, amtTaxableExcess - preferentialIncome);
  const amt28Breakpoint = effectiveStatus === 'married_separate' ? 116300 : 232600;
  const tmtOrdinary = amtOrdinaryExcess <= amt28Breakpoint
    ? amtOrdinaryExcess * 0.26
    : (amt28Breakpoint * 0.26 + (amtOrdinaryExcess - amt28Breakpoint) * 0.28);
  const tentativeMinimumTax = Math.round((tmtOrdinary + preferentialTax) * 100) / 100;
  const amt = amti > amtExemptionBase ? Math.max(0, Math.round((tentativeMinimumTax - taxBeforeCredits) * 100) / 100) : 0;

  // Form 5329: 10% Early Retirement Distribution Penalty + Schedule H Household + Form 4137 Unreported Tips FICA
  const earlyDistributionPenaltyTax = Math.round(earlyDist1099RTotal * 0.10 * 100) / 100;
  const householdEmploymentTax = Math.max(0, Number(state.dependents?.householdEmploymentTax) || 0);

  const totalOtherTaxes = Math.round((selfEmploymentTax + additionalMedicareTax + niit + amt + earlyDistributionPenaltyTax + unreportedTipsFicaTax + householdEmploymentTax) * 100) / 100;

  const otherTaxParts: string[] = [];
  if (selfEmploymentTax > 0) {
    otherTaxParts.push(`Schedule SE (${formatCurrencyExact(selfEmploymentTax)})`);
  }
  if (additionalMedicareTax > 0 || niit > 0) {
    otherTaxParts.push(`Form 8959 (${formatCurrency(excessMedWages)} × 0.9% = ${formatCurrencyExact(additionalMedicareTax)}) + Form 8960 (min(NII ${formatCurrency(netInvestmentIncome)}, MAGI Excess ${formatCurrency(magiExcessOverNiit)}) × 3.8% = ${formatCurrencyExact(niit)})`);
  }
  if (amt > 0) {
    otherTaxParts.push(`Form 6251 AMT (${formatCurrencyExact(amt)})`);
  }
  if (earlyDistributionPenaltyTax > 0) {
    otherTaxParts.push(`Form 5329 10% Penalty (${formatCurrencyExact(earlyDistributionPenaltyTax)})`);
  }

  const otherTaxesCalc: OtherTaxesCalculation = {
    result: totalOtherTaxes,
    selfEmploymentTax,
    halfSelfEmploymentTaxDeduction,
    additionalMedicareTax,
    niit,
    amt,
    earlyDistributionPenaltyTax,
    netInvestmentIncome,
    totalOtherTaxes,
    seTaxableEarnings,
    seSSPortion,
    seMedPortion,
    combinedMedAndSeWages,
    addMedThreshold,
    excessMedWages,
    niitThreshold,
    magiExcessOverNiit,
    amti,
    amtAllowedDeductions,
    amtExemption,
    tentativeMinimumTax,
    earlyDist1099RTotal,
    sourceFields: ['calc-agi', ...w2List.map((w, idx) => `w2-${w.id || idx}-box5`)],
    generalFormula: 'Schedule 2 Other Taxes = Schedule SE (15.3%) + Form 8959 Additional Medicare (0.9% over $200k) + Form 8960 NIIT (3.8%) + Form 6251 AMT',
    pluggedFormula: totalOtherTaxes > 0
      ? `${otherTaxParts.join(' + ')} = ${formatCurrencyExact(totalOtherTaxes)}`
      : 'Schedule 2 Other Taxes (Schedule SE / Form 8959 / Form 8960 / AMT) = $0'
  };

  // 9. Total Federal Tax Liability (Form 1040 Line 24 = max(0, Tentative Tax − Nonrefundable Credits) + Schedule 2 Other Taxes)
  const totalTaxLiability = Math.round((Math.max(0, taxBeforeCredits - totalNonRefundableCredits) + totalOtherTaxes) * 100) / 100;
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
      ? `Total Tax Liability = max(0, ${formatCurrencyExact(taxBeforeCredits)} − ${formatCurrencyExact(totalNonRefundableCredits)}) + ${formatCurrencyExact(totalOtherTaxes)} = ${formatCurrencyExact(totalTaxLiability)}`
      : `Total Tax Liability = max(0, ${formatCurrencyExact(taxBeforeCredits)} − ${formatCurrencyExact(totalNonRefundableCredits)}) = ${formatCurrencyExact(totalTaxLiability)}`
  };

  // 10. Total Federal Income Tax Withheld & Payments (W-2 Box 2 + 1099 Box 4 Withholding + Estimated Tax Payments + Refundable Credits + Schedule 3 Line 11 Excess SS Tax Credit)
  const box2Values = w2List.map(w => Number(w.box2) || 0);
  const w2Box2Total = box2Values.reduce((sum, val) => sum + val, 0);
  const estimatedTaxPayments = Math.max(0, Number(state.dependents?.estimatedTaxPayments) || 0);
  const totalWithheld = Math.round((w2Box2Total + extra1099WithheldTotal + estimatedTaxPayments + totalRefundableCredits + excessSSTaxCredit) * 100) / 100;
  const w2WithheldFieldIds = [
    ...w2List.map((w, idx) => `w2-${w.id || idx}-box2`),
    ...(excessSSTaxCredit > 0 ? ['calc-fica-breakdown'] : []),
    ...(totalRefundableCredits > 0 ? ['calc-total-credits'] : [])
  ];

  const paymentExtras: string[] = [];
  if (extra1099WithheldTotal > 0) paymentExtras.push(`${formatCurrencyExact(extra1099WithheldTotal)} (1099 WH)`);
  if (estimatedTaxPayments > 0) paymentExtras.push(`${formatCurrencyExact(estimatedTaxPayments)} (1040-ES)`);
  if (totalRefundableCredits > 0) paymentExtras.push(`${formatCurrencyExact(totalRefundableCredits)} (Refundable Credits)`);
  if (excessSSTaxCredit > 0) paymentExtras.push(`${formatCurrencyExact(excessSSTaxCredit)} (Excess SS Credit)`);

  const withholdingCalc: CalculationResult = {
    result: totalWithheld,
    sourceFields: w2WithheldFieldIds,
    generalFormula: paymentExtras.length > 0
      ? 'Total Federal Payments = ∑(W-2 Box 2) + Schedule 3 Line 11 Excess Social Security Tax Credit & Refundable Payments'
      : (w2List.length === 1 ? 'Total Withholding = W-2 Box 2' : 'Total Withholding = ∑(W-2 Box 2)'),
    pluggedFormula: paymentExtras.length > 0
      ? `Total Payments = ${box2Values.map(v => formatCurrencyExact(v)).join(' + ')} + ${paymentExtras.join(' + ')} = ${formatCurrencyExact(totalWithheld)}`
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

  // 14. Multi-State Tax Return Engine & Unified Summary (Handles OSTC, Reciprocity, NYC Local Tax, DC Form D-30, WA 7% LTCG, NH 3% I&D, & State Itemized Deductions)
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
    itemizedCalc,
    creditsCalc.eitc
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
    qbiDeduction,
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
 * NYC Local Municipal Income Tax (Form IT-201), NY Itemized Deductions (Form IT-196), D.C. Form D-30 UBT,
 * WA 7% Capital Gains Excise Tax, NH Form DP-10 Interest & Dividends Tax, CA Mental Health Surtax & HSA Add-Back,
 * MA 8.5% Short-Term Capital Gains Tax, NJ Property Tax Deduction & HSA Add-Back, PA 8-Class Gross Income,
 * MD/OH/IN/KY/MI/MO/PA/DE/AL Local Taxes, State LTCG Exclusions, and AL/OR/MO Federal Tax Deductions.
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
  itemizedCalc?: ItemizedDeductionCalculation,
  federalEitc: number = 0
): { stateReturnsCalc: StateReturnCalculation[]; unifiedSummaryCalc: UnifiedTaxSummary } {
  const effectiveStatus = normalizeFilingStatus(filingStatus);
  const year = state.year || 2024;

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
    hasYonkersLocality: boolean;
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
      hasYonkersLocality: false,
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
          hasNycLocality: false, hasYonkersLocality: false, other1099: 0, rentalNet: 0, rentalGross: 0, sourceFieldIds: []
        });
      }
      const item = rawMap.get(code)!;
      item.w2Wages += Number(s.stateWages) || 0;
      item.w2Withheld += Number(s.stateTaxWithheld) || 0;
      item.localWages += Number(s.localWages) || 0;
      item.localWithheld += Number(s.localTaxWithheld) || 0;
      const loc = (s.localityName || '').toUpperCase().trim();
      if (loc.includes('YONKERS')) {
        item.hasYonkersLocality = true;
      } else if (loc.includes('NYC') || loc.includes('NEW YORK') || (code === 'NY' && (Number(s.localTaxWithheld) || 0) > 0)) {
        item.hasNycLocality = true;
      }
      item.sourceFieldIds.push(`w2-${w.id || wIdx}-state-${s.id || sIdx}-box16`);
      item.sourceFieldIds.push(`w2-${w.id || wIdx}-state-${s.id || sIdx}-box17`);
    });
  });

  let totalDivAndIntForStates = Number(state.otherIncome?.interest) || 0;
  (state.otherIncome?.sources || []).forEach((src, srcIdx) => {
    const code = (src.state || residentState).toUpperCase().trim();
    if (!rawMap.has(code)) {
      rawMap.set(code, {
        code, w2Wages: 0, w2Withheld: 0, localWages: 0, localWithheld: 0,
        hasNycLocality: false, hasYonkersLocality: false, other1099: 0, rentalNet: 0, rentalGross: 0, sourceFieldIds: []
      });
    }
    const item = rawMap.get(code)!;
    let amt = Number(src.amount) || 0;
    if (src.type === '1099-INT' && (Number(src.accruedInterestPaid) || 0) > 0) {
      amt = Math.max(0, amt - (Number(src.accruedInterestPaid) || 0));
    }
    if (src.type === '1099-INT' || src.type === '1099-DIV') {
      totalDivAndIntForStates += amt;
    }
    item.other1099 += amt;
    item.sourceFieldIds.push(`input-source-${src.id || srcIdx}-amount`);
  });

  if (scheduleECalc && scheduleECalc.propertyState) {
    const pCode = scheduleECalc.propertyState;
    if (!rawMap.has(pCode)) {
      rawMap.set(pCode, {
        code: pCode, w2Wages: 0, w2Withheld: 0, localWages: 0, localWithheld: 0,
        hasNycLocality: false, hasYonkersLocality: false, other1099: 0, rentalNet: 0, rentalGross: 0, sourceFieldIds: []
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
        isFlat: true,
        flatRate: 0.0825,
        d30Details: {
          grossReceipts: dcGrossReceipts,
          netRental: dcNetRental,
          salaryAllowance,
          specificExemption,
          rawUbtTax,
          minTaxApplied: dcGrossReceipts > 12000 && rawUbtTax < 250
        },
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
    const spList = (state.statePanels || []).filter(p => p.state.toUpperCase() === code);
    const spOther = spList.filter(p => p.section === 'other-income').reduce((s, p) => s + (Number(p.amount) || 0), 0)
      + (Number(state.stateSpecific?.[code]?.otherIncome) || 0);
    const spAdj = spList.filter(p => p.section === 'adjustments').reduce((s, p) => s + (Number(p.amount) || 0), 0)
      + (Number(state.stateSpecific?.[code]?.adjustments) || 0);
    const spCred = spList.filter(p => p.section === 'credits').reduce((s, p) => s + (Number(p.amount) || 0), 0)
      + (Number(state.stateSpecific?.[code]?.credits) || 0);
    const spItem = spList.filter(p => p.section === 'itemized').reduce((s, p) => s + (Number(p.amount) || 0), 0)
      + (Number(state.stateSpecific?.[code]?.itemizedDeductions) || 0);

    const baseStdDed = rule.standardDeduction[effectiveStatus] || 0;
    const stdDed = baseStdDed + spItem;
    const adjStateWages = Math.max(0, stateWages + spOther - spAdj);
    const taxable = Math.max(0, adjStateWages - stdDed);
    let tax = 0;
    let nrBrackets: BracketDetail[] = [];
    if (rule.isFlat) {
      tax = taxable * (rule.flatRate || 0);
    } else {
      const bList = rule.brackets?.[effectiveStatus] || rule.brackets?.['single'] || [];
      tax = computeStateTaxFromBrackets(taxable, bList);
      nrBrackets = computeStateBracketDetails(taxable, bList);
    }
    const stateTaxLiability = Math.max(0, Math.round((tax - spCred) * 100) / 100);
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
      stateTaxBeforeCredit: Math.round(tax * 100) / 100,
      creditForOtherStates: 0,
      creditedStates: [],
      reciprocityExemption: false,
      stateTaxLiability,
      localTaxLiability: 0,
      stateWithholding: withholding,
      localTaxWithheld: localTax,
      netOutcome,
      isRefund,
      isFlat: rule.isFlat,
      flatRate: rule.flatRate,
      brackets: nrBrackets,
      baseStdDeduction: baseStdDed,
      statePanelOtherIncome: spOther,
      statePanelAdjustments: spAdj,
      statePanelItemized: spItem,
      statePanelCredits: spCred,
      sourceFields: raw.sourceFieldIds,
      generalFormula: `${rule.formNonResident}: State Tax = max(0, State Sourced Wages − State Standard Deduction) × Rates`,
      pluggedFormula: `Taxable Income = ${formatCurrency(stateWages)} − ${formatCurrency(stdDed)} = ${formatCurrency(taxable)} ➔ State Tax Liability = ${formatCurrencyExact(stateTaxLiability)}`
    });
  }

  // PASS 2: Calculate Resident State Return (with OSTC, State Itemized Deductions, Local Taxes, WA 7% LTCG, NH 3% I&D, & State Modifications)
  const resRaw = rawMap.get(residentState)!;
  let residentTotalWages = Math.max(resRaw.w2Wages + resRaw.other1099, agi > 0 ? agi : grossIncome, totalFederalWages);
  const resWithholding = resRaw.w2Withheld;
  const resLocalTax = resRaw.localWithheld;

  const stGain = Number(state.otherIncome?.capitalGains?.shortTerm) || 0;
  const ltGain = Number(state.otherIncome?.capitalGains?.longTerm) || 0;
  const netLtcg = Math.max(0, ltGain + Math.min(0, stGain));

  let residentReturn: StateReturnCalculation;

  // Special Case 1: Washington State (0% Wage Tax, but 7% Excise Tax on Long-Term Capital Gains exceeding $270,000 in 2024 / $278,000 in 2025)
  const waLtcgThreshold = year === 2025 ? 278000 : 270000;
  if (residentState === 'WA' && netLtcg > waLtcgThreshold) {
    const waTaxableLtcg = netLtcg - waLtcgThreshold;
    const waExciseTax = Math.round(waTaxableLtcg * 0.07 * 100) / 100;
    const waNetDiff = resWithholding - waExciseTax;
    residentReturn = {
      result: waExciseTax,
      state: 'WA',
      stateName: 'Washington',
      residentStatus: 'resident',
      formName: 'WA Capital Gains Excise Tax Return (7% over $270k)',
      hasIncomeTax: true,
      stateWages: netLtcg,
      stateStandardDeduction: waLtcgThreshold,
      stateTaxableIncome: waTaxableLtcg,
      stateTaxBeforeCredit: waExciseTax,
      creditForOtherStates: 0,
      creditedStates: [],
      reciprocityExemption: false,
      stateTaxLiability: waExciseTax,
      localTaxLiability: 0,
      stateWithholding: resWithholding,
      localTaxWithheld: resLocalTax,
      netOutcome: Math.abs(waNetDiff),
      isRefund: waNetDiff >= 0,
      isFlat: true,
      flatRate: 0.07,
      baseStdDeduction: waLtcgThreshold,
      sourceFields: ['calc-capital-gains'],
      generalFormula: `WA Capital Gains Excise Tax = max(0, Net Long-Term Capital Gain − ${formatCurrency(waLtcgThreshold)}) × 7%`,
      pluggedFormula: `Taxable LTCG = ${formatCurrency(netLtcg)} − ${formatCurrency(waLtcgThreshold)} = ${formatCurrency(waTaxableLtcg)} × 7% = ${formatCurrencyExact(waExciseTax)}`
    };
  } else if (residentState === 'NH' && year === 2024 && totalDivAndIntForStates > (effectiveStatus === 'married_joint' ? 4800 : 2400)) {
    // Special Case 2: New Hampshire Form DP-10 (3% Interest & Dividends Tax in 2024 over $2,400 Single / $4,800 MFJ)
    const nhExemption = effectiveStatus === 'married_joint' ? 4800 : 2400;
    const nhTaxableID = totalDivAndIntForStates - nhExemption;
    const nhIdTax = Math.round(nhTaxableID * 0.03 * 100) / 100;
    const nhNetDiff = resWithholding - nhIdTax;
    residentReturn = {
      result: nhIdTax,
      state: 'NH',
      stateName: 'New Hampshire',
      residentStatus: 'resident',
      formName: 'Form DP-10 (3% Interest & Dividends Tax)',
      hasIncomeTax: true,
      stateWages: totalDivAndIntForStates,
      stateStandardDeduction: nhExemption,
      stateTaxableIncome: nhTaxableID,
      stateTaxBeforeCredit: nhIdTax,
      creditForOtherStates: 0,
      creditedStates: [],
      reciprocityExemption: false,
      stateTaxLiability: nhIdTax,
      localTaxLiability: 0,
      stateWithholding: resWithholding,
      localTaxWithheld: resLocalTax,
      netOutcome: Math.abs(nhNetDiff),
      isRefund: nhNetDiff >= 0,
      isFlat: true,
      flatRate: 0.03,
      baseStdDeduction: nhExemption,
      sourceFields: resRaw.sourceFieldIds,
      generalFormula: `NH Form DP-10 = max(0, Interest & Dividends − ${formatCurrency(nhExemption)}) × 3.0%`,
      pluggedFormula: `Taxable I&D = ${formatCurrency(totalDivAndIntForStates)} − ${formatCurrency(nhExemption)} = ${formatCurrency(nhTaxableID)} × 3.0% = ${formatCurrencyExact(nhIdTax)}`
    };
  } else if (!residentRule.hasIncomeTax) {
    const waWftc = (residentState === 'WA' && federalEitc > 0)
      ? Math.min(1290, 325 + (Number(state.dependents?.childrenCount) || 0) * 325)
      : 0;
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
      netOutcome: resWithholding + waWftc,
      isRefund: true,
      stateExemptionCredit: waWftc,
      sourceFields: resRaw.sourceFieldIds,
      generalFormula: `${residentRule.name} imposes 0% personal income tax on wage compensation`,
      pluggedFormula: `Tax = $0 (No ${residentRule.name} State Return Required)`
    };
  } else {
    // State-Specific Income Modifications:
    // 1. CA & NJ do not conform to the federal HSA deduction (add back HSA to state income):
    const hsaAddBack = (residentState === 'CA' || residentState === 'NJ') ? (Number(state.adjustments?.hsa) || 0) : 0;
    // 2. PA (Form PA-40) taxes gross income classes without federal IRA/HSA/Student Loan adjustments or net capital loss offsets:
    const paAddBack = residentState === 'PA'
      ? ((Number(state.adjustments?.ira) || 0) + (Number(state.adjustments?.hsa) || 0) + (Number(state.adjustments?.studentLoan) || 0) + (stGain + ltGain < 0 ? Math.abs(Math.max(-3000, stGain + ltGain)) : 0))
      : 0;
    // 3. State Long-Term Capital Gain Exclusions (SC 44%, NM 40%, ND 40%, WI 30%, AR 50%, VT up to $5,000):
    let stateLtcgExclusion = 0;
    if (netLtcg > 0) {
      if (residentState === 'SC') stateLtcgExclusion = Math.round(netLtcg * 0.44 * 100) / 100;
      else if (residentState === 'NM' || residentState === 'ND') stateLtcgExclusion = Math.round(netLtcg * 0.40 * 100) / 100;
      else if (residentState === 'WI') stateLtcgExclusion = Math.round(netLtcg * 0.30 * 100) / 100;
      else if (residentState === 'AR') stateLtcgExclusion = Math.round(netLtcg * 0.50 * 100) / 100;
      else if (residentState === 'AZ') stateLtcgExclusion = Math.round(netLtcg * 0.25 * 100) / 100;
      else if (residentState === 'VT') stateLtcgExclusion = Math.min(5000, Math.round(netLtcg * 0.40 * 100) / 100);
    }
    // 4. State Deduction for Federal Income Tax Paid (AL 100%, OR up to $8,250, MO up to $5,000/$10,000):
    let fedTaxSubtraction = 0;
    if (residentState === 'AL') fedTaxSubtraction = totalFederalLiability;
    else if (residentState === 'OR') fedTaxSubtraction = Math.min(8250, totalFederalLiability);
    else if (residentState === 'MO') fedTaxSubtraction = Math.min(effectiveStatus === 'married_joint' ? 10000 : 5000, totalFederalLiability * 0.35);

    // 5. NJ Property Tax Deduction (up to $15,000 of realEstateTax on Form NJ-1040):
    const njPropertyTaxDed = residentState === 'NJ' ? Math.min(15000, Number(state.itemizedDeductions?.realEstateTax) || 0) : 0;

    // 6. CO State Income Tax SALT Add-Back when Federal Schedule A itemized:
    const coSaltAddBack = (residentState === 'CO' && itemizedCalc?.chosenMethod === 'itemized')
      ? Math.max(0, Math.round((itemizedCalc.allowableSalt - (Number(state.itemizedDeductions?.realEstateTax) || 0)) * 100) / 100)
      : 0;

    const modifications: StateModificationItem[] = [];
    if (hsaAddBack > 0) modifications.push({ label: `${residentState} HSA Add-Back`, amount: hsaAddBack, sourceId: `auto-state-${residentState.toLowerCase()}-hsa-addback` });
    if (paAddBack > 0) modifications.push({ label: 'PA Non-Conformity Add-Back (IRA/HSA/Student Loan/Cap Loss)', amount: paAddBack, sourceId: `auto-state-${residentState.toLowerCase()}-pa-addback` });
    if (coSaltAddBack > 0) modifications.push({ label: 'CO State SALT Add-Back (Form DR 0104)', amount: coSaltAddBack, sourceId: 'auto-state-co-salt-addback' });
    if (stateLtcgExclusion > 0) modifications.push({ label: `${residentState} LTCG Exclusion`, amount: -stateLtcgExclusion, sourceId: `auto-state-${residentState.toLowerCase()}-ltcg-excl` });
    if (fedTaxSubtraction > 0) modifications.push({ label: `${residentState} Federal Tax Paid Deduction`, amount: -fedTaxSubtraction, sourceId: `auto-state-${residentState.toLowerCase()}-fed-tax-ded` });
    if (njPropertyTaxDed > 0) modifications.push({ label: 'NJ Property Tax Deduction (Cap $15,000)', amount: -njPropertyTaxDed, sourceId: `auto-state-${residentState.toLowerCase()}-prop-tax-ded` });

    const preModResidentWages = residentTotalWages;
    residentTotalWages = Math.max(0, residentTotalWages + hsaAddBack + paAddBack + coSaltAddBack - stateLtcgExclusion - fedTaxSubtraction - njPropertyTaxDed);

    let baseStdDed = residentRule.standardDeduction[effectiveStatus] || 0;
    if (residentState === 'MD') {
      const mdMin = effectiveStatus === 'married_joint' ? 3650 : 1800;
      const mdMax = effectiveStatus === 'married_joint' ? 5450 : 2700;
      baseStdDed = Math.min(mdMax, Math.max(mdMin, Math.round(residentTotalWages * 0.15)));
    } else if (residentState === 'LA' && year >= 2025) {
      baseStdDed = effectiveStatus === 'married_joint' ? 25000 : 12500;
    } else if (residentState === 'DE' && (Number(state.dependents?.age65OrBlindCount) || 0) > 0) {
      baseStdDed += Math.min(2, Number(state.dependents?.age65OrBlindCount) || 0) * 2500;
    } else if (residentState === 'WI') {
      const wiPhaseStart = effectiveStatus === 'married_joint' ? 26360 : 18220;
      const wiPhaseRate = effectiveStatus === 'married_joint' ? 0.19778 : 0.12;
      baseStdDed = Math.max(0, Math.round(baseStdDed - Math.max(0, residentTotalWages - wiPhaseStart) * wiPhaseRate));
    }

    // Support State Itemized Deductions (e.g., NY Form IT-196, CA Schedule CA uncapped property tax, DC, MD, VA)
    let stateItemizedDed = 0;
    if (itemizedCalc && (residentState === 'NY' || residentState === 'CA' || residentState === 'DC' || residentState === 'MD' || residentState === 'VA')) {
      const rawPropTax = Number(state.itemizedDeductions?.realEstateTax) || 0;
      const propTax = residentState === 'CA' ? rawPropTax : Math.min(10000, rawPropTax);
      stateItemizedDed = itemizedCalc.allowableMedical + propTax + itemizedCalc.mortgage + itemizedCalc.charity;
    }
    const useStateItemized = state.deductionMethod !== 'standard' && stateItemizedDed > baseStdDed;
    const resSpList = (state.statePanels || []).filter(p => p.state.toUpperCase() === residentState);
    const isMfj = effectiveStatus === 'married_joint';
    const evalStatePanelAmt = (p: { itemKey: string; amount: number }): number => {
      const amt = Math.max(0, Number(p.amount) || 0);
      switch (p.itemKey) {
        case 'ma-rent-deduction': return Math.min(4000, Math.round(amt * 0.5 * 100) / 100);
        case 'ma-commuter-deduction': return Math.min(750, Math.max(0, amt - 150));
        case 'ny-529-deduction': return Math.min(isMfj ? 10000 : 5000, amt);
        case 'ny-tuition-credit': return Math.min(400, Math.round(amt * 0.04 * 100) / 100);
        case 'nj-property-tax-deduction': return Math.min(15000, amt);
        case 'dc-529-deduction': return Math.min(isMfj ? 8000 : 4000, amt);
        case 'pa-529-deduction': return Math.min(18000, amt);
        case 'oh-bid': return Math.min(250000, amt);
        case 'in-renters-deduction': return Math.min(3000, amt);
        case 'in-529-credit': return Math.min(1500, Math.round(amt * 0.20 * 100) / 100);
        case 'wi-school-prop-credit': return Math.min(300, Math.round(amt * 0.12 * 100) / 100);
        case 'ct-property-tax-credit': return Math.min(300, amt);
        case 'va-529-deduction': return Math.min(4000, amt);
        case 'ut-my529-credit': return Math.round(amt * 0.0455 * 100) / 100;
        case 'al-529-deduction':
        case 'ar-529-deduction':
        case 'ct-529-deduction':
        case 'mi-529-deduction': return Math.min(isMfj ? 10000 : 5000, amt);
        case 'az-529-deduction': return Math.min(isMfj ? 4000 : 2000, amt);
        case 'ga-529-deduction': return Math.min(isMfj ? 8000 : 4000, amt);
        case 'id-529-deduction': return Math.min(isMfj ? 12000 : 6000, amt);
        case 'il-529-deduction':
        case 'ok-529-deduction': return Math.min(isMfj ? 20000 : 10000, amt);
        case 'ks-529-deduction':
        case 'mt-529-deduction': return Math.min(isMfj ? 6000 : 3000, amt);
        case 'md-529-deduction': return Math.min(2500, amt);
        case 'mo-529-deduction': return Math.min(isMfj ? 16000 : 8000, amt);
        case 'ne-529-deduction': return Math.min(effectiveStatus === 'married_separate' ? 5000 : 10000, amt);
        case 'nj-529-deduction': return residentTotalWages <= 200000 ? Math.min(10000, amt) : 0;
        case 'nj-child-credit': return residentTotalWages <= 80000 ? Math.min(1000 * Math.max(1, Number(state.dependents?.childrenCount) || 0), amt) : 0;
        case 'nj-medical-2pct': return Math.max(0, Math.round((amt - residentTotalWages * 0.02) * 100) / 100);
        case 'ga-child-care-credit': return Math.round(amt * 0.30 * 100) / 100;
        case 'ok-child-care-credit': return Math.round(amt * 0.20 * 100) / 100;
        case 'mt-elderly-homeowner-credit': return Math.min(1150, amt);
        case 'or-529-credit': return Math.min(isMfj ? 340 : 170, amt);
        case 'ca-renters-credit': return Math.min(isMfj ? 120 : 60, amt);
        case 'sc-two-wage-earner-credit': return Math.min(350, amt);
        default: return amt;
      }
    };
    const resSpOther = resSpList.filter(p => p.section === 'other-income').reduce((s, p) => s + evalStatePanelAmt(p), 0)
      + (Number(state.stateSpecific?.[residentState]?.otherIncome) || 0);
    const resSpAdj = resSpList.filter(p => p.section === 'adjustments').reduce((s, p) => s + evalStatePanelAmt(p), 0)
      + (Number(state.stateSpecific?.[residentState]?.adjustments) || 0);
    const resSpCred = resSpList.filter(p => p.section === 'credits').reduce((s, p) => s + evalStatePanelAmt(p), 0)
      + (Number(state.stateSpecific?.[residentState]?.credits) || 0);
    const resSpItem = resSpList.filter(p => p.section === 'itemized').reduce((s, p) => s + evalStatePanelAmt(p), 0)
      + (Number(state.stateSpecific?.[residentState]?.itemizedDeductions) || 0);

    const STATE_PERSONAL_EXEMPTION: Record<string, number> = {
      AL: 1500, CT: 15000, HI: 1144, IL: 2775, IN: 1000, KS: 9160,
      MD: 3200, ME: 5000, MI: 5600, MS: 6000, NJ: 1000, OH: 2400,
      OK: 1000, RI: 4900, VA: 930, VT: 5100, WI: 700, WV: 2000
    };
    const STATE_DEPENDENT_EXEMPTION: Record<string, number> = {
      NY: 1000, NJ: 1500, IL: 2775, MA: 1000, MI: 5600, MD: 3200, GA: 4000,
      IN: 1500, MN: 5050, SC: 4610, VA: 930, WV: 2000, OH: 2400, OK: 1000,
      RI: 4900, VT: 5100, WI: 700, KS: 2320
    };
    const numChildrenDep = Number(state.dependents?.childrenCount) || 0;
    const totalDependents = numChildrenDep + (Number(state.dependents?.otherDependentsCount) || 0);
    let personalExemp = STATE_PERSONAL_EXEMPTION[residentState] ? (isMfj ? 2 : 1) * STATE_PERSONAL_EXEMPTION[residentState] : 0;
    if (residentState === 'CT') {
      const ctBase = isMfj ? 24000 : 15000;
      const ctThresh = isMfj ? 48000 : 30000;
      personalExemp = Math.max(0, ctBase - Math.max(0, residentTotalWages - ctThresh));
    } else if (residentState === 'IL' && residentTotalWages > (isMfj ? 500000 : 250000)) {
      personalExemp = 0;
    }
    const depExemp = totalDependents > 0 && STATE_DEPENDENT_EXEMPTION[residentState]
      ? totalDependents * STATE_DEPENDENT_EXEMPTION[residentState]
      : 0;
    let stateExemptionAmount = personalExemp + depExemp;
    if (residentState === 'NC' && numChildrenDep > 0) {
      const ncPerChild = residentTotalWages <= (isMfj ? 40000 : 20000) ? 3000 : (residentTotalWages <= (isMfj ? 100000 : 50000) ? 1500 : 500);
      stateExemptionAmount += numChildrenDep * ncPerChild;
    }

    const resStdDed = (useStateItemized ? stateItemizedDed : baseStdDed) + resSpItem;

    const resAdjustedIncome = Math.max(0, residentTotalWages + resSpOther - resSpAdj);
    const resTaxable = Math.max(0, resAdjustedIncome - resStdDed - stateExemptionAmount);
    let resTentativeTax = 0;
    let resBrackets: BracketDetail[] = [];
    if (residentState === 'LA' && year >= 2025) {
      resTentativeTax = resTaxable * 0.03;
    } else if (residentState === 'IA' && year >= 2025) {
      resTentativeTax = resTaxable * 0.038;
    } else if (residentState === 'NC' && year >= 2025) {
      resTentativeTax = resTaxable * 0.0425;
    } else if (residentRule.isFlat) {
      resTentativeTax = resTaxable * (residentRule.flatRate || 0);
    } else {
      const bList = residentRule.brackets?.[effectiveStatus] || residentRule.brackets?.['single'] || [];
      resTentativeTax = computeStateTaxFromBrackets(resTaxable, bList);
      resBrackets = computeStateBracketDetails(resTaxable, bList);
    }

    let surchargeAmount = 0;
    let surchargeLabel = '';
    // Massachusetts 8.5% Short-Term Capital Gains Surcharge (+3.5% above 5.0% base) & 4% Millionaire Surtax (>$1,053,750):
    if (residentState === 'MA' && stGain > 0 && resTaxable > 0) {
      const stcgSur = Math.round(Math.min(stGain, resTaxable) * 0.035 * 100) / 100;
      surchargeAmount += stcgSur;
      surchargeLabel = 'MA +3.5% Short-Term Capital Gains Surcharge';
      resTentativeTax += stcgSur;
    }
    if (residentState === 'MA' && resTaxable > 1053750) {
      const mhSur = Math.round((resTaxable - 1053750) * 0.04 * 100) / 100;
      surchargeAmount += mhSur;
      surchargeLabel = surchargeLabel ? `${surchargeLabel} + 4% Millionaire Surtax` : 'MA 4% Fair Share Millionaire Surtax';
      resTentativeTax += mhSur;
    }
    // California 1% Mental Health Services Tax on CA taxable income exceeding $1,000,000:
    if (residentState === 'CA' && resTaxable > 1000000) {
      surchargeAmount = Math.round((resTaxable - 1000000) * 0.01 * 100) / 100;
      surchargeLabel = 'CA 1% Mental Health Services Tax (Over $1M)';
      resTentativeTax += surchargeAmount;
    }
    let stateCreditAmount = 0;
    let stateCreditLabel = '';
    // Illinois 5% Property Tax Credit (Schedule ICR):
    if (residentState === 'IL' && (Number(state.itemizedDeductions?.realEstateTax) || 0) > 0) {
      stateCreditAmount = Math.round((Number(state.itemizedDeductions?.realEstateTax) || 0) * 0.05 * 100) / 100;
      stateCreditLabel = 'IL 5% Property Tax Credit (Schedule ICR)';
      resTentativeTax = Math.max(0, resTentativeTax - stateCreditAmount);
    }

    resTentativeTax = Math.round(resTentativeTax * 100) / 100;

    // Local / Municipal / County Piggyback Income Tax (NYC, Yonkers, MD County Tax, PA Local/Philly, OH/IN/KY/MI/MO/DE/AL Local):
    let localTaxLiability = 0;
    let localBrackets: BracketDetail[] = [];
    let localRuleLabel = '';
    if (residentState === 'NY' && resRaw.hasNycLocality) {
      const nycBList = NYC_LOCAL_BRACKETS[effectiveStatus] || NYC_LOCAL_BRACKETS.single;
      localTaxLiability = Math.round(computeStateTaxFromBrackets(resTaxable, nycBList) * 100) / 100;
      localBrackets = computeStateBracketDetails(resTaxable, nycBList);
      localRuleLabel = 'NYC Municipal Resident Tax Brackets';
    } else if (residentState === 'NY' && resRaw.hasYonkersLocality) {
      localTaxLiability = Math.round(resTentativeTax * 0.1675 * 100) / 100; // Yonkers 16.75% resident surcharge
      localRuleLabel = 'Yonkers Resident Surcharge (16.75% of NY State Tax)';
    } else if (residentState === 'MD') {
      // Maryland mandatory County Piggyback Income Tax (uses Box 19 local withholding or standard 3.20% county rate when local wages/withholding present)
      if (resRaw.localWithheld > 0 || resRaw.localWages > 0) {
        localTaxLiability = Math.round(resTaxable * 0.032 * 100) / 100;
        localRuleLabel = 'MD County Piggyback Income Tax (3.20%)';
      }
    } else if (resRaw.localWithheld > 0 && ['PA', 'OH', 'IN', 'KY', 'MI', 'MO', 'DE', 'AL', 'OR'].includes(residentState)) {
      localTaxLiability = resRaw.localWithheld;
      localRuleLabel = `${residentState} Local / Municipal Tax (W-2 Box 19)`;
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

    const STATE_EITC_MULTIPLIERS: Record<string, number> = {
      NY: 0.30, NJ: 0.40, DC: 0.70, MI: 0.30, IL: 0.20, MA: 0.40, CT: 0.40,
      MD: 0.45, VA: 0.20, ME: 0.25, NM: 0.25, RI: 0.16, IA: 0.15, KS: 0.17,
      IN: 0.10, NE: 0.10, LA: 0.05, SC: 1.25, VT: 0.38, CO: 0.38, OR: 0.09,
      CA: 0.45
    };
    const stateEitcRate = STATE_EITC_MULTIPLIERS[residentState] || 0;
    const stateEitcAmount = federalEitc > 0 && stateEitcRate > 0 && (residentState !== 'CA' || resAdjustedIncome <= 31950)
      ? Math.round(federalEitc * stateEitcRate * 100) / 100
      : 0;

    // Personal & Dependent Exemption Credits + State Child Credits + Poverty Forgiveness
    const taxPayerCount = isMfj ? 2 : 1;
    let stateExemptionCredit = 0;
    if (residentState === 'CA') {
      const caPhaseoutThresh = isMfj ? 474075 : 237035;
      const caRawExemp = taxPayerCount * 144 + totalDependents * 446;
      const caReduction = resAdjustedIncome > caPhaseoutThresh ? Math.ceil((resAdjustedIncome - caPhaseoutThresh) / 2500) * 6 * (taxPayerCount + totalDependents) : 0;
      stateExemptionCredit = Math.max(0, caRawExemp - caReduction);
    } else if (residentState === 'AZ' && totalDependents > 0) {
      stateExemptionCredit = numChildrenDep * 100 + (Number(state.dependents?.otherDependentsCount) || 0) * 25;
    } else if (residentState === 'AR') {
      stateExemptionCredit = (taxPayerCount + totalDependents) * 29;
    } else if (residentState === 'DE') {
      stateExemptionCredit = (taxPayerCount + totalDependents) * 110;
    } else if (residentState === 'ID') {
      stateExemptionCredit = (taxPayerCount + totalDependents) * 120 + numChildrenDep * 205;
    } else if (residentState === 'IA') {
      stateExemptionCredit = (taxPayerCount + totalDependents) * 40;
    } else if (residentState === 'NE') {
      stateExemptionCredit = (taxPayerCount + totalDependents) * 157;
    } else if (residentState === 'OR') {
      stateExemptionCredit = (taxPayerCount + totalDependents) * 249 + (numChildrenDep > 0 && resAdjustedIncome <= 30000 ? numChildrenDep * 1000 : 0);
    } else if (residentState === 'UT') {
      const utBase = Math.round(((itemizedCalc?.chosenDeduction || 14600) + totalDependents * 2000) * 0.06 * 100) / 100;
      const utThresh = isMfj ? 33364 : 16682;
      const utPhase = Math.max(0, (resAdjustedIncome - utThresh) * 0.013);
      stateExemptionCredit = Math.max(0, Math.round((utBase - utPhase) * 100) / 100);
    } else if (residentState === 'MA' && totalDependents > 0) {
      stateExemptionCredit = totalDependents * 440;
    } else if (residentState === 'NY' && numChildrenDep > 0 && resAdjustedIncome <= (isMfj ? 110000 : 75000)) {
      stateExemptionCredit = numChildrenDep * 330;
    } else if (residentState === 'MN' && numChildrenDep > 0 && resAdjustedIncome <= 35000) {
      stateExemptionCredit = numChildrenDep * 1750;
    } else if (residentState === 'NM' && numChildrenDep > 0 && resAdjustedIncome <= 75000) {
      stateExemptionCredit = numChildrenDep * 600;
    } else if (residentState === 'VT' && numChildrenDep > 0 && resAdjustedIncome <= 125000) {
      stateExemptionCredit = numChildrenDep * 1000;
    } else if (residentState === 'PA' && resAdjustedIncome > 0 && resAdjustedIncome <= (isMfj ? 13000 : 6500) + totalDependents * 9500) {
      stateExemptionCredit = resTentativeTax; // PA Schedule SP 100% Tax Forgiveness
    } else if (residentState === 'KY' && resAdjustedIncome > 0 && resAdjustedIncome <= 15060 + totalDependents * 5380) {
      stateExemptionCredit = resTentativeTax; // KY Family Size Tax Credit 100%
    }

    const netStateOnlyLiability = Math.max(0, Math.round((resTentativeTax - totalOtherStateCredit - resSpCred - stateEitcAmount - stateExemptionCredit) * 100) / 100);
    const finalResLiability = Math.round((netStateOnlyLiability + localTaxLiability) * 100) / 100;
    const totalResWithholding = localTaxLiability > 0 ? (resWithholding + resLocalTax) : resWithholding;
    const resNetDiff = Math.round((totalResWithholding - finalResLiability) * 100) / 100;
    const resIsRefund = resNetDiff >= 0;
    const resNetOutcome = Math.abs(resNetDiff);

    const isNycReturn = residentState === 'NY' && resRaw.hasNycLocality && localTaxLiability > 0;
    const formLabel = isNycReturn
      ? `${residentRule.formResident} (NY State + NYC Local Tax)`
      : residentRule.formResident;

    let pluggedStr = '';
    if (isNycReturn) {
      pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)}${useStateItemized ? ' (Form IT-196 Itemized)' : ''} = ${formatCurrency(resTaxable)} ➔ NY State Tax: ${formatCurrencyExact(resTentativeTax)}${totalOtherStateCredit > 0 ? ` − ${creditedStates.map(c => c.fromState).join('/')} Credit: ${formatCurrencyExact(totalOtherStateCredit)}` : ''} + NYC Local Tax: ${formatCurrencyExact(localTaxLiability)} = ${formatCurrencyExact(finalResLiability)}`;
    } else if (localTaxLiability > 0) {
      pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)} = ${formatCurrency(resTaxable)} ➔ State Tax: ${formatCurrencyExact(netStateOnlyLiability)} + Local Tax: ${formatCurrencyExact(localTaxLiability)} = ${formatCurrencyExact(finalResLiability)}`;
    } else if (creditedStates.length > 0) {
      pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)} = ${formatCurrency(resTaxable)} ➔ Tentative Tax: ${formatCurrencyExact(resTentativeTax)} − ${creditedStates.map(c => c.fromState).join('/')} Credit: ${formatCurrencyExact(totalOtherStateCredit)} = ${formatCurrencyExact(finalResLiability)}`;
    } else {
      pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)} = ${formatCurrency(resTaxable)} ➔ State Tax Liability = ${formatCurrencyExact(finalResLiability)}`;
    }

    residentReturn = {
      result: finalResLiability,
      state: residentState,
      stateName: isNycReturn ? 'New York State & NYC' : residentRule.name,
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
      localTaxLiability,
      stateWithholding: totalResWithholding,
      localTaxWithheld: resLocalTax,
      netOutcome: resNetOutcome,
      isRefund: resIsRefund,
      isFlat: residentRule.isFlat,
      flatRate: residentRule.flatRate,
      brackets: resBrackets,
      localBrackets,
      localRuleLabel,
      modifications,
      baseStdDeduction: baseStdDed,
      stateItemizedAmount: stateItemizedDed,
      stateItemizedUsed: useStateItemized,
      statePanelOtherIncome: resSpOther,
      statePanelAdjustments: resSpAdj,
      statePanelItemized: resSpItem,
      statePanelCredits: resSpCred,
      surchargeAmount,
      surchargeLabel,
      stateCreditAmount,
      stateCreditLabel,
      stateExemptionAmount,
      stateExemptionCredit,
      stateEitcAmount,
      stateEitcRate,
      sourceFields: [
        ...resRaw.sourceFieldIds,
        ...creditedStates.map(c => `calc-state-${c.fromState.toLowerCase()}-liability`)
      ],
      generalFormula: isNycReturn
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

/**
 * Pure, UI-independent clustered calculation block builder.
 * Produces structured calculation blocks, form-line tags, intermediate math lines,
 * and clickable variable contributor breakdowns without touching any DOM element.
 */
export function buildCalculationBlocks(state: TaxAppState, summary: TaxCalculationSummary): CalcBlockDefinition[] {
  const year = state.year || 2024;
  const effectiveStatus = normalizeFilingStatus(state.filingStatus || 'single');
  const rules = TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];
  const w2s = state.w2s || [];
  const sources = state.otherIncome?.sources || [];

  const t = (text: string): FormulaToken => ({ type: 'text', text });
  const v = (varId: string, label: string, value: number, isEmpty: boolean, exact: boolean = false): FormulaToken => ({
    type: 'var',
    varId,
    label,
    valueFormatted: exact ? formatCurrencyExact(value) : formatCurrency(value),
    isEmpty
  });

  // Helper to build a variable breakdown
  const makeVar = (
    varId: string,
    label: string,
    totalValue: number,
    contributors: CalcVariableContributor[],
    exact: boolean = false
  ): CalcVariableBreakdown => {
    const hasAnySetup = contributors.some(c => c.isSetUp && c.amount !== 0);
    return {
      varId,
      label,
      totalValue,
      totalFormatted: exact ? formatCurrencyExact(totalValue) : formatCurrency(totalValue),
      isEmpty: !hasAnySetup && totalValue === 0,
      contributors
    };
  };

  // Precompute key values from state
  const totalW2Wages = summary.w2WagesCalc.result;
  const interestDirect = Number(state.otherIncome?.interest) || 0;
  const interest1099 = sources.filter(s => s.type === '1099-INT').reduce((s, x) => s + Math.max(0, (Number(x.amount) || 0) - Math.max(0, Number(x.accruedInterestPaid) || 0)), 0);
  const totalInterest = interestDirect + interest1099;
  const totalDiv = sources.filter(s => s.type === '1099-DIV').reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const totalNecGross = sources.filter(s => s.type === '1099-NEC').reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const schedCExp = Math.max(0, Number(state.otherIncome?.scheduleCExpenses) || 0);
  const netNec = Math.max(0, totalNecGross - schedCExp);
  const totalOther1099 = sources
    .filter(s => !['1099-INT', '1099-DIV', '1099-NEC', 'SSA-1099', 'Schedule K-1'].includes(s.type))
    .reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const k1Total = sources.filter(s => s.type === 'Schedule K-1').reduce((s, x) => s + (Number(x.amount) || 0), 0);
  const ssaGross = sources.filter(s => s.type === 'SSA-1099').reduce((s, x) => s + (Number(x.amount) || 0), 0);

  const stGain = Number(state.otherIncome?.capitalGains?.shortTerm) || 0;
  const ltGain = Number(state.otherIncome?.capitalGains?.longTerm) || 0;
  const collectiblesGain = Math.max(0, Number(state.otherIncome?.capitalGains?.collectiblesGain) || 0);
  const sec1250Gain = Math.max(0, Number(state.otherIncome?.capitalGains?.unrecaptured1250Gain) || 0);
  const capLossLimit = effectiveStatus === 'married_separate' ? -1500 : -3000;

  const grossRents = Math.max(0, Number(state.otherIncome?.scheduleERental?.grossRents) || 0);
  const rentalExp = Math.max(0, Number(state.otherIncome?.scheduleERental?.expenses) || 0);
  const rentalDepr = Math.max(0, Number(state.otherIncome?.scheduleERental?.depreciation) || 0);

  const adjStudentLoan = Math.max(0, Number(state.adjustments?.studentLoan) || 0);
  const adjIra = Math.max(0, Number(state.adjustments?.ira) || 0);
  const adjHsa = Math.max(0, Number(state.adjustments?.hsa) || 0);
  const adjEducator = Math.max(0, Number(state.adjustments?.educatorExpenses) || 0);
  const adjSeRet = Math.max(0, Number(state.adjustments?.seRetirement) || 0);
  const adjSeHealth = Math.max(0, Number(state.adjustments?.seHealthInsurance) || 0);
  const adjAlimony = Math.max(0, Number(state.adjustments?.alimonyPaid) || 0);
  const halfSeTax = summary.otherTaxesCalc.halfSelfEmploymentTaxDeduction;

  const medRaw = Math.max(0, Number(state.itemizedDeductions?.medicalExpenses) || 0);
  const realEstateRaw = Math.max(0, Number(state.itemizedDeductions?.realEstateTax) || 0);
  const mortgageRaw = Math.max(0, Number(state.itemizedDeductions?.mortgageInterest) || 0);
  const charityRaw = Math.max(0, Number(state.itemizedDeductions?.charity) || 0);
  const gamblingLossesRaw = Math.max(0, Number(state.itemizedDeductions?.gamblingLosses) || 0);

  const agi = summary.agiCalc.result;
  const medFloor = Math.round(agi * 0.075 * 100) / 100;
  const stateLocalTaxesForSalt = summary.stateTaxCalc.totalStateWithheld + summary.stateTaxCalc.totalLocalWithheld;
  const rawSalt = stateLocalTaxesForSalt + realEstateRaw;

  const hasAnyW2Activity = w2s.some(w => (Number(w.box1) || 0) !== 0 || (Number(w.box2) || 0) !== 0 || (Number(w.box4) || 0) !== 0 || (Number(w.box6) || 0) !== 0);
  const hasAnyCapGains = stGain !== 0 || ltGain !== 0 || collectiblesGain !== 0 || sec1250Gain !== 0;
  const hasAnySchedE = grossRents !== 0 || rentalExp !== 0 || rentalDepr !== 0 || k1Total !== 0;
  const hasAnyOtherIncome = totalInterest !== 0 || totalDiv !== 0 || totalNecGross !== 0 || schedCExp !== 0 || totalOther1099 !== 0 || ssaGross !== 0 || hasAnyCapGains || hasAnySchedE;
  const hasAnyAdjustments = summary.adjustmentsCalc.result !== 0;
  const hasAnyItemized = medRaw !== 0 || realEstateRaw !== 0 || mortgageRaw !== 0 || charityRaw !== 0 || gamblingLossesRaw !== 0 || state.deductionMethod === 'itemized';
  const hasAnyCreditsInput =
    (Number(state.dependents?.childrenCount) || 0) > 0 ||
    (Number(state.dependents?.otherDependentsCount) || 0) > 0 ||
    (Number(state.dependents?.childCareExpenses) || 0) > 0 ||
    (Number(state.dependents?.educationExpensesAotc) || 0) > 0 ||
    (Number(state.dependents?.educationExpensesLlc) || 0) > 0 ||
    (Number(state.dependents?.foreignTaxCredit) || 0) > 0 ||
    (Number(state.dependents?.cleanEnergyCredit) || 0) > 0 ||
    summary.creditsCalc.totalNonRefundableCredits > 0 ||
    summary.creditsCalc.totalRefundableCredits > 0;
  const hasAnyOtherTaxes = summary.otherTaxesCalc.totalOtherTaxes > 0 || summary.ficaCalc.excessSSTaxCredit > 0;
  const hasAnyOverallImpact = hasAnyW2Activity || hasAnyOtherIncome || hasAnyAdjustments || hasAnyCreditsInput || (Number(state.dependents?.estimatedTaxPayments) || 0) > 0;

  const blocks: CalcBlockDefinition[] = [];

  const sumPluggedTokens = (
    prefix: string,
    varId: string,
    contribs: CalcVariableContributor[],
    total: number,
    isEmpty: boolean,
    exact: boolean = false
  ): FormulaToken[] => {
    const active = contribs.filter(c => c.isSetUp && c.amount !== 0);
    const totalStr = exact ? formatCurrencyExact(total) : formatCurrency(total);
    if (active.length <= 1) {
      return [t(prefix), v(varId, totalStr, total, isEmpty, exact)];
    }
    const tokens: FormulaToken[] = [t(prefix)];
    active.forEach((c, i) => {
      if (i > 0) tokens.push(t(' + '));
      tokens.push(v(varId, c.amountFormatted, c.amount, false, exact));
    });
    tokens.push(t(` = ${totalStr}`));
    return tokens;
  };

  // BLOCK 1: W-2 Wage & Payroll Summary (Clustered: Box 1 Wages + FICA Payroll)
  {
    const w2WageContribs: CalcVariableContributor[] = w2s.map((w, idx) => ({
      label: `W-2 #${idx + 1} (${w.employer || 'Employer'}) Box 1`,
      sign: '+',
      amount: Number(w.box1) || 0,
      amountFormatted: formatCurrencyExact(Number(w.box1) || 0),
      isSetUp: (Number(w.box1) || 0) !== 0,
      targetElementId: `w2-${w.id}-box1`
    }));
    const w2FedWhContribs: CalcVariableContributor[] = w2s.map((w, idx) => ({
      label: `W-2 #${idx + 1} (${w.employer || 'Employer'}) Box 2`,
      sign: '+',
      amount: Number(w.box2) || 0,
      amountFormatted: formatCurrencyExact(Number(w.box2) || 0),
      isSetUp: (Number(w.box2) || 0) !== 0,
      targetElementId: `w2-${w.id}-box2`
    }));
    const totalW2FedWh = w2s.reduce((s, w) => s + (Number(w.box2) || 0), 0);

    const vars: Record<string, CalcVariableBreakdown> = {
      w2_wages: makeVar('w2_wages', 'W-2 Box 1 Wages', totalW2Wages, w2WageContribs),
      w2_withholding: makeVar('w2_withholding', 'W-2 Box 2 Federal Withholding', totalW2FedWh, w2FedWhContribs, true),
      ss_tax: makeVar('ss_tax', 'Social Security Tax (Box 4)', summary.ficaCalc.ssTax, w2s.map((w, idx) => ({
        label: `W-2 #${idx + 1} Box 4`,
        sign: '+',
        amount: Number(w.box4) || 0,
        amountFormatted: formatCurrencyExact(Number(w.box4) || 0),
        isSetUp: (Number(w.box4) || 0) !== 0,
        targetElementId: `w2-${w.id}-box4`
      })), true),
      med_tax: makeVar('med_tax', 'Medicare Tax (Box 6)', summary.ficaCalc.medTax, w2s.map((w, idx) => ({
        label: `W-2 #${idx + 1} Box 6`,
        sign: '+',
        amount: Number(w.box6) || 0,
        amountFormatted: formatCurrencyExact(Number(w.box6) || 0),
        isSetUp: (Number(w.box6) || 0) !== 0,
        targetElementId: `w2-${w.id}-box6`
      })), true)
    };

    const w2WagesNode = opNode('line-w2-wages', 'Total W-2 Wages', 'add', [
      inputNode('w2_wages', 'w2-list', '∑ W-2 Box 1', totalW2Wages, { exact: false, varId: 'w2_wages' })
    ], { value: totalW2Wages, formLineLabel: 'Form 1040 Line 1a', exact: false });
    const w2WhNode = opNode('line-w2-withholding', 'W-2 Federal Tax Withheld', 'add', [
      inputNode('w2_withholding', 'w2-list', '∑ W-2 Box 2', totalW2FedWh, { exact: true, varId: 'w2_withholding' })
    ], { value: totalW2FedWh, formLineLabel: 'Form 1040 Line 25a', exact: true });
    const ficaNode = opNode('line-fica-total', 'FICA Payroll Taxes (SS + Medicare)', 'add', [
      inputNode('ss_tax', 'w2-list', 'SS Tax (6.2%)', summary.ficaCalc.ssTax, { exact: true, varId: 'ss_tax' }),
      inputNode('med_tax', 'w2-list', 'Medicare Tax (1.45%)', summary.ficaCalc.medTax, { exact: true, varId: 'med_tax' })
    ], { value: summary.ficaCalc.totalFica, formLineLabel: null, exact: true });

    const lines: CalcLineItem[] = [
      ...compileFormulaToLines(w2WagesNode, vars),
      ...compileFormulaToLines(w2WhNode, vars),
      ...compileFormulaToLines(ficaNode, vars)
    ];

    blocks.push({
      id: 'calc-total-w2-wages',
      stepLabel: 'Step 1 • Wage & Payroll Aggregation',
      title: 'W-2 Wages, Withholding & FICA',
      hasImpact: hasAnyW2Activity,
      lines,
      variables: vars,
      sourceIds: w2s.flatMap(w => [`w2-${w.id}-box1`, `w2-${w.id}-box2`, `w2-${w.id}-box4`, `w2-${w.id}-box6`])
    });
  }

  // BLOCK 2: Capital Gains & Losses (Schedule D)
  {
    const vars: Record<string, CalcVariableBreakdown> = {
      st_gain: makeVar('st_gain', 'Short-Term Capital Gains/Losses', stGain, [{
        label: 'Short-Term Net (Schedule D Part I)',
        sign: stGain < 0 ? '-' : '+',
        amount: Math.abs(stGain),
        amountFormatted: formatCurrency(stGain),
        isSetUp: stGain !== 0,
        targetElementId: 'input-capital-gains-st',
        panelKey: 'capital-gains',
        panelSection: 'other-income'
      }]),
      lt_gain: makeVar('lt_gain', 'Long-Term Capital Gains/Losses', ltGain, [{
        label: 'Long-Term Net (Schedule D Part II)',
        sign: ltGain < 0 ? '-' : '+',
        amount: Math.abs(ltGain),
        amountFormatted: formatCurrency(ltGain),
        isSetUp: ltGain !== 0,
        targetElementId: 'input-capital-gains-lt',
        panelKey: 'capital-gains',
        panelSection: 'other-income'
      }])
    };
    const rawNet = stGain + ltGain;
    const stGainNode = inputNode('st_gain', 'input-capital-gains-st', 'Short-Term', stGain, { exact: false, varId: 'st_gain' });
    const ltGainNode = inputNode('lt_gain', 'input-capital-gains-lt', 'Long-Term', ltGain, { exact: false, varId: 'lt_gain' });
    const rawCapNode = opNode('line-cap-raw', 'Combined Capital Gain / (Loss)', 'add', [stGainNode, ltGainNode], {
      value: rawNet,
      formLineLabel: null,
      expandIntermediate: true,
      exact: false
    });
    const allowableCapNode = opNode('line-cap-allowable', 'Allowable Capital Gain / (Loss)', 'max', [
      constNode('cap_loss_limit', formatCurrency(capLossLimit), capLossLimit),
      rawCapNode
    ], {
      value: summary.capitalGainsCalc.result,
      formLineLabel: 'Form 1040 Line 7',
      exact: false
    });
    const lines: CalcLineItem[] = compileFormulaToLines(allowableCapNode, vars);
    blocks.push({
      id: 'calc-capital-gains',
      stepLabel: 'Step 2a • Schedule D / Form 8949',
      title: 'Capital Gains & Loss Limitation',
      hasImpact: hasAnyCapGains,
      lines,
      variables: vars,
      sourceIds: ['input-capital-gains-st', 'input-capital-gains-lt']
    });
  }

  // BLOCK 3: Schedule E Rental & K-1
  {
    const vars: Record<string, CalcVariableBreakdown> = {
      sched_e_rents: makeVar('sched_e_rents', 'Gross Rental Income', grossRents, [{
        label: 'Schedule E Gross Rents',
        sign: '+',
        amount: grossRents,
        amountFormatted: formatCurrency(grossRents),
        isSetUp: grossRents !== 0,
        targetElementId: 'input-sched-e-rents',
        panelKey: 'schedule-e-rental',
        panelSection: 'other-income'
      }]),
      sched_e_exp: makeVar('sched_e_exp', 'Rental Operating Expenses', rentalExp, [{
        label: 'Schedule E Operating Expenses',
        sign: '-',
        amount: rentalExp,
        amountFormatted: formatCurrency(rentalExp),
        isSetUp: rentalExp !== 0,
        targetElementId: 'input-sched-e-expenses',
        panelKey: 'schedule-e-rental',
        panelSection: 'other-income'
      }]),
      sched_e_depr: makeVar('sched_e_depr', 'MACRS Depreciation', rentalDepr, [{
        label: 'Form 4562 Depreciation',
        sign: '-',
        amount: rentalDepr,
        amountFormatted: formatCurrency(rentalDepr),
        isSetUp: rentalDepr !== 0,
        targetElementId: 'input-sched-e-depreciation',
        panelKey: 'schedule-e-rental',
        panelSection: 'other-income'
      }])
    };

    const rentsNode = inputNode('sched_e_rents', 'input-sched-e-rents', 'Gross Rents', grossRents, { exact: false, varId: 'sched_e_rents' });
    const expNode = inputNode('sched_e_exp', 'input-sched-e-expenses', 'Expenses', rentalExp, { exact: false, varId: 'sched_e_exp' });
    const deprNode = inputNode('sched_e_depr', 'input-sched-e-depreciation', 'Depreciation', rentalDepr, { exact: false, varId: 'sched_e_depr' });
    const schedENetNode = opNode('line-sched-e-net', 'Net Rental Income Before PAL', 'sub', [
      rentsNode,
      opNode('sched-e-costs', 'Expenses + Depreciation', 'add', [expNode, deprNode], { exact: false })
    ], {
      value: summary.scheduleECalc.netBeforePal,
      formLineLabel: null,
      exact: false
    });
    const lines: CalcLineItem[] = [
      ...compileFormulaToLines(schedENetNode, vars),
      {
        id: 'line-sched-e-allowable',
        label: 'Allowable Schedule E Income / (Loss)',
        formLineLabel: 'Schedule 1 Line 5',
        generalTokens: [t('Allowable Schedule E (after Form 8582 $25k PAL phaseout) + K-1 Income')],
        pluggedTokens: [t(`Allowable Schedule E = ${formatCurrency(summary.scheduleECalc.allowableNet)}`)],
        resultFormatted: formatCurrency(summary.scheduleECalc.allowableNet)
      }
    ];

    blocks.push({
      id: 'calc-schedule-e',
      stepLabel: 'Step 2b • Schedule E / Form 4562',
      title: 'Rental Real Estate & K-1 Income',
      hasImpact: hasAnySchedE,
      lines,
      variables: vars,
      sourceIds: ['input-sched-e-rents', 'input-sched-e-expenses', 'input-sched-e-depreciation']
    });
  }

  // BLOCK 4: Gross Income, Adjustments & AGI (Clustered Core Pipeline)
  {
    const interestContribs: CalcVariableContributor[] = [
      {
        label: '1099-INT Taxable Interest',
        sign: '+',
        amount: interestDirect,
        amountFormatted: formatCurrency(interestDirect),
        isSetUp: interestDirect !== 0,
        targetElementId: 'input-other-interest',
        panelKey: '1099-int',
        panelSection: 'other-income'
      },
      ...sources.filter(s => s.type === '1099-INT').map(s => ({
        label: `1099-INT (${s.payer || 'Bank'})`,
        sign: '+' as const,
        amount: Math.max(0, (Number(s.amount) || 0) - Math.max(0, Number(s.accruedInterestPaid) || 0)),
        amountFormatted: formatCurrency(Math.max(0, (Number(s.amount) || 0) - Math.max(0, Number(s.accruedInterestPaid) || 0))),
        isSetUp: (Number(s.amount) || 0) !== 0,
        targetElementId: `input-source-${s.id}-amount`,
        panelKey: '1099-int',
        panelSection: 'other-income' as const
      }))
    ];

    const other1099Contribs: CalcVariableContributor[] = [
      {
        label: '1099-DIV Dividends',
        sign: '+',
        amount: totalDiv,
        amountFormatted: formatCurrency(totalDiv),
        isSetUp: totalDiv !== 0,
        targetElementId: 'section-federal-other-income',
        panelKey: '1099-div',
        panelSection: 'other-income'
      },
      {
        label: '1099-NEC Self-Employment',
        sign: '+',
        amount: totalNecGross,
        amountFormatted: formatCurrency(totalNecGross),
        isSetUp: totalNecGross !== 0,
        targetElementId: 'section-federal-other-income',
        panelKey: '1099-nec',
        panelSection: 'other-income'
      },
      {
        label: 'Schedule C Business Expenses',
        sign: '-',
        amount: schedCExp,
        amountFormatted: formatCurrency(schedCExp),
        isSetUp: schedCExp !== 0,
        targetElementId: 'input-sched-c-expenses',
        panelKey: 'schedule-c-expenses',
        panelSection: 'other-income'
      },
      {
        label: 'Other 1099s (1099-R, 1099-G, W-2G, Misc)',
        sign: '+',
        amount: totalOther1099,
        amountFormatted: formatCurrency(totalOther1099),
        isSetUp: totalOther1099 !== 0,
        targetElementId: 'section-federal-other-income',
        panelKey: '1099-r',
        panelSection: 'other-income'
      }
    ];
    const otherIncomeCombined = totalDiv + netNec + totalOther1099;

    const adjContribs: CalcVariableContributor[] = [
      { label: 'Student Loan Interest', sign: '+', amount: adjStudentLoan, amountFormatted: formatCurrency(adjStudentLoan), isSetUp: adjStudentLoan !== 0, targetElementId: 'input-adj-student-loan', panelKey: 'adj-student-loan', panelSection: 'adjustments' },
      { label: 'Traditional IRA', sign: '+', amount: adjIra, amountFormatted: formatCurrency(adjIra), isSetUp: adjIra !== 0, targetElementId: 'input-adj-ira', panelKey: 'adj-ira', panelSection: 'adjustments' },
      { label: 'HSA Contributions', sign: '+', amount: adjHsa, amountFormatted: formatCurrency(adjHsa), isSetUp: adjHsa !== 0, targetElementId: 'input-adj-hsa', panelKey: 'adj-hsa', panelSection: 'adjustments' },
      { label: 'Educator Expenses', sign: '+', amount: adjEducator, amountFormatted: formatCurrency(adjEducator), isSetUp: adjEducator !== 0, targetElementId: 'input-adj-educator', panelKey: 'adj-educator', panelSection: 'adjustments' },
      { label: 'SEP / Solo 401(k)', sign: '+', amount: adjSeRet, amountFormatted: formatCurrency(adjSeRet), isSetUp: adjSeRet !== 0, targetElementId: 'input-adj-se-retirement', panelKey: 'adj-se-retirement', panelSection: 'adjustments' },
      { label: 'SE Health Insurance', sign: '+', amount: adjSeHealth, amountFormatted: formatCurrency(adjSeHealth), isSetUp: adjSeHealth !== 0, targetElementId: 'input-adj-se-health', panelKey: 'adj-se-health', panelSection: 'adjustments' },
      { label: 'Alimony Paid', sign: '+', amount: adjAlimony, amountFormatted: formatCurrency(adjAlimony), isSetUp: adjAlimony !== 0, targetElementId: 'input-adj-alimony', panelKey: 'adj-alimony', panelSection: 'adjustments' },
      { label: '½ Self-Employment Tax (Auto)', sign: '+', amount: halfSeTax, amountFormatted: formatCurrencyExact(halfSeTax), isSetUp: halfSeTax !== 0, targetElementId: 'auto-fed-half-se' }
    ];

    const vars: Record<string, CalcVariableBreakdown> = {
      w2_wages: makeVar('w2_wages', 'W-2 Wages', totalW2Wages, w2s.map((w, idx) => ({
        label: `W-2 #${idx + 1} Box 1`,
        sign: '+',
        amount: Number(w.box1) || 0,
        amountFormatted: formatCurrency(Number(w.box1) || 0),
        isSetUp: (Number(w.box1) || 0) !== 0,
        targetElementId: `w2-${w.id}-box1`
      }))),
      interest_inc: makeVar('interest_inc', 'Taxable Interest', totalInterest, interestContribs),
      other_1099: makeVar('other_1099', '1099 & Business Income', otherIncomeCombined, other1099Contribs),
      cap_gains: makeVar('cap_gains', 'Net Capital Gains', summary.capitalGainsCalc.result, [
        { label: 'Short-Term Cap Gains', sign: stGain < 0 ? '-' : '+', amount: Math.abs(stGain), amountFormatted: formatCurrency(stGain), isSetUp: stGain !== 0, targetElementId: 'input-capital-gains-st', panelKey: 'capital-gains', panelSection: 'other-income' },
        { label: 'Long-Term Cap Gains', sign: ltGain < 0 ? '-' : '+', amount: Math.abs(ltGain), amountFormatted: formatCurrency(ltGain), isSetUp: ltGain !== 0, targetElementId: 'input-capital-gains-lt', panelKey: 'capital-gains', panelSection: 'other-income' }
      ]),
      sched_e: makeVar('sched_e', 'Schedule E / K-1', summary.scheduleECalc.allowableNet, [
        { label: 'Gross Rents', sign: '+', amount: grossRents, amountFormatted: formatCurrency(grossRents), isSetUp: grossRents !== 0, targetElementId: 'input-sched-e-rents', panelKey: 'schedule-e-rental', panelSection: 'other-income' },
        { label: 'Rental Expenses & Depr', sign: '-', amount: rentalExp + rentalDepr, amountFormatted: formatCurrency(rentalExp + rentalDepr), isSetUp: (rentalExp + rentalDepr) !== 0, targetElementId: 'input-sched-e-expenses', panelKey: 'schedule-e-rental', panelSection: 'other-income' },
        { label: 'Schedule K-1 Income', sign: '+', amount: k1Total, amountFormatted: formatCurrency(k1Total), isSetUp: k1Total !== 0, targetElementId: 'section-federal-other-income', panelKey: 'schedule-k1', panelSection: 'other-income' }
      ]),
      adjustments_total: makeVar('adjustments_total', 'Adjustments to Income', summary.adjustmentsCalc.result, adjContribs, true),
      gross_income: makeVar('gross_income', 'Total Gross Income', summary.grossIncomeCalc.result, [
        { label: 'W-2 Wages', sign: '+', amount: totalW2Wages, amountFormatted: formatCurrency(totalW2Wages), isSetUp: totalW2Wages !== 0, targetElementId: 'w2-0-box1' },
        { label: 'Taxable Interest', sign: '+', amount: totalInterest, amountFormatted: formatCurrency(totalInterest), isSetUp: totalInterest !== 0, targetElementId: 'input-other-interest', panelKey: '1099-int', panelSection: 'other-income' },
        { label: '1099 / Business Net', sign: '+', amount: otherIncomeCombined, amountFormatted: formatCurrency(otherIncomeCombined), isSetUp: otherIncomeCombined !== 0, targetElementId: 'section-federal-other-income' },
        { label: 'Capital Gains / Losses', sign: summary.capitalGainsCalc.result < 0 ? '-' : '+', amount: Math.abs(summary.capitalGainsCalc.result), amountFormatted: formatCurrency(summary.capitalGainsCalc.result), isSetUp: summary.capitalGainsCalc.result !== 0, targetElementId: 'input-capital-gains-st', panelKey: 'capital-gains', panelSection: 'other-income' },
        { label: 'Schedule E / K-1', sign: summary.scheduleECalc.allowableNet < 0 ? '-' : '+', amount: Math.abs(summary.scheduleECalc.allowableNet), amountFormatted: formatCurrency(summary.scheduleECalc.allowableNet), isSetUp: summary.scheduleECalc.allowableNet !== 0, targetElementId: 'input-sched-e-rents', panelKey: 'schedule-e-rental', panelSection: 'other-income' }
      ])
    };

    const w2Node = inputNode('w2_wages', 'calc-total-w2-wages', 'W-2 Wages', totalW2Wages, { exact: false, varId: 'w2_wages' });
    const intNode = inputNode('interest_inc', 'input-other-interest', 'Interest', totalInterest, { exact: false, varId: 'interest_inc' });
    const otherNode = inputNode('other_1099', 'section-federal-other-income', '1099/Business', otherIncomeCombined, { exact: false, varId: 'other_1099' });
    const capNode = inputNode('cap_gains', 'calc-capital-gains', 'Cap Gains', summary.capitalGainsCalc.result, { exact: false, varId: 'cap_gains' });
    const schedENode = inputNode('sched_e', 'calc-schedule-e', 'Sched E', summary.scheduleECalc.allowableNet, { exact: false, varId: 'sched_e' });
    const grossIncomeNode = opNode('line-gross-income', 'Total Gross Income', 'add', [w2Node, intNode, otherNode, capNode, schedENode], {
      value: summary.grossIncomeCalc.result,
      formLineLabel: 'Form 1040 Line 9',
      exact: true
    });
    const adjTotalNode = inputNode('adjustments_total', 'section-federal-adjustments', 'Adjustments', summary.adjustmentsCalc.result, { exact: true, varId: 'adjustments_total' });
    const adjustmentsLineNode = opNode('line-adjustments', 'Total Adjustments (Above-the-Line)', 'add', [adjTotalNode], {
      value: summary.adjustmentsCalc.result,
      formLineLabel: 'Form 1040 Line 10',
      exact: true
    });
    const grossRefNode = inputNode('gross_income', 'line-gross-income', 'Gross Income', summary.grossIncomeCalc.result, { exact: true, varId: 'gross_income' });
    const agiNode = opNode('line-agi', 'Adjusted Gross Income (AGI)', 'sub', [grossRefNode, adjTotalNode], {
      value: agi,
      formLineLabel: 'Form 1040 Line 11',
      exact: true
    });

    const lines: CalcLineItem[] = [
      ...compileFormulaToLines(grossIncomeNode, vars),
      ...compileFormulaToLines(adjustmentsLineNode, vars),
      ...compileFormulaToLines(agiNode, vars)
    ];

    blocks.push({
      id: 'calc-agi',
      stepLabel: 'Step 3 • Gross Income, Adjustments & AGI',
      title: 'Gross Income & Adjusted Gross Income (AGI)',
      hasImpact: hasAnyOverallImpact,
      isOutput: true,
      lines,
      variables: vars,
      sourceIds: ['calc-total-w2-wages', 'calc-capital-gains', 'calc-schedule-e', 'input-other-interest', 'input-adj-student-loan', 'input-adj-ira', 'input-adj-hsa', ...(halfSeTax > 0 ? ['auto-fed-half-se'] : [])]
    });
  }

  // BLOCK 5: Schedule A Itemized Deductions (with full Medical 7.5% AGI floor math & SALT $10k cap math)
  {
    const vars: Record<string, CalcVariableBreakdown> = {
      agi_val: makeVar('agi_val', 'Adjusted Gross Income (AGI)', agi, [
        { label: 'Form 1040 Line 11 AGI', sign: 'info', amount: agi, amountFormatted: formatCurrencyExact(agi), isSetUp: agi !== 0, targetElementId: 'calc-agi' }
      ], true),
      med_expenses: makeVar('med_expenses', 'Medical & Dental Expenses', medRaw, [{
        label: 'Medical & Dental Expenses Paid',
        sign: '+',
        amount: medRaw,
        amountFormatted: formatCurrency(medRaw),
        isSetUp: medRaw !== 0,
        targetElementId: 'input-itemized-medical',
        panelKey: 'itemized-medical',
        panelSection: 'itemized'
      }]),
      state_local_tax: makeVar('state_local_tax', 'State & Local Income Taxes', stateLocalTaxesForSalt, w2s.flatMap(w => (w.states || []).map(st => ({
        label: `W-2 ${st.state} Box 17 + Box 19`,
        sign: '+' as const,
        amount: (Number(st.stateTaxWithheld) || 0) + (Number(st.localTaxWithheld) || 0),
        amountFormatted: formatCurrency((Number(st.stateTaxWithheld) || 0) + (Number(st.localTaxWithheld) || 0)),
        isSetUp: ((Number(st.stateTaxWithheld) || 0) + (Number(st.localTaxWithheld) || 0)) !== 0,
        targetElementId: `w2-${w.id}-state-${st.id}-box17`
      })))),
      real_estate_tax: makeVar('real_estate_tax', 'Real Estate / Property Taxes', realEstateRaw, [{
        label: 'Real Estate Taxes Paid',
        sign: '+',
        amount: realEstateRaw,
        amountFormatted: formatCurrency(realEstateRaw),
        isSetUp: realEstateRaw !== 0,
        targetElementId: 'input-itemized-real-estate',
        panelKey: 'itemized-real-estate',
        panelSection: 'itemized'
      }]),
      mortgage_int: makeVar('mortgage_int', 'Mortgage Interest', mortgageRaw, [{
        label: 'Form 1098 Mortgage Interest',
        sign: '+',
        amount: mortgageRaw,
        amountFormatted: formatCurrency(mortgageRaw),
        isSetUp: mortgageRaw !== 0,
        targetElementId: 'input-itemized-mortgage',
        panelKey: 'itemized-mortgage',
        panelSection: 'itemized'
      }]),
      charity_contrib: makeVar('charity_contrib', 'Charitable Contributions', charityRaw, [{
        label: 'Charitable Donations',
        sign: '+',
        amount: charityRaw,
        amountFormatted: formatCurrency(charityRaw),
        isSetUp: charityRaw !== 0,
        targetElementId: 'input-itemized-charity',
        panelKey: 'itemized-charity',
        panelSection: 'itemized'
      }])
    };

    const agiNode = inputNode('agi_val', 'calc-agi', 'AGI', agi, { exact: true, varId: 'agi_val' });
    const medExpNode = inputNode('med_expenses', 'input-itemized-medical', 'Medical Expenses', medRaw, { exact: false, varId: 'med_expenses' });
    const medFloorNode = opNode('line-med-floor', 'Medical 7.5% AGI Floor', 'mul', [
      agiNode,
      constNode('med_pct', '7.5%', 0.075, 'percent')
    ], { value: medFloor, formLineLabel: null, expandIntermediate: true, exact: false });
    const medDeductibleNode = opNode('line-med-deductible', 'Deductible Medical Expenses', 'max', [
      constNode('zero', '$0', 0),
      opNode('med-over-floor', 'Medical − Floor', 'sub', [medExpNode, medFloorNode], { exact: false })
    ], { value: summary.itemizedCalc.allowableMedical, formLineLabel: 'Schedule A Line 4', exact: false });

    const saltTaxNode = inputNode('state_local_tax', 'w2-list', 'State/Local Tax', stateLocalTaxesForSalt, { exact: false, varId: 'state_local_tax' });
    const realEstateNode = inputNode('real_estate_tax', 'input-itemized-real-estate', 'Property Tax', realEstateRaw, { exact: false, varId: 'real_estate_tax' });
    const saltCapNode = opNode('line-salt-cap', 'SALT Deduction (Capped at $10,000)', 'min', [
      constNode('salt_cap', '$10,000', 10000),
      opNode('salt-raw', 'State/Local + Property Tax', 'add', [saltTaxNode, realEstateNode], { exact: false })
    ], { value: summary.itemizedCalc.allowableSalt, formLineLabel: 'Schedule A Line 5e', exact: false });

    const mortgageNode = inputNode('mortgage_int', 'input-itemized-mortgage', 'Mortgage Interest', mortgageRaw, { exact: false, varId: 'mortgage_int' });
    const charityNode = inputNode('charity_contrib', 'input-itemized-charity', 'Charity', charityRaw, { exact: false, varId: 'charity_contrib' });
    const schedATotalNode = opNode('line-sched-a-total', 'Total Itemized Deductions', 'add', [
      inputNode('med_ded', 'line-med-deductible', 'Deductible Medical', summary.itemizedCalc.allowableMedical, { exact: true }),
      inputNode('salt_ded', 'line-salt-cap', 'SALT', summary.itemizedCalc.allowableSalt, { exact: false }),
      mortgageNode,
      charityNode
    ], { value: summary.itemizedCalc.totalItemized, formLineLabel: 'Schedule A Line 17', exact: true });

    const lines: CalcLineItem[] = [
      ...compileFormulaToLines(medDeductibleNode, vars),
      ...compileFormulaToLines(saltCapNode, vars),
      ...compileFormulaToLines(schedATotalNode, vars)
    ];

    blocks.push({
      id: 'calc-itemized-deductions',
      stepLabel: 'Step 4a • Schedule A Itemized Deductions',
      title: 'Itemized Deductions (Medical 7.5% Floor & SALT Cap)',
      hasImpact: hasAnyItemized,
      lines,
      variables: vars,
      sourceIds: ['calc-agi', 'input-itemized-medical', 'input-itemized-real-estate', 'input-itemized-mortgage', 'input-itemized-charity']
    });
  }

  // BLOCK 6: Standard vs Itemized Deduction & Taxable Income (Clustered)
  {
    const vars: Record<string, CalcVariableBreakdown> = {
      agi_val: makeVar('agi_val', 'Adjusted Gross Income (AGI)', agi, [
        { label: 'Form 1040 Line 11 AGI', sign: '+', amount: agi, amountFormatted: formatCurrencyExact(agi), isSetUp: agi !== 0, targetElementId: 'calc-agi' }
      ], true),
      std_ded: makeVar('std_ded', 'Standard Deduction', summary.itemizedCalc.standardDeduction, ([
        { label: `Filing Status (${filingStatusLabel(state.filingStatus)})`, sign: '+' as const, amount: rules.standardDeduction[effectiveStatus], amountFormatted: formatCurrency(rules.standardDeduction[effectiveStatus]), isSetUp: true, targetElementId: 'select-filing-status' },
        { label: 'Age 65+ / Blind Extra', sign: '+' as const, amount: summary.itemizedCalc.standardDeduction - rules.standardDeduction[effectiveStatus], amountFormatted: formatCurrency(summary.itemizedCalc.standardDeduction - rules.standardDeduction[effectiveStatus]), isSetUp: (Number(state.dependents?.age65OrBlindCount) || 0) > 0, targetElementId: 'input-age65-blind', panelKey: 'cred-age-blind', panelSection: 'credits' }
      ] as CalcVariableContributor[]).map((c) => ({ ...c, targetElementId: summary.itemizedCalc.chosenMethod === 'standard' ? 'auto-fed-std-deduction' : c.targetElementId }))),
      item_ded: makeVar('item_ded', 'Itemized Deductions', summary.itemizedCalc.totalItemized, [
        { label: 'Medical (Over 7.5% AGI)', sign: '+', amount: summary.itemizedCalc.allowableMedical, amountFormatted: formatCurrencyExact(summary.itemizedCalc.allowableMedical), isSetUp: medRaw > 0, targetElementId: 'input-itemized-medical', panelKey: 'itemized-medical', panelSection: 'itemized' },
        { label: 'SALT (Capped $10k)', sign: '+', amount: summary.itemizedCalc.allowableSalt, amountFormatted: formatCurrency(summary.itemizedCalc.allowableSalt), isSetUp: rawSalt > 0, targetElementId: 'input-itemized-real-estate', panelKey: 'itemized-real-estate', panelSection: 'itemized' },
        { label: 'Mortgage Interest', sign: '+', amount: mortgageRaw, amountFormatted: formatCurrency(mortgageRaw), isSetUp: mortgageRaw > 0, targetElementId: 'input-itemized-mortgage', panelKey: 'itemized-mortgage', panelSection: 'itemized' },
        { label: 'Charity', sign: '+', amount: charityRaw, amountFormatted: formatCurrency(charityRaw), isSetUp: charityRaw > 0, targetElementId: 'input-itemized-charity', panelKey: 'itemized-charity', panelSection: 'itemized' }
      ], true),
      qbi_ded: makeVar('qbi_ded', 'QBI Deduction (20% Sec. 199A)', summary.qbiDeduction, [
        { label: 'Net Schedule C + K-1 QBI × 20%', sign: '+', amount: summary.qbiDeduction, amountFormatted: formatCurrencyExact(summary.qbiDeduction), isSetUp: summary.qbiDeduction > 0, targetElementId: summary.qbiDeduction > 0 ? 'auto-fed-qbi' : 'section-federal-other-income', panelKey: '1099-nec', panelSection: 'other-income' }
      ], true)
    };

    const stdDedNode = inputNode('std_ded', 'select-filing-status', 'Standard', summary.itemizedCalc.standardDeduction, { exact: false, varId: 'std_ded' });
    const itemDedNode = inputNode('item_ded', 'calc-itemized-deductions', 'Itemized', summary.itemizedCalc.totalItemized, { exact: true, varId: 'item_ded' });
    const dedChosenNode = opNode(
      'line-deduction',
      `Applied Deduction (${summary.itemizedCalc.chosenMethod === 'itemized' ? 'Itemized' : 'Standard'})`,
      'max',
      [stdDedNode, itemDedNode],
      { value: summary.deductionCalc.result, formLineLabel: 'Form 1040 Line 12', exact: true }
    );
    const qbiDedNode = inputNode('qbi_ded', 'auto-fed-qbi', 'QBI', summary.qbiDeduction, { exact: true, varId: 'qbi_ded' });
    const qbiLineNode = opNode('line-qbi', 'Qualified Business Income Deduction', 'add', [qbiDedNode], {
      value: summary.qbiDeduction,
      formLineLabel: 'Form 1040 Line 13',
      exact: true
    });
    const agiNode = inputNode('agi_val', 'calc-agi', 'AGI', agi, { exact: true, varId: 'agi_val' });
    const dedUsedNode = inputNode('ded_used', 'line-deduction', 'Deduction', summary.deductionCalc.result, { exact: true });
    const totalDedSubNode = summary.qbiDeduction > 0
      ? opNode('total-ded-qbi', 'Deduction + QBI', 'add', [dedUsedNode, qbiDedNode], { exact: true })
      : dedUsedNode;
    const taxableIncomeNode = opNode('line-taxable-income', 'Taxable Income', 'max', [
      constNode('zero', '$0.00', 0),
      opNode('agi-minus-ded', 'AGI − Deduction', 'sub', [agiNode, totalDedSubNode], { exact: true })
    ], { value: summary.taxableIncomeCalc.result, formLineLabel: 'Form 1040 Line 15', exact: true });

    const lines: CalcLineItem[] = [
      ...compileFormulaToLines(dedChosenNode, vars),
      ...(summary.qbiDeduction > 0 ? compileFormulaToLines(qbiLineNode, vars) : []),
      ...compileFormulaToLines(taxableIncomeNode, vars)
    ];

    blocks.push({
      id: 'calc-taxable-income',
      stepLabel: 'Step 4 • Deductions & Taxable Income',
      title: 'Deduction & Taxable Income',
      hasImpact: hasAnyOverallImpact,
      lines,
      variables: vars,
      sourceIds: [
        'calc-agi',
        'select-filing-status',
        ...(hasAnyItemized ? ['calc-itemized-deductions'] : []),
        ...(summary.itemizedCalc.chosenMethod === 'standard' ? ['auto-fed-std-deduction'] : []),
        ...(summary.qbiDeduction > 0 ? ['auto-fed-qbi'] : [])
      ]
    });
  }

  // BLOCK 7: Tax Before Credits (Brackets)
  {
    const vars: Record<string, CalcVariableBreakdown> = {
      taxable_inc: makeVar('taxable_inc', 'Taxable Income', summary.taxableIncomeCalc.result, [
        { label: 'Form 1040 Line 15 Taxable Income', sign: '+', amount: summary.taxableIncomeCalc.result, amountFormatted: formatCurrencyExact(summary.taxableIncomeCalc.result), isSetUp: summary.taxableIncomeCalc.result > 0, targetElementId: 'calc-taxable-income' }
      ], true)
    };

    const ordInc = summary.taxBeforeCreditsCalc.ordinaryTaxableIncome;
    const prefIncome = summary.taxBeforeCreditsCalc.preferentialIncome;
    const prefTax = summary.taxBeforeCreditsCalc.preferentialTax;
    const ordTax = Math.max(0, summary.taxBeforeCreditsCalc.result - prefTax);
    const taxableIncNode = inputNode('taxable_inc', 'calc-taxable-income', 'Taxable Ordinary Income', ordInc, { exact: true, varId: 'taxable_inc' });
    const bracketSlices: BracketSliceNode[] = summary.taxBeforeCreditsCalc.brackets.map(b => ({
      index: b.bracketIndex,
      rate: b.rate,
      ratePercent: b.ratePercent,
      range: b.range,
      bracketWidth: b.bracketWidth ?? Infinity,
      taxableAmount: b.taxableAmount,
      taxAmount: b.taxAmount,
      remainingBefore: b.remainingBefore ?? 0,
      remainingAfter: b.remainingAfter ?? 0
    }));
    const bracketNode = bracketsNode('line-tax-bracket', 'Federal Ordinary Income Brackets', taxableIncNode, bracketSlices, ordTax, {
      formLineLabel: null,
      expandIntermediate: true
    });
    const prefNode = inputNode('line-tax-preferential', 'calc-taxable-income', 'Preferential LTCG & Qualified Dividends Tax', prefTax, { exact: true });
    const taxBeforeCredNode = opNode(
      'line-tax-before-credits',
      'Tax from Brackets & Preferential Rates',
      'add',
      prefIncome > 0 ? [bracketNode, prefNode] : [bracketNode],
      { value: summary.taxBeforeCreditsCalc.result, formLineLabel: 'Form 1040 Line 16', exact: true }
    );

    const lines: CalcLineItem[] = [
      ...compileFormulaToLines(taxBeforeCredNode, vars),
      ...(prefIncome > 0
        ? [{
            id: 'line-tax-preferential',
            label: 'Preferential LTCG & Qualified Dividends Tax',
            formLineLabel: null,
            isIntermediate: true,
            generalTokens: [t('Preferential Tax = LTCG & Qualified Dividends × (0% / 15% / 20% / 25% / 28%)')],
            pluggedTokens: [t(`Preferential Tax = ${formatCurrencyExact(prefTax)} (on ${formatCurrencyExact(prefIncome)} preferential income)`)],
            resultFormatted: formatCurrencyExact(prefTax)
          }]
        : [])
    ];

    blocks.push({
      id: 'calc-tax-before-credits',
      stepLabel: 'Step 5 • Tax Brackets',
      title: 'Federal Income Tax (Before Credits)',
      hasImpact: hasAnyOverallImpact && summary.taxableIncomeCalc.result > 0,
      lines,
      variables: vars,
      sourceIds: ['calc-taxable-income', 'select-filing-status']
    });
  }

  // BLOCK 8: Tax Credits (Nonrefundable & Refundable) via FormulaNode Graph
  {
    const cr = summary.creditsCalc;
    const kids = Number(state.dependents?.childrenCount) || 0;
    const otherDeps = Number(state.dependents?.otherDependentsCount) || 0;
    const care = Number(state.dependents?.childCareExpenses) || 0;
    const aotc = Number(state.dependents?.educationExpensesAotc) || 0;
    const llc = Number(state.dependents?.educationExpensesLlc) || 0;
    const ftc = Number(state.dependents?.foreignTaxCredit) || 0;
    const clean = Number(state.dependents?.cleanEnergyCredit) || 0;

    const vars: Record<string, CalcVariableBreakdown> = {
      nonref_credits: makeVar('nonref_credits', 'Nonrefundable Credits', cr.totalNonRefundableCredits, [
        { label: `Child Tax Credit (${kids} kids)`, sign: '+', amount: cr.childTaxCredit, amountFormatted: formatCurrencyExact(cr.childTaxCredit), isSetUp: kids > 0, targetElementId: 'input-children-count', panelKey: 'cred-children', panelSection: 'credits' },
        { label: `Other Dependents ($500 × ${otherDeps})`, sign: '+', amount: cr.otherDependentsCredit, amountFormatted: formatCurrencyExact(cr.otherDependentsCredit), isSetUp: otherDeps > 0, targetElementId: 'input-other-dependents', panelKey: 'cred-other-dependents', panelSection: 'credits' },
        { label: 'Child & Dependent Care (Form 2441)', sign: '+', amount: cr.childCareCredit, amountFormatted: formatCurrencyExact(cr.childCareCredit), isSetUp: care > 0, targetElementId: 'input-child-care', panelKey: 'cred-child-care', panelSection: 'credits' },
        { label: 'Education Credits (Nonrefundable)', sign: '+', amount: cr.educationCreditNonRefundable, amountFormatted: formatCurrencyExact(cr.educationCreditNonRefundable), isSetUp: aotc > 0 || llc > 0, targetElementId: 'input-edu-aotc', panelKey: 'cred-aotc', panelSection: 'credits' },
        { label: "Saver's Credit (Form 8880)", sign: '+', amount: cr.saversCredit, amountFormatted: formatCurrencyExact(cr.saversCredit), isSetUp: cr.saversCredit > 0, targetElementId: 'auto-fed-savers-credit', panelKey: 'adj-ira', panelSection: 'adjustments' },
        { label: 'Foreign Tax Credit (Form 1116)', sign: '+', amount: cr.foreignTaxCredit, amountFormatted: formatCurrencyExact(cr.foreignTaxCredit), isSetUp: ftc > 0, targetElementId: 'input-foreign-tax-credit', panelKey: 'cred-foreign-tax', panelSection: 'credits' },
        { label: 'Clean Energy Credit (Form 5695)', sign: '+', amount: cr.cleanEnergyCredit, amountFormatted: formatCurrencyExact(cr.cleanEnergyCredit), isSetUp: clean > 0, targetElementId: 'input-clean-energy-credit', panelKey: 'cred-clean-energy', panelSection: 'credits' }
      ], true),
      ref_credits: makeVar('ref_credits', 'Refundable Credits', cr.totalRefundableCredits, [
        { label: 'Additional Child Tax Credit (Sched 8812)', sign: '+', amount: cr.additionalChildTaxCredit, amountFormatted: formatCurrencyExact(cr.additionalChildTaxCredit), isSetUp: cr.additionalChildTaxCredit > 0, targetElementId: 'auto-fed-actc', panelKey: 'cred-children', panelSection: 'credits' },
        { label: 'Earned Income Tax Credit (EITC)', sign: '+', amount: cr.eitc, amountFormatted: formatCurrencyExact(cr.eitc), isSetUp: cr.eitc > 0, targetElementId: 'auto-fed-eitc', panelKey: 'cred-children', panelSection: 'credits' },
        { label: 'Refundable AOTC (40%, Form 8863)', sign: '+', amount: cr.educationCreditRefundable, amountFormatted: formatCurrencyExact(cr.educationCreditRefundable), isSetUp: cr.educationCreditRefundable > 0, targetElementId: 'input-edu-aotc', panelKey: 'cred-aotc', panelSection: 'credits' }
      ], true)
    };

    const nonrefArgs: FormulaNode[] = [];
    if (kids > 0) {
      nonrefArgs.push(opNode('line-cred-ctc', `Child Tax Credit (${kids} × $2,000 − Phaseout)`, 'min', [
        inputNode('cred-ctc-raw', 'input-children-count', 'CTC Allowed', cr.childTaxCredit),
        inputNode('cred-ctc-taxcap', 'calc-tax-before-credits', 'Line 16 Tax', summary.taxBeforeCreditsCalc.result)
      ], { value: cr.childTaxCredit, expandIntermediate: true }));
    }
    if (otherDeps > 0) {
      nonrefArgs.push(opNode('line-cred-odc', 'Other Dependents Credit', 'mul', [
        inputNode('cred-odc-cnt', 'input-other-dependents', 'Other Dependents', otherDeps, { exact: false }),
        constNode('cred-odc-rate', '$500/Dependent', 500)
      ], { value: cr.otherDependentsCredit, expandIntermediate: true }));
    }
    if (care > 0) {
      nonrefArgs.push(inputNode('line-cred-care', 'input-child-care', 'Child & Dependent Care (Form 2441)', cr.childCareCredit));
    }
    if (cr.educationCreditNonRefundable > 0) {
      nonrefArgs.push(inputNode('line-cred-edu-nonref', 'input-edu-aotc', 'Nonrefundable Education Credits (Form 8863)', cr.educationCreditNonRefundable));
    }
    if (cr.saversCredit > 0) {
      nonrefArgs.push(inputNode('line-cred-savers', 'auto-fed-savers-credit', "Saver's Credit (Form 8880)", cr.saversCredit));
    }
    if (cr.foreignTaxCredit > 0) {
      nonrefArgs.push(inputNode('line-cred-ftc', 'input-foreign-tax-credit', 'Foreign Tax Credit (Form 1116)', cr.foreignTaxCredit));
    }
    if (cr.cleanEnergyCredit > 0) {
      nonrefArgs.push(inputNode('line-cred-clean', 'input-clean-energy-credit', 'Clean Energy Credit (Form 5695)', cr.cleanEnergyCredit));
    }

    const rawNonrefSum = nonrefArgs.length > 0
      ? opNode('line-nonref-raw', 'Raw Nonrefundable Credits', 'add', nonrefArgs, { expandIntermediate: nonrefArgs.length > 1 })
      : constNode('nonref-zero', '$0 Credits', 0);

    const nonrefRoot = opNode('line-nonref-credits', 'Nonrefundable Credits', 'min', [
      inputNode('tax-cap-ref', 'calc-tax-before-credits', 'Line 16 Tax', summary.taxBeforeCreditsCalc.result),
      rawNonrefSum
    ], {
      value: cr.totalNonRefundableCredits,
      formLineLabel: 'Form 1040 Line 19–20'
    });

    const refArgs: FormulaNode[] = [];
    if (cr.additionalChildTaxCredit > 0) {
      refArgs.push(inputNode('ref-actc', 'auto-fed-actc', 'ACTC (Schedule 8812)', cr.additionalChildTaxCredit));
    }
    if (cr.eitc > 0) {
      refArgs.push(inputNode('ref-eitc', 'auto-fed-eitc', 'EITC (Schedule EIC)', cr.eitc));
    }
    if (cr.educationCreditRefundable > 0) {
      refArgs.push(inputNode('ref-aotc', 'input-edu-aotc', 'Refundable AOTC (40% Form 8863)', cr.educationCreditRefundable));
    }

    const refRoot = opNode(
      'line-ref-credits',
      'Refundable Credits',
      'add',
      refArgs.length > 0 ? refArgs : [constNode('ref-zero', '$0 Refundable Credits', 0)],
      { value: cr.totalRefundableCredits, formLineLabel: 'Form 1040 Line 27–29' }
    );

    const lines: CalcLineItem[] = [
      ...compileFormulaToLines(nonrefRoot, vars),
      ...compileFormulaToLines(refRoot, vars)
    ];

    blocks.push({
      id: 'calc-total-credits',
      stepLabel: 'Step 6 • Tax Credits',
      title: 'Nonrefundable & Refundable Credits',
      hasImpact: hasAnyCreditsInput,
      lines,
      variables: vars,
      sourceIds: Array.from(new Set([
        'calc-tax-before-credits',
        ...extractSourceIds(nonrefRoot),
        ...extractSourceIds(refRoot),
        ...(cr.saversCredit > 0 ? ['auto-fed-savers-credit'] : []),
        ...(cr.additionalChildTaxCredit > 0 ? ['auto-fed-actc'] : []),
        ...(cr.eitc > 0 ? ['auto-fed-eitc'] : [])
      ]))
    });
  }

  // BLOCK 9: Other Taxes (SE Tax, Form 8959 Add'l Medicare, Form 8960 NIIT, Form 6251 AMT, Form 5329) via FormulaNode Graph
  {
    const ot = summary.otherTaxesCalc;
    const vars: Record<string, CalcVariableBreakdown> = {
      se_tax: makeVar('se_tax', 'Self-Employment Tax (Sched SE)', ot.selfEmploymentTax, [
        { label: 'SE Social Security (12.4%)', sign: '+', amount: ot.seSSPortion ?? 0, amountFormatted: formatCurrencyExact(ot.seSSPortion ?? 0), isSetUp: (ot.seSSPortion ?? 0) > 0, targetElementId: 'section-federal-other-income', panelKey: '1099-nec', panelSection: 'other-income' },
        { label: 'SE Medicare (2.9%)', sign: '+', amount: ot.seMedPortion ?? 0, amountFormatted: formatCurrencyExact(ot.seMedPortion ?? 0), isSetUp: (ot.seMedPortion ?? 0) > 0, targetElementId: 'section-federal-other-income', panelKey: '1099-nec', panelSection: 'other-income' }
      ], true),
      addl_med_tax: makeVar('addl_med_tax', 'Additional Medicare Tax (Form 8959)', ot.additionalMedicareTax, [
        { label: '0.9% on Medicare/SE Wages Over Threshold', sign: '+', amount: ot.additionalMedicareTax, amountFormatted: formatCurrencyExact(ot.additionalMedicareTax), isSetUp: ot.additionalMedicareTax > 0, targetElementId: 'calc-total-w2-wages' }
      ], true),
      niit_tax: makeVar('niit_tax', 'Net Investment Income Tax (Form 8960)', ot.niit, [
        { label: '3.8% on min(NII, MAGI Over Threshold)', sign: '+', amount: ot.niit, amountFormatted: formatCurrencyExact(ot.niit), isSetUp: ot.niit > 0, targetElementId: 'calc-agi' }
      ], true),
      amt_tax: makeVar('amt_tax', 'Alternative Minimum Tax (Form 6251)', ot.amt, [
        { label: 'Excess Tentative Minimum Tax over Regular Tax', sign: '+', amount: ot.amt, amountFormatted: formatCurrencyExact(ot.amt), isSetUp: ot.amt > 0, targetElementId: 'calc-tax-before-credits' }
      ], true),
      early_dist_tax: makeVar('early_dist_tax', 'Early Distribution Penalty (Form 5329)', ot.earlyDistributionPenaltyTax, [
        { label: '10% Penalty on Early 1099-R Distributions', sign: '+', amount: ot.earlyDistributionPenaltyTax, amountFormatted: formatCurrencyExact(ot.earlyDistributionPenaltyTax), isSetUp: ot.earlyDistributionPenaltyTax > 0, targetElementId: 'section-federal-other-income', panelKey: '1099-r', panelSection: 'other-income' }
      ], true)
    };

    const otherTaxNodes: FormulaNode[] = [];

    if (ot.selfEmploymentTax > 0) {
      const seEarnings = opNode('line-se-earnings', 'SE Taxable Earnings', 'mul', [
        inputNode('se-net-c', 'section-federal-other-income', 'Net 1099-NEC Profit', ot.seTaxableEarnings ? Math.round(ot.seTaxableEarnings / 0.9235 * 100) / 100 : 0),
        constNode('se-factor', '92.35% SE Factor', 0.9235, 'number')
      ], { value: ot.seTaxableEarnings ?? 0, expandIntermediate: true });

      const seSS = opNode('line-se-ss', 'SE Social Security Tax', 'mul', [
        seEarnings,
        constNode('se-ss-rate', '12.4% SS Rate', 0.124, 'percent')
      ], { value: ot.seSSPortion ?? 0, expandIntermediate: true });

      const seMed = opNode('line-se-med', 'SE Medicare Tax', 'mul', [
        seEarnings,
        constNode('se-med-rate', '2.9% Med Rate', 0.029, 'percent')
      ], { value: ot.seMedPortion ?? 0, expandIntermediate: true });

      otherTaxNodes.push(opNode('line-se-total', 'Schedule SE Tax', 'add', [seSS, seMed], {
        value: ot.selfEmploymentTax,
        expandIntermediate: true
      }));
    }

    if (ot.additionalMedicareTax > 0) {
      const excessMed = opNode('line-addl-med-excess', 'Excess Medicare Wages', 'max', [
        constNode('zero-med', '$0', 0),
        opNode('addl-med-diff', 'Wages − Threshold', 'sub', [
          inputNode('med-wages', 'calc-total-w2-wages', 'Medicare + SE Wages', ot.combinedMedAndSeWages ?? 0),
          constNode('med-thresh', 'Addl Medicare Threshold', ot.addMedThreshold ?? 200000)
        ])
      ], { value: ot.excessMedWages ?? 0, expandIntermediate: true });

      otherTaxNodes.push(opNode('line-addl-med-tax', 'Form 8959 Additional Medicare Tax', 'mul', [
        excessMed,
        constNode('addl-med-rate', '0.9% Rate', 0.009, 'percent')
      ], { value: ot.additionalMedicareTax, expandIntermediate: true }));
    }

    if (ot.niit > 0) {
      const magiExcess = opNode('line-niit-magi-excess', 'MAGI Over NIIT Threshold', 'max', [
        constNode('zero-niit', '$0', 0),
        opNode('niit-diff', 'AGI − Threshold', 'sub', [
          inputNode('niit-agi', 'calc-agi', 'AGI', summary.agiCalc.result),
          constNode('niit-thresh', 'NIIT Threshold', ot.niitThreshold ?? 200000)
        ])
      ], { value: ot.magiExcessOverNiit ?? 0, expandIntermediate: true });

      const niitBase = opNode('line-niit-base', 'NIIT Taxable Base', 'min', [
        inputNode('niit-nii', 'calc-agi', 'Net Investment Income', ot.netInvestmentIncome),
        magiExcess
      ], { expandIntermediate: true });

      otherTaxNodes.push(opNode('line-niit-tax', 'Form 8960 NIIT', 'mul', [
        niitBase,
        constNode('niit-rate', '3.8% NIIT Rate', 0.038, 'percent')
      ], { value: ot.niit, expandIntermediate: true }));
    }

    if (ot.amt > 0) {
      const amtiNode = opNode('line-amt-amti', 'AMTI (Form 6251)', 'sub', [
        inputNode('amt-agi', 'calc-agi', 'AGI', summary.agiCalc.result),
        constNode('amt-ded', 'AMT-Allowed Deductions + QBI', (ot.amtAllowedDeductions ?? 0) + summary.qbiDeduction)
      ], { value: ot.amti ?? 0, expandIntermediate: true });

      const tmtNode = opNode('line-amt-tmt', 'Tentative Minimum Tax', 'sub', [
        amtiNode,
        constNode('amt-exemp', 'AMT Exemption', ot.amtExemption ?? 0)
      ], { value: ot.tentativeMinimumTax ?? 0, expandIntermediate: true });

      otherTaxNodes.push(opNode('line-amt-tax', 'Form 6251 AMT', 'max', [
        constNode('zero-amt', '$0', 0),
        opNode('amt-net', 'TMT − Regular Tax', 'sub', [
          tmtNode,
          inputNode('amt-reg-tax', 'calc-tax-before-credits', 'Line 16 Regular Tax', summary.taxBeforeCreditsCalc.result)
        ])
      ], { value: ot.amt, expandIntermediate: true }));
    }

    if (ot.earlyDistributionPenaltyTax > 0) {
      otherTaxNodes.push(opNode('line-early-dist-tax', 'Form 5329 Early Distribution Penalty', 'mul', [
        inputNode('early-dist-amt', 'section-federal-other-income', 'Early 1099-R Distribution', ot.earlyDist1099RTotal ?? 0),
        constNode('early-dist-rate', '10% Penalty Rate', 0.10, 'percent')
      ], { value: ot.earlyDistributionPenaltyTax, expandIntermediate: true }));
    }

    const otherTaxesRoot = opNode(
      'line-other-taxes',
      'Other Taxes',
      'add',
      otherTaxNodes.length > 0 ? otherTaxNodes : [constNode('other-zero', '$0 Other Taxes', 0)],
      { value: ot.totalOtherTaxes, formLineLabel: 'Form 1040 Line 23' }
    );

    blocks.push({
      id: 'calc-other-taxes',
      stepLabel: 'Step 7 • Schedule 2 & 3 Other Taxes',
      title: 'Self-Employment Tax, NIIT & Other Taxes',
      hasImpact: hasAnyOtherTaxes,
      lines: compileFormulaToLines(otherTaxesRoot, vars),
      variables: vars,
      sourceIds: Array.from(new Set(['calc-agi', 'calc-total-w2-wages', ...extractSourceIds(otherTaxesRoot)]))
    });
  }

  // BLOCK 10: Final Federal Tax, Payments & Refund/Owed Verdict (Clustered Output)
  {
    const estPay = Math.max(0, Number(state.dependents?.estimatedTaxPayments) || 0);
    const vars: Record<string, CalcVariableBreakdown> = {
      tax_before_cred: makeVar('tax_before_cred', 'Tax Before Credits', summary.taxBeforeCreditsCalc.result, [
        { label: 'Form 1040 Line 16 Tax', sign: '+', amount: summary.taxBeforeCreditsCalc.result, amountFormatted: formatCurrencyExact(summary.taxBeforeCreditsCalc.result), isSetUp: summary.taxBeforeCreditsCalc.result > 0, targetElementId: 'calc-tax-before-credits' }
      ], true),
      nonref_cred: makeVar('nonref_cred', 'Nonrefundable Credits', summary.creditsCalc.totalNonRefundableCredits, [
        { label: 'Form 1040 Line 19–20 Credits', sign: '-', amount: summary.creditsCalc.totalNonRefundableCredits, amountFormatted: formatCurrencyExact(summary.creditsCalc.totalNonRefundableCredits), isSetUp: summary.creditsCalc.totalNonRefundableCredits > 0, targetElementId: 'calc-total-credits' }
      ], true),
      other_taxes: makeVar('other_taxes', 'Other Taxes', summary.otherTaxesCalc.totalOtherTaxes, [
        { label: 'Form 1040 Line 23 Other Taxes', sign: '+', amount: summary.otherTaxesCalc.totalOtherTaxes, amountFormatted: formatCurrencyExact(summary.otherTaxesCalc.totalOtherTaxes), isSetUp: summary.otherTaxesCalc.totalOtherTaxes > 0, targetElementId: 'calc-other-taxes' }
      ], true),
      payments_total: makeVar('payments_total', 'Total Payments & Refundable Credits', summary.withholdingCalc.result, [
        ...w2s.map((w, idx) => ({
          label: `W-2 #${idx + 1} Box 2 Federal Withholding`,
          sign: '+' as const,
          amount: Number(w.box2) || 0,
          amountFormatted: formatCurrencyExact(Number(w.box2) || 0),
          isSetUp: (Number(w.box2) || 0) !== 0,
          targetElementId: `w2-${w.id}-box2`
        })),
        { label: 'Estimated Tax Payments (1040-ES)', sign: '+', amount: estPay, amountFormatted: formatCurrencyExact(estPay), isSetUp: estPay > 0, targetElementId: 'input-estimated-payments', panelKey: 'cred-estimated-payments', panelSection: 'credits' },
        { label: 'Excess SS Tax Credit (Sched 3 Line 11)', sign: '+', amount: summary.ficaCalc.excessSSTaxCredit, amountFormatted: formatCurrencyExact(summary.ficaCalc.excessSSTaxCredit), isSetUp: summary.ficaCalc.excessSSTaxCredit > 0, targetElementId: summary.ficaCalc.excessSSTaxCredit > 0 ? 'auto-fed-excess-ss' : 'calc-total-w2-wages' },
        { label: 'Refundable Credits (ACTC/EITC/AOTC)', sign: '+', amount: summary.creditsCalc.totalRefundableCredits, amountFormatted: formatCurrencyExact(summary.creditsCalc.totalRefundableCredits), isSetUp: summary.creditsCalc.totalRefundableCredits > 0, targetElementId: 'calc-total-credits' }
      ], true)
    };

    const taxBeforeCredNode = inputNode('tax_before_cred', 'calc-tax-before-credits', 'Line 16 Tax', summary.taxBeforeCreditsCalc.result, { exact: true, varId: 'tax_before_cred' });
    const nonrefCredNode = inputNode('nonref_cred', 'calc-total-credits', 'Nonref Credits', summary.creditsCalc.totalNonRefundableCredits, { exact: true, varId: 'nonref_cred' });
    const otherTaxesNode = inputNode('other_taxes', 'calc-other-taxes', 'Other Taxes', summary.otherTaxesCalc.totalOtherTaxes, { exact: true, varId: 'other_taxes' });
    const netTaxAfterCredNode = opNode('net-tax-after-cred', 'Tax After Nonref Credits', 'max', [
      constNode('zero', '$0.00', 0),
      opNode('tax-minus-cred', 'Tax − Nonref Credits', 'sub', [taxBeforeCredNode, nonrefCredNode], { exact: true })
    ], { value: Math.max(0, summary.taxBeforeCreditsCalc.result - summary.creditsCalc.totalNonRefundableCredits), formLineLabel: null, exact: true });
    const totalTaxNode = opNode('line-total-tax', 'Total Federal Tax Liability', 'add', [netTaxAfterCredNode, otherTaxesNode], {
      value: summary.totalTaxCalc.result,
      formLineLabel: 'Form 1040 Line 24',
      exact: true
    });
    const paymentsNode = inputNode('payments_total', 'calc-total-w2-wages', 'Withholding + Est. Payments + Refundable Credits', summary.withholdingCalc.result, { exact: true, varId: 'payments_total' });
    const totalPaymentsNode = opNode('line-total-payments', 'Total Payments & Refundable Credits', 'add', [paymentsNode], {
      value: summary.withholdingCalc.result,
      formLineLabel: 'Form 1040 Line 33',
      exact: true
    });

    const lines: CalcLineItem[] = [
      ...compileFormulaToLines(totalTaxNode, vars),
      ...compileFormulaToLines(totalPaymentsNode, vars),
      {
        id: 'line-final-outcome',
        label: summary.finalResultCalc.isRefund ? 'Federal Tax Refund' : 'Federal Tax Balance Owed',
        formLineLabel: summary.finalResultCalc.isRefund ? 'Form 1040 Line 34 / 35a' : 'Form 1040 Line 37',
        generalTokens: [t('Net Outcome = Total Payments − Total Tax')],
        pluggedTokens: [t(`Net Outcome = ${formatCurrencyExact(summary.withholdingCalc.result)} − ${formatCurrencyExact(summary.totalTaxCalc.result)} = ${summary.finalResultCalc.isRefund ? '+' : '-'}${formatCurrencyExact(summary.finalResultCalc.result)}`)],
        resultFormatted: `${summary.finalResultCalc.isRefund ? '+' : '-'}${formatCurrencyExact(summary.finalResultCalc.result)}`
      }
    ];

    blocks.push({
      id: 'calc-final-verdict',
      stepLabel: 'Step 8 • Federal Bottom Line',
      title: 'Total Tax, Payments & Federal Refund / Owed',
      hasImpact: hasAnyOverallImpact,
      isOutput: true,
      lines,
      variables: vars,
      sourceIds: [
        'calc-tax-before-credits',
        'calc-total-w2-wages',
        ...(hasAnyCreditsInput ? ['calc-total-credits'] : []),
        ...(hasAnyOtherTaxes ? ['calc-other-taxes'] : []),
        ...(summary.ficaCalc.excessSSTaxCredit > 0 ? ['auto-fed-excess-ss'] : [])
      ]
    });
  }

  return blocks;
}

export function buildStateCalcBlocks(sr: StateReturnCalculation, allStateReturns: StateReturnCalculation[]): CalcBlockDefinition[] {
  const makeVar = (
    varId: string,
    label: string,
    totalValue: number,
    contributors: CalcVariableContributor[],
    exact = true
  ): CalcVariableBreakdown => {
    const hasAnySetup = contributors.some(c => c.isSetUp && c.amount !== 0);
    return {
      varId,
      label,
      totalValue,
      totalFormatted: exact ? formatCurrencyExact(totalValue) : formatCurrency(totalValue),
      isEmpty: !hasAnySetup && totalValue === 0,
      contributors
    };
  };

  const stateKey = sr.state.toLowerCase();
  const cardId = `calc-state-${stateKey}-card`;
  const taxableId = `calc-state-${stateKey}-taxable`;
  const tentativeId = `calc-state-${stateKey}-tentative`;
  const localId = `calc-state-${stateKey}-local`;

  const vars: Record<string, CalcVariableBreakdown> = {
    state_wages: makeVar('state_wages', `${sr.state} Sourced Income`, sr.stateWages, [
      { label: `${sr.state} Wages & Sourced Income`, sign: '+', amount: sr.stateWages, amountFormatted: formatCurrencyExact(sr.stateWages), isSetUp: sr.stateWages > 0, targetElementId: `state-group-${stateKey}` }
    ]),
    state_ded: makeVar('state_ded', `${sr.state} Deduction`, sr.stateStandardDeduction, [
      { label: `${sr.state} Standard Deduction`, sign: '+', amount: sr.baseStdDeduction ?? sr.stateStandardDeduction, amountFormatted: formatCurrencyExact(sr.baseStdDeduction ?? sr.stateStandardDeduction), isSetUp: (sr.baseStdDeduction ?? sr.stateStandardDeduction) > 0, targetElementId: `auto-state-${stateKey}-std-ded` },
      ...(sr.stateItemizedUsed ? [{ label: `${sr.state} Itemized Deduction (Carryover)`, sign: 'info' as const, amount: sr.stateItemizedAmount ?? 0, amountFormatted: formatCurrencyExact(sr.stateItemizedAmount ?? 0), isSetUp: (sr.stateItemizedAmount ?? 0) > 0, targetElementId: `auto-state-${stateKey}-itemized` }] : []),
      ...((sr.statePanelItemized ?? 0) > 0 ? [{ label: `${sr.state} Additional Itemized Panels`, sign: '+' as const, amount: sr.statePanelItemized ?? 0, amountFormatted: formatCurrencyExact(sr.statePanelItemized ?? 0), isSetUp: true, targetElementId: `state-${stateKey}-itemized` }] : [])
    ]),
    ostc_credit: makeVar(
      'ostc_credit',
      'Other State Tax Credit (OSTC)',
      sr.creditForOtherStates,
      sr.creditedStates.map(c => ({
        label: `Credit for ${c.fromState} Tax (min(${formatCurrencyExact(c.sourceTaxPaid)}, ${formatCurrencyExact(c.homeAttributableTax)}))`,
        sign: '+',
        amount: c.creditAllowed,
        amountFormatted: formatCurrencyExact(c.creditAllowed),
        isSetUp: c.creditAllowed > 0,
        targetElementId: `auto-state-${stateKey}-ostc-${c.fromState.toLowerCase()}`
      })),
      true
    ),
    state_withholding: makeVar('state_withholding', `${sr.state} Tax Withheld`, sr.stateWithholding, [
      { label: `${sr.state} State & Local Withholding`, sign: '+', amount: sr.stateWithholding, amountFormatted: formatCurrencyExact(sr.stateWithholding), isSetUp: sr.stateWithholding > 0, targetElementId: `state-group-${stateKey}` }
    ])
  };

  if (!sr.hasIncomeTax) {
    const noTaxNode = opNode(`line-state-${stateKey}-notax`, `${sr.state} Tax`, 'mul', [
      inputNode(`st-w-${stateKey}`, `state-group-${stateKey}`, `${sr.state} Wages`, sr.stateWages),
      constNode(`st-zero-rate-${stateKey}`, '0% Wage Tax', 0, 'percent')
    ], { value: 0, formLineLabel: sr.formName });
    return [{
      id: cardId,
      stepLabel: `${sr.stateName} • ${sr.residentStatus === 'resident' ? 'Resident Return' : 'Nonresident Return'}`,
      title: sr.formName,
      hasImpact: true,
      isOutput: true,
      lines: compileFormulaToLines(noTaxNode, vars),
      variables: vars,
      sourceIds: [`state-group-${stateKey}`]
    }];
  }

  if (sr.reciprocityExemption) {
    const recipNode = opNode(`line-state-${stateKey}-reciprocity`, 'Nonresident Refund (Reciprocal)', 'sub', [
      inputNode(`st-wh-${stateKey}`, `state-group-${stateKey}`, `${sr.state} Withholding`, sr.stateWithholding, { varId: 'state_withholding' }),
      constNode(`st-recip-zero-${stateKey}`, 'Reciprocal Exempt Tax', 0)
    ], { value: sr.netOutcome, formLineLabel: sr.formName });
    return [{
      id: cardId,
      stepLabel: `${sr.stateName} • Nonresident Return`,
      title: `${sr.formName} (Reciprocal Exemption)`,
      hasImpact: true,
      isOutput: true,
      lines: compileFormulaToLines(recipNode, vars),
      variables: vars,
      sourceIds: [`state-group-${stateKey}`]
    }];
  }

  // Special Case: DC Form D-30 Unincorporated Business Franchise Tax
  if (sr.d30Details) {
    const d30 = sr.d30Details;
    const netRentalNode = inputNode('dc-d30-net-rental', 'calc-schedule-e', 'DC Net Rental Income', d30.netRental);
    const salaryAllowNode = opNode('line-dc-d30-salary', '30% Salary Allowance', 'mul', [
      netRentalNode,
      constNode('dc-d30-sal-pct', '30% Allowance', 0.30, 'percent')
    ], { value: d30.salaryAllowance, expandIntermediate: true });

    const dedTotalNode = opNode('line-dc-d30-ded', 'D-30 Total Deductions', 'add', [
      salaryAllowNode,
      constNode('dc-d30-exemp', 'Specific Exemption', d30.specificExemption)
    ], { expandIntermediate: true });

    const taxableUbtNode = opNode('line-dc-d30-taxable', 'DC Taxable UBT', 'max', [
      constNode('dc-d30-zero', '$0', 0),
      opNode('dc-d30-diff', 'Net Rental − Deductions', 'sub', [netRentalNode, dedTotalNode])
    ], { value: sr.stateTaxableIncome, formLineLabel: 'Form D-30 Line 35' });

    const panel1: CalcBlockDefinition = {
      id: taxableId,
      stepLabel: `${sr.stateName} • Deductions & Taxable UBT`,
      title: 'DC Form D-30 Deductions & Taxable Income',
      hasImpact: true,
      lines: compileFormulaToLines(taxableUbtNode, vars),
      variables: vars,
      sourceIds: ['calc-schedule-e']
    };

    const rawUbtTaxNode = opNode('line-dc-d30-raw-tax', 'Raw UBT Tax', 'mul', [
      inputNode('dc-d30-taxable-ref', taxableId, 'DC Taxable UBT', sr.stateTaxableIncome),
      constNode('dc-d30-rate', '8.25% UBT Rate', 0.0825, 'percent')
    ], { value: d30.rawUbtTax, expandIntermediate: true });

    const finalUbtNode = d30.grossReceipts > 12000
      ? opNode('line-dc-d30-liability', 'DC UBT Tax Liability', 'max', [
          constNode('dc-d30-min', 'Minimum Tax', 250),
          rawUbtTaxNode
        ], { value: sr.stateTaxLiability, expandIntermediate: true })
      : opNode('line-dc-d30-liability', 'DC UBT Tax Liability (Gross ≤ $12k)', 'mul', [
          rawUbtTaxNode,
          constNode('dc-d30-exempt-mult', 'Exempt Under $12k', 0, 'number')
        ], { value: 0, expandIntermediate: true });

    const dcOutcomeNode = opNode('line-dc-d30-outcome', 'Net Outcome', 'sub', [
      inputNode('dc-d30-wh', `state-group-${stateKey}`, 'DC Withholding', sr.stateWithholding, { varId: 'state_withholding' }),
      finalUbtNode
    ], { value: sr.stateWithholding - sr.stateTaxLiability, formLineLabel: sr.formName });

    const panel2: CalcBlockDefinition = {
      id: cardId,
      stepLabel: `${sr.stateName} • UBT Tax & Net Outcome`,
      title: sr.formName,
      hasImpact: true,
      isOutput: true,
      lines: compileFormulaToLines(dcOutcomeNode, vars),
      variables: vars,
      sourceIds: [taxableId]
    };

    return [panel1, panel2];
  }

  const blocks: CalcBlockDefinition[] = [];

  // PANEL 1: State Deductions & Taxable Income
  const p1Lines: CalcLineItem[] = [];
  (sr.modifications || []).forEach((mod, mIdx) => {
    const modNode = opNode(`line-state-${stateKey}-mod-${mIdx}`, mod.label, 'add', [
      inputNode(`st-mod-val-${stateKey}-${mIdx}`, mod.sourceId || `state-group-${stateKey}`, mod.label, mod.amount)
    ], { value: mod.amount });
    p1Lines.push(...compileFormulaToLines(modNode, vars));
  });

  const baseDed = sr.baseStdDeduction ?? sr.stateStandardDeduction;
  if ((sr.stateItemizedAmount ?? 0) > 0 || (sr.statePanelItemized ?? 0) > 0) {
    const dedNode = opNode(`line-state-${stateKey}-ded-calc`, `${sr.state} Deduction`, 'add', [
      (sr.stateItemizedAmount ?? 0) > 0
        ? opNode(`line-state-${stateKey}-ded-choice`, `max(${sr.state} Standard, ${sr.state} Itemized)`, 'max', [
            inputNode(`st-std-${stateKey}`, `auto-state-${stateKey}-std-ded`, `${sr.state} Standard`, baseDed),
            inputNode(`st-itm-${stateKey}`, `auto-state-${stateKey}-itemized`, `${sr.state} Itemized`, sr.stateItemizedAmount ?? 0)
          ])
        : inputNode(`st-std-${stateKey}`, `auto-state-${stateKey}-std-ded`, `${sr.state} Standard`, baseDed),
      ...((sr.statePanelItemized ?? 0) > 0 ? [inputNode(`st-sp-itm-${stateKey}`, `state-${stateKey}-itemized`, `${sr.state} Extra Itemized`, sr.statePanelItemized ?? 0)] : [])
    ], { value: sr.stateStandardDeduction, formLineLabel: null });
    p1Lines.push(...compileFormulaToLines(dedNode, vars));
  }

  const hasExempDed = (sr.stateExemptionAmount ?? 0) > 0;
  const taxableNode = opNode(`line-state-${stateKey}-taxable`, `${sr.state} Taxable Income`, 'max', [
    constNode(`st-zero-${stateKey}`, '$0', 0),
    opNode(`st-taxable-diff-${stateKey}`, `${sr.state} Income − Deduction${hasExempDed ? ' − Exemptions' : ''}`, 'sub', [
      inputNode(`st-inc-${stateKey}`, `state-group-${stateKey}`, `${sr.state} Income`, sr.stateWages + (sr.statePanelOtherIncome ?? 0) - (sr.statePanelAdjustments ?? 0), { varId: 'state_wages' }),
      inputNode(`st-ded-${stateKey}`, `auto-state-${stateKey}-std-ded`, `${sr.state} Deduction`, sr.stateStandardDeduction, { varId: 'state_ded' }),
      ...(hasExempDed ? [inputNode(`st-exemp-${stateKey}`, `auto-state-${stateKey}-dep-exemption`, `${sr.state} Exemptions`, sr.stateExemptionAmount ?? 0)] : [])
    ])
  ], { value: sr.stateTaxableIncome, formLineLabel: `${sr.formName} Taxable` });
  p1Lines.push(...compileFormulaToLines(taxableNode, vars));

  blocks.push({
    id: taxableId,
    stepLabel: `${sr.stateName} • Step 1: Deductions & Taxable Income`,
    title: `${sr.state} Deductions & Taxable Income`,
    hasImpact: true,
    lines: p1Lines,
    variables: vars,
    sourceIds: Array.from(new Set([
      ...(sr.baseStdDeduction ? [`auto-state-${stateKey}-std-ded`] : []),
      ...(sr.stateItemizedUsed ? [`auto-state-${stateKey}-itemized`] : []),
      ...(hasExempDed ? [`auto-state-${stateKey}-dep-exemption`] : []),
      `state-group-${stateKey}`
    ]))
  });

  // PANEL 2: State Tax Brackets & Tentative Tax
  const p2Lines: CalcLineItem[] = [];
  const incRef = inputNode(`st-taxable-ref-${stateKey}`, taxableId, `${sr.state} Taxable Income`, sr.stateTaxableIncome);
  if (!sr.isFlat && sr.brackets && sr.brackets.length > 0 && sr.stateTaxableIncome > 0) {
    const slices: BracketSliceNode[] = sr.brackets.map(b => ({
      index: b.bracketIndex,
      rate: b.rate,
      ratePercent: b.ratePercent,
      range: b.range,
      bracketWidth: b.bracketWidth ?? Infinity,
      taxableAmount: b.taxableAmount,
      taxAmount: b.taxAmount,
      remainingBefore: b.remainingBefore ?? 0,
      remainingAfter: b.remainingAfter ?? 0
    }));
    const bNode = bracketsNode(
      `line-state-${stateKey}-tentative`,
      `Tentative ${sr.state} Tax`,
      incRef,
      slices,
      Math.round((sr.stateTaxBeforeCredit - (sr.surchargeAmount ?? 0) + (sr.stateCreditAmount ?? 0)) * 100) / 100,
      { formLineLabel: `${sr.state} Tentative Tax` }
    );
    p2Lines.push(...compileFormulaToLines(bNode, vars));
  } else {
    const flatRate = sr.flatRate ?? 0;
    const flatNode = opNode(`line-state-${stateKey}-tentative`, `Tentative ${sr.state} Tax`, 'mul', [
      incRef,
      constNode(`st-flat-${stateKey}`, `${sr.state} Flat Rate`, flatRate, 'percent')
    ], { value: sr.stateTaxBeforeCredit, formLineLabel: `${sr.state} Tentative Tax` });
    p2Lines.push(...compileFormulaToLines(flatNode, vars));
  }

  if ((sr.surchargeAmount ?? 0) > 0 && sr.surchargeLabel) {
    const surNode = opNode(`line-state-${stateKey}-surcharge`, sr.surchargeLabel, 'add', [
      inputNode(`st-sur-val-${stateKey}`, taxableId, sr.surchargeLabel, sr.surchargeAmount ?? 0)
    ], { value: sr.surchargeAmount ?? 0 });
    p2Lines.push(...compileFormulaToLines(surNode, vars));
  }
  if ((sr.stateCreditAmount ?? 0) > 0 && sr.stateCreditLabel) {
    const credNode = opNode(`line-state-${stateKey}-builtin-cred`, sr.stateCreditLabel, 'sub', [
      constNode(`st-cred-zero-${stateKey}`, '$0', 0),
      inputNode(`st-cred-val-${stateKey}`, `auto-state-${stateKey}-builtin-credit`, sr.stateCreditLabel, sr.stateCreditAmount ?? 0)
    ], { value: -(sr.stateCreditAmount ?? 0) });
    p2Lines.push(...compileFormulaToLines(credNode, vars));
  }

  blocks.push({
    id: tentativeId,
    stepLabel: `${sr.stateName} • Step 2: Tax Brackets`,
    title: `${sr.state} Tax Brackets & Tentative Tax`,
    hasImpact: true,
    lines: p2Lines,
    variables: vars,
    sourceIds: [taxableId]
  });

  // PANEL 3: Local / Municipal Tax (NYC, Yonkers, MD County, etc.)
  const hasLocal = sr.localTaxLiability > 0;
  if (hasLocal) {
    let p3Lines: CalcLineItem[] = [];
    if (sr.localBrackets && sr.localBrackets.length > 0) {
      const localSlices: BracketSliceNode[] = sr.localBrackets.map(b => ({
        index: b.bracketIndex,
        rate: b.rate,
        ratePercent: b.ratePercent,
        range: b.range,
        bracketWidth: b.bracketWidth ?? Infinity,
        taxableAmount: b.taxableAmount,
        taxAmount: b.taxAmount,
        remainingBefore: b.remainingBefore ?? 0,
        remainingAfter: b.remainingAfter ?? 0
      }));
      const localNode = bracketsNode(
        `line-state-${stateKey}-local`,
        sr.localRuleLabel || `${sr.stateName} Local Tax`,
        incRef,
        localSlices,
        sr.localTaxLiability,
        { formLineLabel: 'Local Municipal Tax' }
      );
      p3Lines = compileFormulaToLines(localNode, vars);
    } else if (sr.state === 'NY' && sr.localRuleLabel?.includes('Yonkers')) {
      const yonkersNode = opNode(`line-state-${stateKey}-local`, 'Yonkers Resident Surcharge', 'mul', [
        inputNode(`st-yonk-base-${stateKey}`, tentativeId, `${sr.state} Tentative Tax`, sr.stateTaxBeforeCredit),
        constNode(`st-yonk-rate-${stateKey}`, '16.75% Yonkers Rate', 0.1675, 'percent')
      ], { value: sr.localTaxLiability, formLineLabel: 'Yonkers Local Tax' });
      p3Lines = compileFormulaToLines(yonkersNode, vars);
    } else if (sr.state === 'MD') {
      const mdLocalNode = opNode(`line-state-${stateKey}-local`, 'MD County Piggyback Tax', 'mul', [
        incRef,
        constNode(`st-md-local-rate-${stateKey}`, '3.20% County Rate', 0.032, 'percent')
      ], { value: sr.localTaxLiability, formLineLabel: 'MD County Tax' });
      p3Lines = compileFormulaToLines(mdLocalNode, vars);
    } else {
      const box19Node = opNode(`line-state-${stateKey}-local`, sr.localRuleLabel || 'Local Tax', 'add', [
        inputNode(`st-local-box19-${stateKey}`, `state-group-${stateKey}`, 'W-2 Box 19 Local Tax', sr.localTaxLiability)
      ], { value: sr.localTaxLiability, formLineLabel: 'Local Tax' });
      p3Lines = compileFormulaToLines(box19Node, vars);
    }

    blocks.push({
      id: localId,
      stepLabel: `${sr.stateName} • Step 3: Local / Municipal Tax`,
      title: sr.localRuleLabel || `${sr.stateName} Local Tax`,
      hasImpact: true,
      lines: p3Lines,
      variables: vars,
      sourceIds: [taxableId]
    });
  }

  // PANEL 4: Credits (OSTC), Total State Tax & Net Outcome
  const ostcNodes: FormulaNode[] = sr.creditedStates.map(c => {
    const nrWages = allStateReturns.find(r => r.state === c.fromState)?.stateWages ?? 0;
    const nrCardId = `calc-state-${c.fromState.toLowerCase()}-card`;
    const ratioNode = opNode(`line-ostc-ratio-${stateKey}-${c.fromState.toLowerCase()}`, `${c.fromState} Wage Share`, 'div', [
      inputNode(`ostc-nr-w-${c.fromState.toLowerCase()}`, nrCardId, `${c.fromState} Income`, nrWages),
      inputNode(`ostc-tot-w-${stateKey}`, taxableId, `${sr.state} Total Income`, sr.stateWages)
    ]);
    const homeAttrNode = opNode(`line-ostc-attr-${stateKey}-${c.fromState.toLowerCase()}`, `${sr.state} Attributable Tax`, 'mul', [
      inputNode(`ostc-home-tax-${stateKey}`, tentativeId, `${sr.state} Tax`, sr.stateTaxBeforeCredit),
      ratioNode
    ], { value: c.homeAttributableTax });

    return opNode(`line-state-${stateKey}-ostc-${c.fromState.toLowerCase()}`, `OSTC (${c.fromState})`, 'min', [
      inputNode(`ostc-src-tax-${c.fromState.toLowerCase()}`, nrCardId, `${c.fromState} Tax Paid`, c.sourceTaxPaid),
      homeAttrNode
    ], { value: c.creditAllowed, expandIntermediate: true });
  });

  const tentativeTaxRef = inputNode(`st-tent-ref-${stateKey}`, tentativeId, `Tentative ${sr.state} Tax`, sr.stateTaxBeforeCredit);
  const stateEitcNode = (sr.stateEitcAmount ?? 0) > 0
    ? [opNode(`line-state-${stateKey}-eitc`, `${sr.state} Earned Income Credit`, 'mul', [
        inputNode(`st-eitc-fed-${stateKey}`, 'auto-fed-eitc', 'Federal EITC', Math.round(((sr.stateEitcAmount ?? 0) / (sr.stateEitcRate || 1)) * 100) / 100),
        constNode(`st-eitc-rate-${stateKey}`, `${sr.state} EITC Rate`, sr.stateEitcRate || 0, 'percent')
      ], { value: sr.stateEitcAmount ?? 0, expandIntermediate: true })]
    : [];

  const stateExempCredNode = (sr.stateExemptionCredit ?? 0) > 0
    ? [inputNode(`line-state-${stateKey}-exemp-cred`, `auto-state-${stateKey}-exemption-credit`, `${sr.state} Exemption / Child Credit`, sr.stateExemptionCredit ?? 0)]
    : [];

  const creditsToSubtract: FormulaNode[] = [
    ...ostcNodes,
    ...stateEitcNode,
    ...stateExempCredNode,
    ...((sr.statePanelCredits ?? 0) > 0 ? [inputNode(`st-sp-cred-${stateKey}`, `state-${stateKey}-credits`, `${sr.state} Credits`, sr.statePanelCredits ?? 0)] : [])
  ];

  const netStateOnlyNode = creditsToSubtract.length > 0
    ? opNode(`st-net-only-${stateKey}`, `Net ${sr.state} State Tax`, 'max', [
        constNode(`st-net-zero-${stateKey}`, '$0', 0),
        opNode(`st-net-sub-${stateKey}`, 'Tentative − Credits', 'sub', [
          tentativeTaxRef,
          creditsToSubtract.length === 1
            ? creditsToSubtract[0]
            : opNode(`st-cred-sum-${stateKey}`, 'Total Credits', 'add', creditsToSubtract)
        ])
      ])
    : tentativeTaxRef;

  const totalStateTaxNode = hasLocal
    ? opNode(`line-state-${stateKey}-liability`, `Total ${sr.state} Tax`, 'add', [
        netStateOnlyNode,
        inputNode(`st-local-ref-${stateKey}`, localId, 'Local Tax', sr.localTaxLiability)
      ], { value: sr.stateTaxLiability, expandIntermediate: true })
    : opNode(`line-state-${stateKey}-liability`, `Total ${sr.state} Tax`, 'add', [netStateOnlyNode], {
        value: sr.stateTaxLiability,
        expandIntermediate: true
      });

  const outcomeNode = opNode(`line-state-${stateKey}-outcome`, 'Net Outcome', 'sub', [
    inputNode(`st-wh-ref-${stateKey}`, `state-group-${stateKey}`, `${sr.state} Withholding`, sr.stateWithholding, { varId: 'state_withholding' }),
    totalStateTaxNode
  ], {
    value: sr.stateWithholding - sr.stateTaxLiability,
    formLineLabel: sr.formName
  });

  blocks.push({
    id: cardId,
    stepLabel: `${sr.stateName} • Step ${hasLocal ? '4' : '3'}: Credits, Total Tax & Net Outcome`,
    title: `${sr.formName} • Bottom Line`,
    hasImpact: true,
    isOutput: true,
    lines: compileFormulaToLines(outcomeNode, vars),
    variables: vars,
    sourceIds: Array.from(new Set([
      tentativeId,
      ...(hasLocal ? [localId] : []),
      ...sr.creditedStates.map(c => `calc-state-${c.fromState.toLowerCase()}-card`),
      ...sr.creditedStates.map(c => `auto-state-${stateKey}-ostc-${c.fromState.toLowerCase()}`),
      ...((sr.stateEitcAmount ?? 0) > 0 ? [`auto-state-${stateKey}-eitc`] : []),
      ...((sr.stateExemptionCredit ?? 0) > 0 ? [`auto-state-${stateKey}-exemption-credit`] : [])
    ]))
  });

  return blocks;
}

export function buildStateCalcBlock(sr: StateReturnCalculation, allStateReturns: StateReturnCalculation[]): CalcBlockDefinition {
  const blocks = buildStateCalcBlocks(sr, allStateReturns);
  return blocks[blocks.length - 1];
}

/**
 * Generates system-derived (read-only) panels for credits, adjustments, and deductions
 * that are automatically applied by the tax engine without requiring manual user entry.
 */
export function buildAutoPanels(
  state: TaxAppState,
  summary: TaxCalculationSummary
): { federal: AutoPanelItem[]; byState: Record<string, AutoPanelItem[]> } {
  const federal: AutoPanelItem[] = [];
  const byState: Record<string, AutoPanelItem[]> = {};
  const year = state.year || 2024;
  const status = normalizeFilingStatus(state.filingStatus || 'single');

  // 1. Federal Standard Deduction (always present & applied when Standard > Itemized or method === 'standard')
  const stdAmt = summary.itemizedCalc.standardDeductionAmount;
  const age65Count = Math.max(0, Math.min(4, parseInt(String(state.dependents?.age65OrBlindCount), 10) || 0));
  federal.push({
    id: 'auto-fed-std-deduction',
    section: 'itemized',
    title: 'Federal Standard Deduction',
    officialTitle: `Form 1040 Line 12 (${year} ${status.replace('_', ' ').toUpperCase()})`,
    amount: stdAmt,
    formulaSummary: age65Count > 0 ? `Base Standard + ${age65Count} × Age 65+/Blind Add-on` : 'Statutory Filing Status Standard Deduction',
    shortExplanation: 'Automatically granted based on your filing status and tax year unless your Schedule A itemized deductions exceed it.',
    sourceIds: ['select-filing-status', 'select-tax-year'],
    badgeLabel: summary.itemizedCalc.chosenMethod === 'standard' ? 'Applied (Optimal)' : 'Compared'
  });

  // 2. ½ Self-Employment Tax Deduction (Schedule 1 Line 15)
  if (summary.otherTaxesCalc.halfSelfEmploymentTaxDeduction > 0) {
    federal.push({
      id: 'auto-fed-half-se',
      section: 'adjustments',
      title: '½ Self-Employment Tax Deduction',
      officialTitle: 'Schedule 1 Line 15 • Deductible Part of SE Tax',
      amount: summary.otherTaxesCalc.halfSelfEmploymentTaxDeduction,
      formulaSummary: `50% × ${formatCurrencyExact(summary.otherTaxesCalc.selfEmploymentTax)} (Schedule SE Tax)`,
      shortExplanation: 'Automatically deducts half of your self-employment tax from Gross Income when computing AGI.',
      sourceIds: ['section-federal-other-income'],
      badgeLabel: 'Auto-Calculated'
    });
  }

  // 3. 20% Qualified Business Income (QBI) Deduction (Form 8995)
  if (summary.qbiDeduction > 0) {
    federal.push({
      id: 'auto-fed-qbi',
      section: 'itemized',
      title: '20% QBI Deduction',
      officialTitle: 'Form 8995 • Form 1040 Line 13',
      amount: summary.qbiDeduction,
      formulaSummary: 'min(20% × Qualified Business Income, 20% × Ordinary Taxable Income)',
      shortExplanation: 'Automatically deducts up to 20% of qualified Schedule C / Schedule K-1 business income.',
      sourceIds: ['section-federal-other-income', 'calc-agi'],
      badgeLabel: 'Auto-Calculated'
    });
  }

  // 4. Saver's Credit (Form 8880)
  if (summary.creditsCalc.saversCredit > 0) {
    federal.push({
      id: 'auto-fed-savers-credit',
      section: 'credits',
      title: "Saver's Credit",
      officialTitle: 'Form 8880 • Retirement Savings Contributions Credit',
      amount: summary.creditsCalc.saversCredit,
      formulaSummary: '10% / 20% / 50% × Eligible IRA Contribution (based on AGI)',
      shortExplanation: 'Automatically triggered by your Traditional IRA contribution and AGI eligibility.',
      sourceIds: ['input-adj-ira', 'calc-agi'],
      badgeLabel: 'Auto-Calculated'
    });
  }

  // 5. Additional Child Tax Credit (Schedule 8812)
  if (summary.creditsCalc.additionalChildTaxCredit > 0) {
    federal.push({
      id: 'auto-fed-actc',
      section: 'credits',
      title: 'Additional Child Tax Credit (Refundable)',
      officialTitle: 'Schedule 8812 • Form 1040 Line 28',
      amount: summary.creditsCalc.additionalChildTaxCredit,
      formulaSummary: 'min(Unused CTC, Kids × $1,700, 15% × max(0, Earned Income − $2,500))',
      shortExplanation: 'Automatically refunds unused Child Tax Credit based on earned income above $2,500.',
      sourceIds: ['input-children-count', 'calc-total-w2-wages'],
      badgeLabel: 'Refundable • Auto'
    });
  }

  // 6. Earned Income Tax Credit (EITC)
  if (summary.creditsCalc.eitc > 0) {
    federal.push({
      id: 'auto-fed-eitc',
      section: 'credits',
      title: 'Earned Income Tax Credit (EITC)',
      officialTitle: 'Schedule EIC • Form 1040 Line 27',
      amount: summary.creditsCalc.eitc,
      formulaSummary: 'Phase-In / Phase-Out Curve by Earned Income, AGI & Qualifying Children',
      shortExplanation: 'Automatically calculated refundable credit for low-to-moderate earned income.',
      sourceIds: ['calc-total-w2-wages', 'calc-agi'],
      badgeLabel: 'Refundable • Auto'
    });
  }

  // 7. Excess Social Security Tax Credit (Schedule 3 Line 11)
  if (summary.ficaCalc.excessSSTaxCredit > 0) {
    federal.push({
      id: 'auto-fed-excess-ss',
      section: 'credits',
      title: 'Excess Social Security Tax Credit',
      officialTitle: 'Schedule 3 Line 11 • Multi-Employer Over-Withholding',
      amount: summary.ficaCalc.excessSSTaxCredit,
      formulaSummary: 'Total W-2 Box 4 SS Withheld − Annual SS Tax Cap',
      shortExplanation: 'Automatically credits excess Social Security tax withheld across 2+ employers.',
      sourceIds: ['calc-total-w2-wages'],
      badgeLabel: 'Refundable • Auto'
    });
  }

  // State Automatic Panels
  (summary.stateReturnsCalc || []).forEach(sr => {
    const code = sr.state.toUpperCase();
    const key = code.toLowerCase();
    const list: AutoPanelItem[] = [];

    // State Standard Deduction
    if ((sr.baseStdDeduction ?? 0) > 0) {
      list.push({
        id: `auto-state-${key}-std-ded`,
        section: 'itemized',
        state: code,
        title: `${code} Standard Deduction`,
        officialTitle: `${sr.formName} Standard Deduction`,
        amount: sr.baseStdDeduction ?? 0,
        formulaSummary: `Statutory ${code} Standard Deduction (${status.replace('_', ' ').toUpperCase()})`,
        shortExplanation: `Automatically applied ${code} standard deduction unless ${code} itemized deductions are higher.`,
        sourceIds: ['select-filing-status'],
        badgeLabel: sr.stateItemizedUsed ? 'Compared' : 'Applied'
      });
    }

    // State Itemized Carryover
    if ((sr.stateItemizedAmount ?? 0) > 0) {
      list.push({
        id: `auto-state-${key}-itemized`,
        section: 'itemized',
        state: code,
        title: `${code} Itemized Deduction (Carryover)`,
        officialTitle: `${sr.formName} Itemized Schedule`,
        amount: sr.stateItemizedAmount ?? 0,
        formulaSummary: 'Allowable Medical + min($10k, Property Tax) + Mortgage + Charity',
        shortExplanation: `Derived automatically from your Federal Schedule A deductions for ${code}.`,
        sourceIds: ['calc-itemized-deductions'],
        badgeLabel: sr.stateItemizedUsed ? 'Applied (Optimal)' : 'Compared'
      });
    }

    // State Income Modifications
    (sr.modifications || []).forEach((mod, idx) => {
      list.push({
        id: mod.sourceId || `auto-state-${key}-mod-${idx}`,
        section: mod.amount >= 0 ? 'other-income' : 'adjustments',
        state: code,
        title: mod.label,
        officialTitle: `${code} Statutory Modification`,
        amount: Math.abs(mod.amount),
        formulaSummary: mod.amount >= 0 ? `Add-Back to ${code} Taxable Income` : `Subtraction from ${code} Taxable Income`,
        shortExplanation: `Automatically applied by ${code} tax conformity rules.`,
        sourceIds: ['calc-agi'],
        badgeLabel: 'Auto-Calculated'
      });
    });

    // Other State Tax Credit (OSTC) — one panel per credited source state
    sr.creditedStates.forEach(c => {
      list.push({
        id: `auto-state-${key}-ostc-${c.fromState.toLowerCase()}`,
        section: 'credits',
        state: code,
        title: `Other State Tax Credit (${c.fromState} → ${code})`,
        officialTitle: `${code} Resident Credit for Taxes Paid to ${c.fromState}`,
        amount: c.creditAllowed,
        formulaSummary: `min(${formatCurrencyExact(c.sourceTaxPaid)} ${c.fromState} Tax, ${formatCurrencyExact(c.homeAttributableTax)} ${code} Attributable)`,
        shortExplanation: `Automatically shields you from double state taxation on wages taxed by both ${c.fromState} and ${code}.`,
        sourceIds: [`calc-state-${c.fromState.toLowerCase()}-card`],
        badgeLabel: 'OSTC Shield • Auto'
      });
    });

    // IL 5% Property Tax Credit
    if ((sr.stateCreditAmount ?? 0) > 0 && sr.stateCreditLabel) {
      list.push({
        id: `auto-state-${key}-builtin-credit`,
        section: 'credits',
        state: code,
        title: sr.stateCreditLabel,
        officialTitle: `${code} Statutory Credit`,
        amount: sr.stateCreditAmount ?? 0,
        formulaSummary: '5% × Real Estate Property Tax Paid',
        shortExplanation: `Automatically applied ${code} property tax credit from your Schedule A property taxes.`,
        sourceIds: ['input-itemized-salt'],
        badgeLabel: 'Auto-Calculated'
      });
    }

    // State Dependent Exemption
    if ((sr.stateExemptionAmount ?? 0) > 0) {
      list.push({
        id: `auto-state-${key}-dep-exemption`,
        section: 'itemized',
        state: code,
        title: `${code} Personal & Dependent Exemptions`,
        officialTitle: `${sr.formName} Personal / Dependent Exemptions`,
        amount: sr.stateExemptionAmount ?? 0,
        formulaSummary: `Statutory ${code} Exemption × Qualifying Dependents`,
        shortExplanation: `Automatically reduces ${code} taxable income for each qualifying dependent.`,
        sourceIds: ['input-children-count'],
        badgeLabel: 'Auto-Calculated'
      });
    }

    // State Earned Income Tax Credit (EITC)
    if ((sr.stateEitcAmount ?? 0) > 0) {
      const pct = Math.round((sr.stateEitcRate || 0) * 100);
      list.push({
        id: `auto-state-${key}-eitc`,
        section: 'credits',
        state: code,
        title: `${code} Earned Income Tax Credit (${pct}%)`,
        officialTitle: `${sr.formName} State EITC`,
        amount: sr.stateEitcAmount ?? 0,
        formulaSummary: `${pct}% × Federal EITC`,
        shortExplanation: `Automatically granted state EITC equal to ${pct}% of your Federal Earned Income Tax Credit.`,
        sourceIds: ['auto-fed-eitc'],
        badgeLabel: 'EITC • Auto'
      });
    }

    // State Exemption / Child / Poverty Credit
    if ((sr.stateExemptionCredit ?? 0) > 0) {
      list.push({
        id: `auto-state-${key}-exemption-credit`,
        section: 'credits',
        state: code,
        title: `${code} Exemption / Child Credit`,
        officialTitle: `${sr.formName} Statutory Credit`,
        amount: sr.stateExemptionCredit ?? 0,
        formulaSummary: `Statutory ${code} Personal, Dependent, or Child Tax Credit`,
        shortExplanation: `Automatically calculated ${code} tax credit based on filing status, dependents, and income.`,
        sourceIds: ['select-filing-status', 'input-children-count'],
        badgeLabel: 'Auto-Calculated'
      });
    }

    byState[code] = list;
  });

  return { federal, byState };
}



