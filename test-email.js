const sendEmail = require('./utils/email');

async function testEmail() {
  console.log('🧪 Testing email configuration...');
  
  try {
    const result = await sendEmail({
      to: 'shauryak1608@gmail.com',
      template: 'email-verification',
      data: {
        name: 'Test User',
        otp: '123456'
      }
    });
    
    console.log('✅ Email test result:', result);
    console.log('📧 Check your email inbox for the test email!');
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
    
    if (error.code === '450') {
      console.log('\n🔧 Resend Configuration Issues:');
      console.log('1. Check your Resend API key in .env file');
      console.log('2. Verify your domain in Resend dashboard');
      console.log('3. Make sure SMTP_FROM uses a verified domain');
      console.log('4. Try using Gmail instead (see GMAIL_SETUP_GUIDE.md)');
    }
  }
}

testEmail();


