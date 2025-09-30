import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, XCircle, RotateCcw, Trophy, Target, Clock, Star } from "lucide-react";

interface FlashcardSummaryProps {
  totalCards: number;
  originalTotalCards: number;
  correctCount: number;
  incorrectCount: number;
  totalKnownCards: number; // Total cards user knows across all sessions
  reviewPile: string[];
  timeSpent: number;
  onRestart: () => void;
  onStudyIncorrect: () => void;
  onExit: () => void;
}

const FlashcardSummary = ({
  totalCards,
  originalTotalCards,
  correctCount,
  incorrectCount,
  totalKnownCards,
  reviewPile,
  timeSpent,
  onRestart,
  onStudyIncorrect,
  onExit
}: FlashcardSummaryProps) => {
  const score = Math.round((totalKnownCards / originalTotalCards) * 100);
  const accuracy = originalTotalCards > 0 ? Math.round((totalKnownCards / originalTotalCards) * 100) : 0;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getPerformanceMessage = (score: number) => {
    if (score >= 90) return "Excellent work! 🎉";
    if (score >= 70) return "Good job! Keep it up! 👍";
    if (score >= 50) return "Not bad! Room for improvement 📚";
    return "Keep studying! You'll get there! 💪";
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Trophy className="h-8 w-8 text-yellow-500" />
          <h2 className="text-3xl font-bold">Session Complete!</h2>
        </div>
        <p className="text-muted-foreground">Here's how you performed</p>
      </div>

      {/* Score Card */}
      <Card className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5" />
        <CardContent className="relative p-8 text-center">
          <div className="space-y-4">
            <div className={`text-6xl font-bold ${getScoreColor(score)}`}>
              {score}%
            </div>
            <div className="text-xl font-medium">
              {getPerformanceMessage(score)}
            </div>
            <Progress value={accuracy} className="h-3 mx-auto max-w-xs" />
          </div>
        </CardContent>
      </Card>

      {/* Statistics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4 text-center hover-scale">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Target className="h-5 w-5 text-blue-500" />
            <span className="text-sm font-medium">Known</span>
          </div>
          <div className="text-2xl font-bold">{totalKnownCards}/{originalTotalCards}</div>
        </Card>

        <Card className="p-4 text-center hover-scale">
          <div className="flex items-center justify-center gap-2 mb-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="text-sm font-medium">Correct</span>
          </div>
          <div className="text-2xl font-bold text-green-600">{correctCount}</div>
        </Card>

        <Card className="p-4 text-center hover-scale">
          <div className="flex items-center justify-center gap-2 mb-2">
            <XCircle className="h-5 w-5 text-red-500" />
            <span className="text-sm font-medium">Incorrect</span>
          </div>
          <div className="text-2xl font-bold text-red-600">{incorrectCount}</div>
        </Card>

      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Performance Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium mb-2">Accuracy Rate</h4>
              <div className="flex items-center gap-2">
                <Progress value={accuracy} className="flex-1 h-2" />
                <span className="text-sm font-medium">{accuracy}%</span>
              </div>
            </div>
            <div>
              <h4 className="font-medium mb-2">Cards for Review</h4>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <RotateCcw className="h-3 w-3" />
                  {reviewPile.length} cards
                </Badge>
                {reviewPile.length > 0 && (
                  <span className="text-sm text-muted-foreground">
                    Review these to improve!
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Suggestions */}
          <div className="bg-primary/5 p-4 rounded-lg">
            <h4 className="font-medium mb-2">💡 Study Suggestions</h4>
            <ul className="text-sm text-muted-foreground space-y-1">
              {score >= 90 && (
                <li>• Excellent! Try increasing difficulty or explore advanced topics</li>
              )}
              {score >= 70 && score < 90 && (
                <li>• Good progress! Review incorrect answers and practice more</li>
              )}
              {score < 70 && (
                <li>• Focus on understanding core concepts before moving forward</li>
              )}
              {reviewPile.length > 0 && (
                <li>• Review the {reviewPile.length} cards you got wrong</li>
              )}
              <li>• Consistent daily practice leads to better retention</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3 justify-center flex-wrap">
        <Button onClick={onRestart} variant="outline" className="gap-2">
          <RotateCcw className="h-4 w-4" />
          Study Again
        </Button>
        {reviewPile.length > 0 && (
          <Button onClick={onStudyIncorrect} variant="outline" className="gap-2 border-red-200 hover:bg-red-50">
            <XCircle className="h-4 w-4 text-red-500" />
            Study Incorrect Only
          </Button>
        )}
        <Button onClick={onExit} className="gap-2">
          <CheckCircle className="h-4 w-4" />
          Back to Study Mode
        </Button>
      </div>
    </div>
  );
};

export default FlashcardSummary;