// ========================================
// PASSWORD MIGRATION SCRIPT
// ========================================
// This script migrates existing plain-text passwords to bcrypt hashes
//
// IMPORTANT: Run this ONCE after deploying the secure worker
//
// USAGE:
// 1. Update WORKER_URL with your deployed worker URL
// 2. Update ADMIN_TOKEN with a temporary admin token
// 3. Run: node migrate-passwords.js
// 4. Verify all passwords migrated
// 5. Delete this script (contains sensitive logic)

const WORKER_URL = 'https://glampack-hr-api.mr-asanteeprog.workers.dev';
const AIRTABLE_API_KEY = 'YOUR_AIRTABLE_API_KEY'; // Replace with actual key
const AIRTABLE_BASE_ID = 'YOUR_BASE_ID'; // Replace with actual base ID

// bcrypt for Node.js
const bcrypt = require('bcryptjs');

async function migratePasswords() {
  console.log('🔐 Starting password migration...\n');

  try {
    // Fetch all employees from Airtable
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Employees`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.statusText}`);
    }

    const data = await response.json();
    const employees = data.records || [];

    console.log(`📊 Found ${employees.length} employees to migrate\n`);

    let migrated = 0;
    let skipped = 0;
    let failed = 0;

    for (const employee of employees) {
      const employeeId = employee.id;
      const email = employee.fields['Email'] || 'unknown';
      const currentPassword = employee.fields['Password'];

      // Skip if already hashed (bcrypt hashes start with $2a$ or $2b$)
      if (currentPassword && (currentPassword.startsWith('$2a$') || currentPassword.startsWith('$2b$'))) {
        console.log(`⏭️  Skipping ${email} - already hashed`);
        skipped++;
        continue;
      }

      // Skip if no password
      if (!currentPassword) {
        console.log(`⚠️  Warning: ${email} has no password - skipping`);
        skipped++;
        continue;
      }

      try {
        // Hash the password
        const hashedPassword = await bcrypt.hash(currentPassword, 10);

        // Update Airtable record
        const updateResponse = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Employees/${employeeId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'Password': hashedPassword
            }
          })
        });

        if (!updateResponse.ok) {
          throw new Error(`Update failed: ${updateResponse.statusText}`);
        }

        console.log(`✅ Migrated ${email}`);
        migrated++;

      } catch (error) {
        console.error(`❌ Failed to migrate ${email}: ${error.message}`);
        failed++;
      }

      // Rate limiting: wait 100ms between requests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary:');
    console.log('='.repeat(50));
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`⏭️  Skipped: ${skipped}`);
    console.log(`❌ Failed: ${failed}`);
    console.log('='.repeat(50));

    if (failed === 0) {
      console.log('\n🎉 Password migration completed successfully!');
      console.log('\n⚠️  IMPORTANT NEXT STEPS:');
      console.log('1. Test login with a few accounts');
      console.log('2. Deploy the secure worker (api-worker-secure.js)');
      console.log('3. Update frontend to use auth-secure.js');
      console.log('4. Delete this migration script');
      console.log('5. Force all users to reset password on next login (optional)');
    } else {
      console.log('\n⚠️  Some migrations failed. Please review errors above.');
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  }
}

// ========================================
// ALTERNATIVE: FORCE PASSWORD RESET
// ========================================
// Instead of migrating, you can force all users to reset their password

async function forcePasswordReset() {
  console.log('🔐 Marking all accounts for password reset...\n');

  try {
    const response = await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Employees`, {
      headers: {
        'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch employees: ${response.statusText}`);
    }

    const data = await response.json();
    const employees = data.records || [];

    console.log(`📊 Found ${employees.length} employees\n`);

    for (const employee of employees) {
      const email = employee.fields['Email'] || 'unknown';

      try {
        // Update record to require password reset
        await fetch(`https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Employees/${employee.id}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              'Password Reset Required': true,
              'Password': '' // Clear old password
            }
          })
        });

        console.log(`✅ Marked ${email} for password reset`);

      } catch (error) {
        console.error(`❌ Failed for ${email}: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.log('\n✅ All users marked for password reset');
    console.log('Users will need to use "Forgot Password" to set new password');

  } catch (error) {
    console.error('\n❌ Failed:', error.message);
    process.exit(1);
  }
}

// ========================================
// RUN MIGRATION
// ========================================

// Uncomment the method you want to use:

// Method 1: Migrate existing passwords (keeps users logged in)
migratePasswords();

// Method 2: Force password reset (more secure, users must reset)
// forcePasswordReset();
