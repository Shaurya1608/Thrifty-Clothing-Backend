const twilio = require('twilio');

// Initialize Twilio client (only if valid credentials are provided)
let client = null;
if (process.env.TWILIO_ACCOUNT_SID && 
    process.env.TWILIO_AUTH_TOKEN && 
    process.env.TWILIO_ACCOUNT_SID !== 'your-twilio-account-sid' && 
    process.env.TWILIO_AUTH_TOKEN !== 'your-twilio-auth-token') {
  try {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  } catch (error) {
    console.log('Twilio initialization failed:', error.message);
    client = null;
  }
}

// Send SMS function
const sendSMS = async ({ to, message, from = process.env.TWILIO_PHONE_NUMBER }) => {
  try {
    // If Twilio client is not initialized (no credentials), just log in development
    if (!client) {
      console.log('SMS (No Twilio credentials):', {
        to,
        message,
        from
      });
      return { sid: 'no_credentials_' + Date.now() };
    }

    const result = await client.messages.create({
      body: message,
      from: from,
      to: to
    });

    console.log('SMS sent:', result.sid);
    return result;
  } catch (error) {
    console.error('SMS sending error:', error);
    
    // For development/testing, log the message instead of sending
    if (process.env.NODE_ENV === 'development') {
      console.log('SMS (Development Mode):', {
        to,
        message,
        from
      });
      return { sid: 'dev_' + Date.now() };
    }
    
    throw error;
  }
};

// Send OTP SMS
const sendOTP = async (phone, otp) => {
  const message = `Your THRIFTY CLOTHINGS verification code is: ${otp}. Valid for 10 minutes.`;
  return sendSMS({ to: phone, message });
};

// Send order confirmation SMS
const sendOrderConfirmation = async (phone, orderNumber, amount) => {
  const message = `Your order ${orderNumber} has been confirmed! Total amount: ₹${amount}. Track your order at ${process.env.CLIENT_URL}/orders/${orderNumber}`;
  return sendSMS({ to: phone, message });
};

// Send order shipped SMS
const sendOrderShipped = async (phone, orderNumber, trackingNumber, courier) => {
  const message = `Your order ${orderNumber} has been shipped! Tracking: ${trackingNumber} via ${courier}. Track at ${process.env.CLIENT_URL}/orders/${orderNumber}`;
  return sendSMS({ to: phone, message });
};

// Send order delivered SMS
const sendOrderDelivered = async (phone, orderNumber) => {
  const message = `Your order ${orderNumber} has been delivered! Rate your experience at ${process.env.CLIENT_URL}/orders/${orderNumber}`;
  return sendSMS({ to: phone, message });
};

// Send delivery reminder SMS
const sendDeliveryReminder = async (phone, orderNumber, estimatedDelivery) => {
  const message = `Your order ${orderNumber} will be delivered on ${estimatedDelivery}. Track at ${process.env.CLIENT_URL}/orders/${orderNumber}`;
  return sendSMS({ to: phone, message });
};

// Send return confirmation SMS
const sendReturnConfirmation = async (phone, orderNumber, refundAmount) => {
  const message = `Your return for order ${orderNumber} has been processed. Refund amount: ₹${refundAmount} will be credited within 5-7 business days.`;
  return sendSMS({ to: phone, message });
};

// Send promotional SMS
const sendPromotionalSMS = async (phone, offer, validUntil) => {
  const message = `🎉 ${offer} at THRIFTY CLOTHINGS! Valid until ${validUntil}. Shop now at ${process.env.CLIENT_URL}`;
  return sendSMS({ to: phone, message });
};

// Send abandoned cart reminder SMS
const sendAbandonedCartReminder = async (phone, itemCount) => {
  const message = `You have ${itemCount} items in your cart! Complete your purchase at ${process.env.CLIENT_URL}/cart before they're gone.`;
  return sendSMS({ to: phone, message });
};

// Send price drop alert SMS
const sendPriceDropAlert = async (phone, productName, oldPrice, newPrice) => {
  const message = `Price drop alert! ${productName} is now ₹${newPrice} (was ₹${oldPrice}). Shop now at ${process.env.CLIENT_URL}`;
  return sendSMS({ to: phone, message });
};

// Send back in stock alert SMS
const sendBackInStockAlert = async (phone, productName) => {
  const message = `Good news! ${productName} is back in stock. Shop now at ${process.env.CLIENT_URL} before it sells out again.`;
  return sendSMS({ to: phone, message });
};

// Send birthday wish SMS
const sendBirthdayWish = async (phone, name, discountCode) => {
  const message = `Happy Birthday ${name}! 🎂 Enjoy ${discountCode} off on your special day. Valid today only at ${process.env.CLIENT_URL}`;
  return sendSMS({ to: phone, message });
};

// Send welcome SMS
const sendWelcomeSMS = async (phone, name) => {
  const message = `Welcome to THRIFTY CLOTHINGS ${name}! 🎉 Get 10% off on your first order. Use code: WELCOME10 at ${process.env.CLIENT_URL}`;
  return sendSMS({ to: phone, message });
};

// Send security alert SMS
const sendSecurityAlert = async (phone, activity) => {
  const message = `Security Alert: ${activity} detected on your THRIFTY CLOTHINGS account. If this wasn't you, contact support immediately.`;
  return sendSMS({ to: phone, message });
};

module.exports = {
  sendSMS,
  sendOTP,
  sendOrderConfirmation,
  sendOrderShipped,
  sendOrderDelivered,
  sendDeliveryReminder,
  sendReturnConfirmation,
  sendPromotionalSMS,
  sendAbandonedCartReminder,
  sendPriceDropAlert,
  sendBackInStockAlert,
  sendBirthdayWish,
  sendWelcomeSMS,
  sendSecurityAlert
};
