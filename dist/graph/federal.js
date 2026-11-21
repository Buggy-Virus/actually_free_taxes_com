/**
 * Federal Form 1040 as a formula graph.
 *
 * This file is the only place federal tax math exists. calculateTaxes() reads its results,
 * the calculation blocks render its formulas, and the arrows follow its references.
 *
 * Rules intentionally mirror the previous engine line for line (including its known
 * simplifications) so this port is behavior-neutral; fixes land as separate changes.
 */
import { TAX_CONSTANTS, normalizeFilingStatus } from '../tax-constants.js';
import { add, and, atLeast0, quietly, brackets, ceil, count, div, each, field, flag, floor, gt, gte, itemFlag, lit, lookup, lt, lte, max, min, mul, neg, not, num, or, param, rate, ref, round, statusIs, sub, sumOver, when } from './expr.js';
import { FormulaGraph } from './graph.js';
const rules = (year) => TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];
const byStatus = (map) => (s) => (map[s] !== undefined ? map[s] : map.other);
const YEAR_STATUS = ['select-tax-year', 'select-filing-status'];
/** Income-source collections, one per document type. */
export const SOURCE_COLLECTIONS = [
    { id: 'src.nec', type: ['1099-NEC'], label: '1099-NEC', panelKey: '1099-nec' },
    { id: 'src.k', type: ['1099-K'], label: '1099-K', panelKey: '1099-k' },
    { id: 'src.f', type: ['Schedule F'], label: 'Schedule F', panelKey: 'sched-f-farm' },
    { id: 'src.int', type: ['1099-INT'], label: '1099-INT' },
    { id: 'src.div', type: ['1099-DIV'], label: '1099-DIV', panelKey: '1099-div' },
    { id: 'src.k1', type: ['Schedule K-1'], label: 'Schedule K-1', panelKey: 'schedule-k1', allowNegative: true },
    { id: 'src.r', type: ['1099-R'], label: '1099-R', panelKey: '1099-r' },
    { id: 'src.ssa', type: ['SSA-1099'], label: 'SSA-1099', panelKey: 'ssa-1099' },
    { id: 'src.w2g', type: ['W-2G'], label: 'W-2G', panelKey: 'w-2g' },
    { id: 'src.misc', type: ['1099-MISC'], label: '1099-MISC', panelKey: '1099-misc' },
    { id: 'src.g', type: ['1099-G'], label: '1099-G', panelKey: '1099-g' },
    { id: 'src.other', type: ['Other'], label: 'Other Income' }
];
function defineInputs(g) {
    const io = (id, label, domId, panelKey, panelSection, extra = {}) => g.input({ id, label, domId, panelKey, panelSection, unit: extra.unit || 'usd', allowNegative: extra.allowNegative, optional: extra.optional, max: extra.max });
    // W-2s
    const w2Field = (box, label) => ({ label, unit: 'usd', domId: (it) => `w2-${it.id}-${box}` });
    g.collection({
        id: 'w2',
        countLabel: 'Number of W-2s',
        itemLabel: (i, it) => `W-2 #${i + 1} (${it.name || 'Employer'})`,
        fields: {
            box1: w2Field('box1', 'Box 1 Wages'),
            box2: w2Field('box2', 'Box 2 Federal Withholding'),
            box3: w2Field('box3', 'Box 3 Social Security Wages'),
            box4: w2Field('box4', 'Box 4 Social Security Tax'),
            box5: w2Field('box5', 'Box 5 Medicare Wages'),
            box6: w2Field('box6', 'Box 6 Medicare Tax'),
            box10: { label: 'Box 10 Dependent Care Benefits', unit: 'usd', optional: true, domId: (it) => `w2-${it.id}-box10` },
            employerHsa: { label: 'Box 12 W Employer HSA Contributions', unit: 'usd', optional: true, domId: (it) => `w2-${it.id}-box12-container` },
            deferrals: { label: 'Box 12 Elective Deferrals (D/E/G/S/AA/BB/EE)', unit: 'usd', optional: true, domId: (it) => `w2-${it.id}-box12-container` },
            retirementPlanTaxpayer: { label: "Box 13 Retirement Plan (taxpayer's W-2)", unit: 'count', domId: (it) => `w2-${it.id}-box1-container` },
            retirementPlanSpouse: { label: "Box 13 Retirement Plan (spouse's W-2)", unit: 'count', domId: (it) => `w2-${it.id}-box1-container` },
            isTaxpayer: { label: "Taxpayer's W-2", unit: 'count', domId: (it) => `w2-${it.id}-owner` },
            isSpouse: { label: "Spouse's W-2", unit: 'count', domId: (it) => `w2-${it.id}-owner` }
        }
    });
    const stateLineDom = (suffix) => (it) => `w2-${Math.floor(it.id / 1000)}-state-${it.id % 1000}-${suffix}`;
    g.collection({
        id: 'w2State',
        itemLabel: (_i, it) => `${it.name || 'State'} (W-2 #${Math.floor(it.id / 1000) + 1})`,
        fields: {
            stateWages: { label: 'Box 16 State Wages', unit: 'usd', domId: stateLineDom('box16') },
            withheld: { label: 'Box 17 State Income Tax', unit: 'usd', domId: stateLineDom('box17') },
            localWithheld: { label: 'Box 19 Local Income Tax', unit: 'usd', domId: it => `w2-${Math.floor(it.id / 1000)}-state-card-${it.id % 1000}` }
        }
    });
    // 1099s and other income documents
    SOURCE_COLLECTIONS.forEach(c => {
        const f = (label, allowNegative = false, optional = false) => ({
            label, unit: 'usd', allowNegative, optional, panelKey: c.panelKey, panelSection: 'other-income',
            domId: (it) => `input-source-${it.id}-amount`
        });
        g.collection({
            id: c.id,
            itemLabel: (_i, it) => `${it.name || 'Payer'}:`,
            fields: {
                amount: f(`${c.label} Amount`, c.allowNegative),
                accrued: f(`${c.label} Accrued Interest Paid`, false, true),
                taxExempt: f(`${c.label} Tax-Exempt Interest`, false, true),
                treasury: f(`${c.label} US Treasury Interest (Box 3)`, false, true),
                inStateExempt: f(`${c.label} Tax-Exempt Interest From Own State's Bonds`, false, true),
                stateRefund: f(`${c.label} State/Local Refund (Box 2)`, false, true),
                priorItemizedExcess: f(`${c.label} Last Year's Itemized Excess Over Standard`, false, true),
                qdiv: f(`${c.label} Qualified Dividends`),
                capGainDist: f(`${c.label} Capital Gain Distributions (Box 2a)`, false, true),
                taxable: f(`${c.label} Taxable Amount (Box 2a)`),
                nonRollover: f(`${c.label} Not Rolled Over`),
                penaltyException: f(`${c.label} Amount Excepted From 10% Tax`, false, true),
                fedWithheld: f(`${c.label} Federal Tax Withheld`, false, true),
                penalty: f(`${c.label} Early Distribution (Code 1)`),
                simple: f(`${c.label} SIMPLE IRA First 2 Years (Code S)`),
                isSpouse: { label: `${c.label} Belongs to Spouse`, unit: 'count', optional: true, domId: (it) => `input-source-${it.id}-owner` }
            }
        });
    });
    // Other income
    io('in.interest', 'Bank Interest (1099-INT Box 1)', 'input-other-interest', '1099-int', 'other-income', { optional: true });
    io('in.schedCExpenses', 'Schedule C Expenses', 'input-sched-c-expenses', 'schedule-c-expenses', 'other-income', { optional: true });
    io('in.stGain', 'Short-Term Capital Gain/Loss', 'input-capital-gains-st', 'capital-gains', 'other-income', { allowNegative: true, optional: true });
    io('in.ltGain', 'Long-Term Capital Gain/Loss', 'input-capital-gains-lt', 'capital-gains', 'other-income', { allowNegative: true, optional: true });
    io('in.capCarryover', 'Prior-Year Capital Loss Carryover', 'section-federal-other-income', 'capital-gains', 'other-income', { optional: true });
    io('in.collectibles', '28% Collectibles Gain', 'input-cap-collectibles', 'capital-gains', 'other-income', { optional: true });
    io('in.unrecap1250', 'Unrecaptured §1250 Gain', 'input-cap-1250', 'capital-gains', 'other-income', { optional: true });
    io('in.homeSaleGain', 'Gain on Sale of Main Home', 'input-home-sale-gain', 'home-sale-121', 'other-income', { optional: true });
    io('in.rents', 'Gross Rents', 'input-sched-e-rents', 'schedule-e-rental', 'other-income', { optional: true });
    io('in.rentalExpenses', 'Rental Expenses', 'input-sched-e-expenses', 'schedule-e-rental', 'other-income', { optional: true });
    io('in.rentalDepreciation', 'Rental Depreciation', 'input-sched-e-depreciation', 'schedule-e-rental', 'other-income', { optional: true });
    io('in.alimonyReceived', 'Alimony Received', 'input-alimony-received', 'alimony-received', 'other-income', { optional: true });
    io('in.feie', 'Foreign Earned Income Excluded', 'input-foreign-earned-excl', 'foreign-earned-income-2555', 'other-income', { optional: true });
    io('in.tips', 'Unreported Tips', 'input-unreported-tips', 'unreported-tips-4137', 'other-income', { optional: true });
    // Adjustments
    io('in.studentLoan', 'Student Loan Interest Paid', 'input-adj-student-loan', 'adj-student-loan', 'adjustments', { optional: true });
    io('in.ira', 'Traditional IRA Contributions', 'input-adj-ira', 'adj-ira', 'adjustments', { optional: true });
    io('in.spouseIra', "Spouse's Traditional IRA Contributions", 'input-adj-spouse-ira', 'adj-ira', 'adjustments', { optional: true });
    io('in.hsa', 'HSA Contributions', 'input-adj-hsa', 'adj-hsa', 'adjustments', { optional: true });
    io('in.educator', 'Educator Expenses Paid', 'input-adj-educator', 'adj-educator', 'adjustments', { optional: true });
    io('in.seRetirement', 'SEP / SIMPLE / Solo 401(k)', 'input-adj-se-retirement', 'adj-se-retirement', 'adjustments', { optional: true });
    io('in.seHealth', 'Self-Employed Health Insurance', 'input-adj-se-health', 'adj-se-health', 'adjustments', { optional: true });
    io('in.alimonyPaid', 'Alimony Paid', 'input-adj-alimony', 'adj-alimony', 'adjustments', { optional: true });
    io('in.militaryMoving', 'Military Moving Expenses', 'input-adj-military-moving', 'adj-military-moving', 'adjustments', { optional: true });
    io('in.earlyWithdrawal', 'Early Withdrawal Penalty', 'input-adj-early-withdrawal', 'adj-early-withdrawal-penalty', 'adjustments', { optional: true });
    io('in.juryDuty', 'Jury Duty Pay Given to Employer', 'input-adj-jury-duty', 'adj-jury-duty', 'adjustments', { optional: true });
    io('in.qualifiedTips', 'Qualified Tips', 'input-sched1a-tips', 'sched1a-tips', 'adjustments', { optional: true });
    io('in.qualifiedOvertime', 'Qualified Overtime Premium', 'input-sched1a-overtime', 'sched1a-overtime', 'adjustments', { optional: true });
    io('in.carLoanInterest', 'Car Loan Interest Paid', 'input-sched1a-car-loan', 'sched1a-car-loan', 'adjustments', { optional: true });
    io('in.seniors', 'Taxpayer/Spouse Age 65+', 'input-sched1a-seniors', 'sched1a-senior', 'adjustments', { unit: 'count', optional: true, max: 2 });
    io('in.taxpayerBirthYear', 'Your Birth Year', 'input-taxpayer-birth-year', undefined, undefined, { unit: 'count', optional: true });
    io('in.spouseBirthYear', 'Spouse Birth Year', 'input-spouse-birth-year', undefined, undefined, { unit: 'count', optional: true });
    const depDom = (it) => `dep-${it.id}-birth-year`;
    g.collection({
        id: 'dep',
        countLabel: 'Number of Dependents',
        itemLabel: (_i, it) => it.name || 'Dependent',
        fields: {
            birthYear: { label: 'Birth Year', unit: 'count', domId: depDom, panelKey: 'cred-dependents-list', panelSection: 'credits' },
            isChild: { label: 'Child / Sibling Relationship', unit: 'count', domId: depDom },
            monthsLived: { label: 'Months Lived With You', unit: 'count', domId: depDom },
            student: { label: 'Full-Time Student', unit: 'count', domId: depDom },
            disabled: { label: 'Permanently Disabled', unit: 'count', domId: depDom },
            hasSsn: { label: 'Has SSN Valid for Work', unit: 'count', domId: depDom }
        }
    });
    io('in.priorYearTax', "Last Year's Total Tax", 'input-prior-year-tax', 'cred-prior-year-safe-harbor', 'credits', { optional: true });
    io('in.priorYearAgi', "Last Year's AGI", 'input-prior-year-agi', 'cred-prior-year-safe-harbor', 'credits', { optional: true });
    // Itemized deductions
    io('in.medical', 'Medical Expenses', 'input-itemized-medical', 'itemized-medical', 'itemized', { optional: true });
    io('in.realEstateTax', 'Real Estate Tax', 'input-itemized-real-estate', 'itemized-real-estate', 'itemized', { optional: true });
    io('in.mortgage', 'Mortgage Interest', 'input-itemized-mortgage', 'itemized-mortgage', 'itemized', { optional: true });
    io('in.charity', 'Charitable Gifts', 'input-itemized-charity', 'itemized-charity', 'itemized', { optional: true });
    io('in.gamblingLosses', 'Gambling Losses', 'input-itemized-gambling-losses', 'itemized-gambling-losses', 'itemized', { optional: true });
    io('in.investmentInterest', 'Investment Interest Paid', 'input-itemized-investment-interest', 'itemized-investment-interest', 'itemized', { optional: true });
    io('in.casualty', 'Casualty Loss', 'input-itemized-casualty', 'itemized-casualty', 'itemized', { optional: true });
    io('in.otherSaltIncomeTax', 'Other State/Local Income Tax Paid', 'input-itemized-other-income-tax', 'itemized-real-estate', 'itemized', { optional: true });
    io('in.personalPropertyTax', 'Personal Property Tax', 'input-itemized-personal-property', 'itemized-real-estate', 'itemized', { optional: true });
    io('in.salesTax', 'General Sales Tax', 'input-itemized-sales-tax', 'itemized-real-estate', 'itemized', { optional: true });
    io('in.charityNoncash', 'Gifts of Property', 'input-itemized-charity-noncash', 'itemized-charity', 'itemized', { optional: true });
    io('in.mortgageBalance', 'Average Mortgage Balance', 'input-itemized-mortgage-balance', 'itemized-mortgage', 'itemized', { optional: true });
    // Dependents & credits
    io('in.children', 'Qualifying Children', 'input-children-count', 'cred-children', 'credits', { unit: 'count', optional: true });
    io('in.otherDependents', 'Other Dependents', 'input-other-dependents', 'cred-other-dependents', 'credits', { unit: 'count', optional: true });
    io('in.age65Blind', 'Age 65+ / Blind Boxes', 'input-age65-blind', 'cred-age-blind', 'credits', { unit: 'count', optional: true, max: 4 });
    io('in.childCare', 'Child Care Expenses', 'input-child-care', 'cred-child-care', 'credits', { optional: true });
    io('in.aotc', 'AOTC Tuition', 'input-edu-aotc', 'cred-aotc', 'credits', { optional: true });
    io('in.llc', 'Lifetime Learning Tuition', 'input-edu-llc', 'cred-llc', 'credits', { optional: true });
    io('in.foreignTaxCredit', 'Foreign Tax Credit', 'input-foreign-tax-credit', 'cred-foreign-tax', 'credits', { optional: true });
    io('in.cleanEnergy', 'Clean Energy Credit', 'input-clean-energy-credit', 'cred-clean-energy', 'credits', { optional: true });
    io('in.adoption', 'Qualified Adoption Expenses', 'input-adoption-credit', 'cred-adoption', 'credits', { optional: true });
    io('in.elderly', 'Elderly / Disabled Credit', 'input-elderly-credit', 'cred-elderly-sched-r', 'credits', { optional: true });
    io('in.ptc', 'Net Premium Tax Credit', 'input-ptc-credit', 'cred-ptc-8962', 'credits', { optional: true });
    io('in.householdTax', 'Household Employment Taxes', 'input-household-tax', 'sched-h-household', 'credits', { optional: true });
    io('in.estimatedPayments', 'Estimated Tax Payments', 'input-estimated-payments', 'cred-estimated-payments', 'credits', { optional: true });
}
function defineParams(g) {
    const p = (id, label, unit, resolve, source, domSources = YEAR_STATUS) => g.param({ id, label, unit, resolve, source, domSources });
    p('fed.stdBase', 'Base Standard Deduction', 'usd', c => rules(c.year).standardDeduction[c.status], 'Form 1040 Line 12 instructions');
    p('fed.addlStdPerBox', 'Additional Standard Deduction per Box', 'usd', c => (c.status === 'single' || c.status === 'head_of_household') ? (c.year === 2025 ? 2000 : 1950) : (c.year === 2025 ? 1600 : 1550), 'IRC §63(f)');
    p('fed.ssWageBase', 'Social Security Wage Base', 'usd', c => rules(c.year).ssWageLimit, 'SSA annual wage base', ['select-tax-year']);
    p('fed.ssRate', 'Social Security Employee Rate', 'rate', c => rules(c.year).ssRate, 'IRC §3101(a)', []);
    p('fed.addlMedRate', 'Additional Medicare Rate', 'rate', c => rules(c.year).additionalMedicareRate, 'Form 8959', []);
    p('fed.addlMedThreshold', 'Additional Medicare Threshold', 'usd', c => rules(c.year).additionalMedicareThreshold[c.status], 'Form 8959');
    p('fed.niitRate', 'NIIT Rate', 'rate', c => rules(c.year).niitRate, 'Form 8960', []);
    p('fed.niitThreshold', 'NIIT Threshold', 'usd', c => rules(c.year).niitThreshold[c.status], 'Form 8960');
    p('fed.ctcPerChild', 'Child Tax Credit per Child', 'usd', c => rules(c.year).childTaxCreditPerChild, 'Schedule 8812', ['select-tax-year']);
    p('fed.actcMaxPerChild', 'Refundable ACTC Max per Child', 'usd', c => rules(c.year).childTaxCreditRefundableMax, 'Schedule 8812', ['select-tax-year']);
    p('fed.ctcPhaseStart', 'CTC Phaseout Threshold', 'usd', c => rules(c.year).childTaxCreditPhaseout[c.status], 'Schedule 8812');
    p('fed.odcPerDependent', 'Credit per Other Dependent', 'usd', () => 500, 'Schedule 8812', []);
    p('fed.capLossFloor', 'Capital Loss Limit', 'usd', c => (c.status === 'married_separate' ? -1500 : -3000), 'IRC §1211(b)', ['select-filing-status']);
    p('fed.studentLoanCap', 'Student Loan Interest Cap', 'usd', () => 2500, 'IRC §221(b)(1)', []);
    p('fed.educatorCap', 'Educator Expense Cap (per educator)', 'usd', () => 300, 'IRC §62(a)(2)(D)', []);
    p('fed.saltCapBase', 'SALT Cap', 'usd', c => (c.year >= 2025 ? 40000 : 10000) / (c.status === 'married_separate' ? 2 : 1), 'IRC §164(b)(6) as amended by P.L. 119-21', YEAR_STATUS);
    p('fed.saltPhaseStart', 'SALT Cap Phase-Down Threshold (MAGI)', 'usd', c => (c.status === 'married_separate' ? 250000 : 500000), 'IRC §164(b)(7)', ['select-filing-status']);
    p('fed.saltFloor', 'SALT Cap Minimum', 'usd', c => (c.status === 'married_separate' ? 5000 : 10000), 'IRC §164(b)(7)', ['select-filing-status']);
    p('fed.slPhaseStart', 'Student Loan Interest Phase-Out Start (MAGI)', 'usd', c => (c.status === 'married_joint' ? (c.year >= 2025 ? 170000 : 165000) : (c.year >= 2025 ? 85000 : 80000)), 'Pub. 970 ch. 4', YEAR_STATUS);
    p('fed.slPhaseRange', 'Student Loan Interest Phase-Out Range', 'usd', c => (c.status === 'married_joint' ? 30000 : 15000), 'Pub. 970 ch. 4', ['select-filing-status']);
    p('fed.medicareRate', 'Medicare Employee Rate', 'rate', c => rules(c.year).medicareRate, 'IRC §3101(b)(1)', []);
    p('fed.taxYear', 'Tax Year', 'count', c => c.year, 'Form 1040', ['select-tax-year']);
    p('fed.electiveDeferralLimit', 'Elective Deferral Limit', 'usd', c => (c.year >= 2025 ? 23500 : 23000), 'IRC §402(g)', ['select-tax-year']);
    p('fed.annualAdditionsCap', 'Annual Additions Limit', 'usd', c => (c.year >= 2025 ? 70000 : 69000), 'IRC §415(c)', ['select-tax-year']);
    p('fed.dependentStdMin', 'Dependent Standard Deduction Minimum', 'usd', c => (c.year >= 2025 ? 1350 : 1300), 'IRC §63(c)(5)', ['select-tax-year']);
    g.param({ id: 'fed.hsaLimitSelf', label: 'HSA Limit (Self-Only)', unit: 'usd', source: 'Rev. Proc. 2023-23 / 2024-25', domSources: ['select-tax-year'], resolve: c => (c.year >= 2025 ? 4300 : 4150) });
    g.param({ id: 'fed.hsaLimitFamily', label: 'HSA Limit (Family)', unit: 'usd', source: 'Rev. Proc. 2023-23 / 2024-25', domSources: ['select-tax-year'], resolve: c => (c.year >= 2025 ? 8550 : 8300) });
    p('fed.iraLimit', 'IRA Contribution Limit', 'usd', () => 7000, 'IRC §219(b)(5)', []);
    p('fed.iraPhaseStartCovered', 'IRA Phase-Out Start (covered by workplace plan)', 'usd', c => (c.status === 'married_joint' ? (c.year >= 2025 ? 126000 : 123000) : c.status === 'married_separate' ? 0 : (c.year >= 2025 ? 79000 : 77000)), 'Pub. 590-A', YEAR_STATUS);
    p('fed.iraPhaseRangeCovered', 'IRA Phase-Out Range (covered)', 'usd', c => (c.status === 'married_joint' ? 20000 : 10000), 'Pub. 590-A', ['select-filing-status']);
    p('fed.iraPhaseStartSpouse', 'IRA Phase-Out Start (spouse covered)', 'usd', c => (c.year >= 2025 ? 236000 : 230000), 'Pub. 590-A', ['select-tax-year']);
    p('fed.tipsOvertimePhaseStart', 'Tips/Overtime Phase-Out Start (MAGI)', 'usd', c => (c.status === 'married_joint' ? 300000 : 150000), 'IRC §224, §225', ['select-filing-status']);
    p('fed.overtimeCap', 'Overtime Deduction Cap', 'usd', c => (c.status === 'married_joint' ? 25000 : 12500), 'IRC §225', ['select-filing-status']);
    p('fed.carLoanPhaseStart', 'Car Loan Interest Phase-Out Start (MAGI)', 'usd', c => (c.status === 'married_joint' ? 200000 : 100000), 'IRC §163(h)(4)', ['select-filing-status']);
    p('fed.seniorPhaseStart', 'Senior Deduction Phase-Out Start (MAGI)', 'usd', c => (c.status === 'married_joint' ? 150000 : 75000), 'IRC §151(d)(5)', ['select-filing-status']);
    p('fed.feieLimit', 'Foreign Earned Income Exclusion Limit', 'usd', c => (c.year === 2025 ? 130000 : 126500), 'Form 2555', ['select-tax-year']);
    p('fed.palAllowance', 'Rental Loss Allowance', 'usd', c => (c.status === 'married_separate' ? 12500 : 25000), 'Form 8582', ['select-filing-status']);
    p('fed.palPhaseStart', 'Rental Allowance Phaseout Start', 'usd', c => (c.status === 'married_separate' ? 50000 : 100000), 'Form 8582', ['select-filing-status']);
    p('fed.ssBase1', 'Social Security Base Amount', 'usd', c => byStatus({ married_joint: 32000, married_separate: 0, other: 25000 })(c.status), 'SS Benefits Worksheet', ['select-filing-status']);
    p('fed.ssBase2', 'Social Security Adjusted Base', 'usd', c => byStatus({ married_joint: 44000, married_separate: 0, other: 34000 })(c.status), 'SS Benefits Worksheet', ['select-filing-status']);
    p('fed.eduPhaseStart', 'Education Credit Phaseout Start', 'usd', c => (c.status === 'married_joint' ? 160000 : 80000), 'Form 8863', ['select-filing-status']);
    p('fed.eduPhaseSpan', 'Education Credit Phaseout Range', 'usd', c => (c.status === 'married_joint' ? 20000 : 10000), 'Form 8863', ['select-filing-status']);
    p('fed.saversMax', "Saver's Credit Contribution Cap", 'usd', c => (c.status === 'married_joint' ? 4000 : 2000), 'Form 8880', ['select-filing-status']);
    const savers = (y) => y >= 2025
        ? { t50: { married_joint: 47500, head_of_household: 35625, other: 23750 }, t20: { married_joint: 51000, head_of_household: 38250, other: 25500 }, t10: { married_joint: 79000, head_of_household: 59250, other: 39500 } }
        : { t50: { married_joint: 46000, head_of_household: 34500, other: 23000 }, t20: { married_joint: 50000, head_of_household: 37500, other: 25000 }, t10: { married_joint: 76500, head_of_household: 57375, other: 38250 } };
    p('fed.saversT50', "Saver's Credit 50% AGI Limit", 'usd', c => byStatus(savers(c.year).t50)(c.status), 'Form 8880', YEAR_STATUS);
    p('fed.saversT20', "Saver's Credit 20% AGI Limit", 'usd', c => byStatus(savers(c.year).t20)(c.status), 'Form 8880', YEAR_STATUS);
    p('fed.saversT10', "Saver's Credit 10% AGI Limit", 'usd', c => byStatus(savers(c.year).t10)(c.status), 'Form 8880', YEAR_STATUS);
    p('fed.adoptionCap', 'Adoption Credit Limit', 'usd', c => (c.year === 2025 ? 17280 : 16810), 'Form 8839', ['select-tax-year']);
    p('fed.adoptionPhaseStart', 'Adoption Credit Phase-Out Start (MAGI)', 'usd', c => (c.year === 2025 ? 259190 : 252150), 'Form 8839 line 7; Rev. Proc. 2023-34 / 2024-40', ['select-tax-year']);
    p('fed.adoptionRefundableMax', 'Refundable Adoption Credit Limit', 'usd', c => (c.year >= 2025 ? 5000 : 0), 'P.L. 119-21 §70402', ['select-tax-year']);
    p('fed.eitcInvCap', 'EITC Investment Income Limit', 'usd', c => (c.year === 2025 ? 11950 : 11600), 'Schedule EIC', ['select-tax-year']);
    p('fed.eitcMax', 'EITC Maximum Credit', 'usd', c => (c.year >= 2025 ? [649, 4328, 7152, 8046] : [632, 4213, 6960, 7830]), 'Rev. Proc. 2023-34 / 2024-40', ['select-tax-year']);
    p('fed.eitcPhaseInRate', 'EITC Phase-In Rate', 'rate', () => [0.0765, 0.34, 0.40, 0.45], 'Schedule EIC', []);
    p('fed.eitcPhaseOutRate', 'EITC Phase-Out Rate', 'rate', () => [0.0765, 0.1598, 0.2106, 0.2106], 'Schedule EIC', []);
    p('fed.eitcIncomeLimit', 'EITC Income Limit', 'usd', c => c.year >= 2025
        ? (c.status === 'married_joint' ? [26214, 57554, 64430, 68675] : [19104, 50434, 57310, 61555])
        : (c.status === 'married_joint' ? [25511, 56004, 62688, 66819] : [18591, 49084, 55768, 59899]), 'Rev. Proc. 2023-34 / 2024-40', YEAR_STATUS);
    p('fed.amtExemption', 'AMT Exemption', 'usd', c => byStatus({ married_joint: c.year === 2025 ? 137000 : 133300, married_separate: c.year === 2025 ? 68500 : 66650, other: c.year === 2025 ? 88100 : 85700 })(c.status), 'Form 6251');
    p('fed.amtPhaseStart', 'AMT Exemption Phaseout Start', 'usd', c => (c.status === 'married_joint' ? (c.year === 2025 ? 1252700 : 1218700) : (c.year === 2025 ? 626350 : 609350)), 'Form 6251');
    p('fed.amt28Breakpoint', 'AMT 28% Rate Breakpoint', 'usd', c => (c.year >= 2025 ? 239100 : 232600) / (c.status === 'married_separate' ? 2 : 1), 'Form 6251', YEAR_STATUS);
    g.param({ id: 'fed.brackets', label: 'Federal Tax Brackets', unit: 'usd', source: 'IRC §1(j)', domSources: YEAR_STATUS, resolve: c => rules(c.year).brackets[c.status] });
    g.param({ id: 'fed.ltcgBrackets', label: 'Capital Gain Rate Brackets', unit: 'usd', source: 'IRC §1(h)', domSources: YEAR_STATUS, resolve: c => rules(c.year).ltcgBrackets[c.status] });
}
function defineQuantities(g, year) {
    const q = (def) => g.quantity(def);
    const R = ref, P = param;
    // ---------- People & dependents ----------
    // Ages are figured at the end of the tax year. When no birth years / dependent records are entered,
    // the count fields (65+/blind boxes, children, other dependents, seniors) are used instead.
    const hasAges = quietly(gt(R('in.taxpayerBirthYear'), num(0)));
    const spouseAgeKnown = and(flag('fed.jointReturn', 'married filing jointly', 'not a joint return'), gt(R('in.spouseBirthYear'), num(0)));
    q({ id: 'fed.taxpayerAge', label: 'Your Age at Year End', unit: 'count', category: 'status', appliesWhen: hasAges, expr: sub(P('fed.taxYear'), R('in.taxpayerBirthYear')) });
    q({ id: 'fed.spouseAge', label: 'Spouse Age at Year End', unit: 'count', category: 'status', appliesWhen: spouseAgeKnown, expr: sub(P('fed.taxYear'), R('in.spouseBirthYear')) });
    const one = (c) => when(c, num(1), num(0));
    q({ id: 'fed.age65BlindBoxes', label: 'Age 65+ / Blind Boxes', unit: 'count', category: 'status',
        expr: when(hasAges, add(one(gte(R('fed.taxpayerAge'), num(65))), one(flag('fed.taxpayerBlind', 'you are blind', 'you are not blind', 'check-taxpayer-blind')), when(spouseAgeKnown, add(one(gte(R('fed.spouseAge'), num(65))), one(flag('fed.spouseBlind', 'your spouse is blind', 'your spouse is not blind', 'check-spouse-blind'))), num(0))), R('in.age65Blind')) });
    q({ id: 'fed.seniorsCount', label: 'Taxpayer/Spouse Age 65+', unit: 'count', display: 'inline',
        expr: when(hasAges, add(one(gte(R('fed.taxpayerAge'), num(65))), when(spouseAgeKnown, one(gte(R('fed.spouseAge'), num(65))), num(0))), R('in.seniors')) });
    const hasDeps = quietly(gt(count('dep'), num(0)));
    const depAge = sub(P('fed.taxYear'), field('birthYear'));
    // Qualifying child (IRC §152(c)): relationship, lived with you more than half the year, and under 19,
    // under 24 and a full-time student, or permanently disabled.
    const qualifyingChild = and(itemFlag('isChild', 'child/sibling relationship', 'not a child/sibling'), gt(field('monthsLived'), num(6)), or(lt(depAge, num(19)), and(itemFlag('student', 'full-time student', 'not a student'), lt(depAge, num(24))), itemFlag('disabled', 'permanently disabled', 'not disabled')));
    const hasSsn = itemFlag('hasSsn', 'has an SSN', 'no SSN');
    q({ id: 'fed.ctcChildren', label: 'Children Qualifying for the Child Tax Credit', unit: 'count', category: 'credits', optional: true,
        expr: when(hasDeps, sumOver('dep', one(and(qualifyingChild, lt(depAge, num(17)), hasSsn))), R('in.children')) });
    q({ id: 'fed.odcDependents', label: 'Dependents Qualifying for the $500 Credit', unit: 'count', category: 'credits', optional: true,
        expr: when(hasDeps, sub(count('dep'), R('fed.ctcChildren')), R('in.otherDependents')) });
    q({ id: 'fed.eitcChildren', label: 'EITC Qualifying Children', unit: 'count', category: 'credits', optional: true,
        expr: when(hasDeps, sumOver('dep', one(and(qualifyingChild, hasSsn))), R('in.children')) });
    q({ id: 'fed.careQualifyingPersons', label: 'Qualifying Persons for Care (under 13 or disabled)', unit: 'count', category: 'credits', optional: true,
        expr: when(hasDeps, sumOver('dep', one(or(lt(depAge, num(13)), itemFlag('disabled', 'permanently disabled', 'not disabled')))), max(num(1), add(R('in.children'), R('in.otherDependents')))) });
    // ---------- Wages & payroll ----------
    q({ id: 'fed.wages', label: 'Total W-2 Wages', unit: 'usd', form: 'Form 1040 Line 1a', category: 'wages', expr: each('w2', 'box1') });
    q({ id: 'fed.w2Withholding', label: 'W-2 Federal Tax Withheld', unit: 'usd', form: 'Form 1040 Line 25a', category: 'withholding', expr: each('w2', 'box2') });
    q({ id: 'fed.ssWages', label: 'Social Security Wages', unit: 'usd', display: 'inline', expr: each('w2', 'box3') });
    q({ id: 'fed.ssTaxWithheld', label: 'Social Security Tax Withheld', unit: 'usd', category: 'ss', expr: each('w2', 'box4') });
    q({ id: 'fed.medWages', label: 'Medicare Wages', unit: 'usd', display: 'inline', expr: each('w2', 'box5') });
    q({ id: 'fed.medTaxWithheld', label: 'Medicare Tax Withheld', unit: 'usd', category: 'medicare', expr: each('w2', 'box6') });
    q({ id: 'fed.ficaWithheld', label: 'FICA Payroll Taxes Withheld', unit: 'usd', category: 'ss', expr: add(R('fed.ssTaxWithheld'), R('fed.medTaxWithheld')) });
    q({ id: 'fed.stateWithheld', label: 'State Income Tax Withheld', unit: 'usd', display: 'inline', optional: true, expr: each('w2State', 'withheld') });
    q({ id: 'fed.localWithheld', label: 'Local Income Tax Withheld', unit: 'usd', display: 'inline', optional: true, expr: each('w2State', 'localWithheld') });
    // ---------- Capital gains (Schedule D) ----------
    q({ id: 'fed.capGainDistributions', label: 'Capital Gain Distributions', unit: 'usd', form: 'Schedule D Line 13', category: 'capital', optional: true,
        expr: each('src.div', 'capGainDist') });
    // §121: exclude up to $250,000 ($500,000 joint when both spouses meet the use test) of gain on a main home owned and
    // lived in 2 of the last 5 years. The rest is long-term gain (Form 8949 code H). Losses on a personal home are not deductible.
    const homeQualifies = flag('fed.homeSaleQualifies', 'you owned and lived in the home 2 of the last 5 years', 'the 2-of-5-year test is not met', 'check-home-sale-qualifies');
    const spouseQualifies = and(flag('fed.jointReturn', 'married filing jointly', 'not a joint return'), flag('fed.homeSaleSpouseQualifies', 'your spouse also meets the use test', 'your spouse does not meet the use test', 'check-home-sale-spouse'));
    q({ id: 'fed.homeSaleExclusion', label: 'Home Sale Exclusion', unit: 'usd', form: 'IRC §121 / Form 8949 code H', category: 'capital', optional: true,
        presentIf: gt(R('in.homeSaleGain'), lit(0)),
        expr: when(homeQualifies, min(R('in.homeSaleGain'), when(spouseQualifies, lit(500000), lit(250000))), lit(0)) });
    q({ id: 'fed.homeSaleTaxableGain', label: 'Taxable Gain on Home Sale', unit: 'usd', category: 'capital', optional: true,
        presentIf: gt(R('in.homeSaleGain'), lit(0)), expr: atLeast0(sub(R('in.homeSaleGain'), R('fed.homeSaleExclusion'))) });
    q({ id: 'fed.longTermGain', label: 'Net Long-Term Gain/Loss', unit: 'usd', display: 'inline', expr: add(R('in.ltGain'), R('fed.capGainDistributions'), R('fed.homeSaleTaxableGain')) });
    q({ id: 'fed.capNet', label: 'Net Capital Gain/Loss', unit: 'usd', form: 'Schedule D Line 16', category: 'capital',
        expr: sub(add(R('in.stGain'), R('fed.longTermGain')), R('in.capCarryover')) });
    q({ id: 'fed.capAllowed', label: 'Capital Gain/Loss on Return', unit: 'usd', form: 'Form 1040 Line 7', category: 'capital', optional: true,
        expr: max(R('fed.capNet'), P('fed.capLossFloor')) });
    q({ id: 'fed.capLossCarryforward', label: 'Capital Loss Carried to Next Year', unit: 'usd', form: 'Capital Loss Carryover Worksheet', category: 'capital', optional: true,
        expr: atLeast0(sub(R('fed.capAllowed'), R('fed.capNet'))) });
    // ---------- Business income (Schedule C) ----------
    q({ id: 'fed.businessGross', label: 'Gross Business Receipts', unit: 'usd', display: 'inline',
        expr: add(each('src.nec', 'amount'), each('src.k', 'amount'), each('src.f', 'amount')) });
    // A Schedule C loss offsets other income (Schedule 1 line 3); SE tax and QBI use only a profit.
    q({ id: 'fed.businessProfit', label: 'Net Business Profit (Loss)', unit: 'usd', form: 'Schedule C Line 31', category: 'wages', optional: true,
        expr: sub(R('fed.businessGross'), R('in.schedCExpenses')) });
    // Joint returns: each spouse files their own Schedule C / SE. Pooled expenses are shared in proportion to gross receipts.
    q({ id: 'fed.spouseBusinessGross', label: "Spouse's Gross Business Receipts", unit: 'usd', display: 'inline', optional: true,
        expr: add(each('src.nec', 'amount', 'isSpouse'), each('src.k', 'amount', 'isSpouse'), each('src.f', 'amount', 'isSpouse')) });
    q({ id: 'fed.spouseBusinessProfit', label: "Spouse's Business Profit", unit: 'usd', display: 'inline', optional: true,
        expr: when(gt(R('fed.spouseBusinessGross'), lit(0)), sub(R('fed.spouseBusinessGross'), round(mul(R('in.schedCExpenses'), div(R('fed.spouseBusinessGross'), R('fed.businessGross'))))), lit(0)) });
    q({ id: 'fed.taxpayerBusinessProfit', label: "Taxpayer's Business Profit", unit: 'usd', display: 'inline', optional: true,
        expr: sub(R('fed.businessProfit'), R('fed.spouseBusinessProfit')) });
    // ---------- Interest, dividends, other documents ----------
    // Schedule B: total 1099-INT interest (box 1 + box 3) minus accrued interest paid on bonds bought between payment dates.
    q({ id: 'fed.treasuryInterest', label: 'US Treasury Interest', unit: 'usd', display: 'inline', optional: true, expr: each('src.int', 'treasury') });
    q({ id: 'fed.interest1099', label: '1099-INT Interest', unit: 'usd', display: 'inline', optional: true,
        expr: add(sub(each('src.int', 'amount'), each('src.int', 'accrued')), R('fed.treasuryInterest')) });
    q({ id: 'fed.interestTotal', label: 'Taxable Interest', unit: 'usd', form: 'Form 1040 Line 2b', category: 'wages', optional: true,
        expr: add(R('in.interest'), R('fed.interest1099')) });
    q({ id: 'fed.taxExemptInterest', label: 'Tax-Exempt Interest', unit: 'usd', form: 'Form 1040 Line 2a', optional: true, expr: each('src.int', 'taxExempt') });
    q({ id: 'fed.dividends', label: 'Ordinary Dividends', unit: 'usd', form: 'Form 1040 Line 3b', category: 'wages', optional: true, expr: each('src.div', 'amount') });
    q({ id: 'fed.qualifiedDividends', label: 'Qualified Dividends', unit: 'usd', form: 'Form 1040 Line 3a', category: 'capital', optional: true,
        expr: sumOver('src.div', min(field('amount'), field('qdiv'))) });
    q({ id: 'fed.k1Income', label: 'Schedule K-1 Income', unit: 'usd', form: 'Schedule E Part II', category: 'wages', optional: true, expr: each('src.k1', 'amount') });
    q({ id: 'fed.retirement', label: 'Taxable Retirement Distributions', unit: 'usd', form: 'Form 1040 Lines 4b/5b', category: 'wages', optional: true,
        expr: each('src.r', 'taxable', 'nonRollover') });
    // Form 5329 Part I: early distributions minus amounts that meet an exception (age 55 separation, disability, first home, etc.).
    q({ id: 'fed.earlyDistributions', label: 'Early Distributions Subject to 10% Tax', unit: 'usd', display: 'inline',
        expr: atLeast0(sub(each('src.r', 'taxable', 'penalty'), each('src.r', 'penaltyException', 'penalty'))) });
    q({ id: 'fed.gambling', label: 'Gambling Winnings', unit: 'usd', form: 'Schedule 1 Line 8b', category: 'wages', optional: true, expr: each('src.w2g', 'amount') });
    // Schedule 1 line 1 (State and Local Income Tax Refund Worksheet, simplified): taxable only to the extent the tax
    // reduced last year's tax — at most last year's itemized deductions above the standard deduction.
    q({ id: 'fed.taxableStateRefund', label: 'Taxable State/Local Tax Refund', unit: 'usd', form: 'Schedule 1 Line 1', category: 'wages', optional: true,
        expr: sumOver('src.g', min(field('stateRefund'), field('priorItemizedExcess'))) });
    q({ id: 'fed.otherSourceIncome', label: 'Other 1099 Income', unit: 'usd', form: 'Schedule 1 Line 8z', category: 'wages', optional: true,
        expr: add(each('src.misc', 'amount'), each('src.g', 'amount'), each('src.other', 'amount')) });
    q({ id: 'fed.ssaGross', label: 'Social Security Benefits', unit: 'usd', form: 'Form 1040 Line 6a', optional: true, expr: each('src.ssa', 'amount') });
    q({ id: 'fed.extraWithholding', label: '1099 Federal Tax Withheld', unit: 'usd', form: 'Form 1040 Line 25b', category: 'withholding', optional: true,
        expr: add(...['src.nec', 'src.k', 'src.f', 'src.int', 'src.div', 'src.k1', 'src.r', 'src.ssa', 'src.w2g', 'src.misc', 'src.g', 'src.other'].map(c => each(c, 'fedWithheld'))) });
    q({ id: 'fed.documentIncome', label: '1099 & Business Income', unit: 'usd', display: 'inline',
        expr: add(R('fed.businessProfit'), R('fed.interest1099'), R('fed.dividends'), R('fed.k1Income'), R('fed.retirement'), R('fed.gambling'), R('fed.otherSourceIncome'), R('fed.taxableStateRefund')) });
    // ---------- Self-employment tax (Schedule SE) ----------
    // One Schedule SE per person: each spouse's $400 test and wage base are separate.
    q({ id: 'fed.taxpayerSeEarnings', label: "Taxpayer's Net SE Earnings", unit: 'usd', display: 'inline', optional: true,
        expr: when(gte(R('fed.taxpayerBusinessProfit'), lit(400)), mul(R('fed.taxpayerBusinessProfit'), rate(0.9235)), lit(0)) });
    q({ id: 'fed.spouseSeEarnings', label: "Spouse's Net SE Earnings", unit: 'usd', display: 'inline', optional: true,
        expr: when(gte(R('fed.spouseBusinessProfit'), lit(400)), mul(R('fed.spouseBusinessProfit'), rate(0.9235)), lit(0)) });
    q({ id: 'fed.seEarnings', label: 'Net SE Earnings', unit: 'usd', form: 'Schedule SE Line 4a', category: 'tax', optional: true,
        expr: add(R('fed.taxpayerSeEarnings'), R('fed.spouseSeEarnings')) });
    // Schedule SE line 8: only the self-employed person's own W-2 Social Security wages use up the wage base.
    q({ id: 'fed.taxpayerSsWages', label: "Taxpayer's Social Security Wages", unit: 'usd', display: 'inline', expr: each('w2', 'box3', 'isTaxpayer') });
    q({ id: 'fed.spouseSsWages', label: "Spouse's Social Security Wages", unit: 'usd', display: 'inline', optional: true, expr: each('w2', 'box3', 'isSpouse') });
    q({ id: 'fed.seSsRoom', label: 'Remaining Social Security Wage Base', unit: 'usd', display: 'inline',
        expr: atLeast0(sub(P('fed.ssWageBase'), R('fed.taxpayerSsWages'))) });
    q({ id: 'fed.spouseSeSsRoom', label: "Spouse's Remaining Social Security Wage Base", unit: 'usd', display: 'inline', optional: true,
        expr: atLeast0(sub(P('fed.ssWageBase'), R('fed.spouseSsWages'))) });
    q({ id: 'fed.seSsTax', label: 'SE Social Security Tax', unit: 'usd', category: 'tax',
        expr: round(add(mul(min(R('fed.taxpayerSeEarnings'), R('fed.seSsRoom')), rate(0.124)), mul(min(R('fed.spouseSeEarnings'), R('fed.spouseSeSsRoom')), rate(0.124)))) });
    q({ id: 'fed.seMedTax', label: 'SE Medicare Tax', unit: 'usd', category: 'tax', expr: round(mul(R('fed.seEarnings'), rate(0.029))) });
    q({ id: 'fed.seTax', label: 'Self-Employment Tax', unit: 'usd', form: 'Schedule SE Line 12', category: 'tax', optional: true,
        expr: round(add(R('fed.seSsTax'), R('fed.seMedTax'))) });
    q({ id: 'fed.halfSeTax', label: 'Deductible Half of SE Tax', unit: 'usd', form: 'Schedule 1 Line 15', category: 'adjustments', optional: true,
        expr: round(mul(R('fed.seTax'), rate(0.5))) });
    // ---------- Adjustments (Schedule 1 Part II) ----------
    // Self-employed retirement: at most 20% of (net profit − ½ SE tax) plus the elective deferral limit (solo 401(k) maximum),
    // within the annual additions cap. SE health insurance (Form 7206) is limited to net profit − ½ SE tax − SE retirement.
    q({ id: 'fed.seRetirementLimit', label: 'Self-Employed Retirement Contribution Limit', unit: 'usd', category: 'adjustments',
        appliesWhen: gt(R('in.seRetirement'), lit(0)),
        expr: min(P('fed.annualAdditionsCap'), add(P('fed.electiveDeferralLimit'), mul(atLeast0(sub(R('fed.businessProfit'), R('fed.halfSeTax'))), rate(0.2)))) });
    q({ id: 'fed.seRetirementDeduction', label: 'SEP / SIMPLE / Solo 401(k) Deduction', unit: 'usd', form: 'Schedule 1 Line 16', category: 'adjustments', optional: true,
        presentIf: gt(R('in.seRetirement'), lit(0)), expr: min(R('in.seRetirement'), R('fed.seRetirementLimit')) });
    q({ id: 'fed.seHealthDeduction', label: 'Self-Employed Health Insurance Deduction', unit: 'usd', form: 'Schedule 1 Line 17', category: 'adjustments', optional: true,
        presentIf: gt(R('in.seHealth'), lit(0)),
        expr: min(R('in.seHealth'), atLeast0(sub(R('fed.businessProfit'), R('fed.halfSeTax'), R('fed.seRetirementDeduction')))) });
    q({ id: 'fed.studentLoanInterestCapped', label: 'Student Loan Interest (up to cap)', unit: 'usd', display: 'inline', optional: true,
        expr: min(R('in.studentLoan'), P('fed.studentLoanCap')) });
    q({ id: 'fed.educatorDeduction', label: 'Educator Expense Deduction', unit: 'usd', display: 'inline', optional: true,
        expr: min(R('in.educator'), mul(P('fed.educatorCap'), when(flag('fed.bothEducators', 'both spouses are educators', 'one educator', 'check-both-educators'), num(2), num(1)))) });
    // Form 8889: contribution limit by coverage (+$1,000 at 55+), reduced by employer contributions (W-2 box 12 W).
    const familyHsa = flag('fed.hsaFamily', 'family HDHP coverage', 'self-only HDHP coverage', 'select-hsa-coverage');
    const hsaCatch = or(and(hasAges, gte(R('fed.taxpayerAge'), num(55))), and(not(hasAges), flag('fed.hsaCatchUp', 'age 55+ (checked)', 'under 55', 'check-hsa-catchup')));
    q({ id: 'fed.hsaLimit', label: 'HSA Contribution Limit', unit: 'usd', category: 'adjustments', appliesWhen: gt(R('in.hsa'), lit(0)),
        expr: atLeast0(sub(add(when(familyHsa, P('fed.hsaLimitFamily'), P('fed.hsaLimitSelf')), when(hsaCatch, lit(1000), lit(0))), each('w2', 'employerHsa'))) });
    q({ id: 'fed.hsaDeduction', label: 'HSA Deduction', unit: 'usd', form: 'Form 8889 Line 13', category: 'adjustments', optional: true,
        presentIf: gt(R('in.hsa'), lit(0)), expr: min(R('in.hsa'), R('fed.hsaLimit')) });
    q({ id: 'fed.hsaExcess', label: 'Excess HSA Contributions', unit: 'usd', category: 'adjustments', optional: true, expr: atLeast0(sub(R('in.hsa'), R('fed.hsaLimit'))) });
    q({ id: 'fed.adjustmentsExIraSli', label: 'Adjustments Other Than IRA & Student Loan Interest', unit: 'usd', display: 'inline',
        expr: add(R('fed.hsaDeduction'), R('fed.educatorDeduction'), R('fed.seRetirementDeduction'), R('fed.seHealthDeduction'), R('in.alimonyPaid'), R('in.militaryMoving'), R('in.earlyWithdrawal'), R('in.juryDuty'), R('fed.halfSeTax')) });
    // ---- IRA deduction (Pub. 590-A): phase-out when the taxpayer (or spouse) is covered by a workplace plan ----
    // Appendix B: MAGI uses taxable Social Security figured *before* the IRA deduction, which avoids circularity.
    q({ id: 'fed.provisionalIncomeBeforeIra', label: 'Provisional Income Before IRA Deduction', unit: 'usd', display: 'inline',
        expr: atLeast0(sub(add(R('fed.wages'), R('in.interest'), R('fed.documentIncome'), R('fed.capAllowed'), R('fed.rentalAllowed'), R('fed.taxExemptInterest'), mul(R('fed.ssaGross'), rate(0.5))), R('fed.adjustmentsExIraSli'))) });
    q({ id: 'fed.taxableSSBeforeIra', label: 'Taxable Social Security Before IRA Deduction', unit: 'usd', display: 'inline',
        expr: when(gt(R('fed.provisionalIncomeBeforeIra'), R('fed.ssBase2Used')), round(min(mul(R('fed.ssaGross'), rate(0.85)), add(min(mul(R('fed.ssaGross'), rate(0.5)), mul(sub(R('fed.ssBase2Used'), R('fed.ssBase1Used')), rate(0.5))), mul(sub(R('fed.provisionalIncomeBeforeIra'), R('fed.ssBase2Used')), rate(0.85))))), when(gt(R('fed.provisionalIncomeBeforeIra'), R('fed.ssBase1Used')), round(min(mul(R('fed.ssaGross'), rate(0.5)), mul(sub(R('fed.provisionalIncomeBeforeIra'), R('fed.ssBase1Used')), rate(0.5)))), lit(0))) });
    const anyIra = or(gt(R('in.ira'), lit(0)), gt(R('in.spouseIra'), lit(0)));
    q({ id: 'fed.iraMagi', label: 'MAGI for IRA Deduction', unit: 'usd', category: 'adjustments', appliesWhen: anyIra,
        expr: add(sub(add(R('fed.wages'), R('in.interest'), R('fed.documentIncome'), R('fed.capAllowed'), R('fed.rentalAllowed'), R('fed.taxableSSBeforeIra'), R('in.alimonyReceived'), R('in.tips')), R('fed.adjustmentsExIraSli')), R('fed.feie')) });
    const iraCatch = or(and(hasAges, gte(R('fed.taxpayerAge'), num(50))), and(not(hasAges), flag('fed.iraCatchUp', 'age 50+ (checked)', 'under 50', 'check-ira-catchup')));
    q({ id: 'fed.iraContributionLimit', label: 'IRA Contribution Limit', unit: 'usd', display: 'inline',
        expr: min(add(P('fed.iraLimit'), when(iraCatch, lit(1000), lit(0))), R('fed.earnedIncome')) });
    const coveredT = gt(count('w2', 'retirementPlanTaxpayer'), num(0));
    const coveredS = gt(count('w2', 'retirementPlanSpouse'), num(0));
    // Reduced limit = limit × (1 − (MAGI − start) ÷ range), rounded up to the next $10, and at least $200 if not fully phased out.
    const reduced = (start, range, limit = R('fed.iraContributionLimit')) => {
        const raw = mul(limit, sub(rate(1), div(atLeast0(sub(R('fed.iraMagi'), start)), range)));
        return when(lte(raw, lit(0)), lit(0), max(lit(200), mul(ceil(div(raw, lit(10))), lit(10))));
    };
    q({ id: 'fed.iraDeductibleLimit', label: 'Deductible IRA Limit', unit: 'usd', category: 'adjustments', appliesWhen: anyIra,
        expr: when(coveredT, min(R('fed.iraContributionLimit'), reduced(P('fed.iraPhaseStartCovered'), P('fed.iraPhaseRangeCovered'))), when(and(flag('fed.jointReturn', 'married filing jointly', 'not a joint return'), coveredS), min(R('fed.iraContributionLimit'), reduced(P('fed.iraPhaseStartSpouse'), lit(10000))), R('fed.iraContributionLimit'))) });
    q({ id: 'fed.taxpayerIraDeduction', label: "Taxpayer's IRA Deduction", unit: 'usd', category: 'adjustments', optional: true, appliesWhen: gt(R('in.spouseIra'), lit(0)),
        expr: min(R('in.ira'), R('fed.iraDeductibleLimit')) });
    // Spouse's IRA (joint returns, IRC §219(c)): own $7,000 (+$1,000 at 50+) limit, within combined compensation less the
    // taxpayer's contribution; phase-out uses the covered-worker range if the spouse is covered, else the spouse-covered range.
    const spouseCatch = and(quietly(gt(R('in.spouseBirthYear'), num(0))), gte(R('fed.spouseAge'), num(50)));
    q({ id: 'fed.spouseIraContributionLimit', label: "Spouse's IRA Contribution Limit", unit: 'usd', category: 'adjustments', appliesWhen: gt(R('in.spouseIra'), lit(0)),
        expr: atLeast0(min(add(P('fed.iraLimit'), when(spouseCatch, lit(1000), lit(0))), sub(R('fed.earnedIncome'), min(R('in.ira'), R('fed.iraContributionLimit'))))) });
    q({ id: 'fed.spouseIraDeduction', label: "Spouse's IRA Deduction", unit: 'usd', category: 'adjustments', optional: true, appliesWhen: gt(R('in.spouseIra'), lit(0)),
        expr: min(R('in.spouseIra'), when(coveredS, min(R('fed.spouseIraContributionLimit'), reduced(P('fed.iraPhaseStartCovered'), P('fed.iraPhaseRangeCovered'), R('fed.spouseIraContributionLimit'))), when(coveredT, min(R('fed.spouseIraContributionLimit'), reduced(P('fed.iraPhaseStartSpouse'), lit(10000), R('fed.spouseIraContributionLimit'))), R('fed.spouseIraContributionLimit')))) });
    q({ id: 'fed.iraDeduction', label: 'IRA Deduction', unit: 'usd', form: 'Schedule 1 Line 20', category: 'adjustments', optional: true,
        presentIf: anyIra, expr: add(R('fed.taxpayerIraDeduction'), R('fed.spouseIraDeduction')) });
    q({ id: 'fed.otherAdjustments', label: 'Adjustments Other Than Student Loan Interest', unit: 'usd', display: 'inline',
        expr: add(R('fed.iraDeduction'), R('fed.adjustmentsExIraSli')) });
    // Pub. 970 Student Loan Interest Deduction Worksheet: MAGI = income − other adjustments + excluded foreign income.
    q({ id: 'fed.studentLoanMagi', label: 'MAGI for Student Loan Interest', unit: 'usd', category: 'adjustments',
        appliesWhen: gt(R('fed.studentLoanInterestCapped'), lit(0)),
        expr: add(sub(R('fed.totalIncome'), R('fed.otherAdjustments')), R('fed.feie')) });
    q({ id: 'fed.studentLoanDeduction', label: 'Student Loan Interest Deduction', unit: 'usd', form: 'Schedule 1 Line 21', category: 'adjustments', optional: true,
        presentIf: gt(R('in.studentLoan'), lit(0)),
        expr: when(statusIs('married_separate'), lit(0), round(mul(R('fed.studentLoanInterestCapped'), sub(rate(1), min(rate(1), div(atLeast0(sub(R('fed.studentLoanMagi'), P('fed.slPhaseStart'))), P('fed.slPhaseRange'))))))) });
    q({ id: 'fed.adjustments', label: 'Adjustments to Income', unit: 'usd', form: 'Schedule 1 Line 26', category: 'adjustments',
        expr: round(add(R('fed.studentLoanDeduction'), R('fed.otherAdjustments'))) });
    // ---------- Rental real estate (Schedule E / Form 8582) ----------
    q({ id: 'fed.rentalNet', label: 'Net Rental Income Before Loss Limits', unit: 'usd', form: 'Schedule E Line 26', category: 'wages', optional: true,
        expr: sub(R('in.rents'), R('in.rentalExpenses'), R('in.rentalDepreciation')) });
    q({ id: 'fed.magiForRental', label: 'MAGI for Rental Loss Allowance', unit: 'usd', category: 'adjustments',
        // Form 8582 MAGI: figured without the IRA and student loan interest deductions or taxable Social Security.
        expr: atLeast0(sub(add(R('fed.wages'), R('in.interest'), R('fed.documentIncome'), R('fed.capAllowed')), R('fed.adjustmentsExIraSli'))) });
    q({ id: 'fed.rentalLossAllowance', label: 'Allowed Rental Loss', unit: 'usd', form: 'Form 8582', category: 'adjustments',
        expr: atLeast0(sub(P('fed.palAllowance'), mul(atLeast0(sub(R('fed.magiForRental'), P('fed.palPhaseStart'))), rate(0.5)))) });
    q({ id: 'fed.rentalAllowed', label: 'Rental Income on Return', unit: 'usd', form: 'Schedule 1 Line 5', category: 'wages', optional: true,
        expr: when(lt(R('fed.rentalNet'), lit(0)), max(R('fed.rentalNet'), neg(R('fed.rentalLossAllowance'))), R('fed.rentalNet')) });
    q({ id: 'fed.suspendedRentalLoss', label: 'Suspended Passive Loss', unit: 'usd', category: 'adjustments',
        expr: sub(R('fed.rentalAllowed'), R('fed.rentalNet')) });
    // ---------- Social Security benefits worksheet ----------
    // MFS spouses who lived apart all year use the single base amounts ($25,000 / $34,000).
    const apart = flag('fed.livedApart', 'you lived apart from your spouse all year', 'you did not live apart from your spouse all year', 'check-lived-apart');
    q({ id: 'fed.ssBase1Used', label: 'Social Security Base Amount', unit: 'usd', display: 'inline', expr: when(apart, lit(25000), P('fed.ssBase1')) });
    q({ id: 'fed.ssBase2Used', label: 'Social Security Adjusted Base', unit: 'usd', display: 'inline', expr: when(apart, lit(34000), P('fed.ssBase2')) });
    q({ id: 'fed.provisionalIncome', label: 'Provisional Income', unit: 'usd', category: 'wages',
        expr: atLeast0(sub(add(R('fed.wages'), R('in.interest'), R('fed.documentIncome'), R('fed.capAllowed'), R('fed.rentalAllowed'), R('fed.taxExemptInterest'), mul(R('fed.ssaGross'), rate(0.5))), R('fed.otherAdjustments'))) });
    q({ id: 'fed.taxableSS', label: 'Taxable Social Security', unit: 'usd', form: 'Form 1040 Line 6b', category: 'wages', optional: true,
        presentIf: gt(R('fed.ssaGross'), lit(0)),
        expr: when(gt(R('fed.provisionalIncome'), R('fed.ssBase2Used')), round(min(mul(R('fed.ssaGross'), rate(0.85)), add(min(mul(R('fed.ssaGross'), rate(0.5)), mul(sub(R('fed.ssBase2Used'), R('fed.ssBase1Used')), rate(0.5))), mul(sub(R('fed.provisionalIncome'), R('fed.ssBase2Used')), rate(0.85))))), when(gt(R('fed.provisionalIncome'), R('fed.ssBase1Used')), round(min(mul(R('fed.ssaGross'), rate(0.5)), mul(sub(R('fed.provisionalIncome'), R('fed.ssBase1Used')), rate(0.5)))), lit(0))) });
    // ---------- Total income & AGI ----------
    q({ id: 'fed.feie', label: 'Foreign Earned Income Exclusion', unit: 'usd', display: 'inline', optional: true, expr: min(R('in.feie'), P('fed.feieLimit')) });
    q({ id: 'fed.totalIncome', label: 'Total Income', unit: 'usd', form: 'Form 1040 Line 9', category: 'wages',
        expr: round(atLeast0(sub(add(R('fed.wages'), R('fed.depCareTaxable'), R('fed.interestTotal'), R('fed.dividends'), R('fed.businessProfit'), R('fed.k1Income'), R('fed.retirement'), R('fed.gambling'), R('fed.otherSourceIncome'), R('fed.taxableStateRefund'), R('fed.taxableSS'), R('fed.capAllowed'), R('fed.rentalAllowed'), R('in.alimonyReceived'), R('in.tips')), R('fed.feie')))) });
    q({ id: 'fed.agi', label: 'Adjusted Gross Income', unit: 'usd', form: 'Form 1040 Line 11', category: 'wages',
        expr: round(atLeast0(sub(R('fed.totalIncome'), R('fed.adjustments')))) });
    // ---------- Deductions ----------
    const claimedAsDependent = flag('fed.claimedAsDependent', 'someone can claim you as a dependent', 'no one can claim you as a dependent', 'check-claimed-as-dependent');
    // IRC §63(c)(5): a dependent's basic standard deduction is the greater of $1,300 ($1,350 in 2025) or earned income + $450, capped at the normal amount.
    q({ id: 'fed.stdDeduction', label: 'Standard Deduction', unit: 'usd', category: 'status',
        expr: add(when(claimedAsDependent, min(P('fed.stdBase'), max(P('fed.dependentStdMin'), add(R('fed.earnedIncome'), lit(450)))), P('fed.stdBase')), mul(R('fed.age65BlindBoxes'), P('fed.addlStdPerBox'))) });
    q({ id: 'fed.medicalFloor', label: 'Medical 7.5% AGI Floor', unit: 'usd', category: 'itemized', expr: mul(R('fed.agi'), rate(0.075)) });
    q({ id: 'fed.medicalDeduction', label: 'Deductible Medical Expenses', unit: 'usd', form: 'Schedule A Line 4', category: 'itemized', optional: true,
        expr: atLeast0(sub(R('in.medical'), R('fed.medicalFloor'))) });
    q({ id: 'fed.saltCap', label: 'SALT Cap', unit: 'usd', category: 'itemized',
        expr: year >= 2025
            // P.L. 119-21: $40,000 cap reduced by 30% of MAGI over $500,000, but not below $10,000.
            ? max(P('fed.saltFloor'), sub(P('fed.saltCapBase'), mul(atLeast0(sub(add(R('fed.agi'), R('fed.feie')), P('fed.saltPhaseStart'))), rate(0.3))))
            : P('fed.saltCapBase') });
    // Schedule A line 5a: state/local income taxes (withheld + other paid) or, by election, general sales taxes — whichever is larger.
    q({ id: 'fed.saltIncomeTaxes', label: 'State & Local Income Taxes Paid', unit: 'usd', display: 'inline',
        expr: add(R('fed.stateWithheld'), R('fed.localWithheld'), R('in.otherSaltIncomeTax')) });
    q({ id: 'fed.saltIncomeOrSales', label: 'Income Taxes or General Sales Taxes (larger)', unit: 'usd', display: 'inline',
        expr: max(R('fed.saltIncomeTaxes'), R('in.salesTax')) });
    q({ id: 'fed.salt', label: 'SALT Deduction', unit: 'usd', form: 'Schedule A Line 5e', category: 'itemized', optional: true,
        expr: min(R('fed.saltCap'), add(R('in.realEstateTax'), R('fed.saltIncomeOrSales'), R('in.personalPropertyTax'))) });
    q({ id: 'fed.gamblingLossDeduction', label: 'Deductible Gambling Losses', unit: 'usd', form: 'Schedule A Line 16', category: 'itemized', optional: true,
        expr: min(R('fed.gambling'), R('in.gamblingLosses')) });
    q({ id: 'fed.investmentInterestDeduction', label: 'Deductible Investment Interest', unit: 'usd', form: 'Schedule A Line 9', category: 'itemized', optional: true,
        expr: min(atLeast0(add(R('in.interest'), R('fed.interest1099'), atLeast0(R('fed.capAllowed')))), R('in.investmentInterest')) });
    // Form 4684: personal casualty loss (federally declared disaster) less $100 per event and 10% of AGI.
    q({ id: 'fed.casualtyDeduction', label: 'Deductible Casualty Loss', unit: 'usd', form: 'Schedule A Line 15', category: 'itemized', optional: true,
        presentIf: gt(R('in.casualty'), lit(0)), expr: atLeast0(sub(R('in.casualty'), lit(100), mul(R('fed.agi'), rate(0.1)))) });
    // Pub. 936: interest on acquisition debt above $750,000 ($1,000,000 for loans before Dec 16, 2017) is not deductible.
    const grandfathered = flag('fed.mortgageGrandfathered', 'loan taken out before Dec 16, 2017', 'loan after Dec 15, 2017', 'check-mortgage-grandfathered');
    q({ id: 'fed.mortgageDebtLimit', label: 'Mortgage Debt Limit', unit: 'usd', display: 'inline', expr: when(grandfathered, lit(1000000), lit(750000)) });
    q({ id: 'fed.mortgageDeduction', label: 'Deductible Mortgage Interest', unit: 'usd', form: 'Schedule A Line 8', category: 'itemized', optional: true,
        presentIf: gt(R('in.mortgage'), lit(0)),
        expr: when(gt(R('in.mortgageBalance'), R('fed.mortgageDebtLimit')), round(mul(R('in.mortgage'), div(R('fed.mortgageDebtLimit'), R('in.mortgageBalance')))), R('in.mortgage')) });
    // Charitable limits (IRC §170(b)): cash up to 60% of AGI; appreciated property up to 30%; the excess carries forward 5 years.
    q({ id: 'fed.charityNoncashAllowed', label: 'Property Gifts Allowed (30% of AGI)', unit: 'usd', display: 'inline', optional: true,
        expr: min(R('in.charityNoncash'), mul(R('fed.agi'), rate(0.3))) });
    q({ id: 'fed.charityDeduction', label: 'Deductible Charitable Gifts', unit: 'usd', form: 'Schedule A Line 14', category: 'itemized', optional: true,
        presentIf: gt(add(R('in.charity'), R('in.charityNoncash')), lit(0)),
        expr: add(min(R('in.charity'), atLeast0(sub(mul(R('fed.agi'), rate(0.6)), R('fed.charityNoncashAllowed')))), R('fed.charityNoncashAllowed')) });
    q({ id: 'fed.charityCarryforward', label: 'Charitable Gifts Carried to Next Year', unit: 'usd', category: 'itemized', optional: true,
        expr: sub(add(R('in.charity'), R('in.charityNoncash')), R('fed.charityDeduction')) });
    q({ id: 'fed.itemized', label: 'Itemized Deductions', unit: 'usd', form: 'Schedule A Line 17', category: 'itemized',
        expr: add(R('fed.medicalDeduction'), R('fed.salt'), R('fed.mortgageDeduction'), R('fed.charityDeduction'), R('fed.gamblingLossDeduction'), R('fed.investmentInterestDeduction'), R('fed.casualtyDeduction')) });
    const forceItemized = flag('fed.forceItemized', 'you chose to itemize', 'you did not force itemizing', 'select-deduction-method');
    const forceStandard = flag('fed.forceStandard', 'you chose the standard deduction', 'you did not force the standard deduction', 'select-deduction-method');
    // MFS: if your spouse itemizes, you must itemize too (standard deduction is $0).
    const spouseItemizes = flag('fed.spouseItemizes', 'your spouse itemizes (MFS)', 'your spouse does not itemize', 'check-spouse-itemizes');
    q({ id: 'fed.deduction', label: 'Deduction', unit: 'usd', form: 'Form 1040 Line 12', category: 'status',
        expr: when(or(forceItemized, spouseItemizes), R('fed.itemized'), when(forceStandard, R('fed.stdDeduction'), max(R('fed.stdDeduction'), R('fed.itemized')))) });
    q({ id: 'fed.itemizing', label: 'Itemizing', unit: 'count', display: 'inline',
        expr: when(or(forceItemized, spouseItemizes), num(1), when(forceStandard, num(0), when(gt(R('fed.itemized'), R('fed.stdDeduction')), num(1), num(0)))) });
    // ---------- QBI (Form 8995) ----------
    q({ id: 'fed.netLtcg', label: 'Net Long-Term Capital Gain', unit: 'usd', category: 'capital', optional: true,
        expr: when(and(gt(R('fed.capAllowed'), lit(0)), gt(R('fed.longTermGain'), lit(0))), min(R('fed.capAllowed'), R('fed.longTermGain')), lit(0)) });
    q({ id: 'fed.qbiIncome', label: 'Qualified Business Income', unit: 'usd', category: 'adjustments',
        expr: add(atLeast0(sub(R('fed.businessProfit'), R('fed.halfSeTax'), R('fed.seRetirementDeduction'), R('fed.seHealthDeduction'))), atLeast0(R('fed.k1Income'))) });
    q({ id: 'fed.qbiIncomeLimit', label: 'QBI Taxable Income Limit Base', unit: 'usd', category: 'adjustments',
        expr: atLeast0(sub(atLeast0(sub(R('fed.agi'), R('fed.deduction'))), add(R('fed.qualifiedDividends'), R('fed.netLtcg')))) });
    q({ id: 'fed.qbi', label: 'QBI Deduction', unit: 'usd', form: 'Form 1040 Line 13', category: 'adjustments', optional: true,
        expr: round(min(mul(R('fed.qbiIncome'), rate(0.2)), mul(R('fed.qbiIncomeLimit'), rate(0.2)))) });
    // ---------- Schedule 1-A (P.L. 119-21, tax years 2025–2028) ----------
    if (year >= 2025 && year <= 2028) {
        const notMfs = (e) => when(statusIs('married_separate'), lit(0), e);
        q({ id: 'fed.sched1aMagi', label: 'MAGI for Schedule 1-A', unit: 'usd', category: 'adjustments', expr: add(R('fed.agi'), R('fed.feie')) });
        const over = (startParam) => atLeast0(sub(R('fed.sched1aMagi'), P(startParam)));
        q({ id: 'fed.tipsDeduction', label: 'Qualified Tips Deduction', unit: 'usd', form: 'Schedule 1-A Part II', category: 'adjustments', optional: true,
            presentIf: gt(R('in.qualifiedTips'), lit(0)),
            expr: notMfs(round(atLeast0(sub(min(R('in.qualifiedTips'), lit(25000)), mul(over('fed.tipsOvertimePhaseStart'), rate(0.1)))))) });
        q({ id: 'fed.overtimeDeduction', label: 'Qualified Overtime Deduction', unit: 'usd', form: 'Schedule 1-A Part III', category: 'adjustments', optional: true,
            presentIf: gt(R('in.qualifiedOvertime'), lit(0)),
            expr: notMfs(round(atLeast0(sub(min(R('in.qualifiedOvertime'), P('fed.overtimeCap')), mul(over('fed.tipsOvertimePhaseStart'), rate(0.1)))))) });
        q({ id: 'fed.carLoanDeduction', label: 'Car Loan Interest Deduction', unit: 'usd', form: 'Schedule 1-A Part IV', category: 'adjustments', optional: true,
            presentIf: gt(R('in.carLoanInterest'), lit(0)),
            expr: round(atLeast0(sub(min(R('in.carLoanInterest'), lit(10000)), mul(over('fed.carLoanPhaseStart'), rate(0.2))))) });
        q({ id: 'fed.seniorDeduction', label: 'Senior Deduction', unit: 'usd', form: 'Schedule 1-A Part V', category: 'adjustments', optional: true,
            presentIf: gt(R('fed.seniorsCount'), num(0)),
            expr: notMfs(round(mul(R('fed.seniorsCount'), atLeast0(sub(lit(6000), mul(over('fed.seniorPhaseStart'), rate(0.06))))))) });
        q({ id: 'fed.sched1a', label: 'Schedule 1-A Deductions', unit: 'usd', form: 'Form 1040 Line 13b', category: 'adjustments', optional: true,
            expr: add(R('fed.tipsDeduction'), R('fed.overtimeDeduction'), R('fed.carLoanDeduction'), R('fed.seniorDeduction')) });
    }
    else {
        q({ id: 'fed.sched1a', label: 'Schedule 1-A Deductions', unit: 'usd', optional: true, expr: lit(0) });
    }
    q({ id: 'fed.taxableIncome', label: 'Taxable Income', unit: 'usd', form: 'Form 1040 Line 15', category: 'tax',
        expr: round(atLeast0(sub(R('fed.agi'), R('fed.deduction'), R('fed.qbi'), R('fed.sched1a')))) });
    // ---------- Tax (brackets + Qualified Dividends & Capital Gain worksheet) ----------
    q({ id: 'fed.specialGains', label: '25%/28% Rate Gains', unit: 'usd', display: 'inline',
        expr: min(R('fed.netLtcg'), add(R('in.collectibles'), R('in.unrecap1250'))) });
    q({ id: 'fed.standardLtcg', label: '0/15/20% Rate Gains', unit: 'usd', display: 'inline', expr: atLeast0(sub(R('fed.netLtcg'), R('fed.specialGains'))) });
    q({ id: 'fed.preferentialIncome', label: 'Preferential-Rate Income', unit: 'usd', category: 'capital', optional: true,
        expr: min(R('fed.taxableIncome'), add(R('fed.qualifiedDividends'), R('fed.standardLtcg'), R('fed.specialGains'))) });
    q({ id: 'fed.ordinaryTaxable', label: 'Ordinary Taxable Income', unit: 'usd', category: 'tax',
        expr: atLeast0(sub(R('fed.taxableIncome'), R('fed.preferentialIncome'))) });
    // Form 1040 instructions: taxable income under $100,000 must use the Tax Table — tax at the
    // midpoint of the row ($0–5, $5–15, $15–25, $25 rows to $3,000, $50 rows to $100,000), rounded.
    const tableMidpoint = (x) => when(lt(x, lit(5)), lit(2.5), when(lt(x, lit(15)), lit(10), when(lt(x, lit(25)), lit(20), when(lt(x, lit(3000)), add(mul(floor(div(x, lit(25))), lit(25)), lit(12.5)), add(mul(floor(div(x, lit(50))), lit(50)), lit(25))))));
    const taxOn = (id, label, income, extra = {}) => {
        q({ id: `${id}Row`, label: 'Tax Table Row Midpoint', unit: 'usd', category: 'tax', appliesWhen: lt(R(income), lit(100000)), expr: tableMidpoint(R(income)) });
        q({ id, label, unit: 'usd', category: 'tax', ...extra,
            expr: when(lt(R(income), lit(100000)), round(brackets(R(`${id}Row`), 'fed.brackets'), 'dollar'), brackets(R(income), 'fed.brackets')) });
    };
    taxOn('fed.ordinaryTax', 'Tax on Ordinary Income', 'fed.ordinaryTaxable');
    q({ id: 'fed.standardPrefIncome', label: 'Qualified Dividends & 0/15/20% Gains', unit: 'usd', display: 'inline',
        expr: min(R('fed.preferentialIncome'), add(R('fed.qualifiedDividends'), R('fed.standardLtcg'))) });
    q({ id: 'fed.standardPrefTax', label: 'Qualified Dividends & Capital Gains Tax', unit: 'usd', category: 'capital', optional: true,
        expr: brackets(R('fed.standardPrefIncome'), 'fed.ltcgBrackets', R('fed.ordinaryTaxable')) });
    q({ id: 'fed.remainingSpecial', label: 'Remaining 25%/28% Gains', unit: 'usd', display: 'inline',
        expr: atLeast0(sub(R('fed.preferentialIncome'), R('fed.standardPrefIncome'))) });
    q({ id: 'fed.applied1250', label: 'Unrecaptured §1250 Gain Taxed', unit: 'usd', display: 'inline', expr: min(R('fed.remainingSpecial'), R('in.unrecap1250')) });
    q({ id: 'fed.unrecap1250Tax', label: '§1250 Gain Tax (25%)', unit: 'usd', category: 'capital', optional: true, expr: mul(R('fed.applied1250'), rate(0.25)) });
    q({ id: 'fed.collectiblesTax', label: 'Collectibles Gain Tax (28%)', unit: 'usd', category: 'capital', optional: true,
        expr: mul(atLeast0(sub(R('fed.remainingSpecial'), R('fed.applied1250'))), rate(0.28)) });
    q({ id: 'fed.preferentialTax', label: 'Preferential-Rate Tax', unit: 'usd', display: 'inline',
        expr: add(R('fed.standardPrefTax'), R('fed.unrecap1250Tax'), R('fed.collectiblesTax')) });
    // QDCG / Schedule D Tax Worksheet: tax is the smaller of the special-rate computation and regular tax on all income
    // (so the 25% / 28% rates are maximums, never above the ordinary rate).
    taxOn('fed.regularTax', 'Regular Tax on All Taxable Income', 'fed.taxableIncome', { appliesWhen: gt(R('fed.preferentialIncome'), lit(0)) });
    q({ id: 'fed.tax', label: 'Income Tax', unit: 'usd', form: 'Form 1040 Line 16', category: 'tax',
        expr: when(gt(R('fed.preferentialIncome'), lit(0)), round(min(add(R('fed.ordinaryTax'), R('fed.preferentialTax')), R('fed.regularTax'))), round(R('fed.ordinaryTax'))) });
    // ---------- Credits ----------
    q({ id: 'fed.ctcMax', label: 'Child Tax Credit Before Phaseout', unit: 'usd', display: 'inline', expr: mul(R('fed.ctcChildren'), P('fed.ctcPerChild')) });
    q({ id: 'fed.odcMax', label: 'Other Dependent Credit Before Phaseout', unit: 'usd', display: 'inline', expr: mul(R('fed.odcDependents'), P('fed.odcPerDependent')) });
    q({ id: 'fed.ctcPhaseout', label: 'Child Credit Phaseout', unit: 'usd', category: 'credits', optional: true,
        expr: when(gt(R('fed.agi'), P('fed.ctcPhaseStart')), mul(ceil(div(sub(R('fed.agi'), P('fed.ctcPhaseStart')), lit(1000))), lit(50)), lit(0)) });
    q({ id: 'fed.childCreditsAfterPhaseout', label: 'Child & Dependent Credits After Phaseout', unit: 'usd', category: 'credits', optional: true,
        expr: atLeast0(sub(add(R('fed.ctcMax'), R('fed.odcMax')), R('fed.ctcPhaseout'))) });
    q({ id: 'fed.ctcAfterPhaseout', label: 'Child Tax Credit', unit: 'usd', category: 'credits', optional: true,
        presentIf: gt(R('fed.ctcChildren'), num(0)),
        expr: min(R('fed.ctcMax'), R('fed.childCreditsAfterPhaseout')) });
    q({ id: 'fed.odcAfterPhaseout', label: 'Credit for Other Dependents', unit: 'usd', category: 'credits', optional: true,
        expr: atLeast0(sub(R('fed.childCreditsAfterPhaseout'), R('fed.ctcAfterPhaseout'))) });
    q({ id: 'fed.careRate', label: 'Child Care Credit Rate', unit: 'rate', display: 'inline',
        expr: when(lte(R('fed.agi'), lit(15000)), rate(0.35), max(rate(0.2), sub(rate(0.35), mul(ceil(div(sub(R('fed.agi'), lit(15000)), lit(2000))), rate(0.01))))) });
    q({ id: 'fed.careExpenseCap', label: 'Child Care Expense Cap', unit: 'usd', display: 'inline',
        expr: atLeast0(sub(when(gte(R('fed.careQualifyingPersons'), num(2)), lit(6000), lit(3000)), R('fed.depCareExcluded'))) });
    // Form 2441 Part III: employer dependent care benefits (W-2 box 10) are excluded up to $5,000 ($2,500 MFS)
    // and the amount spent; the rest is taxable wages (Form 1040 line 1e). Excluded benefits reduce the credit's expense limit.
    q({ id: 'fed.depCareBenefits', label: 'Dependent Care Benefits (W-2 Box 10)', unit: 'usd', display: 'inline', optional: true, expr: each('w2', 'box10') });
    q({ id: 'fed.depCareExcluded', label: 'Excluded Dependent Care Benefits', unit: 'usd', form: 'Form 2441 Line 25', category: 'credits', optional: true,
        expr: min(R('fed.depCareBenefits'), when(statusIs('married_separate'), lit(2500), lit(5000)), R('in.childCare')) });
    q({ id: 'fed.depCareTaxable', label: 'Taxable Dependent Care Benefits', unit: 'usd', form: 'Form 1040 Line 1e', category: 'wages', optional: true,
        expr: sub(R('fed.depCareBenefits'), R('fed.depCareExcluded')) });
    // Form 2441 lines 4–6: expenses are limited to earned income (the lower-earning spouse's on a joint return).
    q({ id: 'fed.taxpayerEarnedIncome', label: "Taxpayer's Earned Income", unit: 'usd', display: 'inline', expr: add(each('w2', 'box1', 'isTaxpayer'), atLeast0(R('fed.taxpayerBusinessProfit'))) });
    q({ id: 'fed.spouseEarnedIncome', label: "Spouse's Earned Income", unit: 'usd', display: 'inline', expr: add(each('w2', 'box1', 'isSpouse'), atLeast0(R('fed.spouseBusinessProfit'))) });
    q({ id: 'fed.careEarnedIncomeLimit', label: 'Earned Income Limit for Care Expenses', unit: 'usd', category: 'credits', optional: true,
        appliesWhen: gt(R('in.childCare'), lit(0)),
        expr: when(flag('fed.jointReturn', 'married filing jointly', 'not a joint return'), min(R('fed.taxpayerEarnedIncome'), R('fed.spouseEarnedIncome')), R('fed.taxpayerEarnedIncome')) });
    q({ id: 'fed.childCareCredit', label: 'Child & Dependent Care Credit', unit: 'usd', form: 'Form 2441', category: 'credits', optional: true,
        presentIf: gt(R('in.childCare'), lit(0)),
        expr: when(or(statusIs('married_separate'), lte(R('fed.careQualifyingPersons'), num(0))), lit(0), round(mul(min(R('fed.careExpenseCap'), R('in.childCare'), R('fed.careEarnedIncomeLimit')), R('fed.careRate')))) });
    q({ id: 'fed.eduPhaseFactor', label: 'Education Credit Phase Factor', unit: 'rate', display: 'inline',
        expr: when(statusIs('married_separate'), rate(0), max(rate(0), min(rate(1), sub(rate(1), div(atLeast0(sub(R('fed.agi'), P('fed.eduPhaseStart'))), P('fed.eduPhaseSpan')))))) });
    q({ id: 'fed.aotcTotal', label: 'American Opportunity Credit', unit: 'usd', category: 'credits', optional: true,
        expr: mul(add(min(lit(2000), R('in.aotc')), mul(atLeast0(sub(min(lit(4000), R('in.aotc')), lit(2000))), rate(0.25))), R('fed.eduPhaseFactor')) });
    q({ id: 'fed.aotcRefundable', label: 'Refundable AOTC (40%)', unit: 'usd', form: 'Form 1040 Line 29', category: 'credits', optional: true,
        expr: round(mul(R('fed.aotcTotal'), rate(0.4))) });
    q({ id: 'fed.aotcNonrefundable', label: 'Nonrefundable AOTC (60%)', unit: 'usd', display: 'inline', optional: true, expr: round(mul(R('fed.aotcTotal'), rate(0.6))) });
    q({ id: 'fed.llc', label: 'Lifetime Learning Credit', unit: 'usd', display: 'inline', optional: true,
        expr: round(mul(mul(min(lit(10000), R('in.llc')), rate(0.2)), R('fed.eduPhaseFactor'))) });
    q({ id: 'fed.educationNonrefundable', label: 'Nonrefundable Education Credits', unit: 'usd', form: 'Form 8863 Line 19', category: 'credits', optional: true,
        presentIf: gt(add(R('in.aotc'), R('in.llc')), lit(0)),
        expr: add(R('fed.aotcNonrefundable'), R('fed.llc')) });
    q({ id: 'fed.saversRate', label: "Saver's Credit Rate", unit: 'rate', display: 'inline',
        expr: when(lte(R('fed.agi'), P('fed.saversT50')), rate(0.5), when(lte(R('fed.agi'), P('fed.saversT20')), rate(0.2), when(lte(R('fed.agi'), P('fed.saversT10')), rate(0.1), rate(0)))) });
    // Form 8880: IRA contributions plus elective deferrals (W-2 box 12), up to $2,000 per person; not for dependents.
    q({ id: 'fed.saversContributions', label: "Saver's Credit Contributions", unit: 'usd', category: 'credits', optional: true,
        expr: add(min(lit(2000), add(R('in.ira'), each('w2', 'deferrals', 'isTaxpayer'))), min(lit(2000), add(R('in.spouseIra'), each('w2', 'deferrals', 'isSpouse')))) });
    q({ id: 'fed.saversCredit', label: "Saver's Credit", unit: 'usd', form: 'Form 8880', category: 'credits', optional: true,
        presentIf: gt(R('fed.saversContributions'), lit(0)),
        expr: when(flag('fed.claimedAsDependent', 'someone can claim you as a dependent', 'no one can claim you as a dependent', 'check-claimed-as-dependent'), lit(0), round(mul(min(P('fed.saversMax'), R('fed.saversContributions')), R('fed.saversRate')))) });
    // Form 8839: limit × (1 − (MAGI − phase-out start) ÷ $40,000). From 2025 up to $5,000 of it is refundable (P.L. 119-21).
    q({ id: 'fed.adoptionMagi', label: 'MAGI for Adoption Credit', unit: 'usd', display: 'inline', expr: add(R('fed.agi'), R('fed.feie')) });
    q({ id: 'fed.adoptionAllowed', label: 'Adoption Credit After Phase-Out', unit: 'usd', form: 'Form 8839', category: 'credits', optional: true,
        presentIf: gt(R('in.adoption'), lit(0)),
        expr: round(mul(min(P('fed.adoptionCap'), R('in.adoption')), sub(rate(1), min(rate(1), div(atLeast0(sub(R('fed.adoptionMagi'), P('fed.adoptionPhaseStart'))), lit(40000)))))) });
    q({ id: 'fed.adoptionRefundable', label: 'Refundable Adoption Credit', unit: 'usd', form: 'Form 8839 / Form 1040 Line 30', category: 'credits', optional: true,
        expr: min(P('fed.adoptionRefundableMax'), R('fed.adoptionAllowed')) });
    q({ id: 'fed.adoptionCredit', label: 'Nonrefundable Adoption Credit', unit: 'usd', display: 'inline', optional: true, expr: sub(R('fed.adoptionAllowed'), R('fed.adoptionRefundable')) });
    q({ id: 'fed.nonrefundableBeforeLimit', label: 'Nonrefundable Credits Before Tax Limit', unit: 'usd', category: 'credits', optional: true,
        expr: add(R('fed.ctcAfterPhaseout'), R('fed.odcAfterPhaseout'), R('fed.childCareCredit'), R('fed.educationNonrefundable'), R('fed.saversCredit'), R('in.foreignTaxCredit'), R('in.cleanEnergy'), R('fed.adoptionCredit'), R('in.elderly')) });
    q({ id: 'fed.nonrefundableCredits', label: 'Nonrefundable Credits', unit: 'usd', form: 'Form 1040 Line 21', category: 'credits', optional: true,
        expr: round(min(R('fed.tax'), R('fed.nonrefundableBeforeLimit'))) });
    q({ id: 'fed.ctcAllowed', label: 'Child Tax Credit Allowed', unit: 'usd', display: 'inline', expr: min(R('fed.tax'), R('fed.ctcAfterPhaseout')) });
    q({ id: 'fed.odcAllowed', label: 'Other Dependent Credit Allowed', unit: 'usd', display: 'inline',
        expr: min(atLeast0(sub(R('fed.tax'), R('fed.ctcAllowed'))), R('fed.odcAfterPhaseout')) });
    q({ id: 'fed.earnedIncome', label: 'Earned Income', unit: 'usd', category: 'wages', expr: add(R('fed.wages'), atLeast0(R('fed.businessProfit'))) });
    q({ id: 'fed.actc', label: 'Additional Child Tax Credit', unit: 'usd', form: 'Form 1040 Line 28', category: 'credits', optional: true,
        expr: round(min(atLeast0(sub(R('fed.ctcAfterPhaseout'), R('fed.ctcAllowed'))), mul(R('fed.ctcChildren'), P('fed.actcMaxPerChild')), atLeast0(mul(sub(R('fed.earnedIncome'), lit(2500)), rate(0.15))))) });
    q({ id: 'fed.eitcInvestmentIncome', label: 'EITC Investment Income', unit: 'usd', display: 'inline',
        expr: add(R('in.interest'), R('fed.interest1099'), R('fed.taxExemptInterest'), R('fed.dividends'), atLeast0(R('fed.capAllowed')), atLeast0(R('fed.rentalAllowed'))) });
    q({ id: 'fed.eitcKids', label: 'EITC Qualifying Children (max 3)', unit: 'count', display: 'inline', expr: min(num(3), R('fed.eitcChildren')) });
    q({ id: 'fed.eitcIncome', label: 'EITC Income (greater of earned income or AGI)', unit: 'usd', display: 'inline', expr: max(R('fed.earnedIncome'), R('fed.agi')) });
    // The EIC Table computes the credit at the midpoint of $50 income bands.
    const eicRow = (x) => when(gt(x, lit(0)), add(mul(floor(div(x, lit(50))), lit(50)), lit(25)), lit(0));
    q({ id: 'fed.eitcEarnedRow', label: 'EIC Table Row Midpoint (Earned Income)', unit: 'usd', category: 'credits', optional: true,
        appliesWhen: gt(R('fed.earnedIncome'), lit(0)), expr: eicRow(R('fed.earnedIncome')) });
    q({ id: 'fed.eitcIncomeRow', label: 'EIC Table Row Midpoint (Phase-Out Income)', unit: 'usd', category: 'credits', optional: true,
        appliesWhen: gt(R('fed.earnedIncome'), lit(0)), expr: eicRow(R('fed.eitcIncome')) });
    q({ id: 'fed.eitcPhaseIn', label: 'EITC Phase-In Amount', unit: 'usd', display: 'inline',
        expr: min(lookup('fed.eitcMax', R('fed.eitcKids')), mul(R('fed.eitcEarnedRow'), lookup('fed.eitcPhaseInRate', R('fed.eitcKids')))) });
    q({ id: 'fed.eitcReduction', label: 'EITC Phase-Out Reduction', unit: 'usd', display: 'inline',
        expr: atLeast0(mul(sub(R('fed.eitcIncomeRow'), sub(lookup('fed.eitcIncomeLimit', R('fed.eitcKids')), div(lookup('fed.eitcMax', R('fed.eitcKids')), lookup('fed.eitcPhaseOutRate', R('fed.eitcKids'))))), lookup('fed.eitcPhaseOutRate', R('fed.eitcKids')))) });
    q({ id: 'fed.eitc', label: 'Earned Income Credit', unit: 'usd', form: 'Form 1040 Line 27', category: 'credits', optional: true,
        expr: when(and(not(statusIs('married_separate')), not(flag('fed.claimedAsDependent', 'someone can claim you as a dependent', 'no one can claim you as a dependent', 'check-claimed-as-dependent')), gt(R('fed.earnedIncome'), lit(0)), lte(R('fed.eitcInvestmentIncome'), P('fed.eitcInvCap')), 
        // Without a qualifying child, you (or your spouse on a joint return) must be 25–64.
        or(gt(R('fed.eitcKids'), num(0)), not(hasAges), and(gte(R('fed.taxpayerAge'), num(25)), lte(R('fed.taxpayerAge'), num(64))), and(spouseAgeKnown, gte(R('fed.spouseAge'), num(25)), lte(R('fed.spouseAge'), num(64)))), lt(R('fed.eitcIncome'), lookup('fed.eitcIncomeLimit', R('fed.eitcKids')))), round(atLeast0(min(R('fed.eitcPhaseIn'), sub(lookup('fed.eitcMax', R('fed.eitcKids')), R('fed.eitcReduction')))), 'dollar'), lit(0)) });
    q({ id: 'fed.refundableCredits', label: 'Refundable Credits', unit: 'usd', form: 'Form 1040 Lines 27–31', category: 'credits', optional: true,
        expr: round(add(R('fed.actc'), R('fed.eitc'), R('fed.aotcRefundable'), R('in.ptc'), R('fed.adoptionRefundable'))) });
    // ---------- Other taxes (Schedule 2) & excess Social Security ----------
    q({ id: 'fed.ssMaxTax', label: 'Max Social Security Tax per Year', unit: 'usd', display: 'inline', expr: round(mul(P('fed.ssWageBase'), P('fed.ssRate'))) });
    // Schedule 3 line 11 is figured separately for each spouse, and only when that person had 2+ employers.
    ['Taxpayer', 'Spouse'].forEach(who => {
        const w = `is${who}`;
        q({ id: `fed.ssWithheld${who}`, label: `${who} Social Security Tax Withheld`, unit: 'usd', display: 'inline', expr: each('w2', 'box4', w) });
        q({ id: `fed.excessSS${who}`, label: `${who} Excess Social Security Tax`, unit: 'usd', category: 'withholding', optional: true,
            expr: when(and(gt(count('w2', w), num(1)), gt(R(`fed.ssWithheld${who}`), R('fed.ssMaxTax'))), round(sub(R(`fed.ssWithheld${who}`), R('fed.ssMaxTax'))), lit(0)) });
    });
    q({ id: 'fed.excessSS', label: 'Excess Social Security Tax Credit', unit: 'usd', form: 'Schedule 3 Line 11', category: 'withholding', optional: true,
        expr: add(R('fed.excessSSTaxpayer'), R('fed.excessSSSpouse')) });
    q({ id: 'fed.medicareAndSeWages', label: 'Medicare Wages + SE Earnings', unit: 'usd', display: 'inline', expr: add(R('fed.medWages'), R('fed.seEarnings')) });
    q({ id: 'fed.excessMedicareWages', label: 'Wages Over Additional Medicare Threshold', unit: 'usd', category: 'medicare',
        expr: atLeast0(sub(R('fed.medicareAndSeWages'), P('fed.addlMedThreshold'))) });
    q({ id: 'fed.additionalMedicareTax', label: 'Additional Medicare Tax', unit: 'usd', form: 'Form 8959', category: 'medicare', optional: true,
        expr: round(mul(R('fed.excessMedicareWages'), P('fed.addlMedRate'))) });
    // Form 8959 Part V: Medicare tax withheld above the regular 1.45% is Additional Medicare Tax withholding (Line 25c).
    q({ id: 'fed.addlMedicareWithheld', label: 'Additional Medicare Tax Withheld', unit: 'usd', form: 'Form 8959 Line 24', category: 'withholding', optional: true,
        expr: round(sumOver('w2', when(gt(field('box5'), lit(0)), atLeast0(sub(field('box6'), mul(field('box5'), P('fed.medicareRate')))), lit(0)))) });
    q({ id: 'fed.netInvestmentIncome', label: 'Net Investment Income', unit: 'usd', category: 'capital',
        expr: atLeast0(add(R('in.interest'), R('fed.interest1099'), R('fed.dividends'), atLeast0(R('fed.capAllowed')), atLeast0(R('fed.rentalAllowed')))) });
    q({ id: 'fed.niitBase', label: 'NIIT Taxable Base', unit: 'usd', category: 'capital',
        expr: min(R('fed.netInvestmentIncome'), atLeast0(sub(R('fed.agi'), P('fed.niitThreshold')))) });
    q({ id: 'fed.niit', label: 'Net Investment Income Tax', unit: 'usd', form: 'Form 8960', category: 'tax', optional: true,
        expr: round(mul(R('fed.niitBase'), P('fed.niitRate'))) });
    q({ id: 'fed.amti', label: 'Alternative Minimum Taxable Income', unit: 'usd', form: 'Form 6251 Line 4', category: 'tax',
        // Form 6251: standard-deduction filers get no deduction against AMTI; itemizers keep everything except SALT.
        expr: atLeast0(sub(R('fed.agi'), when(gt(R('fed.itemizing'), num(0)), add(R('fed.medicalDeduction'), R('fed.mortgageDeduction'), R('fed.charityDeduction'), R('fed.gamblingLossDeduction')), lit(0)), R('fed.qbi'))) });
    q({ id: 'fed.amtExemptionAllowed', label: 'AMT Exemption After Phaseout', unit: 'usd', category: 'tax',
        expr: atLeast0(sub(P('fed.amtExemption'), mul(atLeast0(sub(R('fed.amti'), P('fed.amtPhaseStart'))), rate(0.25)))) });
    q({ id: 'fed.amtOrdinaryBase', label: 'AMT Base Excluding Preferential Income', unit: 'usd', display: 'inline',
        expr: atLeast0(sub(atLeast0(sub(R('fed.amti'), R('fed.amtExemptionAllowed'))), R('fed.preferentialIncome'))) });
    q({ id: 'fed.tentativeMinimumTax', label: 'Tentative Minimum Tax', unit: 'usd', form: 'Form 6251 Line 9', category: 'tax',
        expr: round(add(when(lte(R('fed.amtOrdinaryBase'), P('fed.amt28Breakpoint')), mul(R('fed.amtOrdinaryBase'), rate(0.26)), add(mul(P('fed.amt28Breakpoint'), rate(0.26)), mul(sub(R('fed.amtOrdinaryBase'), P('fed.amt28Breakpoint')), rate(0.28)))), R('fed.preferentialTax'))) });
    q({ id: 'fed.amt', label: 'Alternative Minimum Tax', unit: 'usd', form: 'Form 6251 Line 11', category: 'tax', optional: true,
        expr: when(gt(R('fed.amti'), P('fed.amtExemption')), atLeast0(round(sub(R('fed.tentativeMinimumTax'), R('fed.tax')))), lit(0)) });
    // Form 5329 line 4: 10%, or 25% for SIMPLE IRA distributions in the first 2 years of participation (code S).
    q({ id: 'fed.earlySimpleDistributions', label: 'Early SIMPLE IRA Distributions (First 2 Years)', unit: 'usd', display: 'inline', optional: true,
        expr: atLeast0(sub(each('src.r', 'taxable', 'simple'), each('src.r', 'penaltyException', 'simple'))) });
    q({ id: 'fed.earlyDistributionPenalty', label: 'Early Distribution Penalty', unit: 'usd', form: 'Form 5329', category: 'tax', optional: true,
        expr: round(add(mul(R('fed.earlyDistributions'), rate(0.1)), mul(R('fed.earlySimpleDistributions'), rate(0.15)))) });
    q({ id: 'fed.hsaExcise', label: '6% Excise on Excess HSA Contributions', unit: 'usd', form: 'Form 5329 Part VII', category: 'tax', optional: true,
        expr: round(mul(R('fed.hsaExcess'), rate(0.06))) });
    q({ id: 'fed.tipsFica', label: 'Unreported Tips FICA', unit: 'usd', form: 'Form 4137', category: 'tax', optional: true,
        expr: round(mul(R('in.tips'), rate(0.0765))) });
    q({ id: 'fed.otherTaxes', label: 'Other Taxes', unit: 'usd', form: 'Form 1040 Line 23', category: 'tax', optional: true,
        expr: round(add(R('fed.seTax'), R('fed.additionalMedicareTax'), R('fed.niit'), R('fed.amt'), R('fed.earlyDistributionPenalty'), R('fed.tipsFica'), R('fed.hsaExcise'), R('in.householdTax'))) });
    // ---------- Bottom line ----------
    q({ id: 'fed.totalTax', label: 'Total Tax', unit: 'usd', form: 'Form 1040 Line 24', category: 'tax',
        expr: round(add(atLeast0(sub(R('fed.tax'), R('fed.nonrefundableCredits'))), R('fed.otherTaxes'))) });
    q({ id: 'fed.payments', label: 'Total Payments', unit: 'usd', form: 'Form 1040 Line 33', category: 'withholding',
        expr: round(add(R('fed.w2Withholding'), R('fed.extraWithholding'), R('fed.addlMedicareWithheld'), R('in.estimatedPayments'), R('fed.refundableCredits'), R('fed.excessSS'))) });
    q({ id: 'fed.netResult', label: 'Payments Minus Tax', unit: 'usd', display: 'inline', expr: round(sub(R('fed.payments'), R('fed.totalTax'))) });
    q({ id: 'fed.refund', label: 'Refund', unit: 'usd', form: 'Form 1040 Line 34', category: 'refund',
        appliesWhen: gte(R('fed.netResult'), lit(0)), expr: round(sub(R('fed.payments'), R('fed.totalTax'))) });
    q({ id: 'fed.owed', label: 'Amount You Owe', unit: 'usd', form: 'Form 1040 Line 37', category: 'owed',
        appliesWhen: lt(R('fed.netResult'), lit(0)), expr: round(sub(R('fed.totalTax'), R('fed.payments'))) });
    // ---------- Form 2210 safe harbor (informational; the IRS computes any penalty) ----------
    q({ id: 'fed.priorYearSafeHarbor', label: "Prior-Year Safe Harbor (100%, or 110% if last year's AGI > $150,000)", unit: 'usd', display: 'inline',
        expr: mul(R('in.priorYearTax'), when(gt(R('in.priorYearAgi'), when(statusIs('married_separate'), lit(75000), lit(150000))), rate(1.1), rate(1))) });
    q({ id: 'fed.requiredAnnualPayment', label: 'Required Annual Payment', unit: 'usd', form: 'Form 2210 Line 9', category: 'withholding',
        appliesWhen: gt(R('in.priorYearTax'), lit(0)),
        expr: round(min(mul(sub(R('fed.totalTax'), R('fed.refundableCredits')), rate(0.9)), R('fed.priorYearSafeHarbor'))) });
    q({ id: 'fed.estimatedTaxShortfall', label: 'Withholding & Estimates Short of Safe Harbor (penalty may apply)', unit: 'usd', category: 'owed', optional: true,
        appliesWhen: and(gt(R('in.priorYearTax'), lit(0)), gte(sub(R('fed.totalTax'), R('fed.payments')), lit(1000))),
        expr: atLeast0(round(sub(R('fed.requiredAnnualPayment'), add(R('fed.w2Withholding'), R('fed.extraWithholding'), R('fed.addlMedicareWithheld'), R('in.estimatedPayments'), R('fed.excessSS'))))) });
    q({ id: 'fed.effectiveRate', label: 'Effective Tax Rate', unit: 'rate', category: 'tax',
        expr: when(gt(R('fed.totalIncome'), lit(0)), div(R('fed.totalTax'), R('fed.totalIncome')), rate(0)) });
}
/**
 * 1099-R box 7 codes (IRS Instructions for Forms 1099-R and 5329). A box can hold two codes ("1B", "7D").
 *  G, H — direct rollover: not taxable.   Q — qualified Roth distribution: not taxable.
 *  1, J, S — early distribution with no known exception: 10% additional tax (S: 25% from a SIMPLE IRA in its first 2 years).
 *  2, 3, 4, 7, T, B alone — exception applies / normal distribution: no additional tax.
 * Without a code, the rollover and Code 1 checkboxes decide.
 */
