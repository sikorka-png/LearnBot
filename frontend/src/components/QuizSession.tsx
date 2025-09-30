import axios from "axios";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Clock, CheckCircle, XCircle, Trophy, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

interface QuizQuestion {
  id?: string;
  topic: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
}

interface QuizSessionProps {
  card_id: number;
  topic: string;
  onComplete: (score: number) => void;
  onCancel: () => void;
  questions?: QuizQuestion[];
  timeLimit?: number;
}

const QuizSession = ({ card_id, topic, onComplete, onCancel, questions: providedQuestions, timeLimit = 300 }: QuizSessionProps) => {
  const [questions] = useState<QuizQuestion[]>(providedQuestions);

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [isTimerActive, setIsTimerActive] = useState(true);

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const isValidQuestion = currentQuestion && currentQuestion.question && currentQuestion.question.trim() !== "";

  useEffect(() => {
    if (isTimerActive && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (timeLeft === 0) {
      finishQuiz();
    }
  }, [timeLeft, isTimerActive]);

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (value: string) => {
    setSelectedAnswer(value);
  };

  const submitAnswer = () => {
    if (!selectedAnswer) {
      toast.error("Please select an answer");
      return;
    }

    const answerIndex = parseInt(selectedAnswer);
    const newAnswers = [...answers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setAnswers(newAnswers);

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      setSelectedAnswer("");
    } else {
      finishQuiz();
    }
  };

  const finishQuiz = () => {
    setIsTimerActive(false);
    processExamResults();
  };

  const sendQuizResults = async (results: { topic: string; correct: boolean }[]) => {
    try {
      await axios.post(
        "http://localhost:8000/quiz/results",
        {
          study_card_id: card_id,
          results: results
        },
        { withCredentials: true }
      );
    } catch (error) {
      toast.error("Failed to send quiz results");
    }
  };

  const processExamResults = () => {
    setShowResult(true);

    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    const resultsToSend: { topic: string; correct: boolean }[] = [];
    let isCorrect = false;

    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const questionPoints = question.points || 1;
      totalPoints += questionPoints;
      isCorrect = false;

      if (question.options && typeof userAnswer === "number") {
        isCorrect = question.options[userAnswer] === question.correctAnswer;
        if (isCorrect) {
          correctAnswers++;
          earnedPoints += questionPoints;
        }
      }

      resultsToSend.push({
        topic: question.topic,
        correct: isCorrect,
      });
    });
    const score = Math.round((earnedPoints / totalPoints) * 100);
    sendQuizResults(resultsToSend);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "text-green-600 bg-green-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      case "hard": return "text-red-600 bg-red-100";
      default: return "text-gray-600 bg-gray-100";
    }
  };

  // Show error state if no valid questions
  if (!questions || questions.length === 0) {
    return (
      <div className="space-y-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-xl text-red-600">
              <AlertTriangle className="h-6 w-6" />
              No Questions Available
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              There are no questions available for this quiz.
            </p>
            <Button onClick={onCancel} variant="outline">
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show error state if current question is invalid
  if (!isValidQuestion) {
    return (
      <div className="space-y-6">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2 text-xl text-red-600">
              <AlertTriangle className="h-6 w-6" />
              Question Error
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              Question {currentQuestionIndex + 1} appears to be corrupted or incomplete.
            </p>
            <div className="flex gap-2 justify-center">
              <Button onClick={() => {
                if (currentQuestionIndex < questions.length - 1) {
                  setCurrentQuestionIndex(prev => prev + 1);
                } else {
                  finishQuiz();
                }
              }}>
                Skip Question
              </Button>
              <Button onClick={onCancel} variant="outline">
                Exit Quiz
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }


  if (showResult) {
    let correctAnswers = 0;
    let totalPoints = 0;
    let earnedPoints = 0;

    questions.forEach((question, index) => {
      const userAnswer = answers[index];
      const questionPoints = question.points || 1;
      totalPoints += questionPoints;

      if (question.options && typeof userAnswer === "number") {
        if (question.options[userAnswer] === question.correctAnswer) {
          correctAnswers++;
          earnedPoints += questionPoints;
        }
      }
    });

    const score = Math.round((earnedPoints / totalPoints) * 100);

    return (
      <div className="space-y-6">
          <Card className="bg-card/80 backdrop-blur-sm border shadow-lg">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Quiz Complete!</CardTitle>
            <CardDescription>Here are your results</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center space-y-4">
              <div className="text-4xl font-bold text-blue-600">
                {score}%
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-semibold">{Math.round(earnedPoints)}</div>
                  <div className="text-sm text-muted-foreground">Points Earned</div>
                </div>
                <div>
                  <div className="text-2xl font-semibold">{totalPoints}</div>
                  <div className="text-sm text-muted-foreground">Total Points</div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-xl font-semibold text-green-600">{correctAnswers}</div>
                  <div className="text-sm text-muted-foreground">Correct Answers</div>
                </div>
                <div>
                  <div className="text-xl font-semibold">{questions.length}</div>
                  <div className="text-sm text-muted-foreground">Total Questions</div>
                </div>
              </div>

              <div className="mt-6">
                <Button onClick={() => onComplete(score)} className="w-full">
                  Finish Session
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card/80 backdrop-blur-sm border shadow-lg">
          <CardHeader>
            <CardTitle>Question Review</CardTitle>
             <CardDescription>Review your answers and see the correct solutions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-8">
              {questions.map((question, index) => {
                const userAnswer = answers[index];
                let isCorrect = false;
                let userAnswerText = "";

                if (question.options && typeof userAnswer === "number") {
                  isCorrect = question.options[userAnswer] === question.correctAnswer;
                  userAnswerText = question.options[userAnswer] || "No answer";
                }

                return (
                  <div key={question.id} className="border rounded-lg p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">Question {index + 1}</Badge>
                        <Badge variant={isCorrect ? "default" : "destructive"}>
                          {isCorrect ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Correct
                            </>
                          ) : (
                            <>
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Incorrect
                            </>
                          )}
                        </Badge>
                      </div>
                    </div>

                    {/* Question text */}
                    <h4 className="font-medium text-lg text-foreground mb-6">{question.question}</h4>

                    {/* Options layout matching exam mode */}
                    {question.options && (
                      <div>
                        {/* Headers */}
                        <div className="grid grid-cols-12 gap-4 mb-4">
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
                            const isUserAnswer = typeof userAnswer === "number" && userAnswer === optIndex;
                            const isCorrectAnswer = option === question.correctAnswer;

                            return (
                              <div key={optIndex} className="grid grid-cols-12 gap-4 items-center p-3 rounded-lg border">
                                <div className="col-span-8">
                                  <span className="text-sm text-foreground">
                                    <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                                    {option}
                                  </span>
                                </div>
                                <div className="col-span-2 flex justify-center ml-4">
                                  <Checkbox checked={isUserAnswer} disabled />
                                </div>
                                <div className="col-span-2 flex justify-center ml-4">
                                  <Checkbox checked={isCorrectAnswer} disabled />
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanation if incorrect */}
                        {!isCorrect && question.explanation && (
                          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Explanation: </span>
                            <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                              {question.explanation}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {currentQuestion.difficulty && (
            <Badge className={getDifficultyColor(currentQuestion.difficulty)}>
              {currentQuestion.difficulty}
            </Badge>
          )}
          <span className="text-sm text-muted-foreground">
            Question {currentQuestionIndex + 1} of {questions.length}
          </span>
        </div>
        <div className="flex items-center gap-2 text-lg font-mono">
          <Clock className="h-5 w-5" />
          <span className={timeLeft < 60 ? "text-red-500" : ""}>
            {formatTime(timeLeft)}
          </span>
        </div>
      </div>

      <Progress value={progress} className="h-2" />

      <Card className="bg-white/90 backdrop-blur">
        <CardHeader>
          <CardTitle className="text-xl">{currentQuestion.question}</CardTitle>
        </CardHeader>
        <CardContent>
          {currentQuestion.options && currentQuestion.options.length > 0 ? (
            <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect}>
              <div className="space-y-3">
                {currentQuestion.options.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2 p-3 rounded-lg hover:bg-accent cursor-pointer">
                    <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                    <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                      {option}
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          ) : (
            <div className="text-center py-8">
              <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-amber-500" />
              <p className="text-muted-foreground">
                This question appears to be missing options or has an unsupported format.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          Exit Quiz
        </Button>
        <Button
          onClick={submitAnswer}
          disabled={!selectedAnswer}
        >
          {currentQuestionIndex === questions.length - 1 ? "Finish Quiz" : "Next Question"}
        </Button>
      </div>
    </div>
  );
};

export default QuizSession;