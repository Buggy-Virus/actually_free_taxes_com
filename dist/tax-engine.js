/**
 * Actually Free Taxes - Tax Calculation Engine (TypeScript)
 * Supports 2024 & 2025 IRS federal tax rules, brackets, and transparent formula builders.
 */
import { normalizeFilingStatus } from './tax-constants.js';
export { TAX_CONSTANTS, normalizeFilingStatus } from './tax-constants.js';
import { FEDERAL_BLOCKS, FEDERAL_AUTO_PANELS } from './graph/federal.js';
import { planFromState, returnGraph, returnContext, stateBlocks, stateId, STATE_EITC_MULTIPLIERS } from './graph/states.js';
import { getStateTaxRule } from './state-rules.js';
export { NYC_LOCAL_BRACKETS, STATE_TAX_RULES, getStateTaxRule } from './state-rules.js';
export function formatCurrency(num) {
    if (num === null || num === undefined || isNaN(num))
        return "$0";
    const roundedCents = Math.round(num * 100) / 100;
    const hasCents = Math.abs(roundedCents - Math.round(roundedCents)) > 0.001;
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: hasCents ? 2 : 0,
        maximumFractionDigits: hasCents ? 2 : 0
    }).format(roundedCents);
}
export function formatCurrencyExact(num) {
    return formatCurrency(num);
}
export function formatPercent(rate) {
    return `${(rate * 100).toFixed(1).replace(/\.0$/, '')}%`;
}
export function filingStatusLabel(status) {
    switch (status) {
        case 'single': return 'Single';
        case 'married_joint': return 'Married Filing Jointly';
        case 'married_separate': return 'Married Filing Separately';
        case 'head_of_household': return 'Head of Household';
        case 'qualifying_surviving_spouse': return 'Qualifying Surviving Spouse';
        default: return 'Single';
    }
}
/**
 * Complete tax calculation. Federal math is evaluated by the formula graph (src/graph/federal.ts);
 * this function only reads graph results into the summary shape the state engine and UI consume.
 * Formula strings and source fields are rendered from the same graph, never hand-written.
 */
