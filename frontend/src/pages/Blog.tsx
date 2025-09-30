import { useState } from "react";
import Navigation from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Calendar, Clock, Search, BookOpen, Brain, Target, Lightbulb, Users, Zap, ArrowRight } from "lucide-react";

// Import blog images
import spacedRepetitionImg from "@/assets/blog/spaced-repetition.jpg";
import activeRecallImg from "@/assets/blog/active-recall.jpg";
import studyEnvironmentImg from "@/assets/blog/study-environment.jpg";
import pomodoroImg from "@/assets/blog/pomodoro.jpg";
import studyGroupsImg from "@/assets/blog/study-groups.jpg";
import motivationImg from "@/assets/blog/motivation.jpg";

interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  date: string;
  readTime: string;
  category: string;
  tags: string[];
  icon: any;
  image: string;
}

const blogPosts: BlogPost[] = [
  {
    id: "1",
    title: "The Science of Spaced Repetition: Why Cramming Doesn't Work",
    excerpt: "Discover how spaced repetition can improve your memory retention by up to 200% and why timing is everything in learning.",
    content: `
      <p>Spaced repetition is one of the most powerful learning techniques backed by cognitive science. Unlike cramming, which provides short-term memorization, spaced repetition leverages the psychological spacing effect to move information from short-term to long-term memory.</p>

      <h3>How It Works</h3>
      <p>The technique involves reviewing information at increasing intervals:</p>
      <ul>
        <li>First review: 1 day after initial learning</li>
        <li>Second review: 3 days later</li>
        <li>Third review: 1 week later</li>
        <li>Fourth review: 2 weeks later</li>
        <li>Fifth review: 1 month later</li>
      </ul>

      <h3>The Science Behind It</h3>
      <p>Hermann Ebbinghaus discovered the "forgetting curve" - we lose 50% of new information within an hour if not reinforced. Spaced repetition fights this curve by strategically timing reviews just as you're about to forget.</p>

      <h3>Implementation Tips</h3>
      <p>1. Use flashcards with spaced repetition software<br/>
      2. Focus on your weak points more frequently<br/>
      3. Be consistent with your review schedule<br/>
      4. Don't skip sessions - consistency is key</p>
    `,
    author: "Dr. Sarah Chen",
    date: "2024-01-15",
    readTime: "5 min read",
    category: "Memory Techniques",
    tags: ["memory", "science", "study-methods"],
    icon: Brain,
    image: spacedRepetitionImg
  },
  {
    id: "2",
    title: "Active Recall: The Ultimate Study Strategy You're Not Using",
    excerpt: "Learn why testing yourself is 10x more effective than re-reading notes and how to implement active recall in your studies.",
    content: `
      <p>Active recall is the practice of retrieving information from memory without looking at the source material. It's one of the most effective study techniques, yet most students still rely on passive methods like re-reading.</p>

      <h3>Why It Works</h3>
      <p>When you force your brain to retrieve information, you strengthen the neural pathways associated with that knowledge. This makes the information more accessible in the future and improves your ability to apply it in different contexts.</p>

      <h3>Techniques for Active Recall</h3>
      <ul>
        <li><strong>Flashcards:</strong> Create questions on one side, answers on the other</li>
        <li><strong>Practice Testing:</strong> Take practice exams without notes</li>
        <li><strong>Feynman Technique:</strong> Explain concepts in simple terms</li>
        <li><strong>Mind Maps:</strong> Create visual representations from memory</li>
      </ul>

      <h3>Common Mistakes to Avoid</h3>
      <p>1. Looking at the answer too quickly<br/>
      2. Only testing easy material<br/>
      3. Not spacing out practice sessions<br/>
      4. Giving up when you can't remember</p>
    `,
    author: "Prof. Michael Rodriguez",
    date: "2024-01-12",
    readTime: "4 min read",
    category: "Study Techniques",
    tags: ["active-recall", "testing", "memory"],
    icon: Target,
    image: activeRecallImg
  },
  {
    id: "3",
    title: "Creating the Perfect Study Environment for Maximum Focus",
    excerpt: "Transform your study space into a productivity powerhouse with these evidence-based environmental design principles.",
    content: `
      <p>Your study environment plays a crucial role in your ability to focus, retain information, and maintain motivation. Small changes to your space can lead to significant improvements in learning outcomes.</p>

      <h3>The Fundamentals</h3>
      <ul>
        <li><strong>Lighting:</strong> Natural light is best, but bright, cool-toned LED lights work well too</li>
        <li><strong>Temperature:</strong> Keep it between 68-72°F (20-22°C) for optimal cognitive performance</li>
        <li><strong>Noise:</strong> Complete silence or consistent background noise (like white noise)</li>
        <li><strong>Cleanliness:</strong> A cluttered space leads to a cluttered mind</li>
      </ul>

      <h3>Advanced Optimization</h3>
      <p><strong>Color Psychology:</strong> Blue enhances focus and productivity, while green reduces eye strain during long study sessions.</p>

      <p><strong>Ergonomics:</strong> Your screen should be at eye level, feet flat on the floor, and back supported to prevent fatigue.</p>

      <p><strong>Digital Environment:</strong> Use website blockers during study time and organize your digital workspace as carefully as your physical one.</p>

      <h3>Creating Study Zones</h3>
      <p>Designate specific areas for different types of work: reading, writing, computer work, and review. This helps your brain associate each space with its intended activity.</p>
    `,
    author: "Emma Thompson",
    date: "2024-01-10",
    readTime: "6 min read",
    category: "Study Environment",
    tags: ["environment", "focus", "productivity"],
    icon: Lightbulb,
    image: studyEnvironmentImg
  },
  {
    id: "4",
    title: "The Pomodoro Technique: Mastering Time Management for Students",
    excerpt: "Boost your productivity and reduce burnout with this simple yet powerful time management technique used by millions worldwide.",
    content: `
      <p>The Pomodoro Technique, developed by Francesco Cirillo, is a time management method that breaks work into 25-minute focused intervals followed by short breaks. It's particularly effective for students dealing with procrastination and attention challenges.</p>

      <h3>How to Implement Pomodoros</h3>
      <ol>
        <li>Choose a task to work on</li>
        <li>Set a timer for 25 minutes</li>
        <li>Work on the task until the timer rings</li>
        <li>Take a 5-minute break</li>
        <li>Repeat 3 more times, then take a longer 15-30 minute break</li>
      </ol>

      <h3>Why 25 Minutes?</h3>
      <p>Research shows that most people can maintain intense focus for about 25 minutes before mental fatigue sets in. The short duration makes starting less intimidating while the breaks prevent burnout.</p>

      <h3>Adapting the Technique</h3>
      <p>While 25 minutes is standard, you can adjust based on your needs:</p>
      <ul>
        <li><strong>15 minutes:</strong> For very difficult or boring tasks</li>
        <li><strong>45 minutes:</strong> For deep, complex work when you're in flow</li>
        <li><strong>90 minutes:</strong> For creative work or when working with your natural ultradian rhythms</li>
      </ul>

      <h3>Common Pitfalls</h3>
      <p>Don't extend sessions when you're on a roll - the break is crucial for maintaining long-term productivity. Also, resist the urge to multitask during your focused intervals.</p>
    `,
    author: "James Wilson",
    date: "2024-01-08",
    readTime: "4 min read",
    category: "Time Management",
    tags: ["time-management", "productivity", "focus"],
    icon: Clock,
    image: pomodoroImg
  },
  {
    id: "5",
    title: "Building Effective Study Groups: Collaboration Strategies That Work",
    excerpt: "Harness the power of collaborative learning with proven strategies for organizing and maintaining productive study groups.",
    content: `
      <p>Study groups can be incredibly powerful when done right, but they can also become social hour if not properly structured. Here's how to build study groups that actually enhance learning.</p>

      <h3>Forming Your Group</h3>
      <ul>
        <li><strong>Size:</strong> 3-5 people is optimal - large enough for diverse perspectives, small enough for everyone to participate</li>
        <li><strong>Commitment Level:</strong> Choose members who are equally committed to the subject</li>
        <li><strong>Complementary Strengths:</strong> Mix different learning styles and subject strengths</li>
      </ul>

      <h3>Structure for Success</h3>
      <p><strong>Pre-Meeting Preparation:</strong> Everyone should study the material individually first. Group time is for clarification, not initial learning.</p>

      <p><strong>Meeting Structure:</strong></p>
      <ol>
        <li>Quick review of main concepts (10 minutes)</li>
        <li>Address questions and problem areas (30 minutes)</li>
        <li>Practice problems or quiz each other (15 minutes)</li>
        <li>Plan next meeting and assign prep work (5 minutes)</li>
      </ol>

      <h3>Effective Techniques</h3>
      <ul>
        <li><strong>Teaching Rotation:</strong> Each member teaches a concept to the group</li>
        <li><strong>Problem-Solving Sessions:</strong> Work through difficult problems together</li>
        <li><strong>Mock Exams:</strong> Create and take practice tests as a group</li>
        <li><strong>Peer Review:</strong> Review each other's work and provide feedback</li>
      </ul>

      <h3>Avoiding Common Traps</h3>
      <p>Set clear ground rules about staying on topic, equal participation, and handling conflicts. Designate a rotating facilitator to keep meetings focused.</p>
    `,
    author: "Dr. Lisa Park",
    date: "2024-01-05",
    readTime: "5 min read",
    category: "Collaborative Learning",
    tags: ["study-groups", "collaboration", "teamwork"],
    icon: Users,
    image: studyGroupsImg
  },
  {
    id: "6",
    title: "Motivation and Mindset: Overcoming Study Burnout",
    excerpt: "Discover psychological strategies to maintain motivation, overcome procrastination, and develop a growth mindset for lifelong learning.",
    content: `
      <p>Study burnout is real and can derail even the most dedicated students. Understanding the psychology behind motivation and developing the right mindset can help you push through difficult periods and maintain long-term academic success.</p>

      <h3>Recognizing Burnout Signs</h3>
      <ul>
        <li>Feeling overwhelmed by simple tasks</li>
        <li>Decreased concentration and memory</li>
        <li>Loss of motivation and interest</li>
        <li>Physical symptoms like headaches or fatigue</li>
        <li>Increased procrastination</li>
      </ul>

      <h3>The Growth Mindset Advantage</h3>
      <p>Carol Dweck's research shows that students with a growth mindset - believing intelligence can be developed - outperform those with a fixed mindset. Key strategies:</p>
      <ul>
        <li>Focus on the learning process, not just grades</li>
        <li>View challenges as opportunities to grow</li>
        <li>Learn from criticism and setbacks</li>
        <li>Celebrate progress, not just perfection</li>
      </ul>

      <h3>Motivation Strategies</h3>
      <p><strong>Goal Setting:</strong> Use SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) and break large goals into smaller milestones.</p>

      <p><strong>Reward Systems:</strong> Create both immediate rewards (after study sessions) and long-term rewards (after major milestones).</p>

      <p><strong>Accountability:</strong> Share your goals with friends, family, or study partners who can help keep you on track.</p>

      <h3>Recovery Strategies</h3>
      <p>When burnout hits, take it seriously. Reduce your workload temporarily, focus on self-care, and gradually rebuild your study routine. Remember: rest is productive.</p>
    `,
    author: "Dr. Amanda Foster",
    date: "2024-01-03",
    readTime: "6 min read",
    category: "Psychology",
    tags: ["motivation", "mindset", "burnout"],
    icon: Zap,
    image: motivationImg
  }
];

