/**
 * Form 1040 line values read from the formula graph (E1 PDF export, E2 line-by-line guide).
 * Every amount is a graph quantity or a sum of them, so the form shows exactly what the calculation blocks show.
 */
import { FORM_1040_FIELDS } from './form1040-fields.js';
export function form1040Lines(ev, year) {
    const v = (id) => (ev.graph.inputs.has(id) ? ev.inputValue(id) : ev.graph.quantities.has(id) && ev.applies(id) ? ev.value(id) : 0);
    const sum = (...ids) => ids.reduce((s, id) => s + v(id), 0);
    const r = (x) => Math.round(x * 100) / 100;
    const out = [];
    const add = (line, label, value, sources) => out.push({ line, label, value: r(value), sources });
    const line1z = sum('fed.wages', 'fed.depCareTaxable', 'in.tips');
    add('1a', 'Wages (W-2 box 1)', v('fed.wages'), ['fed.wages']);
    add('1c', 'Tip income not reported on W-2', v('in.tips'), ['in.tips']);
    add('1e', 'Taxable dependent care benefits', v('fed.depCareTaxable'), ['fed.depCareTaxable']);
    add('1z', 'Total wages', line1z, ['fed.wages', 'fed.depCareTaxable', 'in.tips']);
    add('2a', 'Tax-exempt interest', v('fed.taxExemptInterest'), ['fed.taxExemptInterest']);
    add('2b', 'Taxable interest', v('fed.interestTotal'), ['fed.interestTotal']);
    add('3a', 'Qualified dividends', v('fed.qualifiedDividends'), ['fed.qualifiedDividends']);
    add('3b', 'Ordinary dividends', v('fed.dividends'), ['fed.dividends']);
    add('5b', 'Pensions, annuities and IRA distributions (taxable)', v('fed.retirement'), ['fed.retirement']);
    add('6a', 'Social Security benefits', v('fed.ssaGross'), ['fed.ssaGross']);
    add('6b', 'Taxable Social Security', v('fed.taxableSS'), ['fed.taxableSS']);
    const line7 = year >= 2025 ? '7a' : '7';
    add(line7, 'Capital gain or (loss)', v('fed.capAllowed'), ['fed.capAllowed']);
    // Line 8 (Schedule 1 additional income) is what remains of total income; the NOL deduction belongs there too.
    const line8 = v('fed.totalIncome') - line1z - sum('fed.interestTotal', 'fed.dividends', 'fed.retirement', 'fed.taxableSS', 'fed.capAllowed') - v('fed.nolDeduction');
    add('8', 'Additional income (Schedule 1, line 10)', line8, ['fed.totalIncome', 'fed.nolDeduction']);
    add('9', 'Total income', v('fed.totalIncome') - v('fed.nolDeduction'), ['fed.totalIncome', 'fed.nolDeduction']);
    add('10', 'Adjustments to income (Schedule 1, line 26)', v('fed.adjustments'), ['fed.adjustments']);
    if (year >= 2025) {
        add('11a', 'Adjusted gross income', v('fed.agi'), ['fed.agi']);
        add('11b', 'Adjusted gross income (from page 1)', v('fed.agi'), ['fed.agi']);
        add('12e', 'Standard or itemized deduction', v('fed.deduction'), ['fed.deduction']);
        add('13a', 'Qualified business income deduction', v('fed.qbi'), ['fed.qbi']);
        add('13b', 'Schedule 1-A deductions' + (year >= 2026 ? ' and non-itemizer charity' : ''), sum('fed.sched1a', 'fed.nonItemizerCharity'), ['fed.sched1a', 'fed.nonItemizerCharity']);
    }
    else {
        add('11', 'Adjusted gross income', v('fed.agi'), ['fed.agi']);
        add('12', 'Standard or itemized deduction', v('fed.deduction'), ['fed.deduction']);
        add('13', 'Qualified business income deduction', v('fed.qbi'), ['fed.qbi']);
    }
    add('14', 'Total deductions', sum('fed.deduction', 'fed.qbi', 'fed.sched1a', 'fed.nonItemizerCharity'), ['fed.deduction', 'fed.qbi', 'fed.sched1a', 'fed.nonItemizerCharity']);
    add('15', 'Taxable income', v('fed.taxableIncome'), ['fed.taxableIncome']);
    add('16', 'Tax', v('fed.tax'), ['fed.tax']);
    const sched2Part1 = sum('fed.amt', 'fed.excessAptcRepayment');
    add('17', 'Schedule 2, line 3 (AMT, excess advance PTC)', sched2Part1, ['fed.amt', 'fed.excessAptcRepayment']);
    add('18', 'Add lines 16 and 17', v('fed.tax') + sched2Part1, ['fed.tax', 'fed.amt', 'fed.excessAptcRepayment']);
    const line19 = Math.min(v('fed.nonrefundableCredits'), sum('fed.ctcAllowed', 'fed.odcAllowed'));
    add('19', 'Child tax credit / credit for other dependents', line19, ['fed.ctcAllowed', 'fed.odcAllowed']);
    add('20', 'Schedule 3, line 8 (other nonrefundable credits)', v('fed.nonrefundableCredits') - line19, ['fed.nonrefundableCredits']);
    add('21', 'Total nonrefundable credits', v('fed.nonrefundableCredits'), ['fed.nonrefundableCredits']);
    add('22', 'Tax after credits', Math.max(0, v('fed.tax') + sched2Part1 - v('fed.nonrefundableCredits')), ['fed.tax', 'fed.nonrefundableCredits']);
    add('23', 'Other taxes (Schedule 2, line 21)', v('fed.otherTaxes') - sched2Part1, ['fed.otherTaxes']);
    add('24', 'Total tax', v('fed.totalTax'), ['fed.totalTax']);
    add('25a', 'Federal tax withheld — Forms W-2', v('fed.w2Withholding'), ['fed.w2Withholding']);
    add('25b', 'Federal tax withheld — Forms 1099', v('fed.extraWithholding'), ['fed.extraWithholding']);
    add('25c', 'Federal tax withheld — other forms (Additional Medicare)', v('fed.addlMedicareWithheld'), ['fed.addlMedicareWithheld']);
    add('25d', 'Total federal tax withheld', sum('fed.w2Withholding', 'fed.extraWithholding', 'fed.addlMedicareWithheld'), ['fed.w2Withholding', 'fed.extraWithholding', 'fed.addlMedicareWithheld']);
    add('26', 'Estimated tax payments', v('in.estimatedPayments'), ['in.estimatedPayments']);
    add(year >= 2025 ? '27a' : '27', 'Earned income credit', v('fed.eitc'), ['fed.eitc']);
    add('28', 'Additional child tax credit', v('fed.actc'), ['fed.actc']);
    add('29', 'American opportunity credit (refundable part)', v('fed.aotcRefundable'), ['fed.aotcRefundable']);
    const line31 = v('fed.payments') - sum('fed.w2Withholding', 'fed.extraWithholding', 'fed.addlMedicareWithheld', 'in.estimatedPayments', 'fed.eitc', 'fed.actc', 'fed.aotcRefundable');
    add('31', 'Schedule 3, line 15 (net PTC, excess Social Security, other)', line31, ['fed.payments']);
    add('32', 'Total other payments and refundable credits', line31 + sum('fed.eitc', 'fed.actc', 'fed.aotcRefundable'), ['fed.refundableCredits']);
    add('33', 'Total payments', v('fed.payments'), ['fed.payments']);
    add('34', 'Overpaid', v('fed.refund'), ['fed.refund']);
    add('35a', 'Refunded to you', v('fed.refundApplied') > 0 ? v('fed.refundPaid') : v('fed.refund'), ['fed.refund', 'fed.refundPaid']);
    add('36', "Applied to next year's estimated tax", v('fed.refundApplied'), ['fed.refundApplied']);
    add('37', 'Amount you owe', v('fed.owed'), ['fed.owed']);
    return out;
}
/** The Form 1040 layout used for a tax year (2026 uses the 2025 layout until the 2026 form is published). */
export const form1040Year = (year) => (year >= 2025 ? 2025 : 2024);
/** Refund direct-deposit fields (Form 1040 lines 35b and 35d) by layout year. */
export const REFUND_ACCOUNT_FIELDS = {
    2024: { routing: 'topmostSubform[0].Page2[0].RoutingNo[0].f2_25[0]', account: 'topmostSubform[0].Page2[0].AccountNo[0].f2_26[0]' },
    2025: { routing: 'topmostSubform[0].Page2[0].RoutingNo[0].f2_32[0]', account: 'topmostSubform[0].Page2[0].AccountNo[0].f2_33[0]' }
};
/** Field name → text for filling the IRS fillable PDF (whole dollars, blank for zero). */
export function form1040FieldValues(lines, year) {
    const fields = FORM_1040_FIELDS[form1040Year(year)] || {};
    const out = {};
    lines.forEach(l => {
        const name = fields[l.line];
        if (name && Math.round(l.value) !== 0)
            out[name] = Math.round(l.value).toLocaleString('en-US');
    });
    return out;
}
