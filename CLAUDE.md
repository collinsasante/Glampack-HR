# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Glampack HR Management System** - A full-featured HR management application for tracking attendance, leave requests, payroll, announcements, and employee data. Built with vanilla JavaScript, Tailwind CSS, and deployed on Cloudflare Pages with Airtable backend.

**Key Feature**: Uses a Cloudflare Worker API proxy architecture to secure Airtable credentials, preventing direct API key exposure in the frontend.

## Architecture

### Three-Tier Security Architecture

```
Frontend (Cloudflare Pages)
    ↓ HTTPS requests
Cloudflare Worker API Proxy
    ↓ Authenticated API calls
Airtable Database
```

**Why this matters:**
- Frontend NEVER contains Airtable API keys
- All database calls proxy through `glampack-hr-api.mr-asanteeprog.workers.dev`
- CSP headers in `_headers` file enforce this security boundary
- Worker credentials stored as Cloudflare secrets (not in code)

### File Architecture

**Authentication & Core:**
- `auth.js` - Login, signup, session management (uses Worker API)
- `config-worker.js` - Worker API helper functions (imported by all pages)
- `api-worker.js` - Cloudflare Worker source code (proxies Airtable API)
- `wrangler.toml` - Worker deployment configuration

**Employee Pages:**
- `dashboard.html` - Main dashboard with stats, charts, quick actions
- `attendance-tracker.html` - GPS-based check-in/check-out
- `leave-request.html` - Leave submission and history
- `profile.html` - Profile management, emergency contacts
- `payroll.html` - Salary breakdown, payslip downloads
- `announcements.html` - Company announcements with read tracking

**Admin Pages:**
- `admin-dashboard.html` - Payroll processing, employee management

**Shared Components:**
- `navigation.js` - Sidebar navigation (injected into all pages)
- `components.js` - Shared UI components
- `shared-nav.js` - Navigation state management

## Critical Development Commands

### Deploy Cloudflare Worker (REQUIRED)

The Worker API proxy MUST be deployed for the system to function:

```bash
# Navigate to project directory
cd "/Users/breezyyy/Downloads/login page/techzaa.in/techauth"

# Deploy Worker
wrangler deploy

# Set secrets (first time only)
wrangler secret put AIRTABLE_API_KEY
wrangler secret put AIRTABLE_BASE_ID

# View Worker logs
wrangler tail
```

**Important**: After ANY changes to `api-worker.js`, you MUST run `wrangler deploy` for changes to take effect.

### Deploy Frontend to Cloudflare Pages

Changes to HTML/JS files are deployed automatically via GitHub:

```bash
# Commit and push changes
git add .
git commit -m "Description of changes"
git push origin main

# Wait 1-2 minutes for Cloudflare Pages auto-deployment
# Then hard reload browser: Ctrl+Shift+R (Windows/Linux) or Cmd+Shift+R (Mac)
```

### Testing Locally

```bash
# Run Worker locally (optional)
wrangler dev

# Use any local web server for frontend
python3 -m http.server 8000
# or
npx live-server
```

## Airtable Schema

### Required Tables and Fields

The Airtable base requires these exact table/field names (case-sensitive):

**1. Employees Table**
- `Full Name` (Single line text)
- `Email` (Email)
- `Password` (Single line text) - ⚠️ Plain text, not production-ready
- `Department` (Single select)
- `Job Title` (Single line text)
- `Status` (Single select: Permanent, Contract, Probation)
- `Role` (Single select: Employee, Admin, HR)
- `Annual Leave Balance` (Number, default: 20)
- `Salary` (Currency or Number)
- `Date of Birth` (Date) - **Optional** - Required for birthday notifications feature

**2. Attendance Table**
- `Employee` (Link to Employees) - **Must be array format**
- `Date` (Date)
- `Check In` (Single line text, format: HH:MM:SS)
- `Check Out` (Single line text, format: HH:MM:SS)
- `Check In Location` (Long text)
- `Check Out Location` (Long text)

