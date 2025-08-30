import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Plus, Package, BarChart3, ShoppingBag, Edit, Trash2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ProfileCompletionBanner } from "@/components/profile-completion-banner";
import { MainNavigation, BottomNavigation } from "@/components/navigation";
import { ProductTags } from "@/components/product-tags";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Producer, Product, Order } from "@/types";

const productCategories = [
  'vegetables', 'fruits', 'dairy', 'meat', 'baked', 'grains', 
  'herbs', 'preserves', 'beverages', 'other'
];

const availableTags = [
  'organic', 'fresh', 'new', 'limited', 'premium', 'seasonal',
  'farm-to-table', 'just-picked', 'local-favorite', 'artisan-made'
];

export default function ProducerDashboard() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'overview' | 'products' | 'orders' | 'analytics'>('overview');
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  const [productForm, setProductForm] = useState({
    name: '',
    description: '',
    category: '',
    price: '',
    unit: '',
    stock: '',
    tags: [] as string[],
    seasonal: false,
  });

  useEffect(() => {
    if (!user) {
      setLocation('/auth');
      return;
    }
    if (user.role !== 'producer') {
      setLocation('/');
    }
  }, [user, setLocation]);

  // Get producer profile
  const { data: producer, isLoading: loadingProducer } = useQuery<Producer>({
    queryKey: ['/api/producers/me'],
    enabled: !!user && user.role === 'producer',
  });

  // Get producer products
  const { data: products = [], isLoading: loadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products/producer', producer?.id],
    queryFn: async () => {
      if (!producer) return [];
      const res = await apiRequest("GET", `/api/products/search?producerId=${producer.id}`, undefined);
      return res.json();
    },
    enabled: !!producer,
  });

  // Get producer orders
  const { data: orders = [], isLoading: loadingOrders } = useQuery<Order[]>({
    queryKey: ['/api/orders/producer', producer?.id],
    queryFn: async () => {
      if (!producer) return [];
      const res = await apiRequest("GET", `/api/orders/producer/${producer.id}`, undefined);
      return res.json();
    },
    enabled: !!producer,
  });

  // Create product mutation
  const createProductMutation = useMutation({
    mutationFn: async (productData: any) => {
      const res = await apiRequest("POST", "/api/products", productData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/producer'] });
      setShowProductDialog(false);
      resetProductForm();
      toast({
        title: "Product Created",
        description: "Your product has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Update product mutation
  const updateProductMutation = useMutation({
    mutationFn: async ({ id, ...productData }: any) => {
      const res = await apiRequest("PATCH", `/api/products/${id}`, productData);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/producer'] });
      setShowProductDialog(false);
      setEditingProduct(null);
      resetProductForm();
      toast({
        title: "Product Updated",
        description: "Your product has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Delete product mutation
  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      const res = await apiRequest("DELETE", `/api/products/${productId}`, {});
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products/producer'] });
      toast({
        title: "Product Deleted",
        description: "Your product has been removed.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const resetProductForm = () => {
    setProductForm({
      name: '',
      description: '',
      category: '',
      price: '',
      unit: '',
      stock: '',
      tags: [],
      seasonal: false,
    });
  };

  const handleProductSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const productData = {
      ...productForm,
      price: productForm.price,
      stock: parseInt(productForm.stock),
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, ...productData });
    } else {
      createProductMutation.mutate(productData);
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingProduct(product);
    setProductForm({
      name: product.name,
      description: product.description || '',
      category: product.category,
      price: product.price,
      unit: product.unit,
      stock: product.stock.toString(),
      tags: product.tags || [],
      seasonal: product.seasonal,
    });
    setShowProductDialog(true);
  };

  const handleDeleteProduct = (productId: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(productId);
    }
  };

  const handleTagToggle = (tag: string) => {
    setProductForm(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // Calculate earnings
  const totalEarnings = orders.reduce((sum, order) => {
    const orderTotal = Number(order.total);
    const platformFee = Number(order.platformFee);
    const processingFee = Number(order.processingFee);
    return sum + (orderTotal - platformFee - processingFee);
  }, 0);

  const thisWeekEarnings = orders
    .filter(order => {
      const orderDate = new Date(order.createdAt || '');
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return orderDate >= weekAgo;
    })
    .reduce((sum, order) => {
      const orderTotal = Number(order.total);
      const platformFee = Number(order.platformFee);
      const processingFee = Number(order.processingFee);
      return sum + (orderTotal - platformFee - processingFee);
    }, 0);

  if (!user || user.role !== 'producer') {
    return null;
  }

  if (loadingProducer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <ProfileCompletionBanner />
      <MainNavigation />

      {/* Producer Header */}
      <div className="bg-gradient-to-r from-primary to-green-600 text-primary-foreground p-6">
        <div className="max-w-md mx-auto">
          <h1 className="text-xl font-bold mb-2" data-testid="text-producer-name">
            {producer?.businessName || 'Your Farm'}
          </h1>
          <p className="text-primary-foreground/80 text-sm">
            {producer?.description || 'Set up your producer profile to get started'}
          </p>
          
          {/* Earnings Summary */}
          <div className="bg-primary-foreground/10 rounded-lg p-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-primary-foreground/70">This Week</p>
                <p className="text-xl font-bold" data-testid="text-week-earnings">
                  ${thisWeekEarnings.toFixed(2)} CAD
                </p>
              </div>
              <div>
                <p className="text-xs text-primary-foreground/70">Total Earnings</p>
                <p className="text-lg font-bold" data-testid="text-total-earnings">
                  ${totalEarnings.toFixed(2)} CAD
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-md mx-auto">
          <div className="grid grid-cols-3 gap-3">
            <Button
              variant="outline"
              className="flex flex-col items-center space-y-2 p-4 h-auto"
              onClick={() => {
                resetProductForm();
                setEditingProduct(null);
                setShowProductDialog(true);
              }}
              data-testid="button-add-product"
            >
              <Plus className="w-8 h-8 text-primary" />
              <span className="text-xs font-medium">Add Product</span>
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center space-y-2 p-4 h-auto"
              onClick={() => setActiveTab('orders')}
              data-testid="button-view-orders"
            >
              <ShoppingBag className="w-8 h-8 text-primary" />
              <span className="text-xs font-medium">Orders</span>
              {orders.filter(o => o.status === 'pending').length > 0 && (
                <span className="bg-primary text-primary-foreground text-xs px-1.5 py-0.5 rounded-full">
                  {orders.filter(o => o.status === 'pending').length}
                </span>
              )}
            </Button>
            
            <Button
              variant="outline"
              className="flex flex-col items-center space-y-2 p-4 h-auto"
              onClick={() => setActiveTab('analytics')}
              data-testid="button-view-analytics"
            >
              <BarChart3 className="w-8 h-8 text-primary" />
              <span className="text-xs font-medium">Analytics</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-card border-b border-border p-4">
        <div className="max-w-md mx-auto">
          <div className="flex space-x-1">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: 'Products' },
              { id: 'orders', label: 'Orders' },
              { id: 'analytics', label: 'Analytics' },
            ].map((tab) => (
              <Button
                key={tab.id}
                variant={activeTab === tab.id ? "default" : "ghost"}
                size="sm"
                onClick={() => setActiveTab(tab.id as any)}
                data-testid={`tab-${tab.id}`}
              >
                {tab.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-w-md mx-auto p-4 pb-20">
        {activeTab === 'overview' && (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{products.length}</p>
                    <p className="text-sm text-muted-foreground">Products</p>
                  </div>
                  <div className="text-center p-4 bg-muted rounded-lg">
                    <p className="text-2xl font-bold text-primary">{orders.length}</p>
                    <p className="text-sm text-muted-foreground">Orders</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Recent Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {orders.slice(0, 3).map((order) => (
                  <div key={order.id} className="border-b border-border last:border-0 py-3">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium text-sm">Order #{order.id.slice(-8)}</span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                        order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {order.status}
                      </span>
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>{order.deliveryOption === 'pickup' ? 'Farm Pickup' : 
                          order.deliveryOption === 'home' ? 'Home Delivery' : 'Farmers Market'}</p>
                      <div className="flex justify-between items-center pt-2">
                        <span className="font-semibold text-primary">${order.total} CAD</span>
                        <span className="text-xs text-muted-foreground">
                          Your earnings: ${(Number(order.total) - Number(order.platformFee) - Number(order.processingFee)).toFixed(2)} CAD
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <p className="text-muted-foreground text-center py-4">No orders yet</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === 'products' && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Your Products</h2>
              <Button
                onClick={() => {
                  resetProductForm();
                  setEditingProduct(null);
                  setShowProductDialog(true);
                }}
                data-testid="button-add-new-product"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>

            {loadingProducts ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-card rounded-lg border border-border p-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {products.map((product) => (
                  <Card key={product.id} data-testid={`product-card-${product.id}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-medium">{product.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{product.category}</p>
                          <ProductTags tags={product.tags || []} />
                        </div>
                        <div className="flex space-x-1 ml-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleEditProduct(product)}
                            data-testid={`button-edit-${product.id}`}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleDeleteProduct(product.id)}
                            data-testid={`button-delete-${product.id}`}
                          >
                            <Trash2 className="w-4 h-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-primary">
                          ${Number(product.price).toFixed(2)}/{product.unit}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          Stock: {product.stock}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {products.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No products yet</p>
                      <p className="text-sm text-muted-foreground mb-4">Add your first product to start selling</p>
                      <Button onClick={() => setShowProductDialog(true)}>
                        Add Product
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Orders</h2>
            
            {loadingOrders ? (
              <div className="space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-card rounded-lg border border-border p-4">
                    <div className="animate-pulse space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                      <div className="h-3 bg-muted rounded w-1/4" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {orders.map((order) => (
                  <Card key={order.id} data-testid={`order-card-${order.id}`}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">Order #{order.id.slice(-8)}</span>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          order.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {order.status}
                        </span>
                      </div>
                      
                      {order.items && (
                        <div className="text-sm text-muted-foreground mb-2">
                          {order.items.map((item, index) => (
                            <p key={index}>
                              {item.quantity}x {item.product.name}
                            </p>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-sm text-muted-foreground mb-2">
                        <p>{order.deliveryOption === 'pickup' ? 'Farm Pickup' : 
                            order.deliveryOption === 'home' ? 'Home Delivery' : 'Farmers Market'}</p>
                        {order.deliveryTime && (
                          <p>Scheduled: {new Date(order.deliveryTime).toLocaleDateString()}</p>
                        )}
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t border-border">
                        <span className="font-semibold text-primary">${order.total} CAD</span>
                        <span className="text-xs text-muted-foreground">
                          Your earnings: ${(Number(order.total) - Number(order.platformFee) - Number(order.processingFee)).toFixed(2)} CAD
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {orders.length === 0 && (
                  <Card>
                    <CardContent className="text-center py-8">
                      <ShoppingBag className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">No orders yet</p>
                      <p className="text-sm text-muted-foreground">Orders will appear here when customers purchase your products</p>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Analytics</h2>
            
            <Card>
              <CardHeader>
                <CardTitle>Financial Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Revenue</p>
                    <p className="text-2xl font-bold text-primary">
                      ${orders.reduce((sum, order) => sum + Number(order.total), 0).toFixed(2)} CAD
                    </p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Your Earnings (after fees)</p>
                    <p className="text-2xl font-bold text-primary">${totalEarnings.toFixed(2)} CAD</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Platform Fees Paid</p>
                    <p className="text-2xl font-bold text-muted-foreground">
                      ${orders.reduce((sum, order) => sum + Number(order.platformFee) + Number(order.processingFee), 0).toFixed(2)} CAD
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Order Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Total Orders</span>
                    <span className="font-medium">{orders.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Pending Orders</span>
                    <span className="font-medium">{orders.filter(o => o.status === 'pending').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Completed Orders</span>
                    <span className="font-medium">{orders.filter(o => o.status === 'delivered').length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Order Value</span>
                    <span className="font-medium">
                      ${orders.length > 0 ? (orders.reduce((sum, order) => sum + Number(order.total), 0) / orders.length).toFixed(2) : '0.00'} CAD
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Product Dialog */}
      <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add New Product'}
            </DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleProductSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                value={productForm.name}
                onChange={(e) => setProductForm(prev => ({ ...prev, name: e.target.value }))}
                required
                data-testid="input-product-name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-description">Description</Label>
              <Textarea
                id="product-description"
                value={productForm.description}
                onChange={(e) => setProductForm(prev => ({ ...prev, description: e.target.value }))}
                data-testid="input-product-description"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-category">Category</Label>
                <Select value={productForm.category} onValueChange={(value) => setProductForm(prev => ({ ...prev, category: value }))}>
                  <SelectTrigger data-testid="select-product-category">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {productCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-unit">Unit</Label>
                <Input
                  id="product-unit"
                  value={productForm.unit}
                  onChange={(e) => setProductForm(prev => ({ ...prev, unit: e.target.value }))}
                  placeholder="kg, piece, bunch"
                  required
                  data-testid="input-product-unit"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-price">Price (CAD)</Label>
                <Input
                  id="product-price"
                  type="number"
                  step="0.01"
                  value={productForm.price}
                  onChange={(e) => setProductForm(prev => ({ ...prev, price: e.target.value }))}
                  required
                  data-testid="input-product-price"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="product-stock">Stock</Label>
                <Input
                  id="product-stock"
                  type="number"
                  value={productForm.stock}
                  onChange={(e) => setProductForm(prev => ({ ...prev, stock: e.target.value }))}
                  required
                  data-testid="input-product-stock"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tags</Label>
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tag) => (
                  <label key={tag} className="flex items-center space-x-2 cursor-pointer">
                    <Checkbox
                      checked={productForm.tags.includes(tag)}
                      onCheckedChange={() => handleTagToggle(tag)}
                      data-testid={`checkbox-tag-${tag}`}
                    />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="seasonal"
                checked={productForm.seasonal}
                onCheckedChange={(checked) => setProductForm(prev => ({ ...prev, seasonal: !!checked }))}
                data-testid="checkbox-seasonal"
              />
              <Label htmlFor="seasonal">Seasonal product</Label>
            </div>

            <div className="flex space-x-2">
              <Button type="submit" className="flex-1" data-testid="button-save-product">
                {editingProduct ? 'Update Product' : 'Add Product'}
              </Button>
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => {
                  setShowProductDialog(false);
                  setEditingProduct(null);
                  resetProductForm();
                }}
                data-testid="button-cancel-product"
              >
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <BottomNavigation />
    </div>
  );
}
