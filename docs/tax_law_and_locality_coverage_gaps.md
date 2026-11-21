# Tax Law & Locality Coverage Gaps — Exhaustive Line-Item Reference

> **Status tracking has moved:** see [federal_tax_logic.md](./federal_tax_logic.md) and [state_local_tax_logic.md](./state_local_tax_logic.md) for the complete requirements list with implementation status. This document remains the detailed per-state reference.

This document provides an exhaustive, line-by-line inventory of every tax law approximation, unmodeled local/municipal tax, part-year residency rule, state-by-state itemized/SALT divergence, niche state credit/carryover, and Federal unenforced limit in [`src/tax-engine.ts`](../src/tax-engine.ts).

---

## 1. Official Government Tax Authority Sources (Federal & All 50 States + DC)

### Federal
- **Internal Revenue Service (IRS):** `https://www.irs.gov`
- **IRS Forms, Instructions & Publications (1040, Schedules 1–3, A, B, C, D, E, F, H, R, SE, 8812, 8863, 8880, 8889, 8959, 8960, 8962, 6251):** `https://www.irs.gov/forms-instructions`
- **IRS Internal Revenue Bulletin / Revenue Procedures (Annual Inflation Adjustments):** `https://www.irs.gov/irb`
- **U.S. Department of Labor (FUTA Credit Reduction States):** `https://www.dol.gov/agencies/eta/unemployment-insurance-taxes/futa-credit-reductions`

### States & District of Columbia
| Code | Jurisdiction | Official Revenue Authority URL |
| :--- | :--- | :--- |
| **AL** | Alabama | `https://www.revenue.alabama.gov` |
| **AK** | Alaska | `https://tax.alaska.gov` |
| **AZ** | Arizona | `https://azdor.gov` |
| **AR** | Arkansas | `https://www.dfa.arkansas.gov` |
| **CA** | California | `https://www.ftb.ca.gov` |
| **CO** | Colorado | `https://tax.colorado.gov` |
| **CT** | Connecticut | `https://portal.ct.gov/drs` |
| **DE** | Delaware | `https://revenue.delaware.gov` |
| **DC** | District of Columbia | `https://otr.cfo.dc.gov` |
| **FL** | Florida | `https://floridarevenue.com` |
| **GA** | Georgia | `https://dor.georgia.gov` |
| **HI** | Hawaii | `https://tax.hawaii.gov` |
| **ID** | Idaho | `https://tax.idaho.gov` |
| **IL** | Illinois | `https://tax.illinois.gov` |
| **IN** | Indiana | `https://www.in.gov/dor` |
| **IA** | Iowa | `https://revenue.iowa.gov` |
| **KS** | Kansas | `https://www.ksrevenue.gov` |
| **KY** | Kentucky | `https://revenue.ky.gov` |
| **LA** | Louisiana | `https://revenue.louisiana.gov` |
| **ME** | Maine | `https://www.maine.gov/revenue` |
| **MD** | Maryland | `https://www.marylandtaxes.gov` |
| **MA** | Massachusetts | `https://www.mass.gov/orgs/massachusetts-department-of-revenue` |
| **MI** | Michigan | `https://www.michigan.gov/taxes` |
| **MN** | Minnesota | `https://www.revenue.state.mn.us` |
| **MS** | Mississippi | `https://www.dor.ms.gov` |
| **MO** | Missouri | `https://dor.mo.gov` |
| **MT** | Montana | `https://mtrevenue.gov` |
| **NE** | Nebraska | `https://revenue.nebraska.gov` |
| **NV** | Nevada | `https://tax.nv.gov` |
| **NH** | New Hampshire | `https://www.revenue.nh.gov` |
| **NJ** | New Jersey | `https://www.nj.gov/treasury/taxation` |
| **NM** | New Mexico | `https://www.tax.newmexico.gov` |
| **NY** | New York | `https://www.tax.ny.gov` |
| **NC** | North Carolina | `https://www.ncdor.gov` |
| **ND** | North Dakota | `https://www.tax.nd.gov` |
| **OH** | Ohio | `https://tax.ohio.gov` |
| **OK** | Oklahoma | `https://oklahoma.gov/tax.html` |
| **OR** | Oregon | `https://www.oregon.gov/dor` |
| **PA** | Pennsylvania | `https://www.revenue.pa.gov` |
| **RI** | Rhode Island | `https://tax.ri.gov` |
| **SC** | South Carolina | `https://dor.sc.gov` |
| **SD** | South Dakota | `https://dor.sd.gov` |
| **TN** | Tennessee | `https://www.tn.gov/revenue` |
| **TX** | Texas | `https://comptroller.texas.gov` |
| **UT** | Utah | `https://tax.utah.gov` |
| **VT** | Vermont | `https://tax.vermont.gov` |
| **VA** | Virginia | `https://www.tax.virginia.gov` |
| **WA** | Washington | `https://dor.wa.gov` |
| **WV** | West Virginia | `https://tax.wv.gov` |
| **WI** | Wisconsin | `https://www.revenue.wi.gov` |
| **WY** | Wyoming | `https://revenue.wyo.gov` |

### Key Multi-Municipality / Local Tax Authorities
- **PA Act 32 Local Earned Income Tax (DCED):** `https://dced.pa.gov/local-government/local-income-tax-information`
- **Philadelphia Department of Revenue:** `https://www.phila.gov/departments/department-of-revenue`
- **Ohio Regional Income Tax Agency (RITA):** `https://www.ritaohio.com`
- **Ohio Central Collection Agency (CCA):** `https://www.ccatax.ci.cleveland.oh.us`
- **NYC Department of Finance:** `https://www.nyc.gov/site/finance`
- **City of Detroit Income Tax:** `https://detroitmi.gov/departments/office-chief-financial-officer/office-treasury/income-tax`
- **Portland / Multnomah County / Metro Revenue:** `https://www.portland.gov/revenue`
- **Denver Occupational Privilege Tax (OPT):** `https://www.denvergov.org/Government/Agencies-Departments-Offices/Agencies-Departments-Offices-Directory/Department-of-Finance/Treasury-Division`
- **Charleston WV City Service Fee:** `https://www.charlestonwv.gov/government/city-departments/city-collectors-office`

---

## 2. Local & Municipal Income / Payroll Taxes (Individual Line Items)

