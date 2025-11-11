# Airtable Database Schema for HR Management System

This document outlines the complete Airtable database structure required for the HR Management System to function properly.

## Base Configuration

**Base ID:** `appxBPjMal2Se5ZvI`
**API Key:** Your Airtable API key (keep secure)

---

## Table 1: Employees

**Purpose:** Store all employee information including personal details, employment info, and emergency contacts.

### Fields

| Field Name | Field Type | Required | Description | Example Values |
|-----------|-----------|----------|-------------|----------------|
| **Employee ID** | Single line text | Yes | Unique identifier for employee | EMP001, EMP002 |
| **Full Name** | Single line text | Yes | Employee's complete name | John Doe |
| **Email** | Email | Yes | Employee email (used for login) | john.doe@company.com |
| **Password** | Single line text | Yes | Plain text password (for demo purposes) | password123 |
| **Phone Number** | Phone number | No | Contact phone number | +1 (555) 123-4567 |
| **Date of Birth** | Date | No | Employee's birth date | 1990-05-15 |
| **Address** | Long text | No | Street address | 123 Main St, Apt 4B |
| **City** | Single line text | No | City name | New York |
| **Country** | Single line text | No | Country name | United States |
| **Job Title** | Single line text | Yes | Employee's position | Software Engineer |
| **Department** | Single select | Yes | Department name | Engineering, HR, Sales, Marketing, Finance |
| **Employment Type** | Single select | Yes | Type of employment | Full-Time, Part-Time, Contract, Intern |
| **Status** | Single select | Yes | Employment status | Active, Inactive, On Leave |
| **Joining Date** | Date | Yes | Date employee joined | 2023-01-15 |
| **Manager** | Single line text | No | Reporting manager's name | Jane Smith |
| **Salary** | Number (Currency) | No | Monthly salary | 5000.00 |
| **Annual Leave Balance** | Number | Yes | Remaining annual leave days | 20 |
| **Sick Leave Balance** | Number | Yes | Remaining sick leave days | 10 |
| **Last Password Change** | Date | No | Date of last password update | 2024-11-01 |
| **Emergency Contact Name** | Single line text | No | Emergency contact person | Mary Doe |
| **Emergency Contact Relationship** | Single select | No | Relationship to employee | Spouse, Parent, Sibling, Child, Friend, Other |
| **Emergency Contact Phone** | Phone number | No | Emergency contact phone | +1 (555) 987-6543 |
| **Emergency Contact Alternate Phone** | Phone number | No | Alternate emergency phone | +1 (555) 987-6544 |
| **Emergency Contact Email** | Email | No | Emergency contact email | mary.doe@email.com |
| **Emergency Contact Address** | Long text | No | Emergency contact address | 456 Oak Ave, City, State |
| **Role** | Single select | Yes | User role for access control | Employee, Admin, HR |

### Sample Data

```
Employee ID: EMP001
Full Name: John Doe
Email: john.doe@company.com
Password: demo123
Phone Number: +1 (555) 123-4567
Date of Birth: 1990-05-15
Address: 123 Main Street, Apt 4B
City: New York
Country: United States
Job Title: Software Engineer
Department: Engineering
Employment Type: Full-Time
Status: Active
Joining Date: 2023-01-15
Manager: Jane Smith
Salary: 5000
Annual Leave Balance: 15
Sick Leave Balance: 8
Emergency Contact Name: Mary Doe
Emergency Contact Relationship: Spouse
Emergency Contact Phone: +1 (555) 987-6543
```

---

## Table 2: Attendance

**Purpose:** Track daily check-in/check-out times and work hours.

### Fields

| Field Name | Field Type | Required | Description | Example Values |
|-----------|-----------|----------|-------------|----------------|
| **Employee** | Link to Employees | Yes | Link to employee record | John Doe |
| **Date** | Date | Yes | Attendance date | 2024-11-09 |
| **Check In** | Single line text | Yes | Check-in datetime (ISO format) | 2024-11-09T09:00:00.000Z |
| **Check Out** | Single line text | No | Check-out datetime (ISO format) | 2024-11-09T17:30:00.000Z |
| **Check In Location** | Long text | No | GPS/IP location for check-in | New York, NY, United States [GPS] (±25m) |
| **Check Out Location** | Long text | No | GPS/IP location for check-out | New York, NY, United States [GPS] (±30m) |
| **Hours Worked** | Formula (Decimal) | No | Auto-calculated work hours | 8.5 |
| **Status** | Single select | No | Attendance status | Present, Absent, Late, Half Day |
| **Notes** | Long text | No | Additional notes | Arrived late due to traffic |

