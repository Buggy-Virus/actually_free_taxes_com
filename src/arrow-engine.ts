/**
 * Actually Free Taxes - Dynamic Arrow & Data Flow Engine (TypeScript)
 * Draws animated, color-coded SVG Bezier arrows connecting input fields to downstream calculations.
 */

import { ConnectionDef, ArrowColorCategory } from './types.js';

export interface ArrowEngineOptions {
  showAll?: boolean;
}

export class ArrowEngine {
  private svg: SVGSVGElement;
  private connections: ConnectionDef[] = [];
  private activeSourceId: string | null = null;
  private activeTargetId: string | null = null;
  private showAll: boolean;
  private animationFrame: number | null = null;
  private resizeObserver?: ResizeObserver;

  public readonly colors: Record<ArrowColorCategory, string> = {
    wages: '#10b981',       // Emerald
    withholding: '#0284c7', // Sky Blue
    ss: '#f59e0b',          // Amber
    medicare: '#ec4899',    // Pink
    state: '#8b5cf6',       // Violet for State Tax
    adjustments: '#6366f1', // Indigo
    status: '#4f46e5',      // Deep Indigo
    tax: '#f97316',         // Orange
    credits: '#14b8a6',     // Teal
    refund: '#10b981',      // Green
    owed: '#ef4444',        // Red
    itemized: '#059669',    // Rich Green for Itemized Deductions
    capital: '#d97706',     // Warm Amber for Capital Gains/Losses
    default: '#3b82f6'      // Blue
  };

  constructor(svgElement: SVGSVGElement, options: ArrowEngineOptions = {}) {
    this.svg = svgElement;
    this.showAll = options.showAll !== undefined ? options.showAll : true;

    this.initMarkers();
    this.bindEvents();
  }

  private initMarkers(): void {
    let defs = this.svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
      this.svg.appendChild(defs);
    }

