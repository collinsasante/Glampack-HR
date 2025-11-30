# Security Deployment Guide

## 🔐 Implementing Password Hashing & JWT Authentication

This guide walks you through deploying the secure authentication system with bcrypt password hashing and JWT tokens.

---

## ⚠️ IMPORTANT: READ BEFORE PROCEEDING

**This deployment will:**
- Replace plain-text password storage with bcrypt hashes
- Implement JWT token-based authentication
- Add rate limiting to prevent brute force attacks
- Require all API calls to include authentication tokens

**Estimated deployment time:** 1-2 hours

**Recommended time:** Off-peak hours or weekend

---

## 📋 Prerequisites

1. **Access to Cloudflare Dashboard**
   - Worker deployment permissions
   - Environment variable management

2. **Access to Airtable**
   - Admin access to the base
   - Ability to add fields

3. **Node.js installed** (for migration script)
   - Version 14 or higher
   - npm package manager

4. **Backup your data**
   - Export Airtable base
   - Save current worker code

---

## 🚀 Deployment Steps

### Step 1: Update Airtable Schema (5 minutes)

Add these fields to the **Employees** table:

| Field Name | Type | Description |
|------------|------|-------------|
| `Password Reset Required` | Checkbox | Marks if user must reset password |
| `Account Status` | Single Select | Options: Active, Inactive, Suspended |
| `Last Login` | Date/Time | Tracks last successful login |
| `Failed Login Attempts` | Number | Tracks failed login count |

**Steps:**
1. Open your Airtable base
2. Go to Employees table
3. Click "+" to add each field
4. Configure field types as specified
5. Set default values:
   - `Account Status`: Active
   - `Failed Login Attempts`: 0

---

### Step 2: Install Dependencies (10 minutes)

Create a new directory for your secure worker:

```bash
# Navigate to project directory
cd /Users/breezyyy/Glampack-HR/techzaa.in/techauth

# Create worker project directory
mkdir secure-worker
cd secure-worker

# Initialize npm project
npm init -y

# Install dependencies
npm install bcryptjs jsonwebtoken

# Install Wrangler (if not already installed)
npm install -g wrangler

# Login to Cloudflare
wrangler login
```

---

### Step 3: Setup Worker Project (15 minutes)

1. **Create wrangler.toml**:

```toml
name = "glampack-hr-api-secure"
main = "src/index.js"
compatibility_date = "2024-01-01"

[env.production]
name = "glampack-hr-api"
route = "glampack-hr-api.mr-asanteeprog.workers.dev/*"

[build]
command = "npm install && npm run build"

[[build.upload]]
format = "modules"
dir = "dist"
```

2. **Copy api-worker-secure.js** to `src/index.js`:

```bash
cp ../api-worker-secure.js src/index.js
```

3. **Set environment variables**:

```bash
# Generate JWT secret
JWT_SECRET=$(openssl rand -base64 32)
echo "JWT_SECRET: $JWT_SECRET"

# Set secrets in Cloudflare
wrangler secret put JWT_SECRET
# Paste the generated secret

wrangler secret put AIRTABLE_API_KEY
# Paste your Airtable API key

wrangler secret put AIRTABLE_BASE_ID
# Paste your Airtable base ID

wrangler secret put CLOUDINARY_CLOUD_NAME
# Paste your Cloudinary cloud name

wrangler secret put CLOUDINARY_API_KEY
# Paste your Cloudinary API key

wrangler secret put CLOUDINARY_API_SECRET
# Paste your Cloudinary API secret
```

---

### Step 4: Migrate Existing Passwords (20 minutes)

**CRITICAL:** This step hashes all existing plain-text passwords.

1. **Update migration script**:

Open `migrate-passwords.js` and update:
```javascript
const AIRTABLE_API_KEY = 'YOUR_ACTUAL_KEY';
const AIRTABLE_BASE_ID = 'YOUR_ACTUAL_BASE_ID';
```

2. **Install bcryptjs** (if not already):

```bash
npm install bcryptjs
```

