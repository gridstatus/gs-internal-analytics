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
- **External APIs**: PostHog HogQL API for MAU data

## Authentication
Auth is handled by Clerk middleware in `src/proxy.ts`. All API routes require authentication by default. **CRITICAL**: Never expose data endpoints without auth; never add routes to `PUBLIC_API_ROUTES` without explicit user request.

## Security

**CRITICAL - These security rules MUST NEVER be changed or removed:**

### Search Engine Indexing Prevention
This internal app must never be indexed by search engines. The following protections are in place and must remain:

**IMPORTANT**: Never remove or modify these settings.
1. **Robots Meta Tag** (`src/app/layout.tsx`)
2. **robots.txt File** (`src/app/robots.txt/route.ts`):

## Database
- Schema: `api_server` or `insights`
- Key tables: `users`, `api_key_usage`, `charts`, `dashboards`
- Users table has `created_at` and `last_active_at` timestamps
- Use `/api/sql` POST endpoint with `{"sql": "..."}` to explore database

### Corporate Domain Filtering
All SQL queries that touch user/domain data MUST include **`{{USER_FILTER}}`**; it is filled in automatically from the current request filter state.

### Precautions: Protecting the Database and External Services
Per-backend concurrency limits protect the shared DB and PostHog API. Do not remove or bypass them.

- **PostgreSQL** (`src/lib/db.ts`): Pool limited by `DB_MAX_CONCURRENT`; excess `query()` calls wait.
- **PostHog** (`src/lib/posthog.ts`): Semaphore limited by `POSTHOG_MAX_CONCURRENT`. All PostHog requests must go through `posthogFetchWithRetry`. Do not add direct `fetch` calls to PostHog.

## PostHog Queries
PostHog is used to track user activity and provides data for anonymous users (not tracked in PostgreSQL).

**Important Convention**: In PostHog queries, **users with email addresses are interpreted as logged-in users**. Users without emails (or with empty emails) are considered anonymous.

- **Logged-in users**: `WHERE person.properties.email IS NOT NULL AND person.properties.email != ''`
- **Anonymous users**: `WHERE person.properties.email IS NULL OR person.properties.email = ''`

**Example files:**
- PostHog MAU query: `src/app/api/posthog-maus/route.ts`
- Anonymous users query: `src/lib/queries.ts` (see `fetchPosthogAnonymousUsers`)

## Development Guidelines

### State management
- **Prefer Zustand** over React Context for client state (e.g. filter store, active queries). Use stores in `src/stores/` and follow the pattern in `src/stores/filterStore.ts`.
- **Sidebar “Queries” (DB vs PostHog):** Any API path that contains `posthog` (e.g. `/api/posthog/...`) is shown as PostHog; others as DB. Put new PostHog-backed routes under `/api/posthog/...` so they classify correctly without a maintained list.

### Date/Timezone Handling
**Important**: Always use UTC methods when parsing dates from PostgreSQL (`getUTCFullYear()`, `getUTCMonth()`) - not local methods which cause timezone shift.

#### Timezone Setting (User-Selectable)
- The app supports a user-selected timezone (default Central / CT) from the sidebar.
- **Do not show UTC labels** unless the user has selected UTC.
- For UI date/time labels, format using `Intl.DateTimeFormat` with the selected timezone.

**Example files:**
- Client timezone access: `src/components/AlertsView.tsx` (useFilter hook)
- API route timezone: `src/app/api/alerts/route.ts` (withRequestContext)

### Charts
- Use **straight lines** (`curveType="linear"`) - no curved lines
- Use `chartType="bar"` for MAU and count data
- Y-axis should start at 0 (`yAxisProps={{ domain: [0, 'auto'] }}`) when the data is a count of something.
- Use Mantine color tokens (e.g., `blue.6`, `teal.6`, `violet.6`)
- **Always show periods with 0 values**: Generate all periods in the time range in SQL and fill missing data with 0
- **Use human-readable legend labels**: Always provide a `label` property for chart series (e.g., `label: 'New Users'` for a series named `newUsers`, or `label: 'Trend'` for trendlines). This makes legends more user-friendly.
- **Chart legend placement**: Use the shared default for all charts with legends: `legendProps={DEFAULT_CHART_LEGEND_PROPS}` from `@/lib/chart-defaults`. 

**Example file:** `src/components/TimeSeriesChart.tsx`


