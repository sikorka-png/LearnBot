import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { User, CreditCard, Settings, LogOut, Eye, EyeOff, Moon, Sun, X, Loader2, Mail, MessageSquare, Bug, Check } from "lucide-react";
import { toast } from "sonner";
import { useTheme } from "next-themes";
import Navigation from "@/components/Navigation";
import { useAuth } from "@/context/AuthContext";

interface Plan {
  name: string;
  current_period_end: string;
  canceled_at: string;
  next_plan: string;
}

const Account = () => {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [oldName, setOldName] = useState("");
  const [newName, setNewName] = useState("");
  const [email, setEmail] = useState("");
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Plan | null>(null);
  const [planEndDate, setPlanEndDate] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  const [cardLast4, setCardLast4] = useState<string | null>(null);

  const passwordRequirements = [
    { text: "At least 12 characters", met: newPassword.length >= 12 },
    { text: "Contains uppercase letter", met: /[A-Z]/.test(newPassword) },
    { text: "Contains lowercase letter", met: /[a-z]/.test(newPassword) },
    { text: "Contains number", met: /\d/.test(newPassword) },
  ];

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const allRequirementsMet = passwordRequirements.every(req => req.met);

  const wantsPasswordChange = oldPassword || newPassword || confirmPassword;
  const canSave = (oldName !== newName) || (wantsPasswordChange && allRequirementsMet && passwordsMatch);
  const [usageLimits, setUsageLimits] = useState<Record<string, { current: number; limit: number }>>({});
  const [loadingLimits, setLoadingLimits] = useState(true);

  useEffect(() => {
    axios.get("http://localhost:8000/user", {
      withCredentials: true
    })
    .then(res => {
      setOldName(res.data.username);
      setNewName(res.data.username);
      setEmail(res.data.email);
    })
    .catch(err => {
      toast.error("Failed to load user data");
    });
  }, []);

  useEffect(() => {
    axios.get("http://localhost:8000/user/subscription/current", {
      withCredentials: true
    })
    .then(res => {
      const capitalizedName = res.data.name
        ? res.data.name.charAt(0).toUpperCase() + res.data.name.slice(1)
        : "";

      setCurrentPlan({
        name: capitalizedName,
        current_period_end: res.data.current_period_end,
        canceled_at: res.data.canceled_at,
        next_plan: res.data.next_plan
      });

      if (res.data.name === "free") {
        setPlanEndDate("Lifetime");
      } else if (res.data.current_period_end) {
        const formatted = new Date(res.data.current_period_end).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
        setPlanEndDate(formatted);
      }
    })
    .catch(err => {
      toast.error("Failed to load subscription data");
    });
  }, []);

  useEffect(() => {
    const fetchUsageLimits = async () => {
      setLoadingLimits(true);
      try {
        const res = await axios.get("http://localhost:8000/user/limits", {
          withCredentials: true,
        });
        setUsageLimits(res.data);
      } catch (err) {
        toast.error("Failed to load usage limits");
      } finally {
        setLoadingLimits(false);
      }
    };
    fetchUsageLimits();
  }, []);

  useEffect(() => {
    const fetchCard = async () => {
      try {
        const res = await axios.get("http://localhost:8000/payments/method", {
          withCredentials: true,
        });
        setCardLast4(res.data.last4);
      } catch (err) {
        toast.error("Failed to load card info");
      }
    };
    fetchCard();
  }, []);

  const handleLogout = async () => {
    await logout();
    toast.success("Logged out successfully");
    navigate("/");
  };

  const handleCancelPlan = async () => {
    setIsCancelling(true);
    try {
      const res = await axios.post("http://localhost:8000/payments/cancel-subscription", {}, {
        withCredentials: true
      });

      toast.success(res.data.message);

      const updated = await axios.get("http://localhost:8000/user/subscription/current", {
        withCredentials: true
      });

      const capitalizedName = updated.data.name
        ? updated.data.name.charAt(0).toUpperCase() + updated.data.name.slice(1)
        : "";

      setCurrentPlan({
        name: capitalizedName,
        current_period_end: updated.data.current_period_end,
        canceled_at: updated.data.canceled_at,
        next_plan: updated.data.next_plan
      });

      if (updated.data.name === "free") {
        setPlanEndDate("Lifetime");
      } else {
        const formatted = new Date(updated.data.current_period_end).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric"
        });
        setPlanEndDate(formatted);
      }

    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to cancel subscription");
    } finally {
      setIsCancelling(false);
    }
  };

  const handleSaveProfile = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Passwords don't match");
      return;
    }

    try {
      await axios.patch("http://localhost:8000/user/update", {
        username: newName,
        old_password: oldPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      }, {
        withCredentials: true
      });

      setOldPassword("");
      setNewPassword("");
      setConfirmPassword("");

      toast.success("Profile updated successfully");
    } catch (err) {
      toast.error("Failed to update profile");
    }
  };

  const toggleOldPasswordVisibility = () => {
    setShowOldPassword(!showOldPassword);
  };

  const toggleNewPasswordVisibility = () => {
    setShowNewPassword(!showNewPassword);
  };

  const handlePasswordReset = () => {
    setShowResetDialog(false);
    toast.success("Password reset email sent!");
  };

  const toggleDarkMode = () => {
    const newTheme = theme === "dark" ? "light" : "dark";
    setTheme(newTheme);
    toast.success(`Switched to ${newTheme} mode`);
  };

  const planDetails = {
    basic: { name: "Basic", price: "$9.99/month" },
    pro: { name: "Pro", price: "$19.99/month" },
    premium: { name: "Premium", price: "$29.99/month" },
  };

  const handleChangeCard = async () => {
    try {
      const response = await axios.get("http://localhost:8000/payments/portal-session",
        { withCredentials: true }
      );
      window.location.href = response.data.url;
    } catch (error) {
        toast.error("Failed to open portal session");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Account Settings</h1>
              <p className="text-muted-foreground">Manage your account and subscription</p>
            </div>
            <Button variant="outline" onClick={handleLogout} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </div>

          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                Profile
              </TabsTrigger>
              <TabsTrigger value="subscription" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Subscription
              </TabsTrigger>
              <TabsTrigger value="preferences" className="gap-2">
                <Settings className="h-4 w-4" />
                Preferences
              </TabsTrigger>
            </TabsList>

            <TabsContent value="profile">
              <Card className="bg-card/80 backdrop-blur-sm border">
                <CardHeader>
                  <CardTitle>Profile Information</CardTitle>
                  <CardDescription>
                    Update your personal information and account details
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      placeholder="Enter your email"
                      type="email"
                      value={email}
                      disabled
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      placeholder="Enter your full name"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="oldPassword">Old Password</Label>
                    <div className="relative">
                      <Input
                        id="oldPassword"
                        type={showOldPassword ? "text" : "password"}
                        value={oldPassword}
                        onChange={(e) => setOldPassword(e.target.value)}
                        placeholder="Enter your current password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={toggleOldPasswordVisibility}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showOldPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowResetDialog(true)}
                      className="text-sm text-primary hover:underline"
                    >
                      Don't remember current password?
                    </button>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newPassword">New Password</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Enter your new password"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={toggleNewPasswordVisibility}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  {/* Password Requirements */}
                    {newPassword && (
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
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Confirm your new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`${confirmPassword && !passwordsMatch ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                    />
                    {confirmPassword && (
                      <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                        {passwordsMatch ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                        {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                      </div>
                    )}
                  </div>
                  <Button
                    onClick={handleSaveProfile}
                    disabled={!canSave}
                  >
                    Save Changes
                  </Button>
                </CardContent>
              </Card>

              {/* Password Reset Dialog */}
              <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Password</AlertDialogTitle>
                    <AlertDialogDescription>
                      We'll send a password reset link to your email address.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handlePasswordReset}>
                      Send Reset Email
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>

            <TabsContent value="subscription">
              <div className="space-y-6">
                <Card className="bg-card/80 backdrop-blur-sm border">
                  <CardHeader>
                    <CardTitle>Current Plan</CardTitle>
                    <CardDescription>
                      Manage your subscription and billing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
{/*                           {planDetails[currentPlan as keyof typeof planDetails]?.name} */}
                          {currentPlan?.name || "Loading..."}
                          <Badge variant="default">Active</Badge>
                        </h3>
{/*                         <p className="text-muted-foreground"> */}
{/*                           {planDetails[currentPlan as keyof typeof planDetails]?.price} */}
{/*                         </p> */}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => navigate("/pricing")}
                        >
                          Change Plan
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              className="text-muted-foreground hover:text-destructive text-xs border border-border/50"
                              disabled={currentPlan?.name === "Free"}
                            >
                              {isCancelling && <Loader2 className="h-4 w-4 animate-spin" />}
                              {isCancelling ? "Cancelling..." : "Cancel"}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancel Subscription</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to cancel your subscription? You'll lose access to premium features at the end of your billing period.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Keep Subscription</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={handleCancelPlan}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90 gap-2"
                                disabled={currentPlan?.name === "Free" || isCancelling}
                              >
                                Cancel
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        {currentPlan?.canceled_at ? (
                          currentPlan?.next_plan ? (
                            <>
                              Plan cancellation date: {planEndDate}
                              <br />
                              Next plan: {currentPlan.next_plan}
                            </>
                          ) : (
                            <>Plan cancellation date: {planEndDate}</>
                          )
                        ) : (
                          <>Next billing date: {planEndDate || "Lifetime"}</>
                        )}
                      </p>
                      {cardLast4 && (
                        <div className="flex items-center justify-between">
                          <p>Payment method: •••• •••• •••• {cardLast4}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleChangeCard}
                            className="text-xs h-6 px-2"
                          >
                            Edit Payment
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-card/80 backdrop-blur-sm border">
                  <CardHeader>
                    <CardTitle>Current Limits</CardTitle>
                    <CardDescription>
                      Your usage limits for the current billing period
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {loadingLimits ? (
                        <div className="text-center text-muted-foreground">Loading usage limits...</div>
                      ) : usageLimits && Object.entries(usageLimits).length > 0 ? (
                        Object.entries(usageLimits).map(([name, data]) => (
                          <div key={name} className="space-y-2">
                            <div className="flex justify-between items-center">
                              <Label className="text-sm font-medium">{name}</Label>
                              <span className="text-sm text-muted-foreground">
                                {data.current}{data.limit === -1 ? ' / ∞' : ` / ${data.limit}`}
                                {name === "Storage" && " GB"}
                              </span>
                            </div>
                            <Progress
                              value={data.limit === -1 ? 0 : (data.current / data.limit) * 100}
                              className="h-2"
                            />
                          </div>
                        ))
                      ) : (
                        <div className="text-center text-muted-foreground">No usage limits found</div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="preferences">
              <Card className="bg-card/80 backdrop-blur-sm border">
                <CardHeader>
                  <CardTitle>Preferences</CardTitle>
                  <CardDescription>
                    Customize your LearnBot experience
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {theme === "dark" ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                      <div>
                        <Label>Dark Mode</Label>
                        <p className="text-sm text-muted-foreground">
                          Switch between light and dark themes
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={theme === "dark"}
                      onCheckedChange={toggleDarkMode}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-card/80 backdrop-blur-sm border mt-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Need Help?
                  </CardTitle>
                  <CardDescription>
                    Have a bug, cool idea, or want to contact us?
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    We'd love to hear from you! Whether you've found a bug, have a feature request, or just want to get in touch.
                  </p>
                  <Button
                    onClick={() => navigate("/contact")}
                    className="w-full gap-2"
                  >
                    <MessageSquare className="h-4 w-4" />
                    Contact Us
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Account;