In [`src/tax-engine.ts`](file:///c:/Users/olive/Documents/Code/actually_free_taxes_com/src/tax-engine.ts#L2725-L2746), only NYC resident brackets and Yonkers resident surcharge are calculated from statutory formulas. All other localities either use a flat approximation or pass through `W-2 Box 19` (`localTaxLiability = resRaw.localWithheld`), yielding `$0` local refund/owed.

- **NY — Yonkers Nonresident Earnings Tax (0.5%):** Currently only Yonkers *resident* surcharge (16.75% of NY tax) is modeled; nonresidents working in Yonkers owe 0.5% on Yonkers wages/net SE earnings (`https://www.tax.ny.gov`, Form IT-203 / Y-203).
- **NY — NYC School Tax Credit (Fixed & Rate Reduction):** NYC residents with AGI ≤ $250,000 qualify for the NYC School Tax Credit ($63 single / $125 MFJ) and rate reduction credit, not yet deducted from NYC tax (`https://www.nyc.gov/site/finance`, Form IT-201).
- **NY — Metropolitan Commuter Transportation Mobility Tax (MCTMT):** Self-employed individuals in the MCTD (NYC + 7 counties) with net SE earnings > $50,000 owe 0.34%–0.60% MCTMT (`https://www.tax.ny.gov`, Form MTA-6).
- **MD — County Piggyback Tax (All 23 Counties + Baltimore City):** Engine applies a flat **3.20%** when `localWithheld > 0 || localWages > 0`. Does not support county selection or actual county rates ranging from **2.25% to 3.20%** (e.g., Worcester 2.25%, Talbot 2.40%, Anne Arundel 2.70%–2.94%, Montgomery/PG/Baltimore City/Howard 3.20%), nor does it assess county tax when Box 19 is $0 (`https://www.marylandtaxes.gov`, Form 502).
- **PA — Philadelphia Wage & Earnings Tax (Resident 3.75% / Nonresident 3.44%):** Currently passes through Box 19; does not compute liability on wages, Net Profits Tax (NPT) on Schedule C/1099-NEC, or School Income Tax (3.75% on unearned income for Philly residents) (`https://www.phila.gov/departments/department-of-revenue`).
- **PA — Act 32 Local Earned Income Tax (EIT, 2,500+ Municipalities & School Districts):** Currently passes through Box 19; does not look up PSD code resident vs. workplace rates (typically 1.0%–3.0%), apply resident credit for workplace EIT paid, or tax Schedule C/F net profit (`https://dced.pa.gov/local-government/local-income-tax-information`).
- **PA — Local Services Tax (LST, up to $52/year):** Flat municipal occupational tax ($10–$52/yr) withheld per paycheck for work in PA municipalities with >$12,000 exemption threshold (`https://dced.pa.gov/local-government/local-income-tax-information`).
- **OH — Municipal Income Tax (RITA, CCA, & Independent Cities — 600+ Municipalities, 0.5%–3.0%):** Currently passes through Box 19; does not compute municipal tax by city of residence/work, resident workplace tax credits (full/partial/capped), or municipal tax on Schedule C/E/1099-NEC (`https://tax.ohio.gov`, `https://www.ritaohio.com`, `https://www.ccatax.ci.cleveland.oh.us`).
- **OH — School District Income Tax (SDIT, Traditional vs. Earned Income Base):** Over 200 Ohio school districts levy 0.25%–2.0% SDIT (Form SD 100); not modeled (`https://tax.ohio.gov`).
- **IN — County Local Income Tax (LIT — All 92 Indiana Counties, ~0.5%–2.95%):** Currently passes through Box 19; does not compute county LIT on IT-40 Schedule CT-40 by county of residence/work on Jan 1 (`https://www.in.gov/dor`).
- **KY — County & City Occupational License / School Taxes (Louisville/Jefferson 2.20%, Lexington/Fayette 2.25%, Covington, Northern KY, etc.):** Currently passes through Box 19; does not compute local occupational tax or Net Profits return on Schedule C/E (`https://revenue.ky.gov`).
- **MI — City Income Taxes (24 Michigan Cities: Detroit 2.40%/1.20%, Grand Rapids 1.50%/0.75%, Lansing, Flint, Saginaw, etc.):** Currently passes through Box 19; does not compute city resident vs. nonresident rates, $600 city exemptions, or credit for tax paid to another MI city (`https://www.michigan.gov/taxes`, `https://detroitmi.gov/departments/office-chief-financial-officer/office-treasury/income-tax`).
- **MO — Kansas City & St. Louis Earnings Taxes (1.0% Resident & Nonresident):** Currently passes through Box 19; does not compute KC Form RD-109 or St. Louis Form E-1 on wages and Schedule C (`https://dor.mo.gov`, `https://www.kcmo.gov`, `https://www.stlouis-mo.gov`).
- **DE — Wilmington City Wage Tax (1.25%):** Currently passes through Box 19; does not compute 1.25% tax on wages earned in Wilmington or by Wilmington residents (`https://revenue.delaware.gov`, `https://www.wilmingtonde.gov`).
- **AL — Municipal Occupational Taxes (Birmingham 1.0%, Bessemer 1.0%, Gadsden 2.0%, Macon County, etc.):** Currently passes through Box 19; does not compute city occupational tax on gross compensation (`https://www.revenue.alabama.gov`).
- **OR — Portland Metro Supportive Housing Services (SHS) Tax (1.0% over $125k / $200k MFJ):** Not modeled (`https://www.portland.gov/revenue`).
- **OR — Multnomah County Preschool for All (PFA) Tax (1.5% over $125k/$200k, 3.0% over $250k/$400k):** Not modeled (`https://www.portland.gov/revenue`).
- **OR — TriMet & Lane Transit District (LTD) Self-Employment Taxes:** 0.8137% (TriMet) / 0.79% (LTD) on net SE earnings in district; not modeled (`https://www.oregon.gov/dor`).
- **CO — Municipal Occupational Privilege Taxes (OPT / "Head Tax"):** Flat monthly per-employee/employer payroll taxes not modeled: **Denver** ($5.75/mo employee + $4.00/mo employer over $500/mo), **Aurora** ($2/mo + $2/mo over $250/mo), **Glendale** ($5/mo + $5/mo), **Greenwood Village** ($2/mo + $2/mo), **Sheridan** ($3/mo + $3/mo) (`https://tax.colorado.gov`, `https://www.denvergov.org`).
- **WV — Municipal City Service Fees (CSFs):** Flat weekly user fees withheld from paychecks not modeled: **Charleston** ($3/week), **Huntington** ($5/week), **Wheeling** ($2/week), **Morgantown** ($3/week), **Fairmont** ($2/week), **Parkersburg**, **Weirton** (`https://tax.wv.gov`, `https://www.charlestonwv.gov`).
- **NJ — Newark Payroll Tax (1.0% employer) & Statewide SUI/SDI/FLI Overpayment Credit:** NJ-2450 excess SDI/FLI/SUI credit for multiple employers is not modeled (`https://www.nj.gov/treasury/taxation`).
- **CA / NY / NJ / RI / HI / WA / MA / CT / CO / OR / MD — State Paid Family & Medical Leave / SDI Payroll Deductions:** Employee-side SDI/PFML payroll withholdings and multi-employer excess-withholding refund credits are not modeled:
  - **CA — State Disability Insurance (SDI / PFL):** **1.1% (2024) / 1.2% (2025) on uncapped wages** (wage cap repealed Jan 1, 2024); also deductible as SALT if itemizing on Federal Schedule A (`https://www.ftb.ca.gov`, `https://edd.ca.gov`).
  - **NY — Paid Family Leave (PFL) & Disability Benefits (DBL):** Employee PFL contribution of **0.373% (2024) / 0.388% (2025)** up to the statewide average weekly wage cap ($1,718.15/wk in 2024; max $333.25/yr) plus statutory DBL (0.5% up to $0.60/wk); excess multi-employer PFL withholdings are not reconciled (`https://www.tax.ny.gov`, `https://paidfamilyleave.ny.gov`).
  - **NJ — SDI, FLI & SUI Payroll Deductions & Form NJ-2450 Credit:** Employee-side **SUI (0.425% up to $42,300)**, **FLI (0.09% up to $161,400)**, and **SDI (0% in 2024 / 0.23% in 2025 up to $165,400)**; multi-employer excess credit on Form NJ-2450 is not calculated (`https://www.nj.gov/treasury/taxation`).
  - **RI — Temporary Disability Insurance (TDI):** Employee-side **1.2% (2024) / 1.3% (2025)** up to the taxable wage base ($87,000 in 2024); excess multi-employer TDI refund claim is not modeled (`https://tax.ri.gov`, `https://dlt.ri.gov`).
  - **HI — Temporary Disability Insurance (TDI):** Employee contribution up to **0.5% of weekly wages** capped at a statutory weekly maximum (~$6.87/wk in 2024); not tracked (`https://tax.hawaii.gov`, `https://labor.hawaii.gov`).
  - **WA — WA Paid Family & Medical Leave (PFML) & WA Cares Fund (LTC):** Employee-side **PFML (~0.528% up to SS wage cap)** plus **WA Cares long-term care payroll tax (0.58% on uncapped wages)**; excess multi-employer withholding refunds are not modeled (`https://dor.wa.gov`, `https://paidleave.wa.gov`, `https://wacaresfund.wa.gov`).
  - **MA — Paid Family & Medical Leave (PFML):** Employee-side **0.46% (2024)** up to the Social Security wage cap (for employers with 25+ workers, or 0.28% under 25); excess multi-employer PFML credit is not modeled (`https://www.mass.gov/orgs/massachusetts-department-of-revenue`).
  - **CT — Paid Family & Medical Leave (CT Paid Leave):** Employee-side **0.50%** up to the Social Security wage cap ($168,600 in 2024 / $176,100 in 2025); multi-employer excess deduction refund is not modeled (`https://portal.ct.gov/drs`, `https://ctpaidleave.org`).
  - **CO — Family & Medical Leave Insurance (FAMLI):** Employee-side **0.45%** up to the Social Security wage cap; excess multi-employer FAMLI refund claim is not modeled (`https://tax.colorado.gov`, `https://famli.colorado.gov`).
  - **OR — Paid Leave Oregon (PLO):** Employee-side **0.60% (60% of 1.0% total rate)** up to the Social Security wage cap; excess multi-employer PLO credit on Form OR-40 is not modeled (`https://www.oregon.gov/dor`, `https://paidleave.oregon.gov`).
  - **MD — Family & Medical Leave Insurance (FAMLI):** Enacted payroll contribution (0.45% employee share, collection deferred to 2025/2026); not yet modeled in MD payroll/deduction logic (`https://www.marylandtaxes.gov`, `https://paidleave.maryland.gov`).

---

## 3. Part-Year Residency & Nonresident Allocation Rules

### Core Engine Gap
- [`src/tax-engine.ts`](file:///c:/Users/olive/Documents/Code/actually_free_taxes_com/src/tax-engine.ts#L2140-L2767) assumes **one full-year `residentState`** plus nonresident W-2 states. It lacks:
  - Move-in / move-out date inputs per state.
  - Allocation of unearned income (interest, dividends, capital gains, 1099-R, alimony) by residency period.
  - Dual-resident / multiple part-year resident return generation.

### State-Specific Part-Year & Nonresident Rules (Each State with Income Tax)
- **AL (Form 40NR):** Prorates personal exemption and standard deduction by AL AGI / Federal AGI ratio (`https://www.revenue.alabama.gov`).
- **AZ (Form 140PY / 140NR):** Prorates standard deduction and dependent credits by AZ gross income / Federal gross income ratio (`https://azdor.gov`).
- **AR (Form AR1000NR):** Computes tax on *total* income first, then multiplies tax by AR AGI / Total AGI (`https://www.dfa.arkansas.gov`).
- **CA (Form 540NR):** Computes CA tax rate on **worldwide AGI** (progressive bracket rate) and multiplies by CA-source AGI / Total AGI; prorates exemption credits (`https://www.ftb.ca.gov`).
- **CO (Form DR 0104PN):** Computes full-year CO tax on federal taxable income, then apportions tax by CO-source income / Modified Federal AGI (`https://tax.colorado.gov`).
- **CT (Form CT-1040NR/PY):** Computes tax on total CT AGI (including phaseout/recapture) and multiplies by CT-source income / Total AGI (`https://portal.ct.gov/drs`).
- **DE (Form 200-02 NR):** Prorates personal credits by DE-source income ratio; nonresidents cannot claim standard deduction in full without proration (`https://revenue.delaware.gov`).
- **DC (Form D-40 Part-Year):** Prorates standard/itemized deductions by months of DC residency (`https://otr.cfo.dc.gov`).
- **GA (Form 500 Schedule 3):** Prorates standard deduction and personal exemptions by GA-source AGI / Total AGI (`https://dor.georgia.gov`).
- **HI (Form N-15):** Prorates standard deduction and personal exemptions by HI AGI / Total AGI; taxes nonresidents only on HI-source income (`https://tax.hawaii.gov`).
- **ID (Form 43):** Prorates standard deduction and grocery/child credits by ID-source income / Total income (`https://tax.idaho.gov`).
- **IL (Schedule NR):** Prorates the $2,775 personal exemption by IL base income / Total base income (`https://tax.illinois.gov`).
- **IN (Form IT-40PNR):** Prorates $1,000/$1,500 personal & dependent exemptions by IN-source income / Total income (`https://www.in.gov/dor`).
- **IA (Form IA 126):** Computes tax on all-source income, then applies IA-source credit (`1 - IA/Total`) (`https://revenue.iowa.gov`).
- **KS (Schedule S Part B):** Computes tax on total income, then multiplies by KS-source AGI / Total AGI (`https://www.ksrevenue.gov`).
- **KY (Form 740-NP):** Prorates standard deduction and Family Size Tax Credit by KY AGI / Federal AGI (`https://revenue.ky.gov`).
- **LA (Form IT-540B):** Prorates standard deduction / personal exemptions by LA AGI / Federal AGI (`https://revenue.louisiana.gov`).
- **ME (Schedule NR / NRH):** Computes tax on all-source income and applies nonresident credit for non-ME-source percentage (`https://www.maine.gov/revenue`).
- **MD (Form 505 / 502 Part-Year):** Prorates personal exemptions and standard deduction by MD AGI / Federal AGI (`https://www.marylandtaxes.gov`).
- **MA (Form 1-NR/PY):** Prorates personal exemptions ($4,400/$8,800) by days of MA residency or MA-source income ratio (`https://www.mass.gov/orgs/massachusetts-department-of-revenue`).
- **MI (Schedule NR):** Prorates $5,600 personal exemption by MI-source income / Total income (`https://www.michigan.gov/taxes`).
- **MN (Schedule M1NR):** Computes tax on all-source taxable income, then multiplies by MN-source income / Federal AGI (`https://www.revenue.state.mn.us`).
- **MS (Form 80-205):** Prorates standard deduction and personal exemptions by MS-source income / Total income (`https://www.dor.ms.gov`).
- **MO (Form MO-NRI):** Computes tax on total income, then multiplies by MO-source income / Total AGI (`https://dor.mo.gov`).
- **MT (Form 2 Nonresident/Part-Year):** Computes tax on total income and applies MT-source ratio (`https://mtrevenue.gov`).
- **NE (Schedule III):** Computes tax on total income, then multiplies by NE-source AGI / Federal AGI (`https://revenue.nebraska.gov`).
- **NJ (Form NJ-1040NR / Part-Year NJ-1040):** Prorates personal exemptions by months of NJ residency or NJ-source / Worldwide income ratio (`https://www.nj.gov/treasury/taxation`).
- **NM (Schedule PIT-B):** Computes tax on total income, then multiplies by NM-source income / Total income (`https://www.tax.newmexico.gov`).
- **NY (Form IT-203):** Computes base tax on **total Federal AGI** (all sources), then multiplies by NY-source AGI / Federal AGI; includes NY convenience-of-the-employer rule (`https://www.tax.ny.gov`).
- **NC (Form D-400 Schedule PN):** Computes tax on total NC taxable income, then multiplies by NC-source income / Total income (`https://www.ncdor.gov`).
- **ND (Schedule ND-1NR):** Computes tax on all-source taxable income, then multiplies by ND-source income / Total income (`https://www.tax.nd.gov`).
- **OH (Form IT 1040 Schedule IT NRC):** Computes tax on all-source income and grants nonresident credit on non-OH-source income (`https://tax.ohio.gov`).
- **OK (Form 511-NR):** Prorates standard/itemized deduction by OK-source AGI / Federal AGI (`https://oklahoma.gov/tax.html`).
- **OR (Form OR-40-N / OR-40-P):** Prorates standard/itemized deductions and exemption credits by OR-source / Federal AGI (`https://www.oregon.gov/dor`).
- **PA (Form PA-40 Part-Year):** Taxes only PA-source income received during nonresident period + all income during resident period; prorates Schedule SP poverty forgiveness (`https://www.revenue.pa.gov`).
- **RI (Form RI-1040NR):** Computes tax on all-source income, then multiplies by RI-source AGI / Federal AGI (`https://tax.ri.gov`).
- **SC (Schedule NR):** Prorates standard/itemized deductions by SC-source income / Total income (`https://dor.sc.gov`).
- **UT (Form TC-40B):** Computes tax on all-source income, then multiplies by UT-source income / Total income (`https://tax.utah.gov`).
- **VT (Schedule IN-113):** Computes tax on all-source income, then multiplies by VT-source income / Total income (`https://tax.vermont.gov`).
- **VA (Form 763 / 760PY):** Prorates standard deduction and personal exemptions by VA-source / Federal AGI (or days of residency) (`https://www.tax.virginia.gov`).
- **WV (Schedule A, Form IT-140):** Computes tax on total income, then multiplies by WV-source income / Federal AGI (`https://tax.wv.gov`).
- **WI (Form 1NPR):** Prorates standard deduction and personal exemptions by WI-source income / Federal AGI (`https://www.revenue.wi.gov`).

---

## 4. State-by-State Itemized Deductions vs. Federal SALT Cap & Standard Deduction (All 50 States + DC)

In [`src/tax-engine.ts`](file:///c:/Users/olive/Documents/Code/actually_free_taxes_com/src/tax-engine.ts#L2584-L2592), only **NY, CA, DC, MD, VA** trigger itemized deduction carryover (with CA uncapping property tax). Below is the status and exact gap for **every state + DC**:

- **AL:** Allows Federal itemized deductions *minus* state income tax, **plus** uncapped property tax and Federal income tax paid; does not apply Federal $10,000 SALT cap (`https://www.revenue.alabama.gov`). *Gap: Engine currently uses AL standard deduction only without AL itemized Schedule A.*
- **AK:** No state personal income tax (`https://tax.alaska.gov`). *No gap.*
- **AZ:** Allows Federal Schedule A itemized deductions **without** the $10,000 SALT cap on property taxes, **plus** charitable deduction adjustment (25%–33% of charitable gifts added even to standard deduction) (`https://azdor.gov`). *Gap: Engine does not carry over AZ itemized deductions or AZ standard-deduction charity boost.*
- **AR:** Allows Federal itemized deductions minus state/local income taxes; property tax uncapped (`https://www.dfa.arkansas.gov`). *Gap: Engine does not model AR Schedule A itemized carryover.*
- **CA:** Modeled (`tax-engine.ts` line 2584) with uncapped real estate tax and state income tax disallowed. *Remaining gap: CA allows mortgage interest up to $1M acquisition debt (vs. Federal $750k TCJA cap) and 50% charity AGI cap (vs. Federal 60%), plus miscellaneous 2%-floor deductions (employee business expenses/tax prep) (`https://www.ftb.ca.gov`).*
- **CO:** Modeled CO SALT add-back (`tax-engine.ts` line 2552) over $5k/$10k for AGI > $400k. *Remaining gap: CO uses Federal Taxable Income directly, but requires add-back of state income tax deducted on Federal Schedule A for all itemizers (`https://tax.colorado.gov`).*
- **CT:** Flat/AGI-based return with **no itemized deductions** (`https://portal.ct.gov/drs`). *Gap: Engine uses standard/exemption model; CT property tax credit ($300 max) is not modeled.*
- **DE:** Allows Federal itemized deductions minus state/local income tax, **with** uncapped property tax (`https://revenue.delaware.gov`). *Gap: Engine does not carry over DE itemized deductions.*
- **DC:** Modeled (`tax-engine.ts` line 2584). *Remaining gap: DC phases out itemized deductions for DC AGI > $200,000 (or > $1M full disallowance of non-charity/medical/investment interest) (`https://otr.cfo.dc.gov`).*
- **FL:** No state personal income tax (`https://floridarevenue.com`). *No gap.*
- **GA:** Uses fixed GA standard deduction ($12k/$24k) or Federal itemized deductions minus state income taxes; allows uncapped property tax (`https://dor.georgia.gov`). *Gap: Engine does not carry over GA itemized deductions.*
- **HI:** Allows HI Schedule A itemized deductions with **no $10,000 SALT cap** (allows state income tax + uncapped property tax), **but** phases out itemized deductions above HI AGI thresholds ($100k/$200k) (`https://tax.hawaii.gov`). *Gap: Engine does not model HI itemized deductions or HI itemized phaseout.*
- **ID:** Conforms to Federal standard or itemized deductions (including $10k SALT cap), minus state/local income tax (`https://tax.idaho.gov`). *Gap: Engine does not carry over ID itemized deductions.*
- **IL:** No standard or itemized deductions (uses personal exemptions + 5% property tax credit, modeled) (`https://tax.illinois.gov`). *No SALT/itemized gap.*
- **IN:** No itemized deductions (uses personal exemptions + renter's deduction up to $3,000 + property tax deduction up to $2,500) (`https://www.in.gov/dor`). *Gap: Renter's deduction and IN residential property tax deduction ($2,500) are not auto-applied.*
- **IA:** Starting 2023+, conforms to Federal standard/itemized deductions with state income tax subtracted (`https://revenue.iowa.gov`). *Gap: Engine does not carry over IA itemized deductions.*
- **KS:** Allows KS itemized deductions (80%–100% of medical, mortgage, charity, property tax—without Federal $10k cap) even if taxpayer took Federal standard deduction (`https://www.ksrevenue.gov`). *Gap: Engine does not model KS independent Schedule A.*
- **KY:** Allows **only** KY-specific itemized deductions (medical, charity, mortgage interest, gambling losses, casualty); disallows **all** state/local and property taxes (`https://revenue.ky.gov`). *Gap: Engine does not model KY Schedule A.*
- **LA:** Allows excess Federal itemized deductions over Federal standard deduction (through 2024; repealed for 2025+ under LA Act 11) (`https://revenue.louisiana.gov`). *Gap: Pre-2025 LA excess itemized deduction not modeled.*
- **ME:** Allows ME itemized deductions capped at ~$34,250/$68,500 (excluding state/local income tax, including property tax up to $10k) (`https://www.maine.gov/revenue`). *Gap: Engine does not model ME Schedule A.*
- **MD:** Modeled (`tax-engine.ts` line 2584). *Remaining gap: MD requires adding back state/local income tax from Schedule A while keeping property tax up to the $10k SALT cap (`https://www.marylandtaxes.gov`).*
- **MA:** Does **not** use Federal itemized deductions; allows specific MA deductions (50% rent up to $4k modeled, commuter deduction, dependent care, college tuition) (`https://www.mass.gov/orgs/massachusetts-department-of-revenue`). *Gap: MA commuter/MBTA deduction ($750) and college tuition deduction not modeled.*
- **MI:** No Federal itemized deductions; uses MI personal exemptions (`https://www.michigan.gov/taxes`). *No itemized gap.*
- **MN:** Has independent **MN Schedule M1SA** with a **$10,000 property tax cap**, disallows state income tax, allows unreimbursed employee business expenses (>2% AGI), and phases out itemized deductions above MN AGI (~$232,500) (`https://www.revenue.state.mn.us`). *Gap: Engine does not model MN Schedule M1SA.*
- **MS:** Allows Federal itemized deductions minus state/local income tax; property tax uncapped (`https://www.dor.ms.gov`). *Gap: Engine does not model MS itemized carryover.*
- **MO:** Allows Federal itemized deductions minus state/local income tax; property tax uncapped (`https://dor.mo.gov`). *Gap: Engine does not model MO itemized carryover.*
- **MT:** Starting 2024, conforms to Federal standard/itemized deductions (Federal Taxable Income base), adding back state income tax if itemized (`https://mtrevenue.gov`). *Gap: MT state income tax add-back on itemizers not modeled.*
- **NE:** Allows NE standard deduction or Federal itemized deductions minus state/local income tax (`https://revenue.nebraska.gov`). *Gap: Engine does not model NE itemized carryover.*
- **NV:** No state personal income tax (`https://tax.nv.gov`). *No gap.*
- **NH:** No wage/earned income tax (I&D tax repealed Jan 1, 2025) (`https://www.revenue.nh.gov`). *No gap.*
- **NJ:** Does **not** use Federal itemized deductions; uses $15k property tax deduction (modeled) + NJ medical expenses (>2% NJ gross income, vs. Federal 7.5%) (`https://www.nj.gov/treasury/taxation`). *Gap: NJ >2% medical expense deduction not modeled.*
- **NM:** Conforms to Federal standard/itemized deductions (`https://www.tax.newmexico.gov`). *Gap: NM itemized carryover not modeled.*
- **NY:** Modeled (`tax-engine.ts` line 2584). *Remaining gap: NY Form IT-196 decouples from TCJA ($10k SALT cap does **not** apply to real estate taxes, 2% misc itemized deductions are allowed, and NY itemized deductions phase out 25%–50% for NY AGI > $100k/$200k/$1M) (`https://www.tax.ny.gov`).*
- **NC:** Allows **only** mortgage interest + property tax (combined **$20,000 cap**), uncapped charitable contributions, and medical expenses (>7.5% AGI); disallows state/local income tax (`https://www.ncdor.gov`). *Gap: Engine does not model NC itemized deductions.*
- **ND:** Conforms to Federal Taxable Income (inherits Federal standard/itemized + SALT cap) (`https://www.tax.nd.gov`). *No extra SALT divergence.*
- **OH:** No itemized deductions (except medical expenses >7.5% AGI and long-term care insurance on Schedule A of IT 1040) (`https://tax.ohio.gov`). *Gap: OH >7.5% medical deduction not modeled.*
- **OK:** Allows Federal itemized deductions, **capping** total non-charitable/non-medical itemized deductions at **$17,000** (`https://oklahoma.gov/tax.html`). *Gap: Engine does not model OK itemized deductions.*
- **OR:** Allows OR Schedule OR-A itemized deductions **without** the Federal $10,000 SALT cap on property tax (disallows OR state income tax) (`https://www.oregon.gov/dor`). *Gap: Engine does not model Schedule OR-A.*
- **PA:** Flat 3.07% tax on gross PA-taxable classes; **no standard or itemized deductions** (`https://www.revenue.pa.gov`). *No itemized gap.*
- **RI:** Uses RI standard deduction or RI itemized deductions? Note: RI **eliminated** itemized deductions starting 2011; uses RI standard deduction only (phased out at high AGI) (`https://tax.ri.gov`). *Gap: High-income RI standard deduction phaseout not modeled.*
- **SC:** Conforms to Federal standard/itemized deductions minus SC state/local income tax (`https://dor.sc.gov`). *Gap: Engine does not model SC itemized carryover.*
- **SD:** No state personal income tax (`https://dor.sd.gov`). *No gap.*
- **TN:** No state personal income tax (`https://www.tn.gov/revenue`). *No gap.*
- **TX:** No state personal income tax (`https://comptroller.texas.gov`). *No gap.*
- **UT:** Uses Federal itemized deductions minus state/local income tax, converted into a **6% nonrefundable taxpayer tax credit** (alongside personal exemptions), phased out at 1.3¢ per dollar over UT threshold (`https://tax.utah.gov`). *Gap: UT 6% itemized/exemption credit & phaseout not modeled.*
- **VT:** Disallows Federal itemized deductions (except charitable contributions: **5% nonrefundable credit** up to $20,000) (`https://tax.vermont.gov`). *Gap: VT 5% charitable credit not modeled.*
- **VA:** Modeled (`tax-engine.ts` line 2584). *Remaining gap: VA allows Federal itemized deductions minus state/local income tax (if electing VA itemized, must match Federal election unless taking VA standard) (`https://www.tax.virginia.gov`).*
- **WA:** No broad personal income tax (7% LTCG excise tax >$270k modeled, with $270k deduction) (`https://dor.wa.gov`). *No itemized gap.*
- **WV:** No standard or itemized deductions (uses $2,000 personal exemptions only) (`https://tax.wv.gov`). *No itemized gap.*
- **WI:** Does **not** use Federal Schedule A directly; calculates an **Itemized Deduction Credit (5%)** on medical, mortgage interest, and charity (no SALT/property tax) (`https://www.revenue.wi.gov`). *Gap: WI 5% Itemized Deduction Credit not modeled.*
- **WY:** No state personal income tax (`https://revenue.wyo.gov`). *No gap.*

---

## 5. Niche State Credits, Subtractions, & Carryovers (Individual Line Items)

- **529 College Savings Plan Deductions / Credits (30+ States):** E.g., **NY** ($5k/$10k deduction, `tax.ny.gov`), **IL** ($10k/$20k deduction, `tax.illinois.gov`), **PA** ($18k/$36k per beneficiary deduction, `revenue.pa.gov`), **IN** (20% credit up to $1,500, `in.gov/dor`), **UT** (4.55% credit, `tax.utah.gov`), **VT** (10% credit up to $250/$500, `tax.vermont.gov`), **MN** (50% credit up to $500 or $1.5k/$3k subtraction, `revenue.state.mn.us`), **VA** ($4k/account deduction, `tax.virginia.gov`), **OH** ($4k/beneficiary deduction with unlimited carryover, `tax.ohio.gov`). *Gap: Not auto-modeled; must be entered manually via generic state panels.*
- **State Alternative Minimum Tax (CA, CO, CT, IA [repealed 2023], MN):**
  - **CA AMT (Form 540 Schedule P, 7.0%):** Applies when CA tentative minimum tax exceeds regular CA tax (`https://www.ftb.ca.gov`).
  - **CT AMT (Form CT-6251, 19% of excess Federal TMT / 5.5% CT AMTI):** (`https://portal.ct.gov/drs`).
  - **MN AMT (Schedule M1MT, 6.75%):** (`https://www.revenue.state.mn.us`).
  - **CO AMT (Form DR 0104AMT, 3.47%):** (`https://tax.colorado.gov`).
- **State Property Tax Circuit Breakers / Renter Credits:**
  - **NJ ANCHOR / Senior Freeze** (`nj.gov/treasury/taxation`).
  - **NY Real Property Tax Credit (IT-214)** (`tax.ny.gov`).
  - **MN Homestead Credit Refund (M1PR)** (`revenue.state.mn.us`).
  - **WI Homestead Credit (Schedule H)** (`revenue.wi.gov`).
  - **MA Senior Circuit Breaker Credit** (`mass.gov`).
  - **CA Renter's Credit ($60/$120)** (`ftb.ca.gov`).
  - **MI Homestead Property Tax Credit (MI-1040CR)** (`michigan.gov/taxes`).
  - **VT Property Tax Credit (HS-122)** (`tax.vermont.gov`).
- **State Child & Dependent Care Credits (Separate from Federal):**
  - **NY** (20%–110% of Federal Form 2441, `tax.ny.gov`), **CA** (up to 50% of Federal, `ftb.ca.gov`), **CO** (50% of Federal, `tax.colorado.gov`), **MD** (up to 32.5%, `marylandtaxes.gov`), **MN** (sliding scale, `revenue.state.mn.us`), **NC/SC/VT/RI/OR/ME**. *Gap: Not auto-calculated from Federal `childCareExpenses`.*
- **State Child Tax Credits (Separate from Federal CTC):**
  - **CA Young Child Tax Credit ($1,154)** (`ftb.ca.gov`), **NY Empire State Child Credit ($330–$1,000)** (`tax.ny.gov`), **MN Child Tax Credit ($1,750/child)** (`revenue.state.mn.us`), **CO Child Tax Credit & Family Affordability Credit** (`tax.colorado.gov`), **NJ Child Tax Credit (up to $1,000)** (`nj.gov/treasury/taxation`), **MA Child & Family Credit ($440/dependent)** (`mass.gov`), **VT ($1,000)** (`tax.vermont.gov`), **NM ($25–$600)** (`tax.newmexico.gov`), **OR Kids Credit ($1,000)** (`oregon.gov/dor`), **UT ($1,000)** (`tax.utah.gov`). *Gap: Only AZ ($100/$25) and NC ($3,000 deduction) are currently auto-applied.*
- **State Solar / EV / Clean Energy & Historic Preservation Credits:**
  - **AZ** Solar Credit (25% up to $1,000, `azdor.gov`), **NY** Solar Equipment Credit (25% up to $5,000, `tax.ny.gov`), **CO** Innovative Motor Vehicle Credit ($5,000 EV, `tax.colorado.gov`), **SC** Solar Credit (25% with 10-year carryover, `dor.sc.gov`), **MA** Title 5 Septic & Lead Paint Credits (`mass.gov`).
- **State Capital Loss & Credit Carryovers:** Multi-year carryforwards (e.g., CA/NY/SC unused capital loss carryforwards differing from Federal, prior-year unused OSTC/historic/solar credit carryovers) are not tracked across tax years (`https://www.ftb.ca.gov`, `https://www.tax.ny.gov`).
- **State Retirement / Pension / Social Security Exclusions:** State-specific Social Security phaseouts and 1099-R pension/IRA/401(k) exclusions are not yet differentiated from W-2 wages in `src/tax-engine.ts`:
  - **CO — Social Security & Pension Subtraction:** Full subtraction of federally taxed Social Security for taxpayers **age 65+** (and up to $20,000 for ages 55–64, or $24,000 age 65+ for non-SS pension/IRA income; expanded in 2025 for ages 55–64 with AGI ≤ $75k/$95k) (`https://tax.colorado.gov`).
  - **CT — Social Security & Pension/Annuity Exemption:** Full exemption of federally taxed Social Security when CT AGI is **< $75,000 (Single) / < $100,000 (MFJ)** (25% max taxable above threshold); separate phaseout for pension/annuity and IRA distributions (phasing out 2024–2026) (`https://portal.ct.gov/drs`).
  - **KS — Social Security Exemption:** Full exemption of Social Security benefits when Federal AGI is **≤ $75,000** (for 2024+ legislation expanded SS exemption to all AGIs starting tax year 2024; previously a cliff at $75,000) (`https://www.ksrevenue.gov`).
  - **MN — Social Security Subtraction:** Full subtraction of federally taxable Social Security up to MN AGI thresholds (**$82,190 Single / $105,380 MFJ** in 2024), phased out by 10% per $4,000 above threshold (simplified vs. alternative calculation) (`https://www.revenue.state.mn.us`).
  - **MT — Social Security Taxation:** Follows Montana-specific Social Security worksheet (separate from Federal starting in prior years; starting 2024, MT conforms to Federal Taxable Income so Federal SS inclusion applies without a separate MT subtraction) (`https://mtrevenue.gov`).
  - **NM — Social Security Exemption:** Full exemption of federally taxable Social Security for NM income **≤ $100,000 (Single) / ≤ $150,000 (MFJ)** (`https://www.tax.newmexico.gov`).
  - **RI — Social Security & Pension Subtraction:** Exempts Social Security at Full Retirement Age when Federal AGI is below **~$104,200 (Single) / ~$130,250 (MFJ)**, plus up to **$20,000** of qualifying pension/annuity income (`https://tax.ri.gov`).
  - **UT — Social Security Tax Credit:** Grants a **nonrefundable credit** equal to 4.55% of federally taxable Social Security benefits, phased out at 2.5¢ per dollar over **$45,000 (Single) / $75,000 (MFJ)** MAGI (`https://tax.utah.gov`).
  - **VT — Social Security Exemption:** Full exemption of Social Security for VT AGI **≤ $50,000 (Single) / ≤ $65,000 (MFJ)**, phasing out completely by $60,000 / $75,000 (`https://tax.vermont.gov`).
  - **WV — Social Security Phaseout:** Phased-in full exemption of federally taxable Social Security (for 2024: **35% exempt** over $50k/$100k; 65% in 2025; 100% in 2026; 100% exempt if Federal AGI ≤ $50,000 Single / $100,000 MFJ) (`https://tax.wv.gov`).
  - **PA — Retirement Income Exemption:** **100% exempt** on qualifying employer-sponsored pension, 401(k), and IRA distributions received after retirement age/separation; early distributions taxed only to the extent exceeding previously taxed contributions (`https://www.revenue.pa.gov`).
  - **IL — Retirement Income Subtraction:** **100% exempt** on federally taxed pensions, 401(k), traditional IRA distributions, and Social Security (Form IL-1040 Line 5) (`https://tax.illinois.gov`).
  - **MS — Retirement Income Exemption:** **100% exempt** on qualified pension, 401(k), IRA, and Social Security income (early distributions generally remain taxable) (`https://www.dor.ms.gov`).
  - **HI — Employer-Funded Pension Exemption:** Exempts employer-funded qualifying defined-benefit pensions (employee-contributed 401(k)/IRA portions remain taxable) (`https://tax.hawaii.gov`).
  - **NY — Pension & Annuity Exclusion ($20,000):** Exempts up to **$20,000 per person** ($40,000 MFJ if both have qualifying income) of private pensions, IRAs, and 401(k)s for taxpayers **age 59½+**, and 100% of NY/federal government pensions (`https://www.tax.ny.gov`).
  - **NJ — Pension & Retirement Exclusion ($100,000):** Exempts up to **$100,000 (MFJ) / $75,000 (Single)** of pension/401(k)/IRA income for taxpayers **age 62+ or disabled** with NJ gross income ≤ $100,000 (partially phased out up to $150,000) (`https://www.nj.gov/treasury/taxation`).
  - **GA — Retirement Income Exclusion ($35,000 / $65,000):** Exempts up to **$35,000 (ages 62–64)** or **$65,000 (age 65+)** per person of retirement and unearned income (plus up to $4k/$5k earned income) (`https://dor.georgia.gov`).
  - **MI — Retirement & Pension Subtraction (Tiered / 2023–2026 Phase-In):** Phased-in repeal of Michigan's birth-year retirement tax tiers (2024: 50% of max subtraction, rising to 75% in 2025 and 100% in 2026, up to ~$64k/$128k) (`https://www.michigan.gov/taxes`).
  - **NC — Bailey Settlement & Uniformed Services Retirement Exemption:** **100% exempt** for qualifying NC/federal government retirees vested by Aug 12, 1989 (Bailey) and qualifying military retirees (`https://www.ncdor.gov`).

---

## 6. Federal Tax Law Approximations & Unenforced Limits (Individual Line Items)

- **Form 8962 — ACA Premium Tax Credit (PTC) Reconciliation:** `dependents.premiumTaxCredit` accepts a direct net credit amount; does **not** reconcile Form 1095-A Second Lowest Cost Silver Plan (SLCSP) premiums, Advance PTC (APTC) received, household FPL % brackets, or excess APTC repayment caps (`https://www.irs.gov/forms-pubs/about-form-8962`).
- **Form 6251 — Alternative Minimum Tax (AMT) Preference Items:** Computes basic AMTI (`AGI − AMT-allowed deductions`) and statutory exemption/26%–28% rates, but does **not** model Incentive Stock Option (ISO) bargain-element spread (Form 3921), private-activity municipal bond interest, AMT depreciation (MACRS vs. ADS), or AMT Foreign Tax Credit limits (`https://www.irs.gov/forms-pubs/about-form-6251`).
- **Form 8889 — HSA Contribution Limits & Excess Penalty:** Does **not** enforce annual contribution caps ($4,150 self-only / $8,300 family for 2024; $4,300 / $8,550 for 2025; +$1,000 age 55+ catch-up) or apply the 6% Form 5329 excess-contribution penalty (`https://www.irs.gov/forms-pubs/about-form-8889`).
- **Schedule 1 Line 20 — Traditional IRA Caps & MAGI Phaseouts:** Does **not** enforce the $7,000 ($8,000 age 50+) annual cap, earned-income floor, or workplace-retirement-plan MAGI deductibility phaseouts (`https://www.irs.gov/retirement-plans/ira-deduction-limits`).
- **Schedule 1 Line 21 — Student Loan Interest MAGI Phaseout:** Enforces the $2,500 cap; verify/enforce MAGI phaseout ($80k–$95k single / $165k–$195k MFJ for 2024) (`https://www.irs.gov/taxtopics/tc456`).
- **Form 8995 / 8995-A — QBI Deduction (Sec. 199A) Limitations:** Applies 20% on net Schedule C/K-1 QBI, but does **not** enforce Specified Service Trade or Business (SSTB) phaseouts or W-2 wage / 2.5% UBIA property limits above the taxable income threshold ($191,950 / $383,900 for 2024) (`https://www.irs.gov/forms-pubs/about-form-8995`).
- **Schedule D / Form 8949 — Capital Loss Carryforward, Wash Sales & Sec. 1202/1256:** No separate input for prior-year Short-Term / Long-Term capital loss carryforward, wash-sale disallowed losses, Sec. 1202 QSBS exclusion, or Sec. 1256 60/40 mark-to-market contracts (`https://www.irs.gov/forms-pubs/about-schedule-d-form-1040`).
- **Schedule H — Household Employment Taxes:** Accepts direct `householdEmploymentTax` dollar amount rather than computing SS/Medicare (15.3% over $2,700 cash wage threshold), FUTA (0.6% on first $7,000), and DOL FUTA credit-reduction states (`https://www.irs.gov/forms-pubs/about-schedule-h-form-1040`, `https://www.dol.gov/agencies/eta/unemployment-insurance-taxes/futa-credit-reductions`).
- **Form 8959 / 8960 — RRTA & Passive K-1 NII Classification:** Does not model Railroad Retirement (Tier 1/Tier 2) or separate active vs. passive Schedule K-1 income for Net Investment Income Tax (`https://www.irs.gov/forms-pubs/about-form-8960`).
- **Form 1116 — Foreign Tax Credit Limitation:** Applies `foreignTaxCredit` directly without computing the Form 1116 foreign-source income ratio cap (`Total Tax × Foreign Taxable Income / Worldwide Taxable Income`) (`https://www.irs.gov/forms-pubs/about-form-1116`).
- **Form 8863 — Education Credits (AOTC / LLC) MAGI Phaseouts & 4-Year Limit:** Check/enforce exact $80k–$90k ($160k–$180k MFJ) MAGI phaseout on both AOTC and LLC (`https://www.irs.gov/forms-pubs/about-form-8863`).
- **Schedule A Line 15 — Casualty Loss $100 / 10% AGI Floor:** `casualtyLoss` is currently added directly without subtracting the $100 per-casualty and 10% AGI floor (Form 4684) (`https://www.irs.gov/forms-pubs/about-form-4684`).
- **Schedule 1 Line 14 — Military Moving Expenses & Educator Expense Caps:** `educatorExpenses` ($300/$600 cap) and `militaryMoving` (Form 3903 PCS validation) rely on user accuracy (`https://www.irs.gov/forms-pubs/about-form-3903`).
- **Official IRS PDF / MeF Output:** [`printOfficialPacket`](file:///c:/Users/olive/Documents/Code/actually_free_taxes_com/src/app.ts#L1808-L1855) generates a summary worksheet HTML + IRS mailing slip rather than fillable IRS Form 1040 / Schedule PDFs, and [`submitMockEfile`](file:///c:/Users/olive/Documents/Code/actually_free_taxes_com/src/app.ts#L1915-L1945) is a client-side simulation (`https://www.irs.gov/e-file-providers`).
