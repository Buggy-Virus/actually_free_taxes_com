/**
 * Actually Free Taxes - Main Application Controller (TypeScript)
 */

import {
  TaxAppState,
  TaxYear,
  FilingStatus,
  W2Data,
  StateTaxLine,
  IncomeSource,
  ConnectionDef,
  TaxCalculationSummary,
  BracketDetail,
  CalculationResult
} from './types.js';
import { calculateTaxes, formatCurrency, formatCurrencyExact } from './tax-engine.js';
import { ArrowEngine } from './arrow-engine.js';

export const US_STATES = [
  { code: 'AL', name: 'Alabama', noIncomeTax: false },
  { code: 'AK', name: 'Alaska', noIncomeTax: true },
  { code: 'AZ', name: 'Arizona', noIncomeTax: false },
  { code: 'AR', name: 'Arkansas', noIncomeTax: false },
  { code: 'CA', name: 'California', noIncomeTax: false },
  { code: 'CO', name: 'Colorado', noIncomeTax: false },
  { code: 'CT', name: 'Connecticut', noIncomeTax: false },
  { code: 'DE', name: 'Delaware', noIncomeTax: false },
  { code: 'DC', name: 'District of Columbia', noIncomeTax: false },
  { code: 'FL', name: 'Florida', noIncomeTax: true },
  { code: 'GA', name: 'Georgia', noIncomeTax: false },
  { code: 'HI', name: 'Hawaii', noIncomeTax: false },
  { code: 'ID', name: 'Idaho', noIncomeTax: false },
  { code: 'IL', name: 'Illinois', noIncomeTax: false },
  { code: 'IN', name: 'Indiana', noIncomeTax: false },
  { code: 'IA', name: 'Iowa', noIncomeTax: false },
  { code: 'KS', name: 'Kansas', noIncomeTax: false },
  { code: 'KY', name: 'Kentucky', noIncomeTax: false },
  { code: 'LA', name: 'Louisiana', noIncomeTax: false },
  { code: 'ME', name: 'Maine', noIncomeTax: false },
  { code: 'MD', name: 'Maryland', noIncomeTax: false },
  { code: 'MA', name: 'Massachusetts', noIncomeTax: false },
  { code: 'MI', name: 'Michigan', noIncomeTax: false },
  { code: 'MN', name: 'Minnesota', noIncomeTax: false },
  { code: 'MS', name: 'Mississippi', noIncomeTax: false },
  { code: 'MO', name: 'Missouri', noIncomeTax: false },
  { code: 'MT', name: 'Montana', noIncomeTax: false },
  { code: 'NE', name: 'Nebraska', noIncomeTax: false },
  { code: 'NV', name: 'Nevada', noIncomeTax: true },
  { code: 'NH', name: 'New Hampshire', noIncomeTax: true },
  { code: 'NJ', name: 'New Jersey', noIncomeTax: false },
  { code: 'NM', name: 'New Mexico', noIncomeTax: false },
  { code: 'NY', name: 'New York', noIncomeTax: false },
  { code: 'NC', name: 'North Carolina', noIncomeTax: false },
  { code: 'ND', name: 'North Dakota', noIncomeTax: false },
  { code: 'OH', name: 'Ohio', noIncomeTax: false },
  { code: 'OK', name: 'Oklahoma', noIncomeTax: false },
  { code: 'OR', name: 'Oregon', noIncomeTax: false },
  { code: 'PA', name: 'Pennsylvania', noIncomeTax: false },
  { code: 'RI', name: 'Rhode Island', noIncomeTax: false },
  { code: 'SC', name: 'South Carolina', noIncomeTax: false },
  { code: 'SD', name: 'South Dakota', noIncomeTax: true },
  { code: 'TN', name: 'Tennessee', noIncomeTax: true },
  { code: 'TX', name: 'Texas', noIncomeTax: true },
  { code: 'UT', name: 'Utah', noIncomeTax: false },
  { code: 'VT', name: 'Vermont', noIncomeTax: false },
  { code: 'VA', name: 'Virginia', noIncomeTax: false },
  { code: 'WA', name: 'Washington', noIncomeTax: true },
  { code: 'WV', name: 'West Virginia', noIncomeTax: false },
  { code: 'WI', name: 'Wisconsin', noIncomeTax: false },
  { code: 'WY', name: 'Wyoming', noIncomeTax: true }
];

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
        box6: 1087.50,
        states: [
          {
            id: 0,
            state: 'CA',
            stateId: '987-6543-2',
            stateWages: 75000,
            stateTaxWithheld: 3450,
            localWages: 0,
            localTaxWithheld: 0,
            localityName: ''
          }
        ]
      }
    ],
    otherIncome: {
      interest: 0,
      sources: []
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
  private stateLineCounter: number = 1;
  private incomeSourceCounter: number = 1;
  private scrollspyAttached: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    const svgEl = document.getElementById('arrow-canvas') as unknown as SVGSVGElement;
    if (svgEl) {
      this.arrowEngine = new ArrowEngine(svgEl, { showAll: this.state.showAllArrows });
    }

    this.renderW2Forms();
    this.renderIncomeSources();
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

    // Bind all Add W-2 buttons (header, section header, bottom banner, and left TOC button)
    ['btn-add-w2', 'btn-add-w2-section', 'btn-add-w2-bottom', 'btn-add-w2-toc'].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          this.addW2();
        });
      }
    });

    // Bind all Add Income Source buttons (section header and left TOC button)
    ['btn-add-income-source', 'btn-add-income-toc'].forEach(btnId => {
      const btn = document.getElementById(btnId);
      if (btn) {
        btn.addEventListener('click', () => {
          this.addIncomeSource();
        });
      }
    });

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
      'calc-fica-breakdown',
      'calc-state-tax-summary'
    ];

    cardMap.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('mouseenter', () => this.arrowEngine?.setActiveTarget(id));
        el.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
      }
    });
  }

  public addW2(): void {
    const newId = this.w2Counter++;
    // Default to a different state for multi-state scenario demo (e.g. NY for W-2 #2)
    const defaultState = newId === 1 ? 'NY' : (newId === 2 ? 'TX' : 'WA');

    this.state.w2s.push({
      id: newId,
      employer: `Employer #${newId + 1}`,
      ein: `88-${1000000 + newId}`,
      box1: 50000,
      box2: 5800,
      box3: 50000,
      box4: 3100,
      box5: 50000,
      box6: 725,
      states: [
        {
          id: this.stateLineCounter++,
          state: defaultState,
          stateId: `${defaultState}-ID-${newId + 1}`,
          stateWages: 50000,
          stateTaxWithheld: defaultState === 'TX' || defaultState === 'WA' ? 0 : 2250,
          localWages: 0,
          localTaxWithheld: 0,
          localityName: ''
        }
      ]
    });

    this.renderW2Forms();
    this.recalculateAndRender();

    // Smoothly scroll down to the newly added W-2
    const newCard = document.getElementById(`w2-card-${newId}`);
    if (newCard) {
      newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      newCard.classList.add('flash-highlight');
      setTimeout(() => newCard.classList.remove('flash-highlight'), 1200);
    }
  }

  public removeW2(id: number): void {
    if (this.state.w2s.length <= 1) {
      alert("At least one W-2 is required. You can set the amounts to $0 if needed.");
      return;
    }
    this.state.w2s = this.state.w2s.filter(w => w.id !== id);
    this.renderW2Forms();
    this.recalculateAndRender();
  }

  public addStateToW2(w2Id: number): void {
    const w2 = this.state.w2s.find(w => w.id === w2Id);
    if (!w2) return;

    if (!w2.states) w2.states = [];

    const newId = this.stateLineCounter++;
    w2.states.push({
      id: newId,
      state: 'NY',
      stateId: '',
      stateWages: Math.round(w2.box1 * 0.5),
      stateTaxWithheld: Math.round(w2.box1 * 0.5 * 0.05),
      localWages: 0,
      localTaxWithheld: 0,
      localityName: ''
    });

    this.renderW2Forms();
    this.recalculateAndRender();
  }

  public removeStateFromW2(w2Id: number, stateLineId: number): void {
    const w2 = this.state.w2s.find(w => w.id === w2Id);
    if (!w2 || !w2.states || w2.states.length <= 1) {
      alert("Each W-2 must have at least one state entry (or set to No State Tax).");
      return;
    }

    w2.states = w2.states.filter(s => s.id !== stateLineId);
    this.renderW2Forms();
    this.recalculateAndRender();
  }

  public addIncomeSource(type: '1099-NEC' | '1099-DIV' | '1099-INT' | '1099-MISC' | 'Other' = '1099-NEC'): void {
    if (!this.state.otherIncome.sources) {
      this.state.otherIncome.sources = [];
    }
    const newId = this.incomeSourceCounter++;
    const defaultPayer = type === '1099-NEC' ? 'Client Freelance Project' : (type === '1099-DIV' ? 'Vanguard Dividend Fund' : 'Consulting / Other');
    const defaultAmount = type === '1099-NEC' ? 4500 : (type === '1099-DIV' ? 1200 : 2000);

    this.state.otherIncome.sources.push({
      id: newId,
      type,
      payer: defaultPayer,
      amount: defaultAmount
    });

    this.renderIncomeSources();
    this.recalculateAndRender();

    const newCard = document.getElementById(`income-source-card-${newId}`);
    if (newCard) {
      newCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
      newCard.classList.add('flash-highlight');
      setTimeout(() => newCard.classList.remove('flash-highlight'), 1200);
    }
  }

  public removeIncomeSource(id: number): void {
    if (!this.state.otherIncome.sources) return;
    this.state.otherIncome.sources = this.state.otherIncome.sources.filter(s => s.id !== id);
    this.renderIncomeSources();
    this.recalculateAndRender();
  }

  private renderIncomeSources(): void {
    const container = document.getElementById('dynamic-income-sources-container');
    if (!container) return;

    container.innerHTML = '';
    const sources = this.state.otherIncome.sources || [];

    sources.forEach(src => {
      const card = document.createElement('div');
      card.className = 'calc-card';
      card.id = `income-source-card-${src.id}`;
      card.style.padding = '1.25rem';
      card.style.position = 'relative';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem;">
            <select class="w2-input" id="select-income-type-${src.id}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; font-weight: 700; width: auto; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; border-radius: 4px;">
              <option value="1099-NEC" ${src.type === '1099-NEC' ? 'selected' : ''}>Form 1099-NEC (Freelance/Contract)</option>
              <option value="1099-DIV" ${src.type === '1099-DIV' ? 'selected' : ''}>Form 1099-DIV (Dividends)</option>
              <option value="1099-MISC" ${src.type === '1099-MISC' ? 'selected' : ''}>Form 1099-MISC (Prizes/Other)</option>
              <option value="1099-INT" ${src.type === '1099-INT' ? 'selected' : ''}>Form 1099-INT (Interest)</option>
              <option value="Other" ${src.type === 'Other' ? 'selected' : ''}>Other Taxable Income</option>
            </select>
          </div>
          <button type="button" class="btn" id="btn-del-income-${src.id}" title="Remove this income source" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; color: #ef4444; border-color: #fecaca; background: #fef2f2;">
            ✕
          </button>
        </div>

        <div style="margin-bottom: 0.5rem;">
          <input type="text" class="w2-input" id="input-income-payer-${src.id}" value="${src.payer}" placeholder="Payer / Client Name" style="font-size: 0.85rem; font-weight: 600; padding: 0.35rem 0.6rem;">
        </div>

        <div class="w2-input-wrapper">
          <span class="currency-symbol">$</span>
          <input type="number" step="any" class="w2-input" id="input-income-source-${src.id}" value="${src.amount}" placeholder="0">
        </div>
        <div style="font-size: 0.7rem; color: #64748b; margin-top: 0.4rem;">
          Reported on 1040 line &amp; feeds directly into Gross Income.
        </div>
      `;

      container.appendChild(card);

      const typeSelect = card.querySelector(`#select-income-type-${src.id}`) as HTMLSelectElement | null;
      if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
          src.type = (e.target as HTMLSelectElement).value as any;
          this.recalculateAndRender();
        });
      }

      const payerInput = card.querySelector(`#input-income-payer-${src.id}`) as HTMLInputElement | null;
      if (payerInput) {
        payerInput.addEventListener('input', (e) => {
          src.payer = (e.target as HTMLInputElement).value;
          this.updateTableOfContents();
        });
      }

      const amtInput = card.querySelector(`#input-income-source-${src.id}`) as HTMLInputElement | null;
      if (amtInput) {
        amtInput.addEventListener('input', (e) => {
          src.amount = Number((e.target as HTMLInputElement).value) || 0;
          this.recalculateAndRender();
        });
        amtInput.addEventListener('focus', () => this.arrowEngine?.setActiveSource(`input-income-source-${src.id}`));
        amtInput.addEventListener('blur', () => this.arrowEngine?.clearActive());
        amtInput.addEventListener('mouseenter', () => this.arrowEngine?.setActiveSource(`input-income-source-${src.id}`));
        amtInput.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
      }

      const delBtn = card.querySelector(`#btn-del-income-${src.id}`) as HTMLButtonElement | null;
      if (delBtn) {
        delBtn.addEventListener('click', () => {
          this.removeIncomeSource(src.id);
        });
      }
    });
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
        box6: 1087.50,
        states: [{
          id: 0,
          state: 'CA',
          stateId: 'CA-987654',
          stateWages: 75000,
          stateTaxWithheld: 3450,
          localWages: 0,
          localTaxWithheld: 0,
          localityName: ''
        }]
      }];
      this.state.otherIncome.interest = 0;
      this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 0 };
      this.state.dependents.childrenCount = 0;
    } else if (presetName === 'multi-state-dual') {
      // Scenario with 2 jobs in 2 different states (e.g. California & New York)
      this.state.filingStatus = 'single';
      this.state.w2s = [
        {
          id: 0,
          employer: 'Silicon Valley Labs (CA)',
          ein: '94-1122334',
          box1: 65000,
          box2: 7400,
          box3: 65000,
          box4: 4030,
          box5: 65000,
          box6: 942.50,
          states: [{
            id: 0,
            state: 'CA',
            stateId: 'CA-112233',
            stateWages: 65000,
            stateTaxWithheld: 2980,
            localWages: 0,
            localTaxWithheld: 0,
            localityName: ''
          }]
        },
        {
          id: 1,
          employer: 'Empire State Media (NY)',
          ein: '13-5566778',
          box1: 45000,
          box2: 5100,
          box3: 45000,
          box4: 2790,
          box5: 45000,
          box6: 652.50,
          states: [{
            id: 1,
            state: 'NY',
            stateId: 'NY-556677',
            stateWages: 45000,
            stateTaxWithheld: 2150,
            localWages: 45000,
            localTaxWithheld: 1450,
            localityName: 'NYC'
          }]
        }
      ];
      this.state.otherIncome.interest = 200;
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
          box6: 1189,
          states: [{
            id: 0,
            state: 'IL',
            stateId: 'IL-112233',
            stateWages: 82000,
            stateTaxWithheld: 4059,
            localWages: 0,
            localTaxWithheld: 0,
            localityName: ''
          }]
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
          box6: 841,
          states: [{
            id: 1,
            state: 'WI',
            stateId: 'WI-556677',
            stateWages: 58000,
            stateTaxWithheld: 2950,
            localWages: 0,
            localTaxWithheld: 0,
            localityName: ''
          }]
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
        box6: 754,
        states: [{
          id: 0,
          state: 'TX',
          stateId: 'TX-NONE',
          stateWages: 52000,
          stateTaxWithheld: 0,
          localWages: 0,
          localTaxWithheld: 0,
          localityName: ''
        }]
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
        box6: 0,
        states: [{
          id: 0,
          state: 'CA',
          stateId: '',
          stateWages: 0,
          stateTaxWithheld: 0,
          localWages: 0,
          localTaxWithheld: 0,
          localityName: ''
        }]
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

    this.state.otherIncome.sources = [];
    this.renderW2Forms();
    this.renderIncomeSources();
    this.recalculateAndRender();
  }

  private renderYearBadges(): void {
    document.querySelectorAll('.current-tax-year-text').forEach(el => {
      el.textContent = String(this.state.year);
    });
  }

  private renderStateOptions(selectedCode: string): string {
    return US_STATES.map(s => {
      const isSel = s.code === selectedCode ? 'selected' : '';
      const noTax = s.noIncomeTax ? ' (No Income Tax)' : '';
      return `<option value="${s.code}" ${isSel}>${s.code} — ${s.name}${noTax}</option>`;
    }).join('');
  }

  private renderW2Forms(): void {
    const container = document.getElementById('w2-list-container');
    if (!container) return;

    container.innerHTML = '';

    this.state.w2s.forEach((w2: W2Data, index: number) => {
      const card = document.createElement('div');
      card.className = 'w2-card-wrapper';
      card.id = `w2-card-${w2.id}`;

      if (!w2.states || w2.states.length === 0) {
        w2.states = [{
          id: 0,
          state: 'CA',
          stateId: '',
          stateWages: w2.box1,
          stateTaxWithheld: 0,
          localWages: 0,
          localTaxWithheld: 0,
          localityName: ''
        }];
      }

      // Render state rows (Boxes 15-20)
      const stateRowsHtml = w2.states.map((st: StateTaxLine, sIdx: number) => `
        <div class="w2-state-row" id="w2-${w2.id}-state-${st.id}-row">
          <!-- Box 15: State -->
          <div class="w2-box highlight-state" id="w2-${w2.id}-state-${st.id}-box15-state">
            <div class="w2-box-header">
              <span class="w2-box-number">15</span>
              <span class="w2-box-label">State</span>
            </div>
            <select class="state-select-input" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="state">
              ${this.renderStateOptions(st.state)}
            </select>
          </div>

          <!-- Box 15: State ID -->
          <div class="w2-box">
            <div class="w2-box-header">
              <span class="w2-box-number">15</span>
              <span class="w2-box-label">Employer's state ID no.</span>
            </div>
            <input type="text" class="w2-input-text" value="${st.stateId}" placeholder="ID No."
                   data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateId">
          </div>

          <!-- Box 16: State wages -->
          <div class="w2-box" id="w2-${w2.id}-state-${st.id}-box16-container">
            <div class="w2-box-header">
              <span class="w2-box-number">16</span>
              <span class="w2-box-label">State wages, tips</span>
            </div>
            <div class="w2-input-wrapper">
              <span class="currency-symbol">$</span>
              <input type="number" step="any" class="w2-input" id="w2-${w2.id}-state-${st.id}-box16" value="${st.stateWages}" placeholder="0"
                     data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateWages">
            </div>
          </div>

          <!-- Box 17: State income tax withheld (KEY INPUT) -->
          <div class="w2-box highlight-state" id="w2-${w2.id}-state-${st.id}-box17-container">
            <div class="w2-box-header">
              <div>
                <span class="w2-box-number">17</span>
                <span class="w2-box-label">State income tax</span>
              </div>
              <span class="w2-box-badge state">${st.state} Tax</span>
            </div>
            <div class="w2-input-wrapper">
              <span class="currency-symbol">$</span>
              <input type="number" step="any" class="w2-input" id="w2-${w2.id}-state-${st.id}-box17" value="${st.stateTaxWithheld}" placeholder="0"
                     data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateTaxWithheld">
            </div>
          </div>

          <!-- Box 18: Local wages -->
          <div class="w2-box">
            <div class="w2-box-header">
              <span class="w2-box-number">18</span>
              <span class="w2-box-label">Local wages</span>
            </div>
            <div class="w2-input-wrapper">
              <span class="currency-symbol">$</span>
              <input type="number" step="any" class="w2-input" value="${st.localWages}" placeholder="0"
                     data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localWages">
            </div>
          </div>

          <!-- Box 19 & 20: Local tax & Locality -->
          <div class="w2-box">
            <div class="w2-box-header">
              <span class="w2-box-number">19/20</span>
              <span class="w2-box-label">Local tax / Locality</span>
            </div>
            <div style="display: flex; gap: 0.35rem;">
              <div class="w2-input-wrapper" style="flex: 1;">
                <span class="currency-symbol" style="font-size: 0.8rem;">$</span>
                <input type="number" step="any" class="w2-input" style="font-size: 0.85rem;" value="${st.localTaxWithheld}" placeholder="0"
                       data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localTaxWithheld">
              </div>
              <input type="text" class="w2-input-text" style="width: 70px; font-size: 0.8rem;" value="${st.localityName}" placeholder="Locality"
                     data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localityName">
            </div>
          </div>

          <!-- Delete state line action -->
          <div style="display: flex; align-items: center; justify-content: center; background: white; padding: 0 0.4rem;">
            ${w2.states.length > 1 ? `
              <button type="button" class="btn btn-sm" style="color: #ef4444; padding: 0.2rem 0.4rem; font-size: 0.75rem;"
                      data-remove-state="${w2.id}:${st.id}" title="Remove this state line">✕</button>
            ` : ''}
          </div>
        </div>
      `).join('');

      card.innerHTML = `
        <div class="w2-form">
          <div class="w2-top-strip">
            <div>
              <div class="w2-omb">OMB No. 1545-0008</div>
              <div style="font-size: 0.85rem; font-weight: 800; color: #1e293b;">
                W-2 #${index + 1}: ${w2.employer || 'Employer'} 
                <span style="font-weight: 500; color: #64748b; font-size: 0.75rem;">
                  ${w2.states.map(s => s.state).join(', ')}
                </span>
              </div>
            </div>
            <div class="w2-form-title">
              <div class="doc-code">Form W-2</div>
              <div class="doc-desc">Wage and Tax Statement</div>
            </div>
            <div style="display: flex; align-items: center; gap: 0.75rem;">
              <div class="w2-year-badge current-tax-year-text">${this.state.year}</div>
              ${this.state.w2s.length > 1 ? `
                <button type="button" class="btn btn-sm" style="color: #ef4444; border-color: #fecaca; padding: 0.25rem 0.6rem; font-size: 0.8rem; font-weight: 700;" data-remove-w2="${w2.id}">
                  ✕ Remove W-2
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

            <!-- Boxes 15-20: State and Local Taxes Section -->
            <div class="w2-state-container">
              <div style="background: #e2e8f0; padding: 0.35rem 0.75rem; font-size: 0.75rem; font-weight: 800; color: #334155; text-transform: uppercase; letter-spacing: 0.05em; display: flex; justify-content: space-between; align-items: center;">
                <span>Boxes 15–20: State & Local Income Tax Reporting</span>
                <button type="button" class="btn btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" data-add-state="${w2.id}">
                  + Add State Line to W-2 #${index + 1}
                </button>
              </div>
              ${stateRowsHtml}
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
      // Employer name & EIN
      const empInput = document.querySelector<HTMLInputElement>(`[data-w2-field="employer"][data-w2-id="${w2.id}"]`);
      if (empInput) {
        empInput.addEventListener('input', (e: Event) => {
          w2.employer = (e.target as HTMLInputElement).value;
        });
      }
      const einInput = document.querySelector<HTMLInputElement>(`[data-w2-field="ein"][data-w2-id="${w2.id}"]`);
      if (einInput) {
        einInput.addEventListener('input', (e: Event) => {
          w2.ein = (e.target as HTMLInputElement).value;
        });
      }

      // Federal Box 1 - 6
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

            // Also default state wages on first state line if matching
            if (w2.states && w2.states.length === 1 && (w2.states[0].stateWages === 0 || w2.states[0].stateWages === val)) {
              w2.states[0].stateWages = val;
              const sw = document.getElementById(`w2-${w2.id}-state-${w2.states[0].id}-box16`) as HTMLInputElement | null;
              if (sw) sw.value = String(val);
            }
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

      // State Boxes 15-20 fields
      w2.states.forEach(st => {
        const rowSelector = `[data-w2-id="${w2.id}"][data-state-id="${st.id}"]`;

        // State select dropdown
        const stateSelect = document.querySelector<HTMLSelectElement>(`select${rowSelector}[data-state-field="state"]`);
        if (stateSelect) {
          stateSelect.addEventListener('change', (e: Event) => {
            st.state = (e.target as HTMLSelectElement).value;
            const stateObj = US_STATES.find(s => s.code === st.state);
            if (stateObj?.noIncomeTax) {
              st.stateTaxWithheld = 0;
              const taxInp = document.getElementById(`w2-${w2.id}-state-${st.id}-box17`) as HTMLInputElement | null;
              if (taxInp) taxInp.value = '0';
            }
            this.recalculateAndRender();
          });
        }

        // State ID
        const stateIdInp = document.querySelector<HTMLInputElement>(`input${rowSelector}[data-state-field="stateId"]`);
        if (stateIdInp) {
          stateIdInp.addEventListener('input', (e: Event) => {
            st.stateId = (e.target as HTMLInputElement).value;
          });
        }

        // State Wages (Box 16)
        const wagesInp = document.getElementById(`w2-${w2.id}-state-${st.id}-box16`) as HTMLInputElement | null;
        if (wagesInp) {
          wagesInp.addEventListener('input', (e: Event) => {
            st.stateWages = Number((e.target as HTMLInputElement).value) || 0;
            this.recalculateAndRender();
          });
          wagesInp.addEventListener('focus', () => this.arrowEngine?.setActiveSource(`w2-${w2.id}-state-${st.id}-box16`));
          wagesInp.addEventListener('blur', () => this.arrowEngine?.clearActive());
        }

        // State Tax Withheld (Box 17) - Key Arrow Source!
        const taxInp = document.getElementById(`w2-${w2.id}-state-${st.id}-box17`) as HTMLInputElement | null;
        if (taxInp) {
          taxInp.addEventListener('input', (e: Event) => {
            st.stateTaxWithheld = Number((e.target as HTMLInputElement).value) || 0;
            this.recalculateAndRender();
          });
          taxInp.addEventListener('focus', () => this.arrowEngine?.setActiveSource(`w2-${w2.id}-state-${st.id}-box17`));
          taxInp.addEventListener('blur', () => this.arrowEngine?.clearActive());
          taxInp.addEventListener('mouseenter', () => this.arrowEngine?.setActiveSource(`w2-${w2.id}-state-${st.id}-box17`));
          taxInp.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());
        }

        // Local wages
        const localWagesInp = document.querySelector<HTMLInputElement>(`input${rowSelector}[data-state-field="localWages"]`);
        if (localWagesInp) {
          localWagesInp.addEventListener('input', (e: Event) => {
            st.localWages = Number((e.target as HTMLInputElement).value) || 0;
            this.recalculateAndRender();
          });
        }

        // Local Tax
        const localTaxInp = document.querySelector<HTMLInputElement>(`input${rowSelector}[data-state-field="localTaxWithheld"]`);
        if (localTaxInp) {
          localTaxInp.addEventListener('input', (e: Event) => {
            st.localTaxWithheld = Number((e.target as HTMLInputElement).value) || 0;
            this.recalculateAndRender();
          });
        }

        // Locality Name
        const locNameInp = document.querySelector<HTMLInputElement>(`input${rowSelector}[data-state-field="localityName"]`);
        if (locNameInp) {
          locNameInp.addEventListener('input', (e: Event) => {
            st.localityName = (e.target as HTMLInputElement).value;
          });
        }
      });
    });

    // Remove W-2 buttons
    document.querySelectorAll<HTMLElement>('[data-remove-w2]').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const idToRemove = parseInt((e.target as HTMLElement).dataset.removeW2 || '', 10);
        this.removeW2(idToRemove);
      });
    });

    // Add State to W-2 buttons
    document.querySelectorAll<HTMLElement>('[data-add-state]').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const w2Id = parseInt((e.target as HTMLElement).dataset.addState || '', 10);
        this.addStateToW2(w2Id);
      });
    });

    // Remove State from W-2 buttons
    document.querySelectorAll<HTMLElement>('[data-remove-state]').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const [w2IdStr, stateIdStr] = ((e.target as HTMLElement).dataset.removeState || '').split(':');
        this.removeStateFromW2(parseInt(w2IdStr, 10), parseInt(stateIdStr, 10));
      });
    });
  }

  private buildConnections(): ConnectionDef[] {
    const connections: ConnectionDef[] = [];

    // 1. W2 Box 1 (Wages) -> Total Wages Calc
    this.state.w2s.forEach(w => {
      connections.push({
        id: `conn-w2-${w.id}-box1-wages`,
        sourceId: `w2-${w.id}-box1`,
        targetId: 'calc-total-w2-wages',
        category: 'wages',
        label: `W-2 #${w.id + 1} Wages to Total Wages`
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

    (this.state.otherIncome.sources || []).forEach(src => {
      if (src.amount > 0) {
        connections.push({
          id: `conn-income-source-${src.id}-gross`,
          sourceId: `input-income-source-${src.id}`,
          targetId: 'calc-gross-income',
          category: 'wages',
          label: `${src.type} (${src.payer}) to Gross Income`
        });
      }
    });

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
        label: `W-2 #${w.id + 1} Box 2 Withheld`
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
        label: `W-2 #${w.id + 1} SS Tax to FICA`
      });
      connections.push({
        id: `conn-w2-${w.id}-box6-fica`,
        sourceId: `w2-${w.id}-box6`,
        targetId: 'calc-fica-breakdown',
        category: 'medicare',
        label: `W-2 #${w.id + 1} Medicare Tax to FICA`
      });
    });

    // 13. State Tax Withholding Connections (Box 17 -> State Summary)
    this.state.w2s.forEach(w => {
      (w.states || []).forEach(st => {
        connections.push({
          id: `conn-w2-${w.id}-state-${st.id}-tax`,
          sourceId: `w2-${w.id}-state-${st.id}-box17`,
          targetId: 'calc-state-tax-summary',
          category: 'state',
          label: `${st.state} State Tax Withheld`
        });
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

    // Render State Tax Summary Card
    this.renderStateTaxSummary(taxData);

    this.render1040Mirror(taxData);
    this.updateHeaderStats(taxData);

    const connections = this.buildConnections();
    if (this.arrowEngine) {
      this.arrowEngine.setConnections(connections);
    }

    this.updateTableOfContents();
  }

  private renderStateTaxSummary(taxData: TaxCalculationSummary): void {
    const card = document.getElementById('calc-state-tax-summary');
    if (!card) return;

    const genEl = card.querySelector('.formula-general');
    const plugEl = card.querySelector('.formula-plugged');
    const valEl = card.querySelector('.calc-output-value');

    if (genEl) genEl.textContent = taxData.stateTaxCalc.generalFormula;
    if (plugEl) plugEl.textContent = taxData.stateTaxCalc.pluggedFormula;
    if (valEl) valEl.textContent = formatCurrencyExact(taxData.stateTaxCalc.totalStateWithheld);

    const tbody = document.getElementById('state-summary-tbody');
    if (tbody) {
      tbody.innerHTML = '';
      if (taxData.stateTaxCalc.byState.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No state tax lines entered.</td></tr>`;
      } else {
        taxData.stateTaxCalc.byState.forEach(st => {
          const stateObj = US_STATES.find(s => s.code === st.state);
          const stateName = stateObj ? `${stateObj.code} (${stateObj.name})` : st.state;
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td><strong>${stateName}</strong></td>
            <td>${formatCurrency(st.stateWages)}</td>
            <td style="color: #7c3aed; font-weight: 700;">${formatCurrencyExact(st.stateTaxWithheld)}</td>
            <td>${formatCurrencyExact(st.localTaxWithheld)}</td>
          `;
          tbody.appendChild(tr);
        });
      }
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

  private updateTableOfContents(): void {
    const listContainer = document.getElementById('toc-w2-list');
    const counterEl = document.getElementById('toc-w2-count');
    if (listContainer) {
      listContainer.innerHTML = '';

      if (counterEl) {
        counterEl.textContent = `${this.state.w2s.length} ${this.state.w2s.length === 1 ? 'W-2' : 'W-2s'}`;
      }

      this.state.w2s.forEach((w2, index) => {
        const link = document.createElement('a');
        link.className = 'toc-link is-w2';
        link.href = `#w2-card-${w2.id}`;
        link.dataset.tocTarget = `w2-card-${w2.id}`;

        const statesLabel = (w2.states && w2.states.length > 0)
          ? w2.states.map(s => s.state).join('/')
          : 'Federal';

        const empName = w2.employer ? (w2.employer.length > 13 ? w2.employer.substring(0, 13) + '…' : w2.employer) : `W-2 #${index + 1}`;

        link.innerHTML = `
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            W-2 #${index + 1}: ${empName}
          </span>
          <span class="toc-badge">${statesLabel}</span>
        `;

        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById(`w2-card-${w2.id}`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('flash-highlight');
            setTimeout(() => target.classList.remove('flash-highlight'), 1200);
          }
        });

        listContainer.appendChild(link);
      });
    }

    // Dynamic Income Sources in Table of Contents
    const incomeListContainer = document.getElementById('toc-income-list');
    const incomeCounterEl = document.getElementById('toc-income-count');
    if (incomeListContainer) {
      incomeListContainer.innerHTML = '';
      const sources = this.state.otherIncome.sources || [];
      const totalIncomeCount = 1 + sources.length; // 1099-INT + dynamic sources

      if (incomeCounterEl) {
        incomeCounterEl.textContent = `${totalIncomeCount} ${totalIncomeCount === 1 ? 'Source' : 'Sources'}`;
      }

      // Default Taxable Interest
      const intLink = document.createElement('a');
      intLink.className = 'toc-link is-income';
      intLink.href = '#card-other-interest';
      intLink.dataset.tocTarget = 'card-other-interest';
      intLink.innerHTML = `
        <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
          Taxable Interest
        </span>
        <span class="toc-badge">1099-INT</span>
      `;
      intLink.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById('card-other-interest');
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('flash-highlight');
          setTimeout(() => target.classList.remove('flash-highlight'), 1200);
        }
      });
      incomeListContainer.appendChild(intLink);

      // Extra Income Sources
      sources.forEach((src, idx) => {
        const link = document.createElement('a');
        link.className = 'toc-link is-income';
        link.href = `#income-source-card-${src.id}`;
        link.dataset.tocTarget = `income-source-card-${src.id}`;

        const name = src.payer ? (src.payer.length > 13 ? src.payer.substring(0, 13) + '…' : src.payer) : `Income #${idx + 1}`;

        link.innerHTML = `
          <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
            ${name}
          </span>
          <span class="toc-badge">${src.type}</span>
        `;

        link.addEventListener('click', (e) => {
          e.preventDefault();
          const target = document.getElementById(`income-source-card-${src.id}`);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('flash-highlight');
            setTimeout(() => target.classList.remove('flash-highlight'), 1200);
          }
        });

        incomeListContainer.appendChild(link);
      });
    }

    this.bindTocScrollspy();
  }

  private bindTocScrollspy(): void {
    document.querySelectorAll<HTMLAnchorElement>('.toc-link:not(.is-w2):not(.is-income)').forEach(link => {
      link.onclick = (e) => {
        e.preventDefault();
        const targetId = link.dataset.tocTarget;
        if (targetId) {
          const target = document.getElementById(targetId);
          if (target) {
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('flash-highlight');
            setTimeout(() => target.classList.remove('flash-highlight'), 1200);
          }
        }
      };
    });

    if (!this.scrollspyAttached) {
      this.scrollspyAttached = true;
      window.addEventListener('scroll', () => {
        const links = document.querySelectorAll<HTMLAnchorElement>('.toc-link');
        const scrollPos = window.scrollY + 200;

        let currentActive: HTMLAnchorElement | null = null;
        for (const link of Array.from(links)) {
          const targetId = link.dataset.tocTarget;
          if (targetId) {
            const el = document.getElementById(targetId);
            if (el) {
              const top = el.offsetTop;
              const height = el.offsetHeight;
              if (scrollPos >= top && scrollPos < top + height + 70) {
                currentActive = link;
              }
            }
          }
        }

        if (currentActive) {
          links.forEach(l => l.classList.remove('active'));
          (currentActive as HTMLAnchorElement).classList.add('active');
        }
      }, { passive: true });
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  (window as any).taxApp = new TaxApp();
});
