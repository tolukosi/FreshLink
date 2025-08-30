import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, sql, desc, asc, like, ilike } from "drizzle-orm";
import { 
  users, producers, products, orders, orderItems, cart, reviews,
  type User, type InsertUser, type Producer, type InsertProducer,
  type Product, type InsertProduct, type Order, type InsertOrder,
  type CartItem, type InsertCartItem, type ProductWithProducer,
  type CartItemWithProduct, type OrderWithItems
} from "@shared/schema";
import { randomUUID } from "crypto";
import bcrypt from "bcrypt";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required");
}

const sql_client = neon(process.env.DATABASE_URL);
const db = drizzle(sql_client);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User>;
  verifyPassword(email: string, password: string): Promise<User | null>;

  // Producer management
  getProducer(id: string): Promise<Producer | undefined>;
  getProducerByUserId(userId: string): Promise<Producer | undefined>;
  createProducer(producer: InsertProducer): Promise<Producer>;
  updateProducer(id: string, updates: Partial<Producer>): Promise<Producer>;
  getProducersNearLocation(lat: number, lng: number, radiusKm: number): Promise<Producer[]>;

  // Product management
  getProduct(id: string): Promise<ProductWithProducer | undefined>;
  getProductsByProducer(producerId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, updates: Partial<Product>): Promise<Product>;
  deleteProduct(id: string): Promise<void>;
  searchProducts(query: string, lat?: number, lng?: number, radiusKm?: number, category?: string, tags?: string[]): Promise<ProductWithProducer[]>;

  // Cart management
  getCartItems(userId: string): Promise<CartItemWithProduct[]>;
  addToCart(item: InsertCartItem): Promise<CartItem>;
  updateCartItem(id: string, quantity: number): Promise<CartItem>;
  removeFromCart(id: string): Promise<void>;
  clearCart(userId: string): Promise<void>;

  // Order management
  createOrder(order: InsertOrder): Promise<Order>;
  addOrderItems(orderId: string, items: any[]): Promise<void>;
  getOrder(id: string): Promise<OrderWithItems | undefined>;
  getOrdersByUser(userId: string): Promise<OrderWithItems[]>;
  getOrdersByProducer(producerId: string): Promise<OrderWithItems[]>;
  updateOrderStatus(id: string, status: string): Promise<Order>;

  // Reviews
  createReview(review: any): Promise<any>;
  getProductReviews(productId: string): Promise<any[]>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const id = randomUUID();
    
    const user: User = {
      ...insertUser,
      id,
      password: hashedPassword,
      profileCompletion: 20,
      location: null,
      city: null,
      province: null,
      stripeCustomerId: null,
      stripeConnectAccountId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(users).values(user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User> {
    await db.update(users).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(users.id, id));
    
    const updated = await this.getUser(id);
    if (!updated) throw new Error("User not found");
    return updated;
  }

  async verifyPassword(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const valid = await bcrypt.compare(password, user.password);
    return valid ? user : null;
  }

  async getProducer(id: string): Promise<Producer | undefined> {
    const result = await db.select().from(producers).where(eq(producers.id, id));
    return result[0];
  }

  async getProducerByUserId(userId: string): Promise<Producer | undefined> {
    const result = await db.select().from(producers).where(eq(producers.userId, userId));
    return result[0];
  }

  async createProducer(insertProducer: InsertProducer): Promise<Producer> {
    const id = randomUUID();
    const producer: Producer = {
      ...insertProducer,
      id,
      location: null,
      profileImage: null,
      verified: false,
      rating: "0.0",
      totalReviews: 0,
      createdAt: new Date(),
    };
    
    await db.insert(producers).values(producer);
    return producer;
  }

  async updateProducer(id: string, updates: Partial<Producer>): Promise<Producer> {
    await db.update(producers).set(updates).where(eq(producers.id, id));
    
    const updated = await this.getProducer(id);
    if (!updated) throw new Error("Producer not found");
    return updated;
  }

  async getProducersNearLocation(lat: number, lng: number, radiusKm: number): Promise<Producer[]> {
    // Using PostGIS for distance calculation
    const result = await db.select().from(producers)
      .where(sql`ST_DWithin(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, location::geography, ${radiusKm * 1000})`)
      .orderBy(sql`ST_Distance(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, location::geography)`);
    
    return result;
  }

  async getProduct(id: string): Promise<ProductWithProducer | undefined> {
    const result = await db.select({
      id: products.id,
      producerId: products.producerId,
      name: products.name,
      description: products.description,
      category: products.category,
      price: products.price,
      unit: products.unit,
      stock: products.stock,
      images: products.images,
      tags: products.tags,
      seasonal: products.seasonal,
      available: products.available,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      producer: producers,
    })
    .from(products)
    .innerJoin(producers, eq(products.producerId, producers.id))
    .where(eq(products.id, id));
    
    return result[0] as ProductWithProducer;
  }

  async getProductsByProducer(producerId: string): Promise<Product[]> {
    return await db.select().from(products).where(eq(products.producerId, producerId));
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = randomUUID();
    const product: Product = {
      ...insertProduct,
      id,
      images: insertProduct.images || [],
      tags: insertProduct.tags || [],
      seasonal: insertProduct.seasonal || false,
      available: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(products).values(product);
    return product;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product> {
    await db.update(products).set({
      ...updates,
      updatedAt: new Date(),
    }).where(eq(products.id, id));
    
    const updated = await db.select().from(products).where(eq(products.id, id));
    if (!updated[0]) throw new Error("Product not found");
    return updated[0];
  }

  async deleteProduct(id: string): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  async searchProducts(
    query: string, 
    lat?: number, 
    lng?: number, 
    radiusKm?: number, 
    category?: string, 
    tags?: string[]
  ): Promise<ProductWithProducer[]> {
    let baseQuery = db.select({
      id: products.id,
      producerId: products.producerId,
      name: products.name,
      description: products.description,
      category: products.category,
      price: products.price,
      unit: products.unit,
      stock: products.stock,
      images: products.images,
      tags: products.tags,
      seasonal: products.seasonal,
      available: products.available,
      createdAt: products.createdAt,
      updatedAt: products.updatedAt,
      producer: producers,
      distance: lat && lng ? sql<number>`ST_Distance(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${producers.location}::geography) / 1000` : sql<number>`0`,
    })
    .from(products)
    .innerJoin(producers, eq(products.producerId, producers.id));

    // Build where conditions
    const conditions = [eq(products.available, true)];
    
    if (query) {
      conditions.push(
        sql`(${products.name} ILIKE '%' || ${query} || '%' OR ${products.description} ILIKE '%' || ${query} || '%')`
      );
    }
    
    if (category) {
      conditions.push(eq(products.category, category));
    }
    
    if (tags && tags.length > 0) {
      conditions.push(sql`${products.tags} && ARRAY[${tags.map(tag => `'${tag}'`).join(',')}]::text[]`);
    }
    
    if (lat && lng && radiusKm) {
      conditions.push(
        sql`ST_DWithin(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${producers.location}::geography, ${radiusKm * 1000})`
      );
    }

    // Apply where conditions
    if (conditions.length > 0) {
      baseQuery = baseQuery.where(and(...conditions));
    }

    // Add ordering
    if (lat && lng) {
      baseQuery = baseQuery.orderBy(sql`ST_Distance(ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography, ${producers.location}::geography)`);
    } else {
      baseQuery = baseQuery.orderBy(desc(products.createdAt));
    }

    return await baseQuery as ProductWithProducer[];
  }

  async getCartItems(userId: string): Promise<CartItemWithProduct[]> {
    const result = await db.select({
      id: cart.id,
      userId: cart.userId,
      productId: cart.productId,
      quantity: cart.quantity,
      createdAt: cart.createdAt,
      product: {
        id: products.id,
        producerId: products.producerId,
        name: products.name,
        description: products.description,
        category: products.category,
        price: products.price,
        unit: products.unit,
        stock: products.stock,
        images: products.images,
        tags: products.tags,
        seasonal: products.seasonal,
        available: products.available,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        producer: producers,
      }
    })
    .from(cart)
    .innerJoin(products, eq(cart.productId, products.id))
    .innerJoin(producers, eq(products.producerId, producers.id))
    .where(eq(cart.userId, userId));
    
    return result as CartItemWithProduct[];
  }

  async addToCart(item: InsertCartItem): Promise<CartItem> {
    // Check if item already exists in cart
    const existing = await db.select().from(cart)
      .where(and(eq(cart.userId, item.userId), eq(cart.productId, item.productId)));
    
    if (existing.length > 0) {
      // Update quantity
      const updated = await db.update(cart)
        .set({ quantity: existing[0].quantity + item.quantity })
        .where(eq(cart.id, existing[0].id))
        .returning();
      return updated[0];
    } else {
      // Insert new item
      const id = randomUUID();
      const cartItem: CartItem = {
        ...item,
        id,
        createdAt: new Date(),
      };
      
      await db.insert(cart).values(cartItem);
      return cartItem;
    }
  }

  async updateCartItem(id: string, quantity: number): Promise<CartItem> {
    const updated = await db.update(cart)
      .set({ quantity })
      .where(eq(cart.id, id))
      .returning();
    
    if (!updated[0]) throw new Error("Cart item not found");
    return updated[0];
  }

  async removeFromCart(id: string): Promise<void> {
    await db.delete(cart).where(eq(cart.id, id));
  }

  async clearCart(userId: string): Promise<void> {
    await db.delete(cart).where(eq(cart.userId, userId));
  }

  async createOrder(insertOrder: InsertOrder): Promise<Order> {
    const id = randomUUID();
    const order: Order = {
      ...insertOrder,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    await db.insert(orders).values(order);
    return order;
  }

  async addOrderItems(orderId: string, items: any[]): Promise<void> {
    const orderItemsData = items.map(item => ({
      id: randomUUID(),
      orderId,
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
    }));
    
    await db.insert(orderItems).values(orderItemsData);
  }

  async getOrder(id: string): Promise<OrderWithItems | undefined> {
    const result = await db.select()
      .from(orders)
      .where(eq(orders.id, id));
    
    if (!result[0]) return undefined;
    
    const items = await db.select({
      id: orderItems.id,
      quantity: orderItems.quantity,
      unitPrice: orderItems.unitPrice,
      totalPrice: orderItems.totalPrice,
      product: {
        id: products.id,
        producerId: products.producerId,
        name: products.name,
        description: products.description,
        category: products.category,
        price: products.price,
        unit: products.unit,
        stock: products.stock,
        images: products.images,
        tags: products.tags,
        seasonal: products.seasonal,
        available: products.available,
        createdAt: products.createdAt,
        updatedAt: products.updatedAt,
        producer: producers,
      }
    })
    .from(orderItems)
    .innerJoin(products, eq(orderItems.productId, products.id))
    .innerJoin(producers, eq(products.producerId, producers.id))
    .where(eq(orderItems.orderId, id));
    
    return {
      ...result[0],
      items,
    } as OrderWithItems;
  }

  async getOrdersByUser(userId: string): Promise<OrderWithItems[]> {
    const userOrders = await db.select().from(orders)
      .where(eq(orders.userId, userId))
      .orderBy(desc(orders.createdAt));
    
    const ordersWithItems = await Promise.all(
      userOrders.map(async (order) => {
        const orderWithItems = await this.getOrder(order.id);
        return orderWithItems!;
      })
    );
    
    return ordersWithItems;
  }

  async getOrdersByProducer(producerId: string): Promise<OrderWithItems[]> {
    // Get orders that contain products from this producer
    const result = await db.select({ orderId: orderItems.orderId })
      .from(orderItems)
      .innerJoin(products, eq(orderItems.productId, products.id))
      .where(eq(products.producerId, producerId))
      .groupBy(orderItems.orderId);
    
    const orderIds = result.map(r => r.orderId);
    
    const ordersWithItems = await Promise.all(
      orderIds.map(async (orderId) => {
        const orderWithItems = await this.getOrder(orderId);
        return orderWithItems!;
      })
    );
    
    return ordersWithItems;
  }

  async updateOrderStatus(id: string, status: string): Promise<Order> {
    const updated = await db.update(orders)
      .set({ 
        status,
        updatedAt: new Date(),
      })
      .where(eq(orders.id, id))
      .returning();
    
    if (!updated[0]) throw new Error("Order not found");
    return updated[0];
  }

  async createReview(review: any): Promise<any> {
    const id = randomUUID();
    const newReview = {
      ...review,
      id,
      createdAt: new Date(),
    };
    
    await db.insert(reviews).values(newReview);
    return newReview;
  }

  async getProductReviews(productId: string): Promise<any[]> {
    return await db.select().from(reviews)
      .where(eq(reviews.productId, productId))
      .orderBy(desc(reviews.createdAt));
  }
}

export const storage = new DatabaseStorage();
