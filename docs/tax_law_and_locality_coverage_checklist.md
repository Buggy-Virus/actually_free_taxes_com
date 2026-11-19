# Tax Law & Locality Coverage — Implementation Checklist

Checklist derived from [tax_law_and_locality_coverage_gaps.md](./tax_law_and_locality_coverage_gaps.md) for tracking implementation progress.

> **Official Authority Directory:** See Section 1 of [tax_law_and_locality_coverage_gaps.md](./tax_law_and_locality_coverage_gaps.md) for the full list of Federal (`irs.gov`, `dol.gov`), 50-state + DC, and local revenue authority URLs.

---

## 1. Local & Municipal Income / Payroll Taxes

- [ ] **NY — Yonkers Nonresident Earnings Tax (0.5%):** Model 0.5% tax on Yonkers wages/net SE earnings for nonresidents (`tax.ny.gov`, Form IT-203 / Y-203).
- [ ] **NY — NYC School Tax Credit (Fixed & Rate Reduction):** Deduct $63 (Single) / $125 (MFJ) + rate reduction credit for NYC residents with AGI ≤ $250,000 (`nyc.gov/site/finance`, Form IT-201).
- [ ] **NY — Metropolitan Commuter Transportation Mobility Tax (MCTMT):** Model 0.34%–0.60% MCTMT for self-employed taxpayers in MCTD with net SE earnings > $50,000 (`tax.ny.gov`, Form MTA-6).
- [ ] **MD — County Piggyback Tax (All 23 Counties + Baltimore City):** Replace flat 3.20% approximation with county selector and statutory rates (2.25%–3.20%) applied even when Box 19 is $0 (`marylandtaxes.gov`, Form 502).
- [ ] **PA — Philadelphia Wage & Earnings Tax / NPT / School Income Tax:** Calculate resident (3.75%) / nonresident (3.44%) Wage Tax, Net Profits Tax on Schedule C/1099-NEC, and 3.75% School Income Tax (`phila.gov/departments/department-of-revenue`).
- [ ] **PA — Act 32 Local Earned Income Tax (EIT):** Support PSD code resident vs. workplace rates (1.0%–3.0%), resident credit for workplace EIT, and Schedule C/F net profit (`dced.pa.gov`).
- [ ] **PA — Local Services Tax (LST):** Model $10–$52/yr municipal occupational tax with >$12,000 exemption threshold (`dced.pa.gov`).
- [ ] **OH — Municipal Income Tax (RITA, CCA, Independent Cities):** Calculate 0.5%–3.0% municipal tax by residence/work city, resident credits, and Schedule C/E/1099-NEC (`tax.ohio.gov`, `ritaohio.com`, `ccatax.ci.cleveland.oh.us`).
- [ ] **OH — School District Income Tax (SDIT):** Model 0.25%–2.0% SDIT (Traditional vs. Earned Income Base, Form SD 100) (`tax.ohio.gov`).
- [ ] **IN — County Local Income Tax (LIT — All 92 Counties):** Compute county LIT (~0.5%–2.95%) on IT-40 Schedule CT-40 by county of residence/work on Jan 1 (`in.gov/dor`).
- [ ] **KY — County & City Occupational License / School Taxes:** Model Louisville/Jefferson (2.20%), Lexington/Fayette (2.25%), Covington, etc. on wages and Schedule C/E (`revenue.ky.gov`).
- [ ] **MI — City Income Taxes (24 Cities):** Compute resident/nonresident rates (Detroit 2.40%/1.20%, Grand Rapids 1.50%/0.75%, etc.), $600 exemptions, and inter-city credits (`michigan.gov/taxes`, `detroitmi.gov`).
- [ ] **MO — Kansas City & St. Louis Earnings Taxes (1.0%):** Compute KC Form RD-109 and St. Louis Form E-1 on wages and Schedule C (`dor.mo.gov`, `kcmo.gov`, `stlouis-mo.gov`).
- [ ] **DE — Wilmington City Wage Tax (1.25%):** Compute 1.25% tax on Wilmington-earned or Wilmington-resident wages (`revenue.delaware.gov`, `wilmingtonde.gov`).
- [ ] **AL — Municipal Occupational Taxes:** Compute Birmingham (1.0%), Bessemer (1.0%), Gadsden (2.0%), Macon County, etc. on gross compensation (`revenue.alabama.gov`).
- [ ] **OR — Portland Metro Supportive Housing Services (SHS) Tax:** Model 1.0% tax over $125k / $200k MFJ (`portland.gov/revenue`).
- [ ] **OR — Multnomah County Preschool for All (PFA) Tax:** Model 1.5% over $125k/$200k and 3.0% over $250k/$400k (`portland.gov/revenue`).
- [ ] **OR — TriMet & Lane Transit District (LTD) Self-Employment Taxes:** Model 0.8137% (TriMet) / 0.79% (LTD) on net SE earnings (`oregon.gov/dor`).
- [ ] **CO — Municipal Occupational Privilege Taxes (OPT / "Head Tax"):** Model Denver ($5.75/mo), Aurora ($2/mo), Glendale ($5/mo), Greenwood Village ($2/mo), and Sheridan ($3/mo) (`tax.colorado.gov`, `denvergov.org`).
- [ ] **WV — Municipal City Service Fees (CSFs):** Model Charleston ($3/wk), Huntington ($5/wk), Wheeling ($2/wk), Morgantown ($3/wk), Fairmont ($2/wk), Parkersburg, and Weirton (`tax.wv.gov`, `charlestonwv.gov`).
- [ ] **NJ — Newark Payroll Tax & Statewide SUI/SDI/FLI Overpayment Credit:** Model Form NJ-2450 multi-employer excess SDI/FLI/SUI credit (`nj.gov/treasury/taxation`).

