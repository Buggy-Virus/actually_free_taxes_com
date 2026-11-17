import { calculateTaxes, buildCalculationBlocks, buildStateCalcBlocks, buildAutoPanels, formatCurrency, formatCurrencyExact } from '../tax-engine.js';
import { TaxAppState } from '../types.js';
import { getFieldRating, renderRatingPill, renderRatingCardHtml, renderRatingCircles, renderW2HeaderCircles, renderFieldExplanationDrawer, renderExplainToggleBtn } from '../field-ratings.js';
import assert from 'assert';

console.log("Running TypeScript Tax Engine Verification Suite...\n");

// Test Case 1: Single filer with $75,000 W-2 in California
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    w2s: [
      {
        id: 0,
        employer: 'Acme Corp',
        ein: '12-3456789',
        box1: 75000,
        box2: 8900,
        box3: 75000,
        box4: 4650,
        box5: 75000,
        box6: 1087.50,
        states: [
          {
            id: 0,
            state: 'CA',
            stateId: 'CA-12345',
            stateWages: 75000,
            stateTaxWithheld: 3450,
            localWages: 0,
            localTaxWithheld: 0,
            localityName: ''
          }
        ]
      }
    ],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };

  const res = calculateTaxes(state);

  assert.strictEqual(res.w2WagesCalc.result, 75000, 'Total wages should be 75,000');
  assert.strictEqual(res.grossIncomeCalc.result, 75000, 'Gross income should be 75,000');
  assert.strictEqual(res.agiCalc.result, 75000, 'AGI should be 75,000');
  assert.strictEqual(res.deductionCalc.result, 14600, 'Standard deduction for single 2024 is 14,600');
  assert.strictEqual(res.taxableIncomeCalc.result, 60400, 'Taxable income is 75000 - 14600 = 60400');
  assert.strictEqual(Math.round(res.totalTaxCalc.result), 8341, 'Total tax should be 8341');
  assert.strictEqual(res.withholdingCalc.result, 8900, 'Total withholding is 8900');
  assert.strictEqual(res.finalResultCalc.isRefund, true, 'Should be a refund');
  assert.strictEqual(Math.round(res.finalResultCalc.result), 559, 'Refund amount should be 559');

  // Verify State Tax
  assert.strictEqual(res.stateTaxCalc.totalStateWithheld, 3450, 'State tax withheld is 3,450');
  assert.strictEqual(res.stateTaxCalc.byState.length, 1, '1 state entry');
  assert.strictEqual(res.stateTaxCalc.byState[0].state, 'CA', 'State is CA');

  console.log("✓ TS Test 1: Single Filer ($75k) verified correctly!");
}

// Test Case 2: Dual-income Married Filing Jointly with 1 Child
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'married_joint',
    w2s: [
      {
        id: 0,
        employer: 'TechCorp',
        ein: '11-2233445',
        box1: 82000,
        box2: 9600,
        box3: 82000,
        box4: 5084,
        box5: 82000,
        box6: 1189,
        states: [{ id: 0, state: 'IL', stateId: 'IL-1', stateWages: 82000, stateTaxWithheld: 4059, localWages: 0, localTaxWithheld: 0, localityName: '' }]
      },
      {
        id: 1,
        employer: 'HealthSys',
        ein: '55-6677889',
        box1: 58000,
        box2: 6800,
        box3: 58000,
        box4: 3596,
        box5: 58000,
        box6: 841,
        states: [{ id: 1, state: 'WI', stateId: 'WI-1', stateWages: 58000, stateTaxWithheld: 2950, localWages: 0, localTaxWithheld: 0, localityName: '' }]
      }
    ],
    otherIncome: { interest: 450 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 1 },
    showAllArrows: true
  };

  const res = calculateTaxes(state);

  assert.strictEqual(res.w2WagesCalc.result, 140000, 'Total wages should be 140,000');
  assert.strictEqual(res.grossIncomeCalc.result, 140450, 'Gross income should be 140,450');
  assert.strictEqual(res.deductionCalc.result, 29200, 'Standard deduction for married joint 2024 is 29,200');
  assert.strictEqual(res.taxableIncomeCalc.result, 140450 - 29200, 'Taxable income matches');
  assert.strictEqual(res.creditsCalc.result, 2000, 'Child tax credit of $2,000 applied');
  assert.strictEqual(res.withholdingCalc.result, 16400, 'Total withholding matches');
  assert.strictEqual(res.finalResultCalc.isRefund, true, 'Result is refund');

  // Multi-state validation
  assert.strictEqual(res.stateTaxCalc.totalStateWithheld, 4059 + 2950, 'Sum of IL and WI state tax');
  assert.strictEqual(res.stateTaxCalc.byState.length, 2, '2 states present');

  console.log("✓ TS Test 2: Dual-Income Married ($140k + 1 Kid) verified correctly!");
}

// Test Case 3: Tax Balance Owed scenario
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    w2s: [
      {
        id: 0,
        employer: 'Consulting Inc',
        ein: '99-8877665',
        box1: 90000,
        box2: 5000,
        box3: 90000,
        box4: 5580,
        box5: 90000,
        box6: 1305,
        states: [{ id: 0, state: 'TX', stateId: 'TX-NONE', stateWages: 90000, stateTaxWithheld: 0, localWages: 0, localTaxWithheld: 0, localityName: '' }]
      }
    ],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };

  const res = calculateTaxes(state);
  assert.strictEqual(res.finalResultCalc.isRefund, false, 'Should owe taxes when withholding is low');
  assert(res.finalResultCalc.result > 0, 'Amount owed must be positive');
  assert(res.finalResultCalc.generalFormula.includes('Amount Owed'), 'General formula should reflect Amount Owed');
  assert.strictEqual(res.stateTaxCalc.totalStateWithheld, 0, 'Texas has 0 state tax');

  console.log("✓ TS Test 3: Tax Balance Owed verified correctly!");
}

