require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database');

const authRoutes = require('./routes/auth');
const papersRoutes = require('./routes/papers');
const progressRoutes = require('./routes/progress');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

initDatabase();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173', credentials: true }));
app.use(express.json({ limit: '10mb' }));

// Public routes
app.use('/api/auth', authRoutes);
app.use('/api/papers', papersRoutes);

// Protected routes
app.use('/api/progress', progressRoutes);

// Admin routes
app.use('/api/admin', adminRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '../frontend/dist')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/dist/index.html'));
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log('API endpoints:');
  console.log('  POST   /api/auth/register');
  console.log('  POST   /api/auth/login');
  console.log('  POST   /api/auth/google');
  console.log('  GET    /api/auth/me');
  console.log('  PUT    /api/auth/me');
  console.log('  DELETE /api/auth/me');
  console.log('  POST   /api/auth/forgot-password');
  console.log('  GET    /api/papers');
  console.log('  GET    /api/papers/subjects');
  console.log('  GET    /api/papers/subject/:id');
  console.log('  GET    /api/papers/filters');
  console.log('  GET    /api/papers/stats');
  console.log('  GET    /api/papers/:id');
  console.log('  GET    /api/progress');
  console.log('  POST   /api/progress/toggle');
  console.log('  POST   /api/progress/ignore');
  console.log('  POST   /api/progress/bulk-toggle');
  console.log('  GET    /api/progress/subject/:id');
  console.log('  GET    /api/admin/subjects');
  console.log('  POST   /api/admin/subjects');
  console.log('  PUT    /api/admin/subjects/:id');
  console.log('  DELETE /api/admin/subjects/:id');
  console.log('  GET    /api/admin/subjects/:id/sessions');
  console.log('  GET    /api/admin/subjects/:id/tree');
  console.log('  POST   /api/admin/sessions');
  console.log('  DELETE /api/admin/sessions/:id');
  console.log('  POST   /api/admin/sessions/:id/components');
  console.log('  POST   /api/admin/components/:id/variants');
  console.log('  PUT    /api/admin/variants/:id');
  console.log('  DELETE /api/admin/variants/:id');
  console.log('  PUT    /api/admin/resources/:id');
  console.log('  DELETE /api/admin/resources/:id');
  console.log('  POST   /api/admin/import/papers');
  console.log('  GET    /api/admin/users');
  console.log('  GET    /api/admin/qualifications');
});
