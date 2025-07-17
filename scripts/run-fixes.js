const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
require('dotenv').config();

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   EXPO_PUBLIC_SUPABASE_URL');
  console.error('   SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runFixes() {
  console.log('🔧 Starting database fixes...\n');

  try {
    // Read the fix script
    const fixScript = fs.readFileSync(
      path.join(__dirname, 'fix-current-issues.sql'),
      'utf8'
    );

    console.log('📝 Running database fixes...');
    
    // Execute the SQL script
    const { data, error } = await supabase.rpc('exec_sql', { sql: fixScript });
    
    if (error) {
      console.error('❌ Error running fixes:', error);
      return;
    }

    console.log('✅ Database fixes completed successfully!');
    console.log('\n📊 Results:');
    console.log(data);

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    // Fallback: try to run the fixes manually
    console.log('\n🔄 Trying manual fix approach...');
    
    try {
      // Fix username spaces
      const { error: updateError } = await supabase
        .from('users')
        .update({
          username: supabase.sql`trim(username)`,
          display_name: supabase.sql`trim(display_name)`
        })
        .neq('username', supabase.sql`trim(username)`);

      if (updateError) {
        console.error('❌ Error updating usernames:', updateError);
      } else {
        console.log('✅ Username spaces fixed');
      }

      // Show current users
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, username, display_name, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

      if (usersError) {
        console.error('❌ Error fetching users:', usersError);
      } else {
        console.log('\n👥 Current users:');
        users.forEach(user => {
          console.log(`   ${user.username} (${user.email})`);
        });
      }

    } catch (fallbackError) {
      console.error('❌ Fallback approach also failed:', fallbackError.message);
    }
  }
}

// Run the fixes
runFixes().then(() => {
  console.log('\n🎉 Fix script completed!');
  process.exit(0);
}).catch((error) => {
  console.error('\n💥 Fix script failed:', error);
  process.exit(1);
}); 