import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Brain, BookOpen, MessageSquare, Target, Lightbulb, Send, X, Check, Loader2, HelpCircle } from "lucide-react";
import { toast } from "sonner";
interface StudyMaterial {
  id: string;
  title: string;
  content: string;
  type: "concept" | "example" | "exercise";
  hint?: string;
}
interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}
interface FocusedStudyProps {
  topic: string;
  duration: number;
  resources: any[];
  onComplete: () => void;
  onCancel: () => void;
}
const FocusedStudy = ({
  topic,
  duration,
  resources,
  onComplete,
  onCancel
}: FocusedStudyProps) => {
  const [currentSection, setCurrentSection] = useState(0);
  const [notes, setNotes] = useState("");
  const [understanding, setUnderstanding] = useState<number>(0);

  const [exerciseAnswer, setExerciseAnswer] = useState("");
  const [isCheckingAnswer, setIsCheckingAnswer] = useState(false);
  const [aiReview, setAiReview] = useState("");
  const [hasSubmittedAnswer, setHasSubmittedAnswer] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hint, setHint] = useState("");

  // AI Chat state
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isChatLoading, setIsChatLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  // mapowanie backend -> sekcje FocusedStudy
  const toStudyMaterial = (r: any, idx: number): StudyMaterial => {
    const t = String(r?.type || "").toLowerCase();
    if (t === "key_concept") {
      return {
        id: String(r?.id ?? idx),
        title: String(r?.concept_title ?? "Key Concept"),
        content: String(r?.concept_explanation ?? JSON.stringify(r, null, 2)),
        type: "concept",
      };
    }
    if (t === "practice_problem") {
      const base = `${r?.problem_description ?? ""}${r?.hint ? `\n\nHint: ${r.hint}` : ""}`;
      return {
        id: String(r?.id ?? idx),
        title: String(r?.problem_title ?? "Practice Problem"),
        content: String(r?.problem_description ?? JSON.stringify(r, null, 2)),
        type: "exercise",
        hint: r?.hint || "",
      };
    }
    // fallback
    return {
      id: String(r?.id ?? idx),
      title: String(r?.title ?? r?.type ?? `Resource ${idx + 1}`),
      content: typeof r?.content === "string" && r.content.trim()
        ? r.content
        : JSON.stringify(r, null, 2),
      type: "concept",
    };
  };

  const studyMaterials: StudyMaterial[] = (resources ?? []).map(toStudyMaterial);

  const currentMaterial = studyMaterials[currentSection];
  const progressPercentage = (studyMaterials.length - currentSection - 1) / studyMaterials.length * 100;
  const nextSection = () => {
    if (currentSection < studyMaterials.length - 1) {
      setCurrentSection(prev => prev + 1);
      setExerciseAnswer("");
      setAiReview("");
      setHasSubmittedAnswer(false);
      setShowHint(false);
      setHint("");
      toast.success("Moving to next section");
    } else {
      onComplete();
    }
  };
  const previousSection = () => {
    if (currentSection > 0) {
      setCurrentSection(prev => prev - 1);
      setExerciseAnswer("");
      setAiReview("");
      setHasSubmittedAnswer(false);
      setShowHint(false);
      setHint("");
    }
  };
  const getTypeIcon = (type: string) => {
    switch (type) {
      case "concept":
        return <Brain className="h-5 w-5 text-blue-500" />;
      case "example":
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case "exercise":
        return <Target className="h-5 w-5 text-green-500" />;
      default:
        return <BookOpen className="h-5 w-5" />;
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case "concept":
        return "text-blue-600 bg-blue-100";
      case "example":
        return "text-yellow-600 bg-yellow-100";
      case "exercise":
        return "text-green-600 bg-green-100";
      default:
        return "text-gray-600 bg-gray-100";
    }
  };

  // AI Chat functions
  const openChat = () => {
    setChatMessages([{
      id: "1",
      content: `Hi! I'm here to help you with your study session on "${topic}". You're currently on section ${currentSection + 1}: ${currentMaterial.title}. What would you like to know or discuss?`,
      role: "assistant",
      timestamp: new Date()
    }]);
    setChatOpen(true);
  };
  const closeChat = () => {
    setChatOpen(false);
    setChatMessages([]);
    setChatInput("");
  };
  const sendChatMessage = async () => {
    if (!chatInput.trim()) return;
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: chatInput,
      role: "user",
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput("");
    setIsChatLoading(true);

    // Mock AI response (replace with actual AI API call)
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: `Great question about ${topic}! Let me help you understand this better:

**Key Points:**
• This relates to the ${currentMaterial.type} section you're studying
• Understanding this concept is crucial for mastering ${topic}
• Here's a practical way to think about it...

**Study Tip:**
Try connecting this to your notes and the examples you've seen. This will help reinforce your understanding.

Would you like me to provide a specific example or explain any particular aspect in more detail?`,
        role: "assistant",
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, aiResponse]);
      setIsChatLoading(false);
    }, 1500);
  };
  const handleChatKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendChatMessage();
    }
  };

  // Exercise handling
  const handleCheckAnswer = async () => {
    if (!exerciseAnswer.trim()) return;

    setIsCheckingAnswer(true);
    setHasSubmittedAnswer(true);

    // Mock AI review (replace with actual AI API call)
    setTimeout(() => {
      const review = `**Great work!** I've reviewed your answer and here's my feedback:

**What you did well:**
• You demonstrated a clear understanding of the core concepts
• Your approach to the problem was logical and well-structured
• You showed good analytical thinking

**Areas for improvement:**
• Consider exploring alternative approaches to deepen your understanding
• Try to connect this solution to related concepts we've covered

**Overall Assessment:** Your answer shows solid comprehension of ${topic}. Keep up the excellent work! This type of problem-solving will serve you well as you continue learning.`;

      setAiReview(review);
      setIsCheckingAnswer(false);
      toast.success("Answer reviewed!");
    }, 2000);
  };

  const handleShowHint = () => {
    // użyj hintu z bieżącej sekcji; fallback gdyby go nie było
    const currentHint =
      (currentMaterial as StudyMaterial)?.hint &&
      String((currentMaterial as StudyMaterial).hint).trim()
        ? String((currentMaterial as StudyMaterial).hint)
        : `No hint provided for this exercise. Try breaking the task into steps and
  linking it to the key concepts from earlier sections.`;

    setHint(currentHint);
    setShowHint(true);
    toast.success("Hint revealed!");
  };

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [chatMessages]);
  return <div className="space-y-6">
      {/* Session Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            {getTypeIcon(currentMaterial.type)}
            <Badge className={getTypeColor(currentMaterial.type)}>
              {currentMaterial.type}
            </Badge>
          </div>
          <span className="text-sm text-muted-foreground">
            Section {currentSection + 1} of {studyMaterials.length}
          </span>
        </div>

      </div>

      <Progress value={progressPercentage} className="h-2" />

      {currentMaterial.type === "exercise" ? (
        // Special layout for exercises - single column
        <div className="max-w-4xl mx-auto">
          <Card className="bg-white/90 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  {getTypeIcon(currentMaterial.type)}
                  {currentMaterial.title}
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShowHint}
                  disabled={isCheckingAnswer}
                >
                  <HelpCircle className="h-4 w-4 mr-2" />
                  Hint
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Exercise content */}
              <div className="prose prose-sm max-w-none">
                {currentMaterial.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-3 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>

              {/* Hint display */}
              {showHint && hint && (
                <Card className="border-l-4 border-l-yellow-500">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <HelpCircle className="h-4 w-4" />
                      Hint
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {hint.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-2 text-sm leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Answer input field */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Answer:</label>
                <Textarea
                  value={exerciseAnswer}
                  onChange={(e) => setExerciseAnswer(e.target.value)}
                  placeholder="Write your solution here..."
                  className="min-h-[150px] resize-none"
                  disabled={isCheckingAnswer}
                />
              </div>

              {/* Submit button */}
              <Button
                onClick={handleCheckAnswer}
                disabled={!exerciseAnswer.trim() || isCheckingAnswer}
                className="w-full"
              >
                {isCheckingAnswer ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking Answer...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Check Answer
                  </>
                )}
              </Button>

              {/* AI Review */}
              {aiReview && (
                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Brain className="h-4 w-4" />
                      AI Review
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="prose prose-sm max-w-none">
                      {aiReview.split('\n').map((paragraph, index) => (
                        <p key={index} className="mb-2 text-sm leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        // Default layout for concepts and examples - two columns
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Study Content */}
          <Card className="bg-white/90 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {getTypeIcon(currentMaterial.type)}
                {currentMaterial.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="prose prose-sm max-w-none">
                {currentMaterial.content.split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-3 leading-relaxed">
                    {paragraph}
                  </p>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Notes and Interaction */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Study Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Take notes, write questions, or work through problems here..."
                  className="min-h-[200px] resize-none"
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Understanding Check</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    How well do you understand this section? ({understanding}/5)
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <Button
                        key={level}
                        variant={understanding >= level ? "default" : "outline"}
                        size="sm"
                        onClick={() => setUnderstanding(level)}
                        className="w-10 h-10"
                      >
                        {level}
                      </Button>
                    ))}
                  </div>
                </div>

                {understanding > 0 && (
                  <div className="text-sm text-muted-foreground">
                    {understanding === 1 && "Need more review"}
                    {understanding === 2 && "Basic understanding"}
                    {understanding === 3 && "Good grasp"}
                    {understanding === 4 && "Very confident"}
                    {understanding === 5 && "Complete mastery"}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Study Assistant</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Button variant="outline" className="w-full justify-start" onClick={openChat}>
                    <MessageSquare className="h-4 w-4 mr-2" />
                    Ask a Question
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Lightbulb className="h-4 w-4 mr-2" />
                    Get Example
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Target className="h-4 w-4 mr-2" />
                    Practice Problem
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between">
        <div className="flex gap-2">

          <Button variant="outline" onClick={previousSection} disabled={currentSection === 0}>
            Previous
          </Button>
        </div>

        <Button onClick={nextSection}>
          {currentSection === studyMaterials.length - 1 ? "Complete Session" : "Next Section"}
        </Button>
      </div>

      {/* AI Chat Sidebar */}
      <Sheet open={chatOpen} onOpenChange={setChatOpen}>
        <SheetContent side="right" className="w-[95vw] sm:w-[440px] p-0 flex flex-col">
          <SheetHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                AI Study Assistant
              </SheetTitle>
              <Button variant="ghost" size="sm" onClick={closeChat}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-left">
              Ask questions about {topic} or get help with the current section
            </p>
          </SheetHeader>

          <ScrollArea ref={scrollAreaRef} className="flex-1 px-6">
            <div className="space-y-4 py-4">
              {chatMessages.map(message => <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-lg p-3 ${message.role === "user" ? "bg-primary text-primary-foreground ml-4" : "bg-muted mr-4"}`}>
                    <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                    <div className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                    </div>
                  </div>
                </div>)}
              {isChatLoading && <div className="flex justify-start">
                  <div className="bg-muted rounded-lg p-3 mr-4">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
                    animationDelay: '0.1s'
                  }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{
                    animationDelay: '0.2s'
                  }}></div>
                    </div>
                  </div>
                </div>}
            </div>
          </ScrollArea>

          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyPress={handleChatKeyPress} placeholder="Ask a question about the study material..." disabled={isChatLoading} className="flex-1" />
              <Button onClick={sendChatMessage} disabled={!chatInput.trim() || isChatLoading}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>;
};
export default FocusedStudy;