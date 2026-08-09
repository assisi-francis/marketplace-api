import express from 'express';
import authRoutes from './routes/authRoutes.js';
import productRoutes from './routes/productRoutes.js';
import orderRoutes from './routes/orderRoutes.js';

const app = express();

app.use(express.json());

// Mount API routes
app.use('/auth', authRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

// Catches errors passed via next(err) — most notably Multer's
// file-filter/size errors from the upload middleware, which would
// otherwise bypass our controllers' try/catch entirely and hit
// Express's default HTML error page instead of our JSON error shape.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 400).json({ error: err.message || 'Something went wrong' });
});

export default app;