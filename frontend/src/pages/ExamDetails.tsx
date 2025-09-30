import axios from "axios";
import {useState, useEffect, useRef} from "react";
import {useParams, useNavigate, useSearchParams} from "react-router-dom";
import {Button} from "@/components/ui/button";
import {Card, CardContent, CardDescription, CardHeader, CardTitle} from "@/components/ui/card";
import {Badge} from "@/components/ui/badge";
import {Textarea} from "@/components/ui/textarea";
import {RadioGroup, RadioGroupItem} from "@/components/ui/radio-group";
import {Checkbox} from "@/components/ui/checkbox";
import {Label} from "@/components/ui/label";
import {Input} from "@/components/ui/input";
import {ScrollArea} from "@/components/ui/scroll-area";
import {Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose} from "@/components/ui/sheet";
import {
    Clock,
    Play,
    RotateCcw,
    CheckCircle2,
    AlertCircle,
    ArrowLeft,
    Check,
    MessageSquare,
    Send,
    Bot,
    User,
    X,
    Loader2
} from "lucide-react";
import Navigation from "@/components/Navigation";
import {toast} from "sonner";

interface ExamQuestion {
    id: string;
    type: "multiple-choice" | "true-false" | "text-answer" | "single-choice";
    question: string;
    options?: string[];
    correctAnswer: string | string[];
    userAnswer?: string | string[];
    points: number;
    aiFeedback?: string;
}

interface SavedExam {
    id: string;
    title: string;
    description: string;
    time_limit: number;
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
    timeSpent: number;
    questions: ExamQuestion[];
    aiFeedback?: { [questionId: string]: string };
}

interface ChatMessage {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: Date;
}

