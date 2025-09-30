import axios from "axios";
import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Check, Brain, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { loadStripe } from "@stripe/stripe-js"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const plans = [
  {
    id: "free",
    name: "Free",
    price: "FREE",
    yearlyPrice: "FREE",
    description: "Get started with basic AI learning features",
    features: [
      "5 AI Chats per month",
      "Basic study materials",
      "Limited test creation",
      "Community support",
      "Mobile app access",
    ],
  },
  {
    id: "basic",
    name: "Basic",
    price: "$9.99",
    yearlyPrice: "$99.99",
    description: "Perfect for getting started with AI learning",
    features: [
      "10 AI Chats per month",
      "Basic study materials",
      "Test creation",
      "Email support",
      "Mobile app access",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19.99",
    yearlyPrice: "$199.99",
    description: "Most popular choice for serious learners",
    features: [
      "Unlimited AI Chats",
      "Advanced study materials",
      "Test creation & analytics",
      "Study session tracking",
      "Priority support",
      "Custom chat groups",
    ],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$29.99",
    yearlyPrice: "$299.99",
    description: "For power users and educators",
    features: [
      "Everything in Pro",
      "Advanced analytics dashboard",
      "Custom integrations",
      "Bulk material upload",
      "Team collaboration",
      "White-label options",
    ],
  },
];

interface Plan {
  name: string;
  current_period_end: string;
  canceled_at: string;
  is_yearly: boolean;
}

const Pricing = () => {
  const [isYearly, setIsYearly] = useState(false);
  const [loadingPlan, setLoadingPlan] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const navigate = useNavigate();
  const { isAuthenticated, loading } = useAuth();
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);

  // wczytanie planu usera jesli jest zalogowany
  useEffect(() => {
    if (!loading && isAuthenticated) {
      axios.get("http://localhost:8000/user/subscription/current", {
        withCredentials: true
      })
      .then(res => {
        setCurrentPlan({
          name: res.data.name,
          current_period_end: res.data.current_period_end,
          canceled_at: res.data.canceled_at,
          is_yearly: res.data.is_yearly
        });
      })
      .catch(err => {
        toast.error("Failed to load subscription data");
      });
    }
  }, [isAuthenticated, loading]);


  const handleSelectPlan = async (planId: string) => {
    if (!isAuthenticated) {
      navigate(`/register?plan=${planId}`);
      return;
    }

    const fullCurrentId = currentPlan.is_yearly ? `${currentPlan.name} - year` : currentPlan.name;
    const fullSelectedId = isYearly ? `${planId} - year` : planId;

    if (fullCurrentId !== fullSelectedId) {
      setSelectedPlan(planId);
      setShowConfirmDialog(true);
    }
  };

  const getConfirmationMessage = () => {
    if (!selectedPlan || !currentPlan) return { title: "", description: "" };

    const currentPlanData = plans.find(p => p.id === currentPlan.name);
    const selectedPlanData = plans.find(p => p.id === selectedPlan);

    if (!selectedPlanData) return { title: "", description: "" };

    if (selectedPlan === "free") {
      return {
        title: "Cancel Your Plan?",
        description: `Are you sure you want to cancel your ${currentPlanData?.name} plan? You'll keep access to all premium features until the end of your current billing period, then your account will switch to the Free plan.`
      };
    }

    const planOrder = [
      "free",
      "basic",
      "pro",
      "premium",
      "basic - year",
      "pro - year",
      "premium - year",
    ];

    const currentPlanId = currentPlan.is_yearly ? `${currentPlan.name} - year` : currentPlan.name;
    const selectedPlanId = isYearly ? `${selectedPlan} - year` : selectedPlan;

    const currentIndex = planOrder.indexOf(currentPlanId);
    const selectedIndex = planOrder.indexOf(selectedPlanId);

    if (selectedIndex > currentIndex) {
      return {
        title: "Upgrade Your Plan?",
        description: `Are you sure you want to upgrade to ${selectedPlanData.name}${isYearly ? " (Yearly)" : ""}? You'll be upgraded immediately and charged a prorated amount for the remainder of your current billing period.`
      };
    } else {
      return {
        title: "Change Your Plan?",
        description: `Are you sure you want to change to ${selectedPlanData.name}${isYearly ? " (Yearly)" : ""}? You'll keep your current ${currentPlanData?.name} features until the end of your billing period, then switch to ${selectedPlanData.name}.`
      };
    }
  };


  const confirmPlanChange = async () => {
    setShowConfirmDialog(false);
    if (currentPlan.name === "free" && selectedPlan !== "free") {
      try {
        setLoadingPlan(selectedPlan);
        const stripeRes = await axios.post("http://localhost:8000/payments/create-checkout-session", {
          plan: isYearly ? `${selectedPlan} - year` : selectedPlan,
        }, { withCredentials: true })
        const stripe  = await loadStripe("pk_test_51RksBt2fKuvpViwjchqQPPStdPHuvZ0JhK4pCYaSH9C3yZEZfyXWsQ4idXmkyKLEIfPPBbU3V52g1OU7DMkxqrEV00dW10lEVV");
        await stripe?.redirectToCheckout({
          sessionId: stripeRes.data.id
        });
      } catch (error: any) {
        console.error("Stripe checkout session error:", error);
        toast.error("Payment failed to start");
      } finally {
        setLoadingPlan(null);
      }
      return;
    }

    // ustaiwnie planu na free jest jednoznaczne z rezygnacja z planu
    if (selectedPlan === "free") {
      try {
        setLoadingPlan(selectedPlan);
        const res = await axios.post("http://localhost:8000/payments/cancel-subscription", {}, {
          withCredentials: true
        });
        toast.success(res.data.message);
        navigate(`/register?plan=${selectedPlan}`);
      } catch (err: any) {
        toast.error(err.response?.data?.detail || "Failed to cancel subscription");
      } finally {
        setLoadingPlan(null);
      }
      return;
    } else { // plan jest inny niz free i chcemy upgrade lub downgrade
      try {
        setLoadingPlan(selectedPlan);
        await axios.post("http://localhost:8000/payments/change-plan", {
          plan: isYearly ? `${selectedPlan} - year` : selectedPlan,
        }, { withCredentials: true });
        navigate(`/account`);
      } catch (error: any) {
        console.error("Stripe checkout session error:", error);
        toast.error("Payment failed to start");
      } finally {
        setLoadingPlan(null);
      }
    }
  }

  const confirmationMessage = getConfirmationMessage();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-40 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="container mx-auto px-4 py-16 relative">
        <div className="text-center mb-12">
          <Brain className="h-16 w-16 text-primary mx-auto mb-4 opacity-0 animate-fade-in hover:scale-110 hover:rotate-12 transition-all duration-500" />
          <h1 className="min-h-[45px] text-4xl font-bold mb-4 opacity-0 animate-fade-in bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent dark:from-white dark:via-blue-300 dark:to-purple-300" style={{ animationDelay: '0.2s' }}>Choose Your Learning Plan</h1>
          <p className="text-xl text-muted-foreground mb-8 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            Unlock the full potential of AI-powered learning
          </p>
          
          {/* Billing Toggle */}
          <div className="flex items-center justify-center gap-4 mb-8 opacity-0 animate-fade-in" style={{ animationDelay: '0.6s' }}>
            <span className={`text-sm transition-all duration-300 ${!isYearly ? 'text-primary font-medium scale-110' : 'text-muted-foreground hover:text-foreground'}`}>
              Monthly
            </span>
            <Switch
              checked={isYearly}
              onCheckedChange={setIsYearly}
              className="data-[state=checked]:bg-primary"
            />
            <span className={`text-sm transition-all duration-300 ${isYearly ? 'text-primary font-medium scale-110' : 'text-muted-foreground hover:text-foreground'}`}>
              Yearly
            </span>
            {isYearly && (
              <Badge variant="secondary" className="ml-2 animate-fade-in hover:scale-105 transition-all duration-300">
                Save 17%
              </Badge>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              className={`relative group hover:shadow-2xl transition-all duration-500 hover:-translate-y-4 hover:rotate-1 opacity-0 animate-fade-in flex flex-col h-full ${
                plan.popular
                  ? "border-primary shadow-lg scale-105 bg-card/90 backdrop-blur-sm dark:bg-card/80"
                  : "bg-card/80 backdrop-blur-sm border shadow-lg hover:bg-card/90 dark:bg-card/70 dark:hover:bg-card/80"
              }`}
              style={{ animationDelay: `${0.8 + index * 0.2}s` }}
            >
              {plan.popular && (
                <Badge
                  variant="default"
                  className="absolute -top-2 left-1/2 transform -translate-x-1/2 animate-pulse hover:scale-110 transition-transform duration-300"
                >
                  Most Popular
                </Badge>
              )}
              <CardHeader className="text-center pb-8">
                <CardTitle className="text-2xl group-hover:text-blue-600 transition-colors duration-300">{plan.name}</CardTitle>
                <CardDescription className="text-base group-hover:text-foreground transition-colors duration-300">
                  {plan.description}
                </CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold group-hover:scale-110 transition-transform duration-300 inline-block bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    {isYearly ? plan.yearlyPrice : plan.price}
                  </span>
                  {plan.id !== "free" && (
                    <span className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">
                      /{isYearly ? "year" : "month"}
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0 flex-1 flex flex-col">
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-3 group-hover:scale-105 transition-transform duration-300" style={{ transitionDelay: `${index * 0.05}s` }}>
                      <Check className="h-5 w-5 text-green-500 flex-shrink-0 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" />
                      <span className="text-sm group-hover:text-foreground transition-colors duration-300">{feature}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl mt-auto"
                  variant={plan.popular ? "default" : "outline"}
                  onClick={() => handleSelectPlan(plan.id)}
                  disabled={
                    (plan.name.toLowerCase() === "free" && currentPlan?.name.toLowerCase() === "free") ||
                    (currentPlan?.name.toLowerCase() === (isYearly ? `${plan.name} - year` : plan.name).toLowerCase()) ||
                    loadingPlan === plan.id
                  }
                >
                  {loadingPlan === plan.id ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    plan.id === "free" ? "Get Started Free" : "Get Started"
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{confirmationMessage.title}</DialogTitle>
            <DialogDescription className="text-base leading-relaxed">
              {confirmationMessage.description}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col-reverse sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmPlanChange}
              className="w-full sm:w-auto"
            >
              {selectedPlan === "free" ? "Yes, Cancel Plan" : "Yes, Change Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Pricing;