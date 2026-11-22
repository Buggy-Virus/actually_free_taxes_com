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
import { recordDomId } from '../record-kinds.js';
const rules = (year) => TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];
/** Pick a value by tax year (2024, 2025, 2026+). */
const Y = (year, v2024, v2025, v2026) => (year >= 2026 ? v2026 : year >= 2025 ? v2025 : v2024);
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
        const k1f = (key, label) => ({ label: `${c.label} ${label}`, unit: 'usd', optional: true, panelKey: c.panelKey, panelSection: 'other-income',
            domId: (it) => `input-source-${it.id}-${key}` });
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
                isSpouse: { label: `${c.label} Belongs to Spouse`, unit: 'count', optional: true, domId: (it) => `input-source-${it.id}-owner` },
                k1Rental: { ...k1f('k1Rental', 'Box 2 Rental Real Estate'), allowNegative: true }, k1Guaranteed: k1f('k1Guaranteed', 'Box 4 Guaranteed Payments'),
                k1Interest: k1f('k1Interest', 'Box 5 Interest'), k1Dividends: k1f('k1Dividends', 'Box 6a Dividends'), k1QualDiv: k1f('k1QualifiedDividends', 'Box 6b Qualified Dividends'),
                k1St: { ...k1f('k1ShortTermGain', 'Box 8 Short-Term Gain'), allowNegative: true }, k1Lt: { ...k1f('k1LongTermGain', 'Box 9a Long-Term Gain'), allowNegative: true },
                k1Se: k1f('k1SeEarnings', 'Box 14A SE Earnings'), passive: { label: `${c.label} Passive Activity`, unit: 'count', optional: true, domId: (it) => `input-source-${it.id}-passive` }
            }
        });
    });
    // Repeating records (businesses, Form 8949 sales, rentals, Form 1095-A)
    const rf = (kind, key, label, unit = 'usd', domKey = key) => ({ label, unit, optional: true, domId: (it) => recordDomId(kind, it.id, domKey) });
    g.collection({ id: 'biz', itemLabel: (_i, it) => `${it.name || 'Business'}:`, fields: {
            receipts: rf('biz', 'receipts', 'Gross Receipts'), advertising: rf('biz', 'advertising', 'Advertising'), supplies: rf('biz', 'supplies', 'Supplies'),
            insurance: rf('biz', 'insurance', 'Insurance'), utilities: rf('biz', 'utilities', 'Utilities'), rentLease: rf('biz', 'rentLease', 'Rent / Lease'),
            legal: rf('biz', 'legalProfessional', 'Legal & Professional'), other: rf('biz', 'otherExpenses', 'Other Expenses'), meals: rf('biz', 'meals', 'Meals'),
            miles: rf('biz', 'vehicleMiles', 'Business Miles', 'count'), sqft: rf('biz', 'homeOfficeSqFt', 'Home Office Sq Ft', 'count'),
            isSpouse: rf('biz', 'owner', "Spouse's Business", 'count')
        } });
    g.collection({ id: 'tx', itemLabel: (_i, it) => `${it.name || 'Sale'}:`, fields: {
            proceeds: rf('tx', 'proceeds', 'Proceeds'), basis: rf('tx', 'basis', 'Cost Basis'), adj: { ...rf('tx', 'adjustment', 'Adjustment'), allowNegative: true },
            isLong: rf('tx', 'term', 'Long-Term', 'count')
        } });
    g.collection({ id: 'rent', itemLabel: (_i, it) => `${it.name || 'Property'}:`, fields: {
            rents: rf('rent', 'rents', 'Rents'), expenses: rf('rent', 'expenses', 'Expenses'), depreciation: rf('rent', 'depreciation', 'Depreciation Entered'),
            basis: rf('rent', 'buildingBasis', 'Building Basis'), pisYear: rf('rent', 'placedInServiceYear', 'Year Placed in Service', 'count'),
            pisMonth: rf('rent', 'placedInServiceMonth', 'Month Placed in Service', 'count'), rentalDays: rf('rent', 'rentalDays', 'Days Rented', 'count'),
            personalDays: rf('rent', 'personalDays', 'Personal-Use Days', 'count')
        } });
    g.collection({ id: 'mkt', itemLabel: (i) => `1095-A #${i + 1}:`, fields: {
            premiums: rf('mkt', 'premiums', 'Enrollment Premiums'), slcsp: rf('mkt', 'slcsp', 'SLCSP Premium'), aptc: rf('mkt', 'advancePtc', 'Advance PTC')
        } });
    // Carryovers from last year (A5)
    const co = (id, label, key) => io(id, label, `input-carryover-${key}`, 'prior-year-carryovers', 'other-income', { optional: true });
    co('in.ltCapCarryover', 'Long-Term Capital Loss Carryover', 'lt-capital');
    co('in.palCarryover', 'Prior-Year Unallowed Passive (Rental) Loss', 'passive');
    co('in.charityCarryover', 'Charitable Contribution Carryover', 'charity');
    co('in.invInterestCarryover', 'Investment Interest Carryover', 'investment-interest');
    co('in.nolCarryover', 'Net Operating Loss Carryover', 'nol');
    co('in.amtCreditCarryover', 'Prior-Year Minimum Tax Credit (Form 8801)', 'amt-credit');
    co('in.ftcCarryover', 'Foreign Tax Credit Carryover', 'foreign-tax');
    co('in.qbiLossCarryover', 'Qualified Business Loss Carryforward', 'qbi-loss');
    co('in.sec179Carryover', 'Section 179 Carryover', 'section-179');
    io('in.ptcHouseholdSize', 'Form 8962 Family Size', 'input-ptc-household-size', 'cred-1095a', 'credits', { unit: 'count', optional: true });
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
    io('in.foreignTaxCredit', 'Foreign Taxes Paid', 'input-foreign-tax-credit', 'cred-foreign-tax', 'credits', { optional: true });
    io('in.foreignIncome', 'Foreign-Source Taxable Income', 'input-foreign-source-income', 'cred-foreign-tax', 'credits', { optional: true });
    io('in.cleanEnergy', 'Clean Energy Credit', 'input-clean-energy-credit', 'cred-clean-energy', 'credits', { optional: true });
    io('in.adoption', 'Qualified Adoption Expenses', 'input-adoption-credit', 'cred-adoption', 'credits', { optional: true });
    io('in.elderly', 'Elderly / Disabled Credit', 'input-elderly-credit', 'cred-elderly-sched-r', 'credits', { optional: true });
    io('in.ptc', 'Net Premium Tax Credit', 'input-ptc-credit', 'cred-ptc-8962', 'credits', { optional: true });
    io('in.householdTax', 'Household Employment Taxes', 'input-household-tax', 'sched-h-household', 'credits', { optional: true });
    io('in.householdWages', 'Cash Wages Paid to Household Employee', 'input-household-wages', 'sched-h-household', 'credits', { optional: true });
    io('in.estimatedPayments', 'Estimated Tax Payments', 'input-estimated-payments', 'cred-estimated-payments', 'credits', { optional: true });
}
function defineParams(g) {
    const p = (id, label, unit, resolve, source, domSources = YEAR_STATUS) => g.param({ id, label, unit, resolve, source, domSources });
    p('fed.stdBase', 'Base Standard Deduction', 'usd', c => rules(c.year).standardDeduction[c.status], 'Form 1040 Line 12 instructions');
    p('fed.addlStdPerBox', 'Additional Standard Deduction per Box', 'usd', c => (c.status === 'single' || c.status === 'head_of_household') ? Y(c.year, 1950, 2000, 2050) : Y(c.year, 1550, 1600, 1650), 'IRC §63(f); Rev. Proc. 2025-32 §4.14(3)');
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
    p('fed.educatorCap', 'Educator Expense Cap (per educator)', 'usd', c => Y(c.year, 300, 300, 350), 'IRC §62(a)(2)(D); Rev. Proc. 2025-32 §4.12', ['select-tax-year']);
    p('fed.saltCapBase', 'SALT Cap', 'usd', c => Y(c.year, 10000, 40000, 40400) / (c.status === 'married_separate' ? 2 : 1), 'IRC §164(b)(6) as amended by P.L. 119-21', YEAR_STATUS);
    p('fed.saltPhaseStart', 'SALT Cap Phase-Down Threshold (MAGI)', 'usd', c => Y(c.year, 500000, 500000, 505000) / (c.status === 'married_separate' ? 2 : 1), 'IRC §164(b)(7) (+1% a year 2026–2029)', YEAR_STATUS);
    p('fed.saltFloor', 'SALT Cap Minimum', 'usd', c => (c.status === 'married_separate' ? 5000 : 10000), 'IRC §164(b)(7)', ['select-filing-status']);
    p('fed.slPhaseStart', 'Student Loan Interest Phase-Out Start (MAGI)', 'usd', c => (c.status === 'married_joint' ? Y(c.year, 165000, 170000, 175000) : Y(c.year, 80000, 85000, 85000)), 'Pub. 970 ch. 4; Rev. Proc. 2025-32 §4.29', YEAR_STATUS);
    p('fed.slPhaseRange', 'Student Loan Interest Phase-Out Range', 'usd', c => (c.status === 'married_joint' ? 30000 : 15000), 'Pub. 970 ch. 4', ['select-filing-status']);
    p('fed.medicareRate', 'Medicare Employee Rate', 'rate', c => rules(c.year).medicareRate, 'IRC §3101(b)(1)', []);
    p('fed.taxYear', 'Tax Year', 'count', c => c.year, 'Form 1040', ['select-tax-year']);
    p('fed.electiveDeferralLimit', 'Elective Deferral Limit', 'usd', c => Y(c.year, 23000, 23500, 24500), 'IRC §402(g)', ['select-tax-year']);
    p('fed.annualAdditionsCap', 'Annual Additions Limit', 'usd', c => Y(c.year, 69000, 70000, 72000), 'IRC §415(c)', ['select-tax-year']);
    p('fed.dependentStdMin', 'Dependent Standard Deduction Minimum', 'usd', c => (c.year >= 2025 ? 1350 : 1300), 'IRC §63(c)(5)', ['select-tax-year']);
    g.param({ id: 'fed.hsaLimitSelf', label: 'HSA Limit (Self-Only)', unit: 'usd', source: 'Rev. Proc. 2023-23 / 2024-25 / 2025-19', domSources: ['select-tax-year'], resolve: c => Y(c.year, 4150, 4300, 4400) });
    g.param({ id: 'fed.hsaLimitFamily', label: 'HSA Limit (Family)', unit: 'usd', source: 'Rev. Proc. 2023-23 / 2024-25 / 2025-19', domSources: ['select-tax-year'], resolve: c => Y(c.year, 8300, 8550, 8750) });
    p('fed.iraLimit', 'IRA Contribution Limit', 'usd', c => Y(c.year, 7000, 7000, 7500), 'IRC §219(b)(5); Notice 2025-67', ['select-tax-year']);
    p('fed.iraCatchUpAmount', 'IRA Catch-Up (age 50+)', 'usd', c => Y(c.year, 1000, 1000, 1100), 'IRC §219(b)(5)(B); Notice 2025-67', ['select-tax-year']);
    p('fed.iraPhaseStartCovered', 'IRA Phase-Out Start (covered by workplace plan)', 'usd', c => (c.status === 'married_joint' ? Y(c.year, 123000, 126000, 129000) : c.status === 'married_separate' ? 0 : Y(c.year, 77000, 79000, 81000)), 'Pub. 590-A; IR-2025-111', YEAR_STATUS);
    p('fed.iraPhaseRangeCovered', 'IRA Phase-Out Range (covered)', 'usd', c => (c.status === 'married_joint' ? 20000 : 10000), 'Pub. 590-A', ['select-filing-status']);
    p('fed.iraPhaseStartSpouse', 'IRA Phase-Out Start (spouse covered)', 'usd', c => Y(c.year, 230000, 236000, 242000), 'Pub. 590-A', ['select-tax-year']);
    p('fed.tipsOvertimePhaseStart', 'Tips/Overtime Phase-Out Start (MAGI)', 'usd', c => (c.status === 'married_joint' ? 300000 : 150000), 'IRC §224, §225', ['select-filing-status']);
    p('fed.overtimeCap', 'Overtime Deduction Cap', 'usd', c => (c.status === 'married_joint' ? 25000 : 12500), 'IRC §225', ['select-filing-status']);
    p('fed.carLoanPhaseStart', 'Car Loan Interest Phase-Out Start (MAGI)', 'usd', c => (c.status === 'married_joint' ? 200000 : 100000), 'IRC §163(h)(4)', ['select-filing-status']);
    p('fed.seniorPhaseStart', 'Senior Deduction Phase-Out Start (MAGI)', 'usd', c => (c.status === 'married_joint' ? 150000 : 75000), 'IRC §151(d)(5)', ['select-filing-status']);
    p('fed.feieLimit', 'Foreign Earned Income Exclusion Limit', 'usd', c => Y(c.year, 126500, 130000, 132900), 'Form 2555', ['select-tax-year']);
    p('fed.palAllowance', 'Rental Loss Allowance', 'usd', c => (c.status === 'married_separate' ? 12500 : 25000), 'Form 8582', ['select-filing-status']);
    p('fed.palPhaseStart', 'Rental Allowance Phaseout Start', 'usd', c => (c.status === 'married_separate' ? 50000 : 100000), 'Form 8582', ['select-filing-status']);
    p('fed.ssBase1', 'Social Security Base Amount', 'usd', c => byStatus({ married_joint: 32000, married_separate: 0, other: 25000 })(c.status), 'SS Benefits Worksheet', ['select-filing-status']);
    p('fed.ssBase2', 'Social Security Adjusted Base', 'usd', c => byStatus({ married_joint: 44000, married_separate: 0, other: 34000 })(c.status), 'SS Benefits Worksheet', ['select-filing-status']);
    p('fed.eduPhaseStart', 'Education Credit Phaseout Start', 'usd', c => (c.status === 'married_joint' ? 160000 : 80000), 'Form 8863', ['select-filing-status']);
    p('fed.eduPhaseSpan', 'Education Credit Phaseout Range', 'usd', c => (c.status === 'married_joint' ? 20000 : 10000), 'Form 8863', ['select-filing-status']);
    p('fed.saversMax', "Saver's Credit Contribution Cap", 'usd', c => (c.status === 'married_joint' ? 4000 : 2000), 'Form 8880', ['select-filing-status']);
    const savers = (y) => y >= 2026
        ? { t50: { married_joint: 48500, head_of_household: 36375, other: 24250 }, t20: { married_joint: 52500, head_of_household: 39375, other: 26250 }, t10: { married_joint: 80500, head_of_household: 60375, other: 40250 } }
        : y >= 2025
            ? { t50: { married_joint: 47500, head_of_household: 35625, other: 23750 }, t20: { married_joint: 51000, head_of_household: 38250, other: 25500 }, t10: { married_joint: 79000, head_of_household: 59250, other: 39500 } }
            : { t50: { married_joint: 46000, head_of_household: 34500, other: 23000 }, t20: { married_joint: 50000, head_of_household: 37500, other: 25000 }, t10: { married_joint: 76500, head_of_household: 57375, other: 38250 } };
    p('fed.saversT50', "Saver's Credit 50% AGI Limit", 'usd', c => byStatus(savers(c.year).t50)(c.status), 'Form 8880', YEAR_STATUS);
    p('fed.saversT20', "Saver's Credit 20% AGI Limit", 'usd', c => byStatus(savers(c.year).t20)(c.status), 'Form 8880', YEAR_STATUS);
    p('fed.saversT10', "Saver's Credit 10% AGI Limit", 'usd', c => byStatus(savers(c.year).t10)(c.status), 'Form 8880', YEAR_STATUS);
    p('fed.householdWageThreshold', 'Household Employee FICA Threshold', 'usd', c => Y(c.year, 2700, 2800, 3000), 'Schedule H line A; SSA', ['select-tax-year']);
    p('fed.mileageRate', 'Business Standard Mileage Rate', 'rate', c => Y(c.year, 0.67, 0.70, 0.725), 'Notice 2024-08 / 2025-5 / 2026-10', ['select-tax-year']);
    // Form 8962 Tables 1-1 to 1-3: the prior year's HHS poverty guidelines (2023 for 2024 returns, 2024 for 2025, 2025 for 2026).
    p('fed.fplBase', 'Poverty Line, 1 Person (48 States & DC)', 'usd', c => Y(c.year, 14580, 15060, 15650), 'Form 8962 instructions Table 1-1; HHS', ['select-tax-year']);
    p('fed.fplAdd', 'Poverty Line, Each Additional Person', 'usd', c => Y(c.year, 5140, 5380, 5500), 'Form 8962 instructions Table 1-1; HHS', ['select-tax-year']);
    p('fed.fplBaseAK', 'Poverty Line, 1 Person (Alaska)', 'usd', c => Y(c.year, 18210, 18810, 19550), 'Form 8962 instructions Table 1-2; HHS', ['select-tax-year']);
    p('fed.fplAddAK', 'Poverty Line, Each Additional Person (Alaska)', 'usd', c => Y(c.year, 6430, 6730, 6880), 'Form 8962 instructions Table 1-2; HHS', ['select-tax-year']);
    p('fed.fplBaseHI', 'Poverty Line, 1 Person (Hawaii)', 'usd', c => Y(c.year, 16770, 17310, 17990), 'Form 8962 instructions Table 1-3; HHS', ['select-tax-year']);
    p('fed.fplAddHI', 'Poverty Line, Each Additional Person (Hawaii)', 'usd', c => Y(c.year, 5910, 6190, 6330), 'Form 8962 instructions Table 1-3; HHS', ['select-tax-year']);
    p('fed.adoptionCap', 'Adoption Credit Limit', 'usd', c => Y(c.year, 16810, 17280, 17670), 'Form 8839', ['select-tax-year']);
    p('fed.adoptionPhaseStart', 'Adoption Credit Phase-Out Start (MAGI)', 'usd', c => Y(c.year, 252150, 259190, 265080), 'Form 8839 line 7; Rev. Proc. 2023-34 / 2024-40 / 2025-32', ['select-tax-year']);
    p('fed.adoptionRefundableMax', 'Refundable Adoption Credit Limit', 'usd', c => Y(c.year, 0, 5000, 5120), 'P.L. 119-21 §70402', ['select-tax-year']);
    p('fed.eitcInvCap', 'EITC Investment Income Limit', 'usd', c => Y(c.year, 11600, 11950, 12200), 'Schedule EIC', ['select-tax-year']);
    p('fed.eitcMax', 'EITC Maximum Credit', 'usd', c => Y(c.year, [632, 4213, 6960, 7830], [649, 4328, 7152, 8046], [664, 4427, 7316, 8231]), 'Rev. Proc. 2023-34 / 2024-40 / 2025-32', ['select-tax-year']);
    p('fed.eitcPhaseInRate', 'EITC Phase-In Rate', 'rate', () => [0.0765, 0.34, 0.40, 0.45], 'Schedule EIC', []);
    p('fed.eitcPhaseOutRate', 'EITC Phase-Out Rate', 'rate', () => [0.0765, 0.1598, 0.2106, 0.2106], 'Schedule EIC', []);
    p('fed.eitcIncomeLimit', 'EITC Income Limit', 'usd', c => c.year >= 2026
        ? (c.status === 'married_joint' ? [26820, 58863, 65899, 70244] : [19540, 51593, 58629, 62974])
        : c.year >= 2025
            ? (c.status === 'married_joint' ? [26214, 57554, 64430, 68675] : [19104, 50434, 57310, 61555])
            : (c.status === 'married_joint' ? [25511, 56004, 62688, 66819] : [18591, 49084, 55768, 59899]), 'Rev. Proc. 2023-34 / 2024-40', YEAR_STATUS);
    p('fed.amtExemption', 'AMT Exemption', 'usd', c => byStatus({ married_joint: Y(c.year, 133300, 137000, 140200), married_separate: Y(c.year, 66650, 68500, 70100), other: Y(c.year, 85700, 88100, 90100) })(c.status), 'Form 6251');
    p('fed.amtPhaseStart', 'AMT Exemption Phaseout Start', 'usd', c => (c.status === 'married_joint' ? Y(c.year, 1218700, 1252700, 1000000) : Y(c.year, 609350, 626350, 500000)), 'Form 6251; P.L. 119-21 §70107');
    p('fed.amtPhaseRate', 'AMT Exemption Phase-Out Rate', 'rate', c => Y(c.year, 0.25, 0.25, 0.5), 'IRC §55(d)(3) as amended by P.L. 119-21', ['select-tax-year']);
    p('fed.amt28Breakpoint', 'AMT 28% Rate Breakpoint', 'usd', c => Y(c.year, 232600, 239100, 244500) / (c.status === 'married_separate' ? 2 : 1), 'Form 6251', YEAR_STATUS);
    p('fed.top37Start', '37% Bracket Starts At', 'usd', c => { const b = rules(c.year).brackets[c.status]; return b[b.length - 1].min; }, 'IRC §1(j)', YEAR_STATUS);
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
    // Form 8949 transactions: proceeds − basis + adjustment (wash sale disallowed losses, code W, are entered as positive adjustments).
    const txGain = add(sub(field('proceeds'), field('basis')), field('adj'));
    q({ id: 'fed.txShortTerm', label: 'Form 8949 Short-Term Gain/Loss', unit: 'usd', form: 'Form 8949 Part I', category: 'capital', optional: true,
        expr: sumOver('tx', mul(txGain, sub(num(1), field('isLong')))) });
    q({ id: 'fed.txLongTerm', label: 'Form 8949 Long-Term Gain/Loss', unit: 'usd', form: 'Form 8949 Part II', category: 'capital', optional: true,
        expr: sumOver('tx', mul(txGain, field('isLong'))) });
    q({ id: 'fed.shortTermGain', label: 'Net Short-Term Gain/Loss', unit: 'usd', form: 'Schedule D Line 7', category: 'capital', optional: true,
        expr: sub(add(R('in.stGain'), R('fed.txShortTerm'), each('src.k1', 'k1St')), R('in.capCarryover')) });
    q({ id: 'fed.longTermGain', label: 'Net Long-Term Gain/Loss', unit: 'usd', form: 'Schedule D Line 15', display: 'inline',
        expr: sub(add(R('in.ltGain'), R('fed.txLongTerm'), each('src.k1', 'k1Lt'), R('fed.capGainDistributions'), R('fed.homeSaleTaxableGain')), R('in.ltCapCarryover')) });
    q({ id: 'fed.capNet', label: 'Net Capital Gain/Loss', unit: 'usd', form: 'Schedule D Line 16', category: 'capital',
        expr: add(R('fed.shortTermGain'), R('fed.longTermGain')) });
    q({ id: 'fed.capAllowed', label: 'Capital Gain/Loss on Return', unit: 'usd', form: 'Form 1040 Line 7', category: 'capital', optional: true,
        expr: max(R('fed.capNet'), P('fed.capLossFloor')) });
    q({ id: 'fed.capLossCarryforward', label: 'Capital Loss Carried to Next Year', unit: 'usd', form: 'Capital Loss Carryover Worksheet', category: 'capital', optional: true,
        expr: atLeast0(sub(R('fed.capAllowed'), R('fed.capNet'))) });
    // ---------- Business income (Schedule C) ----------
    q({ id: 'fed.business1099Gross', label: '1099-NEC / 1099-K / 1099-F Receipts', unit: 'usd', display: 'inline', optional: true,
        expr: add(each('src.nec', 'amount'), each('src.k', 'amount'), each('src.f', 'amount')) });
    q({ id: 'fed.businessGross', label: 'Gross Business Receipts', unit: 'usd', display: 'inline',
        expr: add(R('fed.business1099Gross'), each('biz', 'receipts')) });
    // Schedule C Part II per business: listed expenses, 50% of meals, business miles at the standard rate.
    const bizExpenses = add(field('advertising'), field('supplies'), field('insurance'), field('utilities'), field('rentLease'), field('legal'), field('other'), mul(field('meals'), rate(0.5)), mul(field('miles'), P('fed.mileageRate')));
    q({ id: 'fed.bizExpenses', label: 'Business Expenses (Schedule C Part II)', unit: 'usd', form: 'Schedule C Line 28', category: 'wages', optional: true,
        expr: round(sumOver('biz', bizExpenses)) });
    // Simplified home office (Rev. Proc. 2013-13): $5 × up to 300 sq ft, limited to business income after other expenses.
    q({ id: 'fed.homeOfficeRaw', label: 'Simplified Home Office Amount', unit: 'usd', display: 'inline', optional: true,
        expr: sumOver('biz', mul(min(field('sqft'), num(300)), lit(5))) });
    q({ id: 'fed.homeOffice', label: 'Home Office Deduction (simplified)', unit: 'usd', form: 'Schedule C Line 30', category: 'wages', optional: true,
        expr: min(R('fed.homeOfficeRaw'), atLeast0(sub(R('fed.businessGross'), R('in.schedCExpenses'), R('fed.bizExpenses')))) });
    q({ id: 'fed.sec179Allowed', label: 'Section 179 Carryover Deducted', unit: 'usd', form: 'Form 4562 Line 10', category: 'wages', optional: true,
        expr: min(R('in.sec179Carryover'), atLeast0(sub(R('fed.businessGross'), R('in.schedCExpenses'), R('fed.bizExpenses'), R('fed.homeOffice')))) });
    // A Schedule C loss offsets other income (Schedule 1 line 3); SE tax and QBI use only a profit.
    q({ id: 'fed.businessProfit', label: 'Net Business Profit (Loss)', unit: 'usd', form: 'Schedule C Line 31', category: 'wages', optional: true,
        expr: sub(R('fed.businessGross'), R('in.schedCExpenses'), R('fed.bizExpenses'), R('fed.homeOffice'), R('fed.sec179Allowed')) });
    // Joint returns: each spouse files their own Schedule C / SE. Pooled expenses are shared in proportion to gross receipts.
    q({ id: 'fed.spouse1099Gross', label: "Spouse's 1099 Business Receipts", unit: 'usd', display: 'inline', optional: true,
        expr: add(each('src.nec', 'amount', 'isSpouse'), each('src.k', 'amount', 'isSpouse'), each('src.f', 'amount', 'isSpouse')) });
    q({ id: 'fed.spouseBusinessGross', label: "Spouse's Gross Business Receipts", unit: 'usd', display: 'inline', optional: true,
        expr: add(R('fed.spouse1099Gross'), each('biz', 'receipts', 'isSpouse')) });
    q({ id: 'fed.spouseBusinessProfit', label: "Spouse's Business Profit", unit: 'usd', display: 'inline', optional: true,
        expr: sub(R('fed.spouseBusinessGross'), when(gt(R('fed.business1099Gross'), lit(0)), round(mul(R('in.schedCExpenses'), div(R('fed.spouse1099Gross'), R('fed.business1099Gross')))), lit(0)), round(sumOver('biz', bizExpenses, 'isSpouse')), when(gt(R('fed.homeOfficeRaw'), lit(0)), round(mul(R('fed.homeOffice'), div(sumOver('biz', mul(min(field('sqft'), num(300)), lit(5)), 'isSpouse'), R('fed.homeOfficeRaw')))), lit(0))) });
    q({ id: 'fed.taxpayerBusinessProfit', label: "Taxpayer's Business Profit", unit: 'usd', display: 'inline', optional: true,
        expr: sub(R('fed.businessProfit'), R('fed.spouseBusinessProfit')) });
    // ---------- Interest, dividends, other documents ----------
    // Schedule B: total 1099-INT interest (box 1 + box 3) minus accrued interest paid on bonds bought between payment dates.
    q({ id: 'fed.treasuryInterest', label: 'US Treasury Interest', unit: 'usd', display: 'inline', optional: true, expr: each('src.int', 'treasury') });
    q({ id: 'fed.interest1099', label: '1099-INT Interest', unit: 'usd', display: 'inline', optional: true,
        expr: add(sub(each('src.int', 'amount'), each('src.int', 'accrued')), R('fed.treasuryInterest'), each('src.k1', 'k1Interest')) });
    q({ id: 'fed.interestTotal', label: 'Taxable Interest', unit: 'usd', form: 'Form 1040 Line 2b', category: 'wages', optional: true,
        expr: add(R('in.interest'), R('fed.interest1099')) });
    q({ id: 'fed.taxExemptInterest', label: 'Tax-Exempt Interest', unit: 'usd', form: 'Form 1040 Line 2a', optional: true, expr: each('src.int', 'taxExempt') });
    q({ id: 'fed.dividends', label: 'Ordinary Dividends', unit: 'usd', form: 'Form 1040 Line 3b', category: 'wages', optional: true, expr: add(each('src.div', 'amount'), each('src.k1', 'k1Dividends')) });
    q({ id: 'fed.qualifiedDividends', label: 'Qualified Dividends', unit: 'usd', form: 'Form 1040 Line 3a', category: 'capital', optional: true,
        expr: add(sumOver('src.div', min(field('amount'), field('qdiv'))), sumOver('src.k1', min(field('k1Dividends'), field('k1QualDiv')))) });
    // Schedule E Part II: nonpassive K-1 income (box 1 + box 2, plus guaranteed payments) counts in full; a passive net loss is
    // allowed only against passive income (positive rental income) — the rest is suspended (Form 8582, simplified).
    q({ id: 'fed.k1Guaranteed', label: 'K-1 Guaranteed Payments', unit: 'usd', display: 'inline', optional: true, expr: each('src.k1', 'k1Guaranteed') });
    q({ id: 'fed.k1Nonpassive', label: 'Nonpassive K-1 Income', unit: 'usd', display: 'inline', optional: true,
        expr: add(sumOver('src.k1', mul(add(field('amount'), field('k1Rental')), sub(num(1), field('passive')))), R('fed.k1Guaranteed')) });
    q({ id: 'fed.k1PassiveNet', label: 'Passive K-1 Income (Loss)', unit: 'usd', display: 'inline', optional: true,
        expr: sumOver('src.k1', mul(add(field('amount'), field('k1Rental')), field('passive'))) });
    q({ id: 'fed.k1PassiveAllowed', label: 'Passive K-1 Income Allowed', unit: 'usd', form: 'Form 8582', category: 'wages', optional: true,
        expr: max(R('fed.k1PassiveNet'), neg(atLeast0(R('fed.rentalNet')))) });
    q({ id: 'fed.k1Income', label: 'Schedule K-1 Income', unit: 'usd', form: 'Schedule E Part II', category: 'wages', optional: true,
        expr: add(R('fed.k1Nonpassive'), R('fed.k1PassiveAllowed')) });
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
        expr: when(gte(add(R('fed.taxpayerBusinessProfit'), sub(each('src.k1', 'k1Se'), each('src.k1', 'k1Se', 'isSpouse'))), lit(400)), mul(add(R('fed.taxpayerBusinessProfit'), sub(each('src.k1', 'k1Se'), each('src.k1', 'k1Se', 'isSpouse'))), rate(0.9235)), lit(0)) });
    q({ id: 'fed.spouseSeEarnings', label: "Spouse's Net SE Earnings", unit: 'usd', display: 'inline', optional: true,
        expr: when(gte(add(R('fed.spouseBusinessProfit'), each('src.k1', 'k1Se', 'isSpouse')), lit(400)), mul(add(R('fed.spouseBusinessProfit'), each('src.k1', 'k1Se', 'isSpouse')), rate(0.9235)), lit(0)) });
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
        expr: min(add(P('fed.iraLimit'), when(iraCatch, P('fed.iraCatchUpAmount'), lit(0))), R('fed.earnedIncome')) });
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
        expr: atLeast0(min(add(P('fed.iraLimit'), when(spouseCatch, P('fed.iraCatchUpAmount'), lit(0))), sub(R('fed.earnedIncome'), min(R('in.ira'), R('fed.iraContributionLimit'))))) });
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
    // Per property: depreciation (entered, or residential 27.5-year straight line, mid-month convention) and the §280A
    // vacation-home rules: rented under 15 days → nothing reported; personal use over the greater of 14 days or 10% of rental
    // days → expenses allocated by rental days and no loss allowed.
    const yearsIn = sub(P('fed.taxYear'), field('pisYear'));
    const sl = div(field('basis'), lit(27.5));
    const computedDep = when(lte(field('basis'), lit(0)), lit(0), when(lte(field('pisYear'), num(0)), sl, when(lt(yearsIn, num(0)), lit(0), when(lte(yearsIn, num(0)), mul(sl, div(sub(lit(12.5), max(num(1), field('pisMonth'))), lit(12))), when(lte(yearsIn, num(27)), sl, lit(0))))));
    const dep = round(when(gt(field('depreciation'), lit(0)), field('depreciation'), computedDep));
    const totalDays = add(field('rentalDays'), field('personalDays'));
    const personalResidence = and(gt(field('rentalDays'), num(0)), gt(field('personalDays'), max(num(14), mul(field('rentalDays'), rate(0.1)))));
    q({ id: 'fed.rentalPropertiesDepreciation', label: 'Rental Depreciation (27.5-year)', unit: 'usd', form: 'Form 4562', category: 'wages', optional: true,
        expr: sumOver('rent', dep) });
    q({ id: 'fed.rentalPropertiesNet', label: 'Rental Properties Net Income', unit: 'usd', form: 'Schedule E Line 21', category: 'wages', optional: true,
        expr: round(sumOver('rent', when(and(gt(field('rentalDays'), num(0)), lt(field('rentalDays'), num(15))), lit(0), when(personalResidence, atLeast0(sub(field('rents'), mul(add(field('expenses'), dep), div(field('rentalDays'), totalDays)))), sub(field('rents'), field('expenses'), dep))))) });
    q({ id: 'fed.rentalNet', label: 'Net Rental Income Before Loss Limits', unit: 'usd', form: 'Schedule E Line 26', category: 'wages', optional: true,
        expr: sub(add(sub(R('in.rents'), R('in.rentalExpenses'), R('in.rentalDepreciation')), R('fed.rentalPropertiesNet')), R('in.palCarryover')) });
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
    q({ id: 'fed.nolDeduction', label: 'Net Operating Loss Deduction', unit: 'usd', form: 'Schedule 1 Line 8a', category: 'adjustments', optional: true,
        presentIf: gt(R('in.nolCarryover'), lit(0)),
        expr: round(min(R('in.nolCarryover'), mul(atLeast0(sub(R('fed.totalIncome'), R('fed.adjustments'), P('fed.stdBase'))), rate(0.8)))) });
    q({ id: 'fed.agi', label: 'Adjusted Gross Income', unit: 'usd', form: 'Form 1040 Line 11', category: 'wages',
        expr: round(atLeast0(sub(R('fed.totalIncome'), R('fed.adjustments'), R('fed.nolDeduction')))) });
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
        // P.L. 119-21 §70114: from 2026 only 90% of gambling losses are deductible (still limited to winnings).
        expr: min(R('fed.gambling'), year >= 2026 ? mul(R('in.gamblingLosses'), rate(0.9)) : R('in.gamblingLosses')) });
    q({ id: 'fed.investmentInterestDeduction', label: 'Deductible Investment Interest', unit: 'usd', form: 'Schedule A Line 9', category: 'itemized', optional: true,
        expr: min(atLeast0(add(R('in.interest'), R('fed.interest1099'), atLeast0(R('fed.capAllowed')))), add(R('in.investmentInterest'), R('in.invInterestCarryover'))) });
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
        presentIf: gt(add(R('in.charity'), R('in.charityCarryover'), R('in.charityNoncash')), lit(0)),
        expr: year >= 2026
            // P.L. 119-21 §70425: from 2026 itemized charitable gifts count only above 0.5% of AGI.
            ? atLeast0(sub(add(min(add(R('in.charity'), R('in.charityCarryover')), atLeast0(sub(mul(R('fed.agi'), rate(0.6)), R('fed.charityNoncashAllowed')))), R('fed.charityNoncashAllowed')), round(mul(R('fed.agi'), rate(0.005)))))
            : add(min(add(R('in.charity'), R('in.charityCarryover')), atLeast0(sub(mul(R('fed.agi'), rate(0.6)), R('fed.charityNoncashAllowed')))), R('fed.charityNoncashAllowed')) });
    q({ id: 'fed.charityCarryforward', label: 'Charitable Gifts Carried to Next Year', unit: 'usd', category: 'itemized', optional: true,
        expr: year >= 2026 ? atLeast0(sub(add(min(add(R('in.charity'), R('in.charityCarryover')), atLeast0(sub(mul(R('fed.agi'), rate(0.6)), R('fed.charityNoncashAllowed')))), R('fed.charityNoncashAllowed')), add(R('fed.charityDeduction'), round(mul(R('fed.agi'), rate(0.005)))))) // amounts over the AGI limits carry forward; the 0.5% floor does not
            : sub(add(R('in.charity'), R('in.charityCarryover'), R('in.charityNoncash')), R('fed.charityDeduction')) });
    const itemizedSum = add(R('fed.medicalDeduction'), R('fed.salt'), R('fed.mortgageDeduction'), R('fed.charityDeduction'), R('fed.gamblingLossDeduction'), R('fed.investmentInterestDeduction'), R('fed.casualtyDeduction'));
    if (year >= 2026) {
        // P.L. 119-21 §70111 (new §68): itemized deductions are reduced by 2/37 of the smaller of the deductions or the amount by which
        // taxable income (figured with the deductions added back) exceeds the start of the 37% bracket.
        q({ id: 'fed.itemizedBeforeLimit', label: 'Itemized Deductions Before Limitation', unit: 'usd', display: 'inline', expr: itemizedSum });
        q({ id: 'fed.itemizedLimitation', label: 'Itemized Deduction Limitation (2/37)', unit: 'usd', form: 'Schedule A Line 17 (§68)', category: 'itemized', optional: true,
            expr: round(mul(min(R('fed.itemizedBeforeLimit'), atLeast0(sub(sub(R('fed.agi'), R('fed.sched1a')), P('fed.top37Start')))), div(lit(2), lit(37)))) });
        q({ id: 'fed.itemized', label: 'Itemized Deductions', unit: 'usd', form: 'Schedule A Line 17', category: 'itemized',
            expr: sub(R('fed.itemizedBeforeLimit'), R('fed.itemizedLimitation')) });
    }
    else {
        q({ id: 'fed.itemized', label: 'Itemized Deductions', unit: 'usd', form: 'Schedule A Line 17', category: 'itemized', expr: itemizedSum });
    }
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
        expr: atLeast0(sub(add(atLeast0(sub(R('fed.businessProfit'), R('fed.halfSeTax'), R('fed.seRetirementDeduction'), R('fed.seHealthDeduction'))), atLeast0(sub(R('fed.k1Income'), R('fed.k1Guaranteed')))), R('in.qbiLossCarryover'))) });
    q({ id: 'fed.qbiIncomeLimit', label: 'QBI Taxable Income Limit Base', unit: 'usd', category: 'adjustments',
        expr: atLeast0(sub(atLeast0(sub(R('fed.agi'), R('fed.deduction'))), add(R('fed.qualifiedDividends'), R('fed.netLtcg')))) });
    const qbiBase = round(min(mul(R('fed.qbiIncome'), rate(0.2)), mul(R('fed.qbiIncomeLimit'), rate(0.2))));
    q({ id: 'fed.qbi', label: 'QBI Deduction', unit: 'usd', form: 'Form 1040 Line 13', category: 'adjustments', optional: true,
        // P.L. 119-21 §70105: from 2026, at least $400 when QBI from active businesses is $1,000 or more.
        expr: year >= 2026 ? when(gte(R('fed.qbiIncome'), lit(1000)), max(lit(400), qbiBase), qbiBase) : qbiBase });
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
    if (year >= 2026) {
        // P.L. 119-21 §70424: non-itemizers deduct up to $1,000 ($2,000 joint) of cash gifts to public charities.
        q({ id: 'fed.nonItemizerCharity', label: 'Charitable Deduction for Non-Itemizers', unit: 'usd', form: 'Form 1040 (2026)', category: 'itemized', optional: true,
            presentIf: gt(R('in.charity'), lit(0)),
            expr: when(gt(R('fed.itemizing'), num(0)), lit(0), min(R('in.charity'), when(statusIs('married_joint'), lit(2000), lit(1000)))) });
    }
    else {
        q({ id: 'fed.nonItemizerCharity', label: 'Charitable Deduction for Non-Itemizers', unit: 'usd', optional: true, expr: lit(0) });
    }
    q({ id: 'fed.taxableIncome', label: 'Taxable Income', unit: 'usd', form: 'Form 1040 Line 15', category: 'tax',
        expr: round(atLeast0(sub(R('fed.agi'), R('fed.deduction'), R('fed.qbi'), R('fed.sched1a'), R('fed.nonItemizerCharity')))) });
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
        expr: year >= 2026
            // P.L. 119-21 §70405: 50% less 1 point per $2,000 (or part) of AGI over $15,000, not below 35%; then less 1 point per
            // $2,000 ($4,000 joint) over $75,000 ($150,000 joint), not below 20%.
            ? max(rate(0.2), sub(max(rate(0.35), sub(rate(0.5), mul(ceil(div(atLeast0(sub(R('fed.agi'), lit(15000))), lit(2000))), rate(0.01)))), mul(ceil(div(atLeast0(sub(R('fed.agi'), when(statusIs('married_joint'), lit(150000), lit(75000)))), when(statusIs('married_joint'), lit(4000), lit(2000)))), rate(0.01))))
            : when(lte(R('fed.agi'), lit(15000)), rate(0.35), max(rate(0.2), sub(rate(0.35), mul(ceil(div(sub(R('fed.agi'), lit(15000)), lit(2000))), rate(0.01))))) });
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
    // Schedule R (65+): 15% × (initial amount − nontaxable Social Security − ½ of AGI over the threshold). Amounts are fixed by
    // statute (IRC §22, not indexed). Under-65 disability filers enter their credit (limited to taxable disability income).
    const mfsApart = and(statusIs('married_separate'), flag('fed.livedApart', 'you lived apart from your spouse all year', 'you lived with your spouse', 'check-lived-apart'));
    q({ id: 'fed.elderlyInitialAmount', label: 'Schedule R Initial Amount', unit: 'usd', display: 'inline',
        expr: when(statusIs('married_separate'), when(mfsApart, lit(3750), lit(0)), when(and(statusIs('married_joint'), gte(R('fed.seniorsCount'), num(2))), lit(7500), lit(5000))) });
    q({ id: 'fed.elderlyCredit', label: 'Credit for the Elderly or Disabled', unit: 'usd', form: 'Schedule R', category: 'credits', optional: true,
        presentIf: or(gt(R('fed.seniorsCount'), num(0)), gt(R('in.elderly'), lit(0))),
        expr: when(gt(R('fed.seniorsCount'), num(0)), round(mul(atLeast0(sub(R('fed.elderlyInitialAmount'), sub(R('fed.ssaGross'), R('fed.taxableSS')), mul(atLeast0(sub(R('fed.agi'), when(statusIs('married_joint'), lit(10000), when(statusIs('married_separate'), lit(5000), lit(7500))))), rate(0.5)))), rate(0.15))), R('in.elderly')) });
    // Foreign tax credit: up to $300 ($600 joint) of passive foreign tax is allowed without Form 1116. Above that, Form 1116
    // limits the credit to tax x foreign-source taxable income / taxable income (applied once foreign income is entered).
    q({ id: 'fed.foreignTaxCreditAllowed', label: 'Foreign Tax Credit', unit: 'usd', form: 'Form 1116 / Schedule 3 Line 1', category: 'credits', optional: true,
        presentIf: gt(add(R('in.foreignTaxCredit'), R('in.ftcCarryover')), lit(0)),
        expr: when(and(lte(R('in.ftcCarryover'), lit(0)), lte(R('in.foreignTaxCredit'), when(statusIs('married_joint'), lit(600), lit(300)))), R('in.foreignTaxCredit'), when(gt(R('in.foreignIncome'), lit(0)), min(add(R('in.foreignTaxCredit'), R('in.ftcCarryover')), round(mul(R('fed.tax'), min(rate(1), div(R('in.foreignIncome'), max(R('fed.taxableIncome'), lit(1))))))), R('in.foreignTaxCredit'))) });
    q({ id: 'fed.amtCredit', label: 'Credit for Prior-Year Minimum Tax', unit: 'usd', form: 'Form 8801', category: 'credits', optional: true,
        presentIf: gt(R('in.amtCreditCarryover'), lit(0)),
        expr: min(R('in.amtCreditCarryover'), atLeast0(sub(R('fed.tax'), R('fed.tentativeMinimumTax')))) });
    q({ id: 'fed.nonrefundableBeforeLimit', label: 'Nonrefundable Credits Before Tax Limit', unit: 'usd', category: 'credits', optional: true,
        expr: add(R('fed.ctcAfterPhaseout'), R('fed.odcAfterPhaseout'), R('fed.childCareCredit'), R('fed.educationNonrefundable'), R('fed.saversCredit'), R('fed.foreignTaxCreditAllowed'), R('in.cleanEnergy'), R('fed.adoptionCredit'), R('fed.elderlyCredit'), R('fed.amtCredit')) });
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
    // Form 8962 (annual method): household income ÷ poverty line (prior year's HHS guidelines), applicable figure, contribution,
    // PTC = premiums or SLCSP − contribution, reconciled with advance payments. 2024–2025: enhanced table (0%–8.5%, no 400% limit)
    // and repayment caps; 2026: Rev. Proc. 2025-25 table (2.10%–9.96%), 400% limit, no repayment cap (P.L. 119-21 §71305).
    const anyMkt = gt(count('mkt'), num(0));
    q({ id: 'fed.ptcHouseholdIncome', label: 'Household Income (Form 8962 Line 3)', unit: 'usd', category: 'credits', appliesWhen: anyMkt,
        expr: add(R('fed.agi'), R('fed.taxExemptInterest'), sub(R('fed.ssaGross'), R('fed.taxableSS')), R('fed.feie')) });
    const ak = flag('fed.fplAlaska', 'you lived in Alaska', 'not Alaska', 'select-ptc-region');
    const hi = flag('fed.fplHawaii', 'you lived in Hawaii', 'not Hawaii', 'select-ptc-region');
    const extra = sub(max(num(1), R('in.ptcHouseholdSize')), num(1));
    q({ id: 'fed.ptcPovertyLine', label: 'Federal Poverty Line (Form 8962 Line 4)', unit: 'usd', category: 'credits', appliesWhen: anyMkt,
        expr: when(ak, add(P('fed.fplBaseAK'), mul(extra, P('fed.fplAddAK'))), when(hi, add(P('fed.fplBaseHI'), mul(extra, P('fed.fplAddHI'))), add(P('fed.fplBase'), mul(extra, P('fed.fplAdd'))))) });
    q({ id: 'fed.ptcFplPercent', label: 'Household Income as % of Poverty Line', unit: 'count', category: 'credits', appliesWhen: anyMkt,
        expr: floor(div(mul(R('fed.ptcHouseholdIncome'), lit(100)), max(R('fed.ptcPovertyLine'), lit(1)))) });
    const pct = R('fed.ptcFplPercent');
    const band = (lo, hi2, from, to) => add(rate(from), mul(div(sub(pct, num(lo)), num(hi2 - lo)), rate(to - from)));
    const fig = year >= 2026
        ? when(lt(pct, num(133)), rate(0.021), when(lt(pct, num(150)), band(133, 150, 0.0314, 0.0419), when(lt(pct, num(200)), band(150, 200, 0.0419, 0.066), when(lt(pct, num(250)), band(200, 250, 0.066, 0.0844), when(lt(pct, num(300)), band(250, 300, 0.0844, 0.0996), rate(0.0996))))))
        : when(lte(pct, num(150)), rate(0), when(lt(pct, num(200)), band(150, 200, 0, 0.02), when(lt(pct, num(250)), band(200, 250, 0.02, 0.04), when(lt(pct, num(300)), band(250, 300, 0.04, 0.06), when(lt(pct, num(400)), band(300, 400, 0.06, 0.085), rate(0.085))))));
    q({ id: 'fed.ptcApplicableFigure', label: 'Applicable Figure (Form 8962 Line 7)', unit: 'rate', category: 'credits', appliesWhen: anyMkt,
        expr: div(round(mul(fig, lit(10000)), 'dollar'), lit(10000)) });
    q({ id: 'fed.ptcContribution', label: 'Annual Contribution for Health Care (Line 8a)', unit: 'usd', category: 'credits', appliesWhen: anyMkt,
        expr: round(mul(R('fed.ptcHouseholdIncome'), R('fed.ptcApplicableFigure')), 'dollar') });
    const aptc = each('mkt', 'aptc');
    const eligible = and(not(statusIs('married_separate')), or(gte(pct, num(100)), gt(aptc, lit(0))), year >= 2026 ? lte(pct, num(400)) : gte(pct, num(0)));
    q({ id: 'fed.ptcAllowed', label: 'Premium Tax Credit (Line 24)', unit: 'usd', form: 'Form 8962 Line 24', category: 'credits', appliesWhen: anyMkt,
        expr: when(eligible, round(min(each('mkt', 'premiums'), atLeast0(sub(each('mkt', 'slcsp'), R('fed.ptcContribution')))), 'dollar'), lit(0)) });
    q({ id: 'fed.netPtc', label: 'Net Premium Tax Credit', unit: 'usd', form: 'Form 8962 Line 26 / Schedule 3 Line 9', category: 'credits', optional: true,
        expr: when(anyMkt, atLeast0(sub(R('fed.ptcAllowed'), aptc)), lit(0)) });
    q({ id: 'fed.excessAptc', label: 'Excess Advance PTC', unit: 'usd', form: 'Form 8962 Line 27', display: 'inline', optional: true,
        expr: when(anyMkt, atLeast0(sub(aptc, R('fed.ptcAllowed'))), lit(0)) });
    const cap = (single, other) => when(statusIs('single'), lit(single), lit(other));
    q({ id: 'fed.excessAptcRepayment', label: 'Excess Advance PTC Repayment', unit: 'usd', form: 'Form 8962 Line 29 / Schedule 2 Line 2', category: 'tax', optional: true,
        expr: year >= 2026 ? R('fed.excessAptc')
            : when(lt(pct, num(200)), min(R('fed.excessAptc'), cap(375, 750)), when(lt(pct, num(300)), min(R('fed.excessAptc'), year >= 2025 ? cap(975, 1950) : cap(950, 1900)), when(lt(pct, num(400)), min(R('fed.excessAptc'), year >= 2025 ? cap(1625, 3250) : cap(1575, 3150)), R('fed.excessAptc')))) });
    q({ id: 'fed.refundableCredits', label: 'Refundable Credits', unit: 'usd', form: 'Form 1040 Lines 27–31', category: 'credits', optional: true,
        expr: round(add(R('fed.actc'), R('fed.eitc'), R('fed.aotcRefundable'), R('in.ptc'), R('fed.netPtc'), R('fed.adoptionRefundable'))) });
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
        expr: atLeast0(add(R('in.interest'), R('fed.interest1099'), R('fed.dividends'), atLeast0(R('fed.capAllowed')), atLeast0(R('fed.rentalAllowed')), atLeast0(R('fed.k1PassiveAllowed')))) });
    q({ id: 'fed.niitBase', label: 'NIIT Taxable Base', unit: 'usd', category: 'capital',
        expr: min(R('fed.netInvestmentIncome'), atLeast0(sub(R('fed.agi'), P('fed.niitThreshold')))) });
    q({ id: 'fed.niit', label: 'Net Investment Income Tax', unit: 'usd', form: 'Form 8960', category: 'tax', optional: true,
        expr: round(mul(R('fed.niitBase'), P('fed.niitRate'))) });
    q({ id: 'fed.amti', label: 'Alternative Minimum Taxable Income', unit: 'usd', form: 'Form 6251 Line 4', category: 'tax',
        // Form 6251: standard-deduction filers get no deduction against AMTI; itemizers keep everything except SALT.
        expr: atLeast0(sub(R('fed.agi'), when(gt(R('fed.itemizing'), num(0)), add(R('fed.medicalDeduction'), R('fed.mortgageDeduction'), R('fed.charityDeduction'), R('fed.gamblingLossDeduction')), lit(0)), R('fed.qbi'))) });
    q({ id: 'fed.amtExemptionAllowed', label: 'AMT Exemption After Phaseout', unit: 'usd', category: 'tax',
        expr: atLeast0(sub(P('fed.amtExemption'), mul(atLeast0(sub(R('fed.amti'), P('fed.amtPhaseStart'))), P('fed.amtPhaseRate')))) });
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
    // Schedule H: Social Security + Medicare (15.3%) on cash wages once they reach the threshold (Part I), and FUTA at 0.6% of the
    // first $7,000 when $1,000+ was paid in a calendar quarter (Part II; assumed when total wages are $1,000+, no credit-reduction state).
    q({ id: 'fed.householdFica', label: 'Household Employee Social Security & Medicare', unit: 'usd', form: 'Schedule H Lines 2–6', category: 'tax', optional: true,
        expr: when(gte(R('in.householdWages'), P('fed.householdWageThreshold')), round(add(mul(min(R('in.householdWages'), P('fed.ssWageBase')), rate(0.124)), mul(R('in.householdWages'), rate(0.029)))), lit(0)) });
    q({ id: 'fed.householdFuta', label: 'Household Employee FUTA Tax', unit: 'usd', form: 'Schedule H Line 16', category: 'tax', optional: true,
        expr: when(gte(R('in.householdWages'), lit(1000)), round(mul(min(R('in.householdWages'), lit(7000)), rate(0.006))), lit(0)) });
    q({ id: 'fed.householdTax', label: 'Household Employment Taxes', unit: 'usd', form: 'Schedule 2 Line 9', category: 'tax', optional: true,
        expr: when(gt(R('in.householdWages'), lit(0)), add(R('fed.householdFica'), R('fed.householdFuta')), R('in.householdTax')) });
    q({ id: 'fed.otherTaxes', label: 'Other Taxes', unit: 'usd', form: 'Form 1040 Line 23', category: 'tax', optional: true,
        expr: round(add(R('fed.seTax'), R('fed.additionalMedicareTax'), R('fed.niit'), R('fed.amt'), R('fed.earlyDistributionPenalty'), R('fed.tipsFica'), R('fed.hsaExcise'), R('fed.householdTax'), R('fed.excessAptcRepayment'))) });
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
    collections.biz = (state.businesses || []).map(b => ({ id: b.id, name: b.name, values: {
            receipts: n(b.receipts), advertising: n(b.advertising), supplies: n(b.supplies), insurance: n(b.insurance), utilities: n(b.utilities),
            rentLease: n(b.rentLease), legal: n(b.legalProfessional), other: n(b.otherExpenses), meals: n(b.meals), miles: n(b.vehicleMiles),
            sqft: n(b.homeOfficeSqFt), isSpouse: joint && b.owner === 'spouse' ? 1 : 0
        } }));
    collections.tx = (state.capitalTransactions || []).map(t => ({ id: t.id, name: t.description || `Sale ${t.id}`, values: {
            proceeds: n(t.proceeds), basis: n(t.basis), adj: n(t.adjustment), isLong: t.term === 'short' ? 0 : 1
        } }));
    collections.rent = (state.rentalProperties || []).map(r => ({ id: r.id, name: r.name, values: {
            rents: n(r.rents), expenses: n(r.expenses), depreciation: n(r.depreciation), basis: n(r.buildingBasis), pisYear: n(r.placedInServiceYear),
            pisMonth: n(r.placedInServiceMonth), rentalDays: n(r.rentalDays), personalDays: n(r.personalDays)
        } }));
    collections.mkt = (state.marketplacePolicies || []).map(m => ({ id: m.id, name: '1095-A', values: { premiums: n(m.premiums), slcsp: n(m.slcsp), aptc: n(m.advancePtc) } }));
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
                    isSpouse: joint && s.owner === 'spouse' ? 1 : 0,
                    k1Rental: n(s.k1Rental), k1Guaranteed: n(s.k1Guaranteed), k1Interest: n(s.k1Interest), k1Dividends: n(s.k1Dividends),
                    k1QualDiv: n(s.k1QualifiedDividends), k1St: n(s.k1ShortTermGain), k1Lt: n(s.k1LongTermGain), k1Se: n(s.k1SeEarnings), passive: s.passive ? 1 : 0
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
            'fed.fplAlaska': state.ptcRegion === 'AK',
            'fed.fplHawaii': state.ptcRegion === 'HI',
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
            'in.capCarryover': n(o.capitalGains?.carryoverLoss) + n(state.carryovers?.shortTermCapitalLoss),
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
            'in.foreignIncome': n(d.foreignSourceIncome),
            'in.cleanEnergy': n(d.cleanEnergyCredit),
            'in.adoption': n(d.adoptionCredit),
            'in.elderly': n(d.elderlyDisabledCredit),
            'in.ptc': n(d.premiumTaxCredit),
            'in.ptcHouseholdSize': n(state.ptcHouseholdSize) || (1 + (joint ? 1 : 0) + ((d.list || []).length > 0 ? (d.list || []).length : int(d.childrenCount) + int(d.otherDependentsCount))),
            'in.ltCapCarryover': n(state.carryovers?.longTermCapitalLoss),
            'in.palCarryover': n(state.carryovers?.passiveLoss),
            'in.charityCarryover': n(state.carryovers?.charity),
            'in.invInterestCarryover': n(state.carryovers?.investmentInterest),
            'in.nolCarryover': n(state.carryovers?.nol),
            'in.amtCreditCarryover': n(state.carryovers?.amtCredit),
            'in.ftcCarryover': n(state.carryovers?.foreignTax),
            'in.qbiLossCarryover': n(state.carryovers?.qbiLoss),
            'in.sec179Carryover': n(state.carryovers?.section179),
            'in.householdTax': n(d.householdEmploymentTax),
            'in.householdWages': n(d.householdWages),
            'in.estimatedPayments': n(d.estimatedTaxPayments)
        }
    };
}
/** How federal quantities are grouped into calculation cards. Presentation only — no math. */
export const FEDERAL_BLOCKS = [
    { id: 'calc-total-w2-wages', stepLabel: 'Step 1 • Wage & Payroll Aggregation', title: 'W-2 Wages, Withholding & FICA',
        quantities: [{ id: 'fed.wages', show: 'always' }, 'fed.w2Withholding', 'fed.ssTaxWithheld', 'fed.medTaxWithheld', 'fed.ficaWithheld'] },
    { id: 'calc-capital-gains', stepLabel: 'Step 2a • Schedule D / Form 8949', title: 'Capital Gains & Loss Limitation',
        quantities: ['fed.txShortTerm', 'fed.txLongTerm', 'fed.shortTermGain', 'fed.homeSaleExclusion', 'fed.homeSaleTaxableGain', 'fed.capGainDistributions', 'fed.capNet', 'fed.capAllowed', 'fed.capLossCarryforward'] },
    { id: 'calc-schedule-e', stepLabel: 'Step 2b • Schedule E / Form 8582', title: 'Rental Real Estate & K-1 Income',
        quantities: ['fed.rentalNet', 'fed.suspendedRentalLoss', 'fed.rentalAllowed', 'fed.k1Income'] },
    { id: 'calc-agi', stepLabel: 'Step 3 • Gross Income, Adjustments & AGI', title: 'Total Income & Adjusted Gross Income (AGI)',
        quantities: ['fed.interestTotal', 'fed.taxExemptInterest', 'fed.dividends', 'fed.qualifiedDividends', 'fed.bizExpenses', 'fed.homeOffice', 'fed.sec179Allowed', 'fed.businessProfit', 'fed.k1PassiveAllowed', 'fed.rentalPropertiesDepreciation', 'fed.rentalPropertiesNet', 'fed.retirement',
            'fed.gambling', 'fed.otherSourceIncome', 'fed.taxableStateRefund', 'fed.ssaGross', 'fed.provisionalIncome', 'fed.taxableSS',
            'fed.depCareTaxable', { id: 'fed.totalIncome', show: 'always' }, 'fed.seRetirementLimit', 'fed.seRetirementDeduction', 'fed.seHealthDeduction', 'fed.hsaLimit', 'fed.hsaDeduction', 'fed.iraMagi', 'fed.iraDeductibleLimit', 'fed.taxpayerIraDeduction', 'fed.spouseIraContributionLimit', 'fed.spouseIraDeduction', 'fed.iraDeduction',
            'fed.studentLoanMagi', 'fed.studentLoanDeduction', { id: 'fed.adjustments', show: 'always' },
            'fed.nolDeduction', { id: 'fed.agi', show: 'always' }] },
    { id: 'calc-itemized-deductions', stepLabel: 'Step 4a • Schedule A Itemized Deductions', title: 'Itemized Deductions (Medical 7.5% Floor & SALT Cap)',
        quantities: ['fed.medicalFloor', 'fed.medicalDeduction', 'fed.saltCap', 'fed.salt', 'fed.mortgageDeduction', 'fed.charityDeduction', 'fed.charityCarryforward', 'fed.itemizedLimitation', 'fed.nonItemizerCharity', 'fed.casualtyDeduction', 'fed.gamblingLossDeduction', 'fed.investmentInterestDeduction', 'fed.itemized'] },
    { id: 'calc-taxable-income', stepLabel: 'Step 4 • Deductions & Taxable Income', title: 'Deduction & Taxable Income',
        quantities: ['fed.taxpayerAge', 'fed.spouseAge', 'fed.age65BlindBoxes', { id: 'fed.stdDeduction', show: 'always' }, { id: 'fed.deduction', show: 'always' }, 'fed.qbiIncome', 'fed.qbiIncomeLimit', 'fed.qbi',
            'fed.tipsDeduction', 'fed.overtimeDeduction', 'fed.carLoanDeduction', 'fed.seniorDeduction', 'fed.sched1a',
            { id: 'fed.taxableIncome', show: 'always' }] },
    { id: 'calc-tax-before-credits', stepLabel: 'Step 5 • Tax Brackets', title: 'Federal Income Tax (Before Credits)',
        quantities: ['fed.netLtcg', 'fed.preferentialIncome', 'fed.ordinaryTaxable', 'fed.ordinaryTaxRow', 'fed.ordinaryTax', 'fed.standardPrefTax', 'fed.unrecap1250Tax',
            'fed.collectiblesTax', 'fed.regularTaxRow', 'fed.regularTax', { id: 'fed.tax', show: 'always' }] },
    { id: 'calc-total-credits', stepLabel: 'Step 6 • Tax Credits', title: 'Nonrefundable & Refundable Credits',
        quantities: ['fed.ctcChildren', 'fed.odcDependents', 'fed.eitcChildren', 'fed.careQualifyingPersons', 'fed.depCareExcluded', 'fed.ctcPhaseout', 'fed.childCreditsAfterPhaseout', 'fed.ctcAfterPhaseout', 'fed.odcAfterPhaseout', 'fed.careEarnedIncomeLimit', 'fed.childCareCredit', 'fed.aotcTotal',
            'fed.educationNonrefundable', 'fed.saversContributions', 'fed.saversCredit', 'fed.foreignTaxCreditAllowed', 'fed.adoptionAllowed', 'fed.adoptionRefundable', 'fed.elderlyCredit', 'fed.amtCredit', 'fed.nonrefundableBeforeLimit', 'fed.nonrefundableCredits', 'fed.earnedIncome', 'fed.actc',
            'fed.eitcEarnedRow', 'fed.eitcIncomeRow', 'fed.eitc', 'fed.aotcRefundable', 'fed.ptcHouseholdIncome', 'fed.ptcPovertyLine', 'fed.ptcFplPercent', 'fed.ptcApplicableFigure', 'fed.ptcContribution', 'fed.ptcAllowed', 'fed.netPtc', 'fed.refundableCredits'] },
    { id: 'calc-other-taxes', stepLabel: 'Step 7 • Schedule 2 & 3 Other Taxes', title: 'Self-Employment Tax, NIIT & Other Taxes',
        quantities: ['fed.seEarnings', 'fed.seSsTax', 'fed.seMedTax', 'fed.seTax', 'fed.halfSeTax', 'fed.excessMedicareWages', 'fed.additionalMedicareTax',
            'fed.netInvestmentIncome', 'fed.niitBase', 'fed.niit', 'fed.amt', 'fed.earlyDistributionPenalty', 'fed.hsaExcise', 'fed.tipsFica', 'fed.householdFica', 'fed.householdFuta', 'fed.householdTax', 'fed.excessAptcRepayment', 'fed.otherTaxes', 'fed.excessSS'] },
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
