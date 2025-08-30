export interface Location {
  lat: number;
  lng: number;
  city?: string;
  province?: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
  role: 'consumer' | 'producer' | 'business';
  profileCompletion: number;
  location?: Location;
  city?: string;
  province?: string;
}

export interface Producer {
  id: string;
  userId: string;
  businessName: string;
  description?: string;
  story?: string;
  certifications?: string[];
  location?: Location;
  address?: string;
  phone?: string;
  website?: string;
  profileImage?: string;
  verified: boolean;
  rating: string;
  totalReviews: number;
}

export interface Product {
  id: string;
  producerId: string;
  name: string;
  description?: string;
  category: string;
  price: string;
  unit: string;
  stock: number;
  images?: string[];
  tags?: string[];
  seasonal: boolean;
  available: boolean;
  producer?: Producer;
  distance?: number;
}

export interface CartItem {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  product: Product;
}

export interface Order {
  id: string;
  userId: string;
  status: string;
  subtotal: string;
  platformFee: string;
  processingFee: string;
  deliveryFee: string;
  total: string;
  deliveryOption: string;
  deliveryAddress?: string;
  deliveryTime?: Date;
  items?: Array<{
    id: string;
    quantity: number;
    unitPrice: string;
    totalPrice: string;
    product: Product;
  }>;
}

export interface FeeCalculation {
  subtotal: number;
  deliveryFee: number;
  platformFee: number;
  processingFee: number;
  total: number;
}

export type ProductTag = 
  | 'organic' 
  | 'fresh' 
  | 'new' 
  | 'limited' 
  | 'premium' 
  | 'seasonal' 
  | 'farm-to-table' 
  | 'just-picked' 
  | 'local-favorite' 
  | 'artisan-made';

export type DeliveryOption = 'pickup' | 'home' | 'farmers-market';

export interface SearchFilters {
  query?: string;
  category?: string;
  tags?: string[];
  radius?: number;
  location?: Location;
}
