# Federal Tax Logic — Complete Requirements

Every federal rule the app must support for a person to prepare and file a complete Form 1040 with no gaps, with the current implementation status of each rule.

- **Companion doc:** [state_local_tax_logic.md](./state_local_tax_logic.md) covers state and local returns.
- **How rules are implemented:** every rule is a quantity in the formula graph ([`src/graph/federal.ts`](../src/graph/federal.ts)). The `fed.*` ids below are those quantities, so each row maps to the code that computes and displays it.
- **Work queue:** [remaining_gaps.md](./remaining_gaps.md) lists every open item by priority.
- **Tests:** [`src/tests/test-golden.ts`](../src/tests/test-golden.ts) holds hand-computed IRS worked examples; rules marked ❌ or ⚠️ there are tracked as *known gaps*.

**Status legend**

| Mark | Meaning |
| :--: | :-- |
| ✅ | Implemented and covered by tests |
| ⚠️ | Implemented with a simplification (stated in the row) |
| ❌ | Not implemented |
| 🚫 | Deliberately out of scope (the app should detect it and tell the user to use other software) |

---

## 0. Tax years and law changes

| Requirement | Status | Notes |
| :-- | :--: | :-- |
| TY2024 parameters (brackets, std deduction, phaseouts, SS wage base) | ✅ | `src/tax-constants.ts` |
| TY2025 parameters **after** P.L. 119-21 (signed July 4, 2025) | ✅ | Std deduction $15,750 / $31,500 / $23,625; CTC $2,200; SALT cap $40,000 with phase-down; Schedule 1-A deductions (tips, overtime, car loan interest, senior) |
| TY2026 parameters (Rev. Proc. 2025-32) | ❌ | The next filing season (early 2027) is for TY2026. The year selector stops at 2025 |
| Every year-dependent value is keyed by year | ⚠️ | ✅ brackets, std deduction, SS base, AMT exemption and 28% breakpoint, EITC tables, Saver's Credit tiers, student loan phase-out, SALT cap. ❌ HSA/IRA limits (not enforced yet), mileage rates |
| Prior-year returns (late filers, amendments) | ⚠️ | Only 2024–2025 |

---

## 1. Filing status, people and dependents

| Rule | Status | Notes / graph ids |
| :-- | :--: | :-- |
| Five filing statuses incl. Qualifying Surviving Spouse | ✅ | QSS is mapped to MFJ brackets and std deduction |
| Filing status eligibility tests (HOH: unmarried + qualifying person + >½ cost of home; QSS: spouse died in prior 2 years + dependent child; "considered unmarried") | ❌ | User picks a status with no validation |
| Separate **taxpayer and spouse** records (age, blindness, SSN/ITIN, which W-2/1099 is whose) | ⚠️ | ✅ birth year, blind, W-2 owner; ❌ SSN/ITIN, 1099 owner | Needed for per-person rules: excess SS (§2), SE tax wage base, IRA limits, the senior deduction, HSA catch-up, EITC age test |
| Dependent records (name, relationship, age, months lived with you, student/disabled, SSN vs ITIN) | ✅ | Dependents panel (count fields remain as fallback) |
| Qualifying child tests (relationship, age < 19 / < 24 student / any age disabled, residency > ½ year, support, joint return) and tie-breaker rules | ⚠️ | ✅ relationship, age, student, disabled, residency; ❌ support, joint-return, tie-breakers | Drives CTC (under 17), EITC (under 19/24), dependent care (under 13), HOH |
| Qualifying relative tests (gross income < $5,050 for 2024, support > ½, member of household) | ❌ | Drives ODC and HOH |
| Taxpayer can be claimed as a dependent → limited std deduction (greater of $1,300 or earned income + $450, 2024) and no EITC | ✅ | Checkbox + `fed.stdDeduction`; golden tests |
| MFS: if one spouse itemizes, the other's std deduction is $0 | ❌ | |
| Nonresident alien / dual-status (1040-NR) | 🚫 | Detect and refer |
| Deceased taxpayer, final return | ❌ | Filing status and signature handling |
| Digital assets question (Form 1040 page 1) | ❌ | Filing requirement |
| Filing requirement thresholds (must I file?) | ❌ | Gross income vs std deduction, SE ≥ $400, APTC received, etc. |

