import { MapPin, Search } from "lucide-react";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/use-location";

interface LocationSearchProps {
  onSearch: (query: string) => void;
  onRadiusChange: (radius: number) => void;
  selectedRadius: number;
}

export function LocationSearch({ onSearch, onRadiusChange, selectedRadius }: LocationSearchProps) {
  const { location, updateLocation, isLoading } = useLocation();
  const [searchQuery, setSearchQuery] = useState("");

  const radiusOptions = [2, 5, 10, 50];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchQuery);
  };

  return (
    <section className="bg-card border-b border-border">
      <div className="max-w-md mx-auto p-4">
        {/* Location Update */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <MapPin className="w-5 h-5 text-primary" />
            <span className="text-sm font-medium">
              {location ? `${location.city || 'Unknown'}, ${location.province || 'Unknown'}` : 'Loading location...'}
            </span>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={updateLocation}
            disabled={isLoading}
            data-testid="button-update-location"
          >
            {isLoading ? 'Updating...' : 'Update'}
          </Button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="relative mb-4">
          <Search className="absolute left-3 top-3 w-5 h-5 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search local products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 pr-4 py-3"
            data-testid="input-search-products"
          />
        </form>

        {/* Radius Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-sm font-medium text-muted-foreground">Search within:</span>
          <div className="flex space-x-1">
            {radiusOptions.map((radius) => (
              <Button
                key={radius}
                variant={selectedRadius === radius ? "default" : "ghost"}
                size="sm"
                onClick={() => onRadiusChange(radius)}
                data-testid={`button-radius-${radius}`}
              >
                {radius}km
              </Button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
