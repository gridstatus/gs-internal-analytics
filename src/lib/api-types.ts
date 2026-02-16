/** Canonical list of Stripe subscription statuses. Use this everywhere instead of local arrays. */
export const SUBSCRIPTION_STATUSES = [
  'active',
  'canceled',
  'past_due',
  'trialing',
  'incomplete',
  'incomplete_expired',
  'unpaid',
  'paused',
] as const;

export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

export interface ActiveUsersDomainRow {
  domain: string;
  active24h: number;
  active7d: number;
  active30d: number;
  active90d: number;
  totalUsers: number;
}

export interface ActiveUsersResponse {
  active24h: number;
  active7d: number;
  active30d: number;
  active90d: number;
  totalUsers: number;
  byDomain: ActiveUsersDomainRow[];
}

export interface AlertUserRow {
  userId: number;
  username: string;
  domain: string;
  alertCount: number;
  lastAlertCreated: string | null;
}

export interface AlertsResponse {
  summary: {
    totalAlerts: number;
    alertUsers: number;
  };
  users: AlertUserRow[];
}

export interface ChartsDashboardsUserRow {
  userId: number;
  username: string;
  domain: string;
  chartCount: number;
  dashboardCount: number;
  lastChartCreated: string | null;
  lastDashboardCreated: string | null;
}

export interface ChartsDashboardsResponse {
  summary: {
    totalCharts: number;
    totalDashboards: number;
    chartUsers: number;
    dashboardUsers: number;
  };
  users: ChartsDashboardsUserRow[];
}

export interface MonthlyApiUsageData {
  month: string;
  totalApiRequests: number;
  totalApiRowsReturned: number;
  uniqueApiUsers: number;
  requestsMomChange: number;
  rowsMomChange: number;
  usersMomChange: number;
  [key: string]: string | number;
}

export interface ApiUsageResponse {
  monthlyData: MonthlyApiUsageData[];
}

export interface MonthlyUserData {
  month: string;
  totalUsers: number;
  newUsers: number;
  totalCorpUsers: number;
  newCorpUsers: number;
  corpDomains: number;
  teams: number;
  usersOnTeams: number;
  totalUsersMomChange: number;
  newUsersMomChange: number;
  corpUsersMomChange: number;
  [key: string]: string | number;
}

export interface TopDomain {
  domain: string;
  userCount: number;
}

export interface UsersTodayData {
  today: number;
  yesterdayAll: number;
  yesterdaySameTime: number;
  lastWeekAll: number;
  lastWeekSameTime: number;
}

export interface HourlyUserRegistrations {
  hour: string;
  newUsers: number;
  cumulativeUsers: number;
  cumulativeYesterday: number | null;
  cumulativeLastWeek: number | null;
}

export interface MonthlyNewUsersData {
  currentMonth: number;
  previousMonthAll: number;
  previousMonthSameTime: number;
  lastYearMonthAll: number;
  lastYearMonthSameTime: number;
}

export interface UsersResponse {
  monthlyData: MonthlyUserData[];
  combinedDataByPeriod?: MonthlyUserData[];
  usersToday: UsersTodayData;
  hourlyRegistrations?: HourlyUserRegistrations[];
  monthlyNewUsers?: MonthlyNewUsersData;
  last30DaysUsers?: {
    last30Days: number;
    previous30Days: number;
    last30DaysSameTime1YearAgo: number;
  };
  totalUsers?: number;
  topDomains?: {
    '1d': TopDomain[];
    '7d': TopDomain[];
    '30d': TopDomain[];
  };
}

export interface PosthogActiveUsersRow {
  period: string;
  activeUsers: number;
  periodChange: number;
  [key: string]: string | number;
}

export interface PosthogActiveUsersResponse {
  periodData: PosthogActiveUsersRow[];
  periodType: 'day' | 'week' | 'month';
}

export interface HourlyPulseRow {
  hour: string;
  hourLabel?: string;
  todayRaw: number;
  yesterdayRaw: number;
  lastWeekRaw: number;
  todayCum: number;
  yesterdayCum: number;
  lastWeekCum: number;
}

