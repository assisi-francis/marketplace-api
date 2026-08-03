import { Op } from 'sequelize';
import { Product } from '../models/index.js';
import { uploadImage, deleteImage } from '../services/cloudinaryService.js';

export async function listProducts(req, res) {
  try {
    const { category, minPrice, maxPrice } = req.query;
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;

    const where = {};
    if (category) where.category = category;
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price[Op.gte] = minPrice;
      if (maxPrice) where.price[Op.lte] = maxPrice;
    }

    const offset = (page - 1) * limit;

    const { rows, count } = await Product.findAndCountAll({
      where,
      limit,
      offset,
      order: [['createdAt', 'DESC']],
    });

    res.json({
      products: rows,
      pagination: { page, limit, total: count, totalPages: Math.ceil(count / limit) },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
}

export async function getProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch product' });
  }
}

export async function createProduct(req, res) {
  try {
    const { name, price, stock, category, description } = req.body;

    if (!name || !price || !stock || !category) {
      return res.status(400).json({ error: 'name, price, stock, and category are required' });
    }

    let imageUrl = null;
    let imagePublicId = null;

    // req.file is set by Multer's upload.single('image') middleware,
    // which runs before this controller in the route chain.
    if (req.file) {
      const result = await uploadImage(req.file.buffer);
      imageUrl = result.secure_url;
      imagePublicId = result.public_id;
    }

    const product = await Product.create({
      name,
      price,
      stock,
      category,
      description: description || null,
      imageUrl,
      imagePublicId,
    });

    res.status(201).json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create product' });
  }
}

export async function updateProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Only these fields can be set directly by the client. Without
    // this whitelist, someone could pass imageUrl/imagePublicId in
    // the body and point a product at an arbitrary URL without ever
    // going through Cloudinary.
    const { name, description, price, stock, category } = req.body;
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (price !== undefined) updates.price = price;
    if (stock !== undefined) updates.stock = stock;
    if (category !== undefined) updates.category = category;

    if (req.file) {
      // Upload the new image before touching the old one — if the
      // new upload fails, the old image and product stay untouched
      // instead of the product ending up with no image at all.
      const result = await uploadImage(req.file.buffer);

      if (product.imagePublicId) {
        await deleteImage(product.imagePublicId);
      }

      updates.imageUrl = result.secure_url;
      updates.imagePublicId = result.public_id;
    }

    await product.update(updates);
    res.json(product);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update product' });
  }
}

export async function deleteProduct(req, res) {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    if (product.imagePublicId) {
      await deleteImage(product.imagePublicId);
    }

    await product.destroy();
    res.json({ message: 'Product deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to delete product' });
  }
}
