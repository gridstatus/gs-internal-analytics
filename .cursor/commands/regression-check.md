Code review my staged and unstaged changes for regressions or unintended side effects.

**IMPORTANT**: Only output a response if there are actionable issues. If the code is correct, state "No issues found" or remain silent.

**CRITICAL - Security & Guidelines**: Verify all changes strictly follow `CLAUDE.md`, specifically:
- **Security**: Auth requirements, `PUBLIC_API_ROUTES` restrictions, and parameterized/templated SQL.

1. **Logic & Documentation**:
   - Check for breaking changes to existing APIs or components.
   - Verify all comments and documentation are accurate and up to date.