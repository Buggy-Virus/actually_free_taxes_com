import assert from 'assert';
import { calculateTaxes } from '../tax-engine.js';
import { reviewReturn } from '../validation.js';
const base = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'CA',
    w2s: [{ id: 0, employer: 'A', ein: '', box1: 60000, box2: 6000, box3: 60000, box4: 3720, box5: 60000, box6: 870, states: [] }],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    itemizedDeductions: { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: false
};
const review = (s) => reviewReturn(s, calculateTaxes(s));
const has = (s, re) => review(s).some(m => re.test(m.message));
assert.deepStrictEqual(review(base), [], 'a clean return has nothing to review');
// Filing status
assert.ok(has({ ...base, filingStatus: 'head_of_household' }, /Head of Household requires/));
assert.ok(!has({ ...base, filingStatus: 'head_of_household', dependents: { childrenCount: 1 } }, /Head of Household/));
assert.ok(has({ ...base, filingStatus: 'head_of_household',
    dependents: { childrenCount: 0, list: [{ id: 1, name: 'Kid', birthYear: 2015, relationship: 'child', monthsLived: 4 }] } }, /Head of Household requires/), 'a child who lived with you 6 months or less does not qualify you for HOH');
assert.ok(has({ ...base, filingStatus: 'qualifying_surviving_spouse' }, /Qualifying Surviving Spouse requires/));
assert.ok(has({ ...base, residentState: undefined }, /state of residence/));
// W-2 consistency
const w2 = (patch) => ({ ...base, w2s: [{ ...base.w2s[0], ...patch }] });
assert.ok(has(w2({ box2: 70000 }), /more than wages/));
assert.ok(has(w2({ box3: 200000, box4: 12400 }), /wage base/));
assert.ok(has(w2({ box4: 4000 }), /should be 6\.2%/));
assert.ok(!has(w2({ box4: 3720.5 }), /6\.2%/), 'within $1 rounding tolerance');
assert.ok(has(w2({ box3: 168600, box4: 11000 }), /ask the employer for a refund/));
assert.ok(has(w2({ box6: 500 }), /Medicare tax \(box 6\)/));
assert.ok(has(w2({ box5: 0, box6: 0 }), /Medicare wages \(box 5\) are blank/));
// Dependents
const dep = (d) => ({ ...base, dependents: { childrenCount: 0, list: [{ id: 1, name: 'Kid', birthYear: 2015, relationship: 'child', monthsLived: 12, ...d }] } });
assert.ok(has(dep({ birthYear: 2030 }), /valid birth year/));
assert.ok(has(dep({ monthsLived: 3 }), /isn't a qualifying child/));
assert.ok(has(dep({ birthYear: 2003 }), /age 21 and not a full-time student/));
assert.ok(!has(dep({ birthYear: 2003, student: true }), /qualifying child/));
// Penalty heads-up comes from the graph's Form 2210 line
assert.ok(has({ ...base, priorYearTax: 5000, priorYearAgi: 55000, w2s: [{ ...base.w2s[0], box2: 0 }] }, /underpayment penalty/));
assert.ok(!has({ ...base, w2s: [{ ...base.w2s[0], box2: 0 }] }, /underpayment penalty/), "no prior-year tax entered: no Form 2210 line");
// Filing requirement
const low = { ...base, w2s: [{ ...base.w2s[0], box1: 9000, box2: 300, box3: 9000, box4: 558, box5: 9000, box6: 130.5 }] };
assert.ok(has(low, /under the \$14,600 filing threshold.*file anyway to get your \$[0-9,]+ refund/), 'low income: not required to file, but refund available');
assert.ok(!has(base, /filing threshold/));
assert.ok(!has({ ...low, otherIncome: { interest: 0, sources: [{ id: 9, type: '1099-NEC', payer: 'x', amount: 1000 }] } }, /filing threshold/), '$400+ of SE earnings requires a return');
assert.ok(has({ ...low, taxpayer: { birthYear: 1950 }, w2s: [{ ...low.w2s[0], box1: 15000, box3: 15000, box5: 15000, box4: 930, box6: 217.5 }] }, /under the \$16,550 filing threshold/), '65+ raises the threshold');
console.log('✓ Review checks: filing status, W-2 consistency, dependents, underpayment heads-up, filing requirement');