// Test Case 4: Multiple W-2s across Multiple States (Single worker with 2 W-2s: CA & NY, NY has local tax)
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    w2s: [
      {
        id: 0,
        employer: 'Job 1 (West Coast)',
        ein: '11-1111111',
        box1: 60000,
        box2: 7000,
        box3: 60000,
        box4: 3720,
        box5: 60000,
        box6: 870,
        states: [{ id: 0, state: 'CA', stateId: 'CA-JOB1', stateWages: 60000, stateTaxWithheld: 2800, localWages: 0, localTaxWithheld: 0, localityName: '' }]
      },
      {
        id: 1,
        employer: 'Job 2 (East Coast with multiple state lines)',
        ein: '22-2222222',
        box1: 40000,
        box2: 4500,
        box3: 40000,
        box4: 2480,
        box5: 40000,
        box6: 580,
        states: [
          { id: 1, state: 'NY', stateId: 'NY-JOB2', stateWages: 25000, stateTaxWithheld: 1250, localWages: 25000, localTaxWithheld: 800, localityName: 'NYC' },
          { id: 2, state: 'NJ', stateId: 'NJ-JOB2', stateWages: 15000, stateTaxWithheld: 450, localWages: 0, localTaxWithheld: 0, localityName: '' }
        ]
      }
    ],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };

  const res = calculateTaxes(state);

  assert.strictEqual(res.w2WagesCalc.result, 100000, 'Total wages = 60,000 + 40,000 = 100,000');
  assert.strictEqual(res.withholdingCalc.result, 11500, 'Federal withholding = 7,000 + 4,500 = 11,500');

  // State Tax Multi-State Checks
  // Total state tax: CA ($2800) + NY ($1250) + NJ ($450) = $4500
  assert.strictEqual(res.stateTaxCalc.totalStateWithheld, 4500, 'Sum of CA, NY, and NJ state tax');
  assert.strictEqual(res.stateTaxCalc.totalLocalWithheld, 800, 'Local tax from NYC');
  assert.strictEqual(res.stateTaxCalc.byState.length, 3, '3 distinct states (CA, NY, NJ)');
  assert(res.stateTaxCalc.pluggedFormula.includes('CA: $2,800'), 'Formula includes CA');
  assert(res.stateTaxCalc.pluggedFormula.includes('NY: $1,250'), 'Formula includes NY');
  assert(res.stateTaxCalc.pluggedFormula.includes('NJ: $450'), 'Formula includes NJ');
  assert.strictEqual(formatCurrency(75000), '$75,000', 'Whole dollar formats without cents');
  assert.strictEqual(formatCurrency(1087.50), '$1,087.50', 'Non-zero cents formats with 2 decimal places');
  assert.strictEqual(formatCurrencyExact(4951.75), '$4,951.75', 'Non-zero cents in formatCurrencyExact formats with 2 decimal places');
  assert.strictEqual(formatCurrencyExact(2800), '$2,800', 'Whole dollar in formatCurrencyExact formats without cents');

  console.log("✓ TS Test 4: Multi-State W-2s (CA + NY + NJ) & Cents Formatting verified correctly!");
}

// Test Case 5: Additional Income Sources (1099-NEC Freelance + 1099-DIV Dividends + Interest)
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    w2s: [
      {
        id: 0,
        employer: 'Fulltime Job',
        ein: '12-3456789',
        box1: 70000,
        box2: 8000,
        box3: 70000,
        box4: 4340,
        box5: 70000,
        box6: 1015,
        states: []
      }
    ],
    otherIncome: {
      interest: 1200,
      sources: [
        { id: 1, type: '1099-NEC', payer: 'Freelance Design', amount: 8000 },
        { id: 2, type: '1099-DIV', payer: 'Vanguard ETF', amount: 1500 }
      ]
    },
    adjustments: { studentLoan: 500, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };

  const res = calculateTaxes(state);
  // Total Gross Income: 70,000 (W2) + 1,200 (INT) + 8,000 (NEC) + 1,500 (DIV) = 80,700
  // Schedule SE Tax on $8,000 NEC: 8,000 * 0.9235 * 0.153 = $1,130.36; ½ SE Tax Deduction = $565.18
  assert.strictEqual(res.grossIncomeCalc.result, 80700, 'Gross income with extra income sources');
  assert.strictEqual(res.otherTaxesCalc.selfEmploymentTax, 1130.36, 'Schedule SE tax on $8,000 NEC is $1,130.36');
  assert.strictEqual(res.otherTaxesCalc.halfSelfEmploymentTaxDeduction, 565.18, 'Half SE tax deduction is $565.18');
  assert.strictEqual(res.agiCalc.result, 79634.82, 'AGI with $500 student loan + $565.18 half SE tax adjustment');
  assert(res.grossIncomeCalc.sourceFields.includes('input-income-source-1'), 'Sources include freelance input');
  assert(res.grossIncomeCalc.sourceFields.includes('input-income-source-2'), 'Sources include dividends input');

  console.log("✓ TS Test 5: Additional Income Sources (1099-NEC + 1099-DIV + Auto Schedule SE) verified correctly!");
}

