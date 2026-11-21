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
        key: 'state-estimated-payments',
        states: '*',
        section: 'credits',
        title: 'State Estimated & Extension Payments',
        officialTitle: 'State Return • Estimated Tax Payments / Prior-Year Overpayment Applied',
        shortExplanation: 'Quarterly estimated payments, extension payments and last year\'s overpayment applied to this state. Counted as payments, like withholding.',
        ratingKey: 'cred-estimated-payments',
        size: 'sm'
    },
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
    },
    {
        key: 'oh-bid',
        states: ['OH'],
        section: 'adjustments',
        title: 'OH Business Income Deduction',
        officialTitle: 'Form IT BUS • Up to $250k Exempt',
        shortExplanation: 'Ohio deducts up to $250,000 of Schedule C / E / K-1 business income.',
        ratingKey: 'income-1099-nec',
        size: 'sm'
    },
    {
        key: 'co-529-deduction',
        states: ['CO'],
        section: 'adjustments',
        title: 'CO 529 (CollegeInvest) Deduction',
        officialTitle: 'Form DR 0104AD • Subtraction',
        shortExplanation: 'Qualifying CollegeInvest 529 contributions deductible from CO taxable income.',
        ratingKey: 'adj-ira',
        size: 'sm'
    },
    {
        key: 'in-renters-deduction',
        states: ['IN'],
        section: 'itemized',
        title: "IN Renter's Deduction",
        officialTitle: 'Form IT-40 Schedule 2 (Max $3,000)',
        shortExplanation: 'Rent paid on principal Indiana residence deductible up to $3,000.',
        ratingKey: 'itemized-mortgage',
        size: 'sm'
    },
    {
        key: 'in-529-credit',
        states: ['IN'],
        section: 'credits',
        title: 'IN CollegeChoice 529 Credit',
        officialTitle: 'Schedule IN-529 (20% up to $1,500)',
        shortExplanation: '20% credit on CollegeChoice 529 contributions up to $7,500.',
        ratingKey: 'credits-aotc',
        size: 'sm'
    },
    {
        key: 'mi-homestead-credit',
        states: ['MI'],
        section: 'credits',
        title: 'MI Homestead Property Tax Credit',
        officialTitle: 'Form MI-1040CR (Up to $1,700)',
        shortExplanation: 'Refundable credit for Michigan homeowners/renters based on property tax and household resources.',
        ratingKey: 'itemized-salt',
        size: 'sm'
    },
    {
        key: 'wi-school-prop-credit',
        states: ['WI'],
        section: 'credits',
        title: 'WI School Property Tax / Rent Credit',
        officialTitle: 'Form 1 Line 22 (12% up to $300)',
        shortExplanation: '12% credit on up to $2,500 of property taxes or rent paid in Wisconsin.',
        ratingKey: 'itemized-salt',
        size: 'sm'
    },
    {
        key: 'az-public-school-credit',
        states: ['AZ'],
        section: 'credits',
        title: 'AZ Public School / QCO Credit',
        officialTitle: 'Form 321 / 322 ($200–$938)',
        shortExplanation: 'Dollar-for-dollar credit for AZ public school fees and qualifying charitable organizations.',
        ratingKey: 'itemized-charity',
        size: 'sm'
    },
    {
        key: 'ct-property-tax-credit',
        states: ['CT'],
        section: 'credits',
        title: 'CT Property Tax Credit',
        officialTitle: 'Form CT-1040 Schedule 3 (Up to $300)',
        shortExplanation: 'Credit for primary residence or motor vehicle property taxes paid in Connecticut.',
        ratingKey: 'itemized-salt',
        size: 'sm'
    },
    {
        key: 'ga-retirement-excl',
        states: ['GA'],
        section: 'adjustments',
        title: 'GA Retirement Income Exclusion',
        officialTitle: 'Form 500 Schedule 1 ($35k/$65k)',
        shortExplanation: 'Up to $35,000 (ages 62–64) or $65,000 (65+) retirement income exclusion.',
        ratingKey: 'income-1099-r',
        size: 'sm'
    },
    {
        key: 'ky-pension-excl',
        states: ['KY'],
        section: 'adjustments',
        title: 'KY Pension Exclusion',
        officialTitle: 'Schedule P (Up to $31,110)',
        shortExplanation: 'Up to $31,110 exclusion for qualified pension/IRA distributions in Kentucky.',
        ratingKey: 'income-1099-r',
        size: 'sm'
    },
    {
        key: 'va-529-deduction',
        states: ['VA'],
        section: 'adjustments',
        title: 'VA CollegeAmerica 529 Deduction',
        officialTitle: 'Schedule ADJ (Up to $4,000/acct)',
        shortExplanation: 'Up to $4,000 per Invest529/CollegeAmerica account (unlimited if age 70+).',
        ratingKey: 'adj-ira',
        size: 'sm'
    },
    {
        key: 'ut-my529-credit',
        states: ['UT'],
        section: 'credits',
        title: 'UT my529 Tax Credit',
        officialTitle: 'Form TC-40A (4.55% Credit)',
        shortExplanation: '4.55% credit on qualifying Utah my529 education savings contributions.',
        ratingKey: 'credits-aotc',
        size: 'sm'
    },
    { key: 'al-529-deduction', states: ['AL'], section: 'adjustments', title: 'AL 529 (CollegeCounts) Deduction', officialTitle: 'Form 40 • Max $5k / $10k MFJ', shortExplanation: 'Contributions to Alabama CollegeCounts 529 plan up to $5,000 ($10,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'ar-529-deduction', states: ['AR'], section: 'adjustments', title: 'AR 529 (GIFT) Deduction', officialTitle: 'AR1000F • Max $5k / $10k MFJ', shortExplanation: 'Contributions to Arkansas GIFT 529 plan up to $5,000 ($10,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'az-529-deduction', states: ['AZ'], section: 'adjustments', title: 'AZ 529 Deduction', officialTitle: 'Form 140 • Max $2k / $4k MFJ', shortExplanation: 'Arizona 529 plan contributions up to $2,000 ($4,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'ct-529-deduction', states: ['CT'], section: 'adjustments', title: 'CT CHET 529 Deduction', officialTitle: 'CT-1040 • Max $5k / $10k MFJ', shortExplanation: 'Connecticut CHET 529 contributions up to $5,000 ($10,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'ga-529-deduction', states: ['GA'], section: 'adjustments', title: 'GA Path2College 529 Deduction', officialTitle: 'Form 500 • Max $4k / $8k MFJ', shortExplanation: 'Georgia Path2College 529 contributions up to $4,000 ($8,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'id-529-deduction', states: ['ID'], section: 'adjustments', title: 'ID IDeal 529 Deduction', officialTitle: 'Form 40 • Max $6k / $12k MFJ', shortExplanation: 'Idaho IDeal 529 contributions up to $6,000 ($12,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'il-529-deduction', states: ['IL'], section: 'adjustments', title: 'IL Bright Start 529 Deduction', officialTitle: 'Schedule M • Max $10k / $20k MFJ', shortExplanation: 'Illinois 529 plan contributions up to $10,000 ($20,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'ks-529-deduction', states: ['KS'], section: 'adjustments', title: 'KS Learning Quest 529 Deduction', officialTitle: 'Form K-40 • Max $3k / $6k MFJ', shortExplanation: 'Kansas 529 contributions up to $3,000 ($6,000 MFJ) per beneficiary.', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'md-529-deduction', states: ['MD'], section: 'adjustments', title: 'MD 529 Deduction', officialTitle: 'Form 502 • Max $2,500/beneficiary', shortExplanation: 'Maryland 529 contributions up to $2,500 per beneficiary.', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'mi-529-deduction', states: ['MI'], section: 'adjustments', title: 'MI MESP 529 Deduction', officialTitle: 'Schedule 1 • Max $5k / $10k MFJ', shortExplanation: 'Michigan MESP 529 contributions up to $5,000 ($10,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'mo-529-deduction', states: ['MO'], section: 'adjustments', title: 'MO MOST 529 Deduction', officialTitle: 'MO-A • Max $8k / $16k MFJ', shortExplanation: 'Missouri MOST 529 contributions up to $8,000 ($16,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'mt-529-deduction', states: ['MT'], section: 'adjustments', title: 'MT 529 Deduction', officialTitle: 'Form 2 • Max $3k / $6k MFJ', shortExplanation: 'Montana 529 contributions up to $3,000 ($6,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'ne-529-deduction', states: ['NE'], section: 'adjustments', title: 'NE NEST 529 Deduction', officialTitle: 'Form 1040N • Max $10,000', shortExplanation: 'Nebraska NEST 529 contributions up to $10,000 ($5,000 MFS).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'nj-529-deduction', states: ['NJ'], section: 'adjustments', title: 'NJ NJBEST 529 Deduction', officialTitle: 'NJ-1040 • Max $10,000', shortExplanation: 'New Jersey NJBEST 529 contributions up to $10,000 (AGI ≤ $200k).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'ok-529-deduction', states: ['OK'], section: 'adjustments', title: 'OK 529 Deduction', officialTitle: 'Form 511 • Max $10k / $20k MFJ', shortExplanation: 'Oklahoma 529 contributions up to $10,000 ($20,000 MFJ).', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'wv-529-deduction', states: ['WV'], section: 'adjustments', title: 'WV SMART529 Deduction', officialTitle: 'Form IT-140 • 100% Deductible', shortExplanation: 'Full deduction for West Virginia SMART529 contributions.', ratingKey: 'adj-ira', size: 'sm' },
    { key: 'ga-child-care-credit', states: ['GA'], section: 'credits', title: 'GA Child & Dependent Care Credit', officialTitle: 'Form 500 • 30% of Fed Form 2441', shortExplanation: '30% of your Federal Child & Dependent Care Credit.', ratingKey: 'credits-child-care', size: 'sm' },
    { key: 'ok-child-care-credit', states: ['OK'], section: 'credits', title: 'OK Child & Dependent Care Credit', officialTitle: 'Form 511 • 20% of Fed Form 2441', shortExplanation: '20% of your Federal Child & Dependent Care Credit.', ratingKey: 'credits-child-care', size: 'sm' },
    { key: 'hi-food-renter-credit', states: ['HI'], section: 'credits', title: 'HI Food / Renter Tax Credit', officialTitle: 'Form N-11 • Schedule X', shortExplanation: 'Refundable Hawaii Food/Excise and Low-Income Renter credits.', ratingKey: 'credits-other-dependents', size: 'sm' },
    { key: 'me-property-fairness-credit', states: ['ME'], section: 'credits', title: 'ME Property Tax Fairness Credit', officialTitle: 'Form 1040ME • Schedule PTFC', shortExplanation: 'Refundable Maine credit for property tax or rent paid.', ratingKey: 'itemized-salt', size: 'sm' },
    { key: 'mo-ptc-credit', states: ['MO'], section: 'credits', title: 'MO Property Tax Credit (MO-PTC)', officialTitle: 'Form MO-PTC • Senior / Disabled', shortExplanation: 'Refundable property tax / rent credit for eligible Missouri seniors/disabled.', ratingKey: 'itemized-salt', size: 'sm' },
    { key: 'mt-elderly-homeowner-credit', states: ['MT'], section: 'credits', title: 'MT Elderly Homeowner/Renter Credit', officialTitle: 'Form 2 • Up to $1,150', shortExplanation: 'Refundable Montana credit for age 62+ homeowners and renters.', ratingKey: 'itemized-salt', size: 'sm' },
    { key: 'ne-ptc-credit', states: ['NE'], section: 'credits', title: 'NE School District Property Tax Credit', officialTitle: 'Form PTC • Refundable', shortExplanation: 'Refundable credit for Nebraska school district property taxes paid.', ratingKey: 'itemized-salt', size: 'sm' },
    { key: 'or-529-credit', states: ['OR'], section: 'credits', title: 'OR 529 Savings Credit', officialTitle: 'Form OR-40 • Up to $170 / $340', shortExplanation: 'Refundable Oregon College Savings 529 credit.', ratingKey: 'credits-aotc', size: 'sm' },
    { key: 'or-kicker-credit', states: ['OR'], section: 'credits', title: 'OR Surplus Kicker Credit', officialTitle: 'Form OR-40 • Biennial Kicker', shortExplanation: 'Oregon statutory surplus revenue kicker credit.', ratingKey: 'credits-clean-energy', size: 'sm' },
    { key: 'sc-two-wage-earner-credit', states: ['SC'], section: 'credits', title: 'SC Two-Wage Earner Credit', officialTitle: 'SC1040TC • 0.7% up to $350', shortExplanation: '0.7% credit on lower-earning spouse qualified earned income (max $350).', ratingKey: 'credits-other-dependents', size: 'sm' },
    { key: 'nc-itemized', states: ['NC'], section: 'itemized', title: 'NC Itemized Deductions', officialTitle: 'Form D-400 • Max $20k Mortgage+Prop', shortExplanation: 'NC allows Mortgage + Property Tax (capped at $20,000) + Charity.', ratingKey: 'itemized-mortgage', size: 'sm' },
    { key: 'nj-medical-2pct', states: ['NJ'], section: 'itemized', title: 'NJ Medical Expenses (>2% Gross)', officialTitle: 'NJ-1040 Line 31 • >2% Threshold', shortExplanation: 'Unreimbursed NJ medical expenses exceeding 2% of NJ gross income.', ratingKey: 'itemized-medical', size: 'sm' },
    { key: 'ri-property-relief-credit', states: ['RI'], section: 'credits', title: 'RI Property Tax Relief Credit', officialTitle: 'Form RI-1040H', shortExplanation: 'Refundable Rhode Island property tax relief credit.', ratingKey: 'itemized-salt', size: 'sm' },
    { key: 'vt-renter-rebate', states: ['VT'], section: 'credits', title: 'VT Renter Credit', officialTitle: 'Form RCC-146', shortExplanation: 'Refundable Vermont renter credit based on income and rent.', ratingKey: 'itemized-mortgage', size: 'sm' }
];
export function getStateCatalogForSection(stateCode, section) {
    const code = stateCode.toUpperCase();
    return STATE_PANEL_CATALOG.filter(entry => entry.section === section && (entry.states === '*' || entry.states.includes(code)));
}
export function getStateCatalogEntry(key) {
    return STATE_PANEL_CATALOG.find(e => e.key === key);
}
