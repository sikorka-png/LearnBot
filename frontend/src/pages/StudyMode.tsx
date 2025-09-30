import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Brain, BookOpen, Target, Clock, Zap, Trophy, Play, Pause, RotateCcw, Library, Shield, MessageCircle, Mic, Lightbulb, Loader2, Layers, Plus } from "lucide-react";
import Navigation from "@/components/Navigation";
import FlashcardSession from "@/components/FlashcardSession";
import FlashcardSetManager, { FlashcardSet } from "@/components/FlashcardSetManager";
import QuizSession from "@/components/QuizSession";
import FocusedStudy from "@/components/FocusedStudy";
import StudyProgress from "@/components/StudyProgress";
import StudyCardManager from "@/components/StudyCardManager";
import TopicTree from "@/components/TopicTree";
import ChallengeGAN from "@/components/ChallengeGAN";
import ShadowMode from "@/components/ShadowMode";
import AudioStudy from "@/components/AudioStudy";
import { toast } from "sonner";

interface StudySession {
  id: string;
  type: "flashcards" | "quiz" | "focused" | "exam" | "challenge-gan" | "shadow-mode" | "audio-study";
  topic: string;
  flashcardSet?: FlashcardSet;
  duration: number;
  score?: number;
  completed: boolean;
  date: Date;
}

interface StudyCard {
  id: string;
  name: string;
  description: string;
  materials: string[];
  createdAt: Date;
  lastStudied?: Date;
  knowledge_tree_status: "pending" | "ready";
  focus_study_status: "pending" | "ready";
}

interface QuizQuestion {
  id?: string;
  topic: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
}

interface TreeNode {
  id: string;
  topic_name: string;
  chunk_ids: string[];
  mastery_level: number;
  correct: number;
  attempts: number;
  last_seen: string | null;
  next_review: string | null;
  confidence: number;
  flashcards: any[];
  quiz_questions: any[];
  subtopics: TreeNode[];
}

interface TopicData {
  chunk_ids: string[]; //to do usuniecia
  mastery_level: number;
  correct: number;
  attempts: number;
  last_seen: string | null;
  next_review: string | null;
  confidence: number;
  flashcards: any[]; //to do usuniecia
  quiz_questions: any[]; //to do usuniecia
}

