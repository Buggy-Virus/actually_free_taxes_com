/**
 * Federal tax-law constants by tax year (shared by the formula graph and the legacy engine).
 */

import { FilingStatus, TaxYear, BracketDef } from './types.js';

export type CoreFilingStatus = 'single' | 'married_joint' | 'married_separate' | 'head_of_household';

export interface YearTaxRules {
  standardDeduction: Record<CoreFilingStatus, number>;
  ssWageLimit: number;
  ssRate: number;
  medicareRate: number;
  additionalMedicareRate: number;
  additionalMedicareThreshold: Record<CoreFilingStatus, number>;
  niitRate: number;
  niitThreshold: Record<CoreFilingStatus, number>;
  childTaxCreditPerChild: number;
  childTaxCreditRefundableMax: number;
  childTaxCreditPhaseout: Record<CoreFilingStatus, number>;
  brackets: Record<CoreFilingStatus, BracketDef[]>;
  ltcgBrackets: Record<CoreFilingStatus, BracketDef[]>;
}

export const TAX_CONSTANTS: Record<TaxYear, YearTaxRules> = {
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
    niitRate: 0.038,
    niitThreshold: {
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
    },
    ltcgBrackets: {
      single: [
        { rate: 0.00, min: 0, max: 47025 },
        { rate: 0.15, min: 47025, max: 518900 },
        { rate: 0.20, min: 518900, max: Infinity }
      ],
      married_joint: [
        { rate: 0.00, min: 0, max: 94050 },
        { rate: 0.15, min: 94050, max: 583750 },
        { rate: 0.20, min: 583750, max: Infinity }
      ],
      married_separate: [
        { rate: 0.00, min: 0, max: 47025 },
        { rate: 0.15, min: 47025, max: 291850 },
        { rate: 0.20, min: 291850, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.00, min: 0, max: 63000 },
        { rate: 0.15, min: 63000, max: 551350 },
        { rate: 0.20, min: 551350, max: Infinity }
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
    niitRate: 0.038,
    niitThreshold: {
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
    },
    ltcgBrackets: {
      single: [
        { rate: 0.00, min: 0, max: 48350 },
        { rate: 0.15, min: 48350, max: 533400 },
        { rate: 0.20, min: 533400, max: Infinity }
      ],
      married_joint: [
        { rate: 0.00, min: 0, max: 96700 },
        { rate: 0.15, min: 96700, max: 600050 },
        { rate: 0.20, min: 600050, max: Infinity }
      ],
      married_separate: [
        { rate: 0.00, min: 0, max: 48350 },
        { rate: 0.15, min: 48350, max: 300000 },
        { rate: 0.20, min: 300000, max: Infinity }
      ],
      head_of_household: [
        { rate: 0.00, min: 0, max: 64750 },
        { rate: 0.15, min: 64750, max: 566700 },
        { rate: 0.20, min: 566700, max: Infinity }
      ]
    }
  }
};


export function normalizeFilingStatus(status: FilingStatus): CoreFilingStatus {
  if (status === 'qualifying_surviving_spouse') return 'married_joint';
  return status || 'single';
}
