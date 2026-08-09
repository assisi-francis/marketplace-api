# Marketplace API

A single-store e-commerce backend API built with Node.js, Express, PostgreSQL, and Sequelize. Admins manage the product catalog; customers browse products and place orders. The project demonstrates authentication, role-based authorization, relational database design, RESTful API design, and integration with external services (email delivery and image hosting).

## Setup Instructions

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Create a `.env` file in the project root with the required environment variables (see below).

3. Make sure PostgreSQL is running locally and create the target database (e.g. `marketplace`).

4. Run the development server:
   ```bash
   npm run dev
   ```

5. Run automated tests:
   ```bash
   npm test
   ```

## Environment Variables

Create a `.env` file with the following variables:

```env
DATABASE_URL=postgres://postgres:password@localhost:5432/marketplace
JWT_SECRET=your_jwt_secret_key
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_smtp_or_app_password
```

## API Documentation

### Authentication Endpoints (Member 1)

#### `POST /auth/register`
Creates a new user account and sends a welcome email.
- **Access:** Public
- **Request Body:**
  ```json
  {
    "name": "Francis Anyah",
    "email": "user@example.com",
    "password": "secretpassword",
    "role": "customer"
  }
  ```
- **Response:** `201 Created` returning the user ID, name, email, and role.

#### `POST /auth/login`
Authenticates user credentials and returns a signed JSON Web Token (JWT).
- **Access:** Public
- **Request Body:**
  ```json
  {
    "email": "user@example.com",
    "password": "secretpassword"
  }
  ```
- **Response:** `200 OK` returning `{ "token": "...", "user": { ... } }`.

### Protected Routes & Roles
- Routes requiring authentication must include the JWT in the `Authorization` header:
  `Authorization: Bearer <token>`
- The `admin` role is required for product management endpoints.

