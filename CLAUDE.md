# GS Internal Analytics Dashboard

## Project Overview
Internal analytics dashboard for Grid Status employees to understand user behavior, product usage, and business metrics. 

This app connects directly to the same database as the main Grid Status app. Therefore YOU MUST err on the side of caution. NEVER make changes that could harm the database this app is running on. Be considerate of unintended side effects of your actions. This is a CRITICAL requirement you MUST NEVER break. FOLLOW AT ALL TIMES.

**Key Principles:**
- **Internal only** — This app is exclusively for GS employees. Never expose to the public.
- **Security first** — All data endpoints require authentication. Never add public routes without explicit approval.
- **Easy to maintain** — Keep code simple, use consistent patterns, and avoid over-engineering.
- **Reuse components** — Use existing components (MetricCard, DataTable, TimeSeriesChart, etc.) and consider creating new shared components when patterns repeat.
- **Document patterns** — If you detect a project-specific pattern that the user corrects, suggest adding it to this file to prevent future mistakes.

**Important**: Never add meta tags (description, Open Graph, Twitter cards, etc.) - only set the title to "Grid Status" in the root layout.

## Tech Stack
- **Framework**: Next.js 16 with App Router
- **UI**: Mantine v7
- **Charts**: @mantine/charts (built on Recharts)
- **Database**: PostgreSQL via `pg` package
- **Auth**: Clerk (via middleware in `src/proxy.ts`)
- **External APIs**: PostHog HogQL API for MAU data

## Authentication
Auth is handled by Clerk middleware in `src/proxy.ts`. All API routes require authentication by default.

**CRITICAL**: All API routes MUST require authentication unless explicitly added to `PUBLIC_API_ROUTES`. Never expose data endpoints without auth. Never add routes to `PUBLIC_API_ROUTES` without explicit user request.

## Security

**CRITICAL - These security rules MUST NEVER be changed or removed:**

### Search Engine Indexing Prevention
This internal app must never be indexed by search engines. The following protections are in place and must remain:

1. **Robots Meta Tag** (`src/app/layout.tsx`):
   - The root layout includes `robots: { index: false, follow: false }` in metadata
   - This tells search engines not to index any pages
   - **Never remove or modify this setting**

2. **robots.txt File** (`src/app/robots.txt/route.ts`):
   - Serves `User-agent: *\nDisallow: /` at `/robots.txt`
   - Explicitly disallows all crawlers from accessing the site
   - **Never remove or modify this route handler**

These protections work together to prevent search engine indexing both in the app (via meta tags) and on Render (via robots.txt). Removing or changing these settings would expose internal analytics data to public search engines.

## Database
- Schema: `api_server`
- Key tables: `users`, `api_key_usage`, `charts`, `dashboards`
- Users table has `created_at` and `last_active_at` timestamps
- Use `/api/sql` POST endpoint with `{"sql": "..."}` to explore database

### Corporate Domain Filtering
All SQL queries that touch user/domain data MUST include **`{{USER_FILTER}}`**; it is filled in automatically from the current request filter state.

## PostHog Queries
PostHog is used to track user activity and provides data for anonymous users (not tracked in PostgreSQL).

**Important Convention**: In PostHog queries, **users with email addresses are interpreted as logged-in users**. Users without emails (or with empty emails) are considered anonymous.

- **Logged-in users**: `WHERE person.properties.email IS NOT NULL AND person.properties.email != ''`
- **Anonymous users**: `WHERE person.properties.email IS NULL OR person.properties.email = ''`

**Example files:**
- PostHog MAU query: `src/app/api/posthog-maus/route.ts`
- Anonymous users query: `src/lib/queries.ts` (see `fetchPosthogAnonymousUsers`)

## Development Guidelines

### Date/Timezone Handling
**CRITICAL**: Always use UTC methods when parsing dates from PostgreSQL (`getUTCFullYear()`, `getUTCMonth()`) - not local methods which cause timezone shift.

#### Timezone Setting (User-Selectable)
- The app supports a user-selected timezone (default `UTC`) from the sidebar.
- **Do not show UTC labels** unless the user has selected UTC.
- For UI date/time labels, format using `Intl.DateTimeFormat` with the selected timezone.

**Example files:**
- Client timezone access: `src/components/AlertsView.tsx` (useFilter hook)
- API route timezone: `src/app/api/alerts/route.ts` (withRequestContext)

