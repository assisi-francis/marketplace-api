import express from 'express';
import authRoutes from './authRoutes.js';

const router = express.Router();

router.use('/auth', authRoutes);

// Members 2 and 3 will add their own router.use() lines here

export default router;