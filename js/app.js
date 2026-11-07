/**
 * Actually Free Taxes - Main Application Controller
 */

import { calculateTaxes, formatCurrency, formatCurrencyExact, formatPercent, filingStatusLabel } from './tax-engine.js';
import { ArrowEngine } from './arrow-engine.js';

class TaxApp {
  constructor() {
    this.state = {
      year: 2024,
      filingStatus: 'single',
      w2s: [
        {
          id: 0,
          employer: 'Acme Corp, Inc.',
          ein: '12-3456789',
          box1: 75000,
          box2: 8900,
          box3: 75000,
          box4: 4650,
          box5: 75000,
          box6: 1087.50
        }
      ],
      otherIncome: {
        interest: 0
      },
      adjustments: {
        studentLoan: 0,
        ira: 0,
        hsa: 0
      },
      dependents: {
        childrenCount: 0
      },
      showAllArrows: true
    };

    this.arrowEngine = null;
    this.w2Counter = 1;

    this.init();
  }

  init() {
    const svgEl = document.getElementById('arrow-canvas');
    this.arrowEngine = new ArrowEngine(svgEl, { showAll: this.state.showAllArrows });

    this.renderW2Forms();
    this.bindGlobalEvents();
    this.recalculateAndRender();
  }

  bindGlobalEvents() {
    // Tax Year Selector
    const yearSelect = document.getElementById('select-tax-year');
    if (yearSelect) {
      yearSelect.value = this.state.year;
      yearSelect.addEventListener('change', (e) => {
        this.state.year = parseInt(e.target.value, 10);
        this.renderYearBadges();
        this.recalculateAndRender();
      });
    }

    // Filing Status Selector
    const statusSelect = document.getElementById('select-filing-status');
    if (statusSelect) {
      statusSelect.value = this.state.filingStatus;
      statusSelect.addEventListener('change', (e) => {
        this.state.filingStatus = e.target.value;
        this.recalculateAndRender();
      });
    }

    // Show All Arrows Toggle
    const toggleArrows = document.getElementById('toggle-all-arrows');
    if (toggleArrows) {
      toggleArrows.checked = this.state.showAllArrows;
      toggleArrows.addEventListener('change', (e) => {
        this.state.showAllArrows = e.target.checked;
        this.arrowEngine.setShowAll(this.state.showAllArrows);
      });
    }

    // Add W-2 Button
    const addW2Btn = document.getElementById('btn-add-w2');
    if (addW2Btn) {
      addW2Btn.addEventListener('click', () => {
        this.addW2();
      });
    }

    // Preset buttons
    document.querySelectorAll('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const preset = e.target.closest('[data-preset]').dataset.preset;
        this.loadPreset(preset);
      });
    });

    // Other inputs (Student loan, IRA, HSA, Interest, Dependents)
    const bindInput = (id, setter) => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('input', (e) => {
          setter(Number(e.target.value) || 0);
          this.recalculateAndRender();
        });
        el.addEventListener('focus', () => this.arrowEngine.setActiveSource(id));
        el.addEventListener('blur', () => this.arrowEngine.clearActive());
        el.addEventListener('mouseenter', () => this.arrowEngine.setActiveSource(id));
        el.addEventListener('mouseleave', () => this.arrowEngine.clearActive());
      }
    };

    bindInput('input-adj-student-loan', val => this.state.adjustments.studentLoan = val);
    bindInput('input-adj-ira', val => this.state.adjustments.ira = val);
    bindInput('input-adj-hsa', val => this.state.adjustments.hsa = val);
    bindInput('input-other-interest', val => this.state.otherIncome.interest = val);
    bindInput('input-children-count', val => this.state.dependents.childrenCount = val);

    // Calculation cards hover listeners
    this.bindCardInspectors();
  }

  bindCardInspectors() {
    const cardMap = [
      'calc-total-w2-wages',
      'calc-gross-income',
      'calc-total-adjustments',
      'calc-agi',
      'calc-standard-deduction',
      'calc-taxable-income',
      'calc-tax-before-credits',
      'calc-total-credits',
      'calc-total-tax-liability',
      'calc-total-withholding',
      'calc-final-verdict',
      'calc-fica-breakdown'
    ];

    cardMap.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('mouseenter', () => this.arrowEngine.setActiveTarget(id));
        el.addEventListener('mouseleave', () => this.arrowEngine.clearActive());
      }
    });
  }

  addW2() {
    const newId = this.w2Counter++;
    this.state.w2s.push({
      id: newId,
      employer: `Employer #${newId + 1}`,
      ein: '98-7654321',
      box1: 45000,
      box2: 5200,
      box3: 45000,
      box4: 2790,
      box5: 45000,
      box6: 652.50
    });
    this.renderW2Forms();
    this.recalculateAndRender();
  }

  removeW2(id) {
    if (this.state.w2s.length <= 1) {
      alert("At least one W-2 is required. You can set the values to $0 if needed.");
      return;
    }
    this.state.w2s = this.state.w2s.filter(w => w.id !== id);
    this.renderW2Forms();
    this.recalculateAndRender();
  }

  loadPreset(presetName) {
    if (presetName === 'single-75k') {
      this.state.filingStatus = 'single';
      this.state.w2s = [{
        id: 0,
        employer: 'Northwind Tech Inc.',
        ein: '12-3456789',
        box1: 75000,
        box2: 8900,
        box3: 75000,
        box4: 4650,
        box5: 75000,
        box6: 1087.50
      }];
      this.state.otherIncome.interest = 0;
      this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 0 };
      this.state.dependents.childrenCount = 0;
    } else if (presetName === 'married-dual-140k') {
      this.state.filingStatus = 'married_joint';
      this.state.w2s = [
        {
          id: 0,
          employer: 'TechCorp Solutions',
          ein: '11-2233445',
          box1: 82000,
          box2: 9600,
          box3: 82000,
          box4: 5084,
          box5: 82000,
          box6: 1189
        },
        {
          id: 1,
          employer: 'Metro Health Systems',
          ein: '55-6677889',
          box1: 58000,
          box2: 6800,
          box3: 58000,
          box4: 3596,
          box5: 58000,
          box6: 841
        }
      ];
      this.state.otherIncome.interest = 450;
      this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 0 };
      this.state.dependents.childrenCount = 1;
    } else if (presetName === 'student-grad') {
      this.state.filingStatus = 'single';
      this.state.w2s = [{
        id: 0,
        employer: 'Creative Design Studio',
        ein: '33-4455667',
        box1: 52000,
        box2: 5400,
        box3: 52000,
        box4: 3224,
        box5: 52000,
        box6: 754
      }];
      this.state.otherIncome.interest = 50;
      this.state.adjustments = { studentLoan: 1800, ira: 1000, hsa: 0 };
      this.state.dependents.childrenCount = 0;
    } else if (presetName === 'blank') {
      this.state.filingStatus = 'single';
      this.state.w2s = [{
        id: 0,
        employer: 'Employer Name',
        ein: '00-0000000',
        box1: 0,
        box2: 0,
        box3: 0,
        box4: 0,
        box5: 0,
        box6: 0
      }];
      this.state.otherIncome.interest = 0;
      this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 0 };
      this.state.dependents.childrenCount = 0;
    }

    // Sync input values to DOM
    const statusSelect = document.getElementById('select-filing-status');
    if (statusSelect) statusSelect.value = this.state.filingStatus;

    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.value = val;
    };
    setVal('input-adj-student-loan', this.state.adjustments.studentLoan);
    setVal('input-adj-ira', this.state.adjustments.ira);
    setVal('input-adj-hsa', this.state.adjustments.hsa);
    setVal('input-other-interest', this.state.otherIncome.interest);
    setVal('input-children-count', this.state.dependents.childrenCount);

    this.renderW2Forms();
    this.recalculateAndRender();
  }

  renderYearBadges() {
    document.querySelectorAll('.current-tax-year-text').forEach(el => {
      el.textContent = this.state.year;
    });
  }

  renderW2Forms() {
    const container = document.getElementById('w2-list-container');
    if (!container) return;

    container.innerHTML = '';

    this.state.w2s.forEach((w2, index) => {
      const card = document.createElement('div');
      card.className = 'w2-card-wrapper';
      card.id = `w2-card-${w2.id}`;

      card.innerHTML = `
        <div class="w2-form">
          <div class="w2-top-strip">
            <div>
              <div class="w2-omb">OMB No. 1545-0008</div>
              <div style="font-size: 0.75rem; font-weight: 700; color: #475569;">
                W-2 #${index + 1} ${this.state.w2s.length > 1 ? `(${index === 0 ? 'Primary' : 'Spouse / Job ' + (index + 1)})` : ''}
              </div>
            </div>
            <div class="w2-form-title">
              <div class="doc-code">Form W-2</div>
              <div class="doc-desc">Wage and Tax Statement</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="w2-year-badge current-tax-year-text">${this.state.year}</div>
              ${this.state.w2s.length > 1 ? `
                <button type="button" class="btn btn-sm" style="color: #ef4444; border-color: #fecaca; padding: 0.2rem 0.5rem; font-size: 0.75rem;" data-remove-w2="${w2.id}">
                  ✕ Remove
                </button>
              ` : ''}
            </div>
          </div>

          <div class="w2-grid">
            <!-- Box a: SSN -->
            <div class="w2-box">
              <div class="w2-box-header">
                <span class="w2-box-number">a</span>
                <span class="w2-box-label">Employee's social security number</span>
              </div>
              <input type="text" class="w2-input-text" value="***-**-1234" readonly>
            </div>

            <!-- Box 1: Wages, tips, other compensation (KEY INPUT) -->
            <div class="w2-box highlight-wages" id="w2-${w2.id}-box1-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">1</span>
                  <span class="w2-box-label">Wages, tips, other comp.</span>
                </div>
                <span class="w2-box-badge wages">Income Flow</span>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box1" value="${w2.box1}" placeholder="0">
              </div>
            </div>

            <!-- Box 2: Federal income tax withheld (KEY INPUT) -->
            <div class="w2-box highlight-withholding" id="w2-${w2.id}-box2-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">2</span>
                  <span class="w2-box-label">Federal income tax withheld</span>
                </div>
                <span class="w2-box-badge withholding">Payment Flow</span>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box2" value="${w2.box2}" placeholder="0">
              </div>
            </div>

            <!-- Box b: EIN -->
            <div class="w2-box">
              <div class="w2-box-header">
                <span class="w2-box-number">b</span>
                <span class="w2-box-label">Employer identification number (EIN)</span>
              </div>
              <input type="text" class="w2-input-text" value="${w2.ein}" data-w2-field="ein" data-w2-id="${w2.id}">
            </div>

            <!-- Box 3: Social Security wages -->
            <div class="w2-box highlight-ss" id="w2-${w2.id}-box3-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">3</span>
                  <span class="w2-box-label">Social security wages</span>
                </div>
                <span class="w2-box-badge ss">FICA</span>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box3" value="${w2.box3}" placeholder="0">
              </div>
            </div>

            <!-- Box 4: Social Security tax withheld -->
            <div class="w2-box highlight-ss" id="w2-${w2.id}-box4-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">4</span>
                  <span class="w2-box-label">Social security tax withheld</span>
                </div>
                <span class="w2-box-badge ss">6.2%</span>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box4" value="${w2.box4}" placeholder="0">
              </div>
            </div>

            <!-- Box c: Employer's name, address -->
            <div class="w2-box">
              <div class="w2-box-header">
                <span class="w2-box-number">c</span>
                <span class="w2-box-label">Employer's name, address, and ZIP</span>
              </div>
              <input type="text" class="w2-input-text" value="${w2.employer}" data-w2-field="employer" data-w2-id="${w2.id}">
            </div>

            <!-- Box 5: Medicare wages -->
            <div class="w2-box highlight-medicare" id="w2-${w2.id}-box5-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">5</span>
                  <span class="w2-box-label">Medicare wages and tips</span>
                </div>
                <span class="w2-box-badge medicare">FICA</span>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box5" value="${w2.box5}" placeholder="0">
              </div>
            </div>

            <!-- Box 6: Medicare tax withheld -->
            <div class="w2-box highlight-medicare" id="w2-${w2.id}-box6-container">
              <div class="w2-box-header">
                <div>
                  <span class="w2-box-number">6</span>
                  <span class="w2-box-label">Medicare tax withheld</span>
                </div>
                <span class="w2-box-badge medicare">1.45%</span>
              </div>
              <div class="w2-input-wrapper">
                <span class="currency-symbol">$</span>
                <input type="number" step="any" class="w2-input" id="w2-${w2.id}-box6" value="${w2.box6}" placeholder="0">
              </div>
            </div>
          </div>

          <div class="w2-footer-note">
            <span>Copy B — To Be Filed With Employee's FEDERAL Tax Return</span>
            <span>Department of the Treasury — Internal Revenue Service</span>
          </div>
        </div>
      `;

      container.appendChild(card);
    });

    // Wire up events for W-2 inputs
    this.bindW2Events();
  }

  bindW2Events() {
    this.state.w2s.forEach(w2 => {
      const bindW2Field = (boxNum, propName, autoFillFICA = false) => {
        const inputId = `w2-${w2.id}-box${boxNum}`;
        const inputEl = document.getElementById(inputId);
        if (!inputEl) return;

        inputEl.addEventListener('input', (e) => {
          const val = Number(e.target.value) || 0;
          w2[propName] = val;

          // Helpful standard autofill for Box 3 & 5 if Box 1 is edited and they match
          if (autoFillFICA && (w2.box3 === 0 || w2.box3 === w2.box1)) {
            w2.box3 = val;
            w2.box4 = Math.round(val * 0.062 * 100) / 100;
            w2.box5 = val;
            w2.box6 = Math.round(val * 0.0145 * 100) / 100;

            const b3 = document.getElementById(`w2-${w2.id}-box3`);
            const b4 = document.getElementById(`w2-${w2.id}-box4`);
            const b5 = document.getElementById(`w2-${w2.id}-box5`);
            const b6 = document.getElementById(`w2-${w2.id}-box6`);
            if (b3) b3.value = w2.box3;
            if (b4) b4.value = w2.box4;
            if (b5) b5.value = w2.box5;
            if (b6) b6.value = w2.box6;
          }

          this.recalculateAndRender();
        });

        inputEl.addEventListener('focus', () => this.arrowEngine.setActiveSource(inputId));
        inputEl.addEventListener('blur', () => this.arrowEngine.clearActive());
        inputEl.addEventListener('mouseenter', () => this.arrowEngine.setActiveSource(inputId));
        inputEl.addEventListener('mouseleave', () => this.arrowEngine.clearActive());
      };

      bindW2Field(1, 'box1', true);
      bindW2Field(2, 'box2');
      bindW2Field(3, 'box3');
      bindW2Field(4, 'box4');
      bindW2Field(5, 'box5');
      bindW2Field(6, 'box6');
    });

    // Remove buttons
    document.querySelectorAll('[data-remove-w2]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const idToRemove = parseInt(e.target.dataset.removeW2, 10);
        this.removeW2(idToRemove);
      });
    });
  }

  buildConnections() {
    const connections = [];

    // 1. W2 Box 1 (Wages) -> Total Wages Calc
    this.state.w2s.forEach(w => {
      connections.push({
        id: `conn-w2-${w.id}-box1-wages`,
        sourceId: `w2-${w.id}-box1`,
        targetId: 'calc-total-w2-wages',
        category: 'wages',
        label: 'Wages to Total Wages'
      });
    });

    // 2. Total Wages -> Gross Income
    connections.push({
      id: 'conn-wages-gross',
      sourceId: 'calc-total-w2-wages',
      targetId: 'calc-gross-income',
      category: 'wages',
      label: 'Total Wages to Gross Income'
    });

    // 3. Other Incomes -> Gross Income
    if (this.state.otherIncome.interest > 0) {
      connections.push({
        id: 'conn-interest-gross',
        sourceId: 'input-other-interest',
        targetId: 'calc-gross-income',
        category: 'wages',
        label: 'Interest to Gross Income'
      });
    }

    // 4. Adjustments -> Total Adjustments
    connections.push({
      id: 'conn-adj-student-loan',
      sourceId: 'input-adj-student-loan',
      targetId: 'calc-total-adjustments',
      category: 'adjustments',
      label: 'Student Loan to Adjustments'
    });

    // 5. Gross Income & Adjustments -> AGI
    connections.push({
      id: 'conn-gross-agi',
      sourceId: 'calc-gross-income',
      targetId: 'calc-agi',
      category: 'wages',
      label: 'Gross to AGI'
    });
    connections.push({
      id: 'conn-adj-agi',
      sourceId: 'calc-total-adjustments',
      targetId: 'calc-agi',
      category: 'adjustments',
      label: 'Adjustments to AGI'
    });

    // 6. Filing Status -> Standard Deduction
    connections.push({
      id: 'conn-status-deduction',
      sourceId: 'select-filing-status',
      targetId: 'calc-standard-deduction',
      category: 'status',
      label: 'Status sets Standard Deduction'
    });

    // 7. AGI & Deduction -> Taxable Income
    connections.push({
      id: 'conn-agi-taxable',
      sourceId: 'calc-agi',
      targetId: 'calc-taxable-income',
      category: 'wages',
      label: 'AGI to Taxable Income'
    });
    connections.push({
      id: 'conn-deduction-taxable',
      sourceId: 'calc-standard-deduction',
      targetId: 'calc-taxable-income',
      category: 'status',
      label: 'Deduction to Taxable Income'
    });

    // 8. Taxable Income -> Tentative Tax (Brackets)
    connections.push({
      id: 'conn-taxable-tentative',
      sourceId: 'calc-taxable-income',
      targetId: 'calc-tax-before-credits',
      category: 'tax',
      label: 'Taxable Income to Tax Brackets'
    });

    // 9. Credits -> Total Tax Liability
    connections.push({
      id: 'conn-tentative-totaltax',
      sourceId: 'calc-tax-before-credits',
      targetId: 'calc-total-tax-liability',
      category: 'tax',
      label: 'Tentative Tax to Liability'
    });
    connections.push({
      id: 'conn-credits-totaltax',
      sourceId: 'calc-total-credits',
      targetId: 'calc-total-tax-liability',
      category: 'credits',
      label: 'Credits reduce Liability'
    });

    // 10. W2 Box 2 (Withholding) -> Total Withholding
    this.state.w2s.forEach(w => {
      connections.push({
        id: `conn-w2-${w.id}-box2-withheld`,
        sourceId: `w2-${w.id}-box2`,
        targetId: 'calc-total-withholding',
        category: 'withholding',
        label: 'W-2 Box 2 Withheld'
      });
    });

    // 11. Final comparison: Total Withholding & Total Tax -> Final Verdict
    connections.push({
      id: 'conn-withheld-verdict',
      sourceId: 'calc-total-withholding',
      targetId: 'calc-final-verdict',
      category: 'withholding',
      label: 'Payments to Verdict'
    });
    connections.push({
      id: 'conn-tax-verdict',
      sourceId: 'calc-total-tax-liability',
      targetId: 'calc-final-verdict',
      category: 'tax',
      label: 'Tax to Verdict'
    });

    // 12. FICA Connections
    this.state.w2s.forEach(w => {
      connections.push({
        id: `conn-w2-${w.id}-box4-fica`,
        sourceId: `w2-${w.id}-box4`,
        targetId: 'calc-fica-breakdown',
        category: 'ss',
        label: 'SS Tax to FICA'
      });
      connections.push({
        id: `conn-w2-${w.id}-box6-fica`,
        sourceId: `w2-${w.id}-box6`,
        targetId: 'calc-fica-breakdown',
        category: 'medicare',
        label: 'Medicare Tax to FICA'
      });
    });

    return connections;
  }

  recalculateAndRender() {
    const taxData = calculateTaxes(this.state);

    // Helper to update a card's equations and value
    const updateCard = (cardId, calcObj, formattedVal) => {
      const card = document.getElementById(cardId);
      if (!card) return;

      const genEl = card.querySelector('.formula-general');
      const plugEl = card.querySelector('.formula-plugged');
      const valEl = card.querySelector('.calc-output-value');

      if (genEl && calcObj.generalFormula) genEl.textContent = calcObj.generalFormula;
      if (plugEl && calcObj.pluggedFormula) plugEl.textContent = calcObj.pluggedFormula;
      if (valEl && formattedVal) valEl.textContent = formattedVal;
    };

    // 1. Total W-2 Wages
    updateCard('calc-total-w2-wages', taxData.w2WagesCalc, formatCurrency(taxData.w2WagesCalc.result));

    // 2. Gross Income
    updateCard('calc-gross-income', taxData.grossIncomeCalc, formatCurrency(taxData.grossIncomeCalc.result));

    // 3. Adjustments
    updateCard('calc-total-adjustments', taxData.adjustmentsCalc, formatCurrency(taxData.adjustmentsCalc.result));

    // 4. AGI
    updateCard('calc-agi', taxData.agiCalc, formatCurrency(taxData.agiCalc.result));

    // 5. Standard Deduction
    updateCard('calc-standard-deduction', taxData.deductionCalc, formatCurrency(taxData.deductionCalc.result));

    // 6. Taxable Income
    updateCard('calc-taxable-income', taxData.taxableIncomeCalc, formatCurrency(taxData.taxableIncomeCalc.result));

    // 7. Tax Before Credits (Brackets)
    updateCard('calc-tax-before-credits', taxData.taxBeforeCreditsCalc, formatCurrencyExact(taxData.taxBeforeCreditsCalc.result));
    this.renderTaxBrackets(taxData.taxBeforeCreditsCalc.brackets, taxData.taxableIncomeCalc.result);

    // 8. Credits
    updateCard('calc-total-credits', taxData.creditsCalc, formatCurrency(taxData.creditsCalc.result));

    // 9. Total Tax Liability
    updateCard('calc-total-tax-liability', taxData.totalTaxCalc, formatCurrencyExact(taxData.totalTaxCalc.result));

    // 10. Total Withholding
    updateCard('calc-total-withholding', taxData.withholdingCalc, formatCurrencyExact(taxData.withholdingCalc.result));

    // 11. Final Verdict Card
    this.renderVerdict(taxData);

    // 12. FICA Breakdown
    updateCard('calc-fica-breakdown', taxData.ficaCalc, formatCurrencyExact(taxData.ficaCalc.totalFica));

    // 13. Form 1040 Mirror
    this.render1040Mirror(taxData);

    // Update Quick Stats in Sticky Header
    this.updateHeaderStats(taxData);

    // Update Connections & Redraw Arrows
    const connections = this.buildConnections();
    this.arrowEngine.setConnections(connections);
  }

  renderTaxBrackets(brackets, taxableIncome) {
    const tbody = document.getElementById('tax-brackets-tbody');
    const barContainer = document.getElementById('bracket-progress-bar');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (barContainer) barContainer.innerHTML = '';

    brackets.forEach(b => {
      const isTaxed = b.taxableAmount > 0;
      const tr = document.createElement('tr');
      if (isTaxed) tr.className = 'active-bracket';

      tr.innerHTML = `
        <td><strong>${b.ratePercent}</strong></td>
        <td>${b.range}</td>
        <td>${formatCurrency(b.taxableAmount)}</td>
        <td>${b.formula}</td>
      `;
      tbody.appendChild(tr);

      // Add segment to progress bar if taxed
      if (barContainer && taxableIncome > 0 && isTaxed) {
        const pct = Math.max(2, (b.taxableAmount / taxableIncome) * 100);
        const seg = document.createElement('div');
        seg.className = 'bracket-segment';
        seg.style.width = `${pct}%`;
        seg.title = `${b.ratePercent} bracket: ${formatCurrency(b.taxableAmount)}`;
        seg.textContent = `${b.ratePercent}`;
        barContainer.appendChild(seg);
      }
    });
  }

  renderVerdict(taxData) {
    const verdictCard = document.getElementById('calc-final-verdict');
    if (!verdictCard) return;

    const isRefund = taxData.finalResultCalc.isRefund;
    const amount = taxData.finalResultCalc.result;

    verdictCard.classList.remove('is-refund', 'is-owed');
    verdictCard.classList.add(isRefund ? 'is-refund' : 'is-owed');

    const badgeEl = verdictCard.querySelector('.verdict-header');
    const amountEl = verdictCard.querySelector('.verdict-amount');
    const subEl = verdictCard.querySelector('.verdict-subtitle');
    const genEl = verdictCard.querySelector('.formula-general');
    const plugEl = verdictCard.querySelector('.formula-plugged');

    if (badgeEl) badgeEl.textContent = isRefund ? '🎉 Your Estimated Federal Tax Refund' : '⚠️ Federal Tax Balance You Owe';
    if (amountEl) amountEl.textContent = formatCurrencyExact(amount);

    if (subEl) {
      if (isRefund) {
        subEl.textContent = `You overpaid throughout the year through paychecks ($${formatCurrencyExact(taxData.withholdingCalc.result)} withheld vs $${formatCurrencyExact(taxData.totalTaxCalc.result)} owed). The IRS will refund the difference!`;
      } else {
        subEl.textContent = `Your total tax liability ($${formatCurrencyExact(taxData.totalTaxCalc.result)}) exceeds your paycheck withholding ($${formatCurrencyExact(taxData.withholdingCalc.result)}). You must pay the remaining balance to the IRS.`;
      }
    }

    if (genEl) genEl.textContent = taxData.finalResultCalc.generalFormula;
    if (plugEl) plugEl.textContent = taxData.finalResultCalc.pluggedFormula;

    // Comparison Bar
    const withheldBar = document.getElementById('comp-bar-withheld');
    const taxBar = document.getElementById('comp-bar-tax');
    const maxVal = Math.max(taxData.withholdingCalc.result, taxData.totalTaxCalc.result, 1);

    if (withheldBar) {
      const wPct = Math.min(100, (taxData.withholdingCalc.result / maxVal) * 100);
      withheldBar.style.width = `${wPct}%`;
      const valLabel = document.getElementById('comp-val-withheld');
      if (valLabel) valLabel.textContent = formatCurrencyExact(taxData.withholdingCalc.result);
    }

    if (taxBar) {
      const tPct = Math.min(100, (taxData.totalTaxCalc.result / maxVal) * 100);
      taxBar.style.width = `${tPct}%`;
      const valLabel = document.getElementById('comp-val-tax');
      if (valLabel) valLabel.textContent = formatCurrencyExact(taxData.totalTaxCalc.result);
    }
  }

  updateHeaderStats(taxData) {
    const setStat = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setStat('header-gross-income', formatCurrency(taxData.grossIncomeCalc.result));
    setStat('header-taxable-income', formatCurrency(taxData.taxableIncomeCalc.result));
    setStat('header-total-withholding', formatCurrency(taxData.withholdingCalc.result));

    const verdictPill = document.getElementById('header-verdict-pill');
    const verdictVal = document.getElementById('header-verdict-val');
    const verdictLbl = document.getElementById('header-verdict-lbl');

    if (verdictPill && verdictVal && verdictLbl) {
      const isRefund = taxData.finalResultCalc.isRefund;
      verdictPill.classList.remove('is-refund', 'is-owed');
      verdictPill.classList.add(isRefund ? 'is-refund' : 'is-owed');
      verdictLbl.textContent = isRefund ? 'EST. REFUND' : 'TAX OWED';
      verdictVal.textContent = formatCurrencyExact(taxData.finalResultCalc.result);
    }
  }

  render1040Mirror(taxData) {
    const setLine = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.textContent = formatCurrencyExact(val);
    };

    setLine('line-1040-1z', taxData.w2WagesCalc.result);
    setLine('line-1040-9', taxData.grossIncomeCalc.result);
    setLine('line-1040-10', taxData.adjustmentsCalc.result);
    setLine('line-1040-11', taxData.agiCalc.result);
    setLine('line-1040-12', taxData.deductionCalc.result);
    setLine('line-1040-15', taxData.taxableIncomeCalc.result);
    setLine('line-1040-16', taxData.taxBeforeCreditsCalc.result);
    setLine('line-1040-19', taxData.creditsCalc.result);
    setLine('line-1040-24', taxData.totalTaxCalc.result);
    setLine('line-1040-25d', taxData.withholdingCalc.result);

    const refundRow = document.getElementById('row-1040-refund');
    const owedRow = document.getElementById('row-1040-owed');

    if (refundRow && owedRow) {
      if (taxData.finalResultCalc.isRefund) {
        refundRow.style.display = 'table-row';
        owedRow.style.display = 'none';
        setLine('line-1040-34', taxData.finalResultCalc.result);
      } else {
        refundRow.style.display = 'none';
        owedRow.style.display = 'table-row';
        setLine('line-1040-37', taxData.finalResultCalc.result);
      }
    }
  }
}

// Instantiate on DOM load
window.addEventListener('DOMContentLoaded', () => {
  window.taxApp = new TaxApp();
});
