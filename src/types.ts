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

export interface IncomeSource {
  id: number;
  type: '1099-NEC' | '1099-DIV' | '1099-INT' | '1099-MISC' | 'Other';
  payer: string;
  amount: number;
}

export interface CapitalGainsInput {
  shortTerm: number;
  longTerm: number;
}

export interface ItemizedDeductionsInput {
  medicalExpenses: number;
  realEstateTax: number;
  mortgageInterest: number;
  charity: number;
}

export interface OtherIncome {
  interest: number;
  sources?: IncomeSource[];
  capitalGains?: CapitalGainsInput;
  scheduleCExpenses?: number;
}

export interface Adjustments {
  studentLoan: number;
  ira: number;
  hsa: number;
}

export interface Dependents {
  childrenCount: number;
}

export type DeductionMethod = 'auto' | 'standard' | 'itemized';

export interface TaxAppState {
  year: TaxYear;
  filingStatus: FilingStatus;
  w2s: W2Data[];
  otherIncome: OtherIncome;
  adjustments: Adjustments;
  dependents: Dependents;
  itemizedDeductions?: ItemizedDeductionsInput;
  deductionMethod?: DeductionMethod;
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

export interface CapitalGainsCalculation extends CalculationResult {
  netTotal: number;
  allowableLoss: number;
}

export interface ItemizedDeductionCalculation extends CalculationResult {
  isItemizedBetter: boolean;
  totalItemized: number;
  totalItemizedDeductions: number;
  allowableMedical: number;
  medicalDeductible: number;
  allowableSalt: number;
  saltDeduction: number;
  mortgage: number;
  charity: number;
  standardDeductionAmount: number;
  standardDeduction: number;
  chosenDeduction: number;
  chosenMethod: 'standard' | 'itemized';
  savingsOverAlternate: number;
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
  itemizedCalc: ItemizedDeductionCalculation;
  capitalGainsCalc: CapitalGainsCalculation;
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
  | 'itemized'
  | 'capital'
  | 'default';

export interface ConnectionDef {
  id: string;
  sourceId: string;
  targetId: string;
  category?: ArrowColorCategory;
  label?: string;
}

export type ImportanceLevel = 'critical' | 'important' | 'recommended' | 'optional';
export type IrsRiskLevel = 'high' | 'medium' | 'low';
export type SavingsPotentialLevel = 'high' | 'medium' | 'low' | 'none';
export type ApplicabilityLevel = 'common' | 'moderate' | 'niche';
export type RecommendationPriority = 'must_be_accurate' | 'high_savings' | 'verify_paper' | 'safe_to_ignore';

export interface FieldExplanation {
  whatItMeans: string;
  whereToFind: string;
  whyItMatters: string;
  exampleOrTip: string;
}

export interface FieldRatingDefinition {
  fieldKey: string;
  fieldTitle: string;
  formName: string;
  importance: ImportanceLevel;
  importanceScore: number; // 1 - 4
  importanceLabel: string;
  importanceDescription: string;
  irsRisk: IrsRiskLevel;
  irsRiskScore: number; // 1 - 3
  irsRiskLabel: string;
  irsRiskDescription: string;
  savingsPotential: SavingsPotentialLevel;
  savingsScore: number; // 0 - 3
  savingsLabel: string;
  savingsDescription: string;
  applicability: ApplicabilityLevel;
  applicabilityScore: number; // 1 - 4
  applicabilityPercent: string;
  applicabilityLabel: string;
  applicabilityDescription: string;
  recommendation: RecommendationPriority;
  recommendationTag: string;
  plainEnglishVerdict: string;
  explanation?: FieldExplanation;
}
