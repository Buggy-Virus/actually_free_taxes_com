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
  CalculationResult,
  DeductionMethod,
  StateReturnCalculation,
  StateOtherStateCredit
} from './types.js';
import { calculateTaxes, formatCurrency, formatCurrencyExact } from './tax-engine.js';
import { ArrowEngine } from './arrow-engine.js';
import { renderRatingPill, renderRatingCardHtml, getFieldRating, renderFieldExplanationDrawer, renderExplainToggleBtn } from './field-ratings.js';

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

const STORAGE_KEY_DRAFT = 'aft_local_draft_v2';
const STORAGE_KEY_TOS = 'aft_tos_accepted_v1';

function getDefaultTaxAppState(): TaxAppState {
  return {
    year: 2024,
    filingStatus: 'single',
    residentState: 'CA',
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
      sources: [],
      capitalGains: { shortTerm: 0, longTerm: 0 },
      scheduleCExpenses: 0
    },
    adjustments: {
      studentLoan: 0,
      ira: 0,
      hsa: 0
    },
    dependents: {
      childrenCount: 0
    },
    itemizedDeductions: {
      medicalExpenses: 0,
      realEstateTax: 0,
      mortgageInterest: 0,
      charity: 0
    },
    deductionMethod: 'auto',
    showAllArrows: true
  };
}

interface IrsAddressInfo {
  centerName: string;
  addressLines: string[];
  destState: string;
  destType: string;
}

function getOfficialIrsMailingAddress(stateCode: string, isRefund: boolean): IrsAddressInfo {
  const austinStates = ['FL', 'GA', 'MS', 'NC', 'SC'];
  const kansasCityStates = ['AL', 'AR', 'CT', 'DE', 'DC', 'IL', 'IN', 'IA', 'KY', 'LA', 'ME', 'MD', 'MA', 'MN', 'MO', 'NH', 'NJ', 'NY', 'RI', 'TN', 'VT', 'VA', 'WV'];

  if (isRefund) {
    if (austinStates.includes(stateCode)) {
      return {
        centerName: "Austin Submission Processing Center",
        addressLines: [
          "Department of the Treasury",
          "Internal Revenue Service",
          "Austin, TX 73301-0002"
        ],
        destState: stateCode,
        destType: "Refund Return"
      };
    } else if (kansasCityStates.includes(stateCode)) {
      return {
        centerName: "Kansas City Submission Processing Center",
        addressLines: [
          "Department of the Treasury",
          "Internal Revenue Service",
          "Kansas City, MO 64999-0002"
        ],
        destState: stateCode,
        destType: "Refund Return"
      };
    } else {
      return {
        centerName: "Ogden Submission Processing Center",
        addressLines: [
          "Department of the Treasury",
          "Internal Revenue Service",
          "Ogden, UT 84201-0002"
        ],
        destState: stateCode,
        destType: "Refund Return"
      };
    }
  } else {
    // Payment enclosed
    if (austinStates.includes(stateCode)) {
      return {
        centerName: "Charlotte Payment Lockbox",
        addressLines: [
          "Internal Revenue Service",
          "P.O. Box 1214",
          "Charlotte, NC 28201-1214"
        ],
        destState: stateCode,
        destType: "Payment Enclosed"
      };
    } else if (kansasCityStates.includes(stateCode)) {
      return {
        centerName: "Louisville Payment Lockbox",
        addressLines: [
          "Internal Revenue Service",
          "P.O. Box 931000",
          "Louisville, KY 40293-1000"
        ],
        destState: stateCode,
        destType: "Payment Enclosed"
      };
    } else {
      return {
        centerName: "Cincinnati Payment Lockbox",
        addressLines: [
          "Internal Revenue Service",
          "P.O. Box 802501",
          "Cincinnati, OH 45280-2501"
        ],
        destState: stateCode,
        destType: "Payment Enclosed"
      };
    }
  }
}

class TaxApp {
  private state: TaxAppState = getDefaultTaxAppState();

  private arrowEngine: ArrowEngine | null = null;
  private w2Counter: number = 1;
  private stateLineCounter: number = 1;
  private incomeSourceCounter: number = 1;
  private scrollspyAttached: boolean = false;
  private isTosAccepted: boolean = false;

  constructor() {
    this.init();
  }

  private init(): void {
    const svgEl = document.getElementById('arrow-canvas') as unknown as SVGSVGElement;
    if (svgEl) {
      this.arrowEngine = new ArrowEngine(svgEl, { showAll: this.state.showAllArrows });
    }

    // Check TOS acceptance on first page open
    this.checkTosOnLoad();

    // Check if URL specifies a preset
    let loadedFromPreset = false;
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const presetParam = urlParams.get('preset');
      if (presetParam) {
        this.loadPreset(presetParam);
        loadedFromPreset = true;
      }
    }

    // If no preset in URL, restore saved progress from localStorage if available
    if (!loadedFromPreset) {
      this.loadDraft();
    }

    this.renderW2Forms();
    this.renderIncomeSources();
    this.syncAllDomInputs();
    this.bindGlobalEvents();
    this.recalculateAndRender();

