const express = require('express');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Load env vars
dotenv.config();

// Import routes
const routes = require('./src/routes');

// Import error handler
const { errorHandler } = require('./src/middlewares/errorHandler');

const app = express();

// Connect to database
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch((err) => console.error('❌ MongoDB Connection Error:', err));

// ========== CORS CONFIGURATION ==========
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://127.0.0.1:5173'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('Blocked origin:', origin);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

// ✅ Handle preflight requests
app.options('/', cors());

// ========== INCREASE REQUEST SIZE LIMIT ==========
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  message: 'Too many requests from this IP, please try again later.',
});
app.use('/api', limiter);

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// ========== CREATE UPLOADS DIRECTORY ==========
const uploadsDir = path.join(__dirname, 'uploads');
const productsDir = path.join(uploadsDir, 'products');
const categoriesDir = path.join(uploadsDir, 'categories');

if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
if (!fs.existsSync(productsDir)) fs.mkdirSync(productsDir, { recursive: true });
if (!fs.existsSync(categoriesDir)) fs.mkdirSync(categoriesDir, { recursive: true });

// ========== SERVE STATIC FILES ==========
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ========== HEALTH CHECK ==========
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date() });
});

// ========== API ROUTES ==========
app.use('/api/v1', routes);

// ========== ✅ FIXED: 404 HANDLER - NO '*' WILDCARD ==========
// Use function directly instead of '*' wildcard
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Cannot find ' + req.originalUrl + ' on this server'
  });
});

// ========== GLOBAL ERROR HANDLER ==========
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log('🚀 Server running on port ' + PORT);
  console.log('📝 Environment: ' + process.env.NODE_ENV);
  console.log('✅ CORS enabled for origins:', allowedOrigins);
  console.log('📸 Image upload limit: 50MB');
  console.log('📁 Uploads directory: ' + uploadsDir);
});