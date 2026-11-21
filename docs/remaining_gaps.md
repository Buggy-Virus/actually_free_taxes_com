# Remaining Gaps — Tracker

Everything still missing or simplified, in one prioritized list. Detailed requirements live in [federal_tax_logic.md](./federal_tax_logic.md) and [state_local_tax_logic.md](./state_local_tax_logic.md); this file is the work queue.

**How to use:** pick the highest-priority open item, implement it as graph quantities, add a golden test in `src/tests/test-golden.ts` citing the source, flip the status here and in the requirement doc.

**Priority**
- **P0** changes the result for many filers, or is a foundation other items depend on.
- **P1** common situations.
- **P2** less common, but needed for a complete return.
- **P3** rare; detect and tell the user to use other software if not implemented.

**Status:** ⬜ open · 🟨 in progress · ✅ done (link the commit/test)

---

## A. Foundations (unblock many rules)

| ID | Pri | Gap | Today | Approach / inputs needed | Status |
| :-- | :-: | :-- | :-- | :-- | :-: |
| A1 | P0 | **Taxpayer & spouse records**: birth year, blind, SSN/ITIN present | Ages only via "65+/blind box" count, catch-up checkboxes, seniors count | Basic Info fields; derive 65+/blind boxes, senior deduction, HSA/IRA catch-up, EITC age test, state age exclusions from ages | ✅ Basic Info birth years + blind; `fed.age65BlindBoxes`, `fed.seniorsCount`, catch-ups |
| A2 | P0 | **Dependent records**: name, birth year, relationship, months lived with you, student, disabled, SSN | Only `childrenCount` / `otherDependentsCount` | Dependents list; qualifying-child / qualifying-relative tests as graph conditions per dependent; counts for CTC (< 17), ODC, EITC (< 19 / < 24 student / disabled), Form 2441 (< 13) | ✅ Dependents panel; per-dependent tests in `fed.ctcChildren`, `fed.eitcChildren`, `fed.careQualifyingPersons` |
| A3 | P0 | **TY2026 parameters** (Rev. Proc. 2025-32 + P.L. 119-21 2026 rules) | Year selector stops at 2025 | Add 2026 to `tax-constants.ts` from the published Rev. Proc.; 2026-only rules below (B9–B13). Must be entered from the source document, not memory | ⬜ |
| A4 | P1 | Per-person ownership of 1099s, Schedule C, IRA, HSA | Only W-2s have an owner | `owner` on income sources / businesses / IRA; per-person SE tax and IRA limits | ✅ "Whose form?" on every 1099 (joint returns); Schedule SE per spouse ($400 test, own wage base; pooled expenses shared by gross receipts); spouse earned income; spouse IRA with own limit, catch-up, §219(c) combined-compensation cap and phase-out. Open → A4a |
| A4a | P2 | Remaining per-person items: separate Schedule C expenses per spouse, per-spouse SE retirement / SE health limits, per-spouse HSA (Form 8889 each), state retirement caps by 1099-R owner | Pooled | | ⬜ |
| A5 | P1 | Multi-year carryovers: capital loss ST/LT, passive losses, charity, investment interest, NOL, AMT credit, FTC, §179, QBI loss | Capital loss carryforward computed as one number | "Prior-year carryovers" panel + computed next-year carryovers in a summary card | ⬜ |
| A6 | P1 | Input validation (impossible / inconsistent entries) | Values clamped silently | Validation messages: box 4 vs 6.2% × box 3, box 6 vs box 5, negative amounts, dependents with no qualifying test met | ✅ `src/validation.ts` Review card (W-2 box 2–6 consistency, wage base, single-employer SS over-withholding, dependent birth year / residency / age tests, missing state, Form 2210 heads-up); tests in `test-validation.ts` |

## B. Federal

