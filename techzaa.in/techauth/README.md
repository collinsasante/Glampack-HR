# HR Management System

A comprehensive, modern HR Management System built with vanilla JavaScript, Tailwind CSS, and Airtable as the backend database.

## Features

### For All Employees
1. **Authentication System**
   - Secure login with email and password
   - User registration with department and job title
   - Session management
   - Password protection

2. **Attendance Tracker**
   - GPS location-based check-in/check-out
   - Reverse geocoding for location names
   - Real-time attendance recording
   - Location accuracy tracking

3. **Leave Management**
   - Submit leave requests (Annual, Sick, Emergency)
   - View leave balance
   - Track leave history
   - See approval status and admin comments

4. **Employee Profile**
   - View and edit personal information
   - See current month attendance summary
   - Check leave balances
   - View recent attendance records

5. **Company Announcements**
   - View all company announcements
   - Filter by type (General, HR, Urgent, Event, Policy)
   - Mark announcements as read
   - Unread indicators

6. **Payroll View**
   - View salary breakdown (earnings and deductions)
   - Download payslips as PDF
   - View payment history
   - Salary calculations

7. **Monthly Reports**
   - Personal attendance summary
   - Performance metrics and scores
   - Downloadable PDF reports
   - Interactive charts and visualizations

8. **Settings**
   - Change password
   - Notification preferences
   - Application preferences (language, timezone, date format)
   - Account management

### For Admins/HR
9. **Admin Dashboard**
   - Employee management (add, edit, delete)
   - Leave approval workflow
   - Attendance record editing
   - Comprehensive reporting system

10. **Employee Management**
    - Add new employees
    - Edit employee details
    - Delete employees
    - Search and filter employees
    - Role assignment

11. **Leave Approvals**
    - View pending leave requests
    - Approve with optional comments
    - Reject with mandatory reason
    - Real-time status updates

12. **Attendance Editing**
    - Correct attendance times
    - Edit check-in/check-out records
    - Filter by date and employee

13. **Report Generation**
    - Employee report
    - Attendance report (monthly)
    - Leave report (yearly)
    - Payroll report (monthly)
    - Professional PDF exports

## Tech Stack

- **Frontend**: HTML5, Vanilla JavaScript, Tailwind CSS 3
- **Backend**: Airtable (REST API)
- **Authentication**: Session-based (sessionStorage)
- **Charts**: Chart.js
- **PDF Generation**: jsPDF with AutoTable
- **Icons**: Font Awesome 6.4
- **Fonts**: Google Fonts (Montserrat)
- **Geolocation**: Browser Geolocation API + OpenStreetMap Nominatim

## File Structure

```
techzaa.in/techauth/
├── signin-2.html              # Login page
├── signup-2.html              # Registration page
├── attendance-tracker.html    # Attendance check-in/out
├── dashboard.html             # Main dashboard
├── leave-request.html         # Leave management
├── profile.html               # Employee profile
├── announcements.html         # Company announcements
├── payroll.html               # Payroll information
├── monthly-summary.html       # Performance reports
├── settings.html              # User settings
├── admin-dashboard.html       # Admin panel
├── auth.js                    # Authentication functions
├── admin.js                   # Admin functionality
├── navigation.js              # Shared navigation component
├── components.js              # Shared UI components
└── assets/
    ├── css/
    └── images/
```

## Airtable Schema

### Tables Required

#### 1. Employees
- **Full Name** (Single line text)
- **Email** (Email)
- **Password** (Single line text) *Note: Not production-ready*
- **Department** (Single select: Engineering, HR, Sales, Marketing, Finance)
- **Job Title** (Single line text)
- **Status** (Single select: Permanent, Contract, Probation)
- **Role** (Single select: Employee, Admin, HR)
- **Annual Leave Balance** (Number, default: 20)
- **Sick Leave Balance** (Number, default: 10)

#### 2. Attendance
- **Employee** (Link to Employees)
- **Date** (Date)
- **Check In** (Single line text, format: HH:MM:SS)
- **Check Out** (Single line text, format: HH:MM:SS)
- **Check In Location** (Long text)
- **Check Out Location** (Long text)

#### 3. Leave Requests
- **Employee** (Link to Employees)
- **Leave Type** (Single select: Annual Leave, Sick Leave, Emergency Leave)
- **Start Date** (Date)
- **End Date** (Date)
- **Number of Days** (Number)
- **Reason** (Long text)
- **Status** (Single select: Pending, Approved, Rejected)
- **Admin Comments** (Long text)

