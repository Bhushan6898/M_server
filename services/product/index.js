
import logAction from '../../middleware/activity/index.js';
import { uploadImage } from '../../middleware/multer/index.js';
import  { clientModel, notificationModel, productModel } from '../../schemas/index.js';
import fs from "fs";
import crypto from 'crypto'
import { uploadToCloudinary } from '../../middleware/cloudenary/index.js';


export const addProduct = async (req, res) => {
  const { id } = req.user;
  const { name, price, stock, category, brand, sku } = req.body;

  try {
    // Check if product with the same SKU already exists
    const existingProduct = await productModel.findOne({ sku });
    if (existingProduct) {
      return res.status(401).json({ message: "Product with this SKU already exists" });
    }

    const user = await clientModel.findById(id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Upload product image if available
    let cloudinaryResult = null;
    if (req.files && req.files.productImage) {
      const imageFile = req.files.productImage;
      const filePath = imageFile.tempFilePath;

      try {
        const fileBuffer = fs.readFileSync(filePath);
        const fileHash = crypto.createHash("sha256").update(fileBuffer).digest("hex");

        cloudinaryResult = await uploadToCloudinary(filePath, `product_${fileHash}`, "product-images");

        if (cloudinaryResult.existing) {
          return res.status(400).json({message:"Product image already exists in Cloudinary."});
        }
      } catch (imageError) {
        console.error("Error uploading product image:", imageError);
        return res.status(500).json({ message: "Failed to upload product image" });
      }
    }

    // Create and save new product
    const product = new productModel({
      name,
      price,
      stock,
      category,
      brand,
      sku,
      imageUrl: cloudinaryResult?.secure_url || null,
    });

    await product.save();

    // Log the action
    await logAction(
      user._id,
      "ADD_PRODUCT",
      `Product added by ${user.firstName} ${user.lastName} (Email: ${user.email}). 
      Product Name: ${name}, Category: ${category}, Price: ₹${price}, Stock: ${stock}, SKU: ${sku}.`,
      req
    );

    // Notify admin
    const admin = await clientModel.findOne({ role: "admin" });
    if (admin) {
      const productNotification = new notificationModel({
        recipient: admin._id,
        type: "product",
        message: `New product added: ${name} (Category: ${category}, Price: ${price})`,
      });
      await productNotification.save();
    }

    return res.status(200).json({ message: "Product added successfully" });
  } catch (error) {
    console.error("Error during product creation:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};


export const GetProduct = async (req, res) => {
  try {
    const product = await productModel.find();

    if (!product) {
      return res.status(401).json({ message: 'product not found' });
    }
    return res.status(200).json({
      message: 'Product data',
      product
    });
  } catch (error) {
    console.error('Error during data retrieval:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};


export const deleteProduct = async (req, res) => {

  try {
    const { productId } = req.body;

    const deletedProduct = await productModel.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found" });
    }
    const admin = await clientModel.findOne({ role: "admin" });
    if (admin) {
      const notification = new notificationModel({
        recipient: admin._id,
        type: "product",
        message: `Product deleted: ${deletedProduct.name} (Category: ${deletedProduct.category}, Price: ${deletedProduct.price})`,
      });
      await notification.save();
    }
    logAction(
      req.user._id,
      'DELETE_PRODUCT',
      `Product deleted by ${req.user.firstName} ${req.user.lastName} (Email: ${req.user.email}). 
       Product Name: ${deletedProduct.name}.`,
      req
    );
    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error('Error deleting product:', error);
    return res.status(500).json({ message: "Internal server error" });
  }
};
