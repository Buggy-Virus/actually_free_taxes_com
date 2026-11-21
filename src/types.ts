/**
 * Actually Free Taxes - Type Definitions
 */

export type FilingStatus =
  | 'single'
  | 'married_joint'
  | 'married_separate'
  | 'head_of_household'
  | 'qualifying_surviving_spouse';

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
  /** Whose W-2 this is on a joint return (per-person rules: excess SS credit, SE tax wage base). Default taxpayer. */
  owner?: 'taxpayer' | 'spouse';
  employer: string;
  ein: string;
  employeeSsn?: string;
  controlNumber?: string;
  employeeName?: string;
  employeeAddress?: string;
  box1: number; // Wages, tips, other compensation
  box2: number; // Federal income tax withheld
  box3: number; // Social security wages
  box4: number; // Social security tax withheld
  box5: number; // Medicare wages and tips
  box6: number; // Medicare tax withheld
  box7?: number; // Social security tips
  box8?: number; // Allocated tips
  box10?: number; // Dependent care benefits
  box11?: number; // Nonqualified plans
  box12Code?: string;
  box12Amount?: number;
  box12aCode?: string;
  box12aAmount?: number;
  box12bCode?: string;
  box12bAmount?: number;
  box12cCode?: string;
  box12cAmount?: number;
  box12dCode?: string;
  box12dAmount?: number;
  box13Statutory?: boolean;
  box13Retirement?: boolean;
  box13ThirdPartySick?: boolean;
  box14?: string; // Other 14a
  box14bLeft?: string;
  box14bRight?: string;
  states: StateTaxLine[];
}

export type IncomeSourceType =
  | '1099-NEC'
  | '1099-K'
  | '1099-DIV'
  | '1099-INT'
  | '1099-MISC'
  | '1099-R'
  | 'SSA-1099'
  | 'Schedule K-1'
  | 'Schedule F'
  | '1099-G'
  | 'W-2G'
  | 'Other';

export interface IncomeSource {
  id: number;
  type: IncomeSourceType;
  payer: string;
  amount: number;
  qualifiedDividends?: number; // 1099-DIV Box 1b
  accruedInterestPaid?: number; // 1099-INT Schedule B adjustment for accrued interest paid on bond purchase
  taxExemptInterest?: number; // 1099-INT Box 8 municipal bond tax-exempt interest (included in MAGI/SS provisional income)
  earlyDistributionPenalty?: boolean; // 1099-R Code 1 (Form 5329 10% early withdrawal penalty)
  federalTaxWithheld?: number; // Box 4 federal income tax withheld on 1099
  usTreasuryInterest?: number; // 1099-INT Box 3 interest on US savings bonds & Treasury obligations (state-exempt)
  inStateTaxExemptInterest?: number; // Part of 1099-INT Box 8 from your own state's bonds (stays state-exempt)
  stateRefund?: number; // 1099-G Box 2 state or local income tax refund
  priorItemizedExcess?: number; // Last year's itemized deductions above the standard deduction (0 if you took the standard deduction)
  taxableAmount?: number; // 1099-R Box 2a taxable amount (defaults to Box 1 gross when blank)
  rollover?: boolean; // 1099-R distribution code G/H direct rollover (not taxable)
  /** 1099-R box 7 distribution code(s), e.g. '7', '1', '2', 'G', '1B', 'Q', 'S'. When set it decides rollover / early / Roth treatment. */
  distributionCode?: string;
  /** Whose document this is on a joint return (Schedule SE per person, spouse earned income). Default taxpayer. */
  owner?: 'taxpayer' | 'spouse';
  capitalGainDistributions?: number; // 1099-DIV Box 2a total capital gain distributions (long-term)
  penaltyExceptionAmount?: number; // 1099-R: part of an early distribution that meets a Form 5329 exception
  state?: string;
}

