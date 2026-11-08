/**
 * Actually Free Taxes - Tax Calculation Engine (TypeScript)
 * Supports 2024 & 2025 IRS federal tax rules, brackets, and transparent formula builders.
 */
export const TAX_CONSTANTS = {
    2024: {
        standardDeduction: {
            single: 14600,
            married_joint: 29200,
            married_separate: 14600,
            head_of_household: 21900
        },
        ssWageLimit: 168600,
        ssRate: 0.062,
        medicareRate: 0.0145,
        additionalMedicareRate: 0.009,
        additionalMedicareThreshold: {
            single: 200000,
            married_joint: 250000,
            married_separate: 125000,
            head_of_household: 200000
        },
        childTaxCreditPerChild: 2000,
        childTaxCreditRefundableMax: 1700,
        childTaxCreditPhaseout: {
            single: 200000,
            married_joint: 400000,
            married_separate: 200000,
            head_of_household: 200000
        },
        brackets: {
            single: [
                { rate: 0.10, min: 0, max: 11600 },
                { rate: 0.12, min: 11600, max: 47150 },
                { rate: 0.22, min: 47150, max: 100525 },
                { rate: 0.24, min: 100525, max: 191950 },
                { rate: 0.32, min: 191950, max: 243725 },
                { rate: 0.35, min: 243725, max: 609350 },
                { rate: 0.37, min: 609350, max: Infinity }
            ],
            married_joint: [
                { rate: 0.10, min: 0, max: 23200 },
                { rate: 0.12, min: 23200, max: 94300 },
                { rate: 0.22, min: 94300, max: 201050 },
                { rate: 0.24, min: 201050, max: 383900 },
                { rate: 0.32, min: 383900, max: 487450 },
                { rate: 0.35, min: 487450, max: 731200 },
                { rate: 0.37, min: 731200, max: Infinity }
            ],
            married_separate: [
                { rate: 0.10, min: 0, max: 11600 },
                { rate: 0.12, min: 11600, max: 47150 },
                { rate: 0.22, min: 47150, max: 100525 },
                { rate: 0.24, min: 100525, max: 191950 },
                { rate: 0.32, min: 191950, max: 243725 },
                { rate: 0.35, min: 243725, max: 365600 },
                { rate: 0.37, min: 365600, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.10, min: 0, max: 16550 },
                { rate: 0.12, min: 16550, max: 63100 },
                { rate: 0.22, min: 63100, max: 100500 },
                { rate: 0.24, min: 100500, max: 191950 },
                { rate: 0.32, min: 191950, max: 243700 },
                { rate: 0.35, min: 243700, max: 609350 },
                { rate: 0.37, min: 609350, max: Infinity }
            ]
        }
    },
    2025: {
        standardDeduction: {
            single: 15000,
            married_joint: 30000,
            married_separate: 15000,
            head_of_household: 22500
        },
        ssWageLimit: 176100,
        ssRate: 0.062,
        medicareRate: 0.0145,
        additionalMedicareRate: 0.009,
        additionalMedicareThreshold: {
            single: 200000,
            married_joint: 250000,
            married_separate: 125000,
            head_of_household: 200000
        },
        childTaxCreditPerChild: 2000,
        childTaxCreditRefundableMax: 1700,
        childTaxCreditPhaseout: {
            single: 200000,
            married_joint: 400000,
            married_separate: 200000,
            head_of_household: 200000
        },
        brackets: {
            single: [
                { rate: 0.10, min: 0, max: 11925 },
                { rate: 0.12, min: 11925, max: 48475 },
                { rate: 0.22, min: 48475, max: 103350 },
                { rate: 0.24, min: 103350, max: 197300 },
                { rate: 0.32, min: 197300, max: 250525 },
                { rate: 0.35, min: 250525, max: 626350 },
                { rate: 0.37, min: 626350, max: Infinity }
            ],
            married_joint: [
                { rate: 0.10, min: 0, max: 23850 },
                { rate: 0.12, min: 23850, max: 96950 },
                { rate: 0.22, min: 96950, max: 206700 },
                { rate: 0.24, min: 206700, max: 394600 },
                { rate: 0.32, min: 394600, max: 501050 },
                { rate: 0.35, min: 501050, max: 751600 },
                { rate: 0.37, min: 751600, max: Infinity }
            ],
            married_separate: [
                { rate: 0.10, min: 0, max: 11925 },
                { rate: 0.12, min: 11925, max: 48475 },
                { rate: 0.22, min: 48475, max: 103350 },
                { rate: 0.24, min: 103350, max: 197300 },
                { rate: 0.32, min: 197300, max: 250525 },
                { rate: 0.35, min: 250525, max: 375800 },
                { rate: 0.37, min: 375800, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.10, min: 0, max: 17000 },
                { rate: 0.12, min: 17000, max: 64850 },
                { rate: 0.22, min: 64850, max: 103350 },
                { rate: 0.24, min: 103350, max: 197300 },
                { rate: 0.32, min: 197300, max: 250500 },
                { rate: 0.35, min: 250500, max: 626350 },
                { rate: 0.37, min: 626350, max: Infinity }
            ]
        }
    }
};
export const STATE_TAX_RULES = {
    CA: {
        code: 'CA',
        name: 'California',
        hasIncomeTax: true,
        formResident: 'FTB Form 540',
        formNonResident: 'FTB Form 540NR',
        standardDeduction: {
            single: 5540,
            married_joint: 11080,
            married_separate: 5540,
            head_of_household: 11080
        },
        isFlat: false,
        brackets: {
            single: [
                { rate: 0.01, min: 0, max: 10412 },
                { rate: 0.02, min: 10412, max: 24684 },
                { rate: 0.04, min: 24684, max: 38959 },
                { rate: 0.06, min: 38959, max: 54081 },
                { rate: 0.08, min: 54081, max: 68350 },
                { rate: 0.093, min: 68350, max: 349137 },
                { rate: 0.103, min: 349137, max: 418961 },
                { rate: 0.113, min: 418961, max: 698271 },
                { rate: 0.123, min: 698271, max: Infinity }
            ],
            married_joint: [
                { rate: 0.01, min: 0, max: 20824 },
                { rate: 0.02, min: 20824, max: 49368 },
                { rate: 0.04, min: 49368, max: 77918 },
                { rate: 0.06, min: 77918, max: 108162 },
                { rate: 0.08, min: 108162, max: 136700 },
                { rate: 0.093, min: 136700, max: 698274 },
                { rate: 0.103, min: 698274, max: 837922 },
                { rate: 0.113, min: 837922, max: 1396542 },
                { rate: 0.123, min: 1396542, max: Infinity }
            ],
            married_separate: [
                { rate: 0.01, min: 0, max: 10412 },
                { rate: 0.02, min: 10412, max: 24684 },
                { rate: 0.04, min: 24684, max: 38959 },
                { rate: 0.06, min: 38959, max: 54081 },
                { rate: 0.08, min: 54081, max: 68350 },
                { rate: 0.093, min: 68350, max: 349137 },
                { rate: 0.103, min: 349137, max: 418961 },
                { rate: 0.113, min: 418961, max: 698271 },
                { rate: 0.123, min: 698271, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.01, min: 0, max: 20839 },
                { rate: 0.02, min: 20839, max: 49369 },
                { rate: 0.04, min: 49369, max: 63641 },
                { rate: 0.06, min: 63641, max: 78761 },
                { rate: 0.08, min: 78761, max: 93033 },
                { rate: 0.093, min: 93033, max: 474824 },
                { rate: 0.103, min: 474824, max: 569790 },
                { rate: 0.113, min: 569790, max: 949649 },
                { rate: 0.123, min: 949649, max: Infinity }
            ]
        },
        notes: 'California Schedule S provides credit for taxes paid to other states.'
    },
    NY: {
        code: 'NY',
        name: 'New York',
        hasIncomeTax: true,
        formResident: 'Form IT-201',
        formNonResident: 'Form IT-203',
        standardDeduction: {
            single: 8000,
            married_joint: 16050,
            married_separate: 8000,
            head_of_household: 11200
        },
        isFlat: false,
        brackets: {
            single: [
                { rate: 0.04, min: 0, max: 8500 },
                { rate: 0.045, min: 8500, max: 11700 },
                { rate: 0.0525, min: 11700, max: 13900 },
                { rate: 0.055, min: 13900, max: 80650 },
                { rate: 0.06, min: 80650, max: 215400 },
                { rate: 0.0685, min: 215400, max: 1077550 },
                { rate: 0.0965, min: 1077550, max: Infinity }
            ],
            married_joint: [
                { rate: 0.04, min: 0, max: 17150 },
                { rate: 0.045, min: 17150, max: 23600 },
                { rate: 0.0525, min: 23600, max: 27900 },
                { rate: 0.055, min: 27900, max: 161550 },
                { rate: 0.06, min: 161550, max: 323200 },
                { rate: 0.0685, min: 323200, max: 2155350 },
                { rate: 0.0965, min: 2155350, max: Infinity }
            ],
            married_separate: [
                { rate: 0.04, min: 0, max: 8500 },
                { rate: 0.045, min: 8500, max: 11700 },
                { rate: 0.0525, min: 11700, max: 13900 },
                { rate: 0.055, min: 13900, max: 80650 },
                { rate: 0.06, min: 80650, max: 215400 },
                { rate: 0.0685, min: 215400, max: 1077550 },
                { rate: 0.0965, min: 1077550, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.04, min: 0, max: 12800 },
                { rate: 0.045, min: 12800, max: 17650 },
                { rate: 0.0525, min: 17650, max: 20900 },
                { rate: 0.055, min: 20900, max: 107650 },
                { rate: 0.06, min: 107650, max: 269300 },
                { rate: 0.0685, min: 269300, max: 1616450 },
                { rate: 0.0965, min: 1616450, max: Infinity }
            ]
        },
        notes: 'New York Form IT-112-R grants resident credit for taxes paid to other states.'
    },
    NJ: {
        code: 'NJ',
        name: 'New Jersey',
        hasIncomeTax: true,
        formResident: 'Form NJ-1040',
        formNonResident: 'Form NJ-1040NR',
        standardDeduction: {
            single: 1000,
            married_joint: 2000,
            married_separate: 1000,
            head_of_household: 1000
        },
        isFlat: false,
        brackets: {
            single: [
                { rate: 0.014, min: 0, max: 20000 },
                { rate: 0.0175, min: 20000, max: 35000 },
                { rate: 0.035, min: 35000, max: 40000 },
                { rate: 0.05525, min: 40000, max: 75000 },
                { rate: 0.0637, min: 75000, max: 500000 },
                { rate: 0.0897, min: 500000, max: 1000000 },
                { rate: 0.1075, min: 1000000, max: Infinity }
            ],
            married_joint: [
                { rate: 0.014, min: 0, max: 20000 },
                { rate: 0.0175, min: 20000, max: 50000 },
                { rate: 0.0245, min: 50000, max: 70000 },
                { rate: 0.035, min: 70000, max: 80000 },
                { rate: 0.05525, min: 80000, max: 150000 },
                { rate: 0.0637, min: 150000, max: 500000 },
                { rate: 0.0897, min: 500000, max: 1000000 },
                { rate: 0.1075, min: 1000000, max: Infinity }
            ],
            married_separate: [
                { rate: 0.014, min: 0, max: 20000 },
                { rate: 0.0175, min: 20000, max: 35000 },
                { rate: 0.035, min: 35000, max: 40000 },
                { rate: 0.05525, min: 40000, max: 75000 },
                { rate: 0.0637, min: 75000, max: 500000 },
                { rate: 0.0897, min: 500000, max: 1000000 },
                { rate: 0.1075, min: 1000000, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.014, min: 0, max: 20000 },
                { rate: 0.0175, min: 20000, max: 35000 },
                { rate: 0.035, min: 35000, max: 40000 },
                { rate: 0.05525, min: 40000, max: 75000 },
                { rate: 0.0637, min: 75000, max: 500000 },
                { rate: 0.0897, min: 500000, max: 1000000 },
                { rate: 0.1075, min: 1000000, max: Infinity }
            ]
        },
        reciprocalWith: ['PA'],
        notes: 'NJ and PA have a reciprocal agreement: W-2 wages are taxed only in your resident state. Schedule NJ-CO provides credit for other states (such as NY).'
    },
    PA: {
        code: 'PA',
        name: 'Pennsylvania',
        hasIncomeTax: true,
        formResident: 'Form PA-40',
        formNonResident: 'Form PA-40 Non-Resident',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true,
        flatRate: 0.0307,
        reciprocalWith: ['NJ', 'MD', 'OH', 'VA', 'WV', 'IN'],
        notes: 'Pennsylvania imposes a flat 3.07% tax rate with no standard deduction. Reciprocal with NJ, MD, OH, VA, WV, IN.'
    },
    IL: {
        code: 'IL',
        name: 'Illinois',
        hasIncomeTax: true,
        formResident: 'Form IL-1040',
        formNonResident: 'Form IL-1040 Schedule NR',
        standardDeduction: { single: 2775, married_joint: 5550, married_separate: 2775, head_of_household: 2775 },
        isFlat: true,
        flatRate: 0.0495,
        reciprocalWith: ['IA', 'KY', 'MI', 'WI'],
        notes: 'Flat 4.95% individual income tax rate. Reciprocal agreements with IA, KY, MI, WI.'
    },
    MA: {
        code: 'MA',
        name: 'Massachusetts',
        hasIncomeTax: true,
        formResident: 'Form 1',
        formNonResident: 'Form 1-NR/PY',
        standardDeduction: { single: 4400, married_joint: 8800, married_separate: 4400, head_of_household: 6800 },
        isFlat: true,
        flatRate: 0.05,
        notes: 'Flat 5.0% income tax rate on earned wages.'
    },
    // NO INCOME TAX ON WAGES:
    TX: { code: 'TX', name: 'Texas', hasIncomeTax: false, formResident: 'No State Return Required', formNonResident: 'No State Return Required', standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 }, isFlat: true, flatRate: 0, notes: 'Texas has no state personal income tax.' },
    FL: { code: 'FL', name: 'Florida', hasIncomeTax: false, formResident: 'No State Return Required', formNonResident: 'No State Return Required', standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 }, isFlat: true, flatRate: 0, notes: 'Florida has no state personal income tax.' },
    WA: { code: 'WA', name: 'Washington', hasIncomeTax: false, formResident: 'No State Return Required', formNonResident: 'No State Return Required', standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 }, isFlat: true, flatRate: 0, notes: 'Washington has no state wage income tax.' },
    NV: { code: 'NV', name: 'Nevada', hasIncomeTax: false, formResident: 'No State Return Required', formNonResident: 'No State Return Required', standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 }, isFlat: true, flatRate: 0, notes: 'Nevada has no state personal income tax.' },
    TN: { code: 'TN', name: 'Tennessee', hasIncomeTax: false, formResident: 'No State Return Required', formNonResident: 'No State Return Required', standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 }, isFlat: true, flatRate: 0, notes: 'Tennessee has no state personal wage income tax.' },
    WY: { code: 'WY', name: 'Wyoming', hasIncomeTax: false, formResident: 'No State Return Required', formNonResident: 'No State Return Required', standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 }, isFlat: true, flatRate: 0, notes: 'Wyoming has no state personal income tax.' },
    SD: { code: 'SD', name: 'South Dakota', hasIncomeTax: false, formResident: 'No State Return Required', formNonResident: 'No State Return Required', standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 }, isFlat: true, flatRate: 0, notes: 'South Dakota has no state personal income tax.' },
    AK: { code: 'AK', name: 'Alaska', hasIncomeTax: false, formResident: 'No State Return Required', formNonResident: 'No State Return Required', standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 }, isFlat: true, flatRate: 0, notes: 'Alaska has no state personal income tax.' }
};
export function getStateTaxRule(code) {
    const upper = (code || '').toUpperCase().trim();
    if (STATE_TAX_RULES[upper])
        return STATE_TAX_RULES[upper];
    return {
        code: upper || 'OTHER',
        name: upper || 'State',
        hasIncomeTax: true,
        formResident: `${upper} Resident Return`,
        formNonResident: `${upper} Non-Resident Return`,
        standardDeduction: { single: 4000, married_joint: 8000, married_separate: 4000, head_of_household: 6000 },
        isFlat: true,
        flatRate: 0.045,
        notes: `Individual income tax return for ${upper}.`
    };
}
export function computeStateTaxFromBrackets(taxable, brackets) {
    if (taxable <= 0)
        return 0;
    let tax = 0;
    for (const b of brackets) {
        if (taxable > b.min) {
            const chunk = Math.min(taxable, b.max) - b.min;
            tax += chunk * b.rate;
        }
    }
    return tax;
}
export function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num))
        return "$0";
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
}
export function formatCurrencyExact(num) {
    if (num === null || num === undefined || isNaN(num))
        return "$0.00";
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
}
export function formatPercent(rate) {
    return `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;
}
export function filingStatusLabel(status) {
    switch (status) {
        case 'single': return 'Single';
        case 'married_joint': return 'Married Filing Jointly';
        case 'married_separate': return 'Married Filing Separately';
        case 'head_of_household': return 'Head of Household';
        default: return 'Single';
    }
}
/**
 * Perform complete tax calculation with fully annotated general & plugged-in equations.
 */
export function calculateTaxes(state) {
    const year = state.year || 2024;
    const filingStatus = state.filingStatus || 'single';
    const rules = TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];
    const w2List = state.w2s && state.w2s.length > 0
        ? state.w2s
        : [{ id: 0, employer: '', ein: '', box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0, states: [] }];
    // 1. Total W-2 Wages (Box 1)
    const box1Values = w2List.map(w => Number(w.box1) || 0);
    const totalW2Wages = box1Values.reduce((sum, val) => sum + val, 0);
    const w2WageFieldIds = w2List.map((w, idx) => `w2-${w.id || idx}-box1`);
    const w2WagesCalc = {
        result: totalW2Wages,
        sourceFields: w2WageFieldIds,
        generalFormula: w2List.length === 1 ? 'Total Wages = W-2 Box 1' : 'Total Wages = ∑(W-2 Box 1)',
        pluggedFormula: w2List.length === 1
            ? `Total Wages = ${formatCurrency(box1Values[0])}`
            : `Total Wages = ${box1Values.map(v => formatCurrency(v)).join(' + ')} = ${formatCurrency(totalW2Wages)}`
    };
    // State & Local Tax Summary (Boxes 15-20 across all W-2s) - Computed early for SALT deduction
    const stateLines = w2List.flatMap(w => (w.states || []).map((s) => ({ ...s, w2Id: w.id })));
    const totalStateWages = stateLines.reduce((sum, s) => sum + (Number(s.stateWages) || 0), 0);
    const totalStateTaxWithheld = stateLines.reduce((sum, s) => sum + (Number(s.stateTaxWithheld) || 0), 0);
    const totalLocalTaxWithheld = stateLines.reduce((sum, s) => sum + (Number(s.localTaxWithheld) || 0), 0);
    const stateMap = new Map();
    stateLines.forEach(s => {
        const st = (s.state || 'OTHER').toUpperCase().trim();
        if (!stateMap.has(st)) {
            stateMap.set(st, { state: st, stateWages: 0, stateTaxWithheld: 0, localTaxWithheld: 0, sourceFieldIds: [] });
        }
        const item = stateMap.get(st);
        item.stateWages += Number(s.stateWages) || 0;
        item.stateTaxWithheld += Number(s.stateTaxWithheld) || 0;
        item.localTaxWithheld += Number(s.localTaxWithheld) || 0;
        item.sourceFieldIds.push(`w2-${s.w2Id}-state-${s.id}-box17`);
    });
    const byState = Array.from(stateMap.values());
    const stateWithheldValues = stateLines.map(s => ({
        state: (s.state || 'State').toUpperCase(),
        amount: Number(s.stateTaxWithheld) || 0
    })).filter(x => x.amount > 0);
    const stateTaxCalc = {
        result: totalStateTaxWithheld,
        totalStateWages,
        totalStateWithheld: totalStateTaxWithheld,
        totalLocalWithheld: totalLocalTaxWithheld,
        byState,
        sourceFields: stateLines.map(s => `w2-${s.w2Id}-state-${s.id}-box17`),
        generalFormula: 'Total State Withholding = ∑(W-2 Box 17)',
        pluggedFormula: stateWithheldValues.length > 0
            ? `Total State Tax = ${stateWithheldValues.map(v => `${v.state}: ${formatCurrencyExact(v.amount)}`).join(' + ')} = ${formatCurrencyExact(totalStateTaxWithheld)}`
            : 'Total State Tax = $0.00'
    };
    // Capital Gains / Losses (Schedule D / Line 7)
    const stGain = Number(state.otherIncome?.capitalGains?.shortTerm) || 0;
    const ltGain = Number(state.otherIncome?.capitalGains?.longTerm) || 0;
    const netGainLoss = stGain + ltGain;
    const maxLoss = filingStatus === 'married_separate' ? -1500 : -3000;
    const allowableCapitalNet = netGainLoss < 0 ? Math.max(maxLoss, netGainLoss) : netGainLoss;
    const capitalGainsCalc = {
        result: allowableCapitalNet,
        netTotal: netGainLoss,
        allowableLoss: allowableCapitalNet,
        sourceFields: ['input-capital-gains-st', 'input-capital-gains-lt'],
        generalFormula: 'Net Capital Gain/Loss = Short-Term + Long-Term (Losses capped at -$3,000/yr)',
        pluggedFormula: netGainLoss < 0
            ? `Net = ${formatCurrency(stGain)} + ${formatCurrency(ltGain)} = ${formatCurrency(netGainLoss)} ➔ Capped at ${formatCurrency(allowableCapitalNet)}`
            : `Net = ${formatCurrency(stGain)} + ${formatCurrency(ltGain)} = ${formatCurrency(allowableCapitalNet)}`
    };
    // Schedule C Business Expenses
    const scheduleCExpenses = Math.max(0, Number(state.otherIncome?.scheduleCExpenses) || 0);
    // Additional Incomes
    const interestIncome = Number(state.otherIncome?.interest) || 0;
    const extraSources = state.otherIncome?.sources || [];
    let extraSourcesTotal = 0;
    extraSources.forEach(s => {
        let amt = Number(s.amount) || 0;
        if (s.type === '1099-NEC' && scheduleCExpenses > 0) {
            amt = Math.max(0, amt - scheduleCExpenses);
        }
        extraSourcesTotal += amt;
    });
    const otherIncomeTotal = interestIncome + extraSourcesTotal + allowableCapitalNet;
    // 2. Total Gross Income
    const grossIncome = Math.max(0, totalW2Wages + otherIncomeTotal);
    const grossIncomeSourceFields = [
        'calc-total-w2-wages',
        ...(interestIncome > 0 ? ['input-other-interest'] : []),
        ...(allowableCapitalNet !== 0 ? ['calc-capital-gains'] : []),
        ...extraSources.filter(s => (Number(s.amount) || 0) > 0).map(s => `input-income-source-${s.id}`)
    ];
    const pluggedFormulaParts = [formatCurrency(totalW2Wages)];
    if (interestIncome > 0) {
        pluggedFormulaParts.push(formatCurrency(interestIncome));
    }
    extraSources.forEach(s => {
        if ((Number(s.amount) || 0) > 0) {
            let amt = Number(s.amount) || 0;
            if (s.type === '1099-NEC' && scheduleCExpenses > 0) {
                amt = Math.max(0, amt - scheduleCExpenses);
            }
            pluggedFormulaParts.push(formatCurrency(amt));
        }
    });
    if (allowableCapitalNet !== 0) {
        pluggedFormulaParts.push(formatCurrency(allowableCapitalNet));
    }
    if (pluggedFormulaParts.length === 1) {
        pluggedFormulaParts.push('$0');
    }
    const grossIncomeCalc = {
        result: grossIncome,
        sourceFields: grossIncomeSourceFields,
        generalFormula: extraSources.length > 0
            ? 'Gross Income = Total W-2 Wages + Interest + Additional Incomes + Net Capital Gains'
            : 'Gross Income = Total W-2 Wages + Other Incomes',
        pluggedFormula: `Gross Income = ${pluggedFormulaParts.join(' + ')} = ${formatCurrency(grossIncome)}`
    };
    // 3. Adjustments to Income (Above-the-line deductions)
    const studentLoanInterest = Math.min(2500, Number(state.adjustments?.studentLoan) || 0);
    const iraDeduction = Number(state.adjustments?.ira) || 0;
    const hsaDeduction = Number(state.adjustments?.hsa) || 0;
    const totalAdjustments = studentLoanInterest + iraDeduction + hsaDeduction;
    const adjustmentsCalc = {
        result: totalAdjustments,
        sourceFields: ['input-adj-student-loan', 'input-adj-ira', 'input-adj-hsa'],
        generalFormula: 'Adjustments = Student Loan Interest + Traditional IRA + HSA Deduction',
        pluggedFormula: `Adjustments = ${formatCurrency(studentLoanInterest)} + ${formatCurrency(iraDeduction)} + ${formatCurrency(hsaDeduction)} = ${formatCurrency(totalAdjustments)}`
    };
    // 4. Adjusted Gross Income (AGI) - Line 11 on Form 1040
    const agi = Math.max(0, grossIncome - totalAdjustments);
    const agiCalc = {
        result: agi,
        sourceFields: ['calc-gross-income', 'calc-total-adjustments'],
        generalFormula: 'Adjusted Gross Income (AGI) = Gross Income − Adjustments',
        pluggedFormula: `AGI = ${formatCurrency(grossIncome)} − ${formatCurrency(totalAdjustments)} = ${formatCurrency(agi)}`
    };
    // 5. Standard vs Itemized Deductions (Schedule A)
    const standardDeductionBase = rules.standardDeduction[filingStatus] || 14600;
    const medicalRaw = Number(state.itemizedDeductions?.medicalExpenses) || 0;
    const medicalThreshold = 0.075 * agi;
    const allowableMedical = Math.max(0, medicalRaw - medicalThreshold);
    const realEstateTax = Number(state.itemizedDeductions?.realEstateTax) || 0;
    const totalSaltPaid = realEstateTax + totalStateTaxWithheld;
    const saltCap = filingStatus === 'married_separate' ? 5000 : 10000;
    const allowableSalt = Math.min(saltCap, totalSaltPaid);
    const mortgageInterest = Number(state.itemizedDeductions?.mortgageInterest) || 0;
    const charity = Number(state.itemizedDeductions?.charity) || 0;
    const totalItemized = allowableMedical + allowableSalt + mortgageInterest + charity;
    const method = state.deductionMethod || 'auto';
    let chosenMethod = 'standard';
    let chosenDeduction = standardDeductionBase;
    if (method === 'auto') {
        if (totalItemized > standardDeductionBase) {
            chosenMethod = 'itemized';
            chosenDeduction = totalItemized;
        }
        else {
            chosenMethod = 'standard';
            chosenDeduction = standardDeductionBase;
        }
    }
    else if (method === 'itemized') {
        chosenMethod = 'itemized';
        chosenDeduction = totalItemized;
    }
    else {
        chosenMethod = 'standard';
        chosenDeduction = standardDeductionBase;
    }
    const isItemizedBetter = totalItemized > standardDeductionBase;
    const savingsOverAlternate = Math.abs(totalItemized - standardDeductionBase);
    const itemizedCalc = {
        result: chosenDeduction,
        sourceFields: [
            'input-itemized-medical',
            'input-itemized-salt',
            'input-itemized-mortgage',
            'input-itemized-charity',
            'calc-agi',
            'select-filing-status'
        ],
        generalFormula: 'Itemized Deductions = Medical (>7.5% AGI) + SALT (cap $10k) + Mortgage Interest + Charity',
        pluggedFormula: `Medical: ${formatCurrency(allowableMedical)} + SALT: ${formatCurrency(allowableSalt)} + Mortgage: ${formatCurrency(mortgageInterest)} + Charity: ${formatCurrency(charity)} = ${formatCurrency(totalItemized)} (vs. Standard ${formatCurrency(standardDeductionBase)})`,
        isItemizedBetter,
        totalItemized,
        totalItemizedDeductions: totalItemized,
        allowableMedical,
        medicalDeductible: allowableMedical,
        allowableSalt,
        saltDeduction: allowableSalt,
        mortgage: mortgageInterest,
        charity,
        standardDeductionAmount: standardDeductionBase,
        standardDeduction: standardDeductionBase,
        chosenDeduction,
        chosenMethod,
        savingsOverAlternate
    };
    const deductionCalc = {
        result: chosenDeduction,
        sourceFields: chosenMethod === 'itemized'
            ? ['calc-itemized-deductions', 'select-filing-status']
            : ['select-filing-status', 'select-tax-year'],
        generalFormula: chosenMethod === 'itemized'
            ? 'Deduction = Itemized Deductions (Schedule A - Larger than Standard)'
            : `Standard Deduction (${filingStatusLabel(filingStatus)}, Year ${year})`,
        pluggedFormula: chosenMethod === 'itemized'
            ? `Itemized Deduction Selected = ${formatCurrency(chosenDeduction)} (Saves ${formatCurrency(savingsOverAlternate)} more than Standard!)`
            : `Standard Deduction = ${formatCurrency(chosenDeduction)}`
    };
    // 6. Taxable Income - Line 15 on Form 1040
    const taxableIncome = Math.max(0, agi - chosenDeduction);
    const taxableIncomeCalc = {
        result: taxableIncome,
        sourceFields: ['calc-agi', 'calc-standard-deduction'],
        generalFormula: 'Taxable Income = max(0, AGI − Deductions)',
        pluggedFormula: `Taxable Income = max(0, ${formatCurrency(agi)} − ${formatCurrency(chosenDeduction)}) = ${formatCurrency(taxableIncome)}`
    };
    // 7. Federal Income Tax (Marginal Tax Brackets calculation)
    const brackets = rules.brackets[filingStatus] || rules.brackets.single;
    const bracketDetails = [];
    let tentativeTax = 0;
    const bracketFormulaParts = [];
    for (let i = 0; i < brackets.length; i++) {
        const b = brackets[i];
        if (taxableIncome > b.min) {
            const taxableInBracket = Math.min(taxableIncome, b.max) - b.min;
            const taxFromBracket = taxableInBracket * b.rate;
            tentativeTax += taxFromBracket;
            const maxLabel = b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`;
            bracketDetails.push({
                bracketIndex: i + 1,
                rate: b.rate,
                ratePercent: formatPercent(b.rate),
                range: `${formatCurrency(b.min)}${maxLabel}`,
                taxableAmount: taxableInBracket,
                taxAmount: taxFromBracket,
                formula: `${formatCurrency(taxableInBracket)} × ${formatPercent(b.rate)} = ${formatCurrency(taxFromBracket)}`
            });
            bracketFormulaParts.push(`(${formatCurrency(taxableInBracket)} × ${formatPercent(b.rate)})`);
        }
        else {
            bracketDetails.push({
                bracketIndex: i + 1,
                rate: b.rate,
                ratePercent: formatPercent(b.rate),
                range: `${formatCurrency(b.min)}${b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`}`,
                taxableAmount: 0,
                taxAmount: 0,
                formula: `$0 × ${formatPercent(b.rate)} = $0`
            });
        }
    }
    const taxBeforeCredits = tentativeTax;
    const taxBeforeCreditsCalc = {
        result: taxBeforeCredits,
        sourceFields: ['calc-taxable-income', 'select-filing-status'],
        generalFormula: 'Tentative Tax = ∑(Taxable Income in Bracket i × Bracket Rate i)',
        pluggedFormula: bracketFormulaParts.length > 0
            ? `Tentative Tax = ${bracketFormulaParts.join(' + ')} = ${formatCurrencyExact(taxBeforeCredits)}`
            : `Tentative Tax = $0 × 10% = $0.00`,
        brackets: bracketDetails
    };
    // 8. Tax Credits (Child Tax Credit)
    const numChildren = Math.max(0, parseInt(String(state.dependents?.childrenCount), 10) || 0);
    let childCreditAllowed = 0;
    let childCreditPhaseoutAmount = 0;
    if (numChildren > 0) {
        const maxPotentialCredit = numChildren * rules.childTaxCreditPerChild;
        const threshold = rules.childTaxCreditPhaseout[filingStatus] || 200000;
        if (agi > threshold) {
            const excess = agi - threshold;
            const chunks = Math.ceil(excess / 1000);
            childCreditPhaseoutAmount = chunks * 50;
        }
        childCreditAllowed = Math.max(0, Math.min(taxBeforeCredits, maxPotentialCredit - childCreditPhaseoutAmount));
    }
    const creditsCalc = {
        result: childCreditAllowed,
        sourceFields: ['input-children-count', 'calc-agi', 'calc-tax-before-credits'],
        generalFormula: 'Tax Credits = min(Tax Liability, Qualifying Children × $2,000 − Phaseout)',
        pluggedFormula: numChildren > 0
            ? `Credits = min(${formatCurrency(taxBeforeCredits)}, ${numChildren} × $2,000 ${childCreditPhaseoutAmount > 0 ? `− ${formatCurrency(childCreditPhaseoutAmount)}` : ''}) = ${formatCurrency(childCreditAllowed)}`
            : `Credits = 0 qualifying children = $0`
    };
    // 9. Total Federal Tax Liability
    const totalTaxLiability = Math.max(0, taxBeforeCredits - childCreditAllowed);
    const totalTaxCalc = {
        result: totalTaxLiability,
        sourceFields: ['calc-tax-before-credits', 'calc-total-credits'],
        generalFormula: 'Total Tax Liability = max(0, Tentative Tax − Total Credits)',
        pluggedFormula: `Total Tax Liability = max(0, ${formatCurrencyExact(taxBeforeCredits)} − ${formatCurrency(childCreditAllowed)}) = ${formatCurrencyExact(totalTaxLiability)}`
    };
    // 10. Total Federal Income Tax Withheld (Box 2 from all W-2s)
    const box2Values = w2List.map(w => Number(w.box2) || 0);
    const totalWithheld = box2Values.reduce((sum, val) => sum + val, 0);
    const w2WithheldFieldIds = w2List.map((w, idx) => `w2-${w.id || idx}-box2`);
    const withholdingCalc = {
        result: totalWithheld,
        sourceFields: w2WithheldFieldIds,
        generalFormula: w2List.length === 1 ? 'Total Withholding = W-2 Box 2' : 'Total Withholding = ∑(W-2 Box 2)',
        pluggedFormula: w2List.length === 1
            ? `Total Withholding = ${formatCurrencyExact(box2Values[0])}`
            : `Total Withholding = ${box2Values.map(v => formatCurrencyExact(v)).join(' + ')} = ${formatCurrencyExact(totalWithheld)}`
    };
    // 11. Final Refund or Amount You Owe
    const netDifference = totalWithheld - totalTaxLiability;
    const isRefund = netDifference >= 0;
    const finalAmount = Math.abs(netDifference);
    const finalResultCalc = {
        result: finalAmount,
        isRefund: isRefund,
        netDifference: netDifference,
        sourceFields: ['calc-total-withholding', 'calc-total-tax-liability'],
        generalFormula: isRefund
            ? 'Refund = Total Payments (Withholding) − Total Tax Liability'
            : 'Amount Owed = Total Tax Liability − Total Payments (Withholding)',
        pluggedFormula: isRefund
            ? `Refund = ${formatCurrencyExact(totalWithheld)} − ${formatCurrencyExact(totalTaxLiability)} = ${formatCurrencyExact(finalAmount)}`
            : `Amount Owed = ${formatCurrencyExact(totalTaxLiability)} − ${formatCurrencyExact(totalWithheld)} = ${formatCurrencyExact(finalAmount)}`
    };
    // 12. FICA Breakdown (Social Security & Medicare from W2 boxes 3, 4, 5, 6)
    const box3Values = w2List.map(w => Number(w.box3) || 0);
    const box4Values = w2List.map(w => Number(w.box4) || 0);
    const box5Values = w2List.map(w => Number(w.box5) || 0);
    const box6Values = w2List.map(w => Number(w.box6) || 0);
    const totalSSWages = box3Values.reduce((s, v) => s + v, 0);
    const totalSSTax = box4Values.reduce((s, v) => s + v, 0);
    const totalMedWages = box5Values.reduce((s, v) => s + v, 0);
    const totalMedTax = box6Values.reduce((s, v) => s + v, 0);
    const totalFicaWithheld = totalSSTax + totalMedTax;
    const ficaCalc = {
        result: totalFicaWithheld,
        ssWages: totalSSWages,
        ssTax: totalSSTax,
        medWages: totalMedWages,
        medTax: totalMedTax,
        totalFica: totalFicaWithheld,
        sourceFields: [
            ...w2List.map((w, idx) => `w2-${w.id || idx}-box4`),
            ...w2List.map((w, idx) => `w2-${w.id || idx}-box6`)
        ],
        generalFormula: 'Total FICA Taxes = Social Security Tax (Box 4) + Medicare Tax (Box 6)',
        pluggedFormula: `Total FICA = ${formatCurrencyExact(totalSSTax)} + ${formatCurrencyExact(totalMedTax)} = ${formatCurrencyExact(totalFicaWithheld)}`
    };
    // Effective Tax Rate
    const effectiveRate = grossIncome > 0 ? (totalTaxLiability / grossIncome) : 0;
    const effectiveRateCalc = {
        rate: effectiveRate,
        sourceFields: ['calc-total-tax-liability', 'calc-gross-income'],
        generalFormula: 'Effective Tax Rate = Total Tax Liability ÷ Gross Income',
        pluggedFormula: `Effective Rate = ${formatCurrencyExact(totalTaxLiability)} ÷ ${formatCurrency(grossIncome)} = ${formatPercent(effectiveRate)}`
    };
    // 14. Multi-State Tax Return Engine & Unified Summary (Handles OSTC, Reciprocity, & Order Independence)
    const { stateReturnsCalc, unifiedSummaryCalc } = calculateStateReturnsAndUnifiedSummary(state, w2List, totalW2Wages, grossIncome, filingStatus, totalTaxLiability, totalWithheld, netDifference, isRefund);
    return {
        year,
        filingStatus,
        w2Count: w2List.length,
        w2WagesCalc,
        grossIncomeCalc,
        adjustmentsCalc,
        agiCalc,
        deductionCalc,
        itemizedCalc,
        capitalGainsCalc,
        taxableIncomeCalc,
        taxBeforeCreditsCalc,
        creditsCalc,
        totalTaxCalc,
        withholdingCalc,
        finalResultCalc,
        ficaCalc,
        stateTaxCalc,
        stateReturnsCalc,
        unifiedSummaryCalc,
        effectiveRateCalc
    };
}
/**
 * Multi-Pass State Return & Unified Tax Ledger Engine
 * Handles order independence, reciprocity agreements (e.g. NJ & PA), and Other State Tax Credits (OSTC).
 */
export function calculateStateReturnsAndUnifiedSummary(state, w2List, totalFederalWages, grossIncome, filingStatus, totalFederalLiability, totalFederalWithholding, federalNetDifference, federalIsRefund) {
    // 1. Determine resident state:
    let residentState = 'CA';
    if (state.residentState && state.residentState.trim().length > 0) {
        residentState = state.residentState.toUpperCase().trim();
    }
    else if (w2List[0]?.states?.[0]?.state && w2List[0].states[0].state.trim().length > 0) {
        residentState = w2List[0].states[0].state.toUpperCase().trim();
    }
    // 2. Discover all relevant states from W-2s and 1099s:
    const stateCodesSet = new Set();
    stateCodesSet.add(residentState);
    w2List.forEach(w => {
        (w.states || []).forEach(s => {
            const code = (s.state || '').toUpperCase().trim();
            if (code)
                stateCodesSet.add(code);
        });
    });
    (state.otherIncome?.sources || []).forEach(src => {
        if (src.state) {
            const code = src.state.toUpperCase().trim();
            if (code)
                stateCodesSet.add(code);
        }
    });
    const stateCodes = Array.from(stateCodesSet);
    const residentRule = getStateTaxRule(residentState);
    const rawMap = new Map();
    stateCodes.forEach(c => {
        rawMap.set(c, {
            code: c,
            w2Wages: 0,
            w2Withheld: 0,
            localWithheld: 0,
            other1099: 0,
            sourceFieldIds: []
        });
    });
    w2List.forEach((w, wIdx) => {
        (w.states || []).forEach((s, sIdx) => {
            const code = (s.state || residentState).toUpperCase().trim();
            if (!rawMap.has(code)) {
                rawMap.set(code, { code, w2Wages: 0, w2Withheld: 0, localWithheld: 0, other1099: 0, sourceFieldIds: [] });
            }
            const item = rawMap.get(code);
            item.w2Wages += Number(s.stateWages) || 0;
            item.w2Withheld += Number(s.stateTaxWithheld) || 0;
            item.localWithheld += Number(s.localTaxWithheld) || 0;
            item.sourceFieldIds.push(`w2-${w.id || wIdx}-state-${s.id || sIdx}-box16`);
            item.sourceFieldIds.push(`w2-${w.id || wIdx}-state-${s.id || sIdx}-box17`);
        });
    });
    (state.otherIncome?.sources || []).forEach((src, srcIdx) => {
        const code = (src.state || residentState).toUpperCase().trim();
        if (!rawMap.has(code)) {
            rawMap.set(code, { code, w2Wages: 0, w2Withheld: 0, localWithheld: 0, other1099: 0, sourceFieldIds: [] });
        }
        const item = rawMap.get(code);
        item.other1099 += Number(src.amount) || 0;
        item.sourceFieldIds.push(`input-source-${src.id || srcIdx}-amount`);
    });
    // PASS 1: Calculate all Non-Resident States first!
    const nonResidentReturns = [];
    const nonResidentCodes = stateCodes.filter(c => c !== residentState);
    for (const code of nonResidentCodes) {
        const rule = getStateTaxRule(code);
        const raw = rawMap.get(code);
        const stateWages = raw.w2Wages + raw.other1099;
        const withholding = raw.w2Withheld;
        const localTax = raw.localWithheld;
        // Check Reciprocity
        const isReciprocal = (rule.reciprocalWith && rule.reciprocalWith.includes(residentState)) ||
            (residentRule.reciprocalWith && residentRule.reciprocalWith.includes(code));
        if (isReciprocal) {
            const netOutcome = withholding; // 100% refund of any tax withheld in error
            nonResidentReturns.push({
                result: 0,
                state: code,
                stateName: rule.name,
                residentStatus: 'non_resident',
                formName: rule.formNonResident,
                hasIncomeTax: rule.hasIncomeTax,
                stateWages,
                stateStandardDeduction: 0,
                stateTaxableIncome: 0,
                stateTaxBeforeCredit: 0,
                creditForOtherStates: 0,
                creditedStates: [],
                reciprocityExemption: true,
                reciprocityNote: `Reciprocal agreement active between ${residentRule.name} (${residentState}) and ${rule.name} (${code}). Your compensation is legally exempt from ${code} state tax and taxable only in your home state of ${residentState}.`,
                stateTaxLiability: 0,
                stateWithholding: withholding,
                localTaxWithheld: localTax,
                netOutcome,
                isRefund: true,
                sourceFields: raw.sourceFieldIds,
                generalFormula: `Tax = $0 (Reciprocal Agreement: ${residentState} & ${code})`,
                pluggedFormula: `Tax = $0.00 • 100% of ${formatCurrencyExact(withholding)} Withholding Refunded by ${code}`
            });
            continue;
        }
        if (!rule.hasIncomeTax) {
            nonResidentReturns.push({
                result: 0,
                state: code,
                stateName: rule.name,
                residentStatus: 'non_resident',
                formName: rule.formNonResident,
                hasIncomeTax: false,
                stateWages,
                stateStandardDeduction: 0,
                stateTaxableIncome: 0,
                stateTaxBeforeCredit: 0,
                creditForOtherStates: 0,
                creditedStates: [],
                reciprocityExemption: false,
                stateTaxLiability: 0,
                stateWithholding: withholding,
                localTaxWithheld: localTax,
                netOutcome: withholding,
                isRefund: true,
                sourceFields: raw.sourceFieldIds,
                generalFormula: `${rule.name} imposes 0% personal income tax on wage compensation`,
                pluggedFormula: `State Tax = $0.00 (No ${rule.name} Return Required)`
            });
            continue;
        }
        // Standard Non-Resident Calculation
        const stdDed = rule.standardDeduction[filingStatus] || 0;
        const taxable = Math.max(0, stateWages - stdDed);
        let tax = 0;
        if (rule.isFlat) {
            tax = taxable * (rule.flatRate || 0);
        }
        else {
            const bList = rule.brackets?.[filingStatus] || rule.brackets?.['single'] || [];
            tax = computeStateTaxFromBrackets(taxable, bList);
        }
        const stateTaxLiability = Math.round(tax * 100) / 100;
        const netDiff = withholding - stateTaxLiability;
        const isRefund = netDiff >= 0;
        const netOutcome = Math.abs(netDiff);
        nonResidentReturns.push({
            result: stateTaxLiability,
            state: code,
            stateName: rule.name,
            residentStatus: 'non_resident',
            formName: rule.formNonResident,
            hasIncomeTax: true,
            stateWages,
            stateStandardDeduction: stdDed,
            stateTaxableIncome: taxable,
            stateTaxBeforeCredit: stateTaxLiability,
            creditForOtherStates: 0,
            creditedStates: [],
            reciprocityExemption: false,
            stateTaxLiability,
            stateWithholding: withholding,
            localTaxWithheld: localTax,
            netOutcome,
            isRefund,
            sourceFields: raw.sourceFieldIds,
            generalFormula: `${rule.formNonResident}: State Tax = max(0, State Sourced Wages − State Standard Deduction) × Rates`,
            pluggedFormula: isRefund
                ? `Refund = ${formatCurrencyExact(withholding)} (Withheld) − ${formatCurrencyExact(stateTaxLiability)} (Tax) = ${formatCurrencyExact(netOutcome)}`
                : `Owed = ${formatCurrencyExact(stateTaxLiability)} (Tax) − ${formatCurrencyExact(withholding)} (Withheld) = ${formatCurrencyExact(netOutcome)}`
        });
    }
    // PASS 2: Calculate Resident State Return (with Other State Tax Credit - OSTC)
    const resRaw = rawMap.get(residentState);
    const residentTotalWages = Math.max(resRaw.w2Wages + resRaw.other1099, grossIncome, totalFederalWages);
    const resWithholding = resRaw.w2Withheld;
    const resLocalTax = resRaw.localWithheld;
    let residentReturn;
    if (!residentRule.hasIncomeTax) {
        residentReturn = {
            result: 0,
            state: residentState,
            stateName: residentRule.name,
            residentStatus: 'resident',
            formName: residentRule.formResident,
            hasIncomeTax: false,
            stateWages: residentTotalWages,
            stateStandardDeduction: 0,
            stateTaxableIncome: 0,
            stateTaxBeforeCredit: 0,
            creditForOtherStates: 0,
            creditedStates: [],
            reciprocityExemption: false,
            stateTaxLiability: 0,
            stateWithholding: resWithholding,
            localTaxWithheld: resLocalTax,
            netOutcome: resWithholding,
            isRefund: true,
            sourceFields: resRaw.sourceFieldIds,
            generalFormula: `${residentRule.name} imposes 0% personal income tax on wage compensation`,
            pluggedFormula: `Tax = $0.00 (No ${residentRule.name} State Return Required)`
        };
    }
    else {
        const resStdDed = residentRule.standardDeduction[filingStatus] || 0;
        const resTaxable = Math.max(0, residentTotalWages - resStdDed);
        let resTentativeTax = 0;
        if (residentRule.isFlat) {
            resTentativeTax = resTaxable * (residentRule.flatRate || 0);
        }
        else {
            const bList = residentRule.brackets?.[filingStatus] || residentRule.brackets?.['single'] || [];
            resTentativeTax = computeStateTaxFromBrackets(resTaxable, bList);
        }
        resTentativeTax = Math.round(resTentativeTax * 100) / 100;
        // Compute OSTC: Credit for taxes paid to non-resident states
        const creditedStates = [];
        let totalOtherStateCredit = 0;
        for (const nr of nonResidentReturns) {
            if (nr.stateTaxLiability > 0 && !nr.reciprocityExemption && nr.hasIncomeTax) {
                const ratio = residentTotalWages > 0 ? Math.min(1.0, nr.stateWages / residentTotalWages) : 0;
                const homeAttributable = Math.round(resTentativeTax * ratio * 100) / 100;
                const creditAllowed = Math.min(nr.stateTaxLiability, homeAttributable);
                if (creditAllowed > 0) {
                    creditedStates.push({
                        fromState: nr.state,
                        sourceTaxPaid: nr.stateTaxLiability,
                        homeAttributableTax: homeAttributable,
                        creditAllowed
                    });
                    totalOtherStateCredit += creditAllowed;
                }
            }
        }
        const finalResLiability = Math.max(0, Math.round((resTentativeTax - totalOtherStateCredit) * 100) / 100);
        const resNetDiff = resWithholding - finalResLiability;
        const resIsRefund = resNetDiff >= 0;
        const resNetOutcome = Math.abs(resNetDiff);
        residentReturn = {
            result: finalResLiability,
            state: residentState,
            stateName: residentRule.name,
            residentStatus: 'resident',
            formName: residentRule.formResident,
            hasIncomeTax: true,
            stateWages: residentTotalWages,
            stateStandardDeduction: resStdDed,
            stateTaxableIncome: resTaxable,
            stateTaxBeforeCredit: resTentativeTax,
            creditForOtherStates: totalOtherStateCredit,
            creditedStates,
            reciprocityExemption: false,
            stateTaxLiability: finalResLiability,
            stateWithholding: resWithholding,
            localTaxWithheld: resLocalTax,
            netOutcome: resNetOutcome,
            isRefund: resIsRefund,
            sourceFields: [
                ...resRaw.sourceFieldIds,
                ...creditedStates.map(c => `calc-state-${c.fromState.toLowerCase()}-liability`)
            ],
            generalFormula: `${residentRule.formResident}: Net State Tax = max(0, Tentative Tax − Other State Tax Credit [OSTC])`,
            pluggedFormula: creditedStates.length > 0
                ? `Net Tax = ${formatCurrencyExact(resTentativeTax)} (Tentative) − ${formatCurrencyExact(totalOtherStateCredit)} (${creditedStates.map(c => c.fromState).join('/')} Credit) = ${formatCurrencyExact(finalResLiability)} ➔ ${resIsRefund ? 'Refund' : 'Owed'}: ${formatCurrencyExact(resNetOutcome)}`
                : (resIsRefund
                    ? `Refund = ${formatCurrencyExact(resWithholding)} (Withheld) − ${formatCurrencyExact(finalResLiability)} (Tax) = ${formatCurrencyExact(resNetOutcome)}`
                    : `Owed = ${formatCurrencyExact(finalResLiability)} (Tax) − ${formatCurrencyExact(resWithholding)} (Withheld) = ${formatCurrencyExact(resNetOutcome)}`)
        };
    }
    // Combined list of all state returns: resident state first, then non-resident states
    const allStateReturns = [residentReturn, ...nonResidentReturns];
    // PASS 3: Compute Unified Tax Summary (Federal + All States = Grand Total)
    const lines = [];
    // Federal Line
    lines.push({
        jurisdiction: 'United States (Federal)',
        formName: 'IRS Form 1040',
        taxLiability: totalFederalLiability,
        withholding: totalFederalWithholding,
        netOutcome: federalNetDifference,
        isRefund: federalIsRefund,
        badge: federalIsRefund ? 'Federal Refund (Line 35a)' : 'Federal Tax Owed (Line 37)'
    });
    // State Lines
    let totalStateWithholding = 0;
    let totalStateLiability = 0;
    let totalStateNet = 0;
    for (const sr of allStateReturns) {
        totalStateWithholding += sr.stateWithholding;
        totalStateLiability += sr.stateTaxLiability;
        const signedNet = sr.isRefund ? sr.netOutcome : -sr.netOutcome;
        totalStateNet += signedNet;
        let badge = undefined;
        if (sr.creditForOtherStates > 0) {
            badge = `🛡️ OSTC Credit (-${formatCurrency(sr.creditForOtherStates)})`;
        }
        else if (sr.reciprocityExemption) {
            badge = `🤝 Reciprocity Active (100% Refund)`;
        }
        else if (!sr.hasIncomeTax) {
            badge = `🌴 0% Wage Tax State`;
        }
        lines.push({
            jurisdiction: `${sr.stateName} (${sr.residentStatus === 'resident' ? 'Resident' : 'Nonresident'})`,
            formName: sr.formName,
            taxLiability: sr.stateTaxLiability,
            withholding: sr.stateWithholding,
            netOutcome: signedNet,
            isRefund: sr.isRefund,
            badge
        });
    }
    const grandTotalNet = federalNetDifference + totalStateNet;
    const isGrandTotalRefund = grandTotalNet >= 0;
    const unifiedSummaryCalc = {
        result: Math.abs(grandTotalNet),
        lines,
        federalNet: federalNetDifference,
        federalIsRefund,
        totalStateWithholding,
        totalStateLiability,
        totalStateNet,
        grandTotalNet,
        isGrandTotalRefund,
        sourceFields: [
            'calc-final-verdict',
            ...allStateReturns.map(s => `calc-state-${s.state.toLowerCase()}-outcome`)
        ],
        generalFormula: 'Grand Total Net Outcome = Federal Net (Withholding − Tax) + ∑ State Nets (Withholding − Tax)',
        pluggedFormula: `Grand Total = ${federalNetDifference >= 0 ? `+${formatCurrencyExact(federalNetDifference)}` : `-${formatCurrencyExact(Math.abs(federalNetDifference))}`} (Federal) + ${totalStateNet >= 0 ? `+${formatCurrencyExact(totalStateNet)}` : `-${formatCurrencyExact(Math.abs(totalStateNet))}`} (States) = ${grandTotalNet >= 0 ? `+${formatCurrencyExact(grandTotalNet)}` : `-${formatCurrencyExact(Math.abs(grandTotalNet))}`}`
    };
    return { stateReturnsCalc: allStateReturns, unifiedSummaryCalc };
}
