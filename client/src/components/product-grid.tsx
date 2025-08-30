import { Product } from "@/types";
import { ProductTagLarge } from "./product-tags";
import { Button } from "@/components/ui/button";
import { useCart } from "@/hooks/use-cart";

interface ProductGridProps {
  products: Product[];
  onProductClick: (product: Product) => void;
}

export function ProductGrid({ products, onProductClick }: ProductGridProps) {
  const { addToCart, isAdding } = useCart();

  const handleAddToCart = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    addToCart(productId, 1);
  };

  if (products.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">No products found in your area</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-4">
      {products.map((product) => (
        <div
          key={product.id}
          className="bg-card rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => onProductClick(product)}
          data-testid={`card-product-${product.id}`}
        >
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-32 object-cover"
            />
          ) : (
            <div className="w-full h-32 bg-muted flex items-center justify-center">
              <span className="text-muted-foreground text-sm">No image</span>
            </div>
          )}
          
          <div className="p-3">
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-medium text-sm text-foreground line-clamp-1">
                {product.name}
              </h3>
              {product.tags && product.tags.length > 0 && (
                <ProductTagLarge tag={product.tags[0]} />
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mb-2">
              {product.producer?.businessName} 
              {product.distance && ` • ${product.distance.toFixed(1)} km`}
            </p>
            
            <div className="flex items-center justify-between">
              <span className="font-semibold text-primary">
                ${Number(product.price).toFixed(2)}/{product.unit}
              </span>
              <Button
                size="sm"
                onClick={(e) => handleAddToCart(e, product.id)}
                disabled={isAdding || product.stock === 0}
                data-testid={`button-add-to-cart-${product.id}`}
              >
                {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
