# Airtable Setup Guide for Glampack HR

## Overview

This guide helps you verify your Airtable base is correctly configured for all features to work.

## Critical Issues Fixed

✅ **Admin Add Employee** - Added missing form fields (Department, Job Title, Status, Leave Balances)
✅ **Announcement Creation** - Added form handler to save announcements
✅ **CLAUDE.md Documentation** - Complete project documentation for future development

## What Still Needs Verification

The following features require correct Airtable table setup:

### 1. Leave History Display (Frontend)
### 2. Leave Approval/Rejection (Admin)
### 3. Payroll Saving
### 4. Announcement Display (Frontend)

---

## Required Airtable Tables

Go to your Airtable base and verify these tables exist with EXACT field names (case-sensitive):

### Table 1: Employees

**Required Fields:**
- `Full Name` (Single line text)
- `Email` (Email)
- `Password` (Single line text) ⚠️ NOT secure - use for testing only
- `Department` (Single select: Engineering, HR, Sales, Marketing, Finance)
- `Job Title` (Single line text)
- `Status` (Single select: Permanent, Contract, Probation)
- `Role` (Single select: Employee, Admin, HR)
- `Annual Leave Balance` (Number, default: 20)
- `Sick Leave Balance` (Number, default: 10)
- `Salary` (Currency or Number)

**Verification:**
```
✓ Field names match EXACTLY (including capital letters and spaces)
✓ Single select fields have all required options
✓ Number fields accept integers
```

---

### Table 2: Leave Requests

**Required Fields:**
- `Employee` (Link to another record → Employees table)
- `Leave Type` (Single select: Annual Leave, Sick Leave, Emergency Leave)
- `Start Date` (Date)
- `End Date` (Date)
- `Number of Days` (Number)
- `Reason` (Long text)
- `Status` (Single select: Pending, Approved, Rejected)
- `Admin Comments` (Long text)

**Common Issues:**
- ❌ Leave history not showing → Check if table name is "Leave Requests" (with space)
- ❌ Approval not working → Verify "Approved" and "Rejected" exist in Status dropdown
- ❌ No leaves displayed → Add test leave record to verify connection

**Verification:**
```
✓ Table name is "Leave Requests" (NOT "LeaveRequests" or "Leave_Requests")
✓ Status field has Pending, Approved, Rejected options
✓ Employee field links to Employees table
```

---

### Table 3: Payroll

**Required Fields:**
- `Employee` (Link to another record → Employees) **Must be array format: ['recXXXX']**
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
- `Custom Allowances` (Long text) - Stores JSON
- `Custom Deductions` (Long text) - Stores JSON
- `Status` (Single select) **Must include "Processed" as option**
- `Payment Date` (Date)

**Common Issues:**
- ❌ 422 Error when saving payroll → Most common causes:
  1. Status field missing "Processed" option
  2. Field names don't match exactly
  3. Currency fields set to wrong type
  4. Employee not in array format

**Verification:**
```
✓ All 20 fields exist with exact names
✓ Status dropdown includes "Processed"
✓ Currency fields are Currency or Number type (NOT text)
✓ Employee field is "Link to another record"
```

---

### Table 4: Announcements

**Required Fields:**
- `Title` (Single line text)
- `Type` (Single select: General, HR, Urgent, Event, Policy)
- `Message` (Long text)
- `Created By` (Link to another record → Employees)
- `Date` (Date)

**Common Issues:**
- ❌ Announcements not showing in frontend → Check table name is "Announcements"
- ❌ Can't create announcement → Verify Type dropdown has all 5 options
- ❌ Created By error → Ensure field links to Employees table

**Verification:**
```
✓ Table name is "Announcements"
✓ Type field has General, HR, Urgent, Event, Policy options
✓ Created By links to Employees table
```

---

### Table 5: AnnouncementReads

**Required Fields:**
- `Announcement` (Link to another record → Announcements)
- `Employee` (Link to another record → Employees)
- `Read Date` (Date)

**Purpose:** Tracks which employees have read which announcements (for unread indicators)

**Verification:**
```
✓ Table name is "AnnouncementReads" (capital A and R)
✓ Both link fields connect to correct tables
```

---

### Table 6: Attendance

**Required Fields:**
- `Employee` (Link to another record → Employees) **Array format**
- `Date` (Date)
- `Check In` (Single line text, format: HH:MM:SS)
- `Check Out` (Single line text, format: HH:MM:SS)
- `Check In Location` (Long text)
- `Check Out Location` (Long text)

**Verification:**
```
✓ Table name is "Attendance"
✓ Time fields are Single line text (NOT Time type)
✓ Location fields are Long text
```

---

## How to Verify Each Feature

### 1. Leave History Not Showing

**Test Steps:**
1. Open leave-request.html as an employee
2. Check browser console (F12) for errors
3. Look for messages like:
   - `Error loading leave history`
   - `404` or `422` errors
   - `Table not found`

**If Empty:**
- Add a test leave record manually in Airtable
- Ensure Employee field links to your logged-in user
- Refresh page and check if it appears

