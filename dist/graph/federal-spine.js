/**
 * Prototype: the Federal 1040 spine (wages → AGI → deduction → taxable income → tax → refund/owed)
 * written as formula-graph quantities. This is the only place this math exists; formula lines,
 * "With Your Numbers", and arrows are all derived from it.
 *
 * Deliberately small: it demonstrates collections (W-2s), scalar inputs, year/status params,
 * inline vs. line quantities, bracket tables, and auto-applied items (refund vs. owed).
 */
import { TAX_CONSTANTS, normalizeFilingStatus } from '../tax-engine.js';
import { add, atLeast0, brackets, each, gte, lt, max, min, param, ref, round, sub } from './expr.js';
import { FormulaGraph } from './graph.js';
const yearRules = (year) => TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];
export function buildFederalSpine() {
    const g = new FormulaGraph();
    // ---- user inputs (each knows its DOM element, so arrows need no hand wiring) ----
    g.collection({
        id: 'w2',
        itemLabel: i => `W-2 #${i + 1}`,
        fields: {
            box1: { label: 'W-2 Box 1 Wages', unit: 'usd', domId: it => `w2-${it.id}-box1` },
            box2: { label: 'W-2 Box 2 Federal Withholding', unit: 'usd', domId: it => `w2-${it.id}-box2` }
        }
    });
    g.collection({
        id: 'w2State',
        itemLabel: i => `State line #${i + 1}`,
        fields: {
            withheld: { label: 'W-2 Box 17 State Withholding', unit: 'usd', domId: it => `${it.key}-box17` }
        }
    });
    g.input({ id: 'in.interest', label: 'Taxable Interest', unit: 'usd', domId: 'input-other-interest' });
    g.input({ id: 'in.studentLoan', label: 'Student Loan Interest Paid', unit: 'usd', domId: 'input-adj-student-loan' });
    g.input({ id: 'in.ira', label: 'Traditional IRA Deduction', unit: 'usd', domId: 'input-adj-ira' });
    g.input({ id: 'in.hsa', label: 'HSA Deduction', unit: 'usd', domId: 'input-adj-hsa' });
    g.input({ id: 'in.realEstateTax', label: 'Real Estate Tax', unit: 'usd', domId: 'input-itemized-salt' });
    g.input({ id: 'in.mortgage', label: 'Mortgage Interest', unit: 'usd', domId: 'input-itemized-mortgage' });
    g.input({ id: 'in.charity', label: 'Charitable Gifts', unit: 'usd', domId: 'input-itemized-charity' });
    // ---- law constants: data keyed by year/status, with citations ----
    g.param({
        id: 'fed.stdDeduction', label: 'Standard Deduction', unit: 'usd',
        source: 'Form 1040 Line 12 instructions; annual Rev. Proc. inflation adjustments',
        resolve: ctx => yearRules(ctx.year).standardDeduction[ctx.status]
    });
    g.param({
        id: 'fed.saltCap', label: 'SALT Cap', unit: 'usd', source: 'IRC §164(b)(6)',
        // 2025+ value from the 2025 reconciliation act; its >$500k MAGI phase-down would be its own quantity.
        resolve: ctx => (ctx.year >= 2025 ? 40000 : 10000) / (ctx.status === 'married_separate' ? 2 : 1)
    });
    g.param({ id: 'fed.studentLoanCap', label: 'Student Loan Interest Cap', unit: 'usd', source: 'IRC §221(b)(1)', resolve: () => 2500 });
    g.param({
        id: 'fed.brackets', label: 'Federal Tax Brackets', unit: 'usd', source: 'IRC §1(j); annual Rev. Proc.',
        resolve: ctx => yearRules(ctx.year).brackets[ctx.status]
    });
    // ---- quantities ----
    g.quantity({ id: 'fed.wages', label: 'Total W-2 Wages', unit: 'usd', form: 'Form 1040 Line 1a', category: 'wages', expr: each('w2', 'box1') });
    g.quantity({ id: 'fed.totalIncome', label: 'Total Income', unit: 'usd', form: 'Form 1040 Line 9', category: 'wages',
        expr: add(ref('fed.wages'), ref('in.interest')) });
    // Inline: shown expanded inside Adjustments ("min($3,000, $2,500) + ...") rather than as its own line.
    g.quantity({ id: 'fed.studentLoanDeduction', label: 'Student Loan Interest Deduction', unit: 'usd', display: 'inline',
        expr: min(ref('in.studentLoan'), param('fed.studentLoanCap')) });
    g.quantity({ id: 'fed.adjustments', label: 'Adjustments to Income', unit: 'usd', form: 'Schedule 1 Line 26', category: 'adjustments',
        expr: add(ref('fed.studentLoanDeduction'), ref('in.ira'), ref('in.hsa')) });
    g.quantity({ id: 'fed.agi', label: 'Adjusted Gross Income', unit: 'usd', form: 'Form 1040 Line 11', category: 'wages',
        expr: atLeast0(sub(ref('fed.totalIncome'), ref('fed.adjustments'))) });
    g.quantity({ id: 'fed.saltPaid', label: 'State & Local Taxes Paid', unit: 'usd', display: 'inline',
        expr: add(each('w2State', 'withheld'), ref('in.realEstateTax')) });
    g.quantity({ id: 'fed.salt', label: 'SALT Deduction', unit: 'usd', form: 'Schedule A Line 5e', category: 'itemized',
        expr: min(param('fed.saltCap'), ref('fed.saltPaid')) });
    g.quantity({ id: 'fed.itemized', label: 'Itemized Deductions', unit: 'usd', form: 'Schedule A Line 17', category: 'itemized',
        expr: add(ref('fed.salt'), ref('in.mortgage'), ref('in.charity')) });
    g.quantity({ id: 'fed.deduction', label: 'Deduction', unit: 'usd', form: 'Form 1040 Line 12', category: 'status',
        expr: max(param('fed.stdDeduction'), ref('fed.itemized')) });
    g.quantity({ id: 'fed.taxableIncome', label: 'Taxable Income', unit: 'usd', form: 'Form 1040 Line 15', category: 'tax',
        expr: atLeast0(sub(ref('fed.agi'), ref('fed.deduction'))) });
    g.quantity({ id: 'fed.tax', label: 'Income Tax', unit: 'usd', form: 'Form 1040 Line 16', category: 'tax',
        expr: round(brackets(ref('fed.taxableIncome'), 'fed.brackets')) });
    g.quantity({ id: 'fed.payments', label: 'Federal Withholding', unit: 'usd', form: 'Form 1040 Line 25a', category: 'withholding',
        expr: each('w2', 'box2') });
    // Auto-applied: exactly one of these exists for a given return, decided by the graph, not by UI code.
    g.quantity({ id: 'fed.refund', label: 'Refund', unit: 'usd', form: 'Form 1040 Line 34', category: 'refund',
        appliesWhen: gte(ref('fed.payments'), ref('fed.tax')), expr: sub(ref('fed.payments'), ref('fed.tax')) });
    g.quantity({ id: 'fed.owed', label: 'Amount You Owe', unit: 'usd', form: 'Form 1040 Line 37', category: 'owed',
        appliesWhen: lt(ref('fed.payments'), ref('fed.tax')), expr: sub(ref('fed.tax'), ref('fed.payments')) });
    return g;
}
/** Adapter from the existing app state to the graph's input context. */
export function contextFromState(state) {
    const w2s = state.w2s || [];
    return {
        year: state.year || 2024,
        status: normalizeFilingStatus(state.filingStatus || 'single'),
        inputs: {
            'in.interest': Number(state.otherIncome?.interest) || 0,
            'in.studentLoan': Number(state.adjustments?.studentLoan) || 0,
            'in.ira': Number(state.adjustments?.ira) || 0,
            'in.hsa': Number(state.adjustments?.hsa) || 0,
            'in.realEstateTax': Number(state.itemizedDeductions?.realEstateTax) || 0,
            'in.mortgage': Number(state.itemizedDeductions?.mortgageInterest) || 0,
            'in.charity': Number(state.itemizedDeductions?.charity) || 0
        },
        collections: {
            w2: w2s.map(w => ({ id: w.id, values: { box1: Number(w.box1) || 0, box2: Number(w.box2) || 0 } })),
            w2State: w2s.flatMap(w => (w.states || []).map(s => ({
                id: w.id * 100 + s.id,
                key: `w2-${w.id}-state-${s.id}`,
                values: { withheld: Number(s.stateTaxWithheld) || 0 }
            })))
        }
    };
}