#### 4. Announcements
- **Title** (Single line text)
- **Type** (Single select: General, HR, Urgent, Event, Policy)
- **Message** (Long text)
- **Created By** (Link to Employees)
- **Date** (Date)

#### 5. AnnouncementReads
- **Announcement** (Link to Announcements)
- **Employee** (Link to Employees)
- **Read Date** (Date)

#### 6. Salary
- **Employee** (Link to Employees)
- **Basic Salary** (Number)
- **Housing Allowance** (Number)
- **Transport Allowance** (Number)
- **Other Allowances** (Number)
- **Income Tax** (Number)
- **Social Security** (Number)
- **Health Insurance** (Number)
- **Other Deductions** (Number)

#### 7. PaymentHistory
- **Employee** (Link to Employees)
- **Payment Date** (Date)
- **Gross Salary** (Number)
- **Total Deductions** (Number)
- **Net Salary** (Number)
- **Status** (Single select: Paid, Pending)

## Setup Instructions

### 1. Airtable Configuration

1. Create a new Airtable base
2. Create all required tables (see schema above)
3. Get your API key from Airtable Account settings
4. Get your Base ID from the API documentation
5. Update the API credentials in all JavaScript files:
   ```javascript
   const AIRTABLE_CONFIG = {
       apiKey: 'YOUR_API_KEY',
       baseId: 'YOUR_BASE_ID'
   };
   ```

### 2. File Deployment

1. Upload all files to your web server
2. Ensure all file paths are correct
3. Test on a local server first (e.g., using Live Server)

### 3. Create Admin User

1. Manually add a user in Airtable Employees table
2. Set the Role field to "Admin" or "HR"
3. Add a password
4. Use these credentials to login

## Usage Guide

### For Employees

1. **Login**: Use your email and password provided by HR
2. **First Time**:
   - Check in using Attendance Tracker (allow location access)
   - Update your profile information
   - Check notification settings

3. **Daily Routine**:
   - Check in when you arrive
   - Check out when you leave
   - View announcements
   - Submit leave requests when needed

4. **Monthly**:
   - Review monthly summary report
   - Download payslip
   - Check leave balance

### For Admins

1. **Access Admin Panel**: Navigate to admin-dashboard.html
2. **Employee Management**: Add, edit, or remove employees
3. **Leave Management**: Review and approve/reject leave requests
4. **Attendance**: Correct any attendance errors
5. **Reports**: Generate monthly reports for management

## Security Considerations

⚠️ **IMPORTANT**: This system is for demonstration/internal use only. For production:

1. **DO NOT** store passwords in plain text
2. Implement proper authentication (JWT, OAuth)
3. Use HTTPS for all connections
4. Implement rate limiting
5. Add CSRF protection
6. Sanitize all inputs
7. Use environment variables for API keys
8. Implement proper role-based access control
9. Add audit logging
10. Regular security audits

## Features Highlights

### User Experience
- ✅ Responsive design (mobile, tablet, desktop)
- ✅ Loading states and animations
- ✅ Toast notifications for feedback
- ✅ Confirmation dialogs for destructive actions
- ✅ Empty states and error handling
- ✅ Search and filtering
- ✅ Real-time data synchronization

### Performance
- ✅ Debounced search inputs
- ✅ Optimized API calls
- ✅ Efficient data caching
- ✅ Lazy loading for charts

### Accessibility
- ✅ Keyboard navigation
- ✅ Screen reader friendly
- ✅ High contrast colors
- ✅ Clear error messages

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Known Issues

1. Geolocation may not work on insecure (HTTP) connections
2. Signup form requires department and job title (fixed)
3. Password storage is not secure (use hashing in production)
4. Session management is client-side only

## Future Enhancements

- [ ] Two-factor authentication
- [ ] Email notifications
- [ ] Document management
- [ ] Performance reviews
- [ ] Training modules
- [ ] Mobile app
- [ ] Real-time chat
- [ ] Calendar integration
- [ ] Advanced analytics
- [ ] Multi-language support

## Support

For issues or questions:
1. Check the console for error messages
2. Verify Airtable API credentials
3. Ensure all required tables exist
4. Check browser compatibility

## License

This project is for educational and internal use only.

## Credits

Built with ❤️ using modern web technologies.

---

**Version**: 1.0.0
**Last Updated**: November 2025
