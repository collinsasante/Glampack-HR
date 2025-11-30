# Quick Start: Security Implementation

## ⚡ Fast Track Deployment (1 hour)

This is a condensed version of the security deployment. For detailed instructions, see `SECURITY-DEPLOYMENT-GUIDE.md`.

---

## ✅ Pre-Flight Checklist

- [ ] Airtable base exported (backup)
- [ ] Current worker code saved
- [ ] Node.js installed (v14+)
- [ ] Wrangler installed (`npm install -g wrangler`)
- [ ] Cloudflare account access
- [ ] 1 hour of uninterrupted time

---

## 🚀 5-Step Deployment

### Step 1: Update Airtable (5 min)

Add to **Employees** table:
```
- Account Status (Single Select: Active, Inactive, Suspended)
- Password Reset Required (Checkbox)
- Last Login (Date/Time)
- Failed Login Attempts (Number)
```

### Step 2: Setup Worker (15 min)

```bash
# Navigate to project
cd /Users/breezyyy/Glampack-HR/techzaa.in/techauth

# Create worker directory
mkdir secure-worker && cd secure-worker

# Initialize
npm init -y
npm install bcryptjs jsonwebtoken

# Copy secure worker
cp ../api-worker-secure.js src/index.js

# Generate & set secrets
JWT_SECRET=$(openssl rand -base64 32)
echo "Save this: $JWT_SECRET"

wrangler secret put JWT_SECRET
# Paste the secret

wrangler secret put AIRTABLE_API_KEY
# Paste your key

wrangler secret put AIRTABLE_BASE_ID
# Paste your base ID
```

### Step 3: Migrate Passwords (10 min)

```bash
# Edit migration script
nano ../migrate-passwords.js
# Update AIRTABLE_API_KEY and AIRTABLE_BASE_ID

# Install bcrypt
cd ..
npm install bcryptjs

# Run migration
node migrate-passwords.js

# Verify: Check Airtable - passwords should start with $2a$
```

### Step 4: Deploy Worker (10 min)

```bash
cd secure-worker
wrangler deploy

# Test
curl https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/verify
# Should return: {"error":"Unauthorized"}
```

### Step 5: Update Frontend (15 min)

```bash
cd ..

# Backup current auth
cp auth.js auth.js.backup

# Use secure version
cp auth-secure.js auth.js

# Update HTML files to include v=2
# Find all: <script src="auth.js"></script>
# Replace: <script src="auth.js?v=2"></script>

# Test login on local server
python3 -m http.server 8000
# Visit http://localhost:8000
```

---

## 🧪 Quick Testing (10 min)

### Test 1: Login
- [ ] Go to login page
- [ ] Enter existing credentials
- [ ] Verify successful login
- [ ] Check localStorage for `authToken`

### Test 2: Signup
- [ ] Create new account
- [ ] Verify auto-login
- [ ] Check Airtable - password should be hashed

### Test 3: Protected Page
- [ ] Visit dashboard without login
- [ ] Verify redirect to login
- [ ] Login and verify access granted

### Test 4: Rate Limiting
- [ ] Attempt 6 wrong passwords
- [ ] Verify "Too many attempts" message

### Test 5: Admin Access
- [ ] Login as employee
- [ ] Try to visit admin-dashboard.html
- [ ] Verify redirect to dashboard
- [ ] Login as admin
- [ ] Verify access granted

---

## 🐛 Quick Troubleshooting

### Problem: Can't login

**Solution:**
```bash
# Check migration completed
node migrate-passwords.js

# Check worker deployed
wrangler tail
# Look for errors

# Check browser console
# F12 > Console > Look for errors
```

### Problem: API calls fail

**Solution:**
```bash
# Verify token in localStorage
# F12 > Application > Local Storage > authToken

# Check Authorization header
# F12 > Network > Select request > Headers
# Should see: Authorization: Bearer eyJ...
```

### Problem: Worker errors

**Solution:**
```bash
# View live logs
wrangler tail

# Check secrets set
wrangler secret list

# Redeploy
wrangler deploy
```

---

## 🔄 Rollback (If Needed)

```bash
# Restore old worker
cd /path/to/old/worker
wrangler deploy

# Restore old auth
cp auth.js.backup auth.js

# Clear browser cache
# Ctrl+Shift+Del > Clear site data

# Inform users to re-login
```

---

## 📊 Success Criteria

Deployment is successful when:

✅ All existing users can login
✅ New signups work
✅ Tokens stored in localStorage
✅ Protected pages require login
✅ Admin pages require admin role
✅ Rate limiting blocks brute force
✅ Token refresh works automatically
✅ API calls include Authorization header

---

## 🎯 Post-Deployment

### Immediate (Today)
- [ ] Delete `migrate-passwords.js`
- [ ] Test with 5-10 users
- [ ] Monitor worker logs for errors
- [ ] Check Airtable for failed login attempts

### Within 1 Week
- [ ] Verify all employees logged in successfully
- [ ] Review rate limiting effectiveness
- [ ] Check token expiration handling
- [ ] Gather user feedback

### Within 1 Month
- [ ] Conduct security audit
- [ ] Review access logs
- [ ] Rotate JWT_SECRET
- [ ] Update documentation

---

## 📞 Emergency Contacts

**Worker Issues:**
```bash
wrangler tail
# View live logs
```

**Airtable Issues:**
- Check Airtable status: https://status.airtable.com

**Can't Rollback:**
- Follow `SECURITY-DEPLOYMENT-GUIDE.md` > Rollback Plan

---

## 🔐 Security Reminders

1. ✅ JWT_SECRET is 32+ characters random
2. ✅ Passwords are bcrypt hashed (cost 10)
3. ✅ Tokens expire after 8 hours
4. ✅ Rate limiting prevents brute force
5. ✅ HTTPS enforced on all pages
6. ✅ No passwords in git
7. ✅ Airtable access restricted
8. ✅ Worker logs don't expose secrets

---

## ✨ You're Done!

Your HR system now has:
- 🔒 Bcrypt password hashing
- 🎫 JWT authentication
- 🛡️ Rate limiting
- 🚫 Brute force protection
- ✅ Production-ready security

**Next:** Consider adding 2FA, email notifications, and audit logging.

---

**Questions?** See `SECURITY-DEPLOYMENT-GUIDE.md` for detailed info.
**Issues?** Check `SECURITY-IMPLEMENTATION-SUMMARY.md` for troubleshooting.

---

*Deployment Time: ~1 hour | Difficulty: Medium | Reversible: Yes*