// Test Case 6: Field Ratings & IRS Risk Assessment Engine with Color Circles & Exclamation Marks
{
  const b1 = getFieldRating('w2-box1');
  assert.strictEqual(b1.importance, 'critical', 'Box 1 is critical');
  assert.strictEqual(b1.irsRisk, 'high', 'Box 1 has high IRS matching risk');
  assert.strictEqual(b1.recommendation, 'must_be_accurate', 'Must be accurate');

  const b2 = getFieldRating('w2-box2');
  assert.strictEqual(b2.importance, 'critical', 'Box 2 is critical');
  assert.strictEqual(b2.savingsPotential, 'high', 'Box 2 has high cash savings/refund potential');

  const b3 = getFieldRating('w2-box3');
  assert.strictEqual(b3.recommendation, 'safe_to_ignore', 'Box 3 is safe to ignore for single-job filers under cap');

  const studentLoan = getFieldRating('adj-student-loan');
  assert.strictEqual(studentLoan.recommendation, 'high_savings', 'Student loan deduction is high money saver');
  assert.strictEqual(studentLoan.irsRisk, 'low', 'Student loan interest is low IRS risk');

  const kids = getFieldRating('credits-children');
  assert.strictEqual(kids.recommendation, 'high_savings', 'Child tax credit is high money saver');

  // Verify Circle Generation for Box 1 (Wages: Max Attention !, Max Risk !, No Savings)
  const b1Circles = renderRatingCircles('w2-box1');
  assert(b1Circles.includes('circle-attention circle-att-4 is-max'), 'Box 1 attention is max 4');
  assert(b1Circles.includes('circle-risk circle-risk-3 is-max'), 'Box 1 risk is max 3');
  assert(b1Circles.includes('circle-savings circle-save-0'), 'Box 1 savings is 0');
  assert(!b1Circles.includes('circle-save-0 is-max'), 'Box 1 savings is not max');
  // Check exclamation marks inside circle elements (>!</span>)
  const b1ExclamationCount = (b1Circles.match(/>\s*!\s*<\/span>/g) || []).length;
  assert.strictEqual(b1ExclamationCount, 2, 'Box 1 has exactly 2 max ratings with ! (Attention and Risk)');

  // Verify Circle Generation for Box 2 (Withholding: Trifecta with all 3 maxed out !)
  const b2Circles = renderRatingCircles('w2-box2');
  assert(b2Circles.includes('circle-attention circle-att-4 is-max'), 'Box 2 attention is max 4');
  assert(b2Circles.includes('circle-risk circle-risk-3 is-max'), 'Box 2 risk is max 3');
  assert(b2Circles.includes('circle-savings circle-save-3 is-max'), 'Box 2 savings is max 3');
  const b2ExclamationCount = (b2Circles.match(/>\s*!\s*<\/span>/g) || []).length;
  assert.strictEqual(b2ExclamationCount, 3, 'Box 2 has all 3 max ratings with ! (Attention, Risk, and Savings)');

  // Verify Circle Generation for Student Loan (Likelihood 2, Risk 1, Green max savings !)
  const loanCircles = renderRatingCircles('adj-student-loan');
  assert(loanCircles.includes('circle-attention circle-att-2'), 'Student loan likelihood is 2 (moderate)');
  assert(!loanCircles.includes('circle-att-2 is-max'), 'Student loan likelihood is not max');
  assert(loanCircles.includes('circle-risk circle-risk-1'), 'Student loan risk is 1 (white / low risk)');
  assert(!loanCircles.includes('circle-risk-1 is-max'), 'Student loan risk is not max');
  assert(loanCircles.includes('circle-savings circle-save-3 is-max'), 'Student loan savings is max 3 (green !)');
  const loanExclamationCount = (loanCircles.match(/>\s*!\s*<\/span>/g) || []).length;
  assert.strictEqual(loanExclamationCount, 1, 'Student loan deduction has exactly 1 max rating with ! (Savings)');

  // Verify W-2 Header Circles has all 3 max '!'
  const w2HeaderCircles = renderW2HeaderCircles();
  assert.strictEqual((w2HeaderCircles.match(/>\s*!\s*<\/span>/g) || []).length, 3, 'W-2 header has 3 max ! circles');

  // Verify Compact Square Pill HTML (circles only, no text, no info icon)
  const pillHtml = renderRatingPill('w2-box1');
  assert(pillHtml.includes('rating-circles-cluster'), 'Pill contains circles cluster');
  assert(!pillHtml.includes('pill-text'), 'Compact pill has no text');
  assert(!pillHtml.includes('pill-info-icon'), 'Compact pill has no info icon');
  assert(pillHtml.includes('data-rating-field="w2-box1"'), 'Pill has data-rating-field');

  // Verify 3-Row Info Modal HTML (no legend banner, no fractions in taglines, 3 gray rows + field details)
  const cardHtml = renderRatingCardHtml('w2-box2');
  assert(!cardHtml.includes('modal-circle-legend-banner'), 'Modal has no redundant circle legend banner');
  assert(cardHtml.includes('guidance-scorecard-rows'), 'Modal has 3-row scorecard');
  assert.strictEqual((cardHtml.match(/class="scorecard-row"/g) || []).length, 3, 'Modal has exactly 3 equal-height gray rows');
  assert(cardHtml.includes('modal-field-details'), 'Modal includes full field explanation below rows');

  console.log("✓ TS Test 6: Field Ratings & IRS Risk Engine (3-Circle Likelihood/Risk/Savings & 3-Row Modal) verified correctly!");
}

// Test Case 7: Advanced Features — HSA, Capital Loss Limit (-$3k cap), Schedule C Business Expenses & Itemized Deductions (Schedule A)
{
  // Sub-case A: Capital loss capping and Schedule C expenses
  const stateA: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    w2s: [
      {
        id: 0,
        employer: 'Main Corp',
        ein: '12-3456789',
        box1: 80000,
        box2: 9000,
        box3: 80000,
        box4: 4960,
        box5: 80000,
        box6: 1160,
        states: [{ id: 0, state: 'CA', stateId: 'CA-1', stateWages: 80000, stateTaxWithheld: 3500, localWages: 0, localTaxWithheld: 0, localityName: '' }]
      }
    ],
    otherIncome: {
      interest: 500,
      sources: [
        { id: 1, type: '1099-NEC', payer: 'Consulting Client', amount: 12000 }
      ],
      capitalGains: { shortTerm: -5000, longTerm: -2000 }, // Total net loss -$7,000, should be capped at -$3,000!
      scheduleCExpenses: 4000 // Reduces $12,000 1099-NEC down to $8,000 net profit
    },
    adjustments: {
      studentLoan: 0,
      ira: 2000,
      hsa: 3500 // Form 8889 HSA deduction
    },
    dependents: { childrenCount: 0 },
    itemizedDeductions: {
      medicalExpenses: 0,
      realEstateTax: 0,
      mortgageInterest: 0,
      charity: 0
    },
    deductionMethod: 'auto',
    showAllArrows: true
  };

  const resA = calculateTaxes(stateA);

  // Capital gains: net is -7,000, capped at -3,000
  assert.strictEqual(resA.capitalGainsCalc.netTotal, -7000, 'Total capital loss is -7,000');
  assert.strictEqual(resA.capitalGainsCalc.allowableLoss, -3000, 'Allowable loss is capped at -3,000');
  assert.strictEqual(resA.capitalGainsCalc.result, -3000, 'Result reflects -$3,000 loss deduction');

  // Gross income: 80,000 (W2) + 500 (INT) + (12,000 - 4,000 = 8,000 1099 Net) + (-3,000 Cap Gains) = 85,500
  assert.strictEqual(resA.grossIncomeCalc.result, 85500, 'Gross income with Schedule C expenses and capped capital losses');

  // Adjustments: 2,000 (IRA) + 3,500 (HSA) + 565.18 (½ SE Tax on $8,000 NEC) = 6,065.18
  assert.strictEqual(resA.adjustmentsCalc.result, 6065.18, 'Adjustments include IRA, HSA, and ½ SE Tax');

  // AGI: 85,500 - 6,065.18 = 79,434.82
  assert.strictEqual(resA.agiCalc.result, 79434.82, 'AGI is 79,434.82');

  // Standard deduction is $14,600, higher than $0 itemized, so auto picks standard
  assert.strictEqual(resA.deductionCalc.result, 14600, 'Auto picks Standard Deduction when itemized is lower');
  assert.strictEqual(resA.itemizedCalc.chosenMethod, 'standard', 'Chosen method is standard');

  // Sub-case B: Schedule A Itemized Deductions exceeding Standard Deduction
  // AGI = $79,434.82. 7.5% of AGI = $5,957.6115 floor.
  // Medical = $10,000 -> Deductible = 10,000 - 5,957.6115 = $4,042.3885.
  // State tax withheld = $3,500 + Real estate tax = $8,000 -> Sum = $11,500, capped at $10,000 SALT!
  // Mortgage interest = $9,000. Charity = $2,500.
  // Total Itemized = $4,042.3885 + $10,000 + $9,000 + $2,500 = $25,542.3885!
  const stateB: TaxAppState = {
    ...stateA,
    itemizedDeductions: {
      medicalExpenses: 10000,
      realEstateTax: 8000,
      mortgageInterest: 9000,
      charity: 2500
    }
  };

  const resB = calculateTaxes(stateB);
  assert.strictEqual(Math.round(resB.itemizedCalc.medicalDeductible * 100) / 100, 4042.39, 'Medical deductible after 7.5% floor');
  assert.strictEqual(resB.itemizedCalc.saltDeduction, 10000, 'SALT capped at $10,000 (3,500 CA tax + 8,000 property = 11,500 -> 10,000)');
  assert.strictEqual(Math.round(resB.itemizedCalc.totalItemizedDeductions * 100) / 100, 25542.39, 'Total itemized = 25,542.39');
  assert.strictEqual(resB.itemizedCalc.chosenMethod, 'itemized', 'Auto optimal method switches to itemized');
  assert.strictEqual(Math.round(resB.deductionCalc.result * 100) / 100, 25542.39, 'Deduction applied to return is $25,542.39');

  // Sub-case C: Manual override to force Standard Deduction
  const stateC: TaxAppState = {
    ...stateB,
    deductionMethod: 'standard'
  };
  const resC = calculateTaxes(stateC);
  assert.strictEqual(resC.deductionCalc.result, 14600, 'Forced standard deduction is respected even when itemized is higher');

  console.log("✓ TS Test 7: Advanced Features (HSA, -$3k Cap Loss Cap, Schedule C Expenses & Schedule A Itemized Deductions) verified correctly!");
}