export function distributionCodeTreatment(s) {
    const codes = String(s.distributionCode || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!codes)
        return { rollover: Boolean(s.rollover), early: Boolean(s.earlyDistributionPenalty), simple: false, qualifiedRoth: false };
    const has = (c) => codes.includes(c);
    return { rollover: has('G') || has('H'), early: has('1') || has('J') || has('S'), simple: has('S'), qualifiedRoth: has('Q') };
}
/** Add every federal input, param and quantity to a graph. */
export function defineFederal(g, year) {
    defineInputs(g);
    defineParams(g);
    defineQuantities(g, year);
}
const cache = new Map();
/** The federal-only graph for a tax year (built once per year). */
export function federalGraph(year = 2024) {
    let g = cache.get(year);
    if (!g) {
        g = new FormulaGraph();
        defineFederal(g, year);
        cache.set(year, g);
    }
    return g;
}
/** Map the app's saved state onto graph inputs. Pure data copying — no tax logic. */
export function federalContext(state) {
    const w2s = state.w2s || [];
    const sources = state.otherIncome?.sources || [];
    const n = (v) => Number(v) || 0;
    const joint = normalizeFilingStatus(state.filingStatus || 'single') === 'married_joint' && state.filingStatus !== 'qualifying_surviving_spouse';
    const collections = {
        w2: w2s.map(w => {
            // Ownership only matters on a joint return; otherwise every W-2 is the taxpayer's.
            const spouse = w.owner === 'spouse' && joint;
            // Box 12 entries by code (data extraction from the four code/amount pairs).
            const box12 = ['a', 'b', 'c', 'd'].map(k => ({
                code: String(w[`box12${k}Code`] ?? (k === 'a' ? w.box12Code ?? '' : '')).trim().toUpperCase(),
                amount: n(w[`box12${k}Amount`] ?? (k === 'a' ? w.box12Amount : 0))
            }));
            const byCodes = (codes) => box12.filter(b => codes.includes(b.code)).reduce((sum, b) => sum + b.amount, 0);
            return { id: w.id, name: w.employer, values: { box1: n(w.box1), box2: n(w.box2), box3: n(w.box3), box4: n(w.box4), box5: n(w.box5), box6: n(w.box6),
                    box10: n(w.box10), employerHsa: byCodes(['W']), deferrals: byCodes(['D', 'E', 'F', 'G', 'H', 'S', 'AA', 'BB', 'EE']),
                    retirementPlanTaxpayer: w.box13Retirement && !spouse ? 1 : 0, retirementPlanSpouse: w.box13Retirement && spouse ? 1 : 0,
                    isTaxpayer: spouse ? 0 : 1, isSpouse: spouse ? 1 : 0 } };
        }),
        w2State: w2s.flatMap(w => (w.states || []).map(s => ({
            id: w.id * 1000 + s.id,
            name: (s.state || '').toUpperCase(),
            values: { stateWages: n(s.stateWages), withheld: n(s.stateTaxWithheld), localWithheld: n(s.localTaxWithheld) }
        })))
    };
    collections.dep = (d0 => (d0.list || []).map(dp => ({
        id: dp.id, name: dp.name,
        values: { birthYear: n(dp.birthYear), isChild: dp.relationship === 'relative' ? 0 : 1, monthsLived: n(dp.monthsLived),
            student: dp.student ? 1 : 0, disabled: dp.disabled ? 1 : 0, hasSsn: dp.hasSsn === false ? 0 : 1 }
    })))(state.dependents || {});
    SOURCE_COLLECTIONS.forEach(c => {
        collections[c.id] = sources.filter(s => c.type.includes(s.type)).map(s => {
            const r = distributionCodeTreatment(s);
            return {
                id: s.id,
                name: s.payer,
                values: {
                    amount: n(s.amount),
                    accrued: n(s.accruedInterestPaid),
                    taxExempt: n(s.taxExemptInterest),
                    treasury: n(s.usTreasuryInterest),
                    inStateExempt: n(s.inStateTaxExemptInterest),
                    stateRefund: n(s.stateRefund),
                    priorItemizedExcess: n(s.priorItemizedExcess),
                    qdiv: n(s.qualifiedDividends),
                    capGainDist: n(s.capitalGainDistributions),
                    // 1099-R: box 2a taxable amount (box 1 gross if not determined); rollovers are not taxable.
                    taxable: r.qualifiedRoth ? 0 : s.taxableAmount !== undefined && s.taxableAmount !== null && String(s.taxableAmount) !== '' ? n(s.taxableAmount) : n(s.amount),
                    nonRollover: r.rollover ? 0 : 1,
                    penaltyException: n(s.penaltyExceptionAmount),
                    fedWithheld: n(s.federalTaxWithheld),
                    penalty: r.early && !r.rollover ? 1 : 0,
                    simple: r.early && r.simple && !r.rollover ? 1 : 0,
                    isSpouse: joint && s.owner === 'spouse' ? 1 : 0
                }
            };
        });
    });
    const o = state.otherIncome || {};
    const a = state.adjustments || {};
    const i = state.itemizedDeductions || {};
    const d = state.dependents || {};
    const int = (v) => parseInt(String(v), 10) || 0;
    return {
        year: state.year || 2024,
        status: normalizeFilingStatus(state.filingStatus || 'single'),
        flags: {
            'fed.forceItemized': state.deductionMethod === 'itemized',
            'fed.homeSaleQualifies': Boolean(state.otherIncome?.capitalGains?.homeSaleQualifies),
            'fed.homeSaleSpouseQualifies': Boolean(state.otherIncome?.capitalGains?.homeSaleSpouseQualifies),
            'fed.forceStandard': state.deductionMethod === 'standard',
            'fed.claimedAsDependent': Boolean(state.claimedAsDependent),
            // QSS uses joint brackets but is not a joint return (no spouse on the return).
            'fed.jointReturn': state.filingStatus === 'married_joint',
            'fed.hsaFamily': state.adjustments?.hsaCoverage === 'family',
            'fed.hsaCatchUp': Boolean(state.adjustments?.hsaCatchUp),
            'fed.iraCatchUp': Boolean(state.adjustments?.iraCatchUp),
            'fed.livedApart': Boolean(state.livedApartFromSpouse) && state.filingStatus === 'married_separate',
            'fed.taxpayerBlind': Boolean(state.taxpayer?.blind),
            'fed.mortgageGrandfathered': Boolean(state.itemizedDeductions?.mortgageGrandfathered),
            'fed.bothEducators': Boolean(state.adjustments?.bothEducators) && state.filingStatus === 'married_joint',
            'fed.spouseItemizes': Boolean(state.spouseItemizes) && state.filingStatus === 'married_separate',
            'fed.spouseBlind': Boolean(state.spouse?.blind)
        },
        collections,
        inputs: {
            'in.interest': n(o.interest),
            'in.schedCExpenses': n(o.scheduleCExpenses),
            'in.stGain': n(o.capitalGains?.shortTerm),
            'in.ltGain': n(o.capitalGains?.longTerm),
            'in.capCarryover': n(o.capitalGains?.carryoverLoss),
            'in.collectibles': n(o.capitalGains?.collectiblesGain),
            'in.unrecap1250': n(o.capitalGains?.unrecaptured1250Gain),
            'in.homeSaleGain': n(o.capitalGains?.homeSaleGain),
            'in.rents': n(o.scheduleERental?.grossRents),
            'in.rentalExpenses': n(o.scheduleERental?.expenses),
            'in.rentalDepreciation': n(o.scheduleERental?.depreciation),
            'in.alimonyReceived': n(o.alimonyReceived),
            'in.feie': n(o.foreignEarnedIncomeExclusion),
            'in.tips': n(o.unreportedTips),
            'in.studentLoan': n(a.studentLoan),
            'in.ira': n(a.ira),
            'in.spouseIra': joint ? n(a.spouseIra) : 0,
            'in.hsa': n(a.hsa),
            'in.educator': n(a.educatorExpenses),
            'in.seRetirement': n(a.seRetirement),
            'in.seHealth': n(a.seHealthInsurance),
            'in.alimonyPaid': n(a.alimonyPaid),
            'in.militaryMoving': n(a.militaryMoving),
            'in.earlyWithdrawal': n(a.earlyWithdrawalPenalty),
            'in.juryDuty': n(a.juryDutyPay),
            'in.qualifiedTips': n(a.qualifiedTips),
            'in.qualifiedOvertime': n(a.qualifiedOvertime),
            'in.carLoanInterest': n(a.carLoanInterest),
            'in.seniors': int(d.seniorsCount),
            'in.taxpayerBirthYear': int(state.taxpayer?.birthYear),
            'in.spouseBirthYear': int(state.spouse?.birthYear),
            'in.priorYearTax': n(state.priorYearTax),
            'in.priorYearAgi': n(state.priorYearAgi),
            'in.medical': n(i.medicalExpenses),
            'in.realEstateTax': n(i.realEstateTax),
            'in.mortgage': n(i.mortgageInterest),
            'in.charity': n(i.charity),
            'in.gamblingLosses': n(i.gamblingLosses),
            'in.investmentInterest': n(i.investmentInterest),
            'in.casualty': n(i.casualtyLoss),
            'in.otherSaltIncomeTax': n(i.otherStateLocalIncomeTax),
            'in.personalPropertyTax': n(i.personalPropertyTax),
            'in.salesTax': n(i.salesTax),
            'in.charityNoncash': n(i.charityNoncash),
            'in.mortgageBalance': n(i.mortgageBalance),
            'in.children': int(d.childrenCount),
            'in.otherDependents': int(d.otherDependentsCount),
            'in.age65Blind': int(d.age65OrBlindCount),
            'in.childCare': n(d.childCareExpenses),
            'in.aotc': n(d.educationExpensesAotc),
            'in.llc': n(d.educationExpensesLlc),
            'in.foreignTaxCredit': n(d.foreignTaxCredit),
            'in.cleanEnergy': n(d.cleanEnergyCredit),
            'in.adoption': n(d.adoptionCredit),
            'in.elderly': n(d.elderlyDisabledCredit),
            'in.ptc': n(d.premiumTaxCredit),
            'in.householdTax': n(d.householdEmploymentTax),
            'in.estimatedPayments': n(d.estimatedTaxPayments)
        }
    };
}
/** How federal quantities are grouped into calculation cards. Presentation only — no math. */
export const FEDERAL_BLOCKS = [
    { id: 'calc-total-w2-wages', stepLabel: 'Step 1 • Wage & Payroll Aggregation', title: 'W-2 Wages, Withholding & FICA',
        quantities: [{ id: 'fed.wages', show: 'always' }, 'fed.w2Withholding', 'fed.ssTaxWithheld', 'fed.medTaxWithheld', 'fed.ficaWithheld'] },
    { id: 'calc-capital-gains', stepLabel: 'Step 2a • Schedule D / Form 8949', title: 'Capital Gains & Loss Limitation',
        quantities: ['fed.homeSaleExclusion', 'fed.homeSaleTaxableGain', 'fed.capGainDistributions', 'fed.capNet', 'fed.capAllowed', 'fed.capLossCarryforward'] },
    { id: 'calc-schedule-e', stepLabel: 'Step 2b • Schedule E / Form 8582', title: 'Rental Real Estate & K-1 Income',
        quantities: ['fed.rentalNet', 'fed.suspendedRentalLoss', 'fed.rentalAllowed', 'fed.k1Income'] },
    { id: 'calc-agi', stepLabel: 'Step 3 • Gross Income, Adjustments & AGI', title: 'Total Income & Adjusted Gross Income (AGI)',
        quantities: ['fed.interestTotal', 'fed.taxExemptInterest', 'fed.dividends', 'fed.qualifiedDividends', 'fed.businessProfit', 'fed.retirement',
            'fed.gambling', 'fed.otherSourceIncome', 'fed.taxableStateRefund', 'fed.ssaGross', 'fed.provisionalIncome', 'fed.taxableSS',
            'fed.depCareTaxable', { id: 'fed.totalIncome', show: 'always' }, 'fed.seRetirementLimit', 'fed.seRetirementDeduction', 'fed.seHealthDeduction', 'fed.hsaLimit', 'fed.hsaDeduction', 'fed.iraMagi', 'fed.iraDeductibleLimit', 'fed.taxpayerIraDeduction', 'fed.spouseIraContributionLimit', 'fed.spouseIraDeduction', 'fed.iraDeduction',
            'fed.studentLoanMagi', 'fed.studentLoanDeduction', { id: 'fed.adjustments', show: 'always' },
            { id: 'fed.agi', show: 'always' }] },
    { id: 'calc-itemized-deductions', stepLabel: 'Step 4a • Schedule A Itemized Deductions', title: 'Itemized Deductions (Medical 7.5% Floor & SALT Cap)',
        quantities: ['fed.medicalFloor', 'fed.medicalDeduction', 'fed.saltCap', 'fed.salt', 'fed.mortgageDeduction', 'fed.charityDeduction', 'fed.charityCarryforward', 'fed.casualtyDeduction', 'fed.gamblingLossDeduction', 'fed.investmentInterestDeduction', 'fed.itemized'] },
    { id: 'calc-taxable-income', stepLabel: 'Step 4 • Deductions & Taxable Income', title: 'Deduction & Taxable Income',
        quantities: ['fed.taxpayerAge', 'fed.spouseAge', 'fed.age65BlindBoxes', { id: 'fed.stdDeduction', show: 'always' }, { id: 'fed.deduction', show: 'always' }, 'fed.qbiIncome', 'fed.qbiIncomeLimit', 'fed.qbi',
            'fed.tipsDeduction', 'fed.overtimeDeduction', 'fed.carLoanDeduction', 'fed.seniorDeduction', 'fed.sched1a',
            { id: 'fed.taxableIncome', show: 'always' }] },
    { id: 'calc-tax-before-credits', stepLabel: 'Step 5 • Tax Brackets', title: 'Federal Income Tax (Before Credits)',
        quantities: ['fed.netLtcg', 'fed.preferentialIncome', 'fed.ordinaryTaxable', 'fed.ordinaryTaxRow', 'fed.ordinaryTax', 'fed.standardPrefTax', 'fed.unrecap1250Tax',
            'fed.collectiblesTax', 'fed.regularTaxRow', 'fed.regularTax', { id: 'fed.tax', show: 'always' }] },
    { id: 'calc-total-credits', stepLabel: 'Step 6 • Tax Credits', title: 'Nonrefundable & Refundable Credits',
        quantities: ['fed.ctcChildren', 'fed.odcDependents', 'fed.eitcChildren', 'fed.careQualifyingPersons', 'fed.depCareExcluded', 'fed.ctcPhaseout', 'fed.childCreditsAfterPhaseout', 'fed.ctcAfterPhaseout', 'fed.odcAfterPhaseout', 'fed.careEarnedIncomeLimit', 'fed.childCareCredit', 'fed.aotcTotal',
            'fed.educationNonrefundable', 'fed.saversContributions', 'fed.saversCredit', 'fed.adoptionAllowed', 'fed.adoptionRefundable', 'fed.nonrefundableBeforeLimit', 'fed.nonrefundableCredits', 'fed.earnedIncome', 'fed.actc',
            'fed.eitcEarnedRow', 'fed.eitcIncomeRow', 'fed.eitc', 'fed.aotcRefundable', 'fed.refundableCredits'] },
    { id: 'calc-other-taxes', stepLabel: 'Step 7 • Schedule 2 & 3 Other Taxes', title: 'Self-Employment Tax, NIIT & Other Taxes',
        quantities: ['fed.seEarnings', 'fed.seSsTax', 'fed.seMedTax', 'fed.seTax', 'fed.halfSeTax', 'fed.excessMedicareWages', 'fed.additionalMedicareTax',
            'fed.netInvestmentIncome', 'fed.niitBase', 'fed.niit', 'fed.amt', 'fed.earlyDistributionPenalty', 'fed.hsaExcise', 'fed.tipsFica', 'fed.otherTaxes', 'fed.excessSS'] },
    { id: 'calc-final-verdict', stepLabel: 'Step 8 • Federal Bottom Line', title: 'Total Tax, Payments & Federal Refund / Owed', isOutput: true,
        quantities: [{ id: 'fed.totalTax', show: 'always' }, 'fed.addlMedicareWithheld', { id: 'fed.payments', show: 'always' }, 'fed.requiredAnnualPayment', 'fed.estimatedTaxShortfall', { id: 'fed.refund', show: 'always' }, { id: 'fed.owed', show: 'always' }] }
];
export const FEDERAL_AUTO_PANELS = [
    { id: 'auto-fed-std-deduction', quantity: 'fed.stdDeduction', section: 'itemized', show: 'always', title: 'Federal Standard Deduction',
        officialTitle: 'Form 1040 Line 12', badge: 'Auto-Calculated',
        shortExplanation: 'Granted automatically from your filing status, tax year and age 65+/blind boxes; compared against your itemized deductions.' },
    { id: 'auto-fed-half-se', quantity: 'fed.halfSeTax', section: 'adjustments', title: '½ Self-Employment Tax Deduction',
        officialTitle: 'Schedule 1 Line 15 • Deductible Part of SE Tax', badge: 'Auto-Calculated',
        shortExplanation: 'Half of your self-employment tax is deducted automatically when computing AGI.' },
    { id: 'auto-fed-qbi', quantity: 'fed.qbi', section: 'itemized', title: '20% QBI Deduction',
        officialTitle: 'Form 8995 • Form 1040 Line 13', badge: 'Auto-Calculated',
        shortExplanation: 'Up to 20% of qualified Schedule C / K-1 business income is deducted automatically.' },
    { id: 'auto-fed-savers-credit', quantity: 'fed.saversCredit', section: 'credits', title: "Saver's Credit",
        officialTitle: 'Form 8880 • Retirement Savings Contributions Credit', badge: 'Auto-Calculated',
        shortExplanation: 'Triggered automatically by your IRA contribution when your AGI qualifies.' },
    { id: 'auto-fed-actc', quantity: 'fed.actc', section: 'credits', title: 'Additional Child Tax Credit (Refundable)',
        officialTitle: 'Schedule 8812 • Form 1040 Line 28', badge: 'Refundable • Auto',
        shortExplanation: 'Refunds the part of your Child Tax Credit that exceeds your tax, based on earned income above $2,500.' },
    { id: 'auto-fed-eitc', quantity: 'fed.eitc', section: 'credits', title: 'Earned Income Tax Credit (EITC)',
        officialTitle: 'Schedule EIC • Form 1040 Line 27', badge: 'Refundable • Auto',
        shortExplanation: 'Refundable credit for low-to-moderate earned income, computed automatically.' },
    { id: 'auto-fed-excess-ss', quantity: 'fed.excessSS', section: 'credits', title: 'Excess Social Security Tax Credit',
        officialTitle: 'Schedule 3 Line 11 • Multi-Employer Over-Withholding', badge: 'Refundable • Auto',
        shortExplanation: 'Credits Social Security tax withheld above the annual maximum when you had 2+ employers.' }
];