const categories = ["All", "Memory Techniques", "Study Techniques", "Study Environment", "Time Management", "Collaborative Learning", "Psychology"];

const Blog = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);

  const filteredPosts = blogPosts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory === "All" || post.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleBackToList = () => {
    setSelectedPost(null);
  };

  if (selectedPost) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8 max-w-5xl">
          <Button
            variant="ghost"
            onClick={handleBackToList}
            className="mb-6 hover:bg-accent"
          >
            ← Back to Blog
          </Button>

          <article className="bg-card rounded-xl border shadow-sm overflow-hidden">
            {/* Hero Image */}
            <div className="relative h-64 md:h-80 overflow-hidden">
              <img
                src={selectedPost.image}
                alt={selectedPost.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <Badge variant="secondary" className="mb-3 bg-background/90 backdrop-blur-sm">
                  {selectedPost.category}
                </Badge>
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
                  {selectedPost.title}
                </h1>
              </div>
            </div>

            {/* Article Content */}
            <div className="p-6 md:p-8">
              <div className="flex items-center gap-4 text-muted-foreground mb-8 pb-6 border-b">
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  {selectedPost.date}
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  {selectedPost.readTime}
                </div>
                <span>By <strong className="text-foreground">{selectedPost.author}</strong></span>
              </div>

              <div
                className="prose prose-lg max-w-none prose-headings:text-foreground prose-p:text-muted-foreground prose-strong:text-foreground prose-li:text-muted-foreground"
                dangerouslySetInnerHTML={{ __html: selectedPost.content }}
              />

              <Separator className="my-8" />

              <div className="flex flex-wrap gap-2">
                {selectedPost.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="hover:bg-accent transition-colors">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          </article>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <div className="text-center mb-16 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-primary/10 rounded-3xl -z-10" />
          <h1 className="text-5xl md:text-6xl font-bold mb-6 py-8 bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
            Learning Blog
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            Discover evidence-based study techniques, productivity tips, and strategies to maximize your learning potential.
            Transform your study habits with insights from education experts and cognitive scientists.
          </p>
        </div>

        {/* Search and Filter */}
        <div className="mb-12 space-y-6">
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Search articles..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-12 h-12 text-lg border-2 focus:border-primary transition-colors"
            />
          </div>

          <div className="flex flex-wrap justify-center gap-3">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="transition-all duration-200 hover:scale-105"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Blog Posts Grid */}
        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post, index) => {
            const IconComponent = post.icon;
            return (
              <Card
                key={post.id}
                className="group cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-2 overflow-hidden border-0 shadow-md bg-card"
                onClick={() => setSelectedPost(post)}
              >
                {/* Card Image */}
                <div className="relative h-48 overflow-hidden">
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                  <div className="absolute top-4 left-4">
                    <Badge variant="secondary" className="bg-background/90 backdrop-blur-sm">
                      {post.category}
                    </Badge>
                  </div>
                  <div className="absolute bottom-4 right-4">
                    <div className="p-2 bg-background/90 backdrop-blur-sm rounded-full">
                      <IconComponent className="h-5 w-5 text-primary" />
                    </div>
                  </div>
                </div>

                <CardHeader className="pb-3">
                  <CardTitle className="line-clamp-2 group-hover:text-primary transition-colors leading-tight">
                    {post.title}
                  </CardTitle>
                  <CardDescription className="line-clamp-3 leading-relaxed">
                    {post.excerpt}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {post.date}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {post.readTime}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mb-4">
                    {post.tags.slice(0, 3).map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs hover:bg-accent transition-colors">
                        #{tag}
                      </Badge>
                    ))}
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">By {post.author}</span>
                    <ArrowRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <div className="bg-muted/30 rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6">
              <BookOpen className="h-12 w-12 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-semibold mb-3">No articles found</h3>
            <p className="text-muted-foreground max-w-md mx-auto">
              Try adjusting your search terms or category filter to discover more learning resources.
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default Blog;