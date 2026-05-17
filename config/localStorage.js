// ============================================================================
// LOCAL FALLBACK STORAGE
// ============================================================================
// Used when database connection fails - allows testing without Aiven setup
// Data is stored in memory (resets on server restart)
// ============================================================================

const bcrypt = require('bcryptjs');

// In-memory data storage
let users = [];
let equipment = [];
let bookings = [];
let bookingItems = [];

let nextUserId = 1;
let nextEquipmentId = 1;
let nextBookingId = 1;
let nextBookingItemId = 1;

// ============================================================================
// INITIALIZATION
// ============================================================================

async function initialize() {
  console.log('💾 Using LOCAL FALLBACK MODE (no database)');
  console.log('⚠️  Data will be lost on server restart');
  console.log('💡 Configure .env to use Aiven database for persistence\n');

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  users.push({
    id: nextUserId++,
    name: 'Admin User',
    email: 'admin@jpro.com',
    password: adminPassword,
    role: 'admin',
    phone: '123-456-7890',
    created_at: new Date()
  });

  // Create demo customer
  const customerPassword = await bcrypt.hash('customer123', 10);
  users.push({
    id: nextUserId++,
    name: 'John Doe',
    email: 'customer@example.com',
    password: customerPassword,
    role: 'customer',
    phone: '987-654-3210',
    created_at: new Date()
  });

  // Seed equipment
  const equipmentData = [
    { name: 'LED Par Light', category: 'lighting', price_per_day: 25, quantity: 20, description: 'RGBW LED par light with DMX control', image: '/images/led-par.jpg', available: true },
    { name: 'Moving Head Light', category: 'lighting', price_per_day: 50, quantity: 12, description: '360W moving head spot light', image: '/images/moving-head.jpg', available: true },
    { name: 'Stage Light Bar', category: 'lighting', price_per_day: 35, quantity: 8, description: 'LED stage wash light bar', image: '/images/stage-bar.jpg', available: true },
    { name: 'Strobe Light', category: 'lighting', price_per_day: 20, quantity: 6, description: 'High-intensity strobe light', image: '/images/strobe.jpg', available: true },
    { name: 'Speaker System (Pair)', category: 'sound', price_per_day: 75, quantity: 10, description: '1000W professional speaker pair', image: '/images/speaker.jpg', available: true },
    { name: 'Subwoofer', category: 'sound', price_per_day: 50, quantity: 5, description: '15-inch powered subwoofer', image: '/images/subwoofer.jpg', available: true },
    { name: 'DJ Mixer', category: 'sound', price_per_day: 40, quantity: 4, description: '4-channel DJ mixer', image: '/images/mixer.jpg', available: true },
    { name: 'Wireless Microphone', category: 'sound', price_per_day: 30, quantity: 8, description: 'UHF wireless microphone system', image: '/images/microphone.jpg', available: true },
    { name: 'Smoke Machine', category: 'effects', price_per_day: 35, quantity: 4, description: '1000W fog machine with remote', image: '/images/smoke.jpg', available: true },
    { name: 'Laser Light', category: 'lighting', price_per_day: 45, quantity: 3, description: 'RGB laser light projector', image: '/images/laser.jpg', available: true }
  ];

  equipmentData.forEach(item => {
    equipment.push({
      id: nextEquipmentId++,
      ...item,
      created_at: new Date()
    });
  });

  console.log('✅ Demo data loaded (2 users, 10 equipment items)');
  console.log('✅ Demo Credentials:');
  console.log('   Admin: admin@jpro.com / admin123');
  console.log('   Customer: customer@example.com / customer123\n');
}

// ============================================================================
// USERS
// ============================================================================

function findUserByEmail(email) {
  return users.find(u => u.email === email);
}

function findUserById(id) {
  return users.find(u => u.id === id);
}

function createUser({ name, email, password, role, phone }) {
  const newUser = {
    id: nextUserId++,
    name,
    email,
    password,
    role: role || 'customer',
    phone: phone || '',
    created_at: new Date()
  };
  users.push(newUser);
  return newUser;
}

// ============================================================================
// EQUIPMENT
// ============================================================================

function getAllEquipment() {
  return equipment;
}

function getEquipmentById(id) {
  return equipment.find(e => e.id === id);
}

function getEquipmentByCategory(category) {
  return equipment.filter(e => e.category === category);
}

function createEquipment(data) {
  const newEquipment = {
    id: nextEquipmentId++,
    ...data,
    created_at: new Date()
  };
  equipment.push(newEquipment);
  return newEquipment;
}

function updateEquipment(id, data) {
  const index = equipment.findIndex(e => e.id === id);
  if (index !== -1) {
    equipment[index] = { ...equipment[index], ...data };
    return equipment[index];
  }
  return null;
}

function deleteEquipment(id) {
  const index = equipment.findIndex(e => e.id === id);
  if (index !== -1) {
    equipment.splice(index, 1);
    return true;
  }
  return false;
}

function getMultipleEquipment(ids) {
  return equipment.filter(e => ids.includes(e.id));
}

// ============================================================================
// BOOKINGS
// ============================================================================

function getAllBookings(userId = null) {
  if (userId) {
    return bookings.filter(b => b.user_id === userId);
  }
  return bookings;
}

function getBookingById(id) {
  return bookings.find(b => b.id === id);
}

function createBooking(data) {
  const newBooking = {
    id: nextBookingId++,
    ...data,
    created_at: new Date()
  };
  bookings.push(newBooking);
  return newBooking;
}

function updateBookingStatus(id, status) {
  const booking = bookings.find(b => b.id === id);
  if (booking) {
    booking.status = status;
    booking.updated_at = new Date();
    return booking;
  }
  return null;
}

function getBookingItems(bookingId) {
  return bookingItems.filter(bi => bi.booking_id === bookingId);
}

function addBookingItem(bookingId, equipmentId, price) {
  const newItem = {
    id: nextBookingItemId++,
    booking_id: bookingId,
    equipment_id: equipmentId,
    price_at_booking: price,
    created_at: new Date()
  };
  bookingItems.push(newItem);
  return newItem;
}

// ============================================================================
// STATS
// ============================================================================

function getStats() {
  return {
    totalBookings: bookings.length,
    pendingBookings: bookings.filter(b => b.status === 'pending').length,
    confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
    completedBookings: bookings.filter(b => b.status === 'completed').length,
    totalRevenue: bookings
      .filter(b => b.status === 'completed')
      .reduce((sum, b) => sum + parseFloat(b.total_price), 0),
    totalEquipment: equipment.length,
    totalCustomers: users.filter(u => u.role === 'customer').length
  };
}

module.exports = {
  initialize,
  findUserByEmail,
  findUserById,
  createUser,
  getAllEquipment,
  getEquipmentById,
  getEquipmentByCategory,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  getMultipleEquipment,
  getAllBookings,
  getBookingById,
  createBooking,
  updateBookingStatus,
  getBookingItems,
  addBookingItem,
  getStats
};