### State Paid Family & Medical Leave / SDI Payroll Deductions
- [ ] **CA — State Disability Insurance (SDI / PFL):** Model 1.1% (2024) / 1.2% (2025) uncapped SDI and Schedule A SALT deductibility (`ftb.ca.gov`, `edd.ca.gov`).
- [ ] **NY — Paid Family Leave (PFL) & Disability Benefits (DBL):** Model PFL (0.373% / 0.388% up to wage cap) + DBL and excess multi-employer PFL reconciliation (`tax.ny.gov`, `paidfamilyleave.ny.gov`).
- [ ] **NJ — SDI, FLI & SUI Payroll Deductions & Form NJ-2450:** Model employee SUI/FLI/SDI and Form NJ-2450 excess credit (`nj.gov/treasury/taxation`).
- [ ] **RI — Temporary Disability Insurance (TDI):** Model 1.2% (2024) / 1.3% (2025) up to wage cap + multi-employer excess refund (`tax.ri.gov`, `dlt.ri.gov`).
- [ ] **HI — Temporary Disability Insurance (TDI):** Model 0.5% weekly wage contribution up to weekly cap (`tax.hawaii.gov`, `labor.hawaii.gov`).
- [ ] **WA — WA PFML & WA Cares Fund (LTC):** Model PFML (~0.528% up to SS cap) + WA Cares (0.58% uncapped) + multi-employer excess refunds (`dor.wa.gov`, `paidleave.wa.gov`, `wacaresfund.wa.gov`).
- [ ] **MA — Paid Family & Medical Leave (PFML):** Model 0.46% (2024) up to SS cap + multi-employer excess credit (`mass.gov`).
- [ ] **CT — Paid Family & Medical Leave (CT Paid Leave):** Model 0.50% up to SS cap + multi-employer excess refund (`portal.ct.gov/drs`, `ctpaidleave.org`).
- [ ] **CO — Family & Medical Leave Insurance (FAMLI):** Model 0.45% up to SS cap + multi-employer excess refund (`tax.colorado.gov`, `famli.colorado.gov`).
- [ ] **OR — Paid Leave Oregon (PLO):** Model 0.60% up to SS cap + Form OR-40 multi-employer excess credit (`oregon.gov/dor`, `paidleave.oregon.gov`).
- [ ] **MD — Family & Medical Leave Insurance (FAMLI):** Model enacted 0.45% employee contribution once collection begins (`marylandtaxes.gov`, `paidleave.maryland.gov`).