// Test Case 8: Field Explanations Engine & Inline Drawer Generation
{
  // Test explanation drawer generation for W-2 Box 1
  const b1Drawer = renderFieldExplanationDrawer('w2-box1', 'drawer-test-b1');
  assert(b1Drawer.includes('id="drawer-test-b1"'), 'Drawer has custom id');
  assert(b1Drawer.includes('class="field-explain-drawer"'), 'Drawer has field-explain-drawer class');
  assert(b1Drawer.includes('What does this mean?'), 'Drawer has section: What does this mean?');
  assert(b1Drawer.includes('Where to find it:'), 'Drawer has section: Where to find it');
  assert(b1Drawer.includes('Why it matters for your taxes:'), 'Drawer has section: Why it matters');
  assert(b1Drawer.includes('📌 Pro-Tip / Verdict:'), 'Drawer has section: Pro-Tip');
  assert(b1Drawer.includes('data-close-drawer="drawer-test-b1"'), 'Drawer has close button with target');

  // Test explain toggle button generation
  const toggleBtn = renderExplainToggleBtn('drawer-test-b1', 'Explain Box 1');
  assert(toggleBtn.includes('class="btn-explain-toggle"'), 'Toggle button has btn-explain-toggle class');
  assert(toggleBtn.includes('data-explain-target="drawer-test-b1"'), 'Toggle button has data-explain-target');
  assert(toggleBtn.includes('Explain Box 1'), 'Toggle button includes label text');

  // Test new rating definitions exist and have complete scorecards
  const hsaRating = getFieldRating('adj-hsa');
  assert.strictEqual(hsaRating.recommendation, 'high_savings', 'HSA is high money saver');
  assert(hsaRating.explanation, 'HSA has explanation');

  const capRating = getFieldRating('capital-gains');
  assert.strictEqual(capRating.irsRisk, 'high', 'Capital gains is high IRS risk');

  const medRating = getFieldRating('itemized-medical');
  assert.strictEqual(medRating.importanceScore, 1, 'Medical is voluntary (1/4)');

  console.log("✓ TS Test 8: Field Explanations Engine & Inline Drawer Generation verified correctly!");
}

// Test Case 9: Multi-State Return with OSTC (NY Nonresident Work + NJ Resident Home)
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'NJ',
    w2s: [
      {
        id: 0,
        employer: 'Manhattan Finance LLC',
        ein: '13-9876543',
        box1: 100000,
        box2: 12000,
        box3: 100000,
        box4: 6200,
        box5: 100000,
        box6: 1450,
        states: [
          {
            id: 0,
            state: 'NY',
            stateId: 'NY-13987',
            stateWages: 100000,
            stateTaxWithheld: 5500,
            localWages: 0,
            localTaxWithheld: 0,
            localityName: ''
          }
        ]
      }
    ],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };

  const res = calculateTaxes(state);

  // Check that 2 state returns were calculated: NJ (Resident) and NY (Nonresident)
  assert.strictEqual(res.stateReturnsCalc.length, 2, 'Should have exactly 2 state returns (NJ & NY)');

  const njReturn = res.stateReturnsCalc.find(s => s.state === 'NJ')!;
  const nyReturn = res.stateReturnsCalc.find(s => s.state === 'NY')!;

  assert.ok(njReturn, 'NJ resident return exists');
  assert.ok(nyReturn, 'NY nonresident return exists');
  assert.strictEqual(njReturn.residentStatus, 'resident', 'NJ is resident');
  assert.strictEqual(nyReturn.residentStatus, 'non_resident', 'NY is nonresident');

  // NY Nonresident Liability calculation:
  // NY Taxable: 100,000 - 8,000 standard deduction = 92,000
  // NY Tax: $4,951.75
  assert.strictEqual(nyReturn.stateTaxableIncome, 92000, 'NY taxable income is 92,000');
  assert.strictEqual(Math.round(nyReturn.stateTaxLiability), 4952, 'NY tax liability is approx $4,952');
  assert.strictEqual(nyReturn.isRefund, true, 'NY is a refund because $5,500 withheld > $4,951.75 liability');

  // NJ Resident Return with Other State Tax Credit (Schedule NJ-CO):
  // NJ tentative tax on $100k - $1k NJ std deduction ($99k taxable) is $4,180.05
  // Credit allowed = min(NY tax $4,951.75, NJ home attributable $4,180.05) = $4,180.05
  // Final NJ liability = $4,180.05 - $4,180.05 = $0! Double taxation is completely wiped out.
  assert.ok(njReturn.creditForOtherStates > 0, 'NJ applied OSTC credit');
  assert.strictEqual(njReturn.creditedStates.length, 1, 'Credited 1 other state (NY)');
  assert.strictEqual(njReturn.creditedStates[0].fromState, 'NY', 'Credit from NY');
  assert.strictEqual(njReturn.stateTaxLiability, 0, 'NJ net tax liability is $0 due to 100% OSTC credit shield');

  console.log("✓ TS Test 9: Multi-State Return with OSTC Double Taxation Shield (NY + NJ) verified correctly!");
}

