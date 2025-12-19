# E-Commerce Admin Dashboard

A comprehensive admin dashboard for managing e-commerce operations. This full-stack application provides a modern, responsive interface for managing products, orders, customers, inventory, and analytics.

## 🚀 Features

### Product Management
- **Complete CRUD Operations**: Create, read, update, and delete products
- **Product Variants**: Support for different sizes, colors, and specifications
- **Image Management**: Upload and manage multiple product images
- **Categories**: Hierarchical product categorization
- **SEO Optimization**: Meta titles, descriptions, and URL slugs
- **Inventory Tracking**: Real-time stock management with low stock alerts

### Order Management
- **Order Processing**: Complete order lifecycle management
- **Status Tracking**: Monitor order status from pending to delivered
- **Customer Information**: Detailed customer profiles and order history
- **Payment Integration**: Support for various payment methods
- **Shipping Management**: Address management and shipping tracking

### Customer Management
- **Customer Profiles**: Comprehensive customer information
- **Order History**: Track all customer purchases
- **Address Management**: Multiple billing and shipping addresses
- **Marketing Preferences**: Email subscription management

### Analytics & Reporting
- **Dashboard Overview**: Key metrics and performance indicators
- **Sales Analytics**: Revenue tracking and trend analysis
- **Product Performance**: Best-selling products and inventory insights
- **User Activity**: Admin user actions and system events

### User Management
- **Role-Based Access**: Super admin, admin, and manager roles
- **Authentication**: Secure JWT-based authentication
- **Profile Management**: User profile and password management

### Real-Time Updates
- **Live Notifications**: Real-time updates via Socket.io
- **Dashboard Refresh**: Automatic data synchronization

## 🛠 Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with UUID extension
- **Authentication**: JWT with bcrypt password hashing
- **Validation**: Express-validator
- **File Upload**: Multer
- **Real-Time**: Socket.io
- **Caching**: Redis (optional)
- **Email**: Nodemailer

### Frontend
- **Framework**: Vue 3 with Composition API
- **Build Tool**: Vite
- **UI Library**: Vuetify 3 (Material Design)
- **State Management**: Pinia
- **Routing**: Vue Router 4
- **HTTP Client**: Axios
- **Charts**: Chart.js with vue-chartjs
- **Notifications**: Vue Toastification
- **Icons**: Material Design Icons

### Development Tools
- **Linting**: ESLint
- **Formatting**: Prettier
- **Type Checking**: TypeScript
- **Testing**: Jest
- **Database Migration**: Custom scripts

## 📋 Prerequisites

- Node.js (v18 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn
- Git

## 🚀 Installation & Setup

### 1. Clone the Repository
```bash
git clone <repository-url>
cd hongfa-e-commerce-admin
```

### 2. Backend Setup

#### Install Dependencies
```bash
cd backend
npm install
```

#### Environment Configuration
Copy the example environment file and configure your settings:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
```env
# Database
DATABASE_URL=postgresql://username:password@localhost:5432/hongfa_admin

# JWT
JWT_SECRET=your_super_secret_jwt_key_here
JWT_EXPIRES_IN=24h

# Server
PORT=5000
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# File Upload
UPLOAD_PATH=uploads
MAX_FILE_SIZE=5242880

# Email (optional)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password

# Redis (optional)
REDIS_URL=redis://localhost:6379
```

#### Database Setup
Create the database and run migrations:
```bash
# Create database
createdb hongfa_admin

# Run migration script
npm run migrate
```

#### Start Backend Server
```bash
# Development mode
npm run dev

# Production build
npm run build
npm start
```

The backend server will start on `http://localhost:5000`

### 3. Frontend Setup

#### Install Dependencies
```bash
cd ../admin-dashboard
npm install
```

#### Environment Configuration (if needed)
The frontend uses proxy configuration in `vite.config.ts` for API calls.

#### Start Development Server
```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

### 4. Production Build

#### Backend
```bash
cd backend
npm run build
npm start
```

#### Frontend
```bash
cd admin-dashboard
npm run build
npm run preview
```

## 📊 Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: Admin user accounts with role-based permissions
- **products**: Product catalog with variants and images
- **categories**: Product categorization system
- **customers**: Customer information and profiles
- **orders**: Order management and tracking
- **inventory_transactions**: Stock movement tracking
- **analytics_events**: System events and user actions

## 🔐 Default Login

After setup, you can login with:
- **Email**: admin@hongfagmbh.de
- **Password**: admin123

⚠️ **Important**: Change the default password in production!

## 📁 Project Structure

```
hongfa-e-commerce-admin/
├── admin-dashboard/          # Vue.js frontend
│   ├── src/
│   │   ├── components/       # Reusable Vue components
│   │   ├── views/           # Page components
│   │   ├── stores/          # Pinia state management
│   │   ├── router/          # Vue Router configuration
│   │   └── layouts/         # Layout components
│   ├── public/              # Static assets
│   └── package.json
├── backend/                  # Node.js backend
│   ├── src/
│   │   ├── routes/          # API route handlers
│   │   ├── middleware/      # Express middleware
│   │   ├── config/          # Database and configuration
│   │   ├── scripts/         # Database scripts
│   │   └── server.ts        # Main server file
│   ├── uploads/             # File uploads directory
│   └── package.json
└── README.md
```

## 🔧 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update profile
- `PUT /api/auth/change-password` - Change password

### Products
- `GET /api/products` - List products with pagination
- `POST /api/products` - Create product
- `GET /api/products/:id` - Get product details
- `PUT /api/products/:id` - Update product
- `DELETE /api/products/:id` - Delete product
- `POST /api/products/:id/images` - Upload product images

### Orders
- `GET /api/orders` - List orders
- `GET /api/orders/:id` - Get order details
- `PUT /api/orders/:id` - Update order status

### Customers
- `GET /api/customers` - List customers
- `GET /api/customers/:id` - Get customer details

### Analytics
- `GET /api/analytics/dashboard` - Dashboard metrics
- `GET /api/analytics/sales` - Sales analytics

## 🧪 Testing

### Backend Tests
```bash
cd backend
npm test
```

### Frontend Linting
```bash
cd admin-dashboard
npm run lint
```

## 🚀 Deployment

### Environment Variables for Production
Ensure all environment variables are properly set for production:
- Set `NODE_ENV=production`
- Use strong `JWT_SECRET`
- Configure production database URL
- Set up proper CORS origins

### Build Commands
```bash
# Backend
cd backend && npm run build

# Frontend
cd admin-dashboard && npm run build
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is proprietary software.

## 📞 Support

For support or questions, please contact Us.

## 🔄 Version History

- **v1.0.0**: Initial release with core e-commerce functionality
  - Product management
  - Order processing
  - Customer management
  - Analytics dashboard
  - User authentication and authorization
