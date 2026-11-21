/**
 * Randomized robustness test: the whole engine on seeded random returns (all filing statuses,
 * both years, all jurisdictions, every income type). Checks it never throws, never produces
 * NaN/Infinity, and that every displayed formula line ends with its own result.
 */
import assert from 'assert';
import { calculateTaxes } from '../tax-engine.js';
import { tokensToText } from '../graph/graph.js';
import { STATE_TAX_RULES } from '../state-rules.js';
let seed = 20261121;
const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
const pick = (a) => a[Math.floor(rnd() * a.length)];
const money = (max) => Math.round(rnd() * max * 100) / 100;
const maybe = (p, f) => (rnd() < p ? f() : 0);
const STATES = Object.keys(STATE_TAX_RULES);
const TYPES = ['1099-NEC', '1099-K', 'Schedule F', '1099-INT', '1099-DIV', 'Schedule K-1', '1099-R', 'SSA-1099', 'W-2G', '1099-MISC', '1099-G', 'Other'];
function randomReturn() {
    const resident = pick(STATES);
    const status = pick(['single', 'married_joint', 'married_separate', 'head_of_household', 'qualifying_surviving_spouse']);
    const w2s = Array.from({ length: Math.floor(rnd() * 3) }, (_, id) => {
        const wages = money(pick([25000, 90000, 300000]));
        const ss = Math.min(wages, 168600);
        return {
            id, employer: `E${id}`, ein: '', box1: wages, box2: money(wages * 0.2), box3: ss, box4: Math.round(ss * 6.2) / 100,
            box5: wages, box6: Math.round(wages * 1.45 + Math.max(0, wages - 200000) * 0.9) / 100,
            owner: rnd() < 0.4 ? 'spouse' : 'taxpayer', box13Retirement: rnd() < 0.4,
            box12aCode: pick(['', 'D', 'W', 'DD']), box12aAmount: money(8000),
            states: [{ id: 0, state: rnd() < 0.7 ? resident : pick(STATES), stateId: '', stateWages: wages, stateTaxWithheld: money(wages * 0.06),
                    localWages: maybe(0.2, () => wages), localTaxWithheld: maybe(0.2, () => money(3000)), localityName: pick(['', 'NYC', 'Yonkers']) }]
        };
    });
    const sources = Array.from({ length: Math.floor(rnd() * 5) }, (_, i) => ({
        id: i + 1, type: pick(TYPES), payer: `P${i}`, amount: money(pick([3000, 40000])) - (rnd() < 0.05 ? 5000 : 0),
        qualifiedDividends: maybe(0.5, () => money(5000)), accruedInterestPaid: maybe(0.1, () => money(300)), taxExemptInterest: maybe(0.2, () => money(4000)),
        usTreasuryInterest: maybe(0.2, () => money(3000)), capitalGainDistributions: maybe(0.2, () => money(4000)),
        taxableAmount: rnd() < 0.3 ? money(20000) : undefined, rollover: rnd() < 0.1, earlyDistributionPenalty: rnd() < 0.2,
        federalTaxWithheld: maybe(0.3, () => money(2000)), state: rnd() < 0.2 ? pick(STATES) : undefined
    }));
    return {
        year: pick([2024, 2025]), filingStatus: status, residentState: resident, w2s,
        deductionMethod: pick(['auto', 'auto', 'standard', 'itemized']), claimedAsDependent: rnd() < 0.05,
        otherIncome: {
            interest: maybe(0.4, () => money(5000)), sources, scheduleCExpenses: maybe(0.3, () => money(40000)),
            capitalGains: { shortTerm: maybe(0.3, () => money(30000) - 15000), longTerm: maybe(0.4, () => money(100000) - 20000),
                collectiblesGain: maybe(0.1, () => money(5000)), unrecaptured1250Gain: maybe(0.1, () => money(5000)), carryoverLoss: maybe(0.1, () => money(8000)) },
            scheduleERental: { grossRents: maybe(0.2, () => money(40000)), expenses: maybe(0.2, () => money(30000)), depreciation: maybe(0.2, () => money(10000)), propertyState: rnd() < 0.3 ? pick(STATES) : '' },
            alimonyReceived: maybe(0.05, () => money(10000)), foreignEarnedIncomeExclusion: maybe(0.05, () => money(140000)), unreportedTips: maybe(0.05, () => money(3000))
        },
        adjustments: { studentLoan: maybe(0.3, () => money(4000)), ira: maybe(0.3, () => money(8000)), hsa: maybe(0.3, () => money(10000)),
            hsaCoverage: pick(['self', 'family']), hsaCatchUp: rnd() < 0.2, iraCatchUp: rnd() < 0.2, educatorExpenses: maybe(0.1, () => money(800)),
            seRetirement: maybe(0.1, () => money(20000)), seHealthInsurance: maybe(0.1, () => money(8000)),
            qualifiedTips: maybe(0.1, () => money(30000)), qualifiedOvertime: maybe(0.1, () => money(30000)), carLoanInterest: maybe(0.1, () => money(12000)) },
        itemizedDeductions: { medicalExpenses: maybe(0.3, () => money(30000)), realEstateTax: maybe(0.4, () => money(20000)), mortgageInterest: maybe(0.4, () => money(30000)),
            charity: maybe(0.4, () => money(10000)), gamblingLosses: maybe(0.05, () => money(5000)), investmentInterest: maybe(0.05, () => money(5000)), casualtyLoss: maybe(0.05, () => money(5000)) },
        dependents: { childrenCount: Math.floor(rnd() * 4), otherDependentsCount: Math.floor(rnd() * 2), age65OrBlindCount: Math.floor(rnd() * 3), seniorsCount: Math.floor(rnd() * 3),
            childCareExpenses: maybe(0.3, () => money(8000)), educationExpensesAotc: maybe(0.2, () => money(5000)), educationExpensesLlc: maybe(0.1, () => money(12000)),
            estimatedTaxPayments: maybe(0.2, () => money(10000)), premiumTaxCredit: maybe(0.05, () => money(2000)), householdEmploymentTax: maybe(0.05, () => money(2000)),
            list: rnd() < 0.5 ? Array.from({ length: Math.floor(rnd() * 4) }, (_, i) => ({ id: i + 1, name: `D${i}`, birthYear: 1950 + Math.floor(rnd() * 75),
                relationship: rnd() < 0.8 ? 'child' : 'relative', monthsLived: Math.floor(rnd() * 13), student: rnd() < 0.3, disabled: rnd() < 0.05, hasSsn: rnd() < 0.95 })) : undefined },
        statePanels: [],
        partYear: rnd() < 0.15 ? { priorState: pick(STATES), moveMonth: 2 + Math.floor(rnd() * 11) } : undefined,
        taxpayer: rnd() < 0.5 ? { birthYear: 1940 + Math.floor(rnd() * 70), blind: rnd() < 0.05 } : undefined,
        spouse: rnd() < 0.5 ? { birthYear: 1940 + Math.floor(rnd() * 70), blind: rnd() < 0.05 } : undefined,
        showAllArrows: true
    };
}
const N = 300;
for (let i = 0; i < N; i++) {
    const s = randomReturn();
    let r;
    try {
        r = calculateTaxes(s);
    }
    catch (e) {
        throw new Error(`return #${i} threw: ${e.message}\n${JSON.stringify(s)}`);
    }
    const ev = r.federalEval;
    for (const [id, q] of ev.graph.quantities) {
        const v = ev.value(id);
        assert.ok(Number.isFinite(v), `return #${i}: ${id} is ${v}`);
        if (q.display === 'inline')
            continue;
        const lines = ev.lines(id);
        const main = lines[lines.length - 1];
        assert.ok(tokensToText(main.pluggedTokens).endsWith(main.resultFormatted), `return #${i}: ${id} formula does not end with its result`);
    }
    assert.ok(Number.isFinite(r.unifiedSummaryCalc.grandTotalNet), `return #${i}: grand total not finite`);
}
console.log(`✓ Fuzz: ${N} random returns — no exceptions, all values finite, every formula line shows its own result`);