const StudyMode = () => {
  const [activeSession, setActiveSession] = useState<StudySession | null>(null);
  const [selectedCard, setSelectedCard] = useState<StudyCard | null>(null);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [studySessions, setStudySessions] = useState<StudySession[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [isLoadingFocusedStudy, setIsLoadingFocusedStudy] = useState(false);
  const [isLoadingFlashcardSet, setIsLoadingFlashcardSet] = useState(false);
  const [showFlashcardManager, setShowFlashcardManager] = useState(false);
  const [selectedFlashcardSet, setSelectedFlashcardSet] = useState<FlashcardSet | null>(null);
  const [focusedResources, setFocusedResources] = useState<any[]>([]);
  const [topicsData, setTopicsData] = useState<TreeNode[] | null>(null);
  const focusPollRef = useRef<number | null>(null);
  const FOCUS_POLL_MS = 30000;

  useEffect(() => {
    axios.get("http://localhost:8000/file/list", { withCredentials: true })
      .then((res) => {
        const filenames = res.data.map((file: any) => file.filename);
        setAvailableMaterials(filenames);
      })
      .catch(() => {
        toast.error("Failed to load materials");
      });
  }, []);

  const [sessionDuration, setSessionDuration] = useState(15);

  const stopFocusPolling = () => {
    if (focusPollRef.current) {
      window.clearTimeout(focusPollRef.current);
      focusPollRef.current = null;
    }
  };

  const startFocusPolling = (cardId: string | number) => {
    if (focusPollRef.current) return;

    const tick = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:8000/study_card/${cardId}/focused-study/status`,
          { withCredentials: true }
        );
        const status: "pending" | "ready" = data.focus_study_status;

        setSelectedCard(prev =>
          prev && Number(prev.id) === Number(cardId) ? { ...prev, focus_study_status: status } : prev
        );

        if (status === "ready" || status === "failed") {
          stopFocusPolling();
          if (status === "failed") {
            toast.error("Focused Study failed to prepare");
          }
          return;
        }
      } catch (e) {
      }
      focusPollRef.current = window.setTimeout(tick, FOCUS_POLL_MS);
    };

    tick();
  };

  useEffect(() => {
    return () => stopFocusPolling();
  }, [selectedCard?.id]);

  const fetchQuizQuestions = async (type: StudySession["type"]) => {
    setIsGeneratingQuestions(true);

    try {
      const response = await axios.post(
        "http://localhost:8000/quiz/",
        {
          study_card_id: selectedCard.id,
          topic: selectedTopics,
          total_questions_needed: 10,
        },
        { withCredentials: true }
      );
      setQuizQuestions(response.data.questions);

      const topicNames = selectedTopics.map(t => t.split('/')[1]).join(', ');
      const newSession: StudySession = {
        id: Date.now().toString(),
        type,
        topic: topicNames,
        duration: sessionDuration,
        completed: false,
        date: new Date()
      };
      setActiveSession(newSession);
      toast.success(`Started ${type.replace("-", " ")} session`);
    } catch (error) {
      toast.error("Failed to generate quiz questions");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };


  const startSession = async (type: StudySession["type"]) => {
    if (selectedTopics.length === 0) {
      toast.error("Please select at least one topic first");
      return;
    }

    const topicNames = selectedTopics.map(topic => topic.split('/').pop()).join(', ');
    if (type === "exam") {
      setIsGeneratingQuestions(true);

      setTimeout(() => {
        const newSession: StudySession = {
          id: Date.now().toString(),
          type,
          topic: topicNames,
          duration: sessionDuration,
          completed: false,
          date: new Date()
        };

        setActiveSession(newSession);
        setIsGeneratingQuestions(false);
        toast.success(`Started ${type.replace('-', ' ')} session for ${topicNames}`);
      }, 2000);
    } else if (type === "focused") {
      setIsLoadingFocusedStudy(true);

      try {
        const { data } = await axios.post("http://localhost:8000/focus_study/by-subtopics",
          {
            study_card_id: Number(selectedCard.id),
            subtopic_names: selectedTopics.map(t => t.split("/").pop()!).filter(Boolean),
          },
          { withCredentials: true }
        );

        setFocusedResources(Array.isArray(data) ? data : []);
        const newSession: StudySession = {
          id: Date.now().toString(),
          type,
          topic: topicNames,
          duration: sessionDuration,
          completed: false,
          date: new Date(),
        };
        setActiveSession(newSession);
      } catch (e) {
        toast.error("Failed to load Focused Study resources");
      } finally {
        setIsLoadingFocusedStudy(false);
      }
    } else {
      const newSession: StudySession = {
        id: Date.now().toString(),
        type,
        topic: topicNames,
        duration: sessionDuration,
        completed: false,
        date: new Date()
      };

      setActiveSession(newSession);
      toast.success(`Started ${type.replace('-', ' ')} session for ${topicNames}`);
    }
  };

  const completeSession = (score?: number) => {
    if (!activeSession) return;

    const completedSession = {
      ...activeSession,
      completed: true,
      score
    };

    setStudySessions(prev => [completedSession, ...prev]);
    setActiveSession(null);
    toast.success("Study session completed!");
  };

  const handleStudySet = (set: FlashcardSet) => {
    setSelectedFlashcardSet(set);
    setShowFlashcardManager(false);
    setActiveSession({
      id: Date.now().toString(),
      type: "flashcards",
      topic: set.name,
      flashcardSet: set,
      duration: 0,
      completed: false,
      date: new Date(),
    });
  };

  const cancelSession = () => {
    setActiveSession(null);
    toast.info("Study session cancelled");
  };

  const handleSelectCard = async (card: StudyCard) => {
    setSelectedCard(card);
    setIsLoadingTopics(true);

    try {
      const response = await axios.get(
        `http://localhost:8000/study_card/${card.id}/knowledge-tree`,
        { withCredentials: true }
      );
      const topicsData: TreeNode[] = response.data.knowledge_tree.tree || [];
      setTopicsData(topicsData);

      const collectAllTopicPaths = (nodes: TreeNode[], basePath = ""): string[] =>
        nodes.flatMap((n) => {
          const current = basePath ? `${basePath}/${n.topic_name}` : n.topic_name;
          const children = n.subtopics?.length ? collectAllTopicPaths(n.subtopics, current) : [];
          return [current, ...children];
        });
      const allTopics = collectAllTopicPaths(topicsData);
      setSelectedTopics(allTopics);

      if (card.focus_study_status !== "ready") {
        startFocusPolling(card.id);
      }
    } catch (error) {
      setTopicsData(null);
      setSelectedTopics([]);
      toast.error("Failed to load knowledge tree");
    } finally {
      setIsLoadingTopics(false);
    }
  };

  if (activeSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
        <Navigation />

        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Brain className="h-6 w-6 text-primary" />
                {activeSession.type === "flashcards" && "Flashcard Session"}
                {activeSession.type === "quiz" && "Quiz Session"}
                {activeSession.type === "focused" && "Focused Study"}
                {activeSession.type === "exam" && "Exam Mode"}
                {activeSession.type === "challenge-gan" && "Challenge GAN"}
                {activeSession.type === "shadow-mode" && "Shadow Mode"}
                {activeSession.type === "audio-study" && "Audio Study"}
              </h1>
              <p className="text-muted-foreground">
                Studying {activeSession.topic} • {activeSession.duration} minutes
              </p>
            </div>
            <Button variant="outline" onClick={cancelSession}>
              <Pause className="h-4 w-4 mr-2" />
              Exit Session
            </Button>
          </div>

          {activeSession.type === "flashcards" && activeSession.flashcardSet && (
            <FlashcardSession
              flashcardSet={activeSession.flashcardSet}
              onComplete={completeSession}
              onCancel={cancelSession}
            />
          )}

          {(activeSession.type === "quiz" || activeSession.type === "exam") && (
            <QuizSession
              card_id={selectedCard.id}
              topic={activeSession.topic}
              onComplete={completeSession}
              onCancel={cancelSession}
              questions={quizQuestions}
            />
          )}

          {activeSession.type === "focused" && (
            <FocusedStudy
              topic={activeSession.topic}
              duration={activeSession.duration}
              resources={focusedResources}
              onComplete={completeSession}
              onCancel={cancelSession}
            />
          )}

          {activeSession.type === "challenge-gan" && (
            <ChallengeGAN
              topic={activeSession.topic}
              onComplete={completeSession}
              onCancel={cancelSession}
            />
          )}

          {activeSession.type === "shadow-mode" && (
            <ShadowMode
              topic={activeSession.topic}
              onComplete={completeSession}
              onCancel={cancelSession}
            />
          )}

          {activeSession.type === "audio-study" && (
            <AudioStudy
              topic={activeSession.topic}
              onComplete={completeSession}
              onCancel={cancelSession}
            />
          )}
        </div>
      </div>
    );
  }

  if (!selectedCard) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Navigation />
        {/* Floating Background Elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-20 right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-6xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
              <Brain className="h-8 w-8 text-primary" />
              Study Mode
            </h1>
            <p className="text-muted-foreground">
              Select a study card to begin your learning session
            </p>
          </div>

          <StudyCardManager
            onSelectCard={handleSelectCard}
            selectedCardId={selectedCard?.id}
            availableMaterials={availableMaterials}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
            <Brain className="h-8 w-8 text-primary" />
            Study Mode
          </h1>
          <p className="text-muted-foreground">
            Studying with "{selectedCard.name}" • Interactive learning experiences powered by your knowledge base
          </p>
          <Button
            variant="outline"
            onClick={() => setSelectedCard(null)}
            className="mt-2"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Change Study Card
          </Button>
        </div>

        {isLoadingTopics ? (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <Loader2 className="h-8 w-8 mx-auto mb-4 text-primary animate-spin" />
              <h3 className="text-lg font-medium mb-2">Loading Topics</h3>
              <p className="text-muted-foreground">
                Fetching topics from database...
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <TopicTree
                topicsData={topicsData ?? []}
                selectedTopics={selectedTopics}
                onSelectionChange={setSelectedTopics}
              />
            </div>
            <div className="lg:col-span-2">
              {showFlashcardManager ? (
                <Card className="bg-card/80 backdrop-blur-sm border">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-primary" />
                        Flashcard Management
                      </CardTitle>
                      <Button
                        variant="outline"
                        onClick={() => setShowFlashcardManager(false)}
                        className="text-xs sm:text-sm px-2 sm:px-4"
                      >
                        <span className="hidden sm:inline">Back to Study Options</span>
                        <span className="sm:hidden">Back</span>
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <FlashcardSetManager
                      selectedTopics={selectedTopics}
                      studyCardId={selectedCard.id}
                      onStudySet={(set) => {
                        setSelectedFlashcardSet(set);
                        setShowFlashcardManager(false);
                        setActiveSession({
                          id: Date.now().toString(),
                          type: "flashcards",
                          topic: set.name,
                          flashcardSet: set,
                          duration: 0,
                          completed: false,
                          date: new Date(),
                        });
                      }}
                    />
                  </CardContent>
                </Card>
              ) : (
                <>
                  {selectedTopics.length > 0 ? (
                    <>
                      <Card className="bg-primary/5 border-primary/20 bg-card/80 backdrop-blur-sm border mb-6">
                        <CardHeader>
                          <CardTitle className="flex items-center gap-2">
                            <Library className="h-5 w-5 text-primary" />
                            Selected Topics
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-medium">
                                {selectedTopics.length} topic{selectedTopics.length !== 1 ? 's' : ''} selected
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {selectedTopics.map(topic => topic.split('/').pop()).join(', ')}
                              </p>
                              <Badge variant="secondary" className="mt-2">
                                Ready to study
                              </Badge>
                            </div>
                            <Button variant="outline" onClick={() => setSelectedTopics([])}>
                              Clear Selection
                            </Button>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card className="hover:shadow-md transition-shadow bg-card/80 backdrop-blur-sm border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Layers className="h-5 w-5 text-purple-500" />
                              Flashcards
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Interactive study cards
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Button
                              onClick={() => {
                                setIsLoadingFlashcardSet(true);
                              }}
                              className="w-full"
                              variant="outline"
                              disabled={isLoadingFlashcardSet}
                            >
                              {isLoadingFlashcardSet ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Select Set
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow bg-card/80 backdrop-blur-sm border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Target className="h-5 w-5 text-green-500" />
                              Quiz Mode
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Test your knowledge
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Button
                              onClick={() => fetchQuizQuestions("quiz")}
                              className="w-full"
                              variant="outline"
                              disabled={isGeneratingQuestions}
                            >
                              {isGeneratingQuestions ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Generating...
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Quiz
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow bg-card/80 backdrop-blur-sm border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Clock className="h-5 w-5 text-blue-500" />
                              Focused Study
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Deep learning session
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Button
                              onClick={() => startSession("focused")}
                              className="w-full"
                              variant="secondary"
                              disabled={selectedCard?.focus_study_status !== "ready" || isLoadingFocusedStudy}
                            >
                              {selectedCard?.focus_study_status !== "ready" ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Preparing...
                                </>
                              ) : isLoadingFocusedStudy ? (
                                <>
                                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                  Loading...
                                </>
                              ) : (
                                <>
                                  <Play className="h-4 w-4 mr-2" />
                                  Start Session
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </Card>

                        <Card className="hover:shadow-md transition-shadow bg-card/80 backdrop-blur-sm border">
                          <CardHeader className="pb-3">
                            <CardTitle className="text-lg flex items-center gap-2">
                              <Trophy className="h-5 w-5 text-purple-500" />
                              Exam Mode
                            </CardTitle>
                            <CardDescription className="text-sm">
                              Comprehensive assessment
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <Button
                              className="w-full"
                              variant="destructive"
                              disabled={true}
                            >
                              Comming soon...
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
                    </>
                  ) : (
                    <Card className="bg-card/80 backdrop-blur-sm border">
                      <CardContent className="py-12 text-center">
                        <Library className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2">No topics selected</h3>
                        <p className="text-muted-foreground mb-4">
                          Select topics from the topic tree on the left to start a session
                        </p>
                      </CardContent>
                    </Card>
                  )}

                  {isLoadingFlashcardSet && (
                    <div aria-hidden className="absolute w-0 h-0 overflow-hidden">
                      <FlashcardSetManager
                        selectedTopics={selectedTopics}
                        studyCardId={selectedCard.id}
                        onStudySet={() => {}}
                        onLoaded={() => {
                          setShowFlashcardManager(true);
                          setIsLoadingFlashcardSet(false);
                        }}
                        onError={() => {
                          setIsLoadingFlashcardSet(false);
                        }}
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudyMode;