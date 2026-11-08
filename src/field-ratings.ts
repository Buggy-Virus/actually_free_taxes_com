/**
 * Actually Free Taxes - Field Ratings & IRS Risk Assessment Engine
 *
 * Communicates:
 * 1. Importance: If you leave it blank, will there be an issue?
 * 2. High Risk: Will the IRS be upset if you get the field incorrect?
 * 3. Savings Potential: How much can this field potentially save you in cash?
 * 4. Applicability / Frequency: How common or niche is this field across taxpayers?
 * 5. Action Verdict: Must be 100% accurate vs. can be safely ignored if blank.
 */

import { FieldRatingDefinition } from './types.js';

export const FIELD_RATINGS: Record<string, FieldRatingDefinition> = {
  // W-2 BOX 1: WAGES
  'w2-box1': {
    fieldKey: 'w2-box1',
    fieldTitle: 'Wages, tips, other compensation',
    formName: 'Form W-2 • Box 1',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Critical (4/4)',
    importanceDescription: 'Required by law. If left blank or $0 when you earned income, your electronic tax return will be rejected or flagged for missing wage schedules.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High Risk (3/3)',
    irsRiskDescription: 'Extremely high. Your employer transmits Copy A directly to the Social Security Administration and IRS. IRS automated CP2000 computer matching flags even a $1 difference, generating automated deficiency bills plus a 20% accuracy penalty.',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'No Direct Savings (Income Base)',
    savingsDescription: 'This establishes your gross taxable income base. Accurately entering this prevents overpaying tax on phantom dollars.',
    applicability: 'common',
    applicabilityScore: 4,
    applicabilityPercent: '100% of W-2 Filers',
    applicabilityLabel: 'Universal (100%)',
    applicabilityDescription: 'Every single Form W-2 issued in the United States has Box 1 completed.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST BE 100% ACCURATE',
    plainEnglishVerdict: 'Non-negotiable. Copy the exact cents from Box 1 of your paper/PDF W-2. The IRS computer cross-checks this automatically.'
  },

  // W-2 BOX 2: FEDERAL WITHHOLDING
  'w2-box2': {
    fieldKey: 'w2-box2',
    fieldTitle: 'Federal income tax withheld',
    formName: 'Form W-2 • Box 2',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Critical (4/4)',
    importanceDescription: 'If you leave this blank or $0, the IRS will calculate your taxes assuming you paid $0 in advance, and will demand you pay all taxes again with interest!',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High Risk (3/3)',
    irsRiskDescription: 'High. The IRS cross-checks withholding deposits against employer 941 filings. Over-reporting withholding triggers anti-fraud refund freeze filters and manual audit examination.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Maximum Cash Impact ($$$$)',
    savingsDescription: 'Every single dollar entered here is a 100% dollar-for-dollar refundable prepayment that directly boosts your refund check or eliminates tax owed.',
    applicability: 'common',
    applicabilityScore: 4,
    applicabilityPercent: '98% of W-2 Filers',
    applicabilityLabel: 'Universal (98%)',
    applicabilityDescription: 'Nearly all employers withhold federal income taxes unless you claimed tax-exempt on Form W-4.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST BE 100% ACCURATE • CASH REFUND',
    plainEnglishVerdict: 'Critical refund driver! Double check every digit against Box 2. Entering this correctly is how you claim back the money already deducted from your paychecks.'
  },

  // W-2 BOX 3 & 4: SOCIAL SECURITY WAGES & TAX
  'w2-box3': {
    fieldKey: 'w2-box3',
    fieldTitle: 'Social security wages & tax withheld',
    formName: 'Form W-2 • Boxes 3 & 4',
    importance: 'optional',
    importanceScore: 2,
    importanceLabel: 'Informational (2/4)',
    importanceDescription: 'For most single-job filers, leaving Box 3/4 unadjusted does not change your federal income tax refund. The IRS uses this primarily to credit your SSA retirement earnings record.',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low Risk (1/3)',
    irsRiskDescription: 'Low audit risk for normal filers. Social Security is a flat 6.2% statutory tax up to the annual wage cap ($168,600 in 2024). Discrepancies are handled by payroll reconciliations, not personal audits.',
    savingsPotential: 'medium',
    savingsScore: 2,
    savingsLabel: 'Conditional ($$ if Multiple Jobs)',
    savingsDescription: 'Only saves money if you worked 2+ jobs and your combined wages exceeded $168,600. In that case, excess SS tax withheld is refunded as a tax credit on Schedule 3 Line 11.',
    applicability: 'common',
    applicabilityScore: 3,
    applicabilityPercent: '95% of W-2 Filers',
    applicabilityLabel: 'Common on W-2 (Niche Impact)',
    applicabilityDescription: 'Present on almost all W-2s, but the tax impact is completely passive unless you held multiple jobs exceeding $168k.',
    recommendation: 'safe_to_ignore',
    recommendationTag: 'SAFE TO SKIP IF 1 JOB UNDER $168K',
    plainEnglishVerdict: 'If you had one job or made under $168,600, this has 0 impact on your federal income tax refund. Copy it if you want, but don’t stress over it.'
  },

  // W-2 BOX 5 & 6: MEDICARE WAGES & TAX
  'w2-box5': {
    fieldKey: 'w2-box5',
    fieldTitle: 'Medicare wages and tips / tax withheld',
    formName: 'Form W-2 • Boxes 5 & 6',
    importance: 'optional',
    importanceScore: 2,
    importanceLabel: 'Informational (2/4)',
    importanceDescription: 'Informational for 90% of filers. Only activates calculation logic if your earnings exceed the Additional Medicare Tax threshold ($200k Single / $250k Married).',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low Risk (1/3)',
    irsRiskDescription: 'Low audit risk. Medicare tax is a flat 1.45% payroll tax with no wage ceiling.',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'None ($0 Savings)',
    savingsDescription: 'Medicare tax is statutory and non-refundable. It does not reduce your regular income tax.',
    applicability: 'common',
    applicabilityScore: 3,
    applicabilityPercent: '99% of W-2 Filers',
    applicabilityLabel: 'Common on W-2 (Rare Impact)',
    applicabilityDescription: 'Printed on almost every W-2, but only affects taxes if you earn over $200,000.',
    recommendation: 'safe_to_ignore',
    recommendationTag: 'SAFE TO SKIP UNLESS EARNING >$200K',
    plainEnglishVerdict: 'Does not alter your refund unless your income is above $200,000 (where Form 8959 0.9% Additional Medicare Tax kicks in). Safe to leave as pre-filled.'
  },

  // W-2 BOX 12: BENEFIT CODES
  'w2-box12': {
    fieldKey: 'w2-box12',
    fieldTitle: 'Box 12 Deferred Compensation & Benefits',
    formName: 'Form W-2 • Box 12 (Codes D, W, DD, etc.)',
    importance: 'recommended',
    importanceScore: 2,
    importanceLabel: 'Recommended (2/4)',
    importanceDescription: 'If blank on your paper W-2, leave it blank! Only enter if your employer printed a letter code (e.g. Code D for 401(k), Code W for HSA, Code DD for employer health coverage).',
    irsRisk: 'medium',
    irsRiskScore: 2,
    irsRiskLabel: 'Medium Risk (2/3)',
    irsRiskDescription: 'Code W (HSA employer contributions) is cross-checked against Form 8889. Code DD (health cost) is purely informational under the ACA and ignored by IRS auditors.',
    savingsPotential: 'medium',
    savingsScore: 2,
    savingsLabel: 'Indirect Savings ($$)',
    savingsDescription: 'Code D (401k) contributions were already subtracted from your Box 1 wages before your W-2 was printed.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '45% of Filers',
    applicabilityLabel: 'Moderate (45%)',
    applicabilityDescription: 'Only applies to employees enrolled in workplace retirement plans, HSAs, or employer health insurance.',
    recommendation: 'verify_paper',
    recommendationTag: 'COPY ONLY IF ON PAPER W-2',
    plainEnglishVerdict: 'Look at Box 12 on your paper W-2. If it is empty, leave it completely blank! Do not invent codes.'
  },

  // W-2 BOX 15: STATE
  'w2-box15-state': {
    fieldKey: 'w2-box15-state',
    fieldTitle: 'State postal code',
    formName: 'Form W-2 • Box 15',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Critical for State (4/4)',
    importanceDescription: 'Tells the system which state tax department you owe or are owed a refund from. If wrong, your state return cannot be filed.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High State DOR Risk (3/3)',
    irsRiskDescription: 'State Departments of Revenue cross-check employer withholding transcripts. Selecting the wrong state causes mismatched state records and delayed state refunds.',
    savingsPotential: 'medium',
    savingsScore: 2,
    savingsLabel: 'Crucial for State Tax ($$)',
    savingsDescription: 'Determines whether you get credit for state taxes paid or owe resident state taxes.',
    applicability: 'common',
    applicabilityScore: 3,
    applicabilityPercent: '88% of Filers',
    applicabilityLabel: 'Common (88%)',
    applicabilityDescription: 'Applies in all 41 states with wage income taxes. If you live in TX, FL, WA, NV, TN, SD, WY, or AK, state tax is 0%.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST BE 100% ACCURATE',
    plainEnglishVerdict: 'Select the exact 2-letter state where your employer withheld tax. If you live in a no-income-tax state (like TX or FL), you will owe $0 state tax.'
  },

  // W-2 BOX 15: EMPLOYER STATE ID
  'w2-box15-stateId': {
    fieldKey: 'w2-box15-stateId',
    fieldTitle: "Employer's state ID number",
    formName: 'Form W-2 • Box 15 (State ID)',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Niche / Administrative (1/4)',
    importanceDescription: 'Used by state revenue computers to credit your employer’s withholding account. Many state e-file systems accept placeholder IDs or ignore formatting dashes.',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low Risk (1/3)',
    irsRiskDescription: 'The IRS does not inspect state IDs. State tax agencies rarely reject returns over a minor formatting typo in the employer state ID.',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'No Savings Impact ($0)',
    savingsDescription: 'Administrative identifier only; does not affect your dollar calculation.',
    applicability: 'common',
    applicabilityScore: 3,
    applicabilityPercent: '85% of Filers',
    applicabilityLabel: 'Common on Forms (85%)',
    applicabilityDescription: 'Printed on most state W-2s, but carries low consequence.',
    recommendation: 'safe_to_ignore',
    recommendationTag: 'SAFE TO SKIP IF UNCLEAR',
    plainEnglishVerdict: 'Safe to leave blank or approximate if missing. It is just an administrative tracking number for your employer’s state account.'
  },

  // W-2 BOX 16: STATE WAGES
  'w2-box16': {
    fieldKey: 'w2-box16',
    fieldTitle: 'State wages, tips, etc.',
    formName: 'Form W-2 • Box 16',
    importance: 'important',
    importanceScore: 3,
    importanceLabel: 'Important for State (3/4)',
    importanceDescription: 'Establishes state taxable income. Usually identical to Box 1 unless you moved states mid-year or have state-specific pre-tax differences.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High State Risk (3/3)',
    irsRiskDescription: 'State tax authorities compare Box 16 to Box 1. Unexplained discrepancies trigger state audit inquiries.',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'Tax Base ($0 Direct Savings)',
    savingsDescription: 'Determines state income baseline. Accurately splitting wages across states prevents double state taxation.',
    applicability: 'common',
    applicabilityScore: 3,
    applicabilityPercent: '88% of Filers',
    applicabilityLabel: 'Common (88%)',
    applicabilityDescription: 'Standard on all state W-2s except in the 9 no-income-tax states.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST MATCH PAPER W-2',
    plainEnglishVerdict: 'Usually identical to Box 1. If you worked in multiple states, check that the sum of all Box 16 lines equals your total wages.'
  },

  // W-2 BOX 17: STATE WITHHOLDING
  'w2-box17': {
    fieldKey: 'w2-box17',
    fieldTitle: 'State income tax withheld',
    formName: 'Form W-2 • Box 17',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Critical for State (4/4)',
    importanceDescription: 'This is the money you already paid to your state. Leaving it blank forces you to pay your entire state tax bill over again with $0 credit!',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High State DOR Risk (3/3)',
    irsRiskDescription: 'State tax departments verify this dollar-for-dollar. Over-reporting triggers immediate refund suspension.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Maximum State Refund ($$$$)',
    savingsDescription: 'Every single dollar entered here comes directly back to you as state tax credit or a state refund check.',
    applicability: 'common',
    applicabilityScore: 3,
    applicabilityPercent: '88% of Filers',
    applicabilityLabel: 'Common (88%)',
    applicabilityDescription: 'Found on all W-2s from states with an income tax.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST BE 100% ACCURATE • STATE REFUND',
    plainEnglishVerdict: 'Vital for your state refund! Enter the exact dollars and cents from Box 17. Leaving it blank throws away your state refund.'
  },

  // W-2 BOXES 18, 19, 20: LOCAL TAX
  'w2-box18-20': {
    fieldKey: 'w2-box18-20',
    fieldTitle: 'Local wages, tax & locality name',
    formName: 'Form W-2 • Boxes 18, 19 & 20',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Niche / Optional (1/4)',
    importanceDescription: 'Only relevant if you live or work in specific cities or school districts with local income tax (e.g. NYC, Philadelphia, Detroit, Ohio municipalities, or specific union dues jurisdictions).',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low Federal Risk (1/3)',
    irsRiskDescription: 'The federal IRS does not enforce local city taxes. City tax bureaus manage their own local return filings.',
    savingsPotential: 'low',
    savingsScore: 1,
    savingsLabel: 'Local Credit Only ($)',
    savingsDescription: 'Provides credit against city income tax (like NYC resident tax).',
    applicability: 'niche',
    applicabilityScore: 1,
    applicabilityPercent: '12% of US Filers',
    applicabilityLabel: 'Niche / Rare (12%)',
    applicabilityDescription: 'Over 88% of American workers do not live or work in a local city income tax jurisdiction.',
    recommendation: 'safe_to_ignore',
    recommendationTag: 'SAFE TO IGNORE UNLESS IN NYC / PA / OH',
    plainEnglishVerdict: 'Confusing and niche for most people! If you do not work in New York City, Ohio, Pennsylvania, or Michigan local taxing cities, leave this at $0 and ignore it.'
  },

  // EMPLOYER EIN (BOX B)
  'w2-ein': {
    fieldKey: 'w2-ein',
    fieldTitle: 'Employer identification number (EIN)',
    formName: 'Form W-2 • Box b',
    importance: 'important',
    importanceScore: 3,
    importanceLabel: 'Important for E-File (3/4)',
    importanceDescription: 'The IRS e-file gatekeeper rejects returns if the 9-digit EIN format is invalid or does not match official database registers.',
    irsRisk: 'medium',
    irsRiskScore: 2,
    irsRiskLabel: 'Medium Risk (2/3)',
    irsRiskDescription: 'A typo will reject your electronic filing instantly, requiring you to re-submit with the exact 9-digit number from your employer.',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'No Direct Savings ($0)',
    savingsDescription: 'Identification number only.',
    applicability: 'common',
    applicabilityScore: 4,
    applicabilityPercent: '100% of W-2 Filers',
    applicabilityLabel: 'Universal (100%)',
    applicabilityDescription: 'Every registered US employer has an EIN formatted as XX-XXXXXXX.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST MATCH PAPER W-2 BOX B',
    plainEnglishVerdict: 'Copy the 9 digits from Box b. A typo will cause the electronic filing system to reject your return until corrected.'
  },

  // 1099-INT TAXABLE INTEREST
  'other-interest': {
    fieldKey: 'other-interest',
    fieldTitle: 'Taxable Interest Income',
    formName: 'Form 1099-INT • Box 1 (Line 2b on Form 1040)',
    importance: 'recommended',
    importanceScore: 2,
    importanceLabel: 'Recommended (2/4)',
    importanceDescription: 'If you earned more than $10 of interest from a bank or high-yield savings account, your bank sends a 1099-INT to you and the IRS.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High Risk if >$10 (3/3)',
    irsRiskDescription: 'Banks automatically report 1099-INT forms to the IRS. If you leave off bank interest, the IRS computer generates automated underreporting notices (Notice CP2000).',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'Adds to Income ($0 Savings)',
    savingsDescription: 'Taxable interest increases your AGI, which slightly increases your tax liability.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '38% of Filers',
    applicabilityLabel: 'Moderate (38%)',
    applicabilityDescription: 'Very common if you hold high-yield savings accounts, CDs, or Treasury bills. If your total interest across all accounts was under $10, it is usually negligible.',
    recommendation: 'verify_paper',
    recommendationTag: 'ENTER IF BANK SENT FORM 1099-INT',
    plainEnglishVerdict: 'If your bank sent you a Form 1099-INT showing more than $10, you must enter it. If you only made $1 in interest from a regular checking account, you can leave it at $0.'
  },

  // STUDENT LOAN INTEREST DEDUCTION
  'adj-student-loan': {
    fieldKey: 'adj-student-loan',
    fieldTitle: 'Student Loan Interest Deduction',
    formName: 'Schedule 1 • Line 21 (Form 1098-E)',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Voluntary Deduction (1/4)',
    importanceDescription: 'Completely optional! Leaving it blank will never cause an IRS audit or penalty—it just means you voluntarily forfeit free tax savings.',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low Risk (1/3)',
    irsRiskDescription: 'Low audit risk up to the statutory $2,500 cap. Loan servicers send Form 1098-E confirming the interest you paid.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'High Cash Savings ($$$)',
    savingsDescription: 'This is an "above-the-line" deduction that reduces your AGI directly, saving up to $550+ in cold hard cash depending on your tax bracket.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '22% of Filers',
    applicabilityLabel: 'Moderate (22%)',
    applicabilityDescription: 'Applies to anyone paying interest on qualified higher education loans with AGI under the phaseout ($80k Single / $165k Married).',
    recommendation: 'high_savings',
    recommendationTag: 'HIGH MONEY SAVER • UP TO $550 TAX SAVINGS',
    plainEnglishVerdict: 'Free money saver! If you paid student loans, find Box 1 on your 1098-E form and plug it in here to immediately reduce your tax bill.'
  },

  // TRADITIONAL IRA DEDUCTION
  'adj-ira': {
    fieldKey: 'adj-ira',
    fieldTitle: 'Traditional IRA Deduction',
    formName: 'Schedule 1 • Line 20',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Voluntary Deduction (1/4)',
    importanceDescription: 'Optional above-the-line deduction. Only enter if you made pre-tax contributions to a personal Traditional IRA (NOT your employer 401(k)).',
    irsRisk: 'medium',
    irsRiskScore: 2,
    irsRiskLabel: 'Medium Risk (2/3)',
    irsRiskDescription: 'Financial institutions report IRA contributions on Form 5498. If you are covered by a retirement plan at work, strict income phaseouts apply.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'High Cash Savings ($$$$)',
    savingsDescription: 'Can deduct up to $7,000 ($8,000 if 50+), slashing taxable income and potentially saving over $1,500+ in tax liability!',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '14% of Filers',
    applicabilityLabel: 'Moderate (14%)',
    applicabilityDescription: 'Applies to individuals who actively fund an outside Traditional IRA broker account.',
    recommendation: 'high_savings',
    recommendationTag: 'HIGH MONEY SAVER IF YOU FUNDED AN IRA',
    plainEnglishVerdict: 'Only fill this out if you personally deposited money into an outside Traditional IRA. Do not enter employer 401(k) contributions here (those are already deducted in Box 1).'
  },

  // QUALIFYING CHILDREN UNDER 17 (CHILD TAX CREDIT)
  'credits-children': {
    fieldKey: 'credits-children',
    fieldTitle: 'Qualifying Children (Child Tax Credit)',
    formName: 'Form 1040 • Line 19 & Schedule 8812',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Crucial for Parents (4/4)',
    importanceDescription: 'Leaving this at 0 simply throws away up to $2,000 per child in government tax credits!',
    irsRisk: 'medium',
    irsRiskScore: 2,
    irsRiskLabel: 'Medium-High Risk (2/3)',
    irsRiskDescription: 'The child must have a valid SSN issued before the due date of the return, be under age 17 at year end, and meet relationship and residency tests. Multiple parents cannot claim the same child.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Massive Cash Refund ($$$$$)',
    savingsDescription: 'Up to $2,000 per child credit against taxes, with up to $1,700 refundable in cash (Additional Child Tax Credit) even if your tax liability is $0!',
    applicability: 'common',
    applicabilityScore: 3,
    applicabilityPercent: '38% of Filers',
    applicabilityLabel: 'Common for Families (38%)',
    applicabilityDescription: 'Applies to parents, guardians, and foster parents of children under 17.',
    recommendation: 'high_savings',
    recommendationTag: 'MASSIVE SAVINGS • $2,000 PER CHILD',
    plainEnglishVerdict: 'Huge money saver for parents! Make sure your child was under 17 at the end of the tax year and lived with you for more than half the year.'
  },

  // 1099-NEC: FREELANCE / NONEMPLOYEE COMPENSATION
  'income-1099-nec': {
    fieldKey: 'income-1099-nec',
    fieldTitle: 'Nonemployee Compensation (Freelance / Gig Work)',
    formName: 'Form 1099-NEC • Box 1 (Schedule C / Line 1z)',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Critical if Received (4/4)',
    importanceDescription: 'Any client or business that paid you $600 or more files a Copy A with the IRS. Omitting this triggers automatic audits.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'Highest Audit Risk (3/3)',
    irsRiskDescription: 'IRS automated 1099-NEC matching is the single most common cause of automated IRS CP2000 tax notices and self-employment tax assessments.',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'Taxable Income ($0 Savings)',
    savingsDescription: 'Self-employment earnings are subject to income tax and 15.3% self-employment tax (Schedule SE).',
    applicability: 'niche',
    applicabilityScore: 2,
    applicabilityPercent: '24% of Filers',
    applicabilityLabel: 'Freelance / Gig Only (24%)',
    applicabilityDescription: 'Applies to independent contractors, DoorDash/Uber drivers, consultants, and freelancers. Completely safe to ignore if you only receive W-2s.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST BE 100% ACCURATE IF 1099 RECEIVED',
    plainEnglishVerdict: 'If a client sent you a 1099-NEC, the IRS already has a copy! You must report it. If you did zero freelance or contract work, ignore this entirely.'
  },

  // 1099-DIV: DIVIDENDS
  'income-1099-div': {
    fieldKey: 'income-1099-div',
    fieldTitle: 'Dividend Income',
    formName: 'Form 1099-DIV • Box 1a / 1b (Line 3b on Form 1040)',
    importance: 'recommended',
    importanceScore: 3,
    importanceLabel: 'Required if >$10 (3/4)',
    importanceDescription: 'Brokerages (Vanguard, Fidelity, Schwab) issue 1099-DIVs for taxable investment accounts when dividends exceed $10.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High Risk (3/3)',
    irsRiskDescription: 'Brokerages report directly to the IRS. Missing dividend income triggers automated CP2000 adjustment letters.',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'Taxable Income ($0 Savings)',
    savingsDescription: 'Qualified dividends enjoy favorable 0%, 15%, or 20% capital gains tax rates, lower than regular wages.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '28% of Filers',
    applicabilityLabel: 'Investors (28%)',
    applicabilityDescription: 'Applies to taxpayers holding stocks, mutual funds, or ETFs in taxable brokerage accounts (not in 401k or IRA).',
    recommendation: 'verify_paper',
    recommendationTag: 'ENTER IF BROKERAGE SENT 1099-DIV',
    plainEnglishVerdict: 'Report what is shown on your brokerage year-end 1099 statement. If your investments are solely inside a 401(k) or IRA, dividends are non-taxable and you can ignore this.'
  },

  // 1099-MISC & OTHER INCOME
  'income-1099-misc': {
    fieldKey: 'income-1099-misc',
    fieldTitle: 'Miscellaneous & Other Income',
    formName: 'Form 1099-MISC & Schedule 1 Line 8',
    importance: 'recommended',
    importanceScore: 2,
    importanceLabel: 'Recommended if Received (2/4)',
    importanceDescription: 'Used for prizes, awards, legal settlements, rental royalties, or unique non-employee earnings.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High Risk if Issued (3/3)',
    irsRiskDescription: 'Payers submit Form 1099-MISC to the IRS. The IRS computers check for matching entries on Schedule 1.',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'Taxable Income ($0 Savings)',
    savingsDescription: 'Treated as ordinary income added to gross income.',
    applicability: 'niche',
    applicabilityScore: 1,
    applicabilityPercent: '8% of Filers',
    applicabilityLabel: 'Niche / Rare (8%)',
    applicabilityDescription: 'Uncommon for standard W-2 wage earners.',
    recommendation: 'safe_to_ignore',
    recommendationTag: 'SAFE TO IGNORE UNLESS 1099 RECEIVED',
    plainEnglishVerdict: 'Niche. If you did not win a game show prize, receive royalties, or get an official 1099-MISC in the mail, ignore this.'
  },

  // FILING STATUS
  'global-filing-status': {
    fieldKey: 'global-filing-status',
    fieldTitle: 'Filing Status (Single, Married, Head of Household)',
    formName: 'Form 1040 • Page 1 Top Section',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Foundational (4/4)',
    importanceDescription: 'Dictates your entire tax calculation: sets standard deduction ($14,600 Single vs $29,200 Married) and brackets.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High Audit Scrutiny (3/3)',
    irsRiskDescription: 'Head of Household (HOH) filing is one of the IRS’s top audit flags. You must be unmarried and pay more than half the cost of maintaining a home for a qualifying child/dependent.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Gigantic Dollar Impact ($$$$$)',
    savingsDescription: 'Selecting Married Filing Jointly or Head of Household instead of Single doubles your standard deduction and widens tax brackets by up to 100%.',
    applicability: 'common',
    applicabilityScore: 4,
    applicabilityPercent: '100% of Filers',
    applicabilityLabel: 'Universal (100%)',
    applicabilityDescription: 'Every single taxpayer in America must choose one of the 5 official filing statuses.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST BE 100% ACCURATE',
    plainEnglishVerdict: 'The single most influential choice on your return. Be especially careful claiming Head of Household—make sure you legally qualify.'
  },

  // TAX YEAR
  'global-tax-year': {
    fieldKey: 'global-tax-year',
    fieldTitle: 'Tax Year (2024 vs 2025)',
    formName: 'IRS Form 1040 Header',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Critical (4/4)',
    importanceDescription: 'IRS brackets, standard deductions, and Social Security wage caps adjust every single year for inflation.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High (3/3)',
    irsRiskDescription: 'Filing with outdated year brackets causes math errors and refund delays.',
    savingsPotential: 'none',
    savingsScore: 0,
    savingsLabel: 'Sets Inflation Brackets',
    savingsDescription: 'Applies correct IRS inflation parameters ($14,600 in 2024 vs $15,000 in 2025).',
    applicability: 'common',
    applicabilityScore: 4,
    applicabilityPercent: '100% of Filers',
    applicabilityLabel: 'Universal (100%)',
    applicabilityDescription: 'Applies to all filings.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'SELECT CURRENT TAX YEAR',
    plainEnglishVerdict: 'Always choose the calendar year in which the income was earned (e.g. choose 2024 for taxes filed in Spring 2025).'
  }
};