| ID | Pri | Gap | Today | Approach / inputs needed | Status |
| :-- | :-: | :-- | :-- | :-- | :-: |
| B1 | P0 | Child Tax Credit age (< 17) and SSN tests | Count entered directly | From A2 | ✅ Age < 17 + SSN (golden test) |
| B2 | P0 | EITC eligibility: qualifying-child age/residency/relationship; age 25–64 with no child | Only filing status, investment income, dependent flag | From A1/A2 | ✅ Qualifying-child age/student/disabled/residency + no-child age 25–64 (golden tests) |
| B3 | P0 | Form 2441 qualifying person under 13 (or disabled) | All children counted | From A2 | ✅ Under 13 or disabled (golden test) |
| B4 | P1 | Filing status eligibility checks (HOH qualifying person, QSS timing) | No validation | Warnings from A2 | ✅ HOH needs a person who lived with you > 6 months; QSS needs a child who lived with you all year (Review card) |
| B5 | P1 | Form 1040 line 1e: W-2 box 10 dependent care benefits over $5,000 taxable; reduce Form 2441 limit | Ignored | Box 10 already entered | ✅ `fed.depCareExcluded`, `fed.depCareTaxable` |
| B6 | P1 | Form 5329 exceptions to the 10% early-distribution tax | 10% on all code-1 distributions | Exception amount input on 1099-R | ✅ 1099-R exception amount |
| B7 | P1 | 1099-R distribution codes beyond G/H and 1 (2, 3, 4, 7, J, Q, T, B) | Rollover + code 1 checkbox | Code select per 1099-R | ✅ Box 7 code select (1, 2, 3, 4, 7, G, H, Q, T, J, S, B, two-character codes); S = 25%; golden cases |
| B8 | P1 | State/local refund (1099-G box 2) tax-benefit rule | Pooled into taxable other income | Box 2 field + prior-year itemized flag | ✅ 1099-G box 2 + last year's itemized excess; state subtraction |
| B9 | P1 | 2026: charitable deduction for non-itemizers ($1,000 / $2,000) | — | Needs A3 | ⬜ |
| B10 | P1 | 2026: 0.5%-of-AGI floor on itemized charity; 37%-bracket itemized limitation | — | Needs A3 | ⬜ |
| B11 | P1 | 2026: dependent care credit rate up to 50% | — | Needs A3 | ⬜ |
| B12 | P2 | 2026: gambling losses limited to 90% | — | Needs A3 | ⬜ |
| B13 | P2 | 2026: AMT exemption phase-out 50% from $500k / $1M; QBI wider phase-in and $400 minimum | — | Needs A3 | ⬜ |
| B14 | P1 | Charitable AGI limits (60% cash / 30% property) and carryover | Uncapped | Cash vs property inputs | ✅ 60% cash / 30% property limits + carryforward amount |
| B15 | P1 | Mortgage interest debt limit ($750k / $1M grandfathered) | Uncapped | Loan balance + origination date | ✅ Pub. 936 ratio with $750k / $1M grandfathered |
| B16 | P1 | SALT: estimated state payments, prior-year balance paid, sales-tax option, personal property tax | W-2 boxes 17/19 + real estate | Extra SALT inputs | ✅ Other income tax paid, personal property tax, sales-tax election |
| B17 | P1 | Casualty loss $100 + 10% AGI floor | Entered amount | Form 4684 math | ✅ `fed.casualtyDeduction` |
| B18 | P1 | Educator expense cap $600 only if both spouses educators | $600 for any MFJ | "Both educators" checkbox | ✅ "Both educators" checkbox |
| B19 | P1 | SEP / SIMPLE / solo 401(k) limits; SE health insurance limited to net profit | Entered amounts | Limits from net SE earnings | ✅ `fed.seRetirementLimit` (solo 401(k) max), `fed.seHealthDeduction` |
| B20 | P1 | Multiple Schedule C businesses, expense categories, home office, vehicle mileage | One pooled business, one expense number | Business records | ⬜ |
| B21 | P1 | Form 8949 transaction entry (categories A–F, wash sales, adjustments) | Net ST/LT totals | Transactions list → Schedule D totals | ⬜ |
| B22 | P1 | Premium Tax Credit reconciliation (Form 8962 from 1095-A) | Net PTC entered | 1095-A inputs, FPL table, applicable %; 2026 caps removed | ⬜ |
| B23 | P1 | Schedule K-1 box-level entry (ordinary, guaranteed payments → SE, rental, interest, dividends, gains, §199A, passive flag) | One amount, treated as nonpassive QBI | K-1 record | ⬜ |
| B24 | P1 | Multiple rental properties, personal-use days, depreciation computation | One property, depreciation entered | Property records | ⬜ |
| B25 | P2 | Kiddie tax (Form 8615) | — | Needs A1 + parent's rate | ⬜ |
| B26 | P2 | Form 8606 nondeductible IRA basis / Roth conversions | — | Basis inputs | ⬜ |
| B27 | P2 | QCDs, Simplified Method, RRB-1099, SS lump-sum election | — | | ⬜ |
| B28 | P2 | §121 home sale exclusion | — | Gain, ownership/use years | ✅ Home-sale panel: $250k / $500k (both spouses meet use test) exclusion, rest to long-term gain; partial exclusions (job move, health) and depreciation recapture not modeled |
| B29 | P2 | Form 4797 business property sales, §1245/§1250 recapture | — | | ⬜ |
| B30 | P2 | QBI above threshold (Form 8995-A: SSTB, W-2 wages / UBIA), REIT/PTP | Simple 20% | W-2 wages / UBIA per business | ⬜ |
| B31 | P2 | Foreign tax credit limitation (Form 1116) and $300/$600 de minimis | Entered amount | Foreign income/tax inputs | ⬜ |
| B32 | P2 | FEIE housing exclusion and stacking worksheet | Exclusion capped | Stacking worksheet in tax | ⬜ |
| B33 | P2 | Adoption credit MAGI phase-out and refundable part (2025+) | Capped amount, nonrefundable | | ✅ Form 8839 MAGI phase-out ($252,150 / $259,190 + $40,000), 2025 refundable part up to $5,000; one child, no carryforward |
| B34 | P2 | Schedule R elderly/disabled credit computed | Entered amount | From A1 | ✅ Schedule R from ages: $5,000 / $7,500 / $3,750 initial amounts, nontaxable SS and ½ AGI over $7,500 / $10,000 / $5,000; under-65 disability uses the entered amount |
| B35 | P2 | Education credits per student, 4-year AOTC limit | One student | From A2 (students) | ⬜ |
| B36 | P2 | Schedule H household employment taxes computed | Entered amount | Cash wages paid | ⬜ |
| B37 | P2 | AMT preferences (ISO spread, PAB interest), Form 8801 credit | Basic AMT | | ⬜ |
| B38 | P2 | NIIT on passive K-1 and royalties | | From B23 | ⬜ |
| B39 | P2 | MFS: spouse itemizes → standard deduction $0 | | Checkbox | ✅ "MFS: spouse itemizes" checkbox |
| B40 | P2 | Filing requirement check ("Do I need to file?") | | Gross income vs thresholds | ✅ Review card: Chart A gross-income threshold (65+ amounts, MFS $5, $400 SE earnings), suggests filing for a refund; dependents filers not yet covered |
| B41 | P2 | Form 2210 penalty amount (quarterly), annualized method | Required payment + shortfall only | | ⬜ |
| B42 | P2 | Extension payment (Form 4868), refund applied to next year, split refunds | | | ⬜ |
| B43 | P3 | §1202 QSBS, §1256 (6781), installment sales, like-kind exchanges, NOL computation, at-risk, §461(l), COD (982) | — | Detect & refer | ⬜ |
| B44 | P3 | Nonresident alien / dual-status, deceased taxpayer final return | — | Detect & refer | ⬜ |