export interface CapitalGainsInput {
  shortTerm: number;
  longTerm: number;
  collectiblesGain?: number; // 28% rate gain (Schedule D Line 18)
  unrecaptured1250Gain?: number; // 25% unrecaptured Section 1250 depreciation gain (Schedule D Line 19)
  carryoverLoss?: number; // Prior-year capital loss carryover (Schedule D Line 6/14)
}

export interface ScheduleERentalInput {
  grossRents: number;
  expenses: number; // HOA, repairs, insurance, property tax, mortgage interest
  depreciation: number; // Form 4562 MACRS 27.5-year residential rental depreciation
  propertyState?: string; // 2-letter state or 'DC' where rental property is located
}

export interface ItemizedDeductionsInput {
  medicalExpenses: number;
  realEstateTax: number;
  mortgageInterest: number;
  charity: number;
  gamblingLosses?: number; // Deductible on Schedule A Line 16 up to W-2G gambling winnings
  investmentInterest?: number; // Form 4952 / Schedule A Line 9 (capped at Net Investment Income)
  casualtyLoss?: number; // Form 4684 / Schedule A Line 15 (federally declared disaster)
  otherStateLocalIncomeTax?: number; // State/local income tax paid outside W-2s (estimates, prior-year balance due)
  personalPropertyTax?: number; // Value-based personal property tax (e.g. vehicle registration portion)
  salesTax?: number; // General sales tax paid, if electing sales tax instead of income tax
  charityNoncash?: number; // Gifts of appreciated property (30% AGI limit)
  mortgageBalance?: number; // Average acquisition debt balance (Pub. 936)
  mortgageGrandfathered?: boolean; // Loan taken out before Dec 16, 2017 ($1M limit)
}

export interface OtherIncome {
  interest: number;
  sources?: IncomeSource[];
  capitalGains?: CapitalGainsInput;
  scheduleCExpenses?: number;
  scheduleERental?: ScheduleERentalInput;
  alimonyReceived?: number; // Schedule 1 Line 2a (Pre-2019 divorce)
  foreignEarnedIncomeExclusion?: number; // Form 2555 exclusion (up to $126,500/$130,000)
  unreportedTips?: number; // Form 4137 unreported tip income
}

export interface Adjustments {
  studentLoan: number;
  ira: number;
  hsa: number;
  educatorExpenses?: number; // Schedule 1 Line 11 (up to $300 / $600 MFJ)
  seRetirement?: number; // Schedule 1 Line 16 (SEP, SIMPLE, Solo 401k)
  seHealthInsurance?: number; // Schedule 1 Line 17 (Self-employed health insurance)
  alimonyPaid?: number; // Schedule 1 Line 19a (Pre-2019 divorce agreements)
  militaryMoving?: number; // Form 3903 / Schedule 1 Line 14
  earlyWithdrawalPenalty?: number; // Schedule 1 Line 18 (1099-INT Box 2)
  juryDutyPay?: number; // Schedule 1 Line 24a (Jury duty pay given to employer)
  hsaCoverage?: 'self' | 'family'; // Form 8889 line 1 (HDHP coverage type)
  bothEducators?: boolean; // MFJ: both spouses are eligible educators ($300 each)
  hsaCatchUp?: boolean; // Form 8889: age 55+ additional $1,000
  iraCatchUp?: boolean; // IRA: age 50+ additional $1,000
  spouseIra?: number; // Spouse's traditional IRA contributions (own limit and phase-out; joint returns)
  qualifiedTips?: number; // 2025-2028 Schedule 1-A: qualified tips (P.L. 119-21)
  qualifiedOvertime?: number; // 2025-2028 Schedule 1-A: qualified overtime premium pay
  carLoanInterest?: number; // 2025-2028 Schedule 1-A: interest on a new US-assembled personal vehicle loan
}

export interface PersonInfo {
  birthYear?: number;
  blind?: boolean;
}

