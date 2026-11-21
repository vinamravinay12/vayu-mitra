import {
  HEALTH_ALERT_RULES,
  type AlertSeverity,
  type HealthAlertRule,
} from '../catalog/health-alerts.js';
import { evaluateCondition } from '../conditions/evaluate-condition.js';
import type { HouseholdContext } from '../types/condition.js';

/** Order alerts are shown in: the most urgent first. */
const SEVERITY_ORDER: readonly AlertSeverity[] = ['urgent', 'warning', 'info'];

/** The alerts whose conditions hold for this household today, most urgent first. */
export function evaluateAlerts(context: HouseholdContext): HealthAlertRule[] {
  return HEALTH_ALERT_RULES.filter((rule) => evaluateCondition(rule.when, context)).sort(
    (first, second) =>
      SEVERITY_ORDER.indexOf(first.severity) - SEVERITY_ORDER.indexOf(second.severity),
  );
}
