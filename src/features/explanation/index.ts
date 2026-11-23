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
export { narrate, STEP_TITLES } from './narration';