    // Support URL parameters for automated testing & deep-linking
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const modalParam = urlParams.get('modal');
      if (modalParam) {
        this.openGuidanceModal(modalParam);
      }
      const expandParam = urlParams.get('expand');
      if (expandParam === 'all') {
        const globalToggle = document.getElementById('btn-toggle-all-explain') as HTMLButtonElement | null;
        if (globalToggle) globalToggle.click();
      }
      const scrollParam = urlParams.get('scroll');
      if (scrollParam) {
        const num = parseInt(scrollParam, 10);
        if (!isNaN(num)) {
          window.scrollTo(0, num);
        } else {
          const target = document.getElementById(scrollParam);
          if (target) {
            target.scrollIntoView({ behavior: 'auto', block: 'start' });
            window.scrollBy(0, -70);
          }
        }
      }
    }
  }

  /* --------------------------------------------------------------------------
     TOS & Legal Advisory Modal Methods
     -------------------------------------------------------------------------- */
  private checkTosOnLoad(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      if (window.location) {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('preset') || urlParams.get('notos') === '1') {
          this.isTosAccepted = true;
          return;
        }
      }
      const accepted = localStorage.getItem(STORAGE_KEY_TOS);
      if (accepted === 'true') {
        this.isTosAccepted = true;
      } else {
        this.isTosAccepted = false;
        // Automatically present the legal advisory & TOS on first open
        this.openTosModal();
      }
    } catch (e) {
      console.warn("Could not check TOS status in localStorage:", e);
    }
  }

  public openTosModal(): void {
    const overlay = document.getElementById('tos-modal-overlay');
    if (overlay) {
      overlay.classList.add('open');
    }
  }

  public closeTosModal(): void {
    const overlay = document.getElementById('tos-modal-overlay');
    if (overlay) {
      overlay.classList.remove('open');
    }
  }

  public acceptTos(): void {
    const checkbox = document.getElementById('tos-confirm-checkbox') as HTMLInputElement | null;
    if (checkbox && !checkbox.checked) {
      alert("Please confirm you have read and agree to the Terms of Service.");
      return;
    }
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_TOS, 'true');
      } catch (e) {
        console.warn("Could not record TOS acceptance:", e);
      }
    }
    this.isTosAccepted = true;
    this.closeTosModal();
  }

  /* --------------------------------------------------------------------------
     Client-Side Local Storage & Auto-Save Methods
     -------------------------------------------------------------------------- */
  private saveDraft(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(this.state));
      const statusText = document.getElementById('storage-status-text');
      const dot = document.getElementById('storage-dot');
      if (statusText) {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        statusText.textContent = `Draft auto-saved locally (${timeStr})`;
      }
      if (dot) {
        dot.style.background = '#10b981';
      }
    } catch (e) {
      console.warn("Could not save tax draft to localStorage:", e);
    }
  }

  private loadDraft(): boolean {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.w2s) && parsed.w2s.length > 0) {
        this.state = parsed;
        this.updateIdCounters();
        const statusText = document.getElementById('storage-status-text');
        if (statusText) {
          statusText.textContent = "Restored saved draft from this device";
        }
        return true;
      }
    } catch (e) {
      console.warn("Failed to load saved tax draft:", e);
    }
    return false;
  }

  public clearDraft(): void {
    if (typeof window !== 'undefined') {
      const confirmed = window.confirm("Are you sure you want to clear your saved tax progress and reset to blank/default?");
      if (!confirmed) return;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY_DRAFT);
        } catch (e) {
          console.warn("Failed to remove saved draft:", e);
        }
      }
      this.state = getDefaultTaxAppState();
      this.updateIdCounters();
      this.syncAllDomInputs();
      this.renderW2Forms();
      this.renderIncomeSources();
      this.recalculateAndRender();
      const statusText = document.getElementById('storage-status-text');
      if (statusText) {
        statusText.textContent = "Saved data cleared. Started fresh.";
      }
    }
  }

  public exportDraft(): void {
    if (typeof window === 'undefined') return;
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(this.state, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `actually_free_taxes_${this.state.year}_draft.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      alert("Could not export backup: " + (e as Error).message);
    }
  }

  public importDraft(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && Array.isArray(parsed.w2s) && parsed.w2s.length > 0) {
          this.state = parsed;
          this.updateIdCounters();
          this.syncAllDomInputs();
          this.renderW2Forms();
          this.renderIncomeSources();
          this.recalculateAndRender();
          const statusText = document.getElementById('storage-status-text');
          if (statusText) {
            statusText.textContent = `Imported backup (${file.name}) successfully!`;
          }
          alert(`Successfully imported backup file: ${file.name}`);
        } else {
          alert("Invalid tax backup file format. Expected an ActuallyFreeTaxes JSON file with W-2 entries.");
        }
      } catch (err) {
        alert("Failed to read backup file. Please ensure it is a valid JSON file.");
      }
    };
    reader.readAsText(file);
  }

  private updateIdCounters(): void {
    let maxW2 = 0;
    let maxState = 0;
    (this.state.w2s || []).forEach(w => {
      if (w.id >= maxW2) maxW2 = w.id + 1;
      (w.states || []).forEach(s => {
        if (s.id >= maxState) maxState = s.id + 1;
      });
    });
    this.w2Counter = Math.max(1, maxW2);
    this.stateLineCounter = Math.max(1, maxState);

    let maxInc = 0;
    (this.state.otherIncome?.sources || []).forEach(src => {
      if (src.id >= maxInc) maxInc = src.id + 1;
    });
    this.incomeSourceCounter = Math.max(1, maxInc);
  }

  private syncAllDomInputs(): void {
    const yearSelect = document.getElementById('select-tax-year') as HTMLSelectElement | null;
    if (yearSelect) yearSelect.value = String(this.state.year);

    const statusSelect = document.getElementById('select-filing-status') as HTMLSelectElement | null;
    if (statusSelect) statusSelect.value = this.state.filingStatus;

    const resSelect = document.getElementById('select-resident-state') as HTMLSelectElement | null;
    if (resSelect) resSelect.value = this.state.residentState || 'CA';

    const dedSelect = document.getElementById('select-deduction-method') as HTMLSelectElement | null;
    if (dedSelect) dedSelect.value = this.state.deductionMethod || 'auto';

    const setVal = (id: string, val: number | undefined) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (el) el.value = String(val !== undefined ? val : 0);
    };

    setVal('input-adj-student-loan', this.state.adjustments?.studentLoan);
    setVal('input-adj-ira', this.state.adjustments?.ira);
    setVal('input-adj-hsa', this.state.adjustments?.hsa);
    setVal('input-other-interest', this.state.otherIncome?.interest);
    setVal('input-children-count', this.state.dependents?.childrenCount);
    setVal('input-capital-gains-st', this.state.otherIncome?.capitalGains?.shortTerm);
    setVal('input-capital-gains-lt', this.state.otherIncome?.capitalGains?.longTerm);
    setVal('input-1099-nec-expenses', this.state.otherIncome?.scheduleCExpenses);
    setVal('input-itemized-medical', this.state.itemizedDeductions?.medicalExpenses);
    setVal('input-itemized-salt', this.state.itemizedDeductions?.realEstateTax);
    setVal('input-itemized-mortgage', this.state.itemizedDeductions?.mortgageInterest);
    setVal('input-itemized-charity', this.state.itemizedDeductions?.charity);

    this.renderYearBadges();
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

    const resStateSelect = document.getElementById('select-resident-state') as HTMLSelectElement | null;
    if (resStateSelect) {
      resStateSelect.value = this.state.residentState || 'CA';
      resStateSelect.addEventListener('change', (e: Event) => {
        this.state.residentState = (e.target as HTMLSelectElement).value;
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

    const getCapitalGains = () => {
      if (!this.state.otherIncome.capitalGains) {
        this.state.otherIncome.capitalGains = { shortTerm: 0, longTerm: 0 };
      }
      return this.state.otherIncome.capitalGains;
    };
    const getItemized = () => {
      if (!this.state.itemizedDeductions) {
        this.state.itemizedDeductions = { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 0 };
      }
      return this.state.itemizedDeductions;
    };

    // Capital gains & Schedule C expenses
    bindInput('input-capital-gains-st', val => getCapitalGains().shortTerm = val);
    bindInput('input-capital-gains-lt', val => getCapitalGains().longTerm = val);
    bindInput('input-1099-nec-expenses', val => this.state.otherIncome.scheduleCExpenses = val);

    // Schedule A Itemized deductions
    bindInput('input-itemized-medical', val => getItemized().medicalExpenses = val);
    bindInput('input-itemized-salt', val => getItemized().realEstateTax = val);
    bindInput('input-itemized-mortgage', val => getItemized().mortgageInterest = val);
    bindInput('input-itemized-charity', val => getItemized().charity = val);

    const dedMethodSelect = document.getElementById('select-deduction-method') as HTMLSelectElement | null;
    if (dedMethodSelect) {
      dedMethodSelect.value = this.state.deductionMethod || 'auto';
      dedMethodSelect.addEventListener('change', (e: Event) => {
        this.state.deductionMethod = (e.target as HTMLSelectElement).value as DeductionMethod;
        this.recalculateAndRender();
      });
    }

    this.bindCardInspectors();
    this.bindGuidanceModalEvents();
    this.bindFilterToolbar();
    this.bindRatingPillEvents();
    this.bindExplainEvents();

    // TOS modal bindings
    const btnAcceptTos = document.getElementById('btn-accept-tos');
    if (btnAcceptTos) {
      btnAcceptTos.addEventListener('click', () => this.acceptTos());
    }

    const btnCloseTos = document.getElementById('btn-close-tos-modal');
    if (btnCloseTos) {
      btnCloseTos.addEventListener('click', () => {
        if (!this.isTosAccepted) {
          alert("You must review and accept the Terms of Service to proceed.");
          return;
        }
        this.closeTosModal();
      });
    }

    // Open TOS from header, storage bar, or footer
    ['btn-header-tos', 'btn-open-tos', 'btn-footer-tos'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => this.openTosModal());
      }
    });

    // Local Storage toolbar bindings
    ['btn-clear-draft', 'btn-footer-clear'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => this.clearDraft());
      }
    });

    const btnExport = document.getElementById('btn-export-draft');
    if (btnExport) {
      btnExport.addEventListener('click', () => this.exportDraft());
    }

    const btnImportTrigger = document.getElementById('btn-import-draft-trigger');
    const inputImport = document.getElementById('input-import-draft') as HTMLInputElement | null;
    if (btnImportTrigger && inputImport) {
      btnImportTrigger.addEventListener('click', () => {
        inputImport.click();
      });
      inputImport.addEventListener('change', () => {
        if (inputImport.files && inputImport.files.length > 0) {
          this.importDraft(inputImport.files[0]);
          inputImport.value = ''; // reset
        }
      });
    }

    // Filing Walkthrough & Download modal buttons
    const btnOpenFiling = document.getElementById('btn-open-filing-modal');
    if (btnOpenFiling) {
      btnOpenFiling.addEventListener('click', () => this.openFilingModal('tab-print'));
    }

    const btnQuickPrint = document.getElementById('btn-quick-print-1040');
    if (btnQuickPrint) {
      btnQuickPrint.addEventListener('click', () => this.printOfficialPacket());
    }

    const btnQuickExport = document.getElementById('btn-quick-export-json');
    if (btnQuickExport) {
      btnQuickExport.addEventListener('click', () => this.exportDraft());
    }

    ['btn-close-filing-modal', 'btn-close-filing-bottom'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) {
        btn.addEventListener('click', () => this.closeFilingModal());
      }
    });

    const btnPrintPacket = document.getElementById('btn-print-official-packet');
    if (btnPrintPacket) {
      btnPrintPacket.addEventListener('click', () => this.printOfficialPacket());
    }

    const btnDownloadPacketJson = document.getElementById('btn-download-packet-json');
    if (btnDownloadPacketJson) {
      btnDownloadPacketJson.addEventListener('click', () => this.exportDraft());
    }

    document.querySelectorAll<HTMLElement>('[data-filing-tab]').forEach(tabBtn => {
      tabBtn.addEventListener('click', (e: Event) => {
        const target = (e.target as HTMLElement).closest('[data-filing-tab]') as HTMLElement;
        const tabId = target.dataset.filingTab;
        if (tabId) {
          this.switchFilingTab(tabId);
        }
      });
    });

    const btnSubmitEfile = document.getElementById('btn-submit-mock-efile');
    if (btnSubmitEfile) {
      btnSubmitEfile.addEventListener('click', () => this.submitMockEfile());
    }
  }

  /* --------------------------------------------------------------------------
     Filing Walkthrough, Auto-Address & Download Methods
     -------------------------------------------------------------------------- */
  public openFilingModal(initialTab: string = 'tab-print'): void {
    const taxData = calculateTaxes(this.state);
    const addr = getOfficialIrsMailingAddress(this.state.residentState || 'CA', taxData.finalResultCalc.isRefund);

    // Update snapshots
    const snapWages = document.getElementById('fmodal-snap-wages');
    const snapTaxable = document.getElementById('fmodal-snap-taxable');
    const snapState = document.getElementById('fmodal-snap-state');
    const snapVerdict = document.getElementById('fmodal-snap-verdict');

    if (snapWages) snapWages.textContent = formatCurrency(taxData.w2WagesCalc.result);
    if (snapTaxable) snapTaxable.textContent = formatCurrency(taxData.taxableIncomeCalc.result);
    if (snapState) snapState.textContent = this.state.residentState || 'CA';
    if (snapVerdict) {
      if (taxData.finalResultCalc.isRefund) {
        snapVerdict.className = 'snapshot-value is-refund';
        snapVerdict.textContent = `REFUND: ${formatCurrencyExact(taxData.finalResultCalc.result)}`;
      } else {
        snapVerdict.className = 'snapshot-value is-owed';
        snapVerdict.textContent = `OWED: ${formatCurrencyExact(taxData.finalResultCalc.result)}`;
      }
    }

    // Update Tab 1: Print & Mail
    const destStateEl = document.getElementById('envelope-dest-state');
    const destTypeEl = document.getElementById('envelope-dest-type');
    const addrEl = document.getElementById('envelope-official-address');
    if (destStateEl) destStateEl.textContent = addr.destState;
    if (destTypeEl) destTypeEl.textContent = addr.destType;
    if (addrEl) addrEl.innerHTML = addr.addressLines.join('<br>');

    // Update Tab 2: Direct File
    const dfWages = document.getElementById('cs-df-wages');
    const dfWithheld = document.getElementById('cs-df-withheld');
    const dfAgi = document.getElementById('cs-df-agi');
    const dfDeduction = document.getElementById('cs-df-deduction');
    const dfCredits = document.getElementById('cs-df-credits');
    const dfVerdict = document.getElementById('cs-df-verdict');
    const dfBanner = document.getElementById('direct-file-state-banner');

    if (dfWages) dfWages.textContent = formatCurrency(taxData.w2WagesCalc.result);
    if (dfWithheld) dfWithheld.textContent = formatCurrencyExact(taxData.withholdingCalc.result);
    if (dfAgi) dfAgi.textContent = formatCurrency(taxData.agiCalc.result);
    if (dfDeduction) dfDeduction.textContent = formatCurrency(taxData.deductionCalc.result);
    if (dfCredits) dfCredits.textContent = formatCurrency(taxData.creditsCalc.result);
    if (dfVerdict) {
      dfVerdict.textContent = taxData.finalResultCalc.isRefund
        ? `Refund: ${formatCurrencyExact(taxData.finalResultCalc.result)}`
        : `Owed: ${formatCurrencyExact(taxData.finalResultCalc.result)}`;
      dfVerdict.style.color = taxData.finalResultCalc.isRefund ? '#16a34a' : '#dc2626';
    }

    const directFileStates = ['AZ', 'CA', 'FL', 'MA', 'NV', 'NH', 'NY', 'NC', 'PA', 'SD', 'TN', 'TX', 'WA', 'WI', 'WY'];
    const isDfState = directFileStates.includes(this.state.residentState || 'CA');
    if (dfBanner) {
      if (isDfState) {
        dfBanner.innerHTML = `✅ <strong>IRS Direct File is available in your home state (${this.state.residentState || 'CA'})!</strong> You can file both your federal return and state transition through this free government tool.`;
        dfBanner.style.background = "#ecfdf5";
        dfBanner.style.borderColor = "#a7f3d0";
        dfBanner.style.color = "#065f46";
      } else {
        dfBanner.innerHTML = `ℹ️ <strong>IRS Direct File rollout notice:</strong> Your state (${this.state.residentState || 'CA'}) may not be on the initial Direct File pilot roster, but you can always use <strong>Option 1 (Print & Mail)</strong> or <strong>Option 3 (Free File Fillable Forms)</strong> for 100% free filing.`;
        dfBanner.style.background = "#eff6ff";
        dfBanner.style.borderColor = "#bfdbfe";
        dfBanner.style.color = "#1e40af";
      }
    }

    // Update Tab 3: Free File Fillable Forms
    const setT3 = (id: string, val: string) => {
      const el = document.getElementById(id);
      if (el) el.textContent = val;
    };
    setT3('cs-ff-1z', formatCurrency(taxData.w2WagesCalc.result));
    setT3('cs-ff-9', formatCurrency(taxData.grossIncomeCalc.result));
    setT3('cs-ff-10', formatCurrency(taxData.adjustmentsCalc.result));
    setT3('cs-ff-11', formatCurrency(taxData.agiCalc.result));
    setT3('cs-ff-12', formatCurrency(taxData.deductionCalc.result));
    setT3('cs-ff-15', formatCurrency(taxData.taxableIncomeCalc.result));
    setT3('cs-ff-16', formatCurrencyExact(taxData.taxBeforeCreditsCalc.result));
    setT3('cs-ff-19', formatCurrency(taxData.creditsCalc.result));
    setT3('cs-ff-24', formatCurrencyExact(taxData.totalTaxCalc.result));
    setT3('cs-ff-25d', formatCurrencyExact(taxData.withholdingCalc.result));
    setT3('cs-ff-final', taxData.finalResultCalc.isRefund
      ? `Line 34 (Refund): ${formatCurrencyExact(taxData.finalResultCalc.result)}`
      : `Line 37 (Owed): ${formatCurrencyExact(taxData.finalResultCalc.result)}`
    );

    this.switchFilingTab(initialTab);
    const overlay = document.getElementById('filing-modal-overlay');
    if (overlay) overlay.classList.add('open');
  }

  public closeFilingModal(): void {
    const overlay = document.getElementById('filing-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  public switchFilingTab(tabId: string): void {
    document.querySelectorAll('.filing-tab-btn').forEach(btn => {
      if ((btn as HTMLElement).dataset.filingTab === tabId) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    document.querySelectorAll('.filing-tab-panel').forEach(panel => {
      if (panel.id === tabId) {
        panel.classList.add('active');
      } else {
        panel.classList.remove('active');
      }
    });
  }

  public printOfficialPacket(): void {
    const taxData = calculateTaxes(this.state);
    const addr = getOfficialIrsMailingAddress(this.state.residentState || 'CA', taxData.finalResultCalc.isRefund);
    const w = window.open('', '_blank');
    if (!w) {
      alert("Please allow popups to open the printable Form 1040 packet.");
      return;
    }
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>IRS Form 1040 & Mailing Slip — ActuallyFreeTaxes</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; padding: 2.5rem; color: #0f172a; max-width: 820px; margin: 0 auto; line-height: 1.5; }
          .header { border-bottom: 3px solid #0f172a; padding-bottom: 0.75rem; margin-bottom: 1.5rem; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 1.5rem; font-weight: 800; margin: 0; }
          .subtitle { font-size: 0.9rem; color: #64748b; }
          .envelope-slip { border: 2px dashed #475569; padding: 1.5rem; border-radius: 8px; margin: 2rem 0; page-break-after: always; position: relative; }
          .envelope-label { position: absolute; top: -12px; left: 16px; background: #fff; padding: 0 8px; font-weight: 800; font-size: 0.75rem; color: #475569; }
          .envelope-grid { display: flex; justify-content: space-between; margin-bottom: 1.5rem; font-size: 0.85rem; }
          .stamp-box { border: 1px dotted #94a3b8; width: 60px; height: 70px; display: flex; align-items: center; justify-content: center; font-size: 0.65rem; text-align: center; }
          .dest-address { font-family: monospace; font-size: 1.1rem; font-weight: 700; background: #f8fafc; padding: 1rem 1.5rem; border-radius: 6px; border: 1px solid #e2e8f0; }
          table { width: 100%; border-collapse: collapse; margin-top: 1rem; font-size: 0.9rem; }
          th { background: #f1f5f9; padding: 0.6rem; text-align: left; border-bottom: 2px solid #cbd5e1; }
          td { padding: 0.6rem; border-bottom: 1px solid #e2e8f0; }
          .td-num { font-weight: 700; font-family: monospace; text-align: right; }
          .highlight { background: #f0fdf4; font-weight: 800; }
          @media print {
            button { display: none !important; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div style="text-align: right; margin-bottom: 1rem;">
          <button onclick="window.print()" style="padding: 0.5rem 1rem; font-weight: 700; background: #10b981; color: #fff; border: none; border-radius: 6px; cursor: pointer;">🖨️ Print Now</button>
        </div>
        <div class="header">
          <div>
            <h1 class="title">Form 1040 U.S. Individual Income Tax Return Summary</h1>
            <div class="subtitle">Tax Year ${this.state.year} • Generated by ActuallyFreeTaxes.com</div>
          </div>
          <div style="text-align: right; font-size: 0.85rem;">
            <strong>Filing Status:</strong> ${this.state.filingStatus.toUpperCase()}<br>
            <strong>State:</strong> ${this.state.residentState || 'CA'}
          </div>
        </div>

        <h3>1. Filing Instructions &amp; Paper Checklist</h3>
        <ol style="font-size: 0.9rem; color: #334155; line-height: 1.6;">
          <li>Print this page and the cut-out mailing slip below.</li>
          <li>Staple <strong>Copy B</strong> of your Form(s) W-2 to the front left margin.</li>
          <li>Sign and date Page 2, Line 38 in ink before mailing (both spouses if Married Filing Jointly).</li>
          <li>Cut out the address slip below, tape it to a standard #10 envelope, affix postage, and drop into any USPS mailbox.</li>
        </ol>

        <div class="envelope-slip">
          <div class="envelope-label">✂️ CUT OUT AND AFFIX TO ENVELOPE</div>
          <div class="envelope-grid">
            <div>
              <strong>From:</strong><br>
              [Your Name]<br>
              [Your Street Address]<br>
              [City, State ZIP]
            </div>
            <div class="stamp-box">AFFIX<br>USPS<br>STAMP</div>
          </div>
          <div style="font-size: 0.75rem; text-transform: uppercase; color: #64748b; margin-bottom: 0.25rem;">
            Send to: ${addr.centerName} (${addr.destType})
          </div>
          <div class="dest-address">
            ${addr.addressLines.join('<br>')}
          </div>
        </div>

        <h3>2. Official Form 1040 Line-by-Line Breakdown</h3>
        <table>
          <thead>
            <tr><th>Line</th><th>IRS Form 1040 Description</th><th style="text-align: right;">Calculated Amount</th></tr>
          </thead>
          <tbody>
            <tr><td>Line 1z</td><td>Total amount from Form(s) W-2, Box 1</td><td class="td-num">${formatCurrency(taxData.w2WagesCalc.result)}</td></tr>
            <tr><td>Line 9</td><td>Total Income</td><td class="td-num">${formatCurrency(taxData.grossIncomeCalc.result)}</td></tr>
            <tr><td>Line 10</td><td>Adjustments to Income from Schedule 1</td><td class="td-num">${formatCurrency(taxData.adjustmentsCalc.result)}</td></tr>
            <tr><td>Line 11</td><td><strong>Adjusted Gross Income (AGI)</strong></td><td class="td-num">${formatCurrency(taxData.agiCalc.result)}</td></tr>
            <tr><td>Line 12</td><td>Standard or Itemized Deduction</td><td class="td-num">${formatCurrency(taxData.deductionCalc.result)}</td></tr>
            <tr><td>Line 15</td><td><strong>Taxable Income</strong></td><td class="td-num">${formatCurrency(taxData.taxableIncomeCalc.result)}</td></tr>
            <tr><td>Line 16</td><td>Tax (From Rate Schedules)</td><td class="td-num">${formatCurrencyExact(taxData.taxBeforeCreditsCalc.result)}</td></tr>
            <tr><td>Line 19</td><td>Child Tax Credit / Dependent Credits</td><td class="td-num">${formatCurrency(taxData.creditsCalc.result)}</td></tr>
            <tr><td>Line 24</td><td><strong>Total Tax Liability</strong></td><td class="td-num">${formatCurrencyExact(taxData.totalTaxCalc.result)}</td></tr>
            <tr><td>Line 25d</td><td>Federal Income Tax Withheld</td><td class="td-num">${formatCurrencyExact(taxData.withholdingCalc.result)}</td></tr>
            <tr class="highlight">
              <td>${taxData.finalResultCalc.isRefund ? 'Line 34' : 'Line 37'}</td>
              <td><strong>${taxData.finalResultCalc.isRefund ? 'AMOUNT OVERPAID (YOUR REFUND)' : 'AMOUNT YOU OWE TO THE IRS'}</strong></td>
              <td class="td-num" style="font-size: 1.1rem; color: ${taxData.finalResultCalc.isRefund ? '#16a34a' : '#dc2626'};">${formatCurrencyExact(taxData.finalResultCalc.result)}</td>
            </tr>
          </tbody>
        </table>
      </body>
      </html>
    `;
    w.document.open();
    w.document.write(html);
    w.document.close();
  }

  public submitMockEfile(): void {
    const emailInp = document.getElementById('efile-input-email') as HTMLInputElement | null;
    const phoneInp = document.getElementById('efile-input-phone') as HTMLInputElement | null;
    const tcpaChk = document.getElementById('efile-tcpa-consent') as HTMLInputElement | null;
    const simBox = document.getElementById('efile-simulation-status');
    const simTitle = document.getElementById('efile-sim-title');
    const simDesc = document.getElementById('efile-sim-desc');
    const submitBtn = document.getElementById('btn-submit-mock-efile') as HTMLButtonElement | null;

    if (!emailInp || !emailInp.value.trim() || !emailInp.value.includes('@')) {
      alert("Please provide a valid contact email for IRS transmission notifications.");
      emailInp?.focus();
      return;
    }
    if (!phoneInp || !phoneInp.value.trim() || phoneInp.value.trim().length < 7) {
      alert("Please provide a valid mobile cell number for SMS filing alerts.");
      phoneInp?.focus();
      return;
    }
    if (!tcpaChk || !tcpaChk.checked) {
      alert("Please check the consent box to receive automated SMS updates regarding your filing status.");
      tcpaChk?.focus();
      return;
    }

    if (submitBtn) submitBtn.disabled = true;
    if (simBox) simBox.classList.add('active');

    if (simTitle && simDesc) {
      simTitle.textContent = "⏳ 1/3: Validating IRS MeF XML Schema...";
      simDesc.textContent = "Checking W-2 wage totals and withholding cross-references...";
    }

    setTimeout(() => {
      if (simTitle && simDesc) {
        simTitle.textContent = "🔒 2/3: Transmitting to IRS EFIN Gateway...";
        simDesc.textContent = `Encrypting packet via TLS 1.3 and relaying to IRS Submission Center (Contact: ${emailInp.value})...`;
      }
    }, 1200);

    setTimeout(() => {
      const trackingId = 'AFT-' + this.state.year + '-' + Math.floor(100000 + Math.random() * 900000);
      if (simTitle && simDesc) {
        simTitle.textContent = "✅ 3/3: Submission Successful! IRS Tracking ID: #" + trackingId;
        simDesc.innerHTML = `Your return has been received by the IRS Modernized e-File system (Status: <strong>PENDING_IRS_ACCEPTANCE</strong>). Confirmation and SMS updates dispatched to <strong>${emailInp.value}</strong> and <strong>${phoneInp.value}</strong>!`;
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = "✓ e-Filing Transmitted (ID: #" + trackingId + ")";
        submitBtn.style.background = "#059669";
      }
    }, 2800);
  }

  public openGuidanceModal(fieldKey: string): void {
    const modalEl = document.getElementById('guidance-modal-overlay');
    const bodyEl = document.getElementById('guidance-modal-body');
    if (!modalEl || !bodyEl) return;

    bodyEl.innerHTML = renderRatingCardHtml(fieldKey);
    modalEl.classList.add('open');
  }

  public closeGuidanceModal(): void {
    const modalEl = document.getElementById('guidance-modal-overlay');
    if (modalEl) {
      modalEl.classList.remove('open');
    }
  }

  private bindGuidanceModalEvents(): void {
    const modalEl = document.getElementById('guidance-modal-overlay');
    const closeBtn = document.getElementById('btn-close-guidance-modal');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.closeGuidanceModal());
    }
    if (modalEl) {
      modalEl.addEventListener('click', (e) => {
        if (e.target === modalEl) {
          this.closeGuidanceModal();
        }
      });
    }
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeGuidanceModal();
      }
    });
  }

  private bindRatingPillEvents(): void {
    document.querySelectorAll<HTMLElement>('[data-rating-field]').forEach(pill => {
      pill.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const fieldKey = pill.dataset.ratingField;
        if (fieldKey) {
          this.openGuidanceModal(fieldKey);
        }
      };
      pill.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          const fieldKey = pill.dataset.ratingField;
          if (fieldKey) {
            this.openGuidanceModal(fieldKey);
          }
        }
      };
    });
  }

  public bindExplainEvents(): void {
    document.querySelectorAll<HTMLButtonElement>('.btn-explain-toggle').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const targetId = btn.dataset.explainTarget;
        if (!targetId) return;
        const drawer = document.getElementById(targetId);
        if (!drawer) return;

        const isOpen = drawer.classList.contains('open');
        if (isOpen) {
          drawer.classList.remove('open');
          drawer.setAttribute('hidden', '');
          drawer.setAttribute('aria-hidden', 'true');
          btn.setAttribute('aria-expanded', 'false');
          btn.classList.remove('active');
        } else {
          drawer.classList.add('open');
          drawer.removeAttribute('hidden');
          drawer.setAttribute('aria-hidden', 'false');
          btn.setAttribute('aria-expanded', 'true');
          btn.classList.add('active');
        }
      };
    });

    document.querySelectorAll<HTMLButtonElement>('[data-close-drawer]').forEach(closeBtn => {
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        const drawerId = closeBtn.dataset.closeDrawer;
        if (!drawerId) return;
        const drawer = document.getElementById(drawerId);
        if (!drawer) return;
        drawer.classList.remove('open');
        drawer.setAttribute('hidden', '');
        drawer.setAttribute('aria-hidden', 'true');
        const toggleBtn = document.querySelector<HTMLButtonElement>(`[data-explain-target="${drawerId}"]`);
        if (toggleBtn) {
          toggleBtn.setAttribute('aria-expanded', 'false');
          toggleBtn.classList.remove('active');
        }
      };
    });

    const globalToggle = document.getElementById('btn-toggle-all-explain') as HTMLButtonElement | null;
    if (globalToggle && !globalToggle.dataset.bound) {
      globalToggle.dataset.bound = 'true';
      let allExpanded = false;
      globalToggle.addEventListener('click', () => {
        allExpanded = !allExpanded;
        const drawers = document.querySelectorAll<HTMLElement>('.field-explain-drawer');
        const toggleBtns = document.querySelectorAll<HTMLButtonElement>('.btn-explain-toggle');

        drawers.forEach(drawer => {
          if (allExpanded) {
            drawer.classList.add('open');
            drawer.removeAttribute('hidden');
            drawer.setAttribute('aria-hidden', 'false');
          } else {
            drawer.classList.remove('open');
            drawer.setAttribute('hidden', '');
            drawer.setAttribute('aria-hidden', 'true');
          }
        });

        toggleBtns.forEach(btn => {
          btn.setAttribute('aria-expanded', allExpanded ? 'true' : 'false');
          if (allExpanded) btn.classList.add('active');
          else btn.classList.remove('active');
        });

        globalToggle.innerHTML = allExpanded
          ? '🔒 Collapse All Explanations'
          : '💡 Expand All Explanations';
        globalToggle.style.background = allExpanded ? '#fef3c7' : '#f0fdf4';
        globalToggle.style.color = allExpanded ? '#b45309' : '#15803d';
        globalToggle.style.borderColor = allExpanded ? '#fde68a' : '#bbf7d0';
      });
    }
  }

  private bindFilterToolbar(): void {
    const toolbar = document.getElementById('ratings-filter-toolbar');
    if (!toolbar) return;

    toolbar.querySelectorAll<HTMLButtonElement>('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        toolbar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');

        const filter = chip.dataset.filter;
        document.body.classList.remove('filter-must-only', 'filter-savers-only', 'filter-hide-niche');

        if (filter === 'must-only') {
          document.body.classList.add('filter-must-only');
        } else if (filter === 'savers-only') {
          document.body.classList.add('filter-savers-only');
        } else if (filter === 'hide-niche') {
          document.body.classList.add('filter-hide-niche');
        }
      });
    });

    const legendBtn = document.getElementById('btn-open-ratings-legend');
    if (legendBtn) {
      legendBtn.addEventListener('click', () => {
        this.openGuidanceModal('w2-box1');
      });
    }
  }

  private bindCardInspectors(): void {
    const cardMap = [
      'calc-total-w2-wages',
      'calc-gross-income',
      'calc-capital-gains',
      'calc-total-adjustments',
      'calc-agi',
      'calc-itemized-deductions',
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
      let ratingKey = 'income-1099-nec';
      let priorityClass = 'priority-must';
      if (src.type === '1099-DIV') {
        ratingKey = 'income-1099-div';
        priorityClass = 'priority-verify';
      } else if (src.type === '1099-MISC' || src.type === 'Other') {
        ratingKey = 'income-1099-misc';
        priorityClass = 'priority-skip';
      } else if (src.type === '1099-INT') {
        ratingKey = 'other-interest';
        priorityClass = 'priority-verify';
      }

      const card = document.createElement('div');
      card.className = `calc-card ${priorityClass}`;
      card.id = `income-source-card-${src.id}`;
      card.style.padding = '1.25rem';
      card.style.position = 'relative';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <select class="w2-input" id="select-income-type-${src.id}" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; font-weight: 700; width: auto; background: #e0f2fe; color: #0284c7; border: 1px solid #bae6fd; border-radius: 4px;">
              <option value="1099-NEC" ${src.type === '1099-NEC' ? 'selected' : ''}>Form 1099-NEC (Freelance/Contract)</option>
              <option value="1099-DIV" ${src.type === '1099-DIV' ? 'selected' : ''}>Form 1099-DIV (Dividends)</option>
              <option value="1099-MISC" ${src.type === '1099-MISC' ? 'selected' : ''}>Form 1099-MISC (Prizes/Other)</option>
              <option value="1099-INT" ${src.type === '1099-INT' ? 'selected' : ''}>Form 1099-INT (Interest)</option>
              <option value="Other" ${src.type === 'Other' ? 'selected' : ''}>Other Taxable Income</option>
            </select>
            ${renderExplainToggleBtn(`drawer-explain-income-${src.id}`)}
            ${renderRatingPill(ratingKey)}
          </div>
          <button type="button" class="btn" id="btn-del-income-${src.id}" title="Remove this income source" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; color: #ef4444; border-color: #fecaca; background: #fef2f2;">
            ✕
          </button>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <input type="text" class="w2-input" id="input-income-payer-${src.id}" value="${src.payer}" placeholder="Payer / Client Name" style="font-size: 0.85rem; font-weight: 600; padding: 0.35rem 0.6rem; flex: 2;">
          <select class="w2-input" id="select-income-state-${src.id}" style="font-size: 0.8rem; padding: 0.35rem 0.5rem; flex: 1;" title="State where this income was earned">
            <option value="">Default (Home State)</option>
            ${US_STATES.map(s => `<option value="${s.code}" ${src.state === s.code ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join('')}
          </select>
        </div>

        <div class="w2-input-wrapper">
          <span class="currency-symbol">$</span>
          <input type="number" step="any" class="w2-input" id="input-income-source-${src.id}" value="${src.amount}" placeholder="0">
        </div>
        <div style="font-size: 0.7rem; color: #64748b; margin-top: 0.4rem;">
          Reported on 1040 line &amp; feeds directly into Gross Income and State Sourced Income.
        </div>
        ${renderFieldExplanationDrawer(ratingKey, `drawer-explain-income-${src.id}`)}
      `;

      container.appendChild(card);

      const typeSelect = card.querySelector(`#select-income-type-${src.id}`) as HTMLSelectElement | null;
      if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
          src.type = (e.target as HTMLSelectElement).value as any;
          this.recalculateAndRender();
        });
      }

      const stateSelect = card.querySelector(`#select-income-state-${src.id}`) as HTMLSelectElement | null;
      if (stateSelect) {
        stateSelect.addEventListener('change', (e) => {
          src.state = (e.target as HTMLSelectElement).value || undefined;
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
      card.className = 'w2-literal-card';
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

      const st0 = w2.states[0];
      const st1 = w2.states.length > 1 ? w2.states[1] : null;
      const extraStates = w2.states.length > 2 ? w2.states.slice(2) : [];

      // Extra states HTML for states 3+
      const extraStatesHtml = extraStates.length > 0 ? `
        <div class="w2-extra-states-container">
          <div style="font-size: 0.8rem; font-weight: 800; color: #334155; margin-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
            <span>Additional State & Local Lines (States 3+)</span>
            <button type="button" class="btn btn-sm" style="font-size: 0.75rem; padding: 0.2rem 0.5rem;" data-add-state="${w2.id}">
              + Add Another State Line
            </button>
          </div>
          <div class="w2-grid" style="grid-template-columns: 1fr 1.2fr 1.2fr 1.2fr 1fr 1fr auto;">
            ${extraStates.map(st => `
              <div class="w2-box priority-must">
                <div class="w2-box-header"><span class="w2-box-label">Box 15 State</span></div>
                <select class="state-select-input" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="state">
                  ${this.renderStateOptions(st.state)}
                </select>
              </div>
              <div class="w2-box priority-skip">
                <div class="w2-box-header"><span class="w2-box-label">Box 15 ID</span></div>
                <input type="text" class="w2-input-text" value="${st.stateId}" placeholder="ID No." data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateId">
              </div>
              <div class="w2-box priority-must" id="w2-${w2.id}-state-${st.id}-box16-container">
                <div class="w2-box-header">
                  <span class="w2-box-label">Box 16 Wages</span>
                  ${renderRatingPill('w2-box16')}
                </div>
                <div class="w2-input-wrapper">
                  <span class="currency-symbol">$</span>
                  <input type="number" step="any" class="w2-input" id="w2-${w2.id}-state-${st.id}-box16" value="${st.stateWages}" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateWages">
                </div>
              </div>
              <div class="w2-box highlight-state priority-must priority-saver" id="w2-${w2.id}-state-${st.id}-box17-container">
                <div class="w2-box-header">
                  <span class="w2-box-label">Box 17 Tax</span>
                  ${renderRatingPill('w2-box17')}
                </div>
                <div class="w2-input-wrapper">
                  <span class="currency-symbol">$</span>
                  <input type="number" step="any" class="w2-input" id="w2-${w2.id}-state-${st.id}-box17" value="${st.stateTaxWithheld}" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateTaxWithheld">
                </div>
              </div>
              <div class="w2-box priority-skip">
                <div class="w2-box-header"><span class="w2-box-label">Box 18 Local Wg</span></div>
                <div class="w2-input-wrapper">
                  <span class="currency-symbol">$</span>
                  <input type="number" step="any" class="w2-input" value="${st.localWages}" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localWages">
                </div>
              </div>
              <div class="w2-box priority-skip">
                <div class="w2-box-header"><span class="w2-box-label">Box 19/20 Local</span></div>
                <div class="w2-input-wrapper">
                  <span class="currency-symbol">$</span>
                  <input type="number" step="any" class="w2-input" value="${st.localTaxWithheld}" placeholder="Tax" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localTaxWithheld">
                </div>
              </div>
              <div style="display: flex; align-items: center; justify-content: center; padding: 0 0.5rem; background: white;">
                <button type="button" class="btn btn-sm" style="color: #ef4444; padding: 0.2rem 0.4rem;" data-remove-state="${w2.id}:${st.id}">✕</button>
              </div>
            `).join('')}
          </div>
        </div>
      ` : '';

      card.innerHTML = `
        <!-- Card Header Toolbar -->
        <div class="w2-literal-toolbar">
          <div class="toolbar-left">
            <span class="doc-badge">Official IRS W-2 Overlay</span>
            <span class="w2-title">W-2 #${index + 1}: ${w2.employer || 'Employer'}</span>
            <div class="state-tag-list">
              ${w2.states.map(s => `<span class="state-tag">${s.state}</span>`).join('')}
            </div>
          </div>
          <div class="toolbar-right">
            <button type="button" class="btn btn-sm" style="background: rgba(255,255,255,0.15); color: #ffffff; border-color: rgba(255,255,255,0.3); font-weight: 700; font-size: 0.8rem;" data-add-state="${w2.id}">
              + Add State Line
            </button>
            ${this.state.w2s.length > 1 ? `
              <button type="button" class="btn btn-sm" style="color: #fca5a5; border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.1); font-weight: 700; font-size: 0.8rem;" data-remove-w2="${w2.id}">
                ✕ Remove W-2
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Scrollable Document Canvas with Literal IRS Form W-2 Background -->
        <div class="w2-literal-scroll">
          <div class="w2-literal-container" id="w2-${w2.id}-doc-canvas">
            <!-- Box a: Employee's Social Security Number -->
            <div class="w2-overlay-box box-a">
              <input type="text" class="w2-overlay-input" value="***-**-1234" readonly style="letter-spacing: 0.1em; color: #475569;">
            </div>

            <!-- Box b: Employer Identification Number (EIN) -->
            <div class="w2-overlay-box box-b">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-ein', true)}
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-ein`, '')}
              </div>
              <input type="text" class="w2-overlay-input" value="${w2.ein}" data-w2-field="ein" data-w2-id="${w2.id}" placeholder="00-0000000">
            </div>

            <!-- Box c: Employer's name, address, and ZIP code -->
            <div class="w2-overlay-box box-c">
              <textarea class="w2-overlay-textarea" data-w2-field="employer" data-w2-id="${w2.id}" placeholder="Employer Name, Address, City, State ZIP">${w2.employer}</textarea>
            </div>

            <!-- Box d: Control number -->
            <div class="w2-overlay-box box-d">
              <input type="text" class="w2-overlay-input" placeholder="Optional" value="">
            </div>

            <!-- Box e: Employee's first name and initial, last name -->
            <div class="w2-overlay-box box-e">
              <input type="text" class="w2-overlay-input" placeholder="Employee Name" value="Jane Q. Taxpayer">
            </div>

            <!-- Box f: Employee's address and ZIP code -->
            <div class="w2-overlay-box box-f">
              <input type="text" class="w2-overlay-input" placeholder="123 Main St, Apt 4B, City, State ZIP" value="123 Taxpayer Way, San Francisco, CA 94105">
            </div>

            <!-- Box 1: Wages, tips, other compensation (KEY ARROW SOURCE) -->
            <div class="w2-overlay-box box-1 box-highlight-wages" id="w2-${w2.id}-box1-container">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-box1', true)}
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box1`, '')}
              </div>
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box1" value="${w2.box1}" placeholder="0">
              </div>
            </div>

            <!-- Box 2: Federal income tax withheld (KEY ARROW SOURCE) -->
            <div class="w2-overlay-box box-2 box-highlight-withholding" id="w2-${w2.id}-box2-container">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-box2', true)}
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box2`, '')}
              </div>
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box2" value="${w2.box2}" placeholder="0">
              </div>
            </div>

            <!-- Box 3: Social security wages -->
            <div class="w2-overlay-box box-3 box-highlight-ss" id="w2-${w2.id}-box3-container">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-box3', true)}
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box3`, '')}
              </div>
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box3" value="${w2.box3}" placeholder="0">
              </div>
            </div>

            <!-- Box 4: Social security tax withheld (KEY ARROW SOURCE) -->
            <div class="w2-overlay-box box-4 box-highlight-ss" id="w2-${w2.id}-box4-container">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-box3', true)}
              </div>
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box4" value="${w2.box4}" placeholder="0">
              </div>
            </div>

            <!-- Box 5: Medicare wages and tips -->
            <div class="w2-overlay-box box-5 box-highlight-medicare" id="w2-${w2.id}-box5-container">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-box5', true)}
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box5`, '')}
              </div>
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box5" value="${w2.box5}" placeholder="0">
              </div>
            </div>

            <!-- Box 6: Medicare tax withheld (KEY ARROW SOURCE) -->
            <div class="w2-overlay-box box-6 box-highlight-medicare" id="w2-${w2.id}-box6-container">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-box5', true)}
              </div>
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box6" value="${w2.box6}" placeholder="0">
              </div>
            </div>

            <!-- Box 7: Social security tips -->
            <div class="w2-overlay-box box-7">
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" value="" placeholder="0">
              </div>
            </div>

            <!-- Box 8: Allocated tips -->
            <div class="w2-overlay-box box-8">
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" value="" placeholder="0">
              </div>
            </div>

            <!-- Box 10: Dependent care benefits -->
            <div class="w2-overlay-box box-10">
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" value="" placeholder="0">
              </div>
            </div>

            <!-- Box 11: Nonqualified plans -->
            <div class="w2-overlay-box box-11">
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" value="" placeholder="0">
              </div>
            </div>

            <!-- Box 12: Deferred Compensation / Benefits (Code & Amount) -->
            <div class="w2-overlay-box box-12" id="w2-${w2.id}-box12-container">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-box12', true)}
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-box12`, '')}
              </div>
              <div style="display: flex; gap: 4px; align-items: center; width: 100%;">
                <input type="text" class="w2-overlay-input" style="width: 44px; text-transform: uppercase; text-align: center; font-weight: 800;" value="${w2.box12Code || ''}" placeholder="Code" data-w2-id="${w2.id}" data-w2-field="box12Code">
                <div class="w2-overlay-input-wrap" style="flex: 1;">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box12-amt" value="${w2.box12Amount || ''}" placeholder="0" data-w2-id="${w2.id}" data-w2-field="box12Amount">
                </div>
              </div>
            </div>

            <!-- Box 14: Other (e.g. SDI / VPDI) -->
            <div class="w2-overlay-box box-14">
              <input type="text" class="w2-overlay-input" placeholder="CA SDI / VPDI / Other" value="">
            </div>

            <!-- STATE ROW 1: Boxes 15-20 (Overlaid directly on printed Row 1) -->
            <div class="w2-overlay-box row1-box-15-state box-highlight-state" id="w2-${w2.id}-state-${st0.id}-box15-state">
              <div class="w2-overlay-header">${renderRatingPill('w2-box15-state', true)}</div>
              <select class="w2-overlay-select" data-w2-id="${w2.id}" data-state-id="${st0.id}" data-state-field="state">
                ${this.renderStateOptions(st0.state)}
              </select>
            </div>

            <div class="w2-overlay-box row1-box-15-id">
              <input type="text" class="w2-overlay-input" value="${st0.stateId}" placeholder="State ID No." data-w2-id="${w2.id}" data-state-id="${st0.id}" data-state-field="stateId">
            </div>

            <div class="w2-overlay-box row1-box-16 box-highlight-state" id="w2-${w2.id}-state-${st0.id}-box16-container">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-box16', true)}
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-st-${st0.id}-box16`, '')}
              </div>
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-state-${st0.id}-box16" value="${st0.stateWages}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st0.id}" data-state-field="stateWages">
              </div>
            </div>

            <div class="w2-overlay-box row1-box-17 box-highlight-state" id="w2-${w2.id}-state-${st0.id}-box17-container">
              <div class="w2-overlay-header">
                ${renderRatingPill('w2-box17', true)}
                ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-st-${st0.id}-box17`, '')}
              </div>
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-state-${st0.id}-box17" value="${st0.stateTaxWithheld}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st0.id}" data-state-field="stateTaxWithheld">
              </div>
            </div>

            <div class="w2-overlay-box row1-box-18">
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" value="${st0.localWages}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st0.id}" data-state-field="localWages">
              </div>
            </div>

            <div class="w2-overlay-box row1-box-19">
              <div class="w2-overlay-input-wrap">
                <span class="w2-overlay-curr">$</span>
                <input type="number" step="any" class="w2-overlay-input num" value="${st0.localTaxWithheld}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st0.id}" data-state-field="localTaxWithheld">
              </div>
            </div>

            <div class="w2-overlay-box row1-box-20">
              <input type="text" class="w2-overlay-input" value="${st0.localityName}" placeholder="Locality" data-w2-id="${w2.id}" data-state-id="${st0.id}" data-state-field="localityName">
            </div>

            <!-- STATE ROW 2: Boxes 15-20 (Overlaid directly on printed Row 2) -->
            ${st1 ? `
              <div class="w2-overlay-box row2-box-15-state box-highlight-state" id="w2-${w2.id}-state-${st1.id}-box15-state">
                <div class="w2-overlay-header">${renderRatingPill('w2-box15-state', true)}</div>
                <select class="w2-overlay-select" data-w2-id="${w2.id}" data-state-id="${st1.id}" data-state-field="state">
                  ${this.renderStateOptions(st1.state)}
                </select>
              </div>

              <div class="w2-overlay-box row2-box-15-id">
                <input type="text" class="w2-overlay-input" value="${st1.stateId}" placeholder="State ID No." data-w2-id="${w2.id}" data-state-id="${st1.id}" data-state-field="stateId">
              </div>

              <div class="w2-overlay-box row2-box-16 box-highlight-state" id="w2-${w2.id}-state-${st1.id}-box16-container">
                <div class="w2-overlay-header">
                  ${renderRatingPill('w2-box16', true)}
                  ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-st-${st1.id}-box16`, '')}
                </div>
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-state-${st1.id}-box16" value="${st1.stateWages}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st1.id}" data-state-field="stateWages">
                </div>
              </div>

              <div class="w2-overlay-box row2-box-17 box-highlight-state" id="w2-${w2.id}-state-${st1.id}-box17-container">
                <div class="w2-overlay-header">
                  ${renderRatingPill('w2-box17', true)}
                  ${renderExplainToggleBtn(`drawer-explain-w2-${w2.id}-st-${st1.id}-box17`, '')}
                </div>
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-state-${st1.id}-box17" value="${st1.stateTaxWithheld}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st1.id}" data-state-field="stateTaxWithheld">
                </div>
              </div>

              <div class="w2-overlay-box row2-box-18">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" value="${st1.localWages}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st1.id}" data-state-field="localWages">
                </div>
              </div>

              <div class="w2-overlay-box row2-box-19">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" value="${st1.localTaxWithheld}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st1.id}" data-state-field="localTaxWithheld">
                </div>
              </div>

              <div class="w2-overlay-box row2-box-20">
                <input type="text" class="w2-overlay-input" value="${st1.localityName}" placeholder="Locality" data-w2-id="${w2.id}" data-state-id="${st1.id}" data-state-field="localityName">
                <button type="button" class="btn-remove-row2-state" data-remove-state="${w2.id}:${st1.id}" title="Remove State Line 2">✕</button>
              </div>
            ` : `
              <!-- Placeholder button to add State Row 2 directly onto Row 2 of W-2 -->
              <div class="w2-overlay-box row2-box-16" style="display: flex; align-items: center; justify-content: center; width: 45%;">
                <button type="button" class="btn btn-sm" style="height: 22px; font-size: 0.72rem; padding: 0 0.6rem; background: rgba(255,255,255,0.92); border: 1px dashed #3b82f6; font-weight: 700; color: #2563eb; cursor: pointer;" data-add-state="${w2.id}">
                  + Add 2nd State to Row 2
                </button>
              </div>
            `}
          </div>
        </div>

        <!-- Extra States Extension (for states 3+) -->
        ${extraStatesHtml}

        <!-- Attached Collapsible Explanations for this W-2 -->
        <div class="w2-drawers-container">
          ${renderFieldExplanationDrawer('w2-box1', `drawer-explain-w2-${w2.id}-box1`)}
          ${renderFieldExplanationDrawer('w2-box2', `drawer-explain-w2-${w2.id}-box2`)}
          ${renderFieldExplanationDrawer('w2-box3', `drawer-explain-w2-${w2.id}-box3`)}
          ${renderFieldExplanationDrawer('w2-box5', `drawer-explain-w2-${w2.id}-box5`)}
          ${renderFieldExplanationDrawer('w2-box12', `drawer-explain-w2-${w2.id}-box12`)}
          ${renderFieldExplanationDrawer('w2-ein', `drawer-explain-w2-${w2.id}-ein`)}
          ${renderFieldExplanationDrawer('w2-box16', `drawer-explain-w2-${w2.id}-st-${st0.id}-box16`)}
          ${renderFieldExplanationDrawer('w2-box17', `drawer-explain-w2-${w2.id}-st-${st0.id}-box17`)}
          ${st1 ? `
            ${renderFieldExplanationDrawer('w2-box16', `drawer-explain-w2-${w2.id}-st-${st1.id}-box16`)}
            ${renderFieldExplanationDrawer('w2-box17', `drawer-explain-w2-${w2.id}-st-${st1.id}-box17`)}
          ` : ''}
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

  private buildConnections(taxData?: TaxCalculationSummary): ConnectionDef[] {
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

    // 3b. Capital Gains -> Capital Gains Card & Gross Income
    const cap = this.state.otherIncome.capitalGains;
    if (cap && (cap.shortTerm !== 0 || cap.longTerm !== 0)) {
      connections.push({
        id: 'conn-capital-gains-st',
        sourceId: 'input-capital-gains-st',
        targetId: 'calc-capital-gains',
        category: 'capital',
        label: 'Short-Term Capital Gains'
      });
      connections.push({
        id: 'conn-capital-gains-lt',
        sourceId: 'input-capital-gains-lt',
        targetId: 'calc-capital-gains',
        category: 'capital',
        label: 'Long-Term Capital Gains'
      });
      connections.push({
        id: 'conn-capital-gains-gross',
        sourceId: 'calc-capital-gains',
        targetId: 'calc-gross-income',
        category: 'capital',
        label: 'Allowable Capital Gains/Loss'
      });
    }

    // 3c. Schedule C Freelance Expenses -> Gross Income
    const schedExp = this.state.otherIncome.scheduleCExpenses || 0;
    if (schedExp > 0) {
      connections.push({
        id: 'conn-1099-expenses-gross',
        sourceId: 'input-1099-nec-expenses',
        targetId: 'calc-gross-income',
        category: 'adjustments',
        label: 'Schedule C Expenses reduce Business Profit'
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

    if (this.state.adjustments.ira > 0) {
      connections.push({
        id: 'conn-adj-ira',
        sourceId: 'input-adj-ira',
        targetId: 'calc-total-adjustments',
        category: 'adjustments',
        label: 'IRA Deduction to Adjustments'
      });
    }

    if (this.state.adjustments.hsa > 0) {
      connections.push({
        id: 'conn-adj-hsa',
        sourceId: 'input-adj-hsa',
        targetId: 'calc-total-adjustments',
        category: 'adjustments',
        label: 'HSA Form 8889 to Adjustments'
      });
    }

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

    // 5b. Schedule A Itemized Deductions Connections
    const itm = this.state.itemizedDeductions;
    if (itm && itm.medicalExpenses > 0) {
      connections.push({
        id: 'conn-itemized-medical',
        sourceId: 'input-itemized-medical',
        targetId: 'calc-itemized-deductions',
        category: 'itemized',
        label: 'Medical Expenses (>7.5% AGI)'
      });
    }
    if (itm && itm.realEstateTax > 0) {
      connections.push({
        id: 'conn-itemized-salt',
        sourceId: 'input-itemized-salt',
        targetId: 'calc-itemized-deductions',
        category: 'itemized',
        label: 'Real Estate Tax (SALT)'
      });
    }
    if (itm && itm.mortgageInterest > 0) {
      connections.push({
        id: 'conn-itemized-mortgage',
        sourceId: 'input-itemized-mortgage',
        targetId: 'calc-itemized-deductions',
        category: 'itemized',
        label: 'Mortgage Interest'
      });
    }
    if (itm && itm.charity > 0) {
      connections.push({
        id: 'conn-itemized-charity',
        sourceId: 'input-itemized-charity',
        targetId: 'calc-itemized-deductions',
        category: 'itemized',
        label: 'Charitable Donations'
      });
    }

    // Schedule A Itemized Card -> Deduction Card
    connections.push({
      id: 'conn-itemized-deduction-choice',
      sourceId: 'calc-itemized-deductions',
      targetId: 'calc-standard-deduction',
      category: 'itemized',
      label: 'Optimal Deduction to Return'
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

    // 13. State Tax Withholding & Wage Connections
    this.state.w2s.forEach(w => {
      (w.states || []).forEach(st => {
        const stateKey = (st.state || '').toLowerCase();
        connections.push({
          id: `conn-w2-${w.id}-state-${st.id}-wages`,
          sourceId: `w2-${w.id}-state-${st.id}-box16`,
          targetId: `calc-state-${stateKey}-card`,
          category: 'state',
          label: `${st.state} State Sourced Wages (Box 16)`
        });
        connections.push({
          id: `conn-w2-${w.id}-state-${st.id}-tax`,
          sourceId: `w2-${w.id}-state-${st.id}-box17`,
          targetId: `calc-state-${stateKey}-card`,
          category: 'state',
          label: `${st.state} State Tax Withheld (Box 17)`
        });
      });
    });

    // 14. Cross-State Double Taxation Shield (OSTC) Connections
    (taxData?.stateReturnsCalc || []).forEach((sr: StateReturnCalculation) => {
      const homeStateKey = sr.state.toLowerCase();
      (sr.creditedStates || []).forEach((c: StateOtherStateCredit) => {
        const sourceStateKey = c.fromState.toLowerCase();
        connections.push({
          id: `conn-ostc-${sourceStateKey}-to-${homeStateKey}`,
          sourceId: `calc-state-${sourceStateKey}-card`,
          targetId: `calc-state-${homeStateKey}-card`,
          category: 'state_credit',
          label: `🛡️ ${c.fromState} Tax Credited to ${sr.state}`
        });
      });
    });

    // 15. Federal Verdict & State Outcomes -> Grand Total Unified Summary
    connections.push({
      id: 'conn-fed-to-unified',
      sourceId: 'calc-final-verdict',
      targetId: 'calc-unified-summary',
      category: 'withholding',
      label: 'Federal Outcome to Grand Total'
    });

    (taxData?.stateReturnsCalc || []).forEach((sr: StateReturnCalculation) => {
      const stateKey = sr.state.toLowerCase();
      connections.push({
        id: `conn-state-${stateKey}-to-unified`,
        sourceId: `calc-state-${stateKey}-card`,
        targetId: 'calc-unified-summary',
        category: 'state',
        label: `${sr.state} Return Outcome to Grand Total`
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
    updateCard('calc-capital-gains', taxData.capitalGainsCalc, formatCurrencyExact(taxData.capitalGainsCalc.result));
    updateCard('calc-total-adjustments', taxData.adjustmentsCalc, formatCurrency(taxData.adjustmentsCalc.result));
    updateCard('calc-agi', taxData.agiCalc, formatCurrency(taxData.agiCalc.result));
    updateCard('calc-itemized-deductions', taxData.itemizedCalc, formatCurrency(taxData.itemizedCalc.result));
    updateCard('calc-standard-deduction', taxData.deductionCalc, formatCurrency(taxData.deductionCalc.result));
    updateCard('calc-taxable-income', taxData.taxableIncomeCalc, formatCurrency(taxData.taxableIncomeCalc.result));
    updateCard('calc-tax-before-credits', taxData.taxBeforeCreditsCalc, formatCurrencyExact(taxData.taxBeforeCreditsCalc.result));
    this.renderTaxBrackets(taxData.taxBeforeCreditsCalc.brackets, taxData.taxableIncomeCalc.result);

    const optDedEl = document.getElementById('optimal-deduction-amount');
    if (optDedEl) optDedEl.textContent = formatCurrency(taxData.deductionCalc.result);

    const compBadge = document.getElementById('deduction-comparison-badge');
    if (compBadge) {
      const isItemizedChosen = taxData.itemizedCalc.chosenMethod === 'itemized';
      compBadge.className = `deduction-comparison-pill ${isItemizedChosen ? 'optimal-itemized' : 'optimal-standard'}`;
      const diff = Math.abs(taxData.itemizedCalc.totalItemizedDeductions - taxData.itemizedCalc.standardDeduction);
      if (isItemizedChosen) {
        compBadge.textContent = `🌟 Optimal Choice: Itemized (+$${formatCurrency(diff)} Extra Deduction!)`;
      } else {
        compBadge.textContent = `Optimal Choice: Standard Deduction ($${formatCurrency(taxData.itemizedCalc.standardDeduction)})`;
      }
    }

    updateCard('calc-total-credits', taxData.creditsCalc, formatCurrency(taxData.creditsCalc.result));
    updateCard('calc-total-tax-liability', taxData.totalTaxCalc, formatCurrencyExact(taxData.totalTaxCalc.result));
    updateCard('calc-total-withholding', taxData.withholdingCalc, formatCurrencyExact(taxData.withholdingCalc.result));

    this.renderVerdict(taxData);
    this.renderUnifiedSummary(taxData);
    updateCard('calc-fica-breakdown', taxData.ficaCalc, formatCurrencyExact(taxData.ficaCalc.totalFica));

    // Render State Tax Summary Card & Dynamic State Returns
    this.renderStateTaxSummary(taxData);
    this.renderStateReturns(taxData);

    this.render1040Mirror(taxData);
    this.updateHeaderStats(taxData);

    const connections = this.buildConnections(taxData);
    if (this.arrowEngine) {
      this.arrowEngine.setConnections(connections);
    }

    this.updateTableOfContents();
    this.bindRatingPillEvents();
    this.bindExplainEvents();
    this.saveDraft();
  }

  private renderStateReturns(taxData: TaxCalculationSummary): void {
    const container = document.getElementById('container-state-returns');
    if (!container) return;

    container.innerHTML = '';
    const stateReturns = taxData.stateReturnsCalc || [];

    stateReturns.forEach(sr => {
      const card = document.createElement('div');
      card.className = 'state-return-card';
      card.id = `calc-state-${sr.state.toLowerCase()}-card`;

      const isRes = sr.residentStatus === 'resident';
      const statusBadge = isRes
        ? '<span class="state-status-badge badge-resident">🏠 Resident Return</span>'
        : '<span class="state-status-badge badge-nonresident">💼 Nonresident Return</span>';

      let extraBadge = '';
      if (sr.creditForOtherStates > 0) {
        extraBadge = `<span class="state-status-badge badge-shield" id="calc-state-${sr.state.toLowerCase()}-ostc" title="Credit for Taxes Paid to Other States">🛡️ Double-Tax Shield: -${formatCurrency(sr.creditForOtherStates)}</span>`;
      } else if (sr.reciprocityExemption) {
        extraBadge = `<span class="state-status-badge badge-reciprocal">🤝 Reciprocal Agreement Active</span>`;
      } else if (!sr.hasIncomeTax) {
        extraBadge = `<span class="state-status-badge badge-no-tax">🌴 0% Wage Tax State</span>`;
      }

      card.innerHTML = `
        <div class="calc-card-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.35rem; flex-wrap: wrap;">
              <span class="step-indicator" style="color: #6d28d9; margin-bottom: 0;">State Return • ${sr.state}</span>
              ${statusBadge}
              ${extraBadge}
            </div>
            <h3 class="calc-card-title">${sr.stateName}: ${sr.formName}</h3>
          </div>
          <span class="irs-line-tag" style="background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe;">${sr.formName}</span>
        </div>

        <div class="formula-box">
          <div class="formula-row">
            <span class="formula-badge general">General Formula</span>
            <span class="formula-math formula-general">${sr.generalFormula}</span>
          </div>
          <div class="formula-row">
            <span class="formula-badge plugged" style="background: #f5f3ff; color: #7c3aed; border-color: #ddd6fe;">With Your Numbers</span>
            <span class="formula-math plugged-highlight formula-plugged">${sr.pluggedFormula}</span>
          </div>
        </div>

        ${sr.creditedStates.length > 0 ? `
          <div style="background: #fdf4ff; border: 1px solid #f0abfc; border-radius: 8px; padding: 0.75rem 1rem; margin-top: 0.75rem; font-size: 0.82rem; color: #701a75;">
            <strong>🛡️ Other State Tax Credit (OSTC) Detail:</strong>
            ${sr.creditedStates.map(c => `
              <div>• Credited from <strong>${c.fromState}</strong>: Source tax paid was ${formatCurrencyExact(c.sourceTaxPaid)}, resident attributable tax is ${formatCurrencyExact(c.homeAttributableTax)} ➔ Credit allowed: <strong>${formatCurrencyExact(c.creditAllowed)}</strong></div>
            `).join('')}
          </div>
        ` : ''}

        ${sr.reciprocityNote ? `
          <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 0.75rem 1rem; margin-top: 0.75rem; font-size: 0.82rem; color: #065f46;">
            <strong>🤝 Reciprocity Note:</strong> ${sr.reciprocityNote}
          </div>
        ` : ''}

        <div class="state-outcome-banner ${sr.isRefund ? 'is-refund' : 'is-owed'}" id="calc-state-${sr.state.toLowerCase()}-outcome">
          <div>
            <div style="font-size: 0.85rem; opacity: 0.9;">
              ${sr.isRefund ? `Estimated ${sr.stateName} State Refund:` : `Estimated ${sr.stateName} State Tax Owed:`}
            </div>
            <div style="font-size: 0.75rem; opacity: 0.8;">
              Box 17 Withholding (${formatCurrencyExact(sr.stateWithholding)}) vs. Tax Liability (${formatCurrencyExact(sr.stateTaxLiability)})
            </div>
          </div>
          <div class="state-outcome-amount" id="calc-state-${sr.state.toLowerCase()}-liability">
            ${sr.isRefund ? `+${formatCurrencyExact(sr.netOutcome)}` : `-${formatCurrencyExact(sr.netOutcome)}`}
          </div>
        </div>
      `;

      container.appendChild(card);
    });
  }

  private renderUnifiedSummary(taxData: TaxCalculationSummary): void {
    const card = document.getElementById('calc-unified-summary');
    if (!card) return;

    const banner = document.getElementById('unified-hero-banner');
    const amountEl = document.getElementById('unified-hero-amount');
    const subtitleEl = document.getElementById('unified-hero-subtitle');
    const pluggedEl = document.getElementById('unified-formula-plugged');
    const tbody = document.getElementById('unified-ledger-tbody');

    const u = taxData.unifiedSummaryCalc;
    if (!u) return;

    if (banner) {
      banner.className = `unified-hero-banner ${u.isGrandTotalRefund ? 'is-refund' : 'is-owed'}`;
    }
    if (amountEl) {
      amountEl.textContent = `${u.isGrandTotalRefund ? '+' : '-'}${formatCurrencyExact(u.result)}`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = u.isGrandTotalRefund
        ? 'Total combined refund check amount coming back to you across the IRS and all states!'
        : 'Total combined balance due across the IRS and state tax revenue departments.';
    }
    if (pluggedEl) {
      pluggedEl.textContent = u.pluggedFormula;
    }

    if (tbody) {
      tbody.innerHTML = '';
      u.lines.forEach(line => {
        const tr = document.createElement('tr');
        const isRef = line.netOutcome >= 0;
        const outcomeColor = isRef ? 'val-refund' : 'val-owed';
        const outcomeFormatted = `${isRef ? '+' : '-'}${formatCurrencyExact(Math.abs(line.netOutcome))}`;

        tr.innerHTML = `
          <td><strong>${line.jurisdiction}</strong></td>
          <td><span class="irs-line-tag">${line.formName}</span></td>
          <td>${formatCurrencyExact(line.taxLiability)}</td>
          <td>${formatCurrencyExact(line.withholding)}</td>
          <td class="${outcomeColor}">${outcomeFormatted} ${isRef ? 'Refund' : 'Owed'}</td>
          <td>${line.badge ? `<span class="state-status-badge badge-shield">${line.badge}</span>` : '<span style="color: #94a3b8;">Standard Filing</span>'}</td>
        `;
        tbody.appendChild(tr);
      });

      // Total row
      const totalTr = document.createElement('tr');
      totalTr.className = 'total-row';
      const grandRef = u.isGrandTotalRefund;
      totalTr.innerHTML = `
        <td colspan="4" style="text-align: right; text-transform: uppercase; letter-spacing: 0.05em;">Grand Total Net Pocket Outcome:</td>
        <td class="${grandRef ? 'val-refund' : 'val-owed'}">${grandRef ? '+' : '-'}${formatCurrencyExact(u.result)} ${grandRef ? 'NET REFUND' : 'NET OWED'}</td>
        <td><strong>${grandRef ? '🎉 In Your Pocket' : '⚠️ Total Due'}</strong></td>
      `;
      tbody.appendChild(totalTr);
    }
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
