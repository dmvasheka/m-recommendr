# ⚠️ WORKFLOW RULES - MANDATORY CHECK BEFORE EVERY ACTION

**READ THIS BEFORE USING ANY TOOL (Write, Edit, Bash, etc.)**

---

## 🚫 NEVER AUTO-CREATE/EDIT FOR:

### Category 1: New Code
- ❌ NEW FEATURES (any new functionality)
- ❌ NEW COMPONENTS (React components, UI elements)
- ❌ NEW PAGES (Next.js pages, routes)
- ❌ NEW MODULES (NestJS modules, services, controllers)
- ❌ NEW API ENDPOINTS (new routes, new functionality)
- ❌ NEW UTILITIES (helper functions, libraries)

### Category 2: Updates to Existing Code
- ❌ FEATURE ENHANCEMENTS (improving existing features)
- ❌ UI/UX CHANGES (design changes, layout updates)
- ❌ REFACTORING (code restructuring, optimization)
- ❌ ARCHITECTURE CHANGES (changing how things work)

### Category 3: Major Changes
- ❌ DATABASE SCHEMA CHANGES (new tables, new fields - SHOW migration SQL)
- ❌ DEPENDENCY CHANGES (adding new packages - SHOW command)
- ❌ CONFIGURATION CHANGES (tsconfig, package.json updates)

---

## ✅ AUTO-CREATE/EDIT ONLY FOR:

### Category 1: Fixes
- ✅ BUG FIXES (fixing broken functionality)
- ✅ TYPESCRIPT ERRORS (type errors, compilation errors)
- ✅ BUILD ERRORS (fixing failed builds)
- ✅ RUNTIME ERRORS (fixing crashes, exceptions)

### Category 2: Dependencies
- ✅ DEPENDENCY INSTALLATION (when asked to install)
- ✅ MISSING IMPORTS (adding missing import statements)
- ✅ VERSION CONFLICTS (fixing package version issues)

### Category 3: Documentation
- ✅ UPDATING DOCUMENTATION (CURRENT_STATUS.md, SESSION_RESUME.md)
- ✅ FIXING TYPOS (in docs, comments)
- ✅ UPDATING PROGRESS (todo lists, status files)

---

## 📋 MANDATORY PROCESS FOR NEW FEATURES:

```
STEP 1: STOP ✋
Ask yourself: "Is this creating NEW functionality or UPDATING existing functionality?"
If YES → Follow steps 2-5
If NO (it's a bug fix) → Proceed with auto-fix

STEP 2: SHOW CODE 📝
Present the code in a markdown code block
DO NOT use Write, Edit, or Bash tools

STEP 3: EXPLAIN 💬
- What does this code do?
- Why is it needed?
- Where should it be placed?
- What problem does it solve?

STEP 4: WAIT ⏸️
Wait for user confirmation: "создал файл" / "готово" / "done"
DO NOT proceed until user confirms

STEP 5: CONTINUE ➡️
Only after confirmation, move to next step or ask what to do next
```

---

## ❓ WHEN IN DOUBT:

**Ask yourself:**
1. **"Am I CREATING something new?"** → YES = SHOW CODE
2. **"Am I FIXING something broken?"** → YES = AUTO-FIX
3. **"Am I UPDATING existing feature?"** → YES = SHOW CODE
4. **"Am I FIXING a compilation error?"** → YES = AUTO-FIX

**Golden Rule:**
```
IF (creating || updating || enhancing) {
    SHOW_CODE_AND_WAIT();
} else if (fixing || error || bug) {
    AUTO_FIX();
}
```

---

## 🎯 EXAMPLES:

### ❌ SHOW CODE (Don't Auto-Create):
- "Add chat UI component" → NEW FEATURE
- "Update discover page with RAG" → FEATURE ENHANCEMENT
- "Create user profile page" → NEW PAGE
- "Add dark mode toggle" → NEW FEATURE
- "Refactor authentication" → ARCHITECTURE CHANGE
- "Add new API endpoint /api/favorites" → NEW ENDPOINT

### ✅ AUTO-FIX:
- "Fix TypeScript error in chat.service.ts" → BUG FIX
- "Add missing import for useAuth" → MISSING IMPORT
- "Fix compilation error in MovieCard" → BUILD ERROR
- "Update CURRENT_STATUS.md with progress" → DOCUMENTATION
- "Install missing dependency axios" → DEPENDENCY

---

## 🔴 CRITICAL VIOLATIONS TO AVOID:

1. **NEVER create a new file without showing code first** (unless it's a doc update)
2. **NEVER edit existing functionality without explaining changes** (unless it's a bug fix)
3. **NEVER assume user wants auto-creation** (unless explicitly stated or it's a bug fix)
4. **NEVER skip the SHOW → EXPLAIN → WAIT process** for new features

---

## ✅ COMPLIANCE CHECKLIST:

Before using Write/Edit/Bash, check:

- [ ] Is this fixing a bug or error? → If YES, proceed
- [ ] Is this a new feature or update? → If YES, SHOW CODE FIRST
- [ ] Did I explain what the code does? → Required for new features
- [ ] Did user confirm to proceed? → Required before creating files
- [ ] Am I following the SHOW → EXPLAIN → WAIT process? → Mandatory

---

**Last Updated:** 2026-01-03
**Violation Count Goal:** ZERO

**Remember:** When user says "ты опять за меня делаешь" - it means you violated this workflow. Re-read these rules immediately.
