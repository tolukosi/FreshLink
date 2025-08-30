import { X } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/lib/auth";

export function ProfileCompletionBanner() {
  const { user } = useAuth();
  const [isDismissed, setIsDismissed] = useState(false);

  if (!user || isDismissed || user.profileCompletion >= 100) {
    return null;
  }

  return (
    <div className="bg-accent text-accent-foreground p-3 border-b border-border">
      <div className="max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-semibold">
            {user.profileCompletion}%
          </div>
          <div>
            <p className="font-medium text-sm">Complete your profile to unlock all features</p>
            <div className="w-32 h-1.5 bg-muted rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-primary transition-all duration-300" 
                style={{ width: `${user.profileCompletion}%` }}
              />
            </div>
          </div>
        </div>
        <button 
          className="text-accent-foreground hover:text-foreground transition-colors"
          onClick={() => setIsDismissed(true)}
          data-testid="button-dismiss-banner"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
