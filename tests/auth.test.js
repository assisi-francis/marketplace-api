import { jest } from '@jest/globals';

// Mock email service before dynamic modules load
jest.unstable_mockModule('../src/services/emailService.js', () => ({
  sendWelcomeEmail: jest.fn().mockResolvedValue(true),
  sendOrderConfirmationEmail: jest.fn().mockResolvedValue(true)
}));

const { default: request } = await import('supertest');
const { default: app } = await import('../src/app.js');
const { sequelize } = await import('../src/models/index.js');

describe('Auth Endpoints', () => {
  const testUser = {
    name: 'Test User',
    email: 'testuser@example.com',
    password: 'Password123!',
    role: 'customer'
  };

  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  it('registers a new user', async () => {
    const res = await request(app).post('/auth/register').send(testUser);
    expect(res.statusCode).toBe(201);
  }, 10000);

  it('logins an existing user', async () => {
    const res = await request(app).post('/auth/login').send({
      email: testUser.email,
      password: testUser.password
    });
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  }, 10000);
});