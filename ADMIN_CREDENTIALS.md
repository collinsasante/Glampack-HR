# Admin Login Credentials

## Default Admin Account

For testing and initial setup, use these credentials:

**Email:** `admin@packagingglamour.com`
**Password:** `Admin@123456`
**Role:** Admin

## Creating Additional Admin Accounts

1. Go to the signup page: `packaging-glamour-signup.html`
2. Fill in the form with admin details
3. Select "Permanent" as status
4. The system will automatically create an Admin account
5. Check email (including spam folder) to verify the account
6. Sign in with the new credentials

## Important Notes

- ⚠️ Change the default admin password after first login for security
- Admin accounts have full access to:
  - Employee management
  - Attendance records
  - Leave request approval
  - Payroll processing
  - Announcements
  - Medical claims approval
- Make sure Firebase Authentication is enabled for the admin email
- Admin credentials must exist in both Firebase AND Airtable

## Troubleshooting

**Can't sign in?**
1. Check if email is verified in Firebase Console
2. Verify the Role field in Airtable Employees table is set to "Admin"
3. Clear browser cache and try again
4. Check browser console for errors

**Email not verified?**
- Check spam/junk folder for verification email
- Use the "Resend Verification Email" button on sign-in page
- Contact system administrator if issue persists
