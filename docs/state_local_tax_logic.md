# State & Local Tax Logic — Complete Requirements

Every state and local rule the app must support to prepare complete state and local returns at the same level of detail as the federal return, with current implementation status.

- **Companion doc:** [federal_tax_logic.md](./federal_tax_logic.md).
- **Implementation:** state returns are formula-graph modules in [`src/graph/states.ts`](../src/graph/states.ts); quantity ids are `st.<code>.<slot>` (e.g. `st.ny.taxable`). Rate tables live in [`src/state-rules.ts`](../src/state-rules.ts).
- **Work queue:** [remaining_gaps.md](./remaining_gaps.md).
- **Detailed per-state notes** (official URLs, part-year formulas, itemized rules, retirement exclusions, PFML/SDI rates) remain in [tax_law_and_locality_coverage_gaps.md](./tax_law_and_locality_coverage_gaps.md); this document is the requirements list and status tracker.

Status legend: ✅ implemented · ⚠️ simplified · ❌ missing · 🚫 out of scope (detect and refer).

---

## 1. The state template (same granularity for every state)

Every income-tax state is modeled with the same slots, so every state's return renders with the same level of detail and arrows. A state that hasn't overridden a slot uses the default, which makes "not yet implemented" visible.

| Slot (`st.<code>.*`) | Meaning | Default today | Status |
| :-- | :-- | :-- | :--: |
| `startingPoint` | Federal AGI, federal taxable income, or the state's own gross income | Federal AGI; federal taxable income for CO, ND, SC, MT (2024+) | ✅ (own-income states reach their base via additions, e.g. NJ IRA/student loan add-back; more needed) |
| additions (`hsaAddBack`, `paAddBack`, `saltAddBack`, …) | Income the state taxes that federal doesn't | State-specific list | ⚠️ few states |
| subtractions (`ltcgExclusion`, `fedTaxDeduction`, `propertyTaxDeduction`, …) | Income the state exempts | State-specific list | ⚠️ few states |
| `agi` | State adjusted income | start + additions − subtractions | ✅ |
| `baseStdDeduction` / `itemized` / `deduction` | State standard or itemized deduction | Rule-table amount | ⚠️ |
| `exemptions` (`personalExemption`, `dependentExemption`) | Exemption amounts | Table | ⚠️ |
| `taxable` | Taxable income | | ✅ |
| `bracketTax` / `tentativeTax` | Rates; surtaxes; built-in credits | Rule table + year overrides | ⚠️ year overrides for 6 states only |
| `localTax` | Local income tax for residents | Box 19 passthrough in some states | ⚠️ |
| `ostc.<xx>` / `otherStateCredit` | Credit for tax paid to other states | Ratio method | ⚠️ |
| `stateEitc` | State EITC | % of federal | ⚠️ |
| `exemptionCredit` | Personal/dependent/child credits, forgiveness | Per state | ⚠️ |
| `nonrefundableCredits` / `refundableCredits` / `netStateTax` / `totalTax` | Tax after credits, plus local | Refundable state EITCs and child credits paid out | ✅ |
| `totalWithholding` / `net` | Payments and refund/owed | W-2 box 17 (+19) | ⚠️ no estimated or extension payments |

Required template additions:

| Requirement | Status |
| :-- | :--: |
| Separate **nonrefundable** and **refundable** credit slots (refundable credits can create a refund) | ✅ |
| `payments` slot: withholding + estimated payments + extension payment + prior-year overpayment applied | ✅ (`st.<code>.estimatedPayments`) |
| `useTax` slot (most income-tax states put use tax on the income tax return) | ❌ |
| `stateAmt` slot (CA, CO, CT, MN) | ❌ |
| `penalty` slot (state underpayment penalties) | ❌ |
| Year-keyed rate tables and parameters | ⚠️ (`STATE_YEAR_OVERRIDES` for CO, GA, IN, ID, UT, MS) |
| Correct head-of-household brackets (29 states currently get synthesized "1.4 × single" HOH brackets) | ❌ |