3. **Run migration**:

```bash
node migrate-passwords.js
```

4. **Verify migration**:

```bash
# Check a few employee records in Airtable
# Password field should now show hashed values like:
# $2a$10$XYZ123... (instead of plain text)
```

5. **Test login** (before deploying worker):

Save a test account password before migration, verify you can still login after.

---

### Step 5: Deploy Secure Worker (10 minutes)

```bash
# Build and deploy
wrangler deploy

# Verify deployment
curl https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/verify

# Should return: {"error": "Unauthorized"}
```

---

### Step 6: Update Frontend (15 minutes)

1. **Backup current auth.js**:

```bash
cp auth.js auth.js.backup
```

2. **Replace with secure version**:

```bash
cp auth-secure.js auth.js
```

3. **Update all HTML files** that include auth.js:

Replace:
```html
<script src="auth.js"></script>
```

With:
```html
<script src="auth.js?v=2"></script>
```

Files to update:
- index.html
- signin-2.html
- signup-2.html
- packaging-glamour-signin.html
- packaging-glamour-signup.html
- dashboard.html
- attendance-tracker.html
- leave-request.html
- profile.html
- payroll.html
- announcements.html
- medical-claims.html
- admin-dashboard.html
- admin-medical-claims.html

4. **Update config-worker.js** to include JWT token:

```javascript
// At the top of each API function, add:
const token = localStorage.getItem('authToken');
if (token) {
  headers['Authorization'] = `Bearer ${token}`;
}
```

---

### Step 7: Testing (30 minutes)

#### Test Login Flow

1. **Test with existing account**:
   - Go to login page
   - Enter email/password (should be migrated)
   - Verify successful login
   - Check localStorage for `authToken`

2. **Test signup**:
   - Create new account
   - Verify password is hashed in Airtable
   - Check auto-login works

3. **Test token expiration**:
   - Wait 8+ hours OR manually expire token
   - Try to access protected page
   - Verify redirect to login

4. **Test rate limiting**:
   - Attempt 6 failed logins
   - Verify 429 error after 5 attempts
   - Wait 15 minutes, verify can login again

#### Test Protected Pages

Visit each page and verify:
- ✅ Redirects to login if no token
- ✅ Loads correctly with valid token
- ✅ API calls include Authorization header

#### Test Admin Access

1. Login as employee (role: Employee)
2. Try to access admin-dashboard.html
3. Verify redirect to dashboard.html

4. Login as admin (role: Admin)
5. Verify can access admin-dashboard.html

---

## 🔧 Rollback Plan (If Something Goes Wrong)

### Immediate Rollback

```bash
# 1. Redeploy old worker
cd /path/to/old/worker
wrangler deploy

# 2. Restore old auth.js
cp auth.js.backup auth.js

# 3. Clear browser storage
# Instruct users to: Ctrl+Shift+Delete > Clear site data
```

### Password Rollback

**⚠️ NOT RECOMMENDED - Passwords are now hashed**

If absolutely necessary:
1. Contact each user
2. They use "Forgot Password" to reset
3. OR manually set temporary passwords in Airtable

---

## 📊 Post-Deployment Checklist

- [ ] All existing users can login
- [ ] New signups work correctly
- [ ] Tokens are stored in localStorage
- [ ] API calls include Authorization header
- [ ] Rate limiting prevents brute force
- [ ] Admin pages require admin role
- [ ] Token refresh works automatically
- [ ] Password reset flow works
- [ ] Mobile/tablet login works
- [ ] Cross-browser compatibility verified

---

## 🐛 Troubleshooting

### Issue: "Invalid email or password" for all users

**Cause:** Migration script didn't run or failed

**Fix:**
```bash
# Re-run migration
node migrate-passwords.js

# Check migration logs for errors
```

---

### Issue: "Unauthorized" on all API calls

**Cause:** Frontend not sending JWT token

**Fix:**
1. Check if `authToken` exists in localStorage
2. Verify Authorization header in Network tab
3. Update config-worker.js to include token

