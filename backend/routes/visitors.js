const express = require('express');
const rateLimit = require('express-rate-limit');
const Visitor = require('../models/Visitor');
const { sendVisitorNotificationEmail } = require('../services/mailer');

const router = express.Router();

// Rate limiting for visitor tracking (prevent spam)
const visitorLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // max 10 tracking requests per minute per IP
  message: {
    success: false,
    message: 'Too many tracking requests',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip + (req.headers['user-agent'] || ''),
});

// Helper function to parse user agent
function parseUserAgent(userAgent) {
  const ua = userAgent.toLowerCase();
  
  // Detect device type
  let device = 'desktop';
  if (/mobile|android|iphone|ipod/.test(ua)) device = 'mobile';
  else if (/tablet|ipad/.test(ua)) device = 'tablet';
  
  // Detect browser
  let browser = 'unknown';
  if (/chrome/.test(ua) && !/edge/.test(ua)) browser = 'Chrome';
  else if (/firefox/.test(ua)) browser = 'Firefox';
  else if (/safari/.test(ua) && !/chrome/.test(ua)) browser = 'Safari';
  else if (/edge/.test(ua)) browser = 'Edge';
  else if (/opera/.test(ua)) browser = 'Opera';
  
  // Detect OS
  let os = 'unknown';
  if (/windows/.test(ua)) os = 'Windows';
  else if (/mac/.test(ua)) os = 'macOS';
  else if (/linux/.test(ua)) os = 'Linux';
  else if (/android/.test(ua)) os = 'Android';
  else if (/ios|iphone|ipad|ipod/.test(ua)) os = 'iOS';
  
  return { device, browser, os };
}

// POST /api/visitors/track - Track a page visit
router.post('/track', visitorLimiter, async (req, res) => {
  try {
    const {
      page = '/',
      referrer = 'direct',
      sessionId,
      userAgent,
    } = req.body;

    const ip = req.ip || req.connection.remoteAddress || 'unknown';
    
    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: 'Session ID is required',
      });
    }

    // Parse user agent for device/browser info
    const { device, browser, os } = parseUserAgent(userAgent || '');

    // Check if visitor already exists
    let visitor = await Visitor.findOne({
      ip,
      userAgent: userAgent || '',
    });

    if (visitor) {
      // Update existing visitor
      await visitor.updateVisit({ page, referrer });
      
      // Send notification only for first visit of the session
      if (!visitor.notified && visitor.visitCount === 1) {
        try {
          await sendVisitorNotificationEmail({
            ip,
            page,
            referrer,
            device,
            browser,
            os,
            visitCount: visitor.visitCount,
            firstVisit: visitor.firstVisit,
          });
          visitor.notified = true;
          await visitor.save();
        } catch (emailError) {
          console.warn('Failed to send visitor notification email:', emailError);
        }
      }
    } else {
      // Create new visitor
      visitor = new Visitor({
        ip,
        userAgent: userAgent || '',
        page,
        referrer,
        sessionId,
        device,
        browser,
        os,
      });

      await visitor.save();

      // Send notification for new visitor
      try {
        await sendVisitorNotificationEmail({
          ip,
          page,
          referrer,
          device,
          browser,
          os,
          visitCount: 1,
          firstVisit: visitor.firstVisit,
        });
        visitor.notified = true;
        await visitor.save();
      } catch (emailError) {
        console.warn('Failed to send visitor notification email:', emailError);
      }
    }

    return res.json({
      success: true,
      data: {
        visitCount: visitor.visitCount,
        isFirstVisit: visitor.visitCount === 1,
      },
    });
  } catch (error) {
    console.error('[Visitor Tracking] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to track visit',
    });
  }
});

// GET /api/visitors - Get visitor statistics (protected)
router.get('/', async (req, res) => {
  try {
    const { period = '24h' } = req.query;
    
    let startDate;
    const now = new Date();
    
    switch (period) {
      case '1h':
        startDate = new Date(now.getTime() - 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    const stats = await Visitor.aggregate([
      {
        $match: {
          lastVisit: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: null,
          totalVisitors: { $sum: 1 },
          totalVisits: { $sum: '$visitCount' },
          uniqueVisitors: { $addToSet: '$ip' },
        },
      },
      {
        $project: {
          totalVisitors: 1,
          totalVisits: 1,
          uniqueVisitors: { $size: '$uniqueVisitors' },
        },
      },
    ]);

    const deviceStats = await Visitor.aggregate([
      {
        $match: {
          lastVisit: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$device',
          count: { $sum: 1 },
        },
      },
    ]);

    const pageStats = await Visitor.aggregate([
      {
        $match: {
          lastVisit: { $gte: startDate },
        },
      },
      {
        $group: {
          _id: '$page',
          count: { $sum: 1 },
        },
      },
      {
        $sort: { count: -1 },
      },
      {
        $limit: 10,
      },
    ]);

    return res.json({
      success: true,
      data: {
        period,
        stats: stats[0] || { totalVisitors: 0, totalVisits: 0, uniqueVisitors: 0 },
        deviceStats,
        pageStats,
      },
    });
  } catch (error) {
    console.error('[Visitor Stats] Error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to get visitor statistics',
    });
  }
});

module.exports = router;
