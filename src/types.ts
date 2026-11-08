/**
 * Actually Free Taxes - Type Definitions
 */

export type FilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

export type TaxYear = 2024 | 2025;

export interface StateTaxLine {
  id: number;
  state: string; // 2-letter state code, e.g. 'CA', 'NY', 'TX'
  stateId: string; // Employer's state ID number
  stateWages: number; // Box 16
  stateTaxWithheld: number; // Box 17
  localWages: number; // Box 18
  localTaxWithheld: number; // Box 19
  localityName: string; // Box 20
}

export interface W2Data {
  id: number;
  employer: string;
  ein: string;
  box1: number; // Wages, tips, other compensation
  box2: number; // Federal income tax withheld
  box3: number; // Social security wages
  box4: number; // Social security tax withheld
  box5: number; // Medicare wages and tips
  box6: number; // Medicare tax withheld
  box12Code?: string;
  box12Amount?: number;
  states: StateTaxLine[];
}

export interface OtherIncome {
  interest: number;
}

export interface Adjustments {
  studentLoan: number;
  ira: number;
  hsa: number;
}

export interface Dependents {
  childrenCount: number;
}

export interface TaxAppState {
  year: TaxYear;
  filingStatus: FilingStatus;
  w2s: W2Data[];
  otherIncome: OtherIncome;
  adjustments: Adjustments;
  dependents: Dependents;
  showAllArrows: boolean;
}

export interface BracketDef {
  rate: number;
  min: number;
  max: number;
}

export interface BracketDetail {
  bracketIndex: number;
  rate: number;
  ratePercent: string;
  range: string;
  taxableAmount: number;
  taxAmount: number;
  formula: string;
}

export interface CalculationResult {
  result: number;
  sourceFields: string[];
  generalFormula: string;
  pluggedFormula: string;
}

export interface TaxBeforeCreditsResult extends CalculationResult {
  brackets: BracketDetail[];
}

export interface FinalResultCalculation extends CalculationResult {
  isRefund: boolean;
  netDifference: number;
}

export interface FicaCalculation extends CalculationResult {
  ssWages: number;
  ssTax: number;
  medWages: number;
  medTax: number;
  totalFica: number;
}

export interface EffectiveRateCalculation {
  rate: number;
  sourceFields: string[];
  generalFormula: string;
  pluggedFormula: string;
}

export interface StateBreakdownItem {
  state: string;
  stateWages: number;
  stateTaxWithheld: number;
  localTaxWithheld: number;
  sourceFieldIds: string[];
}

export interface StateTaxCalculation extends CalculationResult {
  totalStateWages: number;
  totalStateWithheld: number;
  totalLocalWithheld: number;
  byState: StateBreakdownItem[];
}

export interface TaxCalculationSummary {
  year: TaxYear;
  filingStatus: FilingStatus;
  w2Count: number;
  w2WagesCalc: CalculationResult;
  grossIncomeCalc: CalculationResult;
  adjustmentsCalc: CalculationResult;
  agiCalc: CalculationResult;
  deductionCalc: CalculationResult;
  taxableIncomeCalc: CalculationResult;
  taxBeforeCreditsCalc: TaxBeforeCreditsResult;
  creditsCalc: CalculationResult;
  totalTaxCalc: CalculationResult;
  withholdingCalc: CalculationResult;
  finalResultCalc: FinalResultCalculation;
  ficaCalc: FicaCalculation;
  stateTaxCalc: StateTaxCalculation;
  effectiveRateCalc: EffectiveRateCalculation;
}

export type ArrowColorCategory =
  | 'wages'
  | 'withholding'
  | 'ss'
  | 'medicare'
  | 'state'
  | 'adjustments'
  | 'status'
  | 'tax'
  | 'credits'
  | 'refund'
  | 'owed'
  | 'default';

export interface ConnectionDef {
  id: string;
  sourceId: string;
  targetId: string;
  category?: ArrowColorCategory;
  label?: string;
}