// Test Case 10: Reciprocal State Commuter (NJ Resident + PA Work W-2)
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'NJ',
    w2s: [
      {
        id: 0,
        employer: 'Philly Pharma Inc',
        ein: '23-1122334',
        box1: 80000,
        box2: 8500,
        box3: 80000,
        box4: 4960,
        box5: 80000,
        box6: 1160,
        states: [
          {
            id: 0,
            state: 'PA',
            stateId: 'PA-23112',
            stateWages: 80000,
            stateTaxWithheld: 2456, // 3.07% PA withholding
            localWages: 0,
            localTaxWithheld: 0,
            localityName: ''
          }
        ]
      }
    ],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };

  const res = calculateTaxes(state);

  const paReturn = res.stateReturnsCalc.find(s => s.state === 'PA')!;
  assert.ok(paReturn, 'PA nonresident return exists');
  assert.strictEqual(paReturn.reciprocityExemption, true, 'PA has reciprocity exemption with NJ');
  assert.strictEqual(paReturn.stateTaxLiability, 0, 'PA tax liability is $0 under reciprocity');
  assert.strictEqual(paReturn.isRefund, true, 'PA returns 100% refund of withholding');
  assert.strictEqual(paReturn.netOutcome, 2456, 'Full $2,456 PA withholding refunded');
  assert(paReturn.reciprocityNote?.includes('Reciprocal agreement active'), 'Includes reciprocity explanation');

  console.log("✓ TS Test 10: Reciprocal State Agreement (NJ & PA Commuter) verified correctly!");
}

// Test Case 11: 0% Income Tax State (Resident of Texas)
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'TX',
    w2s: [
      {
        id: 0,
        employer: 'Austin Tech LLC',
        ein: '74-1234567',
        box1: 95000,
        box2: 11000,
        box3: 95000,
        box4: 5890,
        box5: 95000,
        box6: 1377.50,
        states: [
          {
            id: 0,
            state: 'TX',
            stateId: 'TX-NONE',
            stateWages: 95000,
            stateTaxWithheld: 0,
            localWages: 0,
            localTaxWithheld: 0,
            localityName: ''
          }
        ]
      }
    ],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };

  const res = calculateTaxes(state);
  const txReturn = res.stateReturnsCalc.find(s => s.state === 'TX')!;
  assert.ok(txReturn, 'TX return exists in report');
  assert.strictEqual(txReturn.hasIncomeTax, false, 'TX has 0% income tax');
  assert.strictEqual(txReturn.stateTaxLiability, 0, 'TX tax liability is $0');
  assert(txReturn.pluggedFormula.includes('No Texas State Return Required'), 'Formula explains no return required');

  console.log("✓ TS Test 11: 0% Income Tax State (Texas) verified correctly!");
}

// Test Case 12: Unified Multi-Jurisdiction Grand Total Ledger
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'CA',
    w2s: [
      {
        id: 0,
        employer: 'Job CA',
        ein: '94-1111111',
        box1: 50000,
        box2: 6000,
        box3: 50000,
        box4: 3100,
        box5: 50000,
        box6: 725,
        states: [
          { id: 0, state: 'CA', stateId: 'CA-1', stateWages: 50000, stateTaxWithheld: 2000, localWages: 0, localTaxWithheld: 0, localityName: '' }
        ]
      },
      {
        id: 1,
        employer: 'Job NY',
        ein: '13-2222222',
        box1: 40000,
        box2: 4500,
        box3: 40000,
        box4: 2480,
        box5: 40000,
        box6: 580,
        states: [
          { id: 1, state: 'NY', stateId: 'NY-1', stateWages: 40000, stateTaxWithheld: 1800, localWages: 0, localTaxWithheld: 0, localityName: '' }
        ]
      }
    ],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };

  const res = calculateTaxes(state);
  const ledger = res.unifiedSummaryCalc;

  assert.ok(ledger, 'Unified summary exists');
  assert.strictEqual(ledger.lines.length, 3, 'Ledger has Federal + CA + NY (3 lines)');

  // Verify that grandTotalNet = federalNet + sum(stateNet)
  let expectedTotal = ledger.federalNet;
  for (const sr of res.stateReturnsCalc) {
    expectedTotal += sr.isRefund ? sr.netOutcome : -sr.netOutcome;
  }
  assert.strictEqual(ledger.grandTotalNet, expectedTotal, 'Grand total matches exact sum of Federal + all State nets');
  assert.strictEqual(ledger.result, Math.abs(expectedTotal), 'Result matches absolute grand total');

  console.log("✓ TS Test 12: Unified Multi-Jurisdiction Grand Total Ledger verified correctly!");
}

