# Production Deployment Quick Start

## 🚀 5-Minute Deployment Guide

### Prerequisites
- Cloudflare account with Workers access
- Wrangler CLI installed
- Git repository access

### Step 1: Generate JWT Secret (30 seconds)
```bash
# Run this locally to generate a secure secret
openssl rand -base64 32
```
Copy the output (you'll need it in Step 3)

### Step 2: Navigate to Project (5 seconds)
```bash
cd "/Users/breezyyy/Downloads/Glampack-HR/techzaa.in/techauth"
```

### Step 3: Set Cloudflare Secrets (1 minute)
```bash
# Set JWT secret
wrangler secret put JWT_SECRET
# Paste the secret from Step 1 and press Enter

# Verify secrets are set
wrangler secret list
```

Expected output:
```
[
  {
    "name": "JWT_SECRET",
    "type": "secret_text"
  },
  {
    "name": "AIRTABLE_API_KEY",
    "type": "secret_text"
  },
  {
    "name": "AIRTABLE_BASE_ID",
    "type": "secret_text"
  }
]
```

### Step 4: Deploy Worker (30 seconds)
```bash
wrangler deploy
```

Expected output:
```
✨ Built successfully, built project size is 15 KiB.
✨ Successfully published your script to
https://glampack-hr-api.mr-asanteeprog.workers.dev
```

### Step 5: Test Authentication Endpoint (30 seconds)
```bash
# Test login endpoint (should return error for invalid credentials)
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"wrong"}'
```

Expected response:
```json
{"error":"Invalid email or password"}
```

If you see this error, authentication is working correctly! ✅

### Step 6: Monitor Logs (Optional)
```bash
# Watch Worker logs in real-time
wrangler tail
```

Press Ctrl+C to stop watching.

## ✅ Deployment Checklist

- [ ] JWT_SECRET set in Cloudflare
- [ ] Worker deployed successfully
- [ ] `/api/auth/login` endpoint responding
- [ ] No errors in `wrangler tail`
- [ ] Security headers present (check with curl -I)
- [ ] Rate limiting working (try 6 failed logins)

## 🔍 Testing Security Features

### Test 1: Password Hashing
```bash
# Create a test account
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email":"security-test@example.com",
    "password":"TestPass123!",
    "fullName":"Security Test"
  }'
```

Then check Airtable - the Password field should contain a hash like:
```
a1b2c3d4e5f6...${hash}
```
(NOT plain text like "TestPass123!")

### Test 2: JWT Token
```bash
# Login and get token
curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email":"security-test@example.com",
    "password":"TestPass123!"
  }'
```

Expected response:
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "recXXXXX",
    "email": "security-test@example.com",
    "fullName": "Security Test",
    "role": "Employee"
  }
}
```

### Test 3: Rate Limiting
```bash
# Try 6 failed logins quickly
for i in {1..6}; do
  curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","password":"wrong"}'
  echo ""
done
```

The 6th attempt should return:
```json
{
  "error": "Too many login attempts. Please try again later.",
  "retryAfter": 45
}
```

### Test 4: Security Headers
```bash
# Check response headers
curl -I https://glampack-hr-api.mr-asanteeprog.workers.dev/api/employees
```

Should include:
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
X-Request-ID: <unique-id>
```

## 🔧 Configuration Options

### Update CORS for Production
Edit [api-worker.js:44](api-worker.js#L44):
```javascript
// Change from:
'Access-Control-Allow-Origin': '*',

// To:
'Access-Control-Allow-Origin': 'https://dash.packglamour.com',
```

Then redeploy:
```bash
wrangler deploy
```

### Enable HSTS (HTTPS Only)
Edit [api-worker.js:56](api-worker.js#L56):
```javascript
// Uncomment this line:
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
```

Then redeploy:
```bash
wrangler deploy
```

## 📊 Monitoring

### View Worker Logs
```bash
# Real-time logs
wrangler tail

# Pretty format
wrangler tail --format pretty

# Filter errors only
wrangler tail --format pretty | grep error
```

### Security Event Logs
Look for these events in logs:
- `login_success` - User logged in successfully
- `login_failed` - Failed login attempt
- `login_error` - Error during login
- `error` - General errors

Example log entry:
```json
{
  "timestamp": "2025-12-02T10:30:00.000Z",
  "event": "login_success",
  "userId": "recXXXXX",
  "email": "use***",
  "role": "Employee",
  "ip": "192.168.1.1"
}
```

## 🚨 Troubleshooting

### Issue: "JWT_SECRET not set" error
```bash
# Solution: Set the secret
wrangler secret put JWT_SECRET
```

### Issue: Worker deployment fails
```bash
# Check for syntax errors
wrangler deploy --dry-run

# View detailed logs
wrangler deploy --verbose
```

### Issue: Rate limiting not working
```bash
# Check Worker logs
wrangler tail

# Note: In-memory rate limiter resets on Worker restart
# This is expected behavior - upgrade to KV for persistence
```

### Issue: Login returns 500 error
```bash
# Check Worker logs for details
wrangler tail --format pretty

# Common causes:
# - JWT_SECRET not set
# - Airtable API key invalid
# - Airtable base ID wrong
```

## 📚 Full Documentation

- **[PRODUCTION-READY-SUMMARY.md](PRODUCTION-READY-SUMMARY.md)** - Complete overview
- **[PRODUCTION-SECURITY.md](PRODUCTION-SECURITY.md)** - Security checklist
- **[README.md](README.md)** - Project documentation
- **[WORKER-DEPLOYMENT.md](WORKER-DEPLOYMENT.md)** - Deployment guide

## 🎯 Next Steps

1. ✅ Deploy Worker (you just did this!)
2. 🔜 Update frontend to use `/api/auth/login`
3. 🔜 Update CORS to production domain
4. 🔜 Enable HSTS header
5. 🔜 Run security scan (OWASP ZAP)
6. 🔜 Monitor logs for 24 hours
7. 🔜 Deploy to production!

## 💡 Pro Tips

### Use Environment Variables
```toml
# wrangler.toml
[env.production]
name = "glampack-hr-api-prod"
vars = { ENVIRONMENT = "production" }

[env.development]
name = "glampack-hr-api-dev"
vars = { ENVIRONMENT = "development" }
```

Deploy to specific environment:
```bash
wrangler deploy --env production
```

### Enable Cloudflare Logpush
```bash
# Push logs to external service (Datadog, S3, etc.)
# See: https://developers.cloudflare.com/logs/get-started/
```

### Set Up Alerts
```bash
# Configure alerts in Cloudflare dashboard:
# Workers & Pages > glampack-hr-api > Metrics > Alerts

# Alert conditions:
# - Error rate > 5%
# - Request volume > 10,000/min
# - CPU time > 50ms
```

## 🔗 Quick Links

- [Cloudflare Dashboard](https://dash.cloudflare.com/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [GitHub Repository](https://github.com/collinsasante/Glampack-HR)
- [Production Site](https://dash.packglamour.com)

---

**Questions?** Check [PRODUCTION-SECURITY.md](PRODUCTION-SECURITY.md) or run `wrangler tail` to see logs.

**Emergency Rollback?** See [PRODUCTION-READY-SUMMARY.md#rollback-procedure](PRODUCTION-READY-SUMMARY.md#🚨-rollback-procedure)
