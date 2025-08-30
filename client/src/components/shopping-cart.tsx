import { useState } from "react";
import { X, Plus, Minus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useCart } from "@/hooks/use-cart";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DeliveryOption, FeeCalculation } from "@/types";
import { useLocation } from "wouter";

interface ShoppingCartProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ShoppingCart({ isOpen, onClose }: ShoppingCartProps) {
  const [, setLocation] = useLocation();
  const { cartItems, updateCartItem, removeFromCart, getSubtotal } = useCart();
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('pickup');

  const subtotal = getSubtotal();

  const { data: feeCalculation, isLoading: isCalculatingFees } = useQuery<FeeCalculation>({
    queryKey: ['/api/orders/calculate-fees', subtotal, deliveryOption],
    queryFn: async () => {
      const res = await apiRequest("POST", "/api/orders/calculate-fees", {
        subtotal,
        deliveryOption,
      });
      return res.json();
    },
    enabled: cartItems.length > 0,
  });

  const handleProceedToCheckout = () => {
    setLocation('/checkout');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div 
        className="absolute bottom-0 left-0 right-0 bg-card rounded-t-xl max-w-md mx-auto max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        data-testid="shopping-cart-overlay"
      >
        {/* Cart Header */}
        <div className="sticky top-0 bg-card border-b border-border p-4 rounded-t-xl">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Cart</h2>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={onClose}
              data-testid="button-close-cart"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {cartItems.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-muted-foreground">Your cart is empty</p>
          </div>
        ) : (
          <>
            {/* Cart Items */}
            <div className="p-4 space-y-4">
              {cartItems.map((item) => (
                <div 
                  key={item.id} 
                  className="flex items-center space-x-3 bg-muted/50 p-3 rounded-lg"
                  data-testid={`cart-item-${item.id}`}
                >
                  {item.product.images && item.product.images.length > 0 ? (
                    <img
                      src={item.product.images[0]}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-lg object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">No img</span>
                    </div>
                  )}
                  
                  <div className="flex-1">
                    <h3 className="font-medium text-sm">{item.product.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {item.product.producer?.businessName}
                    </p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-sm font-semibold text-primary">
                        ${Number(item.product.price).toFixed(2)}/{item.product.unit}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => item.quantity > 1 ? updateCartItem(item.id, item.quantity - 1) : removeFromCart(item.id)}
                          data-testid={`button-decrease-quantity-${item.id}`}
                        >
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="text-sm font-medium min-w-[2ch] text-center">
                          {item.quantity}
                        </span>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateCartItem(item.id, item.quantity + 1)}
                          data-testid={`button-increase-quantity-${item.id}`}
                        >
                          <Plus className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              {/* Delivery Options */}
              <div className="border-t border-border pt-4">
                <h3 className="font-medium mb-3">Delivery Options</h3>
                <RadioGroup value={deliveryOption} onValueChange={(value) => setDeliveryOption(value as DeliveryOption)}>
                  <div className="space-y-2">
                    <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="pickup" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">Farm Pickup</p>
                        <p className="text-xs text-muted-foreground">Pick up directly from producer</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">Free</span>
                    </Label>
                    
                    <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="home" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">Home Delivery</p>
                        <p className="text-xs text-muted-foreground">Delivered to your door</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">$4.99</span>
                    </Label>
                    
                    <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                      <RadioGroupItem value="farmers-market" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">Farmers Market</p>
                        <p className="text-xs text-muted-foreground">Saturday 8AM-2PM</p>
                      </div>
                      <span className="text-sm font-semibold text-primary">$1.99</span>
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Fee Breakdown */}
              {feeCalculation && (
                <div className="border-t border-border pt-4">
                  <h3 className="font-medium mb-3">Order Summary</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>${feeCalculation.subtotal.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Platform Fee (5%)</span>
                      <span>${feeCalculation.platformFee.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Payment Processing</span>
                      <span>${feeCalculation.processingFee.toFixed(2)} CAD</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span>
                        {feeCalculation.deliveryFee === 0 ? 'Free' : `$${feeCalculation.deliveryFee.toFixed(2)} CAD`}
                      </span>
                    </div>
                    <div className="flex justify-between font-semibold pt-2 border-t border-border">
                      <span>Total</span>
                      <span className="text-primary">${feeCalculation.total.toFixed(2)} CAD</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Checkout Button */}
            <div className="sticky bottom-0 bg-card border-t border-border p-4">
              <Button 
                className="w-full" 
                onClick={handleProceedToCheckout}
                disabled={isCalculatingFees}
                data-testid="button-proceed-to-checkout"
              >
                {isCalculatingFees ? 'Calculating...' : 'Proceed to Checkout'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