    // Create markers for each color
    Object.entries(this.colors).forEach(([name, color]) => {
      const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
      marker.setAttribute('id', `arrowhead-${name}`);
      marker.setAttribute('viewBox', '0 0 12 12');
      marker.setAttribute('refX', '9');
      marker.setAttribute('refY', '6');
      marker.setAttribute('markerWidth', '8');
      marker.setAttribute('markerHeight', '8');
      marker.setAttribute('orient', 'auto-start-reverse');

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', 'M 1 2 L 10 6 L 1 10 Z');
      path.setAttribute('fill', color);
      marker.appendChild(path);
      defs!.appendChild(marker);
    });
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.scheduleRedraw());
    window.addEventListener('scroll', () => this.scheduleRedraw(), { passive: true });

    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver(() => this.scheduleRedraw());
      this.resizeObserver.observe(document.body);
    }
  }

  public setConnections(connectionList: ConnectionDef[]): void {
    this.connections = connectionList;
    this.scheduleRedraw();
  }

  public addConnection(conn: ConnectionDef): void {
    this.connections.push(conn);
    this.scheduleRedraw();
  }

  public clearConnections(): void {
    this.connections = [];
    this.scheduleRedraw();
  }

  public setActiveSource(sourceId: string | null): void {
    this.activeSourceId = sourceId;
    this.updateHighlightStyles();
  }

  public setActiveTarget(targetId: string | null): void {
    this.activeTargetId = targetId;
    this.updateHighlightStyles();
  }

  public clearActive(): void {
    this.activeSourceId = null;
    this.activeTargetId = null;
    this.updateHighlightStyles();
  }

  public setShowAll(val: boolean): void {
    this.showAll = Boolean(val);
    this.scheduleRedraw();
  }

  public scheduleRedraw(): void {
    if (this.animationFrame !== null) {
      cancelAnimationFrame(this.animationFrame);
    }
    this.animationFrame = requestAnimationFrame(() => this.redraw());
  }

  private updateSvgDimensions(): void {
    const docWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth, window.innerWidth);
    const docHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight, window.innerHeight);
    this.svg.setAttribute('width', String(docWidth));
    this.svg.setAttribute('height', String(docHeight));
    this.svg.style.width = `${docWidth}px`;
    this.svg.style.height = `${docHeight}px`;
  }

  private redraw(): void {
    this.updateSvgDimensions();

    const defs = this.svg.querySelector('defs');
    this.svg.innerHTML = '';
    if (defs) this.svg.appendChild(defs);

    const docScrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const docScrollY = window.pageYOffset || document.documentElement.scrollTop;

    this.connections.forEach(conn => {
      const sourceEl = document.getElementById(conn.sourceId);
      const targetEl = document.getElementById(conn.targetId);

      if (!sourceEl || !targetEl) return;

      const sourceRect = sourceEl.getBoundingClientRect();
      const targetRect = targetEl.getBoundingClientRect();

      if (sourceRect.width === 0 || targetRect.width === 0) return;

      const isConnectedToActive =
        (this.activeSourceId && (conn.sourceId === this.activeSourceId || conn.targetId === this.activeSourceId)) ||
        (this.activeTargetId && (conn.targetId === this.activeTargetId || conn.sourceId === this.activeTargetId));

      const shouldShow = this.showAll || isConnectedToActive;
      if (!shouldShow) return;

      const isHighlighted = isConnectedToActive;
      const colorCategory: ArrowColorCategory = conn.category || 'default';
      const strokeColor = this.colors[colorCategory] || this.colors.default;

      const sX = sourceRect.left + docScrollX + (sourceRect.width / 2);
      const sY = sourceRect.bottom + docScrollY - 2;

      const tX = targetRect.left + docScrollX + (targetRect.width / 2);
      const tY = targetRect.top + docScrollY + 2;

      const dx = tX - sX;
      const dy = tY - sY;
      const delta = Math.max(Math.abs(dy), 60);

      const c1x = sX + (dx * 0.1);
      const c1y = sY + (delta * 0.45);
      const c2x = tX - (dx * 0.1);
      const c2y = tY - (delta * 0.45);

      const pathData = `M ${sX} ${sY} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${tX} ${tY}`;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('class', `arrow-group ${isHighlighted ? 'active' : ''}`);
      g.dataset.source = conn.sourceId;
      g.dataset.target = conn.targetId;

      if (isHighlighted) {
        const glow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        glow.setAttribute('d', pathData);
        glow.setAttribute('fill', 'none');
        glow.setAttribute('stroke', strokeColor);
        glow.setAttribute('stroke-width', '8');
        glow.setAttribute('stroke-opacity', '0.25');
        glow.setAttribute('stroke-linecap', 'round');
        g.appendChild(glow);
      }

      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      path.setAttribute('d', pathData);
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', strokeColor);
      path.setAttribute('stroke-width', isHighlighted ? '3.5' : '2.2');
      path.setAttribute('stroke-opacity', isHighlighted ? '1' : (this.activeSourceId || this.activeTargetId ? '0.2' : '0.75'));
      path.setAttribute('stroke-linecap', 'round');
      path.setAttribute('marker-end', `url(#arrowhead-${colorCategory})`);
      path.setAttribute('class', `arrow-line ${isHighlighted ? 'flowing' : ''}`);

      if (isHighlighted || this.showAll) {
        path.setAttribute('stroke-dasharray', isHighlighted ? '8 4' : '6 4');
      }

      g.appendChild(path);

      const hitArea = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hitArea.setAttribute('d', pathData);
      hitArea.setAttribute('fill', 'none');
      hitArea.setAttribute('stroke', 'transparent');
      hitArea.setAttribute('stroke-width', '16');
      hitArea.style.cursor = 'pointer';
      (hitArea.style as any).pointerEvents = 'stroke';

      hitArea.addEventListener('mouseenter', () => {
        this.setActiveSource(conn.sourceId);
        this.setActiveTarget(conn.targetId);
      });
      hitArea.addEventListener('mouseleave', () => {
        this.clearActive();
      });
      hitArea.addEventListener('click', () => {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.classList.add('flash-highlight');
        setTimeout(() => targetEl.classList.remove('flash-highlight'), 1200);
      });

      g.appendChild(hitArea);
      this.svg.appendChild(g);
    });

    this.updateHighlightStyles();
  }

  private updateHighlightStyles(): void {
    document.querySelectorAll('.data-source-active, .data-target-active').forEach(el => {
      el.classList.remove('data-source-active', 'data-target-active');
    });

    if (this.activeSourceId) {
      const srcEl = document.getElementById(this.activeSourceId);
      if (srcEl) srcEl.classList.add('data-source-active');

      this.connections.filter(c => c.sourceId === this.activeSourceId).forEach(c => {
        const tgtEl = document.getElementById(c.targetId);
        if (tgtEl) tgtEl.classList.add('data-target-active');
      });
    }

    if (this.activeTargetId) {
      const tgtEl = document.getElementById(this.activeTargetId);
      if (tgtEl) tgtEl.classList.add('data-target-active');

      this.connections.filter(c => c.targetId === this.activeTargetId).forEach(c => {
        const srcEl = document.getElementById(c.sourceId);
        if (srcEl) srcEl.classList.add('data-source-active');
      });
    }
  }
}