const ExamDetails = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const isViewingAttempt = searchParams.get('view') === 'attempt';
    const examId = searchParams.get('examId');
    const [attemptId, setAttemptId] = useState<string | null>(() => searchParams.get('attemptId'));

    const [exam, setExam] = useState<SavedExam | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [examQuestions, setExamQuestions] = useState<ExamQuestion[]>([]);
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
    const [examStarted, setExamStarted] = useState(false);
    const [examCompleted, setExamCompleted] = useState(false);
    const [timeRemaining, setTimeRemaining] = useState(0);
    const [examStartTime, setExamStartTime] = useState<Date | null>(null);
    const [examResults, setExamResults] = useState<{
        score: number;
        totalPoints: number;
        percentage: number;
        correctAnswers: number;
        totalQuestions: number;
    } | null>(null);
    const [viewingAttempt, setViewingAttempt] = useState<ExamAttempt | null>(null);
    const [isCheckingExam, setIsCheckingExam] = useState(false);

    const [chatOpen, setChatOpen] = useState(false);
    const [chatQuestion, setChatQuestion] = useState<ExamQuestion | null>(null);
    const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState("");
    const [isChatLoading, setIsChatLoading] = useState(false);
    const scrollAreaRef = useRef<HTMLDivElement>(null);
    const chatInputRef = useRef<HTMLInputElement>(null);
    const [chatQuestionIndex, setChatQuestionIndex] = useState<number | null>(null);

    useEffect(() => {
        const fetchExam = async () => {
            try {
                const response = await axios.get(`http://localhost:8000/exam/${examId}`, {withCredentials: true});
                const examData: SavedExam = {
                    ...response.data,
                    createdAt: new Date(response.data.created_at)
                };
                setExam(examData);
                setExamQuestions(
                    examData.questions.map((q) => ({
                        ...q,
                        correctAnswer: q.correct_answer,
                        userAnswer: undefined
                    }))
                );
            } catch (error) {
                console.error("Failed to fetch exam", error);
                toast.error("Exam not found.");
                navigate("/exam-mode");
            } finally {
                setIsLoading(false);
            }
        };

        if (!isViewingAttempt && examId) {
            fetchExam();
        }
    }, [isViewingAttempt, examId, navigate]);

    useEffect(() => {
        const fetchAttempt = async () => {
            if (!attemptId) return;

            try {
                const response = await axios.get(`http://localhost:8000/exam/attempt/${attemptId}`, {
                    withCredentials: true
                });

                const attemptData: ExamAttempt = {
                    ...response.data,
                    questions: response.data.questions,
                    completedAt: new Date(response.data.completed_at)
                };

                setViewingAttempt(attemptData);
                setExam({
                    id: "",
                    title: response.data.exam_title,
                    description: "",
                    time_limit: 0,
                    createdAt: new Date(response.data.completed_at),
                    questions: attemptData.questions
                });
                setExamQuestions(attemptData.questions);
                setExamCompleted(true);

                setExamResults({
                    score: response.data.score,
                    totalPoints: response.data.total_points,
                    percentage: response.data.percentage,
                    correctAnswers: response.data.correct_answers,
                    totalQuestions: response.data.total_questions
                });
            } catch (error) {
                console.error("Failed to fetch attempt", error);
                toast.error("Failed to load exam attempt.");
                navigate("/exam-mode");
            } finally {
                setIsLoading(false);
            }
        };

        if (isViewingAttempt && attemptId) {
            fetchAttempt();
        }
    }, [isViewingAttempt, attemptId, navigate]);


    // Timer effect
    useEffect(() => {
        let interval: NodeJS.Timeout;

        if (examStarted && !examCompleted && timeRemaining > 0) {
            interval = setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        finishExam();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => clearInterval(interval);
    }, [examStarted, examCompleted, timeRemaining]);

    useEffect(() => {
      if (chatOpen && !isChatLoading) {
        chatInputRef.current?.focus();
      }
    }, [chatOpen, isChatLoading]);


    const formatTime = (seconds: number) => {
        const minutes = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${minutes}:${secs.toString().padStart(2, '0')}`;
    };

    const startExam = () => {
        setExamStarted(true);
        setExamStartTime(new Date());
        setTimeRemaining(exam.time_limit * 60);
        setCurrentQuestionIndex(0);
        setExamCompleted(false);
        setExamResults(null);
        toast.success("Exam started! Good luck!");
    };

    const answerQuestion = (answer: string | string[]) => {
        const updatedQuestions = [...examQuestions];
        updatedQuestions[currentQuestionIndex].userAnswer = answer;
        setExamQuestions(updatedQuestions);
    };

    const handleMultipleAnswerToggle = (option: string) => {
        const currentQuestion = examQuestions[currentQuestionIndex];
        const currentAnswers = Array.isArray(currentQuestion.userAnswer) ? currentQuestion.userAnswer : [];

        const newAnswers = currentAnswers.includes(option)
            ? currentAnswers.filter(answer => answer !== option)
            : [...currentAnswers, option];

        answerQuestion(newAnswers);
    };

    const nextQuestion = () => {
        if (currentQuestionIndex < examQuestions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            finishExam();
        }
    };

    const previousQuestion = () => {
        if (currentQuestionIndex > 0) {
            setCurrentQuestionIndex(prev => prev - 1);
        }
    };

    const finishExam = async () => {
        if (!exam || !examStartTime) return;

        setExamStarted(false);

        const hasTextAnswers = examQuestions.some(question => question.type === "text-answer");

        if (hasTextAnswers) {
            setIsCheckingExam(true);

            try {
                const textQuestionsPayload = {
                    exam_id: exam.id,
                    questions: examQuestions
                        .filter(q => q.type === "text-answer")
                        .map(q => ({
                            question_id: Number(q.id),
                            question: q.question,
                            user_answer: q.userAnswer || "",
                            correct_answer: q.correctAnswer
                        }))
                };

                const response = await axios.post("http://localhost:8000/exam/check", textQuestionsPayload, {
                    withCredentials: true
                });

                const feedbackMap: Record<number, string> = {};
                for (const item of response.data) {
                    feedbackMap[item.question_id] = item.response;
                }

                const updated = examQuestions.map(q => {
                    if (q.type === "text-answer") {
                        return {
                            ...q,
                            aiFeedback: feedbackMap[Number(q.id)] || ""
                        };
                    }
                    return q;
                });

                setExamQuestions(updated);
                finalizeExamResults(updated);
            } catch (err) {
                toast.error("AI feedback failed");
                console.error("Check text answers error", err);
            }

            setIsCheckingExam(false);
        } else {
            finalizeExamResults();
        }

    };

    const finalizeExamResults = async (questions: ExamQuestion[] = examQuestions) => {
        setExamCompleted(true);

        // Calculate results
        let correctAnswers = 0;
        let totalPoints = 0;
        let earnedPoints = 0;

        questions.forEach(question => {
            totalPoints += question.points;

            if (question.type === "multiple-choice" && Array.isArray(question.userAnswer)) {
                // Handle multi-select multiple choice
                const correctAnswersArray = Array.isArray(question.correctAnswer)
                    ? question.correctAnswer
                    : [question.correctAnswer];

                const userAnswersSet = new Set(question.userAnswer);
                const correctAnswersSet = new Set(correctAnswersArray);

                // Check if sets are equal
                const isCorrect = userAnswersSet.size === correctAnswersSet.size &&
                    [...userAnswersSet].every(answer => correctAnswersSet.has(answer));

                if (isCorrect) {
                    correctAnswers++;
                    earnedPoints += question.points;
                }
            } else if (question.type === "text-answer") {
                if (question.aiFeedback && question.aiFeedback.toLowerCase() == "ok") {
                    correctAnswers++;
                    earnedPoints += question.points;
                }
            } else if (question.userAnswer.toLowerCase() === question.correctAnswer.toLowerCase()) {
                correctAnswers++;
                earnedPoints += question.points;
            }
        });

        const percentage = Math.round((earnedPoints / totalPoints) * 100);
        const timeSpent = Math.floor((new Date().getTime() - examStartTime.getTime()) / 1000);

        const results = {
            score: earnedPoints,
            totalPoints,
            percentage,
            correctAnswers,
            totalQuestions: examQuestions.length
        };

        setExamResults(results);

        try {
            const response = await axios.post("http://localhost:8000/exam/attempt", {
                exam_id: exam.id,
                exam_title: exam.title,
                completed_at: new Date(),
                score: results.score,
                total_points: results.totalPoints,
                percentage: results.percentage,
                correct_answers: results.correctAnswers,
                total_questions: results.totalQuestions,
                time_spent: timeSpent,
                questions: questions.map(q => ({
                    id: q.id,
                    question: q.question,
                    type: q.type,
                    userAnswer: q.userAnswer,
                    correctAnswer: q.correctAnswer,
                    options: q.options,
                    points: q.points,
                    aiFeedback: q.aiFeedback
                }))
            }, {withCredentials: true});
            setAttemptId(response.data.attempt_id);
            toast.success("Exam attempt saved to server");
        } catch (err) {
            console.error("Failed to save exam attempt:", err);
            toast.error("Failed to save exam attempt");
        }
    };


    const resetExam = () => {
        setExamStarted(false);
        setExamCompleted(false);
        setCurrentQuestionIndex(0);
        setTimeRemaining(0);
        setExamStartTime(null);
        setExamResults(null);
        setExamQuestions(
          exam?.questions.map(q => ({
            ...q,
            correctAnswer: q.correct_answer ?? q.correctAnswer ?? "",
            userAnswer: undefined
          })) || []
        );
    };

    const openChat = (question: ExamQuestion, index: number) => {
        if (chatQuestionIndex === index && chatMessages.length > 0) {
            setChatOpen(true);
            return;
        }

        setChatQuestion(question);
        setChatQuestionIndex(index);
        setChatMessages([
            {
                id: "1",
                content: `I can help explain this question: "${question.question}". What would you like to know about it?`,
                role: "assistant",
                timestamp: new Date()
            }
        ]);
        setChatOpen(true);
    };

    const closeChat = () => {
        setChatOpen(false);
        setChatQuestion(null);
        setChatMessages([]);
        setChatInput("");
    };

    const sendChatMessage = async () => {
        if (!chatInput.trim() || !chatQuestion || chatQuestionIndex === null || !attemptId) return;

        const userMessage: ChatMessage = {
            id: Date.now().toString(),
            content: chatInput,
            role: "user",
            timestamp: new Date()
        };

        setChatMessages(prev => [...prev, userMessage]);
        setChatInput("");
        setIsChatLoading(true);

        try {
            const response = await axios.post(
                `http://localhost:8000/exam/attempt/${attemptId}/question/${chatQuestionIndex}/feedback`, {
                    message: chatInput
                }, {
                    withCredentials: true
                });

            const aiResponse: ChatMessage = {
                id: response.data.id.toString(),
                content: response.data.content,
                role: response.data.role,
                timestamp: new Date(response.data.date)
            };

            setChatMessages(prev => [...prev, aiResponse]);
        } catch (error) {
            console.error("AI response failed:", error);
            toast.error("AI failed to respond.");
        } finally {
            setIsChatLoading(false);
        }
    };


    const handleChatKeyPress = (e: React.KeyboardEvent) => {
        if (!isChatLoading && e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendChatMessage();
        }
    };

    useEffect(() => {
        if (scrollAreaRef.current) {
            const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
            if (scrollContainer) {
                scrollContainer.scrollTop = scrollContainer.scrollHeight;
            }
        }
    }, [chatMessages]);

    if (isLoading) {
      return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
          <Navigation />

          {/* Floating Background Elements */}
          <div className="fixed inset-0 pointer-events-none">
            <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
            <div className="absolute top-20 right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
          </div>

          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <Card className="bg-card/80 backdrop-blur-sm border shadow-lg">
              <CardContent className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
                <h3 className="text-lg font-medium">Loading exam...</h3>
              </CardContent>
            </Card>
          </div>
        </div>
      );
    }

    const currentExamQuestion = examQuestions[currentQuestionIndex];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
            <Navigation/>

            {/* Floating Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
              <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
              <div className="absolute top-20 right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
              <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                <div className="mb-6 flex items-center gap-4">
                    <Button variant="outline" onClick={() => navigate('/exam-mode')}>
                        <ArrowLeft className="h-4 w-4 mr-2"/>
                        Back
                    </Button>
                    <div>
                        {exam && (
                            <>
                                <h1 className="text-3xl font-bold">{exam.title}</h1>
                                <p className="text-muted-foreground">{exam.description}</p>
                            </>
                        )}
                    </div>
                </div>

                {/* Show exam start interface only if not viewing an attempt and not checking exam */}
                {!examStarted && !examCompleted && !isViewingAttempt && !isCheckingExam && (
                    <Card className="bg-card/80 backdrop-blur-sm border shadow-lg">
                        <CardHeader>
                            <CardTitle>Ready to Take Exam</CardTitle>
                            <CardDescription>
                                {exam.questions.length} questions • {exam.time_limit} minutes
                                • {exam.questions.reduce((sum, q) => sum + q.points, 0)} points total
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button onClick={startExam} className="bg-gradient-to-r from-green-600 to-teal-600 text-white">
                                <Play className="h-4 w-4 mr-2"/>
                                Start Exam
                            </Button>
                        </CardContent>
                    </Card>
                )}

                {isCheckingExam && (
                    <Card className="bg-card/80 backdrop-blur-sm border shadow-lg text-center">
                        <CardHeader>
                            <CardTitle className="flex items-center justify-center gap-2 text-xl">
                                <Loader2 className="h-6 w-6 animate-spin text-blue-500"/>
                                Checking Exam
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            <p className="text-muted-foreground mb-4">
                                Please wait while we evaluate your text answers...
                            </p>
                            <div className="flex justify-center">
                                <div className="animate-pulse flex space-x-1">
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-100"></div>
                                    <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce delay-200"></div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Exam Interface */}
                {examStarted && currentExamQuestion && (
                    <div className="space-y-6">
                        {/* Timer and Progress */}
                        <Card className="bg-card/80 backdrop-blur-sm border shadow-lg">
                            <CardContent className="pt-6">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-4">
                                        <Badge variant="outline">
                                            Question {currentQuestionIndex + 1} of {examQuestions.length}
                                        </Badge>
                                        <Badge variant="secondary">{currentExamQuestion.type}</Badge>
                                    </div>
                                    <div className="flex items-center gap-2 text-lg font-mono">
                                        <Clock
                                            className={`h-5 w-5 ${timeRemaining < 300 ? 'text-red-500' : 'text-blue-500'}`}/>
                                        <span className={timeRemaining < 300 ? 'text-red-500' : 'text-blue-500'}>
                      {formatTime(timeRemaining)}
                    </span>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Current Question */}
                        <Card className="bg-card/80 backdrop-blur-sm border shadow-lg">
                            <CardHeader>
                                <CardTitle className="text-lg">{currentExamQuestion.question}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {currentExamQuestion.type === "multiple-choice" && currentExamQuestion.options && (
                                    <div className="space-y-4">
                                        <p className="text-sm text-muted-foreground">Select all correct answers:</p>
                                        <div className="space-y-3">
                                            {currentExamQuestion.options.map((option, index) => (
                                                <div key={index}
                                                     className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                                                    <Checkbox
                                                        id={`option-${index}`}
                                                        checked={Array.isArray(currentExamQuestion.userAnswer) && currentExamQuestion.userAnswer.includes(option)}
                                                        onCheckedChange={() => handleMultipleAnswerToggle(option)}
                                                    />
                                                    <Label htmlFor={`option-${index}`}
                                                           className="flex-1 cursor-pointer">
                                                        <span
                                                            className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                                                        {option}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {currentExamQuestion.type === "single-choice" && currentExamQuestion.options && (
                                    <RadioGroup
                                        value={typeof currentExamQuestion.userAnswer === 'string' ? currentExamQuestion.userAnswer : ""}
                                        onValueChange={(value) => answerQuestion(value)}
                                    >
                                        <div className="space-y-3">
                                            {currentExamQuestion.options.map((option, index) => (
                                                <div key={index}
                                                     className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                                                    <RadioGroupItem value={option} id={`option-${index}`}/>
                                                    <Label htmlFor={`option-${index}`}
                                                           className="flex-1 cursor-pointer">
                                                        <span
                                                            className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                                                        {option}
                                                    </Label>
                                                </div>
                                            ))}
                                        </div>
                                    </RadioGroup>
                                )}

                                {currentExamQuestion.type === "true-false" && (
                                    <RadioGroup
                                        value={typeof currentExamQuestion.userAnswer === 'string' ? currentExamQuestion.userAnswer : ""}
                                        onValueChange={(value) => answerQuestion(value)}
                                    >
                                        <div className="space-y-3">
                                            <div
                                                className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                                                <RadioGroupItem value="true" id="true"/>
                                                <Label htmlFor="true" className="flex-1 cursor-pointer">
                                                    <CheckCircle2 className="h-4 w-4 mr-2 inline"/>
                                                    True
                                                </Label>
                                            </div>
                                            <div
                                                className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-accent cursor-pointer">
                                                <RadioGroupItem value="false" id="false"/>
                                                <Label htmlFor="false" className="flex-1 cursor-pointer">
                                                    <AlertCircle className="h-4 w-4 mr-2 inline"/>
                                                    False
                                                </Label>
                                            </div>
                                        </div>
                                    </RadioGroup>
                                )}

                                {currentExamQuestion.type === "text-answer" && (
                                    <div>
                                        <Textarea
                                            value={typeof currentExamQuestion.userAnswer === 'string' ? currentExamQuestion.userAnswer : ""}
                                            onChange={(e) => answerQuestion(e.target.value)}
                                            placeholder="Enter your answer..."
                                            className="min-h-24"
                                        />
                                    </div>
                                )}

                                <div className="flex justify-between pt-4">
                                    <Button
                                        variant="outline"
                                        onClick={previousQuestion}
                                        disabled={currentQuestionIndex === 0}
                                    >
                                        Previous
                                    </Button>
                                    <Button
                                        onClick={nextQuestion}
                                        disabled={
                                            currentExamQuestion.type === "multiple-choice"
                                                ? !Array.isArray(currentExamQuestion.userAnswer) || currentExamQuestion.userAnswer.length === 0
                                                : !currentExamQuestion.userAnswer
                                        }
                                        className="bg-gradient-to-r from-blue-600 to-purple-600 text-white"
                                    >
                                        {currentQuestionIndex === examQuestions.length - 1 ? "Finish Exam" : "Next Question"}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Exam Results with detailed review - shown for both completed exams and viewed attempts */}
                {(examCompleted || isViewingAttempt) && examResults && (
                    <div className="space-y-6">
                        <Card className="bg-card/80 backdrop-blur-sm border shadow-lg">
                            <CardHeader className="text-center">
                                <CardTitle className="text-2xl">
                                    {isViewingAttempt ? "Exam Results" : "Exam Completed!"}
                                </CardTitle>
                                <CardDescription>
                                    {isViewingAttempt ? "Review your exam attempt" : "Here are your results"}
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center space-y-4">
                                    <div className="text-4xl font-bold text-blue-600">
                                        {examResults.percentage}%
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <div className="text-2xl font-semibold">{examResults.score}</div>
                                            <div className="text-sm text-muted-foreground">Points Earned</div>
                                        </div>
                                        <div>
                                            <div className="text-2xl font-semibold">{examResults.totalPoints}</div>
                                            <div className="text-sm text-muted-foreground">Total Points</div>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4 text-center">
                                        <div>
                                            <div
                                                className="text-xl font-semibold text-green-600">{examResults.correctAnswers}</div>
                                            <div className="text-sm text-muted-foreground">Correct Answers</div>
                                        </div>
                                        <div>
                                            <div className="text-xl font-semibold">{examResults.totalQuestions}</div>
                                            <div className="text-sm text-muted-foreground">Total Questions</div>
                                        </div>
                                    </div>

                                    <div className="pt-4 flex gap-2 justify-center">
                                        {!isViewingAttempt && (
                                            <Button onClick={resetExam} variant="outline">
                                                <RotateCcw className="h-4 w-4 mr-2"/>
                                                Retake Exam
                                            </Button>
                                        )}
                                        <Button onClick={() => navigate('/exam-mode')}
                                                className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                            Back to Exam Mode
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Detailed Question Review */}
                        <Card className="bg-card/80 backdrop-blur-sm border shadow-lg">
                            <CardHeader>
                                <CardTitle>Question Review</CardTitle>
                                <CardDescription>Review your answers and see the correct solutions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-8">
                                    {examQuestions.map((question, index) => {
                                        // Determine if the answer is correct
                                        let isCorrect = false;
                                        if (question.type === "multiple-choice" && Array.isArray(question.userAnswer)) {
                                            const correctAnswersArray = Array.isArray(question.correctAnswer)
                                                ? question.correctAnswer
                                                : [question.correctAnswer];
                                            const userAnswersSet = new Set(question.userAnswer);
                                            const correctAnswersSet = new Set(correctAnswersArray);
                                            isCorrect = userAnswersSet.size === correctAnswersSet.size &&
                                                [...userAnswersSet].every(answer => correctAnswersSet.has(answer));
                                        } else if (question.type === "text-answer") {
                                            isCorrect = question.aiFeedback?.toLowerCase?.() === "ok";
                                        } else {
                                            isCorrect = question.userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
                                        }

                                        return (
                                            <div key={question.id} className="border rounded-lg p-6">
                                                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                                                    {/* Mobile layout: Question info in first column, Ask AI next to it */}
          <div className="flex sm:hidden flex-col">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  <span>Q.{index + 1}</span>
                </Badge>
                <Badge variant={isCorrect ? "default" : "destructive"}>
                  {isCorrect ? (
                    <>
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Correct
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3 mr-1" />
                      Incorrect
                    </>
                  )}
                </Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => openChat(question)}
                className="gap-2 min-[375px]:flex hidden"
              >
                <MessageSquare className="h-4 w-4" />
                Ask AI
              </Button>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => openChat(question)}
              className="gap-2 max-[374px]:flex hidden w-fit"
            >
              <MessageSquare className="h-4 w-4" />
              Ask AI
            </Button>
          </div>

                          {/* Desktop layout: Original stacked layout */}
                          <div className="hidden sm:flex sm:flex-row sm:items-center gap-2 sm:gap-3">
                            <Badge variant="outline">
                              <span>Question {index + 1}</span>
                                                        </Badge>
                                                        <Badge variant={isCorrect ? "default" : "destructive"}>
                                                            {isCorrect ? (
                                                                <>
                                                                    <CheckCircle2 className="h-3 w-3 mr-1"/>
                                                                    Correct
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <AlertCircle className="h-3 w-3 mr-1"/>
                                                                    Incorrect
                                                                </>
                                                            )}
                                                        </Badge>
                                                    </div>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        onClick={() => openChat(question, index)}
                                                        className="hidden sm:flex gap-2"
                                                    >
                                                        <MessageSquare className="h-4 w-4"/>
                                                        Ask AI
                                                    </Button>
                                                </div>

                                                {/* Question text - positioned higher above columns */}
                                                <h4 className="font-medium text-lg text-foreground mb-6">{question.question}</h4>

                                                {/* Layout for multiple choice and ABCD questions - new preferred layout */}
                                                {((question.type === "multiple-choice" || question.type === "single-choice") && question.options) && (
                                                    <div>
                                                        {/* Headers */}
                                                        <div className="hidden sm:grid grid-cols-12 gap-4 mb-4">
                                                            <div className="col-span-8"></div>
                                                            <div className="col-span-2 text-center">
                                                                <h5 className="font-semibold text-foreground">Your Answer</h5>
                               </div>
                               <div className="col-span-2 text-center">
                                 <h5 className="font-semibold text-foreground">Correct Answer</h5>
                                                            </div>
                                                        </div>

                                                        {/* Options with checkboxes */}
                                                        <div className="space-y-3">
                                                            {question.options.map((option, optIndex) => {
                                                                const isUserAnswer = Array.isArray(question.userAnswer)
                                                                    ? question.userAnswer.includes(option)
                                                                    : question.userAnswer === option;

                                                                const isCorrectAnswer = Array.isArray(question.correctAnswer)
                                                                    ? question.correctAnswer.includes(option)
                                                                    : question.correctAnswer === option;

                                                                return (
                                                                    <div key={optIndex} className="p-3 rounded-lg border">
                                                                    <div className="sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
                                                                    <div className="sm:col-span-8 mb-3 sm:mb-0">
                                                                       <span className="text-sm text-foreground">
                                                                         <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                                                                         {option}
                                                                       </span>
                                                                    </div>
                                                                    <div className="flex sm:hidden justify-between items-center mb-3">
                                         <div className="flex items-center gap-2">
                                           <span className="text-xs font-medium text-muted-foreground">Y.A.:</span>
                                           <Checkbox checked={isUserAnswer} disabled />
                                         </div>
                                         <div className="flex items-center gap-2">
                                           <span className="text-xs font-medium text-muted-foreground">C.A.:</span>
                                           <Checkbox checked={isCorrectAnswer} disabled />
                                         </div>
                                                                    </div>
                                                                    <div className="hidden sm:block sm:col-span-2 sm:flex sm:justify-center">
                                                                      <Checkbox checked={isUserAnswer} disabled />
                                                                    </div>
                                                                    <div className="hidden sm:block sm:col-span-2 sm:flex sm:justify-center">
                                                                      <Checkbox checked={isCorrectAnswer} disabled />
                                                                    </div>
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Layout for True/False questions - same new layout */}
                                                {question.type === "true-false" && (
                                                    <div>
                                                        {/* Headers */}
                                                        <div className="hidden sm:grid grid-cols-12 gap-4 mb-4">
                                                            <div className="col-span-8"></div>
                                                            <div className="col-span-2 text-center">
                                                                <h5 className="font-semibold text-foreground">Your Answer</h5>
                               </div>
                               <div className="col-span-2 text-center">
                                 <h5 className="font-semibold text-foreground">Correct Answer</h5>
                                                            </div>
                                                        </div>

                                                        {/* True/False options with checkboxes */}
                                                        <div className="space-y-3">
                                                            {["true", "false"].map((option) => {
                                                                const isUserAnswer = question.userAnswer?.toLowerCase?.() === option;
                                                                const isCorrectAnswer = question.correctAnswer?.toLowerCase?.() === option;

                                                                return (
                                    <div key={option} className="p-3 rounded-lg border">
                                      <div className="sm:grid sm:grid-cols-12 sm:gap-4 sm:items-center">
                                        <div className="sm:col-span-8 mb-3 sm:mb-0">
                                          <span className="text-sm capitalize text-foreground">{option}</span>
                                        </div>
                                        <div className="flex sm:hidden justify-between items-center mb-3">
                                           <div className="flex items-center gap-2">
                                             <span className="text-xs font-medium text-muted-foreground">Y.A.:</span>
                                             <Checkbox checked={isUserAnswer} disabled />
                                           </div>
                                           <div className="flex items-center gap-2">
                                             <span className="text-xs font-medium text-muted-foreground">C.A.:</span>
                                             <Checkbox checked={isCorrectAnswer} disabled />
                                          </div>
                                        </div>
                                        <div className="hidden sm:block sm:col-span-2 sm:flex sm:justify-center">
                                          <Checkbox checked={isUserAnswer} disabled />
                                        </div>
                                        <div className="hidden sm:block sm:col-span-2 sm:flex sm:justify-center">
                                          <Checkbox checked={isCorrectAnswer} disabled />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                                            })}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Layout for Short Answer questions - now stacked vertically */}
                                                {question.type === "text-answer" && (
                                                    <div className="space-y-4">
                                                        <div>
                               <h5 className="font-semibold text-foreground mb-2">Your Answer:</h5>
                               <div className="p-3 bg-muted rounded border text-sm text-foreground">
                                 {question.userAnswer || "No answer provided"}
                               </div>
                             </div>
                             <div>
                               <h5 className="font-semibold text-foreground mb-2">Correct Answer:</h5>
                               <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border text-sm text-green-700 dark:text-green-300">
                                 {question.correctAnswer}
                               </div>
                             </div>
                                                    </div>
                                                )}

                                                {/* AI Feedback for short answers */}
                                                {question.type === "text-answer" && (
                                                    <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                             <span className="text-sm font-medium text-blue-800 dark:text-blue-300">AI Feedback: </span>
                             <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                               {question.aiFeedback || (
                                                                isCorrect
                                                                    ? "Great job! Your answer demonstrates a good understanding of the topic."
                                                                    : "Your answer could be improved. The correct answer provides more comprehensive coverage of the key concepts."
                                                            )}
                             </p>
                           </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Floating Chat Button - only show when chat is closed and we have exam results */}
                {!chatOpen && (examCompleted || isViewingAttempt) && (
                    <Button
                        onClick={() => {
                            if (chatQuestion && chatQuestionIndex !== null) {
                                openChat(chatQuestion, chatQuestionIndex);
                            } else {
                                openChat(examQuestions[0], 0);
                            }
                        }}
                        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 z-40"
                        size="icon"
                    >
                        <MessageSquare className="h-6 w-6 text-white" />
                    </Button>
                )}

                {/* Chat Sheet */}
                <Sheet open={chatOpen} onOpenChange={setChatOpen}>
                    <SheetContent side="right" className="w-[95vw] sm:w-[540px] flex flex-col h-full p-0 border-none">
                        <SheetHeader className="p-6 pb-4 flex-shrink-0">
                            <SheetTitle>AI Explanation</SheetTitle>
                            <SheetClose asChild>
                                <Button variant="ghost" size="icon" onClick={closeChat}
                                        className="absolute right-4 top-4">
                                    <X className="h-4 w-4"/>
                                </Button>
                            </SheetClose>
                        </SheetHeader>

                        <div className="flex flex-col flex-1 min-h-0 px-6">
                            <ScrollArea ref={scrollAreaRef} className="flex-1 pr-4 mb-4">
                                <div className="space-y-4">
                                    {chatMessages.map((message) => (
                                        <div
                                            key={message.id}
                                            className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
                                        >
                                            <div
                                                className={`flex gap-3 max-w-[85%] ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                                                <div
                                                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                                                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"
                                                    }`}>
                                                    {message.role === "user" ? <User className="h-4 w-4"/> :
                                                        <Bot className="h-4 w-4"/>}
                                                </div>
                                                <div className={`rounded-lg p-3 ${
                                                    message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"
                                                }`}>
                                                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                                                    <p className="text-xs opacity-70 mt-1">
                                                        {message.timestamp.toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}

                                    {isChatLoading && (
                                        <div className="flex gap-3 justify-start">
                                            <div
                                                className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
                                                <Bot className="h-4 w-4"/>
                                            </div>
                                            <div className="bg-muted rounded-lg p-3">
                                                <div className="flex gap-1">
                                                    <div
                                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                                                    <div
                                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                                                    <div
                                                        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </ScrollArea>

                            <div className="flex gap-2 pb-6 flex-shrink-0">
                                <Input
                                    ref={chatInputRef}
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Ask about this question..."
                                    onKeyPress={handleChatKeyPress}
                                    className="flex-1"
                                />
                                <Button onClick={sendChatMessage} disabled={!chatInput.trim() || isChatLoading}>
                                    <Send className="h-4 w-4"/>
                                </Button>
                            </div>
                        </div>
                    </SheetContent>
                </Sheet>
            </div>
        </div>
    );
};

export default ExamDetails;