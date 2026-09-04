# 5-Day Commit Plan (Sept 1-5, 2026)

## Day 1 (Monday, Sept 1) - Setup & Backend Foundation
**Goal:** Initialize repo, set up gitignore, establish backend core

### Commit 1: Initial Setup
```bash
git init
git add .gitignore README.md
git commit -m "chore: initial setup with gitignore and readme"
```
- Create `.gitignore` (exclude node_modules, .env, dist, build logs)
- Create `README.md` (brief project overview)

### Commit 2: Backend Database & Models
```bash
git add backend/config/ backend/models/ backend/package.json backend/.env.example
git commit -m "feat: add database config and data models"
```
- Backend configuration
- All Mongoose models (User, ExpenseReport, ExpenseLine, Alert, AuditLog)
- .env.example template (NO SECRETS)

### Commit 3: Backend Middleware & Utils
```bash
git add backend/middleware/ backend/utils/
git commit -m "feat: add authentication middleware and utility functions"
```
- Auth middleware
- Role-based middleware
- recalculateTotal utility

---

## Day 2 (Tuesday, Sept 2) - Backend Routes & Controllers
**Goal:** Complete backend API layer

### Commit 4: Authentication Routes & Controller
```bash
git add backend/routes/auth.js backend/controllers/authController.js
git commit -m "feat: implement user authentication (login, register)"
```

### Commit 5: Expense Reports Routes & Controller
```bash
git add backend/routes/reports.js backend/controllers/reportController.js
git commit -m "feat: add expense report management endpoints"
```

### Commit 6: Expense Lines Routes & Controller
```bash
git add backend/routes/lines.js backend/controllers/lineController.js
git commit -m "feat: add expense line item management"
```

### Commit 7: Approvals & Alerts
```bash
git add backend/routes/approver.js backend/routes/alerts.js \
        backend/controllers/approverController.js backend/controllers/alertController.js
git commit -m "feat: add approval workflow and alerts system"
```

---

## Day 3 (Wednesday, Sept 3) - Dashboard & Backend Polish
**Goal:** Complete backend, add seed data

### Commit 8: Dashboard & Resubmit Controllers
```bash
git add backend/routes/dashboard.js backend/controllers/dashboardController.js \
        backend/controllers/resubmitController.js
git commit -m "feat: add dashboard analytics and resubmit workflow"
```

### Commit 9: Server Setup & Seed Data
```bash
git add backend/server.js backend/seed.js backend/package-lock.json
git commit -m "feat: add server setup and database seeding script"
```

---

## Day 4 (Thursday, Sept 4) - Frontend Structure
**Goal:** Establish frontend foundation and core components

### Commit 10: Frontend Setup & Configuration
```bash
git add frontend/package.json frontend/package-lock.json \
        frontend/vite.config.js frontend/tailwind.config.js \
        frontend/postcss.config.js frontend/index.html
git commit -m "chore: setup frontend with Vite, React, and Tailwind"
```

### Commit 11: Frontend Core & Context
```bash
git add frontend/src/main.jsx frontend/src/App.jsx frontend/src/index.css \
        frontend/src/context/AuthContext.jsx frontend/src/api/axios.js
git commit -m "feat: add React app structure with auth context and API client"
```

### Commit 12: Frontend Layout Components
```bash
git add frontend/src/components/Navbar.jsx \
        frontend/src/components/ProtectedRoute.jsx \
        frontend/src/components/ApproverRoute.jsx
git commit -m "feat: add navigation and route protection components"
```

---

## Day 5 (Friday, Sept 5) - Frontend Features & Final Push
**Goal:** Complete frontend, push to GitHub

### Commit 13: Authentication Pages
```bash
git add frontend/src/pages/Login.jsx frontend/src/pages/Register.jsx
git commit -m "feat: add login and registration pages"
```

### Commit 14: Report Management Pages
```bash
git add frontend/src/pages/AllReports.jsx frontend/src/pages/MyReports.jsx \
        frontend/src/pages/CreateReport.jsx frontend/src/pages/ReportDetail.jsx
git commit -m "feat: add expense report management pages"
```

### Commit 15: Dashboard & Approver Pages
```bash
git add frontend/src/pages/Dashboard.jsx frontend/src/pages/ApproverQueue.jsx
git commit -m "feat: add dashboard and approver queue pages"
```

### Commit 16: Report Components
```bash
git add frontend/src/components/ReportCard.jsx frontend/src/components/StatusBadge.jsx \
        frontend/src/components/AuditTimeline.jsx frontend/src/components/BulkActionBar.jsx
git commit -m "feat: add report display and audit components"
```

### Commit 17: Forms & Utilities
```bash
git add frontend/src/components/LineItemForm.jsx \
        frontend/src/components/AlertsPanel.jsx \
        frontend/src/components/AppToaster.jsx
git commit -m "feat: add forms, alerts, and toast notifications"
```

### Commit 18: Charts
```bash
git add frontend/src/components/charts/
git commit -m "feat: add dashboard charts and analytics visualizations"
```

### Commit 19: Final Push
```bash
git add .
git commit -m "docs: update readme with final setup instructions" (if needed)
git remote add origin https://github.com/yourusername/expense-app.git
git branch -M main
git push -u origin main
```

---

## Summary
- **Total Commits:** 19 commits
- **Distribution:** 3 (Day 1) + 4 (Day 2) + 2 (Day 3) + 5 (Day 4) + 5 (Day 5) + Final Push
- **Organized by:** Feature/Component logical grouping
- **Benefits:** Clean history, reviewable chunks, follows git best practices

## Before Starting:
1. ✅ Create `.gitignore`
2. ✅ Create `.env.example` (template only)
3. ✅ Create `README.md`
4. ✅ Ensure `.env` files are NOT added
5. ✅ Check both `package-lock.json` files exist