### Sample Data

```
Employee: [Link to John Doe]
Date: 2024-11-09
Check In: 2024-11-09T09:00:00.000Z
Check Out: 2024-11-09T17:30:00.000Z
Check In Location: 123 Main St, New York, NY, United States [GPS] (±25m)
Check Out Location: 123 Main St, New York, NY, United States [GPS] (±30m)
Hours Worked: 8.5 (calculated by formula)
Status: Present
Notes: On time
```

### Formula for Hours Worked

**IMPORTANT:** This must be a **Formula field** in Airtable to automatically calculate hours.

```javascript
IF(
  AND({Check In}, {Check Out}),
  ROUND(
    DATETIME_DIFF({Check Out}, {Check In}, 'hours'),
    1
  ),
  0
)
```

**Note:** This formula uses ISO datetime format and calculates the difference in hours between check-out and check-in times.

---

## Table 3: Leave Requests

**Purpose:** Manage employee leave requests and approvals.

### Fields

| Field Name | Field Type | Required | Description | Example Values |
|-----------|-----------|----------|-------------|----------------|
| **Request ID** | Auto number | Auto | Unique request identifier | 1, 2, 3... |
| **Employee** | Link to Employees | Yes | Link to employee record | John Doe |
| **Leave Type** | Single select | Yes | Type of leave | Vacation, Sick, Study, Other |
| **Start Date** | Date | Yes | Leave start date | 2024-11-15 |
| **End Date** | Date | Yes | Leave end date | 2024-11-17 |
| **Days** | Number | No | Number of days (calculated) | 3 |
| **Notes** | Long text | Yes | Reason for leave | Family vacation |
| **Status** | Single select | Yes | Request status | Pending, Approved, Rejected |
| **Approved By** | Link to Employees | No | Admin who approved | Jane Smith |
| **Created Time** | Created time | Auto | Timestamp of creation | 2024-11-09 10:30 AM |

### Sample Data

```
Request ID: 1
Employee: [Link to John Doe]
Leave Type: Vacation
Start Date: 2024-12-20
End Date: 2024-12-27
Days: 8
Notes: Christmas holiday with family
Status: Pending
```

### Formula for Days (if using formula field)

```javascript
DATETIME_DIFF({End Date}, {Start Date}, 'days') + 1
```

---

## Table 4: Announcements

**Purpose:** Store company-wide announcements and news.

### Fields

| Field Name | Field Type | Required | Description | Example Values |
|-----------|-----------|----------|-------------|----------------|
| **Title** | Single line text | Yes | Announcement title | Company Holiday Schedule |
| **Message** | Long text | Yes | Full announcement message | The office will be closed... |
| **Date** | Date | Yes | Publication date | 2024-11-09 |
| **Priority** | Single select | Yes | Announcement priority | Urgent, Important, General |
| **Author** | Single line text | No | Who created it | HR Department |
| **Target Audience** | Multiple select | No | Who should see it | All Employees, Engineering, HR |
| **Active** | Checkbox | Yes | Is announcement active | ☑ |

### Sample Data

```
Title: Holiday Schedule Announcement
Message: The office will be closed from Dec 24-26 for Christmas holidays. Please plan accordingly.
Date: 2024-11-09
Priority: Important
Author: HR Department
Target Audience: All Employees
Active: ☑
```

---

## Table 5: Payroll

**Purpose:** Track monthly salary payments and deductions.

### Fields

| Field Name | Field Type | Required | Description | Example Values |
|-----------|-----------|----------|-------------|----------------|
| **Employee** | Link to Employees | Yes | Link to employee record | John Doe |
| **Month** | Single select | Yes | Payment month | January, February, ... |
| **Year** | Number | Yes | Payment year | 2024 |
| **Base Salary** | Number (Currency) | Yes | Base monthly salary | 5000.00 |
| **Bonuses** | Number (Currency) | No | Additional bonuses | 500.00 |
| **Deductions** | Number (Currency) | No | Total deductions | 300.00 |
| **Net Salary** | Number (Currency) | No | Final amount paid | 5200.00 |
| **Payment Date** | Date | Yes | Date of payment | 2024-11-30 |
| **Payment Status** | Single select | Yes | Payment status | Pending, Paid, Failed |
| **Payment Method** | Single select | No | How payment was made | Bank Transfer, Check, Cash |
| **Notes** | Long text | No | Additional notes | Bonus for Q4 performance |

### Sample Data