export interface TodaysPulseResponse {
  hourlyPulse: HourlyPulseRow[];
}

export interface ReferrerRow {
  referringDomain: string;
  entryPathname: string;
  uniqueUsers: number;
  uniqueUsersAvg: number;
  uniqueUsersAvg30: number;
  uniqueUsersToday: number;
  vsAvg7Change: number | null;
  vsAvg30Change: number | null;
}

export interface ReferrersResponse {
  referrers: ReferrerRow[];
}

export interface MostActiveUsersRow {
  email: string;
  pageViews: number;
  sessions: number;
  /** Distinct days with activity in the range; only present when range is multiple days (e.g. domain most-active-users). */
  daysActive?: number;
  userId: number | null;
}

export interface MostActiveUsersResponse {
  rows: MostActiveUsersRow[];
}

export interface MostViewedPageRow {
  pathname: string;
  views: number;
  viewsAvg: number;
  viewsAvg30: number;
  viewsToday: number;
  vsAvg7Change: number | null;
  vsAvg30Change: number | null;
}

export interface MostViewedPagesResponse {
  pages: MostViewedPageRow[];
}

export interface PosthogEventExplorerEvent {
  event: string;
  uniqueUsers: number;
}

export interface PosthogEventExplorerResponse {
  events: PosthogEventExplorerEvent[];
  days: number;
}

export interface MonthlyInsightData {
  month: string;
  posts: number;
  authors: number;
  impressions: number;
  engagements: number;
  postsViewed: number;
  uniqueVisitors: number;
  uniqueVisitorsLoggedIn: number;
  uniqueVisitorsAnon: number;
  uniqueHomefeedVisitors: number;
  uniqueHomefeedVisitorsLoggedIn: number;
  uniqueHomefeedVisitorsAnon: number;
  reactions: number;
  likes: number;
  dislikes: number;
  postsWithReactions: number;
  uniqueReactors: number;
  postsMomChange: number;
  impressionsMomChange: number;
  engagementsMomChange: number;
  reactionsMomChange: number;
}

export interface TopPost {
  id: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  authorId: number;
  username: string | null;
  email: string | null;
  impressions: number;
  viewCount: number;
  reactionCount: number;
  saveCount: number;
  likeCount: number;
  dislikeCount: number;
  engagementRate: number;
}

export interface InsightsResponse {
  summary: {
    totalPosts: number;
    totalImpressions: number;
    totalEngagements: number;
    totalReactions: number;
    uniqueAuthors: number;
    totalUniqueVisitors: number;
    totalUniqueVisitorsLoggedIn: number;
    totalUniqueVisitorsAnon: number;
    totalUniqueHomefeedVisitors: number;
    totalUniqueHomefeedVisitorsLoggedIn: number;
    totalUniqueHomefeedVisitorsAnon: number;
  };
  monthlyData: MonthlyInsightData[];
  topPosts: TopPost[];
}

export interface TopRegistration {
  period: string;
  periodType: 'day' | 'week' | 'month';
  registrationCount: number;
}

export interface TopRegistrationsResponse {
  data: TopRegistration[];
}

export interface OrganizationListItem {
  id: string;
  name: string;
  createdAt: string;
  userCount: number;
  newUsers7d: number;
  activeUsers7d: number;
}

export interface OrganizationsResponse {
  organizations: OrganizationListItem[];
}

export interface PlanListItem {
  id: number;
  planName: string;
}

export interface PlansResponse {
  plans: PlanListItem[];
}

export interface PlanDetail {
  id: number;
  planName: string;
  apiRowsReturnedLimit: number | null;
  apiRequestsLimit: number | null;
  apiRowsPerResponseLimit: number | null;
  alertsLimit: number | null;
  dashboardsLimit: number | null;
  downloadsLimit: number | null;
  entitlements: string[] | null;
  perSecondApiRateLimit: number | null;
  perMinuteApiRateLimit: number | null;
  perHourApiRateLimit: number | null;
  chartsLimit: number | null;
}