---

## 2. Part-Year Residency & Nonresident Allocation Rules

### Core Engine Architecture
- [ ] **Move-in / move-out date inputs** per state in `TaxAppState` and UI.
- [ ] **Residency-period allocation** for unearned income (interest, dividends, capital gains, 1099-R, alimony).
- [ ] **Multiple part-year resident return generation** when moving between two or more states mid-year.

### State-Specific Part-Year & Nonresident Proration Rules
- [ ] **AL (Form 40NR):** Prorate personal exemption and standard deduction by AL AGI / Federal AGI (`revenue.alabama.gov`).
- [ ] **AZ (Form 140PY / 140NR):** Prorate standard deduction and dependent credits by AZ / Federal gross income (`azdor.gov`).
- [ ] **AR (Form AR1000NR):** Compute tax on total income, then multiply by AR AGI / Total AGI (`dfa.arkansas.gov`).
- [ ] **CA (Form 540NR):** Compute tax rate on worldwide AGI, multiply by CA-source AGI / Total AGI, and prorate exemption credits (`ftb.ca.gov`).
- [ ] **CO (Form DR 0104PN):** Compute full-year CO tax, then apportion by CO-source / Modified Federal AGI (`tax.colorado.gov`).
- [ ] **CT (Form CT-1040NR/PY):** Compute tax on total CT AGI, then multiply by CT-source / Total AGI (`portal.ct.gov/drs`).
- [ ] **DE (Form 200-02 NR):** Prorate personal credits and standard deduction by DE-source income ratio (`revenue.delaware.gov`).
- [ ] **DC (Form D-40 Part-Year):** Prorate standard/itemized deductions by months of DC residency (`otr.cfo.dc.gov`).
- [ ] **GA (Form 500 Schedule 3):** Prorate standard deduction and personal exemptions by GA-source / Total AGI (`dor.georgia.gov`).
- [ ] **HI (Form N-15):** Prorate standard deduction and personal exemptions by HI AGI / Total AGI (`tax.hawaii.gov`).
- [ ] **ID (Form 43):** Prorate standard deduction and grocery/child credits by ID-source / Total income (`tax.idaho.gov`).
- [ ] **IL (Schedule NR):** Prorate $2,775 personal exemption by IL base income / Total base income (`tax.illinois.gov`).
- [ ] **IN (Form IT-40PNR):** Prorate $1,000/$1,500 exemptions by IN-source / Total income (`in.gov/dor`).
- [ ] **IA (Form IA 126):** Compute tax on all-source income, then apply non-IA-source credit (`revenue.iowa.gov`).
- [ ] **KS (Schedule S Part B):** Compute tax on total income, then multiply by KS-source / Total AGI (`ksrevenue.gov`).
- [ ] **KY (Form 740-NP):** Prorate standard deduction and Family Size Tax Credit by KY AGI / Federal AGI (`revenue.ky.gov`).
- [ ] **LA (Form IT-540B):** Prorate standard deduction / exemptions by LA AGI / Federal AGI (`revenue.louisiana.gov`).
- [ ] **ME (Schedule NR / NRH):** Compute tax on all-source income and apply nonresident credit (`maine.gov/revenue`).
- [ ] **MD (Form 505 / 502 Part-Year):** Prorate personal exemptions and standard deduction by MD AGI / Federal AGI (`marylandtaxes.gov`).
- [ ] **MA (Form 1-NR/PY):** Prorate personal exemptions by days of residency or MA-source income ratio (`mass.gov`).
- [ ] **MI (Schedule NR):** Prorate $5,600 personal exemption by MI-source / Total income (`michigan.gov/taxes`).
- [ ] **MN (Schedule M1NR):** Compute tax on all-source taxable income, then multiply by MN-source / Federal AGI (`revenue.state.mn.us`).
- [ ] **MS (Form 80-205):** Prorate standard deduction and exemptions by MS-source / Total income (`dor.ms.gov`).
- [ ] **MO (Form MO-NRI):** Compute tax on total income, then multiply by MO-source / Total AGI (`dor.mo.gov`).
- [ ] **MT (Form 2 NR/PY):** Compute tax on total income and apply MT-source ratio (`mtrevenue.gov`).
- [ ] **NE (Schedule III):** Compute tax on total income, then multiply by NE-source / Federal AGI (`revenue.nebraska.gov`).
- [ ] **NJ (Form NJ-1040NR / Part-Year NJ-1040):** Prorate personal exemptions by months of NJ residency or NJ-source ratio (`nj.gov/treasury/taxation`).
- [ ] **NM (Schedule PIT-B):** Compute tax on total income, then multiply by NM-source / Total income (`tax.newmexico.gov`).
- [ ] **NY (Form IT-203):** Compute base tax on total Federal AGI, multiply by NY-source / Federal AGI, and model convenience-of-the-employer rule (`tax.ny.gov`).
- [ ] **NC (Form D-400 Schedule PN):** Compute tax on total NC taxable income, then multiply by NC-source / Total income (`ncdor.gov`).
- [ ] **ND (Schedule ND-1NR):** Compute tax on all-source taxable income, then multiply by ND-source / Total income (`tax.nd.gov`).
- [ ] **OH (Schedule IT NRC):** Compute tax on all-source income and apply nonresident credit (`tax.ohio.gov`).
- [ ] **OK (Form 511-NR):** Prorate standard/itemized deduction by OK-source / Federal AGI (`oklahoma.gov/tax.html`).
- [ ] **OR (Form OR-40-N / OR-40-P):** Prorate standard/itemized deductions and exemption credits by OR-source / Federal AGI (`oregon.gov/dor`).
- [ ] **PA (Form PA-40 Part-Year):** Allocate by residency period + prorate Schedule SP poverty forgiveness (`revenue.pa.gov`).
- [ ] **RI (Form RI-1040NR):** Compute tax on all-source income, then multiply by RI-source / Federal AGI (`tax.ri.gov`).
- [ ] **SC (Schedule NR):** Prorate standard/itemized deductions by SC-source / Total income (`dor.sc.gov`).
- [ ] **UT (Form TC-40B):** Compute tax on all-source income, then multiply by UT-source / Total income (`tax.utah.gov`).
- [ ] **VT (Schedule IN-113):** Compute tax on all-source income, then multiply by VT-source / Total income (`tax.vermont.gov`).
- [ ] **VA (Form 763 / 760PY):** Prorate standard deduction and exemptions by VA-source / Federal AGI or days (`tax.virginia.gov`).
- [ ] **WV (Schedule A, IT-140):** Compute tax on total income, then multiply by WV-source / Federal AGI (`tax.wv.gov`).
- [ ] **WI (Form 1NPR):** Prorate standard deduction and exemptions by WI-source / Federal AGI (`revenue.wi.gov`).