---

## 2. Rules that apply across states

| Rule | Status | Notes |
| :-- | :--: | :-- |
| Resident state selection; no state selected | ✅ | No default; no resident return until a state is chosen or a W-2 state exists |
| Federal starting point per state (AGI vs taxable income vs own gross income) | ✅ | See §1 |
| IRC conformity date (rolling vs static, e.g. CA conforms to 2015 IRC) and decoupling from bonus depreciation, §179, QBI (no state allows QBI except a few), HSA (CA, NJ), student loan forgiveness, FEIE | ⚠️ | HSA add-back for CA/NJ only |
| **US Treasury / federal obligation interest is exempt in every income-tax state** (subtraction) | ✅ | `st.<code>.treasurySubtraction` from 1099-INT box 3; golden test |
| **Out-of-state municipal bond interest is taxable in most states** (addition); in-state munis exempt | ⚠️ | ✅ addition in all income-tax states except IN/UT (simplified) |
| State income tax refunds subtraction (federally taxable 1099-G box 2 is not taxable by the state) | ❌ | |
| Social Security: exempt in most states; taxed with phase-outs in CO, CT, MN, MT, NM, RI, UT, VT, WV (2025 status varies) | ⚠️ | ✅ full exemption in all other income-tax states (`st.<code>.ssSubtraction`); ❌ the nine states' partial exemptions |
| Retirement income exclusions (PA, IL, MS full; NY $20k; NJ; GA; MI phase-in; CO; etc.) | ⚠️ | ✅ IL, MS, PA (`retirementSubtraction`); ❌ age-based exclusions (NY, NJ, GA, CO, MI…) need taxpayer ages |
| Military pay exclusions (most states exempt active-duty pay of residents or nonresidents; military retirement exclusions) | ❌ | |
| Unemployment compensation (exempt in CA, NJ, PA, VA, MT, others) | ⚠️ | ✅ CA, NJ, PA, VA (`unemploymentSubtraction`) |
| Capital gains: state LTCG exclusions (AZ 25%, AR 50%, ND 40%, NM 40%, SC 44%, VT 40% up to $5k, WI 30%); MA 8.5% short-term rate; WA excise | ⚠️ | ✅ listed exclusions; ⚠️ MA modeled as a 3.5% surtax |
| 529 plan deductions/credits (30+ states) and recapture of nonqualified withdrawals | ⚠️ | Deductions via state panels with caps; no recapture |
| Part-year residency (move dates, income allocated by residency period, prorated deductions/exemptions) | ❌ | **Major gap**: one full-year resident state only |
| Nonresident returns: source-income rules (wages by work location, rentals by property state, intangibles to domicile), tax computed with the state's method (prorate deductions vs "tax on total × ratio") | ⚠️ | ✅ ratio method for 21 states (`st.<code>.taxIfResident × incomeRatio`), prorated standard deduction for the rest; ❌ exemption/credit proration details, intangibles sourcing |
| Convenience-of-employer rule (NY, NJ, CT, DE, NE, PA for remote work) | ❌ | |
| Credit for taxes paid to other states: per-state limitation formulas, which tax qualifies (local taxes in some states), reverse credits (e.g. VA/OR/AZ/CA for certain states) | ⚠️ | One ratio formula; credit clamped ≥ 0 |
| Reciprocity agreements (wage income only) | ✅ | Rule table `reciprocalWith`; golden test (PA/NJ) |
| Dual residency / statutory residency (183 days + permanent place of abode, e.g. NY) | ❌ | |
| Community property allocation for MFS (AZ, CA, ID, LA, NV, NM, TX, WA, WI) | ❌ | Affects federal MFS too |
| MFJ federal but MFS state (or vice versa) where states allow or require it (e.g. MT, IA, DE combined separate, AR, MS, MO, VA, WV, KY) | ❌ | |
| State EITC: % of federal (many states), own computation (CA CalEITC, MN), refundable vs not, separate eligibility (ITIN filers in CA/CO/WA etc.) | ⚠️ | % of federal for 22 states; refundable credits lost |
| Child tax credits (CA YCTC, NY Empire State, MN, CO, NJ, MA, VT, NM, OR, UT, MD, IL, etc.) | ⚠️ | Several modeled as nonrefundable flat amounts |
| Property tax / renter credits (circuit breakers, many filed on separate forms: MN M1PR, MI 1040CR, WI Schedule H, NJ ANCHOR) | ⚠️ | IL 5% credit, NJ deduction, some panels |
| State paid family leave / disability payroll contributions (CA SDI, NY PFL, NJ, RI, HI, WA, MA, CT, CO, OR, MD) and excess-withholding refunds with multiple employers | ❌ | CA SDI is also deductible as SALT federally |
| Estimated tax and extension payments, underpayment penalties | ⚠️ | ✅ payments; ❌ penalties |
| Use tax reporting | ❌ | Not in old docs |
| State filing thresholds (must I file?) and "return not required" handling | ⚠️ | No-tax states only |
| State forms output (PDFs) and e-file (state MeF, direct portals) | ❌ | See [state_filing_reference.md](./state_filing_reference.md) |

