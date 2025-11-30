# Shift-Based Attendance System - Complete Guide

## 🔄 Overview

The attendance system now supports shift-based time tracking with automatic late validation based on each shift's schedule.

## 📋 Available Shifts

### 1. Morning Production (Day)
- **Schedule:** 8:00 AM to 6:00 PM
- **Late Threshold:** After 8:30 AM
- **Department:** Production
- **Duration:** 10 hours

### 2. Night Production
- **Schedule:** 8:00 PM to 6:00 AM (next day)
- **Late Threshold:** After 8:30 PM
- **Department:** Production
- **Duration:** 10 hours
- **Note:** Crosses midnight

### 3. Straight Shift
- **Schedule:** 8:00 AM to 5:00 PM
- **Late Threshold:** After 8:30 AM
- **Department:** All departments (standard shift)
- **Duration:** 9 hours

### 4. Hybrid (Customer Service)
- **First Shift:** 7:00 AM to 2:00 PM
  - Late Threshold: After 7:30 AM
- **Second Shift:** 2:00 PM to 9:00 PM
  - Late Threshold: After 2:30 PM
- **Department:** Customer Service only
- **Duration:** 7 hours per shift

## 🎯 How It Works

### For Employees

#### Check-In Process:
1. **Navigate** to Attendance Tracker page
2. **Select your shift** from the dropdown menu
3. **Click "Check In"** button
4. If late, provide a reason in the modal
5. Your shift is locked after check-in

#### Late Detection:
- System automatically detects if you're checking in late
- Late threshold varies by shift type
- If late, you must provide a reason before check-in completes

#### Shift Selection Rules:
- Must select shift before checking in
- Shift cannot be changed after check-in
- Shift persists for the entire work day
- System remembers your shift if you reload the page

### For Administrators

#### Airtable Setup Required:

**Attendance Table - Add Shift Field:**
```
Field Name: Shift
Type: Single select
Options:
  - Morning Production (Day)
  - Night Production
  - Straight Shift
  - Hybrid (Customer Service)
```

#### Monitoring Attendance:
- View shift information in attendance history table
- Filter/sort by shift type
- Track late arrivals per shift
- Analyze shift patterns

## 🔧 Technical Details

### Shift Configuration

The system uses the following configuration:

```javascript
const SHIFT_CONFIGS = {
  "Morning Production (Day)": {
    start: "08:00",
    end: "18:00",
    lateThreshold: "08:30"
  },
  "Night Production": {
    start: "20:00",
    end: "06:00",
    lateThreshold: "20:30"
  },
  "Straight Shift": {
    start: "08:00",
    end: "17:00",
    lateThreshold: "08:30"
  },
  "Hybrid (Customer Service)": {
    start: "07:00",
    end: "14:00",
    lateThreshold: "07:30",
    secondShiftStart: "14:00",
    secondShiftEnd: "21:00",
    secondShiftLateThreshold: "14:30"
  }
};
```

### Late Detection Logic

#### Day Shifts (Morning Production & Straight):
- Check if current time > late threshold
- Example: Checking in at 8:45 AM = Late

#### Night Shift:
- Handles midnight crossover
- Late if checking in after 8:30 PM
- Early morning check-ins (before 6 AM) are normal

#### Hybrid Shift:
- Two separate time windows
- First shift (7am-2pm): Late after 7:30 AM
- Second shift (2pm-9pm): Late after 2:30 PM
- System auto-detects which window based on check-in time

### Data Storage

**Attendance Record Fields:**
- `Shift` - The selected shift type
- `Check In` - Timestamp with timezone
- `Check Out` - Timestamp with timezone
- `Late Reason` - Required if late
- `Check In Location` - IP-based location
- `IP Address` - Employee's IP

### UI Components

**Shift Selector:**
- Dropdown with 4 shift options
- Required field (cannot be empty)
- Disabled after check-in
- Pre-selected if returning to page after check-in

**Today's Status Panel:**
- Shows selected shift
- Displays check-in/out times
- Calculates hours worked
- Updates in real-time

**Attendance History Table:**
- New "Shift" column
- Color-coded shift badges
- Late status based on shift rules
- Full shift name on hover

## 📊 Airtable Schema

### Required Fields

```
Table: Attendance

Fields:
  Employee (Link to Employees, array format required)
  Date (Date)
  Shift (Single select) ⭐ NEW
  Check In (Single line text or Date/Time)
  Check Out (Single line text or Date/Time)
  Check In Location (Long text)
  Check Out Location (Long text)
  IP Address (Single line text)
  Late Reason (Long text)
```

### Single Select Options

Create exactly these options in the Shift field:
1. `Morning Production (Day)`
2. `Night Production`
3. `Straight Shift`
4. `Hybrid (Customer Service)`

