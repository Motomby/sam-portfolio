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
    db_error: global.dbError || null, // EXPOSE THE MONGODB ERROR CLEARLY
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
global.dbError = null;

const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    global.dbError = 'MONGODB_URI is extremely missing in Railway variables!';
    console.error('❌ ', global.dbError);
    return; // DONT CRASH, allow the 404 endpoint to say "hi"
  }

  try {
    await mongoose.connect(uri, {
      dbName: 'portfolio',
    });
    console.log(`✅  MongoDB connected → ${mongoose.connection.host}`);
    global.dbError = null;
  } catch (err) {
    global.dbError = `MongoDB connection error: ${err.message}`;
    console.error('❌ ', global.dbError);
  }
};

// ─── Start Server ─────────────────────────────────────────────────────────────
const startServer = () => {
  // START IMMEDIATELY so Railway sees the app! Don't wait for DB timeout!
  app.listen(PORT, () => {
    console.log(`\n🚀  Server running on port ${PORT}`);
    console.log(`🔍  Health check: /health`);
    console.log(`📬  Contact API:  /api/contact`);
  });

  connectDB();
};

// Handle clean shutdown (Ctrl+C or process kill)
process.on('SIGINT', async () => {
  await mongoose.connection.close();
  console.log('\n⛔  Server stopped & MongoDB connection closed.');
  process.exit(0);
});

startServer();
