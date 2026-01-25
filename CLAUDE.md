# GS Internal Analytics Dashboard

## Project Overview
Full-stack TypeScript analytics dashboard built with Next.js 14 (App Router), Mantine UI, and PostgreSQL.

**Important**: This is an internal tool. Never add meta tags (description, Open Graph, Twitter cards, etc.) - only set the title to "Grid Status" in the root layout.

## Tech Stack
- **Framework**: Next.js 15 with App Router
- **UI**: Mantine v7
- **Charts**: @mantine/charts (built on Recharts)
- **Database**: PostgreSQL via `pg` package
- **Auth**: Clerk (via middleware in `src/proxy.ts`)
- **External APIs**: PostHog HogQL API for MAU data

## Authentication
Auth is handled by Clerk middleware in `src/proxy.ts`. All API routes require authentication by default.

**CRITICAL**: All API routes MUST require authentication unless explicitly added to `PUBLIC_API_ROUTES`. Never expose data endpoints without auth - only utility endpoints like health checks should be public.

### Public API Routes
To make an API route public (no auth required), add it to the `PUBLIC_API_ROUTES` array in `src/proxy.ts`:
```typescript
const PUBLIC_API_ROUTES = ['/api/health'];
```

### Keep-Alive Endpoint
The `/api/health` endpoint is public and used by external cron services (e.g., cron-job.org) to keep the free Render instance awake. Render's free tier spins down after 15 minutes of inactivity.

## Database
- Schema: `api_server`
- Key tables: `users`, `api_key_usage`, `charts`, `dashboards`
- Users table has `created_at` and `last_active_at` timestamps
- Use `/api/sql` POST endpoint with `{"sql": "..."}` to explore database

### Corporate Domain Filtering
Free email domains to exclude:
```
gmail.com, comcast.net, yahoo.com, hotmail.com, qq.com,
outlook.com, icloud.com, aol.com, me.com, protonmail.com,
live.com, msn.com, zoho.com, gmx.com, yandex.com
```
Also exclude `gridstatus.io` (internal).

The `applyGridstatusFilter()` function in `src/lib/queries.ts` dynamically adds/removes `gridstatus.io` from SQL queries based on the filter context.

## Development Guidelines

### Date/Timezone Handling
**CRITICAL**: Always use UTC methods when parsing dates from PostgreSQL:
```typescript
// CORRECT
const year = date.getUTCFullYear();
const month = date.getUTCMonth() + 1;

// WRONG - causes timezone shift (Jan 1 UTC becomes Dec 31 local)
const year = date.getFullYear();
const month = date.getMonth() + 1;
```

### Charts
- Use **straight lines** (`curveType="linear"`) - no curved lines
- Use `chartType="bar"` for MAU and count data
- Y-axis should start at 0 (`yAxisProps={{ domain: [0, 'auto'] }}`)
- Use Mantine color tokens (e.g., `blue.6`, `teal.6`, `violet.6`)

#### Tips for Making Charts
- **Always show periods with 0 values**: When creating time-series charts, generate all periods in the time range (hours for 1 day, days for longer periods) and fill missing data points with 0. This ensures the chart shows a complete timeline without gaps, making it easier to see when there was no activity.

### API Routes
- **Separate fast from slow queries** - create dedicated endpoints per page
- PostHog API: fast (~500ms)
- Database queries: can take 30s-2min depending on table size
- For slow tables (like `api_key_usage`), consider adding time filters (e.g., last 7 days)

### Page Pattern
Each analytics page follows this pattern:
1. Create SQL file in `src/sql/`
2. Add typed query function in `src/lib/queries.ts`
3. Create API route in `src/app/api/[name]/route.ts`
4. Create view component in `src/components/[Name]View.tsx`
5. Create page in `src/app/[name]/page.tsx`
6. Add to sidebar in `src/components/AppLayout.tsx`

### Tables
- Make tables searchable with `TextInput` + filter
- Show up to 100 rows with note about limit
- Include MoM/YoY change percentages inline with values
- For current month, show linear extrapolation estimate in parentheses

### Component Conventions
- Use `MetricCard` for summary stats at top of page
- Use `Paper` with `shadow="sm"` and `withBorder` for sections
- Loading state: use `Skeleton` components matching layout
- Error state: use `Alert` with `IconAlertCircle`

### URL State Management
**CRITICAL**: As much state as is reasonable should be stored in the URL to enable deep linking and sharing. This includes:
- Filter selections (time ranges, categories, etc.)
- Search queries (when appropriate)
- Sort orders
- Tab/segment selections
- Pagination (when applicable)

Use Next.js App Router hooks to manage URL state:
```typescript
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

export function MyView() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  
  // Read initial state from URL
  const filter = searchParams.get('filter') || null;
  const [localFilter, setLocalFilter] = useState(filter);
  
  // Update URL when state changes
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    if (localFilter) {
      params.set('filter', localFilter);
    } else {
      params.delete('filter');
    }
    const newUrl = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [localFilter, pathname, router, searchParams]);
  
  // Fetch data based on URL state
  useEffect(() => {
    // ... fetch data using localFilter ...
  }, [localFilter]);
}
```

