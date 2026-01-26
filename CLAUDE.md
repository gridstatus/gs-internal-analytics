# GS Internal Analytics Dashboard

## Project Overview
Internal analytics dashboard for Grid Status employees to understand user behavior, product usage, and business metrics. Built with Next.js 16 (App Router), Mantine UI, and PostgreSQL.

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

### Keep-Alive Endpoint
The `/api/health` endpoint is public and used by external cron services (e.g., cron-job.org) to keep the free Render instance awake. Render's free tier spins down after 15 minutes of inactivity.

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
Queries should filter out free email domains (e.g., gmail.com, yahoo.com, etc.) and optionally `gridstatus.io` (internal). The `renderSqlTemplate()` function in `src/lib/queries.ts` dynamically renders SQL template placeholders (e.g., `{{GRIDSTATUS_FILTER_STANDALONE}}`, `{{FREE_EMAIL_DOMAINS}}`) based on the filter context, allowing users to toggle internal users via the sidebar filter.

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

### API Routes (Performance)
- **Separate fast from slow queries** - create dedicated endpoints per page
- PostHog API: fast (~500ms)
- Database queries: can take 30s-2min depending on table size
- For slow tables (like `api_key_usage`), consider adding time filters (e.g., last 7 days)

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

### SQL Queries
**CRITICAL - AND Clause Safety**: When writing SQL queries with template placeholders (especially `{{GRIDSTATUS_FILTER_STANDALONE}}`, `{{EDU_GOV_FILTER}}`, `{{INTERNAL_EMAIL_FILTER}}`), always use `WHERE 1=1` as a base condition. This prevents invalid SQL syntax when filters are removed.

**Bad Example** (leaves invalid SQL when filter is removed):
```sql
WHERE SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
  {{EDU_GOV_FILTER}}
```

**Good Example** (always valid SQL):
```sql
WHERE 1=1
  AND SUBSTRING(username FROM POSITION('@' IN username) + 1) {{GRIDSTATUS_FILTER_STANDALONE}}
  {{EDU_GOV_FILTER}}
```

The `renderSqlTemplate()` function attempts to clean up invalid SQL, but it's safer to structure queries correctly from the start.

**CRITICAL - Template Rendering**: If a SQL file contains template placeholders (e.g., `{{GRIDSTATUS_FILTER_STANDALONE}}`, `{{INTERNAL_EMAIL_FILTER}}`), the query function MUST use `renderSqlTemplate()` to process them before executing the query. Failing to do so will cause SQL syntax errors because raw template placeholders will be sent to PostgreSQL.

**Bug Example** (causes "syntax error at or near '{'"):
```typescript
export async function getActiveUsers(): Promise<ActiveUsers[]> {
  const sql = loadSql('active-users.sql'); // Contains {{GRIDSTATUS_FILTER_STANDALONE}}
  return query<ActiveUsers>(sql); // ❌ Template not rendered!
}
```

**Correct Example**:
```typescript
export async function getActiveUsers(filterGridstatus: boolean = true): Promise<ActiveUsers[]> {
  let sql = loadSql('active-users.sql');
  sql = renderSqlTemplate(sql, { filterGridstatus }); // ✅ Template rendered
  return query<ActiveUsers>(sql);
}
```

**Checklist when creating query functions:**
1. Does the SQL file contain `{{...}}` placeholders? → Must use `renderSqlTemplate()`
2. Does the query need domain filtering? → Accept `filterGridstatus` parameter
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

### Internal Filtering Support
**CRITICAL**: The internal filter (`@gridstatus.io` users) MUST be applied to EVERY view and query. When the filter is enabled, internal users should be completely invisible — as if they don't exist. This applies to all metrics, tables, charts, and aggregations.

To implement in new views/queries:
1. **View Components**: Use `useFilter()` hook, include `filterGridstatus` in fetch URL and dependency array
2. **API Routes**: Read filter from query params, pass to query functions
3. **Query Functions**: Accept `filterGridstatus` parameter, use `renderSqlTemplate()`
4. **SQL Files**: Use template placeholders (`{{GRIDSTATUS_FILTER_STANDALONE}}`, `{{FREE_EMAIL_DOMAINS}}`, `{{EDU_GOV_FILTER}}`)

**Example files:**
- View with filter: `src/components/AlertsView.tsx`
- Query function: `src/lib/queries.ts` (see `getTopRegistrations`)
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

