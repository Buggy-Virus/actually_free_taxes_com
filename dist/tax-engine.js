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
        niitRate: 0.038,
        niitThreshold: {
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
        },
        ltcgBrackets: {
            single: [
                { rate: 0.00, min: 0, max: 47025 },
                { rate: 0.15, min: 47025, max: 518900 },
                { rate: 0.20, min: 518900, max: Infinity }
            ],
            married_joint: [
                { rate: 0.00, min: 0, max: 94050 },
                { rate: 0.15, min: 94050, max: 583750 },
                { rate: 0.20, min: 583750, max: Infinity }
            ],
            married_separate: [
                { rate: 0.00, min: 0, max: 47025 },
                { rate: 0.15, min: 47025, max: 291850 },
                { rate: 0.20, min: 291850, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.00, min: 0, max: 63000 },
                { rate: 0.15, min: 63000, max: 551350 },
                { rate: 0.20, min: 551350, max: Infinity }
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
        niitRate: 0.038,
        niitThreshold: {
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
        },
        ltcgBrackets: {
            single: [
                { rate: 0.00, min: 0, max: 48350 },
                { rate: 0.15, min: 48350, max: 533400 },
                { rate: 0.20, min: 533400, max: Infinity }
            ],
            married_joint: [
                { rate: 0.00, min: 0, max: 96700 },
                { rate: 0.15, min: 96700, max: 600050 },
                { rate: 0.20, min: 600050, max: Infinity }
            ],
            married_separate: [
                { rate: 0.00, min: 0, max: 48350 },
                { rate: 0.15, min: 48350, max: 300000 },
                { rate: 0.20, min: 300000, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.00, min: 0, max: 64750 },
                { rate: 0.15, min: 64750, max: 566700 },
                { rate: 0.20, min: 566700, max: Infinity }
            ]
        }
    }
};
export const NYC_LOCAL_BRACKETS = {
    single: [
        { rate: 0.03078, min: 0, max: 12000 },
        { rate: 0.03762, min: 12000, max: 25000 },
        { rate: 0.03819, min: 25000, max: 50000 },
        { rate: 0.03876, min: 50000, max: Infinity }
    ],
    married_joint: [
        { rate: 0.03078, min: 0, max: 21600 },
        { rate: 0.03762, min: 21600, max: 45000 },
        { rate: 0.03819, min: 45000, max: 90000 },
        { rate: 0.03876, min: 90000, max: Infinity }
    ],
    married_separate: [
        { rate: 0.03078, min: 0, max: 12000 },
        { rate: 0.03762, min: 12000, max: 25000 },
        { rate: 0.03819, min: 25000, max: 50000 },
        { rate: 0.03876, min: 50000, max: Infinity }
    ],
    head_of_household: [
        { rate: 0.03078, min: 0, max: 14400 },
        { rate: 0.03762, min: 14400, max: 30000 },
        { rate: 0.03819, min: 30000, max: 60000 },
        { rate: 0.03876, min: 60000, max: Infinity }
    ]
};
function makeBrackets(singleBrackets, jointMultiplier = 2) {
    const jointBrackets = singleBrackets.map(b => ({
        rate: b.rate,
        min: Math.round(b.min * jointMultiplier),
        max: b.max === Infinity ? Infinity : Math.round(b.max * jointMultiplier)
    }));
    const hohBrackets = singleBrackets.map(b => ({
        rate: b.rate,
        min: Math.round(b.min * 1.4),
        max: b.max === Infinity ? Infinity : Math.round(b.max * 1.4)
    }));
    return {
        single: singleBrackets,
        married_joint: jointBrackets,
        married_separate: singleBrackets,
        head_of_household: hohBrackets
    };
}
export const STATE_TAX_RULES = {
    AL: {
        code: 'AL', name: 'Alabama', hasIncomeTax: true,
        formResident: 'Form 40', formNonResident: 'Form 40NR',
        standardDeduction: { single: 3000, married_joint: 8500, married_separate: 4250, head_of_household: 5200 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.02, min: 0, max: 500 },
            { rate: 0.04, min: 500, max: 3000 },
            { rate: 0.05, min: 3000, max: Infinity }
        ], 2),
        notes: 'Alabama progressive rates (2%–5%). Allows a state deduction for federal income tax paid.'
    },
    AK: {
        code: 'AK', name: 'Alaska', hasIncomeTax: false,
        formResident: 'No State Return Required', formNonResident: 'No State Return Required',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true, flatRate: 0,
        notes: 'Alaska has no state personal income tax.'
    },
    AZ: {
        code: 'AZ', name: 'Arizona', hasIncomeTax: true,
        formResident: 'Form 140', formNonResident: 'Form 140NR',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: true, flatRate: 0.025,
        reciprocalWith: ['CA', 'IN', 'OR', 'VA'],
        notes: 'Arizona imposes a flat 2.5% individual income tax rate.'
    },
    AR: {
        code: 'AR', name: 'Arkansas', hasIncomeTax: true,
        formResident: 'Form AR1000F', formNonResident: 'Form AR1000NR',
        standardDeduction: { single: 2340, married_joint: 4680, married_separate: 2340, head_of_household: 2340 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.02, min: 0, max: 5299 },
            { rate: 0.03, min: 5299, max: 10599 },
            { rate: 0.034, min: 10599, max: 15099 },
            { rate: 0.039, min: 15099, max: Infinity }
        ], 1),
        notes: 'Arkansas top marginal rate is 3.9% for 2024.'
    },
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
    CO: {
        code: 'CO', name: 'Colorado', hasIncomeTax: true,
        formResident: 'Form DR 0104', formNonResident: 'Form DR 0104PN',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: true, flatRate: 0.044,
        notes: 'Colorado imposes a flat 4.4% income tax starting from federal taxable income.'
    },
    CT: {
        code: 'CT', name: 'Connecticut', hasIncomeTax: true,
        formResident: 'Form CT-1040', formNonResident: 'Form CT-1040NR/PY',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.02, min: 0, max: 10000 },
            { rate: 0.045, min: 10000, max: 50000 },
            { rate: 0.055, min: 50000, max: 100000 },
            { rate: 0.06, min: 100000, max: 200000 },
            { rate: 0.065, min: 200000, max: 250000 },
            { rate: 0.069, min: 250000, max: 500000 },
            { rate: 0.0699, min: 500000, max: Infinity }
        ], 2),
        notes: 'Connecticut progressive brackets (2.0% to 6.99%).'
    },
    DE: {
        code: 'DE', name: 'Delaware', hasIncomeTax: true,
        formResident: 'Form PIT-RES', formNonResident: 'Form PIT-NON',
        standardDeduction: { single: 3250, married_joint: 6500, married_separate: 3250, head_of_household: 3250 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.00, min: 0, max: 2000 },
            { rate: 0.022, min: 2000, max: 5000 },
            { rate: 0.039, min: 5000, max: 10000 },
            { rate: 0.048, min: 10000, max: 20000 },
            { rate: 0.052, min: 20000, max: 25000 },
            { rate: 0.0555, min: 25000, max: 60000 },
            { rate: 0.066, min: 60000, max: Infinity }
        ], 1),
        notes: 'Delaware progressive rates (2.2% to 6.6% over $60,000).'
    },
    DC: {
        code: 'DC', name: 'District of Columbia', hasIncomeTax: true,
        formResident: 'Form D-40', formNonResident: 'Form D-30 (Unincorporated Business Franchise Tax)',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.04, min: 0, max: 10000 },
            { rate: 0.06, min: 10000, max: 40000 },
            { rate: 0.065, min: 40000, max: 60000 },
            { rate: 0.085, min: 60000, max: 250000 },
            { rate: 0.0925, min: 250000, max: 500000 },
            { rate: 0.0975, min: 500000, max: 1000000 },
            { rate: 0.1075, min: 1000000, max: Infinity }
        ], 1),
        notes: 'D.C. taxes residents on Form D-40 (4%–10.75%). Nonresidents are exempt from D-40 wage tax, but nonresident D.C. rental properties (gross rents > $12,000) are taxed via Form D-30 Unincorporated Business Franchise Tax (8.25% after 30% salary allowance and $5,000 exemption; $250 minimum tax).'
    },
    FL: {
        code: 'FL', name: 'Florida', hasIncomeTax: false,
        formResident: 'No State Return Required', formNonResident: 'No State Return Required',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true, flatRate: 0,
        notes: 'Florida has no state personal income tax.'
    },
    GA: {
        code: 'GA', name: 'Georgia', hasIncomeTax: true,
        formResident: 'Form 500', formNonResident: 'Form 500 (Schedule 3)',
        standardDeduction: { single: 12000, married_joint: 24000, married_separate: 12000, head_of_household: 12000 },
        isFlat: true, flatRate: 0.0539,
        notes: 'Georgia transitioned to a flat 5.39% income tax rate in 2024.'
    },
    HI: {
        code: 'HI', name: 'Hawaii', hasIncomeTax: true,
        formResident: 'Form N-11', formNonResident: 'Form N-15',
        standardDeduction: { single: 4400, married_joint: 8800, married_separate: 4400, head_of_household: 6424 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.014, min: 0, max: 9600 },
            { rate: 0.032, min: 9600, max: 14400 },
            { rate: 0.055, min: 14400, max: 19200 },
            { rate: 0.064, min: 19200, max: 24000 },
            { rate: 0.068, min: 24000, max: 36000 },
            { rate: 0.072, min: 36000, max: 48000 },
            { rate: 0.076, min: 48000, max: 125000 },
            { rate: 0.079, min: 125000, max: 175000 },
            { rate: 0.0825, min: 175000, max: 225000 },
            { rate: 0.09, min: 225000, max: 275000 },
            { rate: 0.10, min: 275000, max: 325000 },
            { rate: 0.11, min: 325000, max: Infinity }
        ], 2),
        notes: 'Hawaii has 12 progressive brackets from 1.4% to 11.0%.'
    },
    ID: {
        code: 'ID', name: 'Idaho', hasIncomeTax: true,
        formResident: 'Form 40', formNonResident: 'Form 43',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: true, flatRate: 0.05695,
        notes: 'Idaho imposes a flat 5.695% income tax rate.'
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
    IN: {
        code: 'IN', name: 'Indiana', hasIncomeTax: true,
        formResident: 'Form IT-40', formNonResident: 'Form IT-40PNR',
        standardDeduction: { single: 1000, married_joint: 2000, married_separate: 1000, head_of_household: 1000 },
        isFlat: true, flatRate: 0.0305,
        reciprocalWith: ['KY', 'MI', 'OH', 'PA', 'WI'],
        notes: 'Indiana imposes a flat 3.05% state income tax rate plus county income taxes.'
    },
    IA: {
        code: 'IA', name: 'Iowa', hasIncomeTax: true,
        formResident: 'Form IA 1040', formNonResident: 'Form IA 1040 (Schedule IA 126)',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.044, min: 0, max: 6210 },
            { rate: 0.0482, min: 6210, max: 31050 },
            { rate: 0.057, min: 31050, max: Infinity }
        ], 2),
        reciprocalWith: ['IL'],
        notes: 'Iowa progressive brackets (4.4% to 5.7% in 2024; 3.8% flat starting 2025). Reciprocal with IL.'
    },
    KS: {
        code: 'KS', name: 'Kansas', hasIncomeTax: true,
        formResident: 'Form K-40', formNonResident: 'Form K-40 (Schedule S)',
        standardDeduction: { single: 3605, married_joint: 8240, married_separate: 4120, head_of_household: 6180 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.052, min: 0, max: 23000 },
            { rate: 0.0558, min: 23000, max: Infinity }
        ], 2),
        notes: 'Kansas uses two brackets (5.2% and 5.58%) for 2024.'
    },
    KY: {
        code: 'KY', name: 'Kentucky', hasIncomeTax: true,
        formResident: 'Form 740', formNonResident: 'Form 740-NP',
        standardDeduction: { single: 3160, married_joint: 6320, married_separate: 3160, head_of_household: 3160 },
        isFlat: true, flatRate: 0.04,
        reciprocalWith: ['IL', 'IN', 'MI', 'OH', 'VA', 'WV', 'WI'],
        notes: 'Kentucky imposes a flat 4.0% income tax rate.'
    },
    LA: {
        code: 'LA', name: 'Louisiana', hasIncomeTax: true,
        formResident: 'Form IT-540', formNonResident: 'Form IT-540B',
        standardDeduction: { single: 4500, married_joint: 9000, married_separate: 4500, head_of_household: 9000 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.0185, min: 0, max: 12500 },
            { rate: 0.035, min: 12500, max: 50000 },
            { rate: 0.0425, min: 50000, max: Infinity }
        ], 2),
        notes: 'Louisiana 2024 brackets (1.85%, 3.5%, 4.25%; transitioning to 3.0% flat in 2025).'
    },
    ME: {
        code: 'ME', name: 'Maine', hasIncomeTax: true,
        formResident: 'Form 1040ME', formNonResident: 'Form 1040ME (Schedule NR)',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.058, min: 0, max: 26050 },
            { rate: 0.0675, min: 26050, max: 61600 },
            { rate: 0.0715, min: 61600, max: Infinity }
        ], 2),
        notes: 'Maine progressive rates (5.8%, 6.75%, 7.15%).'
    },
    MD: {
        code: 'MD', name: 'Maryland', hasIncomeTax: true,
        formResident: 'Form 502', formNonResident: 'Form 505',
        standardDeduction: { single: 2550, married_joint: 5150, married_separate: 2550, head_of_household: 5150 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.02, min: 0, max: 1000 },
            { rate: 0.03, min: 1000, max: 2000 },
            { rate: 0.04, min: 2000, max: 3000 },
            { rate: 0.0475, min: 3000, max: 100000 },
            { rate: 0.05, min: 100000, max: 125000 },
            { rate: 0.0525, min: 125000, max: 150000 },
            { rate: 0.055, min: 150000, max: 250000 },
            { rate: 0.0575, min: 250000, max: Infinity }
        ], 1.2),
        reciprocalWith: ['DC', 'PA', 'VA', 'WV'],
        notes: 'Maryland state brackets (2%–5.75%) plus mandatory county local income tax (2.25%–3.20%).'
    },
    MA: {
        code: 'MA',
        name: 'Massachusetts',
        hasIncomeTax: true,
        formResident: 'Form 1',
        formNonResident: 'Form 1-NR/PY',
        standardDeduction: { single: 4400, married_joint: 8800, married_separate: 4400, head_of_household: 6800 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.05, min: 0, max: 1053750 },
            { rate: 0.09, min: 1053750, max: Infinity }
        ], 1),
        notes: 'Flat 5.0% income tax rate plus 4% Fair Share surtax (9% total) on income over $1,053,750.'
    },
    MI: {
        code: 'MI', name: 'Michigan', hasIncomeTax: true,
        formResident: 'Form MI-1040', formNonResident: 'Form MI-1040 (Schedule NR)',
        standardDeduction: { single: 5600, married_joint: 11200, married_separate: 5600, head_of_household: 5600 },
        isFlat: true, flatRate: 0.0425,
        reciprocalWith: ['IL', 'IN', 'KY', 'MN', 'OH', 'WI'],
        notes: 'Michigan imposes a flat 4.25% income tax rate.'
    },
    MN: {
        code: 'MN', name: 'Minnesota', hasIncomeTax: true,
        formResident: 'Form M1', formNonResident: 'Form M1 (Schedule M1NR)',
        standardDeduction: { single: 14575, married_joint: 29150, married_separate: 14575, head_of_household: 21850 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.0535, min: 0, max: 31690 },
            { rate: 0.068, min: 31690, max: 104090 },
            { rate: 0.0785, min: 104090, max: 193240 },
            { rate: 0.0985, min: 193240, max: Infinity }
        ], 1.46),
        reciprocalWith: ['MI', 'ND'],
        notes: 'Minnesota progressive brackets (5.35% to 9.85%).'
    },
    MS: {
        code: 'MS', name: 'Mississippi', hasIncomeTax: true,
        formResident: 'Form 80-105', formNonResident: 'Form 80-205',
        standardDeduction: { single: 2300, married_joint: 4600, married_separate: 2300, head_of_household: 3400 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.00, min: 0, max: 10000 },
            { rate: 0.047, min: 10000, max: Infinity }
        ], 1),
        notes: 'Mississippi exempts the first $10,000 of taxable income and taxes excess at 4.7% in 2024.'
    },
    MO: {
        code: 'MO', name: 'Missouri', hasIncomeTax: true,
        formResident: 'Form MO-1040', formNonResident: 'Form MO-1040 (Form MO-NRI)',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.00, min: 0, max: 1273 },
            { rate: 0.02, min: 1273, max: 2546 },
            { rate: 0.025, min: 2546, max: 3819 },
            { rate: 0.03, min: 3819, max: 5092 },
            { rate: 0.035, min: 5092, max: 6365 },
            { rate: 0.04, min: 6365, max: 7638 },
            { rate: 0.045, min: 7638, max: 8911 },
            { rate: 0.048, min: 8911, max: Infinity }
        ], 1),
        notes: 'Missouri top marginal rate is 4.8% for 2024.'
    },
    MT: {
        code: 'MT', name: 'Montana', hasIncomeTax: true,
        formResident: 'Form 2', formNonResident: 'Form 2 (Nonresident Schedule)',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.047, min: 0, max: 20500 },
            { rate: 0.059, min: 20500, max: Infinity }
        ], 2),
        reciprocalWith: ['ND'],
        notes: 'Montana uses two brackets (4.7% and 5.9%) starting from federal taxable income in 2024.'
    },
    NE: {
        code: 'NE', name: 'Nebraska', hasIncomeTax: true,
        formResident: 'Form 1040N', formNonResident: 'Form 1040N (Schedule III)',
        standardDeduction: { single: 8250, married_joint: 16500, married_separate: 8250, head_of_household: 12150 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.0246, min: 0, max: 3700 },
            { rate: 0.0351, min: 3700, max: 22170 },
            { rate: 0.0501, min: 22170, max: 35730 },
            { rate: 0.0584, min: 35730, max: Infinity }
        ], 2),
        notes: 'Nebraska progressive brackets (2.46% to 5.84% in 2024).'
    },
    NV: {
        code: 'NV', name: 'Nevada', hasIncomeTax: false,
        formResident: 'No State Return Required', formNonResident: 'No State Return Required',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true, flatRate: 0,
        notes: 'Nevada has no state personal income tax.'
    },
    NH: {
        code: 'NH', name: 'New Hampshire', hasIncomeTax: false,
        formResident: 'No State Wage Return Required', formNonResident: 'No State Return Required',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true, flatRate: 0,
        notes: 'New Hampshire has no tax on W-2 wages (and repealed its Interest & Dividends tax after 2024).'
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
    NM: {
        code: 'NM', name: 'New Mexico', hasIncomeTax: true,
        formResident: 'Form PIT-1', formNonResident: 'Form PIT-1 (Schedule PIT-B)',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.017, min: 0, max: 5500 },
            { rate: 0.032, min: 5500, max: 11000 },
            { rate: 0.047, min: 11000, max: 16000 },
            { rate: 0.049, min: 16000, max: 210000 },
            { rate: 0.059, min: 210000, max: Infinity }
        ], 1.5),
        notes: 'New Mexico progressive brackets (1.7% to 5.9%).'
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
                { rate: 0.0965, min: 1077550, max: 5000000 },
                { rate: 0.103, min: 5000000, max: 25000000 },
                { rate: 0.109, min: 25000000, max: Infinity }
            ],
            married_joint: [
                { rate: 0.04, min: 0, max: 17150 },
                { rate: 0.045, min: 17150, max: 23600 },
                { rate: 0.0525, min: 23600, max: 27900 },
                { rate: 0.055, min: 27900, max: 161550 },
                { rate: 0.06, min: 161550, max: 323200 },
                { rate: 0.0685, min: 323200, max: 2155350 },
                { rate: 0.0965, min: 2155350, max: 5000000 },
                { rate: 0.103, min: 5000000, max: 25000000 },
                { rate: 0.109, min: 25000000, max: Infinity }
            ],
            married_separate: [
                { rate: 0.04, min: 0, max: 8500 },
                { rate: 0.045, min: 8500, max: 11700 },
                { rate: 0.0525, min: 11700, max: 13900 },
                { rate: 0.055, min: 13900, max: 80650 },
                { rate: 0.06, min: 80650, max: 215400 },
                { rate: 0.0685, min: 215400, max: 1077550 },
                { rate: 0.0965, min: 1077550, max: 5000000 },
                { rate: 0.103, min: 5000000, max: 25000000 },
                { rate: 0.109, min: 25000000, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.04, min: 0, max: 12800 },
                { rate: 0.045, min: 12800, max: 17650 },
                { rate: 0.0525, min: 17650, max: 20900 },
                { rate: 0.055, min: 20900, max: 107650 },
                { rate: 0.06, min: 107650, max: 269300 },
                { rate: 0.0685, min: 269300, max: 1616450 },
                { rate: 0.0965, min: 1616450, max: 5000000 },
                { rate: 0.103, min: 5000000, max: 25000000 },
                { rate: 0.109, min: 25000000, max: Infinity }
            ]
        },
        notes: 'New York Form IT-201 includes NY State tax (4%–10.9%), Form IT-196 NY Itemized Deductions, NYC Municipal Resident Tax (3.078%–3.876%), and Form IT-112-R Resident Credit.'
    },
    NC: {
        code: 'NC', name: 'North Carolina', hasIncomeTax: true,
        formResident: 'Form D-400', formNonResident: 'Form D-400 (Schedule PN)',
        standardDeduction: { single: 12750, married_joint: 25500, married_separate: 12750, head_of_household: 19125 },
        isFlat: true, flatRate: 0.045,
        notes: 'North Carolina imposes a flat 4.5% personal income tax rate for 2024 (4.25% in 2025).'
    },
    ND: {
        code: 'ND', name: 'North Dakota', hasIncomeTax: true,
        formResident: 'Form ND-1', formNonResident: 'Form ND-1 (Schedule ND-1NR)',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.00, min: 0, max: 44725 },
            { rate: 0.0195, min: 44725, max: 225975 },
            { rate: 0.025, min: 225975, max: Infinity }
        ], 1.67),
        reciprocalWith: ['MN', 'MT'],
        notes: 'North Dakota exempts the first $44,725 of single taxable income and caps rates at 2.5%.'
    },
    OH: {
        code: 'OH', name: 'Ohio', hasIncomeTax: true,
        formResident: 'Form IT 1040', formNonResident: 'Form IT 1040 (Schedule IT NRC)',
        standardDeduction: { single: 2400, married_joint: 4800, married_separate: 2400, head_of_household: 2400 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.00, min: 0, max: 26050 },
            { rate: 0.0275, min: 26050, max: 100000 },
            { rate: 0.035, min: 100000, max: Infinity }
        ], 1),
        reciprocalWith: ['IN', 'KY', 'MI', 'PA', 'WV'],
        notes: 'Ohio exempts the first $26,050 of income and has two brackets (2.75% and 3.5%).'
    },
    OK: {
        code: 'OK', name: 'Oklahoma', hasIncomeTax: true,
        formResident: 'Form 511', formNonResident: 'Form 511NR',
        standardDeduction: { single: 6350, married_joint: 12700, married_separate: 6350, head_of_household: 9350 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.0025, min: 0, max: 1000 },
            { rate: 0.0075, min: 1000, max: 2500 },
            { rate: 0.0175, min: 2500, max: 3750 },
            { rate: 0.0275, min: 3750, max: 4900 },
            { rate: 0.0375, min: 4900, max: 7200 },
            { rate: 0.0475, min: 7200, max: Infinity }
        ], 2),
        notes: 'Oklahoma progressive brackets (0.25% to 4.75%).'
    },
    OR: {
        code: 'OR', name: 'Oregon', hasIncomeTax: true,
        formResident: 'Form OR-40', formNonResident: 'Form OR-40-N',
        standardDeduction: { single: 2745, married_joint: 5495, married_separate: 2745, head_of_household: 4420 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.0475, min: 0, max: 4300 },
            { rate: 0.0675, min: 4300, max: 10750 },
            { rate: 0.0875, min: 10750, max: 125000 },
            { rate: 0.099, min: 125000, max: Infinity }
        ], 2),
        notes: 'Oregon progressive brackets (4.75% to 9.9%).'
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
    RI: {
        code: 'RI', name: 'Rhode Island', hasIncomeTax: true,
        formResident: 'Form RI-1040', formNonResident: 'Form RI-1040NR',
        standardDeduction: { single: 10550, married_joint: 21150, married_separate: 10575, head_of_household: 15850 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.0375, min: 0, max: 77450 },
            { rate: 0.0475, min: 77450, max: 176050 },
            { rate: 0.0599, min: 176050, max: Infinity }
        ], 1),
        notes: 'Rhode Island progressive brackets (3.75%, 4.75%, 5.99%).'
    },
    SC: {
        code: 'SC', name: 'South Carolina', hasIncomeTax: true,
        formResident: 'Form SC1040', formNonResident: 'Form SC1040 (Schedule NR)',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.00, min: 0, max: 3460 },
            { rate: 0.03, min: 3460, max: 17330 },
            { rate: 0.062, min: 17330, max: Infinity }
        ], 1),
        notes: 'South Carolina top marginal rate is 6.2% for 2024.'
    },
    SD: {
        code: 'SD', name: 'South Dakota', hasIncomeTax: false,
        formResident: 'No State Return Required', formNonResident: 'No State Return Required',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true, flatRate: 0,
        notes: 'South Dakota has no state personal income tax.'
    },
    TN: {
        code: 'TN', name: 'Tennessee', hasIncomeTax: false,
        formResident: 'No State Return Required', formNonResident: 'No State Return Required',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true, flatRate: 0,
        notes: 'Tennessee has no state personal wage income tax.'
    },
    TX: {
        code: 'TX', name: 'Texas', hasIncomeTax: false,
        formResident: 'No State Return Required', formNonResident: 'No State Return Required',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true, flatRate: 0,
        notes: 'Texas has no state personal income tax.'
    },
    UT: {
        code: 'UT', name: 'Utah', hasIncomeTax: true,
        formResident: 'Form TC-40', formNonResident: 'Form TC-40 (TC-40B)',
        standardDeduction: { single: 14600, married_joint: 29200, married_separate: 14600, head_of_household: 21900 },
        isFlat: true, flatRate: 0.0455,
        notes: 'Utah imposes a flat 4.55% personal income tax rate.'
    },
    VT: {
        code: 'VT', name: 'Vermont', hasIncomeTax: true,
        formResident: 'Form IN-111', formNonResident: 'Form IN-111 (Schedule IN-113)',
        standardDeduction: { single: 7000, married_joint: 14050, married_separate: 7000, head_of_household: 10550 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.0335, min: 0, max: 45400 },
            { rate: 0.066, min: 45400, max: 110050 },
            { rate: 0.076, min: 110050, max: 229550 },
            { rate: 0.0875, min: 229550, max: Infinity }
        ], 1.67),
        notes: 'Vermont progressive brackets (3.35% to 8.75%).'
    },
    VA: {
        code: 'VA', name: 'Virginia', hasIncomeTax: true,
        formResident: 'Form 760', formNonResident: 'Form 763',
        standardDeduction: { single: 8500, married_joint: 17000, married_separate: 8500, head_of_household: 8500 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.02, min: 0, max: 3000 },
            { rate: 0.03, min: 3000, max: 5000 },
            { rate: 0.05, min: 5000, max: 17000 },
            { rate: 0.0575, min: 17000, max: Infinity }
        ], 1),
        reciprocalWith: ['DC', 'KY', 'MD', 'PA', 'WV'],
        notes: 'Virginia progressive brackets up to 5.75% over $17,000. Reciprocal with DC, KY, MD, PA, WV.'
    },
    WA: {
        code: 'WA', name: 'Washington', hasIncomeTax: false,
        formResident: 'No State Wage Return Required', formNonResident: 'No State Return Required',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true, flatRate: 0,
        notes: 'Washington has no state wage income tax (imposes a 7% excise tax on long-term capital gains over $270,000).'
    },
    WV: {
        code: 'WV', name: 'West Virginia', hasIncomeTax: true,
        formResident: 'Form IT-140', formNonResident: 'Form IT-140 (ScheduleNR)',
        standardDeduction: { single: 2000, married_joint: 4000, married_separate: 2000, head_of_household: 2000 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.0236, min: 0, max: 10000 },
            { rate: 0.0315, min: 10000, max: 25000 },
            { rate: 0.0354, min: 25000, max: 40000 },
            { rate: 0.0472, min: 40000, max: 60000 },
            { rate: 0.0512, min: 60000, max: Infinity }
        ], 1),
        reciprocalWith: ['KY', 'MD', 'OH', 'PA', 'VA'],
        notes: 'West Virginia progressive brackets (2.36% to 5.12%). Reciprocal with KY, MD, OH, PA, VA.'
    },
    WI: {
        code: 'WI', name: 'Wisconsin', hasIncomeTax: true,
        formResident: 'Form 1', formNonResident: 'Form 1NPR',
        standardDeduction: { single: 13230, married_joint: 24490, married_separate: 11640, head_of_household: 17090 },
        isFlat: false,
        brackets: makeBrackets([
            { rate: 0.035, min: 0, max: 14320 },
            { rate: 0.044, min: 14320, max: 28640 },
            { rate: 0.053, min: 28640, max: 315310 },
            { rate: 0.0765, min: 315310, max: Infinity }
        ], 1.33),
        reciprocalWith: ['IL', 'IN', 'KY', 'MI'],
        notes: 'Wisconsin progressive brackets (3.5% to 7.65%). Reciprocal with IL, IN, KY, MI.'
    },
    WY: {
        code: 'WY', name: 'Wyoming', hasIncomeTax: false,
        formResident: 'No State Return Required', formNonResident: 'No State Return Required',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true, flatRate: 0,
        notes: 'Wyoming has no state personal income tax.'
    }
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
    const roundedCents = Math.round(num * 100) / 100;
    const hasCents = Math.abs(roundedCents - Math.round(roundedCents)) > 0.001;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0
    }).format(roundedCents);
}
export function formatCurrencyExact(num) {
    return formatCurrency(num);
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
        case 'qualifying_surviving_spouse': return 'Qualifying Surviving Spouse';
        default: return 'Single';
    }
}
export function normalizeFilingStatus(status) {
    if (status === 'qualifying_surviving_spouse')
        return 'married_joint';
    return status || 'single';
}
/**
 * Perform complete tax calculation with fully annotated general & plugged-in equations.
 */
