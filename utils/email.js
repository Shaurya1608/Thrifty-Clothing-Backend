const nodemailer = require('nodemailer');

// Create transporter with Resend configuration
const createTransporter = () => {
  // Check if we have proper email credentials
  const hasEmailConfig = process.env.SMTP_USER && process.env.SMTP_PASS;
  
  if (!hasEmailConfig) {
    console.log('⚠️  Email credentials not configured. Using development mode.');
    return null;
  }

  // For Resend, use their specific configuration
  const config = {
    host: process.env.SMTP_HOST || 'smtp.resend.com',
    port: process.env.SMTP_PORT || 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    },
    // Add these settings for better compatibility
    tls: {
      rejectUnauthorized: false
    }
  };

  console.log('📧 Creating email transporter with config:', {
    host: config.host,
    port: config.port,
    user: config.auth.user ? '***configured***' : 'not configured',
    from: process.env.SMTP_FROM || 'onboarding@resend.dev'
  });

  return nodemailer.createTransport(config);
};

const transporter = createTransporter();

// Email templates
const emailTemplates = {
  'email-verification': (data) => ({
    subject: 'Verify your email - THRIFTY CLOTHINGS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">THRIFTY CLOTHINGS</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Hello ${data.name}!</h2>
          <p style="color: #666; line-height: 1.6;">
            Thank you for registering with THRIFTY CLOTHINGS. To complete your registration, 
            please verify your email address by entering the code below:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; display: inline-block;">
              <h3 style="color: #1f2937; margin: 0 0 10px 0;">Your Verification Code</h3>
              <div style="font-size: 32px; font-weight: bold; color: #2563eb; letter-spacing: 8px; margin: 10px 0;">
                ${data.otp}
              </div>
              <p style="color: #6b7280; margin: 0; font-size: 14px;">This code will expire in 10 minutes</p>
            </div>
          </div>
          <p style="color: #666; font-size: 14px;">
            Enter this code on the verification page to activate your account.
          </p>
          <p style="color: #666; font-size: 14px;">
            If you didn't create this account, please ignore this email.
          </p>
        </div>
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            © 2024 THRIFTY CLOTHINGS. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),
  
  'password-reset': (data) => ({
    subject: 'Reset your password - THRIFTY CLOTHINGS',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">THRIFTY CLOTHINGS</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Hello ${data.name}!</h2>
          <p style="color: #666; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password:
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/reset-password?token=${data.token}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px;">
            If the button doesn't work, you can copy and paste this link into your browser:
          </p>
          <p style="color: #667eea; font-size: 14px; word-break: break-all;">
            ${process.env.CLIENT_URL}/reset-password?token=${data.token}
          </p>
          <p style="color: #666; font-size: 14px;">
            This link will expire in 1 hour. If you didn't request a password reset, 
            you can safely ignore this email.
          </p>
        </div>
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            © 2024 THRIFTY CLOTHINGS. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),
  
  'order-confirmation': (data) => ({
    subject: `Order Confirmed - ${data.orderNumber} - THRIFTY CLOTHINGS`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">THRIFTY CLOTHINGS</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Order Confirmed!</h2>
          <p style="color: #666; line-height: 1.6;">
            Hello ${data.name}, your order has been confirmed and is being processed.
          </p>
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Order Details</h3>
            <p><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p><strong>Order Date:</strong> ${new Date(data.orderDate).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> ₹${data.total}</p>
            <p><strong>Payment Method:</strong> ${data.paymentMethod}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/orders/${data.orderNumber}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block;">
              View Order
            </a>
          </div>
        </div>
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            © 2024 THRIFTY CLOTHINGS. All rights reserved.
          </p>
        </div>
      </div>
    `
  }),
  
  'order-shipped': (data) => ({
    subject: `Order Shipped - ${data.orderNumber} - THRIFTY CLOTHINGS`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
          <h1 style="color: white; margin: 0;">THRIFTY CLOTHINGS</h1>
        </div>
        <div style="padding: 30px; background: #f9f9f9;">
          <h2 style="color: #333;">Your Order is on its way!</h2>
          <p style="color: #666; line-height: 1.6;">
            Hello ${data.name}, your order has been shipped and is on its way to you.
          </p>
          <div style="background: white; padding: 20px; border-radius: 5px; margin: 20px 0;">
            <h3 style="color: #333; margin-top: 0;">Shipping Details</h3>
            <p><strong>Order Number:</strong> ${data.orderNumber}</p>
            <p><strong>Tracking Number:</strong> ${data.trackingNumber}</p>
            <p><strong>Courier:</strong> ${data.courier}</p>
            <p><strong>Estimated Delivery:</strong> ${data.estimatedDelivery}</p>
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${process.env.CLIENT_URL}/orders/${data.orderNumber}" 
               style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                      color: white; padding: 15px 30px; text-decoration: none; 
                      border-radius: 5px; display: inline-block;">
              Track Order
            </a>
          </div>
        </div>
        <div style="background: #333; padding: 20px; text-align: center;">
          <p style="color: #999; margin: 0; font-size: 14px;">
            © 2024 THRIFTY CLOTHINGS. All rights reserved.
          </p>
        </div>
      </div>
    `
  })
};

// Send email function
const sendEmail = async ({ to, subject, template, data, html, text }) => {
  try {
    let emailContent;
    
    if (template && emailTemplates[template]) {
      emailContent = emailTemplates[template](data);
    } else {
      emailContent = { subject, html, text };
    }

    // If no transporter (no email config), use development mode
    if (!transporter) {
      console.log('📧 EMAIL (Development Mode):', {
        to,
        subject: emailContent.subject,
        template,
        data
      });
      
      // For OTP emails, show the OTP in console
      if (emailContent.html && emailContent.html.includes('font-size: 32px')) {
        const otpMatch = emailContent.html.match(/font-size: 32px[^>]*>(\d{6})/);
        if (otpMatch) {
          console.log('🔐 OTP Code:', otpMatch[1]);
        }
      }
      
      return { messageId: 'dev_' + Date.now() };
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || 'onboarding@resend.dev',
      to,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent:', info.messageId);
    return info;
  } catch (error) {
    console.error('Email sending error:', error);
    
    // For development/testing, log the email instead of sending
    if (process.env.NODE_ENV === 'development' || error.code === 'EAUTH' || error.code === 'EMESSAGE' || error.code === '450') {
      let emailContent;
      if (template && emailTemplates[template]) {
        emailContent = emailTemplates[template](data);
      } else {
        emailContent = { subject, html, text };
      }
      
      console.log('📧 EMAIL (Development Mode):', {
        to,
        subject: emailContent.subject,
        template,
        data
      });
      
      // For OTP emails, show the OTP in console
      if (emailContent.html && emailContent.html.includes('font-size: 32px')) {
        const otpMatch = emailContent.html.match(/font-size: 32px[^>]*>(\d{6})/);
        if (otpMatch) {
          console.log('🔐 OTP Code:', otpMatch[1]);
        }
      }
      
      return { messageId: 'dev_' + Date.now() };
    }
    
    throw error;
  }
};

module.exports = sendEmail;