## C. State

| ID | Pri | Gap | Today | Approach / inputs needed | Status |
| :-- | :-: | :-- | :-- | :-- | :-: |
| C1 | P0 | **Part-year residency** (move dates, income by period, prorated deductions) | Full-year resident only | Residency periods per state; reuse nonresident ratio machinery | ✅ prior + current state part-year returns; non-wage income allocated by months; current state uses tax × residency ratio (exact for flat-rate states, approximate for progressive prorate-method states); exemptions prorated on nonresident/part-year returns |
| C2 | P0 | Year-keyed rate tables for all states (2024, 2025, 2026) and correct HOH/MFJ brackets (29 states use synthesized "1.4 × single" HOH) | Overrides for 6 states | Verify every state from DOR instructions | ⬜ |
| C3 | P0 | Resident state required (no silent default to CA) | Defaults to CA | Validation + prompt | ✅ "— Select your state —"; no resident return without a state |
| C4 | P1 | State estimated / extension payments and prior-year overpayment | W-2 withholding only | Per-state payments input | ✅ "State Estimated & Extension Payments" panel in every state |
| C5 | P1 | Partial Social Security taxation in CO, CT, MN, MT, NM, RI, UT, VT, WV | Taxed in full | Per-state rules (+ A1 ages) | ✅ CT (25% cap above $75k/$100k), NM cliff, MN 10%/$4,000 phase-out (2024/2025 thresholds), VT $10k phase-out (2025 +$5k), WV 35%/65%, CO 65+ (2025: 55–64 under $75k/$95k), UT credit (TC-40 code AH); MT taxes as federal. RI → C5a; MN simplified-method alternative not modeled |
| C5a | P1 | Rhode Island Social Security modification (full retirement age + AGI limit) | Taxed in full | Needs 2024/2025 thresholds from the RI-1040 worksheet | ⬜ |
| C6 | P1 | Age-based retirement exclusions (NY $20k, NJ, GA, CO, MI, SC, etc.) | IL/MS/PA only | Needs A1 | ✅ NY, NJ, GA, SC, CO, KY, AR, AL, DE, VA, IA; spouses' pensions pooled until A4; NY uses age 60 (no birth month) |
| C6a | P2 | Remaining retirement exclusions: MI birth-year tiers, MD $39,500+ pension exclusion, ME $35k (less SS), MT, OK $10k, HI/government-pension-only rules, military retirement | — | Pension type (government / private / military) per 1099-R | ⬜ |
| C7 | P1 | Out-of-state municipal bond interest addition | Not added back | "In-state portion" of 1099-INT box 8 | ✅ `st.<code>.muniAddBack` from 1099-INT box 8 minus in-state portion (IN, UT simplified as exempt) |
| C8 | P1 | Refundable state child credits computed per law (CA YCTC, NY Empire State, MN, CO, NJ, MD, IL, OR) | Several flat amounts | Needs A2 ages | ⬜ |
| C9 | P1 | Own-formula state EITCs (CA CalEITC table, MN WFC) | % of federal | | ⬜ |
| C10 | P1 | State itemized deductions for remaining states (AL, AZ, AR, GA, HI, ID, KS, KY, ME, MN, MS, MO, NE, NC, OK, OR, SC, WI credit…) | NY, CA, DC, MD, VA only | Per-state Schedule A rules | ⬜ |
| C11 | P1 | Military pay exclusions | — | Box 14 / input | ⬜ |
| C12 | P1 | Convenience-of-employer rule (NY, NJ, CT, DE, NE, PA) | — | Work-from-home days | ⬜ |
| C13 | P1 | PFML / SDI payroll contributions and multi-employer excess refunds (CA SDI also federal SALT) | — | W-2 box 14 amounts | ⬜ |
| C14 | P2 | State AMT (CA, CO, CT, MN) | — | | ⬜ |
| C15 | P2 | Use tax line | — | Input | ⬜ |
| C16 | P2 | Community property allocation (9 states) | — | | ⬜ |
| C17 | P2 | Separate state filing status where allowed/required | — | | ⬜ |
| C18 | P2 | Credit for taxes paid: per-state limitation formulas, local taxes, reverse credits | One ratio formula | | ⬜ |
| C19 | P2 | Renter / property tax credits and circuit breakers (MN M1PR, MI 1040CR, WI H, NJ ANCHOR) | Some panels | | ⬜ |
| C20 | P2 | 529 recapture on nonqualified withdrawals | — | | ⬜ |
| C21 | P2 | State filing thresholds / "return not required" | No-tax states only | | ⬜ |