export interface SubscriptionListItem {
  id: number;
  userId: number | null;
  username: string | null;
  planId: number | null;
  planName: string | null;
  startDate: string;
  status: string;
  organizationId: string | null;
  organizationName: string | null;
  stripeSubscriptionId: string | null;
  currentBillingPeriodStart: string;
  currentBillingPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean | null;
  enforceApiUsageLimit: boolean;
  createdAt: string | null;
}

export interface PlanDetailResponse {
  plan: PlanDetail;
  subscriptions: SubscriptionListItem[];
}

export interface SubscriptionsResponse {
  subscriptions: SubscriptionListItem[];
}

export interface SubscriptionMonitorLimitNotEnforcedItem {
  id: number;
  userId: number | null;
  username: string | null;
  organizationName: string | null;
}

export interface SubscriptionMonitorActiveTrialItem {
  id: number;
  userId: number | null;
  username: string | null;
  organizationName: string | null;
  status: string;
  pastEndDate: boolean;
}

export interface SubscriptionMonitorResponse {
  limitNotEnforced: SubscriptionMonitorLimitNotEnforcedItem[];
  activeTrials: SubscriptionMonitorActiveTrialItem[];
  pastBillingPeriod: SubscriptionListItem[];
}

export interface TrialsResponse {
  selfService: SubscriptionListItem[];
  enterprise: SubscriptionMonitorActiveTrialItem[];
}

/** Editable fields for PATCH /api/subscriptions/[id]. Only keys present in the payload are applied; null means clear to NULL. */
export interface SubscriptionEditableFields {
  planId: number;
  status: SubscriptionStatus;
  enforceApiUsageLimit: boolean;
  cancelAtPeriodEnd: boolean | null;
  currentBillingPeriodStart: string;
  currentBillingPeriodEnd: string | null;
  apiRowsReturnedLimitOverride: number | null;
  apiRequestsLimitOverride: number | null;
  apiRowsPerResponseLimitOverride: number | null;
  alertsLimitOverride: number | null;
  dashboardsLimitOverride: number | null;
  downloadsLimitOverride: number | null;
  chartsLimitOverride: number | null;
  perSecondApiRateLimitOverride: number | null;
  perMinuteApiRateLimitOverride: number | null;
  perHourApiRateLimitOverride: number | null;
  entitlementOverrides: string[] | null;
}

/** DB column names for editable subscription fields. Single source of truth for "what can be updated"; EDITABLE_FIELD_KEYS is derived from this. */
export const EDITABLE_FIELD_TO_COLUMN: Record<keyof SubscriptionEditableFields, string> = {
  planId: 'plan_id',
  status: 'status',
  enforceApiUsageLimit: 'enforce_api_usage_limit',
  cancelAtPeriodEnd: 'cancel_at_period_end',
  currentBillingPeriodStart: 'current_billing_period_start',
  currentBillingPeriodEnd: 'current_billing_period_end',
  apiRowsReturnedLimitOverride: 'api_rows_returned_limit_override',
  apiRequestsLimitOverride: 'api_requests_limit_override',
  apiRowsPerResponseLimitOverride: 'api_rows_per_response_limit_override',
  alertsLimitOverride: 'alerts_limit_override',
  dashboardsLimitOverride: 'dashboards_limit_override',
  downloadsLimitOverride: 'downloads_limit_override',
  chartsLimitOverride: 'charts_limit_override',
  perSecondApiRateLimitOverride: 'per_second_api_rate_limit_override',
  perMinuteApiRateLimitOverride: 'per_minute_api_rate_limit_override',
  perHourApiRateLimitOverride: 'per_hour_api_rate_limit_override',
  entitlementOverrides: 'entitlement_overrides',
};

/** Ordered list of editable keys; derived from EDITABLE_FIELD_TO_COLUMN so we only maintain one list. */
export const EDITABLE_FIELD_KEYS = Object.keys(
  EDITABLE_FIELD_TO_COLUMN
) as (keyof SubscriptionEditableFields)[];

