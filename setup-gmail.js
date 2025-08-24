const fs = require('fs');
const path = require('path');

console.log('📧 Setting up Gmail for email sending...\n');

// Gmail configuration
const gmailConfig = `
# Gmail SMTP Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
`;

console.log('📝 Add these lines to your .env file:');
console.log(gmailConfig);

console.log('\n🔧 Steps to set up Gmail:');
console.log('1. Go to your Google Account settings');
console.log('2. Enable 2-Factor Authentication');
console.log('3. Generate an App Password:');
console.log('   - Go to Security > App passwords');
console.log('   - Select "Mail" and "Other (Custom name)"');
console.log('   - Name it "THRIFTY CLOTHINGS"');
console.log('   - Copy the 16-character password');
console.log('4. Replace "your-email@gmail.com" with your Gmail address');
console.log('5. Replace "your-app-password" with the generated app password');
console.log('6. Restart your server');

console.log('\n✅ After setup, run: node test-email.js');