export interface DependentRecord {
  id: number;
  name: string;
  birthYear: number;
  /** 'child' = son/daughter/stepchild/foster child/sibling (or their descendant); 'relative' = other qualifying relative */
  relationship: 'child' | 'relative';
  monthsLived: number;
  student?: boolean;
  disabled?: boolean;
  /** Has an SSN valid for employment (CTC and EITC require one). */
  hasSsn?: boolean;
}

export interface Dependents {
  /** Per-dependent records; when present they replace the count fields below. */
  list?: DependentRecord[];
  seniorsCount?: number; // Taxpayer and/or spouse age 65+ (2025-2028 senior deduction)
  childrenCount: number; // Qualifying children under 17 ($2,000 CTC)
  otherDependentsCount?: number; // Qualifying older children/relatives ($500 ODC)
  age65OrBlindCount?: number; // Number of Age 65+ or Blind boxes checked on Form 1040 (0 to 4)
  childCareExpenses?: number; // Form 2441 qualifying child/dependent care expenses
  educationExpensesAotc?: number; // Form 8863 American Opportunity Tax Credit qualified tuition
  educationExpensesLlc?: number; // Form 8863 Lifetime Learning Credit qualified tuition
  foreignTaxCredit?: number; // Form 1116 Foreign Tax Credit
  cleanEnergyCredit?: number; // Form 5695 / Form 8936 Clean Energy & EV Credit
  adoptionCredit?: number; // Form 8839 Adoption Credit
  premiumTaxCredit?: number; // Form 8962 Net Premium Tax Credit (Refundable)
  elderlyDisabledCredit?: number; // Schedule R Credit for the Elderly or Disabled
  householdEmploymentTax?: number; // Schedule H Household Employment Taxes
  estimatedTaxPayments?: number; // Form 1040-ES quarterly estimated payments
}

export type DeductionMethod = 'auto' | 'standard' | 'itemized';

export interface StateSpecificInputs {
  otherIncome?: number;
  adjustments?: number;
  credits?: number;
  itemizedDeductions?: number;
}

export interface StatePanelItem {
  id: number;
  state: string;
  section: PanelSectionCategory;
  itemKey: string;
  amount: number;
}

export interface TaxAppState {
  year: TaxYear;
  filingStatus: FilingStatus;
  residentState?: string;
  w2s: W2Data[];
  otherIncome: OtherIncome;
  adjustments: Adjustments;
  dependents: Dependents;
  itemizedDeductions?: ItemizedDeductionsInput;
  deductionMethod?: DeductionMethod;
  /** Taxpayer can be claimed as a dependent on someone else's return (limited standard deduction, no EITC). */
  claimedAsDependent?: boolean;
  taxpayer?: PersonInfo;
  /** Moved into the resident state during the year from `priorState`, in month `moveMonth` (1–12). */
  partYear?: { priorState: string; moveMonth: number };
  spouse?: PersonInfo;
  /** Married filing separately and lived apart from spouse all year (SS benefits base amounts). */
  livedApartFromSpouse?: boolean;
  /** MFS: spouse itemizes, so this return must itemize (standard deduction $0). */
  spouseItemizes?: boolean;
  /** Prior-year total tax and AGI (Form 2210 safe harbor). */
  priorYearTax?: number;
  priorYearAgi?: number;
  stateSpecific?: Record<string, StateSpecificInputs>;
  statePanels?: StatePanelItem[];
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
  bracketWidth?: number;
  remainingBefore?: number;
  remainingAfter?: number;
}

export interface CalculationResult {
  result: number;
  sourceFields: string[];
  generalFormula: string;
  pluggedFormula: string;
}

export interface TaxBeforeCreditsResult extends CalculationResult {
  brackets: BracketDetail[];
  qualifiedDividendsTotal: number;
  preferentialIncome: number;
  preferentialTax: number;
  ordinaryTaxableIncome: number;
  ordinaryTax: number;
  collectiblesTax?: number;
  unrecaptured1250Tax?: number;
}

