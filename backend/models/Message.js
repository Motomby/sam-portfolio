const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [2000, 'Message cannot exceed 2000 characters'],
    },
    // 'contact' = sent via the main contact form
    // 'chat'    = sent via the chat widget
    source: {
      type: String,
      enum: ['contact', 'chat'],
      default: 'contact',
    },
    // Track whether you've read the message in the admin panel
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    // Automatically adds `createdAt` and `updatedAt` fields
    timestamps: true,
  }
);

// Index for efficient sorting by newest first
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