## D. Local

| ID | Pri | Gap | Today | Approach / inputs needed | Status |
| :-- | :-: | :-- | :-- | :-- | :-: |
| D1 | P0 | Locality picker (residence + work locality per W-2) | Locality name text on W-2 state line | Shared picker; rate tables by year | ⬜ |
| D2 | P1 | Maryland county tax by county (2.25%–3.20%, applies to all residents) | Flat 3.2% when box 18/19 present | County select + verified 2024/2025 rate table | ⬜ |
| D3 | P1 | PA Act 32 EIT by PSD code; Philadelphia wage/NPT/SIT; LST | Box 19 passthrough | PSD rate table | ⬜ |
| D4 | P1 | Ohio municipal and school district income taxes | Box 19 passthrough | Municipality/SD tables | ⬜ |
| D5 | P1 | Indiana county LIT | Box 19 passthrough | County table | ⬜ |
| D6 | P1 | NYC household credit, NYC EITC, rate-reduction amount; Yonkers nonresident 0.5% | School credit + brackets only | | ⬜ |
| D7 | P2 | Michigan cities, KY occupational taxes, KC/St. Louis, Wilmington, AL occupational, Portland SHS / Multnomah PFA, TriMet/LTD | Box 19 passthrough | City tables | ⬜ |
| D8 | P2 | NY MCTMT, Denver/Aurora OPT, WV city service fees | — | | ⬜ |

## E. Output, filing, product

| ID | Pri | Gap | Today | Approach | Status |
| :-- | :-: | :-- | :-- | :-- | :-: |
| E1 | P1 | Official Form 1040 + schedules PDF (field mapping from graph quantities) | Summary worksheet | Map `form` metadata on quantities to PDF fields | ⬜ |
| E2 | P1 | Line-by-line guide for Free File Fillable Forms | Main lines only | Generate from quantities' `form` labels | ⬜ |
| E3 | P2 | State forms PDFs, e-file integrations | Mock | | ⬜ |
| E4 | P2 | Amended return (1040-X) | — | Diff two drafts | ⬜ |
| E5 | P2 | IP PIN, prior-year AGI for e-file signature, bank details | — | | ⬜ |

## F. Verification debt (values entered from memory — confirm against sources)

| ID | Item | Source to check |
| :-- | :-- | :-- |
| F1 | Tips/overtime phase-out rounding ($100 per $1,000 — proportional vs per-$1,000 step) | 2025 Schedule 1-A instructions |
| F2 | Lists of states with refundable EITC / child credits | Each state's instructions |
| F3 | Nonresident ratio-method vs prorate-method state lists | Each state's nonresident form |
| F4 | State rule table values (`src/state-rules.ts`) for 2024 and 2025, esp. HOH brackets | DOR instructions per state |
| F5 | 2025 HSA, Saver's Credit, AMT breakpoint values | Rev. Proc. 2024-25 / 2024-40 |
