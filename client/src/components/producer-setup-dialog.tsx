import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useLocation } from "wouter";

interface ProducerSetupDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const certificationOptions = [
  'Organic',
  'Non-GMO',
  'Grass-Fed',
  'Free-Range',
  'Local',
  'Sustainable',
  'Pesticide-Free',
];

export function ProducerSetupDialog({ open, onOpenChange }: ProducerSetupDialogProps) {
  const { updateProfile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  const [formData, setFormData] = useState({
    businessName: '',
    description: '',
    story: '',
    address: '',
    phone: '',
    website: '',
    certifications: [] as string[],
  });

  const createProducerMutation = useMutation({
    mutationFn: async (producerData: any) => {
      const res = await apiRequest("POST", "/api/producers", producerData);
      return res.json();
    },
    onSuccess: async () => {
      // Update user profile completion
      await updateProfile({ 
        role: 'producer',
        profileCompletion: 80,
      });
      
      queryClient.invalidateQueries({ queryKey: ['/api/producers/me'] });
      onOpenChange(false);
      
      toast({
        title: "Producer Profile Created",
        description: "Welcome to FreshLink! You can now start adding products.",
      });
      
      setLocation('/producer');
    },
    onError: (error: any) => {
      toast({
        title: "Setup Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createProducerMutation.mutate(formData);
  };

  const handleCertificationToggle = (certification: string) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.includes(certification)
        ? prev.certifications.filter(c => c !== certification)
        : [...prev.certifications, certification]
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md mx-auto max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Set Up Your Producer Profile</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="business-name">Business Name *</Label>
            <Input
              id="business-name"
              value={formData.businessName}
              onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
              required
              data-testid="input-business-name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of your farm or business"
              data-testid="textarea-description"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="story">Your Story</Label>
            <Textarea
              id="story"
              value={formData.story}
              onChange={(e) => setFormData(prev => ({ ...prev, story: e.target.value }))}
              placeholder="Tell customers about your farming practices, history, or what makes you special"
              data-testid="textarea-story"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Farm or business address"
              data-testid="input-address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="(306) 123-4567"
                data-testid="input-phone"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                value={formData.website}
                onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                placeholder="https://yourfarm.com"
                data-testid="input-website"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Certifications</Label>
            <div className="grid grid-cols-2 gap-2">
              {certificationOptions.map((cert) => (
                <label key={cert} className="flex items-center space-x-2 cursor-pointer">
                  <Checkbox
                    checked={formData.certifications.includes(cert)}
                    onCheckedChange={() => handleCertificationToggle(cert)}
                    data-testid={`checkbox-cert-${cert.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  />
                  <span className="text-sm">{cert}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex space-x-2 pt-4">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={createProducerMutation.isPending || !formData.businessName}
              data-testid="button-create-producer"
            >
              {createProducerMutation.isPending ? 'Creating...' : 'Create Producer Profile'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              data-testid="button-cancel-producer"
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