**Fix Checklist:**
```
□ Leave Requests table exists
□ Table name is "Leave Requests" (with space)
□ At least 1 leave record exists for testing
□ Employee field links to Employees table
□ Status has Pending, Approved, Rejected options
```

---

### 2. Admin Leave Approval/Rejection

**Test Steps:**
1. Login as Admin
2. Go to admin-dashboard.html
3. Navigate to Leave Approvals section
4. Try to approve/reject a pending leave

**If Error Occurs:**
- Check console for Worker API errors
- Verify Status field in Leave Requests has "Approved" and "Rejected"
- Ensure Admin Comments field exists (Long text)

**Fix Checklist:**
```
□ Logged in as user with Role = Admin or HR
□ Pending leave requests exist
□ Status field configured correctly
□ Admin Comments field exists
□ Worker API deployed (run: wrangler deploy)
```

---

### 3. Payroll Save Error (422)

**Test Steps:**
1. Login as Admin
2. Go to admin-dashboard.html
3. Try to create a payroll record
4. Note the exact error message

**Common 422 Causes:**
1. **Status missing "Processed"** - Most common!
2. Field name typo (e.g., "Basic salary" vs "Basic Salary")
3. Currency field is Text type instead of Number/Currency
4. Employee not in array format

**Fix Checklist:**
```
□ Payroll table has all 20 required fields
□ Field names match EXACTLY (case-sensitive)
□ Status is Single select with "Processed" option
□ Currency fields are Currency or Number type
□ All required fields present
□ No extra validation rules blocking saves
```

**Debug Steps:**
1. Check browser console for full error message
2. Note which field Airtable rejects
3. Compare field name in error to Airtable field name
4. Fix spelling/capitalization/type mismatch

---

### 4. Announcements Not Displaying

**Test Steps:**
1. Admin creates announcement
2. Frontend (announcements.html) should show it
3. Check browser console for errors

**Fix Checklist:**
```
□ Announcements table exists
□ Type field has all 5 options
□ Created By links to Employees
□ Date field is Date type
□ Worker API deployed
□ AnnouncementReads table exists (for read tracking)
```

---

## Deployment Checklist

After fixing Airtable tables, deploy changes:

### 1. Deploy Worker (CRITICAL)
```bash
cd "/Users/breezyyy/Downloads/login page/techzaa.in/techauth"
wrangler deploy
```

**Why:** The Worker proxies all Airtable API calls. Without it, nothing works.

### 2. Deploy Frontend
Changes already pushed to GitHub (Cloudflare Pages auto-deploys):
- ✅ Commit 1253427: Fix admin employee form
- ✅ Commit e906d5b: Add announcement creation
- ✅ Commit 5dc4973: Update CLAUDE.md documentation

**Wait 1-2 minutes for deployment, then:**
- Hard reload browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
- Clear browser cache if issues persist

---

## Testing After Fixes

### Complete Test Checklist

**Employee Features:**
- [ ] Login with employee account
- [ ] View dashboard with stats
- [ ] Submit leave request
- [ ] View leave history (all statuses)
- [ ] View announcements
- [ ] Mark announcement as read
- [ ] Check attendance
- [ ] View payroll

**Admin Features:**
- [ ] Login with admin account
- [ ] Add new employee (fill all fields)
- [ ] Edit existing employee
- [ ] View leave requests
- [ ] Approve leave request
- [ ] Reject leave request (with reason)
- [ ] Create payroll for employee
- [ ] Create announcement (all types)

**Verify on Production:**
- [ ] No console errors (except browser extension errors - ignore those)
- [ ] All API calls return 200 (not 404, 422, or 500)
- [ ] Data saves successfully
- [ ] Data displays correctly after refresh

---

## Quick Reference: Common Errors

| Error | Cause | Fix |
|-------|-------|-----|
| 422 Unprocessable Content | Field name mismatch or missing dropdown option | Check Airtable field names EXACTLY match code |
| 404 Not Found | Worker not deployed or table doesn't exist | Run `wrangler deploy` |
| Empty leave history | No records or wrong Employee link | Add test record, verify Employee field links correctly |
| Can't save payroll | Status missing "Processed" option | Add "Processed" to Status dropdown |
| Announcement not showing | Table name wrong or Type options missing | Verify "Announcements" table and Type dropdown |

---

## Need More Help?

1. **Check browser console** (F12 → Console tab) for error messages
2. **Check CLAUDE.md** for architecture and troubleshooting
3. **Check WORKER-DEPLOYMENT.md** for Worker deployment issues
4. **Verify Airtable credentials** in Cloudflare Worker secrets:
   ```bash
   wrangler secret list
   ```

---

## Summary

**What's Fixed:**
✅ Admin can now add employees with all required fields
✅ Admin can create announcements
✅ Comprehensive documentation added

**What Needs Your Attention:**
⚠️ Verify all Airtable tables exist with correct field names
⚠️ Add "Processed" to Payroll Status dropdown
⚠️ Deploy Worker: `wrangler deploy`
⚠️ Test all features after deployment
⚠️ Hard reload browser to see changes

**Expected Result After Fixes:**
- Employees can view leave history
- Admins can approve/reject leaves
- Payroll saves without 422 errors
- Announcements display on frontend
- All features work in production
