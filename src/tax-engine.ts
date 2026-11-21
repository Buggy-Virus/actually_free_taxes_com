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

import { CoreFilingStatus, TAX_CONSTANTS, normalizeFilingStatus } from './tax-constants.js';
export { TAX_CONSTANTS, normalizeFilingStatus } from './tax-constants.js';
export type { CoreFilingStatus } from './tax-constants.js';
import { federalGraph, federalContext, FEDERAL_BLOCKS, FEDERAL_AUTO_PANELS } from './graph/federal.js';
import { GraphBlock, lineDomId } from './graph/graph.js';

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


/**
 * Complete tax calculation. Federal math is evaluated by the formula graph (src/graph/federal.ts);
 * this function only reads graph results into the summary shape the state engine and UI consume.
 * Formula strings and source fields are rendered from the same graph, never hand-written.
 */
export function calculateTaxes(state: TaxAppState): TaxCalculationSummary {
  const year = state.year || 2024;
  const filingStatus = state.filingStatus || 'single';

  const w2List: W2Data[] = state.w2s && state.w2s.length > 0
    ? state.w2s
    : [{ id: 0, employer: '', ein: '', box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0, states: [] }];

  const ev = federalGraph().evaluate(federalContext({ ...state, w2s: w2List }));
  const v = (id: string) => ev.value(id);
  const calc = (id: string, result = v(id)): CalculationResult => ({
    result,
    sourceFields: ev.sources(id),
    generalFormula: ev.lineText(id, false),
    pluggedFormula: ev.lineText(id, true)
  });

  // ---- W-2 wage & state withholding summary (aggregation of inputs; no tax math) ----
  const stateLines = w2List.flatMap(w => (w.states || []).map((s: StateTaxLine) => ({ ...s, w2Id: w.id })));
  const totalStateWages = stateLines.reduce((sum, s) => sum + (Number(s.stateWages) || 0), 0);
  const totalStateTaxWithheld = stateLines.reduce((sum, s) => sum + (Number(s.stateTaxWithheld) || 0), 0);
  const totalLocalTaxWithheld = stateLines.reduce((sum, s) => sum + (Number(s.localTaxWithheld) || 0), 0);
  const stateMap = new Map<string, { state: string; stateWages: number; stateTaxWithheld: number; localTaxWithheld: number; sourceFieldIds: string[] }>();
  stateLines.forEach(s => {
    const st = (s.state || 'OTHER').toUpperCase().trim();
    if (!stateMap.has(st)) stateMap.set(st, { state: st, stateWages: 0, stateTaxWithheld: 0, localTaxWithheld: 0, sourceFieldIds: [] });
    const item = stateMap.get(st)!;
    item.stateWages += Number(s.stateWages) || 0;
    item.stateTaxWithheld += Number(s.stateTaxWithheld) || 0;
    item.localTaxWithheld += Number(s.localTaxWithheld) || 0;
    item.sourceFieldIds.push(`w2-${s.w2Id}-state-${s.id}-box17`);
  });
  const stateWithheldValues = stateLines
    .map(s => ({ state: (s.state || 'State').toUpperCase(), amount: Number(s.stateTaxWithheld) || 0 }))
    .filter(x => x.amount > 0);
  const stateTaxCalc: StateTaxCalculation = {
    result: totalStateTaxWithheld,
    totalStateWages,
    totalStateWithheld: totalStateTaxWithheld,
    totalLocalWithheld: totalLocalTaxWithheld,
    byState: Array.from(stateMap.values()),
    sourceFields: stateLines.map(s => `w2-${s.w2Id}-state-${s.id}-box17`),
    generalFormula: 'Total State Withholding = ∑(W-2 Box 17)',
    pluggedFormula: stateWithheldValues.length > 0
      ? `Total State Tax = ${stateWithheldValues.map(x => `${x.state}: ${formatCurrencyExact(x.amount)}`).join(' + ')} = ${formatCurrencyExact(totalStateTaxWithheld)}`
      : 'Total State Tax = $0'
  };

  // ---- Federal results, read from the graph ----
  const capitalGainsCalc: CapitalGainsCalculation = { ...calc('fed.capAllowed'), netTotal: v('fed.capNet'), allowableLoss: v('fed.capAllowed') };

  const rentalPropertyState = (state.otherIncome?.scheduleERental?.propertyState || '').toUpperCase().trim();
  const scheduleECalc: ScheduleECalculation = {
    ...calc('fed.rentalAllowed'),
    grossRents: ev.inputValue('in.rents'),
    expenses: ev.inputValue('in.rentalExpenses'),
    depreciation: ev.inputValue('in.rentalDepreciation'),
    netBeforePal: v('fed.rentalNet'),
    allowableNet: v('fed.rentalAllowed'),
    disallowedPassiveLoss: v('fed.suspendedRentalLoss'),
    k1Income: v('fed.k1Income'),
    propertyState: rentalPropertyState
  };

  const totalItemized = v('fed.itemized');
  const standardDeductionBase = v('fed.stdDeduction');
  const chosenDeduction = v('fed.deduction');
  const chosenMethod: 'standard' | 'itemized' = v('fed.itemizing') === 1 ? 'itemized' : 'standard';
  const itemizedCalc: ItemizedDeductionCalculation = {
    ...calc('fed.itemized'),
    isItemizedBetter: totalItemized > standardDeductionBase,
    totalItemized,
    totalItemizedDeductions: totalItemized,
    allowableMedical: v('fed.medicalDeduction'),
    medicalDeductible: v('fed.medicalDeduction'),
    allowableSalt: v('fed.salt'),
    saltDeduction: v('fed.salt'),
    mortgage: ev.inputValue('in.mortgage'),
    charity: ev.inputValue('in.charity'),
    standardDeductionAmount: standardDeductionBase,
    standardDeduction: standardDeductionBase,
    qbiDeduction: v('fed.qbi'),
    chosenDeduction,
    chosenMethod,
    savingsOverAlternate: Math.abs(totalItemized - standardDeductionBase)
  };

  // Bracket ladder for the visualizer: every bracket of the table, filled from the graph's slices.
  const bracketTable = ev.paramValue('fed.brackets') as BracketDef[];
  const ordinaryNode = ev.bracketNodes(ev.node('fed.ordinaryTax'))[0];
  let remaining = v('fed.ordinaryTaxable');
  const brackets: BracketDetail[] = bracketTable.map((b, i) => {
    const slice = ordinaryNode?.slices?.find(s => s.index === i + 1);
    const amount = slice?.amount ?? 0;
    const remBefore = amount > 0 ? remaining : 0;
    if (amount > 0) remaining = Math.max(0, remaining - amount);
    const maxLabel = b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`;
    return {
      bracketIndex: i + 1,
      rate: b.rate,
      ratePercent: formatPercent(b.rate),
      range: `${formatCurrency(b.min)}${maxLabel}`,
      taxableAmount: amount,
      taxAmount: slice?.tax ?? 0,
      formula: `${formatCurrency(amount)} × ${formatPercent(b.rate)} = ${formatCurrency(slice?.tax ?? 0)}`,
      bracketWidth: b.max === Infinity ? Infinity : b.max - b.min,
      remainingBefore: remBefore,
      remainingAfter: amount > 0 ? remaining : 0
    };
  });
  const taxBeforeCreditsCalc: TaxBeforeCreditsResult = {
    ...calc('fed.tax'),
    brackets,
    qualifiedDividendsTotal: v('fed.qualifiedDividends'),
    preferentialIncome: v('fed.preferentialIncome'),
    preferentialTax: v('fed.preferentialTax'),
    ordinaryTaxableIncome: v('fed.ordinaryTaxable'),
    ordinaryTax: v('fed.ordinaryTax'),
    collectiblesTax: v('fed.collectiblesTax'),
    unrecaptured1250Tax: v('fed.unrecap1250Tax')
  };

  const creditsCalc: CreditsCalculation = {
    ...calc('fed.nonrefundableCredits'),
    childTaxCredit: v('fed.ctcAllowed'),
    additionalChildTaxCredit: v('fed.actc'),
    otherDependentsCredit: v('fed.odcAllowed'),
    eitc: v('fed.eitc'),
    childCareCredit: v('fed.childCareCredit'),
    educationCreditNonRefundable: v('fed.educationNonrefundable'),
    educationCreditRefundable: v('fed.aotcRefundable'),
    saversCredit: v('fed.saversCredit'),
    foreignTaxCredit: ev.inputValue('in.foreignTaxCredit'),
    cleanEnergyCredit: ev.inputValue('in.cleanEnergy'),
    totalNonRefundableCredits: v('fed.nonrefundableCredits'),
    totalRefundableCredits: v('fed.refundableCredits')
  };

  const otherTaxesCalc: OtherTaxesCalculation = {
    ...calc('fed.otherTaxes'),
    selfEmploymentTax: v('fed.seTax'),
    halfSelfEmploymentTaxDeduction: v('fed.halfSeTax'),
    additionalMedicareTax: v('fed.additionalMedicareTax'),
    niit: v('fed.niit'),
    amt: v('fed.amt'),
    earlyDistributionPenaltyTax: v('fed.earlyDistributionPenalty'),
    netInvestmentIncome: v('fed.netInvestmentIncome'),
    totalOtherTaxes: v('fed.otherTaxes'),
    seTaxableEarnings: v('fed.seEarnings'),
    seSSPortion: v('fed.seSsTax'),
    seMedPortion: v('fed.seMedTax'),
    combinedMedAndSeWages: v('fed.medicareAndSeWages'),
    addMedThreshold: ev.paramValue('fed.addlMedThreshold') as number,
    excessMedWages: v('fed.excessMedicareWages'),
    niitThreshold: ev.paramValue('fed.niitThreshold') as number,
    magiExcessOverNiit: Math.max(0, v('fed.agi') - (ev.paramValue('fed.niitThreshold') as number)),
    amti: v('fed.amti'),
    amtAllowedDeductions: v('fed.agi') - v('fed.qbi') - v('fed.amti') > 0 ? v('fed.agi') - v('fed.qbi') - v('fed.amti') : 0,
    amtExemption: v('fed.amtExemptionAllowed'),
    tentativeMinimumTax: v('fed.tentativeMinimumTax'),
    earlyDist1099RTotal: v('fed.earlyDistributions')
  };

  const totalTaxLiability = v('fed.totalTax');
  const totalWithheld = v('fed.payments');
  const netDifference = v('fed.netResult');
  const isRefund = netDifference >= 0;
  const finalResultCalc: FinalResultCalculation = {
    ...calc(isRefund ? 'fed.refund' : 'fed.owed', Math.abs(netDifference)),
    isRefund,
    netDifference
  };

  const ficaCalc: FicaCalculation = {
    ...calc('fed.ficaWithheld'),
    ssWages: v('fed.ssWages'),
    ssTax: v('fed.ssTaxWithheld'),
    medWages: v('fed.medWages'),
    medTax: v('fed.medTaxWithheld'),
    totalFica: v('fed.ficaWithheld'),
    excessSSTaxCredit: v('fed.excessSS')
  };

  const grossIncome = v('fed.totalIncome');
  const agi = v('fed.agi');
  const effectiveRateCalc: EffectiveRateCalculation = {
    rate: v('fed.effectiveRate'),
    sourceFields: ev.sources('fed.effectiveRate'),
    generalFormula: ev.lineText('fed.effectiveRate', false),
    pluggedFormula: ev.lineText('fed.effectiveRate', true)
  };

  // ---- State returns & unified summary ----
  const { stateReturnsCalc, unifiedSummaryCalc } = calculateStateReturnsAndUnifiedSummary(
    state,
    w2List,
    v('fed.wages'),
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
    w2WagesCalc: calc('fed.wages'),
    grossIncomeCalc: calc('fed.totalIncome'),
    adjustmentsCalc: calc('fed.adjustments'),
    agiCalc: calc('fed.agi'),
    deductionCalc: calc('fed.deduction'),
    qbiDeduction: v('fed.qbi'),
    itemizedCalc,
    capitalGainsCalc,
    scheduleECalc,
    taxableIncomeCalc: calc('fed.taxableIncome'),
    taxBeforeCreditsCalc,
    creditsCalc,
    otherTaxesCalc,
    totalTaxCalc: calc('fed.totalTax'),
    withholdingCalc: calc('fed.payments'),
    finalResultCalc,
    ficaCalc,
    stateTaxCalc,
    stateReturnsCalc,
    unifiedSummaryCalc,
    effectiveRateCalc,
    federalEval: ev
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
export function buildCalculationBlocks(_state: TaxAppState, summary: TaxCalculationSummary, showEmpty = false): GraphBlock[] {
  const ev = summary.federalEval;
  if (!ev) return [];
  return FEDERAL_BLOCKS.map(spec => ev.block(spec, showEmpty));
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

  const modSourceIds = (sr.modifications || []).map((mod, idx) => mod.sourceId || `auto-state-${stateKey}-mod-${idx}`);

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
      ...modSourceIds,
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
  const hasBuiltinCredit = (sr.stateCreditAmount ?? 0) > 0 && !!sr.stateCreditLabel;
  if (hasBuiltinCredit && sr.stateCreditLabel) {
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
    sourceIds: [
      taxableId,
      ...(hasBuiltinCredit ? [`auto-state-${stateKey}-builtin-credit`] : [])
    ]
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

  // Federal automatic panels: each one is a graph quantity (amount, formula and arrows come from it).
  const ev = summary.federalEval;
  if (ev) {
    FEDERAL_AUTO_PANELS.forEach(spec => {
      const amount = ev.value(spec.quantity);
      if (!ev.applies(spec.quantity) || (spec.show !== 'always' && amount <= 0)) return;
      const badge = spec.id === 'auto-fed-std-deduction'
        ? (summary.itemizedCalc.chosenMethod === 'standard' ? 'Applied (Optimal)' : 'Compared')
        : spec.badge;
      federal.push({
        id: spec.id,
        section: spec.section,
        title: spec.title,
        officialTitle: spec.officialTitle,
        amount,
        formulaSummary: ev.lineText(spec.quantity, true),
        shortExplanation: spec.shortExplanation,
        sourceIds: ev.sources(spec.quantity),
        badgeLabel: badge,
        quantityId: spec.quantity
      });
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
        sourceIds: [
          'select-filing-status',
          ...(((Number(state.dependents?.childrenCount) || 0) > 0 || (Number(state.dependents?.otherDependentsCount) || 0) > 0) ? ['input-children-count'] : [])
        ],
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



