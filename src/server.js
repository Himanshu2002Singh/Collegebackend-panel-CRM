const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { ensureDatabaseExists, sequelize } = require('./config/database');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const superAdminRoutes = require('./routes/superAdminRoutes');
const collegeAdminRoutes = require('./routes/collegeAdminRoutes');
const trainerRoutes = require('./routes/trainerRoutes');
const studentRoutes = require('./routes/studentRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-college-id']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/superadmin', superAdminRoutes);
app.use('/api/admin', collegeAdminRoutes);
app.use('/api/college-admin', collegeAdminRoutes);
app.use('/api/trainer', trainerRoutes);
app.use('/api/student', studentRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'College Training & Student Performance SaaS',
    timestamp: new Date().toISOString()
  });
});

// Static Panel Serving
const projectRoot = path.join(__dirname, '../../');
app.use('/superadmin', express.static(path.join(projectRoot, 'Superadmin')));
app.use('/admin', express.static(path.join(projectRoot, 'Admin')));
app.use('/trainer', express.static(path.join(projectRoot, 'Trainner')));
app.use('/student', express.static(path.join(projectRoot, 'Students')));

// Root Portal
app.get('/', (req, res) => {
  res.sendFile(path.join(projectRoot, 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

async function startServer() {
  try {
    await ensureDatabaseExists();
    await sequelize.authenticate();
    console.log('✅ Connected to MySQL database via Sequelize.');

    // Note: To re-seed, run `npm run seed`
    await sequelize.sync();

    app.listen(PORT, () => {
      console.log(`🚀 College SaaS Backend running on http://localhost:${PORT}`);
      console.log(`📱 1. Super Admin Panel:  http://localhost:${PORT}/superadmin`);
      console.log(`🏫 2. College Admin Panel: http://localhost:${PORT}/admin`);
      console.log(`👨‍🏫 3. Trainer Panel:      http://localhost:${PORT}/trainer`);
      console.log(`🎓 4. Student Panel:      http://localhost:${PORT}/student`);
      console.log(`🌐 5. Central Portal:     http://localhost:${PORT}/`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error.message);
  }
}

startServer();
