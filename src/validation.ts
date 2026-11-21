/**
 * Review checks: entries that look inconsistent, or choices the entered facts don't support.
 * Messages for the user only — nothing here changes a computed amount.
 */

import { TaxAppState, TaxCalculationSummary } from './types.js';
import { TAX_CONSTANTS } from './tax-constants.js';

export interface ReviewMessage {
  severity: 'error' | 'warning' | 'info';
  message: string;
  /** Element to scroll to when the message is clicked. */
  targetId?: string;
}

const money = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });

export function reviewReturn(state: TaxAppState, summary?: TaxCalculationSummary): ReviewMessage[] {
  const out: ReviewMessage[] = [];
  const year = state.year || 2024;
  const rules = (TAX_CONSTANTS as any)[year] || (TAX_CONSTANTS as any)[2024];
  const deps = state.dependents?.list || [];
  const childCount = Number(state.dependents?.childrenCount) || 0;
  const otherCount = Number(state.dependents?.otherDependentsCount) || 0;
  const w2s = state.w2s || [];

  // ── Filing status (B4) ──
  const hasQualifyingPerson = deps.length > 0
    ? deps.some(d => (Number(d.monthsLived) || 0) > 6)
    : childCount + otherCount > 0;
  if (state.filingStatus === 'head_of_household' && !hasQualifyingPerson) {
    out.push({ severity: 'warning', targetId: 'select-filing-status',
      message: 'Head of Household requires a qualifying person (usually a child or relative who lived with you more than half the year). Add a dependent or choose another filing status.' });
  }
  const hasQssChild = deps.length > 0
    ? deps.some(d => d.relationship === 'child' && (Number(d.monthsLived) || 0) >= 12)
    : childCount + otherCount > 0;
  if (state.filingStatus === 'qualifying_surviving_spouse' && !hasQssChild) {
    out.push({ severity: 'warning', targetId: 'select-filing-status',
      message: 'Qualifying Surviving Spouse requires a dependent child who lived with you all year (and a spouse who died in one of the two prior years).' });
  }
  if (!state.residentState) {
    out.push({ severity: 'info', targetId: 'select-resident-state', message: 'Select your state of residence to prepare your state return.' });
  }

  // ── W-2 consistency (A6) ──
  const maxSsTax = Math.round(rules.ssWageLimit * rules.ssRate * 100) / 100;
  w2s.forEach((w, i) => {
    const name = `W-2 #${i + 1}${w.employer ? ` (${w.employer})` : ''}`;
    const n = (v: unknown) => Number(v) || 0;
    const box1 = n(w.box1), box2 = n(w.box2), box3 = n(w.box3), box4 = n(w.box4), box5 = n(w.box5), box6 = n(w.box6);
    if (box2 > box1 && box1 > 0) {
      out.push({ severity: 'warning', targetId: `w2-${w.id}-box2`, message: `${name}: federal tax withheld (box 2) is more than wages (box 1). Check the entry.` });
    }
    if (box3 > rules.ssWageLimit + 1) {
      out.push({ severity: 'error', targetId: `w2-${w.id}-box3`, message: `${name}: Social Security wages (box 3) can't exceed the ${year} wage base of ${money(rules.ssWageLimit)}.` });
    }
    if (box4 > maxSsTax + 0.5) {
      out.push({ severity: 'warning', targetId: `w2-${w.id}-box4`,
        message: `${name}: one employer withheld more than the maximum Social Security tax (${money(maxSsTax)}). That excess is not credited on your return — ask the employer for a refund.` });
    } else if (box3 > 0 && Math.abs(box4 - box3 * rules.ssRate) > 1) {
      out.push({ severity: 'warning', targetId: `w2-${w.id}-box4`,
        message: `${name}: Social Security tax (box 4) should be 6.2% of box 3 (${money(Math.round(box3 * rules.ssRate * 100) / 100)}). Check the entry.` });
    }
    if (box5 > 0 && box6 + 1 < box5 * rules.medicareRate) {
      out.push({ severity: 'warning', targetId: `w2-${w.id}-box6`,
        message: `${name}: Medicare tax (box 6) is less than 1.45% of box 5 (${money(Math.round(box5 * rules.medicareRate * 100) / 100)}). Check the entry.` });
    }
    if (box1 > 0 && box5 === 0) {
      out.push({ severity: 'info', targetId: `w2-${w.id}-box5`, message: `${name}: Medicare wages (box 5) are blank. Nearly every W-2 reports box 5; it's used for Additional Medicare Tax.` });
    }
  });

  // ── Dependents ──
  deps.forEach(d => {
    const label = d.name || 'A dependent';
    const birthYear = Number(d.birthYear) || 0;
    if (!birthYear || birthYear > year || birthYear < year - 120) {
      out.push({ severity: 'error', targetId: `dep-${d.id}-birth-year`, message: `${label}: enter a valid birth year.` });
      return;
    }
    const age = year - birthYear;
    if (d.relationship === 'child' && (Number(d.monthsLived) || 0) <= 6) {
      out.push({ severity: 'info', targetId: `dep-${d.id}-birth-year`,
        message: `${label}: lived with you ${Number(d.monthsLived) || 0} months, so isn't a qualifying child (more than half the year is required). They may still be a qualifying relative ($500 credit).` });
    } else if (d.relationship === 'child' && age >= 19 && !(age < 24 && d.student) && !d.disabled) {
      out.push({ severity: 'info', targetId: `dep-${d.id}-birth-year`,
        message: `${label}: age ${age} and not a full-time student under 24 or disabled, so isn't a qualifying child. They count only as an other dependent if they're your qualifying relative (low gross income, and you provide over half their support).` });
    }
  });

  // ── Underpayment penalty heads-up ──
  const ev = summary?.federalEval;
  if (ev && ev.graph.quantities.has('fed.estimatedTaxShortfall') && ev.applies('fed.estimatedTaxShortfall')) {
    const short = ev.value('fed.estimatedTaxShortfall');
    if (short > 0) {
      out.push({ severity: 'warning', targetId: 'q-fed-estimatedTaxShortfall',
        message: `Withholding and estimated payments are ${money(short)} short of the safe harbor, so an underpayment penalty (Form 2210) may apply.` });
    }
  }

  const order = { error: 0, warning: 1, info: 2 } as const;
  return out.sort((a, b) => order[a.severity] - order[b.severity]);
}