**3. Leave Requests Table**
- `Employee` (Link to Employees)
- `Leave Type` (Single select: Annual Leave, Emergency Leave)
- `Start Date` (Date)
- `End Date` (Date)
- `Number of Days` (Number)
- `Reason` (Long text)
- `Status` (Single select: Pending, Approved, Rejected)
- `Admin Comments` (Long text)

**4. Announcements Table**
- `Title` (Single line text)
- `Type` (Single select: General, HR, Urgent, Event, Policy)
- `Message` (Long text)
- `Created By` (Link to Employees)
- `Date` (Date)

**5. AnnouncementReads Table**
- `Announcement` (Link to Announcements)
- `Employee` (Link to Employees)
- `Read Date` (Date)

**6. Payroll Table** (for admin-dashboard.html payroll processing)
- `Employee` (Link to Employees) - **Must be array format: ['recXXXXX']**
- `Month` (Single line text, format: YYYY-MM)
- `Basic Salary` (Currency or Number)
- `Housing Allowance` (Currency or Number)
- `Transport Allowance` (Currency or Number)
- `Benefits` (Currency or Number)
- `Other Allowances` (Currency or Number)
- `Total Allowances` (Currency or Number)
- `Gross Salary` (Currency or Number)
- `Income Tax` (Currency or Number)
- `Welfare` (Currency or Number)
- `Social Security` (Currency or Number)
- `Health Insurance` (Currency or Number)
- `Other Deductions` (Currency or Number)
- `Total Deductions` (Currency or Number)
- `Net Salary` (Currency or Number)
- `Custom Allowances` (Long text) - Stores JSON string
- `Custom Deductions` (Long text) - Stores JSON string
- `Status` (Single select) - **Must include "Processed" as an option**
- `Payment Date` (Date)

**Common 422 Errors:**
- Field name spelling/capitalization mismatch
- Field type mismatch (sending text to number field)
- Missing required fields
- Single Select options not configured (e.g., "Processed" not in Status dropdown)
- Linked record not in array format

## Currency Localization

**All currency displays use Ghana Cedis (GH₵):**
- Currency symbol: `GH₵` (not $)
- Formatting: `Intl.NumberFormat('en-GH', { style: 'currency', currency: 'GHS' })`
- When editing currency displays, search for `$` and replace with `GH₵`
- See: `admin.js`, `payroll.html`, `profile.html`, `admin-dashboard.html`

## Content Security Policy (CSP)

The `_headers` file controls CSP. **Only these CDNs are allowed:**

```
script-src: cdnjs.cloudflare.com, cdn.tailwindcss.com, cdn.jsdelivr.net
connect-src: glampack-hr-api.mr-asanteeprog.workers.dev, nominatim.openstreetmap.org
```

**Important:**
- Direct Airtable API access (`api.airtable.com`) is intentionally BLOCKED by CSP
- All database calls MUST use Worker API functions from `config-worker.js`
- If adding new external resources, update `_headers` file AND redeploy

## Worker API Usage Pattern

**Never use direct Airtable fetch calls.** Always use Worker API functions:

```javascript
// ❌ WRONG - Direct Airtable call (will be blocked by CSP)
fetch('https://api.airtable.com/v0/...', {
    headers: { 'Authorization': 'Bearer ...' }
})

// ✅ CORRECT - Worker API proxy
// Import config-worker.js in HTML first
const employees = await getEmployees();
const employee = await getEmployee(recordId);
await createEmployee(data);
await updateEmployee(recordId, data);
```

**All Worker API functions** (from `config-worker.js`):
- `getEmployees(filterFormula)` / `getEmployee(id)` / `createEmployee(data)` / `updateEmployee(id, data)` / `deleteEmployee(id)`
- `getAttendance(filterFormula)` / `createAttendance(data)` / `updateAttendance(id, data)`
- `getLeaveRequests(filterFormula)` / `createLeaveRequest(data)` / `updateLeaveRequest(id, data)`
- `getAnnouncements(filterFormula)` / `createAnnouncement(data)`
- `getPayroll(filterFormula)` / `createPayroll(data)` / `updatePayroll(id, data)`

