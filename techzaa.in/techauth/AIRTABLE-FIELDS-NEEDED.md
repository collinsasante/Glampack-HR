# Required Airtable Fields for All Features to Work

## 1. Employees Table - Additional Fields Needed

Add these fields to your **Employees** table in Airtable:

### Personal Information Fields
- **Phone Number** (Phone number or Single line text)
- **Date of Birth** (Date)
- **Address** (Long text)
- **City** (Single line text)
- **Country** (Single line text)

### Employment Fields (for Admin to add when creating employees)
- **Employee ID** (Single line text) - Unique identifier
- **Job Title** (Single line text) - e.g., "HR Manager", "Software Developer"
- **Department** (Single select) - Options: HR, Finance, IT, Operations, Sales, Marketing, etc.
- **Employment Type** (Single select) - Options: Permanent, Contract, Probation, Intern
- **Joining Date** (Date) - Date employee joined the company
- **Monthly Salary** (Currency or Number) - Employee's monthly salary

## 2. Medical Claims Table - Required Field

Add this field to your **Medical Claims** table:

- **Status** (Single select) - Options: Pending, Approved, Rejected
  - **Default**: Pending
  - This field is REQUIRED for the claims system to work properly

## 3. Emergency Contact Table - Link to Employees

Your **Emergency Contact** table needs a link field to connect to employees:

- **Employee** (Link to Employees table) - Links emergency contact to an employee record

Without this link, the system can't properly associate emergency contacts with employees.

## Current Table Status Summary

### ✅ Working Tables
- Employees (basic fields)
- Attendance
- Leave Requests
- Announcements
- Payroll

### ⚠️ Tables Needing Updates
1. **Employees** - Missing personal info and employment fields
2. **Medical Claims** - Missing Status field
3. **Emergency Contact** - Missing Employee link field

## Quick Setup Checklist

1. [ ] Open your Airtable base
2. [ ] Go to Employees table
3. [ ] Add all Personal Information fields listed above
4. [ ] Add all Employment fields listed above
5. [ ] Go to Medical Claims table
6. [ ] Add Status field (Single select: Pending, Approved, Rejected)
7. [ ] Go to Emergency Contact table
8. [ ] Add Employee field (Link to Employees table)

Once these fields are added, all features will work correctly!