### Charts
- Use **straight lines** (`curveType="linear"`) - no curved lines
- Use `chartType="bar"` for MAU and count data
- Y-axis should start at 0 (`yAxisProps={{ domain: [0, 'auto'] }}`)
- Use Mantine color tokens (e.g., `blue.6`, `teal.6`, `violet.6`)
- **Always show periods with 0 values**: Generate all periods in the time range in SQL and fill missing data with 0
- **Use human-readable legend labels**: Always provide a `label` property for chart series (e.g., `label: 'New Users'` for a series named `newUsers`, or `label: 'Trend'` for trendlines). This makes legends more user-friendly.

**Example file:** `src/components/TimeSeriesChart.tsx`


### Page Pattern
Each analytics page follows this pattern:
1. Create SQL file in `src/sql/[name].sql` (one query per file)
2. Add typed query function in `src/lib/queries.ts` (use `renderSqlTemplate()` when filtering by domain)
3. Create API route in `src/app/api/[name]/route.ts`
4. Create view component in `src/components/[Name]View.tsx`
5. Create page in `src/app/[name]/page.tsx`
6. Add to sidebar in `src/components/AppLayout.tsx`

**Example files:**
- SQL template: `src/sql/top-registrations.sql`
- Query function: `src/lib/queries.ts` (see `getTopRegistrations`)
- API route: `src/app/api/alerts/route.ts`
- View component: `src/components/AlertsView.tsx`

**CRITICAL - Clean Up Dead Code**: When refactoring code, queries, or components, always delete unused functions, SQL files, and imports. Search the codebase to verify nothing references the code before deleting. Dead code increases maintenance burden and causes confusion.

**CRITICAL - No Backward Compatibility**: When migrating to a new approach (e.g., new placeholder patterns, new query functions, new component patterns), migrate everything to the new approach immediately and remove all dead code. Do not maintain backward compatibility handlers, deprecated functions, or old patterns. This keeps the codebase clean and maintainable.

### SQL Queries
**CRITICAL - All SQL and HogQL Must Be in Files**: Never write SQL or HogQL queries inline in TypeScript/JavaScript code. All queries must be in separate files:
- SQL queries: `src/sql/[name].sql`
- HogQL queries: `src/hogql/[name].hogql`

**SQL File Naming Convention**: All SQL files must follow a consistent naming pattern using **kebab-case** (lowercase with hyphens) and descriptive prefixes to group related queries. This makes files easy to find, understand, and maintain.

**Format**: `[prefix]-[descriptive-name].sql`

**Prefix Categories** (use these to group related queries):

1. **Time-based prefixes** (for time-series/aggregated data):
   - `hourly-*` - Hourly aggregations (e.g., `hourly-registrations.sql`)
   - `monthly-*` - Monthly aggregations (e.g., `monthly-user-counts.sql`, `monthly-insights-posts.sql`)
   - `last-[N]-[period]-*` - Time-bounded queries (e.g., `last-30-days-users.sql`, `last-3-months-new-users.sql`)
   - **Rule**: Time period comes first in the name

2. **Aggregation prefixes** (for summary/total metrics):
   - `summary-*` - Summary KPIs/metrics for a time period (e.g., `summary-unique-visitors.sql`, `summary-engagements.sql`)
   - `total-*` - Total counts across all time (e.g., `total-users-count.sql`, `total-unique-visitors.sql`)
   - **Rule**: Aggregation type comes first, entity comes second

3. **Ranking/listing prefixes**:
   - `top-*` - Top N rankings (e.g., `top-registrations.sql`, `top-domains.sql`, `top-insights-posts.sql`)
   - **Rule**: Use `top-*` for any ranking query, not `most-*` or `best-*`

4. **Entity-based prefixes** (for entity-specific queries):
   - `user-*` - User-related queries (e.g., `user-activities.sql`, `user-insights-views.sql`)
   - `domain-*` - Domain-specific queries (e.g., `domain-analytics.sql`, `domain-distribution.sql`)
   - `[entity]-stats.sql` - Statistics for an entity (e.g., `chart-stats.sql`, `dashboard-stats.sql`)
   - **Rule**: Entity name comes first, use singular form

5. **Action/verb-based names** (when no prefix category fits):
   - Use descriptive action names (e.g., `active-users.sql`)
   - **Rule**: Only use when no prefix category applies

**Naming Rules**:
- **Always use kebab-case**: lowercase letters and hyphens only (e.g., `monthly-user-counts.sql`)
- **Prefix order matters**: Time → Aggregation → Ranking → Entity → Action
- **Singular for entities**: Use `user-*`, not `users-*` (e.g., `user-activities.sql`)
- **Plural for aggregations**: Use `total-users-count.sql`, `summary-engagements.sql`
- **Be specific**: `monthly-insights-posts.sql` is clearer than `monthly-posts.sql`
- **Aggregation before entity**: `summary-alerts.sql` not `alert-summary.sql`