export function calculateTaxes(state) {
    const year = state.year || 2024;
    const filingStatus = state.filingStatus || 'single';
    const w2List = state.w2s && state.w2s.length > 0
        ? state.w2s
        : [{ id: 0, employer: '', ein: '', box1: 0, box2: 0, box3: 0, box4: 0, box5: 0, box6: 0, states: [] }];
    const returnState = { ...state, w2s: w2List };
    const plan = planFromState(returnState);
    const ev = returnGraph(plan).evaluate(returnContext(returnState, plan));
    const v = (id) => ev.value(id);
    const calc = (id, result = v(id)) => ({
        result,
        sourceFields: ev.sources(id),
        generalFormula: ev.lineText(id, false),
        pluggedFormula: ev.lineText(id, true)
    });
    // ---- W-2 wage & state withholding summary (aggregation of inputs; no tax math) ----
    const stateLines = w2List.flatMap(w => (w.states || []).map((s) => ({ ...s, w2Id: w.id })));
    const totalStateWages = stateLines.reduce((sum, s) => sum + (Number(s.stateWages) || 0), 0);
    const totalStateTaxWithheld = stateLines.reduce((sum, s) => sum + (Number(s.stateTaxWithheld) || 0), 0);
    const totalLocalTaxWithheld = stateLines.reduce((sum, s) => sum + (Number(s.localTaxWithheld) || 0), 0);
    const stateMap = new Map();
    stateLines.forEach(s => {
        const st = (s.state || 'OTHER').toUpperCase().trim();
        if (!stateMap.has(st))
            stateMap.set(st, { state: st, stateWages: 0, stateTaxWithheld: 0, localTaxWithheld: 0, sourceFieldIds: [] });
        const item = stateMap.get(st);
        item.stateWages += Number(s.stateWages) || 0;
        item.stateTaxWithheld += Number(s.stateTaxWithheld) || 0;
        item.localTaxWithheld += Number(s.localTaxWithheld) || 0;
        item.sourceFieldIds.push(`w2-${s.w2Id}-state-${s.id}-box17`);
    });
    const stateWithheldValues = stateLines
        .map(s => ({ state: (s.state || 'State').toUpperCase(), amount: Number(s.stateTaxWithheld) || 0 }))
        .filter(x => x.amount > 0);
    const stateTaxCalc = {
        result: totalStateTaxWithheld,
        totalStateWages,
        totalStateWithheld: totalStateTaxWithheld,
        totalLocalWithheld: totalLocalTaxWithheld,
        byState: Array.from(stateMap.values()),
        sourceFields: stateLines.map(s => `w2-${s.w2Id}-state-${s.id}-box17`),
        generalFormula: 'Total State Withholding = ∑(W-2 Box 17)',
        pluggedFormula: stateWithheldValues.length > 0
            ? `Total State Tax = ${stateWithheldValues.map(x => `${x.state}: ${formatCurrencyExact(x.amount)}`).join(' + ')} = ${formatCurrencyExact(totalStateTaxWithheld)}`
            : 'Total State Tax = $0'
    };
    // ---- Federal results, read from the graph ----
    const capitalGainsCalc = { ...calc('fed.capAllowed'), netTotal: v('fed.capNet'), allowableLoss: v('fed.capAllowed') };
    const rentalPropertyState = (state.otherIncome?.scheduleERental?.propertyState || '').toUpperCase().trim();
    const scheduleECalc = {
        ...calc('fed.rentalAllowed'),
        grossRents: ev.inputValue('in.rents'),
        expenses: ev.inputValue('in.rentalExpenses'),
        depreciation: ev.inputValue('in.rentalDepreciation'),
        netBeforePal: v('fed.rentalNet'),
        allowableNet: v('fed.rentalAllowed'),
        disallowedPassiveLoss: v('fed.suspendedRentalLoss'),
        k1Income: v('fed.k1Income'),
        propertyState: rentalPropertyState
    };
    const totalItemized = v('fed.itemized');
    const standardDeductionBase = v('fed.stdDeduction');
    const chosenDeduction = v('fed.deduction');
    const chosenMethod = v('fed.itemizing') === 1 ? 'itemized' : 'standard';
    const itemizedCalc = {
        ...calc('fed.itemized'),
        isItemizedBetter: totalItemized > standardDeductionBase,
        totalItemized,
        totalItemizedDeductions: totalItemized,
        allowableMedical: v('fed.medicalDeduction'),
        medicalDeductible: v('fed.medicalDeduction'),
        allowableSalt: v('fed.salt'),
        saltDeduction: v('fed.salt'),
        mortgage: v('fed.mortgageDeduction'),
        charity: v('fed.charityDeduction'),
        standardDeductionAmount: standardDeductionBase,
        standardDeduction: standardDeductionBase,
        qbiDeduction: v('fed.qbi'),
        chosenDeduction,
        chosenMethod,
        savingsOverAlternate: Math.abs(totalItemized - standardDeductionBase)
    };
    // Bracket ladder for the visualizer: every bracket of the table, filled from the graph's slices.
    const bracketTable = ev.paramValue('fed.brackets');
    const ordinaryNode = ev.bracketNodes(ev.node('fed.ordinaryTax'))[0];
    let remaining = v('fed.ordinaryTaxable');
    const brackets = bracketTable.map((b, i) => {
        const slice = ordinaryNode?.slices?.find(s => s.index === i + 1);
        const amount = slice?.amount ?? 0;
        const remBefore = amount > 0 ? remaining : 0;
        if (amount > 0)
            remaining = Math.max(0, remaining - amount);
        const maxLabel = b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`;
        return {
            bracketIndex: i + 1,
            rate: b.rate,
            ratePercent: formatPercent(b.rate),
            range: `${formatCurrency(b.min)}${maxLabel}`,
            taxableAmount: amount,
            taxAmount: slice?.tax ?? 0,
            formula: `${formatCurrency(amount)} × ${formatPercent(b.rate)} = ${formatCurrency(slice?.tax ?? 0)}`,
            bracketWidth: b.max === Infinity ? Infinity : b.max - b.min,
            remainingBefore: remBefore,
            remainingAfter: amount > 0 ? remaining : 0
        };
    });
    const taxBeforeCreditsCalc = {
        ...calc('fed.tax'),
        brackets,
        qualifiedDividendsTotal: v('fed.qualifiedDividends'),
        preferentialIncome: v('fed.preferentialIncome'),
        preferentialTax: v('fed.preferentialTax'),
        ordinaryTaxableIncome: v('fed.ordinaryTaxable'),
        ordinaryTax: v('fed.ordinaryTax'),
        collectiblesTax: v('fed.collectiblesTax'),
        unrecaptured1250Tax: v('fed.unrecap1250Tax')
    };
    const creditsCalc = {
        ...calc('fed.nonrefundableCredits'),
        childTaxCredit: v('fed.ctcAllowed'),
        additionalChildTaxCredit: v('fed.actc'),
        otherDependentsCredit: v('fed.odcAllowed'),
        eitc: v('fed.eitc'),
        childCareCredit: v('fed.childCareCredit'),
        educationCreditNonRefundable: v('fed.educationNonrefundable'),
        educationCreditRefundable: v('fed.aotcRefundable'),
        saversCredit: v('fed.saversCredit'),
        foreignTaxCredit: ev.inputValue('in.foreignTaxCredit'),
        cleanEnergyCredit: ev.inputValue('in.cleanEnergy'),
        totalNonRefundableCredits: v('fed.nonrefundableCredits'),
        totalRefundableCredits: v('fed.refundableCredits')
    };
    const otherTaxesCalc = {
        ...calc('fed.otherTaxes'),
        selfEmploymentTax: v('fed.seTax'),
        halfSelfEmploymentTaxDeduction: v('fed.halfSeTax'),
        additionalMedicareTax: v('fed.additionalMedicareTax'),
        niit: v('fed.niit'),
        amt: v('fed.amt'),
        earlyDistributionPenaltyTax: v('fed.earlyDistributionPenalty'),
        netInvestmentIncome: v('fed.netInvestmentIncome'),
        totalOtherTaxes: v('fed.otherTaxes'),
        seTaxableEarnings: v('fed.seEarnings'),
        seSSPortion: v('fed.seSsTax'),
        seMedPortion: v('fed.seMedTax'),
        combinedMedAndSeWages: v('fed.medicareAndSeWages'),
        addMedThreshold: ev.paramValue('fed.addlMedThreshold'),
        excessMedWages: v('fed.excessMedicareWages'),
        niitThreshold: ev.paramValue('fed.niitThreshold'),
        magiExcessOverNiit: Math.max(0, v('fed.agi') - ev.paramValue('fed.niitThreshold')),
        amti: v('fed.amti'),
        amtAllowedDeductions: v('fed.agi') - v('fed.qbi') - v('fed.amti') > 0 ? v('fed.agi') - v('fed.qbi') - v('fed.amti') : 0,
        amtExemption: v('fed.amtExemptionAllowed'),
        tentativeMinimumTax: v('fed.tentativeMinimumTax'),
        earlyDist1099RTotal: v('fed.earlyDistributions')
    };
    const totalTaxLiability = v('fed.totalTax');
    const totalWithheld = v('fed.payments');
    const netDifference = v('fed.netResult');
    const isRefund = netDifference >= 0;
    const finalResultCalc = {
        ...calc(isRefund ? 'fed.refund' : 'fed.owed', Math.abs(netDifference)),
        isRefund,
        netDifference
    };
    const ficaCalc = {
        ...calc('fed.ficaWithheld'),
        ssWages: v('fed.ssWages'),
        ssTax: v('fed.ssTaxWithheld'),
        medWages: v('fed.medWages'),
        medTax: v('fed.medTaxWithheld'),
        totalFica: v('fed.ficaWithheld'),
        excessSSTaxCredit: v('fed.excessSS')
    };
    const grossIncome = v('fed.totalIncome');
    const agi = v('fed.agi');
    const effectiveRateCalc = {
        rate: v('fed.effectiveRate'),
        sourceFields: ev.sources('fed.effectiveRate'),
        generalFormula: ev.lineText('fed.effectiveRate', false),
        pluggedFormula: ev.lineText('fed.effectiveRate', true)
    };
    // ---- State returns & unified summary (from the same graph evaluation) ----
    const { stateReturnsCalc, unifiedSummaryCalc } = stateReturnsFromGraph(ev, plan, returnState);
    return {
        year,
        filingStatus,
        w2Count: w2List.length,
        w2WagesCalc: calc('fed.wages'),
        grossIncomeCalc: calc('fed.totalIncome'),
        adjustmentsCalc: calc('fed.adjustments'),
        agiCalc: calc('fed.agi'),
        deductionCalc: calc('fed.deduction'),
        qbiDeduction: v('fed.qbi'),
        itemizedCalc,
        capitalGainsCalc,
        scheduleECalc,
        taxableIncomeCalc: calc('fed.taxableIncome'),
        taxBeforeCreditsCalc,
        creditsCalc,
        otherTaxesCalc,
        totalTaxCalc: calc('fed.totalTax'),
        withholdingCalc: calc('fed.payments'),
        finalResultCalc,
        ficaCalc,
        stateTaxCalc,
        stateReturnsCalc,
        unifiedSummaryCalc,
        effectiveRateCalc,
        federalEval: ev,
        returnPlan: plan
    };
}
/**
 * State returns & the multi-jurisdiction summary, read from the evaluated return graph
 * (src/graph/states.ts). This function only assembles display objects — all state and local
 * tax math lives in the graph.
 */
export function stateReturnsFromGraph(ev, plan, state) {
    const g = ev.graph;
    const has = (id) => g.quantities.has(id);
    const val = (id) => (has(id) ? ev.value(id) : 0);
    const fedNet = ev.value('fed.netResult');
    const fedIsRefund = fedNet >= 0;
    const slicesToDetails = (quantityId, tableParam) => {
        if (!has(quantityId) || !g.params.has(tableParam))
            return [];
        const node = ev.bracketNodes(ev.node(quantityId))[0];
        if (!node)
            return [];
        const table = ev.paramValue(tableParam);
        let remaining = node.children[0].value;
        return table.map((b, i) => {
            const slice = node.slices?.find(s => s.index === i + 1);
            const amount = slice?.amount ?? 0;
            const before = amount > 0 ? remaining : 0;
            if (amount > 0)
                remaining = Math.max(0, remaining - amount);
            return {
                bracketIndex: i + 1,
                rate: b.rate,
                ratePercent: formatPercent(b.rate),
                range: `${formatCurrency(b.min)}${b.max === Infinity ? '+' : ` to ${formatCurrency(b.max)}`}`,
                taxableAmount: amount,
                taxAmount: slice?.tax ?? 0,
                formula: `${formatCurrency(amount)} × ${formatPercent(b.rate)} = ${formatCurrency(slice?.tax ?? 0)}`,
                bracketWidth: b.max === Infinity ? Infinity : b.max - b.min,
                remainingBefore: before,
                remainingAfter: amount > 0 ? remaining : 0
            };
        });
    };
    const base = (code, totalId) => ({
        result: val(stateId(code, 'totalTax')),
        sourceFields: ev.sources(totalId),
        generalFormula: ev.lineText(totalId, false),
        pluggedFormula: ev.lineText(totalId, true)
    });
    const build = (code) => {
        const S = (slot) => stateId(code, slot);
        const rule = getStateTaxRule(code);
        const resident = code === plan.resident;
        const withholding = val(S('withholding'));
        const localWithheld = val(S('localWithheld'));
        const net = val(S('net'));
        const total = val(S('totalTax'));
        const common = {
            state: code,
            residentStatus: (resident ? 'resident' : 'non_resident'),
            stateTaxLiability: total,
            localTaxWithheld: localWithheld,
            netOutcome: Math.abs(net),
            isRefund: net >= 0,
            creditedStates: [],
            creditForOtherStates: 0,
            reciprocityExemption: false,
            localTaxLiability: 0
        };
        if (resident && !has(S('agi'))) {
            // States without a wage income tax (WA capital gains excise, NH interest & dividends).
            const excise = val(S('ltcgExciseTax'));
            const idTax = val(S('idTax'));
            return {
                ...base(code, S('totalTax')),
                ...common,
                stateName: rule.name,
                formName: excise > 0 ? 'WA Capital Gains Excise Tax Return (7% over threshold)' : idTax > 0 ? 'Form DP-10 (3% Interest & Dividends Tax)' : rule.formResident,
                hasIncomeTax: excise > 0 || idTax > 0,
                stateWages: excise > 0 ? val('ret.netLtcg') : idTax > 0 ? val('ret.interestDividends') : val('fed.agi'),
                stateStandardDeduction: 0,
                stateTaxableIncome: 0,
                stateTaxBeforeCredit: total,
                stateWithholding: withholding,
                stateExemptionCredit: val(S('wftc')),
                isFlat: excise > 0 || idTax > 0,
                flatRate: excise > 0 ? 0.07 : idTax > 0 ? 0.03 : undefined
            };
        }
        if (resident) {
            const local = val(S('localTax'));
            const isNyc = plan.residentLocality === 'nyc' && local > 0;
            const credited = plan.nonresidents
                .filter(nr => has(S(`ostc.${nr.toLowerCase()}`)) && val(S(`ostc.${nr.toLowerCase()}`)) > 0)
                .map(nr => ({
                fromState: nr,
                sourceTaxPaid: val(stateId(nr, 'totalTax')),
                homeAttributableTax: Math.round(val(S('tentativeTax')) * ev.value(S(`ostcRatio.${nr.toLowerCase()}`)) * 100) / 100,
                creditAllowed: val(S(`ostc.${nr.toLowerCase()}`))
            }));
            const modifications = [
                ['hsaAddBack', 1, `${code} HSA Add-Back`, `auto-state-${code.toLowerCase()}-hsa-addback`],
                ['paAddBack', 1, 'PA Non-Conformity Add-Back (IRA/HSA/Student Loan/Cap Loss)', `auto-state-${code.toLowerCase()}-pa-addback`],
                ['saltAddBack', 1, 'CO State SALT Add-Back (Form DR 0104)', 'auto-state-co-salt-addback'],
                ['ltcgExclusion', -1, `${code} LTCG Exclusion`, `auto-state-${code.toLowerCase()}-ltcg-excl`],
                ['fedTaxDeduction', -1, `${code} Federal Tax Paid Deduction`, `auto-state-${code.toLowerCase()}-fed-tax-ded`],
                ['propertyTaxDeduction', -1, 'NJ Property Tax Deduction (Cap $15,000)', `auto-state-${code.toLowerCase()}-prop-tax-ded`]
            ].filter(([slot]) => val(S(slot)) > 0)
                .map(([slot, sign, label, sourceId]) => ({ label: label, amount: sign * val(S(slot)), sourceId: sourceId }));
            const itemizedAmt = val(S('itemized'));
            const usedItemized = has(S('itemized')) && val(S('deductionBase')) === itemizedAmt && itemizedAmt > val(S('baseStdDeduction'));
            const surchargeIds = ['stcgSurtax', 'millionaireSurtax', 'mentalHealthTax'].filter(s => val(S(s)) > 0);
            const eitcRate = STATE_EITC_MULTIPLIERS[code] || 0;
            return {
                ...base(code, S('totalTax')),
                ...common,
                stateName: isNyc ? 'New York State & NYC' : rule.name,
                formName: `${isNyc ? `${rule.formResident} (NY State + NYC Local Tax)` : rule.formResident}${plan.priorState ? ' (Part-Year Resident)' : ''}`,
                hasIncomeTax: true,
                stateWages: val(S('agi')),
                stateStandardDeduction: val(S('deduction')),
                stateTaxableIncome: val(S('taxable')),
                stateTaxBeforeCredit: val(S('tentativeTax')),
                creditForOtherStates: val(S('otherStateCredit')),
                creditedStates: credited,
                localTaxLiability: local,
                stateWithholding: val(S('totalWithholding')),
                isFlat: rule.isFlat,
                flatRate: rule.flatRate,
                brackets: slicesToDetails(S('bracketTax'), S('brackets')),
                localBrackets: plan.residentLocality === 'nyc' ? slicesToDetails(S('localTax'), 'st.ny.nycBrackets') : [],
                localRuleLabel: local > 0 ? g.quantities.get(S('localTax')).label : '',
                modifications,
                baseStdDeduction: val(S('baseStdDeduction')),
                stateItemizedAmount: itemizedAmt,
                stateItemizedUsed: usedItemized,
                statePanelOtherIncome: val(S('panelOther')),
                statePanelAdjustments: val(S('panelAdj')),
                statePanelItemized: val(S('panelItem')),
                statePanelCredits: val(S('panelCred')),
                surchargeAmount: surchargeIds.reduce((s, id) => s + val(S(id)), 0),
                surchargeLabel: surchargeIds.map(id => g.quantities.get(S(id)).label).join(' + '),
                stateCreditAmount: val(S('propertyTaxCredit')),
                stateCreditLabel: val(S('propertyTaxCredit')) > 0 ? g.quantities.get(S('propertyTaxCredit')).label : '',
                stateExemptionAmount: val(S('exemptions')),
                stateExemptionCredit: val(S('exemptionCredit')),
                stateEitcAmount: val(S('stateEitc')),
                stateEitcRate: eitcRate
            };
        }
        // Nonresident
        const resRule = getStateTaxRule(plan.resident);
        const reciprocal = Boolean(rule.reciprocalWith?.includes(plan.resident) || resRule.reciprocalWith?.includes(code)) && val(S('rentalNet')) <= 0;
        const d30 = has(S('d30Tax')) && val(S('w2Wages')) <= 0 && (val(S('rentalGross')) > 0 || val(S('documentIncome')) > 0);
        const out = {
            ...base(code, S('totalTax')),
            ...common,
            stateName: rule.name,
            formName: d30 ? 'Form D-30 (Unincorporated Business Franchise Tax)' : code === plan.priorState ? `${rule.formNonResident} (Part-Year Resident)` : rule.formNonResident,
            hasIncomeTax: rule.hasIncomeTax,
            stateWages: d30 ? val(S('d30Net')) : val(S('income')),
            stateStandardDeduction: d30 ? val(S('d30SalaryAllowance')) + 5000 : (reciprocal || !rule.hasIncomeTax ? 0 : val(S('deduction'))),
            stateTaxableIncome: d30 ? val(S('d30Taxable')) : (reciprocal || !rule.hasIncomeTax ? 0 : val(S('taxable'))),
            stateTaxBeforeCredit: d30 ? total : (reciprocal || !rule.hasIncomeTax ? 0 : Math.round(val(S('tentativeTax')) * 100) / 100),
            reciprocityExemption: !d30 && reciprocal,
            reciprocityNote: !d30 && reciprocal
                ? `Reciprocal agreement active between ${resRule.name} (${plan.resident}) and ${rule.name} (${code}). Your compensation is legally exempt from ${code} state tax and taxable only in your home state of ${plan.resident}.`
                : undefined,
            stateWithholding: withholding,
            isFlat: d30 ? true : rule.isFlat,
            flatRate: d30 ? 0.0825 : rule.flatRate,
            brackets: reciprocal || d30 ? [] : slicesToDetails(S('tentativeTax'), S('brackets')),
            baseStdDeduction: getStateTaxRule(code).standardDeduction[normalizeFilingStatus(state.filingStatus || 'single')] || 0,
            statePanelOtherIncome: val(S('panelOther')),
            statePanelAdjustments: val(S('panelAdj')),
            statePanelItemized: val(S('panelItem')),
            statePanelCredits: val(S('panelCred'))
        };
        if (d30) {
            out.d30Details = {
                grossReceipts: val(S('d30Receipts')),
                netRental: val(S('d30Net')),
                salaryAllowance: val(S('d30SalaryAllowance')),
                specificExemption: 5000,
                rawUbtTax: Math.round(val(S('d30Taxable')) * 0.0825 * 100) / 100,
                minTaxApplied: val(S('d30Receipts')) > 12000 && Math.round(val(S('d30Taxable')) * 0.0825 * 100) / 100 < 250
            };
        }
        return out;
    };
    const allStateReturns = [plan.resident, ...plan.nonresidents].filter(Boolean).map(build);
    const lines = [{
            jurisdiction: 'United States (Federal)',
            formName: 'IRS Form 1040',
            taxLiability: ev.value('fed.totalTax'),
            withholding: ev.value('fed.payments'),
            netOutcome: fedNet,
            isRefund: fedIsRefund,
            badge: fedIsRefund ? 'Federal Refund (Line 35a)' : 'Federal Tax Owed (Line 37)'
        }];
    let totalStateWithholding = 0;
    let totalStateLiability = 0;
    allStateReturns.forEach(sr => {
        totalStateWithholding += sr.stateWithholding;
        totalStateLiability += sr.stateTaxLiability;
        const signedNet = sr.isRefund ? sr.netOutcome : -sr.netOutcome;
        lines.push({
            jurisdiction: `${sr.stateName} (${sr.residentStatus === 'resident' ? 'Resident' : 'Nonresident'})`,
            formName: sr.formName,
            taxLiability: sr.stateTaxLiability,
            withholding: sr.stateWithholding,
            netOutcome: signedNet,
            isRefund: sr.isRefund,
            badge: sr.creditForOtherStates > 0 ? `🛡️ OSTC Credit (-${formatCurrency(sr.creditForOtherStates)})`
                : sr.reciprocityExemption ? '🤝 Reciprocity Active (100% Refund)'
                    : !sr.hasIncomeTax ? '🌴 0% Wage Tax State' : undefined
        });
    });
    const totalStateNet = ev.value('ret.stateNet');
    const grandTotalNet = ev.value('ret.grandTotal');
    const unifiedSummaryCalc = {
        result: Math.abs(grandTotalNet),
        lines,
        federalNet: fedNet,
        federalIsRefund: fedIsRefund,
        totalStateWithholding,
        totalStateLiability,
        totalStateNet,
        grandTotalNet,
        isGrandTotalRefund: grandTotalNet >= 0,
        sourceFields: ev.sources('ret.grandTotal'),
        generalFormula: ev.lineText('ret.grandTotal', false),
        pluggedFormula: ev.lineText('ret.grandTotal', true)
    };
    return { stateReturnsCalc: allStateReturns, unifiedSummaryCalc };
}
/**
 * Pure, UI-independent clustered calculation block builder.
 * Produces structured calculation blocks, form-line tags, intermediate math lines,
 * and clickable variable contributor breakdowns without touching any DOM element.
 */
export function buildCalculationBlocks(_state, summary, showEmpty = false) {
    const ev = summary.federalEval;
    if (!ev)
        return [];
    return FEDERAL_BLOCKS.map(spec => ev.block(spec, showEmpty));
}
export function buildStateCalcBlocks(sr, _all, summary, showEmpty = false) {
    const ev = summary?.federalEval;
    const plan = summary?.returnPlan;
    if (!ev || !plan)
        return [];
    return stateBlocks(plan, sr.state, ev.graph).map(spec => ev.block(spec, showEmpty));
}
export function buildStateCalcBlock(sr, all, summary) {
    const blocks = buildStateCalcBlocks(sr, all, summary);
    return blocks[blocks.length - 1];
}
/**
 * Generates system-derived (read-only) panels for credits, adjustments, and deductions
 * that are automatically applied by the tax engine without requiring manual user entry.
 */
export function buildAutoPanels(state, summary) {
    const federal = [];
    const byState = {};
    const year = state.year || 2024;
    const status = normalizeFilingStatus(state.filingStatus || 'single');
    // Federal automatic panels: each one is a graph quantity (amount, formula and arrows come from it).
    const ev = summary.federalEval;
    if (ev) {
        FEDERAL_AUTO_PANELS.forEach(spec => {
            const amount = ev.value(spec.quantity);
            if (!ev.applies(spec.quantity) || (spec.show !== 'always' && amount <= 0))
                return;
            const badge = spec.id === 'auto-fed-std-deduction'
                ? (summary.itemizedCalc.chosenMethod === 'standard' ? 'Applied (Optimal)' : 'Compared')
                : spec.badge;
            federal.push({
                id: spec.id,
                section: spec.section,
                title: spec.title,
                officialTitle: spec.officialTitle,
                amount,
                formulaSummary: ev.lineText(spec.quantity, true),
                shortExplanation: spec.shortExplanation,
                sourceIds: ev.sources(spec.quantity),
                badgeLabel: badge,
                quantityId: spec.quantity
            });
        });
    }
    // State Automatic Panels
    (summary.stateReturnsCalc || []).forEach(sr => {
        const code = sr.state.toUpperCase();
        const key = code.toLowerCase();
        const list = [];
        // State Standard Deduction
        if ((sr.baseStdDeduction ?? 0) > 0) {
            list.push({
                id: `auto-state-${key}-std-ded`,
                section: 'itemized',
                state: code,
                title: `${code} Standard Deduction`,
                officialTitle: `${sr.formName} Standard Deduction`,
                amount: sr.baseStdDeduction ?? 0,
                formulaSummary: `Statutory ${code} Standard Deduction (${status.replace('_', ' ').toUpperCase()})`,
                shortExplanation: `Automatically applied ${code} standard deduction unless ${code} itemized deductions are higher.`,
                sourceIds: ['select-filing-status'],
                badgeLabel: sr.stateItemizedUsed ? 'Compared' : 'Applied'
            });
        }
        // State Itemized Carryover
        if ((sr.stateItemizedAmount ?? 0) > 0) {
            list.push({
                id: `auto-state-${key}-itemized`,
                section: 'itemized',
                state: code,
                title: `${code} Itemized Deduction (Carryover)`,
                officialTitle: `${sr.formName} Itemized Schedule`,
                amount: sr.stateItemizedAmount ?? 0,
                formulaSummary: 'Allowable Medical + min($10k, Property Tax) + Mortgage + Charity',
                shortExplanation: `Derived automatically from your Federal Schedule A deductions for ${code}.`,
                sourceIds: ['calc-itemized-deductions'],
                badgeLabel: sr.stateItemizedUsed ? 'Applied (Optimal)' : 'Compared'
            });
        }
        // State Income Modifications
        (sr.modifications || []).forEach((mod, idx) => {
            list.push({
                id: mod.sourceId || `auto-state-${key}-mod-${idx}`,
                section: mod.amount >= 0 ? 'other-income' : 'adjustments',
                state: code,
                title: mod.label,
                officialTitle: `${code} Statutory Modification`,
                amount: Math.abs(mod.amount),
                formulaSummary: mod.amount >= 0 ? `Add-Back to ${code} Taxable Income` : `Subtraction from ${code} Taxable Income`,
                shortExplanation: `Automatically applied by ${code} tax conformity rules.`,
                sourceIds: ['calc-agi'],
                badgeLabel: 'Auto-Calculated'
            });
        });
        // Other State Tax Credit (OSTC) — one panel per credited source state
        sr.creditedStates.forEach(c => {
            list.push({
                id: `auto-state-${key}-ostc-${c.fromState.toLowerCase()}`,
                section: 'credits',
                state: code,
                title: `Other State Tax Credit (${c.fromState} → ${code})`,
                officialTitle: `${code} Resident Credit for Taxes Paid to ${c.fromState}`,
                amount: c.creditAllowed,
                formulaSummary: `min(${formatCurrencyExact(c.sourceTaxPaid)} ${c.fromState} Tax, ${formatCurrencyExact(c.homeAttributableTax)} ${code} Attributable)`,
                shortExplanation: `Automatically shields you from double state taxation on wages taxed by both ${c.fromState} and ${code}.`,
                sourceIds: [`calc-state-${c.fromState.toLowerCase()}-card`],
                badgeLabel: 'OSTC Shield • Auto'
            });
        });
        // IL 5% Property Tax Credit
        if ((sr.stateCreditAmount ?? 0) > 0 && sr.stateCreditLabel) {
            list.push({
                id: `auto-state-${key}-builtin-credit`,
                section: 'credits',
                state: code,
                title: sr.stateCreditLabel,
                officialTitle: `${code} Statutory Credit`,
                amount: sr.stateCreditAmount ?? 0,
                formulaSummary: '5% × Real Estate Property Tax Paid',
                shortExplanation: `Automatically applied ${code} property tax credit from your Schedule A property taxes.`,
                sourceIds: ['input-itemized-salt'],
                badgeLabel: 'Auto-Calculated'
            });
        }
        // State Dependent Exemption
        if ((sr.stateExemptionAmount ?? 0) > 0) {
            list.push({
                id: `auto-state-${key}-dep-exemption`,
                section: 'itemized',
                state: code,
                title: `${code} Personal & Dependent Exemptions`,
                officialTitle: `${sr.formName} Personal / Dependent Exemptions`,
                amount: sr.stateExemptionAmount ?? 0,
                formulaSummary: `Statutory ${code} Exemption × Qualifying Dependents`,
                shortExplanation: `Automatically reduces ${code} taxable income for each qualifying dependent.`,
                sourceIds: [
                    'select-filing-status',
                    ...(((Number(state.dependents?.childrenCount) || 0) > 0 || (Number(state.dependents?.otherDependentsCount) || 0) > 0) ? ['input-children-count'] : [])
                ],
                badgeLabel: 'Auto-Calculated'
            });
        }
        // State Earned Income Tax Credit (EITC)
        if ((sr.stateEitcAmount ?? 0) > 0) {
            const pct = Math.round((sr.stateEitcRate || 0) * 100);
            list.push({
                id: `auto-state-${key}-eitc`,
                section: 'credits',
                state: code,
                title: `${code} Earned Income Tax Credit (${pct}%)`,
                officialTitle: `${sr.formName} State EITC`,
                amount: sr.stateEitcAmount ?? 0,
                formulaSummary: `${pct}% × Federal EITC`,
                shortExplanation: `Automatically granted state EITC equal to ${pct}% of your Federal Earned Income Tax Credit.`,
                sourceIds: ['auto-fed-eitc'],
                badgeLabel: 'EITC • Auto'
            });
        }
        // State Exemption / Child / Poverty Credit
        if ((sr.stateExemptionCredit ?? 0) > 0) {
            list.push({
                id: `auto-state-${key}-exemption-credit`,
                section: 'credits',
                state: code,
                title: `${code} Exemption / Child Credit`,
                officialTitle: `${sr.formName} Statutory Credit`,
                amount: sr.stateExemptionCredit ?? 0,
                formulaSummary: `Statutory ${code} Personal, Dependent, or Child Tax Credit`,
                shortExplanation: `Automatically calculated ${code} tax credit based on filing status, dependents, and income.`,
                sourceIds: ['select-filing-status', 'input-children-count'],
                badgeLabel: 'Auto-Calculated'
            });
        }
        // Link each state panel to the graph quantity it shows, so its formula and arrows come from the graph.
        const slotFor = [
            [/-std-ded$/, () => 'baseStdDeduction'], [/-itemized$/, () => 'itemized'], [/-hsa-addback$/, () => 'hsaAddBack'],
            [/-pa-addback$/, () => 'paAddBack'], [/-salt-addback$/, () => 'saltAddBack'], [/-ltcg-excl$/, () => 'ltcgExclusion'],
            [/-fed-tax-ded$/, () => 'fedTaxDeduction'], [/-prop-tax-ded$/, () => 'propertyTaxDeduction'], [/-ostc-([a-z]{2})$/, m => `ostc.${m[1]}`],
            [/-builtin-credit$/, () => 'propertyTaxCredit'], [/-dep-exemption$/, () => 'exemptions'], [/-eitc$/, () => 'stateEitc'],
            [/-exemption-credit$/, () => 'exemptionCredit']
        ];
        const ev = summary.federalEval;
        if (ev) {
            list.forEach(item => {
                for (const [re, slot] of slotFor) {
                    const m = item.id.match(re);
                    if (!m)
                        continue;
                    const qid = stateId(code, slot(m));
                    if (ev.graph.quantities.has(qid)) {
                        item.quantityId = qid;
                        item.formulaSummary = ev.lineText(qid, true);
                        item.sourceIds = ev.sources(qid);
                    }
                    break;
                }
            });
        }
        byState[code] = list;
    });
    return { federal, byState };
}