/**
 * Retrieve field rating by key, with safe fallback.
 */
export function getFieldRating(key: string): FieldRatingDefinition {
  if (FIELD_RATINGS[key]) {
    return FIELD_RATINGS[key];
  }
  // Fallback generic
  return {
    fieldKey: key,
    fieldTitle: 'Tax Input Field',
    formName: 'Tax Document',
    importance: 'recommended',
    importanceScore: 2,
    importanceLabel: 'Recommended (2/4)',
    importanceDescription: 'Check your source tax documents to confirm accuracy.',
    irsRisk: 'medium',
    irsRiskScore: 2,
    irsRiskLabel: 'Medium (2/3)',
    irsRiskDescription: 'Standard cross-reference verification.',
    savingsPotential: 'low',
    savingsScore: 1,
    savingsLabel: 'Standard Impact',
    savingsDescription: 'Contributes to adjusted tax liability.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '50% of Filers',
    applicabilityLabel: 'Moderate',
    applicabilityDescription: 'Applicable depending on taxpayer situation.',
    recommendation: 'verify_paper',
    recommendationTag: 'VERIFY WITH YOUR FORMS',
    plainEnglishVerdict: 'Cross-check against your tax slips.'
  };
}

/**
 * Render a compact inline badge chip to place next to an input label.
 */
