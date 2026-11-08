import { calculateTaxes } from '../tax-engine.js';
import { getFieldRating, renderRatingPill, renderRatingCardHtml, renderRatingCircles, renderFieldExplanationDrawer, renderExplainToggleBtn } from '../field-ratings.js';
import assert from 'assert';
console.log("Running TypeScript Tax Engine Verification Suite...\n");
// Test Case 1: Single filer with $75,000 W-2 in California
{
    const state = {
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
    const state = {
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
    const state = {
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
    const state = {
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
    assert(res.stateTaxCalc.pluggedFormula.includes('CA: $2,800.00'), 'Formula includes CA');
    assert(res.stateTaxCalc.pluggedFormula.includes('NY: $1,250.00'), 'Formula includes NY');
    assert(res.stateTaxCalc.pluggedFormula.includes('NJ: $450.00'), 'Formula includes NJ');
    console.log("✓ TS Test 4: Multi-State W-2s (CA + NY + NJ) verified correctly!");
}
// Test Case 5: Additional Income Sources (1099-NEC Freelance + 1099-DIV Dividends + Interest)
{
    const state = {
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
    assert.strictEqual(res.grossIncomeCalc.result, 80700, 'Gross income with extra income sources');
    assert.strictEqual(res.agiCalc.result, 80200, 'AGI with $500 student loan interest adjustment');
    assert(res.grossIncomeCalc.sourceFields.includes('input-income-source-1'), 'Sources include freelance input');
    assert(res.grossIncomeCalc.sourceFields.includes('input-income-source-2'), 'Sources include dividends input');
    console.log("✓ TS Test 5: Additional Income Sources (1099-NEC + 1099-DIV) verified correctly!");
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
    // Verify Circle Generation for Student Loan (White attention, White risk, Green max savings !)
    const loanCircles = renderRatingCircles('adj-student-loan');
    assert(loanCircles.includes('circle-attention circle-att-1'), 'Student loan attention is 1 (white / safe to ignore)');
    assert(!loanCircles.includes('circle-att-1 is-max'), 'Student loan attention is not max');
    assert(loanCircles.includes('circle-risk circle-risk-1'), 'Student loan risk is 1 (white / low risk)');
    assert(!loanCircles.includes('circle-risk-1 is-max'), 'Student loan risk is not max');
    assert(loanCircles.includes('circle-savings circle-save-3 is-max'), 'Student loan savings is max 3 (green !)');
    const loanExclamationCount = (loanCircles.match(/>\s*!\s*<\/span>/g) || []).length;
    assert.strictEqual(loanExclamationCount, 1, 'Student loan deduction has exactly 1 max rating with ! (Savings)');
    // Verify Pill HTML incorporates the rating circles
    const pillHtml = renderRatingPill('w2-box1');
    assert(pillHtml.includes('rating-circles-cluster'), 'Pill contains circles cluster');
    assert(pillHtml.includes('Must be 100% Accurate'), 'Renders accurate pill text');
    assert(pillHtml.includes('data-rating-field="w2-box1"'), 'Pill has data-rating-field');
    // Verify Scorecard Modal HTML incorporates the rating circles and legend banner
    const cardHtml = renderRatingCardHtml('w2-box2');
    assert(cardHtml.includes('modal-circle-legend-banner'), 'Modal includes circle legend banner');
    assert(cardHtml.includes('White (safe to ignore) ➔ Yellow (needs attention)'), 'Legend explains yellow attention');
    assert(cardHtml.includes('White (low risk) ➔ Red (high IRS audit risk)'), 'Legend explains red risk');
    assert(cardHtml.includes('White ($0) ➔ Green (high cash savings)'), 'Legend explains green savings');
    assert(cardHtml.includes('If left blank:'), 'Includes importance dimension');
    assert(cardHtml.includes('IRS &amp; Audit Risk'), 'Includes IRS risk dimension');
    assert(cardHtml.includes('Savings Potential'), 'Includes savings dimension');
    assert(cardHtml.includes('Applicability &amp; Frequency'), 'Includes applicability dimension');
    console.log("✓ TS Test 6: Field Ratings & IRS Risk Engine (with Color Circles & '!' on Max) verified correctly!");
}
// Test Case 7: Advanced Features — HSA, Capital Loss Limit (-$3k cap), Schedule C Business Expenses & Itemized Deductions (Schedule A)
{
    // Sub-case A: Capital loss capping and Schedule C expenses
    const stateA = {
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
            capitalGains: { shortTerm: -5000, longTerm: -2000 },
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
    // Adjustments: 2,000 (IRA) + 3,500 (HSA) = 5,500
    assert.strictEqual(resA.adjustmentsCalc.result, 5500, 'Adjustments include IRA and HSA');
    // AGI: 85,500 - 5,500 = 80,000
    assert.strictEqual(resA.agiCalc.result, 80000, 'AGI is 80,000');
    // Standard deduction is $14,600, higher than $0 itemized, so auto picks standard
    assert.strictEqual(resA.deductionCalc.result, 14600, 'Auto picks Standard Deduction when itemized is lower');
    assert.strictEqual(resA.itemizedCalc.chosenMethod, 'standard', 'Chosen method is standard');
    // Sub-case B: Schedule A Itemized Deductions exceeding Standard Deduction
    // AGI = $80,000. 7.5% of AGI = $6,000 floor.
    // Medical = $10,000 -> Deductible = 10,000 - 6,000 = $4,000.
    // State tax withheld = $3,500 + Real estate tax = $8,000 -> Sum = $11,500, capped at $10,000 SALT!
    // Mortgage interest = $9,000. Charity = $2,500.
    // Total Itemized = $4,000 (Medical) + $10,000 (SALT) + $9,000 (Mortgage) + $2,500 (Charity) = $25,500!
    // $25,500 > $14,600 standard deduction -> Engine should automatically select itemized!
    const stateB = {
        ...stateA,
        itemizedDeductions: {
            medicalExpenses: 10000,
            realEstateTax: 8000,
            mortgageInterest: 9000,
            charity: 2500
        }
    };
    const resB = calculateTaxes(stateB);
    assert.strictEqual(resB.itemizedCalc.medicalDeductible, 4000, 'Medical deductible after 7.5% floor (10k - 6k)');
    assert.strictEqual(resB.itemizedCalc.saltDeduction, 10000, 'SALT capped at $10,000 (3,500 CA tax + 8,000 property = 11,500 -> 10,000)');
    assert.strictEqual(resB.itemizedCalc.totalItemizedDeductions, 25500, 'Total itemized = 4,000 + 10,000 + 9,000 + 2,500 = 25,500');
    assert.strictEqual(resB.itemizedCalc.chosenMethod, 'itemized', 'Auto optimal method switches to itemized');
    assert.strictEqual(resB.deductionCalc.result, 25500, 'Deduction applied to return is $25,500 (saving an extra $10,900 off income!)');
    // Sub-case C: Manual override to force Standard Deduction
    const stateC = {
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
console.log("\nAll 8 TypeScript test suites PASSED with 100% accuracy!\n");
