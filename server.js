// ============================================================================
// J-Pro Lights and Sounds Rentals - Backend Server
// ============================================================================
// Node.js Express Backend with Aiven MySQL + Local Fallback
// ============================================================================
// The system works in TWO modes:
// 1. DATABASE MODE: Uses Aiven MySQL (when .env is configured)
// 2. LOCAL MODE: Uses in-memory storage (for quick testing)
// ============================================================================

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Resolve __dirname since it's not natively available in ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'jpro-secret-key-change-in-production';
const NODE_ENV = process.env.NODE_ENV || 'development';

// ============================================================================
// STORAGE MODE DETECTION
// ============================================================================

let storage = null;
let useDatabase = false;

async function initializeStorage() {
  // Check if database credentials are configured
  const hasDbConfig = process.env.DB_HOST && 
                      process.env.DB_HOST !== 'your-database-host.aivencloud.com' &&
                      process.env.DB_PASSWORD &&
                      process.env.DB_PASSWORD !== 'your-aiven-password-here';

  if (hasDbConfig) {
    try {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('  🗄️  DATABASE MODE - Connecting to Aiven MySQL');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
      
      // Dynamic import used here to match your original conditional loading behavior in ESM
      const { pool, testConnection, initializeDatabase, seedData } = await import('./config/database.js');
      
      const connected = await testConnection();
      if (connected) {
        await initializeDatabase();
        await seedData();
        useDatabase = true;
        storage = {
          type: 'database',
          pool,
          // Database methods are used inline in routes
        };
        console.log('✅ Using Aiven MySQL database\n');
        return;
      }
    } catch (error) {
      console.log('⚠️  Database connection failed, falling back to local mode');
      console.log('   Error:', error.message, '\n');
    }
  }

  // Fallback to local storage
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  💾 LOCAL MODE - Using in-memory storage');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('');
  console.log('⚠️  No database configured or connection failed.');
  console.log('   Using local in-memory storage for testing.');
  console.log('');
  console.log('📝 TO USE DATABASE:');
  console.log('   1. Create .env file (copy from .env.example)');
  console.log('   2. Add your Aiven MySQL credentials');
  console.log('   3. Restart the server');
  console.log('');
  
  const localStorageModule = await import('./config/localStorage.js');
  const localStorage = localStorageModule.default || localStorageModule;
  await localStorage.initialize();
  
  storage = {
    type: 'local',
    ...localStorage
  };
}

// ============================================================================
// MIDDLEWARE
// ============================================================================

app.use(cors());
app.use(express.json());

// ============================================================================
// SERVE STATIC FILES IN PRODUCTION (Render Deployment)
// ============================================================================
if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    console.log('📦 Serving static files from dist/');
  }
}

