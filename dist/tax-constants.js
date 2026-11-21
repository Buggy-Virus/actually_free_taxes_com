/**
 * Federal tax-law constants by tax year (shared by the formula graph and the legacy engine).
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
        // P.L. 119-21 §70102 (July 4, 2025) raised the 2025 standard deduction.
        standardDeduction: {
            single: 15750,
            married_joint: 31500,
            married_separate: 15750,
            head_of_household: 23625
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
        childTaxCreditPerChild: 2200,
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
    },
    2026: {
        // Rev. Proc. 2025-32 §4.01, §4.03, §4.05, §4.14; SSA 2026 wage base.
        standardDeduction: {
            single: 16100,
            married_joint: 32200,
            married_separate: 16100,
            head_of_household: 24150
        },
        ssWageLimit: 184500,
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
        childTaxCreditPerChild: 2200,
        childTaxCreditRefundableMax: 1700,
        childTaxCreditPhaseout: {
            single: 200000,
            married_joint: 400000,
            married_separate: 200000,
            head_of_household: 200000
        },
        brackets: {
            single: [
                { rate: 0.10, min: 0, max: 12400 },
                { rate: 0.12, min: 12400, max: 50400 },
                { rate: 0.22, min: 50400, max: 105700 },
                { rate: 0.24, min: 105700, max: 201775 },
                { rate: 0.32, min: 201775, max: 256225 },
                { rate: 0.35, min: 256225, max: 640600 },
                { rate: 0.37, min: 640600, max: Infinity }
            ],
            married_joint: [
                { rate: 0.10, min: 0, max: 24800 },
                { rate: 0.12, min: 24800, max: 100800 },
                { rate: 0.22, min: 100800, max: 211400 },
                { rate: 0.24, min: 211400, max: 403550 },
                { rate: 0.32, min: 403550, max: 512450 },
                { rate: 0.35, min: 512450, max: 768700 },
                { rate: 0.37, min: 768700, max: Infinity }
            ],
            married_separate: [
                { rate: 0.10, min: 0, max: 12400 },
                { rate: 0.12, min: 12400, max: 50400 },
                { rate: 0.22, min: 50400, max: 105700 },
                { rate: 0.24, min: 105700, max: 201775 },
                { rate: 0.32, min: 201775, max: 256225 },
                { rate: 0.35, min: 256225, max: 384350 },
                { rate: 0.37, min: 384350, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.10, min: 0, max: 17700 },
                { rate: 0.12, min: 17700, max: 67450 },
                { rate: 0.22, min: 67450, max: 105700 },
                { rate: 0.24, min: 105700, max: 201750 },
                { rate: 0.32, min: 201750, max: 256200 },
                { rate: 0.35, min: 256200, max: 640600 },
                { rate: 0.37, min: 640600, max: Infinity }
            ]
        },
        ltcgBrackets: {
            single: [
                { rate: 0.00, min: 0, max: 49450 },
                { rate: 0.15, min: 49450, max: 545500 },
                { rate: 0.20, min: 545500, max: Infinity }
            ],
            married_joint: [
                { rate: 0.00, min: 0, max: 98900 },
                { rate: 0.15, min: 98900, max: 613700 },
                { rate: 0.20, min: 613700, max: Infinity }
            ],
            married_separate: [
                { rate: 0.00, min: 0, max: 49450 },
                { rate: 0.15, min: 49450, max: 306850 },
                { rate: 0.20, min: 306850, max: Infinity }
            ],
            head_of_household: [
                { rate: 0.00, min: 0, max: 66200 },
                { rate: 0.15, min: 66200, max: 579600 },
                { rate: 0.20, min: 579600, max: Infinity }
            ]
        }
    }
};
export function normalizeFilingStatus(status) {
    if (status === 'qualifying_surviving_spouse')
        return 'married_joint';
    return status || 'single';
}
