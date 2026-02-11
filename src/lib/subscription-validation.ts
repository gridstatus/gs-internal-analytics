import type { SubscriptionEditableFields } from '@/lib/api-types';
import { EDITABLE_FIELD_KEYS, EDITABLE_FIELD_TO_COLUMN, SUBSCRIPTION_STATUSES } from '@/lib/api-types';
import { getDistinctEntitlements, getPlanById, loadSql } from '@/lib/queries';

export type ValidationResult =
  | { valid: true; sanitized: SubscriptionEditableFields }
  | { valid: false; errors: string[] };

/** Limit overrides: null, -1 (unlimited), or a non-negative integer. */
function isLimitOverrideValue(value: unknown): value is number | null {
  if (value == null) return true;
  if (typeof value !== 'number' || !Number.isInteger(value) || Number.isNaN(value) || !isFinite(value)) return false;
  return value === -1 || value >= 0;
}

function isValidDateString(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export async function validateSubscriptionUpdate(
  merged: Partial<SubscriptionEditableFields>
): Promise<ValidationResult> {
  const errors: string[] = [];

  // Require all editable keys to be present for a full merge (we only call this after merging current + changes).
  for (const key of EDITABLE_FIELD_KEYS) {
    if (!Object.prototype.hasOwnProperty.call(merged, key)) {
      errors.push(`Missing required field: ${key}`);
    }
  }
  if (errors.length > 0) {
    return { valid: false, errors };
  }

  const m = merged as SubscriptionEditableFields;

  // planId: required positive integer, plan must exist
  if (typeof m.planId !== 'number' || !Number.isInteger(m.planId) || m.planId < 1) {
    errors.push('planId must be a positive integer');
  } else {
    const plans = await getPlanById(m.planId);
    if (plans.length === 0) {
      errors.push(`Plan with id ${m.planId} not found`);
    }
  }

  // status: must be one of Stripe statuses
  if (typeof m.status !== 'string') {
    errors.push('status must be a string');
  } else if (!SUBSCRIPTION_STATUSES.includes(m.status as (typeof SUBSCRIPTION_STATUSES)[number])) {
    errors.push(`status must be one of: ${SUBSCRIPTION_STATUSES.join(', ')}`);
  }

  // enforceApiUsageLimit: strictly boolean
  if (typeof m.enforceApiUsageLimit !== 'boolean') {
    errors.push('enforceApiUsageLimit must be a boolean');
  }

  // cancelAtPeriodEnd: strictly boolean or null
  if (m.cancelAtPeriodEnd != null && typeof m.cancelAtPeriodEnd !== 'boolean') {
    errors.push('cancelAtPeriodEnd must be null or a boolean');
  }

  // currentBillingPeriodStart: valid ISO date string
  if (!isValidDateString(m.currentBillingPeriodStart)) {
    errors.push('currentBillingPeriodStart must be a valid ISO date string');
  }

  // currentBillingPeriodEnd: null or valid ISO date; if both set, end must be after start
  if (m.currentBillingPeriodEnd != null && !isValidDateString(m.currentBillingPeriodEnd)) {
    errors.push('currentBillingPeriodEnd must be null or a valid ISO date string');
  }
  if (
    m.currentBillingPeriodStart != null &&
    m.currentBillingPeriodEnd != null &&
    isValidDateString(m.currentBillingPeriodStart) &&
    isValidDateString(m.currentBillingPeriodEnd)
  ) {
    if (new Date(m.currentBillingPeriodEnd) <= new Date(m.currentBillingPeriodStart)) {
      errors.push('currentBillingPeriodEnd must be after currentBillingPeriodStart');
    }
  }

  // Alerts, dashboards, downloads, charts, API/rate limits: null, -1 (unlimited), or non-negative integer
  const unlimitedAllowedKeys: (keyof SubscriptionEditableFields)[] = [
    'alertsLimitOverride',
    'dashboardsLimitOverride',
    'downloadsLimitOverride',
    'chartsLimitOverride',
    'apiRowsReturnedLimitOverride',
    'apiRequestsLimitOverride',
    'apiRowsPerResponseLimitOverride',
    'perSecondApiRateLimitOverride',
    'perMinuteApiRateLimitOverride',
    'perHourApiRateLimitOverride',
  ];
  for (const key of unlimitedAllowedKeys) {
    const v = m[key];
    if (!isLimitOverrideValue(v)) {
      errors.push(`${key} must be null, -1 (unlimited), or a non-negative integer`);
    }
  }

  // entitlementOverrides: null or array of strings, each must be in known entitlements
  if (m.entitlementOverrides != null) {
    if (!Array.isArray(m.entitlementOverrides)) {
      errors.push('entitlementOverrides must be null or an array of strings');
    } else {
      const allowed = new Set((await getDistinctEntitlements()).map((r) => r.entitlement));
      for (const s of m.entitlementOverrides) {
        if (typeof s !== 'string') {
          errors.push('entitlementOverrides must contain only strings');
          break;
        }
        if (!allowed.has(s)) {
          errors.push(`Unknown entitlement: ${s}`);
        }
      }
    }
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, sanitized: m };
}

/** Build changes from request body: only keys that are present (hasOwnProperty). Used for null semantics. */
export function buildChangesFromBody(body: Record<string, unknown>): Partial<SubscriptionEditableFields> {
  const changes: Partial<SubscriptionEditableFields> = {};
  for (const key of EDITABLE_FIELD_KEYS) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      (changes as Record<string, unknown>)[key] = body[key];
    }
  }
  return changes;
}

