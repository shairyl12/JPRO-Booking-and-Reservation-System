// ============================================================================
// DATABASE CONNECTION TEST SCRIPT
// ============================================================================
// Run this to verify your Aiven database connection
// Usage: node test-db-connection.js
// ============================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');

async function testConnection() {
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Testing Aiven MySQL Database Connection');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  // Check if .env file exists
  if (!process.env.DB_HOST) {
    console.error('❌ ERROR: .env file not found or incomplete');
    console.log('\n📝 STEPS TO FIX:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your Aiven database credentials to .env file');
    console.log('3. Run this test again\n');
    process.exit(1);
  }

  console.log('📋 Database Configuration:');
  console.log(`   Host: ${process.env.DB_HOST}`);
  console.log(`   Port: ${process.env.DB_PORT || '21464'}`);
  console.log(`   User: ${process.env.DB_USER}`);
  console.log(`   Database: ${process.env.DB_NAME}`);
  console.log('');

  try {
    console.log('🔄 Attempting to connect...\n');

    const connection = await mysql.createConnection({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '21464'),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: {
        rejectUnauthorized: true
      },
      connectTimeout: 10000
    });

    console.log('✅ Connection successful!\n');

    // Test query
    const [rows] = await connection.query('SELECT 1 + 1 AS result');
    console.log('✅ Query test passed:', rows[0]);

    // Show database info
    const [version] = await connection.query('SELECT VERSION() as version');
    console.log('\n📊 Database Info:');
    console.log(`   MySQL Version: ${version[0].version}`);

    // List tables
    const [tables] = await connection.query('SHOW TABLES');
    console.log(`   Tables: ${tables.length}`);
    tables.forEach(table => {
      const tableName = Object.values(table)[0];
      console.log(`      - ${tableName}`);
    });

    await connection.end();

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('  ✅ All tests passed! Database is ready to use.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('🚀 You can now start the server with: node server.js\n');

  } catch (error) {
    console.error('\n❌ Connection failed!\n');
    console.error('Error:', error.message);
    
    console.log('\n🔍 TROUBLESHOOTING:\n');

    if (error.code === 'ENOTFOUND') {
      console.log('   → Host not found. Check DB_HOST in .env file');
      console.log('   → Make sure the hostname is correct (from Aiven console)');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('   → Connection refused. Check:');
      console.log('      - Service is running in Aiven');
      console.log('      - Port is correct (usually 21464)');
      console.log('      - Your IP is whitelisted in Aiven');
    } else if (error.code === 'ER_ACCESS_DENIED_ERROR') {
      console.log('   → Access denied. Check:');
      console.log('      - Username (DB_USER) is correct');
      console.log('      - Password (DB_PASSWORD) is correct');
    } else if (error.code === 'ER_BAD_DB_ERROR') {
      console.log('   → Database not found. Check:');
      console.log('      - Database name (DB_NAME) is correct');
      console.log('      - Create the database in Aiven if needed');
    } else if (error.code === 'ETIMEDOUT') {
      console.log('   → Connection timeout. Check:');
      console.log('      - Your internet connection');
      console.log('      - Firewall settings');
      console.log('      - Aiven IP whitelist');
    } else if (error.code === 'HANDSHAKE_SSL_ERROR') {
      console.log('   → SSL error. This is usually a certificate issue.');
      console.log('   → Try setting ssl: { rejectUnauthorized: false } temporarily');
    }

    console.log('\n📚 For more help, see: AIVEN_SETUP_GUIDE.md\n');
    process.exit(1);
  }
}

testConnection();
