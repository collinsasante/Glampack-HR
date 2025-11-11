# Packaging Glamour HR System

A complete HR management system with authentication, attendance tracking, leave management, and payroll features.

## Setup Instructions

### 1. Clone the Repository

```bash
git clone https://github.com/collinsasante/Glampack-HR.git
cd Glampack-HR
```

### 2. Configure Airtable API Keys

1. Copy the config example file:
```bash
cp techzaa.in/techauth/config.example.js techzaa.in/techauth/config.js
```

2. Edit `techzaa.in/techauth/config.js` and add your Airtable credentials:
   - Replace `YOUR_AIRTABLE_API_KEY_HERE` with your actual Airtable API key
   - Replace `YOUR_AIRTABLE_BASE_ID_HERE` with your actual Airtable Base ID

**IMPORTANT:** Never commit `config.js` to git - it's already in `.gitignore`

### 3. Update HTML Files

Add the config.js script tag to your HTML files that use Airtable:

```html
<script src="config.js"></script>
<script src="auth.js"></script>
```

Files that need this:
- `signin-2.html`
- `signup-2.html`
- `forgot-password-2.html`
- `admin-dashboard.html`
- `dashboard.html`
- `profile.html`
- `attendance-tracker.html`
- `leave-request.html`
- `payroll.html`

### 4. Open in Browser

Simply open any HTML file in your browser. Start with:
- `signin-2.html` - Main login page

## Features

- **Authentication System**
  - Sign in / Sign up with email
  - Role-based access (Employee / Admin)
  - Password management

- **Employee Dashboard**
  - View personal information
  - Track attendance
  - Request leave
  - View payroll information

- **Admin Dashboard**
  - Manage employees
  - Approve/reject leave requests
  - Track attendance records
  - Generate reports

## Project Structure

```
Glampack-HR/
├── techzaa.in/
│   ├── techauth/
│   │   ├── signin-2.html          # Login page
│   │   ├── signup-2.html          # Registration page
│   │   ├── dashboard.html         # Employee dashboard
│   │   ├── admin-dashboard.html   # Admin dashboard
│   │   ├── auth.js                # Authentication logic
│   │   ├── admin.js               # Admin functionality
│   │   ├── config.js              # API configuration (not in git)
│   │   └── config.example.js      # Config template
│   └── images/
│       └── logo_red.png           # Company logo
└── README.md                      # This file
```

## Security Notes

- API keys are stored in `config.js` which is gitignored
- Never commit actual API keys to the repository
- Use environment variables for production deployments

## Customization

### Colors
The theme uses a red color scheme. To change:
- Update Tailwind classes from `red-600` to your preferred color
- Update background classes from `bg-red-600` to your color

### Branding
- Replace `logo_red.png` with your company logo
- Update company name from "Packaging Glamour HR" in HTML files

## Support

For issues or questions, please open an issue on GitHub.

## License

Private - All rights reserved
