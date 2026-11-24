export {
  buildExplanation,
  buildLegend,
  type Explanation,
  type ExplainedExpense,
  type LegendEntry,
  type MemberExplanation,
  type Slice,
} from './build-explanation';
export {
  colorForRank,
  fillStyle,
  MAX_COLORED_EXPENSES,
  type ChartSlot,
  type ColorMap,
  type ExpenseColor,
} from './colors';
export { buildExampleGroup, settleGroup } from './example-group';
export { LazyExplanationPlayer } from './LazyExplanationPlayer';
export { narrate, narrateShareStep, STEP_TITLES } from './narration';
export { PaidShareRow, type PaidShareRowProps } from './PaidShareRow';
export {
  buildShareSteps,
  MAX_INDIVIDUAL_SHARE_STEPS,
  type ShareStep,
} from './share-steps';
