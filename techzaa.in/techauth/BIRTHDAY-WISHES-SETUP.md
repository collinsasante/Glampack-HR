# Birthday Wishes Feature - Setup Guide

## 🎂 Overview

The Birthday Wishes system allows all employees to:
- See who's celebrating their birthday today
- Send personalized birthday wishes
- View all wishes sent to the celebrants
- Automatic birthday detection on login

## 📋 Airtable Setup Required

### Create "Birthday Wishes" Table

1. **Open your Airtable base**
2. **Create a new table** named `Birthday Wishes` (exact name, case-sensitive)
3. **Add the following fields:**

| Field Name | Field Type | Description |
|------------|------------|-------------|
| `From Employee` | Link to Employees | Who sent the wish (linked record) |
| `To Employees` | Link to Employees | Birthday celebrants (multiple allowed) |
| `Message` | Long text | The birthday wish message |
| `Date` | Date | When the wish was sent |
| `From Name` | Single line text | Sender's name (for display) |
| `To Names` | Single line text | Celebrants' names (for display) |

### Field Configuration Details

**From Employee:**
- Type: Link to another record
- Link to: Employees table
- Allow linking to multiple records: NO

**To Employees:**
- Type: Link to another record
- Link to: Employees table
- Allow linking to multiple records: YES (important!)

**Message:**
- Type: Long text
- Enable rich text formatting: Optional

**Date:**
- Type: Date
- Include time: Optional
- Use the same time zone for all collaborators: YES

**From Name & To Names:**
- Type: Single line text
- These are automatically filled by the system for easier display

## 🚀 Deployment Steps

### Step 1: Deploy Worker

The birthday wishes API endpoint is already added to the worker. Deploy it:

```bash
cd /Users/breezyyy/Glampack-HR/techzaa.in/techauth
wrangler deploy
```

### Step 2: Test the System

1. **Set up test data:**
   - Go to Employees table
   - Set one employee's "Date of Birth" to today (e.g., `1990-11-30`)

2. **Login to the dashboard**
3. **Birthday modal should appear automatically**
4. **You'll see:**
   - Birthday celebration message
   - Celebrant name(s)
   - "Send Birthday Wishes" textarea
   - "Send Wishes" and "View All Wishes" buttons

### Step 3: Send a Wish

1. **Type your birthday message** in the textarea
2. **Click "Send Wishes"**
3. **Success message will appear**
4. **The wish is saved to Airtable**

### Step 4: View Wishes

1. **Click "View All Wishes"** button
2. **See all wishes sent to today's celebrants**
3. **Each wish shows:**
   - Sender's name and initial
   - Wish message
   - Date sent

## 🎨 Features

### For All Employees

✅ **Automatic Birthday Notifications**
- Modal appears on login when someone has a birthday
- Shows all celebrants for the day
- Only shows once per day (localStorage tracking)

✅ **Send Wishes**
- Write personalized messages
- Simple, intuitive interface
- Messages saved to Airtable

✅ **View Wishes**
- See all wishes for today's celebrants
- Beautiful card-style display
- Shows sender names and messages

### For Birthday Celebrants

🎉 **They will see:**
- Their own birthday celebration when logging in
- All wishes sent by colleagues
- Names of well-wishers

### Technical Features

🔧 **System Features:**
- Worker API integration for secure database access
- No direct Airtable API exposure
- Promise-based async operations
- Custom modal UI (no browser alerts)
- LocalStorage for one-per-day display
- Supports single or multiple birthdays

## 📊 How It Works

### Birthday Detection Flow

```
1. Employee logs into any authenticated page
   ↓
2. checkBirthdays() runs automatically
   ↓
3. System fetches all employees from Airtable
   ↓
4. Filters employees with today's birth month/day
   ↓
5. If matches found → Show birthday modal
   ↓
6. Store flag in localStorage (prevent re-showing today)
```

### Wish Sending Flow

```
1. Employee types message in birthday modal
   ↓
2. Clicks "Send Wishes"
   ↓
3. System validates message (not empty)
   ↓
4. Creates record in Birthday Wishes table
   ↓
5. Links to sender and celebrant(s)
   ↓
6. Success message shown
   ↓
7. Message cleared from textarea
```

