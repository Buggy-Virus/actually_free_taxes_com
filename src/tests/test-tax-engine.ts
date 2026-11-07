import { calculateTaxes } from '../tax-engine.js';
import { TaxAppState } from '../types.js';
import assert from 'assert';

console.log("Running TypeScript Tax Engine Verification Suite...\n");

// Test Case 1: Single filer with $75,000 W-2
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    w2s: [
      { id: 0, employer: 'Acme Corp', ein: '12-3456789', box1: 75000, box2: 8900, box3: 75000, box4: 4650, box5: 75000, box6: 1087.50 }
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

  console.log("✓ TS Test 1: Single Filer ($75k) verified correctly!");
}

// Test Case 2: Dual-income Married Filing Jointly with 1 Child
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'married_joint',
    w2s: [
      { id: 0, employer: 'TechCorp', ein: '11-2233445', box1: 82000, box2: 9600, box3: 82000, box4: 5084, box5: 82000, box6: 1189 },
      { id: 1, employer: 'HealthSys', ein: '55-6677889', box1: 58000, box2: 6800, box3: 58000, box4: 3596, box5: 58000, box6: 841 }
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

  console.log("✓ TS Test 2: Dual-Income Married ($140k + 1 Kid) verified correctly!");
}

// Test Case 3: Tax Balance Owed scenario
{
  const state: TaxAppState = {
    year: 2024,
    filingStatus: 'single',
    w2s: [
      { id: 0, employer: 'Consulting Inc', ein: '99-8877665', box1: 90000, box2: 5000, box3: 90000, box4: 5580, box5: 90000, box6: 1305 }
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

  console.log("✓ TS Test 3: Tax Balance Owed verified correctly!");
}

console.log("\nAll TypeScript test suites PASSED with 100% accuracy!\n");
