import { ReactiveElement, PropertyValues } from '@lit/reactive-element';
import { property } from '@lit/reactive-element/decorators.js';
import { getArrow, getBoxToBoxArrow, ArrowOptions } from 'perfect-arrows';
import vizObserver, { Rect } from 'viz-observer';

export type ArrowType = 'point' | 'box';

export type Arrow = [
  /** The x position of the (padded) starting point. */
  sx: number,
  /** The y position of the (padded) starting point. */
  sy: number,
  /** The x position of the center point. */
  cx: number,
  /** The y position of the center point. */
  cy: number,
  /** The x position of the (padded) ending point. */
  ex: number,
  /** The y position of the (padded) ending point. */
  ey: number,
  /** The angle (in radians) for an ending arrowhead. */
  ae: number,
  /** The angle (in radians) for a starting arrowhead. */
  as: number,
  /** The angle (in radians) for a center arrowhead. */
  ec: number
];

export class PerfectArrow extends ReactiveElement {
  static tagName = 'perfect-arrow';

  static register() {
    customElements.define(this.tagName, this);
  }

  /** The type of layout algorithm to use: 'box' or 'point'. */
  @property({ type: String }) type: ArrowType = 'box';

  /** A CSS selector for the source of the arrow. */
  @property({ type: String, reflect: true }) source: string = '';
  private sourceCleanup: (() => void) | null = null;
  private sourceRect!: Rect;

  /** A CSS selector for the target of the arrow. */
  @property({ type: String, reflect: true }) target: string = '';
  private targetCleanup: (() => void) | null = null;
  private targetRect!: Rect;

  /** A value representing the natural bow of the arrow. At `0`, all lines will be straight. */
  @property({ type: Number }) bow: number = 0;

  /** The effect that the arrow's length will have, relative to its `minStretch` and `maxStretch`, on the bow of the arrow. At `0`, the stretch will have no effect. */
  @property({ type: Number }) stretch: number = 0.25;

  /** The length of the arrow where the line should be most stretched. Shorter distances than this will have no additional effect on the bow of the arrow. */
  @property({ type: Number, attribute: 'stretch-min' }) stretchMin: number = 50;

  /** The length of the arrow at which the stretch should have no effect. */
  @property({ type: Number, attribute: 'stretch-max' }) stretchMax: number = 420;

  /** How far the arrow's starting point should be from the provided start point. */
  @property({ type: Number, attribute: 'pad-start' }) padStart: number = 0;

  /** How far the arrow's ending point should be from the provided end point. */
  @property({ type: Number, attribute: 'pad-end' }) padEnd: number = 20;

  /** Whether to reflect the arrow's bow angle. */
  @property({ type: Boolean }) flip: boolean = false;

  /** Whether to use straight lines at 45 degree angles. */
  @property({ type: Boolean }) straights: boolean = true;

  disconnectedCallback() {
    super.disconnectedCallback();
    this.unobserveSource();
    this.unobserveTarget();
  }

  observerSource() {
    this.unobserveSource();
    const el = document.querySelector(this.source);

    if (!el) {
      throw new Error('source is not a valid element');
    }
    return vizObserver(el, (rect) => {
      this.sourceRect = rect;
      this.requestUpdate();
    });
  }

  unobserveSource() {
    this.sourceCleanup?.();
    this.sourceCleanup = null;
  }

  observerTarget() {
    this.unobserveTarget();
    const el = document.querySelector(this.target);

    if (!el) {
      throw new Error('source is not a valid element');
    }
    return vizObserver(el, (rect) => {
      this.targetRect = rect;
      this.requestUpdate();
    });
  }

  unobserveTarget() {
    this.targetCleanup?.();
    this.targetCleanup = null;
  }

  getArrow(sourceBox: Rect, targetBox: Rect, options: ArrowOptions): Arrow {
    switch (this.type) {
      case 'point': {
        const sourceX = sourceBox.x + sourceBox.width / 2;
        const sourceY = sourceBox.y + sourceBox.height / 2;
        const targetX = targetBox.x + targetBox.width / 2;
        const targetY = targetBox.y + targetBox.height / 2;
        return getArrow(sourceX, sourceY, targetX, targetY, options) as Arrow;
      }
      case 'box': {
        return getBoxToBoxArrow(
          sourceBox.x,
          sourceBox.y,
          sourceBox.width,
          sourceBox.height,
          targetBox.x,
          targetBox.y,
          targetBox.width,
          targetBox.height,
          options
        ) as Arrow;
      }
    }
  }

  update(changedProperties: PropertyValues) {
    super.update(changedProperties);

    if (!this.source || !this.target) {
      return;
    }

    if (changedProperties.has('source')) {
      this.sourceCleanup = this.observerSource();
    }

    if (changedProperties.has('target')) {
      this.targetCleanup = this.observerTarget();
    }

    const options: ArrowOptions = {
      bow: this.bow,
      stretch: this.stretch,
      stretchMin: this.stretchMin,
      stretchMax: this.stretchMax,
      padStart: this.padStart,
      padEnd: this.padEnd,
      flip: this.flip,
      straights: this.straights,
    };

    const arrow = this.getArrow(this.sourceRect, this.targetRect, options);

    this.render(arrow);
  }

  render([sx, sy, cx, cy, ex, ey, ae]: Arrow): void {
    const endAngleAsDegrees = ae * (180 / Math.PI);

    // FIX: Doesn't rerender when it has display none
    const { width, height } = this.getBoundingClientRect();

    if (!this.shadowRoot) return;

    // TODO: optimize lol
    this.shadowRoot.innerHTML = `
      <svg
        viewBox="0 0 ${width} ${height}"
        style=" width: ${width}px; height: ${height}px;"
        stroke="#000"
        fill="#000"
        strokeWidth="3"
      >
        <circle cx="${sx}" cy="${sy}" r="4" />
        <path d="${`M${sx},${sy} Q${cx},${cy} ${ex},${ey}`}" fill="none" />
        <polygon
          points="0,-6 12,0, 0,6"
          transform="${`translate(${ex},${ey}) rotate(${endAngleAsDegrees})`}"
        />
      </svg>`;
  }
}