### Page Pattern
Each analytics page follows this pattern. API paths: overview `src/app/api/[name]/route.ts`, instance `src/app/api/[name]/[id]/route.ts`. Use typed query functions from `src/lib/queries.ts` and `renderSqlTemplate()` when filtering by domain.

1. SQL file in `src/sql/[name].sql` (one query per file)
2. Typed query function in `src/lib/queries.ts`
3. API route in `src/app/api/[name]/route.ts` or `[name]/[id]/route.ts`
4. View component in `src/components/[Name]View.tsx`
5. Page in `src/app/[name]/page.tsx`
6. Sidebar entry in `src/components/AppLayout.tsx`
7. `PageBreadcrumbs` at the top of every page: one item on list pages; on detail pages, parent (with `href`) then current. Do not use "Back" links.

**Example files:** `src/sql/top-registrations.sql`, `src/lib/queries.ts` (getTopRegistrations), `src/app/api/alerts/route.ts`, `src/components/AlertsView.tsx`

**Important - Clean Up Dead Code**: When refactoring code, queries, or components, always delete unused functions, SQL files, and imports. Search the codebase to verify nothing references the code before deleting. Dead code increases maintenance burden and causes confusion.

**Important - No Backward Compatibility**: When migrating to a new approach (e.g., new placeholder patterns, new query functions, new component patterns), migrate everything to the new approach immediately and remove all dead code. Do not maintain backward compatibility handlers, deprecated functions, or old patterns. This keeps the codebase clean and maintainable.

### SQL Queries
**Important - All SQL and HogQL in Files**: Never write SQL or HogQL queries inline in TypeScript/JavaScript code. All queries must be in separate files:
- SQL queries: `src/sql/[name].sql`
- HogQL queries: `src/hogql/[name].hogql`

**SQL File Naming Convention**: All SQL files must follow a consistent naming pattern using **kebab-case** (lowercase with hyphens) and descriptive prefixes to group related queries. This makes files easy to find, understand, and maintain.

**Format**: `[prefix]-[descriptive-name].sql`

**Prefix order**: Time → Aggregation → Ranking → Entity → Action. Use the category that fits.

**Prefix Categories** (use these to group related queries):

1. **Time-based**: `hourly-*`, `monthly-*`, `last-[N]-[period]-*` (e.g., `hourly-registrations.sql`, `last-30-days-users.sql`)
2. **Aggregation**: `summary-*`, `total-*` (e.g., `summary-unique-visitors.sql`, `total-users-count.sql`)
3. **Ranking**: `top-*` only, not `most-*` or `best-*` (e.g., `top-registrations.sql`)
4. **Entity-based**: `user-*`, `domain-*`, `[entity]-stats.sql` — singular entity (e.g., `user-activities.sql`, `chart-stats.sql`)
5. **Action/verb** (when no category fits): descriptive names (e.g., `active-users.sql`)

**Rules**: kebab-case; prefix order above; singular for entities (`user-*` not `users-*`); aggregation before entity (`summary-alerts.sql` not `alert-summary.sql`).

| Bad | Good |
|-----|------|
| `new-users-last-3-months.sql` | `last-3-months-new-users.sql` |
| `alert-summary.sql` | `summary-alerts.sql` |
| `most-engaged-users.sql` | `top-engaged-users.sql` |
| `users-activities.sql` | `user-activities.sql` |
| `monthly-posts.sql` | `monthly-insights-posts.sql` |

Use `renderSqlTemplate(filename, context)` to load and render SQL templates. This improves maintainability, enables syntax highlighting, and makes queries reusable.



**Template Placeholder Naming Convention**:

- **Reserved/Standard Placeholders** (handled automatically by `renderSqlTemplate()` - DO NOT use these names for custom placeholders):
  - `{{USER_FILTER}}` - Optional filter built from two separate AND clauses: (1) when `filterInternal` is true: excludes `@gridstatus.io` and test account; (2) when `filterFree` is true: excludes free email domains (see `FREE_EMAIL_DOMAINS` in `src/lib/queries.ts`). Replaced with the concatenation of these clauses, or removed when both are false.

  **Important**: This placeholder is automatically processed by `renderSqlTemplate()`. Filter values are read from **request context** (set by `withRequestContext()` in API routes from URL params). You can override by passing `filterInternal`/`filterFree` in the template context object.

  **Usage**: Always use `{{USER_FILTER}}` in SQL files. Content is built from request-context `filterInternal` and `filterFree` (and `usernamePrefix` for the column reference). Keeping internal and free as separate clauses keeps the generated SQL aligned with the two sidebar toggles.