---

## 3. State-by-State Itemized Deductions vs. Federal SALT Cap & Standard Deduction (All 50 States + DC)

- [ ] **AL:** Add AL Schedule A itemized deductions (minus state income tax, uncapped property tax, plus Federal tax paid) (`revenue.alabama.gov`).
- [x] **AK:** No state personal income tax (`tax.alaska.gov`).
- [ ] **AZ:** Add AZ itemized carryover (uncapped property tax) + standard-deduction charitable boost (25%–33%) (`azdor.gov`).
- [ ] **AR:** Add AR Schedule A itemized carryover (minus state/local income tax, uncapped property tax) (`dfa.arkansas.gov`).
- [ ] **CA:** Add CA Schedule CA $1M mortgage interest cap, 50% charity AGI cap, and 2% misc itemized deductions (`ftb.ca.gov`).
- [ ] **CO:** Add back Federal Schedule A state income tax for all CO itemizers (not just >$5k/$10k over $400k AGI) (`tax.colorado.gov`).
- [ ] **CT:** Add CT property tax credit ($300 max) (`portal.ct.gov/drs`).
- [ ] **DE:** Add DE itemized carryover (minus state/local income tax, uncapped property tax) (`revenue.delaware.gov`).
- [ ] **DC:** Add DC itemized deduction phaseout for DC AGI > $200k / > $1M (`otr.cfo.dc.gov`).
- [x] **FL:** No state personal income tax (`floridarevenue.com`).
- [ ] **GA:** Add GA itemized carryover (minus state income tax, uncapped property tax) (`dor.georgia.gov`).
- [ ] **HI:** Add HI Schedule A (no $10k SALT cap) + HI AGI phaseouts ($100k/$200k) (`tax.hawaii.gov`).
- [ ] **ID:** Add ID itemized carryover (conforms to $10k SALT cap minus state/local income tax) (`tax.idaho.gov`).
- [x] **IL:** No standard/itemized deductions; 5% property tax credit modeled (`tax.illinois.gov`).
- [ ] **IN:** Auto-apply IN renter's deduction ($3,000) and residential property tax deduction ($2,500) (`in.gov/dor`).
- [ ] **IA:** Add IA itemized carryover (2023+ conformity minus state income tax) (`revenue.iowa.gov`).
- [ ] **KS:** Add independent KS Schedule A (80%–100% of itemized without $10k cap, even if Federal standard) (`ksrevenue.gov`).
- [ ] **KY:** Add KY Schedule A (medical, charity, mortgage, gambling, casualty; disallows all SALT/property tax) (`revenue.ky.gov`).
- [ ] **LA:** Add pre-2025 LA excess itemized deduction over Federal standard deduction (`revenue.louisiana.gov`).
- [ ] **ME:** Add ME Schedule A capped at ~$34,250/$68,500 (`maine.gov/revenue`).
- [ ] **MD:** Add back state/local income tax from Federal Schedule A while keeping property tax up to $10k SALT cap (`marylandtaxes.gov`).
- [ ] **MA:** Add MA commuter/MBTA deduction ($750) and college tuition deduction (`mass.gov`).
- [x] **MI:** No Federal itemized deductions; uses MI exemptions (`michigan.gov/taxes`).
- [ ] **MN:** Add MN Schedule M1SA ($10k property tax cap, >2% misc deductions, ~$232.5k AGI phaseout) (`revenue.state.mn.us`).
- [ ] **MS:** Add MS itemized carryover (minus state/local income tax, uncapped property tax) (`dor.ms.gov`).
- [ ] **MO:** Add MO itemized carryover (minus state/local income tax, uncapped property tax) (`dor.mo.gov`).
- [ ] **MT:** Add back state income tax on Federal itemizers (2024+ Federal Taxable Income conformity) (`mtrevenue.gov`).
- [ ] **NE:** Add NE itemized carryover (minus state/local income tax) (`revenue.nebraska.gov`).
- [x] **NV:** No state personal income tax (`tax.nv.gov`).
- [x] **NH:** No wage/earned income tax (I&D repealed Jan 1, 2025) (`revenue.nh.gov`).
- [ ] **NJ:** Add NJ medical expense deduction (>2% NJ gross income) (`nj.gov/treasury/taxation`).
- [ ] **NM:** Add NM itemized carryover (`tax.newmexico.gov`).
- [ ] **NY:** Model NY Form IT-196 (uncapped real estate tax, 2% misc itemized, and NY AGI phaseouts >$100k/$200k/$1M) (`tax.ny.gov`).
- [ ] **NC:** Add NC itemized deductions (mortgage + property tax capped at $20k, uncapped charity, >7.5% medical) (`ncdor.gov`).
- [x] **ND:** Conforms to Federal Taxable Income (`tax.nd.gov`).
- [ ] **OH:** Add OH IT 1040 Schedule A medical deduction (>7.5% AGI) and LTC insurance (`tax.ohio.gov`).
- [ ] **OK:** Add OK itemized carryover with $17,000 cap on non-charitable/non-medical deductions (`oklahoma.gov/tax.html`).
- [ ] **OR:** Add Schedule OR-A (no $10k SALT cap on property tax; disallows OR income tax) (`oregon.gov/dor`).
- [x] **PA:** Flat 3.07% gross income tax; no standard or itemized deductions (`revenue.pa.gov`).
- [ ] **RI:** Add high-income RI standard deduction phaseout (`tax.ri.gov`).
- [ ] **SC:** Add SC itemized carryover (minus SC state/local income tax) (`dor.sc.gov`).
- [x] **SD:** No state personal income tax (`dor.sd.gov`).
- [x] **TN:** No state personal income tax (`tn.gov/revenue`).
- [x] **TX:** No state personal income tax (`comptroller.texas.gov`).
- [ ] **UT:** Add UT 6% itemized/exemption nonrefundable credit and 1.3¢/$1 phaseout (`tax.utah.gov`).
- [ ] **VT:** Add VT 5% nonrefundable charitable contribution credit (up to $20,000) (`tax.vermont.gov`).
- [ ] **VA:** Enforce matching Federal/VA itemized election and state/local income tax subtraction (`tax.virginia.gov`).
- [x] **WA:** No broad personal income tax (7% LTCG excise tax >$270k modeled) (`dor.wa.gov`).
- [x] **WV:** No standard/itemized deductions; $2,000 personal exemptions (`tax.wv.gov`).
- [ ] **WI:** Add WI 5% Itemized Deduction Credit (medical, mortgage interest, charity) (`revenue.wi.gov`).
- [x] **WY:** No state personal income tax (`revenue.wyo.gov`).

