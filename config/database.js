// ============================================================================
// DATABASE CONFIGURATION - Aiven MySQL
// ============================================================================

require('dotenv').config();
const mysql = require('mysql2/promise');

// Create connection pool for better performance
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'your-host.aivencloud.com',
  port: parseInt(process.env.DB_PORT || '21464'),
  user: process.env.DB_USER || 'avnadmin',
  password: process.env.DB_PASSWORD || 'your-password',
  database: process.env.DB_NAME || 'jpro_rentals',
  ssl: {
    rejectUnauthorized: true
  },
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Test database connection
async function testConnection() {
  try {
    const connection = await pool.getConnection();
    console.log('✅ Database connected successfully!');
    connection.release();
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    return false;
  }
}

// Initialize database tables
async function initializeDatabase() {
  const connection = await pool.getConnection();
  
  try {
    console.log('🔧 Initializing database tables...');

    // Create users table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role ENUM('admin', 'customer') DEFAULT 'customer',
        phone VARCHAR(50),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_email (email),
        INDEX idx_role (role)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Users table created/verified');

    // Create equipment table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS equipment (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        category ENUM('lighting', 'sound', 'effects') NOT NULL,
        price_per_day DECIMAL(10, 2) NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        description TEXT,
        image VARCHAR(500),
        available BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_category (category),
        INDEX idx_available (available)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Equipment table created/verified');

    // Create bookings table
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        rental_days INT NOT NULL,
        total_price DECIMAL(10, 2) NOT NULL,
        status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
        notes TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        INDEX idx_user (user_id),
        INDEX idx_status (status),
        INDEX idx_dates (start_date, end_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Bookings table created/verified');

    // Create booking_items table (for multiple equipment per booking)
    await connection.query(`
      CREATE TABLE IF NOT EXISTS booking_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        equipment_id INT NOT NULL,
        price_at_booking DECIMAL(10, 2) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE,
        FOREIGN KEY (equipment_id) REFERENCES equipment(id) ON DELETE RESTRICT,
        INDEX idx_booking (booking_id),
        INDEX idx_equipment (equipment_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    `);
    console.log('✅ Booking items table created/verified');

    console.log('🎉 Database initialization complete!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  } finally {
    connection.release();
  }
}

// Seed initial data
async function seedData() {
  const connection = await pool.getConnection();
  const bcrypt = require('bcryptjs');
  
  try {
    // Check if admin exists
    const [adminExists] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      ['admin@jpro.com']
    );

    if (adminExists.length === 0) {
      // Create admin user
      const adminPassword = await bcrypt.hash('admin123', 10);
      await connection.query(
        'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
        ['Admin User', 'admin@jpro.com', adminPassword, 'admin', '123-456-7890']
      );
      console.log('✅ Admin user created');
    }

    // Check if customer exists
    const [customerExists] = await connection.query(
      'SELECT id FROM users WHERE email = ?',
      ['customer@example.com']
    );

    if (customerExists.length === 0) {
      // Create demo customer
      const customerPassword = await bcrypt.hash('customer123', 10);
      await connection.query(
        'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
        ['John Doe', 'customer@example.com', customerPassword, 'customer', '987-654-3210']
      );
      console.log('✅ Demo customer created');
    }

    // Check if equipment exists
    const [equipmentExists] = await connection.query(
      'SELECT COUNT(*) as count FROM equipment'
    );

    if (equipmentExists[0].count === 0) {
      // Seed equipment
      const equipmentData = [
        ['LED Par Light', 'lighting', 25, 20, 'RGBW LED par light with DMX control', '/images/led-par.jpg', true],
        ['Moving Head Light', 'lighting', 50, 12, '360W moving head spot light', '/images/moving-head.jpg', true],
        ['Stage Light Bar', 'lighting', 35, 8, 'LED stage wash light bar', '/images/stage-bar.jpg', true],
        ['Strobe Light', 'lighting', 20, 6, 'High-intensity strobe light', '/images/strobe.jpg', true],
        ['Speaker System (Pair)', 'sound', 75, 10, '1000W professional speaker pair', '/images/speaker.jpg', true],
        ['Subwoofer', 'sound', 50, 5, '15-inch powered subwoofer', '/images/subwoofer.jpg', true],
        ['DJ Mixer', 'sound', 40, 4, '4-channel DJ mixer', '/images/mixer.jpg', true],
        ['Wireless Microphone', 'sound', 30, 8, 'UHF wireless microphone system', '/images/microphone.jpg', true],
        ['Smoke Machine', 'effects', 35, 4, '1000W fog machine with remote', '/images/smoke.jpg', true],
        ['Laser Light', 'lighting', 45, 3, 'RGB laser light projector', '/images/laser.jpg', true]
      ];

      for (const item of equipmentData) {
        await connection.query(
          'INSERT INTO equipment (name, category, price_per_day, quantity, description, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
          item
        );
      }
      console.log('✅ Equipment data seeded');
    }

  } catch (error) {
    console.error('❌ Data seeding failed:', error);
  } finally {
    connection.release();
  }
}

module.exports = {
  pool,
  testConnection,
  initializeDatabase,
  seedData
};
