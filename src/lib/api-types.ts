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
  startDate: string;
  status: string;
  organizationId: string | null;
  organizationName: string | null;
  stripeSubscriptionId: string | null;
  currentBillingPeriodStart: string;
  currentBillingPeriodEnd: string | null;
  createdAt: string | null;
}

export interface PlanDetailResponse {
  plan: PlanDetail;
  subscriptions: SubscriptionListItem[];
}

export interface SubscriptionListRowItem {
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
  createdAt: string | null;
}

export interface SubscriptionsResponse {
  subscriptions: SubscriptionListRowItem[];
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