- **Common Custom Placeholder Patterns** (passed via context - follow these naming conventions):
  - **Filter clauses**: Put **AND in the SQL template** (e.g. `AND {{DATE_FILTER}}`); pass **bare clauses** (no leading AND) in context. Use `{{[TYPE]_FILTER}}` suffix.
    - `{{DATE_FILTER}}` - Date filter (e.g. pass `pv.viewed_at >= NOW() - INTERVAL '7 days'`)
    - `{{TIME_FILTER}}` - Time filter (e.g. pass `p.created_at >= '2025-01-01'`)
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

- **SQL File Headers**: Each SQL file must start with a short human-readable description that precisely defines what the query does (one-to-one with the SQL, no ambiguity). Write it as prose; include any template variables in the description (e.g. "{{USER_FILTER}} is applied to restrict to correct users; {{DAYS_OFFSET}} = 0 for today, 1 for yesterday.") so there is no separate placeholder list.

- **WHERE clause**: Use a real condition (no `1=1`); put `AND {{USER_FILTER}}` and `AND {{DATE_FILTER}}` etc. on following lines; the renderer strips the AND line when the value is empty.

### Tables
- Use `DataTable` component with column definitions
- Make tables searchable with `TextInput` + filter
- Show up to 100 rows with note about limit
- Include MoM/YoY change percentages inline with values

**Example file:** `src/components/AlertsView.tsx` (DataTable usage)

### Component Conventions
- Use `MetricCard` for summary stats at top of page
- Use `Paper` with `shadow="sm"` and `withBorder` for sections
- Never nest `Paper`/card components inside other cards
- Loading state: use `Skeleton` components matching layout
- Error state: use `Alert` with `IconAlertCircle`
- **Ensure components are usable on mobile** - test responsive layouts and touch interactions
- **Focus on information density via smart layout** - achieve density through efficient layout design rather than small fonts or minimal padding
- **Provide date range options** when viewing data: 24h, 7d, 30d, 90d (use `SegmentedControl`)
- **Format numbers with commas** - Use `.toLocaleString()` when displaying numbers in the UI (e.g., `value.toLocaleString()`)
- **Info hover** - Use `InfoHoverIcon` (tooltip to the right of card/section titles) when extra context helps (e.g. how a metric is computed).


### Data Fetching
Use the `useApiData` hook for fetching data in view components. It handles loading, error states, and request cancellation.

**Error handling**: Return SQL error messages in API responses for debugging; use `getErrorMessage()` from `@/lib/db`.

### URL State Management
**Always use `nuqs` for URL state management**.
Store filter state in the URL to enable deep linking and sharing. This includes filter selections, search queries, sort orders, tab selections, and pagination.

### Cross-App Linking
Whenever an instance is mentioned (user ID, organization ID, insight ID, etc.), make it a clickable link to its detail page. Use `Anchor` with Next.js `Link`. Examples: User IDs → `/users-list/${userId}`, Domain → `/domains/${domain}`, Post IDs → `/insights/${postId}`.

### User Name Display
**Always use `UserHoverCard`** when displaying user names/links (never plain `Anchor`). It provides a clickable link to the user detail page and a lazy-loaded hover card. See `src/components/UserHoverCard.tsx` and `src/components/AlertsView.tsx`.

### Internal and Free Filtering Support
**Important**: Apply sidebar filters (Filter Internal, Filter Free) to every view and query. View: `useApiUrl(path, params)`. API: `withRequestContext(searchParams, async () => { ... })`. Queries: `renderSqlTemplate(filename, { ... })` with no filter args; they read from request context. SQL/HogQL: use `{{USER_FILTER}}`. Filter Internal excludes `@gridstatus.io` and test account; Filter Free excludes `FREE_EMAIL_DOMAINS` (see `src/lib/queries.ts`). See Database (Corporate Domain Filtering) and Template Placeholder Naming Convention for detail.

## Deployment
Deployment is handled by Render. See `render.yaml` for the deployment configuration.

## Running
```bash
npm run dev -- -p 3001   # Dev server on port 3001
npm run build            # Production build
npm start                # Production server
```