export interface CreditsCalculation extends CalculationResult {
  childTaxCredit: number;
  additionalChildTaxCredit: number; // Schedule 8812 refundable ACTC
  otherDependentsCredit: number; // $500 ODC
  eitc: number; // Earned Income Tax Credit (Schedule EIC)
  childCareCredit: number; // Form 2441
  educationCreditNonRefundable: number; // Form 8863
  educationCreditRefundable: number; // Form 8863 40% AOTC refundable
  saversCredit: number; // Form 8880 Retirement Savings Contributions Credit
  foreignTaxCredit: number; // Form 1116
  cleanEnergyCredit: number; // Form 5695 / 8936
  totalNonRefundableCredits: number;
  totalRefundableCredits: number;
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
  excessSSTaxCredit: number; // Schedule 3, Line 11 credit when 2+ employers withhold over annual SS wage cap
}

export interface ScheduleECalculation extends CalculationResult {
  grossRents: number;
  expenses: number;
  depreciation: number;
  netBeforePal: number;
  allowableNet: number;
  disallowedPassiveLoss: number;
  k1Income?: number;
  propertyState: string;
}

export interface OtherTaxesCalculation extends CalculationResult {
  selfEmploymentTax: number; // Schedule SE (15.3% on 92.35% of net Schedule C profit)
  halfSelfEmploymentTaxDeduction: number; // Schedule 1 Line 15 (50% of SE tax)
  additionalMedicareTax: number; // Form 8959 (0.9% over $200k/$250k)
  niit: number; // Form 8960 (3.8% Net Investment Income Tax)
  amt: number; // Form 6251 Alternative Minimum Tax
  earlyDistributionPenaltyTax: number; // Form 5329 10% early withdrawal penalty
  netInvestmentIncome: number;
  totalOtherTaxes: number;
  seTaxableEarnings?: number;
  seSSPortion?: number;
  seMedPortion?: number;
  combinedMedAndSeWages?: number;
  addMedThreshold?: number;
  excessMedWages?: number;
  niitThreshold?: number;
  magiExcessOverNiit?: number;
  amti?: number;
  amtAllowedDeductions?: number;
  amtExemption?: number;
  tentativeMinimumTax?: number;
  earlyDist1099RTotal?: number;
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

export interface StateOtherStateCredit {
  fromState: string;
  sourceTaxPaid: number;
  homeAttributableTax: number;
  creditAllowed: number;
}

export interface StateModificationItem {
  label: string;
  amount: number;
  sourceId: string;
}

export interface StateReturnCalculation extends CalculationResult {
  state: string;
  stateName: string;
  residentStatus: 'resident' | 'non_resident';
  formName: string;
  hasIncomeTax: boolean;
  stateWages: number;
  stateStandardDeduction: number;
  stateTaxableIncome: number;
  stateTaxBeforeCredit: number;
  creditForOtherStates: number; // OSTC
  creditedStates: StateOtherStateCredit[];
  reciprocityExemption: boolean;
  reciprocityNote?: string;
  stateTaxLiability: number;
  localTaxLiability: number;
  stateWithholding: number;
  localTaxWithheld: number;
  netOutcome: number; // withholding - liability (+ refund, - owed)
  isRefund: boolean;
  notes?: string[];
  isFlat?: boolean;
  flatRate?: number;
  brackets?: BracketDetail[];
  localBrackets?: BracketDetail[];
  localRuleLabel?: string;
  modifications?: StateModificationItem[];
  baseStdDeduction?: number;
  stateItemizedAmount?: number;
  stateItemizedUsed?: boolean;
  statePanelOtherIncome?: number;
  statePanelAdjustments?: number;
  statePanelItemized?: number;
  statePanelCredits?: number;
  surchargeAmount?: number;
  surchargeLabel?: string;
  stateCreditAmount?: number;
  stateCreditLabel?: string;
  stateExemptionAmount?: number;
  stateExemptionCredit?: number;
  stateEitcAmount?: number;
  stateEitcRate?: number;
  d30Details?: {
    grossReceipts: number;
    netRental: number;
    salaryAllowance: number;
    specificExemption: number;
    rawUbtTax: number;
    minTaxApplied: boolean;
  };
}

export interface UnifiedTaxJurisdictionLine {
  jurisdiction: string;
  formName: string;
  taxLiability: number;
  withholding: number;
  netOutcome: number;
  isRefund: boolean;
  badge?: string;
}

export interface UnifiedTaxSummary extends CalculationResult {
  lines: UnifiedTaxJurisdictionLine[];
  federalNet: number;
  federalIsRefund: boolean;
  totalStateWithholding: number;
  totalStateLiability: number;
  totalStateNet: number;
  grandTotalNet: number;
  isGrandTotalRefund: boolean;
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
  qbiDeduction?: number;
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
  qbiDeduction: number;
  itemizedCalc: ItemizedDeductionCalculation;
  capitalGainsCalc: CapitalGainsCalculation;
  scheduleECalc: ScheduleECalculation;
  taxableIncomeCalc: CalculationResult;
  taxBeforeCreditsCalc: TaxBeforeCreditsResult;
  creditsCalc: CreditsCalculation;
  otherTaxesCalc: OtherTaxesCalculation;
  totalTaxCalc: CalculationResult;
  withholdingCalc: CalculationResult;
  finalResultCalc: FinalResultCalculation;
  ficaCalc: FicaCalculation;
  stateTaxCalc: StateTaxCalculation;
  stateReturnsCalc: StateReturnCalculation[];
  unifiedSummaryCalc: UnifiedTaxSummary;
  effectiveRateCalc: EffectiveRateCalculation;
  /** The evaluated federal formula graph this summary was read from (drives blocks & arrows). */
  federalEval?: import('./graph/graph.js').Evaluation;
  /** Which state modules the return graph contains. */
  returnPlan?: import('./graph/states.js').ReturnPlan;
}

export type ArrowColorCategory =
  | 'wages'
  | 'withholding'
  | 'ss'
  | 'medicare'
  | 'state'
  | 'state_credit'
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
  side?: 'left' | 'right';
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

export type ArrowDisplayMode = 'always' | 'selection' | 'off';
export type PanelSize = 'sm' | 'lg' | 'full';
export type PanelSectionCategory = 'other-income' | 'adjustments' | 'credits' | 'itemized';

export interface FormulaToken {
  type: 'text' | 'var';
  text?: string;
  varId?: string;
  label?: string;
  valueFormatted?: string;
  isEmpty?: boolean;
}

export interface CalcVariableContributor {
  label: string;
  sign: '+' | '-' | '×' | 'info';
  amount: number;
  amountFormatted: string;
  isSetUp: boolean;
  targetElementId: string;
  panelKey?: string;
  panelSection?: PanelSectionCategory;
}

export interface CalcVariableBreakdown {
  varId: string;
  label: string;
  totalValue: number;
  totalFormatted: string;
  isEmpty: boolean;
  contributors: CalcVariableContributor[];
}

export interface CalcLineItem {
  id: string;
  label: string;
  formLineLabel: string | null;
  isIntermediate?: boolean;
  generalTokens: FormulaToken[];
  pluggedTokens: FormulaToken[];
  resultFormatted: string;
  isEmpty?: boolean;
}

export interface CalcBlockDefinition {
  id: string;
  stepLabel: string;
  title: string;
  hasImpact: boolean;
  isOutput?: boolean;
  lines: CalcLineItem[];
  variables: Record<string, CalcVariableBreakdown>;
  sourceIds: string[];
}

export interface AutoPanelItem {
  id: string;
  section: PanelSectionCategory;
  state?: string;
  title: string;
  officialTitle: string;
  amount: number;
  formulaSummary: string;
  shortExplanation: string;
  sourceIds: string[];
  badgeLabel: string;
  /** Graph quantity this panel shows (federal panels). */
  quantityId?: string;
}


