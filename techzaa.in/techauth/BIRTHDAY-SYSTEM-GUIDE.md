# Birthday System Testing Guide

## 🎂 How to Test the Birthday System with Real Data

### Step 1: Set Up Airtable

1. **Open your Airtable Employees table**
2. **Ensure you have a "Date of Birth" field** (Type: Date)
3. **Add today's date as a birthday for a test employee:**
   - Find an employee record (or create a test one)
   - In the "Date of Birth" field, enter a date with today's month and day
   - Example: If today is November 30, 2025, enter: `1990-11-30` (any year works, only month/day matters)

### Step 2: Test the Live System

**Option A: Using the Test Page (Quickest)**
1. Open `test-birthday.html` in your browser
2. Click "Single Birthday Celebration" to preview
3. Click "Multiple Birthdays Celebration" to see multiple celebrants

**Option B: Using the Real Dashboard (Production Test)**
1. **Important:** First clear the localStorage flag:
   - Open browser DevTools (F12)
   - Go to Console tab
   - Run: `localStorage.removeItem('birthdayModalShown')`

2. **Login to the dashboard:**
   - Go to the sign-in page
   - Login with any employee account

3. **The birthday modal should appear automatically** if:
   - There's an employee with today's birth month/day in Airtable
   - You haven't seen it today already (localStorage check)

### Step 3: Test Multiple Birthdays

1. **Set multiple employees' birthdays to today:**
   - John Mensah: `1990-11-30`
   - Sarah Osei: `1985-11-30`
   - Kwame Asante: `1992-11-30`

2. **Clear localStorage and refresh:**
   ```javascript
   localStorage.removeItem('birthdayModalShown')
   ```

3. **Reload the dashboard** - You should see all celebrants listed

### Step 4: Test the Once-Per-Day Feature

1. **After seeing the modal once**, refresh the page
2. **The modal should NOT appear again** (localStorage prevents it)
3. **To test again**, clear the flag:
   ```javascript
   localStorage.removeItem('birthdayModalShown')
   ```

## 🎨 What You'll See

### Single Birthday:
- Large birthday cake icon (animated pulse)
- "🎉 Happy Birthday! 🎉" header
- Employee name in large red text
- Birthday message
- "Continue" button

### Multiple Birthdays:
- Same cake icon and header
- "X team members are celebrating today!" message
- List of celebrants with:
  - Initial avatar circles
  - Full names
  - Departments
- "Continue" button

## 🔧 Debugging

### If the modal doesn't show:

1. **Check browser console** (F12 → Console) for errors
2. **Verify Airtable has "Date of Birth" field**
3. **Verify the date format** (should be YYYY-MM-DD)
4. **Check localStorage:**
   ```javascript
   localStorage.getItem('birthdayModalShown')
   ```
   If it shows today's date, clear it:
   ```javascript
   localStorage.removeItem('birthdayModalShown')
   ```

5. **Verify employee data:**
   - Open DevTools Console
   - Run: `sessionStorage.getItem('currentUser')`
   - Ensure you're logged in

## 📝 Quick Test Script

Run this in the browser console to manually trigger the birthday modal:

```javascript
// Test single birthday
showBirthdayModal([
  { name: 'John Mensah', department: 'Operations' }
]);

// Test multiple birthdays
showBirthdayModal([
  { name: 'John Mensah', department: 'Operations' },
  { name: 'Sarah Osei', department: 'HR' },
  { name: 'Kwame Asante', department: 'Finance' }
]);

// Clear the "already shown" flag
localStorage.removeItem('birthdayModalShown');
```

## 🎯 Production Checklist

Before going live:

- [ ] Add "Date of Birth" field to Employees table in Airtable
- [ ] Ensure all employees have their birthdates entered
- [ ] Test with at least one employee who has a birthday today
- [ ] Verify the modal appears on all authenticated pages
- [ ] Test the once-per-day prevention works
- [ ] Verify it works on mobile devices
- [ ] Test with multiple celebrants

## 🚀 Files Modified for Birthday System

1. `shared-modal.js` - Birthday modal HTML, logic, and checkBirthdays()
2. `dashboard.html` - Calls checkBirthdays() on load
3. `attendance-tracker.html` - Includes shared-modal.js
4. `leave-request.html` - Includes shared-modal.js
5. `profile.html` - Includes shared-modal.js
6. `payroll.html` - Includes shared-modal.js
7. `medical-claims.html` - Includes shared-modal.js
8. `admin-medical-claims.html` - Includes shared-modal.js
9. `admin-dashboard.html` - Includes shared-modal.js
10. `announcements.html` - Includes shared-modal.js

All authenticated pages now automatically check for birthdays on load!
