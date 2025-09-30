import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, MessageSquare, BookOpen, BarChart3, Brain, User, CreditCard, Clock, NotebookPen, Calculator, Mail, FileText } from "lucide-react";

const Navigation = () => {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const navItems = [
    { href: "/chat", icon: MessageSquare, label: "Chat" },
    { href: "/materials", icon: BookOpen, label: "Materials" },
    { href: "/exam-mode", icon: Clock, label: "Exam Mode" },
    { href: "/study-mode", icon: Brain, label: "Study Mode" },
    { href: "/notes", icon: NotebookPen, label: "Notes" },
    { href: "/blog", icon: FileText, label: "Blog" },
  ];

  const NavLink = ({ href, icon: Icon, label, mobile = false }) => {
    const isActive = location.pathname === href;
    const baseClasses = mobile 
      ? "flex items-center gap-3 px-3 py-2 rounded-lg transition-colors"
      : "flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm font-medium";
    
    const activeClasses = isActive 
      ? "bg-primary text-primary-foreground" 
      : "hover:bg-accent hover:text-accent-foreground";

    return (
      <Link 
        to={href} 
        className={`${baseClasses} ${activeClasses}`}
        onClick={() => mobile && setIsOpen(false)}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    );
  };

  const isAccountActive = location.pathname === "/account";

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl">
            <Brain className="h-6 w-6 text-primary" />
            LearnBot
          </Link>

          {/* Desktop Navigation - now hidden on lg and below instead of md */}
          <div className="hidden lg:flex items-center gap-2">
            {isAuthenticated ? (
              <>
                {navItems.map((item) => (
                  <NavLink key={item.href} {...item} />
                ))}
                <Link to="/account">
                  <Button
                    variant={isAccountActive ? "default" : "ghost"}
                    size="sm"
                    className="gap-2"
                  >
                    <User className="h-4 w-4" />
                    Account
                  </Button>
                </Link>
              </>
            ) : (
              <>
                <Link to="/pricing">
                  <Button variant="ghost" className="gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pricing
                  </Button>
                </Link>
                <Link to="/contact">
                  <Button variant="ghost" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Contact
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="ghost">Sign In</Button>
                </Link>
                <Link to="/register">
                  <Button>Get Started</Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation - now shows on lg and below instead of md */}
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild className="lg:hidden">
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-2 mt-6">
                {isAuthenticated ? (
                  <>
                    {navItems.map((item) => (
                      <NavLink key={item.href} {...item} mobile />
                    ))}
                    <Link to="/account" onClick={() => setIsOpen(false)}>
                      <Button
                        variant={isAccountActive ? "default" : "ghost"}
                        className="w-full justify-start gap-2"
                      >
                        <User className="h-4 w-4" />
                        Account
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/pricing" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2">
                        <CreditCard className="h-4 w-4" />
                        Pricing
                        </Button>
                    </Link>
                    <Link to="/contact" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-2">
                        <Mail className="h-4 w-4" />
                        Contact
                      </Button>
                    </Link>
                    <Link to="/login" onClick={() => setIsOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start">
                        Sign In
                      </Button>
                    </Link>
                    <Link to="/register" onClick={() => setIsOpen(false)}>
                      <Button className="w-full justify-start">
                        Get Started
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