**Examples**:

✅ **Good naming**:
- `monthly-user-counts.sql` - Time prefix + entity + aggregation
- `summary-unique-visitors.sql` - Aggregation prefix + descriptive metric
- `top-registrations.sql` - Ranking prefix + entity
- `user-activities.sql` - Entity prefix + action
- `last-30-days-users.sql` - Time prefix first, then entity
- `total-unique-visitors.sql` - Total prefix + descriptive metric

❌ **Bad naming** (and what to use instead):
- `new-users-last-3-months.sql` → `last-3-months-new-users.sql` (time prefix should come first)
- `alert-summary.sql` → `summary-alerts.sql` (aggregation prefix should come first)
- `most-engaged-users.sql` → `top-engaged-users.sql` (use `top-*` prefix, not `most-*`)
- `users-activities.sql` → `user-activities.sql` (use singular for entity prefix)
- `monthly-posts.sql` → `monthly-insights-posts.sql` (be more specific)

Use `renderSqlTemplate(filename, context)` to load and render SQL templates. This improves maintainability, enables syntax highlighting, and makes queries reusable.

**Bad Example** (inline SQL):
```typescript
const sql = `SELECT * FROM users WHERE created_at >= NOW() - INTERVAL '7 days'`;
```

**Good Example** (SQL in file; filters come from request context when not passed):
```typescript
const sql = renderSqlTemplate('recent-users.sql', {});
```

**Template Placeholder Naming Convention**:

- **Reserved/Standard Placeholders** (handled automatically by `renderSqlTemplate()` - DO NOT use these names for custom placeholders):
  - `{{USER_FILTER}}` - Optional filter built from two separate AND clauses: (1) when `filterInternal` is true: excludes `@gridstatus.io` and test account; (2) when `filterFree` is true: excludes free email domains (see `FREE_EMAIL_DOMAINS` in `src/lib/queries.ts`). Replaced with the concatenation of these clauses, or removed when both are false.

  **Important**: This placeholder is automatically processed by `renderSqlTemplate()`. Filter values are read from **request context** (set by `withRequestContext()` in API routes from URL params). You can override by passing `filterInternal`/`filterFree` in the template context object.

  **Usage**: Always use `{{USER_FILTER}}` in SQL files. Content is built from request-context `filterInternal` and `filterFree` (and `usernamePrefix` for the column reference). Keeping internal and free as separate clauses keeps the generated SQL aligned with the two sidebar toggles.

- **Common Custom Placeholder Patterns** (passed via context - follow these naming conventions):
  - **Filter clauses** (complete SQL filter clauses): Use `{{[TYPE]_FILTER}}` suffix
    - `{{DATE_FILTER}}` - Date filter clause (e.g., `"AND pv.viewed_at >= NOW() - INTERVAL '7 days'"`)
    - `{{TIME_FILTER}}` - Time filter clause (e.g., `"AND p.created_at >= '2025-01-01'"`)
    - `{{TIME_FILTER_REACTIONS}}` - Time filter for reactions table
    - `{{TIME_FILTER_VIEWS}}` - Time filter for views table
    - `{{TIME_FILTER_SAVES}}` - Time filter for saves table
    - `{{DOMAIN_FILTER}}` - Domain search filter clause
  
  - **Values** (single values inserted into SQL): Use descriptive UPPERCASE names
    - `{{DAYS_OFFSET}}` - Number of days to offset (0 = today, 1 = yesterday, etc.)
    - `{{DAYS}}` - Number of days to look back
    - `{{PERIOD}}` - Period type: 'day', 'week', 'month', or 'year'
    - `{{TIMESTAMP_FIELD}}` - Field name to filter by (e.g., 'created_at', 'last_active_at')
    - `{{LIMIT}}` - Row limit for queries
  
  - **Naming Rules for Custom Placeholders**:
    - Use UPPERCASE with underscores: `{{DAYS_OFFSET}}`, `{{PERIOD}}`, `{{TIMESTAMP_FIELD}}`
    - For filter clauses, always use `{{[TYPE]_FILTER}}` suffix pattern
    - For values, use descriptive names that indicate the data type/usage
    - Custom variables are automatically uppercased: `daysOffset` in context becomes `{{DAYS_OFFSET}}` in SQL
    - Single quotes in values are automatically escaped for SQL safety