**Important:** Names must match exactly (case-sensitive)

## 🚀 Deployment Steps

### Step 1: Update Airtable
1. Open Attendance table
2. Add new field: `Shift` (Single select)
3. Add the 4 shift options (exact names)
4. Optionally add `Late Reason` field if not exists

### Step 2: Deploy Frontend
```bash
# Files already updated:
# - attendance-tracker.html (shift selection UI + logic)
# - CLAUDE.md (documentation)

# Commit and push
git add .
git commit -m "Add shift-based attendance system with automatic late validation

🤖 Generated with [Claude Code](https://claude.com/claude-code)

Co-Authored-By: Claude <noreply@anthropic.com>"
git push origin main
```

### Step 3: Wait for Deployment
- Cloudflare Pages auto-deploys in 1-2 minutes
- No Worker changes required (shift is just a field)

### Step 4: Test
1. Navigate to attendance-tracker.html
2. Select a shift
3. Check in
4. Verify shift appears in "Today's Status"
5. Check Airtable for Shift field populated

## 🧪 Testing Scenarios

### Test 1: On-Time Check-In
1. Select "Morning Production (Day)"
2. Check in before 8:30 AM
3. Verify no late modal appears
4. Verify shift saved to Airtable

### Test 2: Late Check-In
1. Select "Straight Shift"
2. Check in after 8:30 AM
3. Late reason modal should appear
4. Enter reason and submit
5. Verify "Late Reason" saved in Airtable

### Test 3: Night Shift
1. Select "Night Production"
2. Check in between 8:00 PM - 6:00 AM
3. Should work normally
4. Late only if after 8:30 PM

### Test 4: Hybrid Shift - First Window
1. Select "Hybrid (Customer Service)"
2. Check in at 7:15 AM (on time)
3. Verify no late modal
4. Check in at 7:45 AM (late)
5. Verify late modal appears

### Test 5: Hybrid Shift - Second Window
1. Select "Hybrid (Customer Service)"
2. Check in at 2:15 PM (on time)
3. Verify no late modal
4. Check in at 2:45 PM (late)
5. Verify late modal appears

### Test 6: Shift Persistence
1. Check in with any shift
2. Reload page
3. Verify shift still displayed
4. Verify shift selector is disabled

## 📝 Admin Reporting

### Useful Airtable Views

**By Shift Type:**
- Group by: Shift
- Sort by: Date (descending)

**Late Arrivals:**
- Filter: Late Reason is not empty
- Group by: Shift

**Night Shift Tracking:**
- Filter: Shift = "Night Production"
- Sort by: Date

**Customer Service Performance:**
- Filter: Shift = "Hybrid (Customer Service)"
- Group by: Employee

## ⚠️ Important Notes

### For Employees:
- ✅ Always select your correct shift
- ✅ Shift cannot be changed after check-in
- ✅ You can only check in/out once per day
- ✅ Late arrivals require explanation

### For Admins:
- ✅ Shift field is required for all new attendance records
- ✅ Old records without shift will show "-" in history
- ✅ Monitor late reasons for patterns
- ✅ Adjust shift schedules in code if needed

### System Behavior:
- 🔒 Shift selector locks after check-in
- 🔒 Cannot check in twice in one day
- 🔒 Cannot change shift after selection
- ⏰ Late detection is automatic
- 📍 Location still recorded via IP

## 🔄 Future Enhancements

Possible additions:
- [ ] Automatic shift assignment by employee role
- [ ] Shift schedule templates
- [ ] Shift swap requests
- [ ] Overtime tracking per shift
- [ ] Email notifications for shift changes
- [ ] Shift performance analytics
- [ ] Mobile app for shift selection

## 🆘 Troubleshooting

### Issue: "Shift field not found" error
**Solution:** Add `Shift` field to Attendance table in Airtable

### Issue: Shift dropdown is empty
**Solution:** Refresh page, check browser console for errors

### Issue: Late modal appearing incorrectly
**Solution:**
- Verify shift selection matches actual shift
- Check system time is correct
- Review shift configuration in code

### Issue: Shift not saving to Airtable
**Solution:**
- Verify field name is exactly "Shift" (case-sensitive)
- Check Single Select options match exactly
- View browser console for API errors

### Issue: Old records show "-" for shift
**Solution:** This is normal - shift system is new. Old records won't have shift data.

## 📚 Related Files

- `attendance-tracker.html` - Main attendance page with shift UI
- `CLAUDE.md` - Project documentation
- `config-worker.js` - API helper functions (no changes needed)
- `api-worker.js` - Cloudflare Worker (no changes needed)

## 📞 Support

If issues persist:
1. Check Airtable schema matches exactly
2. Review browser console for errors
3. Verify Cloudflare Pages deployment completed
4. Test with different shifts
5. Check system date/time settings
