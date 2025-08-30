import { Home, Search, ShoppingBag, User, Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/hooks/use-cart";
import { useLocation } from "wouter";
import { useState } from "react";
import { ShoppingCart } from "./shopping-cart";

interface NavigationProps {
  userLocation?: { city: string; province: string };
}

export function MainNavigation({ userLocation }: NavigationProps) {
  const { user, logout } = useAuth();
  const { getTotalItems } = useCart();
  const [, setLocation] = useLocation();
  const [cartOpen, setCartOpen] = useState(false);

  const handleRoleChange = (newRole: string) => {
    if (newRole === 'producer') {
      setLocation('/producer');
    } else {
      setLocation('/');
    }
  };

  const getUserInitials = () => {
    if (!user) return 'G';
    return user.username.slice(0, 2).toUpperCase();
  };

  const totalItems = getTotalItems();

  return (
    <>
      <header className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-md mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="gradient-bg w-8 h-8 rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-lg">F</span>
              </div>
              <div>
                <h1 className="font-bold text-lg text-foreground">FreshLink</h1>
                <p className="text-xs text-muted-foreground">
                  {userLocation ? `${userLocation.city}, ${userLocation.province}` : 'Loading location...'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {user && (
                <Select value={user.role} onValueChange={handleRoleChange}>
                  <SelectTrigger className="w-32" data-testid="select-user-role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="consumer">Consumer</SelectItem>
                    <SelectItem value="producer">Producer</SelectItem>
                    <SelectItem value="business">Business</SelectItem>
                  </SelectContent>
                </Select>
              )}
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="relative"
                onClick={() => setCartOpen(true)}
                data-testid="button-open-cart"
              >
                <ShoppingBag className="w-6 h-6" />
                {totalItems > 0 && (
                  <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 text-xs flex items-center justify-center">
                    {totalItems}
                  </span>
                )}
              </Button>
              
              <Avatar 
                className="w-8 h-8 cursor-pointer" 
                onClick={() => setLocation('/auth')}
                data-testid="avatar-profile"
              >
                <AvatarFallback className="text-sm font-medium">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </div>
          </div>
        </div>
      </header>

      <ShoppingCart isOpen={cartOpen} onClose={() => setCartOpen(false)} />
    </>
  );
}

export function BottomNavigation() {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location === '/';
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
      <div className="max-w-md mx-auto px-4 py-2">
        <div className="flex items-center justify-around">
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1 p-2 ${isActive('/') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
            onClick={() => setLocation('/')}
            data-testid="nav-home"
          >
            <Home className="w-6 h-6" />
            <span className="text-xs font-medium">Home</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1 p-2 ${isActive('/search') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
            onClick={() => setLocation('/search')}
            data-testid="nav-search"
          >
            <Search className="w-6 h-6" />
            <span className="text-xs font-medium">Search</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1 p-2 ${isActive('/orders') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
            onClick={() => setLocation('/orders')}
            data-testid="nav-orders"
          >
            <ShoppingBag className="w-6 h-6" />
            <span className="text-xs font-medium">Orders</span>
          </Button>
          
          <Button
            variant="ghost"
            size="sm"
            className={`flex flex-col items-center space-y-1 p-2 ${isActive('/profile') ? 'text-primary bg-primary/10' : 'text-muted-foreground'}`}
            onClick={() => setLocation('/profile')}
            data-testid="nav-profile"
          >
            <User className="w-6 h-6" />
            <span className="text-xs font-medium">Profile</span>
          </Button>
        </div>
      </div>
    </nav>
  );
}