- **SQL File Headers**: Each SQL file should start with a comment block listing required placeholders:
```sql
-- Required placeholders:
--   {{DAYS_OFFSET}} - Number of days to offset (0 = today, 1 = yesterday, etc.)
--   {{USER_FILTER}} - Optional filter for internal (gridstatus.io + test account) and/or free email domains; expanded from filterInternal and filterFree
```

- **WHERE Clause Pattern**: Always use `WHERE 1=1` before filter placeholders to prevent SQL syntax errors:
```sql
WHERE 1=1
  {{USER_FILTER}}
```

**CRITICAL - AND Clause Safety**: When writing SQL queries with `{{USER_FILTER}}`, always use `WHERE 1=1` as a base condition. This prevents invalid SQL syntax when filters are removed.

**Bad Example** (leaves invalid SQL when filter is removed):
```sql
WHERE {{USER_FILTER}}
```

**Good Example** (always valid SQL):
```sql
WHERE 1=1
  {{USER_FILTER}}
```

The `renderSqlTemplate()` function attempts to clean up invalid SQL, but it's safer to structure queries correctly from the start.

**CRITICAL - Template Rendering**: If a SQL file contains template placeholders (e.g., `{{USER_FILTER}}`), the query function MUST use `renderSqlTemplate()` to process them before executing the query. Failing to do so will cause SQL syntax errors because raw template placeholders will be sent to PostgreSQL.

**Bug Example** (causes "syntax error at or near '{'"):
```typescript
export async function getActiveUsers(): Promise<ActiveUsers[]> {
  const sql = loadSql('active-users.sql'); // Contains {{USER_FILTER}}
  return query<ActiveUsers>(sql); // ❌ Template not rendered!
}
```

**Correct Example** (filters come from request context; query runs inside `withRequestContext` in API route):
```typescript
export async function getActiveUsers(): Promise<ActiveUsers[]> {
  const sql = renderSqlTemplate('active-users.sql', {}); // ✅ Template rendered; filters from request context
  return query<ActiveUsers>(sql);
}
```

**Checklist when creating query functions:**
1. Does the SQL file contain `{{...}}` placeholders? → Must use `renderSqlTemplate()`
2. Does the query need domain filtering? → Use `{{USER_FILTER}}` in SQL; ensure the API route uses `withRequestContext(searchParams, ...)` so filters are in context
3. Always test the query function to ensure templates are properly rendered

### Tables
- Use `DataTable` component with column definitions
- Make tables searchable with `TextInput` + filter
- Show up to 100 rows with note about limit
- Include MoM/YoY change percentages inline with values

**Example file:** `src/components/AlertsView.tsx` (DataTable usage)

### Component Conventions
- Use `MetricCard` for summary stats at top of page
- Use `Paper` with `shadow="sm"` and `withBorder` for sections
- Avoid nesting `Paper`/card components inside other cards
- Loading state: use `Skeleton` components matching layout
- Error state: use `Alert` with `IconAlertCircle`
- **Ensure components are usable on mobile** - test responsive layouts and touch interactions
- **Focus on information density via smart layout** - achieve density through efficient layout design rather than small fonts or minimal padding
- **Provide date range options** when viewing data: 24h, 7d, 30d, 90d (use `SegmentedControl`)
- **Format numbers with commas** - Use `.toLocaleString()` when displaying numbers in the UI (e.g., `value.toLocaleString()`)

**Example files:**
- Loading/error states: `src/components/AlertsView.tsx`
- MetricCard + Paper layout: `src/components/ChartsDashboardsView.tsx`

### Data Fetching
Use the `useApiData` hook for fetching data in view components. It handles loading, error states, and request cancellation.

**Example file:** `src/hooks/useApiData.ts`

### URL State Management
**CRITICAL**: Store filter state in the URL to enable deep linking and sharing. This includes filter selections, search queries, sort orders, tab selections, and pagination.

**Always use `nuqs` for URL state management**. It handles URL synchronization automatically and prevents infinite loops.

**Example files:**
- URL state with SegmentedControl: `src/components/PosthogMausView.tsx`
- URL state with multiple filters: `src/components/InsightsView.tsx`
- URL state with nullable enum: `src/components/UsersView.tsx`

## Guidelines for Building New Apps

### Overview Pages
- Every app should have an overview page at `src/app/[name]/page.tsx`
- Overview pages should display a list/table of entities with key metrics
- Use a View component pattern: create `src/components/[Name]View.tsx` and import it into the page
- Add the page to the sidebar in `src/components/AppLayout.tsx` using `NavLink` with appropriate icon
- For apps with instance pages, use `pathname?.startsWith('/[name]')` to highlight the parent nav item when on instance pages

