/**
 * Actually Free Taxes - Tax Calculation Engine
 * Supports 2024 & 2025 IRS federal tax rules, brackets, and transparent formula builders.
 */

export const TAX_CONSTANTS = {
  2024: {
    standardDeduction: {
      single: 14600,
      married_joint: 29200,
      married_separate: 14600,
      head_of_household: 21900
    },
    ssWageLimit: 168600,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: {
      single: 200000,
      married_joint: 250000,
      married_separate: 125000,
      head_of_household: 200000
    },
    childTaxCreditPerChild: 2000,
    childTaxCreditRefundableMax: 1700,
    childTaxCreditPhaseout: {
      single: 200000,
      married_joint: 400000,
      married_separate: 200000,
      head_of_household: 200000
    },
    brackets: {
      single: [
        { rate: 0.10, min: 0, max: 11600 },
        { rate: 0.12, min: 11600, max: 47150 },
        { rate: 0.22, min: 47150, max: 100525 },
        { rate: 0.24, min: 100525, max: 191950 },
        { rate: 0.32, min: 191950, max: 243725 },
        { rate: 0.35, min: 243725, max: 609350 },
        { rate: 0.37, min: 609350, max: Infinity }
      ],
      married_joint: [
        { rate: 0.10, min: 0, max: 23200 },
        { rate: 0.12, min: 23200, max: 94300 },
        { rate: 0.22, min: 94300, max: 201050 },
        { rate: 0.24, min: 201050, max: 383900 },
        { rate: 0.32, min: 383900, max: 487450 },
        { rate: 0.35, min: 487450, max: 731200 },
        { rate: 0.37, min: 731200, max: Infinity }
      ],
      married_separate: [
        { rate: 0.10, min: 0, max: 11600 },
        { rate: 0.12, min: 11600, max: 47150 },
        { rate: 0.22, min: 47150, max: 100525 },
        { rate: 0.24, min: 100525, max: 191950 },
        { rate: 0.32, min: 191950, max: 243725 },
        { rate: 0.35, min: 243725, max: 365600 },
        { rate: 0.37, min: 365600, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.10, min: 0, max: 16550 },
        { rate: 0.12, min: 16550, max: 63100 },
        { rate: 0.22, min: 63100, max: 100500 },
        { rate: 0.24, min: 100500, max: 191950 },
        { rate: 0.32, min: 191950, max: 243700 },
        { rate: 0.35, min: 243700, max: 609350 },
        { rate: 0.37, min: 609350, max: Infinity }
      ]
    }
  },
  2025: {
    standardDeduction: {
      single: 15000,
      married_joint: 30000,
      married_separate: 15000,
      head_of_household: 22500
    },
    ssWageLimit: 176100,
    ssRate: 0.062,
    medicareRate: 0.0145,
    additionalMedicareRate: 0.009,
    additionalMedicareThreshold: {
      single: 200000,
      married_joint: 250000,
      married_separate: 125000,
      head_of_household: 200000
    },
    childTaxCreditPerChild: 2000,
    childTaxCreditRefundableMax: 1700,
    childTaxCreditPhaseout: {
      single: 200000,
      married_joint: 400000,
      married_separate: 200000,
      head_of_household: 200000
    },
    brackets: {
      single: [
        { rate: 0.10, min: 0, max: 11925 },
        { rate: 0.12, min: 11925, max: 48475 },
        { rate: 0.22, min: 48475, max: 103350 },
        { rate: 0.24, min: 103350, max: 197300 },
        { rate: 0.32, min: 197300, max: 250525 },
        { rate: 0.35, min: 250525, max: 626350 },
        { rate: 0.37, min: 626350, max: Infinity }
      ],
      married_joint: [
        { rate: 0.10, min: 0, max: 23850 },
        { rate: 0.12, min: 23850, max: 96950 },
        { rate: 0.22, min: 96950, max: 206700 },
        { rate: 0.24, min: 206700, max: 394600 },
        { rate: 0.32, min: 394600, max: 501050 },
        { rate: 0.35, min: 501050, max: 751600 },
        { rate: 0.37, min: 751600, max: Infinity }
      ],
      married_separate: [
        { rate: 0.10, min: 0, max: 11925 },
        { rate: 0.12, min: 11925, max: 48475 },
        { rate: 0.22, min: 48475, max: 103350 },
        { rate: 0.24, min: 103350, max: 197300 },
        { rate: 0.32, min: 197300, max: 250525 },
        { rate: 0.35, min: 250525, max: 375800 },
        { rate: 0.37, min: 375800, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.10, min: 0, max: 17000 },
        { rate: 0.12, min: 17000, max: 64850 },
        { rate: 0.22, min: 64850, max: 103350 },
        { rate: 0.24, min: 103350, max: 197300 },
        { rate: 0.32, min: 197300, max: 250500 },
        { rate: 0.35, min: 250500, max: 626350 },
        { rate: 0.37, min: 626350, max: Infinity }
      ]
    }
  }
};

