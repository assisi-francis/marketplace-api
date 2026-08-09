import { Order, OrderItem, Product, sequelize } from '../models/index.js';

// Create a new order
export const createOrder = async (req, res) => {
  const transaction = await sequelize.transaction();
  try {
    const { items } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      await transaction.rollback();
      return res.status(400).json({ message: 'Order items are required' });
    }

    let totalAmount = 0;
    const orderItemsToCreate = [];

    for (const item of items) {
      const product = await Product.findByPk(item.productId, { transaction });

      if (!product) {
        await transaction.rollback();
        return res.status(404).json({ message: `Product with ID ${item.productId} not found` });
      }

      if (product.stock < item.quantity) {
        await transaction.rollback();
        return res.status(400).json({ message: `Insufficient stock for product: ${product.name}` });
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      // Deduct stock
      await product.update({ stock: product.stock - item.quantity }, { transaction });

      orderItemsToCreate.push({
        productId: product.id,
        quantity: item.quantity,
        price: product.price
      });
    }

    // Create Order
    const order = await Order.create(
      {
        userId: req.user.id,
        totalAmount,
        status: 'pending'
      },
      { transaction }
    );

    // Create Order Items
    for (const orderItem of orderItemsToCreate) {
      await OrderItem.create(
        {
          ...orderItem,
          orderId: order.id
        },
        { transaction }
      );
    }

    await transaction.commit();

    // Fetch created order with items
    const createdOrder = await Order.findByPk(order.id, {
      include: [{ model: OrderItem, as: 'items' }]
    });

    return res.status(201).json({
      message: 'Order created successfully',
      data: createdOrder
    });
  } catch (error) {
    await transaction.rollback();
    return res.status(500).json({ message: error.message });
  }
};

// Get all orders for the current user (or all if admin)
export const getOrders = async (req, res) => {
  try {
    const queryOptions = {
      include: [{ model: OrderItem, as: 'items' }]
    };

    // If user is not admin, only fetch their own orders
    if (req.user && req.user.role !== 'admin') {
      queryOptions.where = { userId: req.user.id };
    }

    const orders = await Order.findAll(queryOptions);
    return res.status(200).json({ data: orders });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// Get single order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      include: [{ model: OrderItem, as: 'items' }]
    });

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Restrict standard users from accessing other users' orders
    if (req.user.role !== 'admin' && order.userId !== req.user.id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    return res.status(200).json({ data: order });
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

export default {
  createOrder,
  getOrders,
  getOrderById
};