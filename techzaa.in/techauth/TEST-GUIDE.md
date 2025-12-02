# Security Features Testing Guide

## Prerequisites

Before testing, ensure:
- [ ] You're in the production-ready branch: `git branch` shows `* production-ready`
- [ ] You have wrangler CLI installed: `wrangler --version`
- [ ] You have access to Cloudflare account

## Step 1: Set JWT Secret (Required)

```bash
# Generate a secure secret
openssl rand -base64 32
```

Copy the output, then:

```bash
# Set the secret in Cloudflare
wrangler secret put JWT_SECRET
# Paste the secret when prompted and press Enter
```

Verify it's set:
```bash
wrangler secret list
```

Expected output should include `JWT_SECRET`.

## Step 2: Deploy the Worker

```bash
# Deploy from project directory
cd "/Users/breezyyy/Downloads/Glampack-HR/techzaa.in/techauth"
wrangler deploy
```

Expected output:
```
✨ Built successfully
✨ Successfully published your script to
https://glampack-hr-api.mr-asanteeprog.workers.dev
```

## Step 3: Test Security Headers

```bash
# Check security headers are present
curl -I https://glampack-hr-api.mr-asanteeprog.workers.dev/api/employees
```

**Expected headers**:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-Request-ID: <some-uuid>
```

✅ **PASS**: All 5 security headers present
❌ **FAIL**: Missing headers - check Worker deployment

## Step 4: Test Password Hashing (New Account)

Create a test account with hashed password:

```bash
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security-test@example.com",
    "password": "TestPassword123!",
    "fullName": "Security Test User",
    "department": "IT",
    "jobTitle": "Test Engineer"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "recXXXXXXXXXXXXXX",
    "email": "security-test@example.com",
    "fullName": "Security Test User",
    "role": "Employee",
    "department": "IT",
    "jobTitle": "Test Engineer"
  }
}
```

**Verify in Airtable**:
1. Open your Airtable base
2. Go to Employees table
3. Find "security-test@example.com"
4. Check Password field

✅ **PASS**: Password looks like `a1b2c3d4e5f6...$hash...` (long hex string with $ separator)
❌ **FAIL**: Password shows plain text "TestPassword123!" - hashing not working

## Step 5: Test JWT Token Authentication

Using the token from Step 4:

```bash
# Decode the JWT token to check expiration (copy token from Step 4 response)
TOKEN="<paste-token-here>"

# Decode payload (works in bash with base64)
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -m json.tool
```

**Expected output**:
```json
{
  "id": "recXXXXXXXXXXXXXX",
  "email": "security-test@example.com",
  "role": "Employee",
  "exp": 1733234567
}
```

**Verify expiration**:
```bash
# Check if exp is ~24 hours from now
echo "Token expires at:"
date -r $(echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | python3 -c "import sys, json; print(json.load(sys.stdin)['exp'])")
```

✅ **PASS**: Expiration is approximately 24 hours from now
❌ **FAIL**: Expiration is wrong or missing

## Step 6: Test Login with Hashed Password

Login with the account created in Step 4:

```bash
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security-test@example.com",
    "password": "TestPassword123!"
  }'
```

**Expected response**:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "recXXXXXXXXXXXXXX",
    "email": "security-test@example.com",
    "fullName": "Security Test User",
    "role": "Employee"
  }
}
```

✅ **PASS**: Login successful with hashed password
❌ **FAIL**: Error returned - password verification issue

## Step 7: Test Auto-Upgrade (Existing Plain Text Password)

If you have an existing account with plain text password in Airtable:

1. **Before**: Check Airtable - Password should be plain text (e.g., "mypassword")
2. **Login**:
   ```bash
   curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "existing-user@example.com",
       "password": "mypassword"
     }'
   ```
3. **After**: Check Airtable - Password should now be hashed (e.g., "a1b2c3...$hash")

✅ **PASS**: Password auto-upgraded to hash after login
❌ **FAIL**: Password still plain text after login

## Step 8: Test Rate Limiting (Login)

Try 6 failed login attempts quickly:

```bash
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrongpassword"}'
  echo -e "\n---"
done
```

**Expected behavior**:
- Attempts 1-5: `{"error":"Invalid email or password"}` (401)
- Attempt 6: `{"error":"Too many login attempts. Please try again later.","retryAfter":XX}` (429)

✅ **PASS**: 6th attempt returns 429 with retryAfter
❌ **FAIL**: All attempts return 401 - rate limiting not working

## Step 9: Test Rate Limiting (Signup)

Try 4 signup attempts with same IP:

```bash
for i in {1..4}; do
  echo "Signup attempt $i:"
  curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/signup \
    -H "Content-Type: application/json" \
    -d "{
      \"email\":\"test$i@example.com\",
      \"password\":\"Test1234!\",
      \"fullName\":\"Test User $i\"
    }"
  echo -e "\n---"
done
```

**Expected behavior**:
- Attempts 1-3: Successful signup or email exists error
- Attempt 4: `{"error":"Too many signup attempts. Please try again later.","retryAfter":XX}` (429)

✅ **PASS**: 4th attempt returns 429
❌ **FAIL**: All attempts succeed - rate limiting not working

## Step 10: Test Input Validation

### Test 10a: Invalid Email Format

```bash
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"test"}'
```

**Expected**: `{"error":"Invalid email format"}` (400)

✅ **PASS**: Returns 400 with email error
❌ **FAIL**: Accepts invalid email

### Test 10b: XSS Characters Sanitized

