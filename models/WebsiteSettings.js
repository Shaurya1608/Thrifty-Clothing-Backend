const mongoose = require('mongoose');

const websiteSettingsSchema = new mongoose.Schema({
  heroImages: [{
    id: Number,
    url: String,
    title: String,
    description: String,
    order: Number,
    isActive: { type: Boolean, default: true }
  }],
  featuredCategories: [{
    id: Number,
    name: String,
    icon: String,
    color: String,
    order: Number,
    isActive: { type: Boolean, default: true },
    image: String
  }],
  websiteSettings: {
    siteName: String,
    siteDescription: String,
    primaryColor: String,
    secondaryColor: String,
    logo: String,
    favicon: String,
    contactEmail: String,
    contactPhone: String,
    address: String,
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String
    }
  },
  announcements: [{
    id: Number,
    text: String,
    isActive: { type: Boolean, default: true },
    order: Number
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('WebsiteSettings', websiteSettingsSchema);

