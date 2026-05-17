-- ============================================================================
-- J-Pro Lights and Sounds Rentals - Database Schema
-- ============================================================================
-- MySQL Database Schema for Aiven MySQL
-- This file is for reference - tables are created automatically by the server
-- ============================================================================

-- Create database (if needed)
-- CREATE DATABASE IF NOT EXISTS jpro_rentals;
-- USE jpro_rentals;

-- ============================================================================
-- USERS TABLE
-- ============================================================================
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

-- ============================================================================
-- EQUIPMENT TABLE
-- ============================================================================
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

-- ============================================================================
-- BOOKINGS TABLE
-- ============================================================================
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

-- ============================================================================
-- BOOKING ITEMS TABLE (Junction Table)
-- ============================================================================
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

-- ============================================================================
-- SEED DATA (Optional - Server does this automatically)
-- ============================================================================

-- Admin user (password: admin123)
-- INSERT INTO users (name, email, password, role, phone) VALUES
-- ('Admin User', 'admin@jpro.com', '$2a$10$...hashed...', 'admin', '123-456-7890');

-- Demo customer (password: customer123)
-- INSERT INTO users (name, email, password, role, phone) VALUES
-- ('John Doe', 'customer@example.com', '$2a$10$...hashed...', 'customer', '987-654-3210');

-- Sample equipment
-- INSERT INTO equipment (name, category, price_per_day, quantity, description, image, available) VALUES
-- ('LED Par Light', 'lighting', 25.00, 20, 'RGBW LED par light', '/images/led-par.jpg', TRUE),
-- ('Speaker System', 'sound', 75.00, 10, 'Professional speakers', '/images/speaker.jpg', TRUE);