/** Reject if body has any key not in EDITABLE_FIELD_KEYS. */
export function rejectUnknownFields(body: Record<string, unknown>): string | null {
  for (const key of Object.keys(body)) {
    if (!EDITABLE_FIELD_KEYS.includes(key as keyof SubscriptionEditableFields)) {
      return `Unknown field: ${key}`;
    }
  }
  return null;
}

/**
 * Build parameterized UPDATE SQL and params for only the columns present in changes.
 * Caller must pass validated sanitized object; values for changed keys come from sanitized.
 * Returns { sql, params } with params = [subscriptionId, ...values in EDITABLE_FIELD_KEYS order for changed keys].
 */
export function buildSubscriptionUpdateSql(
  changes: Partial<SubscriptionEditableFields>,
  sanitized: SubscriptionEditableFields,
  subscriptionId: number
): { sql: string; params: unknown[] } {
  const changeKeys = EDITABLE_FIELD_KEYS.filter((k) =>
    Object.prototype.hasOwnProperty.call(changes, k)
  ) as (keyof SubscriptionEditableFields)[];
  if (changeKeys.length === 0) {
    throw new Error('buildSubscriptionUpdateSql: no change keys');
  }
  const setClause = changeKeys
    .map((k, i) => `${EDITABLE_FIELD_TO_COLUMN[k]} = $${i + 2}`)
    .join(', ');
  const params = [subscriptionId, ...changeKeys.map((k) => sanitized[k])];
  const template = loadSql('mutations/subscription-update.sql');
  // Match {{SET_CLAUSE}} with optional whitespace; replace so we never send placeholder to DB
  const sql = template.replace(/\{\{\s*SET_CLAUSE\s*\}\}/g, setClause);
  if (sql.includes('{{')) {
    throw new Error(
      'subscription-update.sql: SET_CLAUSE placeholder was not replaced. Check that the file contains exactly: {{SET_CLAUSE}}'
    );
  }
  return { sql, params };
}

export type PrepareUpdateResult =
  | { ok: true; sql: string; params: unknown[]; changes: Partial<SubscriptionEditableFields>; currentEditable: SubscriptionEditableFields; sanitized: SubscriptionEditableFields }
  | { ok: false; error: string; status: number; errors?: string[] };

/**
 * Parse body, merge with current row, validate, and build UPDATE SQL. Single entry point for PATCH so the route stays thin.
 */
export async function prepareSubscriptionUpdate(
  body: Record<string, unknown>,
  currentEditable: SubscriptionEditableFields,
  subscriptionId: number
): Promise<PrepareUpdateResult> {
  const unknownErr = rejectUnknownFields(body);
  if (unknownErr) return { ok: false, error: unknownErr, status: 400 };

  const changes = buildChangesFromBody(body);
  if (Object.keys(changes).length === 0) {
    return { ok: false, error: 'No fields to update', status: 400 };
  }

  const merged: SubscriptionEditableFields = { ...currentEditable, ...changes };
  const validation = await validateSubscriptionUpdate(merged);
  if (!validation.valid) {
    return {
      ok: false,
      error: 'Validation failed',
      status: 400,
      errors: validation.errors,
    };
  }

  const { sql, params } = buildSubscriptionUpdateSql(changes, validation.sanitized, subscriptionId);
  return {
    ok: true,
    sql,
    params,
    changes,
    currentEditable,
    sanitized: validation.sanitized,
  };
}
