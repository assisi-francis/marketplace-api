import express from 'express';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/productController.js';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import upload from '../middleware/upload.js';

const router = express.Router();

// Public
router.get('/', listProducts);
router.get('/:id', getProduct);

// Admin only. Order matters: authenticate/requireAdmin run before
// upload — no point parsing a file from a request that's about to
// get a 403 anyway.
router.post('/', authenticate, requireAdmin, upload.single('image'), createProduct);
router.put('/:id', authenticate, requireAdmin, upload.single('image'), updateProduct);
router.delete('/:id', authenticate, requireAdmin, deleteProduct);

export default router;
