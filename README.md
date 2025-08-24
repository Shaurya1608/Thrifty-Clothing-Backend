# Thrifty Clothing Backend

A robust Node.js backend API for the Thrifty Clothing e-commerce platform, built with Express.js and MongoDB.

## Features

- 🔐 **Authentication & Authorization** - JWT-based authentication with Firebase integration
- 🛍️ **Product Management** - CRUD operations for products with image upload
- 🛒 **Shopping Cart** - Add, remove, and manage cart items
- ❤️ **Wishlist** - Save and manage favorite products
- 📦 **Order Management** - Complete order processing and tracking
- 👥 **User Management** - User profiles, addresses, and preferences
- 🏪 **Seller Management** - Seller applications and dashboard
- 👨‍💼 **Admin Panel** - Comprehensive admin dashboard
- 📧 **Email Notifications** - Order confirmations and updates
- 💳 **Payment Integration** - Secure payment processing
- 📱 **Image Upload** - Cloudinary integration for product images

## Tech Stack

- **Node.js** - Runtime environment
- **Express.js** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM for MongoDB
- **JWT** - Authentication tokens
- **Firebase Admin** - Authentication service
- **Cloudinary** - Image upload and management
- **Nodemailer** - Email functionality
- **Multer** - File upload handling
- **CORS** - Cross-origin resource sharing

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `POST /api/auth/forgot-password` - Password reset request
- `POST /api/auth/reset-password` - Password reset

### Products
- `GET /api/products` - Get all products
- `GET /api/products/:id` - Get product by ID
- `POST /api/products` - Create new product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Cart
- `GET /api/user-profile/cart` - Get user cart
- `POST /api/user-profile/cart` - Add item to cart
- `PUT /api/user-profile/cart/:itemId` - Update cart item
- `DELETE /api/user-profile/cart/:itemId` - Remove item from cart

### Wishlist
- `GET /api/user-profile/wishlist` - Get user wishlist
- `POST /api/user-profile/wishlist` - Add item to wishlist
- `DELETE /api/user-profile/wishlist/:productId` - Remove from wishlist

### Orders
- `GET /api/orders` - Get user orders
- `POST /api/orders` - Create new order
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id/status` - Update order status (Admin)

### Admin
- `GET /api/admin/users` - Get all users (Admin)
- `GET /api/admin/orders` - Get all orders (Admin)
- `GET /api/admin/products` - Get all products (Admin)
- `GET /api/admin/sellers` - Get all sellers (Admin)

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- MongoDB
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/Shaurya1608/Thrifty-Clothing-Backend.git
cd Thrifty-Clothing-Backend
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
Create a `.env` file in the root directory:
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB
MONGODB_URI=mongodb://localhost:27017/thrifty-clothing

# JWT Secret
JWT_SECRET=your_jwt_secret_key

# Firebase Admin
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email

# Cloudinary
CLOUDINARY_CLOUD_NAME=your_cloudinary_cloud_name
CLOUDINARY_API_KEY=your_cloudinary_api_key
CLOUDINARY_API_SECRET=your_cloudinary_api_secret

# Email (Gmail)
EMAIL_USER=your_gmail_address
EMAIL_PASS=your_gmail_app_password

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:3000
```

4. Start the development server:
```bash
npm run dev
```

The API will be available at `http://localhost:5000`

## Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm test` - Run tests
- `npm run lint` - Run ESLint

## Project Structure

```
server/
├── config/              # Configuration files
├── middleware/          # Custom middleware
├── models/              # MongoDB models
├── routes/              # API routes
├── utils/               # Utility functions
├── uploads/             # File uploads directory
├── index.js             # Main server file
└── package.json         # Dependencies and scripts
```

## Database Models

- **User** - User accounts and profiles
- **Product** - Product information and details
- **Order** - Order management and tracking
- **Cart** - Shopping cart functionality
- **Review** - Product reviews and ratings
- **Category** - Product categories
- **WebsiteSettings** - Site configuration

## Security Features

- JWT token authentication
- Password hashing with bcrypt
- CORS protection
- Input validation and sanitization
- Rate limiting
- Secure file uploads

## Deployment

### Environment Variables for Production
Make sure to set all required environment variables in your production environment.

### Database
- Use MongoDB Atlas for cloud database
- Set up proper indexes for performance
- Configure backup and monitoring

### File Storage
- Configure Cloudinary for production
- Set up proper CORS for your domain
- Optimize image uploads

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License.

## Contact

Shaurya1608 - [@Shaurya1608](https://github.com/Shaurya1608)

Project Link: [https://github.com/Shaurya1608/Thrifty-Clothing-Backend](https://github.com/Shaurya1608/Thrifty-Clothing-Backend)