---

## 4. Niche State Credits, Subtractions, & Carryovers

### 529 Plan Deductions / Credits
- [ ] Auto-model state 529 deductions/credits (NY, IL, PA, IN, UT, VT, MN, VA, OH, etc.) (`tax.ny.gov`, `tax.illinois.gov`, `revenue.pa.gov`, `in.gov/dor`).

### State Alternative Minimum Tax (AMT)
- [ ] **CA AMT (Form 540 Schedule P, 7.0%)** (`ftb.ca.gov`).
- [ ] **CT AMT (Form CT-6251, 19% excess TMT / 5.5% AMTI)** (`portal.ct.gov/drs`).
- [ ] **MN AMT (Schedule M1MT, 6.75%)** (`revenue.state.mn.us`).
- [ ] **CO AMT (Form DR 0104AMT, 3.47%)** (`tax.colorado.gov`).

### State Property Tax Circuit Breakers / Renter Credits
- [ ] **NJ ANCHOR / Senior Freeze** (`nj.gov/treasury/taxation`).
- [ ] **NY Real Property Tax Credit (IT-214)** (`tax.ny.gov`).
- [ ] **MN Homestead Credit Refund (M1PR)** (`revenue.state.mn.us`).
- [ ] **WI Homestead Credit (Schedule H)** (`revenue.wi.gov`).
- [ ] **MA Senior Circuit Breaker Credit** (`mass.gov`).
- [ ] **CA Renter's Credit ($60/$120)** (`ftb.ca.gov`).
- [ ] **MI Homestead Property Tax Credit (MI-1040CR)** (`michigan.gov/taxes`).
- [ ] **VT Property Tax Credit (HS-122)** (`tax.vermont.gov`).