## Migration Checklist (When Adding Worker API to Pages)

1. Add `<script src="config-worker.js?v=2"></script>` before page scripts
2. Replace all `AIRTABLE_CONFIG` references with Worker API functions
3. Remove old `config.js` script tag
4. Test all CRUD operations
5. Check browser console for CSP violations
6. Push to GitHub for deployment

## Common Issues & Solutions

**Issue: "API request failed with status 422"**
- Check Airtable field names match exactly (case-sensitive)
- Verify field types (Currency vs Number, Single Select options)
- Ensure linked records use array format: `['recordId']`
- Check if Single Select has required options (e.g., "Processed")

**Issue: "CSP violation" errors**
- Add missing CDN to `_headers` file
- Redeploy to Cloudflare Pages (push to GitHub)
- Hard reload browser (Ctrl+Shift+R)

**Issue: "Worker not found" or CORS errors**
- Deploy Worker: `wrangler deploy`
- Verify Worker URL in `config-worker.js` matches deployed URL
- Check Worker secrets are set: `wrangler secret list`

**Issue: Changes not appearing after deploy**
- Wait 1-2 minutes for Cloudflare Pages deployment
- Check GitHub Actions for deployment status
- Clear browser cache and hard reload
- Check if change was to Worker (needs `wrangler deploy`, not just git push)

## Default Values

**New Employees:**
- Annual Leave Balance: 20 days
- Role: Employee (unless specified)
- Status: Permanent (unless specified)

**Leave Balance Display:**
Use `!== undefined` check (not `|| 0`) to properly show default of 20:
```javascript
// ❌ WRONG - treats 0, null, undefined the same
const balance = data.fields['Annual Leave Balance'] || 20;

// ✅ CORRECT - only defaults if undefined
const balance = data.fields['Annual Leave Balance'] !== undefined
    ? data.fields['Annual Leave Balance']
    : 20;
```

## Git Workflow

**Main branch:** `main` (used for production deployment)

**Commit Message Format:**
```
Action description

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>
```

**Never commit:**
- API keys or secrets
- `config.js` (deprecated, contains plain API keys)
- `.env` files with credentials

## Security Warnings

⚠️ **Known Security Issues (NOT production-ready):**

1. **Passwords stored in plain text** in Airtable
   - MUST implement bcrypt/Argon2 hashing before production
   - Hash passwords in Worker, not frontend

2. **No rate limiting** on authentication endpoints
   - Add Cloudflare Rate Limiting rules

3. **Client-side session management** using sessionStorage
   - Implement JWT tokens with proper expiration

4. **No CSRF protection**
   - Add CSRF tokens for state-changing operations

## Testing Checklist

Before marking production-ready, test:

- [ ] Login/signup with valid/invalid credentials
- [ ] Attendance check-in with geolocation (HTTPS required)
- [ ] Leave request submission and admin approval workflow
- [ ] Payroll creation in admin dashboard
- [ ] Announcement creation and read tracking
- [ ] Profile updates and password changes
- [ ] PDF generation (payslips, reports)
- [ ] Chart.js visualizations on dashboard
- [ ] All Worker API endpoints (8 total, see WORKER-DEPLOYMENT.md)
- [ ] CSP violations in console (should be zero)
- [ ] Mobile responsiveness
- [ ] Cross-browser compatibility (Chrome, Firefox, Safari, Edge)

## Additional Documentation

- `README.md` - Full feature list, setup instructions, Airtable schema
- `WORKER-DEPLOYMENT.md` - Step-by-step Worker deployment guide with troubleshooting
- `wrangler.toml` - Worker configuration and deployment settings