export function calculateTaxes(state) {
    const year = state.year || 2024;
    const filingStatus = state.filingStatus || 'single';
    const effectiveStatus = normalizeFilingStatus(filingStatus);
    const rules = TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];
    const w2List = state.w2s && state.w2s.length > 0
        ? state.w2s
        : [{ id: 0, employer: '', ein: '', box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0, states: [] }];
    // 1. Total W-2 Wages (Box 1) & FICA W-2 Totals
    const box1Values = w2List.map(w => Number(w.box1) || 0);
    const totalW2Wages = box1Values.reduce((sum, val) => sum + val, 0);
    const w2WageFieldIds = w2List.map((w, idx) => `w2-${w.id || idx}-box1`);
    const box3Values = w2List.map(w => Number(w.box3) || 0);
    const box4Values = w2List.map(w => Number(w.box4) || 0);
    const box5Values = w2List.map(w => Number(w.box5) || 0);
    const box6Values = w2List.map(w => Number(w.box6) || 0);
    const totalSSWages = box3Values.reduce((s, v) => s + v, 0);
    const totalSSTax = box4Values.reduce((s, v) => s + v, 0);
    const totalMedWages = box5Values.reduce((s, v) => s + v, 0);
    const totalMedTax = box6Values.reduce((s, v) => s + v, 0);
    const totalFicaWithheld = totalSSTax + totalMedTax;
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
            : 'Total State Tax = $0'
    };
    // Capital Gains / Losses (Schedule D / Line 7 + 28% Collectibles & 25% Unrecaptured Sec. 1250 Gain)
    const stGain = Number(state.otherIncome?.capitalGains?.shortTerm) || 0;
    const ltGain = Number(state.otherIncome?.capitalGains?.longTerm) || 0;
    const collectiblesGain = Math.max(0, Number(state.otherIncome?.capitalGains?.collectiblesGain) || 0);
    const unrecaptured1250Gain = Math.max(0, Number(state.otherIncome?.capitalGains?.unrecaptured1250Gain) || 0);
    const netGainLoss = stGain + ltGain;
    const maxLoss = effectiveStatus === 'married_separate' ? -1500 : -3000;
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
    // Additional Incomes (1099-NEC, 1099-DIV, 1099-INT, 1099-MISC, 1099-R, SSA-1099, Schedule K-1, 1099-G, W-2G)
    const interestIncome = Number(state.otherIncome?.interest) || 0;
    const extraSources = state.otherIncome?.sources || [];
    let nonSsaExtraSourcesTotal = 0;
    let qualifiedDividendsTotal = 0;
    let net1099InterestTotal = 0;
    let taxExemptInterestTotal = 0;
    let total1099Dividends = 0;
    let netScheduleCProfit = 0;
    let k1IncomeTotal = 0;
    let ssaGrossTotal = 0;
    let gamblingWinningsTotal = 0;
    let retirement1099RTotal = 0;
    let earlyDist1099RTotal = 0;
    let extra1099WithheldTotal = 0;
    let remainingSchedCExpenses = scheduleCExpenses;
    extraSources.forEach(s => {
        let amt = Number(s.amount) || 0;
        extra1099WithheldTotal += Math.max(0, Number(s.federalTaxWithheld) || 0);
        if (s.type === '1099-NEC') {
            const expUsed = Math.min(Math.max(0, amt), remainingSchedCExpenses);
            remainingSchedCExpenses -= expUsed;
            amt = Math.max(0, amt - expUsed);
            netScheduleCProfit += amt;
            nonSsaExtraSourcesTotal += amt;
        }
        else if (s.type === '1099-INT') {
            const accrued = Math.max(0, Number(s.accruedInterestPaid) || 0);
            amt = Math.max(0, amt - accrued);
            net1099InterestTotal += amt;
            taxExemptInterestTotal += Math.max(0, Number(s.taxExemptInterest) || 0);
            nonSsaExtraSourcesTotal += amt;
        }
        else if (s.type === '1099-DIV') {
            total1099Dividends += amt;
            const qDiv = Math.min(amt, Math.max(0, Number(s.qualifiedDividends) || 0));
            qualifiedDividendsTotal += qDiv;
            nonSsaExtraSourcesTotal += amt;
        }
        else if (s.type === 'Schedule K-1') {
            k1IncomeTotal += amt;
            nonSsaExtraSourcesTotal += amt;
        }
        else if (s.type === '1099-R') {
            retirement1099RTotal += amt;
            if (s.earlyDistributionPenalty) {
                earlyDist1099RTotal += Math.max(0, amt);
            }
            nonSsaExtraSourcesTotal += amt;
        }
        else if (s.type === 'W-2G') {
            gamblingWinningsTotal += Math.max(0, amt);
            nonSsaExtraSourcesTotal += amt;
        }
        else if (s.type === 'SSA-1099') {
            ssaGrossTotal += Math.max(0, amt);
        }
        else {
            nonSsaExtraSourcesTotal += amt;
        }
    });
    // Schedule SE Self-Employment Tax (15.3% on 92.35% of Net Schedule C Profit when >= $400)
    let selfEmploymentTax = 0;
    let halfSelfEmploymentTaxDeduction = 0;
    let seTaxableEarnings = 0;
    if (netScheduleCProfit >= 400) {
        seTaxableEarnings = netScheduleCProfit * 0.9235;
        const remainingSSCap = Math.max(0, rules.ssWageLimit - totalSSWages);
        const seSSPortion = Math.min(seTaxableEarnings, remainingSSCap) * 0.124;
        const seMedPortion = seTaxableEarnings * 0.029;
        selfEmploymentTax = Math.round((seSSPortion + seMedPortion) * 100) / 100;
        halfSelfEmploymentTaxDeduction = Math.round(selfEmploymentTax * 0.50 * 100) / 100;
    }
    // Above-the-Line Adjustments (Schedule 1 Part II)
    const studentLoanInterest = Math.min(2500, Math.max(0, Number(state.adjustments?.studentLoan) || 0));
    const iraDeduction = Math.max(0, Number(state.adjustments?.ira) || 0);
    const hsaDeduction = Math.max(0, Number(state.adjustments?.hsa) || 0);
    const maxEducator = effectiveStatus === 'married_joint' ? 600 : 300;
    const educatorExpenses = Math.min(maxEducator, Math.max(0, Number(state.adjustments?.educatorExpenses) || 0));
    const seRetirement = Math.max(0, Number(state.adjustments?.seRetirement) || 0);
    const seHealthInsurance = Math.max(0, Number(state.adjustments?.seHealthInsurance) || 0);
    const alimonyPaid = Math.max(0, Number(state.adjustments?.alimonyPaid) || 0);
    const manualAdjustments = studentLoanInterest + iraDeduction + hsaDeduction + educatorExpenses + seRetirement + seHealthInsurance + alimonyPaid;
    const totalAdjustments = Math.round((manualAdjustments + halfSelfEmploymentTaxDeduction) * 100) / 100;
    // Schedule E Rental Real Estate (Schedule 1, Line 5 & Form 8582 Passive Activity Loss Rules)
    const rentalGross = Math.max(0, Number(state.otherIncome?.scheduleERental?.grossRents) || 0);
    const rentalExpenses = Math.max(0, Number(state.otherIncome?.scheduleERental?.expenses) || 0);
    const rentalDepreciation = Math.max(0, Number(state.otherIncome?.scheduleERental?.depreciation) || 0);
    const rentalPropertyState = (state.otherIncome?.scheduleERental?.propertyState || '').toUpperCase().trim();
    const hasScheduleEInput = rentalGross > 0 || rentalExpenses > 0 || rentalDepreciation > 0;
    const rentalNetBeforePal = rentalGross - rentalExpenses - rentalDepreciation;
    // Compute MAGI before passive rental loss for Form 8582 $25,000 active participation allowance phaseout ($100k–$150k)
    const magiBeforeRental = Math.max(0, totalW2Wages + interestIncome + nonSsaExtraSourcesTotal + allowableCapitalNet - totalAdjustments);
    let allowableRentalNet = rentalNetBeforePal;
    let disallowedPassiveLoss = 0;
    if (rentalNetBeforePal < 0) {
        const maxPalAllowance = effectiveStatus === 'married_separate' ? 12500 : 25000;
        const palPhaseoutStart = effectiveStatus === 'married_separate' ? 50000 : 100000;
        const palReduction = Math.max(0, (magiBeforeRental - palPhaseoutStart) * 0.5);
        const allowedLossCap = Math.max(0, maxPalAllowance - palReduction);
        allowableRentalNet = -Math.min(Math.abs(rentalNetBeforePal), allowedLossCap);
        disallowedPassiveLoss = Math.abs(rentalNetBeforePal) - Math.abs(allowableRentalNet);
    }
    // IRS Social Security Benefits Worksheet (Form 1040 Lines 6a & 6b: 0% / 50% / 85% taxable based on Provisional Income)
    let taxableSocialSecurity = 0;
    if (ssaGrossTotal > 0) {
        const provisionalIncome = Math.max(0, totalW2Wages +
            interestIncome +
            nonSsaExtraSourcesTotal +
            allowableCapitalNet +
            allowableRentalNet +
            taxExemptInterestTotal +
            0.5 * ssaGrossTotal -
            totalAdjustments);
        const ssBase1 = effectiveStatus === 'married_joint' ? 32000 : (effectiveStatus === 'married_separate' ? 0 : 25000);
        const ssBase2 = effectiveStatus === 'married_joint' ? 44000 : (effectiveStatus === 'married_separate' ? 0 : 34000);
        if (provisionalIncome > ssBase2) {
            const tier1Max = (ssBase2 - ssBase1) * 0.5;
            const tier1 = Math.min(0.5 * ssaGrossTotal, tier1Max);
            const excessOverBase2 = (provisionalIncome - ssBase2) * 0.85;
            taxableSocialSecurity = Math.round(Math.min(0.85 * ssaGrossTotal, tier1 + excessOverBase2) * 100) / 100;
        }
        else if (provisionalIncome > ssBase1) {
            taxableSocialSecurity = Math.round(Math.min(0.5 * ssaGrossTotal, (provisionalIncome - ssBase1) * 0.5) * 100) / 100;
        }
    }
    const extraSourcesTotal = Math.round((nonSsaExtraSourcesTotal + taxableSocialSecurity) * 100) / 100;
    const scheduleECalc = {
        result: allowableRentalNet,
        grossRents: rentalGross,
        expenses: rentalExpenses,
        depreciation: rentalDepreciation,
        netBeforePal: rentalNetBeforePal,
        allowableNet: allowableRentalNet,
        disallowedPassiveLoss,
        k1Income: k1IncomeTotal,
        propertyState: rentalPropertyState,
        sourceFields: ['input-rental-gross', 'input-rental-expenses', 'input-rental-depreciation'],
        generalFormula: 'Schedule E Net Rental Income = Gross Rents − Operating Expenses − MACRS Depreciation (Losses subject to Form 8582 PAL rules)',
        pluggedFormula: hasScheduleEInput
            ? (disallowedPassiveLoss > 0
                ? `Net Rent = ${formatCurrency(rentalGross)} − ${formatCurrency(rentalExpenses)} − ${formatCurrency(rentalDepreciation)} = ${formatCurrency(rentalNetBeforePal)} ➔ Form 8582 Allowed: ${formatCurrency(allowableRentalNet)} (${formatCurrency(disallowedPassiveLoss)} suspended)`
                : `Net Rent = ${formatCurrency(rentalGross)} − ${formatCurrency(rentalExpenses)} − ${formatCurrency(rentalDepreciation)} = ${formatCurrency(allowableRentalNet)}`)
            : 'Schedule E Net Rental Income = $0'
    };
    const otherIncomeTotal = interestIncome + extraSourcesTotal + allowableCapitalNet + allowableRentalNet;
    // 2. Total Gross Income
    const grossIncome = Math.round(Math.max(0, totalW2Wages + otherIncomeTotal) * 100) / 100;
    const grossIncomeSourceFields = [
        'calc-total-w2-wages',
        ...(interestIncome > 0 ? ['input-other-interest'] : []),
        ...(allowableCapitalNet !== 0 ? ['calc-capital-gains'] : []),
        ...(allowableRentalNet !== 0 ? ['calc-schedule-e'] : []),
        ...extraSources.filter(s => (Number(s.amount) || 0) > 0).map(s => `input-income-source-${s.id}`)
    ];
    const pluggedFormulaParts = [formatCurrency(totalW2Wages)];
    if (interestIncome > 0) {
        pluggedFormulaParts.push(formatCurrency(interestIncome));
    }
    let remSchedCForDisplay = scheduleCExpenses;
    extraSources.forEach(s => {
        if ((Number(s.amount) || 0) !== 0) {
            let amt = Number(s.amount) || 0;
            if (s.type === '1099-NEC' && remSchedCForDisplay > 0) {
                const expUsed = Math.min(Math.max(0, amt), remSchedCForDisplay);
                remSchedCForDisplay -= expUsed;
                amt = Math.max(0, amt - expUsed);
            }
            else if (s.type === '1099-INT' && (Number(s.accruedInterestPaid) || 0) > 0) {
                amt = Math.max(0, amt - (Number(s.accruedInterestPaid) || 0));
            }
            else if (s.type === 'SSA-1099') {
                amt = taxableSocialSecurity;
            }
            pluggedFormulaParts.push(formatCurrency(amt));
        }
    });
    if (allowableRentalNet !== 0) {
        pluggedFormulaParts.push(formatCurrency(allowableRentalNet));
    }
    if (allowableCapitalNet !== 0) {
        pluggedFormulaParts.push(formatCurrency(allowableCapitalNet));
    }
    if (pluggedFormulaParts.length === 1) {
        pluggedFormulaParts.push('$0');
    }
    const grossIncomeCalc = {
        result: grossIncome,
        sourceFields: grossIncomeSourceFields,
        generalFormula: (extraSources.length > 0 || allowableRentalNet !== 0)
            ? 'Gross Income = Total W-2 Wages + Interest + Additional Incomes + Schedule E Rental + Net Capital Gains'
            : 'Gross Income = Total W-2 Wages + Other Incomes',
        pluggedFormula: `Gross Income = ${pluggedFormulaParts.join(' + ')} = ${formatCurrency(grossIncome)}`
    };
    // 3. Adjustments to Income (Above-the-line deductions)
    const extraAdjParts = [];
    if (halfSelfEmploymentTaxDeduction > 0)
        extraAdjParts.push(`${formatCurrencyExact(halfSelfEmploymentTaxDeduction)} (½ SE Tax)`);
    if (educatorExpenses > 0)
        extraAdjParts.push(`${formatCurrency(educatorExpenses)} (Educator)`);
    if (seRetirement > 0)
        extraAdjParts.push(`${formatCurrency(seRetirement)} (SEP/SIMPLE)`);
    if (seHealthInsurance > 0)
        extraAdjParts.push(`${formatCurrency(seHealthInsurance)} (SE Health)`);
    if (alimonyPaid > 0)
        extraAdjParts.push(`${formatCurrency(alimonyPaid)} (Alimony)`);
    const adjustmentsCalc = {
        result: totalAdjustments,
        sourceFields: ['input-adj-student-loan', 'input-adj-ira', 'input-adj-hsa'],
        generalFormula: extraAdjParts.length > 0
            ? 'Adjustments = Student Loan Interest + Traditional IRA + HSA + ½ SE Tax & Schedule 1 Adjustments'
            : 'Adjustments = Student Loan Interest + Traditional IRA + HSA Deduction',
        pluggedFormula: extraAdjParts.length > 0
            ? `Adjustments = ${formatCurrency(studentLoanInterest)} + ${formatCurrency(iraDeduction)} + ${formatCurrency(hsaDeduction)} + ${extraAdjParts.join(' + ')} = ${formatCurrencyExact(totalAdjustments)}`
            : `Adjustments = ${formatCurrency(studentLoanInterest)} + ${formatCurrency(iraDeduction)} + ${formatCurrency(hsaDeduction)} = ${formatCurrency(totalAdjustments)}`
    };
    // 4. Adjusted Gross Income (AGI) - Line 11 on Form 1040
    const agi = Math.round(Math.max(0, grossIncome - totalAdjustments) * 100) / 100;
    const agiCalc = {
        result: agi,
        sourceFields: ['calc-gross-income', 'calc-total-adjustments'],
        generalFormula: 'Adjusted Gross Income (AGI) = Gross Income − Adjustments',
        pluggedFormula: `AGI = ${formatCurrency(grossIncome)} − ${formatCurrencyExact(totalAdjustments)} = ${formatCurrencyExact(agi)}`
    };
    // 5. Standard vs Itemized Deductions (Schedule A) + Age 65+/Blind Additional Standard Deduction + 20% QBI Deduction
    const age65OrBlindCount = Math.max(0, Math.min(4, parseInt(String(state.dependents?.age65OrBlindCount), 10) || 0));
    const perBoxAddStdDed = (effectiveStatus === 'single' || effectiveStatus === 'head_of_household')
        ? (year === 2025 ? 2000 : 1950)
        : (year === 2025 ? 1600 : 1550);
    const additionalStandardDeduction = age65OrBlindCount * perBoxAddStdDed;
    const standardDeductionBase = (rules.standardDeduction[effectiveStatus] || 14600) + additionalStandardDeduction;
    const medicalRaw = Number(state.itemizedDeductions?.medicalExpenses) || 0;
    const medicalThreshold = 0.075 * agi;
    const allowableMedical = Math.max(0, medicalRaw - medicalThreshold);
    const realEstateTax = Number(state.itemizedDeductions?.realEstateTax) || 0;
    const totalSaltPaid = realEstateTax + totalStateTaxWithheld + totalLocalTaxWithheld;
    const saltCap = effectiveStatus === 'married_separate' ? 5000 : 10000;
    const allowableSalt = Math.min(saltCap, totalSaltPaid);
    const mortgageInterest = Number(state.itemizedDeductions?.mortgageInterest) || 0;
    const charity = Number(state.itemizedDeductions?.charity) || 0;
    const gamblingLossesRaw = Math.max(0, Number(state.itemizedDeductions?.gamblingLosses) || 0);
    const allowableGamblingLosses = Math.min(gamblingWinningsTotal, gamblingLossesRaw);
    const totalItemized = allowableMedical + allowableSalt + mortgageInterest + charity + allowableGamblingLosses;
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
    // Form 8995: 20% Qualified Business Income (QBI) Deduction (Form 1040 Line 13)
    const netLtcgEligible = (allowableCapitalNet > 0 && ltGain > 0)
        ? Math.min(allowableCapitalNet, ltGain)
        : 0;
    const taxableIncomeBeforeQbi = Math.max(0, agi - chosenDeduction);
    const qbiBaseIncome = Math.max(0, netScheduleCProfit - halfSelfEmploymentTaxDeduction - seRetirement - seHealthInsurance) + Math.max(0, k1IncomeTotal);
    const qbiCapBase = Math.max(0, taxableIncomeBeforeQbi - (qualifiedDividendsTotal + netLtcgEligible));
    const qbiDeduction = qbiBaseIncome > 0
        ? Math.round(Math.min(qbiBaseIncome * 0.20, qbiCapBase * 0.20) * 100) / 100
        : 0;
    const isItemizedBetter = totalItemized > standardDeductionBase;
    const savingsOverAlternate = Math.abs(totalItemized - standardDeductionBase);
    const itemizedCalc = {
        result: totalItemized,
        sourceFields: [
            'input-itemized-medical',
            'input-itemized-salt',
            'input-itemized-mortgage',
            'input-itemized-charity',
            'calc-agi',
            'select-filing-status'
        ],
        generalFormula: 'Schedule A Itemized Total = Medical (>7.5% AGI) + SALT (capped at $10,000) + Mortgage Interest + Charity',
        pluggedFormula: `Schedule A Total = ${formatCurrency(allowableMedical)} (Medical) + ${formatCurrency(allowableSalt)} (SALT) + ${formatCurrency(mortgageInterest)} (Mortgage) + ${formatCurrency(charity)} (Charity)${allowableGamblingLosses > 0 ? ` + ${formatCurrency(allowableGamblingLosses)} (Gambling Loss)` : ''} = ${formatCurrency(totalItemized)}`,
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
        qbiDeduction,
        chosenDeduction,
        chosenMethod,
        savingsOverAlternate
    };
    const deductionCalc = {
        result: chosenDeduction,
        sourceFields: chosenMethod === 'itemized'
            ? ['calc-itemized-deductions', 'select-filing-status']
            : ['select-filing-status', 'select-tax-year'],
        generalFormula: `Form 1040 Line 12 Deduction = ${method === 'auto' ? 'max(Standard Deduction, Schedule A Itemized Total)' : (chosenMethod === 'itemized' ? 'Schedule A Itemized Total' : 'Standard Deduction')}${qbiDeduction > 0 ? ' (+ Line 13 20% QBI Deduction)' : ''}`,
        pluggedFormula: `Line 12 Deduction = max(Standard: ${formatCurrency(standardDeductionBase)}, Itemized: ${formatCurrency(totalItemized)}) = ${formatCurrency(chosenDeduction)} (${chosenMethod === 'itemized' ? 'Itemized Applied' : 'Standard Applied'})${qbiDeduction > 0 ? ` + Line 13 QBI Deduction: ${formatCurrencyExact(qbiDeduction)}` : ''}`
    };
    // 6. Taxable Income - Line 15 on Form 1040 (AGI − Line 12 Deduction − Line 13 QBI Deduction)
    const taxableIncome = Math.round(Math.max(0, agi - chosenDeduction - qbiDeduction) * 100) / 100;
    const taxableIncomeCalc = {
        result: taxableIncome,
        sourceFields: ['calc-agi', 'calc-standard-deduction'],
        generalFormula: qbiDeduction > 0
            ? 'Taxable Income = max(0, AGI − Line 12 Deduction − Line 13 QBI Deduction)'
            : 'Taxable Income = max(0, AGI − Deductions)',
        pluggedFormula: qbiDeduction > 0
            ? `Taxable Income = max(0, ${formatCurrencyExact(agi)} − ${formatCurrency(chosenDeduction)} − ${formatCurrencyExact(qbiDeduction)} QBI) = ${formatCurrencyExact(taxableIncome)}`
            : `Taxable Income = max(0, ${formatCurrencyExact(agi)} − ${formatCurrency(chosenDeduction)}) = ${formatCurrencyExact(taxableIncome)}`
    };
    // 7. Federal Income Tax (Marginal Tax Brackets + Qualified Dividends & Schedule D Tax Worksheet incl. 25%/28% gains)
    const brackets = rules.brackets[effectiveStatus] || rules.brackets.single;
    const ltcgBrackets = rules.ltcgBrackets[effectiveStatus] || rules.ltcgBrackets.single;
    const specialCapGains = Math.min(netLtcgEligible, collectiblesGain + unrecaptured1250Gain);
    const standardLtcgEligible = Math.max(0, netLtcgEligible - specialCapGains);
    const preferentialIncome = Math.min(taxableIncome, qualifiedDividendsTotal + standardLtcgEligible + specialCapGains);
    const ordinaryTaxableIncome = Math.max(0, taxableIncome - preferentialIncome);
    const bracketDetails = [];
    let ordinaryTax = 0;
    const bracketFormulaParts = [];
    for (let i = 0; i < brackets.length; i++) {
        const b = brackets[i];
        if (ordinaryTaxableIncome > b.min) {
            const taxableInBracket = Math.min(ordinaryTaxableIncome, b.max) - b.min;
            const taxFromBracket = taxableInBracket * b.rate;
            ordinaryTax += taxFromBracket;
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
    // Stack standard preferential income (Qualified Dividends + 0/15/20% LTCG) and 25%/28% Schedule D gains
    let preferentialTax = 0;
    let collectiblesTax = 0;
    let unrecaptured1250Tax = 0;
    const prefFormulaParts = [];
    const stdPrefIncome = Math.min(preferentialIncome, qualifiedDividendsTotal + standardLtcgEligible);
    const stdPrefTop = ordinaryTaxableIncome + stdPrefIncome;
    if (stdPrefIncome > 0) {
        for (const lb of ltcgBrackets) {
            const sliceBottom = Math.max(ordinaryTaxableIncome, lb.min);
            const sliceTop = Math.min(stdPrefTop, lb.max);
            if (sliceTop > sliceBottom) {
                const chunk = sliceTop - sliceBottom;
                const chunkTax = chunk * lb.rate;
                preferentialTax += chunkTax;
                prefFormulaParts.push(`(${formatCurrency(chunk)} LTCG/QDiv × ${formatPercent(lb.rate)})`);
            }
        }
    }
    const remainingSpecialPref = Math.max(0, preferentialIncome - stdPrefIncome);
    if (remainingSpecialPref > 0) {
        const applied1250 = Math.min(remainingSpecialPref, unrecaptured1250Gain);
        const appliedCollectibles = Math.max(0, remainingSpecialPref - applied1250);
        if (applied1250 > 0) {
            unrecaptured1250Tax = applied1250 * 0.25;
            preferentialTax += unrecaptured1250Tax;
            prefFormulaParts.push(`(${formatCurrency(applied1250)} Sec. 1250 × 25%)`);
        }
        if (appliedCollectibles > 0) {
            collectiblesTax = appliedCollectibles * 0.28;
            preferentialTax += collectiblesTax;
            prefFormulaParts.push(`(${formatCurrency(appliedCollectibles)} Collectibles × 28%)`);
        }
    }
    const tentativeTax = Math.round((ordinaryTax + preferentialTax) * 100) / 100;
    const taxBeforeCredits = tentativeTax;
    const taxBeforeCreditsCalc = {
        result: taxBeforeCredits,
        sourceFields: ['calc-taxable-income', 'select-filing-status'],
        generalFormula: preferentialIncome > 0
            ? 'Tentative Tax = Ordinary Bracket Tax on (Taxable Income − Preferential Income) + Qualified Dividends & LTCG Tax (0% / 15% / 20%)'
            : 'Tentative Tax = ∑(Taxable Income in Bracket i × Bracket Rate i)',
        pluggedFormula: preferentialIncome > 0
            ? `Ordinary Tax (${formatCurrencyExact(ordinaryTax)} on ${formatCurrency(ordinaryTaxableIncome)}) + Preferential LTCG/QDiv Tax (${prefFormulaParts.join(' + ')} = ${formatCurrencyExact(preferentialTax)}) = ${formatCurrencyExact(taxBeforeCredits)}`
            : (bracketFormulaParts.length > 0
                ? `Tentative Tax = ${bracketFormulaParts.join(' + ')} = ${formatCurrencyExact(taxBeforeCredits)}`
                : `Tentative Tax = $0 × 10% = $0`),
        brackets: bracketDetails,
        qualifiedDividendsTotal,
        preferentialIncome,
        preferentialTax,
        ordinaryTaxableIncome,
        ordinaryTax,
        collectiblesTax,
        unrecaptured1250Tax
    };
    // 8. Tax Credits (Child Tax Credit, Other Dependents Credit, Child Care Form 2441, Education Form 8863, Saver's Form 8880, Foreign Tax Form 1116, Clean Energy Form 5695, Refundable ACTC & EITC)
    const numChildren = Math.max(0, parseInt(String(state.dependents?.childrenCount), 10) || 0);
    const numOtherDependents = Math.max(0, parseInt(String(state.dependents?.otherDependentsCount), 10) || 0);
    let childCreditPhaseoutAmount = 0;
    const maxPotentialCtc = numChildren * rules.childTaxCreditPerChild;
    const maxPotentialOdc = numOtherDependents * 500;
    const combinedCtcOdcMax = maxPotentialCtc + maxPotentialOdc;
    if (combinedCtcOdcMax > 0) {
        const threshold = rules.childTaxCreditPhaseout[effectiveStatus] || 200000;
        if (agi > threshold) {
            const excess = agi - threshold;
            const chunks = Math.ceil(excess / 1000);
            childCreditPhaseoutAmount = chunks * 50;
        }
    }
    const netCtcOdcAfterPhaseout = Math.max(0, combinedCtcOdcMax - childCreditPhaseoutAmount);
    const ctcAfterPhaseout = Math.min(maxPotentialCtc, netCtcOdcAfterPhaseout);
    const odcAfterPhaseout = Math.max(0, netCtcOdcAfterPhaseout - ctcAfterPhaseout);
    // Form 2441: Child & Dependent Care Credit (20% to 35% of up to $3,000 for 1 person / $6,000 for 2+)
    const rawCareExpenses = Math.max(0, Number(state.dependents?.childCareExpenses) || 0);
    const carePersons = Math.max(1, numChildren + numOtherDependents);
    const careCap = carePersons >= 2 ? 6000 : 3000;
    const eligibleCareExpenses = Math.min(careCap, rawCareExpenses);
    const careRate = agi <= 15000 ? 0.35 : Math.max(0.20, 0.35 - Math.ceil((agi - 15000) / 2000) * 0.01);
    const childCareCreditRaw = effectiveStatus === 'married_separate' ? 0 : Math.round(eligibleCareExpenses * careRate * 100) / 100;
    // Form 8863: Education Credits (AOTC up to $2,500 w/ 40% refundable + LLC 20% up to $2,000)
    const aotcTuition = Math.max(0, Number(state.dependents?.educationExpensesAotc) || 0);
    const llcTuition = Math.max(0, Number(state.dependents?.educationExpensesLlc) || 0);
    const eduPhaseStart = effectiveStatus === 'married_joint' ? 160000 : 80000;
    const eduPhaseSpan = effectiveStatus === 'married_joint' ? 20000 : 10000;
    const eduPhaseFactor = effectiveStatus === 'married_separate'
        ? 0
        : Math.max(0, Math.min(1, 1 - Math.max(0, agi - eduPhaseStart) / eduPhaseSpan));
    const rawAotc = aotcTuition > 0
        ? (Math.min(2000, aotcTuition) + Math.max(0, Math.min(4000, aotcTuition) - 2000) * 0.25) * eduPhaseFactor
        : 0;
    const educationCreditRefundable = Math.round(rawAotc * 0.40 * 100) / 100;
    const aotcNonRefundable = Math.round(rawAotc * 0.60 * 100) / 100;
    const llcNonRefundable = Math.round(Math.min(10000, llcTuition) * 0.20 * eduPhaseFactor * 100) / 100;
    const educationCreditNonRefundableRaw = aotcNonRefundable + llcNonRefundable;
    // Form 8880: Saver's Credit (10% / 20% / 50% of up to $2,000 / $4,000 MFJ IRA contribution for low/mod AGI)
    const saversMaxContribution = effectiveStatus === 'married_joint' ? 4000 : 2000;
    const saversEligibleContrib = Math.min(saversMaxContribution, iraDeduction);
    let saversRate = 0;
    if (saversEligibleContrib > 0) {
        const t50 = effectiveStatus === 'married_joint' ? 46000 : (effectiveStatus === 'head_of_household' ? 34500 : 23000);
        const t20 = effectiveStatus === 'married_joint' ? 50000 : (effectiveStatus === 'head_of_household' ? 37500 : 25000);
        const t10 = effectiveStatus === 'married_joint' ? 76500 : (effectiveStatus === 'head_of_household' ? 57375 : 38250);
        if (agi <= t50)
            saversRate = 0.50;
        else if (agi <= t20)
            saversRate = 0.20;
        else if (agi <= t10)
            saversRate = 0.10;
    }
    const saversCreditRaw = Math.round(saversEligibleContrib * saversRate * 100) / 100;
    const foreignTaxCreditRaw = Math.max(0, Number(state.dependents?.foreignTaxCredit) || 0);
    const cleanEnergyCreditRaw = Math.max(0, Number(state.dependents?.cleanEnergyCredit) || 0);
    const totalNonRefundableRaw = ctcAfterPhaseout + odcAfterPhaseout + childCareCreditRaw + educationCreditNonRefundableRaw + saversCreditRaw + foreignTaxCreditRaw + cleanEnergyCreditRaw;
    const totalNonRefundableCredits = Math.round(Math.min(taxBeforeCredits, totalNonRefundableRaw) * 100) / 100;
    const childCreditAllowed = Math.min(taxBeforeCredits, ctcAfterPhaseout);
    const otherDependentsCredit = Math.min(Math.max(0, taxBeforeCredits - childCreditAllowed), odcAfterPhaseout);
    // Schedule 8812: Refundable Additional Child Tax Credit (ACTC - up to $1,700/child at 15% of earned income over $2,500)
    const earnedIncomeTotal = totalW2Wages + Math.max(0, netScheduleCProfit);
    const unusedCtc = Math.max(0, ctcAfterPhaseout - childCreditAllowed);
    const actcMaxPerKids = numChildren * rules.childTaxCreditRefundableMax;
    const actcEarnedIncomeFormula = Math.max(0, (earnedIncomeTotal - 2500) * 0.15);
    const additionalChildTaxCredit = numChildren > 0
        ? Math.round(Math.min(unusedCtc, actcMaxPerKids, actcEarnedIncomeFormula) * 100) / 100
        : 0;
    // Schedule EIC: Earned Income Tax Credit (EITC - automatic for eligible low/moderate earned income)
    const investmentIncomeForEitc = interestIncome + net1099InterestTotal + taxExemptInterestTotal + total1099Dividends + Math.max(0, allowableCapitalNet) + Math.max(0, allowableRentalNet);
    const eitcInvCap = year === 2025 ? 11950 : 11600;
    let eitc = 0;
    if (effectiveStatus !== 'married_separate' && earnedIncomeTotal > 0 && investmentIncomeForEitc <= eitcInvCap) {
        const kidsBucket = Math.min(3, numChildren);
        const eitcParams = {
            0: { maxCredit: 632, phaseInRate: 0.0765, phaseOutRate: 0.0765, singleEnd: 18591, mfjEnd: 25511 },
            1: { maxCredit: 4213, phaseInRate: 0.34, phaseOutRate: 0.1598, singleEnd: 49084, mfjEnd: 56004 },
            2: { maxCredit: 6960, phaseInRate: 0.40, phaseOutRate: 0.2106, singleEnd: 55768, mfjEnd: 62688 },
            3: { maxCredit: 7830, phaseInRate: 0.45, phaseOutRate: 0.2106, singleEnd: 59899, mfjEnd: 66819 }
        };
        const p = eitcParams[kidsBucket];
        const agiLimit = effectiveStatus === 'married_joint' ? p.mfjEnd : p.singleEnd;
        const baseIncome = Math.max(earnedIncomeTotal, agi);
        if (baseIncome < agiLimit) {
            const phaseIn = Math.min(p.maxCredit, earnedIncomeTotal * p.phaseInRate);
            const phaseOutStart = agiLimit - (p.maxCredit / p.phaseOutRate);
            const phaseOutReduction = Math.max(0, (baseIncome - phaseOutStart) * p.phaseOutRate);
            eitc = Math.round(Math.max(0, Math.min(phaseIn, p.maxCredit - phaseOutReduction)) * 100) / 100;
        }
    }
    const totalRefundableCredits = Math.round((additionalChildTaxCredit + eitc + educationCreditRefundable) * 100) / 100;
    const creditsCalc = {
        result: totalNonRefundableCredits,
        childTaxCredit: childCreditAllowed,
        additionalChildTaxCredit,
        otherDependentsCredit,
        eitc,
        childCareCredit: childCareCreditRaw,
        educationCreditNonRefundable: educationCreditNonRefundableRaw,
        educationCreditRefundable,
        saversCredit: saversCreditRaw,
        foreignTaxCredit: foreignTaxCreditRaw,
        cleanEnergyCredit: cleanEnergyCreditRaw,
        totalNonRefundableCredits,
        totalRefundableCredits,
        sourceFields: ['input-children-count', 'calc-agi', 'calc-tax-before-credits'],
        generalFormula: totalRefundableCredits > 0
            ? 'Tax Credits = Nonrefundable Credits (CTC/ODC/Care/Edu/Energy) + Refundable Credits (ACTC/EITC/AOTC)'
            : 'Tax Credits = min(Tax Liability, Qualifying Children × $2,000 + Other Credits − Phaseout)',
        pluggedFormula: (totalNonRefundableCredits > 0 || totalRefundableCredits > 0)
            ? `Nonrefundable Credits = ${formatCurrencyExact(totalNonRefundableCredits)}${totalRefundableCredits > 0 ? ` (+ ${formatCurrencyExact(totalRefundableCredits)} Refundable ACTC/EITC/AOTC on Line 27–29)` : ''}`
            : `Credits = 0 qualifying children = $0`
    };
    // 8b. FICA & Other Taxes (Schedule SE, Form 8959 Additional Medicare, Form 8960 NIIT, Form 6251 AMT, Form 5329 Early Withdrawal Penalty)
    // Excess Social Security Tax Credit (Schedule 3, Line 11): applies when 2+ employers withhold SS tax above the annual cap
    const maxAnnualSSTax = Math.round(rules.ssWageLimit * rules.ssRate * 100) / 100;
    const excessSSTaxCredit = w2List.length > 1 && totalSSTax > maxAnnualSSTax
        ? Math.round((totalSSTax - maxAnnualSSTax) * 100) / 100
        : 0;
    // Form 8959: 0.9% Additional Medicare Tax on combined Medicare wages (Box 5) + SE earnings above threshold ($200k Single / $250k MFJ)
    const addMedThreshold = rules.additionalMedicareThreshold[effectiveStatus] || 200000;
    const combinedMedAndSeWages = totalMedWages + seTaxableEarnings;
    const excessMedWages = Math.max(0, combinedMedAndSeWages - addMedThreshold);
    const additionalMedicareTax = Math.round(excessMedWages * rules.additionalMedicareRate * 100) / 100;
    // Form 8960: 3.8% Net Investment Income Tax (NIIT) on min(Net Investment Income, max(0, MAGI - threshold))
    const niitThreshold = rules.niitThreshold[effectiveStatus] || 200000;
    const netInvestmentIncome = Math.max(0, interestIncome +
        net1099InterestTotal +
        total1099Dividends +
        Math.max(0, allowableCapitalNet) +
        Math.max(0, allowableRentalNet));
    const magiExcessOverNiit = Math.max(0, agi - niitThreshold);
    const niitBase = Math.min(netInvestmentIncome, magiExcessOverNiit);
    const niit = Math.round(niitBase * rules.niitRate * 100) / 100;
    // Form 6251: Alternative Minimum Tax (AMT)
    // AMTI = AGI - AMT-allowed itemized deductions (Medical + Mortgage + Charity, i.e., SALT and Standard Deduction added back)
    const amtAllowedDeductions = allowableMedical + mortgageInterest + charity + allowableGamblingLosses;
    const amti = Math.max(0, agi - amtAllowedDeductions - qbiDeduction);
    const amtExemptionBase = effectiveStatus === 'married_joint'
        ? (year === 2025 ? 137000 : 133300)
        : (effectiveStatus === 'married_separate' ? (year === 2025 ? 68500 : 66650) : (year === 2025 ? 88100 : 85700));
    const amtPhaseoutThreshold = effectiveStatus === 'married_joint'
        ? (year === 2025 ? 1252700 : 1218700)
        : (year === 2025 ? 626350 : 609350);
    const amtExemptionReduction = Math.max(0, (amti - amtPhaseoutThreshold) * 0.25);
    const amtExemption = Math.max(0, amtExemptionBase - amtExemptionReduction);
    const amtTaxableExcess = Math.max(0, amti - amtExemption);
    const amtOrdinaryExcess = Math.max(0, amtTaxableExcess - preferentialIncome);
    const amt28Breakpoint = effectiveStatus === 'married_separate' ? 116300 : 232600;
    const tmtOrdinary = amtOrdinaryExcess <= amt28Breakpoint
        ? amtOrdinaryExcess * 0.26
        : (amt28Breakpoint * 0.26 + (amtOrdinaryExcess - amt28Breakpoint) * 0.28);
    const tentativeMinimumTax = Math.round((tmtOrdinary + preferentialTax) * 100) / 100;
    const amt = amti > amtExemptionBase ? Math.max(0, Math.round((tentativeMinimumTax - taxBeforeCredits) * 100) / 100) : 0;
    // Form 5329: 10% Early Retirement Distribution Penalty
    const earlyDistributionPenaltyTax = Math.round(earlyDist1099RTotal * 0.10 * 100) / 100;
    const totalOtherTaxes = Math.round((selfEmploymentTax + additionalMedicareTax + niit + amt + earlyDistributionPenaltyTax) * 100) / 100;
    const otherTaxParts = [];
    if (selfEmploymentTax > 0) {
        otherTaxParts.push(`Schedule SE (${formatCurrencyExact(selfEmploymentTax)})`);
    }
    if (additionalMedicareTax > 0 || niit > 0) {
        otherTaxParts.push(`Form 8959 (${formatCurrency(excessMedWages)} × 0.9% = ${formatCurrencyExact(additionalMedicareTax)}) + Form 8960 (min(NII ${formatCurrency(netInvestmentIncome)}, MAGI Excess ${formatCurrency(magiExcessOverNiit)}) × 3.8% = ${formatCurrencyExact(niit)})`);
    }
    if (amt > 0) {
        otherTaxParts.push(`Form 6251 AMT (${formatCurrencyExact(amt)})`);
    }
    if (earlyDistributionPenaltyTax > 0) {
        otherTaxParts.push(`Form 5329 10% Penalty (${formatCurrencyExact(earlyDistributionPenaltyTax)})`);
    }
    const otherTaxesCalc = {
        result: totalOtherTaxes,
        selfEmploymentTax,
        halfSelfEmploymentTaxDeduction,
        additionalMedicareTax,
        niit,
        amt,
        earlyDistributionPenaltyTax,
        netInvestmentIncome,
        totalOtherTaxes,
        sourceFields: ['calc-agi', ...w2List.map((w, idx) => `w2-${w.id || idx}-box5`)],
        generalFormula: 'Schedule 2 Other Taxes = Schedule SE (15.3%) + Form 8959 Additional Medicare (0.9% over $200k) + Form 8960 NIIT (3.8%) + Form 6251 AMT',
        pluggedFormula: totalOtherTaxes > 0
            ? `${otherTaxParts.join(' + ')} = ${formatCurrencyExact(totalOtherTaxes)}`
            : 'Schedule 2 Other Taxes (Schedule SE / Form 8959 / Form 8960 / AMT) = $0'
    };
    // 9. Total Federal Tax Liability (Form 1040 Line 24 = max(0, Tentative Tax − Nonrefundable Credits) + Schedule 2 Other Taxes)
    const totalTaxLiability = Math.round((Math.max(0, taxBeforeCredits - totalNonRefundableCredits) + totalOtherTaxes) * 100) / 100;
    const totalTaxCalc = {
        result: totalTaxLiability,
        sourceFields: [
            'calc-tax-before-credits',
            'calc-total-credits',
            ...(totalOtherTaxes > 0 ? ['calc-other-taxes'] : [])
        ],
        generalFormula: totalOtherTaxes > 0
            ? 'Total Tax Liability = max(0, Tentative Tax − Total Credits) + Schedule 2 Other Taxes (Form 8959 & Form 8960)'
            : 'Total Tax Liability = max(0, Tentative Tax − Total Credits)',
        pluggedFormula: totalOtherTaxes > 0
            ? `Total Tax Liability = max(0, ${formatCurrencyExact(taxBeforeCredits)} − ${formatCurrencyExact(totalNonRefundableCredits)}) + ${formatCurrencyExact(totalOtherTaxes)} = ${formatCurrencyExact(totalTaxLiability)}`
            : `Total Tax Liability = max(0, ${formatCurrencyExact(taxBeforeCredits)} − ${formatCurrencyExact(totalNonRefundableCredits)}) = ${formatCurrencyExact(totalTaxLiability)}`
    };
    // 10. Total Federal Income Tax Withheld & Payments (W-2 Box 2 + 1099 Box 4 Withholding + Estimated Tax Payments + Refundable Credits + Schedule 3 Line 11 Excess SS Tax Credit)
    const box2Values = w2List.map(w => Number(w.box2) || 0);
    const w2Box2Total = box2Values.reduce((sum, val) => sum + val, 0);
    const estimatedTaxPayments = Math.max(0, Number(state.dependents?.estimatedTaxPayments) || 0);
    const totalWithheld = Math.round((w2Box2Total + extra1099WithheldTotal + estimatedTaxPayments + totalRefundableCredits + excessSSTaxCredit) * 100) / 100;
    const w2WithheldFieldIds = [
        ...w2List.map((w, idx) => `w2-${w.id || idx}-box2`),
        ...(excessSSTaxCredit > 0 ? ['calc-fica-breakdown'] : []),
        ...(totalRefundableCredits > 0 ? ['calc-total-credits'] : [])
    ];
    const paymentExtras = [];
    if (extra1099WithheldTotal > 0)
        paymentExtras.push(`${formatCurrencyExact(extra1099WithheldTotal)} (1099 WH)`);
    if (estimatedTaxPayments > 0)
        paymentExtras.push(`${formatCurrencyExact(estimatedTaxPayments)} (1040-ES)`);
    if (totalRefundableCredits > 0)
        paymentExtras.push(`${formatCurrencyExact(totalRefundableCredits)} (Refundable Credits)`);
    if (excessSSTaxCredit > 0)
        paymentExtras.push(`${formatCurrencyExact(excessSSTaxCredit)} (Excess SS Credit)`);
    const withholdingCalc = {
        result: totalWithheld,
        sourceFields: w2WithheldFieldIds,
        generalFormula: paymentExtras.length > 0
            ? 'Total Federal Payments = ∑(W-2 Box 2) + Schedule 3 Line 11 Excess Social Security Tax Credit & Refundable Payments'
            : (w2List.length === 1 ? 'Total Withholding = W-2 Box 2' : 'Total Withholding = ∑(W-2 Box 2)'),
        pluggedFormula: paymentExtras.length > 0
            ? `Total Payments = ${box2Values.map(v => formatCurrencyExact(v)).join(' + ')} + ${paymentExtras.join(' + ')} = ${formatCurrencyExact(totalWithheld)}`
            : (w2List.length === 1
                ? `Total Withholding = ${formatCurrencyExact(box2Values[0])}`
                : `Total Withholding = ${box2Values.map(v => formatCurrencyExact(v)).join(' + ')} = ${formatCurrencyExact(totalWithheld)}`)
    };
    // 11. Final Refund or Amount You Owe
    const netDifference = Math.round((totalWithheld - totalTaxLiability) * 100) / 100;
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
    // 12. FICA Breakdown (Social Security & Medicare from W2 boxes 3, 4, 5, 6 + Excess SS Tax Credit)
    const ficaCalc = {
        result: totalFicaWithheld,
        ssWages: totalSSWages,
        ssTax: totalSSTax,
        medWages: totalMedWages,
        medTax: totalMedTax,
        totalFica: totalFicaWithheld,
        excessSSTaxCredit,
        sourceFields: [
            ...w2List.map((w, idx) => `w2-${w.id || idx}-box4`),
            ...w2List.map((w, idx) => `w2-${w.id || idx}-box6`)
        ],
        generalFormula: excessSSTaxCredit > 0
            ? `Total FICA Withheld = Box 4 SS + Box 6 Medicare (Excess SS over ${formatCurrencyExact(maxAnnualSSTax)} cap = ${formatCurrencyExact(excessSSTaxCredit)} credited on Schedule 3 Line 11)`
            : 'Total FICA Taxes = Social Security Tax (Box 4) + Medicare Tax (Box 6)',
        pluggedFormula: excessSSTaxCredit > 0
            ? `Total FICA = ${formatCurrencyExact(totalSSTax)} (SS) + ${formatCurrencyExact(totalMedTax)} (Medicare) = ${formatCurrencyExact(totalFicaWithheld)} ➔ Schedule 3 Excess SS Credit = ${formatCurrencyExact(excessSSTaxCredit)}`
            : `Total FICA = ${formatCurrencyExact(totalSSTax)} + ${formatCurrencyExact(totalMedTax)} = ${formatCurrencyExact(totalFicaWithheld)}`
    };
    // Effective Tax Rate
    const effectiveRate = grossIncome > 0 ? (totalTaxLiability / grossIncome) : 0;
    const effectiveRateCalc = {
        rate: effectiveRate,
        sourceFields: ['calc-total-tax-liability', 'calc-gross-income'],
        generalFormula: 'Effective Tax Rate = Total Tax Liability ÷ Gross Income',
        pluggedFormula: `Effective Rate = ${formatCurrencyExact(totalTaxLiability)} ÷ ${formatCurrency(grossIncome)} = ${formatPercent(effectiveRate)}`
    };
    // 14. Multi-State Tax Return Engine & Unified Summary (Handles OSTC, Reciprocity, NYC Local Tax, DC Form D-30, WA 7% LTCG, NH 3% I&D, & State Itemized Deductions)
    const { stateReturnsCalc, unifiedSummaryCalc } = calculateStateReturnsAndUnifiedSummary(state, w2List, totalW2Wages, grossIncome, agi, filingStatus, totalTaxLiability, totalWithheld, netDifference, isRefund, scheduleECalc, itemizedCalc);
    return {
        year,
        filingStatus,
        w2Count: w2List.length,
        w2WagesCalc,
        grossIncomeCalc,
        adjustmentsCalc,
        agiCalc,
        deductionCalc,
        qbiDeduction,
        itemizedCalc,
        capitalGainsCalc,
        scheduleECalc,
        taxableIncomeCalc,
        taxBeforeCreditsCalc,
        creditsCalc,
        otherTaxesCalc,
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
 * Handles order independence, reciprocity agreements (e.g. NJ & PA), Other State Tax Credits (OSTC),
 * NYC Local Municipal Income Tax (Form IT-201), NY Itemized Deductions (Form IT-196), D.C. Form D-30 UBT,
 * WA 7% Capital Gains Excise Tax, NH Form DP-10 Interest & Dividends Tax, CA Mental Health Surtax & HSA Add-Back,
 * MA 8.5% Short-Term Capital Gains Tax, NJ Property Tax Deduction & HSA Add-Back, PA 8-Class Gross Income,
 * MD/OH/IN/KY/MI/MO/PA/DE/AL Local Taxes, State LTCG Exclusions, and AL/OR/MO Federal Tax Deductions.
 */
export function calculateStateReturnsAndUnifiedSummary(state, w2List, totalFederalWages, grossIncome, agi, filingStatus, totalFederalLiability, totalFederalWithholding, federalNetDifference, federalIsRefund, scheduleECalc, itemizedCalc) {
    const effectiveStatus = normalizeFilingStatus(filingStatus);
    const year = state.year || 2024;
    // 1. Determine resident state:
    let residentState = 'CA';
    if (state.residentState && state.residentState.trim().length > 0) {
        residentState = state.residentState.toUpperCase().trim();
    }
    else if (w2List[0]?.states?.[0]?.state && w2List[0].states[0].state.trim().length > 0) {
        residentState = w2List[0].states[0].state.toUpperCase().trim();
    }
    // 2. Discover all relevant states from W-2s, 1099s, and Schedule E Rental Property:
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
    if (scheduleECalc && scheduleECalc.propertyState && (scheduleECalc.grossRents > 0 || scheduleECalc.allowableNet !== 0)) {
        stateCodesSet.add(scheduleECalc.propertyState);
    }
    const stateCodes = Array.from(stateCodesSet);
    const residentRule = getStateTaxRule(residentState);
    const rawMap = new Map();
    stateCodes.forEach(c => {
        rawMap.set(c, {
            code: c,
            w2Wages: 0,
            w2Withheld: 0,
            localWages: 0,
            localWithheld: 0,
            hasNycLocality: false,
            hasYonkersLocality: false,
            other1099: 0,
            rentalNet: 0,
            rentalGross: 0,
            sourceFieldIds: []
        });
    });
    w2List.forEach((w, wIdx) => {
        (w.states || []).forEach((s, sIdx) => {
            const code = (s.state || residentState).toUpperCase().trim();
            if (!rawMap.has(code)) {
                rawMap.set(code, {
                    code, w2Wages: 0, w2Withheld: 0, localWages: 0, localWithheld: 0,
                    hasNycLocality: false, hasYonkersLocality: false, other1099: 0, rentalNet: 0, rentalGross: 0, sourceFieldIds: []
                });
            }
            const item = rawMap.get(code);
            item.w2Wages += Number(s.stateWages) || 0;
            item.w2Withheld += Number(s.stateTaxWithheld) || 0;
            item.localWages += Number(s.localWages) || 0;
            item.localWithheld += Number(s.localTaxWithheld) || 0;
            const loc = (s.localityName || '').toUpperCase().trim();
            if (loc.includes('YONKERS')) {
                item.hasYonkersLocality = true;
            }
            else if (loc.includes('NYC') || loc.includes('NEW YORK') || (code === 'NY' && (Number(s.localTaxWithheld) || 0) > 0)) {
                item.hasNycLocality = true;
            }
            item.sourceFieldIds.push(`w2-${w.id || wIdx}-state-${s.id || sIdx}-box16`);
            item.sourceFieldIds.push(`w2-${w.id || wIdx}-state-${s.id || sIdx}-box17`);
        });
    });
    let totalDivAndIntForStates = Number(state.otherIncome?.interest) || 0;
    (state.otherIncome?.sources || []).forEach((src, srcIdx) => {
        const code = (src.state || residentState).toUpperCase().trim();
        if (!rawMap.has(code)) {
            rawMap.set(code, {
                code, w2Wages: 0, w2Withheld: 0, localWages: 0, localWithheld: 0,
                hasNycLocality: false, hasYonkersLocality: false, other1099: 0, rentalNet: 0, rentalGross: 0, sourceFieldIds: []
            });
        }
        const item = rawMap.get(code);
        let amt = Number(src.amount) || 0;
        if (src.type === '1099-INT' && (Number(src.accruedInterestPaid) || 0) > 0) {
            amt = Math.max(0, amt - (Number(src.accruedInterestPaid) || 0));
        }
        if (src.type === '1099-INT' || src.type === '1099-DIV') {
            totalDivAndIntForStates += amt;
        }
        item.other1099 += amt;
        item.sourceFieldIds.push(`input-source-${src.id || srcIdx}-amount`);
    });
    if (scheduleECalc && scheduleECalc.propertyState) {
        const pCode = scheduleECalc.propertyState;
        if (!rawMap.has(pCode)) {
            rawMap.set(pCode, {
                code: pCode, w2Wages: 0, w2Withheld: 0, localWages: 0, localWithheld: 0,
                hasNycLocality: false, hasYonkersLocality: false, other1099: 0, rentalNet: 0, rentalGross: 0, sourceFieldIds: []
            });
        }
        const item = rawMap.get(pCode);
        item.rentalNet += scheduleECalc.allowableNet;
        item.rentalGross += scheduleECalc.grossRents;
        item.sourceFieldIds.push('calc-schedule-e');
    }
    // PASS 1: Calculate all Non-Resident States first!
    const nonResidentReturns = [];
    const nonResidentCodes = stateCodes.filter(c => c !== residentState);
    for (const code of nonResidentCodes) {
        const rule = getStateTaxRule(code);
        const raw = rawMap.get(code);
        const stateWages = raw.w2Wages + raw.other1099 + Math.max(0, raw.rentalNet);
        const withholding = raw.w2Withheld;
        const localTax = raw.localWithheld;
        // Special Case: Washington, D.C. Nonresident Rental Property (Form D-30 Unincorporated Business Franchise Tax)
        if (code === 'DC' && raw.w2Wages === 0 && (raw.rentalGross > 0 || raw.other1099 > 0)) {
            const dcGrossReceipts = raw.rentalGross > 0 ? raw.rentalGross : raw.other1099;
            const dcNetRental = raw.rentalGross > 0 ? Math.max(0, raw.rentalNet) : raw.other1099;
            const salaryAllowance = Math.round(dcNetRental * 0.30 * 100) / 100;
            const specificExemption = 5000;
            const dcTaxableUbt = Math.max(0, dcNetRental - salaryAllowance - specificExemption);
            const rawUbtTax = Math.round(dcTaxableUbt * 0.0825 * 100) / 100;
            const dcLiability = dcGrossReceipts > 12000 ? Math.max(250, rawUbtTax) : 0;
            const netDiff = withholding - dcLiability;
            const isRefund = netDiff >= 0;
            const netOutcome = Math.abs(netDiff);
            nonResidentReturns.push({
                result: dcLiability,
                state: 'DC',
                stateName: rule.name,
                residentStatus: 'non_resident',
                formName: 'Form D-30 (Unincorporated Business Franchise Tax)',
                hasIncomeTax: true,
                stateWages: dcNetRental,
                stateStandardDeduction: Math.round((salaryAllowance + specificExemption) * 100) / 100,
                stateTaxableIncome: dcTaxableUbt,
                stateTaxBeforeCredit: dcLiability,
                creditForOtherStates: 0,
                creditedStates: [],
                reciprocityExemption: false,
                stateTaxLiability: dcLiability,
                localTaxLiability: 0,
                stateWithholding: withholding,
                localTaxWithheld: localTax,
                netOutcome,
                isRefund,
                sourceFields: raw.sourceFieldIds,
                generalFormula: 'DC Form D-30 UBT = max($250 Min, (Net Rental Income − 30% Salary Allowance − $5,000 Exemption) × 8.25%)',
                pluggedFormula: `DC Taxable UBT = ${formatCurrency(dcNetRental)} − ${formatCurrency(salaryAllowance)} (30% Allowance) − $5,000 (Exemption) = ${formatCurrency(dcTaxableUbt)} × 8.25% = ${formatCurrencyExact(dcLiability)}`
            });
            continue;
        }
        // Check Reciprocity (applies to W-2 wage compensation)
        const isReciprocal = ((rule.reciprocalWith && rule.reciprocalWith.includes(residentState)) ||
            (residentRule.reciprocalWith && residentRule.reciprocalWith.includes(code))) &&
            raw.rentalNet <= 0;
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
                localTaxLiability: 0,
                stateWithholding: withholding,
                localTaxWithheld: localTax,
                netOutcome,
                isRefund: true,
                sourceFields: raw.sourceFieldIds,
                generalFormula: `Tax = $0 (Reciprocal Agreement: ${residentState} & ${code})`,
                pluggedFormula: `State Wages: ${formatCurrency(stateWages)} ➔ State Tax Liability = $0 (Exempt via ${residentState}/${code} Reciprocity)`
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
                localTaxLiability: 0,
                stateWithholding: withholding,
                localTaxWithheld: localTax,
                netOutcome: withholding,
                isRefund: true,
                sourceFields: raw.sourceFieldIds,
                generalFormula: `${rule.name} imposes 0% personal income tax on wage compensation`,
                pluggedFormula: `State Tax = $0 (No ${rule.name} State Return Required)`
            });
            continue;
        }
        // Standard Non-Resident Calculation
        const stdDed = rule.standardDeduction[effectiveStatus] || 0;
        const taxable = Math.max(0, stateWages - stdDed);
        let tax = 0;
        if (rule.isFlat) {
            tax = taxable * (rule.flatRate || 0);
        }
        else {
            const bList = rule.brackets?.[effectiveStatus] || rule.brackets?.['single'] || [];
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
            localTaxLiability: 0,
            stateWithholding: withholding,
            localTaxWithheld: localTax,
            netOutcome,
            isRefund,
            sourceFields: raw.sourceFieldIds,
            generalFormula: `${rule.formNonResident}: State Tax = max(0, State Sourced Wages − State Standard Deduction) × Rates`,
            pluggedFormula: `Taxable Income = ${formatCurrency(stateWages)} − ${formatCurrency(stdDed)} = ${formatCurrency(taxable)} ➔ State Tax Liability = ${formatCurrencyExact(stateTaxLiability)}`
        });
    }
    // PASS 2: Calculate Resident State Return (with OSTC, State Itemized Deductions, Local Taxes, WA 7% LTCG, NH 3% I&D, & State Modifications)
    const resRaw = rawMap.get(residentState);
    let residentTotalWages = Math.max(resRaw.w2Wages + resRaw.other1099, agi > 0 ? agi : grossIncome, totalFederalWages);
    const resWithholding = resRaw.w2Withheld;
    const resLocalTax = resRaw.localWithheld;
    const stGain = Number(state.otherIncome?.capitalGains?.shortTerm) || 0;
    const ltGain = Number(state.otherIncome?.capitalGains?.longTerm) || 0;
    const netLtcg = Math.max(0, ltGain + Math.min(0, stGain));
    let residentReturn;
    // Special Case 1: Washington State (0% Wage Tax, but 7% Excise Tax on Long-Term Capital Gains exceeding $270,000 in 2024 / $278,000 in 2025)
    const waLtcgThreshold = year === 2025 ? 278000 : 270000;
    if (residentState === 'WA' && netLtcg > waLtcgThreshold) {
        const waTaxableLtcg = netLtcg - waLtcgThreshold;
        const waExciseTax = Math.round(waTaxableLtcg * 0.07 * 100) / 100;
        const waNetDiff = resWithholding - waExciseTax;
        residentReturn = {
            result: waExciseTax,
            state: 'WA',
            stateName: 'Washington',
            residentStatus: 'resident',
            formName: 'WA Capital Gains Excise Tax Return (7% over $270k)',
            hasIncomeTax: true,
            stateWages: netLtcg,
            stateStandardDeduction: waLtcgThreshold,
            stateTaxableIncome: waTaxableLtcg,
            stateTaxBeforeCredit: waExciseTax,
            creditForOtherStates: 0,
            creditedStates: [],
            reciprocityExemption: false,
            stateTaxLiability: waExciseTax,
            localTaxLiability: 0,
            stateWithholding: resWithholding,
            localTaxWithheld: resLocalTax,
            netOutcome: Math.abs(waNetDiff),
            isRefund: waNetDiff >= 0,
            sourceFields: ['calc-capital-gains'],
            generalFormula: `WA Capital Gains Excise Tax = max(0, Net Long-Term Capital Gain − ${formatCurrency(waLtcgThreshold)}) × 7%`,
            pluggedFormula: `Taxable LTCG = ${formatCurrency(netLtcg)} − ${formatCurrency(waLtcgThreshold)} = ${formatCurrency(waTaxableLtcg)} × 7% = ${formatCurrencyExact(waExciseTax)}`
        };
    }
    else if (residentState === 'NH' && year === 2024 && totalDivAndIntForStates > (effectiveStatus === 'married_joint' ? 4800 : 2400)) {
        // Special Case 2: New Hampshire Form DP-10 (3% Interest & Dividends Tax in 2024 over $2,400 Single / $4,800 MFJ)
        const nhExemption = effectiveStatus === 'married_joint' ? 4800 : 2400;
        const nhTaxableID = totalDivAndIntForStates - nhExemption;
        const nhIdTax = Math.round(nhTaxableID * 0.03 * 100) / 100;
        const nhNetDiff = resWithholding - nhIdTax;
        residentReturn = {
            result: nhIdTax,
            state: 'NH',
            stateName: 'New Hampshire',
            residentStatus: 'resident',
            formName: 'Form DP-10 (3% Interest & Dividends Tax)',
            hasIncomeTax: true,
            stateWages: totalDivAndIntForStates,
            stateStandardDeduction: nhExemption,
            stateTaxableIncome: nhTaxableID,
            stateTaxBeforeCredit: nhIdTax,
            creditForOtherStates: 0,
            creditedStates: [],
            reciprocityExemption: false,
            stateTaxLiability: nhIdTax,
            localTaxLiability: 0,
            stateWithholding: resWithholding,
            localTaxWithheld: resLocalTax,
            netOutcome: Math.abs(nhNetDiff),
            isRefund: nhNetDiff >= 0,
            sourceFields: resRaw.sourceFieldIds,
            generalFormula: `NH Form DP-10 = max(0, Interest & Dividends − ${formatCurrency(nhExemption)}) × 3.0%`,
            pluggedFormula: `Taxable I&D = ${formatCurrency(totalDivAndIntForStates)} − ${formatCurrency(nhExemption)} = ${formatCurrency(nhTaxableID)} × 3.0% = ${formatCurrencyExact(nhIdTax)}`
        };
    }
    else if (!residentRule.hasIncomeTax) {
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
            localTaxLiability: 0,
            stateWithholding: resWithholding,
            localTaxWithheld: resLocalTax,
            netOutcome: resWithholding,
            isRefund: true,
            sourceFields: resRaw.sourceFieldIds,
            generalFormula: `${residentRule.name} imposes 0% personal income tax on wage compensation`,
            pluggedFormula: `Tax = $0 (No ${residentRule.name} State Return Required)`
        };
    }
    else {
        // State-Specific Income Modifications:
        // 1. CA & NJ do not conform to the federal HSA deduction (add back HSA to state income):
        const hsaAddBack = (residentState === 'CA' || residentState === 'NJ') ? (Number(state.adjustments?.hsa) || 0) : 0;
        // 2. PA (Form PA-40) taxes gross income classes without federal IRA/HSA/Student Loan adjustments or net capital loss offsets:
        const paAddBack = residentState === 'PA'
            ? ((Number(state.adjustments?.ira) || 0) + (Number(state.adjustments?.hsa) || 0) + (Number(state.adjustments?.studentLoan) || 0) + (stGain + ltGain < 0 ? Math.abs(Math.max(-3000, stGain + ltGain)) : 0))
            : 0;
        // 3. State Long-Term Capital Gain Exclusions (SC 44%, NM 40%, ND 40%, WI 30%, AR 50%, VT up to $5,000):
        let stateLtcgExclusion = 0;
        if (netLtcg > 0) {
            if (residentState === 'SC')
                stateLtcgExclusion = Math.round(netLtcg * 0.44 * 100) / 100;
            else if (residentState === 'NM' || residentState === 'ND')
                stateLtcgExclusion = Math.round(netLtcg * 0.40 * 100) / 100;
            else if (residentState === 'WI')
                stateLtcgExclusion = Math.round(netLtcg * 0.30 * 100) / 100;
            else if (residentState === 'AR')
                stateLtcgExclusion = Math.round(netLtcg * 0.50 * 100) / 100;
            else if (residentState === 'VT')
                stateLtcgExclusion = Math.min(5000, Math.round(netLtcg * 0.40 * 100) / 100);
        }
        // 4. State Deduction for Federal Income Tax Paid (AL 100%, OR up to $8,250, MO up to $5,000/$10,000):
        let fedTaxSubtraction = 0;
        if (residentState === 'AL')
            fedTaxSubtraction = totalFederalLiability;
        else if (residentState === 'OR')
            fedTaxSubtraction = Math.min(8250, totalFederalLiability);
        else if (residentState === 'MO')
            fedTaxSubtraction = Math.min(effectiveStatus === 'married_joint' ? 10000 : 5000, totalFederalLiability * 0.35);
        // 5. NJ Property Tax Deduction (up to $15,000 of realEstateTax on Form NJ-1040):
        const njPropertyTaxDed = residentState === 'NJ' ? Math.min(15000, Number(state.itemizedDeductions?.realEstateTax) || 0) : 0;
        residentTotalWages = Math.max(0, residentTotalWages + hsaAddBack + paAddBack - stateLtcgExclusion - fedTaxSubtraction - njPropertyTaxDed);
        const baseStdDed = residentRule.standardDeduction[effectiveStatus] || 0;
        // Support State Itemized Deductions (e.g., NY Form IT-196: Medical + Property Tax (up to $10k) + Mortgage Interest + Charity)
        let stateItemizedDed = 0;
        if (itemizedCalc && (residentState === 'NY' || residentState === 'CA' || residentState === 'DC' || residentState === 'MD' || residentState === 'VA')) {
            const propTax = Math.min(10000, Number(state.itemizedDeductions?.realEstateTax) || 0);
            stateItemizedDed = itemizedCalc.allowableMedical + propTax + itemizedCalc.mortgage + itemizedCalc.charity;
        }
        const useStateItemized = state.deductionMethod !== 'standard' && stateItemizedDed > baseStdDed;
        const resStdDed = useStateItemized ? stateItemizedDed : baseStdDed;
        const resTaxable = Math.max(0, residentTotalWages - resStdDed);
        let resTentativeTax = 0;
        if (residentRule.isFlat) {
            resTentativeTax = resTaxable * (residentRule.flatRate || 0);
        }
        else {
            const bList = residentRule.brackets?.[effectiveStatus] || residentRule.brackets?.['single'] || [];
            resTentativeTax = computeStateTaxFromBrackets(resTaxable, bList);
        }
        // Massachusetts 8.5% Short-Term Capital Gains Surcharge (+3.5% above the 5.0% base rate):
        if (residentState === 'MA' && stGain > 0 && resTaxable > 0) {
            resTentativeTax += Math.min(stGain, resTaxable) * 0.035;
        }
        // California 1% Mental Health Services Tax on CA taxable income exceeding $1,000,000:
        if (residentState === 'CA' && resTaxable > 1000000) {
            resTentativeTax += (resTaxable - 1000000) * 0.01;
        }
        // Illinois 5% Property Tax Credit (Schedule ICR):
        if (residentState === 'IL' && (Number(state.itemizedDeductions?.realEstateTax) || 0) > 0) {
            const ilPropCredit = (Number(state.itemizedDeductions?.realEstateTax) || 0) * 0.05;
            resTentativeTax = Math.max(0, resTentativeTax - ilPropCredit);
        }
        resTentativeTax = Math.round(resTentativeTax * 100) / 100;
        // Local / Municipal / County Piggyback Income Tax (NYC, Yonkers, MD County Tax, PA Local/Philly, OH/IN/KY/MI/MO/DE/AL Local):
        let localTaxLiability = 0;
        if (residentState === 'NY' && resRaw.hasNycLocality) {
            const nycBList = NYC_LOCAL_BRACKETS[effectiveStatus] || NYC_LOCAL_BRACKETS.single;
            localTaxLiability = Math.round(computeStateTaxFromBrackets(resTaxable, nycBList) * 100) / 100;
        }
        else if (residentState === 'NY' && resRaw.hasYonkersLocality) {
            localTaxLiability = Math.round(resTentativeTax * 0.1675 * 100) / 100; // Yonkers 16.75% resident surcharge
        }
        else if (residentState === 'MD') {
            // Maryland mandatory County Piggyback Income Tax (uses Box 19 local withholding or standard 3.20% county rate when local wages/withholding present)
            if (resRaw.localWithheld > 0 || resRaw.localWages > 0) {
                localTaxLiability = Math.round(resTaxable * 0.032 * 100) / 100;
            }
        }
        else if (resRaw.localWithheld > 0 && ['PA', 'OH', 'IN', 'KY', 'MI', 'MO', 'DE', 'AL', 'OR'].includes(residentState)) {
            localTaxLiability = resRaw.localWithheld;
        }
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
        const netStateOnlyLiability = Math.max(0, Math.round((resTentativeTax - totalOtherStateCredit) * 100) / 100);
        const finalResLiability = Math.round((netStateOnlyLiability + localTaxLiability) * 100) / 100;
        const totalResWithholding = localTaxLiability > 0 ? (resWithholding + resLocalTax) : resWithholding;
        const resNetDiff = Math.round((totalResWithholding - finalResLiability) * 100) / 100;
        const resIsRefund = resNetDiff >= 0;
        const resNetOutcome = Math.abs(resNetDiff);
        const isNycReturn = residentState === 'NY' && resRaw.hasNycLocality && localTaxLiability > 0;
        const formLabel = isNycReturn
            ? `${residentRule.formResident} (NY State + NYC Local Tax)`
            : residentRule.formResident;
        let pluggedStr = '';
        if (isNycReturn) {
            pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)}${useStateItemized ? ' (Form IT-196 Itemized)' : ''} = ${formatCurrency(resTaxable)} ➔ NY State Tax: ${formatCurrencyExact(resTentativeTax)}${totalOtherStateCredit > 0 ? ` − ${creditedStates.map(c => c.fromState).join('/')} Credit: ${formatCurrencyExact(totalOtherStateCredit)}` : ''} + NYC Local Tax: ${formatCurrencyExact(localTaxLiability)} = ${formatCurrencyExact(finalResLiability)}`;
        }
        else if (localTaxLiability > 0) {
            pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)} = ${formatCurrency(resTaxable)} ➔ State Tax: ${formatCurrencyExact(netStateOnlyLiability)} + Local Tax: ${formatCurrencyExact(localTaxLiability)} = ${formatCurrencyExact(finalResLiability)}`;
        }
        else if (creditedStates.length > 0) {
            pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)} = ${formatCurrency(resTaxable)} ➔ Tentative Tax: ${formatCurrencyExact(resTentativeTax)} − ${creditedStates.map(c => c.fromState).join('/')} Credit: ${formatCurrencyExact(totalOtherStateCredit)} = ${formatCurrencyExact(finalResLiability)}`;
        }
        else {
            pluggedStr = `Taxable: ${formatCurrency(residentTotalWages)} − ${formatCurrency(resStdDed)} = ${formatCurrency(resTaxable)} ➔ State Tax Liability = ${formatCurrencyExact(finalResLiability)}`;
        }
        residentReturn = {
            result: finalResLiability,
            state: residentState,
            stateName: isNycReturn ? 'New York State & NYC' : residentRule.name,
            residentStatus: 'resident',
            formName: formLabel,
            hasIncomeTax: true,
            stateWages: residentTotalWages,
            stateStandardDeduction: resStdDed,
            stateTaxableIncome: resTaxable,
            stateTaxBeforeCredit: resTentativeTax,
            creditForOtherStates: totalOtherStateCredit,
            creditedStates,
            reciprocityExemption: false,
            stateTaxLiability: finalResLiability,
            localTaxLiability,
            stateWithholding: totalResWithholding,
            localTaxWithheld: resLocalTax,
            netOutcome: resNetOutcome,
            isRefund: resIsRefund,
            sourceFields: [
                ...resRaw.sourceFieldIds,
                ...creditedStates.map(c => `calc-state-${c.fromState.toLowerCase()}-liability`)
            ],
            generalFormula: isNycReturn
                ? `${residentRule.formResident}: Total NY/NYC Tax = max(0, NY State Tax − OSTC Credit) + NYC Municipal Resident Tax`
                : `${residentRule.formResident}: Net State Tax = max(0, (State Wages − Standard Deduction) × Rates − Other State Tax Credit)`,
            pluggedFormula: pluggedStr
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
    totalStateNet = Math.round(totalStateNet * 100) / 100;
    const grandTotalNet = Math.round((federalNetDifference + totalStateNet) * 100) / 100;
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
/**
 * Pure, UI-independent clustered calculation block builder.
 * Produces structured calculation blocks, form-line tags, intermediate math lines,
 * and clickable variable contributor breakdowns without touching any DOM element.
 */
export function buildCalculationBlocks(state, summary) {
    const year = state.year || 2024;
    const effectiveStatus = normalizeFilingStatus(state.filingStatus || 'single');
    const rules = TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];
    const w2s = state.w2s || [];
    const sources = state.otherIncome?.sources || [];
    const t = (text) => ({ type: 'text', text });
    const v = (varId, label, value, isEmpty, exact = false) => ({
        type: 'var',
        varId,
        label,
        valueFormatted: exact ? formatCurrencyExact(value) : formatCurrency(value),
        isEmpty
    });
    // Helper to build a variable breakdown
    const makeVar = (varId, label, totalValue, contributors, exact = false) => {
        const hasAnySetup = contributors.some(c => c.isSetUp && c.amount !== 0);
        return {
            varId,
            label,
            totalValue,
            totalFormatted: exact ? formatCurrencyExact(totalValue) : formatCurrency(totalValue),
            isEmpty: !hasAnySetup && totalValue === 0,
            contributors
        };
    };
    // Precompute key values from state
    const totalW2Wages = summary.w2WagesCalc.result;
    const interestDirect = Number(state.otherIncome?.interest) || 0;
    const interest1099 = sources.filter(s => s.type === '1099-INT').reduce((s, x) => s + Math.max(0, (Number(x.amount) || 0) - Math.max(0, Number(x.accruedInterestPaid) || 0)), 0);
    const totalInterest = interestDirect + interest1099;
    const totalDiv = sources.filter(s => s.type === '1099-DIV').reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const totalNecGross = sources.filter(s => s.type === '1099-NEC').reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const schedCExp = Math.max(0, Number(state.otherIncome?.scheduleCExpenses) || 0);
    const netNec = Math.max(0, totalNecGross - schedCExp);
    const totalOther1099 = sources
        .filter(s => !['1099-INT', '1099-DIV', '1099-NEC', 'SSA-1099', 'Schedule K-1'].includes(s.type))
        .reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const k1Total = sources.filter(s => s.type === 'Schedule K-1').reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const ssaGross = sources.filter(s => s.type === 'SSA-1099').reduce((s, x) => s + (Number(x.amount) || 0), 0);
    const stGain = Number(state.otherIncome?.capitalGains?.shortTerm) || 0;
    const ltGain = Number(state.otherIncome?.capitalGains?.longTerm) || 0;
    const collectiblesGain = Math.max(0, Number(state.otherIncome?.capitalGains?.collectiblesGain) || 0);
    const sec1250Gain = Math.max(0, Number(state.otherIncome?.capitalGains?.unrecaptured1250Gain) || 0);
    const capLossLimit = effectiveStatus === 'married_separate' ? -1500 : -3000;
    const grossRents = Math.max(0, Number(state.otherIncome?.scheduleERental?.grossRents) || 0);
    const rentalExp = Math.max(0, Number(state.otherIncome?.scheduleERental?.expenses) || 0);
    const rentalDepr = Math.max(0, Number(state.otherIncome?.scheduleERental?.depreciation) || 0);
    const adjStudentLoan = Math.max(0, Number(state.adjustments?.studentLoan) || 0);
    const adjIra = Math.max(0, Number(state.adjustments?.ira) || 0);
    const adjHsa = Math.max(0, Number(state.adjustments?.hsa) || 0);
    const adjEducator = Math.max(0, Number(state.adjustments?.educatorExpenses) || 0);
    const adjSeRet = Math.max(0, Number(state.adjustments?.seRetirement) || 0);
    const adjSeHealth = Math.max(0, Number(state.adjustments?.seHealthInsurance) || 0);
    const adjAlimony = Math.max(0, Number(state.adjustments?.alimonyPaid) || 0);
    const halfSeTax = summary.otherTaxesCalc.halfSelfEmploymentTaxDeduction;
    const medRaw = Math.max(0, Number(state.itemizedDeductions?.medicalExpenses) || 0);
    const realEstateRaw = Math.max(0, Number(state.itemizedDeductions?.realEstateTax) || 0);
    const mortgageRaw = Math.max(0, Number(state.itemizedDeductions?.mortgageInterest) || 0);
    const charityRaw = Math.max(0, Number(state.itemizedDeductions?.charity) || 0);
    const gamblingLossesRaw = Math.max(0, Number(state.itemizedDeductions?.gamblingLosses) || 0);
    const agi = summary.agiCalc.result;
    const medFloor = Math.round(agi * 0.075 * 100) / 100;
    const stateLocalTaxesForSalt = summary.stateTaxCalc.totalStateWithheld + summary.stateTaxCalc.totalLocalWithheld;
    const rawSalt = stateLocalTaxesForSalt + realEstateRaw;
    const hasAnyW2Activity = w2s.some(w => (Number(w.box1) || 0) !== 0 || (Number(w.box2) || 0) !== 0 || (Number(w.box4) || 0) !== 0 || (Number(w.box6) || 0) !== 0);
    const hasAnyCapGains = stGain !== 0 || ltGain !== 0 || collectiblesGain !== 0 || sec1250Gain !== 0;
    const hasAnySchedE = grossRents !== 0 || rentalExp !== 0 || rentalDepr !== 0 || k1Total !== 0;
    const hasAnyOtherIncome = totalInterest !== 0 || totalDiv !== 0 || totalNecGross !== 0 || schedCExp !== 0 || totalOther1099 !== 0 || ssaGross !== 0 || hasAnyCapGains || hasAnySchedE;
    const hasAnyAdjustments = summary.adjustmentsCalc.result !== 0;
    const hasAnyItemized = medRaw !== 0 || realEstateRaw !== 0 || mortgageRaw !== 0 || charityRaw !== 0 || gamblingLossesRaw !== 0 || state.deductionMethod === 'itemized';
    const hasAnyCreditsInput = (Number(state.dependents?.childrenCount) || 0) > 0 ||
        (Number(state.dependents?.otherDependentsCount) || 0) > 0 ||
        (Number(state.dependents?.childCareExpenses) || 0) > 0 ||
        (Number(state.dependents?.educationExpensesAotc) || 0) > 0 ||
        (Number(state.dependents?.educationExpensesLlc) || 0) > 0 ||
        (Number(state.dependents?.foreignTaxCredit) || 0) > 0 ||
        (Number(state.dependents?.cleanEnergyCredit) || 0) > 0 ||
        summary.creditsCalc.totalNonRefundableCredits > 0 ||
        summary.creditsCalc.totalRefundableCredits > 0;
    const hasAnyOtherTaxes = summary.otherTaxesCalc.totalOtherTaxes > 0 || summary.ficaCalc.excessSSTaxCredit > 0;
    const hasAnyOverallImpact = hasAnyW2Activity || hasAnyOtherIncome || hasAnyAdjustments || hasAnyCreditsInput || (Number(state.dependents?.estimatedTaxPayments) || 0) > 0;
    const blocks = [];
    // BLOCK 1: W-2 Wage & Payroll Summary (Clustered: Box 1 Wages + FICA Payroll)
    {
        const w2WageContribs = w2s.map((w, idx) => ({
            label: `W-2 #${idx + 1} (${w.employer || 'Employer'}) Box 1`,
            sign: '+',
            amount: Number(w.box1) || 0,
            amountFormatted: formatCurrencyExact(Number(w.box1) || 0),
            isSetUp: (Number(w.box1) || 0) !== 0,
            targetElementId: `w2-${w.id}-box1`
        }));
        const w2FedWhContribs = w2s.map((w, idx) => ({
            label: `W-2 #${idx + 1} (${w.employer || 'Employer'}) Box 2`,
            sign: '+',
            amount: Number(w.box2) || 0,
            amountFormatted: formatCurrencyExact(Number(w.box2) || 0),
            isSetUp: (Number(w.box2) || 0) !== 0,
            targetElementId: `w2-${w.id}-box2`
        }));
        const totalW2FedWh = w2s.reduce((s, w) => s + (Number(w.box2) || 0), 0);
        const vars = {
            w2_wages: makeVar('w2_wages', 'W-2 Box 1 Wages', totalW2Wages, w2WageContribs),
            w2_withholding: makeVar('w2_withholding', 'W-2 Box 2 Federal Withholding', totalW2FedWh, w2FedWhContribs, true),
            ss_tax: makeVar('ss_tax', 'Social Security Tax (Box 4)', summary.ficaCalc.ssTax, w2s.map((w, idx) => ({
                label: `W-2 #${idx + 1} Box 4`,
                sign: '+',
                amount: Number(w.box4) || 0,
                amountFormatted: formatCurrencyExact(Number(w.box4) || 0),
                isSetUp: (Number(w.box4) || 0) !== 0,
                targetElementId: `w2-${w.id}-box4`
            })), true),
            med_tax: makeVar('med_tax', 'Medicare Tax (Box 6)', summary.ficaCalc.medTax, w2s.map((w, idx) => ({
                label: `W-2 #${idx + 1} Box 6`,
                sign: '+',
                amount: Number(w.box6) || 0,
                amountFormatted: formatCurrencyExact(Number(w.box6) || 0),
                isSetUp: (Number(w.box6) || 0) !== 0,
                targetElementId: `w2-${w.id}-box6`
            })), true)
        };
        const lines = [
            {
                id: 'line-w2-wages',
                label: 'Total W-2 Wages',
                formLineLabel: 'Form 1040 Line 1a',
                generalTokens: [t('Total W-2 Wages = '), v('w2_wages', '∑ W-2 Box 1', totalW2Wages, vars.w2_wages.isEmpty)],
                pluggedTokens: [t('Total W-2 Wages = '), v('w2_wages', formatCurrency(totalW2Wages), totalW2Wages, vars.w2_wages.isEmpty)],
                resultFormatted: formatCurrency(totalW2Wages)
            },
            {
                id: 'line-w2-withholding',
                label: 'W-2 Federal Tax Withheld',
                formLineLabel: 'Form 1040 Line 25a',
                generalTokens: [t('W-2 Withholding = '), v('w2_withholding', '∑ W-2 Box 2', totalW2FedWh, vars.w2_withholding.isEmpty, true)],
                pluggedTokens: [t('W-2 Withholding = '), v('w2_withholding', formatCurrencyExact(totalW2FedWh), totalW2FedWh, vars.w2_withholding.isEmpty, true)],
                resultFormatted: formatCurrencyExact(totalW2FedWh)
            },
            {
                id: 'line-fica-total',
                label: 'FICA Payroll Taxes (SS + Medicare)',
                formLineLabel: null,
                isIntermediate: true,
                generalTokens: [
                    t('Total FICA = '),
                    v('ss_tax', 'SS Tax (6.2%)', summary.ficaCalc.ssTax, vars.ss_tax.isEmpty, true),
                    t(' + '),
                    v('med_tax', 'Medicare Tax (1.45%)', summary.ficaCalc.medTax, vars.med_tax.isEmpty, true)
                ],
                pluggedTokens: [
                    t('Total FICA = '),
                    v('ss_tax', formatCurrencyExact(summary.ficaCalc.ssTax), summary.ficaCalc.ssTax, vars.ss_tax.isEmpty, true),
                    t(' + '),
                    v('med_tax', formatCurrencyExact(summary.ficaCalc.medTax), summary.ficaCalc.medTax, vars.med_tax.isEmpty, true),
                    t(` = ${formatCurrencyExact(summary.ficaCalc.totalFica)}`)
                ],
                resultFormatted: formatCurrencyExact(summary.ficaCalc.totalFica)
            }
        ];
        blocks.push({
            id: 'calc-total-w2-wages',
            stepLabel: 'Step 1 • Wage & Payroll Aggregation',
            title: 'W-2 Wages, Withholding & FICA',
            hasImpact: hasAnyW2Activity,
            lines,
            variables: vars,
            sourceIds: w2s.flatMap(w => [`w2-${w.id}-box1`, `w2-${w.id}-box2`, `w2-${w.id}-box4`, `w2-${w.id}-box6`])
        });
    }
    // BLOCK 2: Capital Gains & Losses (Schedule D)
    {
        const vars = {
            st_gain: makeVar('st_gain', 'Short-Term Capital Gains/Losses', stGain, [{
                    label: 'Short-Term Net (Schedule D Part I)',
                    sign: stGain < 0 ? '-' : '+',
                    amount: Math.abs(stGain),
                    amountFormatted: formatCurrency(stGain),
                    isSetUp: stGain !== 0,
                    targetElementId: 'input-capital-gains-st',
                    panelKey: 'capital-gains',
                    panelSection: 'other-income'
                }]),
            lt_gain: makeVar('lt_gain', 'Long-Term Capital Gains/Losses', ltGain, [{
                    label: 'Long-Term Net (Schedule D Part II)',
                    sign: ltGain < 0 ? '-' : '+',
                    amount: Math.abs(ltGain),
                    amountFormatted: formatCurrency(ltGain),
                    isSetUp: ltGain !== 0,
                    targetElementId: 'input-capital-gains-lt',
                    panelKey: 'capital-gains',
                    panelSection: 'other-income'
                }])
        };
        const rawNet = stGain + ltGain;
        const lines = [
            {
                id: 'line-cap-raw',
                label: 'Combined Capital Gain / (Loss)',
                formLineLabel: null,
                isIntermediate: true,
                generalTokens: [
                    t('Combined Net = '),
                    v('st_gain', 'Short-Term', stGain, vars.st_gain.isEmpty),
                    t(' + '),
                    v('lt_gain', 'Long-Term', ltGain, vars.lt_gain.isEmpty)
                ],
                pluggedTokens: [
                    t('Combined Net = '),
                    v('st_gain', formatCurrency(stGain), stGain, vars.st_gain.isEmpty),
                    t(' + '),
                    v('lt_gain', formatCurrency(ltGain), ltGain, vars.lt_gain.isEmpty),
                    t(` = ${formatCurrency(rawNet)}`)
                ],
                resultFormatted: formatCurrency(rawNet)
            },
            {
                id: 'line-cap-allowable',
                label: 'Allowable Capital Gain / (Loss)',
                formLineLabel: 'Form 1040 Line 7',
                generalTokens: [
                    t(`Allowable = max(${formatCurrency(capLossLimit)}, `),
                    v('st_gain', 'Short-Term', stGain, vars.st_gain.isEmpty),
                    t(' + '),
                    v('lt_gain', 'Long-Term', ltGain, vars.lt_gain.isEmpty),
                    t(')')
                ],
                pluggedTokens: [
                    t(`Allowable = max(${formatCurrency(capLossLimit)}, ${formatCurrency(rawNet)}) = ${formatCurrency(summary.capitalGainsCalc.result)}`)
                ],
                resultFormatted: formatCurrency(summary.capitalGainsCalc.result)
            }
        ];
        blocks.push({
            id: 'calc-capital-gains',
            stepLabel: 'Step 2a • Schedule D / Form 8949',
            title: 'Capital Gains & Loss Limitation',
            hasImpact: hasAnyCapGains,
            lines,
            variables: vars,
            sourceIds: ['input-capital-gains-st', 'input-capital-gains-lt']
        });
    }
    // BLOCK 3: Schedule E Rental & K-1
    {
        const vars = {
            sched_e_rents: makeVar('sched_e_rents', 'Gross Rental Income', grossRents, [{
                    label: 'Schedule E Gross Rents',
                    sign: '+',
                    amount: grossRents,
                    amountFormatted: formatCurrency(grossRents),
                    isSetUp: grossRents !== 0,
                    targetElementId: 'input-sched-e-rents',
                    panelKey: 'schedule-e-rental',
                    panelSection: 'other-income'
                }]),
            sched_e_exp: makeVar('sched_e_exp', 'Rental Operating Expenses', rentalExp, [{
                    label: 'Schedule E Operating Expenses',
                    sign: '-',
                    amount: rentalExp,
                    amountFormatted: formatCurrency(rentalExp),
                    isSetUp: rentalExp !== 0,
                    targetElementId: 'input-sched-e-expenses',
                    panelKey: 'schedule-e-rental',
                    panelSection: 'other-income'
                }]),
            sched_e_depr: makeVar('sched_e_depr', 'MACRS Depreciation', rentalDepr, [{
                    label: 'Form 4562 Depreciation',
                    sign: '-',
                    amount: rentalDepr,
                    amountFormatted: formatCurrency(rentalDepr),
                    isSetUp: rentalDepr !== 0,
                    targetElementId: 'input-sched-e-depreciation',
                    panelKey: 'schedule-e-rental',
                    panelSection: 'other-income'
                }])
        };
        const lines = [
            {
                id: 'line-sched-e-net',
                label: 'Net Rental Income Before PAL',
                formLineLabel: null,
                isIntermediate: true,
                generalTokens: [
                    t('Net Rental = '),
                    v('sched_e_rents', 'Gross Rents', grossRents, vars.sched_e_rents.isEmpty),
                    t(' − '),
                    v('sched_e_exp', 'Expenses', rentalExp, vars.sched_e_exp.isEmpty),
                    t(' − '),
                    v('sched_e_depr', 'Depreciation', rentalDepr, vars.sched_e_depr.isEmpty)
                ],
                pluggedTokens: [
                    t('Net Rental = '),
                    v('sched_e_rents', formatCurrency(grossRents), grossRents, vars.sched_e_rents.isEmpty),
                    t(' − '),
                    v('sched_e_exp', formatCurrency(rentalExp), rentalExp, vars.sched_e_exp.isEmpty),
                    t(' − '),
                    v('sched_e_depr', formatCurrency(rentalDepr), rentalDepr, vars.sched_e_depr.isEmpty),
                    t(` = ${formatCurrency(summary.scheduleECalc.netBeforePal)}`)
                ],
                resultFormatted: formatCurrency(summary.scheduleECalc.netBeforePal)
            },
            {
                id: 'line-sched-e-allowable',
                label: 'Allowable Schedule E Income / (Loss)',
                formLineLabel: 'Schedule 1 Line 5',
                generalTokens: [t('Allowable Schedule E (after Form 8582 $25k PAL phaseout) + K-1 Income')],
                pluggedTokens: [t(`Allowable Schedule E = ${formatCurrency(summary.scheduleECalc.allowableNet)}`)],
                resultFormatted: formatCurrency(summary.scheduleECalc.allowableNet)
            }
        ];
        blocks.push({
            id: 'calc-schedule-e',
            stepLabel: 'Step 2b • Schedule E / Form 4562',
            title: 'Rental Real Estate & K-1 Income',
            hasImpact: hasAnySchedE,
            lines,
            variables: vars,
            sourceIds: ['input-sched-e-rents', 'input-sched-e-expenses', 'input-sched-e-depreciation']
        });
    }
    // BLOCK 4: Gross Income, Adjustments & AGI (Clustered Core Pipeline)
    {
        const interestContribs = [
            {
                label: '1099-INT Taxable Interest',
                sign: '+',
                amount: interestDirect,
                amountFormatted: formatCurrency(interestDirect),
                isSetUp: interestDirect !== 0,
                targetElementId: 'input-other-interest',
                panelKey: '1099-int',
                panelSection: 'other-income'
            },
            ...sources.filter(s => s.type === '1099-INT').map(s => ({
                label: `1099-INT (${s.payer || 'Bank'})`,
                sign: '+',
                amount: Math.max(0, (Number(s.amount) || 0) - Math.max(0, Number(s.accruedInterestPaid) || 0)),
                amountFormatted: formatCurrency(Math.max(0, (Number(s.amount) || 0) - Math.max(0, Number(s.accruedInterestPaid) || 0))),
                isSetUp: (Number(s.amount) || 0) !== 0,
                targetElementId: `input-source-${s.id}-amount`,
                panelKey: '1099-int',
                panelSection: 'other-income'
            }))
        ];
        const other1099Contribs = [
            {
                label: '1099-DIV Dividends',
                sign: '+',
                amount: totalDiv,
                amountFormatted: formatCurrency(totalDiv),
                isSetUp: totalDiv !== 0,
                targetElementId: 'section-federal-other-income',
                panelKey: '1099-div',
                panelSection: 'other-income'
            },
            {
                label: '1099-NEC Self-Employment',
                sign: '+',
                amount: totalNecGross,
                amountFormatted: formatCurrency(totalNecGross),
                isSetUp: totalNecGross !== 0,
                targetElementId: 'section-federal-other-income',
                panelKey: '1099-nec',
                panelSection: 'other-income'
            },
            {
                label: 'Schedule C Business Expenses',
                sign: '-',
                amount: schedCExp,
                amountFormatted: formatCurrency(schedCExp),
                isSetUp: schedCExp !== 0,
                targetElementId: 'input-sched-c-expenses',
                panelKey: 'schedule-c-expenses',
                panelSection: 'other-income'
            },
            {
                label: 'Other 1099s (1099-R, 1099-G, W-2G, Misc)',
                sign: '+',
                amount: totalOther1099,
                amountFormatted: formatCurrency(totalOther1099),
                isSetUp: totalOther1099 !== 0,
                targetElementId: 'section-federal-other-income',
                panelKey: '1099-r',
                panelSection: 'other-income'
            }
        ];
        const otherIncomeCombined = totalDiv + netNec + totalOther1099;
        const adjContribs = [
            { label: 'Student Loan Interest', sign: '+', amount: adjStudentLoan, amountFormatted: formatCurrency(adjStudentLoan), isSetUp: adjStudentLoan !== 0, targetElementId: 'input-adj-student-loan', panelKey: 'adj-student-loan', panelSection: 'adjustments' },
            { label: 'Traditional IRA', sign: '+', amount: adjIra, amountFormatted: formatCurrency(adjIra), isSetUp: adjIra !== 0, targetElementId: 'input-adj-ira', panelKey: 'adj-ira', panelSection: 'adjustments' },
            { label: 'HSA Contributions', sign: '+', amount: adjHsa, amountFormatted: formatCurrency(adjHsa), isSetUp: adjHsa !== 0, targetElementId: 'input-adj-hsa', panelKey: 'adj-hsa', panelSection: 'adjustments' },
            { label: 'Educator Expenses', sign: '+', amount: adjEducator, amountFormatted: formatCurrency(adjEducator), isSetUp: adjEducator !== 0, targetElementId: 'input-adj-educator', panelKey: 'adj-educator', panelSection: 'adjustments' },
            { label: 'SEP / Solo 401(k)', sign: '+', amount: adjSeRet, amountFormatted: formatCurrency(adjSeRet), isSetUp: adjSeRet !== 0, targetElementId: 'input-adj-se-retirement', panelKey: 'adj-se-retirement', panelSection: 'adjustments' },
            { label: 'SE Health Insurance', sign: '+', amount: adjSeHealth, amountFormatted: formatCurrency(adjSeHealth), isSetUp: adjSeHealth !== 0, targetElementId: 'input-adj-se-health', panelKey: 'adj-se-health', panelSection: 'adjustments' },
            { label: 'Alimony Paid', sign: '+', amount: adjAlimony, amountFormatted: formatCurrency(adjAlimony), isSetUp: adjAlimony !== 0, targetElementId: 'input-adj-alimony', panelKey: 'adj-alimony', panelSection: 'adjustments' },
            { label: '½ Self-Employment Tax (Auto)', sign: '+', amount: halfSeTax, amountFormatted: formatCurrencyExact(halfSeTax), isSetUp: halfSeTax !== 0, targetElementId: 'section-federal-other-income', panelKey: '1099-nec', panelSection: 'other-income' }
        ];
        const vars = {
            w2_wages: makeVar('w2_wages', 'W-2 Wages', totalW2Wages, w2s.map((w, idx) => ({
                label: `W-2 #${idx + 1} Box 1`,
                sign: '+',
                amount: Number(w.box1) || 0,
                amountFormatted: formatCurrency(Number(w.box1) || 0),
                isSetUp: (Number(w.box1) || 0) !== 0,
                targetElementId: `w2-${w.id}-box1`
            }))),
            interest_inc: makeVar('interest_inc', 'Taxable Interest', totalInterest, interestContribs),
            other_1099: makeVar('other_1099', '1099 & Business Income', otherIncomeCombined, other1099Contribs),
            cap_gains: makeVar('cap_gains', 'Net Capital Gains', summary.capitalGainsCalc.result, [
                { label: 'Short-Term Cap Gains', sign: stGain < 0 ? '-' : '+', amount: Math.abs(stGain), amountFormatted: formatCurrency(stGain), isSetUp: stGain !== 0, targetElementId: 'input-capital-gains-st', panelKey: 'capital-gains', panelSection: 'other-income' },
                { label: 'Long-Term Cap Gains', sign: ltGain < 0 ? '-' : '+', amount: Math.abs(ltGain), amountFormatted: formatCurrency(ltGain), isSetUp: ltGain !== 0, targetElementId: 'input-capital-gains-lt', panelKey: 'capital-gains', panelSection: 'other-income' }
            ]),
            sched_e: makeVar('sched_e', 'Schedule E / K-1', summary.scheduleECalc.allowableNet, [
                { label: 'Gross Rents', sign: '+', amount: grossRents, amountFormatted: formatCurrency(grossRents), isSetUp: grossRents !== 0, targetElementId: 'input-sched-e-rents', panelKey: 'schedule-e-rental', panelSection: 'other-income' },
                { label: 'Rental Expenses & Depr', sign: '-', amount: rentalExp + rentalDepr, amountFormatted: formatCurrency(rentalExp + rentalDepr), isSetUp: (rentalExp + rentalDepr) !== 0, targetElementId: 'input-sched-e-expenses', panelKey: 'schedule-e-rental', panelSection: 'other-income' },
                { label: 'Schedule K-1 Income', sign: '+', amount: k1Total, amountFormatted: formatCurrency(k1Total), isSetUp: k1Total !== 0, targetElementId: 'section-federal-other-income', panelKey: 'schedule-k1', panelSection: 'other-income' }
            ]),
            adjustments_total: makeVar('adjustments_total', 'Adjustments to Income', summary.adjustmentsCalc.result, adjContribs, true),
            gross_income: makeVar('gross_income', 'Total Gross Income', summary.grossIncomeCalc.result, [
                { label: 'W-2 Wages', sign: '+', amount: totalW2Wages, amountFormatted: formatCurrency(totalW2Wages), isSetUp: totalW2Wages !== 0, targetElementId: 'w2-0-box1' },
                { label: 'Taxable Interest', sign: '+', amount: totalInterest, amountFormatted: formatCurrency(totalInterest), isSetUp: totalInterest !== 0, targetElementId: 'input-other-interest', panelKey: '1099-int', panelSection: 'other-income' },
                { label: '1099 / Business Net', sign: '+', amount: otherIncomeCombined, amountFormatted: formatCurrency(otherIncomeCombined), isSetUp: otherIncomeCombined !== 0, targetElementId: 'section-federal-other-income' },
                { label: 'Capital Gains / Losses', sign: summary.capitalGainsCalc.result < 0 ? '-' : '+', amount: Math.abs(summary.capitalGainsCalc.result), amountFormatted: formatCurrency(summary.capitalGainsCalc.result), isSetUp: summary.capitalGainsCalc.result !== 0, targetElementId: 'input-capital-gains-st', panelKey: 'capital-gains', panelSection: 'other-income' },
                { label: 'Schedule E / K-1', sign: summary.scheduleECalc.allowableNet < 0 ? '-' : '+', amount: Math.abs(summary.scheduleECalc.allowableNet), amountFormatted: formatCurrency(summary.scheduleECalc.allowableNet), isSetUp: summary.scheduleECalc.allowableNet !== 0, targetElementId: 'input-sched-e-rents', panelKey: 'schedule-e-rental', panelSection: 'other-income' }
            ])
        };
        const lines = [
            {
                id: 'line-gross-income',
                label: 'Total Gross Income',
                formLineLabel: 'Form 1040 Line 9',
                generalTokens: [
                    t('Gross Income = '),
                    v('w2_wages', 'W-2 Wages', totalW2Wages, vars.w2_wages.isEmpty),
                    t(' + '),
                    v('interest_inc', 'Interest', totalInterest, vars.interest_inc.isEmpty),
                    t(' + '),
                    v('other_1099', '1099/Business', otherIncomeCombined, vars.other_1099.isEmpty),
                    t(' + '),
                    v('cap_gains', 'Cap Gains', summary.capitalGainsCalc.result, vars.cap_gains.isEmpty),
                    t(' + '),
                    v('sched_e', 'Sched E', summary.scheduleECalc.allowableNet, vars.sched_e.isEmpty)
                ],
                pluggedTokens: [
                    t('Gross Income = '),
                    v('w2_wages', formatCurrency(totalW2Wages), totalW2Wages, vars.w2_wages.isEmpty),
                    t(' + '),
                    v('interest_inc', formatCurrency(totalInterest), totalInterest, vars.interest_inc.isEmpty),
                    t(' + '),
                    v('other_1099', formatCurrency(otherIncomeCombined), otherIncomeCombined, vars.other_1099.isEmpty),
                    t(' + '),
                    v('cap_gains', formatCurrency(summary.capitalGainsCalc.result), summary.capitalGainsCalc.result, vars.cap_gains.isEmpty),
                    t(' + '),
                    v('sched_e', formatCurrency(summary.scheduleECalc.allowableNet), summary.scheduleECalc.allowableNet, vars.sched_e.isEmpty),
                    t(` = ${formatCurrencyExact(summary.grossIncomeCalc.result)}`)
                ],
                resultFormatted: formatCurrencyExact(summary.grossIncomeCalc.result)
            },
            {
                id: 'line-adjustments',
                label: 'Total Adjustments (Above-the-Line)',
                formLineLabel: 'Form 1040 Line 10',
                generalTokens: [t('Adjustments = '), v('adjustments_total', '∑ Schedule 1 Adjustments', summary.adjustmentsCalc.result, vars.adjustments_total.isEmpty, true)],
                pluggedTokens: [t('Adjustments = '), v('adjustments_total', formatCurrencyExact(summary.adjustmentsCalc.result), summary.adjustmentsCalc.result, vars.adjustments_total.isEmpty, true)],
                resultFormatted: formatCurrencyExact(summary.adjustmentsCalc.result)
            },
            {
                id: 'line-agi',
                label: 'Adjusted Gross Income (AGI)',
                formLineLabel: 'Form 1040 Line 11',
                generalTokens: [
                    t('AGI = '),
                    v('gross_income', 'Gross Income', summary.grossIncomeCalc.result, vars.gross_income.isEmpty),
                    t(' − '),
                    v('adjustments_total', 'Adjustments', summary.adjustmentsCalc.result, vars.adjustments_total.isEmpty, true)
                ],
                pluggedTokens: [
                    t('AGI = '),
                    v('gross_income', formatCurrencyExact(summary.grossIncomeCalc.result), summary.grossIncomeCalc.result, vars.gross_income.isEmpty),
                    t(' − '),
                    v('adjustments_total', formatCurrencyExact(summary.adjustmentsCalc.result), summary.adjustmentsCalc.result, vars.adjustments_total.isEmpty, true),
                    t(` = ${formatCurrencyExact(agi)}`)
                ],
                resultFormatted: formatCurrencyExact(agi)
            }
        ];
        blocks.push({
            id: 'calc-agi',
            stepLabel: 'Step 3 • Gross Income, Adjustments & AGI',
            title: 'Gross Income & Adjusted Gross Income (AGI)',
            hasImpact: hasAnyOverallImpact,
            isOutput: true,
            lines,
            variables: vars,
            sourceIds: ['calc-total-w2-wages', 'calc-capital-gains', 'calc-schedule-e', 'input-other-interest', 'input-adj-student-loan', 'input-adj-ira', 'input-adj-hsa']
        });
    }
    // BLOCK 5: Schedule A Itemized Deductions (with full Medical 7.5% AGI floor math & SALT $10k cap math)
    {
        const vars = {
            agi_val: makeVar('agi_val', 'Adjusted Gross Income (AGI)', agi, [
                { label: 'Form 1040 Line 11 AGI', sign: 'info', amount: agi, amountFormatted: formatCurrencyExact(agi), isSetUp: agi !== 0, targetElementId: 'calc-agi' }
            ], true),
            med_expenses: makeVar('med_expenses', 'Medical & Dental Expenses', medRaw, [{
                    label: 'Medical & Dental Expenses Paid',
                    sign: '+',
                    amount: medRaw,
                    amountFormatted: formatCurrency(medRaw),
                    isSetUp: medRaw !== 0,
                    targetElementId: 'input-itemized-medical',
                    panelKey: 'itemized-medical',
                    panelSection: 'itemized'
                }]),
            state_local_tax: makeVar('state_local_tax', 'State & Local Income Taxes', stateLocalTaxesForSalt, w2s.flatMap(w => (w.states || []).map(st => ({
                label: `W-2 ${st.state} Box 17 + Box 19`,
                sign: '+',
                amount: (Number(st.stateTaxWithheld) || 0) + (Number(st.localTaxWithheld) || 0),
                amountFormatted: formatCurrency((Number(st.stateTaxWithheld) || 0) + (Number(st.localTaxWithheld) || 0)),
                isSetUp: ((Number(st.stateTaxWithheld) || 0) + (Number(st.localTaxWithheld) || 0)) !== 0,
                targetElementId: `w2-${w.id}-state-${st.id}-box17`
            })))),
            real_estate_tax: makeVar('real_estate_tax', 'Real Estate / Property Taxes', realEstateRaw, [{
                    label: 'Real Estate Taxes Paid',
                    sign: '+',
                    amount: realEstateRaw,
                    amountFormatted: formatCurrency(realEstateRaw),
                    isSetUp: realEstateRaw !== 0,
                    targetElementId: 'input-itemized-real-estate',
                    panelKey: 'itemized-real-estate',
                    panelSection: 'itemized'
                }]),
            mortgage_int: makeVar('mortgage_int', 'Mortgage Interest', mortgageRaw, [{
                    label: 'Form 1098 Mortgage Interest',
                    sign: '+',
                    amount: mortgageRaw,
                    amountFormatted: formatCurrency(mortgageRaw),
                    isSetUp: mortgageRaw !== 0,
                    targetElementId: 'input-itemized-mortgage',
                    panelKey: 'itemized-mortgage',
                    panelSection: 'itemized'
                }]),
            charity_contrib: makeVar('charity_contrib', 'Charitable Contributions', charityRaw, [{
                    label: 'Charitable Donations',
                    sign: '+',
                    amount: charityRaw,
                    amountFormatted: formatCurrency(charityRaw),
                    isSetUp: charityRaw !== 0,
                    targetElementId: 'input-itemized-charity',
                    panelKey: 'itemized-charity',
                    panelSection: 'itemized'
                }])
        };
        const lines = [
            {
                id: 'line-med-floor',
                label: 'Medical 7.5% AGI Floor',
                formLineLabel: 'Schedule A Line 3',
                isIntermediate: true,
                generalTokens: [t('Medical Floor = '), v('agi_val', 'AGI', agi, vars.agi_val.isEmpty, true), t(' × 0.075')],
                pluggedTokens: [t('Medical Floor = '), v('agi_val', formatCurrencyExact(agi), agi, vars.agi_val.isEmpty, true), t(` × 0.075 = ${formatCurrencyExact(medFloor)}`)],
                resultFormatted: formatCurrencyExact(medFloor)
            },
            {
                id: 'line-med-deductible',
                label: 'Deductible Medical Expenses',
                formLineLabel: 'Schedule A Line 4',
                generalTokens: [t('Deductible Medical = max(0, '), v('med_expenses', 'Medical Expenses', medRaw, vars.med_expenses.isEmpty), t(' − '), t('Medical Floor)')],
                pluggedTokens: [t('Deductible Medical = max(0, '), v('med_expenses', formatCurrency(medRaw), medRaw, vars.med_expenses.isEmpty), t(` − ${formatCurrencyExact(medFloor)}) = ${formatCurrencyExact(summary.itemizedCalc.allowableMedical)}`)],
                resultFormatted: formatCurrencyExact(summary.itemizedCalc.allowableMedical)
            },
            {
                id: 'line-salt-cap',
                label: 'SALT Deduction (Capped at $10,000)',
                formLineLabel: 'Schedule A Line 5e',
                generalTokens: [t('SALT = min($10,000, '), v('state_local_tax', 'State/Local Tax', stateLocalTaxesForSalt, vars.state_local_tax.isEmpty), t(' + '), v('real_estate_tax', 'Property Tax', realEstateRaw, vars.real_estate_tax.isEmpty), t(')')],
                pluggedTokens: [t('SALT = min($10,000, '), v('state_local_tax', formatCurrency(stateLocalTaxesForSalt), stateLocalTaxesForSalt, vars.state_local_tax.isEmpty), t(' + '), v('real_estate_tax', formatCurrency(realEstateRaw), realEstateRaw, vars.real_estate_tax.isEmpty), t(` = ${formatCurrency(rawSalt)}) = ${formatCurrency(summary.itemizedCalc.allowableSalt)}`)],
                resultFormatted: formatCurrency(summary.itemizedCalc.allowableSalt)
            },
            {
                id: 'line-sched-a-total',
                label: 'Total Itemized Deductions',
                formLineLabel: 'Schedule A Line 17',
                generalTokens: [
                    t('Total Itemized = Deductible Medical + SALT + '),
                    v('mortgage_int', 'Mortgage Interest', mortgageRaw, vars.mortgage_int.isEmpty),
                    t(' + '),
                    v('charity_contrib', 'Charity', charityRaw, vars.charity_contrib.isEmpty)
                ],
                pluggedTokens: [
                    t(`Total Itemized = ${formatCurrencyExact(summary.itemizedCalc.allowableMedical)} + ${formatCurrency(summary.itemizedCalc.allowableSalt)} + `),
                    v('mortgage_int', formatCurrency(mortgageRaw), mortgageRaw, vars.mortgage_int.isEmpty),
                    t(' + '),
                    v('charity_contrib', formatCurrency(charityRaw), charityRaw, vars.charity_contrib.isEmpty),
                    t(` = ${formatCurrencyExact(summary.itemizedCalc.totalItemized)}`)
                ],
                resultFormatted: formatCurrencyExact(summary.itemizedCalc.totalItemized)
            }
        ];
        blocks.push({
            id: 'calc-itemized-deductions',
            stepLabel: 'Step 4a • Schedule A Itemized Deductions',
            title: 'Itemized Deductions (Medical 7.5% Floor & SALT Cap)',
            hasImpact: hasAnyItemized,
            lines,
            variables: vars,
            sourceIds: ['calc-agi', 'input-itemized-medical', 'input-itemized-real-estate', 'input-itemized-mortgage', 'input-itemized-charity']
        });
    }
    // BLOCK 6: Standard vs Itemized Deduction & Taxable Income (Clustered)
    {
        const vars = {
            agi_val: makeVar('agi_val', 'Adjusted Gross Income (AGI)', agi, [
                { label: 'Form 1040 Line 11 AGI', sign: '+', amount: agi, amountFormatted: formatCurrencyExact(agi), isSetUp: agi !== 0, targetElementId: 'calc-agi' }
            ], true),
            std_ded: makeVar('std_ded', 'Standard Deduction', summary.itemizedCalc.standardDeduction, [
                { label: `Filing Status (${filingStatusLabel(state.filingStatus)})`, sign: '+', amount: rules.standardDeduction[effectiveStatus], amountFormatted: formatCurrency(rules.standardDeduction[effectiveStatus]), isSetUp: true, targetElementId: 'select-filing-status' },
                { label: 'Age 65+ / Blind Extra', sign: '+', amount: summary.itemizedCalc.standardDeduction - rules.standardDeduction[effectiveStatus], amountFormatted: formatCurrency(summary.itemizedCalc.standardDeduction - rules.standardDeduction[effectiveStatus]), isSetUp: (Number(state.dependents?.age65OrBlindCount) || 0) > 0, targetElementId: 'input-age65-blind', panelKey: 'cred-age-blind', panelSection: 'credits' }
            ]),
            item_ded: makeVar('item_ded', 'Itemized Deductions', summary.itemizedCalc.totalItemized, [
                { label: 'Medical (Over 7.5% AGI)', sign: '+', amount: summary.itemizedCalc.allowableMedical, amountFormatted: formatCurrencyExact(summary.itemizedCalc.allowableMedical), isSetUp: medRaw > 0, targetElementId: 'input-itemized-medical', panelKey: 'itemized-medical', panelSection: 'itemized' },
                { label: 'SALT (Capped $10k)', sign: '+', amount: summary.itemizedCalc.allowableSalt, amountFormatted: formatCurrency(summary.itemizedCalc.allowableSalt), isSetUp: rawSalt > 0, targetElementId: 'input-itemized-real-estate', panelKey: 'itemized-real-estate', panelSection: 'itemized' },
                { label: 'Mortgage Interest', sign: '+', amount: mortgageRaw, amountFormatted: formatCurrency(mortgageRaw), isSetUp: mortgageRaw > 0, targetElementId: 'input-itemized-mortgage', panelKey: 'itemized-mortgage', panelSection: 'itemized' },
                { label: 'Charity', sign: '+', amount: charityRaw, amountFormatted: formatCurrency(charityRaw), isSetUp: charityRaw > 0, targetElementId: 'input-itemized-charity', panelKey: 'itemized-charity', panelSection: 'itemized' }
            ], true),
            qbi_ded: makeVar('qbi_ded', 'QBI Deduction (20% Sec. 199A)', summary.qbiDeduction, [
                { label: 'Net Schedule C + K-1 QBI × 20%', sign: '+', amount: summary.qbiDeduction, amountFormatted: formatCurrencyExact(summary.qbiDeduction), isSetUp: summary.qbiDeduction > 0, targetElementId: 'section-federal-other-income', panelKey: '1099-nec', panelSection: 'other-income' }
            ], true)
        };
        const lines = [
            {
                id: 'line-deduction',
                label: `Applied Deduction (${summary.itemizedCalc.chosenMethod === 'itemized' ? 'Itemized' : 'Standard'})`,
                formLineLabel: 'Form 1040 Line 12',
                generalTokens: [
                    t('Deduction = max('),
                    v('std_ded', 'Standard', summary.itemizedCalc.standardDeduction, vars.std_ded.isEmpty),
                    t(', '),
                    v('item_ded', 'Itemized', summary.itemizedCalc.totalItemized, vars.item_ded.isEmpty, true),
                    t(')')
                ],
                pluggedTokens: [
                    t('Deduction = '),
                    v('std_ded', formatCurrency(summary.itemizedCalc.standardDeduction), summary.itemizedCalc.standardDeduction, vars.std_ded.isEmpty),
                    t(' vs '),
                    v('item_ded', formatCurrencyExact(summary.itemizedCalc.totalItemized), summary.itemizedCalc.totalItemized, vars.item_ded.isEmpty, true),
                    t(` ➔ ${formatCurrencyExact(summary.deductionCalc.result)}`)
                ],
                resultFormatted: formatCurrencyExact(summary.deductionCalc.result)
            },
            ...(summary.qbiDeduction > 0 ? [{
                    id: 'line-qbi',
                    label: 'Qualified Business Income Deduction',
                    formLineLabel: 'Form 1040 Line 13',
                    generalTokens: [t('QBI = 20% × Qualified Business Income '), v('qbi_ded', 'QBI', summary.qbiDeduction, vars.qbi_ded.isEmpty, true)],
                    pluggedTokens: [t('QBI = '), v('qbi_ded', formatCurrencyExact(summary.qbiDeduction), summary.qbiDeduction, vars.qbi_ded.isEmpty, true)],
                    resultFormatted: formatCurrencyExact(summary.qbiDeduction)
                }] : []),
            {
                id: 'line-taxable-income',
                label: 'Taxable Income',
                formLineLabel: 'Form 1040 Line 15',
                generalTokens: [
                    t('Taxable Income = max(0, '),
                    v('agi_val', 'AGI', agi, vars.agi_val.isEmpty, true),
                    t(' − Deduction'),
                    ...(summary.qbiDeduction > 0 ? [t(' − '), v('qbi_ded', 'QBI', summary.qbiDeduction, vars.qbi_ded.isEmpty, true)] : []),
                    t(')')
                ],
                pluggedTokens: [
                    t('Taxable Income = max(0, '),
                    v('agi_val', formatCurrencyExact(agi), agi, vars.agi_val.isEmpty, true),
                    t(` − ${formatCurrencyExact(summary.deductionCalc.result)}`),
                    ...(summary.qbiDeduction > 0 ? [t(` − ${formatCurrencyExact(summary.qbiDeduction)}`)] : []),
                    t(`) = ${formatCurrencyExact(summary.taxableIncomeCalc.result)}`)
                ],
                resultFormatted: formatCurrencyExact(summary.taxableIncomeCalc.result)
            }
        ];
        blocks.push({
            id: 'calc-taxable-income',
            stepLabel: 'Step 4 • Deductions & Taxable Income',
            title: 'Deduction & Taxable Income',
            hasImpact: hasAnyOverallImpact,
            lines,
            variables: vars,
            sourceIds: ['calc-agi', 'select-filing-status', ...(hasAnyItemized ? ['calc-itemized-deductions'] : [])]
        });
    }
    // BLOCK 7: Tax Before Credits (Brackets)
    {
        const vars = {
            taxable_inc: makeVar('taxable_inc', 'Taxable Income', summary.taxableIncomeCalc.result, [
                { label: 'Form 1040 Line 15 Taxable Income', sign: '+', amount: summary.taxableIncomeCalc.result, amountFormatted: formatCurrencyExact(summary.taxableIncomeCalc.result), isSetUp: summary.taxableIncomeCalc.result > 0, targetElementId: 'calc-taxable-income' }
            ], true)
        };
        const lines = [
            {
                id: 'line-tax-before-credits',
                label: 'Tax from Brackets & Preferential Rates',
                formLineLabel: 'Form 1040 Line 16',
                generalTokens: [t('Tentative Tax = ∑(Bracket Slices of '), v('taxable_inc', 'Taxable Income', summary.taxableIncomeCalc.result, vars.taxable_inc.isEmpty, true), t(' × Rate)')],
                pluggedTokens: [t(`${summary.taxBeforeCreditsCalc.pluggedFormula}`)],
                resultFormatted: formatCurrencyExact(summary.taxBeforeCreditsCalc.result)
            }
        ];
        blocks.push({
            id: 'calc-tax-before-credits',
            stepLabel: 'Step 5 • Tax Brackets',
            title: 'Federal Income Tax (Before Credits)',
            hasImpact: hasAnyOverallImpact && summary.taxableIncomeCalc.result > 0,
            lines,
            variables: vars,
            sourceIds: ['calc-taxable-income', 'select-filing-status']
        });
    }
    // BLOCK 8: Tax Credits (Nonrefundable & Refundable)
    {
        const kids = Number(state.dependents?.childrenCount) || 0;
        const otherDeps = Number(state.dependents?.otherDependentsCount) || 0;
        const care = Number(state.dependents?.childCareExpenses) || 0;
        const aotc = Number(state.dependents?.educationExpensesAotc) || 0;
        const llc = Number(state.dependents?.educationExpensesLlc) || 0;
        const ftc = Number(state.dependents?.foreignTaxCredit) || 0;
        const clean = Number(state.dependents?.cleanEnergyCredit) || 0;
        const vars = {
            nonref_credits: makeVar('nonref_credits', 'Nonrefundable Credits', summary.creditsCalc.totalNonRefundableCredits, [
                { label: `Child Tax Credit (${kids} kids)`, sign: '+', amount: summary.creditsCalc.childTaxCredit, amountFormatted: formatCurrencyExact(summary.creditsCalc.childTaxCredit), isSetUp: kids > 0, targetElementId: 'input-children-count', panelKey: 'cred-children', panelSection: 'credits' },
                { label: `Other Dependents ($500 × ${otherDeps})`, sign: '+', amount: summary.creditsCalc.otherDependentsCredit, amountFormatted: formatCurrencyExact(summary.creditsCalc.otherDependentsCredit), isSetUp: otherDeps > 0, targetElementId: 'input-other-dependents', panelKey: 'cred-other-dependents', panelSection: 'credits' },
                { label: 'Child & Dependent Care (Form 2441)', sign: '+', amount: summary.creditsCalc.childCareCredit, amountFormatted: formatCurrencyExact(summary.creditsCalc.childCareCredit), isSetUp: care > 0, targetElementId: 'input-child-care', panelKey: 'cred-child-care', panelSection: 'credits' },
                { label: 'Education Credits (Nonrefundable)', sign: '+', amount: summary.creditsCalc.educationCreditNonRefundable, amountFormatted: formatCurrencyExact(summary.creditsCalc.educationCreditNonRefundable), isSetUp: aotc > 0 || llc > 0, targetElementId: 'input-edu-aotc', panelKey: 'cred-aotc', panelSection: 'credits' },
                { label: "Saver's Credit (Form 8880)", sign: '+', amount: summary.creditsCalc.saversCredit, amountFormatted: formatCurrencyExact(summary.creditsCalc.saversCredit), isSetUp: summary.creditsCalc.saversCredit > 0, targetElementId: 'input-adj-ira', panelKey: 'adj-ira', panelSection: 'adjustments' },
                { label: 'Foreign Tax Credit (Form 1116)', sign: '+', amount: summary.creditsCalc.foreignTaxCredit, amountFormatted: formatCurrencyExact(summary.creditsCalc.foreignTaxCredit), isSetUp: ftc > 0, targetElementId: 'input-foreign-tax-credit', panelKey: 'cred-foreign-tax', panelSection: 'credits' },
                { label: 'Clean Energy Credit (Form 5695)', sign: '+', amount: summary.creditsCalc.cleanEnergyCredit, amountFormatted: formatCurrencyExact(summary.creditsCalc.cleanEnergyCredit), isSetUp: clean > 0, targetElementId: 'input-clean-energy-credit', panelKey: 'cred-clean-energy', panelSection: 'credits' }
            ], true),
            ref_credits: makeVar('ref_credits', 'Refundable Credits', summary.creditsCalc.totalRefundableCredits, [
                { label: 'Additional Child Tax Credit (Sched 8812)', sign: '+', amount: summary.creditsCalc.additionalChildTaxCredit, amountFormatted: formatCurrencyExact(summary.creditsCalc.additionalChildTaxCredit), isSetUp: summary.creditsCalc.additionalChildTaxCredit > 0, targetElementId: 'input-children-count', panelKey: 'cred-children', panelSection: 'credits' },
                { label: 'Earned Income Tax Credit (EITC)', sign: '+', amount: summary.creditsCalc.eitc, amountFormatted: formatCurrencyExact(summary.creditsCalc.eitc), isSetUp: summary.creditsCalc.eitc > 0, targetElementId: 'input-children-count', panelKey: 'cred-children', panelSection: 'credits' },
                { label: 'Refundable AOTC (40%, Form 8863)', sign: '+', amount: summary.creditsCalc.educationCreditRefundable, amountFormatted: formatCurrencyExact(summary.creditsCalc.educationCreditRefundable), isSetUp: summary.creditsCalc.educationCreditRefundable > 0, targetElementId: 'input-edu-aotc', panelKey: 'cred-aotc', panelSection: 'credits' }
            ], true)
        };
        const lines = [
            {
                id: 'line-nonref-credits',
                label: 'Total Nonrefundable Credits',
                formLineLabel: 'Form 1040 Line 19–20',
                generalTokens: [t('Nonrefundable Credits = '), v('nonref_credits', '∑ Credits (Capped at Tax)', summary.creditsCalc.totalNonRefundableCredits, vars.nonref_credits.isEmpty, true)],
                pluggedTokens: [t('Nonrefundable Credits = '), v('nonref_credits', formatCurrencyExact(summary.creditsCalc.totalNonRefundableCredits), summary.creditsCalc.totalNonRefundableCredits, vars.nonref_credits.isEmpty, true)],
                resultFormatted: formatCurrencyExact(summary.creditsCalc.totalNonRefundableCredits)
            },
            {
                id: 'line-ref-credits',
                label: 'Total Refundable Credits (ACTC / EITC / AOTC)',
                formLineLabel: 'Form 1040 Line 27–29',
                generalTokens: [t('Refundable Credits = '), v('ref_credits', 'ACTC + EITC + 40% AOTC', summary.creditsCalc.totalRefundableCredits, vars.ref_credits.isEmpty, true)],
                pluggedTokens: [t('Refundable Credits = '), v('ref_credits', formatCurrencyExact(summary.creditsCalc.totalRefundableCredits), summary.creditsCalc.totalRefundableCredits, vars.ref_credits.isEmpty, true)],
                resultFormatted: formatCurrencyExact(summary.creditsCalc.totalRefundableCredits)
            }
        ];
        blocks.push({
            id: 'calc-total-credits',
            stepLabel: 'Step 6 • Tax Credits',
            title: 'Nonrefundable & Refundable Credits',
            hasImpact: hasAnyCreditsInput,
            lines,
            variables: vars,
            sourceIds: ['calc-tax-before-credits', 'input-children-count']
        });
    }
    // BLOCK 9: Other Taxes (SE Tax, NIIT, Add'l Medicare, AMT, Early Dist)
    {
        const ot = summary.otherTaxesCalc;
        const vars = {
            se_tax: makeVar('se_tax', 'Self-Employment Tax (Sched SE)', ot.selfEmploymentTax, [
                { label: 'Net 1099-NEC × 0.9235 × 15.3%', sign: '+', amount: ot.selfEmploymentTax, amountFormatted: formatCurrencyExact(ot.selfEmploymentTax), isSetUp: ot.selfEmploymentTax > 0, targetElementId: 'section-federal-other-income', panelKey: '1099-nec', panelSection: 'other-income' }
            ], true),
            niit_addl: makeVar('niit_addl', 'NIIT & Addl Medicare / AMT', ot.niit + ot.additionalMedicareTax + ot.amt + ot.earlyDistributionPenaltyTax, [
                { label: 'Form 8959 Additional Medicare (0.9%)', sign: '+', amount: ot.additionalMedicareTax, amountFormatted: formatCurrencyExact(ot.additionalMedicareTax), isSetUp: ot.additionalMedicareTax > 0, targetElementId: 'calc-agi' },
                { label: 'Form 8960 NIIT (3.8%)', sign: '+', amount: ot.niit, amountFormatted: formatCurrencyExact(ot.niit), isSetUp: ot.niit > 0, targetElementId: 'calc-agi' },
                { label: 'Form 6251 AMT', sign: '+', amount: ot.amt, amountFormatted: formatCurrencyExact(ot.amt), isSetUp: ot.amt > 0, targetElementId: 'calc-agi' },
                { label: 'Form 5329 10% Early Distribution', sign: '+', amount: ot.earlyDistributionPenaltyTax, amountFormatted: formatCurrencyExact(ot.earlyDistributionPenaltyTax), isSetUp: ot.earlyDistributionPenaltyTax > 0, targetElementId: 'section-federal-other-income', panelKey: '1099-r', panelSection: 'other-income' }
            ], true)
        };
        const lines = [
            {
                id: 'line-other-taxes',
                label: 'Total Other Taxes',
                formLineLabel: 'Form 1040 Line 23',
                generalTokens: [
                    t('Other Taxes = '),
                    v('se_tax', 'SE Tax', ot.selfEmploymentTax, vars.se_tax.isEmpty, true),
                    t(' + '),
                    v('niit_addl', 'NIIT / Addl Med / AMT / 5329', ot.niit + ot.additionalMedicareTax + ot.amt + ot.earlyDistributionPenaltyTax, vars.niit_addl.isEmpty, true)
                ],
                pluggedTokens: [
                    t('Other Taxes = '),
                    v('se_tax', formatCurrencyExact(ot.selfEmploymentTax), ot.selfEmploymentTax, vars.se_tax.isEmpty, true),
                    t(' + '),
                    v('niit_addl', formatCurrencyExact(ot.niit + ot.additionalMedicareTax + ot.amt + ot.earlyDistributionPenaltyTax), ot.niit + ot.additionalMedicareTax + ot.amt + ot.earlyDistributionPenaltyTax, vars.niit_addl.isEmpty, true),
                    t(` = ${formatCurrencyExact(ot.totalOtherTaxes)}`)
                ],
                resultFormatted: formatCurrencyExact(ot.totalOtherTaxes)
            }
        ];
        blocks.push({
            id: 'calc-other-taxes',
            stepLabel: 'Step 7 • Schedule 2 & 3 Other Taxes',
            title: 'Self-Employment Tax, NIIT & Other Taxes',
            hasImpact: hasAnyOtherTaxes,
            lines,
            variables: vars,
            sourceIds: ['calc-agi', 'calc-total-w2-wages']
        });
    }
    // BLOCK 10: Final Federal Tax, Payments & Refund/Owed Verdict (Clustered Output)
    {
        const estPay = Math.max(0, Number(state.dependents?.estimatedTaxPayments) || 0);
        const vars = {
            tax_before_cred: makeVar('tax_before_cred', 'Tax Before Credits', summary.taxBeforeCreditsCalc.result, [
                { label: 'Form 1040 Line 16 Tax', sign: '+', amount: summary.taxBeforeCreditsCalc.result, amountFormatted: formatCurrencyExact(summary.taxBeforeCreditsCalc.result), isSetUp: summary.taxBeforeCreditsCalc.result > 0, targetElementId: 'calc-tax-before-credits' }
            ], true),
            nonref_cred: makeVar('nonref_cred', 'Nonrefundable Credits', summary.creditsCalc.totalNonRefundableCredits, [
                { label: 'Form 1040 Line 19–20 Credits', sign: '-', amount: summary.creditsCalc.totalNonRefundableCredits, amountFormatted: formatCurrencyExact(summary.creditsCalc.totalNonRefundableCredits), isSetUp: summary.creditsCalc.totalNonRefundableCredits > 0, targetElementId: 'calc-total-credits' }
            ], true),
            other_taxes: makeVar('other_taxes', 'Other Taxes', summary.otherTaxesCalc.totalOtherTaxes, [
                { label: 'Form 1040 Line 23 Other Taxes', sign: '+', amount: summary.otherTaxesCalc.totalOtherTaxes, amountFormatted: formatCurrencyExact(summary.otherTaxesCalc.totalOtherTaxes), isSetUp: summary.otherTaxesCalc.totalOtherTaxes > 0, targetElementId: 'calc-other-taxes' }
            ], true),
            payments_total: makeVar('payments_total', 'Total Payments & Refundable Credits', summary.withholdingCalc.result, [
                ...w2s.map((w, idx) => ({
                    label: `W-2 #${idx + 1} Box 2 Federal Withholding`,
                    sign: '+',
                    amount: Number(w.box2) || 0,
                    amountFormatted: formatCurrencyExact(Number(w.box2) || 0),
                    isSetUp: (Number(w.box2) || 0) !== 0,
                    targetElementId: `w2-${w.id}-box2`
                })),
                { label: 'Estimated Tax Payments (1040-ES)', sign: '+', amount: estPay, amountFormatted: formatCurrencyExact(estPay), isSetUp: estPay > 0, targetElementId: 'input-estimated-payments', panelKey: 'cred-estimated-payments', panelSection: 'credits' },
                { label: 'Excess SS Tax Credit (Sched 3 Line 11)', sign: '+', amount: summary.ficaCalc.excessSSTaxCredit, amountFormatted: formatCurrencyExact(summary.ficaCalc.excessSSTaxCredit), isSetUp: summary.ficaCalc.excessSSTaxCredit > 0, targetElementId: 'calc-total-w2-wages' },
                { label: 'Refundable Credits (ACTC/EITC/AOTC)', sign: '+', amount: summary.creditsCalc.totalRefundableCredits, amountFormatted: formatCurrencyExact(summary.creditsCalc.totalRefundableCredits), isSetUp: summary.creditsCalc.totalRefundableCredits > 0, targetElementId: 'calc-total-credits' }
            ], true)
        };
        const lines = [
            {
                id: 'line-total-tax',
                label: 'Total Federal Tax Liability',
                formLineLabel: 'Form 1040 Line 24',
                generalTokens: [
                    t('Total Tax = max(0, '),
                    v('tax_before_cred', 'Line 16 Tax', summary.taxBeforeCreditsCalc.result, vars.tax_before_cred.isEmpty, true),
                    t(' − '),
                    v('nonref_cred', 'Nonref Credits', summary.creditsCalc.totalNonRefundableCredits, vars.nonref_cred.isEmpty, true),
                    t(') + '),
                    v('other_taxes', 'Other Taxes', summary.otherTaxesCalc.totalOtherTaxes, vars.other_taxes.isEmpty, true)
                ],
                pluggedTokens: [
                    t('Total Tax = max(0, '),
                    v('tax_before_cred', formatCurrencyExact(summary.taxBeforeCreditsCalc.result), summary.taxBeforeCreditsCalc.result, vars.tax_before_cred.isEmpty, true),
                    t(' − '),
                    v('nonref_cred', formatCurrencyExact(summary.creditsCalc.totalNonRefundableCredits), summary.creditsCalc.totalNonRefundableCredits, vars.nonref_cred.isEmpty, true),
                    t(') + '),
                    v('other_taxes', formatCurrencyExact(summary.otherTaxesCalc.totalOtherTaxes), summary.otherTaxesCalc.totalOtherTaxes, vars.other_taxes.isEmpty, true),
                    t(` = ${formatCurrencyExact(summary.totalTaxCalc.result)}`)
                ],
                resultFormatted: formatCurrencyExact(summary.totalTaxCalc.result)
            },
            {
                id: 'line-total-payments',
                label: 'Total Payments & Refundable Credits',
                formLineLabel: 'Form 1040 Line 33',
                generalTokens: [t('Total Payments = '), v('payments_total', 'Withholding + Est. Payments + Refundable Credits', summary.withholdingCalc.result, vars.payments_total.isEmpty, true)],
                pluggedTokens: [t('Total Payments = '), v('payments_total', formatCurrencyExact(summary.withholdingCalc.result), summary.withholdingCalc.result, vars.payments_total.isEmpty, true)],
                resultFormatted: formatCurrencyExact(summary.withholdingCalc.result)
            },
            {
                id: 'line-final-outcome',
                label: summary.finalResultCalc.isRefund ? 'Federal Tax Refund' : 'Federal Tax Balance Owed',
                formLineLabel: summary.finalResultCalc.isRefund ? 'Form 1040 Line 34 / 35a' : 'Form 1040 Line 37',
                generalTokens: [t('Net Outcome = Total Payments − Total Tax')],
                pluggedTokens: [t(`${formatCurrencyExact(summary.withholdingCalc.result)} − ${formatCurrencyExact(summary.totalTaxCalc.result)} = ${summary.finalResultCalc.isRefund ? '+' : '-'}${formatCurrencyExact(summary.finalResultCalc.result)}`)],
                resultFormatted: `${summary.finalResultCalc.isRefund ? '+' : '-'}${formatCurrencyExact(summary.finalResultCalc.result)}`
            }
        ];
        blocks.push({
            id: 'calc-final-verdict',
            stepLabel: 'Step 8 • Federal Bottom Line',
            title: 'Total Tax, Payments & Federal Refund / Owed',
            hasImpact: hasAnyOverallImpact,
            isOutput: true,
            lines,
            variables: vars,
            sourceIds: ['calc-tax-before-credits', 'calc-total-w2-wages', ...(hasAnyCreditsInput ? ['calc-total-credits'] : []), ...(hasAnyOtherTaxes ? ['calc-other-taxes'] : [])]
        });
    }
    return blocks;
}
