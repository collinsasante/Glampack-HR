# 🚀 Deploy to Cloudflare Pages - Simple Guide

## Step 1: Push Your Code to GitHub ✅

First, let's get your clean code on GitHub:

```bash
git push -f origin main
```

This should work now with no security warnings!

## Step 2: Go to Cloudflare Pages

1. Visit: https://dash.cloudflare.com
2. Sign up/Login (free account works!)
3. Click "Workers & Pages" in left menu
4. Click "Create application"
5. Click "Pages" tab
6. Click "Connect to Git"

## Step 3: Connect Your Repository

1. Click "Connect GitHub"
2. Authorize Cloudflare
3. Select repository: `collinsasante/Glampack-HR`
4. Click "Begin setup"

## Step 4: Configure Build Settings

Fill in these settings:

```
Project name: glampack-hr
Production branch: main
Framework preset: None
Build command: (leave empty)
Build output directory: /
Root directory (path): techzaa.in/techauth
```

**Click "Save and Deploy"**

⏳ Wait 2-3 minutes for first deployment...

## Step 5: Get Your Website URL

After deployment completes:
- You'll see: `https://glampack-hr.pages.dev`
- Or something like: `https://glampack-hr-xyz.pages.dev`

**Copy this URL!**

## Step 6: Update HTML Files to Load Config

You need to add config.js to your HTML files.

### Files to Update:

Add this line **BEFORE** `auth.js` or `admin.js` in these files:

```html
<script src="config.js"></script>
```

**Files that need this:**
1. `signin-2.html`
2. `signup-2.html`
3. `forgot-password-2.html`
4. `admin-dashboard.html`
5. `dashboard.html`
6. `profile.html`
7. `attendance-tracker.html`
8. `leave-request.html`
9. `payroll.html`
10. `announcements.html`

### Example for signin-2.html:

Find the `<script src="auth.js"></script>` line and add config.js before it:

```html
<!-- Add this line -->
<script src="config.js"></script>
<!-- Before this one -->
<script src="auth.js"></script>
```

## Step 7: Commit and Push Updates

```bash
git add .
git commit -m "Add config.js to HTML files for Cloudflare deployment"
git push origin main
```

Cloudflare will automatically redeploy! ⚡

## Step 8: Upload config.js to Cloudflare

**Important:** Since config.js is gitignored, you need to add it directly to Cloudflare.

### Option A: Remove config.js from .gitignore (Quick Fix)

1. Edit `.gitignore` file
2. Remove or comment out the line: `techzaa.in/techauth/config.js`
3. Add and commit config.js:
   ```bash
   git add techzaa.in/techauth/config.js
   git commit -m "Add config.js for deployment"
   git push origin main
   ```

⚠️ **Warning:** This exposes your API keys on GitHub. Only do this for private repositories!

### Option B: Use Cloudflare Functions (More Secure)

I can help you set up a Cloudflare Function to keep API keys secure.

## Step 9: Test Your Deployment

Visit your Cloudflare Pages URL:
```
https://glampack-hr.pages.dev
```

Try to:
1. ✅ Sign up with a test account
2. ✅ Sign in
3. ✅ Access dashboard
4. ✅ Check if Airtable data loads

## 🎉 You're Live!

Your HR system is now hosted on Cloudflare Pages!

### Custom Domain (Optional)

Want to use your own domain like `hr.yourcompany.com`?

1. Go to Pages project settings
2. Click "Custom domains"
3. Add your domain
4. Update DNS records as instructed

## 🔄 Future Updates

Every time you push to GitHub, Cloudflare automatically deploys:

```bash
git add .
git commit -m "Your changes"
git push origin main
# ✨ Auto-deploys to Cloudflare!
```

## 📊 Monitor Your Site

In Cloudflare dashboard:
- View deployment history
- See analytics and traffic
- Check for errors
- View build logs

---

## Need the Secure Version?

If you want to keep API keys hidden from the browser, let me know and I'll set up:
- Cloudflare Workers for API proxy
- Environment variables
- Secure backend calls

**Which approach do you want?**
1. Quick deploy (API keys in code) - 5 minutes
2. Secure deploy (API keys hidden) - 15 minutes
