/**
 * State & local tax-law tables (brackets, standard deductions, reciprocity) shared by the
 * formula graph and the legacy engine.
 */
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
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
        isFlat: true,
        flatRate: 0.0495,
        reciprocalWith: ['IA', 'KY', 'MI', 'WI'],
        notes: 'Flat 4.95% individual income tax rate. Reciprocal agreements with IA, KY, MI, WI.'
    },
    IN: {
        code: 'IN', name: 'Indiana', hasIncomeTax: true,
        formResident: 'Form IT-40', formNonResident: 'Form IT-40PNR',
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
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
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
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
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
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
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
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
        standardDeduction: { single: 0, married_joint: 0, married_separate: 0, head_of_household: 0 },
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