---

## 2. Income (Form 1040 lines 1–9, Schedule 1 Part I)

### 2.1 Wages (W-2) — `fed.wages`, `fed.w2Withholding`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| Box 1 wages summed across W-2s → Line 1a | ✅ | `fed.wages` |
| Box 2 withholding → Line 25a | ✅ | `fed.w2Withholding` |
| Boxes 3–6 (SS and Medicare wages and tax) | ✅ | Used by `fed.excessSS`, `fed.seSsRoom`, `fed.additionalMedicareTax` |
| Box 6 Additional Medicare withheld credited on Line 25c (Form 8959 Part V) | ✅ | `fed.addlMedicareWithheld`; golden test |
| Box 7/8 SS tips, allocated tips (Line 1c) | ❌ | Allocated tips are taxable and need Form 4137 |
| Box 10 dependent care benefits: excess over $5,000 is taxable (Line 1e); reduces the Form 2441 expense limit | ❌ | |
| Box 12 codes: D/E/G/S (deferrals → Saver's Credit, IRA phaseout); W (employer HSA → reduces HSA limit); C (group-term life); DD (info); AA/BB (Roth); Q (combat pay → EITC election); T (adoption benefits, Line 1f) | ⚠️ | ✅ deferral codes and W; ❌ Q, T, C |
| Box 13 retirement plan → IRA deduction phaseout applies | ✅ | Per person (W-2 owner) |
| Statutory employee → wages go to Schedule C | ❌ | |
| Household employee wages without W-2 (Line 1b), Medicaid waiver payments (1d), scholarships (1f text), Form 8919 uncollected FICA wages (1g) | ❌ | |
| **2025–2028: qualified tips deduction** (≤ $25,000; phase-out $100 per $1,000 MAGI over $150k / $300k MFJ; listed occupations; SSN; MFJ if married) | ⚠️ | `fed.tipsDeduction`; ✅ cap, phase-out, MFS bar; ❌ occupation/SSN checks; phase-out applied proportionally (verify IRS rounding) |
| **2025–2028: qualified overtime deduction** (premium portion of FLSA overtime, ≤ $12,500 / $25,000 MFJ; same phase-out) | ✅ | `fed.overtimeDeduction`; golden test |

### 2.2 Interest and dividends (Schedule B) — `fed.interestTotal`, `fed.dividends`, `fed.qualifiedDividends`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| Taxable interest (1099-INT box 1 + box 3 + manual) | ✅ | `fed.interestTotal`, `fed.treasuryInterest` |
| Accrued interest paid on bond purchase (Schedule B adjustment) | ✅ | Per-item `max(0, amount − accrued)` |
| Tax-exempt interest (Line 2a), used in SS provisional income and EITC | ✅ | `fed.taxExemptInterest` |
| Private-activity bond interest (AMT preference) | ❌ | |
| US savings bond interest excluded for education (Form 8815) | ❌ | |
| OID (1099-OID), bond premium amortization, nominee interest | ❌ | |
| Early withdrawal penalty (1099-INT box 2) → adjustment | ✅ | `in.earlyWithdrawal` |
| Ordinary dividends (Line 3b) / qualified dividends (Line 3a) | ✅ | |
| Capital gain distributions (1099-DIV box 2a) → Schedule D line 13 / Line 7 | ✅ | `fed.capGainDistributions`; golden test |
| Section 199A dividends (box 5) → QBI | ❌ | |
| Foreign tax paid on 1099-DIV/INT → FTC | ⚠️ | Entered manually as a credit amount |
| Schedule B Part III foreign account questions (FBAR/FinCEN 114 reminder) | ❌ | |

### 2.3 Retirement income (1099-R, SSA-1099) — `fed.retirement`, `fed.taxableSS`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| 1099-R taxable amount (box 2a; box 1 if not determined) | ✅ | `fed.retirement`; golden test |
| Distribution codes: G/H rollovers (non-taxable), 7 normal, 1 early, 2 exception, 3 disability, 4 death, J/T Roth, Q qualified Roth, B designated Roth | ⚠️ | ✅ rollover (G/H) and code 1; ❌ other codes |
| Form 8606: nondeductible IRA basis, pro-rata rule, Roth conversions, backdoor Roth | ❌ | |
| Simplified Method for annuity basis | ❌ | |
| Qualified charitable distributions (QCD) up to $105,000 (2024) excluded | ❌ | |
| RMD failure excise (Form 5329 Part IX) | ❌ | |
| Public safety officer $3,000 insurance exclusion | ❌ | |
| SS Benefits Worksheet (0/50/85%) | ✅ | `fed.provisionalIncome`, `fed.taxableSS`; golden test from Pub. 915 |
| MFS who lived apart all year uses $25,000 base (not $0) | ✅ | Checkbox; golden test |
| Lump-sum election for prior-year benefits (Pub. 915) | ❌ | |
| Railroad retirement (RRB-1099, Tier 1 like SS) | ❌ | |

### 2.4 Capital gains and losses (Schedule D, Form 8949) — `fed.capNet`, `fed.capAllowed`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| Net short-term + long-term, $3,000 / $1,500 loss limit | ✅ | Golden test |
| Prior-year capital loss carryover | ⚠️ | Single carryover number; must be split ST/LT (Capital Loss Carryover Worksheet) and next year's carryover computed |
| Form 8949 per-transaction entry with box categories A–F (basis reported or not), adjustment codes (W wash sale, B basis, etc.) | ❌ | Needed to file; summary totals only allowed when no adjustments (Exception 1) |
| Wash-sale disallowance | ❌ | Usually from broker 1099-B (code W) |
| 28% collectibles gain, 25% unrecaptured §1250 gain | ✅ | Worksheet result capped at regular tax on all income (`fed.regularTax`); golden test |
| §1202 qualified small business stock exclusion | ❌ | |
| §1256 contracts 60/40 (Form 6781) | ❌ | |
| Sale of main home — §121 exclusion $250k / $500k (ownership and use tests, partial exclusion) | ❌ | |
| Business property sales (Form 4797, depreciation recapture §1245/§1250) | ❌ | |
| Installment sales (Form 6252), like-kind exchanges (Form 8824) | 🚫 | Refer |
| Digital asset transactions (1099-DA starting 2025) | ❌ | Via Form 8949 |
| Capital gain distributions & undistributed gains (Form 2439) | ❌ | |

### 2.5 Business income (Schedule C, Schedule SE) — `fed.businessProfit`, `fed.seTax`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| 1099-NEC / 1099-K / other receipts minus expenses | ⚠️ | One pooled business; expenses are a single number; ✅ losses offset other income |
| Multiple businesses (one Schedule C each, per spouse) | ❌ | |
| Expense categories (Part II lines 8–27), cost of goods sold (Part III) | ❌ | |
| Home office (Form 8829 or simplified $5/sq ft up to 300 sq ft) | ❌ | |
| Vehicle expenses (standard mileage 67¢ 2024 / 70¢ 2025 or actual) | ❌ | |
| Depreciation and §179 / bonus depreciation (Form 4562); 100% bonus restored for property acquired after Jan 19, 2025 (P.L. 119-21) | ❌ | |
| Excess business loss limitation §461(l) (Form 461) | ❌ | |
| At-risk rules (Form 6198), hobby income (no deductions) | ❌ | |
| 1099-K personal-item sales / duplicates of 1099-NEC; reporting threshold restored to $20,000 / 200 transactions | ❌ | |
| Schedule F farm income | ⚠️ | Pooled with Schedule C |
| SE tax: 92.35% × 15.3% with SS portion limited by W-2 SS wages | ⚠️ | ✅ math and per-person wage base (golden tests); ❌ church employee income, ❌ optional methods, ❌ Form 8919 wages |
| ½ SE tax deduction | ✅ | `fed.halfSeTax` |

### 2.6 Rental, royalty, pass-through (Schedule E, Form 8582) — `fed.rentalNet`, `fed.rentalAllowed`, `fed.k1Income`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| One rental property: rents − expenses − depreciation | ⚠️ | One property; expense categories not itemized |
| Multiple properties, royalties (Part I) | ❌ | |
| Personal-use days / vacation home limits (§280A), fair rental days, < 15 days rule | ❌ | |
| Depreciation computation (27.5-year MACRS, mid-month) | ❌ | User enters a number |
| $25,000 special allowance with $100k–$150k phase-out (Form 8582) | ✅ | `fed.rentalLossAllowance` |
| Suspended passive loss carryforward to next year; release on disposition | ⚠️ | Suspended amount computed (`fed.suspendedRentalLoss`), not carried forward |
| Real estate professional, active vs passive participation | ❌ | |
| Schedule K-1 (1065/1120-S/1041) box-level entry: ordinary income, guaranteed payments (SE income), rental, interest, dividends, gains, §179, §199A info, passive vs nonpassive, basis and at-risk | ⚠️ | Single amount treated as ordinary, nonpassive QBI with no SE tax |

### 2.7 Other income (Schedule 1 Part I)

| Rule | Status | Notes |
| :-- | :--: | :-- |
| Unemployment (1099-G box 1) | ⚠️ | Pooled into "Other 1099 income" |
| State/local refund (1099-G box 2) taxable only to the extent itemized and benefited last year (tax benefit rule worksheet) | ❌ | Currently fully taxable if entered |
| Alimony received (pre-2019 divorce) | ✅ | `in.alimonyReceived` |
| Gambling winnings (W-2G) | ✅ | `fed.gambling` |
| Cancellation of debt (1099-C) and insolvency exclusion (Form 982) | ❌ | |
| Foreign earned income exclusion (Form 2555), housing exclusion, and stacking rule (tax computed as if excluded income were included) | ⚠️ | Exclusion capped at limit; housing and stacking worksheet missing |
| HSA distributions (Form 8889 Part II): non-qualified distributions taxable + 20% | ❌ | |
| 529 / Coverdell non-qualified distributions (earnings taxable + 10%) | ❌ | |
| Prizes, jury duty pay, other income | ⚠️ | Generic "Other" source |
| Net operating loss deduction (carryforward) | ❌ | |
| Unreported tip income (Form 4137) | ✅ | `in.tips`, `fed.tipsFica` |

### 2.8 Total income — `fed.totalIncome` (Line 9) ✅

---

## 3. Adjustments to income (Schedule 1 Part II) — `fed.adjustments`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| Educator expenses ($300 each, $600 MFJ both educators) | ⚠️ | Cap is $600 for MFJ regardless of whether both spouses are educators |
| Reservist / performing artist / fee-basis official (Form 2106) | ❌ | |
| HSA deduction (Form 8889): annual limit $4,150 / $8,300 (2024), $4,300 / $8,550 (2025), +$1,000 age 55; reduced by employer contributions (W-2 box 12 W); last-month rule; 6% excess excise | ⚠️ | ✅ limits, catch-up, box 12 W, 6% excise (`fed.hsaDeduction`, `fed.hsaExcise`); ❌ partial-year / last-month rule, distributions |
| Moving expenses (Armed Forces only, Form 3903) | ✅ | `in.militaryMoving` |
| ½ SE tax | ✅ | |
| SEP / SIMPLE / solo 401(k) limits (20% of net SE earnings, $23,000 deferral 2024) | ⚠️ | Amount accepted as entered |
| SE health insurance (limited to net SE profit; months not eligible for employer plan; PTC interaction) | ⚠️ | Amount accepted as entered |
| Penalty on early withdrawal of savings | ✅ | |
| Alimony paid (pre-2019) | ✅ | |
| IRA deduction: $7,000 limit (+$1,000 age 50), limited to compensation, spousal IRA, MAGI phase-out when covered by workplace plan (2024: $77k–$87k single, $123k–$143k MFJ; $230k–$240k spouse covered) | ⚠️ | ✅ limit, catch-up, compensation limit, covered/spouse-covered phase-outs with $10 round-up and $200 minimum, Appendix B SS ordering (`fed.iraDeduction`); ❌ separate spousal IRA |
| Student loan interest: $2,500 cap and MAGI phase-out ($80k–$95k single / $165k–$195k MFJ 2024; $85k–$100k / $170k–$200k 2025; MFS not allowed) | ✅ | `fed.studentLoanMagi`, `fed.studentLoanDeduction`; golden test |
| Archer MSA, jury duty pay remitted, other | ⚠️ | Jury duty ✅ |

**Adjusted Gross Income** — `fed.agi` (Line 11) ✅

---

## 4. Deductions (Lines 12–14)

### 4.1 Standard deduction — `fed.stdDeduction`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| Base amount by status and year | ✅ | 2025 per P.L. 119-21; ❌ 2026 |
| Additional amount per 65+/blind box | ✅ | Golden test |
| Dependent limitation, MFS-spouse-itemizes rule | ⚠️ | ✅ dependent limitation; ❌ MFS-spouse-itemizes |
| **2025–2028 senior deduction** $6,000 per individual 65+ (phase-out 6% of MAGI over $75k / $150k MFJ; SSN; MFJ if married), available whether or not itemizing | ✅ | `fed.seniorDeduction`; golden test |
| **2025–2028 car loan interest** on new US-assembled personal vehicles, ≤ $10,000, phase-out $200 per $1,000 MAGI over $100k / $200k | ✅ | `fed.carLoanDeduction`; golden test |
| **2026+ charitable deduction for non-itemizers** $1,000 / $2,000 MFJ (cash) | ❌ | |

### 4.2 Itemized deductions (Schedule A) — `fed.itemized`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| Medical over 7.5% of AGI | ✅ | `fed.medicalDeduction` |
| SALT: state/local income tax **or** general sales tax election (+ IRS sales tax tables), real estate, personal property tax | ⚠️ | Income tax = W-2 boxes 17+19 only (misses estimated payments and prior-year balance paid; CA SDI); no sales tax option; no personal property tax |
| SALT cap: $10,000 (2024); **$40,000 (2025), $40,400 (2026), +1%/yr to 2029, $10,000 from 2030**; phase-down by 30% of MAGI over $500,000 ($505,000 in 2026) to a $10,000 floor; half for MFS | ✅ | `fed.saltCap` (2024–2025); golden tests |
| Mortgage interest (Form 1098): $750k acquisition debt limit ($1M grandfathered pre-12/16/2017), points, home equity used to buy/build/improve only | ⚠️ | Amount accepted as entered; no debt limit |
| Mortgage insurance premiums (deductible again from 2026) | ❌ | |
| Investment interest (Form 4952) limited to net investment income, carryforward, qualified dividend election | ⚠️ | Limited; no carryforward/election |
| Charitable: cash 60% AGI, appreciated property 30%, private foundations 20%, 5-year carryover, Form 8283 > $500 noncash | ⚠️ | No AGI limits or carryover |
| **2026+:** 0.5%-of-AGI floor on itemized charitable gifts | ❌ | |
| Casualty/theft (federally declared disasters only): $100 per event + 10% AGI floor (Form 4684); qualified disaster losses $500 floor without 10% | ⚠️ | Amount accepted as entered (known gap in old docs) |
| Gambling losses up to winnings; **2026+ limited to 90% of losses** | ✅ / ❌ | 2026 rule missing |
| **2026+ limitation of itemized benefit for 37% bracket** (2/37 reduction) | ❌ | |
| Itemize vs standard choice (auto / forced) | ✅ | `fed.deduction`, `fed.itemizing` |

### 4.3 Qualified business income deduction (Form 8995 / 8995-A) — `fed.qbi`

| Rule | Status | Notes |
| :-- | :--: | :-- |
| 20% of QBI limited to 20% of taxable income minus net capital gain | ✅ | Golden test |
| QBI reduced by ½ SE tax, SE health, SE retirement attributable to the business | ✅ | |
| Above threshold ($191,950 / $383,900 in 2024): SSTB phase-out, W-2 wage / UBIA limit (Form 8995-A) | ❌ | |
| REIT dividends and PTP income (§199A dividends) | ❌ | |
| QBI loss carryforward | ❌ | |
| 2026+: wider phase-in ($75k / $150k) and $400 minimum deduction (P.L. 119-21) | ❌ | |

**Taxable income** — `fed.taxableIncome` (Line 15) ✅

---

## 5. Tax computation (Line 16)

| Rule | Status | Notes |
| :-- | :--: | :-- |
| **Tax Table** for taxable income < $100,000 ($50 rows, tax at row midpoint, rounded) | ✅ | `fed.ordinaryTaxRow`, `fed.regularTaxRow`; golden tests |
| Tax Computation Worksheet (≥ $100,000) | ✅ | Equivalent to bracket math; golden test |
| Qualified Dividends and Capital Gain Tax Worksheet (0/15/20% stacking) | ✅ | `fed.standardPrefTax`; golden test |
| Schedule D Tax Worksheet (28% / 25% gains as maximum rates) | ✅ | Smaller of worksheet and regular tax |
| Kiddie tax (Form 8615) and parent's election (Form 8814) | ❌ | |
| Foreign Earned Income Tax Worksheet (stacking) | ❌ | |
| Lump-sum distributions (Form 4972) | 🚫 | |
| Alternative Minimum Tax (Form 6251) — basic AMTI, exemption, 26/28% | ⚠️ | ✅ basic, standard-deduction filers, year-keyed breakpoint; ❌ ISO spread (Form 3921), PAB interest, depreciation, AMT NOL, AMT FTC; ❌ 2026 exemption phase-out at 50% from $500k/$1M |
| Credit for prior-year minimum tax (Form 8801) | ❌ | |
| Excess advance PTC repayment (Form 8962) | ❌ | See §8 |

---

## 6. Nonrefundable credits (Schedule 3 Part I, Lines 19–21)

| Rule | Status | Notes / graph ids |
| :-- | :--: | :-- |
| Child Tax Credit $2,000 (2024) / **$2,200 (2025)**; under 17; SSN for child (and, from 2025, for at least one parent); $50 per $1,000 over $200k / $400k | ⚠️ | `fed.ctcAfterPhaseout`; ✅ amounts; ❌ SSN and age tests |
| Credit for Other Dependents $500 | ✅ | `fed.odcAfterPhaseout` |
| Child & dependent care (Form 2441): 35%→20% rate, $3,000 / $6,000; **qualifying person under 13**; limited to the lower earner's earned income (student/disabled spouse deemed $250/$500 per month); reduced by employer benefits (box 10); MFS generally ineligible | ⚠️ | `fed.childCareCredit`; ✅ earned-income limit (lower-earning spouse); ❌ under-13 test, deemed income, box 10 |
| **2026+ dependent care rate up to 50%** (P.L. 119-21) | ❌ | |
| Education credits (Form 8863): AOTC per student ($2,500, 40% refundable, first 4 years, half-time, no felony drug conviction; refundability limited for some under-24 students); LLC 20% of $10,000 per return; MAGI phase-out $80k–$90k / $160k–$180k | ⚠️ | `fed.aotcTotal`, `fed.llc`; one student only; no per-student or 4-year tracking |
| Saver's Credit (Form 8880): includes elective deferrals (W-2 box 12 D/E/G/S, Roth), minus distributions; not for full-time students or dependents; thresholds by year | ⚠️ | ✅ IRA + box 12 deferrals per person, dependents excluded, year thresholds; ❌ distributions reduction, full-time student test |
| Foreign tax credit (Form 1116) with limitation; de minimis $300/$600 election without the form; carryover | ⚠️ | Amount accepted as entered |
| Residential clean energy (Form 5695 Part I, 30%) — **ends for expenditures after 12/31/2025** | ⚠️ | Amount accepted as entered |
| Energy-efficient home improvement (25C, $1,200 / $2,000 heat pumps) — **ends after 2025** | ⚠️ | Amount accepted as entered |
| Clean vehicle credits (Form 8936; new $7,500, used $4,000; MSRP and income limits) — **end for vehicles acquired after 9/30/2025** | ⚠️ | Amount accepted as entered |
| Adoption credit (Form 8839): $16,810 (2024) / $17,280 (2025), MAGI phase-out; **up to $5,000 refundable from 2025** | ⚠️ | Capped only |
| Elderly or disabled credit (Schedule R) computed from age, disability income, AGI and nontaxable SS | ⚠️ | Amount accepted as entered |
| Mortgage interest credit (Form 8396), general business credits, other | ❌ | |
| Credits limited to tax (ordering) | ✅ | `fed.nonrefundableCredits` |

---

## 7. Other taxes (Schedule 2, Line 23)

| Rule | Status | Notes / graph ids |
| :-- | :--: | :-- |
| Self-employment tax | ⚠️ | See §2.5 |
| Additional Medicare Tax (Form 8959) on wages + SE earnings over $200k / $250k / $125k | ✅ | `fed.additionalMedicareTax`; Part V withholding credit missing (§2.1) |
| Net Investment Income Tax (Form 8960) | ⚠️ | ✅ interest, dividends, gains, rental; ❌ passive K-1, royalties, NII deductions, excluded §121 gain |
| AMT | ⚠️ | §5 |
| Additional tax on IRAs / retirement plans (Form 5329): 10% early, **exceptions** (age 55 separation, disability, medical > 7.5%, first home $10k, education, SEPP, birth/adoption $5k, emergency $1k, terminal illness), 25% SIMPLE first 2 years, 6% excess IRA/HSA contributions, 25% RMD shortfall | ⚠️ | 10% on Code 1 only; no exceptions |
| Household employment taxes (Schedule H): SS/Medicare when cash wages ≥ $2,700 (2024) / $2,800 (2025), FUTA 6% minus credit (credit-reduction states) | ⚠️ | Amount accepted as entered |
| Uncollected SS/Medicare on tips (Form 4137) and wages (Form 8919) | ⚠️ | ✅ 4137; ❌ 8919 |
| HSA / Archer MSA additional 20% tax | ❌ | |
| Repayment of first-time homebuyer credit, recapture taxes | ❌ | |
| Excess APTC repayment (Form 8962), **repayment caps removed from 2026** | ❌ | |

**Total tax** — `fed.totalTax` (Line 24) ✅

---

## 8. Payments and refundable credits (Lines 25–33)

| Rule | Status | Notes / graph ids |
| :-- | :--: | :-- |
| W-2 withholding (25a), 1099 / W-2G / SSA-1099 withholding (25b) | ✅ | `fed.w2Withholding`, `fed.extraWithholding` |
| Additional Medicare withheld (25c) | ✅ | `fed.addlMedicareWithheld` |
| Estimated payments + prior-year overpayment applied (Line 26) | ⚠️ | Single amount |
| Extension payment (Form 4868), amount paid with extension | ❌ | |
| Earned Income Credit (Line 27): year-indexed tables (2024 and 2025 differ); EIC Table $50 bands; investment income limit; age 25–64 when no qualifying child; qualifying child age/residency/relationship; MFS separated-spouse rule; SSN requirements; disallowance periods | ⚠️ | `fed.eitc`: ✅ 2024 and 2025 parameters; ✅ EIC Table $50 bands; ❌ age and qualifying-child tests |
| Additional Child Tax Credit (Line 28): 15% of earned income over $2,500, $1,700 per child (2024 and 2025) | ✅ | `fed.actc` |
| Refundable AOTC (Line 29) | ✅ | `fed.aotcRefundable` |
| Net Premium Tax Credit (Form 8962): 1095-A reconciliation, SLCSP, household income as % of FPL, applicable percentage (enhanced subsidies expired after 2025 → 400% FPL cliff returns for 2026), shared policy allocation, excess APTC repayment | ⚠️ | Net amount accepted as entered |
| Excess Social Security tax credit (Schedule 3 line 11) — **per person**, only when 2+ employers | ✅ | `fed.excessSS` per W-2 owner; golden tests |
| Credit for tax on undistributed capital gain (Form 2439), fuel tax credit (Form 4136), other refundable credits | ❌ | |
| Refundable adoption credit (2025+, up to $5,000) | ❌ | |
| Total payments (Line 33) | ✅ | `fed.payments` |

---

## 9. Balance due, refund, penalties

| Rule | Status | Notes |
| :-- | :--: | :-- |
| Refund (Line 34) / amount owed (Line 37) | ✅ | `fed.refund`, `fed.owed` |
| Underpayment of estimated tax penalty (Form 2210): safe harbors (90% current / 100% prior / 110% if prior AGI > $150k), $1,000 threshold, annualized income method, waivers | ⚠️ | ✅ required annual payment and shortfall flag (`fed.requiredAnnualPayment`, `fed.estimatedTaxShortfall`); ❌ penalty amount (quarterly rates), annualized method |
| Apply refund to next year's estimated tax (Line 36), split refunds (Form 8888), direct deposit details | ❌ | |
| Late filing / late payment penalties and interest | 🚫 | Informational only |
| Effective tax rate | ✅ | `fed.effectiveRate` |

---

## 10. Multi-year carryovers (needed to file correctly next year)

| Carryover | Status |
| :-- | :--: |
| Capital loss (ST and LT separately) | ⚠️ (`fed.capLossCarryforward` computed as one number; ST/LT split missing) |
| Passive activity losses (Form 8582) | ❌ |
| Charitable contribution carryover (5 years) | ❌ |
| Investment interest carryforward | ❌ |
| Net operating loss | ❌ |
| AMT credit (Form 8801) | ❌ |
| Foreign tax credit carryover | ❌ |
| §179 carryover, QBI loss carryforward | ❌ |
| Prior-year AGI (e-file signature) and prior-year tax (2210 safe harbor) | ⚠️ (inputs exist for Form 2210; not used for e-file) |

---

## 11. Filing and output

| Requirement | Status | Notes |
| :-- | :--: | :-- |
| Printable Form 1040 + schedules (official PDF field mapping) | ❌ | Current output is a summary worksheet |
| IRS e-file (MeF XML) through an authorized transmitter | ❌ | Mock only |
| Free File Fillable Forms line-by-line guide | ⚠️ | 1040 mirror covers main lines only |
| Identity Protection PIN, signatures, preparer info | ❌ | |
| Amended return (Form 1040-X) | ❌ | |
| Validation of impossible inputs (negative wages, box 4 > 6.2% of box 3, etc.) | ⚠️ | Inputs clamped to ≥ 0 in the graph; no user-facing validation |

---

## 12. Year parameter checklist

For each tax year, these values must be set (all in `src/tax-constants.ts` / `src/graph/federal.ts` params):

- Ordinary brackets × 4 statuses; 0/15/20% capital gain thresholds; 25%/28% special rates.
- Standard deduction × 4 statuses; additional 65/blind (single/HOH vs married); dependent minimum ($1,300) and +$450.
- SS wage base; Additional Medicare and NIIT thresholds (not indexed).
- CTC amount, refundable ACTC cap, phase-out thresholds; ODC.
- EITC: max credit, phase-in/out rates, phase-out start/end (single vs MFJ) × 0–3 children; investment income limit.
- Education credit MAGI phase-outs; student loan phase-out; IRA deduction phase-outs (covered / spouse covered); Roth contribution phase-outs; Saver's Credit AGI tiers.
- HSA limits (self/family/catch-up); IRA, 401(k), SIMPLE limits.
- AMT exemption, phase-out start, 28% breakpoint.
- QBI threshold and phase-in range.
- FEIE limit; adoption credit max and phase-out; Schedule H thresholds; standard mileage rates.
- From 2025: SALT cap and phase-down threshold; tips / overtime / car-loan / senior deduction limits and phase-outs.
