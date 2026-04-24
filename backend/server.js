require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const morgan = require('morgan');
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

const connectDB = require('./config/db');
const cache = require('./utils/cache');
const logger = require('./utils/logger');
const errorHandler = require('./middlewares/errorHandler');
const { apiLimiter } = require('./middlewares/rateLimiter');
const bookingController = require('./controllers/bookingController');

// ─── App ──────────────────────────────────────────────────────────────────────
const app = express();
const PORT = process.env.PORT || 5000;

// ─── Security Headers ─────────────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Razorpay Webhook — RAW body required BEFORE express.json ─────────────────
// Razorpay sends raw JSON; HMAC signature verification requires the raw bytes.
// express.json with a verify callback captures rawBody for the webhook route only.
app.post(
  '/api/bookings/webhook/razorpay',
  express.raw({ type: 'application/json' }),
  (req, _res, next) => {
    req.rawBody = req.body;      // Buffer
    req.body = JSON.parse(req.body.toString());
    next();
  },
  bookingController.razorpayWebhook
);

// ─── Body & Cookie Parsing ────────────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());

// ─── Request Logging ──────────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Global API Rate Limiter ──────────────────────────────────────────────────
app.use('/api', apiLimiter);

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    status: 'OK',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ─── Swagger UI (dev only) ────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  const swaggerDoc = YAML.load(path.join(__dirname, 'swagger/openapi.yaml'));
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerDoc, {
    customSiteTitle: 'TurfReserve API Docs',
    customCss: '.swagger-ui .topbar { background-color: #0a0a0a; }',
  }));
  logger.info('Swagger UI → http://localhost:5000/api/docs');
}

// ─── API Routes ───────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/authRoutes'));
app.use('/api/turfs',    require('./routes/turfRoutes'));
app.use('/api/bookings', require('./routes/bookingRoutes'));

// ─── SEO: robots.txt ─────────────────────────────────────────────────────────
app.get('/robots.txt', (_req, res) => {
  res.type('text/plain').send(
    `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /dashboard\n\nSitemap: ${process.env.CLIENT_URL || 'http://localhost:5173'}/sitemap.xml`
  );
});

// ─── SEO: dynamic sitemap.xml ─────────────────────────────────────────────────
app.get('/sitemap.xml', async (_req, res) => {
  try {
    const Turf = require('./models/Turf');
    const turfs = await Turf.find({ isActive: true }, 'slug updatedAt').lean();
    const base = process.env.CLIENT_URL || 'http://localhost:5173';
    const staticUrls = ['', '/explore', '/nearby'].map(path => `
  <url>
    <loc>${base}${path}</loc>
    <changefreq>daily</changefreq>
    <priority>${path === '' ? '1.0' : '0.8'}</priority>
  </url>`).join('');

    const turfUrls = turfs.map(t => `
  <url>
    <loc>${base}/turf/${t.slug}</loc>
    <lastmod>${new Date(t.updatedAt).toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`).join('');

    res.type('application/xml').send(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${staticUrls}${turfUrls}\n</urlset>`
    );
  } catch {
    res.status(500).send('<?xml version="1.0"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"/>');
  }
});

// ─── 404 Handler ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found.' });
});

// ─── Global Error Handler (must be last) ─────────────────────────────────────
app.use(errorHandler);

// ─── Boot ─────────────────────────────────────────────────────────────────────
const startServer = async () => {
  await connectDB();
  await cache.init(); // Attempt Redis; falls back to in-memory silently

  // Start cron jobs AFTER DB is ready
  const { startReleaseJob } = require('./jobs/releaseExpiredBookings');
  startReleaseJob();

  app.listen(PORT, () => {
    logger.info(`TurfReserve API → http://localhost:${PORT} [${process.env.NODE_ENV}]`);
    logger.info(`Health check   → http://localhost:${PORT}/health`);
  });
};

startServer();

module.exports = app;