// Test Case 13: NYC Job Switch (2 NYC W-2s) + DC Condo Rental + Multiple Investment Accounts & Capital Gains
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'NY',
    w2s: [
      {
        id: 0,
        employer: 'Midtown FinTech Corp (NYC - Job 1)',
        ein: '13-4012980',
        box1: 95000,
        box2: 15200,
        box3: 95000,
        box4: 5890,
        box5: 95000,
        box6: 1377.50,
        states: [{
          id: 0,
          state: 'NY',
          stateId: 'NY-4012980',
          stateWages: 95000,
          stateTaxWithheld: 5130,
          localWages: 95000,
          localTaxWithheld: 3420,
          localityName: 'NYC'
        }]
      },
      {
        id: 1,
        employer: 'Hudson River AI Labs (NYC - Job 2)',
        ein: '13-8841205',
        box1: 115000,
        box2: 19550,
        box3: 115000,
        box4: 7130,
        box5: 115000,
        box6: 1667.50,
        states: [{
          id: 1,
          state: 'NY',
          stateId: 'NY-8841205',
          stateWages: 115000,
          stateTaxWithheld: 6440,
          localWages: 115000,
          localTaxWithheld: 4190,
          localityName: 'NYC'
        }]
      }
    ],
    otherIncome: {
      interest: 1850,
      sources: [
        { id: 1, type: '1099-INT', payer: 'Fidelity Bond Account (Accrued Interest)', amount: 1420, accruedInterestPaid: 220, state: 'NY' },
        { id: 2, type: '1099-DIV', payer: 'Vanguard Brokerage (Dividends Paid)', amount: 3600, qualifiedDividends: 3000, state: 'NY' },
        { id: 3, type: '1099-DIV', payer: 'Charles Schwab Portfolio (Dividends Paid)', amount: 2150, qualifiedDividends: 1800, state: 'NY' }
      ],
      scheduleERental: {
        grossRents: 28000,
        expenses: 8200,
        depreciation: 5000,
        propertyState: 'DC'
      },
      capitalGains: {
        shortTerm: -2400,
        longTerm: 14500
      }
    },
    adjustments: { studentLoan: 0, ira: 0, hsa: 2000 },
    dependents: { childrenCount: 0 },
    itemizedDeductions: {
      medicalExpenses: 0,
      realEstateTax: 4800,
      mortgageInterest: 11200,
      charity: 2500
    },
    showAllArrows: true
  };

  const res = calculateTaxes(state);

  assert.strictEqual(res.w2WagesCalc.result, 210000, 'Combined W-2 wages = 95,000 + 115,000 = 210,000');
  assert.strictEqual(res.scheduleECalc.result, 14800, 'Schedule E Net Rental Income = 28,000 - 8,200 - 5,000 = 14,800');
  assert.strictEqual(res.capitalGainsCalc.result, 12100, 'Net capital gains = -2,400 + 14,500 = 12,100');
  assert.strictEqual(res.grossIncomeCalc.result, 245700, 'Gross income = 210,000 + 1,850 + (1,420 - 220) + 3,600 + 2,150 + 14,800 + 12,100 = 245,700');
  assert.strictEqual(res.agiCalc.result, 243700, 'AGI = 245,700 - 2,000 HSA = 243,700');
  assert.strictEqual(res.deductionCalc.result, 23700, 'Itemized deduction = $10,000 SALT + $11,200 Mortgage + $2,500 Charity = $23,700');
  assert.strictEqual(res.taxableIncomeCalc.result, 220000, 'Taxable income = 243,700 - 23,700 = 220,000');

  // Preferential LTCG + Qualified Dividends Worksheet
  assert.strictEqual(res.taxBeforeCreditsCalc.qualifiedDividendsTotal, 4800, 'Total Qualified Dividends = 3,000 + 1,800 = 4,800');
  assert.strictEqual(res.taxBeforeCreditsCalc.preferentialIncome, 16900, 'Preferential income = 4,800 QDiv + 12,100 Net LTCG = 16,900');
  assert.strictEqual(res.taxBeforeCreditsCalc.preferentialTax, 2535, 'Preferential tax at 15% = 16,900 * 0.15 = 2,535');
  assert.strictEqual(res.taxBeforeCreditsCalc.ordinaryTaxableIncome, 203100, 'Ordinary taxable income = 220,000 - 16,900 = 203,100');
  assert.strictEqual(res.taxBeforeCreditsCalc.ordinaryTax, 42678.5, 'Ordinary tax = 42,678.50');
  assert.strictEqual(res.taxBeforeCreditsCalc.result, 45213.5, 'Tentative tax = 42,678.50 + 2,535 = 45,213.50');

  // Other Taxes (Form 8959 Additional Medicare + Form 8960 NIIT)
  assert.strictEqual(res.otherTaxesCalc.additionalMedicareTax, 90, 'Additional Medicare Tax (0.9% over $200k) = $90');
  assert.strictEqual(res.otherTaxesCalc.niit, 1356.6, 'NIIT (3.8% on $35,700 NII) = $1,356.60');
  assert.strictEqual(res.otherTaxesCalc.result, 1446.6, 'Total Other Taxes = $90 + $1,356.60 = $1,446.60');
  assert.strictEqual(res.totalTaxCalc.result, 46660.1, 'Total Federal Tax Liability = 45,213.50 + 1,446.60 = 46,660.10');

  // Excess Social Security Tax Credit (Schedule 3 Line 11)
  assert.strictEqual(res.ficaCalc.excessSSTaxCredit, 2566.8, 'Excess SS tax credit = 13,020 - 10,453.20 = 2,566.80');
  assert.strictEqual(res.withholdingCalc.result, 37316.8, 'Total Federal Payments = 34,750 W-2 WH + 2,566.80 Excess SS Credit = 37,316.80');

  // State Returns: DC Nonresident Form D-30 & NY Resident Form IT-201 + IT-196 + NYC Local Tax
  assert.strictEqual(res.stateReturnsCalc.length, 2, 'Generates NY Resident + DC Nonresident returns');
  const dcReturn = res.stateReturnsCalc.find(s => s.state === 'DC')!;
  const nyReturn = res.stateReturnsCalc.find(s => s.state === 'NY')!;
  assert.strictEqual(dcReturn.stateTaxLiability, 442.2, 'DC Form D-30 Unincorporated Business Tax = $442.20');
  assert.strictEqual(nyReturn.creditForOtherStates, 442.2, 'NY Form IT-112-R credits $442.20 paid to DC');
  assert.strictEqual(nyReturn.localTaxLiability, 8603.92, 'NYC Resident Municipal Tax = $8,603.92');
  assert.strictEqual(nyReturn.stateTaxLiability, 21188.77, 'Combined NY State + NYC Local Tax Liability = $21,188.77');
  assert.strictEqual(nyReturn.stateWithholding, 19180, 'Combined NY Box 17 ($11,570) + NYC Box 19 ($7,610) Withholding = $19,180');

  console.log("✓ TS Test 13: NYC Job Switch + DC Condo Rental & Investments scenario verified correctly!");
}