---

## 3. Per-jurisdiction requirements and status

Columns:
- **Start:** the state's starting point. FAGI = federal AGI, FTI = federal taxable income, Own = the state's own gross income.
- **Engine today:** what `src/graph/states.ts` models beyond the template defaults.
- **Missing:** the highest-impact gaps. The old gaps doc has fuller lists.

Every income-tax state also needs every item in §1–§2.

| | Start | Engine today | Missing (highest impact first) |
| :-- | :-- | :-- | :-- |
| **AL** | Own (≈FAGI) | 2–5% brackets; full federal income tax deduction; $1,500 personal exemption | Exemption/std deduction phase-outs by AGI; dependent exemption by AGI tier; itemized (no SALT cap, federal tax deductible); retirement exclusions; municipal occupational taxes |
| **AK** | — | No income tax ✅ | — |
| **AZ** | FAGI | Flat 2.5%; 25% LTCG exclusion; dependent credit $100/$25 | Itemized without SALT cap + charitable boost to std deduction; family tax credits; part-year ratio |
| **AR** | Own | Brackets to 3.9%; 50% LTCG exclusion; $29 personal credits | Low-income tax tables; itemized; retirement exclusion $6,000; military exclusions |
| **CA** | FAGI | Brackets 1–12.3%; 1% Mental Health Services Tax; HSA add-back; itemized with uncapped property tax; exemption credits with phase-out; CalEITC as 45% of federal | Correct starting point (federal adjustments); **CalEITC own table and YCTC (refundable)**; renter's credit; Schedule CA conformity (mortgage $1M, no SALT for state tax, etc.); CA AMT; 540NR ratio method; SDI as withholding; HOH/MFJ brackets per FTB table; year-keyed brackets (current table looks like 2023 values) |
| **CO** | FTI | Flat rate; SALT add-back (itemizers) | Rate by year (4.25% 2024 / 4.4% 2025); SALT add-back threshold rules; SS/pension subtraction by age; CO child tax credit, Family Affordability Credit (refundable); TABOR refund; Denver/Aurora OPT |
| **CT** | FAGI | Brackets; personal exemption phase-out | Personal tax credit table (3% phase-down); 3% bracket recapture; property tax credit; SS/pension exemptions; CT EITC 40% + $250 child bonus; CT AMT |
| **DE** | FAGI | Brackets; $110 personal credits; 65+ std add-on | Itemized; pension exclusion; combined separate filing for married; Wilmington 1.25% city tax |
| **DC** | FAGI | Brackets; itemized; nonresident Form D-30 UBT | Itemized phase-out over $200k; DC EITC 70% (with separate childless rules); Schedule H property tax credit; part-year |
| **FL** | — | No income tax ✅ | — |
| **GA** | FAGI | Rule table (brackets) | **Flat 5.39% (2024) / 5.19% (2025)**; std deduction $12k/$24k; dependent exemption $4,000 (in table); retirement exclusion $35k/$65k; itemized; surplus refund; low-income credit |
| **HI** | FAGI | Brackets; personal exemption | Itemized without SALT cap + phase-out; food/excise credit; refundable EITC; renter credit; pension exclusion |
| **ID** | FAGI | Brackets/flat; $120 + $205 child credits | Flat rate by year (5.695% 2024 / 5.3% 2025); grocery credit; itemized carryover |
| **IL** | FAGI | 4.95%; personal exemption with $250k/$500k cliff; 5% property tax credit; refundable EITC 20% | Retirement & SS subtraction; IL child tax credit (2024+); K-12 education credit |
| **IN** | FAGI | 3.05% flat; exemptions; EITC 10%; county tax via box 19 passthrough | Rate by year (3.0% 2025); **county LIT computed by county of residence on Jan 1**; renter's and property tax deductions; 529 credit |
| **IA** | FAGI | Brackets (2024); flat 3.8% (2025); $40 credits; EITC 15% | Retirement income exclusion (full, age 55+); school district surtax; itemized |
| **KS** | FAGI | Brackets; exemptions; EITC 17% | 2024 rate cut (5.2%/5.58%) and std deduction increase; SS exemption; food sales tax credit |
| **KY** | FAGI | Flat; Family Size Tax Credit | Rate by year (4.0% 2024 and 2025, 3.5% 2026); KY itemized (no SALT); pension exclusion $31,110; **local occupational taxes computed** (Louisville, Lexington, etc.) |
| **LA** | FAGI | Brackets (2024); flat 3% + $12,500 std (2025); EITC 5% | 2024 excess itemized; retirement exclusion $12k (2025); federal tax deduction (pre-2025) |
| **ME** | FAGI | Brackets; personal exemption; EITC 25% | Itemized cap; pension deduction; dependent exemption credit $300; property tax fairness credit |
| **MD** | FAGI | Brackets; 15% std deduction with min/max; exemptions; itemized; EITC 45%; county tax at a flat 3.2% when local wages/withholding exist | **County tax by actual county (2.25%–3.20%, 3.3% cap from 2025)**, always applies to residents; exemption phase-outs by AGI; 2025 new top brackets and std deduction changes; poverty-level credit; refundable EITC; pension exclusion; FAMLI |
| **MA** | Own | 5% with $4,400 exemption (rule table); 3.5% STCG surtax; 4% millionaire surtax; dependent credit $440; EITC 40% | Part A/B/C income classes; 12% STCG rate on Part A properly; rent deduction (panel ✅); commuter; senior circuit breaker; Child & Family Credit amount by year ($440 2025); PFML |
| **MI** | FAGI | 4.25% flat (rule table); exemptions; EITC 30% | Retirement subtraction phase-in; homestead property tax credit (MI-1040CR); **city income taxes computed** (Detroit 2.4%/1.2%, Grand Rapids, etc.) |
| **MN** | FAGI* | Brackets; dependent exemption; child credit $1,750 (≤ $35k) | MN Child Tax Credit actual phase-out ($1,750, phases out above ~$35k–$36k at 12%); Working Family Credit; itemized (M1SA); SS subtraction; property tax refund (M1PR); MN AMT. *verify starting line |
| **MS** | Own | Brackets/flat; exemptions | Rate by year (4.7% 2024 / 4.4% 2025 above $10k); retirement exclusion (full); itemized |
| **MO** | FAGI | Brackets; federal tax deduction (35%, capped) | Rate by year; SS/pension exemptions; KC/St. Louis 1% earnings tax; property tax credit |
| **MT** | FTI (2024+) | Rule table | 2024 conformity to FTI and 4.7%/5.9% rates; state income tax add-back for itemizers; elderly homeowner credit (panel); SS rules |
| **NE** | FAGI | Brackets; $157 credits; EITC 10% | Rate cuts by year; SS exemption (full 2024+); itemized |
| **NV** | — | No income tax ✅ | — |
| **NH** | — | 3% interest & dividends tax (2024 only) ✅ | (I&D repealed from 2025 ✅) |
| **NJ** | Own | Brackets; HSA add-back; property tax deduction $15k; exemptions; EITC 40% | **Own gross income categories** (no federal adjustments except listed); pension exclusion up to $100k; NJ Child Tax Credit (refundable); medical > 2%; property tax credit vs deduction choice; SDI/FLI excess credit (NJ-2450); Newark payroll tax |
| **NM** | FAGI | Brackets; 40% LTCG exclusion (with cap); child credit | 2025 bracket restructure; SS exemption under income limits; refundable Working Families credit (25%); child income tax credit amounts by income |
| **NY** | FAGI | Brackets; IT-196 itemized; Empire State Child Credit ($330 flat); EITC 30%; **NYC resident brackets**; Yonkers surcharge | Empire State Child Credit actual formula (refundable, $330–$1,000 2025+); NYC school tax credit, NYC household credit, NYC EITC; Yonkers nonresident 0.5%; MCTMT; IT-196 phase-outs; pension exclusion $20k; IT-203 ratio method; convenience of employer; PFL |
| **NC** | FAGI | Flat 4.5% (2024) / 4.25% (2025); child deduction tiers | Bailey/military retirement exclusions; itemized (mortgage + property tax ≤ $20k, charity) |
| **ND** | FTI | Brackets; 40% LTCG exclusion | 2024 0%/1.95%/2.5% structure; marriage penalty credit |
| **OH** | FAGI | Brackets; exemptions; local box 19 passthrough | Rate structure by year (2.75%/3.5% 2024, moving to flat 2.75%); exemption amounts by MAGI tier; business income deduction (panel); retirement/SS credits; **municipal income tax (RITA/CCA/independent) and school district tax computed** |
| **OK** | FAGI | Brackets; exemptions | Itemized $17k cap; Sales tax relief credit; refundable EITC (5%) |
| **OR** | FAGI | Brackets; federal tax subtraction (capped); $249 credits + Kids Credit | Federal subtraction phase-out by AGI; kicker credit (2025: large); OR EITC 9%/12%; Portland Metro SHS & Multnomah PFA taxes; TriMet/LTD; Paid Leave Oregon |
| **PA** | Own | 3.07%; non-conformity add-back; Schedule SP forgiveness | Eight income classes with no cross-class loss netting; retirement income exemption; **Act 32 local EIT computed by PSD code; Philadelphia wage/NPT/SIT**; LST |
| **RI** | FAGI | Brackets; exemption | Std deduction and exemption phase-outs; SS/pension subtraction; refundable EITC 16%; TDI |
| **SC** | FTI | Brackets; 44% LTCG exclusion; EITC 125% | Rate by year (top 6.4% 2024 / 6.2% 2025, verify); two-wage-earner credit (panel); retirement deduction; dependent exemption $4,610 (table) |
| **SD** | — | No income tax ✅ | — |
| **TN** | — | No income tax ✅ | — |
| **TX** | — | No income tax ✅ | — |
| **UT** | FAGI | Flat; taxpayer credit (6% with phase-out) | Rate by year (4.65% 2024 / 4.5% 2025); SS credit; retirement credit; UT child tax credit; my529 credit (panel) |
| **VT** | FAGI* | Brackets; 40% LTCG exclusion ≤ $5k; child credit; EITC 38% | SS exemption phase-out; charitable credit 5%; property tax credit; refundable EITC. *verify starting line |
| **VA** | FAGI | Brackets; itemized; exemptions; EITC 20% | Std deduction by year ($8,500/$17,000 2024+); age deduction; low-income credit; military pay subtraction; 763 nonresident ratio |
| **WA** | — | 7% LTCG excise over threshold; WFTC | **9.9% tier on LTCG over $1M (2025+)**; WA Cares and PFML payroll |
| **WV** | FAGI | Brackets; exemptions | 2024/2025 rate cuts; SS phase-out (35%/65%/100%); city service fees |
| **WI** | FAGI | Brackets; sliding std deduction; exemptions; 30% LTCG exclusion | Itemized deduction credit (5%); homestead credit; retirement exclusion (2024+ for 67+); school property tax credit (panel) |
| **WY** | — | No income tax ✅ | — |

