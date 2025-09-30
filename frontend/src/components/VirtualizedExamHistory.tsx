import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';
import { Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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
  questions: any[]; // includes user answers
  aiFeedback?: { [questionId: string]: string }; // AI feedback for text answers
}

interface VirtualizedExamHistoryProps {
  examHistory: ExamAttempt[];
  onViewAttempt: (attempt: ExamAttempt) => void;
  isLoadingExamForView: string | null;
  formatTime: (seconds: number) => string;
}

export function VirtualizedExamHistory({
  examHistory,
  onViewAttempt,
  isLoadingExamForView,
  formatTime,
}: VirtualizedExamHistoryProps) {
  const desktopParentRef = useRef<HTMLDivElement>(null);
  const mobileParentRef = useRef<HTMLDivElement>(null);

  const desktopVirtualizer = useVirtualizer({
    count: examHistory.length,
    getScrollElement: () => desktopParentRef.current,
    estimateSize: () => 73,
    overscan: 5,
  });

  const mobileVirtualizer = useVirtualizer({
    count: examHistory.length,
    getScrollElement: () => mobileParentRef.current,
    estimateSize: () => 160,
    overscan: 3,
  });

  const renderDesktopRow = (attempt: ExamAttempt, virtualItem: any) => (
    <div
      key={virtualItem.key}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualItem.size}px`,
        transform: `translateY(${virtualItem.start}px)`,
      }}
      className="flex items-center border-b border-border hover:bg-muted/50"
    >
      <div className="grid grid-cols-5 gap-4 w-full px-6 py-4">
        <div className="flex flex-col">
          <div className="font-medium text-foreground text-sm">{attempt.examTitle}</div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {attempt.totalQuestions} questions • {attempt.totalPoints} points
          </div>
        </div>
        <div className="flex flex-col">
          <div className="text-sm text-foreground font-medium">
            {attempt.completedAt.toLocaleDateString('en-GB')}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {attempt.completedAt.toLocaleTimeString('en-GB')}
          </div>
        </div>
        <div className="flex flex-col">
          <div className="text-sm font-medium text-green-600">
            {attempt.percentage.toFixed(1)}%
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            {attempt.correctAnswers}/{attempt.totalQuestions}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-foreground">{formatTime(attempt.timeSpent)}</span>
        </div>
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewAttempt(attempt)}
            disabled={isLoadingExamForView === attempt.id}
            className="text-sm h-8 px-3"
          >
            {isLoadingExamForView === attempt.id ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-1" />
            )}
            View
          </Button>
        </div>
      </div>
    </div>
  );

  const renderMobileCard = (attempt: ExamAttempt, virtualItem: any) => (
    <div
      key={virtualItem.key}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: `${virtualItem.size}px`,
        transform: `translateY(${virtualItem.start}px)`,
      }}
      className="px-4 py-4"
    >
      <Card className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="flex-1 min-w-0">
              <h4 className="font-medium text-foreground truncate">{attempt.examTitle}</h4>
              <p className="text-sm text-muted-foreground">
                {attempt.correctAnswers}/{attempt.totalQuestions} correct
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onViewAttempt(attempt)}
              disabled={isLoadingExamForView === attempt.id}
              className="ml-2 shrink-0"
            >
              {isLoadingExamForView === attempt.id ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </Button>
          </div>

          <div className="grid grid-cols-3 gap-3 text-sm">
            <div className="text-center">
              <div className="text-muted-foreground mb-1">Date</div>
              <div className="text-foreground font-medium">
                {attempt.completedAt.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric'
                })}
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground mb-1">Score</div>
              <div className="flex flex-col items-center gap-1">
                <Badge variant={attempt.percentage >= 70 ? "default" : "secondary"} className="text-xs">
                  {attempt.percentage}%
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {attempt.score}/{attempt.totalPoints}
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-muted-foreground mb-1">Time</div>
              <div className="text-foreground font-medium">
                {formatTime(attempt.timeSpent)}
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  if (examHistory.length === 0) {
    return null; // Let parent handle empty state
  }

  return (
    <div className="space-y-4">
      {/* Desktop View */}
      <div className="hidden md:block">
        <div>
          {/* Header */}
          <div className="grid grid-cols-5 gap-4 px-6 py-3 bg-muted/30 border-b font-medium text-sm text-muted-foreground">
            <div>Exam</div>
            <div>Date</div>
            <div>Score</div>
            <div>Time</div>
            <div className="text-right">Actions</div>
          </div>

          {/* Virtualized Content */}
          <div
            ref={desktopParentRef}
            className="h-96 overflow-auto custom-scrollbar"
          >
            <div
              style={{
                height: `${desktopVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {desktopVirtualizer.getVirtualItems().map((virtualItem) => {
                const attempt = examHistory[virtualItem.index];
                return renderDesktopRow(attempt, virtualItem);
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden">
        <div
          ref={mobileParentRef}
          className="h-96 overflow-auto"
        >
          <div
            style={{
              height: `${mobileVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative',
            }}
          >
            {mobileVirtualizer.getVirtualItems().map((virtualItem) => {
              const attempt = examHistory[virtualItem.index];
              return renderMobileCard(attempt, virtualItem);
            })}
          </div>
        </div>
      </div>
    </div>
  );
}