import Product from '../models/Product.js';
import Inventory from '../models/Inventory.js';

export const getProducts = async (req, res) => {
  try {
    const products = await Product.find({});
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

export const createProduct = async (req, res) => {
  const { name, description, basePrice, category, quantity, unit, reorderLevel } = req.body;
  try {
    const product = new Product({ 
      name, 
      description, 
      basePrice, 
      category 
    });
    const createdProduct = await product.save();
    
    // Create corresponding inventory record
    const inventory = new Inventory({
      product: createdProduct._id,
      quantity: quantity || 0,
      unit: unit || 'pcs',
      reorderLevel: reorderLevel || 10
    });
    
    await inventory.save();
    res.status(201).json(createdProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }
      
    product.name = req.body.name || product.name;
    product.description = req.body.description || product.description;
    product.basePrice = req.body.basePrice || product.basePrice;
    product.category = req.body.category || product.category;

    const updatedProduct = await product.save();
    res.json(updatedProduct);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Since product and inventory are linked, we should remove the inventory too (or keep product inactive)
    await Inventory.findOneAndDelete({ product: product._id });
    await product.deleteOne();

    res.json({ message: 'Product removed' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};