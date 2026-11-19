import assert from 'assert';
import { calculateTaxes } from '../tax-engine.js';
import { TaxAppState, FormulaToken } from '../types.js';
import { buildFederalSpine, contextFromState } from '../graph/federal-spine.js';
import { FormulaGraph, lineDomId } from '../graph/graph.js';
import { gt, lit, ref, sub, when, mul, rate } from '../graph/expr.js';

const tokensText = (ts: FormulaToken[]) => ts.map(t => (t.type === 'text' ? t.text : t.valueFormatted)).join('');

const scenario: TaxAppState = {
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

// 1. Graph is well-formed
const graph = buildFederalSpine();
assert.deepStrictEqual(graph.validate(), [], 'every ref/param/collection resolves');

// 2. Same answers as the current engine on the shared spine
const ev = graph.evaluate(contextFromState(scenario));
const legacy = calculateTaxes(scenario);
assert.strictEqual(ev.value('fed.agi'), legacy.agiCalc.result, 'AGI parity');
assert.strictEqual(ev.value('fed.deduction'), legacy.deductionCalc.result, 'deduction parity');
assert.strictEqual(ev.value('fed.taxableIncome'), legacy.taxableIncomeCalc.result, 'taxable income parity');
assert.strictEqual(ev.value('fed.tax'), legacy.taxBeforeCreditsCalc.result, 'income tax parity');

// 3. Displayed math is the math that ran: every line's plugged text ends with its own result
for (const id of graph.quantities.keys()) {
  if (graph.quantities.get(id)!.display === 'inline') continue;
  for (const line of ev.lines(id)) {
    assert.ok(tokensText(line.pluggedTokens).endsWith(line.resultFormatted), `${line.id} shows its result`);
  }
}
const adjLine = ev.lines('fed.adjustments')[0];
assert.strictEqual(
  tokensText(adjLine.pluggedTokens),
  'Adjustments to Income = min($3,000.00, $2,500.00) + $5,000.00 + $1,000.00 = $8,500.00',
  'inline quantity (student loan cap) is expanded inside its parent, with the real numbers'
);
assert.strictEqual(
  tokensText(adjLine.generalTokens),
  'Adjustments to Income = min(Student Loan Interest Paid, Student Loan Interest Cap) + Traditional IRA Deduction + HSA Deduction'
);
const wagesLine = ev.lines('fed.wages')[0];
assert.strictEqual(tokensText(wagesLine.pluggedTokens), 'Total W-2 Wages = $90,000.00 + $30,000.00 = $120,000.00');
const taxLines = ev.lines('fed.tax');
assert.ok(taxLines.length > 1 && taxLines[0].label.startsWith('Bracket 1'), 'bracket slices become intermediate lines');

// 4. Arrows come from the formulas, including through inline quantities
const lineIds = [...graph.quantities.values()].filter(q => q.display !== 'inline').map(q => q.id);
const edges = ev.edges(lineIds).map(e => `${e.sourceId}->${e.targetId}`);
assert.ok(edges.includes(`w2-0-box1->${lineDomId('fed.wages')}`));
assert.ok(edges.includes(`w2-1-box1->${lineDomId('fed.wages')}`));
assert.ok(edges.includes(`input-adj-student-loan->${lineDomId('fed.adjustments')}`), 'inline dependency attributed to the line that shows it');
assert.ok(edges.includes(`w2-1-state-0-box17->${lineDomId('fed.salt')}`));
assert.ok(edges.includes(`${lineDomId('fed.agi')}->${lineDomId('fed.taxableIncome')}`));
assert.ok(ev.upstream('fed.tax').includes('w2-0-box1'), 'transitive upstream reaches raw inputs');

// 5. Auto-applied items: exactly one of refund / owed applies
assert.strictEqual(ev.applies('fed.refund') !== ev.applies('fed.owed'), true);

// 6. Conditionals render the branch that ran and why
{
  const g = new FormulaGraph();
  g.input({ id: 'in.x', label: 'Earnings', unit: 'usd', domId: 'x' });
  g.quantity({ id: 'q.tax', label: 'Small Tax', unit: 'usd',
    expr: when(gt(ref('in.x'), lit(400)), mul(ref('in.x'), rate(0.1)), lit(0)) });
  const e1 = g.evaluate({ year: 2024, status: 'single', inputs: { 'in.x': 1000 }, collections: {} });
  assert.strictEqual(tokensText(e1.lines('q.tax')[0].pluggedTokens), 'Small Tax = $1,000.00 × 10%  ⟨since $1,000.00 > $400.00⟩ = $100.00');
  assert.strictEqual(tokensText(e1.lines('q.tax')[0].generalTokens), 'Small Tax = ((Earnings × 10%) if Earnings > $400.00, otherwise $0.00)');
  const e2 = g.evaluate({ year: 2024, status: 'single', inputs: { 'in.x': 100 }, collections: {} });
  assert.strictEqual(e2.value('q.tax'), 0);
}

// 7. Cycles are caught
{
  const g = new FormulaGraph();
  g.quantity({ id: 'a', label: 'A', unit: 'usd', expr: sub(ref('b'), lit(1)) });
  g.quantity({ id: 'b', label: 'B', unit: 'usd', expr: ref('a') });
  assert.throws(() => g.evaluate({ year: 2024, status: 'single', inputs: {}, collections: {} }).value('a'), /Cycle/);
}

console.log('✓ Formula graph prototype: parity with calculateTaxes, rendered math == evaluated math, derived arrows, conditionals, cycle detection');
