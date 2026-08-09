import { jest } from '@jest/globals';

// Mock email service before ES modules load
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendOrderConfirmationEmail: jest.fn().mockResolvedValue(true),
  sendWelcomeEmail: jest.fn().mockResolvedValue(true)
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { sequelize } = await import('../src/models/index.js');

describe('Order Management Endpoints', () => {
  let customerToken;
  let adminToken;
  let testProductId;

  beforeAll(async () => {
    // Reset database state before running suite
    await sequelize.sync({ force: true });

    const extractToken = (res) => res.body.token || res.body.accessToken || res.body.data?.token;

    // 1. Register & login Customer
    const customerRes = await request(app)
      .post('/auth/register')
      .send({
        name: 'Order Tester',
        email: 'ordertest@example.com',
        password: 'Password123!',
        role: 'customer'
      });

    customerToken = extractToken(customerRes);

    if (!customerToken) {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: 'ordertest@example.com', password: 'Password123!' });
      customerToken = extractToken(loginRes);
    }

    // 2. Register & login Admin
    const adminRes = await request(app)
      .post('/auth/register')
      .send({
        name: 'Admin Tester',
        email: 'adminorder@example.com',
        password: 'Password123!',
        role: 'admin'
      });

    adminToken = extractToken(adminRes);

    if (!adminToken) {
      const loginRes = await request(app)
        .post('/auth/login')
        .send({ email: 'adminorder@example.com', password: 'Password123!' });
      adminToken = extractToken(loginRes);
    }

    // 3. Create Test Product
    const productRes = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Keyboard',
        description: 'Mechanical Keyboard',
        price: 99.99,
        stock: 50,
        category: 'Electronics'
      });

    const productData = productRes.body.data || productRes.body;
    testProductId = productData?.id || productData?._id;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('POST /orders', () => {
    it('should create an order successfully when customer is authenticated', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [
            {
              productId: testProductId,
              quantity: 2
            }
          ]
        });

      expect(res.statusCode).toBe(201);
      const responseData = res.body.data || res.body;
      expect(responseData).toHaveProperty('id');
    });

    it('should reject order creation without authentication', async () => {
      const res = await request(app)
        .post('/orders')
        .send({
          items: [{ productId: testProductId, quantity: 1 }]
        });

      expect(res.statusCode).toBe(401);
    });

    it('should fail if requested stock is unavailable', async () => {
      const res = await request(app)
        .post('/orders')
        .set('Authorization', `Bearer ${customerToken}`)
        .send({
          items: [
            {
              productId: testProductId,
              quantity: 9999
            }
          ]
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /orders', () => {
    it('should retrieve placed orders for the authenticated user', async () => {
      const res = await request(app)
        .get('/orders')
        .set('Authorization', `Bearer ${customerToken}`);

      const orders = res.body.data || res.body;
      expect(res.statusCode).toBe(200);
      expect(Array.isArray(orders)).toBe(true);
      expect(orders.length).toBeGreaterThan(0);
    });

    it('should reject listing orders without auth token', async () => {
      const res = await request(app).get('/orders');
      expect(res.statusCode).toBe(401);
    });
  });
});