---

## 4. Local income and payroll taxes

| Locality | Requirement | Status |
| :-- | :-- | :--: |
| **New York City** (residents) | NYC brackets on NY taxable income ✅; NYC school tax credit (fixed amount) ✅; NYC rate-reduction amount; NYC household credit; NYC EITC; NYC UBT for self-employed | ⚠️ |
| **Yonkers** | Resident surcharge 16.75% of NY tax ✅; nonresident 0.5% earnings tax | ⚠️ |
| **NY MCTMT** | Self-employment earnings > $50k in the MCTD | ❌ |
| **Maryland counties** | County rate by county of residence (23 counties + Baltimore City), applied to all residents | ⚠️ flat 3.2%, only when box 18/19 present |
| **Pennsylvania** | Act 32 EIT (resident vs workplace PSD rate, credit), Philadelphia wage tax 3.75%/3.44%, NPT, SIT, LST | ⚠️ box 19 passthrough |
| **Ohio** | Municipal income tax (residence/workplace, resident credit), school district income tax (traditional vs earned income base) | ⚠️ box 19 passthrough |
| **Indiana** | County LIT by county on January 1 (resident and nonresident rates) | ⚠️ box 19 passthrough |
| **Kentucky** | City/county occupational license taxes (Louisville 2.2%, Lexington 2.25%, …) | ⚠️ box 19 passthrough |
| **Michigan** | 24 cities (Detroit 2.4%/1.2%, Grand Rapids 1.5%/0.75%, …), exemptions, inter-city credit | ⚠️ box 19 passthrough |
| **Missouri** | Kansas City and St. Louis 1% earnings tax | ⚠️ box 19 passthrough |
| **Delaware** | Wilmington 1.25% | ⚠️ box 19 passthrough |
| **Alabama** | Municipal occupational taxes (Birmingham, Bessemer, Gadsden, …) | ⚠️ box 19 passthrough |
| **Oregon** | Portland Metro SHS 1%, Multnomah PFA 1.5%/3%, TriMet / Lane Transit self-employment taxes | ⚠️ box 19 passthrough |
| **Colorado** | Occupational privilege taxes (Denver, Aurora, Glendale, Greenwood Village, Sheridan) | ❌ |
| **West Virginia** | City service fees | ❌ |
| **New Jersey** | Newark payroll tax (employer), NJ-2450 excess SDI/FLI | ❌ |

Requirement for all localities: a locality picker (residence and work locality per W-2) with rate tables by year. Box 19 alone cannot determine liability: withholding may be zero or wrong, and residents can owe tax on non-wage income.

---

## 5. Implementation order (state & local)

1. **Fix the template defaults:** the correct starting point per state, refundable credit slot, payments slot. These change refunds for most users.
2. Year-keyed rate tables (2024, 2025, 2026) with correct HOH and MFJ brackets for every state.
3. Cross-state rules: Treasury interest subtraction, out-of-state muni addition, Social Security and retirement exclusions, unemployment exemptions.
4. Part-year residency and nonresident ratio methods.
5. Largest refundable credits by population: CA (CalEITC, YCTC, renter's), NY (Empire State Child Credit, EITC, NYC credits), IL, NJ, MN, CO, MA.
6. Local taxes with locality pickers: MD counties, NYC credits, PA Act 32/Philadelphia, OH municipalities, IN counties, MI cities.
7. State AMT, use tax, estimated payments and penalties, PFML/SDI.