**Example files:**
- Simple overview: `src/components/DomainsView.tsx`
- Complex overview with charts: `src/components/UsersView.tsx`

### Instance Pages
- If an app has entities that can be viewed in detail, create instance pages at `src/app/[name]/[id]/page.tsx`
- Include a "Back to [Overview]" link at the top using `IconArrowLeft` and `Anchor`
- Show relevant metrics using `MetricCard` components
- Display related data in tables or charts

**Example files:**
- User detail: `src/app/users-list/[id]/page.tsx`
- Insight detail: `src/app/insights/[id]/page.tsx`
- Subpage with back link: `src/components/TopRegistrationsView.tsx`

### Cross-App Linking
- **Whenever an instance is mentioned** (user ID, organization ID, insight ID, etc.), make it a clickable link to its detail page
- Use `Anchor` component with `Link` from Next.js for domain/entity links
- Examples: User IDs → `/users-list/${userId}`, Domain → `/domains/${domain}`, Post IDs → `/insights/${postId}`

**Example file:** `src/app/users-list/[id]/page.tsx` (links to domains, organizations)

### User Name Display
- **ALWAYS use `UserHoverCard` component** when displaying user names/links
- Provides: clickable link to user detail page, hover card with user summary (lazy-loaded)
- **Never use plain `Anchor` links for user names**

**Example files:**
- UserHoverCard component: `src/components/UserHoverCard.tsx`
- Usage in tables: `src/components/AlertsView.tsx`

### API Routes (Structure)
- Overview pages: `src/app/api/[name]/route.ts` - returns list/aggregate data
- Instance pages: `src/app/api/[name]/[id]/route.ts` - returns detail for single entity
- Use typed query functions from `src/lib/queries.ts`
- Use `renderSqlTemplate()` with template placeholders in SQL files when filtering by domain

**Example files:**
- Overview API: `src/app/api/alerts/route.ts`
- Instance API: `src/app/api/users-list/[id]/route.ts`

### Error Handling
- **Always return SQL error messages** in API responses for debugging (this is an internal app)
- Use `getErrorMessage()` helper from `@/lib/db` to extract error messages

**Example file:** `src/app/api/alerts/route.ts`

### Internal and Free Filtering Support
**CRITICAL**: The sidebar filters (Filter Internal and Filter Free) MUST be applied to EVERY view and query. When a filter is enabled, excluded users should be completely invisible. This applies to all metrics, tables, charts, and aggregations.

- **Filter Internal** (when on): excludes `@gridstatus.io` and test account.
- **Filter Free** (when on): excludes free email domains (see `FREE_EMAIL_DOMAINS` in `src/lib/queries.ts`).

Filters are applied via **request context** (no explicit params on query functions or in route handlers):

1. **View Components**: Use `useApiUrl(path, params)` for fetch URLs. It automatically includes `filterInternal`, `filterFree`, and `timezone` from the filter store (Zustand) in the URL.
2. **API Routes**: Wrap the handler in `withRequestContext(searchParams, async () => { ... })`. This reads `filterInternal`, `filterFree`, and `timezone` from the request URL and sets them on async context. Do **not** read or pass filter params manually.
3. **Query Functions**: Do **not** accept `filterInternal` or `filterFree`. Call `renderSqlTemplate(filename, { ... })` with only other placeholders (e.g. `period`, `usernamePrefix`). `renderSqlTemplate()` and `renderHogqlTemplate()` read filter values from request context.
4. **SQL/HogQL Files**: Use `{{USER_FILTER}}`; it is expanded from the context filters (same placeholder in SQL and HogQL).

**Example files:**
- View with filter: `src/components/AlertsView.tsx` (uses `useApiUrl`; store provides filters to URL)
- API route: `src/app/api/alerts/route.ts` (uses `withRequestContext(searchParams, ...)`)
- Query function: `src/lib/queries.ts` (see `getTopRegistrations` — no filter params)
- SQL with placeholders: `src/sql/top-registrations.sql`

### Data Flow Pattern
SQL file → Query function → API route → View component → Page

## Environment Variables
```
APPLICATION_POSTGRES_USER=
APPLICATION_POSTGRES_PASSWORD=
APPLICATION_POSTGRES_HOST=
APPLICATION_POSTGRES_DATABASE=
POSTHOG_PROJECT_ID=
POSTHOG_PERSONAL_API_KEY=
```

## Running
```bash
npm run dev -- -p 3001   # Dev server on port 3001
npm run build            # Production build
npm start                # Production server
```

