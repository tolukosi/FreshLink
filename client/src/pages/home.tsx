import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useLocation as useRouter } from "wouter";
import { useLocation } from "@/hooks/use-location";
import { ProfileCompletionBanner } from "@/components/profile-completion-banner";
import { MainNavigation, BottomNavigation } from "@/components/navigation";
import { LocationSearch } from "@/components/location-search";
import { ProductGrid } from "@/components/product-grid";
import { Product, Producer, SearchFilters } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star } from "lucide-react";

// Quick categories with emojis
const categories = [
  { id: 'vegetables', name: 'Vegetables', emoji: '🥕' },
  { id: 'fruits', name: 'Fruits', emoji: '🍎' },
  { id: 'dairy', name: 'Dairy', emoji: '🧀' },
  { id: 'meat', name: 'Meat', emoji: '🥩' },
  { id: 'baked', name: 'Baked', emoji: '🍞' },
];

export default function Home() {
  const { user } = useAuth();
  const [, setRouter] = useRouter();
  const { location } = useLocation();
  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    query: '',
    radius: 10,
    location: location || undefined,
  });

  useEffect(() => {
    if (!user) {
      setRouter('/auth');
    }
  }, [user, setRouter]);

  useEffect(() => {
    if (location) {
      setSearchFilters(prev => ({ ...prev, location }));
    }
  }, [location]);

  // Search products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery<Product[]>({
    queryKey: ['/api/products/search', searchFilters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchFilters.query) params.append('q', searchFilters.query);
      if (searchFilters.category) params.append('category', searchFilters.category);
      if (searchFilters.tags) {
        searchFilters.tags.forEach(tag => params.append('tags', tag));
      }
      if (searchFilters.location) {
        params.append('lat', searchFilters.location.lat.toString());
        params.append('lng', searchFilters.location.lng.toString());
      }
      if (searchFilters.radius) {
        params.append('radius', searchFilters.radius.toString());
      }

      const res = await apiRequest("GET", `/api/products/search?${params}`, undefined);
      return res.json();
    },
    enabled: !!user,
  });

  // Featured producers
  const { data: featuredProducers = [] } = useQuery<Producer[]>({
    queryKey: ['/api/producers/nearby', location?.lat, location?.lng, 25],
    queryFn: async () => {
      if (!location) return [];
      
      const params = new URLSearchParams({
        lat: location.lat.toString(),
        lng: location.lng.toString(),
        radius: '25',
      });

      const res = await apiRequest("GET", `/api/producers/nearby?${params}`, undefined);
      return res.json();
    },
    enabled: !!location && !!user,
  });

  const handleSearch = (query: string) => {
    setSearchFilters(prev => ({ ...prev, query }));
  };

  const handleRadiusChange = (radius: number) => {
    setSearchFilters(prev => ({ ...prev, radius }));
  };

  const handleCategoryFilter = (category: string) => {
    setSearchFilters(prev => ({ 
      ...prev, 
      category: prev.category === category ? undefined : category,
      query: '',
    }));
  };

  const handleProductClick = (product: Product) => {
    // Navigate to product detail page (placeholder for now)
    console.log('Product clicked:', product);
  };

  const handleProducerClick = (producer: Producer) => {
    // Navigate to producer page (placeholder for now) 
    console.log('Producer clicked:', producer);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <ProfileCompletionBanner />
      <MainNavigation userLocation={location} />
      
      <LocationSearch
        onSearch={handleSearch}
        onRadiusChange={handleRadiusChange}
        selectedRadius={searchFilters.radius || 10}
      />

      {/* Quick Categories */}
      <section className="bg-card border-b border-border">
        <div className="max-w-md mx-auto p-4">
          <div className="flex space-x-3 overflow-x-auto scrollbar-hide">
            {categories.map((category) => (
              <Button
                key={category.id}
                variant={searchFilters.category === category.id ? "default" : "ghost"}
                className="flex-shrink-0 flex flex-col items-center space-y-2 p-3 h-auto"
                onClick={() => handleCategoryFilter(category.id)}
                data-testid={`button-category-${category.id}`}
              >
                <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center">
                  <span className="text-2xl">{category.emoji}</span>
                </div>
                <span className="text-xs font-medium">{category.name}</span>
              </Button>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Producers */}
      {featuredProducers.length > 0 && (
        <section className="bg-background py-6">
          <div className="max-w-md mx-auto px-4">
            <h2 className="text-lg font-semibold mb-4">Featured Local Producers</h2>
            
            <div className="space-y-4">
              {featuredProducers.slice(0, 3).map((producer) => (
                <Card
                  key={producer.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleProducerClick(producer)}
                  data-testid={`card-producer-${producer.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      {producer.profileImage ? (
                        <img
                          src={producer.profileImage}
                          alt={producer.businessName}
                          className="w-16 h-16 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center">
                          <span className="text-2xl">🌱</span>
                        </div>
                      )}
                      
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{producer.businessName}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {producer.address || 'Location not specified'}
                        </p>
                        {producer.description && (
                          <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
                            {producer.description}
                          </p>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex space-x-1">
                            {producer.certifications?.slice(0, 2).map((cert, index) => (
                              <span
                                key={index}
                                className="tag-organic text-white text-xs px-2 py-1 rounded-full font-medium"
                              >
                                {cert}
                              </span>
                            ))}
                          </div>
                          {producer.rating !== "0.0" && (
                            <div className="flex items-center text-yellow-400">
                              <span className="text-sm font-medium">{producer.rating}</span>
                              <Star className="w-4 h-4 ml-1 fill-current" />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Local Products Grid */}
      <section className="bg-background pb-20">
        <div className="max-w-md mx-auto px-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">
              {searchFilters.query ? `Search Results` : 'Local Products'}
            </h2>
            {searchFilters.category && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSearchFilters(prev => ({ ...prev, category: undefined }))}
                data-testid="button-clear-category"
              >
                Clear Filter
              </Button>
            )}
          </div>
          
          {isLoadingProducts ? (
            <div className="grid grid-cols-2 gap-4">
              {[...Array(6)].map((_, i) => (
                <Card key={i} className="overflow-hidden">
                  <div className="w-full h-32 bg-muted animate-pulse" />
                  <CardContent className="p-3 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 bg-muted rounded animate-pulse w-2/3" />
                    <div className="h-4 bg-muted rounded animate-pulse w-1/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : products.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <div className="text-6xl mb-4">🌾</div>
                <p className="text-muted-foreground mb-2">No products found</p>
                <p className="text-sm text-muted-foreground">
                  {searchFilters.query || searchFilters.category 
                    ? 'Try adjusting your search or filters'
                    : 'No producers in your area yet'
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <ProductGrid products={products} onProductClick={handleProductClick} />
          )}
        </div>
      </section>

      <BottomNavigation />
    </div>
  );
}