### State Child & Dependent Care Credits
- [ ] Auto-calculate state dependent care credits from Federal `childCareExpenses` for **NY, CA, CO, MD, MN, NC, SC, VT, RI, OR, ME**.

### State Child Tax Credits (Separate from Federal CTC)
- [ ] **CA Young Child Tax Credit ($1,154)** (`ftb.ca.gov`).
- [ ] **NY Empire State Child Credit ($330–$1,000)** (`tax.ny.gov`).
- [ ] **MN Child Tax Credit ($1,750/child)** (`revenue.state.mn.us`).
- [ ] **CO Child Tax Credit & Family Affordability Credit** (`tax.colorado.gov`).
- [ ] **NJ Child Tax Credit (up to $1,000)** (`nj.gov/treasury/taxation`).
- [ ] **MA Child & Family Credit ($440/dependent)** (`mass.gov`).
- [ ] **VT Child Tax Credit ($1,000)** (`tax.vermont.gov`).
- [ ] **NM Child Tax Credit ($25–$600)** (`tax.newmexico.gov`).
- [ ] **OR Kids Credit ($1,000)** (`oregon.gov/dor`).
- [ ] **UT Child Tax Credit ($1,000)** (`tax.utah.gov`).

### State Clean Energy, Historic & Multi-Year Carryovers
- [ ] **AZ, NY, CO, SC, MA** Solar / EV / Septic / Lead Paint credits (`azdor.gov`, `tax.ny.gov`, `tax.colorado.gov`, `dor.sc.gov`, `mass.gov`).
- [ ] **Multi-Year Carryovers:** Track state-specific capital loss carryforwards and unused credit carryovers across tax years (`ftb.ca.gov`, `tax.ny.gov`).

