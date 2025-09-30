import axios from "axios";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Clock, Play, RotateCcw, CheckCircle2, AlertCircle, Sparkles, Plus, Trash2, FileText, Wand2, File, History, Eye, Edit, X, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { VirtualizedExamHistory } from "@/components/VirtualizedExamHistory";

interface ExamQuestion {
  id: string;
  type: "multiple-choice" | "true-false" | "text-answer" | "single-choice";
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  userAnswer?: string;
  points: number;
}

interface ExamSettings {
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  questionCount: number;
  timeLimit: number;
  questionTypes?: string;
}

interface SavedExam {
  id: string;
  title: string;
  description: string;
  time_limit: number;
  num_of_questions: number;
  points: number;
  questions: ExamQuestion[];
  createdAt: Date;
}

interface ExamAttempt {
  id: string;
  examTitle: string;
  completedAt: Date;
  score: number;
  totalPoints: number;
  percentage: number;
  correctAnswers: number;
  totalQuestions: number;
  timeSpent: number; // in seconds
  questions: ExamQuestion[]; // includes user answers
  aiFeedback?: { [questionId: string]: string }; // AI feedback for text answers
}

const ExamMode = () => {
  const [activeTab, setActiveTab] = useState<"create" | "saved" | "history">("create");
  const [openAccordions, setOpenAccordions] = useState<string[]>(["exam-settings"]);

  const navigate = useNavigate();

  const [examSettings, setExamSettings] = useState<ExamSettings>({
    topic: "",
    difficulty: "medium",
    questionCount: 10,
    timeLimit: 30,
    questionTypes: "all-question-types" // Default to all types
  });

  const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [isLoadingExamForEdit, setIsLoadingExamForEdit] = useState(false);
  const [loadingExamId, setLoadingExamId] = useState<number | null>(null);
  const [isLoadingExamForView, setIsLoadingExamForView] = useState<string | null>(null);
  const [isQuestionUpdating, setIsQuestionUpdating] = useState<string | null>(null);
  const [isExamSaving, setIsExamSaving] = useState<string | null>(null);
  const [originalExam, setOriginalExam] = useState<SavedExam | null>(null);
  const [isEditingExistingExam, setIsEditingExistingExam] = useState(false);

  // Test creation state
  const [savedExams, setSavedExams] = useState<SavedExam[]>([]);
  const [examHistory, setExamHistory] = useState<ExamAttempt[]>([]);
  const [currentExam, setCurrentExam] = useState<Partial<SavedExam>>({
    title: "",
    description: "",
    questions: []
  });
  const [usedMaterials, setUsedMaterials] = useState<string[]>([]);
  const [currentQuestion, setCurrentQuestion] = useState<Partial<ExamQuestion>>({
    type: "multiple-choice",
    question: "",
    options: ["", ""],
    correctAnswer: ""
  });
  const [selectedAttemptForView, setSelectedAttemptForView] = useState<ExamAttempt | null>(null);

  // Add editing state
  const [editingQuestionId, setEditingQuestionId] = useState<string | null>(null);
  const [examToDelete, setExamToDelete] = useState<SavedExam | null>(null);

  // Material selection state
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);

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

  useEffect(() => {
    axios.get("http://localhost:8000/exam/my", { withCredentials: true })
      .then((res) => {
        setSavedExams(res.data.map((exam: any) => ({
          ...exam,
          createdAt: new Date(exam.created_at)
        })));
      })
      .catch((err) => {
        console.error("Failed to load saved exams:", err);
        toast.error("Failed to load saved exams from server");
      });
  }, []);

  useEffect(() => {
    axios.get("http://localhost:8000/exam/attempts", { withCredentials: true })
      .then((res) => {
        const parsed = res.data.map((attempt: any) => ({
          id: attempt.id,
          examTitle: attempt.exam_title,
          completedAt: new Date(attempt.completed_at),
          score: attempt.score,
          totalPoints: attempt.total_points,
          percentage: attempt.percentage,
          correctAnswers: attempt.correct_answers,
          totalQuestions: attempt.total_questions,
          timeSpent: attempt.time_spent,
          questions: attempt.questions,
          aiFeedback: {}
        }));
        setExamHistory(parsed);
      })
      .catch((err) => {
        console.error("Failed to load exam attempts:", err);
        toast.error("Failed to load exam history");
      });
  }, []);


  const toggleMaterial = (materialId: string) => {
    console.log("Toggling material:", materialId);
    setSelectedMaterials(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const generateExamQuestions = async () => {
    if (selectedMaterials.length === 0) {
      toast.error("Please select at least one material");
      return;
    }

    setIsGeneratingQuestions(true);

    try {
      const response = await axios.post(
        "http://localhost:8000/exam/",
        {
          topic: examSettings.topic,
          difficulty: examSettings.difficulty,
          num_of_questions: examSettings.questionCount,
          question_type: examSettings.questionTypes,
          filenames: selectedMaterials
        },
        { withCredentials: true }
      );

      const questions = response.data;
      setExamQuestions(prev => [...prev, ...questions]);
      setUsedMaterials(prev => Array.from(new Set([...prev, ...selectedMaterials])));
      toast.success(`Generated ${questions.length} questions successfully!`);
    } catch (error: any) {
      console.error("Failed to generate exam:", error);
      toast.error("Failed to generate exam questions.");
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const addManualQuestion = async () => {
    if (!currentQuestion.question?.trim()) {
      toast.error("Please enter a question");
      return;
    }

    if (editingQuestionId) {
      setIsQuestionUpdating(true);
      const isFromFrontend = typeof editingQuestionId === "string" && editingQuestionId.startsWith("local-");
      let canEdit = true;
      if (!isFromFrontend) {
        try {
          const payload: any = {
            type: currentQuestion.type,
            question: currentQuestion.question,
            correct_answer: currentQuestion.correctAnswer || "",
            points: currentQuestion.type === "text-answer" ? 2 : 1
          };

          if (currentQuestion.type === "multiple-choice" || currentQuestion.type === "single-choice") {
            payload.options = currentQuestion.options;
          }

          await axios.patch(
            `http://localhost:8000/exam/question/${editingQuestionId}`,
            payload,
            { withCredentials: true }
          );
        } catch (error) {
          console.error("Failed to update question on server:", error);
          toast.error("Server update failed");
          canEdit = false;
        }
      }
      if (canEdit) {
        const updatedQuestions = examQuestions.map(q =>
          q.id === editingQuestionId ? {
            ...q,
            type: currentQuestion.type as ExamQuestion["type"],
            question: currentQuestion.question,
            options: (currentQuestion.type === "multiple-choice" || currentQuestion.type === "single-choice") ? currentQuestion.options : undefined,
            correctAnswer: currentQuestion.correctAnswer || "",
            points: currentQuestion.type === "text-answer" ? 2 : 1
          } : q
        );
        //tutaj powinienem zmienac dodatkowo pytanie dla konkretnego egzaminu (jak zedytuje pytanie a potem bede chial od razu wczytac znow egzamin to pojawia sie stara odpowiedz)
        setExamQuestions(updatedQuestions);
        setSavedExams(prev =>
          prev.map(exam =>
            exam.id === currentExam.id
              ? {
                  ...exam,
                  questions: updatedQuestions
                }
              : exam
          )
        );
        toast.success("Question updated on server");
        setEditingQuestionId(null);
      }
      setIsQuestionUpdating(false);
    } else {
      const newQuestion: ExamQuestion = {
        id: `local-${Date.now()}`,
        type: currentQuestion.type as ExamQuestion["type"],
        question: currentQuestion.question,
        options: (currentQuestion.type === "multiple-choice" || currentQuestion.type === "single-choice") ? currentQuestion.options : undefined,
        correctAnswer: currentQuestion.correctAnswer || "",
        points: currentQuestion.type === "text-answer" ? 2 : 1
      };
      setExamQuestions(prev => [...prev, newQuestion]);
      toast.success("Question added");
    }

    setCurrentQuestion({
      type: "multiple-choice",
      question: "",
      options: ["", ""],
      correctAnswer: ""
    });
  };

  const editQuestion = (questionId: string) => {
    const questionToEdit = examQuestions.find(q => q.id === questionId);
    if (questionToEdit) {
      setCurrentQuestion({
        type: questionToEdit.type,
        question: questionToEdit.question,
        options: questionToEdit.options || ["", ""],
        correctAnswer: questionToEdit.correctAnswer
      });
      setEditingQuestionId(questionId);
      setOpenAccordions(["custom-question"]);
      toast.success("Question loaded for editing");
    }
  };

  const cancelEdit = () => {
    setEditingQuestionId(null);
    setCurrentQuestion({
      type: "multiple-choice",
      question: "",
      options: ["", ""],
      correctAnswer: ""
    });
  };

  const removeQuestion = async (questionId: string) => {
    const isFromFrontend = typeof questionId === "string" && (questionId.startsWith("local-") || questionId.startsWith("gen-"));
    let canEdit = true
    if (!isFromFrontend) {
      try {
        await axios.delete(`http://localhost:8000/exam/question/${questionId}`, {
          withCredentials: true
        });
        toast.success("Question deleted from server");
      } catch (error) {
        console.error("Failed to delete question from server:", error);
        toast.error("Server deletion failed");
        canEdit = false;
      }
    }

    if (canEdit) {
      //tutaj powinienem usuwac tez egzamin z konkretnego egzaminu w pamieci bo jak tutaj usune to usuwa sie ale tylko pytanie a nie pytanie w egzaminie i moge ponownie wczytac to pytanie chociaz w bazie ono juz nie istnieje
      setExamQuestions(prev => prev.filter(q => q.id !== questionId));
      setSavedExams(prev =>
        prev.map(exam =>
          exam.id === currentExam.id
            ? {
                ...exam,
                questions: exam.questions.filter(q => q.id !== questionId)
              }
            : exam
        )
      );
      setOriginalExam(prev => {
        if (!prev || prev.id !== currentExam.id) return prev;
        return {
          ...prev,
          questions: prev.questions.filter(q => q.id !== questionId),
          num_of_questions: prev.questions.length - 1
        };
      });
      if (editingQuestionId === questionId) {
        cancelEdit();
      }
      toast.success("Question removed");
    }
  };

  const saveExam = async () => {
    if (!currentExam.title?.trim()) {
      toast.error("Please enter an exam title");
      return;
    }

    if (examQuestions.length === 0) {
      toast.error("Please add at least one question");
      return;
    }
    setIsExamSaving(true);

    const examPayload = {
      title: currentExam.title,
      description: currentExam.description,
      time_limit: examSettings.timeLimit,
      questions: examQuestions.map(q => {
        const isLocal = typeof q.id === "string" && (q.id.startsWith("local-") || q.id.startsWith("gen-"));
        return {
          ...(q.id && !isLocal ? { id: Number(q.id) } : {}),
          type: q.type,
          question: q.question,
          options: q.options,
          correct_answer: q.correctAnswer,
          points: q.points
        };
      }),
      sources: usedMaterials
    };

    try {
      let response;
      if (currentExam.id) {
        response = await axios.patch(
          `http://localhost:8000/exam/edit/${currentExam.id}`,
          examPayload,
          { withCredentials: true }
        );

        const updatedExam = {
          ...response.data,
          questions: response.data.questions.map((q: any) => ({
            ...q,
            correctAnswer: q.correct_answer
          })),
          createdAt: new Date(response.data.created_at)
        };

        setSavedExams(prev =>
          prev.map(exam =>
            exam.id === updatedExam.id ? updatedExam : exam
          )
        );

        toast.success("Exam updated successfully!");
      } else {
        response = await axios.post(
          "http://localhost:8000/exam/create",
          examPayload,
          { withCredentials: true }
        );

        const newExam = {
          ...response.data,
          questions: response.data.questions.map((q: any) => ({
            ...q,
            correctAnswer: q.correct_answer
          })),
          createdAt: new Date(response.data.created_at)
        };

        setSavedExams(prev => [...prev, newExam]);
        toast.success("Exam saved successfully!");
      }

      setCurrentExam({ title: "", description: "", questions: [] });
      setExamQuestions([]);
      setSelectedMaterials([]);

    } catch (error) {
      console.error(error);
      toast.error("Failed to save exam");
    } finally {
      setIsExamSaving(false);
    }
  };

  const loadSavedExam = async (examId: string) => {
    try {
      const response = await axios.get(`http://localhost:8000/exam/${examId}`, {withCredentials: true});
      const exam: SavedExam = {
          ...response.data,
          createdAt: new Date(response.data.created_at)
      };
      const mappedQuestions = exam.questions.map(q => ({
        ...q,
        correctAnswer: q.correct_answer
      }));
      setExamQuestions(mappedQuestions);
      setCurrentExam({
        ...exam,
        questions: mappedQuestions
      });
      setOriginalExam({
        ...exam,
        questions: mappedQuestions
      });
      setIsEditingExistingExam(true);
      setExamSettings(prev => ({
        ...prev,
        timeLimit: exam.time_limit || prev.time_limit
      }));
      cancelEdit();
      setExamSettings({
          difficulty: "medium",
          questionCount: 10,
          timeLimit: exam.time_limit,
          questionTypes: "all-question-types"
      });
      setOpenAccordions(["exam-settings"]);
      toast.success(`Loaded "${exam.title}" for editing`);
    } catch (error) {
      toast.error("Failed to load exam for editing");
    } finally {
      setActiveTab("create");
      setLoadingExamId(null);
    }
  };

  const updateQuestionOption = (index: number, value: string) => {
    const newOptions = [...(currentQuestion.options || [])];
    newOptions[index] = value;
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const addOption = () => {
    const newOptions = [...(currentQuestion.options || []), ""];
    setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
  };

  const removeOption = (index: number) => {
    if ((currentQuestion.options?.length || 0) <= 2) {
      toast.error("Must have at least 2 options");
      return;
    }

    const newOptions = [...(currentQuestion.options || [])];
    const removedOption = newOptions[index];
    newOptions.splice(index, 1);

    // If the removed option was the correct answer, clear the correct answer
    if (Array.isArray(currentQuestion.correctAnswer)) {
      if (currentQuestion.correctAnswer.includes(removedOption)) {
        const filtered = currentQuestion.correctAnswer.filter(ans => ans !== removedOption);
        setCurrentQuestion(prev => ({ ...prev, options: newOptions, correctAnswer: filtered.length > 0 ? filtered : "" }));
      } else {
        setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
      }
    } else {
      if (currentQuestion.correctAnswer === removedOption) {
        setCurrentQuestion(prev => ({ ...prev, options: newOptions, correctAnswer: "" }));
      } else {
        setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
      }
    }
  };

  const setCorrectAnswer = (option: string) => {
    console.log("Setting correct answer:", option, "Current correct:", currentQuestion.correctAnswer);

    if (currentQuestion.type === "multiple-choice") {
      // For multiple-choice, allow multiple correct answers
      const currentCorrectAnswers = Array.isArray(currentQuestion.correctAnswer)
        ? currentQuestion.correctAnswer
        : currentQuestion.correctAnswer ? [currentQuestion.correctAnswer] : [];

      const updatedAnswers = currentCorrectAnswers.includes(option)
        ? currentCorrectAnswers.filter(answer => answer !== option)
        : [...currentCorrectAnswers, option];

      setCurrentQuestion(prev => ({
        ...prev,
        correctAnswer: updatedAnswers.length > 0 ? updatedAnswers : ""
      }));
    } else {
      // For other question types, single correct answer
      if (currentQuestion.correctAnswer === option) {
        setCurrentQuestion(prev => ({ ...prev, correctAnswer: "" }));
      } else {
        setCurrentQuestion(prev => ({ ...prev, correctAnswer: option }));
      }
    }
  };

  const viewExamAttempt = async (attempt: ExamAttempt) => {
    setIsLoadingExamForView(attempt.id);
    try {
      navigate(`/exam-details?view=attempt&attemptId=${attempt.id}`);
    } catch (error) {
      toast.error("Failed to load exam attempt");
    } finally {
      setIsLoadingExamForView(null);
    }
  };

  const createNewExam = () => {
    setCurrentExam({ title: "", description: "", questions: [] });
    setExamQuestions([]);
    setUsedMaterials([]);
    setSelectedMaterials([]);
    setExamSettings({
      topic: "",
      difficulty: "medium",
      questionCount: 10,
      timeLimit: 30,
      questionTypes: "all-question-types"
    });
    setCurrentQuestion({
      type: "multiple-choice",
      question: "",
      options: ["", ""],
      correctAnswer: ""
    });
    setEditingQuestionId(null);
    setOriginalExam(null);
    setIsEditingExistingExam(false);
    toast.success("Started new exam");
  };

  const isSaveButtonEnabled = () => {
    if (!isEditingExistingExam && examQuestions.length > 0 && currentExam.title?.trim()) {
      return true;
    }

    if (isEditingExistingExam && originalExam) {
      const settingsChanged =
        currentExam.title !== originalExam.title ||
        currentExam.description !== originalExam.description ||
        examSettings.timeLimit !== originalExam.time_limit;

      const newQuestionsAdded = examQuestions.length > originalExam.questions.length;

      return settingsChanged || newQuestionsAdded;
    }

    return false;
  };

  const deleteSavedExam = (examId: string) => {
    const examToDelete = savedExams.find(exam => exam.id === examId);
    if (!examToDelete) return;
    setExamToDelete(examToDelete);
  };

  const confirmDeleteExam = async () => {
    if (!examToDelete) return;
    try {
      await axios.delete(`http://localhost:8000/exam/delete/${examToDelete.id}`, { withCredentials: true });

      const updatedSavedExams = savedExams.filter(exam => exam.id !== examToDelete.id);
      setSavedExams(updatedSavedExams);

      if (currentExam.title === examToDelete.title) {
        createNewExam();
      }

      toast.success(`Deleted "${examToDelete.title}"`);
    } catch (error) {
      console.error("Failed to delete exam:", error);
      toast.error("Failed to delete exam");
    } finally {
      setExamToDelete(null);
    }
  };


  try {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
        <Navigation />

        {/* Floating Background Elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-20 right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="container mx-auto px-4 py-8 max-w-7xl relative">
          <div className="mb-6">
            <h1 className="text-3xl font-bold mb-2 text-foreground">Exam Mode</h1>
            <p className="text-muted-foreground">Create and take comprehensive exams with AI generation or custom questions</p>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="create">Create Exam</TabsTrigger>
              <TabsTrigger value="saved">Saved Exams</TabsTrigger>
              <TabsTrigger value="history">Exam History</TabsTrigger>
            </TabsList>

            <TabsContent value="create" className="space-y-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-foreground">Create New Exam</h2>
                <Button
                  onClick={createNewExam}
                  variant="outline"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  New Exam
                </Button>
              </div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Exam Creation */}
                <div className="space-y-6">
                  <Accordion type="multiple" value={openAccordions} onValueChange={setOpenAccordions} className="w-full space-y-4">
                    {/* Exam Settings */}
                    <AccordionItem value="exam-settings" className="border rounded-lg">
                      <Card className="bg-card/80 backdrop-blur border-0">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline">
                          <CardTitle className="text-card-foreground">Exam Settings</CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                          <CardContent className="space-y-4 pt-0">
                            <CardDescription>Configure your exam parameters</CardDescription>
                            <div>
                              <label className="text-sm font-medium text-foreground">Exam Title</label>
                              <Input
                                value={currentExam.title || ""}
                                onChange={(e) => setCurrentExam(prev => ({ ...prev, title: e.target.value }))}
                                placeholder="Enter exam title..."
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-foreground">Description (Optional)</label>
                              <Textarea
                                value={currentExam.description || ""}
                                onChange={(e) => setCurrentExam(prev => ({ ...prev, description: e.target.value }))}
                                placeholder="Enter exam description..."
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium text-foreground">Time Limit (minutes)</label>
                              <Select
                                value={examSettings.timeLimit.toString()}
                                onValueChange={(value) => setExamSettings(prev => ({ ...prev, timeLimit: parseInt(value) }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="15">15 minutes</SelectItem>
                                  <SelectItem value="30">30 minutes</SelectItem>
                                  <SelectItem value="45">45 minutes</SelectItem>
                                  <SelectItem value="60">1 hour</SelectItem>
                                  <SelectItem value="90">1.5 hours</SelectItem>
                                  <SelectItem value="120">2 hours</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>

                    {/* AI Generation */}
                    <AccordionItem value="ai-generation" className="border rounded-lg">
                      <Card className="bg-card/80 backdrop-blur border-0">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline">
                          <CardTitle className="flex items-center gap-2 text-card-foreground">
                            <Sparkles className="h-5 w-5 text-purple-600" />
                            AI Question Generation
                          </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                          <CardContent className="space-y-4 pt-0">
                            <CardDescription>Generate exam questions automatically</CardDescription>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-foreground">Topic</label>
                                <Input
                                  value={examSettings.topic}
                                  onChange={(e) => setExamSettings(prev => ({ ...prev, topic: e.target.value }))}
                                  placeholder="Leave blank for general exam"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-foreground">Difficulty</label>
                                <Select
                                  value={examSettings.difficulty}
                                  onValueChange={(value: any) => setExamSettings(prev => ({ ...prev, difficulty: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="easy">Easy</SelectItem>
                                    <SelectItem value="medium">Medium</SelectItem>
                                    <SelectItem value="hard">Hard</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="text-sm font-medium text-foreground">Number of Questions</label>
                                <Input
                                  type="number"
                                  min="1"
                                  max="30"
                                  value={examSettings.questionCount}
                                  onChange={(e) => setExamSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) || 1 }))}
                                  placeholder="Enter number of questions"
                                />
                              </div>
                              <div>
                                <label className="text-sm font-medium text-foreground">Question Type</label>
                                <Select
                                  value={examSettings.questionTypes || "all-question-types"}
                                  onValueChange={(value) => setExamSettings(prev => ({ ...prev, questionTypes: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Any type" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="all-question-types">All Question Types</SelectItem>
                                    <SelectItem value="true-false">True/False</SelectItem>
                                    <SelectItem value="single-choice">Single Choice</SelectItem>
                                    <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                    <SelectItem value="text-answer">Text Answer</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium mb-2 block text-foreground">
                                Select Materials
                              </label>
                              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                {availableMaterials.map((material) => {
                                  const isSelected = selectedMaterials.includes(material);
                                  return (
                                    <Badge
                                      key={material}
                                      variant={isSelected ? "default" : "outline"}
                                      className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                                      onClick={() => toggleMaterial(material)}
                                    >
                                      <File className="h-3 w-3 mr-1" />
                                      {material}
                                    </Badge>
                                  );
                                })}
                              </div>
                            </div>

                            <Button
                              onClick={generateExamQuestions}
                              disabled={isGeneratingQuestions || selectedMaterials.length === 0}
                              className="bg-gradient-to-r from-purple-600 to-pink-600 w-full"
                            >
                              {isGeneratingQuestions ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2" />
                                  Generating Questions...
                                </>
                              ) : (
                                <>
                                  <Sparkles className="h-4 w-4 mr-2" />
                                  Generate Questions
                                </>
                              )}
                            </Button>
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>

                    {/* Manual Question Creation */}
                    <AccordionItem value="custom-question" className="border rounded-lg">
                      <Card className="bg-card/80 backdrop-blur border-0">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline">
                          <CardTitle className="flex items-center gap-2  text-card-foreground">
                            <Plus className="h-5 w-5 text-blue-600" />
                            {editingQuestionId ? "Edit Question" : "Add Custom Question"}
                          </CardTitle>
                        </AccordionTrigger>
                        <AccordionContent>
                          <CardContent className="space-y-4 pt-0">
                            <CardDescription>
                              {editingQuestionId ? "Modify the selected question" : "Create your own exam questions"}
                            </CardDescription>

                            {editingQuestionId && (
                              <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                                <Edit className="h-4 w-4 text-blue-600" />
                                <span className="text-sm text-blue-700 dark:text-blue-300">Currently editing a question</span>
                                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            )}

                            <div>
                              <label className="text-sm font-medium text-foreground">Question Type</label>
                              <Select
                                value={currentQuestion.type}
                                onValueChange={(value) => setCurrentQuestion(prev => ({
                                  ...prev,
                                  type: value as ExamQuestion["type"],
                                  options: (value === "multiple-choice" || value === "single-choice") ? ["", ""] : undefined,
                                  correctAnswer: ""
                                }))}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="true-false">True/False</SelectItem>
                                  <SelectItem value="single-choice">Single Choice</SelectItem>
                                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                                  <SelectItem value="text-answer">Text Answer</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>

                            <div>
                              <label className="text-sm font-medium text-foreground">Question</label>
                              <Textarea
                                value={currentQuestion.question || ""}
                                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
                                placeholder="Enter your question..."
                              />
                            </div>

                            {(currentQuestion.type === "multiple-choice" || currentQuestion.type === "single-choice") && (
                              <div>
                                <div className="flex justify-between items-center mb-2">
                                  <label className="text-sm font-medium text-foreground">Answer Options</label>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addOption}
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Add Option
                                  </Button>
                                </div>
                                <div className="space-y-2">
                                  {currentQuestion.options?.map((option, index) => {
                                    const currentCorrectAnswers = Array.isArray(currentQuestion.correctAnswer)
                                      ? currentQuestion.correctAnswer
                                      : currentQuestion.correctAnswer ? [currentQuestion.correctAnswer] : [];
                                    const isCorrectAnswer = currentCorrectAnswers.includes(option) && option.trim() !== "";

                                    return (
                                      <div key={index} className="flex gap-2 items-center">
                                        <Input
                                          value={option}
                                          onChange={(e) => updateQuestionOption(index, e.target.value)}
                                          placeholder={currentQuestion.type === "single-choice" ?
                                            `${String.fromCharCode(65 + index)}) Option ${index + 1}` :
                                            `Option ${index + 1}`
                                          }
                                        />
                                        {currentQuestion.type === "multiple-choice" ? (
                                          // Use checkbox for multiple-choice to allow multiple correct answers
                                          <div className="flex items-center space-x-2">
                                            <Checkbox
                                              id={`correct-${index}`}
                                              checked={isCorrectAnswer}
                                              onCheckedChange={() => setCorrectAnswer(option)}
                                              disabled={!option.trim()}
                                            />
                                            <Label htmlFor={`correct-${index}`} className="text-sm">
                                              Correct
                                            </Label>
                                          </div>
                                        ) : (
                                          // Use button for ABCD (single correct answer)
                                          <Button
                                            type="button"
                                            variant={isCorrectAnswer ? "default" : "outline"}
                                            onClick={() => setCorrectAnswer(option)}
                                            disabled={!option.trim()}
                                            size="sm"
                                            className="min-w-[80px]"
                                          >
                                            {isCorrectAnswer ? (
                                              <>
                                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                                Correct
                                              </>
                                            ) : (
                                              "Select"
                                            )}
                                          </Button>
                                        )}
                                        {(currentQuestion.options?.length || 0) > 2 && (
                                          <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => removeOption(index)}
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                                {currentQuestion.type === "multiple-choice" && currentQuestion.correctAnswer && Array.isArray(currentQuestion.correctAnswer) && currentQuestion.correctAnswer.length === 0 && (
                                  <p className="text-xs text-amber-600 mt-1">Please select at least one correct option</p>
                                )}
                                {currentQuestion.type === "single-choice" && !currentQuestion.correctAnswer && (
                                  <p className="text-xs text-amber-600 mt-1">Please select which option is correct</p>
                                )}
                              </div>
                            )}

                            {currentQuestion.type === "true-false" && (
                              <div>
                                <label className="text-sm font-medium text-foreground">Correct Answer</label>
                                <Select
                                  value={typeof currentQuestion.correctAnswer === "string" ? currentQuestion.correctAnswer : ""}
                                  onValueChange={(value) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: value }))}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select correct answer" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="true">True</SelectItem>
                                    <SelectItem value="false">False</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            )}

                            {currentQuestion.type === "text-answer" && (
                              <div>
                                <label className="text-sm font-medium text-foreground">Sample Answer</label>
                                <Textarea
                                  value={typeof currentQuestion.correctAnswer === "string" ? currentQuestion.correctAnswer : ""}
                                  onChange={(e) => setCurrentQuestion(prev => ({ ...prev, correctAnswer: e.target.value }))}
                                  placeholder="Enter a sample correct answer..."
                                />
                              </div>
                            )}

                            <Button onClick={addManualQuestion} className="w-full">
                              {editingQuestionId ? (
                                <>
                                  {isQuestionUpdating ? (
                                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                  ) : (
                                    <Edit className="h-4 w-4 mr-2" />
                                  )}
                                  Update Question
                                </>
                              ) : (
                                <>
                                  <Plus className="h-4 w-4 mr-2" />
                                  Add Question
                                </>
                              )}
                            </Button>

                            {editingQuestionId && (
                              <Button variant="outline" onClick={cancelEdit} className="w-full">
                                Cancel Edit
                              </Button>
                            )}
                          </CardContent>
                        </AccordionContent>
                      </Card>
                    </AccordionItem>
                  </Accordion>
                </div>

                {/* Right Column - Questions Preview */}
                <div className="space-y-6">
                  {examQuestions.length > 0 && (
                    <Card className="bg-card/80 backdrop-blur border-0 sticky top-4">
                      <CardHeader>
                        <div className="flex justify-between items-center">
                          <CardTitle className="text-card-foreground">Questions Preview ({examQuestions.length})</CardTitle>
                          <Button
                            variant="outline"
                            onClick={() => {
                              if (!currentExam.title) {
                                setCurrentExam(prev => ({ ...prev, title: `Exam - ${new Date().toLocaleDateString()}` }));
                              }
                              saveExam();
                            }}
                            disabled={!isSaveButtonEnabled() || isExamSaving}
                            className="bg-gradient-to-r from-green-600 to-teal-600 text-white border-0"
                          >
                            {isExamSaving ? (
                              <>
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                                Saving...
                              </>
                            ) : (
                              "Save Exam"
                            )}
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4 max-h-[600px] overflow-y-auto">
                          {examQuestions.map((question, index) => (
                            <div key={question.id} className={`border rounded-lg p-4 ${editingQuestionId === question.id ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                              <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{question.type}</Badge>
                                  <Badge>{question.points} pt{question.points !== 1 ? 's' : ''}</Badge>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => editQuestion(question.id)}
                                    disabled={editingQuestionId === question.id}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeQuestion(question.id)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <p className="font-medium mb-2 text-foreground">{index + 1}. {question.question}</p>
                              {question.options && (
                                <div className="text-sm text-muted-foreground">
                                  Options: {question.options.join(", ")}
                                </div>
                              )}
                              <div className="text-sm text-green-600 dark:text-green-400">
                                Correct: {Array.isArray(question.correctAnswer) ? question.correctAnswer.join(", ") : question.correctAnswer}
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {examQuestions.length === 0 && (
                    <Card className="bg-card/80 backdrop-blur border-0">
                      <CardContent className="text-center py-12">
                        <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="text-lg font-medium mb-2 text-foreground">No questions yet</h3>
                        <p className="text-muted-foreground">Generate questions with AI or add them manually</p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="saved">
              {savedExams.length === 0 ? (
                <Card className="bg-card/80 backdrop-blur border-0">
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <h3 className="text-lg font-medium mb-2 text-foreground">No saved exams</h3>
                    <p className="text-muted-foreground">Create and save exams to reuse them later</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {savedExams.map((exam) => (
                    <Card key={exam.id} className="bg-card/80 backdrop-blur border-0 hover:shadow-lg transition-shadow">
                      <CardContent className="p-4">
                        <div className="flex gap-4">
                          {/* Left column - exam info */}
                          <div className="flex-1 min-w-0 flex flex-col justify-between">
                            <div>
                              <CardTitle className="text-card-foreground text-lg leading-tight mb-1">{exam.title}</CardTitle>
                              {exam.description && (
                                <CardDescription className="text-sm mb-3">{exam.description}</CardDescription>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-2">
                              <Badge variant="secondary" className="text-xs">
                                {exam.num_of_questions} questions
                              </Badge>
                              {exam.time_limit && (
                                <Badge variant="outline" className="flex items-center gap-1 text-xs">
                                  <Clock className="h-3 w-3" />
                                  {exam.time_limit} min
                                </Badge>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {exam.points} points
                              </Badge>
                              <div className="text-xs text-muted-foreground">
                                Created {exam.createdAt.toLocaleDateString()}
                              </div>
                            </div>
                          </div>

                          {/* Right column - action buttons */}
                          <div className="flex flex-col gap-2 md:flex-row md:gap-2">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/exam-details?examId=${exam.id}`)}
                              className="bg-gradient-to-r from-green-600 to-teal-600 text-white flex-shrink-0 min-w-[80px] order-1 md:order-3"
                            >
                              <Play className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline ml-1">Take Exam</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setLoadingExamId(exam.id);
                                loadSavedExam(exam.id);
                              }}
                              disabled={loadingExamId === exam.id}
                              className="flex-shrink-0 min-w-[80px] order-2 md:order-2"
                            >
                              {loadingExamId === exam.id ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Edit className="h-4 w-4 mr-1" />
                              )}
                              <span className="hidden sm:inline ml-1">Edit Exam</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => deleteSavedExam(exam.id)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 min-w-[80px] order-3 md:order-1"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              <span className="hidden sm:inline ml-1">Delete</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="history">
              <Card className="bg-card/80 backdrop-blur border-0">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-card-foreground">
                    <History className="h-5 w-5" />
                    Exam History
                  </CardTitle>
                  <CardDescription>View your past exam attempts and results</CardDescription>
                </CardHeader>
                <CardContent className="p-2 pt-0 md:p-6 md:pt-6">
                  {examHistory.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                      <h3 className="text-lg font-medium mb-2 text-foreground">No exam history</h3>
                      <p className="text-muted-foreground">Complete some exams to see your history here</p>
                    </div>
                  ) : (
                    <VirtualizedExamHistory
                       examHistory={examHistory}
                       onViewAttempt={viewExamAttempt}
                       isLoadingExamForView={isLoadingExamForView}
                       formatTime={formatTime}
                     />
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={!!examToDelete} onOpenChange={() => setExamToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Exam</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete "{examToDelete?.title}"? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDeleteExam}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    );
  } catch (error) {
    console.error("Error rendering ExamMode:", error);
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-purple-900">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Exam Mode</h1>
            <p className="text-gray-600">Please try refreshing the page.</p>
          </div>
        </div>
      </div>
    );
  }
};

export default ExamMode;