/** Fields for POST /api/subscriptions (create). Core fields only; no overrides. */
export interface SubscriptionCreatableFields {
  userId: number | null;
  organizationId: string | null;
  planId: number;
  status: SubscriptionStatus;
  startDate: string;
  enforceApiUsageLimit: boolean;
  cancelAtPeriodEnd: boolean | null;
  currentBillingPeriodStart: string;
  currentBillingPeriodEnd: string | null;
}

/** DB column names for creatable subscription fields. */
export const CREATABLE_FIELD_TO_COLUMN: Record<keyof SubscriptionCreatableFields, string> = {
  userId: 'user_id',
  organizationId: 'organization_id',
  planId: 'plan_id',
  status: 'status',
  startDate: 'start_date',
  enforceApiUsageLimit: 'enforce_api_usage_limit',
  cancelAtPeriodEnd: 'cancel_at_period_end',
  currentBillingPeriodStart: 'current_billing_period_start',
  currentBillingPeriodEnd: 'current_billing_period_end',
};

/** Ordered list of creatable keys. */
export const CREATABLE_FIELD_KEYS = Object.keys(
  CREATABLE_FIELD_TO_COLUMN
) as (keyof SubscriptionCreatableFields)[];

export interface SubscriptionUpdateResponse {
  subscription: SubscriptionDetail;
}

export interface SubscriptionCreateResponse {
  subscription: SubscriptionDetail;
}

export interface SubscriptionDetail {
  id: number;
  userId: number | null;
  username: string | null;
  planId: number | null;
  planName: string | null;
  startDate: string;
  status: string;
  cancelAtPeriodEnd: boolean | null;
  organizationId: string | null;
  organizationName: string | null;
  stripeSubscriptionId: string | null;
  currentBillingPeriodStart: string;
  currentBillingPeriodEnd: string | null;
  createdAt: string | null;
  enforceApiUsageLimit: boolean;
  apiRowsReturnedLimitOverride: number | null;
  apiRequestsLimitOverride: number | null;
  apiRowsPerResponseLimitOverride: number | null;
  alertsLimitOverride: number | null;
  dashboardsLimitOverride: number | null;
  downloadsLimitOverride: number | null;
  entitlementOverrides: string[] | null;
  perSecondApiRateLimitOverride: number | null;
  perMinuteApiRateLimitOverride: number | null;
  perHourApiRateLimitOverride: number | null;
  chartsLimitOverride: number | null;
}

export interface SubscriptionDetailResponse {
  subscription: SubscriptionDetail;
}

export interface UsersListItem {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  createdAt: string;
  lastActiveAt: string | null;
  hasApiKey: boolean;
}

export interface UsersListResponse {
  users: UsersListItem[];
}

export type ActivityType =
  | 'user_registered'
  | 'joined_org'
  | 'created_chart'
  | 'created_dashboard'
  | 'created_api_key'
  | 'created_alert';

export interface Activity {
  userId: number;
  username: string;
  activityDate: string;
  activityType: ActivityType;
  activityDetail: string | null;
}

export interface NewUsersSummary {
  month: string;
  newUsers: number;
}

export interface ActivitiesResponse {
  activities: Activity[];
  newUsersSummary: NewUsersSummary[];
}

export interface CorporateTeamsMonthlyData {
  month: string;
  totalCorpUsers: number;
  newCorpUsers: number;
  corpDomains: number;
  teams: number;
  usersOnTeams: number;
  corpUsersMomChange: number;
  [key: string]: string | number;
}

export interface CorporateTeamsResponse {
  monthlyData: CorporateTeamsMonthlyData[];
}

export interface ApiUsageByIpItem {
  ip: string | null;
  distinctUsers: number;
  totalRowsReturned: number;
  requestCount: number;
  userNames: string[];
}

export interface ApiUsageByUserItem {
  id: string;
  user: string | null;
  org: string | null;
  usageId: string;
  planId: number | null;
  totalRequests: number;
  totalRowsReturned: number;
  lastRequestTime: string;
  uniqueClientVersions: string[];
  uniqueDatasets: string[];
  userId: number | null;
  orgId: string | null;
}

export interface ApiUsageMonitorResponse {
  byIp: ApiUsageByIpItem[];
  byUser: ApiUsageByUserItem[];
}

