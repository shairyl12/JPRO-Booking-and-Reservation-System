// ============================================================================
// J-Pro Lights and Sounds Rentals - Main Application
// ============================================================================
// React Frontend with Routing and State Management
// ============================================================================

import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link, useNavigate } from 'react-router-dom';
import { 
  Lightbulb, Volume2, Calendar, User, LogOut, Menu, X, 
  CheckCircle, Clock, XCircle, DollarSign, Package,
  Plus, ChevronRight, Phone, Mail, MapPin, Star
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';

// ============================================================================
// API CONFIGURATION
// ============================================================================

const API_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ============================================================================
// TYPES
// ============================================================================

interface User {
  id: number;
  name: string;
  email: string;
  role: 'admin' | 'customer';
  phone?: string;
}

interface Equipment {
  id: number;
  name: string;
  category: 'lighting' | 'sound' | 'effects';
  pricePerDay: number;
  quantity: number;
  description: string;
  image: string;
  available: boolean;
}

interface Booking {
  id: number;
  userId: number;
  equipmentIds: number[];
  startDate: string;
  endDate: string;
  rentalDays: number;
  totalPrice: number;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  notes: string;
  userName?: string;
  userEmail?: string;
  createdAt: string;
}

// ============================================================================
// AUTH CONTEXT
// ============================================================================

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, phone: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

// ============================================================================
// AUTH PROVIDER
// ============================================================================

const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));

  useEffect(() => {
    if (token) {
      api.get('/auth/me')
        .then(res => setUser(res.data))
        .catch(() => {
          localStorage.removeItem('token');
          setToken(null);
        });
    }
  }, [token]);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.post('/auth/login', { email, password });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      toast.success('Welcome back!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Login failed');
      throw error;
    }
  };

  const register = async (name: string, email: string, password: string, phone: string) => {
    try {
      const res = await api.post('/auth/register', { name, email, password, phone });
      localStorage.setItem('token', res.data.token);
      setToken(res.data.token);
      setUser(res.data.user);
      toast.success('Registration successful!');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Registration failed');
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      login,
      register,
      logout,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================================
// NAVIGATION COMPONENT
// ============================================================================

const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();

  return (
    <nav className="bg-slate-900/95 backdrop-blur-sm sticky top-0 z-50 border-b border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="flex items-center space-x-2">
              <Lightbulb className="w-8 h-8 text-yellow-400" />
              <Volume2 className="w-8 h-8 text-cyan-400" />
            </div>
            <div>
              <span className="text-xl font-bold text-white">J-Pro</span>
              <span className="text-xl text-cyan-400">Lights & Sounds</span>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/" className="text-slate-300 hover:text-white transition-colors">Home</Link>
            <Link to="/equipment" className="text-slate-300 hover:text-white transition-colors">Equipment</Link>
            <Link to="/about" className="text-slate-300 hover:text-white transition-colors">About</Link>
            <Link to="/contact" className="text-slate-300 hover:text-white transition-colors">Contact</Link>
            
            {isAuthenticated ? (
              <>
                <Link to="/bookings" className="text-slate-300 hover:text-white transition-colors">My Bookings</Link>
                {user?.role === 'admin' && (
                  <Link to="/admin/dashboard" className="text-slate-300 hover:text-white transition-colors">Admin</Link>
                )}
                <button
                  onClick={logout}
                  className="flex items-center space-x-1 text-red-400 hover:text-red-300 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-slate-300 hover:text-white transition-colors">Login</Link>
                <Link to="/register" className="bg-cyan-500 hover:bg-cyan-600 text-white px-4 py-2 rounded-lg transition-colors">
                  Sign Up
                </Link>
              </>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="md:hidden text-white p-2"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu */}
        {isOpen && (
          <div className="md:hidden py-4 border-t border-slate-700">
            <div className="flex flex-col space-y-4">
              <Link to="/" className="text-slate-300 hover:text-white" onClick={() => setIsOpen(false)}>Home</Link>
              <Link to="/equipment" className="text-slate-300 hover:text-white" onClick={() => setIsOpen(false)}>Equipment</Link>
              <Link to="/about" className="text-slate-300 hover:text-white" onClick={() => setIsOpen(false)}>About</Link>
              <Link to="/contact" className="text-slate-300 hover:text-white" onClick={() => setIsOpen(false)}>Contact</Link>
              
              {isAuthenticated ? (
                <>
                  <Link to="/bookings" className="text-slate-300 hover:text-white" onClick={() => setIsOpen(false)}>My Bookings</Link>
                  {user?.role === 'admin' && (
                    <Link to="/admin/dashboard" className="text-slate-300 hover:text-white" onClick={() => setIsOpen(false)}>Admin Dashboard</Link>
                  )}
                  <button onClick={() => { logout(); setIsOpen(false); }} className="text-red-400 text-left">
                    Logout
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-slate-300 hover:text-white" onClick={() => setIsOpen(false)}>Login</Link>
                  <Link to="/register" className="bg-cyan-500 text-white px-4 py-2 rounded-lg text-center" onClick={() => setIsOpen(false)}>
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

// ============================================================================
// FOOTER COMPONENT
// ============================================================================

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 border-t border-slate-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center space-x-2 mb-4">
              <Lightbulb className="w-8 h-8 text-yellow-400" />
              <Volume2 className="w-8 h-8 text-cyan-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">J-Pro Lights & Sounds Rentals</h3>
            <p className="text-slate-400">
              Professional lighting and sound equipment rental for all your events.
              Make your next event unforgettable with our premium equipment.
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2">
              <li><Link to="/equipment" className="text-slate-400 hover:text-cyan-400">Equipment</Link></li>
              <li><Link to="/about" className="text-slate-400 hover:text-cyan-400">About Us</Link></li>
              <li><Link to="/contact" className="text-slate-400 hover:text-cyan-400">Contact</Link></li>
              <li><Link to="/bookings" className="text-slate-400 hover:text-cyan-400">My Bookings</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-2 text-slate-400">
              <li className="flex items-center space-x-2">
                <Phone className="w-4 h-4" />
                <span>(123) 456-7890</span>
              </li>
              <li className="flex items-center space-x-2">
                <Mail className="w-4 h-4" />
                <span>info@jprolights.com</span>
              </li>
              <li className="flex items-center space-x-2">
                <MapPin className="w-4 h-4" />
                <span>123 Event Street, City</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-700 mt-8 pt-8 text-center text-slate-400">
          <p>&copy; 2024 J-Pro Lights & Sounds Rentals. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

// ============================================================================
// HOME PAGE
// ============================================================================

const HomePage: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const features = [
    {
      icon: <Calendar className="w-8 h-8" />,
      title: 'Easy Online Booking',
      description: 'Book your equipment anytime, anywhere with our user-friendly online system.'
    },
    {
      icon: <Package className="w-8 h-8" />,
      title: 'Premium Equipment',
      description: 'High-quality lighting and sound equipment for events of all sizes.'
    },
    {
      icon: <DollarSign className="w-8 h-8" />,
      title: 'Competitive Pricing',
      description: 'Affordable daily rates with transparent pricing and no hidden fees.'
    },
    {
      icon: <CheckCircle className="w-8 h-8" />,
      title: 'Reliable Service',
      description: 'Professional support and reliable equipment for your peace of mind.'
    }
  ];

  const stats = [
    { number: '500+', label: 'Events Served' },
    { number: '100+', label: 'Equipment Items' },
    { number: '99%', label: 'Customer Satisfaction' },
    { number: '24/7', label: 'Support Available' }
  ];

  return (
    <div className="min-h-screen">
      {/* Hero Section - ADD YOUR BACKGROUND IMAGE HERE */}
      <section 
        className="relative h-[600px] flex items-center justify-center text-center text-white"
        style={{
          // REPLACE THIS URL WITH YOUR BACKGROUND IMAGE
          backgroundImage: 'linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.8)), url(https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1920)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="max-w-4xl mx-auto px-4">
          <h1 className="text-5xl md:text-6xl font-bold mb-6">
            Professional <span className="text-yellow-400">Lighting</span> & <span className="text-cyan-400">Sound</span> Equipment Rental
          </h1>
          <p className="text-xl text-slate-300 mb-8">
            Transform your events with premium equipment and seamless online booking.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => navigate('/equipment')}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <Package className="w-5 h-5" />
              <span>Browse Equipment</span>
            </button>
            <button
              onClick={() => navigate(isAuthenticated ? '/bookings' : '/register')}
              className="bg-yellow-500 hover:bg-yellow-600 text-slate-900 px-8 py-4 rounded-lg text-lg font-semibold transition-colors flex items-center justify-center space-x-2"
            >
              <Calendar className="w-5 h-5" />
              <span>{isAuthenticated ? 'Book Now' : 'Get Started'}</span>
            </button>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-slate-900 py-16">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-4xl font-bold text-cyan-400 mb-2">{stat.number}</div>
                <div className="text-slate-400">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-slate-800">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Why Choose J-Pro?
          </h2>
          <p className="text-slate-400 text-center mb-12 max-w-2xl mx-auto">
            We make event planning easier with our comprehensive rental solutions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <div key={index} className="bg-slate-900 p-6 rounded-xl text-center">
                <div className="text-cyan-400 flex justify-center mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-white text-center mb-4">
            Our Equipment Categories
          </h2>
          <p className="text-slate-400 text-center mb-12">
            Everything you need for your perfect event
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Link to="/equipment?category=lighting" className="group relative overflow-hidden rounded-xl h-64">
              <div 
                className="absolute inset-0 bg-gradient-to-br from-yellow-600 to-orange-600 group-hover:scale-110 transition-transform duration-300"
                style={{
                  backgroundImage: 'url(https://images.unsplash.com/photo-1514525253440-b393452e8d26?w=600)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Lightbulb className="w-12 h-12 mb-4" />
                <h3 className="text-2xl font-bold">Lighting</h3>
                <p className="text-slate-300">Stage lights, LED panels, and more</p>
                <ChevronRight className="w-6 h-6 mt-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
            <Link to="/equipment?category=sound" className="group relative overflow-hidden rounded-xl h-64">
              <div 
                className="absolute inset-0 bg-gradient-to-br from-cyan-600 to-blue-600 group-hover:scale-110 transition-transform duration-300"
                style={{
                  backgroundImage: 'url(https://images.unsplash.com/photo-1516280440614-6697288d5d38?w=600)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Volume2 className="w-12 h-12 mb-4" />
                <h3 className="text-2xl font-bold">Sound</h3>
                <p className="text-slate-300">Speakers, mixers, and microphones</p>
                <ChevronRight className="w-6 h-6 mt-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
            <Link to="/equipment?category=effects" className="group relative overflow-hidden rounded-xl h-64">
              <div 
                className="absolute inset-0 bg-gradient-to-br from-purple-600 to-pink-600 group-hover:scale-110 transition-transform duration-300"
                style={{
                  backgroundImage: 'url(https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=600)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center'
                }}
              />
              <div className="absolute inset-0 bg-black/50" />
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                <Star className="w-12 h-12 mb-4" />
                <h3 className="text-2xl font-bold">Effects</h3>
                <p className="text-slate-300">Smoke machines and special effects</p>
                <ChevronRight className="w-6 h-6 mt-4 group-hover:translate-x-2 transition-transform" />
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-cyan-600 to-blue-600">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Make Your Event Unforgettable?
          </h2>
          <p className="text-white/90 mb-8 text-lg">
            Book your equipment today and let us help you create the perfect atmosphere.
          </p>
          <button
            onClick={() => navigate(isAuthenticated ? '/equipment' : '/register')}
            className="bg-white text-cyan-600 hover:bg-slate-100 px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
          >
            Start Booking Now
          </button>
        </div>
      </section>
    </div>
  );
};

// ============================================================================
// LOGIN PAGE
// ============================================================================

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(z.object({
      email: z.string().email('Invalid email address'),
      password: z.string().min(1, 'Password is required')
    }))
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await login(data.email, data.password);
      navigate('/');
    } catch (error) {
      // Error handled in login function
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center space-x-2 mb-4">
              <Lightbulb className="w-10 h-10 text-yellow-400" />
              <Volume2 className="w-10 h-10 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Welcome Back</h2>
            <p className="text-slate-400 mt-2">Sign in to your account</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="your@email.com"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                {...register('password')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message as string}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-slate-400 mt-6">
            Don't have an account?{' '}
            <Link to="/register" className="text-cyan-400 hover:text-cyan-300">Sign up</Link>
          </p>

          <div className="mt-6 p-4 bg-slate-700 rounded-lg">
            <p className="text-xs text-slate-400 text-center mb-2">Demo Credentials:</p>
            <p className="text-xs text-slate-300">Admin: admin@jpro.com / admin123</p>
            <p className="text-xs text-slate-300">Customer: customer@example.com / customer123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// REGISTER PAGE
// ============================================================================

const RegisterPage: React.FC = () => {
  const { register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(2, 'Name must be at least 2 characters'),
      email: z.string().email('Invalid email address'),
      password: z.string().min(6, 'Password must be at least 6 characters'),
      confirmPassword: z.string(),
      phone: z.string().optional()
    }).refine(data => data.password === data.confirmPassword, {
      message: "Passwords don't match",
      path: ['confirmPassword']
    }))
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    try {
      await registerUser(data.name, data.email, data.password, data.phone || '');
      navigate('/');
    } catch (error) {
      // Error handled in register function
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center py-12 px-4">
      <div className="max-w-md w-full">
        <div className="bg-slate-800 rounded-xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="flex justify-center space-x-2 mb-4">
              <Lightbulb className="w-10 h-10 text-yellow-400" />
              <Volume2 className="w-10 h-10 text-cyan-400" />
            </div>
            <h2 className="text-2xl font-bold text-white">Create Account</h2>
            <p className="text-slate-400 mt-2">Join us and start booking equipment</p>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Full Name</label>
              <input
                type="text"
                {...register('name')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="John Doe"
              />
              {errors.name && <p className="text-red-400 text-sm mt-1">{errors.name.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
              <input
                type="email"
                {...register('email')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="your@email.com"
              />
              {errors.email && <p className="text-red-400 text-sm mt-1">{errors.email.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Phone (Optional)</label>
              <input
                type="tel"
                {...register('phone')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="(123) 456-7890"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <input
                type="password"
                {...register('password')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="••••••••"
              />
              {errors.password && <p className="text-red-400 text-sm mt-1">{errors.password.message as string}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm Password</label>
              <input
                type="password"
                {...register('confirmPassword')}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                placeholder="••••••••"
              />
              {errors.confirmPassword && <p className="text-red-400 text-sm mt-1">{errors.confirmPassword.message as string}</p>}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-slate-400 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-cyan-400 hover:text-cyan-300">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EQUIPMENT PAGE
// ============================================================================

const EquipmentPage: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/equipment')
      .then(res => {
        setEquipment(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load equipment');
        setLoading(false);
      });
  }, []);

  const filteredEquipment = category === 'all' 
    ? equipment 
    : equipment.filter(e => e.category === category);

  const toggleSelection = (id: number) => {
    setSelectedItems(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleBookNow = () => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    setShowBookingModal(true);
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Our Equipment</h1>
          <p className="text-slate-400 max-w-2xl mx-auto">
            Browse our extensive collection of professional lighting, sound, and effects equipment.
          </p>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          {['all', 'lighting', 'sound', 'effects'].map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                category === cat 
                  ? 'bg-cyan-500 text-white' 
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>

        {/* Equipment Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEquipment.map(item => (
              <div 
                key={item.id}
                className={`bg-slate-800 rounded-xl overflow-hidden transition-all cursor-pointer ${
                  selectedItems.includes(item.id) ? 'ring-2 ring-cyan-500' : ''
                }`}
                onClick={() => toggleSelection(item.id)}
              >
                <div 
                  className="h-48 bg-slate-700 flex items-center justify-center"
                  style={{
                    backgroundImage: `url(${item.image})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
                >
                  <div className="text-6xl">
                    {item.category === 'lighting' && <Lightbulb />}
                    {item.category === 'sound' && <Volume2 />}
                    {item.category === 'effects' && <Star />}
                  </div>
                </div>
                <div className="p-6">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-xl font-semibold text-white">{item.name}</h3>
                    <span className="text-cyan-400 font-bold">${item.pricePerDay}/day</span>
                  </div>
                  <p className="text-slate-400 text-sm mb-4">{item.description}</p>
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400 text-sm">Available: {item.quantity} units</span>
                    {selectedItems.includes(item.id) && (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Floating Booking Button */}
        {selectedItems.length > 0 && (
          <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
            <button
              onClick={handleBookNow}
              className="bg-cyan-500 hover:bg-cyan-600 text-white px-8 py-4 rounded-lg font-semibold shadow-lg flex items-center space-x-2"
            >
              <Calendar className="w-5 h-5" />
              <span>Book {selectedItems.length} Item{selectedItems.length > 1 ? 's' : ''}</span>
            </button>
          </div>
        )}

        {/* Booking Modal */}
        {showBookingModal && (
          <BookingModal 
            equipmentIds={selectedItems}
            onClose={() => setShowBookingModal(false)}
          />
        )}
      </div>
    </div>
  );
};

// ============================================================================
// BOOKING MODAL
// ============================================================================

const BookingModal: React.FC<{ equipmentIds: number[]; onClose: () => void }> = ({ equipmentIds, onClose }) => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  useAuth();

  const { register, handleSubmit, formState: { errors }, watch } = useForm({
    resolver: zodResolver(z.object({
      startDate: z.string().min(1, 'Start date is required'),
      endDate: z.string().min(1, 'End date is required'),
      notes: z.string().optional()
    }))
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  useEffect(() => {
    api.get('/equipment')
      .then(res => {
        setEquipment(res.data.filter((e: Equipment) => equipmentIds.includes(e.id)));
        setLoading(false);
      });
  }, [equipmentIds]);

  const calculateTotal = () => {
    if (!startDate || !endDate) return 0;
    const days = Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1;
    return equipment.reduce((sum, item) => sum + (item.pricePerDay * days), 0);
  };

  const onSubmit = async (data: any) => {
    setSubmitting(true);
    try {
      await api.post('/bookings', {
        equipmentIds,
        startDate: data.startDate,
        endDate: data.endDate,
        notes: data.notes
      });
      toast.success('Booking created successfully!');
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create booking');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="fixed inset-0 bg-black/50 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div></div>;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">Complete Your Booking</h2>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6">
          {/* Selected Equipment */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Selected Equipment</h3>
            <div className="space-y-3">
              {equipment.map(item => (
                <div key={item.id} className="bg-slate-700 p-4 rounded-lg flex justify-between items-center">
                  <div>
                    <p className="text-white font-medium">{item.name}</p>
                    <p className="text-slate-400 text-sm">${item.pricePerDay}/day</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Start Date</label>
              <input
                type="date"
                {...register('startDate')}
                min={new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {errors.startDate && <p className="text-red-400 text-sm mt-1">{errors.startDate.message as string}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">End Date</label>
              <input
                type="date"
                {...register('endDate')}
                min={startDate || new Date().toISOString().split('T')[0]}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />
              {errors.endDate && <p className="text-red-400 text-sm mt-1">{errors.endDate.message as string}</p>}
            </div>
          </div>

          {/* Notes */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-300 mb-2">Special Notes (Optional)</label>
            <textarea
              {...register('notes')}
              rows={3}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              placeholder="Any special requirements or instructions..."
            />
          </div>

          {/* Total */}
          <div className="bg-slate-700 p-4 rounded-lg mb-6">
            <div className="flex justify-between items-center">
              <span className="text-slate-300">Estimated Total</span>
              <span className="text-2xl font-bold text-cyan-400">${calculateTotal().toFixed(2)}</span>
            </div>
            <p className="text-slate-400 text-sm mt-1">
              {startDate && endDate && `${Math.ceil((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 60 * 60 * 24)) + 1} day(s) rental`}
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-lg font-semibold transition-colors disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Confirm Booking'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// MY BOOKINGS PAGE
// ============================================================================

const BookingsPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  useAuth();

  useEffect(() => {
    api.get('/bookings')
      .then(res => {
        setBookings(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load bookings');
        setLoading(false);
      });
  }, []);

  const cancelBooking = async (id: number) => {
    if (!confirm('Are you sure you want to cancel this booking?')) return;
    try {
      await api.patch(`/bookings/${id}/cancel`);
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'cancelled' } : b));
      toast.success('Booking cancelled successfully');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to cancel booking');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed': return <CheckCircle className="w-4 h-4" />;
      case 'pending': return <Clock className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      case 'cancelled': return <XCircle className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">My Bookings</h1>
            <p className="text-slate-400">Manage your equipment reservations</p>
          </div>
          <Link to="/equipment" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2">
            <Plus className="w-5 h-5" />
            <span>New Booking</span>
          </Link>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="bg-slate-800 rounded-xl p-12 text-center">
            <Calendar className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">No bookings yet</h3>
            <p className="text-slate-400 mb-6">Start by browsing our equipment and make your first reservation!</p>
            <Link to="/equipment" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold inline-flex items-center space-x-2">
              <Package className="w-5 h-5" />
              <span>Browse Equipment</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map(booking => (
              <div key={booking.id} className="bg-slate-800 rounded-xl p-6">
                <div className="flex flex-wrap justify-between items-start gap-4">
                  <div>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium flex items-center space-x-1 ${getStatusColor(booking.status)}`}>
                        {getStatusIcon(booking.status)}
                        <span>{booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}</span>
                      </span>
                      <span className="text-slate-400 text-sm">Booking #{booking.id}</span>
                    </div>
                    <p className="text-slate-400 text-sm">
                      {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                      {' '}({booking.rentalDays} days)
                    </p>
                    {booking.notes && <p className="text-slate-500 text-sm mt-2 italic">"{booking.notes}"</p>}
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-cyan-400">${booking.totalPrice.toFixed(2)}</p>
                    {booking.status === 'pending' && (
                      <button
                        onClick={() => cancelBooking(booking.id)}
                        className="mt-2 text-red-400 hover:text-red-300 text-sm"
                      >
                        Cancel Booking
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ADMIN DASHBOARD
// ============================================================================

const AdminDashboard: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/stats'),
      api.get('/bookings')
    ]).then(([statsRes, bookingsRes]) => {
      setStats(statsRes.data);
      setBookings(bookingsRes.data);
      setLoading(false);
    }).catch(() => {
      toast.error('Failed to load dashboard data');
      setLoading(false);
    });
  }, []);

  const updateBookingStatus = async (id: number, status: Booking['status']) => {
    try {
      await api.patch(`/bookings/${id}/status`, { status });
      setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b));
      toast.success(`Booking ${status}`);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to update booking');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/20 text-green-400';
      case 'pending': return 'bg-yellow-500/20 text-yellow-400';
      case 'completed': return 'bg-blue-500/20 text-blue-400';
      case 'cancelled': return 'bg-red-500/20 text-red-400';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  if (!useAuth().isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-400">Manage bookings and view statistics</p>
          </div>
          <Link to="/admin/equipment" className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>Manage Equipment</span>
          </Link>
        </div>

        {/* Stats Cards */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <div className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Total Bookings</p>
                    <p className="text-3xl font-bold text-white">{stats?.totalBookings}</p>
                  </div>
                  <Calendar className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Pending</p>
                    <p className="text-3xl font-bold text-yellow-400">{stats?.pendingBookings}</p>
                  </div>
                  <Clock className="w-8 h-8 text-yellow-400" />
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Confirmed</p>
                    <p className="text-3xl font-bold text-green-400">{stats?.confirmedBookings}</p>
                  </div>
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
              </div>
              <div className="bg-slate-800 rounded-xl p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-slate-400 text-sm">Revenue</p>
                    <p className="text-3xl font-bold text-cyan-400">${stats?.totalRevenue}</p>
                  </div>
                  <DollarSign className="w-8 h-8 text-cyan-400" />
                </div>
              </div>
            </div>

            {/* Bookings Table */}
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <div className="p-6 border-b border-slate-700">
                <h2 className="text-xl font-bold text-white">Recent Bookings</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Customer</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Dates</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Total</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-slate-300 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {bookings.map(booking => (
                      <tr key={booking.id} className="hover:bg-slate-700/50">
                        <td className="px-6 py-4 text-slate-300">#{booking.id}</td>
                        <td className="px-6 py-4 text-slate-300">{booking.userName}</td>
                        <td className="px-6 py-4 text-slate-300 text-sm">
                          {new Date(booking.startDate).toLocaleDateString()} - {new Date(booking.endDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-cyan-400 font-semibold">${booking.totalPrice.toFixed(2)}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(booking.status)}`}>
                            {booking.status}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex space-x-2">
                            {booking.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => updateBookingStatus(booking.id, 'confirmed')}
                                  className="text-green-400 hover:text-green-300"
                                  title="Confirm"
                                >
                                  <CheckCircle className="w-5 h-5" />
                                </button>
                                <button
                                  onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                                  className="text-red-400 hover:text-red-300"
                                  title="Cancel"
                                >
                                  <XCircle className="w-5 h-5" />
                                </button>
                              </>
                            )}
                            {booking.status === 'confirmed' && (
                              <button
                                onClick={() => updateBookingStatus(booking.id, 'completed')}
                                className="text-blue-400 hover:text-blue-300"
                                title="Mark Complete"
                              >
                                <CheckCircle className="w-5 h-5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// ADMIN EQUIPMENT MANAGEMENT
// ============================================================================

const AdminEquipmentPage: React.FC = () => {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState<Equipment | null>(null);

  useEffect(() => {
    api.get('/equipment')
      .then(res => {
        setEquipment(res.data);
        setLoading(false);
      })
      .catch(() => {
        toast.error('Failed to load equipment');
        setLoading(false);
      });
  }, []);

  const deleteEquipment = async (id: number) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;
    try {
      await api.delete(`/equipment/${id}`);
      setEquipment(prev => prev.filter(e => e.id !== id));
      toast.success('Equipment deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to delete');
    }
  };

  const saveEquipment = async (data: any) => {
    try {
      if (editingItem) {
        await api.put(`/equipment/${editingItem.id}`, data);
        setEquipment(prev => prev.map(e => e.id === editingItem.id ? { ...e, ...data } : e));
        toast.success('Equipment updated');
      } else {
        const res = await api.post('/equipment', data);
        setEquipment(prev => [...prev, res.data]);
        toast.success('Equipment added');
      }
      setShowModal(false);
      setEditingItem(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to save');
    }
  };

  if (!useAuth().isAdmin) {
    return <Navigate to="/" />;
  }

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white">Equipment Management</h1>
            <p className="text-slate-400">Add, edit, or remove equipment from inventory</p>
          </div>
          <button
            onClick={() => { setEditingItem(null); setShowModal(true); }}
            className="bg-cyan-500 hover:bg-cyan-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors flex items-center space-x-2"
          >
            <Plus className="w-5 h-5" />
            <span>Add Equipment</span>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500 mx-auto"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {equipment.map(item => (
              <div key={item.id} className="bg-slate-800 rounded-xl overflow-hidden">
                <div className="h-40 bg-slate-700 flex items-center justify-center">
                  <div className="text-6xl">
                    {item.category === 'lighting' && <Lightbulb />}
                    {item.category === 'sound' && <Volume2 />}
                    {item.category === 'effects' && <Star />}
                  </div>
                </div>
                <div className="p-6">
                  <h3 className="text-xl font-semibold text-white mb-2">{item.name}</h3>
                  <p className="text-slate-400 text-sm mb-4">{item.description}</p>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-cyan-400 font-bold">${item.pricePerDay}/day</span>
                    <span className="text-slate-400 text-sm">{item.quantity} units</span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => { setEditingItem(item); setShowModal(true); }}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-2 rounded-lg text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteEquipment(item.id)}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 py-2 rounded-lg text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <EquipmentModal
          equipment={editingItem}
          onSave={saveEquipment}
          onClose={() => { setShowModal(false); setEditingItem(null); }}
        />
      )}
    </div>
  );
};

// ============================================================================
// EQUIPMENT MODAL (ADMIN)
// ============================================================================

const EquipmentModal: React.FC<{ equipment: Equipment | null; onSave: (data: any) => void; onClose: () => void }> = ({ equipment, onSave, onClose }) => {
  const { register, handleSubmit } = useForm({
    defaultValues: equipment || {
      name: '',
      category: 'lighting',
      pricePerDay: 0,
      quantity: 1,
      description: '',
      image: '',
      available: true
    }
  });

  const onSubmit = (data: any) => {
    onSave({
      ...data,
      pricePerDay: parseFloat(data.pricePerDay),
      quantity: parseInt(data.quantity)
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 rounded-xl max-w-lg w-full">
        <div className="p-6 border-b border-slate-700">
          <h2 className="text-2xl font-bold text-white">{equipment ? 'Edit Equipment' : 'Add Equipment'}</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
            <input
              type="text"
              {...register('name')}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Category</label>
            <select
              {...register('category')}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
            >
              <option value="lighting">Lighting</option>
              <option value="sound">Sound</option>
              <option value="effects">Effects</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Price per Day ($)</label>
              <input
                type="number"
                {...register('pricePerDay', { valueAsNumber: true })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Quantity</label>
              <input
                type="number"
                {...register('quantity', { valueAsNumber: true })}
                className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
            <textarea
              {...register('description')}
              rows={3}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Image URL</label>
            <input
              type="text"
              {...register('image')}
              className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
              placeholder="https://..."
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white py-3 rounded-lg">
              Cancel
            </button>
            <button type="submit" className="flex-1 bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-lg">
              {equipment ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ============================================================================
// ABOUT PAGE
// ============================================================================

const AboutPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">About J-Pro Lights & Sounds</h1>
          <p className="text-slate-400 text-lg">Your trusted partner for professional event equipment</p>
        </div>

        <div className="bg-slate-800 rounded-xl p-8 mb-8">
          <h2 className="text-2xl font-bold text-white mb-4">Our Story</h2>
          <p className="text-slate-300 leading-relaxed mb-4">
            J-Pro Lights and Sounds Rentals was founded with a simple mission: to make professional-grade 
            lighting and sound equipment accessible to everyone. From intimate gatherings to large-scale 
            events, we provide the tools you need to create unforgettable experiences.
          </p>
          <p className="text-slate-300 leading-relaxed">
            Our team of experts is dedicated to providing exceptional service, ensuring that every rental 
            goes smoothly from booking to return. We believe that great events start with great equipment, 
            and we're here to help you make yours shine.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-xl font-bold text-white mb-2">Our Mission</h3>
            <p className="text-slate-400">To provide top-quality equipment and service that exceeds expectations.</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">👁️</div>
            <h3 className="text-xl font-bold text-white mb-2">Our Vision</h3>
            <p className="text-slate-400">To be the leading equipment rental service in the region.</p>
          </div>
          <div className="bg-slate-800 rounded-xl p-6 text-center">
            <div className="text-4xl mb-4">💎</div>
            <h3 className="text-xl font-bold text-white mb-2">Our Values</h3>
            <p className="text-slate-400">Quality, reliability, and customer satisfaction in everything we do.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// CONTACT PAGE
// ============================================================================

const ContactPage: React.FC = () => {
  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(z.object({
      name: z.string().min(1, 'Name is required'),
      email: z.string().email('Invalid email'),
      subject: z.string().min(1, 'Subject is required'),
      message: z.string().min(1, 'Message is required')
    }))
  });

  const onSubmit = (data: any) => {
    toast.success('Message sent! We will get back to you soon.');
    console.log('Contact form submitted:', data);
  };

  return (
    <div className="min-h-screen bg-slate-900 py-12">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-white mb-4">Contact Us</h1>
          <p className="text-slate-400 text-lg">Get in touch with our team</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="bg-slate-800 rounded-xl p-8">
            <h2 className="text-2xl font-bold text-white mb-6">Get In Touch</h2>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <Phone className="w-6 h-6 text-cyan-400 mt-1" />
                <div>
                  <h3 className="text-white font-semibold">Phone</h3>
                  <p className="text-slate-400">(123) 456-7890</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <Mail className="w-6 h-6 text-cyan-400 mt-1" />
                <div>
                  <h3 className="text-white font-semibold">Email</h3>
                  <p className="text-slate-400">info@jprolights.com</p>
                </div>
              </div>
              <div className="flex items-start space-x-4">
                <MapPin className="w-6 h-6 text-cyan-400 mt-1" />
                <div>
                  <h3 className="text-white font-semibold">Address</h3>
                  <p className="text-slate-400">123 Event Street<br />City, State 12345</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h3 className="text-white font-semibold mb-4">Follow Us</h3>
              <div className="flex space-x-4">
                <a href="#" className="text-slate-400 hover:text-cyan-400 text-2xl">📸</a>
                <a href="#" className="text-slate-400 hover:text-cyan-400 text-2xl">👍</a>
                <a href="#" className="text-slate-400 hover:text-cyan-400 text-2xl">🐦</a>
              </div>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-slate-800 rounded-xl p-8">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Name</label>
                <input
                  type="text"
                  {...register('name')}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                {errors.name && <p className="text-red-400 text-sm">{errors.name.message as string}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                {errors.email && <p className="text-red-400 text-sm">{errors.email.message as string}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Subject</label>
                <input
                  type="text"
                  {...register('subject')}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                {errors.subject && <p className="text-red-400 text-sm">{errors.subject.message as string}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Message</label>
                <textarea
                  {...register('message')}
                  rows={4}
                  className="w-full px-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white"
                />
                {errors.message && <p className="text-red-400 text-sm">{String(errors.message.message || errors.message)}</p>}
              </div>
              <button
                type="submit"
                className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-3 rounded-lg font-semibold"
              >
                Send Message
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// PROTECTED ROUTE COMPONENT
// ============================================================================

const ProtectedRoute: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// ============================================================================
// MAIN APP COMPONENT
// ============================================================================

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" />
        <div className="min-h-screen bg-slate-900 text-white">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/equipment" element={<EquipmentPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route
              path="/bookings"
              element={
                <ProtectedRoute>
                  <BookingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute>
                  <AdminDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/equipment"
              element={
                <ProtectedRoute>
                  <AdminEquipmentPage />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Footer />
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
};

export default App;
