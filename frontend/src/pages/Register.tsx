import axios from "axios";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Brain, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";
import { loadStripe } from "@stripe/stripe-js"

const plans = [
  {
    id: "free",
    name: "Free",
    price: "FREE",
    yearlyPrice: "FREE",
    features: ["5 AI Chats per month", "Basic study materials", "Limited test creation"],
  },
  {
    id: "basic",
    name: "Basic",
    price: "$9.99",
    yearlyPrice: "$99.99",
    features: ["10 AI Chats per month", "Basic materials", "Test creation"],
  },
  {
    id: "pro",
    name: "Pro",
    price: "$19.99",
    yearlyPrice: "$199.99",
    features: ["Unlimited AI Chats", "Advanced materials", "Test creation", "Study sessions"],
    popular: true,
  },
  {
    id: "premium",
    name: "Premium",
    price: "$29.99",
    yearlyPrice: "$299.99",
    features: ["Everything in Pro", "Priority support", "Advanced analytics", "Custom integrations"],
  },
];

const Register = () => {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("pro");
  const [isYearly, setIsYearly] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const passwordRequirements = [
    { text: "At least 12 characters", met: password.length >= 12 },
    { text: "Contains uppercase letter", met: /[A-Z]/.test(password) },
    { text: "Contains lowercase letter", met: /[a-z]/.test(password) },
    { text: "Contains number", met: /\d/.test(password) },
  ];

  const passwordsMatch = password && confirmPassword && password === confirmPassword;
  const allRequirementsMet = passwordRequirements.every(req => req.met);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (!allRequirementsMet) {
      toast.error("Please ensure all password requirements are met");
      setIsLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords don't match");
      setIsLoading(false);
      return;
    }

    if (!username || !email || !password) {
      toast.error("Please fill in all fields");
      setIsLoading(false);
      return;
    }

    try {
      const res = await axios.post("http://localhost:8000/auth/register", {
        username,
        email,
        password
      }, {
        withCredentials: true
      });
      await login();
      toast.success("Account created successfully!");

      if (selectedPlan !== "free") {
        try {
          const stripeRes = await axios.post("http://localhost:8000/payments/create-checkout-session", {
            plan: isYearly ? `${selectedPlan} - year` : selectedPlan,
          }, { withCredentials: true });

          const stripe  = await loadStripe("pk_test_51RksBt2fKuvpViwjchqQPPStdPHuvZ0JhK4pCYaSH9C3yZEZfyXWsQ4idXmkyKLEIfPPBbU3V52g1OU7DMkxqrEV00dW10lEVV");
          await stripe?.redirectToCheckout({
            sessionId: stripeRes.data.id
          });
        } catch (error: any) {
          console.error("Stripe checkout session error:", error);
          toast.error("Payment failed to start");
        }

        return;
      }

      navigate("/");
    } catch (err: any) {
      if (err.response?.status === 409) {
        toast.error("User already exists");
      } else if (err.response?.status === 422) {
        toast.error("Invalid email format");
      } else {
        toast.error("Registration failed");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-20 right-10 w-72 h-72 bg-green-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-60 left-20 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-40 right-1/4 w-80 h-80 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="py-12 px-4 sm:px-6 lg:px-8 relative">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <Brain className="h-12 w-12 text-primary mx-auto mb-4 opacity-0 animate-fade-in hover:scale-110 hover:rotate-12 transition-all duration-500" />
            <h1 className="min-h-[45px] text-4xl font-bold mb-4 opacity-0 animate-fade-in bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent dark:from-white dark:via-blue-300 dark:to-purple-300" style={{ animationDelay: '0.2s' }}>Create your LearnBot account</h1>
            <p className="text-muted-foreground opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>Choose a plan and get started today</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 items-center">
            {/* Plan Selection */}
            <div className="opacity-0 animate-fade-in" style={{ animationDelay: '0.6s' }}>
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-semibold">Choose your plan</h2>

                {/* Billing Toggle */}
                <div className="flex items-center gap-3">
                  <span className={`text-sm transition-all duration-300 ${!isYearly ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    Monthly
                  </span>
                  <Switch
                    checked={isYearly}
                    onCheckedChange={setIsYearly}
                    className="data-[state=checked]:bg-primary"
                  />
                  <span className={`text-sm transition-all duration-300 ${isYearly ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                    Yearly
                  </span>
                  {isYearly && (
                    <Badge variant="secondary" className="ml-1 text-xs animate-fade-in">
                      Save 17%
                    </Badge>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                {plans.map((plan, index) => (
                  <Card
                    key={plan.id}
                    className={`cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:rotate-1 bg-card/80 backdrop-blur-sm border shadow-lg group ${
                      selectedPlan === plan.id
                        ? "ring-2 ring-primary border-primary shadow-lg scale-105"
                        : "hover:shadow-md border-border"
                    }`}
                    onClick={() => setSelectedPlan(plan.id)}
                    style={{ animationDelay: `${0.8 + index * 0.1}s` }}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold group-hover:text-blue-600 transition-colors duration-300">{plan.name}</h3>
                          {plan.popular && (
                            <Badge variant="default" className="text-xs hover:scale-110 transition-transform duration-300">
                              Most Popular
                            </Badge>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-bold group-hover:scale-110 transition-transform duration-300 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                            {plan.id === "free" ? plan.price : (isYearly ? plan.yearlyPrice : plan.price)}
                          </span>
                          {plan.id !== "free" && (
                            <div className="text-xs text-muted-foreground">
                              /{isYearly ? "year" : "month"}
                            </div>
                          )}
                        </div>
                      </div>
                      <ul className="space-y-1">
                        {plan.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm group-hover:scale-105 transition-transform duration-300" style={{ transitionDelay: `${index * 0.05}s` }}>
                            <Check className="h-4 w-4 text-green-500 group-hover:scale-125 group-hover:rotate-12 transition-all duration-300" />
                            <span className="group-hover:text-gray-800 dark:group-hover:text-white transition-colors duration-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Registration Form */}
            <div className="flex items-center justify-center">
              <Card className="bg-card/80 backdrop-blur-sm border shadow-lg transition-all duration-500 opacity-0 animate-fade-in w-full" style={{ animationDelay: '1s' }}>
                <CardHeader className="pb-4">
                  <CardTitle className="group-hover:text-blue-600 transition-colors duration-300">Account Details</CardTitle>
                  <CardDescription>Enter your information to create your account</CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="username">Username</Label>
                      <Input
                        id="username"
                        type="text"
                        placeholder="Choose a username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        required
                        className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-300"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-300"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent hover:scale-110 transition-transform duration-300"
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </div>
                    {/* Password Requirements */}
                    {password && (
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Password Requirements:</Label>
                        <div className="space-y-1">
                          {passwordRequirements.map((requirement, index) => (
                            <div key={index} className={`flex items-center gap-2 text-sm ${requirement.met ? 'text-green-600' : 'text-gray-500'}`}>
                              {requirement.met ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
                              {requirement.text}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Confirm your password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-300"
                      />
                    {confirmPassword && (
                        <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                          {passwordsMatch ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                          {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                        </div>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full hover:scale-105 transition-all duration-300 shadow-lg dark:text-white hover:shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                      disabled={isLoading || !allRequirementsMet || !passwordsMatch}
                    >
                      {isLoading ? "Creating account..." : selectedPlan === "free" ? "Create Free Account" : `Create Account & Subscribe ${isYearly ? 'Yearly' : 'Monthly'}`}
                    </Button>
                  </form>
                  <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Already have an account?{" "}
                      <Link to="/login" className="text-primary hover:underline hover:scale-105 inline-block transition-all duration-300">
                        Sign in
                      </Link>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;