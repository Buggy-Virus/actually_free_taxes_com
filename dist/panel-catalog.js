/**
 * Actually Free Taxes - Panel Catalog Definitions
 * Defines all Federal input panels across Other Income, Adjustments, Credits, and Itemized Deductions.
 */
export const PANEL_CATALOG = [
    // ===================== OTHER INCOME =====================
    {
        key: '1099-int',
        section: 'other-income',
        title: 'Taxable Interest',
        officialTitle: 'Form 1099-INT • Box 1',
        shortExplanation: 'Bank savings, CD, and money market interest reported on Form 1099-INT.',
        ratingKey: 'other-interest',
        size: 'sm',
        defaultOpen: true,
        inputIds: ['input-other-interest']
    },
    {
        key: '1099-div',
        section: 'other-income',
        title: 'Dividends & Distributions',
        officialTitle: 'Form 1099-DIV • Boxes 1a & 1b',
        shortExplanation: 'Ordinary and qualified stock/ETF dividends from brokerage accounts.',
        ratingKey: 'income-1099-div',
        size: 'lg',
        sourceType: '1099-DIV',
        inputIds: []
    },
    {
        key: '1099-nec',
        section: 'other-income',
        title: 'Freelance / Self-Employment',
        officialTitle: 'Form 1099-NEC • Box 1 (Schedule C)',
        shortExplanation: 'Independent contractor, gig work, or consulting income (subject to SE tax).',
        ratingKey: 'income-1099-nec',
        size: 'lg',
        sourceType: '1099-NEC',
        inputIds: []
    },
    {
        key: 'schedule-c-expenses',
        section: 'other-income',
        title: 'Business Expenses',
        officialTitle: 'Schedule C • Part II Expenses',
        shortExplanation: 'Deductible business costs that directly offset your 1099-NEC freelance income.',
        ratingKey: 'sched-c-expenses',
        size: 'sm',
        inputIds: ['input-sched-c-expenses']
    },
    {
        key: 'capital-gains',
        section: 'other-income',
        title: 'Capital Gains & Losses',
        officialTitle: 'Schedule D / Form 8949 • Line 7',
        shortExplanation: 'Net short-term and long-term investment gains or losses (losses capped at -$3,000/yr).',
        ratingKey: 'capital-gains',
        size: 'full',
        inputIds: ['input-capital-gains-st', 'input-capital-gains-lt', 'input-cap-collectibles', 'input-cap-1250']
    },
    {
        key: 'sched-c-businesses',
        section: 'other-income',
        title: 'Self-Employment Businesses',
        officialTitle: 'Schedule C • One per business',
        shortExplanation: 'Each business with its receipts, expense categories, business miles (standard rate) and simplified home office. 1099-NEC/K income is added on top.',
        ratingKey: 'schedule-c-expenses',
        size: 'full',
        inputIds: []
    },
    {
        key: 'form-8949-transactions',
        section: 'other-income',
        title: 'Stock & Investment Sales',
        officialTitle: 'Form 8949 • Schedule D',
        shortExplanation: 'Each sale from your 1099-B: proceeds, basis and any adjustment (such as a wash-sale loss). Totals flow to Schedule D with the net amounts entered elsewhere.',
        ratingKey: 'capital-gains',
        size: 'full',
        inputIds: []
    },
    {
        key: 'rental-properties',
        section: 'other-income',
        title: 'Rental Properties',
        officialTitle: 'Schedule E Part I • Form 4562',
        shortExplanation: 'Each property with rents and expenses. Leave depreciation blank to compute 27.5-year straight line from the building basis. Personal-use days apply the vacation-home rules.',
        ratingKey: 'schedule-e-rental',
        size: 'full',
        inputIds: []
    },
    {
        key: 'advanced-federal',
        section: 'other-income',
        title: 'Less Common Federal Items',
        officialTitle: 'Forms 8606, 4797, 8995-A, 6251, 8615 • Line 36',
        shortExplanation: 'IRA basis and Roth conversions, business property sales, QBI wage limits above the threshold, AMT preferences, the kiddie tax, and applying a refund to next year.',
        ratingKey: 'capital-gains',
        size: 'full',
        inputIds: []
    },
    {
        key: 'special-situations',
        section: 'other-income',
        title: 'Situations This App Does Not Handle',
        officialTitle: 'Detect & refer',
        shortExplanation: 'Check anything that applies so the Review card can point you to the right form or a professional.',
        ratingKey: 'capital-gains',
        size: 'full',
        inputIds: []
    },
    {
        key: 'prior-year-carryovers',
        section: 'other-income',
        title: 'Carryovers From Last Year',
        officialTitle: 'Capital loss, passive loss, charity, NOL, Form 8801 and more',
        shortExplanation: "Amounts last year's return carried forward. Each is applied with its own limit this year.",
        ratingKey: 'capital-gains',
        size: 'full',
        inputIds: []
    },
    {
        key: 'home-sale-121',
        section: 'other-income',
        title: 'Sale of Your Main Home',
        officialTitle: 'IRC §121 • Form 8949 code H / Schedule D',
        shortExplanation: 'Up to $250,000 of gain ($500,000 joint) is excluded if you owned and lived in the home 2 of the last 5 years. The rest is a long-term capital gain.',
        ratingKey: 'capital-gains',
        size: 'full',
        inputIds: ['input-home-sale-gain']
    },
    {
        key: 'schedule-e-rental',
        section: 'other-income',
        title: 'Rental Real Estate',
        officialTitle: 'Schedule E • Part I / Form 4562',
        shortExplanation: 'Gross rental income, operating expenses, MACRS depreciation, and property state.',
        ratingKey: 'sched-e-rental',
        size: 'full',
        inputIds: ['input-sched-e-rents', 'input-sched-e-expenses', 'input-sched-e-depreciation', 'select-sched-e-state']
    },
    {
        key: '1099-r',
        section: 'other-income',
        title: 'Retirement Distributions',
        officialTitle: 'Form 1099-R • Box 2a',
        shortExplanation: 'Taxable distributions from 401(k), IRA, pension, or annuity plans.',
        ratingKey: 'income-1099-r',
        size: 'lg',
        sourceType: '1099-R',
        inputIds: []
    },
    {
        key: 'ssa-1099',
        section: 'other-income',
        title: 'Social Security Benefits',
        officialTitle: 'Form SSA-1099 • Box 5',
        shortExplanation: 'Gross Social Security benefits (0% to 85% taxable based on provisional income).',
        ratingKey: 'income-ssa-1099',
        size: 'sm',
        sourceType: 'SSA-1099',
        inputIds: []
    },
    {
        key: 'schedule-k1',
        section: 'other-income',
        title: 'Partnership / S-Corp K-1',
        officialTitle: 'Schedule K-1 (Form 1065 / 1120-S)',
        shortExplanation: 'Pass-through business income eligible for 20% QBI deduction.',
        ratingKey: 'income-k1',
        size: 'lg',
        sourceType: 'Schedule K-1',
        inputIds: []
    },
    {
        key: '1099-misc',
        section: 'other-income',
        title: 'Miscellaneous Income',
        officialTitle: 'Form 1099-MISC • Box 3',
        shortExplanation: 'Prizes, awards, royalties, or other miscellaneous taxable income.',
        ratingKey: 'income-1099-misc',
        size: 'sm',
        sourceType: '1099-MISC',
        inputIds: []
    },
    {
        key: '1099-g',
        section: 'other-income',
        title: 'Unemployment & Gov Payments',
        officialTitle: 'Form 1099-G • Box 1',
        shortExplanation: 'Unemployment compensation or taxable state/local tax refunds.',
        ratingKey: 'income-1099-g',
        size: 'sm',
        sourceType: '1099-G',
        inputIds: []
    },
    {
        key: 'w-2g',
        section: 'other-income',
        title: 'Gambling Winnings',
        officialTitle: 'Form W-2G • Box 1',
        shortExplanation: 'Reportable casino, sportsbook, or lottery winnings.',
        ratingKey: 'income-w2g',
        size: 'sm',
        sourceType: 'W-2G',
        inputIds: []
    },
    // ===================== ADJUSTMENTS =====================
    {
        key: 'adj-student-loan',
        section: 'adjustments',
        title: 'Student Loan Interest',
        officialTitle: 'Schedule 1 • Line 21 (Form 1098-E)',
        shortExplanation: 'Above-the-line deduction for qualified student loan interest paid (up to $2,500).',
        ratingKey: 'adj-student-loan',
        size: 'sm',
        inputIds: ['input-adj-student-loan']
    },
    {
        key: 'adj-ira',
        section: 'adjustments',
        title: 'Traditional IRA Contribution',
        officialTitle: 'Schedule 1 • Line 20 (Form 5498)',
        shortExplanation: 'Tax-deductible contributions to a Traditional IRA.',
        ratingKey: 'adj-ira',
        size: 'sm',
        inputIds: ['input-adj-ira']
    },
    {
        key: 'adj-hsa',
        section: 'adjustments',
        title: 'HSA Contributions',
        officialTitle: 'Form 8889 • Schedule 1 Line 13',
        shortExplanation: 'Out-of-pocket Health Savings Account contributions (triple tax-advantaged).',
        ratingKey: 'adj-hsa',
        size: 'sm',
        inputIds: ['input-adj-hsa']
    },
    {
        key: 'adj-educator',
        section: 'adjustments',
        title: 'Educator Expenses',
        officialTitle: 'Schedule 1 • Line 11',
        shortExplanation: 'Out-of-pocket classroom supplies for K-12 teachers (up to $300 / $600 MFJ).',
        ratingKey: 'adj-educator',
        size: 'sm',
        inputIds: ['input-adj-educator']
    },
    {
        key: 'adj-se-retirement',
        section: 'adjustments',
        title: 'SEP / Solo 401(k)',
        officialTitle: 'Schedule 1 • Line 16',
        shortExplanation: 'Self-employed retirement plan contributions (SEP IRA, SIMPLE, Solo 401k).',
        ratingKey: 'adj-se-retirement',
        size: 'sm',
        inputIds: ['input-adj-se-retirement']
    },
    {
        key: 'adj-se-health',
        section: 'adjustments',
        title: 'SE Health Insurance',
        officialTitle: 'Schedule 1 • Line 17 (Form 7206)',
        shortExplanation: 'Health insurance premiums paid while self-employed.',
        ratingKey: 'adj-se-health',
        size: 'sm',
        inputIds: ['input-adj-se-health']
    },
    {
        key: 'adj-alimony',
        section: 'adjustments',
        title: 'Alimony Paid (Pre-2019)',
        officialTitle: 'Schedule 1 • Line 19a',
        shortExplanation: 'Deductible alimony under divorce agreements executed before 2019.',
        ratingKey: 'adj-alimony',
        size: 'sm',
        inputIds: ['input-adj-alimony']
    },
    // ===================== CREDITS =====================
    {
        key: 'cred-dependents-list',
        section: 'credits',
        title: 'Dependents (Details)',
        officialTitle: 'Form 1040 • Dependents • Schedule 8812 / EIC / Form 2441',
        shortExplanation: 'Add each dependent with birth year, relationship and months lived with you. The qualifying-child and qualifying-relative tests for the Child Tax Credit, EITC and child care credit are then applied automatically.',
        ratingKey: 'cred-children',
        size: 'lg',
        defaultOpen: true,
        inputIds: []
    },
    {
        key: 'cred-children',
        section: 'credits',
        title: 'Qualifying Children (<17)',
        officialTitle: 'Form 1040 • Line 19 / Schedule 8812',
        shortExplanation: 'Up to $2,000 Child Tax Credit per qualifying child under age 17.',
        ratingKey: 'credits-children',
        size: 'sm',
        inputIds: ['input-children-count']
    },
    {
        key: 'cred-other-dependents',
        section: 'credits',
        title: 'Other Dependents',
        officialTitle: 'Form 1040 • Line 19 ($500 ODC)',
        shortExplanation: '$500 credit for older children (17+), college students, or dependent relatives.',
        ratingKey: 'credits-other-dependents',
        size: 'sm',
        inputIds: ['input-other-dependents']
    },
    {
        key: 'cred-age-blind',
        section: 'credits',
        title: 'Age 65+ or Blind',
        officialTitle: 'Form 1040 • Standard Deduction Boxes',
        shortExplanation: 'Adds $1,550–$1,950 per checked box to your Standard Deduction.',
        ratingKey: 'credits-age-blind',
        size: 'sm',
        inputIds: ['input-age65-blind']
    },
    {
        key: 'cred-child-care',
        section: 'credits',
        title: 'Child & Dependent Care',
        officialTitle: 'Form 2441 • Schedule 3 Line 2',
        shortExplanation: '20%–35% credit on daycare/after-school expenses (up to $3k / $6k).',
        ratingKey: 'credits-child-care',
        size: 'sm',
        inputIds: ['input-child-care']
    },
    {
        key: 'cred-aotc',
        section: 'credits',
        title: 'American Opportunity Credit',
        officialTitle: 'Form 8863 • AOTC (40% Refundable)',
        shortExplanation: 'Up to $2,500/student for first 4 years of college tuition.',
        ratingKey: 'credits-aotc',
        size: 'sm',
        inputIds: ['input-edu-aotc']
    },
    {
        key: 'cred-llc',
        section: 'credits',
        title: 'Lifetime Learning Credit',
        officialTitle: 'Form 8863 • LLC (Up to $2,000)',
        shortExplanation: '20% credit on up to $10,000 of graduate or continuing education tuition.',
        ratingKey: 'credits-llc',
        size: 'sm',
        inputIds: ['input-edu-llc']
    },
    {
        key: 'cred-foreign-tax',
        section: 'credits',
        title: 'Foreign Tax Credit',
        officialTitle: 'Form 1116 • Schedule 3 Line 1',
        shortExplanation: 'Dollar-for-dollar credit for foreign income taxes paid on investments.',
        ratingKey: 'credits-foreign-tax',
        size: 'sm',
        inputIds: ['input-foreign-tax-credit', 'input-foreign-source-income']
    },
    {
        key: 'cred-clean-energy',
        section: 'credits',
        title: 'Clean Energy & EV Credit',
        officialTitle: 'Form 5695 / Form 8936',
        shortExplanation: 'Credits for residential solar/heat pumps or qualifying electric vehicles.',
        ratingKey: 'credits-clean-energy',
        size: 'sm',
        inputIds: ['input-clean-energy-credit']
    },
    {
        key: 'cred-estimated-payments',
        section: 'credits',
        title: 'Estimated Tax Payments',
        officialTitle: 'Form 1040-ES • Line 26',
        shortExplanation: 'Quarterly estimated federal tax payments already sent to the IRS.',
        ratingKey: 'credits-estimated-payments',
        size: 'sm',
        inputIds: ['input-estimated-payments']
    },
    // ===================== ITEMIZED DEDUCTIONS =====================
    {
        key: 'itemized-medical',
        section: 'itemized',
        title: 'Medical & Dental Expenses',
        officialTitle: 'Schedule A • Lines 1–4 (>7.5% AGI)',
        shortExplanation: 'Unreimbursed medical/dental costs; only the amount exceeding 7.5% of AGI is deductible.',
        ratingKey: 'itemized-medical',
        size: 'sm',
        inputIds: ['input-itemized-medical']
    },
    {
        key: 'itemized-real-estate',
        section: 'itemized',
        title: 'Real Estate & Property Tax',
        officialTitle: 'Schedule A • Line 5b (SALT $10k Cap)',
        shortExplanation: 'Property taxes paid on your home (combined with state income tax, capped at $10,000).',
        ratingKey: 'itemized-salt',
        size: 'sm',
        inputIds: ['input-itemized-real-estate']
    },
    {
        key: 'itemized-mortgage',
        section: 'itemized',
        title: 'Mortgage Interest',
        officialTitle: 'Schedule A • Line 8a (Form 1098)',
        shortExplanation: 'Home mortgage interest paid on up to $750k of acquisition debt.',
        ratingKey: 'itemized-mortgage',
        size: 'sm',
        inputIds: ['input-itemized-mortgage']
    },
    {
        key: 'itemized-charity',
        section: 'itemized',
        title: 'Charitable Donations',
        officialTitle: 'Schedule A • Lines 11–14',
        shortExplanation: 'Cash and non-cash donations to qualified 501(c)(3) charities.',
        ratingKey: 'itemized-charity',
        size: 'sm',
        inputIds: ['input-itemized-charity']
    },
    {
        key: 'itemized-gambling-losses',
        section: 'itemized',
        title: 'Gambling Losses',
        officialTitle: 'Schedule A • Line 16 (Up to W-2G)',
        shortExplanation: 'Documented gambling losses deductible only up to your reported W-2G winnings.',
        ratingKey: 'itemized-gambling',
        size: 'sm',
        inputIds: ['input-itemized-gambling-losses']
    },
    {
        key: 'itemized-investment-interest',
        section: 'itemized',
        title: 'Investment Interest Expense',
        officialTitle: 'Form 4952 • Schedule A Line 9',
        shortExplanation: 'Margin interest on investment loans, deductible up to net investment income.',
        ratingKey: 'itemized-mortgage',
        size: 'sm',
        inputIds: ['input-itemized-investment-interest']
    },
    {
        key: 'itemized-casualty',
        section: 'itemized',
        title: 'Disaster Casualty Losses',
        officialTitle: 'Form 4684 • Schedule A Line 15',
        shortExplanation: 'Losses from a federally declared disaster (excess of $100 / 10% AGI floor).',
        ratingKey: 'itemized-charity',
        size: 'sm',
        inputIds: ['input-itemized-casualty']
    },
    {
        key: '1099-k',
        section: 'other-income',
        title: 'Payment Card / 1099-K',
        officialTitle: 'Form 1099-K • Third-Party Network',
        shortExplanation: 'Gross business/marketplace payments received via Stripe, PayPal, Venmo, or eBay.',
        ratingKey: 'income-1099-nec',
        size: 'sm',
        sourceType: '1099-K',
        inputIds: []
    },
    {
        key: 'sched-f-farm',
        section: 'other-income',
        title: 'Farm Income & Expenses',
        officialTitle: 'Schedule F • Net Farm Profit',
        shortExplanation: 'Net agricultural income subject to Schedule SE self-employment tax and 20% QBI.',
        ratingKey: 'income-1099-nec',
        size: 'sm',
        sourceType: 'Schedule F',
        inputIds: []
    },
    {
        key: 'alimony-received',
        section: 'other-income',
        title: 'Alimony Received (Pre-2019)',
        officialTitle: 'Schedule 1 • Line 2a',
        shortExplanation: 'Taxable alimony received under divorce/separation agreements executed before 2019.',
        ratingKey: 'adj-alimony',
        size: 'sm',
        inputIds: ['input-alimony-received']
    },
    {
        key: 'foreign-earned-income-2555',
        section: 'other-income',
        title: 'Foreign Earned Income Excl.',
        officialTitle: 'Form 2555 • Schedule 1 Line 8d',
        shortExplanation: 'Exclusion up to $126,500 (2024) / $130,000 (2025) for qualifying expat earned income.',
        ratingKey: 'credits-foreign-tax',
        size: 'sm',
        inputIds: ['input-foreign-earned-excl']
    },
    {
        key: 'unreported-tips-4137',
        section: 'other-income',
        title: 'Unreported Tip Income',
        officialTitle: 'Form 4137 • Line 1a / Sched 2',
        shortExplanation: 'Tips not reported to your employer; adds to wages and triggers 7.65% SS/Medicare tax.',
        ratingKey: 'w2-box1',
        size: 'sm',
        inputIds: ['input-unreported-tips']
    },
    {
        key: 'adj-military-moving',
        section: 'adjustments',
        title: 'Military Moving Expenses',
        officialTitle: 'Form 3903 • Schedule 1 Line 14',
        shortExplanation: 'Unreimbursed moving expenses for active-duty Armed Forces PCS orders.',
        ratingKey: 'adj-educator',
        size: 'sm',
        inputIds: ['input-adj-military-moving']
    },
    {
        key: 'adj-early-withdrawal-penalty',
        section: 'adjustments',
        title: 'Early Savings Withdrawal Penalty',
        officialTitle: 'Schedule 1 • Line 18 (1099-INT Box 2)',
        shortExplanation: 'Penalty forfeited on early withdrawal from a CD or time savings account.',
        ratingKey: 'other-interest',
        size: 'sm',
        inputIds: ['input-adj-early-withdrawal']
    },
    {
        key: 'cred-prior-year-safe-harbor',
        section: 'credits',
        title: 'Last Year\'s Tax (Estimated Tax Safe Harbor)',
        officialTitle: 'Form 2210 • Required Annual Payment',
        shortExplanation: 'Enter last year\'s total tax and AGI to check whether your withholding and estimated payments avoid an underpayment penalty (100% of last year\'s tax, or 110% if AGI was over $150,000).',
        ratingKey: 'cred-estimated-payments',
        size: 'sm',
        inputIds: ['input-prior-year-tax', 'input-prior-year-agi']
    },
    {
        key: 'sched1a-tips',
        section: 'adjustments',
        title: 'No Tax on Tips (2025–2028)',
        officialTitle: 'Schedule 1-A • Qualified Tips Deduction',
        shortExplanation: 'Up to $25,000 of qualified tips in a listed tipped occupation; phases out above $150,000 MAGI ($300,000 joint). Married couples must file jointly.',
        ratingKey: 'adj-educator',
        size: 'sm',
        inputIds: ['input-sched1a-tips']
    },
    {
        key: 'sched1a-overtime',
        section: 'adjustments',
        title: 'No Tax on Overtime (2025–2028)',
        officialTitle: 'Schedule 1-A • Qualified Overtime Deduction',
        shortExplanation: 'The premium ("half") portion of FLSA overtime pay, up to $12,500 ($25,000 joint); phases out above $150,000 MAGI ($300,000 joint).',
        ratingKey: 'adj-educator',
        size: 'sm',
        inputIds: ['input-sched1a-overtime']
    },
    {
        key: 'sched1a-car-loan',
        section: 'adjustments',
        title: 'Car Loan Interest (2025–2028)',
        officialTitle: 'Schedule 1-A • Qualified Passenger Vehicle Loan Interest',
        shortExplanation: 'Interest on a loan taken after 2024 for a new personal vehicle assembled in the US, up to $10,000; phases out above $100,000 MAGI ($200,000 joint).',
        ratingKey: 'adj-educator',
        size: 'sm',
        inputIds: ['input-sched1a-car-loan']
    },
    {
        key: 'sched1a-senior',
        section: 'adjustments',
        title: 'Senior Deduction (2025–2028)',
        officialTitle: 'Schedule 1-A • Enhanced Deduction for Seniors',
        shortExplanation: '$6,000 for each taxpayer or spouse age 65 or older, reduced by 6% of MAGI over $75,000 ($150,000 joint). Available whether or not you itemize.',
        ratingKey: 'adj-educator',
        size: 'sm',
        inputIds: ['input-sched1a-seniors']
    },
    {
        key: 'adj-jury-duty',
        section: 'adjustments',
        title: 'Jury Duty Pay Remitted',
        officialTitle: 'Schedule 1 • Line 24a',
        shortExplanation: 'Jury duty pay turned over to your employer while receiving regular salary.',
        ratingKey: 'adj-educator',
        size: 'sm',
        inputIds: ['input-adj-jury-duty']
    },
    {
        key: 'cred-adoption',
        section: 'credits',
        title: 'Adoption Credit',
        officialTitle: 'Form 8839 • Schedule 3 Line 6c',
        shortExplanation: 'Qualified adoption expenses credit up to $16,810 (2024) / $17,280 (2025).',
        ratingKey: 'credits-children',
        size: 'sm',
        inputIds: ['input-adoption-credit']
    },
    {
        key: 'cred-ptc-8962',
        section: 'credits',
        title: 'Premium Tax Credit (ACA)',
        officialTitle: 'Form 8962 • Schedule 3 Line 9',
        shortExplanation: 'Refundable net Health Insurance Marketplace credit from Form 1095-A.',
        ratingKey: 'credits-clean-energy',
        size: 'sm',
        inputIds: ['input-ptc-credit']
    },
    {
        key: 'cred-elderly-sched-r',
        section: 'credits',
        title: 'Elderly or Disabled Credit',
        officialTitle: 'Schedule R • Schedule 3 Line 6d',
        shortExplanation: 'Nonrefundable credit for low-income taxpayers age 65+ or permanently disabled.',
        ratingKey: 'credits-age-blind',
        size: 'sm',
        inputIds: ['input-elderly-credit']
    },
    {
        key: 'cred-1095a',
        section: 'credits',
        title: 'Marketplace Health Insurance (1095-A)',
        officialTitle: 'Form 8962 • Premium Tax Credit',
        shortExplanation: 'Annual totals from each Form 1095-A. The credit is figured from household income and reconciled with advance payments; any excess is repaid.',
        ratingKey: 'credits-child-care',
        size: 'full',
        inputIds: []
    },
    {
        key: 'sched-h-household',
        section: 'credits',
        title: 'Household Employment Tax',
        officialTitle: 'Schedule H • Schedule 2 Line 9',
        shortExplanation: 'FICA & FUTA taxes owed for a nanny, housekeeper, or household employee.',
        ratingKey: 'credits-child-care',
        size: 'sm',
        inputIds: ['input-household-wages', 'input-household-tax']
    }
];
export function getPanelCatalogEntry(key) {
    return PANEL_CATALOG.find(p => p.key === key);
}
