# /code-review

Perform a check of staged changes for regressions or unintended side effects.

**IMPORTANT**: Only output a response if there are actionable issues. If the code is correct, state "No issues found" or remain silent.

**CRITICAL - Security & Guidelines**: Verify all changes strictly follow `CLAUDE.md`, specifically:
- **Security**: Auth requirements, `PUBLIC_API_ROUTES` restrictions, and parameterized/templated SQL.
- **Filtering**: `filterInternal` and `filterFree` applied correctly to all new queries and views.
- **Dead Code**: Ensure no unused imports, functions, or SQL files remain.
- **Patterns**: Use existing utilities (e.g., `useApiData`, `UserHoverCard`, `loadSql`).

1. **Logic & Documentation**:
   - Check for breaking changes to existing APIs or components.
   - Verify all comments and documentation are accurate and up to date.
   - Ensure missing error handling or edge cases are addressed.

2. **Side Effects & Performance**:
   - Verify no memory leaks (useEffect cleanup) or infinite loops (URL sync/fetching).
   - Check for performance regressions (unnecessary re-renders, slow queries without filters).

3. **Automated Checks**:
   - Run `npm run lint`.
   - Run `npx tsc --noEmit` if possible to check types.
