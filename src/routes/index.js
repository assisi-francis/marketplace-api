import express from 'express';
import authRoutes from './authRoutes.js';
import productRoutes from './productRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/products', productRoutes);

// Member 3 will add their own router.use() line here

export default router;