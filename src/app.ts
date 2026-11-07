/**
 * Actually Free Taxes - Main Application Controller (TypeScript)
 */

import {
  TaxAppState,
  TaxYear,
  FilingStatus,
  W2Data,
  ConnectionDef,
  TaxCalculationSummary,
  BracketDetail,
  CalculationResult
} from './types.js';
import { calculateTaxes, formatCurrency, formatCurrencyExact } from './tax-engine.js';
import { ArrowEngine } from './arrow-engine.js';

class TaxApp {
  private state: TaxAppState = {
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

  private arrowEngine: ArrowEngine | null = null;
  private w2Counter: number = 1;

  constructor() {
    this.init();
  }

  private init(): void {
    const svgEl = document.getElementById('arrow-canvas') as unknown as SVGSVGElement;
    if (svgEl) {
      this.arrowEngine = new ArrowEngine(svgEl, { showAll: this.state.showAllArrows });
    }

    this.renderW2Forms();
    this.bindGlobalEvents();
    this.recalculateAndRender();
  }

  private bindGlobalEvents(): void {
    const yearSelect = document.getElementById('select-tax-year') as HTMLSelectElement | null;
    if (yearSelect) {
      yearSelect.value = String(this.state.year);
      yearSelect.addEventListener('change', (e: Event) => {
        this.state.year = parseInt((e.target as HTMLSelectElement).value, 10) as TaxYear;
        this.renderYearBadges();
        this.recalculateAndRender();
      });
    }

    const statusSelect = document.getElementById('select-filing-status') as HTMLSelectElement | null;
    if (statusSelect) {
      statusSelect.value = this.state.filingStatus;
      statusSelect.addEventListener('change', (e: Event) => {
        this.state.filingStatus = (e.target as HTMLSelectElement).value as FilingStatus;
        this.recalculateAndRender();
      });
    }

    const toggleArrows = document.getElementById('toggle-all-arrows') as HTMLInputElement | null;
    if (toggleArrows) {
      toggleArrows.checked = this.state.showAllArrows;
      toggleArrows.addEventListener('change', (e: Event) => {
        this.state.showAllArrows = (e.target as HTMLInputElement).checked;
        if (this.arrowEngine) {
          this.arrowEngine.setShowAll(this.state.showAllArrows);
        }
      });
    }

    const addW2Btn = document.getElementById('btn-add-w2') as HTMLButtonElement | null;
    if (addW2Btn) {
      addW2Btn.addEventListener('click', () => {
        this.addW2();
      });
    }

    document.querySelectorAll<HTMLElement>('[data-preset]').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const target = (e.target as HTMLElement).closest('[data-preset]') as HTMLElement;
        const preset = target.dataset.preset;
        if (preset) {
          this.loadPreset(preset);
        }
      });
    });

    const bindInput = (id: string, setter: (val: number) => void) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) {
        el.addEventListener('input', (e: Event) => {
          setter(Number((e.target as HTMLInputElement).value) || 0);
          this.recalculateAndRender();
        });
        el.addEventListener('focus', () => this.arrowEngine?.setActiveSource(id));
        el.addEventListener('blur', () => this.arrowEngine?.clearActive());
        el.addEventListener('mouseenter', () => this.arrowEngine?.setActiveSource(id));
        el.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
      }
    };

    bindInput('input-adj-student-loan', val => this.state.adjustments.studentLoan = val);
    bindInput('input-adj-ira', val => this.state.adjustments.ira = val);
    bindInput('input-adj-hsa', val => this.state.adjustments.hsa = val);
    bindInput('input-other-interest', val => this.state.otherIncome.interest = val);
    bindInput('input-children-count', val => this.state.dependents.childrenCount = val);

    this.bindCardInspectors();
  }

  private bindCardInspectors(): void {
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
        el.addEventListener('mouseenter', () => this.arrowEngine?.setActiveTarget(id));
        el.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
      }
    });
  }

  private addW2(): void {
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

  private removeW2(id: number): void {
    if (this.state.w2s.length <= 1) {
      alert("At least one W-2 is required. You can set the values to $0 if needed.");
      return;
    }
    this.state.w2s = this.state.w2s.filter(w => w.id !== id);
    this.renderW2Forms();
    this.recalculateAndRender();
  }

  private loadPreset(presetName: string): void {
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

    const statusSelect = document.getElementById('select-filing-status') as HTMLSelectElement | null;
    if (statusSelect) statusSelect.value = this.state.filingStatus;

    const setVal = (id: string, val: number) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = String(val);
    };
    setVal('input-adj-student-loan', this.state.adjustments.studentLoan);
    setVal('input-adj-ira', this.state.adjustments.ira);
    setVal('input-adj-hsa', this.state.adjustments.hsa);
    setVal('input-other-interest', this.state.otherIncome.interest);
    setVal('input-children-count', this.state.dependents.childrenCount);

    this.renderW2Forms();
    this.recalculateAndRender();
  }

  private renderYearBadges(): void {
    document.querySelectorAll('.current-tax-year-text').forEach(el => {
      el.textContent = String(this.state.year);
    });
  }

  private renderW2Forms(): void {
    const container = document.getElementById('w2-list-container');
    if (!container) return;

    container.innerHTML = '';

    this.state.w2s.forEach((w2: W2Data, index: number) => {
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
            <div class="w2-box">
              <div class="w2-box-header">
                <span class="w2-box-number">a</span>
                <span class="w2-box-label">Employee's social security number</span>
              </div>
              <input type="text" class="w2-input-text" value="***-**-1234" readonly>
            </div>

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

            <div class="w2-box">
              <div class="w2-box-header">
                <span class="w2-box-number">b</span>
                <span class="w2-box-label">Employer identification number (EIN)</span>
              </div>
              <input type="text" class="w2-input-text" value="${w2.ein}" data-w2-field="ein" data-w2-id="${w2.id}">
            </div>

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

            <div class="w2-box">
              <div class="w2-box-header">
                <span class="w2-box-number">c</span>
                <span class="w2-box-label">Employer's name, address, and ZIP</span>
              </div>
              <input type="text" class="w2-input-text" value="${w2.employer}" data-w2-field="employer" data-w2-id="${w2.id}">
            </div>

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

    this.bindW2Events();
  }

  private bindW2Events(): void {
    this.state.w2s.forEach(w2 => {
      const bindW2Field = (boxNum: number, propName: keyof W2Data, autoFillFICA = false) => {
        const inputId = `w2-${w2.id}-box${boxNum}`;
        const inputEl = document.getElementById(inputId) as HTMLInputElement | null;
        if (!inputEl) return;

        inputEl.addEventListener('input', (e: Event) => {
          const val = Number((e.target as HTMLInputElement).value) || 0;
          (w2 as any)[propName] = val;

          if (autoFillFICA && (w2.box3 === 0 || w2.box3 === w2.box1)) {
            w2.box3 = val;
            w2.box4 = Math.round(val * 0.062 * 100) / 100;
            w2.box5 = val;
            w2.box6 = Math.round(val * 0.0145 * 100) / 100;

            const b3 = document.getElementById(`w2-${w2.id}-box3`) as HTMLInputElement | null;
            const b4 = document.getElementById(`w2-${w2.id}-box4`) as HTMLInputElement | null;
            const b5 = document.getElementById(`w2-${w2.id}-box5`) as HTMLInputElement | null;
            const b6 = document.getElementById(`w2-${w2.id}-box6`) as HTMLInputElement | null;
            if (b3) b3.value = String(w2.box3);
            if (b4) b4.value = String(w2.box4);
            if (b5) b5.value = String(w2.box5);
            if (b6) b6.value = String(w2.box6);
          }

          this.recalculateAndRender();
        });

        inputEl.addEventListener('focus', () => this.arrowEngine?.setActiveSource(inputId));
        inputEl.addEventListener('blur', () => this.arrowEngine?.clearActive());
        inputEl.addEventListener('mouseenter', () => this.arrowEngine?.setActiveSource(inputId));
        inputEl.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
      };

      bindW2Field(1, 'box1', true);
      bindW2Field(2, 'box2');
      bindW2Field(3, 'box3');
      bindW2Field(4, 'box4');
      bindW2Field(5, 'box5');
      bindW2Field(6, 'box6');
    });

    document.querySelectorAll<HTMLElement>('[data-remove-w2]').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const idToRemove = parseInt((e.target as HTMLElement).dataset.removeW2 || '', 10);
        this.removeW2(idToRemove);
      });
    });
  }

  private buildConnections(): ConnectionDef[] {
    const connections: ConnectionDef[] = [];

    this.state.w2s.forEach(w => {
      connections.push({
        id: `conn-w2-${w.id}-box1-wages`,
        sourceId: `w2-${w.id}-box1`,
        targetId: 'calc-total-w2-wages',
        category: 'wages',
        label: 'Wages to Total Wages'
      });
    });

    connections.push({
      id: 'conn-wages-gross',
      sourceId: 'calc-total-w2-wages',
      targetId: 'calc-gross-income',
      category: 'wages',
      label: 'Total Wages to Gross Income'
    });

    if (this.state.otherIncome.interest > 0) {
      connections.push({
        id: 'conn-interest-gross',
        sourceId: 'input-other-interest',
        targetId: 'calc-gross-income',
        category: 'wages',
        label: 'Interest to Gross Income'
      });
    }

    connections.push({
      id: 'conn-adj-student-loan',
      sourceId: 'input-adj-student-loan',
      targetId: 'calc-total-adjustments',
      category: 'adjustments',
      label: 'Student Loan to Adjustments'
    });

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

    connections.push({
      id: 'conn-status-deduction',
      sourceId: 'select-filing-status',
      targetId: 'calc-standard-deduction',
      category: 'status',
      label: 'Status sets Standard Deduction'
    });

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

    connections.push({
      id: 'conn-taxable-tentative',
      sourceId: 'calc-taxable-income',
      targetId: 'calc-tax-before-credits',
      category: 'tax',
      label: 'Taxable Income to Tax Brackets'
    });

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

    this.state.w2s.forEach(w => {
      connections.push({
        id: `conn-w2-${w.id}-box2-withheld`,
        sourceId: `w2-${w.id}-box2`,
        targetId: 'calc-total-withholding',
        category: 'withholding',
        label: 'W-2 Box 2 Withheld'
      });
    });

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

  private recalculateAndRender(): void {
    const taxData = calculateTaxes(this.state);

    const updateCard = (cardId: string, calcObj: CalculationResult, formattedVal: string) => {
      const card = document.getElementById(cardId);
      if (!card) return;

      const genEl = card.querySelector('.formula-general');
      const plugEl = card.querySelector('.formula-plugged');
      const valEl = card.querySelector('.calc-output-value');

      if (genEl && calcObj.generalFormula) genEl.textContent = calcObj.generalFormula;
      if (plugEl && calcObj.pluggedFormula) plugEl.textContent = calcObj.pluggedFormula;
      if (valEl && formattedVal) valEl.textContent = formattedVal;
    };

    updateCard('calc-total-w2-wages', taxData.w2WagesCalc, formatCurrency(taxData.w2WagesCalc.result));
    updateCard('calc-gross-income', taxData.grossIncomeCalc, formatCurrency(taxData.grossIncomeCalc.result));
    updateCard('calc-total-adjustments', taxData.adjustmentsCalc, formatCurrency(taxData.adjustmentsCalc.result));
    updateCard('calc-agi', taxData.agiCalc, formatCurrency(taxData.agiCalc.result));
    updateCard('calc-standard-deduction', taxData.deductionCalc, formatCurrency(taxData.deductionCalc.result));
    updateCard('calc-taxable-income', taxData.taxableIncomeCalc, formatCurrency(taxData.taxableIncomeCalc.result));
    updateCard('calc-tax-before-credits', taxData.taxBeforeCreditsCalc, formatCurrencyExact(taxData.taxBeforeCreditsCalc.result));
    this.renderTaxBrackets(taxData.taxBeforeCreditsCalc.brackets, taxData.taxableIncomeCalc.result);

    updateCard('calc-total-credits', taxData.creditsCalc, formatCurrency(taxData.creditsCalc.result));
    updateCard('calc-total-tax-liability', taxData.totalTaxCalc, formatCurrencyExact(taxData.totalTaxCalc.result));
    updateCard('calc-total-withholding', taxData.withholdingCalc, formatCurrencyExact(taxData.withholdingCalc.result));

    this.renderVerdict(taxData);
    updateCard('calc-fica-breakdown', taxData.ficaCalc, formatCurrencyExact(taxData.ficaCalc.totalFica));
    this.render1040Mirror(taxData);
    this.updateHeaderStats(taxData);

    const connections = this.buildConnections();
    if (this.arrowEngine) {
      this.arrowEngine.setConnections(connections);
    }
  }

  private renderTaxBrackets(brackets: BracketDetail[], taxableIncome: number): void {
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

  private renderVerdict(taxData: TaxCalculationSummary): void {
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

    const withheldBar = document.getElementById('comp-bar-withheld') as HTMLElement | null;
    const taxBar = document.getElementById('comp-bar-tax') as HTMLElement | null;
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

  private updateHeaderStats(taxData: TaxCalculationSummary): void {
    const setStat = (id: string, text: string) => {
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

  private render1040Mirror(taxData: TaxCalculationSummary): void {
    const setLine = (id: string, val: number) => {
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

window.addEventListener('DOMContentLoaded', () => {
  (window as any).taxApp = new TaxApp();
});
