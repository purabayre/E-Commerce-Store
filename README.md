# E-Commerce Store (Server-Side Rendered)

A fully server-side rendered e-commerce store built with Node.js, Express, EJS, MySQL, and Sequelize.

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Templating**: EJS
- **Database**: MySQL + Sequelize ORM
- **Auth**: Sessions with express-session + connect-session-sequelize
- **Payments**: Stripe Checkout
- **PDF**: pdfkit for invoices
- **File Uploads**: multer for product images
- **Email**: nodemailer for order confirmations
- **Passwords**: bcryptjs
- **CSRF**: csurf middleware

## Features

### Authentication

- User registration and login
- Password reset via email token (1-hour expiry)

### Admin Panel

- Product management (CRUD operations)
- Order viewing with status filters
- Dashboard with revenue and top products

### Shop

- Product listing with category and search filters
- Shopping cart (guest and authenticated)
- Stripe checkout integration
- Order history and PDF invoice generation
- Product reviews (bonus feature)

## Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd e-commerce-store
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**
   - Copy `.env.example` to `.env`
   - Fill in your database, Stripe, email, and session secret values

4. **Database Setup**
   - Create a MySQL database
   - Update `.env` with database credentials
   - The app will auto-sync the database schema on startup

5. **Seed Admin User**
   - Run the seeder script to create an admin account:
     ```bash
     npm run seed
     ```
   - Or manually create an admin user with role: 'admin'

6. **Start the Application**
   ```bash
   npm start
   ```

   - Server runs on http://localhost:3000

## Project Structure

```
src/
├── config/           # Database and Stripe configuration
├── controllers/      # Route handlers
├── middleware/       # Auth, admin, upload, CSRF protection
├── models/           # Sequelize models
├── routes/           # Express routes
├── services/         # Cart, email, PDF services
├── views/            # EJS templates
├── public/           # Static assets (CSS)
└── app.js            # Main application file
```

## API Endpoints

### Authentication

- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `POST /auth/logout` - User logout
- `POST /auth/forgot-password` - Request password reset
- `GET /auth/reset/:token` - Reset password form
- `POST /auth/reset/:token` - Update password

### Shop

- `GET /shop` - Product listing
- `GET /shop/products/:id` - Product details
- `POST /shop/cart` - Add to cart
- `GET /shop/cart` - View cart
- `POST /shop/cart/update` - Update cart item
- `POST /shop/cart/remove` - Remove cart item
- `GET /shop/checkout` - Initiate Stripe checkout
- `GET /shop/checkout/success` - Handle payment success
- `GET /shop/checkout/cancel` - Handle payment cancel
- `GET /shop/orders` - User orders
- `GET /shop/orders/:id/invoice` - Download PDF invoice

### Admin

- `GET /admin/products` - Product management dashboard
- `POST /admin/products` - Create product
- `POST /admin/products/:id` - Update product
- `POST /admin/products/:id/delete` - Soft delete product

## Security Features

- CSRF protection on all forms
- Input validation with express-validator
- Session-based authentication
- Protected admin routes
- Secure file uploads with type validation

## Stripe Integration

- Uses Stripe Checkout for secure payments
- Webhook handling for payment confirmations
- Idempotent order creation to prevent duplicates

## Development Notes

- Database schema auto-syncs on startup (use `alter: true` in dev)
- Product images stored in `src/uploads/`
- Sessions stored in database via Sequelize
- Email service configured for Mailtrap (update for production)

## License

ISC
