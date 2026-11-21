# ActuallyFreeTaxes.com

> **100% Visual, Transparent, Single-Page Tax Return Web Application**

ActuallyFreeTaxes is a web app designed to demystify taxes. Rather than hiding computations behind disjointed multi-step wizard screens, everything lives on a single, continuous, scrolling page with live mathematical transparency.

---

## Key Features

1. **Realistic Form W-2 at the Top**
   - Authentic IRS Form W-2 aesthetic (Box 1 Wages, Box 2 Withheld, Boxes 3–6 FICA, Box a SSN, Box b EIN, Box c Employer info).
   - Direct inline inputs for all amounts.
   - Support for multiple W-2s (e.g. secondary jobs or spouse W-2 for Married Filing Jointly).

2. **Animated Color-Coded Dependency Arrows**
   - High-performance SVG Bezier curves connect inputs directly to every downstream calculation they impact.
   - **Green** for Wages and Income flow.
   - **Blue** for Federal Withholding and Payment flow.
   - **Amber / Pink** for Social Security and Medicare (FICA) flow.
   - **Purple / Indigo** for Deductions and Filing Status flow.
   - **Orange** for Progressive Tax Brackets and Tax Liability flow.
   - Interactive hover and focus modes: hovering any field illuminates its active data stream with glowing animations and directional pulses.
   - Toggle to keep all arrows visible or display dynamically on focus/hover.

3. **Formula Transparency Above Every Calculated Field**
   - Every calculation card features two equation banners:
     - **General Formula**: The legal IRS tax formula (e.g., `Taxable Income = max(0, AGI − Standard Deduction)`).
     - **Plugged-In Formula**: The exact formula evaluated with the user's specific dollar inputs (e.g., `Taxable Income = max(0, $75,000 − $14,600) = $60,400`).

4. **Progressive Marginal Tax Brackets Visualizer**
   - Dynamic breakdown of 2024 & 2025 IRS tax brackets (10%, 12%, 22%, 24%, 32%, 35%, 37%).
   - Visual color-coded bracket ladder showing how each chunk of income is taxed at its respective rate.

5. **Form 1040 Mirror**
   - Line-by-line mapping directly reflecting IRS Form 1040 lines (Line 1z, 9, 10, 11, 12, 15, 16, 19, 24, 25d, and 34/37).

---

## How the tax math works (formula graph)

All federal and state tax math lives in one formula graph (`src/graph/`). Each tax quantity (AGI, taxable income, a credit, a state's taxable income) is declared once, as a formula over other quantities, user inputs and law constants. The same declaration drives:

- **the calculation** (`graph.evaluate(...)`);
- **the General Formula and With Your Numbers lines**, rendered from the evaluated tree, so what's shown is exactly the math that ran;
- **the dependency arrows**, which come from the formula references and land on the line that uses each value;
- **automatic panels** (credits and deductions applied without user input).

| File | Contents |
| :-- | :-- |
| `src/graph/expr.ts` | Formula language (add, min, conditionals, per-document sums, bracket tables, …) |
| `src/graph/graph.ts` | Evaluator, renderer, variable breakdowns, cards, arrows |
| `src/graph/federal.ts` | Form 1040: every federal rule, plus card layout |
| `src/graph/states.ts` | State & local returns: one template that every state fills |
| `src/tax-constants.ts`, `src/state-rules.ts` | Law constants by year |
| `docs/federal_tax_logic.md`, `docs/state_local_tax_logic.md` | Complete requirements list with implementation status |

Tests (`npm test`): legacy scenarios, graph invariants (every state graph resolves; rendered math matches evaluated math), **golden returns** hand-computed from IRS/state worked examples, and a 300-return randomized fuzz test.

## Development & TypeScript Build

This project is written in strict **TypeScript** (`src/`) and compiles to modern ES modules (`dist/`).

### Prerequisites
- Node.js (tested on Node 14+)

### Commands
- **Compile TypeScript**: `npm run build`
- **Watch mode (recompile on save)**: `npm run watch`
- **Run Unit Tests**: `npm test`
- **Start Local Server**: `npm start` (or `python serve.py`)

---

## How to Run the Web App

### Option 1: Python HTTP Server (Recommended)
```bash
python serve.py
```
Then open your browser to `http://localhost:8080`.

### Option 2: Direct File Open
You can also open `index.html` directly in any modern browser.

### Run Test Suite
```bash
npm test
```
