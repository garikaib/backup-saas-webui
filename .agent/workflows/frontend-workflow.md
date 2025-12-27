---
description: Frontend development workflow and rules for the Backup SaaS Admin project
---

# Frontend Development Workflow Playbook

This document defines the standard operating procedures for all frontend development work on this project.

## Project Context

- **Framework**: Nuxt (latest version) with NuxtUI
- **Dev Server**: Already running on port 3000 (DO NOT launch)
- **Backend API Docs**: Available in `backend-api-docs/` (symlink to backend project)
- **Frontend Docs**: Available in `frontend-docs/`

---

## Core Rules

### 1. No Browser Launch Unless Explicitly Requested
- Do NOT use browser tools to view pages unless the user explicitly asks
- The dev server is already running - user will test manually

### 2. Backend API Reference First
Before making any frontend changes:
1. Check `backend-api-docs/api_reference.md` to understand:
   - Available endpoints
   - Request/response formats
   - Authentication requirements
   - Expected data structures
2. If the API doesn't support needed functionality, prepare a backend brief

### 3. Backend Briefs
If the backend needs updates to support frontend requirements:
- Create a concise brief for the backend team
- Include:
  - What endpoint/feature is needed
  - Recommended HTTP method and path
  - Request payload structure
  - Expected response structure
  - Best practices/techniques to leverage
- Remember: Backend is being built concurrently and can be modified

### 4. Don't Launch Dev Server
// turbo-all
The development server is already running on port 3000. Do NOT run:
- `npm run dev`
- `pnpm dev`
- `yarn dev`
- Any dev server start commands

### 5. Ask, Don't Guess
If requirements are unclear or there's ambiguity:
- Stop and ask for clarification
- List specific questions that need answers
- Never make assumptions about user intent

### 6. Manual Test Checklist
After every code change, provide a manual test checklist including:
- [ ] Steps to verify the change works
- [ ] Edge cases to test
- [ ] Expected vs actual behavior
- [ ] Any regression areas to check

### 7. Git Push Reminder
When changes are complete and verified:
- Prompt user to push to GitHub
- Provide the git commands if needed

---

## Development Workflow

### Phase 1: Understand
1. Review user request
2. Check `backend-api-docs/api_reference.md` for API context
3. Ask clarifying questions if needed

### Phase 2: Plan
1. Identify files to modify/create
2. Check if backend changes are needed
3. If yes, prepare backend brief first

### Phase 3: Implement
1. Make code changes
2. Follow Nuxt/NuxtUI best practices
3. Keep components modular and reusable

### Phase 4: Document
1. Update `frontend-docs/` if needed
2. Provide manual test checklist

### Phase 5: Wrap Up
1. Summarize changes made
2. Remind user to push to GitHub
3. Prompt: "Ready to push these changes to GitHub?"

---

## Quick References

### Key Directories
```
backup-saas-admin/
├── backend-api-docs/          # Symlink to backend API docs
├── frontend-docs/             # Frontend-specific documentation
├── .agent/workflows/          # This playbook and other workflows
├── app/
│   ├── components/            # Vue components
│   ├── pages/                 # Nuxt pages
│   ├── composables/           # Composables/hooks
│   ├── stores/                # Pinia stores
│   └── utils/                 # Utility functions
└── nuxt.config.ts             # Nuxt configuration
```

### Checklist Template
```markdown
## Manual Test Checklist

### Primary Functionality
- [ ] [Test step 1]
- [ ] [Test step 2]

### Edge Cases
- [ ] [Edge case 1]
- [ ] [Edge case 2]

### Regression Check
- [ ] [Related feature 1] still works
- [ ] [Related feature 2] still works
```

### Backend Brief Template
```markdown
## Backend Enhancement Request

### Feature Needed
[Brief description]

### Recommended Implementation

**Endpoint**: `[METHOD] /api/v1/path`

**Request**:
```json
{
  "field": "type"
}
```

**Response**:
```json
{
  "field": "type"
}
```

### Best Practices
- [Recommendation 1]
- [Recommendation 2]
```