// Test Case 14: Comprehensive Verification of All Newly Supported Federal & State Features
{
  // 14A: Qualifying Surviving Spouse + Age 65+/Blind + SSA-1099 Social Security (85% Worksheet) + 1099-R Penalty + K-1 QBI + Credits
  const state14A: TaxAppState = {
    year: 2024,
    filingStatus: 'qualifying_surviving_spouse',
    residentState: 'SC', // South Carolina (44% LTCG exclusion)
    w2s: [{
      id: 0,
      employer: 'Charleston Medical Group',
      ein: '57-1122334',
      box1: 45000,
      box2: 3500,
      box3: 45000,
      box4: 2790,
      box5: 45000,
      box6: 652.50,
      states: [{ id: 0, state: 'SC', stateId: 'SC-1', stateWages: 45000, stateTaxWithheld: 1800, localWages: 0, localTaxWithheld: 0, localityName: '' }]
    }],
    otherIncome: {
      interest: 500,
      sources: [
        { id: 1, type: 'SSA-1099', payer: 'Social Security Admin', amount: 24000 },
        { id: 2, type: '1099-R', payer: 'Fidelity IRA Early Dist', amount: 10000, earlyDistributionPenalty: true, federalTaxWithheld: 1000 },
        { id: 3, type: 'Schedule K-1', payer: 'Palmetto Partners LP', amount: 15000 },
        { id: 4, type: '1099-INT', payer: 'SC Muni Bonds', amount: 200, taxExemptInterest: 4000 }
      ],
      capitalGains: {
        shortTerm: 0,
        longTerm: 10000,
        collectiblesGain: 2000,
        unrecaptured1250Gain: 3000
      }
    },
    adjustments: {
      studentLoan: 0,
      ira: 0,
      hsa: 0,
      educatorExpenses: 300,
      seRetirement: 0,
      seHealthInsurance: 0,
      alimonyPaid: 0
    },
    dependents: {
      childrenCount: 1,
      otherDependentsCount: 1,
      age65OrBlindCount: 1, // +$1,550 for QSS in 2024 -> 29,200 + 1,550 = 30,750
      childCareExpenses: 3000,
      educationExpensesAotc: 4000, // $2,500 AOTC ($1,500 nonrefundable + $1,000 refundable)
      educationExpensesLlc: 0,
      foreignTaxCredit: 200,
      cleanEnergyCredit: 500,
      estimatedTaxPayments: 1500
    },
    showAllArrows: true
  };

  const res14A = calculateTaxes(state14A);
  assert.strictEqual(res14A.deductionCalc.result, 30750, 'QSS ($29,200) + 1 Age 65/Blind box ($1,550) = $30,750 standard deduction');
  assert.ok((res14A.qbiDeduction || 0) > 0, '20% QBI deduction (Form 8995) computed on Schedule K-1 pass-through income');
  assert.strictEqual(res14A.otherTaxesCalc.earlyDistributionPenaltyTax, 1000, 'Form 5329 10% early withdrawal penalty on $10,000 1099-R = $1,000');
  assert.ok((res14A.creditsCalc.otherDependentsCredit || 0) === 500, 'Credit for Other Dependents ($500) applied');
  assert.ok((res14A.creditsCalc.childCareCredit || 0) === 600, 'Form 2441 Child Care Credit (20% of $3,000) = $600');
  assert.ok((res14A.creditsCalc.educationCreditRefundable || 0) === 1000, 'Form 8863 40% Refundable AOTC = $1,000');
  assert.ok(res14A.withholdingCalc.pluggedFormula.includes('$1,000 (1099 WH)'), 'Includes 1099 Box 4 withholding');
  assert.ok(res14A.withholdingCalc.pluggedFormula.includes('$1,500 (1040-ES)'), 'Includes Form 1040-ES estimated payments');
  const scRet = res14A.stateReturnsCalc.find(s => s.state === 'SC')!;
  // SC starts from Federal AGI and excludes 44% of $10,000 LTCG ($4,400)
  assert.strictEqual(scRet.stateWages, res14A.agiCalc.result - 4400, 'SC applies 44% net long-term capital gain exclusion ($4,400)');

  // 14B: Washington 7% Long-Term Capital Gains Excise Tax (> $270,000) & New Hampshire 3% Interest & Dividends Tax (Form DP-10)
  const stateWA: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'WA',
    w2s: [{ id: 0, employer: 'Seattle Cloud Inc', ein: '91-1234567', box1: 150000, box2: 24000, box3: 150000, box4: 9300, box5: 150000, box6: 2175, states: [{ id: 0, state: 'WA', stateId: '', stateWages: 150000, stateTaxWithheld: 0, localWages: 0, localTaxWithheld: 0, localityName: '' }] }],
    otherIncome: { interest: 0, capitalGains: { shortTerm: 0, longTerm: 370000 } },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };
  const resWA = calculateTaxes(stateWA);
  const waRet = resWA.stateReturnsCalc.find(s => s.state === 'WA')!;
  assert.strictEqual(waRet.stateTaxLiability, 7000, 'WA 7% LTCG Excise Tax on ($370,000 - $270,000) = $7,000');

  const stateNH: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'NH',
    w2s: [{ id: 0, employer: 'Manchester Tech', ein: '02-1234567', box1: 80000, box2: 10000, box3: 80000, box4: 4960, box5: 80000, box6: 1160, states: [{ id: 0, state: 'NH', stateId: '', stateWages: 80000, stateTaxWithheld: 0, localWages: 0, localTaxWithheld: 0, localityName: '' }] }],
    otherIncome: { interest: 6400, sources: [{ id: 1, type: '1099-DIV', payer: 'Fidelity', amount: 6000 }] },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };
  const resNH = calculateTaxes(stateNH);
  const nhRet = resNH.stateReturnsCalc.find(s => s.state === 'NH')!;
  assert.strictEqual(nhRet.stateTaxLiability, 300, 'NH Form DP-10 3% I&D tax on ($12,400 - $2,400 exemption) = $300');

  // 14C: Massachusetts 8.5% Short-Term Capital Gains (5% base on $115,600 = $5,780 + 3.5% STCG surcharge on $20,000 = $700 -> $6,480)
  const stateMA: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'MA',
    w2s: [{ id: 0, employer: 'Boston Biotech', ein: '04-1234567', box1: 100000, box2: 15000, box3: 100000, box4: 6200, box5: 100000, box6: 1450, states: [{ id: 0, state: 'MA', stateId: '', stateWages: 100000, stateTaxWithheld: 5000, localWages: 0, localTaxWithheld: 0, localityName: '' }] }],
    otherIncome: { interest: 0, capitalGains: { shortTerm: 20000, longTerm: 0 } },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };
  const resMA = calculateTaxes(stateMA);
  const maRet = resMA.stateReturnsCalc.find(s => s.state === 'MA')!;
  assert.strictEqual(maRet.stateTaxLiability, 6480, 'MA applies 5% base + 3.5% add-on (8.5% total) on short-term capital gains = $6,480');

  console.log("✓ TS Test 14: All newly supported Federal & 50-State tax features (QSS, 65+/Blind, SSA-1099, 1099-R, K-1 QBI, SE Tax, Credits, WA LTCG, NH I&D, MA 8.5% STCG, SC 44% LTCG) verified!");
}

// Test Case 15: Pure Clustered Calculation Blocks, Impact Filtering, Medical 7.5% Floor Math & Variable Breakdown
{
  const blankState: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    residentState: 'CA',
    w2s: [{ id: 0, employer: '', ein: '', box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0, states: [] }],
    otherIncome: { interest: 0, sources: [] },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };
  const blankSummary = calculateTaxes(blankState);
  const blankBlocks = buildCalculationBlocks(blankState, blankSummary);
  assert.strictEqual(blankBlocks.filter(b => b.hasImpact).length, 0, 'Blank return spawns 0 impact calculation blocks');

  const medState: TaxAppState = {
    ...blankState,
    w2s: [{ id: 0, employer: 'Acme', ein: '12-3456789', box1: 80000, box2: 9000, box3: 80000, box4: 4960, box5: 80000, box6: 1160, states: [] }],
    itemizedDeductions: { medicalExpenses: 10000, realEstateTax: 0, mortgageInterest: 0, charity: 0 }
  };
  const medSummary = calculateTaxes(medState);
  const medBlocks = buildCalculationBlocks(medState, medSummary);

  const schedABlock = medBlocks.find(b => b.id === 'calc-itemized-deductions')!;
  assert(schedABlock && schedABlock.hasImpact, 'Schedule A block appears when medical expenses > 0');
  const floorLine = schedABlock.lines.find(l => l.id === 'line-med-floor')!;
  assert(floorLine && floorLine.isIntermediate, 'Schedule A includes intermediate Medical 7.5% AGI Floor line');
  assert.strictEqual(floorLine.resultFormatted, '$6,000', '7.5% of $80,000 AGI = $6,000');
  const dedMedLine = schedABlock.lines.find(l => l.id === 'line-med-deductible')!;
  assert.strictEqual(dedMedLine.formLineLabel, 'Schedule A Line 4', 'Deductible Medical aligns with Schedule A Line 4');
  assert.strictEqual(dedMedLine.resultFormatted, '$4,000', '$10,000 - $6,000 = $4,000');

  const agiBlock = medBlocks.find(b => b.id === 'calc-agi')!;
  assert.strictEqual(agiBlock.variables.interest_inc.isEmpty, true, 'Interest variable is marked empty when 0');
  assert(agiBlock.variables.w2_wages.contributors.some(c => c.sign === '+' && c.isSetUp), 'W-2 wages variable lists + contributor');

  console.log("✓ TS Test 15: Clustered Calculation Blocks, Impact Filtering, Medical 7.5% Math & Variable Breakdowns verified!");
}