### State Retirement / Pension / Social Security Exclusions
- [ ] **CO — Social Security & Pension Subtraction** (age 65+ full SS, $20k/$24k pension/IRA) (`tax.colorado.gov`).
- [ ] **CT — Social Security & Pension/Annuity Exemption** (<$75k/$100k SS exemption + pension phaseout) (`portal.ct.gov/drs`).
- [ ] **KS — Social Security Exemption** (full SS exemption ≤$75k pre-2024; all AGIs 2024+) (`ksrevenue.gov`).
- [ ] **MN — Social Security Subtraction** ($82,190/$105,380 threshold + 10%/$4k phaseout) (`revenue.state.mn.us`).
- [ ] **MT — Social Security Taxation** (2024+ Federal conformity vs. pre-2024 MT worksheet) (`mtrevenue.gov`).
- [ ] **NM — Social Security Exemption** (≤$100k/$150k income) (`tax.newmexico.gov`).
- [ ] **RI — Social Security & Pension Subtraction** (FRA SS exemption + $20k pension/annuity) (`tax.ri.gov`).
- [ ] **UT — Social Security Tax Credit** (4.55% credit, 2.5¢/$1 phaseout over $45k/$75k) (`tax.utah.gov`).
- [ ] **VT — Social Security Exemption** (≤$50k/$65k full, phased out by $60k/$75k) (`tax.vermont.gov`).
- [ ] **WV — Social Security Phaseout** (35% exempt 2024 / 65% 2025 / 100% 2026 over $50k/$100k) (`tax.wv.gov`).
- [ ] **PA — Retirement Income Exemption** (100% exempt on qualifying employer pensions/401k/IRA) (`revenue.pa.gov`).
- [ ] **IL — Retirement Income Subtraction** (100% exempt on pensions/401k/IRA/SS) (`tax.illinois.gov`).
- [ ] **MS — Retirement Income Exemption** (100% exempt on qualified pensions/401k/IRA/SS) (`dor.ms.gov`).
- [ ] **HI — Employer-Funded Pension Exemption** (exempts employer-funded defined-benefit pensions) (`tax.hawaii.gov`).
- [ ] **NY — Pension & Annuity Exclusion ($20,000)** ($20k/person age 59½+ + 100% govt pensions) (`tax.ny.gov`).
- [ ] **NJ — Pension & Retirement Exclusion ($100,000)** (up to $100k MFJ / $75k Single age 62+ with ≤$100k income) (`nj.gov/treasury/taxation`).
- [ ] **GA — Retirement Income Exclusion ($35,000 / $65,000)** (ages 62–64 / 65+ per person) (`dor.georgia.gov`).
- [ ] **MI — Retirement & Pension Subtraction** (2023–2026 tiered phase-in: 50% 2024 / 75% 2025 / 100% 2026) (`michigan.gov/taxes`).
- [ ] **NC — Bailey Settlement & Uniformed Services Exemption** (100% exempt for pre-Aug 12, 1989 govt & military retirees) (`ncdor.gov`).

