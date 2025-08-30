import type { Express } from "express";
import { createServer, type Server } from "http";
import Stripe from "stripe";
import { storage } from "./storage";
import { insertUserSchema, insertProducerSchema, insertProductSchema, insertCartItemSchema } from "@shared/schema";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import bcrypt from "bcrypt";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing required Stripe secret: STRIPE_SECRET_KEY');
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16",
});

const PLATFORM_FEE_RATE = 0.05; // 5% platform commission
const STRIPE_FEE_RATE = 0.029; // 2.9% + $0.30
const STRIPE_FIXED_FEE = 0.30;

// Authentication setup
passport.use(new LocalStrategy(
  { usernameField: 'email' },
  async (email, password, done) => {
    try {
      const user = await storage.verifyPassword(email, password);
      return done(null, user || false);
    } catch (error) {
      return done(error);
    }
  }
));

passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await storage.getUser(id);
    done(null, user);
  } catch (error) {
    done(error);
  }
});

function calculateFees(subtotal: number, deliveryFee: number = 0) {
  const platformFee = subtotal * PLATFORM_FEE_RATE;
  const processingFee = (subtotal + deliveryFee) * STRIPE_FEE_RATE + STRIPE_FIXED_FEE;
  const total = subtotal + platformFee + processingFee + deliveryFee;
  
  return {
    platformFee: Number(platformFee.toFixed(2)),
    processingFee: Number(processingFee.toFixed(2)),
    total: Number(total.toFixed(2)),
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session configuration
  app.use(session({
    secret: process.env.SESSION_SECRET || 'freshlink-secret-key-change-in-production',
    resave: false,
    saveUninitialized: false,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  app.use(passport.initialize());
  app.use(passport.session());

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      req.login(user, (err) => {
        if (err) return res.status(500).json({ message: "Login failed after registration" });
        res.json({ user: { ...user, password: undefined } });
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/auth/login", passport.authenticate('local'), (req, res) => {
    res.json({ user: { ...req.user, password: undefined } });
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/user", (req, res) => {
    if (req.isAuthenticated()) {
      res.json({ user: { ...req.user, password: undefined } });
    } else {
      res.status(401).json({ message: "Not authenticated" });
    }
  });

  // User profile routes
  app.patch("/api/users/profile", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const updates = req.body;
      const user = await storage.updateUser((req.user as any).id, updates);
      res.json({ user: { ...user, password: undefined } });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Producer routes
  app.post("/api/producers", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const producerData = insertProducerSchema.parse({
        ...req.body,
        userId: (req.user as any).id,
      });
      const producer = await storage.createProducer(producerData);
      
      // Update user role to producer and increase profile completion
      await storage.updateUser((req.user as any).id, { 
        role: 'producer',
        profileCompletion: 80,
      });
      
      res.json(producer);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/producers/me", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const producer = await storage.getProducerByUserId((req.user as any).id);
      if (!producer) return res.status(404).json({ message: "Producer profile not found" });
      res.json(producer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/producers/nearby", async (req, res) => {
    try {
      const { lat, lng, radius = 10 } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ message: "Latitude and longitude are required" });
      }
      
      const producers = await storage.getProducersNearLocation(
        Number(lat), 
        Number(lng), 
        Number(radius)
      );
      
      res.json(producers);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Product routes
  app.post("/api/products", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const producer = await storage.getProducerByUserId((req.user as any).id);
      if (!producer) return res.status(403).json({ message: "Must be a producer to create products" });
      
      const productData = insertProductSchema.parse({
        ...req.body,
        producerId: producer.id,
      });
      
      const product = await storage.createProduct(productData);
      res.json(product);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const producer = await storage.getProducerByUserId((req.user as any).id);
      if (!producer) return res.status(403).json({ message: "Must be a producer to update products" });
      
      // Verify ownership
      const product = await storage.getProduct(req.params.id);
      if (!product || product.producerId !== producer.id) {
        return res.status(403).json({ message: "You can only update your own products" });
      }
      
      const updatedProduct = await storage.updateProduct(req.params.id, req.body);
      res.json(updatedProduct);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const producer = await storage.getProducerByUserId((req.user as any).id);
      if (!producer) return res.status(403).json({ message: "Must be a producer to delete products" });
      
      // Verify ownership
      const product = await storage.getProduct(req.params.id);
      if (!product || product.producerId !== producer.id) {
        return res.status(403).json({ message: "You can only delete your own products" });
      }
      
      await storage.deleteProduct(req.params.id);
      res.json({ message: "Product deleted successfully" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/products/search", async (req, res) => {
    try {
      const { q, lat, lng, radius, category, tags } = req.query;
      
      const tagArray = tags ? (typeof tags === 'string' ? [tags] : tags as string[]) : undefined;
      
      const products = await storage.searchProducts(
        q as string || '',
        lat ? Number(lat) : undefined,
        lng ? Number(lng) : undefined,
        radius ? Number(radius) : undefined,
        category as string,
        tagArray
      );
      
      res.json(products);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/products/:id", async (req, res) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) return res.status(404).json({ message: "Product not found" });
      res.json(product);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Cart routes
  app.get("/api/cart", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const cartItems = await storage.getCartItems((req.user as any).id);
      res.json(cartItems);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/cart", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const cartItemData = insertCartItemSchema.parse({
        ...req.body,
        userId: (req.user as any).id,
      });
      
      const cartItem = await storage.addToCart(cartItemData);
      res.json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.patch("/api/cart/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const { quantity } = req.body;
      const cartItem = await storage.updateCartItem(req.params.id, quantity);
      res.json(cartItem);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.delete("/api/cart/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      await storage.removeFromCart(req.params.id);
      res.json({ message: "Item removed from cart" });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Order and payment routes
  app.post("/api/orders/calculate-fees", async (req, res) => {
    try {
      const { subtotal, deliveryOption } = req.body;
      
      const deliveryFees = {
        pickup: 0,
        'farmers-market': 1.99,
        home: 4.99,
      };
      
      const deliveryFee = deliveryFees[deliveryOption as keyof typeof deliveryFees] || 0;
      const fees = calculateFees(subtotal, deliveryFee);
      
      res.json({
        subtotal,
        deliveryFee,
        ...fees,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/create-payment-intent", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const { amount, orderId } = req.body;
      
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: "cad",
        metadata: {
          orderId,
          userId: (req.user as any).id,
        },
      });
      
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ message: "Error creating payment intent: " + error.message });
    }
  });

  app.post("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const { deliveryOption, deliveryAddress, deliveryTime } = req.body;
      const userId = (req.user as any).id;
      
      // Get cart items
      const cartItems = await storage.getCartItems(userId);
      if (cartItems.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
      }
      
      // Calculate totals
      const subtotal = cartItems.reduce((sum, item) => 
        sum + (Number(item.product.price) * item.quantity), 0
      );
      
      const deliveryFees = {
        pickup: 0,
        'farmers-market': 1.99,
        home: 4.99,
      };
      
      const deliveryFee = deliveryFees[deliveryOption as keyof typeof deliveryFees] || 0;
      const fees = calculateFees(subtotal, deliveryFee);
      
      // Create order
      const order = await storage.createOrder({
        userId,
        status: 'pending',
        subtotal: subtotal.toString(),
        platformFee: fees.platformFee.toString(),
        processingFee: fees.processingFee.toString(),
        deliveryFee: deliveryFee.toString(),
        total: fees.total.toString(),
        deliveryOption,
        deliveryAddress,
        deliveryTime: deliveryTime ? new Date(deliveryTime) : null,
        stripePaymentIntentId: null,
      });
      
      // Add order items
      const orderItemsData = cartItems.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.product.price,
        totalPrice: (Number(item.product.price) * item.quantity).toString(),
      }));
      
      await storage.addOrderItems(order.id, orderItemsData);
      
      // Clear cart
      await storage.clearCart(userId);
      
      res.json(order);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/orders", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const orders = await storage.getOrdersByUser((req.user as any).id);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/producer/:producerId", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const producer = await storage.getProducerByUserId((req.user as any).id);
      if (!producer || producer.id !== req.params.producerId) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const orders = await storage.getOrdersByProducer(req.params.producerId);
      res.json(orders);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/orders/:id", async (req, res) => {
    if (!req.isAuthenticated()) return res.status(401).json({ message: "Not authenticated" });
    
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order) return res.status(404).json({ message: "Order not found" });
      
      // Check if user owns this order
      if (order.userId !== (req.user as any).id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      res.json(order);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
