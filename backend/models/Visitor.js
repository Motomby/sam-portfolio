const mongoose = require('mongoose');

const visitorSchema = new mongoose.Schema(
  {
    // Visitor identification (using IP + user agent for basic tracking)
    ip: {
      type: String,
      required: [true, 'IP address is required'],
    },
    userAgent: {
      type: String,
      required: [true, 'User agent is required'],
    },
    
    // Visit information
    page: {
      type: String,
      required: [true, 'Page is required'],
      default: '/',
    },
    referrer: {
      type: String,
      default: 'direct',
    },
    
    // Geographic data (optional, from IP geolocation)
    country: String,
    city: String,
    
    // Session tracking
    sessionId: {
      type: String,
      required: true,
    },
    
    // Visit timestamps
    firstVisit: {
      type: Date,
      default: Date.now,
    },
    lastVisit: {
      type: Date,
      default: Date.now,
    },
    
    // Visit statistics
    visitCount: {
      type: Number,
      default: 1,
    },
    
    // Notification tracking
    notified: {
      type: Boolean,
      default: false,
    },
    
    // Device information
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet'],
      default: 'desktop',
    },
    browser: String,
    os: String,
  },
  {
    timestamps: true,
  }
);

// Index for efficient queries
visitorSchema.index({ ip: 1, userAgent: 1 });
visitorSchema.index({ sessionId: 1 });
visitorSchema.index({ lastVisit: -1 });
visitorSchema.index({ notified: 1 });

// Method to update visit count and last visit time
visitorSchema.methods.updateVisit = function(pageData) {
  this.lastVisit = new Date();
  this.visitCount += 1;
  if (pageData.page) this.page = pageData.page;
  if (pageData.referrer) this.referrer = pageData.referrer;
  return this.save();
};

module.exports = mongoose.model('Visitor', visitorSchema);