---

## 5. Federal Tax Law Approximations & Unenforced Limits

- [ ] **Form 8962 — ACA Premium Tax Credit (PTC):** Reconcile Form 1095-A SLCSP premiums, APTC, FPL % brackets, and repayment caps (`irs.gov/forms-pubs/about-form-8962`).
- [ ] **Form 6251 — AMT Preference Items:** Add ISO spread (Form 3921), private-activity bond interest, AMT depreciation, and AMT FTC (`irs.gov/forms-pubs/about-form-6251`).
- [ ] **Form 8889 — HSA Caps & Excess Penalty:** Enforce $4,150/$8,300 (2024) / $4,300/$8,550 (2025) + $1k catch-up and 6% Form 5329 penalty (`irs.gov/forms-pubs/about-form-8889`).
- [ ] **Schedule 1 Line 20 — Traditional IRA Caps & Phaseouts:** Enforce $7k/$8k cap, earned-income floor, and workplace-plan MAGI phaseouts (`irs.gov/retirement-plans/ira-deduction-limits`).
- [ ] **Schedule 1 Line 21 — Student Loan Interest MAGI Phaseout:** Enforce $80k–$95k / $165k–$195k MAGI phaseout (`irs.gov/taxtopics/tc456`).
- [ ] **Form 8995 / 8995-A — QBI Sec. 199A Limitations:** Enforce SSTB phaseouts and W-2 wage / 2.5% UBIA limits above $191,950 / $383,900 (`irs.gov/forms-pubs/about-form-8995`).
- [ ] **Schedule D / Form 8949 — Carryforwards, Wash Sales & Sec. 1202/1256:** Add prior-year ST/LT capital loss carryforward, wash sales, QSBS, and Sec. 1256 60/40 contracts (`irs.gov/forms-pubs/about-schedule-d-form-1040`).
- [ ] **Schedule H — Household Employment Taxes:** Compute 15.3% SS/Medicare over $2,700 cash wage threshold, 0.6% FUTA, and DOL credit-reduction states (`irs.gov/forms-pubs/about-schedule-h-form-1040`).
- [ ] **Form 8959 / 8960 — RRTA & Passive K-1 NII:** Support Railroad Retirement (Tier 1/2) and active vs. passive K-1 NII split (`irs.gov/forms-pubs/about-form-8960`).
- [ ] **Form 1116 — Foreign Tax Credit Limit:** Enforce foreign-source taxable income ratio cap (`irs.gov/forms-pubs/about-form-1116`).
- [ ] **Form 8863 — Education Credits (AOTC / LLC):** Enforce $80k–$90k / $160k–$180k MAGI phaseout and 4-year AOTC limit (`irs.gov/forms-pubs/about-form-8863`).
- [ ] **Schedule A Line 15 — Casualty Loss Floor (Form 4684):** Subtract $100 per-casualty and 10% AGI floor (`irs.gov/forms-pubs/about-form-4684`).
- [ ] **Schedule 1 Line 14 — Military Moving & Educator Caps:** Enforce Form 3903 PCS validation and $300/$600 educator cap (`irs.gov/forms-pubs/about-form-3903`).
- [ ] **Official IRS PDF / MeF Output:** Replace summary HTML ([`printOfficialPacket`](file:///c:/Users/olive/Documents/Code/actually_free_taxes_com/src/app.ts#L1808-L1855)) and simulated e-file ([`submitMockEfile`](file:///c:/Users/olive/Documents/Code/actually_free_taxes_com/src/app.ts#L1915-L1945)) with fillable IRS Form 1040 / state PDFs and/or authorized MeF XML transmission (`irs.gov/e-file-providers`).
