import express from 'express';
import { createOrder, getOrders, getOrderById } from '../controllers/orderController.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();

// All order routes require authentication
router.use(authenticate);

// Route to place a new order
router.post('/', createOrder);

// Route to get order history (all orders for admin, user's own orders for customer)
router.get('/', getOrders);

// Route to get details of a specific order
router.get('/:id', getOrderById);

export default router;