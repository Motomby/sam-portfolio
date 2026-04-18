const express = require('express');
const rateLimit = require('express-rate-limit');
const Message = require('../models/Message');
const { sendNotificationEmail } = require('../services/mailer');
const {
  contactValidationRules,
  handleValidationErrors,
  requireAdminKey,
} = require('../middleware/validate');

const router = express.Router();

// ─── Rate Limiter ─────────────────────────────────────────────────────────────
// Allows max 5 submissions per IP per 15 minutes (anti-spam)
const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5,
  message: {
    success: false,
    message: 'Too many messages sent from this IP — please try again in 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── POST /api/contact ────────────────────────────────────────────────────────
// Submit a new contact or chat message
router.post(
  '/',
  contactLimiter,
  contactValidationRules,
  handleValidationErrors,
  async (req, res) => {
    try {
      const { name, email, message, source = 'contact' } = req.body;

      // 1. Save to MongoDB
      const newMessage = await Message.create({ name, email, message, source });

      // 2. Send email notification (fire-and-forget — don't await in response)
      sendNotificationEmail({ name, email, message, source });

      // 3. Respond with success
      return res.status(201).json({
        success: true,
        message: "Thanks for reaching out! I'll get back to you soon.",
        data: {
          id: newMessage._id,
          createdAt: newMessage.createdAt,
        },
      });
    } catch (err) {
      console.error('[Contact Route] Error saving message:', err);

      // Handle Mongoose validation errors gracefully
      if (err.name === 'ValidationError') {
        return res.status(422).json({
          success: false,
          message: 'Invalid data provided.',
          errors: Object.values(err.errors).map((e) => ({
            field: e.path,
            message: e.message,
          })),
        });
      }

      return res.status(500).json({
        success: false,
        message: 'Something went wrong on our end. Please try again later.',
      });
    }
  }
);

// ─── GET /api/contact ─────────────────────────────────────────────────────────
// List all messages — protected by admin API key
// Usage: GET /api/contact?key=YOUR_ADMIN_API_KEY
//    or: GET /api/contact with header x-admin-key: YOUR_ADMIN_API_KEY
router.get('/', requireAdminKey, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      source,   // filter by 'contact' or 'chat'
      unread,   // filter unread only: ?unread=true
    } = req.query;

    const filter = {};
    if (source) filter.source = source;
    if (unread === 'true') filter.read = false;

    const total = await Message.countDocuments(filter);
    const messages = await Message.find(filter)
      .sort({ createdAt: -1 }) // newest first
      .skip((page - 1) * limit)
      .limit(Number(limit));

    return res.json({
      success: true,
      data: {
        total,
        page: Number(page),
        pages: Math.ceil(total / limit),
        messages,
      },
    });
  } catch (err) {
    console.error('[Contact Route] Error fetching messages:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch messages.' });
  }
});

// ─── PATCH /api/contact/:id/read ──────────────────────────────────────────────
// Mark a message as read
router.patch('/:id/read', requireAdminKey, async (req, res) => {
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { read: true },
      { new: true }
    );
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
    return res.json({ success: true, data: msg });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to update message.' });
  }
});

// ─── DELETE /api/contact/:id ──────────────────────────────────────────────────
// Delete a message
router.delete('/:id', requireAdminKey, async (req, res) => {
  try {
    const msg = await Message.findByIdAndDelete(req.params.id);
    if (!msg) return res.status(404).json({ success: false, message: 'Message not found.' });
    return res.json({ success: true, message: 'Message deleted successfully.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete message.' });
  }
});

module.exports = router;
