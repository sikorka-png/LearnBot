
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, BookOpen, FileText, BarChart3, Sparkles, Zap, Target, ArrowRight, Users, Trophy, Clock } from "lucide-react";
import Navigation from "@/components/Navigation";

const Index = () => {
  const features = [
    {
      icon: MessageSquare,
      title: "AI Chat Tutor",
      description: "Interactive conversations about your study materials with personalized explanations and instant feedback",
      color: "from-blue-500 to-purple-600"
    },
    {
      icon: BookOpen,
      title: "Smart Materials Manager",
      description: "Upload files, add links, and organize your knowledge base with AI-powered categorization",
      color: "from-green-500 to-teal-600"
    },
    {
      icon: FileText,
      title: "Intelligent Test Creator",
      description: "Generate custom tests with multiple question types, difficulty levels, and comprehensive analytics",
      color: "from-orange-500 to-red-600"
    },
    {
      icon: BarChart3,
      title: "Advanced Study Mode",
      description: "Track detailed progress, identify weak areas, and get AI-powered study recommendations",
      color: "from-purple-500 to-pink-600"
    }
  ];

  const benefits = [
    {
      icon: Sparkles,
      title: "AI-Powered Learning",
      description: "Advanced machine learning algorithms that adapt to your unique learning style and pace",
      stat: "Faster learning"
    },
    {
      icon: Zap,
      title: "Instant Feedback",
      description: "Get immediate responses, explanations, and corrections to accelerate your understanding",
      stat: "Real-time responses"
    },
    {
      icon: Target,
      title: "Personalized Experience",
      description: "Tailored content, difficulty levels, and study paths based on your progress and goals",
      stat: "100% customized"
    }
  ];

  const stats = [
    { icon: Users, value: "50K+", label: "Active Learners" },
    { icon: Trophy, value: "98%", label: "Success Rate" },
    { icon: Clock, value: "24/7", label: "AI Support" },
    { icon: BookOpen, value: "1M+", label: "Your Materials" }
  ];

  const testimonials = [
    {
      name: "Sarah Chen",
      role: "Medical Student",
      content: "LearnBot transformed my study routine. The AI explanations are incredibly detailed and helped me understand complex concepts.",
      rating: 5
    },
    {
      name: "Marcus Rodriguez",
      role: "Engineering Student",
      content: "The test creation feature is amazing. It generates questions that actually challenge me and help identify knowledge gaps.",
      rating: 5
    },
    {
      name: "Emily Watson",
      role: "Graduate Student",
      content: "Best learning platform I've used. The chat feature feels like having a personal tutor available 24/7, always ready to help.",
      rating: 5
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 overflow-hidden">
      <Navigation />
      
      <main>
        {/* Floating Background Elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-40 right-20 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-20 left-1/4 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Hero Section */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 via-purple-600/10 to-pink-600/10"></div>
          <div className="container mx-auto px-4 py-20 relative">
            <div className="text-center max-w-4xl mx-auto">
              <div className="inline-flex items-center gap-2 bg-badge-bg border border-badge-border px-6 py-3 rounded-full text-sm font-medium text-badge-text mb-8 opacity-0 animate-fade-in hover:scale-105 transition-all duration-300">
                <Sparkles className="h-4 w-4 animate-pulse" />
                Next-Generation AI Learning Assistant
              </div>
              
              <h1 className="text-5xl md:text-7xl font-extrabold mb-8 opacity-0 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <span className="min-h-[90px] bg-gradient-to-r from-hero-primary via-hero-secondary to-hero-accent bg-clip-text text-transparent hover:scale-105 inline-block transition-transform duration-300">
                  Master Any Subject
                </span>
                <br />
                <span className="bg-gradient-to-r from-hero-secondary to-hero-accent bg-clip-text text-transparent hover:scale-105 inline-block transition-transform duration-300">
                  with AI Power
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 opacity-0 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                Upload your materials, chat with advanced AI, create personalized tests, and track your progress. 
                The complete learning ecosystem that evolves with you.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center opacity-0 animate-fade-in" style={{ animationDelay: '0.6s' }}>
                <Button asChild size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-lg px-8 py-4 h-auto group hover:scale-105 transition-all duration-300 shadow-lg hover:shadow-xl">
                  <Link to="/register" className="flex items-center gap-2">
                    Start Learning Free
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="text-lg px-8 py-4 h-auto border-2 hover:bg-accent hover:scale-105 transition-all duration-300">
                  <Link to="#demo">Watch Demo</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16 bg-card/50 backdrop-blur-sm border-y shadow-sm">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat, index) => (
                <div key={index} className="text-center group opacity-0 animate-fade-in" style={{ animationDelay: `${0.8 + index * 0.1}s` }}>
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-4 mx-auto mb-4 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-lg group-hover:shadow-xl">
                    <stat.icon className="h-8 w-8 text-white" />
                  </div>
                  <div className="text-3xl font-bold text-foreground mb-2 group-hover:text-blue-600 transition-colors duration-300">{stat.value}</div>
                  <div className="text-muted-foreground group-hover:text-foreground transition-colors duration-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 opacity-0 animate-fade-in" style={{ animationDelay: '1.2s' }}>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Everything You Need to <span className="text-blue-600 hover:text-purple-600 transition-colors duration-300">Excel</span>
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Powerful AI-driven tools designed to make learning more effective, engaging, and personalized
              </p>
            </div>
            
            <div className="grid md:grid-cols-2 gap-8">
              {features.map((feature, index) => (
                <Card key={index} className="group hover:shadow-2xl transition-all duration-500 bg-card/80 backdrop-blur-sm border shadow-lg hover:-translate-y-4 hover:rotate-1 opacity-0 animate-fade-in" style={{ animationDelay: `${1.4 + index * 0.2}s` }}>
                  <CardHeader className="pb-4">
                    <div className={`w-14 h-14 rounded-2xl bg-gradient-to-r ${feature.color} p-4 mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-lg`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <CardTitle className="text-2xl mb-3 group-hover:text-blue-600 transition-colors duration-300">{feature.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed group-hover:text-foreground transition-colors duration-300">{feature.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="py-16 bg-card/50 backdrop-blur-sm border-y shadow-sm">
          <div className="container mx-auto px-4 relative">
            <div className="text-center mb-16 opacity-0 animate-fade-in" style={{ animationDelay: '2.2s' }}>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Why Choose <span className="bg-gradient-to-r from-hero-primary via-hero-secondary to-hero-accent bg-clip-text text-transparent hover:scale-105 inline-block transition-transform duration-300">LearnBot</span>?
              </h2>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Experience the future of learning with cutting-edge AI technology
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {benefits.map((benefit, index) => (
                <div key={index} className="text-center group opacity-0 animate-fade-in" style={{ animationDelay: `${2.4 + index * 0.2}s` }}>
                  <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full p-5 mx-auto mb-6 group-hover:scale-125 group-hover:rotate-12 transition-all duration-500 shadow-lg group-hover:shadow-2xl">
                    <benefit.icon className="h-10 w-10 text-white" />
                  </div>
                  <div className="text-2xl font-bold bg-gradient-to-r from-hero-secondary to-hero-accent bg-clip-text text-transparent mb-2 hover:scale-105 inline-block transition-transform duration-300">{benefit.stat}</div>
                  <h3 className="text-xl font-semibold mb-4">{benefit.title}</h3>
                  <p className="text-muted-foreground leading-relaxed group-hover:text-foreground transition-colors duration-300">{benefit.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section */}
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16 opacity-0 animate-fade-in" style={{ animationDelay: '3s' }}>
              <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
                Loved by <span className="text-green-600 hover:text-blue-600 transition-colors duration-300">Students</span> Worldwide
              </h2>
              <p className="text-xl text-muted-foreground">See what our learners are saying about their experience</p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <Card key={index} className="bg-card/80 backdrop-blur-sm border shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 hover:rotate-1 opacity-0 animate-fade-in group" style={{ animationDelay: `${3.2 + index * 0.2}s` }}>
                  <CardContent className="p-6">
                    <div className="flex mb-4">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Sparkles key={i} className="h-5 w-5 text-yellow-400 fill-current group-hover:scale-110 transition-transform duration-300" style={{ animationDelay: `${i * 0.1}s` }} />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 italic group-hover:text-foreground transition-colors duration-300">"{testimonial.content}"</p>
                    <div>
                      <div className="font-semibold text-foreground group-hover:text-blue-600 transition-colors duration-300">{testimonial.name}</div>
                      <div className="text-sm text-muted-foreground group-hover:text-foreground transition-colors duration-300">{testimonial.role}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 relative overflow-hidden">
          <div className="absolute inset-0 bg-black/10 dark:bg-black/50"></div>
          <div className="absolute inset-0">
            <div className="absolute top-10 left-10 w-32 h-32 bg-white/10 rounded-full blur-xl animate-pulse"></div>
            <div className="absolute bottom-10 right-10 w-40 h-40 bg-white/10 rounded-full blur-xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
          <div className="container mx-auto px-4 relative">
            <div className="text-center text-white max-w-4xl mx-auto opacity-0 animate-fade-in" style={{ animationDelay: '3.8s' }}>
              <h2 className="text-4xl md:text-6xl font-bold mb-6 hover:scale-105 transition-transform duration-300">
                Ready to Transform Your Learning Journey?
              </h2>
              <p className="text-xl md:text-2xl mb-8 opacity-90">
                Join thousands of successful learners who've already discovered the power of AI-assisted education
              </p>
              <div className="flex flex-col sm:flex-row gap-6 justify-center">
                <Button asChild size="lg" className="bg-white text-foreground dark:text-black hover:bg-gray-100 text-lg px-8 py-4 h-auto hover:scale-110 transition-all duration-300 shadow-lg hover:shadow-xl">
                  <Link to="/register">Start For Free</Link>
                </Button>
                <Button asChild size="lg" variant="outline" className="text-lg px-8 py-4 h-auto text-foreground dark:text-white hover:scale-110 transition-all duration-300">
                  <Link to="/pricing">View Pricing</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Index;
