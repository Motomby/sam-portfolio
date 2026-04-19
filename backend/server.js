require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');

// ─── Route Imports ────────────────────────────────────────────────────────────
const contactRoutes = require('./routes/contact');

// ─── App Setup ────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet()); // Sets secure HTTP headers

// ─── CORS ─────────────────────────────────────────────────────────────────────
// Allow requests from your portfolio frontend (Vercel URL or localhost)
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5500',   // live-server / VS Code Live Server
  'http://127.0.0.1:5500',
  'http://localhost:8080',
  process.env.FRONTEND_URL,  // set to your Vercel URL in production .env
].filter(Boolean); // remove any undefined entries

app.use(
  cors({
    origin: true, // Allow all origins to avoid CORS issues if FRONTEND_URL is misconfigured
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'x-admin-key'],
  })
);

// ─── Body Parsing Middleware ──────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));        // Parse JSON bodies, limit 10KB
app.use(express.urlencoded({ extended: true })); // Parse URL-encoded bodies

// ─── Request Logger (simple, dev-friendly) ───────────────────────────────────
app.use((req, _res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({
    success: true,
    status: 'OK',
    timestamp: new Date().toISOString(),
    db: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
  });
});

app.use('/api/contact', contactRoutes);

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Server Error]', err.message);
  const status = err.status || 500;
  res.status(status).json({
    success: false,
    message: err.message || 'Internal server error.',
  });
});

// ─── MongoDB Connection ───────────────────────────────────────────────────────
const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌  MONGODB_URI is not set in .env — exiting.');
    process.exit(1);
  }

  try {
    await mongoose.connect(uri, {
      dbName: 'portfolio', // explicitly set the database name
    });
    console.log(`✅  MongoDB connected → ${mongoose.connection.host}`);
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    process.exit(1);
  }
};

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`\n🚀  Server running on http://localhost:${PORT}`);
    console.log(`🔍  Health check: http://localhost:${PORT}/health`);
    console.log(`📬  Contact API:  http://localhost:${PORT}/api/contact`);
    console.log(`\n  Press Ctrl+C to stop.\n`);
  });
};

// Handle clean shutdown (Ctrl+C or process kill)
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('\n⛔  Server stopped & MongoDB connection closed.');
  process.exit(0);
});

startServer();
