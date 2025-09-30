import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Brain, Eye, EyeOff, Check, X } from "lucide-react";
import { toast } from "sonner";
import Navigation from "@/components/Navigation";

const NewPassword = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isTokenValid, setIsTokenValid] = useState<boolean | null>(null);
  const [emailMask, setEmailMask] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setIsTokenValid(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const { data } = await axios.get("http://localhost:8000/password/verify", { params: { token } });
        if (!cancelled) {
          setIsTokenValid(!!data?.ok);
          setEmailMask(data?.email_mask ?? null);
        }
      } catch {
        if (!cancelled) setIsTokenValid(false);
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  // Get token from URL parameters
  const token = searchParams.get("token");

  const passwordRequirements = [
    { text: "At least 8 characters", met: newPassword.length >= 8 },
    { text: "Contains uppercase letter", met: /[A-Z]/.test(newPassword) },
    { text: "Contains lowercase letter", met: /[a-z]/.test(newPassword) },
    { text: "Contains number", met: /\d/.test(newPassword) },
  ];

  const passwordsMatch = newPassword && confirmPassword && newPassword === confirmPassword;
  const allRequirementsMet = passwordRequirements.every(req => req.met);
  const canSubmit = allRequirementsMet && passwordsMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      toast.error("Invalid reset link");
      return;
    }
    if (!canSubmit) {
      toast.error("Please ensure all requirements are met");
      return;
    }
    setIsLoading(true);
    try {
      await axios.post("http://localhost:8000/auth/password/reset", {
        token,
        new_password: newPassword
      });
      toast.success("Password updated successfully!");
      navigate("/login");
    } catch (err: any) {
      if (err.response?.status === 400) {
        toast.error("Invalid or expired reset link");
      } else {
        toast.error("Server error. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // If no token, show error
  if (!token || !isTokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50">
        <Navigation />
        <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative min-h-[calc(100vh-4rem)]">
          <Card className="w-full max-w-md bg-white/90 backdrop-blur">
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <Brain className="h-12 w-12 text-destructive" />
              </div>
              <CardTitle className="text-2xl text-destructive">Invalid Link</CardTitle>
              <CardDescription>This password reset link is invalid or has expired.</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  if (isTokenValid === null) {
    return (
      <div className="min-h-screen ...">
        <Navigation />
        <div className="flex items-center justify-center p-12">
          <Card className="w-full max-w-md bg-white/90 backdrop-blur">
            <CardHeader className="text-center">
              <CardTitle>Verifying reset link...</CardTitle>
              <CardDescription>Please wait</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 overflow-hidden">
      <Navigation />

      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative min-h-[calc(100vh-4rem)]">
        <Card className="w-full max-w-md bg-white/90 backdrop-blur hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 opacity-0 animate-fade-in">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <Brain className="h-12 w-12 text-primary hover:scale-110 hover:rotate-12 transition-all duration-500" />
            </div>
            <CardTitle className="text-2xl bg-gradient-to-r from-gray-900 via-blue-800 to-purple-800 bg-clip-text text-transparent">Set New Password</CardTitle>
            <CardDescription className="hover:text-gray-700 transition-colors duration-300">Create a strong password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="Enter your new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-300"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent hover:scale-110 transition-transform duration-300"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="hover:border-blue-400 focus:border-blue-500 transition-colors duration-300"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent hover:scale-110 transition-transform duration-300"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {confirmPassword && (
                  <div className={`flex items-center gap-2 text-sm ${passwordsMatch ? 'text-green-600' : 'text-red-600'}`}>
                    {passwordsMatch ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    {passwordsMatch ? 'Passwords match' : 'Passwords do not match'}
                  </div>
                )}
              </div>

              {/* Password Requirements */}
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

              <Button
                type="submit"
                className="w-full hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isLoading || !canSubmit}
              >
                {isLoading ? "Updating Password..." : "Update Password"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NewPassword;