export function formatCurrency(num) {
  if (isNaN(num) || num === null || num === undefined) return "$0";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(num);
}

export function formatCurrencyExact(num) {
  if (isNaN(num) || num === null || num === undefined) return "$0.00";
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(num);
}

export function formatPercent(rate) {
  return `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

/**
 * Perform complete tax calculation with fully annotated general & plugged-in equations.
 */
export function calculateTaxes(state) {
  const year = state.year || 2024;
  const filingStatus = state.filingStatus || 'single';
  const rules = TAX_CONSTANTS[year] || TAX_CONSTANTS[2024];

  const w2List = state.w2s && state.w2s.length > 0 ? state.w2s : [{ id: 0, box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0 }];

  // 1. Total W-2 Wages (Box 1)
  const box1Values = w2List.map(w => Number(w.box1) || 0);
  const totalW2Wages = box1Values.reduce((sum, val) => sum + val, 0);
  const w2WageFieldIds = w2List.map((w, idx) => `w2-${w.id || idx}-box1`);

  const w2WagesCalc = {
    result: totalW2Wages,
    sourceFields: w2WageFieldIds,
    generalFormula: w2List.length === 1 ? 'Total Wages = W-2 Box 1' : 'Total Wages = ∑(W-2 Box 1)',
    pluggedFormula: w2List.length === 1
      ? `Total Wages = ${formatCurrency(box1Values[0])}`
      : `Total Wages = ${box1Values.map(v => formatCurrency(v)).join(' + ')} = ${formatCurrency(totalW2Wages)}`
  };

  // Additional Incomes
  const interestIncome = Number(state.otherIncome?.interest) || 0;
  const otherIncomeTotal = interestIncome;

  // 2. Total Gross Income
  const grossIncome = totalW2Wages + otherIncomeTotal;
  const grossIncomeCalc = {
    result: grossIncome,
    sourceFields: ['calc-total-w2-wages', ...(interestIncome > 0 ? ['input-other-interest'] : [])],
    generalFormula: 'Gross Income = Total W-2 Wages + Other Incomes',
    pluggedFormula: interestIncome > 0
      ? `Gross Income = ${formatCurrency(totalW2Wages)} + ${formatCurrency(interestIncome)} = ${formatCurrency(grossIncome)}`
      : `Gross Income = ${formatCurrency(totalW2Wages)} + $0 = ${formatCurrency(grossIncome)}`
  };

  // 3. Adjustments to Income (Above-the-line deductions)
  const studentLoanInterest = Math.min(2500, Number(state.adjustments?.studentLoan) || 0);
  const iraDeduction = Number(state.adjustments?.ira) || 0;
  const hsaDeduction = Number(state.adjustments?.hsa) || 0;
  const totalAdjustments = studentLoanInterest + iraDeduction + hsaDeduction;

  const adjustmentsCalc = {
    result: totalAdjustments,
    sourceFields: ['input-adj-student-loan', 'input-adj-ira', 'input-adj-hsa'],
    generalFormula: 'Adjustments = Student Loan Interest + Traditional IRA + HSA Deduction',
    pluggedFormula: `Adjustments = ${formatCurrency(studentLoanInterest)} + ${formatCurrency(iraDeduction)} + ${formatCurrency(hsaDeduction)} = ${formatCurrency(totalAdjustments)}`
  };

  // 4. Adjusted Gross Income (AGI) - Line 11 on Form 1040
  const agi = Math.max(0, grossIncome - totalAdjustments);
  const agiCalc = {
    result: agi,
    sourceFields: ['calc-gross-income', 'calc-total-adjustments'],
    generalFormula: 'Adjusted Gross Income (AGI) = Gross Income − Adjustments',
    pluggedFormula: `AGI = ${formatCurrency(grossIncome)} − ${formatCurrency(totalAdjustments)} = ${formatCurrency(agi)}`
  };

  // 5. Standard Deduction
  const standardDeductionBase = rules.standardDeduction[filingStatus] || 14600;
  const deductionCalc = {
    result: standardDeductionBase,
    sourceFields: ['select-filing-status', 'select-tax-year'],
    generalFormula: `Standard Deduction (${filingStatusLabel(filingStatus)}, Year ${year})`,
    pluggedFormula: `Standard Deduction = ${formatCurrency(standardDeductionBase)}`
  };

  // 6. Taxable Income - Line 15 on Form 1040
  const taxableIncome = Math.max(0, agi - standardDeductionBase);
  const taxableIncomeCalc = {
    result: taxableIncome,
    sourceFields: ['calc-agi', 'calc-standard-deduction'],
    generalFormula: 'Taxable Income = max(0, AGI − Standard Deduction)',
    pluggedFormula: `Taxable Income = max(0, ${formatCurrency(agi)} − ${formatCurrency(standardDeductionBase)}) = ${formatCurrency(taxableIncome)}`
  };

  // 7. Federal Income Tax (Marginal Tax Brackets calculation)
  const brackets = rules.brackets[filingStatus] || rules.brackets.single;
  const bracketDetails = [];
  let tentativeTax = 0;
  const bracketFormulaParts = [];

  for (let i = 0; i < brackets.length; i++) {
    const b = brackets[i];
    if (taxableIncome > b.min) {
      const taxableInBracket = Math.min(taxableIncome, b.max) - b.min;
      const taxFromBracket = taxableInBracket * b.rate;
      tentativeTax += taxFromBracket;

      const maxLabel = b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`;
      bracketDetails.push({
        bracketIndex: i + 1,
        rate: b.rate,
        ratePercent: formatPercent(b.rate),
        range: `${formatCurrency(b.min)}${maxLabel}`,
        taxableAmount: taxableInBracket,
        taxAmount: taxFromBracket,
        formula: `${formatCurrency(taxableInBracket)} × ${formatPercent(b.rate)} = ${formatCurrency(taxFromBracket)}`
      });

      bracketFormulaParts.push(`(${formatCurrency(taxableInBracket)} × ${formatPercent(b.rate)})`);
    } else {
      bracketDetails.push({
        bracketIndex: i + 1,
        rate: b.rate,
        ratePercent: formatPercent(b.rate),
        range: `${formatCurrency(b.min)}${b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`}`,
        taxableAmount: 0,
        taxAmount: 0,
        formula: `$0 × ${formatPercent(b.rate)} = $0`
      });
    }
  }

  const taxBeforeCredits = tentativeTax;
  const taxBeforeCreditsCalc = {
    result: taxBeforeCredits,
    sourceFields: ['calc-taxable-income', 'select-filing-status'],
    generalFormula: 'Tentative Tax = ∑(Taxable Income in Bracket i × Bracket Rate i)',
    pluggedFormula: bracketFormulaParts.length > 0
      ? `Tentative Tax = ${bracketFormulaParts.join(' + ')} = ${formatCurrencyExact(taxBeforeCredits)}`
      : `Tentative Tax = $0 × 10% = $0.00`,
    brackets: bracketDetails
  };

  // 8. Tax Credits (Child Tax Credit)
  const numChildren = Math.max(0, parseInt(state.dependents?.childrenCount, 10) || 0);
  let childCreditAllowed = 0;
  let childCreditPhaseoutAmount = 0;

  if (numChildren > 0) {
    const maxPotentialCredit = numChildren * rules.childTaxCreditPerChild;
    const threshold = rules.childTaxCreditPhaseout[filingStatus] || 200000;
    if (agi > threshold) {
      const excess = agi - threshold;
      const chunks = Math.ceil(excess / 1000);
      childCreditPhaseoutAmount = chunks * 50;
    }
    childCreditAllowed = Math.max(0, Math.min(taxBeforeCredits, maxPotentialCredit - childCreditPhaseoutAmount));
  }

  const creditsCalc = {
    result: childCreditAllowed,
    sourceFields: ['input-children-count', 'calc-agi', 'calc-tax-before-credits'],
    generalFormula: 'Tax Credits = min(Tax Liability, Qualifying Children × $2,000 − Phaseout)',
    pluggedFormula: numChildren > 0
      ? `Credits = min(${formatCurrency(taxBeforeCredits)}, ${numChildren} × $2,000 ${childCreditPhaseoutAmount > 0 ? `− ${formatCurrency(childCreditPhaseoutAmount)}` : ''}) = ${formatCurrency(childCreditAllowed)}`
      : `Credits = 0 qualifying children = $0`
  };

  // 9. Total Federal Tax Liability
  const totalTaxLiability = Math.max(0, taxBeforeCredits - childCreditAllowed);
  const totalTaxCalc = {
    result: totalTaxLiability,
    sourceFields: ['calc-tax-before-credits', 'calc-total-credits'],
    generalFormula: 'Total Tax Liability = max(0, Tentative Tax − Total Credits)',
    pluggedFormula: `Total Tax Liability = max(0, ${formatCurrencyExact(taxBeforeCredits)} − ${formatCurrency(childCreditAllowed)}) = ${formatCurrencyExact(totalTaxLiability)}`
  };

  // 10. Total Federal Income Tax Withheld (Box 2 from all W-2s)
  const box2Values = w2List.map(w => Number(w.box2) || 0);
  const totalWithheld = box2Values.reduce((sum, val) => sum + val, 0);
  const w2WithheldFieldIds = w2List.map((w, idx) => `w2-${w.id || idx}-box2`);

  const withholdingCalc = {
    result: totalWithheld,
    sourceFields: w2WithheldFieldIds,
    generalFormula: w2List.length === 1 ? 'Total Withholding = W-2 Box 2' : 'Total Withholding = ∑(W-2 Box 2)',
    pluggedFormula: w2List.length === 1
      ? `Total Withholding = ${formatCurrencyExact(box2Values[0])}`
      : `Total Withholding = ${box2Values.map(v => formatCurrencyExact(v)).join(' + ')} = ${formatCurrencyExact(totalWithheld)}`
  };

  // 11. Final Refund or Amount You Owe
  const netDifference = totalWithheld - totalTaxLiability;
  const isRefund = netDifference >= 0;
  const finalAmount = Math.abs(netDifference);

  const finalResultCalc = {
    result: finalAmount,
    isRefund: isRefund,
    netDifference: netDifference,
    sourceFields: ['calc-total-withholding', 'calc-total-tax-liability'],
    generalFormula: isRefund
      ? 'Refund = Total Payments (Withholding) − Total Tax Liability'
      : 'Amount Owed = Total Tax Liability − Total Payments (Withholding)',
    pluggedFormula: isRefund
      ? `Refund = ${formatCurrencyExact(totalWithheld)} − ${formatCurrencyExact(totalTaxLiability)} = ${formatCurrencyExact(finalAmount)}`
      : `Amount Owed = ${formatCurrencyExact(totalTaxLiability)} − ${formatCurrencyExact(totalWithheld)} = ${formatCurrencyExact(finalAmount)}`
  };

  // 12. FICA Breakdown (Social Security & Medicare from W2 boxes 3, 4, 5, 6)
  const box3Values = w2List.map(w => Number(w.box3) || 0);
  const box4Values = w2List.map(w => Number(w.box4) || 0);
  const box5Values = w2List.map(w => Number(w.box5) || 0);
  const box6Values = w2List.map(w => Number(w.box6) || 0);

  const totalSSWages = box3Values.reduce((s, v) => s + v, 0);
  const totalSSTax = box4Values.reduce((s, v) => s + v, 0);
  const totalMedWages = box5Values.reduce((s, v) => s + v, 0);
  const totalMedTax = box6Values.reduce((s, v) => s + v, 0);
  const totalFicaWithheld = totalSSTax + totalMedTax;

  const ficaCalc = {
    ssWages: totalSSWages,
    ssTax: totalSSTax,
    medWages: totalMedWages,
    medTax: totalMedTax,
    totalFica: totalFicaWithheld,
    sourceFields: [
      ...w2List.map((w, idx) => `w2-${w.id || idx}-box4`),
      ...w2List.map((w, idx) => `w2-${w.id || idx}-box6`)
    ],
    generalFormula: 'Total FICA Taxes = Social Security Tax (Box 4) + Medicare Tax (Box 6)',
    pluggedFormula: `Total FICA = ${formatCurrencyExact(totalSSTax)} + ${formatCurrencyExact(totalMedTax)} = ${formatCurrencyExact(totalFicaWithheld)}`
  };

  // Effective Tax Rate
  const effectiveRate = grossIncome > 0 ? (totalTaxLiability / grossIncome) : 0;
  const effectiveRateCalc = {
    rate: effectiveRate,
    sourceFields: ['calc-total-tax-liability', 'calc-gross-income'],
    generalFormula: 'Effective Tax Rate = Total Tax Liability ÷ Gross Income',
    pluggedFormula: `Effective Rate = ${formatCurrencyExact(totalTaxLiability)} ÷ ${formatCurrency(grossIncome)} = ${formatPercent(effectiveRate)}`
  };

  return {
    year,
    filingStatus,
    w2Count: w2List.length,
    w2WagesCalc,
    grossIncomeCalc,
    adjustmentsCalc,
    agiCalc,
    deductionCalc,
    taxableIncomeCalc,
    taxBeforeCreditsCalc,
    creditsCalc,
    totalTaxCalc,
    withholdingCalc,
    finalResultCalc,
    ficaCalc,
    effectiveRateCalc
  };
}

export function filingStatusLabel(status) {
  switch (status) {
    case 'single': return 'Single';
    case 'married_joint': return 'Married Filing Jointly';
    case 'married_separate': return 'Married Filing Separately';
    case 'head_of_household': return 'Head of Household';
    default: return 'Single';
  }
}