```bash
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"xss@example.com",
    "password":"Test1234!",
    "fullName":"<script>alert(1)</script>"
  }'
```

**Check Airtable**: Full Name field should NOT contain `<script>` tags (should be sanitized to "scriptalert1/script")

✅ **PASS**: XSS characters removed
❌ **FAIL**: Script tags present in database

### Test 10c: Password Too Short

```bash
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"short@example.com",
    "password":"test",
    "fullName":"Short Pass User"
  }'
```

**Expected**: `{"error":"Password must be at least 8 characters long"}` (400)

✅ **PASS**: Rejects short password
❌ **FAIL**: Accepts password < 8 characters

## Step 11: Test Change Password

Using the test account from Step 4:

```bash
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/change-password \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security-test@example.com",
    "oldPassword": "TestPassword123!",
    "newPassword": "NewPassword456!"
  }'
```

**Expected**: `{"success":true,"message":"Password updated successfully"}` (200)

**Verify**:
1. Check Airtable - Password hash should be different now
2. Try logging in with old password - should fail
3. Try logging in with new password - should succeed

✅ **PASS**: Password changed, old password fails, new password works
❌ **FAIL**: Old password still works or change failed

## Step 12: Test Security Event Logging

Monitor Worker logs while testing:

```bash
# Open new terminal window
wrangler tail --format pretty
```

Perform a login in another terminal:
```bash
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "security-test@example.com",
    "password": "NewPassword456!"
  }'
```

**Expected log output**:
```json
{
  "timestamp": "2025-12-02T...",
  "event": "login_success",
  "userId": "recXXXXX",
  "email": "sec***",
  "role": "Employee",
  "ip": "123.45.67.89"
}
```

✅ **PASS**: Logs show login_success event with redacted email
❌ **FAIL**: No logs or unredacted sensitive data

## Step 13: Test Backward Compatibility

If you have existing users with plain text passwords:

1. **Login with existing account**:
   ```bash
   curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{
       "email": "<your-existing-user@example.com>",
       "password": "<their-plain-text-password>"
     }'
   ```

2. **Check response**: Should return success with token

3. **Check Airtable**: Password should now be hashed

4. **Login again** with same credentials: Should still work

✅ **PASS**: Existing users can login, passwords auto-upgrade
❌ **FAIL**: Existing users cannot login

## Test Results Summary

Record your test results:

| Test | Expected | Actual | Status |
|------|----------|--------|--------|
| 1. JWT Secret Set | Secret in list | | ⬜ |
| 2. Worker Deployed | Deployment success | | ⬜ |
| 3. Security Headers | All 5 headers present | | ⬜ |
| 4. Password Hashing | Hash with $ separator | | ⬜ |
| 5. JWT Token | Valid token with 24h exp | | ⬜ |
| 6. Login with Hash | Success | | ⬜ |
| 7. Auto-Upgrade | Plain → Hash after login | | ⬜ |
| 8. Rate Limit Login | 429 on 6th attempt | | ⬜ |
| 9. Rate Limit Signup | 429 on 4th attempt | | ⬜ |
| 10a. Email Validation | 400 for invalid email | | ⬜ |
| 10b. XSS Sanitization | Script tags removed | | ⬜ |
| 10c. Password Length | 400 for short password | | ⬜ |
| 11. Change Password | Success, old fails | | ⬜ |
| 12. Security Logging | Events logged, redacted | | ⬜ |
| 13. Backward Compat | Existing users work | | ⬜ |

**Overall Score**: ___/15 tests passed

## Troubleshooting

### Issue: "JWT_SECRET not found"
```bash
wrangler secret put JWT_SECRET
# Paste a strong secret (use: openssl rand -base64 32)
```

### Issue: Rate limiting not working after Worker restart
This is expected - in-memory rate limiter resets on deployment. For production, upgrade to Cloudflare KV (see PRODUCTION-SECURITY.md).

### Issue: Cannot decode JWT token
```bash
# Install jq for easier JSON parsing
brew install jq  # macOS
# or
sudo apt-get install jq  # Linux

# Decode with jq
echo $TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null | jq .
```

### Issue: CORS errors in browser
The Worker allows all origins (`Access-Control-Allow-Origin: *`). For production, update to specific domain.

### Issue: "Invalid email or password" for known good credentials
1. Check Airtable - verify email spelling matches exactly
2. Check password field - if hashed, use `/api/auth/login`
3. Check Worker logs: `wrangler tail`

## Next Steps After Testing

If all tests pass:

1. **Document Results**: Share test results with team
2. **Plan Migration**: Schedule auto-upgrade rollout
3. **Update Frontend**: Integrate `/api/auth/login` endpoints (optional)
4. **Enable HSTS**: Uncomment header for production
5. **Update CORS**: Whitelist production domain
6. **Monitor Logs**: Set up Cloudflare alerts

If tests fail:

1. **Check Worker Logs**: `wrangler tail --format pretty`
2. **Review Secrets**: `wrangler secret list`
3. **Re-deploy**: `wrangler deploy`
4. **Report Issues**: See PRODUCTION-SECURITY.md for debugging

## Clean Up Test Data

After testing, remove test accounts:

1. Go to Airtable Employees table
2. Delete test accounts:
   - security-test@example.com
   - test@example.com
   - test1@example.com, test2@example.com, etc.
   - xss@example.com
   - short@example.com

---

**Questions?** See [PRODUCTION-SECURITY.md](PRODUCTION-SECURITY.md) or [QUICK-START.md](QUICK-START.md)
