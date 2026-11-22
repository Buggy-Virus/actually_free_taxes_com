/**
 * Form 1040 lines read from the graph must tie out the way the printed form does, for every year layout.
 */
import assert from 'assert';
import { calculateTaxes } from '../tax-engine.js';
import { TaxAppState } from '../types.js';
import { form1040Lines, form1040FieldValues } from '../form1040.js';
import { FORM_1040_FIELDS } from '../form1040-fields.js';

const base = (year: 2024 | 2025 | 2026, extra: Partial<TaxAppState> = {}): TaxAppState => ({
  year, filingStatus: 'married_joint', residentState: 'TX',
  w2s: [{ id: 0, employer: 'A', ein: '', box1: 95000, box2: 9000, box3: 95000, box4: 5890, box5: 95000, box6: 1377.5, states: [] }],
  otherIncome: { interest: 1200, sources: [{ id: 1, type: '1099-DIV', payer: 'Fund', amount: 3000, qualifiedDividends: 2500 },
    { id: 2, type: '1099-NEC', payer: 'Client', amount: 20000 }, { id: 3, type: 'SSA-1099', payer: 'SSA', amount: 14000 }],
    capitalGains: { shortTerm: -1000, longTerm: 6000 } },
  adjustments: { studentLoan: 1500, ira: 4000, hsa: 0 },
  itemizedDeductions: { medicalExpenses: 0, realEstateTax: 9000, mortgageInterest: 16000, charity: 4000 },
  dependents: { childrenCount: 2, childCareExpenses: 4000 },
  showAllArrows: false, ...extra
} as TaxAppState);

const close = (a: number, b: number, msg: string) => assert.ok(Math.abs(a - b) < 0.02, `${msg}: ${a} vs ${b}`);

for (const year of [2024, 2025, 2026] as const) {
  for (const extra of [{}, { filingStatus: 'single' as const, dependents: { childrenCount: 0 } }, { w2s: [] as TaxAppState['w2s'] }]) {
    const state = base(year, extra);
    const s = calculateTaxes(state);
    const lines = form1040Lines(s.federalEval!, year);
    const L = (n: string) => lines.find(l => l.line === n)?.value ?? 0;
    const agi = year >= 2025 ? L('11a') : L('11');
    const ded = year >= 2025 ? L('12e') + L('13a') + L('13b') : L('12') + L('13');
    close(L('1z') + L('2b') + L('3b') + L('5b') + L('6b') + L(year >= 2025 ? '7a' : '7') + L('8'), L('9'), `${year} line 9 = sum of income lines`);
    close(L('9') - L('10'), agi, `${year} line 11 = 9 − 10`);
    close(ded, L('14'), `${year} line 14 = deductions`);
    close(Math.max(0, agi - L('14')), L('15'), `${year} line 15 = 11 − 14`);
    close(L('16') + L('17'), L('18'), `${year} line 18`);
    close(L('19') + L('20'), L('21'), `${year} line 21`);
    close(L('22') + L('23'), L('24'), `${year} line 24 = 22 + 23`);
    close(L('25a') + L('25b') + L('25c'), L('25d'), `${year} line 25d`);
    close(L('25d') + L('26') + L('32'), L('33'), `${year} line 33 = 25d + 26 + 32`);
    close(Math.max(0, L('33') - L('24')), L('34'), `${year} line 34 = overpaid`);
    close(Math.max(0, L('24') + L('38') - L('33')), L('37'), `${year} line 37 = owed (incl. penalty)`);
    // Every computed line has a PDF field in that year's layout.
    const fields = form1040FieldValues(lines, year);
    const layout = FORM_1040_FIELDS[year >= 2025 ? 2025 : 2024];
    lines.forEach(l => assert.ok(layout[l.line], `${year}: Form 1040 line ${l.line} has a PDF field`));
    assert.ok(Object.keys(fields).length > 10, `${year}: fields filled`);
  }
}
console.log('✓ Form 1040: lines tie out (9, 11, 14, 15, 18, 21, 24, 25d, 33, 34, 37) for 2024–2026 and map to PDF fields');
