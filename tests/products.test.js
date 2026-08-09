import { jest } from '@jest/globals';
import request from 'supertest';
import bcrypt from 'bcrypt';

// ESM modules can't be mocked with jest.mock() the way CommonJS can —
// jest.unstable_mockModule registers the mock BEFORE the module graph
// is built. Because of this, every module that (transitively) imports
// cloudinaryService must be imported dynamically, AFTER this call,
// not with a static `import` at the top of the file.
jest.unstable_mockModule('../src/services/cloudinaryService.js', () => ({
  uploadImage: jest.fn(async () => ({
    secure_url: 'https://res.cloudinary.com/demo/image/upload/mock.jpg',
    public_id: 'marketplace-products/mock',
  })),
  deleteImage: jest.fn(async () => {}),
}));

const { default: app } = await import('../src/app.js');
const { sequelize, User, Product } = await import('../src/models/index.js');
const cloudinaryService = await import('../src/services/cloudinaryService.js');

let adminToken;
let customerToken;

beforeAll(async () => {
  await sequelize.sync({ force: true });

  // Admins aren't created through /auth/register in this app either
  // (register always defaults role to 'customer' unless the caller
  // explicitly sends role: 'admin' — see the note below about that).
  const hashedPassword = await bcrypt.hash('adminpass123', 10);
  await User.create({ name: 'Admin', email: 'admin@example.com', password: hashedPassword, role: 'admin' });

  await request(app).post('/auth/register').send({
    name: 'Customer',
    email: 'customer@example.com',
    password: 'password123',
  });

  const adminLogin = await request(app).post('/auth/login').send({ email: 'admin@example.com', password: 'adminpass123' });
  adminToken = adminLogin.body.token;

  const custLogin = await request(app).post('/auth/login').send({ email: 'customer@example.com', password: 'password123' });
  customerToken = custLogin.body.token;
});

afterAll(async () => {
  await sequelize.close();
});

describe('Product creation', () => {
  it('lets an admin create a product without an image', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Wireless Mouse')
      .field('price', '19.99')
      .field('stock', '50')
      .field('category', 'electronics');

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Wireless Mouse');
    expect(res.body.imageUrl).toBeNull();
  });

  it('lets an admin create a product with an image (mocked Cloudinary)', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Mechanical Keyboard')
      .field('price', '89.99')
      .field('stock', '15')
      .field('category', 'electronics')
      .attach('image', Buffer.from('fake-image-bytes'), 'keyboard.jpg');

    expect(res.statusCode).toBe(201);
    expect(res.body.imageUrl).toContain('cloudinary');
  });

  it('rejects a non-admin with 403', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${customerToken}`)
      .field('name', 'Should Fail')
      .field('price', '10')
      .field('stock', '1')
      .field('category', 'x');

    expect(res.statusCode).toBe(403);
  });

  it('rejects missing required fields', async () => {
    const res = await request(app)
      .post('/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'Incomplete Product');

    expect(res.statusCode).toBe(400);
  });

  it('rejects requests with no token', async () => {
    const res = await request(app)
      .post('/products')
      .field('name', 'No Auth')
      .field('price', '10')
      .field('stock', '1')
      .field('category', 'x');

    expect(res.statusCode).toBe(401);
  });
});

describe('Listing and filtering', () => {
  it('lists products publicly', async () => {
    const res = await request(app).get('/products');
    expect(res.statusCode).toBe(200);
    expect(res.body.products.length).toBeGreaterThanOrEqual(2);
    expect(res.body.pagination).toBeDefined();
  });

  it('filters by category', async () => {
    await Product.create({ name: 'Gaming Chair', price: 199, stock: 5, category: 'furniture' });

    const res = await request(app).get('/products?category=furniture');
    expect(res.statusCode).toBe(200);
    expect(res.body.products.every((p) => p.category === 'furniture')).toBe(true);
  });

  it('filters by price range', async () => {
    const res = await request(app).get('/products?minPrice=50&maxPrice=100');
    expect(res.statusCode).toBe(200);
    res.body.products.forEach((p) => {
      expect(Number(p.price)).toBeGreaterThanOrEqual(50);
      expect(Number(p.price)).toBeLessThanOrEqual(100);
    });
  });

  it('returns 404 for a non-existent product', async () => {
    const res = await request(app).get('/products/00000000-0000-0000-0000-000000000000');
    expect(res.statusCode).toBe(404);
  });
});

describe('Update and delete', () => {
  it('lets an admin update a product', async () => {
    const product = await Product.create({ name: 'Old Name', price: 10, stock: 5, category: 'misc' });

    const res = await request(app)
      .put(`/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .field('name', 'New Name');

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('New Name');
    expect(Number(res.body.price)).toBe(10); // untouched field stays as-is
  });

  it('deletes the old Cloudinary image when replacing it', async () => {
    const product = await Product.create({
      name: 'Has Image',
      price: 20,
      stock: 5,
      category: 'misc',
      imageUrl: 'https://res.cloudinary.com/demo/old.jpg',
      imagePublicId: 'marketplace-products/old',
    });

    const res = await request(app)
      .put(`/products/${product.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .attach('image', Buffer.from('new-fake-bytes'), 'new.jpg');

    expect(res.statusCode).toBe(200);
    expect(cloudinaryService.deleteImage).toHaveBeenCalledWith('marketplace-products/old');
  });

  it('lets an admin delete a product', async () => {
    const product = await Product.create({ name: 'To Delete', price: 5, stock: 1, category: 'misc' });

    const res = await request(app).delete(`/products/${product.id}`).set('Authorization', `Bearer ${adminToken}`);
    expect(res.statusCode).toBe(200);

    const check = await Product.findByPk(product.id);
    expect(check).toBeNull();
  });

  it('blocks a customer from deleting a product', async () => {
    const product = await Product.create({ name: 'Protected', price: 5, stock: 1, category: 'misc' });

    const res = await request(app).delete(`/products/${product.id}`).set('Authorization', `Bearer ${customerToken}`);
    expect(res.statusCode).toBe(403);
  });
});