---

### Issue: "Token expired" immediately

**Cause:** Server time mismatch or JWT_SECRET changed

**Fix:**
```bash
# Verify JWT_SECRET is set
wrangler secret list

# Check worker logs
wrangler tail
```

---

### Issue: Users can't login after migration

**Cause:** Migration corrupted passwords

**Fix:**
1. Enable "Password Reset Required" for all users
2. Send password reset emails
3. Users create new passwords

---

## 🔒 Additional Security Measures (Optional but Recommended)

### 1. Add CSRF Protection

```javascript
// In worker, generate CSRF token
const csrfToken = crypto.randomUUID();

// Return in login response
return { token, csrfToken };

// Validate on state-changing requests
if (request.headers.get('X-CSRF-Token') !== expectedToken) {
  return 403;
}
```

### 2. Add Email Verification

```javascript
// On signup, send verification email
fields['Email Verified'] = false;

// User clicks link with token
// Worker verifies and sets Email Verified = true
```

### 3. Add 2FA (Two-Factor Authentication)

Use services like:
- Authy
- Google Authenticator
- SMS via Twilio

### 4. Add Audit Logging

Create Airtable table:
```
AuditLog
- Timestamp (DateTime)
- User (Link to Employees)
- Action (Single line text)
- IP Address (Single line text)
- Details (Long text)
```

### 5. Add Session Management

Track active sessions:
- Max 3 devices per user
- Remote logout capability
- Session timeout

---

## 📈 Monitoring

### Cloudflare Analytics

Monitor:
- Request count per endpoint
- Error rate
- Response time
- Geographic distribution

### Airtable Monitoring

Track:
- Failed login attempts per user
- Account lockouts
- Password reset requests

### Set Up Alerts

```bash
# Example: Email if error rate > 5%
# Configure in Cloudflare Dashboard > Workers > Your Worker > Triggers
```

---

## 🎓 User Communication

### Email Template for Users

```
Subject: Security Upgrade - Enhanced Login

Hi [Name],

We've upgraded our HR system security with the following improvements:

✅ Stronger password encryption
✅ Secure session management
✅ Protection against unauthorized access

What you need to know:
1. Your existing password will continue to work
2. You may need to login again after the upgrade
3. Sessions now expire after 8 hours of inactivity

If you experience any issues logging in, please use the "Forgot Password" link.

Thank you for your cooperation!

IT Team
```

---

## 📞 Support

If you encounter issues during deployment:

1. **Check Worker Logs**:
   ```bash
   wrangler tail
   ```

2. **Check Browser Console**:
   - F12 > Console tab
   - Look for API errors

3. **Verify Environment Variables**:
   ```bash
   wrangler secret list
   ```

4. **Test Endpoints**:
   ```bash
   # Login
   curl -X POST https://your-worker.workers.dev/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"test123"}'
   ```

---

## ✅ Deployment Complete!

Congratulations! Your HR system now has production-grade security:

- ✅ Bcrypt password hashing (10 rounds)
- ✅ JWT authentication with 8-hour expiry
- ✅ Rate limiting (5 attempts / 15 minutes)
- ✅ Secure session management
- ✅ Token refresh mechanism
- ✅ Role-based access control

### Next Steps (Optional):

1. Enable 2FA
2. Add email notifications
3. Implement audit logging
4. Add CSRF protection
5. Set up monitoring alerts
6. Write unit tests
7. Conduct security audit

---

## 🔐 Security Best Practices Going Forward

1. **Never commit secrets** to git
2. **Rotate JWT_SECRET** every 90 days
3. **Review Airtable access** regularly
4. **Monitor failed login attempts**
5. **Keep dependencies updated**
6. **Conduct security audits** quarterly
7. **Train users** on password security
8. **Enable Cloudflare DDoS protection**
9. **Use HTTPS** everywhere
10. **Backup data** regularly

---

**Document Version:** 1.0
**Last Updated:** 2025-01-28
**Author:** Claude Code Security Team
