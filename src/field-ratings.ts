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
  },

  // HEALTH SAVINGS ACCOUNT (HSA) DEDUCTION (FORM 8889)
  'adj-hsa': {
    fieldKey: 'adj-hsa',
    fieldTitle: 'Health Savings Account (HSA) Deduction',
    formName: 'Schedule 1 • Line 13 & Form 8889',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Voluntary Deduction (1/4)',
    importanceDescription: 'Optional above-the-line deduction for individuals enrolled in an HSA-eligible High Deductible Health Plan (HDHP) who made direct contributions.',
    irsRisk: 'medium',
    irsRiskScore: 2,
    irsRiskLabel: 'Medium Risk (2/3)',
    irsRiskDescription: 'The IRS cross-checks Form 5498-SA and Box 12 Code W on your W-2. Employer payroll contributions are already excluded from Box 1 wages.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Triple Tax Advantage ($$$$)',
    savingsDescription: 'Every dollar contributed direct to an HSA reduces your AGI dollar-for-dollar (up to $4,150 Single / $8,300 Family in 2024), saving hundreds in tax liability.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '26% of Filers',
    applicabilityLabel: 'HDHP Policyholders (26%)',
    applicabilityDescription: 'Applies to employees and self-employed individuals with high-deductible health coverage.',
    recommendation: 'high_savings',
    recommendationTag: 'HIGH MONEY SAVER • UP TO $4,150+ DEDUCTION',
    plainEnglishVerdict: 'Triple tax advantage! If you contributed your own post-tax money to an HSA outside payroll deductions, claim it here for instant tax savings.',
    explanation: {
      whatItMeans: 'Contributions you personally made to a qualified Health Savings Account (HSA) using your own after-tax funds (NOT pre-tax payroll deductions).',
      whereToFind: 'Your annual HSA contribution summary or Form 5498-SA sent by your HSA custodian (e.g., Fidelity, Lively, HealthEquity).',
      whyItMatters: 'This is an above-the-line adjustment to income on Schedule 1 Line 13. It reduces your Adjusted Gross Income (AGI) dollar-for-dollar even if you take the Standard Deduction!',
      exampleOrTip: 'Do not re-enter payroll HSA contributions that were already deducted on your pay stub (those appear in Box 12 Code W of your W-2 and are already excluded from Box 1 wages).'
    }
  },

  // CAPITAL GAINS & LOSSES (SCHEDULE D)
  'capital-gains': {
    fieldKey: 'capital-gains',
    fieldTitle: 'Net Capital Gains & Losses (Stocks, Crypto, Property)',
    formName: 'Form 1040 • Line 7 & Schedule D',
    importance: 'recommended',
    importanceScore: 3,
    importanceLabel: 'Required if Sold (3/4)',
    importanceDescription: 'Report sales of stocks, bonds, crypto, mutual funds, or capital assets reported on Form 1099-B.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High Risk (3/3)',
    irsRiskDescription: 'Brokerages send 1099-B transcripts directly to the IRS. Omitting sales can cause the IRS to assess tax on the full gross proceeds assuming a $0 cost basis!',
    savingsPotential: 'medium',
    savingsScore: 2,
    savingsLabel: 'Offset up to -$3,000 Losses ($$)',
    savingsDescription: 'Net capital losses can offset up to $3,000 ($1,500 if MFS) of ordinary wage income, carrying forward the rest to future years.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '30% of Filers',
    applicabilityLabel: 'Investors (30%)',
    applicabilityDescription: 'Applies to anyone who sold stocks, crypto, or investments in taxable brokerage accounts.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST MATCH FORM 1099-B',
    plainEnglishVerdict: 'Report net gains and losses from Form 1099-B. If you lost money this year, up to $3,000 can reduce your taxable wage income!',
    explanation: {
      whatItMeans: 'Net profit or loss resulting from selling investments (stocks, ETFs, cryptocurrencies, bonds) or personal property held in taxable accounts.',
      whereToFind: 'Form 1099-B or Consolidated 1099 Tax Statement from your brokerage (Robinhood, Schwab, Fidelity, Coinbase, etc.).',
      whyItMatters: 'Net gains increase taxable income. Net losses offset other income up to -$3,000 per year (-$1,500 if MFS), with any remaining loss carried forward indefinitely.',
      exampleOrTip: 'If your net result is negative (e.g. -$5,000), enter it with a minus sign or negative amount. The IRS caps the deduction at -$3,000 against ordinary income this year.'
    }
  },

  // SCHEDULE C FREELANCE BUSINESS EXPENSES
  'income-1099-nec-expenses': {
    fieldKey: 'income-1099-nec-expenses',
    fieldTitle: 'Deductible Freelance Business Expenses',
    formName: 'Schedule C • Part II (Expenses)',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Voluntary Expense Deduction (1/4)',
    importanceDescription: 'Ordinary and necessary expenses incurred in earning your 1099-NEC freelance income (mileage, supplies, software, home office).',
    irsRisk: 'medium',
    irsRiskScore: 2,
    irsRiskLabel: 'Medium-High Risk (2/3)',
    irsRiskDescription: 'The IRS scrutinizes round-number expense deductions and losses on Schedule C. Keep receipts, bank records, and mileage logs.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Double Savings ($$$$$)',
    savingsDescription: 'Business expenses reduce both your regular income tax AND the 15.3% Self-Employment Tax on Schedule SE.',
    applicability: 'niche',
    applicabilityScore: 2,
    applicabilityPercent: '24% of Filers',
    applicabilityLabel: 'Freelancers / 1099 Only (24%)',
    applicabilityDescription: 'Only applies to independent contractors and gig workers who earned 1099 income.',
    recommendation: 'high_savings',
    recommendationTag: 'HIGH MONEY SAVER • SLASHES 1099 TAX',
    plainEnglishVerdict: 'Massive tax saver for contractors! Enter legitimate business expenses (supplies, subscriptions, equipment) to reduce your taxable freelance profit.',
    explanation: {
      whatItMeans: 'Ordinary and necessary operating costs you paid out of pocket to earn freelance, contract, or gig income.',
      whereToFind: 'Your business bank/credit card statements, receipts, and mileage tracking logs.',
      whyItMatters: 'Directly subtracts from gross 1099-NEC compensation. This reduces both your income tax bracket rate AND the 15.3% self-employment (FICA) tax!',
      exampleOrTip: 'Common eligible write-offs include software subscriptions, client gifts under $25, business vehicle mileage, advertising, and professional equipment.'
    }
  },

  // SCHEDULE A: MEDICAL & DENTAL EXPENSES
  'itemized-medical': {
    fieldKey: 'itemized-medical',
    fieldTitle: 'Medical & Dental Expenses (Schedule A)',
    formName: 'Schedule A • Line 1-4',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Itemized Deduction (1/4)',
    importanceDescription: 'Only expenses in excess of 7.5% of your AGI can be deducted on Schedule A.',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low Risk (1/3)',
    irsRiskDescription: 'Standard substantiation required if audited. Ensure medical bills were paid out-of-pocket and not reimbursed by insurance or HSA.',
    savingsPotential: 'medium',
    savingsScore: 2,
    savingsLabel: 'Conditional Savings ($$)',
    savingsDescription: 'Helps taxpayers with catastrophic or high out-of-pocket healthcare costs surpass the Standard Deduction threshold.',
    applicability: 'niche',
    applicabilityScore: 1,
    applicabilityPercent: '7% of Filers',
    applicabilityLabel: 'High Medical Costs (7%)',
    applicabilityDescription: 'Only beneficial if your out-of-pocket medical expenses exceed 7.5% of your AGI.',
    recommendation: 'safe_to_ignore',
    recommendationTag: 'ONLY DEDUCTIBLE IF >7.5% OF AGI',
    plainEnglishVerdict: 'You can only deduct medical expenses that exceed 7.5% of your AGI. For most people with modest medical bills, this is safe to skip.',
    explanation: {
      whatItMeans: 'Out-of-pocket medical, dental, vision, prescription, and hospital costs paid during the tax year not covered or reimbursed by insurance or an HSA/FSA.',
      whereToFind: 'Healthcare portal statements, pharmacy annual expense summaries, and medical invoices.',
      whyItMatters: 'Tax code Section 213 permits deducting the portion that exceeds 7.5% of your Adjusted Gross Income (AGI).',
      exampleOrTip: 'If your AGI is $80,000, 7.5% is $6,000. If you spent $10,000 on medical care, your deduction is $4,000 ($10,000 - $6,000).'
    }
  },

  // SCHEDULE A: STATE & LOCAL TAXES (SALT) / REAL ESTATE TAX
  'itemized-salt': {
    fieldKey: 'itemized-salt',
    fieldTitle: 'Real Estate & Property Taxes (SALT)',
    formName: 'Schedule A • Line 5b',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Itemized Deduction (1/4)',
    importanceDescription: 'Property and real estate taxes paid to county/city governments. Added to state income tax withholding, subject to the $10,000 SALT cap.',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low Risk (1/3)',
    irsRiskDescription: 'Counties report property tax payments to mortgage escrow lenders (Form 1098). The statutory $10,000 cap is strictly enforced by computer.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Homeowner Tax Deduction ($$$)',
    savingsDescription: 'Major deduction component for homeowners. Capped at $10,000 ($5,000 if married filing separately).',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '32% of Filers',
    applicabilityLabel: 'Homeowners (32%)',
    applicabilityDescription: 'Applies to homeowners who pay county property or school district real estate taxes.',
    recommendation: 'high_savings',
    recommendationTag: 'HIGH SAVINGS FOR HOMEOWNERS (CAP $10K)',
    plainEnglishVerdict: 'If you own a home, enter the property taxes you paid this year (found on Form 1098 from your mortgage company). Combined with state withholding, this can help you beat the Standard Deduction.',
    explanation: {
      whatItMeans: 'State and Local Taxes (SALT), specifically real estate property taxes assessed on your home or land by local government authorities.',
      whereToFind: 'Box 10 of Form 1098 (Mortgage Interest Statement) or your county/city property tax bill receipt.',
      whyItMatters: 'Combined with your state income tax withholding (from W-2 Box 17), this is deductible up to a statutory cap of $10,000 ($5,000 if MFS).',
      exampleOrTip: 'If state income tax withholding was $4,000 and property tax was $8,000, your combined SALT is $12,000, which is capped at the maximum $10,000 deduction.'
    }
  },

  // SCHEDULE A: MORTGAGE INTEREST
  'itemized-mortgage': {
    fieldKey: 'itemized-mortgage',
    fieldTitle: 'Home Mortgage Interest (Form 1098)',
    formName: 'Schedule A • Line 8a',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Itemized Deduction (1/4)',
    importanceDescription: 'Interest paid on up to $750,000 of qualified acquisition debt for your primary or secondary residence.',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low Risk (1/3)',
    irsRiskDescription: 'Lenders file Form 1098 directly with the IRS. Simply match Box 1 of your Form 1098.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Huge Homeowner Deduction ($$$$)',
    savingsDescription: 'One of the largest deductions in the tax code, often enabling homeowners to itemize and save thousands over the standard deduction.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '30% of Filers',
    applicabilityLabel: 'Mortgage Holders (30%)',
    applicabilityDescription: 'Applies to homeowners paying interest on a residential mortgage.',
    recommendation: 'high_savings',
    recommendationTag: 'PRIMARY DRIVER OF SCHEDULE A SAVINGS',
    plainEnglishVerdict: 'Huge deduction! Look at Box 1 of your Form 1098 from your mortgage bank. Entering this is the #1 reason people choose to itemize deductions.',
    explanation: {
      whatItMeans: 'Qualified interest paid on a mortgage secured by your primary residence or second home on loans up to $750,000 ($375,000 if MFS).',
      whereToFind: 'Box 1 on Form 1098 provided by your mortgage lender or servicer.',
      whyItMatters: 'Often the largest itemized deduction for middle-class homeowners, frequently pushing total deductions well beyond the standard deduction.',
      exampleOrTip: 'If your standard deduction is $14,600 and you paid $12,000 in mortgage interest alone, combining this with SALT or charity often makes itemizing far more profitable.'
    }
  },

  // SCHEDULE A: CHARITABLE CONTRIBUTIONS
  'itemized-charity': {
    fieldKey: 'itemized-charity',
    fieldTitle: 'Charitable Donations & Gifts',
    formName: 'Schedule A • Line 11-14',
    importance: 'optional',
    importanceScore: 1,
    importanceLabel: 'Itemized Deduction (1/4)',
    importanceDescription: 'Cash and non-cash gifts to qualified 501(c)(3) religious, educational, and non-profit organizations.',
    irsRisk: 'medium',
    irsRiskScore: 2,
    irsRiskLabel: 'Medium Risk if >$250 (2/3)',
    irsRiskDescription: 'Any single donation of $250 or more requires written contemporaneous acknowledgment from the charity. Non-cash donations over $500 require Form 8283.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Direct Tax Write-off ($$$)',
    savingsDescription: 'Can deduct up to 60% of your AGI in cash donations, directly lowering taxable income.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '28% of Filers',
    applicabilityLabel: 'Donors (28%)',
    applicabilityDescription: 'Applies to anyone who contributed to qualified charities, places of worship, or non-profits.',
    recommendation: 'high_savings',
    recommendationTag: 'DEDUCT DONATIONS IF ITEMIZING',
    plainEnglishVerdict: 'Keep your receipts and donation acknowledgment letters! Donating saves money if your total itemized deductions exceed your standard deduction.',
    explanation: {
      whatItMeans: 'Donations of cash, check, credit card, or goods given to registered 501(c)(3) public charities, religious houses of worship, or educational institutions.',
      whereToFind: 'Year-end giving receipts and written acknowledgment letters from the non-profit organizations you supported.',
      whyItMatters: 'Cash donations to public charities can be deducted up to 60% of your AGI when itemizing on Schedule A.',
      exampleOrTip: 'Contributions to political campaigns, GoFundMe personal causes, or individuals are NOT tax-deductible under federal law.'
    }
  },

  // SCHEDULE A VS STANDARD DEDUCTION COMPARISON
  'calc-itemized-deductions': {
    fieldKey: 'calc-itemized-deductions',
    fieldTitle: 'Itemized Deductions vs. Standard Deduction',
    formName: 'Form 1040 Line 12 & Schedule A',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Decision Point (4/4)',
    importanceDescription: 'The IRS allows you to take whichever is higher: the fixed Standard Deduction ($14,600 Single / $29,200 Married) OR your custom itemized expenses.',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low Risk (1/3)',
    irsRiskDescription: 'You have a statutory right to choose the higher deduction. Automated computer algorithms verify math.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Maximize Your Refund ($$$$$)',
    savingsDescription: 'Automatically claiming the higher of the two guarantees the lowest possible taxable income and largest refund.',
    applicability: 'common',
    applicabilityScore: 4,
    applicabilityPercent: '100% of Filers',
    applicabilityLabel: 'Universal Choice (100%)',
    applicabilityDescription: 'Every American tax return must choose either the standard or itemized deduction.',
    recommendation: 'high_savings',
    recommendationTag: 'AUTO-OPTIMAL: PICKS THE BIGGEST TAX SHIELD',
    plainEnglishVerdict: 'We automatically calculate both for you and pick whichever saves you more money! You never have to guess.',
    explanation: {
      whatItMeans: 'The tax code gives you two paths to reduce taxable income: a guaranteed flat Standard Deduction or itemizing your actual qualifying expenses on Schedule A.',
      whereToFind: 'Line 12 on Form 1040 and Schedule A.',
      whyItMatters: 'Whichever number is larger shields more of your income from taxes, directly increasing your refund dollar-for-dollar.',
      exampleOrTip: 'Our engine automatically calculates both in real-time, displays the comparison, and picks whichever saves you the most money.'
    }
  },

  // PRIMARY RESIDENT STATE
  'global-resident-state': {
    fieldKey: 'global-resident-state',
    fieldTitle: 'Primary Resident State (Home State)',
    formName: 'State Tax Return Header',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Critical for State (4/4)',
    importanceDescription: 'Determines which state Department of Revenue taxes your worldwide income and grants you credits for taxes paid to out-of-state work locations.',
    irsRisk: 'high',
    irsRiskScore: 3,
    irsRiskLabel: 'High Audit Scrutiny (3/3)',
    irsRiskDescription: 'State tax departments (especially NY, CA, NJ) audit domicile residency claims fiercely. Getting residency wrong triggers double taxation and penalty notices.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Determines State Rates ($$$$)',
    savingsDescription: 'Setting your correct resident state determines whether you owe 0% (TX, FL, WA) or progressive rates up to 13%, and unlocks the Other State Tax Credit (OSTC).',
    applicability: 'common',
    applicabilityScore: 4,
    applicabilityPercent: '100% of State Filers',
    applicabilityLabel: 'Universal (100%)',
    applicabilityDescription: 'Every American tax filer lives in a US state or territory.',
    recommendation: 'must_be_accurate',
    recommendationTag: 'MUST BE 100% ACCURATE • PRIMARY RESIDENCE',
    plainEnglishVerdict: 'Select the state where your primary physical home is located. This establishes your resident state tax return and activates double-taxation prevention shields.',
    explanation: {
      whatItMeans: 'The US state where you maintain your permanent, primary domicile and spend the majority of your time.',
      whereToFind: 'Your driver’s license, primary residential lease or deed, or voter registration card.',
      whyItMatters: 'Your resident state has the legal right to tax your income, but must provide tax credits (OSTC) for taxes you paid to other states where you worked.',
      exampleOrTip: 'If you lived in New Jersey and commuted to New York City for work, your Resident State is NJ, and NY is your Nonresident work state.'
    }
  },

  // OTHER STATE TAX CREDIT (OSTC) / SCHEDULE S / IT-112-R / NJ-CO
  'state-ostc-credit': {
    fieldKey: 'state-ostc-credit',
    fieldTitle: 'Credit for Taxes Paid to Another State (Double-Taxation Shield)',
    formName: 'Schedule S / Form IT-112-R / Schedule NJ-CO',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'Crucial Money Saver (4/4)',
    importanceDescription: 'If you earned money in another state that taxed you, your home state gives you a dollar-for-dollar credit to prevent double taxation!',
    irsRisk: 'medium',
    irsRiskScore: 2,
    irsRiskLabel: 'Medium State Audit Risk (2/3)',
    irsRiskDescription: 'State auditors require an attached copy of your out-of-state non-resident return (e.g. attaching NY IT-203 to NJ-1040) to substantiate the credit.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Massive Double-Tax Shield ($$$$$)',
    savingsDescription: 'Wipes out hundreds or thousands of dollars of resident state tax liability, ensuring you are not taxed twice on the same paycheck.',
    applicability: 'moderate',
    applicabilityScore: 2,
    applicabilityPercent: '20% of Commuters / Multi-State Workers',
    applicabilityLabel: 'Multi-State Workers (20%)',
    applicabilityDescription: 'Applies to interstate commuters, remote workers with out-of-state employers, and individuals who moved during the year.',
    recommendation: 'high_savings',
    recommendationTag: 'ELIMINATES DOUBLE TAXATION • AUTOMATIC CREDIT',
    plainEnglishVerdict: 'Protects your money! When you work in one state and live in another, this statutory credit prevents your paycheck from being taxed twice.',
    explanation: {
      whatItMeans: 'A state tax credit granted by your home state equal to the income tax you already paid to another state on the same earnings.',
      whereToFind: 'Calculated automatically by our engine; maps to CA Schedule S, NY Form IT-112-R, NJ Schedule NJ-CO, etc.',
      whyItMatters: 'Without this credit, interstate workers would suffer punishing double taxation on their wages.',
      exampleOrTip: 'If you paid $1,200 in tax to New York on your work wages, your home state of New Jersey credits up to that amount against your NJ tax bill.'
    }
  },

  // GRAND TOTAL UNIFIED TAX LEDGER
  'calc-unified-summary': {
    fieldKey: 'calc-unified-summary',
    fieldTitle: 'Grand Total Combined Tax Verdict (Federal + All States)',
    formName: 'Unified Multi-Jurisdiction Summary',
    importance: 'critical',
    importanceScore: 4,
    importanceLabel: 'The Bottom Line (4/4)',
    importanceDescription: 'The final unified financial calculation showing your total net refund or balance due across the IRS and all state revenue agencies.',
    irsRisk: 'low',
    irsRiskScore: 1,
    irsRiskLabel: 'Low (1/3)',
    irsRiskDescription: 'Mathematical summation of your official federal and state filings.',
    savingsPotential: 'high',
    savingsScore: 3,
    savingsLabel: 'Total Net Cash in Pocket ($$$$$)',
    savingsDescription: 'Combines all refund checks and balances due into a single net cash figure.',
    applicability: 'common',
    applicabilityScore: 4,
    applicabilityPercent: '100% of Filers',
    applicabilityLabel: 'Universal (100%)',
    applicabilityDescription: 'Every taxpayer wants to know their ultimate net financial outcome.',
    recommendation: 'high_savings',
    recommendationTag: 'THE ULTIMATE BOTTOM LINE',
    plainEnglishVerdict: 'Your total net tax picture. We combine your federal refund or balance with every state refund or balance so you know the exact net cash impact.',
    explanation: {
      whatItMeans: 'The combined sum of what you are owed or owe across both the federal government and every state where you filed.',
      whereToFind: 'The Grand Total Unified Summary Card at the bottom of the page.',
      whyItMatters: 'Gives you a clear, honest, single number so you know whether you are net positive (getting refund money) or net negative.',
      exampleOrTip: 'If Federal gives you a $2,000 refund, NY gives a $200 refund, and NJ owes $100, your total net money in pocket is +$2,100.'
    }
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
 * Render the cluster of 3 colored circles representing the field's rating metrics:
 * 1. Safe to ignore / Attention: White (safe to ignore) to Yellow (needs attention).
 * 2. Risk: White (low risk) to Red (high IRS audit risk).
 * 3. Money saving: White ($0) to Green (high cash savings).
 *
 * For anything that maxes out its rating, an exclamation mark '!' is rendered in the center.
 */
export function renderRatingCircles(keyOrDef: string | FieldRatingDefinition): string {
  const r = typeof keyOrDef === 'string' ? getFieldRating(keyOrDef) : keyOrDef;

  const isAttMax = r.importanceScore === 4;
  const isRiskMax = r.irsRiskScore === 3;
  const isSaveMax = r.savingsScore === 3;

  return `
    <span class="rating-circles-cluster" aria-label="Attention ${r.importanceScore}/4, Risk ${r.irsRiskScore}/3, Savings ${r.savingsScore}/3">
      <span class="rating-circle circle-attention circle-att-${r.importanceScore} ${isAttMax ? 'is-max' : ''}" 
            title="Safe to Ignore / Attention: ${r.importanceLabel} (White = Safe to Ignore ➔ Yellow = Needs Attention${isAttMax ? ' [MAX !]' : ''})">
        ${isAttMax ? '!' : ''}
      </span>
      <span class="rating-circle circle-risk circle-risk-${r.irsRiskScore} ${isRiskMax ? 'is-max' : ''}" 
            title="IRS Audit Risk: ${r.irsRiskLabel} (White = Low Risk ➔ Red = High IRS Risk${isRiskMax ? ' [MAX !]' : ''})">
        ${isRiskMax ? '!' : ''}
      </span>
      <span class="rating-circle circle-savings circle-save-${r.savingsScore} ${isSaveMax ? 'is-max' : ''}" 
            title="Money Savings: ${r.savingsLabel} (White = $0 Savings ➔ Green = High Tax Savings${isSaveMax ? ' [MAX !]' : ''})">
        ${isSaveMax ? '!' : ''}
      </span>
    </span>
  `.trim();
}

/**
 * Render a compact inline badge chip to place next to an input label, featuring the 3 rating circles.
 */
export function renderRatingPill(key: string, compact: boolean = false): string {
  const r = getFieldRating(key);
  let badgeClass = 'badge-priority-must';
  let shortText = 'Must be 100% Accurate';

  if (r.recommendation === 'high_savings') {
    badgeClass = 'badge-priority-saver';
    shortText = 'Money Saver';
  } else if (r.recommendation === 'safe_to_ignore') {
    badgeClass = 'badge-priority-skip';
    shortText = 'Safe to Ignore if Blank';
  } else if (r.recommendation === 'verify_paper') {
    badgeClass = 'badge-priority-verify';
    shortText = 'Verify with Form';
  }

  const circlesHtml = renderRatingCircles(r);

  if (compact) {
    return `
      <span class="field-rating-pill compact ${badgeClass}" data-rating-field="${r.fieldKey}" role="button" tabindex="0" title="${r.fieldTitle} (${shortText}) — Click for Risk & Guidance Breakdown">
        ${circlesHtml}
      </span>
    `.trim();
  }

  return `
    <span class="field-rating-pill ${badgeClass}" data-rating-field="${r.fieldKey}" role="button" tabindex="0" title="${r.fieldTitle} — Click for IRS Risk & Guidance Breakdown">
      ${circlesHtml}
      <span class="pill-text">${shortText}</span>
      <span class="pill-info-icon" aria-label="More Info">ⓘ</span>
    </span>
  `.trim();
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

  const isAttMax = r.importanceScore === 4;
  const isRiskMax = r.irsRiskScore === 3;
  const isSaveMax = r.savingsScore === 3;

  return `
    <div class="field-guidance-card" id="guidance-card-${r.fieldKey}">
      <div class="guidance-card-header">
        <div>
          <div class="guidance-form-tag">${r.formName}</div>
          <div class="guidance-field-title">${r.fieldTitle}</div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: flex-end; gap: 0.35rem;">
          <div class="guidance-rec-badge ${r.recommendation}">
            ${r.recommendationTag}
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem; font-size: 0.72rem; color: #64748b;">
            <span>Rating:</span>
            ${renderRatingCircles(r)}
          </div>
        </div>
      </div>

      <!-- Quick Explanation of Rating Circles -->
      <div class="modal-circle-legend-banner">
        <div class="legend-chip-item">
          <span class="rating-circle circle-attention circle-att-4 is-max">!</span>
          <span><strong>Attention:</strong> White (safe to ignore) ➔ Yellow (needs attention)</span>
        </div>
        <div class="legend-chip-item">
          <span class="rating-circle circle-risk circle-risk-3 is-max">!</span>
          <span><strong>Risk:</strong> White (low risk) ➔ Red (high IRS audit risk)</span>
        </div>
        <div class="legend-chip-item">
          <span class="rating-circle circle-savings circle-save-3 is-max">!</span>
          <span><strong>Savings:</strong> White ($0) ➔ Green (high cash savings)</span>
        </div>
        <div class="legend-chip-item" style="color: #64748b; font-style: italic;">
          <span>(! in circle = Max Rating)</span>
        </div>
      </div>

      <div class="guidance-scorecard-grid">
        <!-- 1. Importance Dimension -->
        <div class="scorecard-cell">
          <div class="cell-header">
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="rating-circle circle-attention circle-att-${r.importanceScore} ${isAttMax ? 'is-max' : ''}">
                ${isAttMax ? '!' : ''}
              </span>
              <div>
                <span class="cell-label">1. Safe to Ignore / Attention</span>
                <div class="circle-legend-subtext">White = Safe to Ignore ➔ Yellow = Needs Attention</div>
              </div>
            </div>
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
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="rating-circle circle-risk circle-risk-${r.irsRiskScore} ${isRiskMax ? 'is-max' : ''}">
                ${isRiskMax ? '!' : ''}
              </span>
              <div>
                <span class="cell-label">2. IRS &amp; Audit Risk</span>
                <div class="circle-legend-subtext">White = Low Risk ➔ Red = High IRS Risk</div>
              </div>
            </div>
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
            <div style="display: flex; align-items: center; gap: 0.5rem;">
              <span class="rating-circle circle-savings circle-save-${r.savingsScore} ${isSaveMax ? 'is-max' : ''}">
                ${isSaveMax ? '!' : ''}
              </span>
              <div>
                <span class="cell-label">3. Money Savings Potential</span>
                <div class="circle-legend-subtext">White = $0 ➔ Green = High Savings</div>
              </div>
            </div>
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
            <div>
              <span class="cell-label">4. Applicability &amp; Frequency</span>
              <div class="circle-legend-subtext">Taxpayer demographic prevalence</div>
            </div>
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

/**
 * Render the inline expandable explanation drawer HTML that sits right near each field.
 */
export function renderFieldExplanationDrawer(fieldKey: string, customId?: string): string {
  const r = getFieldRating(fieldKey);
  const id = customId || `explain-${r.fieldKey}`;
  const exp = r.explanation || {
    whatItMeans: r.fieldTitle,
    whereToFind: `Check your official ${r.formName}.`,
    whyItMatters: r.importanceDescription,
    exampleOrTip: r.plainEnglishVerdict
  };

  return `
    <div class="field-explain-drawer" id="${id}" hidden aria-hidden="true">
      <div class="explain-drawer-content">
        <div class="explain-header">
          <div style="display: flex; align-items: center; gap: 0.4rem;">
            <span class="explain-icon">💡</span>
            <span class="explain-title">${r.fieldTitle} — Field Explainer</span>
          </div>
          <button type="button" class="btn-close-drawer" data-close-drawer="${id}" aria-label="Close explanation">✕</button>
        </div>
        <div class="explain-body">
          <div class="explain-section">
            <span class="explain-label">What does this mean?</span>
            <p class="explain-text">${exp.whatItMeans}</p>
          </div>
          <div class="explain-section">
            <span class="explain-label">Where to find it:</span>
            <p class="explain-text">${exp.whereToFind}</p>
          </div>
          <div class="explain-section">
            <span class="explain-label">Why it matters for your taxes:</span>
            <p class="explain-text">${exp.whyItMatters}</p>
          </div>
          <div class="explain-section explain-tip-box">
            <span class="explain-label">📌 Pro-Tip / Verdict:</span>
            <p class="explain-text">${exp.exampleOrTip}</p>
          </div>
        </div>
      </div>
    </div>
  `.trim();
}

/**
 * Render the clickable toggle button placed next to a field to expand/collapse its explanation.
 */
export function renderExplainToggleBtn(targetId: string, shortLabel?: string): string {
  const hasLabel = shortLabel !== undefined && shortLabel !== '';
  const btnClass = hasLabel ? 'btn-explain-toggle' : 'btn-explain-toggle icon-only';
  return `
    <button type="button" class="${btnClass}" data-explain-target="${targetId}" aria-expanded="false" title="Click to view plain-English explanation">
      <span class="explain-btn-icon">💡</span>
      ${hasLabel ? `<span class="explain-btn-text">${shortLabel}</span><span class="explain-btn-arrow">▾</span>` : ''}
    </button>
  `.trim();
}
