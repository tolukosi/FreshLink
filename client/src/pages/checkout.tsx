import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { useCart } from "@/hooks/use-cart";
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { stripePromise } from "@/lib/stripe";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CreditCard, MapPin, Clock } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DeliveryOption, FeeCalculation } from "@/types";

interface CheckoutFormProps {
  clientSecret: string;
  onSuccess: () => void;
}

function CheckoutForm({ clientSecret, onSuccess }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/orders`,
      },
      redirect: "if_required",
    });

    if (error) {
      toast({
        title: "Payment Failed",
        description: error.message,
        variant: "destructive",
      });
      setIsProcessing(false);
    } else {
      toast({
        title: "Payment Successful",
        description: "Your order has been placed successfully!",
      });
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5" />
            <span>Payment Information</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentElement 
            options={{
              layout: "tabs",
            }}
          />
        </CardContent>
      </Card>

      <Button 
        type="submit" 
        className="w-full" 
        disabled={!stripe || !elements || isProcessing}
        data-testid="button-complete-payment"
      >
        {isProcessing ? 'Processing...' : 'Complete Payment'}
      </Button>
    </form>
  );
}

export default function Checkout() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { cartItems, getSubtotal } = useCart();
  const { toast } = useToast();
  
  const [deliveryOption, setDeliveryOption] = useState<DeliveryOption>('pickup');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  const subtotal = getSubtotal();

  useEffect(() => {
    if (!user) {
      setLocation('/auth');
      return;
    }
    if (cartItems.length === 0) {
      setLocation('/');
      return;
    }
  }, [user, cartItems, setLocation]);

  // Calculate fees
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

  // Create order
  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      const res = await apiRequest("POST", "/api/orders", orderData);
      return res.json();
    },
    onSuccess: async (order) => {
      // Create payment intent
      try {
        const res = await apiRequest("POST", "/api/create-payment-intent", {
          amount: feeCalculation?.total,
          orderId: order.id,
        });
        const { clientSecret } = await res.json();
        setClientSecret(clientSecret);
      } catch (error: any) {
        toast({
          title: "Error",
          description: "Failed to initialize payment",
          variant: "destructive",
        });
      }
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleProceedToPayment = () => {
    if (deliveryOption === 'home' && !deliveryAddress.trim()) {
      toast({
        title: "Address Required",
        description: "Please enter your delivery address",
        variant: "destructive",
      });
      return;
    }

    const orderData = {
      deliveryOption,
      deliveryAddress: deliveryOption === 'home' ? deliveryAddress : undefined,
      deliveryTime: undefined, // Could add time selection in the future
    };

    createOrderMutation.mutate(orderData);
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Order Placed Successfully",
      description: "Thank you for your purchase! You will receive a confirmation email shortly.",
    });
    setLocation('/orders');
  };

  if (!user || cartItems.length === 0) {
    return null;
  }

  if (!clientSecret) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="bg-card border-b border-border p-4">
          <div className="max-w-md mx-auto flex items-center space-x-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setLocation('/')}
              data-testid="button-back"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">Checkout</h1>
          </div>
        </header>

        <div className="max-w-md mx-auto p-4 space-y-6">
          {/* Order Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center">
                  <div className="flex-1">
                    <p className="font-medium">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {item.quantity}x ${Number(item.product.price).toFixed(2)}/{item.product.unit}
                    </p>
                  </div>
                  <span className="font-semibold">
                    ${(Number(item.product.price) * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
              
              <Separator />
              
              {feeCalculation && (
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span>${feeCalculation.subtotal.toFixed(2)} CAD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform Fee (5%)</span>
                    <span>${feeCalculation.platformFee.toFixed(2)} CAD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Processing</span>
                    <span>${feeCalculation.processingFee.toFixed(2)} CAD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Delivery Fee</span>
                    <span>
                      {feeCalculation.deliveryFee === 0 ? 'Free' : `$${feeCalculation.deliveryFee.toFixed(2)} CAD`}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-semibold text-base">
                    <span>Total</span>
                    <span className="text-primary">${feeCalculation.total.toFixed(2)} CAD</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Delivery Options */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MapPin className="w-5 h-5" />
                <span>Delivery Options</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <RadioGroup value={deliveryOption} onValueChange={(value) => setDeliveryOption(value as DeliveryOption)}>
                <div className="space-y-3">
                  <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="pickup" data-testid="radio-pickup" />
                    <div className="flex-1">
                      <p className="font-medium">Farm Pickup</p>
                      <p className="text-sm text-muted-foreground">Pick up directly from producer</p>
                    </div>
                    <span className="font-semibold text-primary">Free</span>
                  </Label>
                  
                  <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="home" data-testid="radio-home" />
                    <div className="flex-1">
                      <p className="font-medium">Home Delivery</p>
                      <p className="text-sm text-muted-foreground">Delivered to your door</p>
                    </div>
                    <span className="font-semibold text-primary">$4.99</span>
                  </Label>
                  
                  <Label className="flex items-center space-x-3 p-3 border border-border rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="farmers-market" data-testid="radio-farmers-market" />
                    <div className="flex-1">
                      <p className="font-medium">Farmers Market</p>
                      <p className="text-sm text-muted-foreground">Saturday 8AM-2PM</p>
                    </div>
                    <span className="font-semibold text-primary">$1.99</span>
                  </Label>
                </div>
              </RadioGroup>

              {deliveryOption === 'home' && (
                <div className="mt-4 space-y-2">
                  <Label htmlFor="delivery-address">Delivery Address</Label>
                  <Textarea
                    id="delivery-address"
                    value={deliveryAddress}
                    onChange={(e) => setDeliveryAddress(e.target.value)}
                    placeholder="Enter your full delivery address..."
                    required
                    data-testid="textarea-delivery-address"
                  />
                </div>
              )}

              <div className="mt-4 space-y-2">
                <Label htmlFor="delivery-notes">Delivery Notes (Optional)</Label>
                <Textarea
                  id="delivery-notes"
                  value={deliveryNotes}
                  onChange={(e) => setDeliveryNotes(e.target.value)}
                  placeholder="Any special instructions for delivery..."
                  data-testid="textarea-delivery-notes"
                />
              </div>
            </CardContent>
          </Card>

          <Button 
            onClick={handleProceedToPayment}
            className="w-full"
            disabled={isCalculatingFees || createOrderMutation.isPending}
            data-testid="button-proceed-to-payment"
          >
            {createOrderMutation.isPending ? 'Creating Order...' : 'Proceed to Payment'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card border-b border-border p-4">
        <div className="max-w-md mx-auto flex items-center space-x-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.history.back()}
            data-testid="button-back-payment"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="text-lg font-semibold">Complete Payment</h1>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4">
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm 
            clientSecret={clientSecret} 
            onSuccess={handlePaymentSuccess}
          />
        </Elements>
      </div>
    </div>
  );
}