Benefits:
- Users can bookmark/share specific filtered views
- Browser back/forward buttons work correctly
- Page refreshes maintain state
- Deep linking to specific views is possible

## Guidelines for Building New Apps

### Overview Pages
- Every app should have an overview page at `src/app/[name]/page.tsx`
- Overview pages should display a list/table of entities with key metrics
- Use a View component pattern: create `src/components/[Name]View.tsx` and import it into the page
- Add the page to the sidebar in `src/components/AppLayout.tsx` using `NavLink` with appropriate icon
- For apps with instance pages, use `pathname?.startsWith('/[name]')` to highlight the parent nav item when on instance pages

### Instance Pages
- If an app has entities that can be viewed in detail, create instance pages at `src/app/[name]/[id]/page.tsx`
- Instance pages should:
  - Display detailed information about a single entity
  - Include a "Back to [Overview]" link at the top using `IconArrowLeft` and `Anchor` component:
    ```typescript
    <Anchor
      component={Link}
      href="/[name]"
      size="sm"
      c="dimmed"
      style={{ display: 'flex', alignItems: 'center', gap: '4px' }}
    >
      <IconArrowLeft size={16} />
      Back to [Name]
    </Anchor>
    ```
  - Show relevant metrics using `MetricCard` components
  - Display related data in tables or charts

### Cross-App Linking
- **Whenever an instance is mentioned** (user ID, organization ID, insight ID, etc.), make it a clickable link to its detail page
- Use `Anchor` component with `Link` from Next.js:
  ```typescript
  <Anchor component={Link} href={`/users-list/${userId}`}>
    {userName}
  </Anchor>
  ```
- Examples of cross-app linking:
  - User IDs in insights detail page → link to `/users-list/${userId}`
  - Organization IDs in user detail page → link to `/organizations/${orgId}`
  - User IDs in organization detail page → link to `/users-list/${userId}`
  - Post IDs in insights overview → link to `/insights/${postId}`

### User Name Display
- **ALWAYS use `UserHoverCard` component** when displaying user names/links
- The `UserHoverCard` component provides:
  - Clickable link to user detail page
  - Hover card with user summary (after ~400ms delay)
  - Lazy-loaded user data (fetches on first hover)
  - Shows: name, email, domain, organizations, stats (charts/dashboards/alerts), activity dates
- Usage:
  ```typescript
  import { UserHoverCard } from '@/components/UserHoverCard';
  
  <UserHoverCard userId={user.id} userName={user.username} />
  ```
- **Never use plain `Anchor` links for user names** - always use `UserHoverCard` for consistency and better UX

### API Routes
- Overview pages: `src/app/api/[name]/route.ts` - returns list/aggregate data
- Instance pages: `src/app/api/[name]/[id]/route.ts` - returns detail for single entity
- Use typed query functions from `src/lib/queries.ts`
- Apply `applyGridstatusFilter()` to SQL queries when filtering by domain

### Error Handling
- **Always return SQL error messages** in API responses for debugging (this is an internal app)
- Use `getErrorMessage()` helper from `@/lib/db` to extract error messages:
  ```typescript
  import { getErrorMessage } from '@/lib/db';
  
  try {
    // ... query logic ...
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json(
      { error: getErrorMessage(error) },
      { status: 500 }
    );
  }
  ```
- This allows developers to copy SQL error messages directly from the frontend for debugging

### Internal Filtering Support
The app supports toggling internal (`@gridstatus.io`) users via a filter in the sidebar. To support this in new apps:

1. **View Components**: Use the `useFilter()` hook to get the current filter state:
   ```typescript
   import { useFilter } from '@/contexts/FilterContext';
   
   const { filterGridstatus } = useFilter();
   const response = await fetch(`/api/[name]?filterGridstatus=${filterGridstatus}`);
   ```
   - Include `filterGridstatus` in the dependency array of `useEffect` to refetch when filter changes

2. **API Routes**: Read the filter from query params and pass to query functions:
   ```typescript
   const filterGridstatus = searchParams.get('filterGridstatus') !== 'false';
   const data = await get[Name](filterGridstatus);
   ```

3. **Query Functions**: Accept `filterGridstatus` parameter and apply the filter:
   ```typescript
   export async function get[Name](filterGridstatus: boolean = true): Promise<[Type][]> {
     let sql = loadSql('[name].sql');
     sql = applyGridstatusFilter(sql, filterGridstatus);
     return query<[Type]>(sql);
   }
   ```

4. **SQL Files**: Write SQL queries that include `'gridstatus.io'` in domain exclusion lists. The `applyGridstatusFilter()` function will dynamically add/remove it based on the filter state.

### SQL Queries
- Store SQL in `src/sql/[name].sql` files (one query per file)
- Create typed query functions in `src/lib/queries.ts`:
  ```typescript
  export async function get[Name](): Promise<[Type][]> {
    const sql = loadSql('[name].sql');
    return query<[Type]>(sql);
  }
  ```
- Use `applyGridstatusFilter()` when queries filter by email domain

### Data Flow Pattern
1. SQL file → Query function → API route → View component → Page
2. View components fetch from API routes (client-side)
3. API routes use query functions (server-side)
4. Query functions load SQL files and execute via `query()` helper

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
