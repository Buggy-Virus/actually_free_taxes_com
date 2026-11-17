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
  IncomeSourceType,
  ConnectionDef,
  TaxCalculationSummary,
  BracketDetail,
  CalculationResult,
  DeductionMethod,
  StateReturnCalculation,
  StateOtherStateCredit,
  ArrowDisplayMode,
  CalcBlockDefinition,
  CalcVariableBreakdown,
  CalcVariableContributor,
  FormulaToken,
  PanelSectionCategory,
  StatePanelItem,
  AutoPanelItem
} from './types.js';
import { calculateTaxes, buildCalculationBlocks, buildStateCalcBlocks, buildAutoPanels, formatCurrency, formatCurrencyExact } from './tax-engine.js';
import { ArrowEngine } from './arrow-engine.js';
import { renderRatingPill, renderRatingCardHtml, getFieldRating, renderRatingCircles, renderW2HeaderCircles, renderFieldExplanationDrawer, renderExplainToggleBtn } from './field-ratings.js';
import { PANEL_CATALOG, PanelCatalogEntry, getPanelCatalogEntry } from './panel-catalog.js';
import { getStateCatalogForSection, getStateCatalogEntry } from './state-panel-catalog.js';

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
const STORAGE_KEY_COLLAPSE = 'aft_collapse_state_v1';
const STORAGE_KEY_DRAFTS = 'aft_saved_drafts_v1';
const STORAGE_KEY_UI_PREFS = 'aft_ui_prefs_v1';

interface CollapseState {
  cards: Record<string, boolean>;
  sections: Record<string, boolean>;
  detailsCapGains?: boolean;
}

interface UiPrefs {
  showAllArrows?: boolean;
  arrowDisplayMode?: ArrowDisplayMode;
  showEmptyCalcBlocks?: boolean;
  openPanels?: Record<string, boolean>;
  ratingFilter?: string;
  expandAllExplanations?: boolean;
}

interface SavedDraftEntry {
  id: string;
  name: string;
  updatedAt: number;
  state: TaxAppState;
  collapseState?: CollapseState;
}

