# Production Security Checklist

This document outlines the security improvements implemented in the `production-ready` branch and additional steps required for production deployment.

## ✅ Implemented Security Features

### 1. Password Hashing (PBKDF2)
- **Location**: [api-worker.js:936-1016](api-worker.js#L936-L1016)
- **Algorithm**: PBKDF2-SHA256 with 100,000 iterations
- **Salt**: 16-byte random salt per password
- **Auto-upgrade**: Plain text passwords automatically hashed on next login
- **Format**: `{salt}${hash}` (hex encoded)

**Implementation Details**:
```javascript
// Hashing
const hashedPassword = await hashPassword(password);
// Format: "a1b2c3d4...${hash}"

// Verification
const isValid = await verifyPassword(password, storedHash);
```

### 2. JWT Authentication
- **Location**: [api-worker.js:1021-1106](api-worker.js#L1021-L1106)
- **Algorithm**: HMAC-SHA256
- **Expiration**: 24 hours
- **Token includes**: User ID, email, role
- **Secret**: Stored in `env.JWT_SECRET` (Cloudflare secret)

**New Endpoints**:
- `POST /api/auth/login` - Returns JWT token
- `POST /api/auth/signup` - Creates account and returns JWT token
- `POST /api/auth/change-password` - Updates password with verification

### 3. Rate Limiting
- **Location**: [api-worker.js:876-930](api-worker.js#L876-L930)
- **Login**: Max 5 attempts per email per minute
- **Signup**: Max 3 attempts per IP per 5 minutes
- **Returns**: `429 Too Many Requests` with `Retry-After` header
- **Note**: Currently in-memory (resets on Worker restart)

**Production Upgrade Needed**:
```bash
# Use Cloudflare KV for persistent rate limiting
wrangler kv:namespace create "RATE_LIMIT"
# Add binding to wrangler.toml:
# [[kv_namespaces]]
# binding = "RATE_LIMIT"
# id = "your-kv-id"
```

### 4. Input Validation & Sanitization
- **Location**: [api-worker.js:932-955](api-worker.js#L932-L955)
- **Email**: Lowercase, trimmed, special chars removed, regex validated
- **Strings**: XSS characters removed (`<>"'\``)
- **Max lengths**: Enforced per field type

**Functions**:
- `sanitizeEmail()` - Email sanitization
- `sanitizeString(str, maxLength)` - General string sanitization
- `isValidEmail()` - Email format validation

### 5. Security Headers
- **Location**: [api-worker.js:8-20](api-worker.js#L8-L20)
- **Headers Added**:
  - `X-Content-Type-Options: nosniff` - Prevents MIME sniffing
  - `X-Frame-Options: DENY` - Prevents clickjacking
  - `X-XSS-Protection: 1; mode=block` - XSS protection (legacy browsers)
  - `Referrer-Policy: strict-origin-when-cross-origin` - Limits referrer info
  - `Permissions-Policy: geolocation=(self), microphone=(), camera=()` - Feature restrictions

**HSTS Header (Commented Out)**:
```javascript
// Enable this in production (HTTPS only):
'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload'
```

### 6. CSRF Protection Framework
- **Location**: [api-worker.js:849-874](api-worker.js#L849-L874)
- **Token Generation**: `generateCSRFToken()` - 32-byte random token
- **Verification**: `verifyCSRFToken()` - Constant-time comparison
- **Note**: Framework ready, needs integration with frontend

## 🔧 Required Configuration Changes

### Step 1: Set JWT Secret
```bash
cd "/Users/breezyyy/Downloads/Glampack-HR/techzaa.in/techauth"

# Generate a strong secret (32+ characters)
wrangler secret put JWT_SECRET
# Enter: <paste your generated secret>
```

**Generate secret** (run locally):
```bash
openssl rand -base64 32
```

### Step 2: Deploy Updated Worker
```bash
wrangler deploy
```

### Step 3: Update Frontend Authentication

#### Current Implementation (Plain Text)
```javascript
// auth.js - OLD (insecure)
const employees = await getEmployees(`{Email}='${email}'`);
if (employees.records[0].fields.Password === password) { ... }
```

#### New Implementation (Secure)
```javascript
// auth.js - NEW (secure)
async function login(email, password) {
  const response = await fetch('https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error);
  }

  const data = await response.json();

  // Store JWT token
  sessionStorage.setItem('auth_token', data.token);
  sessionStorage.setItem('user', JSON.stringify(data.user));

  return data.user;
}
```

### Step 4: Hash Existing Passwords (One-Time Migration)

**Option A: Auto-upgrade on login** (Already implemented)
- Users automatically migrated when they next log in
- No action required
- Gradual migration over time

**Option B: Bulk migration script** (Recommended for production)
```javascript
// migration-script.js (run once via Cloudflare Worker Cron)
async function migratePasswords() {
  const employees = await getEmployees();

  for (const emp of employees.records) {
    const password = emp.fields.Password;

    // Skip if already hashed
    if (password && password.includes('$')) continue;

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Update record
    await updateEmployee(emp.id, {
      fields: { Password: hashedPassword }
    });

    console.log(`Migrated password for ${emp.fields.Email}`);
  }
}
```

## ⚠️ Remaining Security Risks

### HIGH Priority

1. **Session Management**
   - **Current**: JWT stored in sessionStorage (vulnerable to XSS)
   - **Fix**: Use httpOnly cookies or secure localStorage with encryption
   - **File**: `assets/js/auth.js`

2. **CORS Configuration**
   - **Current**: `Access-Control-Allow-Origin: *` (too permissive)
   - **Fix**: Whitelist specific domains
   - **File**: `api-worker.js:9`
   ```javascript
   // Replace:
   'Access-Control-Allow-Origin': '*',
   // With:
   'Access-Control-Allow-Origin': 'https://dash.packglamour.com',
   ```

3. **SQL Injection via Airtable Formulas**
   - **Current**: String concatenation in filter formulas
   - **File**: Multiple (search for `filterByFormula=`)
   - **Example**: `{Email}='${email}'` - vulnerable if email contains `'`
   - **Fix**: Use parameterized queries or escape special characters
   ```javascript
   // Bad:
   const filterFormula = `{Email}='${email}'`;

   // Good:
   const filterFormula = `{Email}='${email.replace(/'/g, "\\'")}'`;
   ```

4. **No HTTPS Enforcement**
   - **Current**: Geolocation API requires HTTPS but not enforced everywhere
   - **Fix**: Enable HSTS header and redirect HTTP to HTTPS

### MEDIUM Priority

5. **Client-Side Logging**
   - **Current**: Sensitive data in console.log statements
   - **Files**: Multiple (search for `console.log`)
   - **Fix**: Remove or redact sensitive data
   ```javascript
   // Bad:
   console.log('Login:', email, password);

   // Good:
   console.log('Login attempt for:', email.substring(0, 3) + '***');
   ```

6. **Error Messages**
   - **Current**: Detailed error messages expose system information
   - **Fix**: Use generic messages in production
   ```javascript
   // Bad:
   throw new Error(`Airtable API error: ${response.statusText}`);

   // Good (production):
   throw new Error('An error occurred. Please try again.');
   ```

7. **No Account Lockout**
   - **Current**: Rate limiting resets after 1 minute
   - **Fix**: Implement progressive delays or permanent lockout after threshold

8. **Password Strength**
   - **Current**: Minimum 8 characters
   - **Fix**: Enforce complexity requirements
   ```javascript
   function validatePasswordStrength(password) {
     if (password.length < 12) return false;
     if (!/[a-z]/.test(password)) return false; // Lowercase
     if (!/[A-Z]/.test(password)) return false; // Uppercase
     if (!/[0-9]/.test(password)) return false; // Number
     if (!/[^a-zA-Z0-9]/.test(password)) return false; // Special char
     return true;
   }
   ```

### LOW Priority

9. **No Email Verification**
   - **Current**: Accounts active immediately after signup
   - **Fix**: Send verification email via SendGrid/Mailgun

10. **No Password Reset Flow**
    - **Current**: Users cannot reset forgotten passwords
    - **Fix**: Implement "Forgot Password" with email tokens

11. **No Multi-Factor Authentication (MFA)**
    - **Fix**: Add TOTP (Time-based One-Time Password) support

12. **Audit Logging**
    - **Current**: No logging of security events
    - **Fix**: Log login attempts, password changes, role changes
    - **Tool**: Cloudflare Logpush or custom logging table

## 📋 Production Deployment Checklist

### Pre-Deployment

- [ ] Set `JWT_SECRET` in Cloudflare secrets
- [ ] Update CORS to whitelist specific domains
- [ ] Enable HSTS header (HTTPS only)
- [ ] Remove all `console.log` with sensitive data
- [ ] Test rate limiting (login 5x, signup 3x)
- [ ] Test password hashing (create account, login, verify hash in Airtable)
- [ ] Test JWT token expiration (wait 24 hours)
- [ ] Run security scan (OWASP ZAP, Burp Suite)

### Deployment

- [ ] Deploy Worker: `wrangler deploy`
- [ ] Update frontend to use `/api/auth/login` endpoint
- [ ] Migrate existing passwords (auto-upgrade or bulk script)
- [ ] Update CSP headers in `_headers` file (if needed)
- [ ] Test production login flow end-to-end
- [ ] Monitor Worker logs: `wrangler tail`

### Post-Deployment

- [ ] Monitor error rates in Cloudflare dashboard
- [ ] Check rate limit effectiveness (429 responses)
- [ ] Verify JWT tokens working correctly
- [ ] Test password change functionality
- [ ] Set up alerts for Worker errors
- [ ] Document rollback procedure

## 🔍 Security Testing

### Manual Tests

1. **Password Hashing**:
   ```bash
   # Create account
   curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/signup \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"Test1234!","fullName":"Test User"}'

   # Check Airtable - Password field should contain hash like:
   # a1b2c3d4e5f6...${hash}
   ```

2. **Rate Limiting**:
   ```bash
   # Try 6 logins with wrong password
   for i in {1..6}; do
     curl -X POST https://glampack-hr-api.mr-asanteeprog.workers.dev/api/auth/login \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","password":"wrong"}'
     echo ""
   done
   # 6th attempt should return 429
   ```

3. **JWT Expiration**:
   ```javascript
   // Decode JWT token (paste token from login response)
   const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";
   const payload = JSON.parse(atob(token.split('.')[1]));
   console.log('Expires:', new Date(payload.exp * 1000));
   // Should be 24 hours from now
   ```

### Automated Security Scanning

```bash
# Install OWASP ZAP (if not installed)
# https://www.zaproxy.org/download/

# Run automated scan
zap-cli quick-scan https://dash.packglamour.com

# Check for:
# - XSS vulnerabilities
# - SQL injection
# - Insecure headers
# - Unencrypted communications
```

## 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Workers Security Best Practices](https://developers.cloudflare.com/workers/platform/security/)
- [PBKDF2 Specification](https://datatracker.ietf.org/doc/html/rfc2898)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8725)
- [Rate Limiting Patterns](https://cloud.google.com/architecture/rate-limiting-strategies-techniques)

## 🚨 Emergency Contacts

If a security breach is detected:

1. **Immediate Actions**:
   - Disable Worker: `wrangler delete` (stops all API access)
   - Rotate secrets: `wrangler secret put JWT_SECRET` (invalidates all tokens)
   - Check Cloudflare logs for unauthorized access

2. **Investigation**:
   - Review Worker logs: `wrangler tail --format pretty`
   - Check Airtable audit logs
   - Identify compromised accounts

3. **Recovery**:
   - Force password reset for all users
   - Review and patch vulnerability
   - Notify affected users (if applicable)

## 📝 Version History

- **v1.0.0** (2025-12-02): Initial production security implementation
  - Password hashing (PBKDF2)
  - JWT authentication
  - Rate limiting
  - Input validation
  - Security headers
  - CSRF protection framework
