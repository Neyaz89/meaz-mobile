const fs = require('fs');
const path = require('path');

console.log('🚀 Meaz Mobile Database Setup\n');

console.log('📋 To set up your database, please follow these steps:\n');

console.log('1. Go to your Supabase dashboard: https://supabase.com/dashboard');
console.log('2. Select your project');
console.log('3. Go to the SQL Editor');
console.log('4. Copy and paste the contents of the file: scripts/quick-setup.sql');
console.log('5. Click "Run" to execute the SQL\n');

// Read and display the SQL file
try {
  const sqlPath = path.join(__dirname, 'quick-setup.sql');
  const sqlContent = fs.readFileSync(sqlPath, 'utf8');
    
  console.log('📄 SQL Content to run in Supabase dashboard:\n');
  console.log('--- START SQL ---');
  console.log(sqlContent);
  console.log('--- END SQL ---\n');
  
  console.log('✅ After running the SQL, your database will be ready!');
  console.log('🔄 Restart your app to test the authentication and other features.');
    
  } catch (error) {
  console.error('❌ Error reading SQL file:', error.message);
  console.log('Please check that scripts/quick-setup.sql exists');
}