interface SavedDraftsStore {
  activeId: string;
  drafts: SavedDraftEntry[];
}

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
  private collapseState: CollapseState = this.loadCollapseState();
  private uiPrefs: UiPrefs = this.loadUiPrefs();
  private draftsStore: SavedDraftsStore = this.loadDraftsStore();
  private currentCalcBlocks: CalcBlockDefinition[] = [];
  private currentStateCalcBlocks: CalcBlockDefinition[] = [];
  private currentAutoPanels: { federal: AutoPanelItem[]; byState: Record<string, AutoPanelItem[]> } = { federal: [], byState: {} };

  private loadUiPrefs(): UiPrefs {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return { arrowDisplayMode: 'always', showEmptyCalcBlocks: false, openPanels: { '1099-int': true } };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_UI_PREFS);
      if (!raw) return { arrowDisplayMode: 'always', showEmptyCalcBlocks: false, openPanels: { '1099-int': true } };
      const parsed = JSON.parse(raw) as Partial<UiPrefs>;
      return {
        showAllArrows: typeof parsed.showAllArrows === 'boolean' ? parsed.showAllArrows : undefined,
        arrowDisplayMode: parsed.arrowDisplayMode === 'always' || parsed.arrowDisplayMode === 'selection' || parsed.arrowDisplayMode === 'off'
          ? parsed.arrowDisplayMode
          : (parsed.showAllArrows === false ? 'selection' : 'always'),
        showEmptyCalcBlocks: typeof parsed.showEmptyCalcBlocks === 'boolean' ? parsed.showEmptyCalcBlocks : false,
        openPanels: parsed.openPanels && typeof parsed.openPanels === 'object' ? parsed.openPanels : { '1099-int': true },
        ratingFilter: typeof parsed.ratingFilter === 'string' ? parsed.ratingFilter : undefined,
        expandAllExplanations: typeof parsed.expandAllExplanations === 'boolean' ? parsed.expandAllExplanations : undefined
      };
    } catch {
      return { arrowDisplayMode: 'always', showEmptyCalcBlocks: false, openPanels: { '1099-int': true } };
    }
  }

  private saveUiPrefs(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_UI_PREFS, JSON.stringify(this.uiPrefs));
    } catch (e) {
      console.warn('Could not save UI preferences to localStorage:', e);
    }
  }

  private loadDraftsStore(): SavedDraftsStore {
    const fallbackState = getDefaultTaxAppState();
    const fallback: SavedDraftsStore = {
      activeId: 'draft-1',
      drafts: [{ id: 'draft-1', name: 'Draft 1', updatedAt: Date.now(), state: fallbackState }]
    };
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return fallback;
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_DRAFTS);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<SavedDraftsStore>;
        if (parsed && Array.isArray(parsed.drafts) && parsed.drafts.length > 0) {
          const activeExists = parsed.drafts.some(d => d.id === parsed.activeId);
          return {
            activeId: activeExists && parsed.activeId ? parsed.activeId : parsed.drafts[0].id,
            drafts: parsed.drafts
          };
        }
      }
      // Migrate legacy single draft if present
      const legacy = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (legacy) {
        const parsedLegacy = JSON.parse(legacy);
        if (parsedLegacy && Array.isArray(parsedLegacy.w2s)) {
          return {
            activeId: 'draft-1',
            drafts: [{
              id: 'draft-1',
              name: 'Draft 1',
              updatedAt: Date.now(),
              state: parsedLegacy,
              collapseState: this.collapseState
            }]
          };
        }
      }
    } catch (e) {
      console.warn('Could not load saved drafts store:', e);
    }
    return fallback;
  }

  private saveDraftsStore(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_DRAFTS, JSON.stringify(this.draftsStore));
    } catch (e) {
      console.warn('Could not save drafts store to localStorage:', e);
    }
  }

  private loadCollapseState(): CollapseState {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
      return { cards: {}, sections: {} };
    }
    try {
      const raw = localStorage.getItem(STORAGE_KEY_COLLAPSE);
      if (!raw) return { cards: {}, sections: {} };
      const parsed = JSON.parse(raw) as Partial<CollapseState>;
      return {
        cards: parsed.cards && typeof parsed.cards === 'object' ? parsed.cards : {},
        sections: parsed.sections && typeof parsed.sections === 'object' ? parsed.sections : {},
        detailsCapGains: typeof parsed.detailsCapGains === 'boolean' ? parsed.detailsCapGains : undefined
      };
    } catch {
      return { cards: {}, sections: {} };
    }
  }

  private saveCollapseState(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_COLLAPSE, JSON.stringify(this.collapseState));
    } catch (e) {
      console.warn('Could not save collapse state to localStorage:', e);
    }
  }

  constructor() {
    this.init();
  }

  private init(): void {
    const svgEl = document.getElementById('arrow-canvas') as unknown as SVGSVGElement;
    if (svgEl) {
      this.arrowEngine = new ArrowEngine(svgEl, {
        displayMode: this.uiPrefs.arrowDisplayMode || 'always'
      });
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

    const mode = this.uiPrefs.arrowDisplayMode || (this.state.showAllArrows ? 'always' : 'selection');
    this.arrowEngine?.setDisplayMode(mode);

    this.syncOpenPanelsWithState();
    this.renderDraftSelector();
    this.renderW2Forms();
    this.renderFederalPanelSections();
    this.renderStateSections();
    this.syncAllDomInputs();
    this.bindMenuBarEvents();
    this.bindGlobalEvents();
    this.recalculateAndRender();

    // Support URL parameters for automated testing & deep-linking
    if (typeof window !== 'undefined' && window.location) {
      const urlParams = new URLSearchParams(window.location.search);
      const modalParam = urlParams.get('modal');
      if (modalParam === 'about') {
        this.openAboutModal();
      } else if (modalParam === 'howto') {
        this.openHowToModal();
      } else if (modalParam) {
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
        this.openWelcomeModal();
      }
    } catch (e) {
      console.warn("Could not check TOS status in localStorage:", e);
    }
  }

  private welcomeTimerId: number | null = null;
  private welcomeSecondsLeft: number = 5;

  public openWelcomeModal(): void {
    const overlay = document.getElementById('welcome-modal-overlay');
    const checkbox = document.getElementById('welcome-agree-checkbox') as HTMLInputElement | null;
    const closeBtn = document.getElementById('btn-close-welcome-modal') as HTMLButtonElement | null;
    const gotItBtn = document.getElementById('btn-welcome-got-it') as HTMLButtonElement | null;
    if (!overlay) return;

    this.welcomeSecondsLeft = 5;
    if (this.welcomeTimerId !== null) {
      window.clearInterval(this.welcomeTimerId);
      this.welcomeTimerId = null;
    }

    const syncButtons = () => {
      const agreed = Boolean(checkbox?.checked);
      if (closeBtn) closeBtn.disabled = !agreed;
      if (gotItBtn) {
        gotItBtn.disabled = !(agreed && this.welcomeSecondsLeft <= 0);
        gotItBtn.textContent = this.welcomeSecondsLeft > 0
          ? `Got It (${this.welcomeSecondsLeft}s)`
          : 'Got It';
      }
    };

    if (checkbox && !checkbox.dataset.bound) {
      checkbox.dataset.bound = 'true';
      checkbox.addEventListener('change', syncButtons);
    }
    syncButtons();

    this.welcomeTimerId = window.setInterval(() => {
      this.welcomeSecondsLeft = Math.max(0, this.welcomeSecondsLeft - 1);
      syncButtons();
      if (this.welcomeSecondsLeft <= 0 && this.welcomeTimerId !== null) {
        window.clearInterval(this.welcomeTimerId);
        this.welcomeTimerId = null;
      }
    }, 1000);

    overlay.classList.add('open');
  }

  public closeWelcomeModal(recordAcceptance: boolean = true): void {
    const checkbox = document.getElementById('welcome-agree-checkbox') as HTMLInputElement | null;
    if (recordAcceptance && checkbox && !checkbox.checked) {
      return;
    }
    if (this.welcomeTimerId !== null) {
      window.clearInterval(this.welcomeTimerId);
      this.welcomeTimerId = null;
    }
    if (recordAcceptance && typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY_TOS, 'true');
      } catch (e) {
        console.warn("Could not record TOS acceptance:", e);
      }
      this.isTosAccepted = true;
    }
    const overlay = document.getElementById('welcome-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  public openAboutModal(scrollToId?: string): void {
    const overlay = document.getElementById('about-modal-overlay');
    if (overlay) {
      overlay.classList.add('open');
      if (scrollToId) {
        window.setTimeout(() => {
          const target = document.getElementById(scrollToId);
          target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 50);
      }
    }
  }

  public closeAboutModal(): void {
    const overlay = document.getElementById('about-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  public openHowToModal(): void {
    const overlay = document.getElementById('howto-modal-overlay');
    if (overlay) overlay.classList.add('open');
  }

  public closeHowToModal(): void {
    const overlay = document.getElementById('howto-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  private copyPreText(preId: string, statusId: string): void {
    const pre = document.getElementById(preId);
    const status = document.getElementById(statusId);
    if (!pre) return;
    navigator.clipboard?.writeText(pre.textContent || '').then(() => {
      if (status) {
        status.textContent = 'Copied to clipboard!';
        window.setTimeout(() => { status.textContent = ''; }, 3000);
      }
    }).catch(() => {
      if (status) status.textContent = 'Select and copy the prompt manually.';
    });
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
  private getActiveDraft(): SavedDraftEntry | undefined {
    return this.draftsStore.drafts.find(d => d.id === this.draftsStore.activeId) || this.draftsStore.drafts[0];
  }

  private renderDraftSelector(): void {
    const active = this.getActiveDraft();
    const labelEl = document.getElementById('active-draft-label');
    if (labelEl) {
      labelEl.textContent = active ? active.name : 'Draft 1';
    }

    const listEl = document.getElementById('menu-drafts-list');
    if (listEl) {
      listEl.innerHTML = '';
      this.draftsStore.drafts.forEach(draft => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `menu-item ${draft.id === this.draftsStore.activeId ? 'active-draft-item' : ''}`;
        btn.setAttribute('role', 'menuitem');
        btn.innerHTML = `<span>${draft.name}</span>${draft.id === this.draftsStore.activeId ? '<span>✓</span>' : ''}`;
        btn.addEventListener('click', () => {
          this.switchDraft(draft.id);
          document.querySelectorAll('.menu-dropdown.open').forEach(el => el.classList.remove('open'));
        });
        listEl.appendChild(btn);
      });
    }
  }

  private applyDraftEntry(draft: SavedDraftEntry): void {
    this.state = JSON.parse(JSON.stringify(draft.state));
    if (typeof this.uiPrefs.showAllArrows === 'boolean') {
      this.state.showAllArrows = this.uiPrefs.showAllArrows;
    }
    this.collapseState = draft.collapseState
      ? JSON.parse(JSON.stringify(draft.collapseState))
      : { cards: {}, sections: {} };
    this.saveCollapseState();
    this.updateIdCounters();
    this.syncOpenPanelsWithState();
    this.renderDraftSelector();
    this.renderW2Forms();
    this.renderFederalPanelSections();
    this.renderStateSections();
    this.syncAllDomInputs();
    this.recalculateAndRender();
  }

  public switchDraft(draftId: string): void {
    const target = this.draftsStore.drafts.find(d => d.id === draftId);
    if (!target) return;
    this.draftsStore.activeId = target.id;
    this.saveDraftsStore();
    this.applyDraftEntry(target);
    const statusText = document.getElementById('storage-status-text');
    if (statusText) statusText.textContent = `Switched to "${target.name}"`;
  }

  public createNewDraft(): void {
    const nextNum = this.draftsStore.drafts.length + 1;
    const inputName = typeof window !== 'undefined'
      ? window.prompt('Name for the new blank draft:', `Draft ${nextNum}`)
      : `Draft ${nextNum}`;
    if (inputName === null) return;
    const name = inputName.trim() || `Draft ${nextNum}`;
    const newDraft: SavedDraftEntry = {
      id: `draft-${Date.now()}`,
      name,
      updatedAt: Date.now(),
      state: getDefaultTaxAppState(),
      collapseState: { cards: {}, sections: {} }
    };
    this.draftsStore.drafts.push(newDraft);
    this.draftsStore.activeId = newDraft.id;
    this.saveDraftsStore();
    this.applyDraftEntry(newDraft);
    const statusText = document.getElementById('storage-status-text');
    if (statusText) statusText.textContent = `Created "${name}"`;
  }

  public duplicateCurrentDraft(): void {
    const current = this.getActiveDraft();
    const baseName = current ? current.name : 'Draft';
    const defaultCopyName = `${baseName} (Copy)`;
    const inputName = typeof window !== 'undefined'
      ? window.prompt('Name for the copied draft:', defaultCopyName)
      : defaultCopyName;
    if (inputName === null) return;
    const name = inputName.trim() || defaultCopyName;
    const copyDraft: SavedDraftEntry = {
      id: `draft-${Date.now()}`,
      name,
      updatedAt: Date.now(),
      state: JSON.parse(JSON.stringify(this.state)),
      collapseState: JSON.parse(JSON.stringify(this.collapseState))
    };
    this.draftsStore.drafts.push(copyDraft);
    this.draftsStore.activeId = copyDraft.id;
    this.saveDraftsStore();
    this.renderDraftSelector();
    const statusText = document.getElementById('storage-status-text');
    if (statusText) statusText.textContent = `Copied to "${name}"`;
  }

  public renameCurrentDraft(): void {
    const current = this.getActiveDraft();
    if (!current || typeof window === 'undefined') return;
    const inputName = window.prompt('Rename current draft:', current.name);
    if (inputName === null) return;
    const trimmed = inputName.trim();
    if (!trimmed) return;
    current.name = trimmed;
    current.updatedAt = Date.now();
    this.saveDraftsStore();
    this.renderDraftSelector();
    const statusText = document.getElementById('storage-status-text');
    if (statusText) statusText.textContent = `Renamed draft to "${trimmed}"`;
  }

  public deleteCurrentDraft(): void {
    const current = this.getActiveDraft();
    if (!current || typeof window === 'undefined') return;
    if (!window.confirm(`Delete draft "${current.name}"?`)) return;
    if (this.draftsStore.drafts.length <= 1) {
      current.name = 'Draft 1';
      current.state = getDefaultTaxAppState();
      current.collapseState = { cards: {}, sections: {} };
      current.updatedAt = Date.now();
      this.saveDraftsStore();
      this.applyDraftEntry(current);
      return;
    }
    this.draftsStore.drafts = this.draftsStore.drafts.filter(d => d.id !== current.id);
    this.draftsStore.activeId = this.draftsStore.drafts[0].id;
    this.saveDraftsStore();
    this.applyDraftEntry(this.draftsStore.drafts[0]);
  }

  private saveDraft(): void {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(this.state));
      const active = this.getActiveDraft();
      if (active) {
        active.state = JSON.parse(JSON.stringify(this.state));
        active.collapseState = JSON.parse(JSON.stringify(this.collapseState));
        active.updatedAt = Date.now();
      }
      this.saveDraftsStore();
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
      const active = this.getActiveDraft();
      if (active && active.state && Array.isArray(active.state.w2s)) {
        this.state = JSON.parse(JSON.stringify(active.state));
        if (active.collapseState) {
          this.collapseState = JSON.parse(JSON.stringify(active.collapseState));
          this.saveCollapseState();
        }
        this.updateIdCounters();
        const statusText = document.getElementById('storage-status-text');
        if (statusText) {
          statusText.textContent = `Restored "${active.name}" from this device`;
        }
        return true;
      }
      const saved = localStorage.getItem(STORAGE_KEY_DRAFT);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.w2s)) {
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
      const confirmed = window.confirm("Are you sure you want to clear all saved drafts and reset to blank/default?");
      if (!confirmed) return;
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(STORAGE_KEY_DRAFT);
          localStorage.removeItem(STORAGE_KEY_DRAFTS);
          localStorage.removeItem(STORAGE_KEY_COLLAPSE);
        } catch (e) {
          console.warn("Failed to remove saved draft:", e);
        }
      }
      this.collapseState = { cards: {}, sections: {} };
      this.state = getDefaultTaxAppState();
      this.draftsStore = {
        activeId: 'draft-1',
        drafts: [{ id: 'draft-1', name: 'Draft 1', updatedAt: Date.now(), state: JSON.parse(JSON.stringify(this.state)) }]
      };
      this.uiPrefs.openPanels = { '1099-int': true };
      this.saveUiPrefs();
      this.syncOpenPanelsWithState();
      this.renderDraftSelector();
      this.updateIdCounters();
      this.renderW2Forms();
      this.renderFederalPanelSections();
      this.renderStateSections();
      this.syncAllDomInputs();
      this.recalculateAndRender();
      const statusText = document.getElementById('storage-status-text');
      if (statusText) {
        statusText.textContent = "Saved data cleared. Started fresh.";
      }
    }
  }

  public deleteAllDataConfirmed(): void {
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.removeItem(STORAGE_KEY_DRAFT);
        localStorage.removeItem(STORAGE_KEY_DRAFTS);
        localStorage.removeItem(STORAGE_KEY_COLLAPSE);
      } catch (e) {
        console.warn("Could not clear localStorage:", e);
      }
    }
    this.collapseState = { cards: {}, sections: {} };
    this.state = getDefaultTaxAppState();
    this.state.w2s = [{
      id: 0,
      employer: '',
      ein: '',
      box1: 0,
      box2: 0,
      box3: 0,
      box4: 0,
      box5: 0,
      box6: 0,
      states: [{ id: 0, state: this.state.residentState || 'CA', stateId: '', stateWages: 0, stateTaxWithheld: 0, localWages: 0, localTaxWithheld: 0, localityName: '' }]
    }];
    this.draftsStore = {
      activeId: 'draft-1',
      drafts: [{ id: 'draft-1', name: 'Draft 1', updatedAt: Date.now(), state: JSON.parse(JSON.stringify(this.state)) }]
    };
    this.uiPrefs.openPanels = { '1099-int': true };
    this.saveUiPrefs();
    this.syncOpenPanelsWithState();
    this.renderDraftSelector();
    this.updateIdCounters();
    this.renderW2Forms();
    this.renderFederalPanelSections();
    this.renderStateSections();
    this.syncAllDomInputs();
    this.recalculateAndRender();
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

  private parseAndNormalizeTaxState(rawText: string): TaxAppState {
    const trimmed = rawText.trim();
    const fenceMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
    const jsonText = fenceMatch ? fenceMatch[1].trim() : trimmed;
    const parsed = JSON.parse(jsonText);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new Error('Root JSON value must be an object.');
    }

    const base = getDefaultTaxAppState();
    const validYear = parsed.year === 2024 || parsed.year === 2025 ? parsed.year : base.year;
    const validStatuses: FilingStatus[] = ['single', 'married_joint', 'married_separate', 'head_of_household', 'qualifying_surviving_spouse'];
    const validStatus = validStatuses.includes(parsed.filingStatus) ? parsed.filingStatus : base.filingStatus;

    const rawW2s = Array.isArray(parsed.w2s) ? parsed.w2s : [];
    const normalizedW2s: W2Data[] = rawW2s.map((w: any, wIdx: number) => {
      const statesRaw = Array.isArray(w?.states) ? w.states : [];
      return {
        id: typeof w?.id === 'number' ? w.id : wIdx,
        employer: String(w?.employer ?? `Employer ${wIdx + 1}`),
        ein: String(w?.ein ?? ''),
        box1: Number(w?.box1) || 0,
        box2: Number(w?.box2) || 0,
        box3: Number(w?.box3) || 0,
        box4: Number(w?.box4) || 0,
        box5: Number(w?.box5) || 0,
        box6: Number(w?.box6) || 0,
        states: statesRaw.map((s: any, sIdx: number) => ({
          id: typeof s?.id === 'number' ? s.id : sIdx,
          state: String(s?.state ?? parsed.residentState ?? base.residentState).toUpperCase().trim(),
          stateId: String(s?.stateId ?? ''),
          stateWages: Number(s?.stateWages) || 0,
          stateTaxWithheld: Number(s?.stateTaxWithheld) || 0,
          localWages: Number(s?.localWages) || 0,
          localTaxWithheld: Number(s?.localTaxWithheld) || 0,
          localityName: String(s?.localityName ?? '')
        }))
      };
    });

    const rawSources = Array.isArray(parsed.otherIncome?.sources) ? parsed.otherIncome.sources : [];
    const normalizedSources: IncomeSource[] = rawSources.map((src: any, idx: number) => ({
      id: typeof src?.id === 'number' ? src.id : idx + 1,
      type: src?.type || '1099-NEC',
      payer: String(src?.payer ?? `Payer ${idx + 1}`),
      amount: Number(src?.amount) || 0,
      qualifiedDividends: Number(src?.qualifiedDividends) || 0,
      accruedInterestPaid: Number(src?.accruedInterestPaid) || 0,
      taxExemptInterest: Number(src?.taxExemptInterest) || 0,
      qbiEligible: Boolean(src?.qbiEligible),
      earlyDistributionPenalty: Boolean(src?.earlyDistributionPenalty),
      federalTaxWithheld: Number(src?.federalTaxWithheld) || 0,
      state: src?.state ? String(src.state).toUpperCase().trim() : ''
    }));

    return {
      year: validYear,
      filingStatus: validStatus,
      residentState: String(parsed.residentState ?? base.residentState).toUpperCase().trim() || 'CA',
      w2s: normalizedW2s,
      otherIncome: {
        interest: Number(parsed.otherIncome?.interest) || 0,
        sources: normalizedSources,
        capitalGains: {
          shortTerm: Number(parsed.otherIncome?.capitalGains?.shortTerm) || 0,
          longTerm: Number(parsed.otherIncome?.capitalGains?.longTerm) || 0,
          collectiblesGain: Number(parsed.otherIncome?.capitalGains?.collectiblesGain) || 0,
          unrecaptured1250Gain: Number(parsed.otherIncome?.capitalGains?.unrecaptured1250Gain) || 0
        },
        scheduleCExpenses: Number(parsed.otherIncome?.scheduleCExpenses) || 0,
        scheduleERental: {
          grossRents: Number(parsed.otherIncome?.scheduleERental?.grossRents) || 0,
          expenses: Number(parsed.otherIncome?.scheduleERental?.expenses) || 0,
          depreciation: Number(parsed.otherIncome?.scheduleERental?.depreciation) || 0,
          propertyState: String(parsed.otherIncome?.scheduleERental?.propertyState ?? '').toUpperCase().trim()
        }
      },
      adjustments: {
        studentLoan: Number(parsed.adjustments?.studentLoan) || 0,
        ira: Number(parsed.adjustments?.ira) || 0,
        hsa: Number(parsed.adjustments?.hsa) || 0,
        educatorExpenses: Number(parsed.adjustments?.educatorExpenses) || 0,
        seRetirement: Number(parsed.adjustments?.seRetirement) || 0,
        seHealthInsurance: Number(parsed.adjustments?.seHealthInsurance) || 0,
        alimonyPaid: Number(parsed.adjustments?.alimonyPaid) || 0
      },
      dependents: {
        childrenCount: Number(parsed.dependents?.childrenCount) || 0,
        otherDependentsCount: Number(parsed.dependents?.otherDependentsCount) || 0,
        age65OrBlindCount: Number(parsed.dependents?.age65OrBlindCount) || 0,
        childCareExpenses: Number(parsed.dependents?.childCareExpenses) || 0,
        educationExpensesAotc: Number(parsed.dependents?.educationExpensesAotc) || 0,
        educationExpensesLlc: Number(parsed.dependents?.educationExpensesLlc) || 0,
        foreignTaxCredit: Number(parsed.dependents?.foreignTaxCredit) || 0,
        cleanEnergyCredit: Number(parsed.dependents?.cleanEnergyCredit) || 0,
        estimatedTaxPayments: Number(parsed.dependents?.estimatedTaxPayments) || 0
      },
      itemizedDeductions: {
        medicalExpenses: Number(parsed.itemizedDeductions?.medicalExpenses) || 0,
        realEstateTax: Number(parsed.itemizedDeductions?.realEstateTax) || 0,
        mortgageInterest: Number(parsed.itemizedDeductions?.mortgageInterest) || 0,
        charity: Number(parsed.itemizedDeductions?.charity) || 0,
        gamblingLosses: Number(parsed.itemizedDeductions?.gamblingLosses) || 0
      },
      deductionMethod: parsed.deductionMethod === 'standard' || parsed.deductionMethod === 'itemized' ? parsed.deductionMethod : 'auto',
      showAllArrows: typeof parsed.showAllArrows === 'boolean' ? parsed.showAllArrows : this.state.showAllArrows
    };
  }

  private applyImportedTaxState(newState: TaxAppState, statusMsg: string): void {
    this.collapseState = { cards: {}, sections: {} };
    this.saveCollapseState();
    this.state = newState;
    this.updateIdCounters();
    this.syncOpenPanelsWithState();
    this.renderW2Forms();
    this.renderFederalPanelSections();
    this.renderStateSections();
    this.syncAllDomInputs();
    this.recalculateAndRender();
    const statusText = document.getElementById('storage-status-text');
    if (statusText) statusText.textContent = statusMsg;
  }

  public importDraft(file: File): void {
    const reader = new FileReader();
    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const text = e.target?.result as string;
        const normalized = this.parseAndNormalizeTaxState(text);
        this.applyImportedTaxState(normalized, `Imported backup (${file.name}) successfully!`);
        alert(`Successfully imported backup file: ${file.name}`);
      } catch (err) {
        alert("Failed to read backup file: " + (err as Error).message);
      }
    };
    reader.readAsText(file);
  }

  public openJsonIoModal(): void {
    const overlay = document.getElementById('json-io-modal-overlay');
    const textarea = document.getElementById('textarea-json-io') as HTMLTextAreaElement | null;
    const feedback = document.getElementById('json-io-feedback');
    if (textarea) {
      const exportObj = { ...this.state };
      textarea.value = JSON.stringify(exportObj, null, 2);
    }
    if (feedback) {
      feedback.textContent = '';
      feedback.style.color = '#475569';
    }
    if (overlay) overlay.classList.add('open');
  }

  public closeJsonIoModal(): void {
    const overlay = document.getElementById('json-io-modal-overlay');
    if (overlay) overlay.classList.remove('open');
  }

  public applyJsonIoText(): void {
    const textarea = document.getElementById('textarea-json-io') as HTMLTextAreaElement | null;
    const feedback = document.getElementById('json-io-feedback');
    if (!textarea) return;
    try {
      const normalized = this.parseAndNormalizeTaxState(textarea.value);
      this.applyImportedTaxState(normalized, 'Applied pasted JSON to current draft');
      this.closeJsonIoModal();
    } catch (err) {
      if (feedback) {
        feedback.textContent = `Invalid JSON: ${(err as Error).message}`;
        feedback.style.color = '#dc2626';
      }
    }
  }

  public copyJsonIoText(): void {
    const textarea = document.getElementById('textarea-json-io') as HTMLTextAreaElement | null;
    const feedback = document.getElementById('json-io-feedback');
    if (!textarea) return;
    navigator.clipboard?.writeText(textarea.value).then(() => {
      if (feedback) {
        feedback.textContent = 'Copied JSON to clipboard.';
        feedback.style.color = '#15803d';
      }
    }).catch(() => {
      textarea.select();
      if (feedback) {
        feedback.textContent = 'Selected JSON text — press Ctrl+C to copy.';
        feedback.style.color = '#475569';
      }
    });
  }

  public copyAiPromptSchema(): void {
    const feedback = document.getElementById('json-io-feedback');
    const promptText = `Convert my tax documents/notes into a single valid JSON object matching this schema for ActuallyFreeTaxes.com (output ONLY raw JSON, no commentary):

{
  "year": 2024, // 2024 or 2025
  "filingStatus": "single", // "single" | "married_joint" | "married_separate" | "head_of_household" | "qualifying_surviving_spouse"
  "residentState": "NY", // 2-letter US state code or "DC"
  "w2s": [
    {
      "employer": "Company Name",
      "ein": "12-3456789",
      "box1": 0, "box2": 0, // Wages, Federal Tax Withheld
      "box3": 0, "box4": 0, // SS Wages, SS Tax Withheld
      "box5": 0, "box6": 0, // Medicare Wages, Medicare Tax Withheld
      "states": [
        { "state": "NY", "stateId": "", "stateWages": 0, "stateTaxWithheld": 0, "localWages": 0, "localTaxWithheld": 0, "localityName": "NYC" }
      ]
    }
  ],
  "otherIncome": {
    "interest": 0, // Bank 1099-INT taxable interest
    "sources": [
      // type: "1099-NEC" | "1099-DIV" | "1099-INT" | "1099-MISC" | "1099-G" | "1099-K" | "1099-R" | "SSA-1099" | "Schedule K-1" | "W-2G"
      { "type": "1099-DIV", "payer": "Vanguard", "amount": 0, "qualifiedDividends": 0, "accruedInterestPaid": 0, "taxExemptInterest": 0, "qbiEligible": false, "earlyDistributionPenalty": false, "federalTaxWithheld": 0, "state": "NY" }
    ],
    "capitalGains": { "shortTerm": 0, "longTerm": 0, "collectiblesGain": 0, "unrecaptured1250Gain": 0 },
    "scheduleCExpenses": 0,
    "scheduleERental": { "grossRents": 0, "expenses": 0, "depreciation": 0, "propertyState": "" }
  },
  "adjustments": { "studentLoan": 0, "ira": 0, "hsa": 0, "educatorExpenses": 0, "seRetirement": 0, "seHealthInsurance": 0, "alimonyPaid": 0 },
  "dependents": { "childrenCount": 0, "otherDependentsCount": 0, "age65OrBlindCount": 0, "childCareExpenses": 0, "educationExpensesAotc": 0, "educationExpensesLlc": 0, "foreignTaxCredit": 0, "cleanEnergyCredit": 0, "estimatedTaxPayments": 0 },
  "itemizedDeductions": { "medicalExpenses": 0, "realEstateTax": 0, "mortgageInterest": 0, "charity": 0, "gamblingLosses": 0 },
  "deductionMethod": "auto" // "auto" | "standard" | "itemized"
}`;
    navigator.clipboard?.writeText(promptText).then(() => {
      if (feedback) {
        feedback.textContent = 'Copied AI prompt + schema to clipboard! Paste it into your AI with your tax numbers, then paste the JSON back here.';
        feedback.style.color = '#15803d';
      }
    }).catch(() => {
      if (feedback) {
        feedback.textContent = 'Could not access clipboard automatically.';
        feedback.style.color = '#dc2626';
      }
    });
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
    setVal('input-adj-educator', this.state.adjustments?.educatorExpenses);
    setVal('input-adj-se-retirement', this.state.adjustments?.seRetirement);
    setVal('input-adj-se-health', this.state.adjustments?.seHealthInsurance);
    setVal('input-adj-alimony', this.state.adjustments?.alimonyPaid);
    setVal('input-other-interest', this.state.otherIncome?.interest);
    setVal('input-children-count', this.state.dependents?.childrenCount);
    setVal('input-other-dependents', this.state.dependents?.otherDependentsCount);
    setVal('input-age65-blind', this.state.dependents?.age65OrBlindCount);
    setVal('input-child-care', this.state.dependents?.childCareExpenses);
    setVal('input-edu-aotc', this.state.dependents?.educationExpensesAotc);
    setVal('input-edu-llc', this.state.dependents?.educationExpensesLlc);
    setVal('input-foreign-tax-credit', this.state.dependents?.foreignTaxCredit);
    setVal('input-clean-energy-credit', this.state.dependents?.cleanEnergyCredit);
    setVal('input-estimated-payments', this.state.dependents?.estimatedTaxPayments);
    setVal('input-capital-gains-st', this.state.otherIncome?.capitalGains?.shortTerm);
    setVal('input-capital-gains-lt', this.state.otherIncome?.capitalGains?.longTerm);
    setVal('input-capital-gains-collectibles', this.state.otherIncome?.capitalGains?.collectiblesGain);
    setVal('input-capital-gains-1250', this.state.otherIncome?.capitalGains?.unrecaptured1250Gain);
    setVal('input-1099-nec-expenses', this.state.otherIncome?.scheduleCExpenses);
    setVal('input-rental-gross', this.state.otherIncome?.scheduleERental?.grossRents);
    setVal('input-rental-expenses', this.state.otherIncome?.scheduleERental?.expenses);
    setVal('input-rental-depreciation', this.state.otherIncome?.scheduleERental?.depreciation);
    const rentalStEl = document.getElementById('input-rental-state') as HTMLInputElement | null;
    if (rentalStEl) rentalStEl.value = this.state.otherIncome?.scheduleERental?.propertyState || '';
    setVal('input-itemized-medical', this.state.itemizedDeductions?.medicalExpenses);
    setVal('input-itemized-salt', this.state.itemizedDeductions?.realEstateTax);
    setVal('input-itemized-mortgage', this.state.itemizedDeductions?.mortgageInterest);
    setVal('input-itemized-charity', this.state.itemizedDeductions?.charity);
    setVal('input-itemized-gambling', this.state.itemizedDeductions?.gamblingLosses);

    const toggleArrows = document.getElementById('toggle-all-arrows') as HTMLInputElement | null;
    if (toggleArrows) toggleArrows.checked = Boolean(this.state.showAllArrows);
    this.arrowEngine?.setShowAll(Boolean(this.state.showAllArrows));

    this.renderYearBadges();
    this.syncCollapsedStates();
  }

  private setCardCollapsed(card: HTMLElement, collapsed: boolean): void {
    card.classList.toggle('is-collapsed', collapsed);
    const btn = card.querySelector<HTMLButtonElement>(`[data-card-toggle="${card.id}"]`);
    if (btn) {
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.textContent = collapsed ? 'Expand ▾' : 'Minimize ▴';
    }
  }

  private setSectionCollapsed(section: HTMLElement, collapsed: boolean): void {
    section.classList.toggle('is-section-collapsed', collapsed);
    const btn = section.querySelector<HTMLButtonElement>(`[data-section-toggle="${section.id}"]`);
    if (btn) {
      btn.setAttribute('aria-expanded', String(!collapsed));
      btn.textContent = collapsed ? 'Expand ▾' : 'Minimize ▴';
    }
  }

  private toggleCardCollapse(cardId: string): void {
    const card = document.getElementById(cardId);
    if (!card) return;
    const nextCollapsed = !card.classList.contains('is-collapsed');
    this.setCardCollapsed(card, nextCollapsed);
    this.collapseState.cards[cardId] = nextCollapsed;
    this.saveCollapseState();
    this.arrowEngine?.scheduleRedraw();
  }

  private syncCollapsedStates(): void {
    document.querySelectorAll<HTMLElement>('.calc-card[id]').forEach(card => {
      if (Object.prototype.hasOwnProperty.call(this.collapseState.cards, card.id)) {
        this.setCardCollapsed(card, Boolean(this.collapseState.cards[card.id]));
        return;
      }
      if (card.dataset.autoCollapse === 'true') {
        const inputs = Array.from(card.querySelectorAll<HTMLInputElement>('input'));
        const hasData = inputs.some(input => {
          if (input.type === 'number') {
            const val = parseFloat(input.value);
            return !Number.isNaN(val) && val !== 0;
          }
          return input.value.trim() !== '';
        });
        this.setCardCollapsed(card, !hasData);
      } else if (card.querySelector(`[data-card-toggle="${card.id}"]`)) {
        this.setCardCollapsed(card, false);
      }
    });

    document.querySelectorAll<HTMLElement>('section[id]').forEach(section => {
      if (Object.prototype.hasOwnProperty.call(this.collapseState.sections, section.id)) {
        this.setSectionCollapsed(section, Boolean(this.collapseState.sections[section.id]));
      } else if (section.querySelector(`[data-section-toggle="${section.id}"]`)) {
        this.setSectionCollapsed(section, false);
      }
    });

    const capGainsDetails = document.getElementById('details-capital-gains-special') as HTMLDetailsElement | null;
    if (capGainsDetails) {
      if (typeof this.collapseState.detailsCapGains === 'boolean') {
        capGainsDetails.open = this.collapseState.detailsCapGains;
      } else {
        const cap = this.state.otherIncome?.capitalGains;
        const hasSpecialCapGains = Boolean((cap?.collectiblesGain ?? 0) !== 0 || (cap?.unrecaptured1250Gain ?? 0) !== 0);
        capGainsDetails.open = hasSpecialCapGains;
      }
    }

    this.arrowEngine?.scheduleRedraw();
  }

  private bindCollapseControls(): void {
    document.querySelectorAll<HTMLButtonElement>('[data-card-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const cardId = btn.dataset.cardToggle;
        if (cardId) this.toggleCardCollapse(cardId);
      });
    });

    document.querySelectorAll<HTMLButtonElement>('[data-section-toggle]').forEach(btn => {
      btn.addEventListener('click', () => {
        const sectionId = btn.dataset.sectionToggle;
        if (!sectionId) return;
        const section = document.getElementById(sectionId);
        if (!section) return;
        const nextCollapsed = !section.classList.contains('is-section-collapsed');
        this.setSectionCollapsed(section, nextCollapsed);
        this.collapseState.sections[sectionId] = nextCollapsed;
        this.saveCollapseState();
        this.arrowEngine?.scheduleRedraw();
      });
    });

    const capGainsDetails = document.getElementById('details-capital-gains-special') as HTMLDetailsElement | null;
    if (capGainsDetails) {
      capGainsDetails.addEventListener('toggle', () => {
        this.collapseState.detailsCapGains = capGainsDetails.open;
        this.saveCollapseState();
        this.arrowEngine?.scheduleRedraw();
      });
    }
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
        this.uiPrefs.showAllArrows = this.state.showAllArrows;
        this.saveUiPrefs();
        if (this.arrowEngine) {
          this.arrowEngine.setShowAll(this.state.showAllArrows);
        }
      });
    }

    const selectDraft = document.getElementById('select-draft') as HTMLSelectElement | null;
    if (selectDraft) {
      selectDraft.addEventListener('change', (e: Event) => {
        this.switchDraft((e.target as HTMLSelectElement).value);
      });
    }
    const btnNewDraft = document.getElementById('btn-new-draft');
    if (btnNewDraft) btnNewDraft.addEventListener('click', () => this.createNewDraft());
    const btnDupDraft = document.getElementById('btn-duplicate-draft');
    if (btnDupDraft) btnDupDraft.addEventListener('click', () => this.duplicateCurrentDraft());
    const btnRenameDraft = document.getElementById('btn-rename-draft');
    if (btnRenameDraft) btnRenameDraft.addEventListener('click', () => this.renameCurrentDraft());
    const btnDeleteDraft = document.getElementById('btn-delete-draft');
    if (btnDeleteDraft) btnDeleteDraft.addEventListener('click', () => this.deleteCurrentDraft());

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
      }
    };

    bindInput('input-adj-student-loan', val => this.state.adjustments.studentLoan = val);
    bindInput('input-adj-ira', val => this.state.adjustments.ira = val);
    bindInput('input-adj-hsa', val => this.state.adjustments.hsa = val);
    bindInput('input-adj-educator', val => this.state.adjustments.educatorExpenses = val);
    bindInput('input-adj-se-retirement', val => this.state.adjustments.seRetirement = val);
    bindInput('input-adj-se-health', val => this.state.adjustments.seHealthInsurance = val);
    bindInput('input-adj-alimony', val => this.state.adjustments.alimonyPaid = val);
    bindInput('input-other-interest', val => this.state.otherIncome.interest = val);
    bindInput('input-children-count', val => this.state.dependents.childrenCount = val);
    bindInput('input-other-dependents', val => this.state.dependents.otherDependentsCount = val);
    bindInput('input-age65-blind', val => this.state.dependents.age65OrBlindCount = val);
    bindInput('input-child-care', val => this.state.dependents.childCareExpenses = val);
    bindInput('input-edu-aotc', val => this.state.dependents.educationExpensesAotc = val);
    bindInput('input-edu-llc', val => this.state.dependents.educationExpensesLlc = val);
    bindInput('input-foreign-tax-credit', val => this.state.dependents.foreignTaxCredit = val);
    bindInput('input-clean-energy-credit', val => this.state.dependents.cleanEnergyCredit = val);
    bindInput('input-estimated-payments', val => this.state.dependents.estimatedTaxPayments = val);

    const getCapitalGains = () => {
      if (!this.state.otherIncome.capitalGains) {
        this.state.otherIncome.capitalGains = { shortTerm: 0, longTerm: 0 };
      }
      return this.state.otherIncome.capitalGains;
    };
    const getScheduleERental = () => {
      if (!this.state.otherIncome.scheduleERental) {
        this.state.otherIncome.scheduleERental = { grossRents: 0, expenses: 0, depreciation: 0, propertyState: '' };
      }
      return this.state.otherIncome.scheduleERental;
    };
    const getItemized = () => {
      if (!this.state.itemizedDeductions) {
        this.state.itemizedDeductions = { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 0 };
      }
      return this.state.itemizedDeductions;
    };

    // Capital gains, Schedule E rental & Schedule C expenses
    bindInput('input-capital-gains-st', val => getCapitalGains().shortTerm = val);
    bindInput('input-capital-gains-lt', val => getCapitalGains().longTerm = val);
    bindInput('input-capital-gains-collectibles', val => getCapitalGains().collectiblesGain = val);
    bindInput('input-capital-gains-1250', val => getCapitalGains().unrecaptured1250Gain = val);
    bindInput('input-1099-nec-expenses', val => this.state.otherIncome.scheduleCExpenses = val);
    bindInput('input-rental-gross', val => getScheduleERental().grossRents = val);
    bindInput('input-rental-expenses', val => getScheduleERental().expenses = val);
    bindInput('input-rental-depreciation', val => getScheduleERental().depreciation = val);
    const rentalStateInput = document.getElementById('input-rental-state') as HTMLInputElement | null;
    if (rentalStateInput) {
      rentalStateInput.addEventListener('input', (e: Event) => {
        getScheduleERental().propertyState = (e.target as HTMLInputElement).value.toUpperCase().trim();
        this.recalculateAndRender();
      });
    }

    // Schedule A Itemized deductions
    bindInput('input-itemized-medical', val => getItemized().medicalExpenses = val);
    bindInput('input-itemized-salt', val => getItemized().realEstateTax = val);
    bindInput('input-itemized-mortgage', val => getItemized().mortgageInterest = val);
    bindInput('input-itemized-charity', val => getItemized().charity = val);
    bindInput('input-itemized-gambling', val => getItemized().gamblingLosses = val);

    this.bindCollapseControls();

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

    // Welcome, About & How To Use modal bindings
    const btnCloseWelcome = document.getElementById('btn-close-welcome-modal');
    if (btnCloseWelcome) btnCloseWelcome.addEventListener('click', () => this.closeWelcomeModal(true));
    const btnWelcomeGotIt = document.getElementById('btn-welcome-got-it');
    if (btnWelcomeGotIt) btnWelcomeGotIt.addEventListener('click', () => this.closeWelcomeModal(true));
    const linkWelcomeAbout = document.getElementById('link-welcome-about');
    if (linkWelcomeAbout) linkWelcomeAbout.addEventListener('click', () => this.openAboutModal());
    const linkWelcomePrivacy = document.getElementById('link-welcome-privacy');
    if (linkWelcomePrivacy) linkWelcomePrivacy.addEventListener('click', () => this.openAboutModal('about-privacy-section'));
    const linkWelcomeHowTo = document.getElementById('link-welcome-howto');
    if (linkWelcomeHowTo) linkWelcomeHowTo.addEventListener('click', () => this.openHowToModal());

    const btnHeaderAbout = document.getElementById('btn-header-about');
    if (btnHeaderAbout) btnHeaderAbout.addEventListener('click', () => this.openAboutModal());
    ['btn-close-about-modal', 'btn-close-about-footer'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.closeAboutModal());
    });
    const aboutOverlay = document.getElementById('about-modal-overlay');
    if (aboutOverlay) {
      aboutOverlay.addEventListener('click', (e: Event) => {
        if (e.target === aboutOverlay) this.closeAboutModal();
      });
    }

    const btnHeaderHowTo = document.getElementById('btn-header-howto');
    if (btnHeaderHowTo) btnHeaderHowTo.addEventListener('click', () => this.openHowToModal());
    ['btn-close-howto-modal', 'btn-close-howto-footer'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.closeHowToModal());
    });
    const howToOverlay = document.getElementById('howto-modal-overlay');
    if (howToOverlay) {
      howToOverlay.addEventListener('click', (e: Event) => {
        if (e.target === howToOverlay) this.closeHowToModal();
      });
    }
    const btnCopyHowToImport = document.getElementById('btn-copy-howto-import-prompt');
    if (btnCopyHowToImport) {
      btnCopyHowToImport.addEventListener('click', () => this.copyPreText('howto-ai-import-prompt', 'howto-import-copy-status'));
    }
    const btnCopyHowToVerify = document.getElementById('btn-copy-howto-verify-prompt');
    if (btnCopyHowToVerify) {
      btnCopyHowToVerify.addEventListener('click', () => this.copyPreText('howto-ai-verify-prompt', 'howto-verify-copy-status'));
    }

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

    const btnOpenJsonIo = document.getElementById('btn-open-json-io');
    if (btnOpenJsonIo) btnOpenJsonIo.addEventListener('click', () => this.openJsonIoModal());
    ['btn-close-json-io-modal', 'btn-cancel-json-io'].forEach(id => {
      const btn = document.getElementById(id);
      if (btn) btn.addEventListener('click', () => this.closeJsonIoModal());
    });
    const jsonIoOverlay = document.getElementById('json-io-modal-overlay');
    if (jsonIoOverlay) {
      jsonIoOverlay.addEventListener('click', (e: Event) => {
        if (e.target === jsonIoOverlay) this.closeJsonIoModal();
      });
    }
    const btnApplyJsonIo = document.getElementById('btn-apply-json-io');
    if (btnApplyJsonIo) btnApplyJsonIo.addEventListener('click', () => this.applyJsonIoText());
    const btnCopyJsonIo = document.getElementById('btn-copy-json-io');
    if (btnCopyJsonIo) btnCopyJsonIo.addEventListener('click', () => this.copyJsonIoText());
    const btnCopyAiPrompt = document.getElementById('btn-copy-ai-prompt');
    if (btnCopyAiPrompt) btnCopyAiPrompt.addEventListener('click', () => this.copyAiPromptSchema());
    const btnRefreshJsonIo = document.getElementById('btn-refresh-json-io');
    if (btnRefreshJsonIo) btnRefreshJsonIo.addEventListener('click', () => this.openJsonIoModal());

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

    const applyAllExplanations = (allExpanded: boolean) => {
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

      if (globalToggle) {
        globalToggle.innerHTML = allExpanded
          ? '🔒 Collapse All Explanations'
          : '💡 Expand All Explanations';
        globalToggle.style.background = allExpanded ? '#fef3c7' : '#f0fdf4';
        globalToggle.style.color = allExpanded ? '#b45309' : '#15803d';
        globalToggle.style.borderColor = allExpanded ? '#fde68a' : '#bbf7d0';
      }
    };

    const globalToggle = document.getElementById('btn-toggle-all-explain') as HTMLButtonElement | null;
    if (globalToggle && !globalToggle.dataset.bound) {
      globalToggle.dataset.bound = 'true';
      let allExpanded = Boolean(this.uiPrefs.expandAllExplanations);
      if (allExpanded) applyAllExplanations(true);
      globalToggle.addEventListener('click', () => {
        allExpanded = !allExpanded;
        applyAllExplanations(allExpanded);
        this.uiPrefs.expandAllExplanations = allExpanded;
        this.saveUiPrefs();
      });
    } else if (this.uiPrefs.expandAllExplanations) {
      applyAllExplanations(true);
    }
  }

  private bindFilterToolbar(): void {
    const toolbar = document.getElementById('ratings-filter-toolbar');
    if (!toolbar) return;

    const applyRatingFilter = (filter: string) => {
      toolbar.querySelectorAll<HTMLButtonElement>('.filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.filter === filter);
      });
      document.body.classList.remove('filter-must-only', 'filter-savers-only', 'filter-hide-niche');
      if (filter === 'must-only') {
        document.body.classList.add('filter-must-only');
      } else if (filter === 'savers-only') {
        document.body.classList.add('filter-savers-only');
      } else if (filter === 'hide-niche') {
        document.body.classList.add('filter-hide-niche');
      }
    };

    if (this.uiPrefs.ratingFilter) {
      applyRatingFilter(this.uiPrefs.ratingFilter);
    }

    toolbar.querySelectorAll<HTMLButtonElement>('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const filter = chip.dataset.filter || 'all';
        applyRatingFilter(filter);
        this.uiPrefs.ratingFilter = filter;
        this.saveUiPrefs();
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
      'calc-fica-breakdown',
      'calc-unified-summary'
    ];

    cardMap.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        el.addEventListener('click', () => {
          const curr = this.arrowEngine?.getSelectedNode();
          this.arrowEngine?.setSelectedNode(curr === id ? null : id);
        });
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

  public addIncomeSource(type: IncomeSource['type'] = '1099-NEC'): void {
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
      } else if (src.type === '1099-MISC' || src.type === '1099-G' || src.type === 'W-2G' || src.type === 'Other') {
        ratingKey = 'income-1099-misc';
        priorityClass = 'priority-skip';
      } else if (src.type === '1099-INT') {
        ratingKey = 'other-interest';
        priorityClass = 'priority-verify';
      }

      const card = document.createElement('div');
      card.className = `calc-card input-panel ${priorityClass}`;
      card.id = `income-source-card-${src.id}`;
      card.style.position = 'relative';

      card.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.4rem;">
          <div style="display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap;">
            <select class="w2-input" id="select-income-type-${src.id}" style="padding: 0.25rem 0.5rem; width: auto;">
              <option value="1099-NEC" ${src.type === '1099-NEC' ? 'selected' : ''}>Form 1099-NEC (Freelance/Contract)</option>
              <option value="1099-DIV" ${src.type === '1099-DIV' ? 'selected' : ''}>Form 1099-DIV (Dividends)</option>
              <option value="1099-INT" ${src.type === '1099-INT' ? 'selected' : ''}>Form 1099-INT (Interest)</option>
              <option value="1099-R" ${src.type === '1099-R' ? 'selected' : ''}>Form 1099-R (IRA / 401k / Pension)</option>
              <option value="SSA-1099" ${src.type === 'SSA-1099' ? 'selected' : ''}>Form SSA-1099 (Social Security)</option>
              <option value="Schedule K-1" ${src.type === 'Schedule K-1' ? 'selected' : ''}>Schedule K-1 (Partnership / S-Corp)</option>
              <option value="1099-G" ${src.type === '1099-G' ? 'selected' : ''}>Form 1099-G (Unemployment / Refund)</option>
              <option value="W-2G" ${src.type === 'W-2G' ? 'selected' : ''}>Form W-2G (Gambling Winnings)</option>
              <option value="1099-MISC" ${src.type === '1099-MISC' ? 'selected' : ''}>Form 1099-MISC (Prizes/Other)</option>
              <option value="Other" ${src.type === 'Other' ? 'selected' : ''}>Other Taxable Income</option>
            </select>
            ${renderExplainToggleBtn(`drawer-explain-income-${src.id}`)}
            ${renderRatingPill(ratingKey)}
          </div>
          <button type="button" class="btn btn-sm" id="btn-del-income-${src.id}" title="Remove this income source">
            ✕
          </button>
        </div>

        <div style="display: flex; gap: 0.5rem; margin-bottom: 0.5rem;">
          <input type="text" class="w2-input" id="input-income-payer-${src.id}" value="${src.payer}" placeholder="Payer / Client Name" style="flex: 2; text-align: left;">
          <select class="w2-input" id="select-income-state-${src.id}" style="flex: 1;" title="State where this income was earned">
            <option value="">Default (Home State)</option>
            ${US_STATES.map(s => `<option value="${s.code}" ${src.state === s.code ? 'selected' : ''}>${s.code} - ${s.name}</option>`).join('')}
          </select>
        </div>

        <div class="w2-input-wrapper">
          <span class="currency-symbol">$</span>
          <input type="number" step="any" class="w2-input" id="input-income-source-${src.id}" value="${src.amount}" placeholder="0">
        </div>
        ${src.type === '1099-DIV' ? `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
          <label for="input-income-qdiv-${src.id}" style="font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap;">Box 1b Qualified Dividends ($):</label>
          <div class="w2-input-wrapper" style="flex: 1;">
            <span class="currency-symbol">$</span>
            <input type="number" step="any" class="w2-input" id="input-income-qdiv-${src.id}" value="${src.qualifiedDividends || 0}" placeholder="0">
          </div>
        </div>
        ` : ''}
        ${src.type === '1099-INT' ? `
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.5rem; margin-top: 0.5rem;">
          <div>
            <label for="input-income-accrued-${src.id}" class="input-sublabel">Accrued Interest Paid ($)</label>
            <div class="w2-input-wrapper">
              <span class="currency-symbol">$</span>
              <input type="number" step="any" class="w2-input" id="input-income-accrued-${src.id}" value="${src.accruedInterestPaid || 0}" placeholder="0">
            </div>
          </div>
          <div>
            <label for="input-income-taxexempt-${src.id}" class="input-sublabel">Box 8 Tax-Exempt Int ($)</label>
            <div class="w2-input-wrapper">
              <span class="currency-symbol">$</span>
              <input type="number" step="any" class="w2-input" id="input-income-taxexempt-${src.id}" value="${src.taxExemptInterest || 0}" placeholder="0">
            </div>
          </div>
        </div>
        ` : ''}
        ${src.type === '1099-R' ? `
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
          <label style="font-size: 0.85rem; color: var(--text-secondary); display: flex; align-items: center; gap: 0.35rem; cursor: pointer;">
            <input type="checkbox" id="input-income-penalty-${src.id}" ${src.earlyDistributionPenalty ? 'checked' : ''}>
            Subject to 10% Early Withdrawal Penalty (Form 5329, Code 1)
          </label>
        </div>
        ` : ''}
        <div style="display: flex; align-items: center; gap: 0.5rem; margin-top: 0.5rem;">
          <label for="input-income-fedwh-${src.id}" style="font-size: 0.85rem; color: var(--text-secondary); white-space: nowrap;">Box 4 Federal Tax Withheld ($):</label>
          <div class="w2-input-wrapper" style="flex: 1;">
            <span class="currency-symbol">$</span>
            <input type="number" step="any" class="w2-input" id="input-income-fedwh-${src.id}" value="${src.federalTaxWithheld || 0}" placeholder="0">
          </div>
        </div>
        <div class="input-card-hint">
          Reported on Form 1040 and feeds into Gross Income and State Sourced Income.
        </div>
        ${renderFieldExplanationDrawer(ratingKey, `drawer-explain-income-${src.id}`)}
      `;

      container.appendChild(card);

      const typeSelect = card.querySelector(`#select-income-type-${src.id}`) as HTMLSelectElement | null;
      if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
          src.type = (e.target as HTMLSelectElement).value as any;
          this.renderIncomeSources();
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

      const qdivInput = card.querySelector(`#input-income-qdiv-${src.id}`) as HTMLInputElement | null;
      if (qdivInput) {
        qdivInput.addEventListener('input', (e) => {
          src.qualifiedDividends = Number((e.target as HTMLInputElement).value) || 0;
          this.recalculateAndRender();
        });
      }

      const accruedInput = card.querySelector(`#input-income-accrued-${src.id}`) as HTMLInputElement | null;
      if (accruedInput) {
        accruedInput.addEventListener('input', (e) => {
          src.accruedInterestPaid = Number((e.target as HTMLInputElement).value) || 0;
          this.recalculateAndRender();
        });
      }

      const taxExemptInput = card.querySelector(`#input-income-taxexempt-${src.id}`) as HTMLInputElement | null;
      if (taxExemptInput) {
        taxExemptInput.addEventListener('input', (e) => {
          src.taxExemptInterest = Number((e.target as HTMLInputElement).value) || 0;
          this.recalculateAndRender();
        });
      }

      const penaltyChk = card.querySelector(`#input-income-penalty-${src.id}`) as HTMLInputElement | null;
      if (penaltyChk) {
        penaltyChk.addEventListener('change', (e) => {
          src.earlyDistributionPenalty = (e.target as HTMLInputElement).checked;
          this.recalculateAndRender();
        });
      }

      const fedWhInput = card.querySelector(`#input-income-fedwh-${src.id}`) as HTMLInputElement | null;
      if (fedWhInput) {
        fedWhInput.addEventListener('input', (e) => {
          src.federalTaxWithheld = Number((e.target as HTMLInputElement).value) || 0;
          this.recalculateAndRender();
        });
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
    // Reset collapse overrides and optional state fields before applying preset
    this.collapseState = { cards: {}, sections: {} };
    this.saveCollapseState();
    this.state.otherIncome.sources = [];
    this.state.otherIncome.capitalGains = { shortTerm: 0, longTerm: 0, collectiblesGain: 0, unrecaptured1250Gain: 0 };
    this.state.otherIncome.scheduleCExpenses = 0;
    this.state.otherIncome.scheduleERental = {
      grossRents: 0,
      expenses: 0,
      depreciation: 0,
      propertyState: ''
    };
    this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 0, educatorExpenses: 0, seRetirement: 0, seHealthInsurance: 0, alimonyPaid: 0 };
    this.state.dependents = {
      childrenCount: 0,
      otherDependentsCount: 0,
      age65OrBlindCount: 0,
      childCareExpenses: 0,
      educationExpensesAotc: 0,
      educationExpensesLlc: 0,
      foreignTaxCredit: 0,
      cleanEnergyCredit: 0,
      estimatedTaxPayments: 0
    };
    this.state.itemizedDeductions = {
      medicalExpenses: 0,
      realEstateTax: 0,
      mortgageInterest: 0,
      charity: 0,
      gamblingLosses: 0
    };
    this.state.deductionMethod = 'auto';

    if (presetName === 'nyc-dc-investor') {
      this.state.filingStatus = 'single';
      this.state.residentState = 'NY';
      this.state.w2s = [
        {
          id: 0,
          employer: 'Midtown FinTech Corp (NYC - Job 1)',
          ein: '13-4012980',
          box1: 95000,
          box2: 15200,
          box3: 95000,
          box4: 5890,
          box5: 95000,
          box6: 1377.50,
          states: [{
            id: 0,
            state: 'NY',
            stateId: 'NY-4012980',
            stateWages: 95000,
            stateTaxWithheld: 5130,
            localWages: 95000,
            localTaxWithheld: 3420,
            localityName: 'NYC'
          }]
        },
        {
          id: 1,
          employer: 'Hudson River AI Labs (NYC - Job 2)',
          ein: '13-8841205',
          box1: 115000,
          box2: 19550,
          box3: 115000,
          box4: 7130,
          box5: 115000,
          box6: 1667.50,
          states: [{
            id: 1,
            state: 'NY',
            stateId: 'NY-8841205',
            stateWages: 115000,
            stateTaxWithheld: 6440,
            localWages: 115000,
            localTaxWithheld: 4190,
            localityName: 'NYC'
          }]
        }
      ];
      this.state.otherIncome.interest = 1850;
      this.state.otherIncome.sources = [
        {
          id: 1,
          type: '1099-INT',
          payer: 'Fidelity Bond Account (Accrued Interest)',
          amount: 1420,
          accruedInterestPaid: 220,
          state: 'NY'
        },
        {
          id: 2,
          type: '1099-DIV',
          payer: 'Vanguard Brokerage (Dividends Paid)',
          amount: 3600,
          qualifiedDividends: 3000,
          state: 'NY'
        },
        {
          id: 3,
          type: '1099-DIV',
          payer: 'Charles Schwab Portfolio (Dividends Paid)',
          amount: 2150,
          qualifiedDividends: 1800,
          state: 'NY'
        }
      ];
      this.state.otherIncome.scheduleERental = {
        grossRents: 28000,
        expenses: 8200,
        depreciation: 5000,
        propertyState: 'DC'
      };
      this.state.otherIncome.capitalGains = {
        shortTerm: -2400,
        longTerm: 14500
      };
      this.state.adjustments = { studentLoan: 0, ira: 0, hsa: 2000 };
      this.state.dependents.childrenCount = 0;
      this.state.itemizedDeductions = {
        medicalExpenses: 0,
        realEstateTax: 4800,
        mortgageInterest: 11200,
        charity: 2500
      };
    } else if (presetName === 'single-75k') {
      this.state.filingStatus = 'single';
      this.state.residentState = 'CA';
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
      this.state.residentState = 'CA';
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
      this.state.residentState = 'IL';
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
      this.state.residentState = 'TX';
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
    } else if (presetName === 'freelancer-solo401k') {
      this.state.filingStatus = 'single';
      this.state.residentState = 'CO';
      this.state.w2s = [];
      this.state.otherIncome.sources = [
        {
          id: 1,
          type: '1099-NEC',
          payer: 'Acme Consulting Clients',
          amount: 145000,
          qualifiedDividends: 0,
          federalTaxWithheld: 0,
          state: 'CO'
        }
      ];
      this.state.otherIncome.scheduleCExpenses = 18500;
      this.state.otherIncome.interest = 620;
      this.state.adjustments.seRetirement = 22000;
      this.state.adjustments.seHealthInsurance = 7200;
      this.state.dependents.estimatedTaxPayments = 24000;
    } else if (presetName === 'retiree-ssa-pension') {
      this.state.filingStatus = 'married_joint';
      this.state.residentState = 'AZ';
      this.state.w2s = [];
      this.state.dependents.age65OrBlindCount = 2;
      this.state.otherIncome.interest = 3200;
      this.state.otherIncome.sources = [
        {
          id: 1,
          type: 'SSA-1099',
          payer: 'Social Security Administration',
          amount: 48000,
          qualifiedDividends: 0,
          federalTaxWithheld: 0,
          state: 'AZ'
        },
        {
          id: 2,
          type: '1099-R',
          payer: 'Fidelity Traditional IRA / Pension',
          amount: 55000,
          qualifiedDividends: 0,
          federalTaxWithheld: 6000,
          state: 'AZ'
        },
        {
          id: 3,
          type: '1099-DIV',
          payer: 'Vanguard Retirement Income Fund',
          amount: 8500,
          qualifiedDividends: 6400,
          federalTaxWithheld: 0,
          state: 'AZ'
        }
      ];
    } else if (presetName === 'reciprocal-pa-nj') {
      this.state.filingStatus = 'single';
      this.state.residentState = 'PA';
      this.state.w2s = [{
        id: 0,
        employer: 'Camden Riverfront Corp (NJ)',
        ein: '22-3344556',
        box1: 92000,
        box2: 11800,
        box3: 92000,
        box4: 5704,
        box5: 92000,
        box6: 1334,
        states: [{
          id: 0,
          state: 'NJ',
          stateId: 'NJ-998877',
          stateWages: 92000,
          stateTaxWithheld: 0,
          localWages: 0,
          localTaxWithheld: 0,
          localityName: ''
        }]
      }];
      this.state.otherIncome.interest = 350;
      this.state.adjustments = { studentLoan: 0, ira: 3000, hsa: 0 };
    } else if (presetName === 'blank') {
      this.state.filingStatus = 'single';
      this.state.residentState = 'CA';
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

    this.syncOpenPanelsWithState();
    this.renderW2Forms();
    this.renderFederalPanelSections();
    this.renderStateSections();
    this.syncAllDomInputs();
    this.recalculateAndRender();
  }

  private renderYearBadges(): void {
    document.querySelectorAll('.current-tax-year-text').forEach(el => {
      el.textContent = String(this.state.year);
    });
  }

  private renderStateOptions(selectedCode: string, shortDisplay: boolean = false): string {
    return US_STATES.map(s => {
      const isSel = s.code === selectedCode ? 'selected' : '';
      if (shortDisplay) {
        return `<option value="${s.code}" ${isSel} title="${s.code} — ${s.name}">${s.code}</option>`;
      }
      const noTax = s.noIncomeTax ? ' (No Income Tax)' : '';
      return `<option value="${s.code}" ${isSel}>${s.code} — ${s.name}${noTax}</option>`;
    }).join('');
  }

  private renderW2Forms(): void {
    const container = document.getElementById('w2-list-container');
    if (!container) return;

    container.innerHTML = '';

    this.state.w2s.forEach((w2: W2Data, index: number) => {
      if (!w2.states || w2.states.length === 0) {
        w2.states = [{
          id: 0,
          state: this.state.residentState || 'CA',
          stateId: '',
          stateWages: w2.box1,
          stateTaxWithheld: 0,
          localWages: 0,
          localTaxWithheld: 0,
          localityName: ''
        }];
      }

      const group = document.createElement('div');
      group.className = 'w2-employer-group';
      group.id = `w2-card-${w2.id}`;

      const stateW2CardsHtml = w2.states.map((st, sIdx) => `
        <div class="w2-literal-card state-w2-overlay-card" id="w2-${w2.id}-state-card-${st.id}">
          <div class="w2-literal-toolbar">
            <div class="toolbar-left">
              <span class="doc-badge" style="background: rgba(139, 92, 246, 0.25); border-color: rgba(139, 92, 246, 0.5);">State W-2 #${sIdx + 1}</span>
              <span class="w2-title">${w2.employer || 'Employer'} — ${st.state} State Copy</span>
            </div>
            <div class="toolbar-right">
              ${w2.states.length > 1 ? `
                <button type="button" class="btn btn-sm" style="color: #fca5a5; border-color: rgba(239,68,68,0.4); background: rgba(239,68,68,0.1); font-weight: 700; font-size: 0.8rem;" data-remove-state="${w2.id}:${st.id}">
                  ✕ Remove State W-2
                </button>
              ` : ''}
            </div>
          </div>

          <div class="w2-literal-scroll">
            <div class="w2-literal-container" id="w2-${w2.id}-state-${st.id}-doc-canvas">
              <div class="w2-overlay-box box-a">
                <input type="text" class="w2-overlay-input" value="${w2.employeeSsn || ''}" placeholder="***-**-1234" data-w2-field="employeeSsn" data-w2-id="${w2.id}">
              </div>
              <div class="w2-overlay-box box-b">
                <input type="text" class="w2-overlay-input" value="${w2.ein}" placeholder="00-0000000" data-w2-field="ein" data-w2-id="${w2.id}">
              </div>
              <div class="w2-overlay-box box-c">
                <textarea class="w2-overlay-textarea" data-w2-field="employer" data-w2-id="${w2.id}" placeholder="Employer Name, Address, City, State ZIP">${w2.employer}</textarea>
              </div>
              <div class="w2-overlay-box box-e">
                <input type="text" class="w2-overlay-input" placeholder="Employee Name" value="${w2.employeeName || ''}" data-w2-field="employeeName" data-w2-id="${w2.id}">
              </div>

              <!-- State Row 1: Boxes 15-20 for this State W-2 -->
              <div class="w2-overlay-box row1-box-15-state box-highlight-state" id="w2-${w2.id}-state-${st.id}-box15-state">
                <select class="w2-overlay-select" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="state" style="text-align: center; font-weight: 800;">
                  ${this.renderStateOptions(st.state, true)}
                </select>
              </div>
              <div class="w2-overlay-box row1-box-15-id">
                <input type="text" class="w2-overlay-input" value="${st.stateId}" placeholder="State ID No." data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateId">
              </div>
              <div class="w2-overlay-box row1-box-16 box-highlight-state" id="w2-${w2.id}-state-${st.id}-box16-container">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-state-${st.id}-box16" value="${st.stateWages}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateWages">
                </div>
              </div>
              <div class="w2-overlay-box row1-box-17 box-highlight-state" id="w2-${w2.id}-state-${st.id}-box17-container">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-state-${st.id}-box17" value="${st.stateTaxWithheld}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="stateTaxWithheld">
                </div>
              </div>
              <div class="w2-overlay-box row1-box-18">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" value="${st.localWages}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localWages">
                </div>
              </div>
              <div class="w2-overlay-box row1-box-19">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" value="${st.localTaxWithheld}" placeholder="0" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localTaxWithheld">
                </div>
              </div>
              <div class="w2-overlay-box row1-box-20">
                <input type="text" class="w2-overlay-input" value="${st.localityName}" placeholder="Locality" data-w2-id="${w2.id}" data-state-id="${st.id}" data-state-field="localityName">
              </div>
            </div>
          </div>
        </div>
      `).join('');

      group.innerHTML = `
        <div class="w2-employer-header">
          <div class="w2-employer-title-wrap">
            <h3 style="margin: 0; font-size: 1.05rem; font-weight: 800; color: #0f172a;">
              Employer #${index + 1}: ${w2.employer || 'New Employer'}
            </h3>
            ${renderW2HeaderCircles()}
          </div>
          <div>
            ${this.state.w2s.length > 1 ? `
              <button type="button" class="btn btn-sm" style="color: #dc2626; border-color: #fecaca; background: #fef2f2; font-weight: 700;" data-remove-w2="${w2.id}">
                ✕ Remove Employer
              </button>
            ` : ''}
          </div>
        </div>

        <!-- Federal W-2 PDF Overlay -->
        <div class="w2-literal-card">
          <div class="w2-literal-toolbar">
            <div class="toolbar-left">
              <span class="doc-badge">Federal Form W-2</span>
              <span class="w2-title">${w2.employer || 'Employer'} — Federal Copy</span>
            </div>
          </div>

          <div class="w2-literal-scroll">
            <div class="w2-literal-container" id="w2-${w2.id}-doc-canvas">
              <!-- Box a: Employee's SSN (Editable) -->
              <div class="w2-overlay-box box-a">
                <input type="text" class="w2-overlay-input" value="${w2.employeeSsn || ''}" placeholder="***-**-1234" data-w2-field="employeeSsn" data-w2-id="${w2.id}">
              </div>

              <!-- Box b: Employer Identification Number (EIN) -->
              <div class="w2-overlay-box box-b">
                <input type="text" class="w2-overlay-input" value="${w2.ein}" data-w2-field="ein" data-w2-id="${w2.id}" placeholder="00-0000000">
              </div>

              <!-- Box c: Employer's name, address, and ZIP code -->
              <div class="w2-overlay-box box-c">
                <textarea class="w2-overlay-textarea" data-w2-field="employer" data-w2-id="${w2.id}" placeholder="Employer Name, Address, City, State ZIP">${w2.employer}</textarea>
              </div>

              <!-- Box d: Control number -->
              <div class="w2-overlay-box box-d">
                <input type="text" class="w2-overlay-input" placeholder="Control No." value="${w2.controlNumber || ''}" data-w2-field="controlNumber" data-w2-id="${w2.id}">
              </div>

              <!-- Box e: Employee's name -->
              <div class="w2-overlay-box box-e">
                <input type="text" class="w2-overlay-input" placeholder="Employee Name" value="${w2.employeeName || ''}" data-w2-field="employeeName" data-w2-id="${w2.id}">
              </div>

              <!-- Box f: Employee's address and ZIP code (multi-line to right of label) -->
              <div class="w2-overlay-box box-f">
                <textarea class="w2-overlay-textarea" placeholder="Employee Address&#10;City, State ZIP" data-w2-field="employeeAddress" data-w2-id="${w2.id}">${w2.employeeAddress || ''}</textarea>
              </div>

              <!-- Box 1: Wages, tips, other compensation -->
              <div class="w2-overlay-box box-1 box-highlight-wages" id="w2-${w2.id}-box1-container">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box1" value="${w2.box1}" placeholder="0">
                </div>
              </div>

              <!-- Box 2: Federal income tax withheld -->
              <div class="w2-overlay-box box-2 box-highlight-withholding" id="w2-${w2.id}-box2-container">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box2" value="${w2.box2}" placeholder="0">
                </div>
              </div>

              <!-- Box 3: Social security wages -->
              <div class="w2-overlay-box box-3 box-highlight-ss" id="w2-${w2.id}-box3-container">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box3" value="${w2.box3}" placeholder="0">
                </div>
              </div>

              <!-- Box 4: Social security tax withheld -->
              <div class="w2-overlay-box box-4 box-highlight-ss" id="w2-${w2.id}-box4-container">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box4" value="${w2.box4}" placeholder="0">
                </div>
              </div>

              <!-- Box 5: Medicare wages and tips -->
              <div class="w2-overlay-box box-5 box-highlight-medicare" id="w2-${w2.id}-box5-container">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box5" value="${w2.box5}" placeholder="0">
                </div>
              </div>

              <!-- Box 6: Medicare tax withheld -->
              <div class="w2-overlay-box box-6 box-highlight-medicare" id="w2-${w2.id}-box6-container">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box6" value="${w2.box6}" placeholder="0">
                </div>
              </div>

              <!-- Box 7: Social security tips -->
              <div class="w2-overlay-box box-7">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box7" value="${w2.box7 || ''}" placeholder="0" data-w2-field="box7" data-w2-id="${w2.id}">
                </div>
              </div>

              <!-- Box 8: Allocated tips -->
              <div class="w2-overlay-box box-8">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box8" value="${w2.box8 || ''}" placeholder="0" data-w2-field="box8" data-w2-id="${w2.id}">
                </div>
              </div>

              <!-- Box 10: Dependent care benefits -->
              <div class="w2-overlay-box box-10">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box10" value="${w2.box10 || ''}" placeholder="0" data-w2-field="box10" data-w2-id="${w2.id}">
                </div>
              </div>

              <!-- Box 11: Nonqualified plans -->
              <div class="w2-overlay-box box-11">
                <div class="w2-overlay-input-wrap">
                  <span class="w2-overlay-curr">$</span>
                  <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box11" value="${w2.box11 || ''}" placeholder="0" data-w2-field="box11" data-w2-id="${w2.id}">
                </div>
              </div>

              <!-- Box 12a-12d: Code & Amount -->
              <div class="w2-overlay-box box-12" id="w2-${w2.id}-box12-container">
                <div class="box-12-rows">
                  <div class="box-12-row">
                    <input type="text" class="w2-overlay-input box-12-code" value="${w2.box12aCode ?? w2.box12Code ?? ''}" placeholder="12a" data-w2-id="${w2.id}" data-w2-field="box12aCode">
                    <div class="w2-overlay-input-wrap box-12-amt-wrap">
                      <span class="w2-overlay-curr">$</span>
                      <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box12a-amt" value="${w2.box12aAmount ?? w2.box12Amount ?? ''}" placeholder="0" data-w2-id="${w2.id}" data-w2-field="box12aAmount">
                    </div>
                  </div>
                  <div class="box-12-row">
                    <input type="text" class="w2-overlay-input box-12-code" value="${w2.box12bCode || ''}" placeholder="12b" data-w2-id="${w2.id}" data-w2-field="box12bCode">
                    <div class="w2-overlay-input-wrap box-12-amt-wrap">
                      <span class="w2-overlay-curr">$</span>
                      <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box12b-amt" value="${w2.box12bAmount || ''}" placeholder="0" data-w2-id="${w2.id}" data-w2-field="box12bAmount">
                    </div>
                  </div>
                  <div class="box-12-row">
                    <input type="text" class="w2-overlay-input box-12-code" value="${w2.box12cCode || ''}" placeholder="12c" data-w2-id="${w2.id}" data-w2-field="box12cCode">
                    <div class="w2-overlay-input-wrap box-12-amt-wrap">
                      <span class="w2-overlay-curr">$</span>
                      <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box12c-amt" value="${w2.box12cAmount || ''}" placeholder="0" data-w2-id="${w2.id}" data-w2-field="box12cAmount">
                    </div>
                  </div>
                  <div class="box-12-row">
                    <input type="text" class="w2-overlay-input box-12-code" value="${w2.box12dCode || ''}" placeholder="12d" data-w2-id="${w2.id}" data-w2-field="box12dCode">
                    <div class="w2-overlay-input-wrap box-12-amt-wrap">
                      <span class="w2-overlay-curr">$</span>
                      <input type="number" step="any" class="w2-overlay-input num" id="w2-${w2.id}-box12d-amt" value="${w2.box12dAmount || ''}" placeholder="0" data-w2-id="${w2.id}" data-w2-field="box12dAmount">
                    </div>
                  </div>
                </div>
              </div>

              <!-- Box 13: Statutory employee, Retirement plan, Third-party sick pay -->
              <div class="w2-overlay-box box-13">
                <div class="box-13-checks">
                  <label class="box-13-check-label" title="Statutory employee">
                    <input type="checkbox" data-w2-field="box13Statutory" data-w2-id="${w2.id}" ${w2.box13Statutory ? 'checked' : ''}>
                  </label>
                  <label class="box-13-check-label" title="Retirement plan">
                    <input type="checkbox" data-w2-field="box13Retirement" data-w2-id="${w2.id}" ${w2.box13Retirement ? 'checked' : ''}>
                  </label>
                  <label class="box-13-check-label" title="Third-party sick pay">
                    <input type="checkbox" data-w2-field="box13ThirdPartySick" data-w2-id="${w2.id}" ${w2.box13ThirdPartySick ? 'checked' : ''}>
                  </label>
                </div>
              </div>

              <!-- Box 14: Other (14a + 14b split) -->
              <div class="w2-overlay-box box-14">
                <div class="box-14-rows">
                  <div class="box-14-row-a">
                    <input type="text" class="w2-overlay-input" placeholder="14 Other (e.g. CA SDI)" value="${w2.box14 || ''}" data-w2-field="box14" data-w2-id="${w2.id}">
                  </div>
                  <div class="box-14-row-b">
                    <input type="text" class="w2-overlay-input" placeholder="14b Left" value="${w2.box14bLeft || ''}" data-w2-field="box14bLeft" data-w2-id="${w2.id}">
                    <input type="text" class="w2-overlay-input" placeholder="14b Right" value="${w2.box14bRight || ''}" data-w2-field="box14bRight" data-w2-id="${w2.id}">
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- State W-2 PDF Overlays -->
        ${stateW2CardsHtml}

        <!-- Option to add a State W-2 always below the last State W-2 for this employer -->
        <div class="w2-add-state-bar">
          <button type="button" class="btn btn-outline" data-add-state="${w2.id}">
            + Add State W-2
          </button>
          <span style="font-size: 0.8rem; color: #64748b;">
            ${w2.states.length} State W-2${w2.states.length === 1 ? '' : 's'} attached for this employer
          </span>
        </div>
      `;

      container.appendChild(group);
    });

    this.bindW2Events();
  }

  private bindW2Events(): void {
    this.state.w2s.forEach(w2 => {
      // Click W-2 card to select & highlight its dependency arrows
      const fedCard = document.querySelector<HTMLElement>(`#w2-card-${w2.id} > .w2-literal-card`);
      if (fedCard) {
        fedCard.addEventListener('click', (e: Event) => {
          const target = e.target as HTMLElement;
          if (target.closest('button')) return;
          const fedIds = [`w2-${w2.id}-box1`, `w2-${w2.id}-box2`, `w2-${w2.id}-box3`, `w2-${w2.id}-box4`, `w2-${w2.id}-box5`, `w2-${w2.id}-box6`];
          const curr = this.arrowEngine?.getSelectedNode();
          if (curr === `w2-fed-${w2.id}` && !target.closest('input, select, textarea')) {
            this.arrowEngine?.setSelectedNode(null);
          } else {
            this.arrowEngine?.setSelectedNode(`w2-fed-${w2.id}`, fedIds);
          }
          document.querySelectorAll('.panel-selected').forEach(el => el.classList.remove('panel-selected'));
          if (this.arrowEngine?.getSelectedNode() === `w2-fed-${w2.id}`) {
            fedCard.classList.add('panel-selected');
          }
        });
      }

      const bindTextProp = (field: keyof W2Data) => {
        document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[data-w2-field="${String(field)}"][data-w2-id="${w2.id}"]`).forEach(el => {
          el.addEventListener('input', (e: Event) => {
            (w2 as any)[field] = (e.target as HTMLInputElement).value;
            this.saveDraft();
          });
        });
      };
      bindTextProp('employer');
      bindTextProp('ein');
      bindTextProp('employeeSsn');
      bindTextProp('controlNumber');
      bindTextProp('employeeName');
      bindTextProp('employeeAddress');
      bindTextProp('box12aCode');
      bindTextProp('box12bCode');
      bindTextProp('box12cCode');
      bindTextProp('box12dCode');
      bindTextProp('box14');
      bindTextProp('box14bLeft');
      bindTextProp('box14bRight');

      const bindCheckProp = (field: keyof W2Data) => {
        document.querySelectorAll<HTMLInputElement>(`input[type="checkbox"][data-w2-field="${String(field)}"][data-w2-id="${w2.id}"]`).forEach(el => {
          el.addEventListener('change', () => {
            (w2 as any)[field] = el.checked;
            this.saveDraft();
          });
        });
      };
      bindCheckProp('box13Statutory');
      bindCheckProp('box13Retirement');
      bindCheckProp('box13ThirdPartySick');

      const bindNumProp = (field: keyof W2Data) => {
        document.querySelectorAll<HTMLInputElement>(`[data-w2-field="${String(field)}"][data-w2-id="${w2.id}"]`).forEach(el => {
          el.addEventListener('input', (e: Event) => {
            (w2 as any)[field] = Number((e.target as HTMLInputElement).value) || 0;
            this.saveDraft();
          });
        });
      };
      bindNumProp('box7');
      bindNumProp('box8');
      bindNumProp('box10');
      bindNumProp('box11');
      bindNumProp('box12aAmount');
      bindNumProp('box12bAmount');
      bindNumProp('box12cAmount');
      bindNumProp('box12dAmount');

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

            if (w2.states && w2.states.length === 1 && (w2.states[0].stateWages === 0 || w2.states[0].stateWages === val)) {
              w2.states[0].stateWages = val;
              const sw = document.getElementById(`w2-${w2.id}-state-${w2.states[0].id}-box16`) as HTMLInputElement | null;
              if (sw) sw.value = String(val);
            }
          }

          this.recalculateAndRender();
        });
      };

      bindW2Field(1, 'box1', true);
      bindW2Field(2, 'box2');
      bindW2Field(3, 'box3');
      bindW2Field(4, 'box4');
      bindW2Field(5, 'box5');
      bindW2Field(6, 'box6');

      // State Boxes 15-20 fields
      w2.states.forEach(st => {
        const stateCard = document.getElementById(`w2-${w2.id}-state-card-${st.id}`);
        if (stateCard) {
          stateCard.addEventListener('click', (e: Event) => {
            const target = e.target as HTMLElement;
            if (target.closest('button')) return;
            const stIds = [`w2-${w2.id}-state-${st.id}-box16`, `w2-${w2.id}-state-${st.id}-box17`];
            const cardKey = `w2-${w2.id}-state-card-${st.id}`;
            const curr = this.arrowEngine?.getSelectedNode();
            if (curr === cardKey && !target.closest('input, select')) {
              this.arrowEngine?.setSelectedNode(null);
            } else {
              this.arrowEngine?.setSelectedNode(cardKey, stIds);
            }
            document.querySelectorAll('.panel-selected').forEach(el => el.classList.remove('panel-selected'));
            if (this.arrowEngine?.getSelectedNode() === cardKey) {
              stateCard.classList.add('panel-selected');
            }
          });
        }

        const rowSelector = `[data-w2-id="${w2.id}"][data-state-id="${st.id}"]`;

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

        const stateIdInp = document.querySelector<HTMLInputElement>(`input${rowSelector}[data-state-field="stateId"]`);
        if (stateIdInp) {
          stateIdInp.addEventListener('input', (e: Event) => {
            st.stateId = (e.target as HTMLInputElement).value;
            this.saveDraft();
          });
        }

        const wagesInp = document.getElementById(`w2-${w2.id}-state-${st.id}-box16`) as HTMLInputElement | null;
        if (wagesInp) {
          wagesInp.addEventListener('input', (e: Event) => {
            st.stateWages = Number((e.target as HTMLInputElement).value) || 0;
            this.recalculateAndRender();
          });
        }

        const taxInp = document.getElementById(`w2-${w2.id}-state-${st.id}-box17`) as HTMLInputElement | null;
        if (taxInp) {
          taxInp.addEventListener('input', (e: Event) => {
            st.stateTaxWithheld = Number((e.target as HTMLInputElement).value) || 0;
            this.recalculateAndRender();
          });
        }

        const localWagesInp = document.querySelector<HTMLInputElement>(`input${rowSelector}[data-state-field="localWages"]`);
        if (localWagesInp) {
          localWagesInp.addEventListener('input', (e: Event) => {
            st.localWages = Number((e.target as HTMLInputElement).value) || 0;
            this.recalculateAndRender();
          });
        }

        const localTaxInp = document.querySelector<HTMLInputElement>(`input${rowSelector}[data-state-field="localTaxWithheld"]`);
        if (localTaxInp) {
          localTaxInp.addEventListener('input', (e: Event) => {
            st.localTaxWithheld = Number((e.target as HTMLInputElement).value) || 0;
            this.recalculateAndRender();
          });
        }

        const locNameInp = document.querySelector<HTMLInputElement>(`input${rowSelector}[data-state-field="localityName"]`);
        if (locNameInp) {
          locNameInp.addEventListener('input', (e: Event) => {
            st.localityName = (e.target as HTMLInputElement).value;
            this.saveDraft();
          });
        }
      });
    });

    document.querySelectorAll<HTMLElement>('[data-remove-w2]').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const idToRemove = parseInt((e.currentTarget as HTMLElement).dataset.removeW2 || '', 10);
        this.removeW2(idToRemove);
      });
    });

    document.querySelectorAll<HTMLElement>('[data-add-state]').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const w2Id = parseInt((e.currentTarget as HTMLElement).dataset.addState || '', 10);
        this.addStateToW2(w2Id);
      });
    });

    document.querySelectorAll<HTMLElement>('[data-remove-state]').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        const [w2IdStr, stateIdStr] = ((e.currentTarget as HTMLElement).dataset.removeState || '').split(':');
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

    // 3d. Schedule E Rental Real Estate -> Schedule E Card -> Gross Income & Property State
    const rental = this.state.otherIncome.scheduleERental;
    if (rental && (rental.grossRents > 0 || rental.expenses > 0 || rental.depreciation > 0)) {
      if (rental.grossRents > 0) {
        connections.push({
          id: 'conn-rental-gross',
          sourceId: 'input-rental-gross',
          targetId: 'calc-schedule-e',
          category: 'wages',
          label: 'Gross Rents Received'
        });
      }
      if (rental.expenses > 0) {
        connections.push({
          id: 'conn-rental-expenses',
          sourceId: 'input-rental-expenses',
          targetId: 'calc-schedule-e',
          category: 'adjustments',
          label: 'Rental Operating Expenses'
        });
      }
      if (rental.depreciation > 0) {
        connections.push({
          id: 'conn-rental-depreciation',
          sourceId: 'input-rental-depreciation',
          targetId: 'calc-schedule-e',
          category: 'adjustments',
          label: 'MACRS Depreciation'
        });
      }
      connections.push({
        id: 'conn-schedule-e-gross',
        sourceId: 'calc-schedule-e',
        targetId: 'calc-gross-income',
        category: 'wages',
        label: 'Schedule E Net Rental Income to Gross Income'
      });
      if (rental.propertyState) {
        const propStateKey = rental.propertyState.toLowerCase();
        connections.push({
          id: `conn-schedule-e-state-${propStateKey}`,
          sourceId: 'calc-schedule-e',
          targetId: `calc-state-${propStateKey}-card`,
          category: 'state',
          label: `Schedule E Net Rent (${rental.propertyState}) to ${rental.propertyState} Return`
        });
      }
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

    // 6-12. Derive calculation-to-calculation and contributor-to-calculation arrows directly from active CalcBlocks
    const inferCategory = (sourceId: string, targetId: string): ConnectionDef['category'] => {
      if (sourceId.includes('box2') || sourceId.includes('withhold')) return 'withholding';
      if (sourceId.includes('box4') || sourceId.includes('ss')) return 'ss';
      if (sourceId.includes('box6') || sourceId.includes('medicare')) return 'medicare';
      if (sourceId.includes('credit')) return 'credits';
      if (sourceId.includes('itemized') || sourceId.includes('salt') || sourceId.includes('mortgage') || sourceId.includes('charity')) return 'itemized';
      if (sourceId.includes('filing-status') || sourceId.includes('deduction')) return 'status';
      if (sourceId.includes('capital') || sourceId.includes('stcg') || sourceId.includes('ltcg')) return 'capital';
      if (targetId === 'calc-tax-before-credits' || targetId === 'calc-other-taxes' || targetId === 'calc-final-verdict') return 'tax';
      return 'wages';
    };

    const showEmpty = Boolean(this.uiPrefs.showEmptyCalcBlocks);
    this.currentCalcBlocks
      .filter(b => b.hasImpact || showEmpty)
      .forEach(block => {
        (block.sourceIds || []).forEach(srcId => {
          connections.push({
            id: `conn-block-${srcId}-to-${block.id}`,
            sourceId: srcId,
            targetId: block.id,
            category: inferCategory(srcId, block.id),
            label: `${srcId} to ${block.title}`
          });
        });

        Object.values(block.variables || {}).forEach(variable => {
          (variable.contributors || []).forEach(contrib => {
            if (contrib.isSetUp && contrib.targetElementId && contrib.targetElementId !== block.id) {
              connections.push({
                id: `conn-var-${contrib.targetElementId}-to-${block.id}`,
                sourceId: contrib.targetElementId,
                targetId: block.id,
                category: inferCategory(contrib.targetElementId, block.id),
                label: contrib.label
              });
            }
          });
        });
      });

    // W-2 Box 2 (Federal Withholding) -> Federal Bottom Line (calc-final-verdict)
    this.state.w2s.forEach(w => {
      connections.push({
        id: `conn-w2-${w.id}-box2-verdict`,
        sourceId: `w2-${w.id}-box2`,
        targetId: 'calc-final-verdict',
        category: 'withholding',
        label: `W-2 #${w.id + 1} Box 2 Withheld to Federal Bottom Line`
      });
    });

    // Federal Bottom Line -> Unified Multi-Jurisdiction Final Summary
    connections.push({
      id: 'conn-verdict-unified',
      sourceId: 'calc-final-verdict',
      targetId: 'calc-unified-summary',
      category: 'tax',
      label: 'Federal Bottom Line to Final Summary'
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

    (this.state.otherIncome.sources || []).forEach(src => {
      if (src.amount > 0 && src.state) {
        const stateKey = src.state.toLowerCase();
        connections.push({
          id: `conn-income-source-${src.id}-state-${stateKey}`,
          sourceId: `input-income-source-${src.id}`,
          targetId: `calc-state-${stateKey}-card`,
          category: 'state',
          label: `${src.type} (${src.state}) to ${src.state} State Return`
        });
      }
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
          label: `${c.fromState} Tax Credited to ${sr.state}`
        });
      });
    });

    // 15. State Return Cards -> Final Tax Summary
    (taxData?.stateReturnsCalc || []).forEach((sr: StateReturnCalculation) => {
      const stateKey = sr.state.toLowerCase();
      connections.push({
        id: `conn-state-${stateKey}-to-unified`,
        sourceId: `calc-state-${stateKey}-card`,
        targetId: 'calc-unified-summary',
        category: 'state',
        label: `${sr.state} Return to Final Summary`
      });
    });

    // 16. Automatic Panels & State CalcBlock sourceIds
    const allAutoPanels = [
      ...this.currentAutoPanels.federal,
      ...Object.values(this.currentAutoPanels.byState).flat()
    ];
    allAutoPanels.forEach(ap => {
      (ap.sourceIds || []).forEach(srcId => {
        connections.push({
          id: `conn-auto-${srcId}-to-${ap.id}`,
          sourceId: srcId,
          targetId: ap.id,
          category: ap.state ? 'state' : (ap.section === 'credits' ? 'credits' : 'adjustments'),
          label: `${srcId} to ${ap.title}`
        });
      });
    });

    this.currentStateCalcBlocks.forEach(sb => {
      (sb.sourceIds || []).forEach(srcId => {
        connections.push({
          id: `conn-stblock-${srcId}-to-${sb.id}`,
          sourceId: srcId,
          targetId: sb.id,
          category: srcId.includes('ostc') ? 'state_credit' : 'state',
          label: `${srcId} to ${sb.title}`
        });
      });
    });

    const seenPairs = new Set<string>();
    return connections.filter(conn => {
      const key = `${conn.sourceId}-->${conn.targetId}`;
      if (seenPairs.has(key)) return false;
      seenPairs.add(key);
      return true;
    });
  }

  private recalculateAndRender(): void {
    const taxData = calculateTaxes(this.state);
    this.currentAutoPanels = buildAutoPanels(this.state, taxData);

    this.renderFederalAutoPanels();
    this.renderCalculationBlocks(taxData);
    this.renderTaxBrackets(taxData.taxBeforeCreditsCalc.brackets);

    const bracketsCard = document.getElementById('calc-tax-brackets-card');
    if (bracketsCard) {
      const showBrackets = taxData.taxableIncomeCalc.result > 0 || Boolean(this.uiPrefs.showEmptyCalcBlocks);
      bracketsCard.style.display = showBrackets ? '' : 'none';
    }

    // Render Dynamic State Sections (with State Calculations) & Final Tax Summary Table
    this.renderStateSections(taxData);
    this.renderUnifiedSummary(taxData);

    const connections = this.buildConnections(taxData);
    if (this.arrowEngine) {
      this.arrowEngine.setConnections(connections);
    }

    this.updateTableOfContents();
    this.bindRatingPillEvents();
    this.saveDraft();
  }

  private renderStateReturns(taxData: TaxCalculationSummary): void {
    const container = document.getElementById('container-state-returns');
    if (!container) return;

    container.innerHTML = '';
    const stateReturns = taxData.stateReturnsCalc || [];

    stateReturns.forEach(sr => {
      const card = document.createElement('div');
      card.className = 'calc-card state-return-card output-panel';
      const cardId = `calc-state-${sr.state.toLowerCase()}-card`;
      card.id = cardId;

      const isRes = sr.residentStatus === 'resident';
      const statusBadge = isRes
        ? '<span class="state-status-badge badge-resident">Resident Return</span>'
        : '<span class="state-status-badge badge-nonresident">Nonresident Return</span>';

      let extraBadge = '';
      if (sr.creditForOtherStates > 0) {
        extraBadge = `<span class="state-status-badge badge-shield" id="calc-state-${sr.state.toLowerCase()}-ostc" title="Credit for Taxes Paid to Other States">OSTC Credit Applied</span>`;
      } else if (sr.reciprocityExemption) {
        extraBadge = `<span class="state-status-badge badge-reciprocal">Reciprocal Exemption</span>`;
      } else if (!sr.hasIncomeTax) {
        extraBadge = `<span class="state-status-badge badge-no-tax">0% Wage Tax State</span>`;
      }

      card.innerHTML = `
        <div class="calc-card-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; flex-wrap: wrap;">
              <span class="step-indicator">State Return • ${sr.state}</span>
              ${statusBadge}
              ${extraBadge}
            </div>
            <h3 class="calc-card-title">${sr.stateName}: ${sr.formName}</h3>
          </div>
          <div style="display: flex; align-items: center; gap: 0.4rem; flex-wrap: wrap;">
            <span class="irs-line-tag">${sr.formName}</span>
            <button type="button" class="btn-minimize-card" data-card-toggle="${cardId}" aria-expanded="true">Minimize ▴</button>
          </div>
        </div>

        <div class="card-collapsible-body">
          <div class="formula-box">
            <div class="formula-row">
              <span class="formula-badge general">General Formula</span>
              <span class="formula-math formula-general">${sr.generalFormula}</span>
            </div>
            <div class="formula-row" id="calc-state-${sr.state.toLowerCase()}-liability">
              <span class="formula-badge plugged">With Your Numbers</span>
              <span class="formula-math plugged-highlight formula-plugged">${sr.pluggedFormula}</span>
            </div>
          </div>

          ${sr.reciprocityNote ? `
            <div class="state-note-box">
              <strong>Reciprocity Note:</strong> ${sr.reciprocityNote}
            </div>
          ` : ''}
        </div>
      `;

      const toggleBtn = card.querySelector<HTMLButtonElement>(`[data-card-toggle="${cardId}"]`);
      if (toggleBtn) {
        toggleBtn.addEventListener('click', () => this.toggleCardCollapse(cardId));
      }
      if (Object.prototype.hasOwnProperty.call(this.collapseState.cards, cardId)) {
        this.setCardCollapsed(card, Boolean(this.collapseState.cards[cardId]));
      }

      card.addEventListener('mouseenter', () => this.arrowEngine?.setActiveTarget(cardId));
      card.addEventListener('mouseleave', () => this.arrowEngine?.clearActive());

      container.appendChild(card);
    });
  }

  private renderUnifiedSummary(taxData: TaxCalculationSummary): void {
    const card = document.getElementById('calc-unified-summary');
    if (!card) return;

    const pluggedEl = document.getElementById('unified-formula-plugged');
    const tbody = document.getElementById('unified-ledger-tbody');

    const u = taxData.unifiedSummaryCalc;
    if (!u) return;

    if (pluggedEl) {
      pluggedEl.textContent = u.pluggedFormula;
    }

    if (tbody) {
      tbody.innerHTML = '';
      let totalTaxLiability = 0;
      let totalWithholding = 0;

      u.lines.forEach(line => {
        totalTaxLiability += line.taxLiability;
        totalWithholding += line.withholding;

        const tr = document.createElement('tr');
        const isRef = line.netOutcome >= 0;
        const outcomeColor = isRef ? 'val-refund' : 'val-owed';
        const outcomeFormatted = `${isRef ? '+' : '-'}${formatCurrencyExact(Math.abs(line.netOutcome))}`;

        tr.innerHTML = `
          <td><strong>${line.jurisdiction}</strong></td>
          <td>${line.formName}</td>
          <td class="num-col">${formatCurrencyExact(line.taxLiability)}</td>
          <td class="num-col">${formatCurrencyExact(line.withholding)}</td>
          <td class="${outcomeColor}">${outcomeFormatted} (${isRef ? 'Refund' : 'Owed'})</td>
          <td>${line.badge ? line.badge.replace(/\s*\([^)]*\)/g, '') : 'Standard Filing'}</td>
        `;
        tbody.appendChild(tr);
      });

      // Combined Total row
      const totalTr = document.createElement('tr');
      totalTr.className = 'total-row';
      const grandRef = u.isGrandTotalRefund;
      totalTr.innerHTML = `
        <td><strong>Total (Federal + All States)</strong></td>
        <td>All Returns</td>
        <td class="num-col"><strong>${formatCurrencyExact(totalTaxLiability)}</strong></td>
        <td class="num-col"><strong>${formatCurrencyExact(totalWithholding)}</strong></td>
        <td class="${grandRef ? 'val-refund' : 'val-owed'}"><strong>${grandRef ? '+' : '-'}${formatCurrencyExact(u.result)} (${grandRef ? 'Net Refund' : 'Net Owed'})</strong></td>
        <td><strong>${grandRef ? 'Combined Refund' : 'Combined Balance Due'}</strong></td>
      `;
      tbody.appendChild(totalTr);
    }
  }

  private renderTaxBrackets(brackets: BracketDetail[]): void {
    const tbody = document.getElementById('tax-brackets-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

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
    });
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

    // Dynamic State Sections in Table of Contents
    const stateListContainer = document.getElementById('toc-state-list');
    if (stateListContainer) {
      stateListContainer.innerHTML = '';
      const stateSubsections = [
        { cat: 'other-income', title: 'Other Income' },
        { cat: 'adjustments', title: 'Adjustments' },
        { cat: 'credits', title: 'Credits' },
        { cat: 'itemized', title: 'Itemized Deductions' },
        { cat: 'calculations', title: 'Calculations' }
      ];
      this.getActiveStateCodes().forEach(code => {
        const stObj = US_STATES.find(s => s.code === code);
        const stateName = stObj ? stObj.name : code;

        const headerLink = document.createElement('a');
        headerLink.className = 'toc-link';
        headerLink.style.fontWeight = '700';
        headerLink.style.marginTop = '0.35rem';
        headerLink.href = `#state-group-${code.toLowerCase()}`;
        headerLink.dataset.tocTarget = `state-group-${code.toLowerCase()}`;
        headerLink.innerHTML = `<span>${stateName}</span><span class="toc-badge">${code}</span>`;
        stateListContainer.appendChild(headerLink);

        stateSubsections.forEach(sub => {
          const targetId = `state-${code.toLowerCase()}-${sub.cat}`;
          const subLink = document.createElement('a');
          subLink.className = 'toc-link';
          subLink.style.paddingLeft = '1.25rem';
          subLink.style.fontSize = '0.8rem';
          subLink.href = `#${targetId}`;
          subLink.dataset.tocTarget = targetId;
          subLink.innerHTML = `<span>${stateName} ${sub.title}</span>`;
          stateListContainer.appendChild(subLink);
        });
      });
    }

    this.bindTocScrollspy();
  }

  private bindTocScrollspy(): void {
    document.querySelectorAll<HTMLAnchorElement>('.toc-link:not(.is-w2)').forEach(link => {
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

  /* --------------------------------------------------------------------------
     Top Menu Bar (Data, Edit, Settings, Templates, Drafts) & Delete All Modal
     -------------------------------------------------------------------------- */
  private bindMenuBarEvents(): void {
    // Toggle dropdown menus
    document.querySelectorAll<HTMLElement>('.menu-dropdown > .menu-bar-btn').forEach(btn => {
      btn.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const wrap = btn.closest('.menu-dropdown') as HTMLElement | null;
        if (!wrap) return;
        const wasOpen = wrap.classList.contains('open');
        document.querySelectorAll('.menu-dropdown.open, .add-panel-dropdown-wrap.open').forEach(el => el.classList.remove('open'));
        if (!wasOpen) {
          wrap.classList.add('open');
        }
      });
    });

    // Close menus when clicking outside
    document.addEventListener('click', (e: Event) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.menu-dropdown') && !target.closest('.add-panel-dropdown-wrap')) {
        document.querySelectorAll('.menu-dropdown.open, .add-panel-dropdown-wrap.open').forEach(el => el.classList.remove('open'));
      }
      if (!target.closest('#var-breakdown-popover') && !target.closest('.formula-var')) {
        const pop = document.getElementById('var-breakdown-popover');
        if (pop) pop.hidden = true;
      }
    });

    const closeAllMenus = () => {
      document.querySelectorAll('.menu-dropdown.open').forEach(el => el.classList.remove('open'));
    };

    // Data menu
    document.getElementById('menu-data-import')?.addEventListener('click', () => {
      closeAllMenus();
      document.getElementById('input-import-draft')?.click();
    });
    document.getElementById('menu-data-export')?.addEventListener('click', () => {
      closeAllMenus();
      this.exportDraft();
    });
    document.getElementById('menu-data-json-io')?.addEventListener('click', () => {
      closeAllMenus();
      this.openJsonIoModal();
    });

    // Delete All Data Modal (requires typing "Yes")
    const deleteModal = document.getElementById('delete-data-modal-overlay');
    const confirmInput = document.getElementById('input-confirm-delete-all') as HTMLInputElement | null;
    const confirmBtn = document.getElementById('btn-confirm-delete-all') as HTMLButtonElement | null;

    const openDeleteModal = () => {
      closeAllMenus();
      if (confirmInput) confirmInput.value = '';
      if (confirmBtn) confirmBtn.disabled = true;
      deleteModal?.classList.add('open');
      confirmInput?.focus();
    };
    const closeDeleteModal = () => {
      deleteModal?.classList.remove('open');
    };

    document.getElementById('menu-data-delete-all')?.addEventListener('click', openDeleteModal);
    document.getElementById('btn-close-delete-data-modal')?.addEventListener('click', closeDeleteModal);
    document.getElementById('btn-cancel-delete-all')?.addEventListener('click', closeDeleteModal);
    deleteModal?.addEventListener('click', (e: Event) => {
      if (e.target === deleteModal) closeDeleteModal();
    });

    confirmInput?.addEventListener('input', () => {
      if (confirmBtn) {
        confirmBtn.disabled = confirmInput.value.trim() !== 'Yes';
      }
    });

    confirmBtn?.addEventListener('click', () => {
      if (confirmInput?.value.trim() === 'Yes') {
        this.deleteAllDataConfirmed();
        closeDeleteModal();
      }
    });

    // Edit menu
    document.getElementById('menu-edit-add-w2')?.addEventListener('click', () => {
      closeAllMenus();
      this.addW2();
    });

    const expandSection = (section: PanelSectionCategory) => {
      closeAllMenus();
      if (!this.uiPrefs.openPanels) this.uiPrefs.openPanels = {};
      PANEL_CATALOG.filter(p => p.section === section).forEach(p => {
        if (p.sourceType) {
          const exists = (this.state.otherIncome.sources || []).some(s => s.type === p.sourceType);
          if (!exists) {
            this.addIncomeSourceOfType(p.sourceType, false);
          }
        }
        this.uiPrefs.openPanels![p.key] = true;
      });
      this.saveUiPrefs();
      this.renderFederalPanelSections();
      this.recalculateAndRender();
    };

    document.getElementById('menu-edit-expand-income')?.addEventListener('click', () => expandSection('other-income'));
    document.getElementById('menu-edit-expand-adjustments')?.addEventListener('click', () => expandSection('adjustments'));
    document.getElementById('menu-edit-expand-credits')?.addEventListener('click', () => expandSection('credits'));
    document.getElementById('menu-edit-expand-itemized')?.addEventListener('click', () => expandSection('itemized'));

    document.getElementById('menu-edit-collapse-empty')?.addEventListener('click', () => {
      closeAllMenus();
      this.uiPrefs.openPanels = {};
      this.syncOpenPanelsWithState();
      this.saveUiPrefs();
      this.renderFederalPanelSections();
      this.recalculateAndRender();
    });

    // Settings menu
    const currentArrowMode = this.uiPrefs.arrowDisplayMode || 'always';
    document.querySelectorAll<HTMLInputElement>('input[name="arrow-mode"]').forEach(radio => {
      radio.checked = radio.value === currentArrowMode;
      radio.addEventListener('change', () => {
        if (radio.checked) {
          const mode = radio.value as ArrowDisplayMode;
          this.uiPrefs.arrowDisplayMode = mode;
          this.state.showAllArrows = mode === 'always';
          this.saveUiPrefs();
          this.arrowEngine?.setDisplayMode(mode);
        }
      });
    });

    const showEmptyChk = document.getElementById('setting-show-empty-calcs') as HTMLInputElement | null;
    if (showEmptyChk) {
      showEmptyChk.checked = Boolean(this.uiPrefs.showEmptyCalcBlocks);
      showEmptyChk.addEventListener('change', () => {
        this.uiPrefs.showEmptyCalcBlocks = showEmptyChk.checked;
        this.saveUiPrefs();
        this.recalculateAndRender();
      });
    }

    // Templates menu items close menu on click (preset handler in bindGlobalEvents loads it)
    document.querySelectorAll<HTMLElement>('.menu-dropdown [data-preset]').forEach(btn => {
      btn.addEventListener('click', () => closeAllMenus());
    });

    // Resident state change also updates State Sections
    document.getElementById('select-resident-state')?.addEventListener('change', () => {
      this.renderStateSections();
    });
  }

  /* --------------------------------------------------------------------------
     Dynamic Federal Panel Sections (Other Income, Adjustments, Credits, Itemized)
     -------------------------------------------------------------------------- */
  private syncOpenPanelsWithState(): void {
    if (!this.uiPrefs.openPanels) {
      this.uiPrefs.openPanels = { '1099-int': true };
    }
    const open = this.uiPrefs.openPanels;
    const ensure = (key: string, cond: boolean) => {
      if (cond) open[key] = true;
    };

    ensure('1099-int', (Number(this.state.otherIncome?.interest) || 0) !== 0);
    ensure('schedule-c-expenses', (Number(this.state.otherIncome?.scheduleCExpenses) || 0) !== 0);
    ensure('capital-gains', Boolean(
      (Number(this.state.otherIncome?.capitalGains?.shortTerm) || 0) !== 0 ||
      (Number(this.state.otherIncome?.capitalGains?.longTerm) || 0) !== 0 ||
      (Number(this.state.otherIncome?.capitalGains?.collectiblesGain) || 0) !== 0 ||
      (Number(this.state.otherIncome?.capitalGains?.unrecaptured1250Gain) || 0) !== 0
    ));
    ensure('schedule-e-rental', Boolean(
      (Number(this.state.otherIncome?.scheduleERental?.grossRents) || 0) !== 0 ||
      (Number(this.state.otherIncome?.scheduleERental?.expenses) || 0) !== 0 ||
      (Number(this.state.otherIncome?.scheduleERental?.depreciation) || 0) !== 0
    ));
    (this.state.otherIncome?.sources || []).forEach(src => {
      const entry = PANEL_CATALOG.find(p => p.sourceType === src.type);
      if (entry) open[entry.key] = true;
    });

    ensure('adj-student-loan', (Number(this.state.adjustments?.studentLoan) || 0) !== 0);
    ensure('adj-ira', (Number(this.state.adjustments?.ira) || 0) !== 0);
    ensure('adj-hsa', (Number(this.state.adjustments?.hsa) || 0) !== 0);
    ensure('adj-educator', (Number(this.state.adjustments?.educatorExpenses) || 0) !== 0);
    ensure('adj-se-retirement', (Number(this.state.adjustments?.seRetirement) || 0) !== 0);
    ensure('adj-se-health', (Number(this.state.adjustments?.seHealthInsurance) || 0) !== 0);
    ensure('adj-alimony', (Number(this.state.adjustments?.alimonyPaid) || 0) !== 0);

    ensure('cred-children', (Number(this.state.dependents?.childrenCount) || 0) > 0);
    ensure('cred-other-dependents', (Number(this.state.dependents?.otherDependentsCount) || 0) > 0);
    ensure('cred-age-blind', (Number(this.state.dependents?.age65OrBlindCount) || 0) > 0);
    ensure('cred-child-care', (Number(this.state.dependents?.childCareExpenses) || 0) > 0);
    ensure('cred-aotc', (Number(this.state.dependents?.educationExpensesAotc) || 0) > 0);
    ensure('cred-llc', (Number(this.state.dependents?.educationExpensesLlc) || 0) > 0);
    ensure('cred-foreign-tax', (Number(this.state.dependents?.foreignTaxCredit) || 0) > 0);
    ensure('cred-clean-energy', (Number(this.state.dependents?.cleanEnergyCredit) || 0) > 0);
    ensure('cred-estimated-payments', (Number(this.state.dependents?.estimatedTaxPayments) || 0) > 0);

    ensure('itemized-medical', (Number(this.state.itemizedDeductions?.medicalExpenses) || 0) > 0);
    ensure('itemized-real-estate', (Number(this.state.itemizedDeductions?.realEstateTax) || 0) > 0);
    ensure('itemized-mortgage', (Number(this.state.itemizedDeductions?.mortgageInterest) || 0) > 0);
    ensure('itemized-charity', (Number(this.state.itemizedDeductions?.charity) || 0) > 0);
    ensure('itemized-gambling-losses', (Number(this.state.itemizedDeductions?.gamblingLosses) || 0) > 0);
  }

  private addIncomeSourceOfType(type: IncomeSourceType, rerender: boolean = true): IncomeSource {
    if (!this.state.otherIncome.sources) this.state.otherIncome.sources = [];
    const newId = this.incomeSourceCounter++;
    const newSrc: IncomeSource = {
      id: newId,
      type,
      payer: '',
      amount: 0,
      state: this.state.residentState || 'CA'
    };
    this.state.otherIncome.sources.push(newSrc);
    if (rerender) {
      this.renderFederalPanelSections();
      this.recalculateAndRender();
    }
    return newSrc;
  }

  private renderFederalPanelSections(): void {
    const sections: Array<{ cat: PanelSectionCategory; gridId: string }> = [
      { cat: 'other-income', gridId: 'grid-federal-other-income' },
      { cat: 'adjustments', gridId: 'grid-federal-adjustments' },
      { cat: 'credits', gridId: 'grid-federal-credits' },
      { cat: 'itemized', gridId: 'grid-federal-itemized' }
    ];

    const openMap = this.uiPrefs.openPanels || { '1099-int': true };

    sections.forEach(({ cat, gridId }) => {
      // 1. Populate Add Panel Dropdown
      const wrap = document.querySelector<HTMLElement>(`.add-panel-dropdown-wrap[data-panel-dropdown="${cat}"]`);
      if (wrap) {
        const btn = wrap.querySelector<HTMLButtonElement>('.add-panel-dropdown-btn');
        const menu = wrap.querySelector<HTMLElement>('.add-panel-dropdown-menu');
        if (btn && !btn.dataset.bound) {
          btn.dataset.bound = 'true';
          btn.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            const wasOpen = wrap.classList.contains('open');
            document.querySelectorAll('.menu-dropdown.open, .add-panel-dropdown-wrap.open').forEach(el => el.classList.remove('open'));
            if (!wasOpen) wrap.classList.add('open');
          });
        }
        if (menu) {
          menu.innerHTML = '';
          PANEL_CATALOG.filter(p => p.section === cat).forEach(entry => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'add-panel-option-row';
            row.innerHTML = `
              <div>
                <span class="add-panel-option-name">${entry.title}</span>
                <span class="add-panel-option-sub">${entry.officialTitle}</span>
              </div>
              ${renderRatingCircles(entry.ratingKey)}
            `;
            row.addEventListener('click', () => {
              wrap.classList.remove('open');
              if (!this.uiPrefs.openPanels) this.uiPrefs.openPanels = {};
              this.uiPrefs.openPanels[entry.key] = true;
              if (entry.sourceType) {
                this.addIncomeSourceOfType(entry.sourceType, false);
              }
              this.saveUiPrefs();
              this.renderFederalPanelSections();
              this.recalculateAndRender();
            });
            menu.appendChild(row);
          });
        }
      }

      // 2. Render Open Panels in this Section's Grid
      const grid = document.getElementById(gridId);
      if (!grid) return;
      grid.innerHTML = '';

      const entries = PANEL_CATALOG.filter(p => p.section === cat);
      let renderedCount = 0;

      entries.forEach(entry => {
        if (!openMap[entry.key]) return;

        if (entry.sourceType) {
          const matchingSources = (this.state.otherIncome.sources || []).filter(s => s.type === entry.sourceType);
          if (matchingSources.length === 0) {
            // If opened without a source yet, create one
            const created = this.addIncomeSourceOfType(entry.sourceType, false);
            matchingSources.push(created);
          }
          matchingSources.forEach(src => {
            renderedCount++;
            grid.appendChild(this.createSourcePanelElement(entry, src));
          });
        } else {
          renderedCount++;
          grid.appendChild(this.createSingleFieldPanelElement(entry));
        }
      });

      if (renderedCount === 0) {
        const emptyHint = document.createElement('div');
        emptyHint.style.cssText = 'grid-column: 1 / -1; padding: 0.85rem 1rem; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; font-size: 0.85rem; background: #f8fafc;';
        emptyHint.textContent = 'No panels added in this section yet. Use the dropdown above to add items that apply to you.';
        grid.appendChild(emptyHint);
      }
    });

    this.bindDynamicPanelEvents();
  }

  private createPanelShell(entry: PanelCatalogEntry, panelDomId: string, inputsHtml: string, closeAttr: string): HTMLElement {
    const card = document.createElement('div');
    card.className = `tax-panel panel-size-${entry.size} input-panel`;
    card.id = panelDomId;
    card.innerHTML = `
      <div class="panel-top-row">
        <h3 class="panel-title">${entry.title}</h3>
        <div class="panel-top-actions">
          ${renderRatingPill(entry.ratingKey, true)}
          <button type="button" class="btn-close-panel" ${closeAttr} title="Remove panel" aria-label="Remove ${entry.title}">✕</button>
        </div>
      </div>
      <div class="panel-official-title">${entry.officialTitle}</div>
      <div class="panel-inputs">${inputsHtml}</div>
      <div class="panel-short-desc">${entry.shortExplanation}</div>
      <button type="button" class="btn-more-info" data-rating-field="${entry.ratingKey}">
        <span>More Info</span>
        <span class="more-info-icon">ⓘ</span>
      </button>
    `;
    return card;
  }

  private createSourcePanelElement(entry: PanelCatalogEntry, src: IncomeSource): HTMLElement {
    const extraInputs = src.type === '1099-DIV'
      ? `<div><label class="panel-input-label">Qualified Dividends (Box 1b)</label><div class="w2-input-wrapper"><span class="currency-symbol">$</span><input type="number" step="any" class="w2-input" data-src-id="${src.id}" data-src-field="qualifiedDividends" value="${src.qualifiedDividends || 0}" placeholder="0"></div></div>`
      : src.type === '1099-R'
        ? `<div><label class="panel-input-label">Early Withdrawal (10% Penalty)</label><label style="display:flex;align-items:center;gap:0.4rem;font-size:0.82rem;margin-top:0.35rem;"><input type="checkbox" data-src-id="${src.id}" data-src-field="earlyDistributionPenalty" ${src.earlyDistributionPenalty ? 'checked' : ''}><span>Code 1 Early Distribution</span></label></div>`
        : '';

    const inputsHtml = `
      <div class="panel-multi-inputs">
        <div>
          <label class="panel-input-label">Payer Name</label>
          <input type="text" class="w2-input" style="padding-left:0.65rem;" data-src-id="${src.id}" data-src-field="payer" value="${src.payer || ''}" placeholder="${entry.title} Payer">
        </div>
        <div>
          <label class="panel-input-label">Amount</label>
          <div class="w2-input-wrapper">
            <span class="currency-symbol">$</span>
            <input type="number" step="any" class="w2-input" id="input-source-${src.id}-amount" data-src-id="${src.id}" data-src-field="amount" value="${src.amount || 0}" placeholder="0">
          </div>
        </div>
        ${extraInputs}
        <div>
          <label class="panel-input-label">Federal Tax Withheld</label>
          <div class="w2-input-wrapper">
            <span class="currency-symbol">$</span>
            <input type="number" step="any" class="w2-input" data-src-id="${src.id}" data-src-field="federalTaxWithheld" value="${src.federalTaxWithheld || 0}" placeholder="0">
          </div>
        </div>
      </div>
    `;
    return this.createPanelShell(entry, `income-source-card-${src.id}`, inputsHtml, `data-close-source-id="${src.id}" data-close-panel="${entry.key}"`);
  }

  private createSingleFieldPanelElement(entry: PanelCatalogEntry): HTMLElement {
    const val = (id: string): number => {
      switch (id) {
        case 'input-other-interest': return Number(this.state.otherIncome?.interest) || 0;
        case 'input-sched-c-expenses': return Number(this.state.otherIncome?.scheduleCExpenses) || 0;
        case 'input-capital-gains-st': return Number(this.state.otherIncome?.capitalGains?.shortTerm) || 0;
        case 'input-capital-gains-lt': return Number(this.state.otherIncome?.capitalGains?.longTerm) || 0;
        case 'input-cap-collectibles': return Number(this.state.otherIncome?.capitalGains?.collectiblesGain) || 0;
        case 'input-cap-1250': return Number(this.state.otherIncome?.capitalGains?.unrecaptured1250Gain) || 0;
        case 'input-sched-e-rents': return Number(this.state.otherIncome?.scheduleERental?.grossRents) || 0;
        case 'input-sched-e-expenses': return Number(this.state.otherIncome?.scheduleERental?.expenses) || 0;
        case 'input-sched-e-depreciation': return Number(this.state.otherIncome?.scheduleERental?.depreciation) || 0;
        case 'input-adj-student-loan': return Number(this.state.adjustments?.studentLoan) || 0;
        case 'input-adj-ira': return Number(this.state.adjustments?.ira) || 0;
        case 'input-adj-hsa': return Number(this.state.adjustments?.hsa) || 0;
        case 'input-adj-educator': return Number(this.state.adjustments?.educatorExpenses) || 0;
        case 'input-adj-se-retirement': return Number(this.state.adjustments?.seRetirement) || 0;
        case 'input-adj-se-health': return Number(this.state.adjustments?.seHealthInsurance) || 0;
        case 'input-adj-alimony': return Number(this.state.adjustments?.alimonyPaid) || 0;
        case 'input-children-count': return Number(this.state.dependents?.childrenCount) || 0;
        case 'input-other-dependents': return Number(this.state.dependents?.otherDependentsCount) || 0;
        case 'input-age65-blind': return Number(this.state.dependents?.age65OrBlindCount) || 0;
        case 'input-child-care': return Number(this.state.dependents?.childCareExpenses) || 0;
        case 'input-edu-aotc': return Number(this.state.dependents?.educationExpensesAotc) || 0;
        case 'input-edu-llc': return Number(this.state.dependents?.educationExpensesLlc) || 0;
        case 'input-foreign-tax-credit': return Number(this.state.dependents?.foreignTaxCredit) || 0;
        case 'input-clean-energy-credit': return Number(this.state.dependents?.cleanEnergyCredit) || 0;
        case 'input-estimated-payments': return Number(this.state.dependents?.estimatedTaxPayments) || 0;
        case 'input-itemized-medical': return Number(this.state.itemizedDeductions?.medicalExpenses) || 0;
        case 'input-itemized-real-estate': return Number(this.state.itemizedDeductions?.realEstateTax) || 0;
        case 'input-itemized-mortgage': return Number(this.state.itemizedDeductions?.mortgageInterest) || 0;
        case 'input-itemized-charity': return Number(this.state.itemizedDeductions?.charity) || 0;
        case 'input-itemized-gambling-losses': return Number(this.state.itemizedDeductions?.gamblingLosses) || 0;
        default: return 0;
      }
    };

    const numBox = (id: string, label?: string, isCount: boolean = false) => `
      <div>
        ${label ? `<label for="${id}" class="panel-input-label">${label}</label>` : ''}
        ${isCount
          ? `<input type="number" step="1" min="0" class="w2-input" style="padding-left:0.65rem;" id="${id}" value="${val(id)}" placeholder="0">`
          : `<div class="w2-input-wrapper"><span class="currency-symbol">$</span><input type="number" step="any" class="w2-input" id="${id}" value="${val(id)}" placeholder="0"></div>`}
      </div>
    `;

    let inputsHtml = '';
    if (entry.key === 'capital-gains') {
      inputsHtml = `<div class="panel-multi-inputs">
        ${numBox('input-capital-gains-st', 'Short-Term Net (< 1 Yr)')}
        ${numBox('input-capital-gains-lt', 'Long-Term Net (1+ Yr)')}
        ${numBox('input-cap-collectibles', '28% Collectibles Gain')}
        ${numBox('input-cap-1250', '25% Sec. 1250 Gain')}
      </div>`;
    } else if (entry.key === 'schedule-e-rental') {
      const propState = this.state.otherIncome?.scheduleERental?.propertyState || '';
      inputsHtml = `<div class="panel-multi-inputs">
        ${numBox('input-sched-e-rents', 'Gross Rents Received')}
        ${numBox('input-sched-e-expenses', 'Operating Expenses')}
        ${numBox('input-sched-e-depreciation', 'Depreciation (Form 4562)')}
        <div>
          <label for="select-sched-e-state" class="panel-input-label">Property State</label>
          <select id="select-sched-e-state" class="w2-input">
            <option value="">Same as Home State</option>
            ${this.renderStateOptions(propState)}
          </select>
        </div>
      </div>`;
    } else if (entry.key === 'cred-children' || entry.key === 'cred-other-dependents' || entry.key === 'cred-age-blind') {
      inputsHtml = numBox(entry.inputIds[0], undefined, true);
    } else {
      inputsHtml = numBox(entry.inputIds[0]);
    }

    return this.createPanelShell(entry, `panel-${entry.key}`, inputsHtml, `data-close-panel="${entry.key}"`);
  }

  private bindDynamicPanelEvents(): void {
    const bindNum = (id: string, setter: (v: number) => void) => {
      const el = document.getElementById(id) as HTMLInputElement | null;
      if (!el) return;
      el.addEventListener('input', () => {
        setter(Number(el.value) || 0);
        this.recalculateAndRender();
      });
    };

    // Click any input panel (.tax-panel) to select it and highlight its dependency lines
    document.querySelectorAll<HTMLElement>('.tax-panel').forEach(panel => {
      if (panel.dataset.selectBound) return;
      panel.dataset.selectBound = 'true';
      panel.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest('button, .field-rating-pill')) return;
        const panelId = panel.id || `panel-${Math.random()}`;
        const inputIds = Array.from(panel.querySelectorAll<HTMLElement>('input[id], select[id]')).map(el => el.id);
        const curr = this.arrowEngine?.getSelectedNode();
        if (curr === panelId && !target.closest('input, select, textarea')) {
          this.arrowEngine?.setSelectedNode(null);
        } else {
          this.arrowEngine?.setSelectedNode(panelId, inputIds);
        }
        document.querySelectorAll('.panel-selected').forEach(el => el.classList.remove('panel-selected'));
        if (this.arrowEngine?.getSelectedNode() === panelId) {
          panel.classList.add('panel-selected');
        }
      });
    });

    const getCap = () => (this.state.otherIncome.capitalGains ??= { shortTerm: 0, longTerm: 0 });
    const getSchedE = () => (this.state.otherIncome.scheduleERental ??= { grossRents: 0, expenses: 0, depreciation: 0, propertyState: '' });
    const getItemized = () => (this.state.itemizedDeductions ??= { medicalExpenses: 0, realEstateTax: 0, mortgageInterest: 0, charity: 0 });

    bindNum('input-other-interest', v => this.state.otherIncome.interest = v);
    bindNum('input-sched-c-expenses', v => this.state.otherIncome.scheduleCExpenses = v);
    bindNum('input-capital-gains-st', v => getCap().shortTerm = v);
    bindNum('input-capital-gains-lt', v => getCap().longTerm = v);
    bindNum('input-cap-collectibles', v => getCap().collectiblesGain = v);
    bindNum('input-cap-1250', v => getCap().unrecaptured1250Gain = v);
    bindNum('input-sched-e-rents', v => getSchedE().grossRents = v);
    bindNum('input-sched-e-expenses', v => getSchedE().expenses = v);
    bindNum('input-sched-e-depreciation', v => getSchedE().depreciation = v);

    const schedEState = document.getElementById('select-sched-e-state') as HTMLSelectElement | null;
    if (schedEState) {
      schedEState.addEventListener('change', () => {
        getSchedE().propertyState = schedEState.value;
        this.renderStateSections();
        this.recalculateAndRender();
      });
    }

    bindNum('input-adj-student-loan', v => this.state.adjustments.studentLoan = v);
    bindNum('input-adj-ira', v => this.state.adjustments.ira = v);
    bindNum('input-adj-hsa', v => this.state.adjustments.hsa = v);
    bindNum('input-adj-educator', v => this.state.adjustments.educatorExpenses = v);
    bindNum('input-adj-se-retirement', v => this.state.adjustments.seRetirement = v);
    bindNum('input-adj-se-health', v => this.state.adjustments.seHealthInsurance = v);
    bindNum('input-adj-alimony', v => this.state.adjustments.alimonyPaid = v);

    bindNum('input-children-count', v => this.state.dependents.childrenCount = v);
    bindNum('input-other-dependents', v => this.state.dependents.otherDependentsCount = v);
    bindNum('input-age65-blind', v => this.state.dependents.age65OrBlindCount = v);
    bindNum('input-child-care', v => this.state.dependents.childCareExpenses = v);
    bindNum('input-edu-aotc', v => this.state.dependents.educationExpensesAotc = v);
    bindNum('input-edu-llc', v => this.state.dependents.educationExpensesLlc = v);
    bindNum('input-foreign-tax-credit', v => this.state.dependents.foreignTaxCredit = v);
    bindNum('input-clean-energy-credit', v => this.state.dependents.cleanEnergyCredit = v);
    bindNum('input-estimated-payments', v => this.state.dependents.estimatedTaxPayments = v);

    bindNum('input-itemized-medical', v => getItemized().medicalExpenses = v);
    bindNum('input-itemized-real-estate', v => getItemized().realEstateTax = v);
    bindNum('input-itemized-mortgage', v => getItemized().mortgageInterest = v);
    bindNum('input-itemized-charity', v => getItemized().charity = v);
    bindNum('input-itemized-gambling-losses', v => getItemized().gamblingLosses = v);

    // Dynamic 1099 sources
    document.querySelectorAll<HTMLInputElement>('[data-src-id]').forEach(el => {
      const id = parseInt(el.dataset.srcId || '', 10);
      const field = el.dataset.srcField as keyof IncomeSource;
      const src = (this.state.otherIncome.sources || []).find(s => s.id === id);
      if (!src || !field) return;

      el.addEventListener('input', () => {
        if (el.type === 'checkbox') {
          (src as any)[field] = el.checked;
        } else if (el.type === 'number') {
          (src as any)[field] = Number(el.value) || 0;
        } else {
          (src as any)[field] = el.value;
        }
        this.recalculateAndRender();
      });
    });

    // Close panel buttons (works for ALL panels, including 1099-INT!)
    document.querySelectorAll<HTMLElement>('[data-close-panel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const panelKey = btn.dataset.closePanel;
        const srcIdStr = btn.dataset.closeSourceId;
        if (srcIdStr && this.state.otherIncome.sources) {
          const srcId = parseInt(srcIdStr, 10);
          this.state.otherIncome.sources = this.state.otherIncome.sources.filter(s => s.id !== srcId);
          const entry = panelKey ? getPanelCatalogEntry(panelKey) : undefined;
          const remaining = entry?.sourceType
            ? this.state.otherIncome.sources.some(s => s.type === entry.sourceType)
            : false;
          if (!remaining && panelKey && this.uiPrefs.openPanels) {
            this.uiPrefs.openPanels[panelKey] = false;
          }
        } else if (panelKey) {
          if (this.uiPrefs.openPanels) this.uiPrefs.openPanels[panelKey] = false;
          this.resetPanelStateValues(panelKey);
        }
        this.saveUiPrefs();
        this.renderFederalPanelSections();
        this.recalculateAndRender();
      });
    });

    // "More Info" buttons open the guidance modal
    document.querySelectorAll<HTMLElement>('.btn-more-info[data-rating-field]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.ratingField;
        if (key) this.openGuidanceModal(key);
      });
    });
  }

  private resetPanelStateValues(panelKey: string): void {
    switch (panelKey) {
      case '1099-int': this.state.otherIncome.interest = 0; break;
      case 'schedule-c-expenses': this.state.otherIncome.scheduleCExpenses = 0; break;
      case 'capital-gains': this.state.otherIncome.capitalGains = { shortTerm: 0, longTerm: 0, collectiblesGain: 0, unrecaptured1250Gain: 0 }; break;
      case 'schedule-e-rental': this.state.otherIncome.scheduleERental = { grossRents: 0, expenses: 0, depreciation: 0, propertyState: '' }; break;
      case 'adj-student-loan': this.state.adjustments.studentLoan = 0; break;
      case 'adj-ira': this.state.adjustments.ira = 0; break;
      case 'adj-hsa': this.state.adjustments.hsa = 0; break;
      case 'adj-educator': this.state.adjustments.educatorExpenses = 0; break;
      case 'adj-se-retirement': this.state.adjustments.seRetirement = 0; break;
      case 'adj-se-health': this.state.adjustments.seHealthInsurance = 0; break;
      case 'adj-alimony': this.state.adjustments.alimonyPaid = 0; break;
      case 'cred-children': this.state.dependents.childrenCount = 0; break;
      case 'cred-other-dependents': this.state.dependents.otherDependentsCount = 0; break;
      case 'cred-age-blind': this.state.dependents.age65OrBlindCount = 0; break;
      case 'cred-child-care': this.state.dependents.childCareExpenses = 0; break;
      case 'cred-aotc': this.state.dependents.educationExpensesAotc = 0; break;
      case 'cred-llc': this.state.dependents.educationExpensesLlc = 0; break;
      case 'cred-foreign-tax': this.state.dependents.foreignTaxCredit = 0; break;
      case 'cred-clean-energy': this.state.dependents.cleanEnergyCredit = 0; break;
      case 'cred-estimated-payments': this.state.dependents.estimatedTaxPayments = 0; break;
      case 'itemized-medical': if (this.state.itemizedDeductions) this.state.itemizedDeductions.medicalExpenses = 0; break;
      case 'itemized-real-estate': if (this.state.itemizedDeductions) this.state.itemizedDeductions.realEstateTax = 0; break;
      case 'itemized-mortgage': if (this.state.itemizedDeductions) this.state.itemizedDeductions.mortgageInterest = 0; break;
      case 'itemized-charity': if (this.state.itemizedDeductions) this.state.itemizedDeductions.charity = 0; break;
      case 'itemized-gambling-losses': if (this.state.itemizedDeductions) this.state.itemizedDeductions.gamblingLosses = 0; break;
    }
  }

  /* --------------------------------------------------------------------------
     State Sections (Grouped by State with Other Income, Adjustments, Credits, Itemized)
     -------------------------------------------------------------------------- */
  private getActiveStateCodes(): string[] {
    const codes = new Set<string>();
    codes.add((this.state.residentState || 'CA').toUpperCase());
    (this.state.w2s || []).forEach(w => {
      (w.states || []).forEach(s => {
        if (s.state) codes.add(s.state.toUpperCase());
      });
    });
    const propState = this.state.otherIncome?.scheduleERental?.propertyState;
    if (propState) codes.add(propState.toUpperCase());
    return Array.from(codes);
  }

  private renderAutoPanelCardHtml(item: AutoPanelItem): string {
    return `
      <div class="tax-panel panel-size-medium auto-panel-card" id="${item.id}" data-auto-panel="true">
        <div class="panel-top-row">
          <h3 class="panel-title">${item.title}</h3>
          <div class="panel-top-actions">
            <span class="auto-panel-badge">${item.badgeLabel}</span>
          </div>
        </div>
        <div class="panel-official-title">${item.officialTitle}</div>
        <div class="auto-panel-amount-display">${formatCurrencyExact(item.amount)}</div>
        <div class="auto-panel-formula">${item.formulaSummary}</div>
        <div class="panel-short-desc">${item.shortExplanation}</div>
      </div>
    `;
  }

  private renderFederalAutoPanels(): void {
    const sections: PanelSectionCategory[] = ['other-income', 'adjustments', 'credits', 'itemized'];
    sections.forEach(sec => {
      const secEl = document.getElementById(`section-federal-${sec}`);
      const grid = secEl?.querySelector<HTMLElement>('.panels-grid');
      if (!grid) return;

      grid.querySelectorAll('.auto-panel-card').forEach(el => el.remove());

      const items = this.currentAutoPanels.federal.filter(p => p.section === sec);
      items.forEach(item => {
        const wrapper = document.createElement('div');
        wrapper.innerHTML = this.renderAutoPanelCardHtml(item);
        const card = wrapper.firstElementChild as HTMLElement;
        card.addEventListener('click', () => {
          const curr = this.arrowEngine?.getSelectedNode();
          this.arrowEngine?.setSelectedNode(curr === item.id ? null : item.id, item.sourceIds);
        });
        grid.appendChild(card);
      });
    });
  }

  private renderStateSections(taxData?: TaxCalculationSummary): void {
    const container = document.getElementById('state-sections-container');
    if (!container) return;
    container.innerHTML = '';
    this.currentStateCalcBlocks = [];

    const activeStates = this.getActiveStateCodes();
    const statePanels = (this.state.statePanels ??= []);
    const stateReturns = taxData?.stateReturnsCalc || [];

    const subsections: Array<{ cat: PanelSectionCategory; title: string; addLabel: string }> = [
      { cat: 'other-income', title: 'Other Income', addLabel: '+ Add Other Income ▾' },
      { cat: 'adjustments', title: 'Adjustments', addLabel: '+ Add Adjustment ▾' },
      { cat: 'credits', title: 'Credits', addLabel: '+ Add Credit ▾' },
      { cat: 'itemized', title: 'Itemized Deductions', addLabel: '+ Add Itemized Deduction ▾' }
    ];

    activeStates.forEach(code => {
      const stObj = US_STATES.find(s => s.code === code);
      const stateName = stObj ? stObj.name : code;
      const isResident = code === (this.state.residentState || 'CA').toUpperCase();
      const sr = stateReturns.find(r => r.state.toUpperCase() === code);
      const stateAutos = this.currentAutoPanels.byState[code] || [];

      const block = document.createElement('div');
      block.className = 'state-group-block';
      block.id = `state-group-${code.toLowerCase()}`;

      let subsectionsHtml = '';
      subsections.forEach(sub => {
        const items = statePanels.filter(p => p.state.toUpperCase() === code && p.section === sub.cat);
        const autoItems = stateAutos.filter(p => p.section === sub.cat);
        const userCardsHtml = items.map(item => {
          const entry = getStateCatalogEntry(item.itemKey);
          if (!entry) return '';
          return `
            <div class="tax-panel panel-size-${entry.size} input-panel" id="state-panel-${item.id}">
              <div class="panel-top-row">
                <h3 class="panel-title">${entry.title}</h3>
                <div class="panel-top-actions">
                  ${renderRatingPill(entry.ratingKey, true)}
                  <button type="button" class="btn-close-panel" data-remove-state-panel="${item.id}" title="Remove panel" aria-label="Remove ${entry.title}">✕</button>
                </div>
              </div>
              <div class="panel-official-title">${entry.officialTitle}</div>
              <div class="panel-inputs">
                <div class="w2-input-wrapper">
                  <span class="currency-symbol">$</span>
                  <input type="number" step="any" class="w2-input state-panel-amount-input" id="input-state-panel-${item.id}" data-state-panel-id="${item.id}" value="${item.amount || 0}" placeholder="0">
                </div>
              </div>
              <div class="panel-short-desc">${entry.shortExplanation}</div>
              <button type="button" class="btn-more-info" data-rating-field="${entry.ratingKey}">
                <span>More Info</span>
                <span class="more-info-icon">ⓘ</span>
              </button>
            </div>
          `;
        }).join('');
        const autoCardsHtml = autoItems.map(ap => this.renderAutoPanelCardHtml(ap)).join('');
        const cardsHtml = (userCardsHtml + autoCardsHtml)
          ? (userCardsHtml + autoCardsHtml)
          : `<div style="grid-column: 1 / -1; padding: 0.65rem 0.9rem; border: 1px dashed #cbd5e1; border-radius: 8px; color: #64748b; font-size: 0.83rem; background: #f8fafc;">No ${stateName} ${sub.title.toLowerCase()} added. Use the dropdown to add items that apply to you.</div>`;

        subsectionsHtml += `
          <section class="panel-section state-subsection" id="state-${code.toLowerCase()}-${sub.cat}">
            <div class="section-header-bar">
              <h2>${stateName} ${sub.title}</h2>
              <div class="add-panel-dropdown-wrap" data-state-dropdown="${code}:${sub.cat}">
                <button type="button" class="btn btn-primary add-panel-dropdown-btn" aria-haspopup="true" aria-expanded="false">
                  ${sub.addLabel}
                </button>
                <div class="add-panel-dropdown-menu" role="menu"></div>
              </div>
            </div>
            <div class="panels-grid">${cardsHtml}</div>
          </section>
        `;
      });

      let stateCalcHtml = '';
      if (sr) {
        const stateBlocks = buildStateCalcBlocks(sr, stateReturns);
        this.currentStateCalcBlocks.push(...stateBlocks);
        const extraBadges = [
          sr.creditForOtherStates > 0 ? `<span class="state-status-badge badge-shield" id="calc-state-${code.toLowerCase()}-ostc">OSTC Credit Applied (-${formatCurrency(sr.creditForOtherStates)})</span>` : '',
          sr.reciprocityExemption ? `<span class="state-status-badge badge-reciprocal">Reciprocal Exemption</span>` : '',
          !sr.hasIncomeTax ? `<span class="state-status-badge badge-no-tax">0% Wage Tax State</span>` : ''
        ].filter(Boolean).join('');
        const headerRight = `<span class="irs-line-tag">${sr.isRefund ? `Refund +${formatCurrencyExact(sr.netOutcome)}` : `Owed -${formatCurrencyExact(sr.netOutcome)}`}</span>`;

        const cardsHtml = stateBlocks.map((sb, idx) => {
          const isFinal = idx === stateBlocks.length - 1;
          return this.renderCalcCardHtml(
            sb,
            'state-return-card',
            isFinal ? extraBadges : '',
            isFinal ? headerRight : ''
          );
        }).join('');

        stateCalcHtml = `
          <section class="panel-section state-subsection" id="state-${code.toLowerCase()}-calculations">
            <div class="section-header-bar">
              <h2>${stateName} Calculations</h2>
            </div>
            <div class="calc-blocks-stack">${cardsHtml}</div>
          </section>
        `;
      }

      block.innerHTML = `
        <div class="state-group-header">
          <h2 style="font-size: 1.2rem; font-weight: 900; color: #4c1d95; margin: 0;">${stateName} (${code}) ${isResident ? '• Primary Resident' : '• Nonresident'}</h2>
          <span class="irs-line-tag" style="background: #f3e8ff; color: #6b21a8; border-color: #d8b4fe;">${code} State Section</span>
        </div>
        ${subsectionsHtml}
        ${stateCalcHtml}
      `;

      container.appendChild(block);

      // Populate state dropdown menus
      block.querySelectorAll<HTMLElement>('.add-panel-dropdown-wrap[data-state-dropdown]').forEach(wrap => {
        const [stCode, sec] = (wrap.dataset.stateDropdown || '').split(':') as [string, PanelSectionCategory];
        const btn = wrap.querySelector<HTMLButtonElement>('.add-panel-dropdown-btn');
        const menu = wrap.querySelector<HTMLElement>('.add-panel-dropdown-menu');
        if (btn && !btn.dataset.bound) {
          btn.dataset.bound = 'true';
          btn.addEventListener('click', (e: Event) => {
            e.stopPropagation();
            const wasOpen = wrap.classList.contains('open');
            document.querySelectorAll('.menu-dropdown.open, .add-panel-dropdown-wrap.open').forEach(el => el.classList.remove('open'));
            if (!wasOpen) wrap.classList.add('open');
          });
        }
        if (menu) {
          menu.innerHTML = '';
          getStateCatalogForSection(stCode, sec).forEach(entry => {
            const row = document.createElement('button');
            row.type = 'button';
            row.className = 'add-panel-option-row';
            row.innerHTML = `
              <div>
                <span class="add-panel-option-name">${entry.title}</span>
                <span class="add-panel-option-sub">${entry.officialTitle}</span>
              </div>
              ${renderRatingCircles(entry.ratingKey)}
            `;
            row.addEventListener('click', () => {
              wrap.classList.remove('open');
              const newId = Date.now() + Math.floor(Math.random() * 1000);
              statePanels.push({
                id: newId,
                state: stCode,
                section: sec,
                itemKey: entry.key,
                amount: 0
              });
              this.recalculateAndRender();
            });
            menu.appendChild(row);
          });
        }
      });
    });

    // Bind state panel inputs, close buttons, More Info buttons, and click-to-select
    container.querySelectorAll<HTMLInputElement>('.state-panel-amount-input').forEach(inp => {
      inp.addEventListener('input', () => {
        const id = parseInt(inp.dataset.statePanelId || '', 10);
        const item = statePanels.find(p => p.id === id);
        if (item) {
          item.amount = Number(inp.value) || 0;
          this.recalculateAndRender();
        }
      });
    });

    container.querySelectorAll<HTMLElement>('[data-remove-state-panel]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = parseInt(btn.dataset.removeStatePanel || '', 10);
        this.state.statePanels = statePanels.filter(p => p.id !== id);
        this.recalculateAndRender();
      });
    });

    container.querySelectorAll<HTMLElement>('.btn-more-info[data-rating-field]').forEach(btn => {
      btn.addEventListener('click', () => {
        const key = btn.dataset.ratingField;
        if (key) this.openGuidanceModal(key);
      });
    });

    container.querySelectorAll<HTMLElement>('.calc-clickable').forEach(card => {
      card.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest('.formula-var')) return;
        const curr = this.arrowEngine?.getSelectedNode();
        this.arrowEngine?.setSelectedNode(curr === card.id ? null : card.id);
      });
    });

    container.querySelectorAll<HTMLElement>('.formula-var').forEach(varEl => {
      varEl.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const blockId = varEl.dataset.blockId;
        const varId = varEl.dataset.varId;
        if (blockId && varId) {
          this.openVariableBreakdownPopover(blockId, varId, varEl);
        }
      });
    });

    container.querySelectorAll<HTMLElement>('.auto-panel-card').forEach(card => {
      card.addEventListener('click', () => {
        const curr = this.arrowEngine?.getSelectedNode();
        this.arrowEngine?.setSelectedNode(curr === card.id ? null : card.id);
      });
    });
  }

  /* --------------------------------------------------------------------------
     Clustered Calculation Blocks + Click-to-Select + Variable Breakdown Popover
     -------------------------------------------------------------------------- */
  private renderTokensHtml(tokens: FormulaToken[], blockId: string): string {
    return tokens.map(tok => {
      if (tok.type === 'text') {
        return `<span>${tok.text || ''}</span>`;
      }
      const emptyClass = tok.isEmpty ? 'var-empty' : '';
      const display = tok.valueFormatted || tok.label || '';
      return `<span class="formula-var ${emptyClass}" data-block-id="${blockId}" data-var-id="${tok.varId}" role="button" tabindex="0" title="Click to view contributing inputs">${display}</span>`;
    }).join('');
  }

  private renderCalculationBlocks(taxData: TaxCalculationSummary): void {
    const container = document.getElementById('calc-blocks-container');
    if (!container) return;

    this.currentCalcBlocks = buildCalculationBlocks(this.state, taxData);
    const showEmpty = Boolean(this.uiPrefs.showEmptyCalcBlocks);
    const visibleBlocks = this.currentCalcBlocks.filter(b => b.hasImpact || showEmpty);

    container.innerHTML = '';

    if (visibleBlocks.length === 0) {
      container.innerHTML = `
        <div class="calc-card" style="text-align: center; color: #64748b; padding: 1.5rem;">
          Enter W-2 wages, other income, or deductions above to spawn live calculation blocks.
          (Or enable <strong>Show Empty Calculation Blocks</strong> in <strong>Settings</strong>.)
        </div>
      `;
      return;
    }

    visibleBlocks.forEach(block => {
      const wrapper = document.createElement('div');
      wrapper.innerHTML = this.renderCalcCardHtml(block);
      const card = wrapper.firstElementChild as HTMLElement;

      // Click on calculation box selects it & highlights arrows leading to/from it
      card.addEventListener('click', (e: Event) => {
        const target = e.target as HTMLElement;
        if (target.closest('.formula-var')) return;
        const curr = this.arrowEngine?.getSelectedNode();
        this.arrowEngine?.setSelectedNode(curr === block.id ? null : block.id);
      });

      container.appendChild(card);
    });

    // Bind clickable formula variables
    container.querySelectorAll<HTMLElement>('.formula-var').forEach(varEl => {
      varEl.addEventListener('click', (e: Event) => {
        e.stopPropagation();
        const blockId = varEl.dataset.blockId;
        const varId = varEl.dataset.varId;
        if (blockId && varId) {
          this.openVariableBreakdownPopover(blockId, varId, varEl);
        }
      });
    });
  }

  private renderCalcCardHtml(
    block: CalcBlockDefinition,
    extraClass = '',
    extraBadgesHtml = '',
    headerRightHtml = ''
  ): string {
    const selectedId = this.arrowEngine?.getSelectedNode() || null;
    const generalLinesHtml = block.lines.map(line => `
      <div class="unified-formula-line" id="${line.id}-gen">
        <span class="unified-formula-eq">${this.renderTokensHtml(line.generalTokens.map(tk => tk.type === 'var' ? { ...tk, valueFormatted: tk.label } : tk), block.id)}</span>
        ${line.formLineLabel
          ? `<span class="irs-line-tag">${line.formLineLabel}</span>`
          : `<span class="irs-line-tag intermediate-tag">Intermediate</span>`}
      </div>
    `).join('');

    const pluggedLinesHtml = block.lines.map(line => `
      <div class="unified-formula-line plugged-highlight" id="${line.id}">
        <span class="unified-formula-eq">${this.renderTokensHtml(line.pluggedTokens, block.id)}</span>
      </div>
    `).join('');

    return `
      <div class="calc-card calc-clickable ${extraClass} ${block.isOutput ? 'output-panel' : ''} ${selectedId === block.id ? 'calc-selected' : ''}" id="${block.id}">
        <div class="calc-card-header">
          <div>
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem; flex-wrap: wrap;">
              <span class="step-indicator">${block.stepLabel}</span>
              ${extraBadgesHtml}
            </div>
            <h3 class="calc-card-title">${block.title}</h3>
          </div>
          ${headerRightHtml}
        </div>
        <div class="unified-formula-box">
          <div class="unified-formula-section">
            <div class="unified-formula-label-col">
              <span class="formula-badge general">General Formula</span>
            </div>
            <div class="unified-formula-lines-col">
              ${generalLinesHtml}
            </div>
          </div>
          <div class="unified-formula-section">
            <div class="unified-formula-label-col">
              <span class="formula-badge plugged">With Your Numbers</span>
            </div>
            <div class="unified-formula-lines-col">
              ${pluggedLinesHtml}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private openVariableBreakdownPopover(blockId: string, varId: string, anchorEl: HTMLElement): void {
    const block = this.currentCalcBlocks.find(b => b.id === blockId)
      || this.currentStateCalcBlocks.find(b => b.id === blockId);
    const breakdown: CalcVariableBreakdown | undefined = block?.variables[varId];
    const popover = document.getElementById('var-breakdown-popover');
    const titleEl = document.getElementById('var-popover-title');
    const listEl = document.getElementById('var-popover-list');
    if (!breakdown || !popover || !titleEl || !listEl) return;

    titleEl.textContent = `${breakdown.label} (${breakdown.totalFormatted})`;
    listEl.innerHTML = '';

    breakdown.contributors.forEach((c: CalcVariableContributor) => {
      const row = document.createElement('button');
      row.type = 'button';
      row.className = `var-contrib-row ${!c.isSetUp ? 'is-unset' : ''}`;
      const signClass = c.sign === '-' ? 'sign-minus' : (c.sign === 'info' ? 'sign-info' : 'sign-plus');
      row.innerHTML = `
        <span class="var-contrib-sign ${signClass}">${c.sign === 'info' ? '•' : c.sign}</span>
        <span class="var-contrib-label">${c.label}</span>
        <span class="var-contrib-amt">${c.amountFormatted}</span>
      `;
      row.addEventListener('click', () => {
        popover.hidden = true;
        // If this contributor belongs to an optional panel that isn't open yet, add it to the page first!
        if (c.panelKey) {
          if (!this.uiPrefs.openPanels) this.uiPrefs.openPanels = {};
          if (!this.uiPrefs.openPanels[c.panelKey]) {
            this.uiPrefs.openPanels[c.panelKey] = true;
            const entry = getPanelCatalogEntry(c.panelKey);
            if (entry?.sourceType) {
              const hasAny = (this.state.otherIncome.sources || []).some(s => s.type === entry.sourceType);
              if (!hasAny) this.addIncomeSourceOfType(entry.sourceType, false);
            }
            this.saveUiPrefs();
            this.renderFederalPanelSections();
            this.recalculateAndRender();
          }
        }
        const target = document.getElementById(c.targetElementId);
        if (target) {
          target.scrollIntoView({ behavior: 'smooth', block: 'center' });
          target.classList.add('flash-highlight');
          if (target instanceof HTMLInputElement || target instanceof HTMLSelectElement) {
            target.focus();
          }
          setTimeout(() => target.classList.remove('flash-highlight'), 1200);
        }
      });
      listEl.appendChild(row);
    });

    const rect = anchorEl.getBoundingClientRect();
    const top = Math.min(window.innerHeight - 320, rect.bottom + 8);
    const left = Math.max(12, Math.min(window.innerWidth - 356, rect.left));
    popover.style.top = `${Math.max(64, top)}px`;
    popover.style.left = `${left}px`;
    popover.hidden = false;

    const closeBtn = document.getElementById('var-popover-close');
    if (closeBtn) {
      closeBtn.onclick = () => { popover.hidden = true; };
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  (window as any).taxApp = new TaxApp();
});