// ============================================================================
// AUTH MIDDLEWARE
// ============================================================================

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============================================================================
// AUTH ROUTES
// ============================================================================

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required' });
    }

    if (useDatabase) {
      const { pool } = storage;
      const [existingUser] = await pool.query('SELECT id FROM users WHERE email = ?', [email]);
      if (existingUser.length > 0) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const [result] = await pool.query(
        'INSERT INTO users (name, email, password, role, phone) VALUES (?, ?, ?, ?, ?)',
        [name, email, hashedPassword, 'customer', phone || '']
      );
      const token = jwt.sign({ id: result.insertId, email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({
        message: 'Registration successful',
        user: { id: result.insertId, name, email, role: 'customer' },
        token
      });
    } else {
      if (storage.findUserByEmail(email)) {
        return res.status(400).json({ error: 'Email already registered' });
      }
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = storage.createUser({ name, email, password: hashedPassword, role: 'customer', phone });
      const token = jwt.sign({ id: newUser.id, email, role: 'customer' }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({
        message: 'Registration successful',
        user: { id: newUser.id, name, email, role: 'customer' },
        token
      });
    }
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    let user;
    if (useDatabase) {
      const { pool } = storage;
      const [users] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
      if (users.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      user = users[0];
    } else {
      user = storage.findUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      message: 'Login successful',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req, res) => {
  try {
    if (useDatabase) {
      const { pool } = storage;
      const [users] = await pool.query(
        'SELECT id, name, email, role, phone FROM users WHERE id = ?',
        [req.user.id]
      );
      if (users.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json(users[0]);
    } else {
      const user = storage.findUserById(req.user.id);
      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// ============================================================================
// EQUIPMENT ROUTES
// ============================================================================

app.get('/api/equipment', async (req, res) => {
  try {
    let equipmentList;
    if (useDatabase) {
      const { pool } = storage;
      const [equipment] = await pool.query('SELECT * FROM equipment ORDER BY category, name');
      equipmentList = equipment.map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        pricePerDay: parseFloat(item.price_per_day),
        quantity: item.quantity,
        description: item.description,
        image: item.image,
        available: item.available === 1
      }));
    } else {
      equipmentList = storage.getAllEquipment().map(item => ({
        id: item.id,
        name: item.name,
        category: item.category,
        pricePerDay: parseFloat(item.price_per_day),
        quantity: item.quantity,
        description: item.description,
        image: item.image,
        available: item.available
      }));
    }
    res.json(equipmentList);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load equipment' });
  }
});

app.get('/api/equipment/:id', async (req, res) => {
  try {
    let item;
    if (useDatabase) {
      const { pool } = storage;
      const [equipment] = await pool.query('SELECT * FROM equipment WHERE id = ?', [req.params.id]);
      if (equipment.length === 0) return res.status(404).json({ error: 'Equipment not found' });
      item = equipment[0];
      res.json({
        id: item.id, name: item.name, category: item.category,
        pricePerDay: parseFloat(item.price_per_day), quantity: item.quantity,
        description: item.description, image: item.image, available: item.available === 1
      });
    } else {
      item = storage.getEquipmentById(parseInt(req.params.id));
      if (!item) return res.status(404).json({ error: 'Equipment not found' });
      res.json({
        id: item.id, name: item.name, category: item.category,
        pricePerDay: parseFloat(item.price_per_day), quantity: item.quantity,
        description: item.description, image: item.image, available: item.available
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load equipment' });
  }
});

app.post('/api/equipment', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, pricePerDay, quantity, description, image, available } = req.body;
    if (useDatabase) {
      const { pool } = storage;
      const [result] = await pool.query(
        'INSERT INTO equipment (name, category, price_per_day, quantity, description, image, available) VALUES (?, ?, ?, ?, ?, ?, ?)',
        [name, category, pricePerDay, quantity, description, image, available]
      );
      res.status(201).json({ id: result.insertId, name, category, pricePerDay, quantity, description, image, available });
    } else {
      const newItem = storage.createEquipment({ name, category, price_per_day: pricePerDay, quantity, description, image, available });
      res.status(201).json({ ...newItem, pricePerDay: newItem.price_per_day });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to add equipment' });
  }
});

app.put('/api/equipment/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { name, category, pricePerDay, quantity, description, image, available } = req.body;
    if (useDatabase) {
      const { pool } = storage;
      await pool.query(
        'UPDATE equipment SET name=?, category=?, price_per_day=?, quantity=?, description=?, image=?, available=? WHERE id=?',
        [name, category, pricePerDay, quantity, description, image, available, req.params.id]
      );
      res.json({ id: parseInt(req.params.id), name, category, pricePerDay, quantity, description, image, available });
    } else {
      storage.updateEquipment(parseInt(req.params.id), { name, category, price_per_day: pricePerDay, quantity, description, image, available });
      res.json({ id: parseInt(req.params.id), name, category, pricePerDay, quantity, description, image, available });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update equipment' });
  }
});

app.delete('/api/equipment/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (useDatabase) {
      const { pool } = storage;
      await pool.query('DELETE FROM equipment WHERE id = ?', [req.params.id]);
    } else {
      storage.deleteEquipment(parseInt(req.params.id));
    }
    res.json({ message: 'Equipment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete equipment' });
  }
});

// ============================================================================
// BOOKING ROUTES
// ============================================================================

app.get('/api/bookings', authenticateToken, async (req, res) => {
  try {
    if (useDatabase) {
      const { pool } = storage;
      let query = `SELECT b.*, u.name as user_name, u.email as user_email
                   FROM bookings b JOIN users u ON b.user_id = u.id`;
      let params = [];
      if (req.user.role !== 'admin') {
        query += ' WHERE b.user_id = ?';
        params.push(req.user.id);
      }
      query += ' ORDER BY b.created_at DESC';
      const [bookings] = await pool.query(query, params);
      
      const enrichedBookings = await Promise.all(bookings.map(async (booking) => {
        const [items] = await pool.query('SELECT equipment_id FROM booking_items WHERE booking_id = ?', [booking.id]);
        return {
          id: booking.id, userId: booking.user_id,
          userName: booking.user_name, userEmail: booking.user_email,
          equipmentIds: items.map(item => item.equipment_id),
          startDate: new Date(booking.start_date).toISOString().split('T')[0],
          endDate: new Date(booking.end_date).toISOString().split('T')[0],
          rentalDays: booking.rental_days, totalPrice: parseFloat(booking.total_price),
          status: booking.status, notes: booking.notes, createdAt: booking.created_at
        };
      }));
      res.json(enrichedBookings);
    } else {
      const bookingsList = storage.getAllBookings(req.user.role !== 'admin' ? req.user.id : null);
      const enrichedBookings = bookingsList.map(booking => {
        const user = storage.findUserById(booking.user_id);
        const items = storage.getBookingItems(booking.id);
        return {
          id: booking.id, userId: booking.user_id,
          userName: user?.name, userEmail: user?.email,
          equipmentIds: items.map(i => i.equipment_id),
          startDate: new Date(booking.start_date).toISOString().split('T')[0],
          endDate: new Date(booking.end_date).toISOString().split('T')[0],
          rentalDays: booking.rental_days, totalPrice: parseFloat(booking.total_price),
          status: booking.status, notes: booking.notes, createdAt: booking.created_at
        };
      });
      res.json(enrichedBookings.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load bookings' });
  }
});

app.get('/api/bookings/:id', authenticateToken, async (req, res) => {
  try {
    let booking;
    if (useDatabase) {
      const { pool } = storage;
      const [bookings] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });
      booking = bookings[0];
      if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const [items] = await pool.query('SELECT equipment_id FROM booking_items WHERE booking_id = ?', [booking.id]);
      res.json({
        id: booking.id, userId: booking.user_id,
        equipmentIds: items.map(i => i.equipment_id),
        startDate: new Date(booking.start_date).toISOString().split('T')[0],
        endDate: new Date(booking.end_date).toISOString().split('T')[0],
        rentalDays: booking.rental_days, totalPrice: parseFloat(booking.total_price),
        status: booking.status, notes: booking.notes, createdAt: booking.created_at
      });
    } else {
      booking = storage.getBookingById(parseInt(req.params.id));
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (req.user.role !== 'admin' && booking.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }
      const items = storage.getBookingItems(booking.id);
      res.json({
        id: booking.id, userId: booking.user_id,
        equipmentIds: items.map(i => i.equipment_id),
        startDate: new Date(booking.start_date).toISOString().split('T')[0],
        endDate: new Date(booking.end_date).toISOString().split('T')[0],
        rentalDays: booking.rental_days, totalPrice: parseFloat(booking.total_price),
        status: booking.status, notes: booking.notes, createdAt: booking.created_at
      });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load booking' });
  }
});

app.post('/api/bookings', authenticateToken, async (req, res) => {
  try {
    const { equipmentIds, startDate, endDate, notes } = req.body;
    if (!equipmentIds || !startDate || !endDate) {
      return res.status(400).json({ error: 'Equipment, start date, and end date are required' });
    }

    const rentalDays = Math.ceil((new Date(endDate) - new Date(startDate)) / (1000 * 60 * 60 * 24)) + 1;

    if (useDatabase) {
      const { pool } = storage;
      const connection = await pool.getConnection();
      try {
        await connection.beginTransaction();
        const [equipment] = await connection.query('SELECT id, price_per_day FROM equipment WHERE id IN (?)', [equipmentIds]);
        let totalPrice = 0;
        equipment.forEach(item => { totalPrice += parseFloat(item.price_per_day) * rentalDays; });
        const [result] = await connection.query(
          'INSERT INTO bookings (user_id, start_date, end_date, rental_days, total_price, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [req.user.id, startDate, endDate, rentalDays, totalPrice, 'pending', notes || '']
        );
        const bookingId = result.insertId;
        for (const eq of equipment) {
          await connection.query(
            'INSERT INTO booking_items (booking_id, equipment_id, price_at_booking) VALUES (?, ?, ?)',
            [bookingId, eq.id, eq.price_per_day]
          );
        }
        await connection.commit();
        res.status(201).json({ id: bookingId, userId: req.user.id, equipmentIds, startDate, endDate, rentalDays, totalPrice, status: 'pending', notes: notes || '', createdAt: new Date().toISOString() });
      } catch (error) {
        await connection.rollback();
        throw error;
      } finally {
        connection.release();
      }
    } else {
      const selectedEquipment = storage.getMultipleEquipment(equipmentIds);
      let totalPrice = 0;
      selectedEquipment.forEach(item => { totalPrice += parseFloat(item.price_per_day) * rentalDays; });
      const newBooking = storage.createBooking({
        user_id: req.user.id, start_date: startDate, end_date: endDate,
        rental_days: rentalDays, total_price: totalPrice, status: 'pending', notes: notes || ''
      });
      selectedEquipment.forEach(eq => {
        storage.addBookingItem(newBooking.id, eq.id, eq.price_per_day);
      });
      res.status(201).json({ id: newBooking.id, userId: req.user.id, equipmentIds, startDate, endDate, rentalDays, totalPrice, status: 'pending', notes: notes || '', createdAt: newBooking.created_at });
    }
  } catch (error) {
    res.status(500).json({ error: 'Booking creation failed' });
  }
});

app.patch('/api/bookings/:id/status', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    if (useDatabase) {
      const { pool } = storage;
      await pool.query('UPDATE bookings SET status = ? WHERE id = ?', [status, req.params.id]);
    } else {
      storage.updateBookingStatus(parseInt(req.params.id), status);
    }
    res.json({ id: parseInt(req.params.id), status });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update booking' });
  }
});

app.patch('/api/bookings/:id/cancel', authenticateToken, async (req, res) => {
  try {
    let booking;
    if (useDatabase) {
      const { pool } = storage;
      const [bookings] = await pool.query('SELECT * FROM bookings WHERE id = ?', [req.params.id]);
      if (bookings.length === 0) return res.status(404).json({ error: 'Booking not found' });
      booking = bookings[0];
      if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
      if (!['pending', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: 'Cannot cancel this booking' });
      await pool.query('UPDATE bookings SET status = ? WHERE id = ?', ['cancelled', req.params.id]);
    } else {
      booking = storage.getBookingById(parseInt(req.params.id));
      if (!booking) return res.status(404).json({ error: 'Booking not found' });
      if (booking.user_id !== req.user.id) return res.status(403).json({ error: 'Access denied' });
      if (!['pending', 'confirmed'].includes(booking.status)) return res.status(400).json({ error: 'Cannot cancel this booking' });
      storage.updateBookingStatus(booking.id, 'cancelled');
    }
    res.json({ id: parseInt(req.params.id), status: 'cancelled' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel booking' });
  }
});

// ============================================================================
// STATS ROUTES
// ============================================================================

app.get('/api/stats', authenticateToken, requireAdmin, async (req, res) => {
  try {
    if (useDatabase) {
      const { pool } = storage;
      const [totalBookings] = await pool.query('SELECT COUNT(*) as count FROM bookings');
      const [pendingBookings] = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE status = ?', ['pending']);
      const [confirmedBookings] = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE status = ?', ['confirmed']);
      const [completedBookings] = await pool.query('SELECT COUNT(*) as count FROM bookings WHERE status = ?', ['completed']);
      const [totalRevenue] = await pool.query('SELECT COALESCE(SUM(total_price), 0) as revenue FROM bookings WHERE status = ?', ['completed']);
      const [totalEquipment] = await pool.query('SELECT COUNT(*) as count FROM equipment');
      const [totalCustomers] = await pool.query('SELECT COUNT(*) as count FROM users WHERE role = ?', ['customer']);
      res.json({
        totalBookings: totalBookings[0].count,
        pendingBookings: pendingBookings[0].count,
        confirmedBookings: confirmedBookings[0].count,
        completedBookings: completedBookings[0].count,
        totalRevenue: parseFloat(totalRevenue[0].revenue),
        totalEquipment: totalEquipment[0].count,
        totalCustomers: totalCustomers[0].count
      });
    } else {
      res.json(storage.getStats());
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to load statistics' });
  }
});

// ============================================================================
// SERVE FRONTEND IN PRODUCTION (Catch-all route for React Router)
// ============================================================================
if (NODE_ENV === 'production') {
  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    // JavaScript RegExp natively bypasses path-to-regexp parser conflicts in newer Express versions.
    // This targets all browser URL changes while leaving backend /api points functional.
    app.get(/^(?!\/api).*$/, (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }
}

// ============================================================================
// START SERVER
// ============================================================================

async function startServer() {
  console.log('\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  J-Pro Lights and Sounds Rentals - Booking System');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  
  await initializeStorage();
  
  app.listen(PORT, () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📍 API Base URL: http://localhost:${PORT}/api`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
  process.exit(1);
});

export default app;