export function renderRatingPill(key: string): string {
  const r = getFieldRating(key);
  let badgeClass = 'badge-priority-must';
  let badgeIcon = '🔴';
  let shortText = 'Must be 100% Accurate';

  if (r.recommendation === 'high_savings') {
    badgeClass = 'badge-priority-saver';
    badgeIcon = '💰';
    shortText = 'Money Saver';
  } else if (r.recommendation === 'safe_to_ignore') {
    badgeClass = 'badge-priority-skip';
    badgeIcon = '⚪';
    shortText = 'Safe to Ignore if Blank';
  } else if (r.recommendation === 'verify_paper') {
    badgeClass = 'badge-priority-verify';
    badgeIcon = '🟡';
    shortText = 'Verify with Form';
  }

  return `
    <span class="field-rating-pill ${badgeClass}" data-rating-field="${r.fieldKey}" title="Click for IRS Risk & Guidance Breakdown">
      <span class="pill-icon">${badgeIcon}</span>
      <span class="pill-text">${shortText}</span>
      <span class="pill-info-icon" aria-label="More Info">ⓘ</span>
    </span>
  `;
}

/**
 * Generate the comprehensive interactive scorecard modal / popover HTML.
 */
export function renderRatingCardHtml(key: string): string {
  const r = getFieldRating(key);

  const renderMeter = (score: number, max: number, colorClass: string) => {
    let bars = '';
    for (let i = 1; i <= max; i++) {
      const active = i <= score ? `meter-bar-active ${colorClass}` : 'meter-bar-empty';
      bars += `<span class="meter-bar ${active}"></span>`;
    }
    return `<div class="rating-meter">${bars}</div>`;
  };

  const getRiskColor = (score: number) => score >= 3 ? 'meter-red' : (score === 2 ? 'meter-amber' : 'meter-green');
  const getImpColor = (score: number) => score >= 4 ? 'meter-red' : (score >= 3 ? 'meter-amber' : 'meter-blue');
  const getSaveColor = (score: number) => score >= 3 ? 'meter-green' : (score >= 2 ? 'meter-teal' : 'meter-gray');
  const getAppColor = (score: number) => score >= 3 ? 'meter-purple' : 'meter-slate';

  return `
    <div class="field-guidance-card" id="guidance-card-${r.fieldKey}">
      <div class="guidance-card-header">
        <div>
          <div class="guidance-form-tag">${r.formName}</div>
          <div class="guidance-field-title">${r.fieldTitle}</div>
        </div>
        <div class="guidance-rec-badge ${r.recommendation}">
          ${r.recommendationTag}
        </div>
      </div>

      <div class="guidance-scorecard-grid">
        <!-- 1. Importance Dimension -->
        <div class="scorecard-cell">
          <div class="cell-header">
            <span class="cell-label">1. Field Importance</span>
            <span class="cell-score">${r.importanceLabel}</span>
          </div>
          ${renderMeter(r.importanceScore, 4, getImpColor(r.importanceScore))}
          <div class="cell-tip">
            <strong>If left blank:</strong> ${r.importanceDescription}
          </div>
        </div>

        <!-- 2. IRS Risk Dimension -->
        <div class="scorecard-cell">
          <div class="cell-header">
            <span class="cell-label">2. IRS & Audit Risk</span>
            <span class="cell-score">${r.irsRiskLabel}</span>
          </div>
          ${renderMeter(r.irsRiskScore, 3, getRiskColor(r.irsRiskScore))}
          <div class="cell-tip">
            <strong>If incorrect:</strong> ${r.irsRiskDescription}
          </div>
        </div>

        <!-- 3. Savings Potential Dimension -->
        <div class="scorecard-cell">
          <div class="cell-header">
            <span class="cell-label">3. Savings Potential</span>
            <span class="cell-score">${r.savingsLabel}</span>
          </div>
          ${renderMeter(r.savingsScore, 3, getSaveColor(r.savingsScore))}
          <div class="cell-tip">
            <strong>Money impact:</strong> ${r.savingsDescription}
          </div>
        </div>

        <!-- 4. Frequency / Applicability Dimension -->
        <div class="scorecard-cell">
          <div class="cell-header">
            <span class="cell-label">4. Applicability</span>
            <span class="cell-score">${r.applicabilityPercent}</span>
          </div>
          ${renderMeter(r.applicabilityScore, 4, getAppColor(r.applicabilityScore))}
          <div class="cell-tip">
            <strong>Who this applies to:</strong> ${r.applicabilityDescription}
          </div>
        </div>
      </div>

      <!-- Bottom Plain-English Verdict -->
      <div class="guidance-verdict-banner ${r.recommendation}">
        <span class="verdict-icon">💡</span>
        <div class="verdict-text">
          <strong>Tax Guidance Verdict:</strong> ${r.plainEnglishVerdict}
        </div>
      </div>
    </div>
  `;
}
