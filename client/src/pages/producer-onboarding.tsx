import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Circle, ArrowRight, Leaf, Users, DollarSign } from "lucide-react";
import { ProducerSetupDialog } from "@/components/producer-setup-dialog";

const onboardingSteps = [
  {
    id: 'profile',
    title: 'Create Producer Profile',
    description: 'Set up your farm or business information',
    icon: Leaf,
  },
  {
    id: 'products',
    title: 'Add Your First Products',
    description: 'List the products you want to sell',
    icon: Users,
  },
  {
    id: 'payment',
    title: 'Set Up Payments',
    description: 'Configure Stripe Connect for payouts',
    icon: DollarSign,
  },
];

export default function ProducerOnboarding() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    if (!user || user.role !== 'producer') {
      setLocation('/');
    }
  }, [user, setLocation]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-gradient-to-r from-primary to-green-600 text-primary-foreground p-6">
        <div className="max-w-md mx-auto text-center">
          <div className="gradient-bg w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
            <span className="text-primary-foreground font-bold text-2xl">F</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">Welcome to FreshLink!</h1>
          <p className="text-primary-foreground/80">
            Let's get your producer profile set up so you can start connecting with local customers.
          </p>
        </div>
      </header>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Benefits Section */}
        <Card>
          <CardHeader>
            <CardTitle>Why Sell on FreshLink?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Users className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Direct Customer Connection</h3>
                <p className="text-sm text-muted-foreground">
                  Build relationships with customers who value local, fresh food.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <DollarSign className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Fair Pricing</h3>
                <p className="text-sm text-muted-foreground">
                  Only 5% platform fee. You keep 95% of every sale (minus payment processing).
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                <Leaf className="w-4 h-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Local Focus</h3>
                <p className="text-sm text-muted-foreground">
                  Customers discover you based on proximity, supporting truly local food systems.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Steps */}
        <Card>
          <CardHeader>
            <CardTitle>Getting Started</CardTitle>
            <CardDescription>Complete these steps to start selling</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {onboardingSteps.map((step, index) => {
              const Icon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div key={step.id} className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-primary" />
                    ) : (
                      <Circle className={`w-6 h-6 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h3 className={`font-medium ${isCurrent ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {step.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                  
                  <Icon className={`w-5 h-5 ${isCurrent ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Action Button */}
        <div className="space-y-4">
          {currentStep === 0 && (
            <Button 
              className="w-full" 
              onClick={() => setShowSetupDialog(true)}
              data-testid="button-start-setup"
            >
              Create Producer Profile
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 1 && (
            <Button 
              className="w-full" 
              onClick={() => setLocation('/producer')}
              data-testid="button-add-products"
            >
              Go to Dashboard & Add Products
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}
          
          {currentStep === 2 && (
            <Button 
              className="w-full" 
              onClick={() => setLocation('/producer')}
              data-testid="button-setup-payments"
            >
              Set Up Payment Method
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          )}

          <Button 
            variant="outline" 
            className="w-full"
            onClick={() => setLocation('/')}
            data-testid="button-skip-onboarding"
          >
            Skip for Now
          </Button>
        </div>

        {/* Help Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <h3 className="font-medium mb-2">Need Help?</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Our support team is here to help you get started successfully.
              </p>
              <Button variant="outline" size="sm">
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <ProducerSetupDialog 
        open={showSetupDialog} 
        onOpenChange={setShowSetupDialog}
      />
    </div>
  );
}
