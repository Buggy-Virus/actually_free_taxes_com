import { calculateTaxes, formatCurrency, formatCurrencyExact } from '../js/tax-engine.js';
import assert from 'assert';

console.log("Running Tax Engine Verification Suite...\n");

// Test Case 1: Single filer with $75,000 W-2
{
  const state = {
    year: 2024,
    filingStatus: 'single',
    w2s: [
      { id: 0, box1: 75000, box2: 8900, box3: 75000, box4: 4650, box5: 75000, box6: 1087.50 }
    ],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 }
  };

  const res = calculateTaxes(state);

  assert.strictEqual(res.w2WagesCalc.result, 75000, 'Total wages should be 75,000');
  assert.strictEqual(res.grossIncomeCalc.result, 75000, 'Gross income should be 75,000');
  assert.strictEqual(res.agiCalc.result, 75000, 'AGI should be 75,000');
  assert.strictEqual(res.deductionCalc.result, 14600, 'Standard deduction for single 2024 is 14,600');
  assert.strictEqual(res.taxableIncomeCalc.result, 60400, 'Taxable income is 75000 - 14600 = 60400');

  // Verify tax brackets:
  // 10% on first $11,600 = $1,160.00
  // 12% on next ($47,150 - $11,600 = $35,550) = $4,266.00
  // 22% on remaining ($60,400 - $47,150 = $13,250) = $2,915.00
  // Total tax = 1160 + 4266 + 2915 = 8341
  assert.strictEqual(Math.round(res.totalTaxCalc.result), 8341, 'Total tax should be 8341');
  assert.strictEqual(res.withholdingCalc.result, 8900, 'Total withholding is 8900');
  assert.strictEqual(res.finalResultCalc.isRefund, true, 'Should be a refund');
  assert.strictEqual(Math.round(res.finalResultCalc.result), 559, 'Refund amount should be 559');

  // Verify equation outputs exist and contain numbers
  assert(res.taxableIncomeCalc.generalFormula.includes('max(0, AGI − Standard Deduction)'), 'Taxable income general formula check');
  assert(res.taxableIncomeCalc.pluggedFormula.includes('$75,000 − $14,600'), 'Taxable income plugged formula check');
  assert(res.finalResultCalc.pluggedFormula.includes('$8,900.00 − $8,341.00'), 'Final verdict plugged formula check');

  console.log("✓ Test 1: Single Filer ($75k) verified correctly!");
}

// Test Case 2: Dual-income Married Filing Jointly with 1 Child
{
  const state = {
    year: 2024,
    filingStatus: 'married_joint',
    w2s: [
      { id: 0, box1: 82000, box2: 9600, box3: 82000, box4: 5084, box5: 82000, box6: 1189 },
      { id: 1, box1: 58000, box2: 6800, box3: 58000, box4: 3596, box5: 58000, box6: 841 }
    ],
    otherIncome: { interest: 450 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 1 }
  };

  const res = calculateTaxes(state);

  assert.strictEqual(res.w2WagesCalc.result, 140000, 'Total wages should be 140,000');
  assert.strictEqual(res.grossIncomeCalc.result, 140450, 'Gross income should be 140,450');
  assert.strictEqual(res.deductionCalc.result, 29200, 'Standard deduction for married joint 2024 is 29,200');
  assert.strictEqual(res.taxableIncomeCalc.result, 140450 - 29200, 'Taxable income matches');
  assert.strictEqual(res.creditsCalc.result, 2000, 'Child tax credit of $2,000 applied');
  assert.strictEqual(res.withholdingCalc.result, 16400, 'Total withholding matches (9600 + 6800)');
  assert.strictEqual(res.finalResultCalc.isRefund, true, 'Result is refund');

  console.log("✓ Test 2: Dual-Income Married ($140k + 1 Kid) verified correctly!");
}

// Test Case 3: Tax Balance Owed scenario
{
  const state = {
    year: 2024,
    filingStatus: 'single',
    w2s: [
      { id: 0, box1: 90000, box2: 5000, box3: 90000, box4: 5580, box5: 90000, box6: 1305 }
    ],
    otherIncome: { interest: 0 },
    adjustments: { studentLoan: 0, ira: 0, hsa: 0 },
    dependents: { childrenCount: 0 }
  };

  const res = calculateTaxes(state);
  assert.strictEqual(res.finalResultCalc.isRefund, false, 'Should owe taxes when withholding is low');
  assert(res.finalResultCalc.result > 0, 'Amount owed must be positive');
  assert(res.finalResultCalc.generalFormula.includes('Amount Owed'), 'General formula should reflect Amount Owed');

  console.log("✓ Test 3: Tax Balance Owed verified correctly!");
}

console.log("\nAll 3 test suites PASSED with 100% accuracy!\n");