### View Wishes Flow

```
1. Employee clicks "View All Wishes"
   ↓
2. System fetches all wishes from Airtable
   ↓
3. Filters for today's date + current celebrants
   ↓
4. Displays in custom modal
   ↓
5. Shows sender names, messages, and dates
```

## 🧪 Testing Scenarios

### Test 1: Single Birthday
1. Set one employee's DOB to today
2. Login as any employee
3. Modal should show single celebrant
4. Send a wish
5. View wishes - should see your wish

### Test 2: Multiple Birthdays
1. Set 3 employees' DOBs to today
2. Login as any employee
3. Modal should show all 3 celebrants in a list
4. Send a wish (goes to all 3)
5. View wishes - should see all wishes for all 3

### Test 3: Once-Per-Day Display
1. See birthday modal
2. Close it
3. Refresh page
4. Modal should NOT appear again
5. Clear localStorage: `localStorage.removeItem('birthdayModalShown')`
6. Refresh - modal appears again

### Test 4: No Birthdays
1. Ensure no employees have today's birthday
2. Login
3. No modal should appear
4. System silently continues

## 🔧 Troubleshooting

### Birthday modal doesn't appear

**Check:**
1. Is there an employee with today's birth month/day in Airtable?
2. Is "Date of Birth" field populated?
3. Check browser console for errors
4. Verify localStorage: `localStorage.getItem('birthdayModalShown')`
   - If it shows today's date, clear it to test again

### Can't send wishes

**Check:**
1. Is "Birthday Wishes" table created in Airtable?
2. Are all field names exactly correct (case-sensitive)?
3. Is worker deployed? Run: `wrangler deploy`
4. Check browser console for API errors
5. Verify you're logged in: `sessionStorage.getItem('currentUser')`

### Wishes don't appear in "View All Wishes"

**Check:**
1. Are wishes saved in Airtable Birthday Wishes table?
2. Is the Date field set to today?
3. Are "To Employees" links correct?
4. Check browser console for fetch errors

### Worker errors

**Common Issues:**
- 404: Worker not deployed or route not added
- 422: Field names don't match Airtable
- 401: API keys not set as secrets

**Solutions:**
```bash
# Redeploy worker
wrangler deploy

# Check secrets
wrangler secret list

# Set secrets if missing
wrangler secret put AIRTABLE_API_KEY
wrangler secret put AIRTABLE_BASE_ID
```

## 📝 API Endpoints

### Get Birthday Wishes
```
GET /api/birthday-wishes
Optional: ?filterByFormula=...
```

### Create Birthday Wish
```
POST /api/birthday-wishes
Body: {
  "fields": {
    "From Employee": ["recXXXXX"],
    "To Employees": ["recYYYYY", "recZZZZZ"],
    "Message": "Happy birthday!",
    "Date": "2025-11-30",
    "From Name": "John Doe",
    "To Names": "Jane Smith, Bob Johnson"
  }
}
```

## 🎯 Production Checklist

Before going live:

- [ ] "Birthday Wishes" table created in Airtable
- [ ] All required fields added with correct types
- [ ] Worker deployed: `wrangler deploy`
- [ ] Tested sending wishes
- [ ] Tested viewing wishes
- [ ] Tested with single birthday
- [ ] Tested with multiple birthdays
- [ ] Tested once-per-day display
- [ ] Verified mobile compatibility
- [ ] Checked browser console for errors

## 🎁 Future Enhancements (Optional)

Ideas for extending the system:
- Email notifications to celebrants
- Wish editing/deletion
- Reactions/likes on wishes
- Birthday wish templates
- Birthday statistics dashboard
- Birthday reminder emails (day before)
- Custom birthday badges in profile

## 📚 Files Modified

1. `shared-modal.js` - Birthday modal with wishes UI
2. `config-worker.js` - Added getBirthdayWishes() and createBirthdayWish()
3. `api-worker.js` - Added /api/birthday-wishes endpoint and handler
4. All authenticated pages - Included shared-modal.js

## 🆘 Support

If you encounter issues:
1. Check this guide's troubleshooting section
2. Verify Airtable schema matches exactly
3. Check browser console for errors
4. View worker logs: `wrangler tail`
5. Test with the test page: `test-birthday.html`
