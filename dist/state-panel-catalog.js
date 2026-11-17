/**
 * Actually Free Taxes - State & Locality Panel Catalog
 * Provides state-specific and general state/local items across Other Income, Adjustments, Credits, and Itemized Deductions.
 */
export const STATE_PANEL_CATALOG = [
    // ===================== NY / NYC SPECIFIC =====================
    {
        key: 'ny-414h-addback',
        states: ['NY'],
        section: 'other-income',
        title: 'NYC / NY Public Pension Addback (414h)',
        officialTitle: 'Form IT-201 • Line 21 (IRC 414(h))',
        shortExplanation: 'Mandatory NY addition for NYC/NY public employee retirement contributions (Box 14 on W-2).',
        ratingKey: 'w2-box16',
        size: 'sm'
    },
    {
        key: 'ny-529-deduction',
        states: ['NY'],
        section: 'adjustments',
        title: 'NY 529 College Savings Deduction',
        officialTitle: 'Form IT-201 • Line 30 (Up to $5k / $10k MFJ)',
        shortExplanation: 'Contributions to a New York 529 Direct Plan (up to $5,000 Single / $10,000 MFJ).',
        ratingKey: 'adj-ira',
        size: 'sm'
    },
    {
        key: 'ny-tuition-credit',
        states: ['NY'],
        section: 'credits',
        title: 'NY College Tuition Credit / Deduction',
        officialTitle: 'Form IT-272 • Line 68',
        shortExplanation: 'Up to $400 refundable credit (or $10,000 itemized deduction) for NY undergraduate tuition.',
        ratingKey: 'credits-aotc',
        size: 'sm'
    },
    {
        key: 'nyc-school-tax-credit',
        states: ['NY'],
        section: 'credits',
        title: 'NYC School Tax Credit (STAR)',
        officialTitle: 'Form IT-201 • Line 69 (NYC Residents)',
        shortExplanation: 'Refundable $63 ($125 MFJ) NYC resident school tax credit if income is under $250,000.',
        ratingKey: 'credits-children',
        size: 'sm'
    },
    {
        key: 'ny-child-care-credit',
        states: ['NY'],
        section: 'credits',
        title: 'NY Child & Dependent Care Credit',
        officialTitle: 'Form IT-216 • Line 64',
        shortExplanation: 'State credit equal to 20%–110% of your Federal Form 2441 child care credit.',
        ratingKey: 'credits-child-care',
        size: 'sm'
    },
    {
        key: 'ny-it196-itemized',
        states: ['NY'],
        section: 'itemized',
        title: 'NY Itemized Deductions (IT-196)',
        officialTitle: 'Form IT-196 • Union Dues & Unreimbursed Exp.',
        shortExplanation: 'NY allows itemized deductions even if you take the Federal Standard Deduction.',
        ratingKey: 'itemized-charity',
        size: 'sm'
    },
    // ===================== CA SPECIFIC =====================
    {
        key: 'ca-hsa-addback',
        states: ['CA'],
        section: 'other-income',
        title: 'CA HSA Non-Conformity Addback',
        officialTitle: 'Schedule CA (540) • Part I Line 8f',
        shortExplanation: 'California does not conform to Federal HSA deductions; enter Federal HSA deducted to add back.',
        ratingKey: 'adj-hsa',
        size: 'sm'
    },
    {
        key: 'ca-renters-credit',
        states: ['CA'],
        section: 'credits',
        title: "CA Nonrefundable Renter's Credit",
        officialTitle: 'FTB Form 540 • Line 46 ($60 / $120)',
        shortExplanation: '$60 Single ($120 MFJ) credit if you paid rent in CA for at least half the year and meet AGI limits.',
        ratingKey: 'credits-other-dependents',
        size: 'sm'
    },
    {
        key: 'ca-yctc',
        states: ['CA'],
        section: 'credits',
        title: 'CA Young Child Tax Credit (YCTC)',
        officialTitle: 'FTB Form 3514 • Up to $1,154 Refundable',
        shortExplanation: 'Refundable credit for California CalEITC-eligible families with a child under age 6.',
        ratingKey: 'credits-children',
        size: 'sm'
    },
    // ===================== MA SPECIFIC =====================
    {
        key: 'ma-rent-deduction',
        states: ['MA'],
        section: 'adjustments',
        title: 'MA Rental Deduction (50% up to $4k)',
        officialTitle: 'Form 1 • Line 14a (50% of Rent Paid)',
        shortExplanation: 'Deduct 50% of rent paid for your principal MA residence, up to $4,000.',
        ratingKey: 'itemized-mortgage',
        size: 'sm'
    },
    {
        key: 'ma-commuter-deduction',
        states: ['MA'],
        section: 'adjustments',
        title: 'MA Commuter Deduction (MBTA / Tolls)',
        officialTitle: 'Schedule Y • Line 15 (Over $150, Max $750)',
        shortExplanation: 'Deduct MBTA passes and E-ZPass MA tolls exceeding $150, up to $750.',
        ratingKey: 'adj-educator',
        size: 'sm'
    },
    {
        key: 'ma-circuit-breaker',
        states: ['MA'],
        section: 'credits',
        title: 'MA Senior Circuit Breaker Credit',
        officialTitle: 'Schedule CB • Age 65+ Property/Rent',
        shortExplanation: 'Refundable credit for MA residents age 65+ whose property tax or 25% of rent exceeds 10% of income.',
        ratingKey: 'credits-age-blind',
        size: 'sm'
    },
    // ===================== NJ SPECIFIC =====================
    {
        key: 'nj-property-tax-deduction',
        states: ['NJ'],
        section: 'itemized',
        title: 'NJ Property Tax / Rent Deduction',
        officialTitle: 'Form NJ-1040 • Line 41 (Max $15,000)',
        shortExplanation: 'Deduct up to $15,000 of NJ property taxes paid (or 18% of rent paid as tenant).',
        ratingKey: 'itemized-salt',
        size: 'sm'
    },
    {
        key: 'nj-child-credit',
        states: ['NJ'],
        section: 'credits',
        title: 'NJ Child Tax Credit',
        officialTitle: 'Form NJ-1040 • Line 62 (Age 5 & Under)',
        shortExplanation: 'Up to $1,000 refundable credit per child age 5 or under (AGI under $80,000).',
        ratingKey: 'credits-children',
        size: 'sm'
    },
    // ===================== PA SPECIFIC =====================
    {
        key: 'pa-529-deduction',
        states: ['PA'],
        section: 'adjustments',
        title: 'PA 529 College Savings Deduction',
        officialTitle: 'PA-40 Schedule O • Up to $18,000/beneficiary',
        shortExplanation: 'Deduct contributions to any state 529 plan from PA taxable income.',
        ratingKey: 'adj-ira',
        size: 'sm'
    },
    {
        key: 'pa-ue-expenses',
        states: ['PA'],
        section: 'itemized',
        title: 'PA Unreimbursed Employee Expenses',
        officialTitle: 'PA-40 Schedule UE • Line 1a',
        shortExplanation: 'PA allows deducting unreimbursed job expenses (union dues, tools, travel) against W-2 wages.',
        ratingKey: 'sched-c-expenses',
        size: 'sm'
    },
    // ===================== DC SPECIFIC =====================
    {
        key: 'dc-529-deduction',
        states: ['DC'],
        section: 'adjustments',
        title: 'DC College Savings Plan Deduction',
        officialTitle: 'Form D-40 • Schedule I Subtraction',
        shortExplanation: 'Deduct up to $4,000 ($8,000 MFJ) in DC 529 contributions.',
        ratingKey: 'adj-ira',
        size: 'sm'
    },
    {
        key: 'dc-schedule-h',
        states: ['DC'],
        section: 'credits',
        title: 'DC Property Tax Credit (Schedule H)',
        officialTitle: 'Form D-40 Schedule H • Homeowner/Renter',
        shortExplanation: 'Refundable credit for DC homeowners and renters meeting household income thresholds.',
        ratingKey: 'itemized-salt',
        size: 'sm'
    },
    // ===================== GENERAL (ANY STATE) =====================
    {
        key: 'state-other-income-general',
        states: '*',
        section: 'other-income',
        title: 'State-Only Income Additions',
        officialTitle: 'State Schedule • Additions to Federal AGI',
        shortExplanation: 'Out-of-state municipal bond interest or other income taxable by this state.',
        ratingKey: 'other-interest',
        size: 'sm'
    },
    {
        key: 'state-treasury-subtraction',
        states: '*',
        section: 'adjustments',
        title: 'U.S. Treasury / State Subtractions',
        officialTitle: 'State Schedule • Subtractions from AGI',
        shortExplanation: 'U.S. Treasury bill/bond interest (exempt from state tax) or state-specific subtractions.',
        ratingKey: 'adj-student-loan',
        size: 'sm'
    },
    {
        key: 'state-529-general',
        states: '*',
        section: 'adjustments',
        title: 'State 529 Plan Contribution',
        officialTitle: 'State Schedule • Education Subtraction',
        shortExplanation: 'Deductible contributions to your state-sponsored 529 education savings plan.',
        ratingKey: 'adj-ira',
        size: 'sm'
    },
    {
        key: 'state-credit-general',
        states: '*',
        section: 'credits',
        title: 'State Tax Credit',
        officialTitle: 'State Return • Direct Tax Credits',
        shortExplanation: 'Direct state credits (state EITC, renter credit, energy credit, or child credit).',
        ratingKey: 'credits-clean-energy',
        size: 'sm'
    },
    {
        key: 'state-itemized-general',
        states: '*',
        section: 'itemized',
        title: 'State Itemized Deduction Override',
        officialTitle: 'State Schedule A • Itemized Deductions',
        shortExplanation: 'Additional state-allowed itemized deductions (e.g. state-only property/medical/union dues).',
        ratingKey: 'itemized-charity',
        size: 'sm'
    }
];
export function getStateCatalogForSection(stateCode, section) {
    const code = stateCode.toUpperCase();
    return STATE_PANEL_CATALOG.filter(entry => entry.section === section && (entry.states === '*' || entry.states.includes(code)));
}
export function getStateCatalogEntry(key) {
    return STATE_PANEL_CATALOG.find(e => e.key === key);
}
