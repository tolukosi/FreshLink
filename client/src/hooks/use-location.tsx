import { useState, useEffect } from "react";
import { Location } from "@/types";
import { getCurrentLocation, reverseGeocode } from "@/lib/location";

export function useLocation() {
  const [location, setLocation] = useState<Location | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const updateLocation = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const coords = await getCurrentLocation();
      const locationDetails = await reverseGeocode(coords.lat, coords.lng);
      
      const fullLocation = {
        ...coords,
        ...locationDetails,
      };
      
      setLocation(fullLocation);
      localStorage.setItem('userLocation', JSON.stringify(fullLocation));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get location');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Try to load from localStorage first
    const savedLocation = localStorage.getItem('userLocation');
    if (savedLocation) {
      try {
        setLocation(JSON.parse(savedLocation));
      } catch {
        // If parsing fails, get fresh location
        updateLocation();
      }
    } else {
      updateLocation();
    }
  }, []);

  return {
    location,
    isLoading,
    error,
    updateLocation,
    setLocation,
  };
}
