# Cloudflare Worker Deployment Guide

## 🚨 IMPORTANT: You MUST deploy the Worker for the system to work!

The updated `api-worker.js` includes critical fixes:
- ✅ IP lookup proxy endpoint (`/api/iplookup`)
- ✅ Enhanced CORS headers with Authorization support
- ✅ POST/PATCH support for attendance records
- ✅ POST/PATCH support for payroll records

## Prerequisites

1. **Install Wrangler CLI** (if not already installed):
   ```bash
   npm install -g wrangler
   ```

2. **Login to Cloudflare** (if not already logged in):
   ```bash
   wrangler login
   ```

## Deployment Steps

### Step 1: Navigate to the Worker Directory
```bash
cd "/Users/breezyyy/Downloads/login page/techzaa.in/techauth"
```

### Step 2: Verify Environment Secrets are Set

Check if your secrets are configured:
```bash
wrangler secret list
```

You should see:
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`

If they're not set, add them:
```bash
wrangler secret put AIRTABLE_API_KEY
# Paste your Airtable API key when prompted

wrangler secret put AIRTABLE_BASE_ID
# Paste your Airtable base ID when prompted
```

### Step 3: Deploy the Worker
```bash
wrangler deploy
```

You should see output like:
```
✨ Success! Uploaded 1 file (X.XX sec)
✨ Uploaded glampack-hr-api (X.XX sec)
✨ Published glampack-hr-api (X.XX sec)
  https://glampack-hr-api.mr-asanteeprog.workers.dev
```

### Step 4: Test the Deployment

Test the IP lookup endpoint:
```bash
curl https://glampack-hr-api.mr-asanteeprog.workers.dev/api/iplookup
```

You should get a JSON response with IP location data.

Test the employees endpoint:
```bash
curl https://glampack-hr-api.mr-asanteeprog.workers.dev/api/employees
```

## Troubleshooting

### Error: "Server configuration error"
- Your Airtable secrets are not set
- Run `wrangler secret put AIRTABLE_API_KEY` and `wrangler secret put AIRTABLE_BASE_ID`

### Error: "404 Not Found" on /api/iplookup
- The Worker hasn't been deployed yet
- Run `wrangler deploy`

### Error: CORS issues
- Make sure you deployed the latest version with updated CORS headers
- The latest code includes `'Authorization'` in `Access-Control-Allow-Headers`

### Error: Authentication failed
- Check that your Airtable API key is still valid
- Verify the base ID is correct
- Re-run `wrangler secret put AIRTABLE_API_KEY` if needed

## Verification Checklist

After deployment, verify these endpoints work:

- [ ] `GET /api/iplookup` - IP location lookup
- [ ] `GET /api/employees` - Fetch employees
- [ ] `GET /api/attendance` - Fetch attendance records
- [ ] `POST /api/attendance` - Create attendance record
- [ ] `PATCH /api/attendance/{id}` - Update attendance record
- [ ] `GET /api/payroll` - Fetch payroll records
- [ ] `POST /api/payroll` - Create payroll record
- [ ] `PATCH /api/payroll/{id}` - Update payroll record

## Quick Deploy Command

For convenience, here's a one-liner to deploy from the repo root:

```bash
cd "/Users/breezyyy/Downloads/login page/techzaa.in/techauth" && wrangler deploy
```

---

**Note**: The Worker code is in `api-worker.js` and configuration is in `wrangler.toml`.