```
Employee: [Link to John Doe]
Month: November
Year: 2024
Base Salary: 5000
Bonuses: 500
Deductions: 300
Net Salary: 5200
Payment Date: 2024-11-30
Payment Status: Pending
Payment Method: Bank Transfer
```

### Formula for Net Salary (if using formula field)

```javascript
{Base Salary} + {Bonuses} - {Deductions}
```

---

## Relationships Between Tables

### Employee → Attendance
- **Type:** One-to-Many
- **Link Field:** Attendance.Employee → Employees

### Employee → Leave Requests
- **Type:** One-to-Many
- **Link Field:** Leave Requests.Employee → Employees

### Employee → Payroll
- **Type:** One-to-Many
- **Link Field:** Payroll.Employee → Employees

---

## Views to Create

### Employees Table Views

1. **All Employees** - Default view, all fields visible
2. **Active Employees** - Filter: Status = "Active"
3. **By Department** - Group by Department field
4. **Contact List** - Show only: Full Name, Email, Phone Number

### Attendance Table Views

1. **This Month** - Filter: Date is within this month
2. **By Employee** - Group by Employee
3. **Late Arrivals** - Filter: Status = "Late"

### Leave Requests Table Views

1. **Pending Approvals** - Filter: Status = "Pending"
2. **Approved Leaves** - Filter: Status = "Approved"
3. **By Employee** - Group by Employee
4. **This Month** - Filter: Start Date is within this month

### Announcements Table Views

1. **Active Announcements** - Filter: Active = checked
2. **By Priority** - Sort by Priority (Urgent first)
3. **Recent** - Sort by Date (newest first)

---

## Security & Access Control

### API Key Permissions
- Read access to all tables
- Write access to: Employees, Attendance, Leave Requests
- Admin-only write access to: Payroll, Announcements

### Important Security Notes

⚠️ **WARNING:** This system stores passwords in plain text for demo purposes only!

**For Production:**
1. Never store plain text passwords
2. Use proper authentication service (Auth0, Firebase Auth, etc.)
3. Implement role-based access control
4. Use environment variables for API keys
5. Enable Airtable's built-in access controls
6. Consider using personal access tokens instead of API keys

---

## Data Validation Rules

### Employees Table
- Email must be unique
- Employee ID must be unique
- Annual Leave Balance: 0-30 days
- Sick Leave Balance: 0-15 days
- Status must be set
- Department must be set

### Attendance Table
- Date cannot be in the future
- Check-in time must be before Check-out time
- One attendance record per employee per day

### Leave Requests Table
- End Date must be >= Start Date
- Start Date cannot be in the past (for new requests)
- Days calculation must be accurate
- Vacation leave: max 7 days per quarter

---

## Initial Setup Steps

1. **Create Airtable Base**
   - Go to airtable.com
   - Create new base named "HR Management System"
   - Copy the Base ID from the URL

2. **Create Tables**
   - Create 5 tables as outlined above
   - Add all fields with correct types
   - Set up relationships (linked records)

3. **Add Sample Data**
   - Add at least one employee record
   - Add sample attendance records
   - Add sample announcements

4. **Get API Key**
   - Go to account settings
   - Generate personal access token with read/write permissions
   - Add scopes: data.records:read, data.records:write

5. **Configure Application**
   - Update `auth.js` with your Base ID
   - Update `auth.js` with your API key
   - Test the connection

---

## Backup & Maintenance

### Regular Backups
- Export all tables monthly as CSV
- Use Airtable's built-in backup features
- Consider using Airtable's API to automate backups

### Data Cleanup
- Archive old attendance records (older than 2 years)
- Remove rejected leave requests after 6 months
- Clean up inactive employee records annually

---

## Performance Optimization

### Indexing
- Use Views for common filters
- Create filtered views for dashboard queries
- Limit API calls using `maxRecords` parameter

### Caching
- Cache employee data in localStorage
- Refresh only when needed
- Use sessionStorage for session data

---

## Troubleshooting

### Common Issues

**Issue:** API calls failing with 401 error
- **Solution:** Check API key permissions and expiration

**Issue:** Cannot find employee record
- **Solution:** Verify email exactly matches (case-sensitive)

**Issue:** Leave balance not updating
- **Solution:** Check formula fields and manual updates

**Issue:** Attendance hours calculation wrong
- **Solution:** Verify time format is HH:MM (24-hour)

---

## Support & Resources

- **Airtable API Documentation:** https://airtable.com/api
- **Airtable Support:** https://support.airtable.com
- **Community Forum:** https://community.airtable.com

---

**Last Updated:** November 2024
**Schema Version:** 1.0