// Test Case 16: FormulaNode Expansion (Other Taxes, State/Local Brackets, OSTC) & AutoPanels
{
  const state: TaxAppState = {
    year: 2025,
    filingStatus: 'single',
    residentState: 'NY',
    w2s: [
      {
        id: 0,
        employer: 'NJ Corp',
        ein: '11-1111111',
        box1: 120000,
        box2: 18000,
        box3: 120000,
        box4: 7440,
        box5: 120000,
        box6: 1740,
        states: [{ id: 0, state: 'NJ', stateId: 'NJ-1', stateWages: 120000, stateTaxWithheld: 5000, localWages: 0, localTaxWithheld: 0, localityName: '' }]
      },
      {
        id: 1,
        employer: 'NYC Inc',
        ein: '22-2222222',
        box1: 110000,
        box2: 20000,
        box3: 110000,
        box4: 6820,
        box5: 110000,
        box6: 1595,
        states: [{ id: 1, state: 'NY', stateId: 'NY-1', stateWages: 110000, stateTaxWithheld: 6000, localWages: 110000, localTaxWithheld: 4000, localityName: 'NYC' }]
      }
    ],
    otherIncome: {
      interest: 4000,
      sources: [{ id: 0, type: '1099-NEC', payer: 'Consulting', amount: 15000, state: 'NY' }]
    },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 },
    showAllArrows: true
  };

  const summary = calculateTaxes(state);
  const fedBlocks = buildCalculationBlocks(state, summary);
  const otherTaxesBlock = fedBlocks.find(b => b.id === 'calc-other-taxes')!;
  assert(otherTaxesBlock, 'calc-other-taxes block exists');
  assert(otherTaxesBlock.lines.some(l => l.id === 'line-se-total'), 'Schedule SE intermediate line is expanded');
  assert(otherTaxesBlock.lines.some(l => l.id === 'line-addl-med-tax'), 'Form 8959 Additional Medicare intermediate line is expanded');
  assert(otherTaxesBlock.lines.some(l => l.id === 'line-niit-tax'), 'Form 8960 NIIT intermediate line is expanded');

  const nyReturn = summary.stateReturnsCalc.find(r => r.state === 'NY')!;
  const nyBlocks = buildStateCalcBlocks(nyReturn, summary.stateReturnsCalc);
  assert.strictEqual(nyBlocks.length, 4, 'NY + NYC splits into 4 distinct calculation panels');
  assert.strictEqual(nyBlocks[0].id, 'calc-state-ny-taxable', 'NY Panel 1 is Deductions & Taxable Income');
  assert.strictEqual(nyBlocks[1].id, 'calc-state-ny-tentative', 'NY Panel 2 is State Brackets & Tentative Tax');
  assert(nyBlocks[1].lines.some(l => l.id.startsWith('line-state-ny-tentative-b')), 'NY state bracket waterfall intermediate lines are generated');
  assert.strictEqual(nyBlocks[2].id, 'calc-state-ny-local', 'NY Panel 3 is NYC Local Brackets');
  assert(nyBlocks[2].lines.some(l => l.id.startsWith('line-state-ny-local-b')), 'NYC local bracket waterfall intermediate lines are generated');
  assert.strictEqual(nyBlocks[3].id, 'calc-state-ny-card', 'NY Panel 4 is OSTC, Total Tax & Net Outcome');
  assert(nyBlocks[3].lines.some(l => l.id === 'line-state-ny-ostc-nj'), 'NY OSTC credit FormulaNode line for NJ is generated');

  // Verify DC Form D-30 FormulaNode expansion
  const dcState: TaxAppState = {
    ...state,
    otherIncome: {
      interest: 0,
      sources: [],
      scheduleERental: { grossRents: 28000, expenses: 8200, depreciation: 5000, propertyState: 'DC' }
    }
  };
  const dcSummary = calculateTaxes(dcState);
  const dcReturn = dcSummary.stateReturnsCalc.find(r => r.state === 'DC')!;
  const dcBlocks = buildStateCalcBlocks(dcReturn, dcSummary.stateReturnsCalc);
  assert.strictEqual(dcBlocks.length, 2, 'DC Form D-30 splits into 2 FormulaNode panels');
  assert(dcBlocks[0].lines.some(l => l.id === 'line-dc-d30-salary'), 'DC D-30 30% Salary Allowance line generated');
  assert(dcBlocks[0].lines.some(l => l.id === 'line-dc-d30-taxable'), 'DC D-30 Taxable UBT line generated');
  assert(dcBlocks[1].lines.some(l => l.id === 'line-dc-d30-raw-tax'), 'DC D-30 8.25% Raw UBT Tax line generated');

  const autoPanels = buildAutoPanels(state, summary);
  assert(autoPanels.federal.some(p => p.id === 'auto-fed-std-deduction'), 'Federal Standard Deduction auto panel generated');
  assert(autoPanels.federal.some(p => p.id === 'auto-fed-half-se'), 'Federal 1/2 SE Tax Deduction auto panel generated');
  assert(autoPanels.federal.some(p => p.id === 'auto-fed-qbi'), 'Federal 20% QBI Deduction auto panel generated');
  assert(autoPanels.federal.some(p => p.id === 'auto-fed-excess-ss'), 'Federal Excess SS Tax Credit auto panel generated');
  assert((autoPanels.byState['NY'] || []).some(p => p.id === 'auto-state-ny-ostc-nj'), 'NY OSTC auto panel generated');
  assert((autoPanels.byState['NY'] || []).some(p => p.id === 'auto-state-ny-std-ded'), 'NY Standard Deduction auto panel generated');

  console.log("✓ TS Test 16: FormulaNode Expansion (Other Taxes, State/Local Brackets, OSTC) & AutoPanels verified!");
}

console.log("\nAll 16 TypeScript test suites PASSED with 100% accuracy!\n");



