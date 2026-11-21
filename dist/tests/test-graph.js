import assert from 'assert';
import { calculateTaxes } from '../tax-engine.js';
import { federalGraph, federalContext } from '../graph/federal.js';
import { returnGraph, planFromState } from '../graph/states.js';
import { STATE_TAX_RULES } from '../state-rules.js';
import { FormulaGraph, lineDomId, tokensToText } from '../graph/graph.js';
import { gt, lit, ref, sub, when, mul, rate } from '../graph/expr.js';
const text = (ts) => tokensToText(ts);
const scenario = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'CA',
    w2s: [
        { id: 0, employer: 'A', ein: '', box1: 90000, box2: 12000, box3: 90000, box4: 5580, box5: 90000, box6: 1305,
            states: [{ id: 0, state: 'CA', stateId: '', stateWages: 90000, stateTaxWithheld: 6000, localWages: 0, localTaxWithheld: 0, localityName: '' }] },
        { id: 1, employer: 'B', ein: '', box1: 30000, box2: 2500, box3: 30000, box4: 1860, box5: 30000, box6: 435,
            states: [{ id: 0, state: 'CA', stateId: '', stateWages: 30000, stateTaxWithheld: 1500, localWages: 0, localTaxWithheld: 0, localityName: '' }] }
    ],
    otherIncome: { interest: 800 },
    adjustments: { studentLoan: 3000, ira: 5000, hsa: 1000 },
    itemizedDeductions: { medicalExpenses: 0, realEstateTax: 6000, mortgageInterest: 9000, charity: 2000 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
};
// 1. Every graph is well-formed: the federal graph and a return graph for every state as resident.
assert.deepStrictEqual(federalGraph().validate(), [], 'federal graph: every ref/param/collection resolves');
for (const code of Object.keys(STATE_TAX_RULES)) {
    for (const year of [2024, 2025]) {
        const plan = planFromState({ ...scenario, year: year, residentState: code, w2s: [{ ...scenario.w2s[0], states: [{ ...scenario.w2s[0].states[0], state: code }] }, { ...scenario.w2s[1], states: [{ ...scenario.w2s[1].states[0], state: code === 'NY' ? 'NJ' : 'NY' }] }] });
        assert.deepStrictEqual(returnGraph(plan).validate(), [], `${code} ${year} return graph resolves`);
    }
}
// 2. The summary is read from the graph
const ev = federalGraph().evaluate(federalContext(scenario));
const summary = calculateTaxes(scenario);
assert.strictEqual(ev.value('fed.agi'), summary.agiCalc.result, 'AGI read from graph');
assert.strictEqual(ev.value('fed.tax'), summary.taxBeforeCreditsCalc.result, 'tax read from graph');
// 3. Displayed math is the math that ran: every line's plugged text ends with its own result
for (const [id, q] of federalGraph().quantities) {
    if (q.display === 'inline')
        continue;
    for (const line of ev.lines(id)) {
        assert.ok(text(line.pluggedTokens).endsWith(line.resultFormatted), `${line.id} shows its result`);
    }
}
const adjLine = ev.lines('fed.adjustments').slice(-1)[0];
assert.strictEqual(text(adjLine.pluggedTokens), 'Adjustments to Income = min($3,000.00, $2,500.00) + $5,000.00 + $1,000.00 = $8,500.00', 'inline quantity (student loan cap) is expanded inside its parent; $0 optional inputs are omitted');
assert.strictEqual(text(adjLine.generalTokens), 'Adjustments to Income = min(Student Loan Interest Paid, Student Loan Interest Cap) + Traditional IRA Deduction + HSA Deduction');
assert.strictEqual(text(ev.lines('fed.wages')[0].pluggedTokens), 'Total W-2 Wages = $90,000.00 + $30,000.00 = $120,000.00');
const taxLines = ev.lines('fed.ordinaryTax');
assert.ok(taxLines.length > 1 && taxLines[0].label.startsWith('Bracket 1'), 'bracket slices become intermediate lines');
// 4. Arrows come from the formulas, including through inline quantities
const visible = [...federalGraph().quantities.values()].filter(q => q.display !== 'inline').map(q => q.id);
const edges = ev.edges(visible).map(e => `${e.sourceId}->${e.targetId}`);
assert.ok(edges.includes(`w2-0-box1->${lineDomId('fed.wages')}`));
assert.ok(edges.includes(`w2-1-box1->${lineDomId('fed.wages')}`));
assert.ok(edges.includes(`input-adj-student-loan->${lineDomId('fed.adjustments')}`), 'inline dependency attributed to the line that shows it');
assert.ok(edges.includes(`w2-1-state-0-box17->${lineDomId('fed.salt')}`));
assert.ok(edges.includes(`${lineDomId('fed.agi')}->${lineDomId('fed.taxableIncome')}`));
assert.ok(ev.upstream('fed.tax').includes('w2-0-box1'), 'transitive upstream reaches raw inputs');
// Off-screen quantities are looked through: with only Taxable Income visible, its arrows come from what feeds AGI.
const onlyTaxable = ev.edges(['fed.taxableIncome']).map(e => e.sourceId);
assert.ok(onlyTaxable.includes('w2-0-box1') && !onlyTaxable.includes(lineDomId('fed.agi')), 'arrows never point at hidden lines');
// 5. Auto-applied items: exactly one of refund / owed applies
assert.strictEqual(ev.applies('fed.refund') !== ev.applies('fed.owed'), true);
// 6. Conditionals render the branch that ran and why
{
    const g = new FormulaGraph();
    g.input({ id: 'in.x', label: 'Earnings', unit: 'usd', domId: 'x' });
    g.quantity({ id: 'q.tax', label: 'Small Tax', unit: 'usd',
        expr: when(gt(ref('in.x'), lit(400)), mul(ref('in.x'), rate(0.1)), lit(0)) });
    const e1 = g.evaluate({ year: 2024, status: 'single', inputs: { 'in.x': 1000 }, collections: {} });
    assert.strictEqual(text(e1.lines('q.tax')[0].pluggedTokens), 'Small Tax = $1,000.00 × 10%  ⟨since $1,000.00 > $400.00⟩ = $100.00');
    assert.strictEqual(text(e1.lines('q.tax')[0].generalTokens), 'Small Tax = ((Earnings × 10%) if Earnings > $400.00, otherwise $0.00)');
    const e2 = g.evaluate({ year: 2024, status: 'single', inputs: { 'in.x': 100 }, collections: {} });
    assert.strictEqual(e2.value('q.tax'), 0);
    assert.strictEqual(text(e2.lines('q.tax')[0].pluggedTokens), 'Small Tax = $0.00  ⟨since $100.00 ≤ $400.00⟩ = $0.00', 'false branch explains the inverted condition');
}
// 7. Cycles are caught
{
    const g = new FormulaGraph();
    g.quantity({ id: 'a', label: 'A', unit: 'usd', expr: sub(ref('b'), lit(1)) });
    g.quantity({ id: 'b', label: 'B', unit: 'usd', expr: ref('a') });
    assert.throws(() => g.evaluate({ year: 2024, status: 'single', inputs: {}, collections: {} }).value('a'), /Cycle/);
}
console.log('✓ Formula graph: all 51 state graphs resolve, rendered math == evaluated math, derived arrows, conditionals, cycle detection');
