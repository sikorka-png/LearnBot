import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, Eye, Clock, CalendarDays, Trophy, Target } from "lucide-react";

interface ExamQuestion {
  id: string;
  type: "multiple-choice" | "true-false" | "short-answer" | "abcd";
  question: string;
  options?: string[];
  correctAnswer: string | string[];
  userAnswer?: string;
  points: number;
}

interface ExamAttempt {
  id: string;
  examId: string;
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

interface ExamHistoryListProps {
  examHistory: ExamAttempt[];
  onViewAttempt: (attempt: ExamAttempt) => void;
}

const ExamHistoryList = ({ examHistory, onViewAttempt }: ExamHistoryListProps) => {
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 90) return "text-green-600 dark:text-green-400";
    if (percentage >= 80) return "text-blue-600 dark:text-blue-400";
    if (percentage >= 70) return "text-yellow-600 dark:text-yellow-400";
    if (percentage >= 60) return "text-orange-600 dark:text-orange-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreBadgeVariant = (percentage: number) => {
    if (percentage >= 90) return "default";
    if (percentage >= 80) return "secondary";
    if (percentage >= 70) return "outline";
    return "destructive";
  };

  if (examHistory.length === 0) {
    return (
      <Card className="bg-card/80 backdrop-blur border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-card-foreground">
            <History className="h-5 w-5" />
            Exam History
          </CardTitle>
          <CardDescription>View your past exam attempts and results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2 text-foreground">No exam history</h3>
            <p className="text-muted-foreground">Complete some exams to see your history here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card/80 backdrop-blur border-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <History className="h-5 w-5" />
          Exam History
        </CardTitle>
        <CardDescription>View your past exam attempts and results</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[600px]">
          <div className="p-6 space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="py-4">Exam</TableHead>
                    <TableHead className="py-4">Date</TableHead>
                    <TableHead className="py-4">Score</TableHead>
                    <TableHead className="py-4">Time</TableHead>
                    <TableHead className="text-right py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examHistory.map((attempt) => (
                    <TableRow key={attempt.id} className="hover:bg-muted/50">
                      <TableCell className="py-4">
                        <div>
                          <div className="font-medium text-foreground">{attempt.examTitle}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {attempt.totalQuestions} questions • {attempt.totalPoints} points
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="text-sm font-medium">
                              {attempt.completedAt.toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {attempt.completedAt.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className={`font-medium ${getScoreColor(attempt.percentage)}`}>
                              {attempt.percentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {attempt.score}/{attempt.totalPoints}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium">
                            {formatTime(attempt.timeSpent)}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right py-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewAttempt(attempt)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
              {examHistory.map((attempt) => (
                <Card key={attempt.id} className="border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex justify-between items-start">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium text-foreground truncate">
                            {attempt.examTitle}
                          </h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {attempt.totalQuestions} questions • {attempt.totalPoints} points
                          </p>
                        </div>
                        <Badge variant={getScoreBadgeVariant(attempt.percentage)} className="ml-2">
                          {attempt.percentage.toFixed(1)}%
                        </Badge>
                      </div>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        <div className="flex items-center gap-2">
                          <CalendarDays className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <div className="font-medium">
                              {attempt.completedAt.toLocaleDateString()}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {attempt.completedAt.toLocaleTimeString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {formatTime(attempt.timeSpent)}
                          </span>
                        </div>
                      </div>

                      {/* Score breakdown */}
                      <div className="flex items-center justify-between pt-2 border-t border-border/50">
                        <div className="flex items-center gap-2">
                          <Target className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {attempt.correctAnswers}/{attempt.totalQuestions} correct
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewAttempt(attempt)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          View
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default ExamHistoryList;