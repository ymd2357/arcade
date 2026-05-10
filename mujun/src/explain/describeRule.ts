import type { Rule } from '../engine/types';

export function describeRule(rule: Rule): string {
  return rule.description;
}
