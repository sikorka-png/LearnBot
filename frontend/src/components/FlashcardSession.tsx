import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, RotateCcw, ArrowLeft, ArrowRight, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { FlashcardSet } from "./FlashcardSetManager";
import FlashcardSummary from "./FlashcardSummary";

interface FlashcardSessionProps {
  flashcardSet: FlashcardSet;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const FlashcardSession = ({ flashcardSet, onComplete, onCancel }: FlashcardSessionProps) => {
  const [flashcards, setFlashcards] = useState(flashcardSet.flashcards);
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [incorrectCount, setIncorrectCount] = useState(0);
  const [reviewPile, setReviewPile] = useState<string[]>([]);
  const [studyMode, setStudyMode] = useState<'study' | 'test'>('test');
  const [sessionComplete, setSessionComplete] = useState(false);
  const [knownCards, setKnownCards] = useState<Set<string>>(new Set()); // Track cards known across sessions

  const currentCard = flashcards[currentIndex];
  const progress = ((currentIndex + 1) / flashcards.length) * 100;

  // Show summary if session is complete
  if (sessionComplete) {
    return (
      <FlashcardSummary
        totalCards={flashcards.length}
        originalTotalCards={flashcardSet.flashcards.length}
        correctCount={correctCount}
        incorrectCount={incorrectCount}
        totalKnownCards={knownCards.size} // Use total known cards across sessions
        reviewPile={reviewPile}
        timeSpent={0}
        onRestart={() => {
          setCurrentIndex(0);
          setIsFlipped(false);
          setCorrectCount(0);
          setIncorrectCount(0);
          setReviewPile([]);
          setSessionComplete(false);
          setFlashcards(flashcardSet.flashcards);
          setKnownCards(new Set());
        }}
        onStudyIncorrect={() => {
          const incorrectCards = flashcardSet.flashcards.filter(card => reviewPile.includes(card.id));
          setFlashcards(incorrectCards);
          setCurrentIndex(0);
          setIsFlipped(false);
          setCorrectCount(0);
          setIncorrectCount(0);
          setReviewPile([]);
          setSessionComplete(false);
        }}
        onExit={() => onComplete(Math.round((knownCards.size / flashcardSet.flashcards.length) * 100))}
      />
    );
  }

  const shuffleCards = () => {
    const shuffled = [...flashcards].sort(() => Math.random() - 0.5);
    setFlashcards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    toast.success("Cards shuffled!");
  };

  const navigateCard = (direction: 'prev' | 'next') => {
    if (direction === 'prev' && currentIndex > 0) {
      setCurrentIndex(prev => prev - 1);
    } else if (direction === 'next' && currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
    }
    setIsFlipped(false);
  };

  const handleCorrect = () => {
    setCorrectCount(prev => prev + 1);
    setKnownCards(prev => new Set([...prev, currentCard.id])); // Add to known cards
    if (studyMode === 'test') {
      moveToNext();
    }
    toast.success("Correct! Well done!");
  };

  const handleIncorrect = () => {
    setIncorrectCount(prev => prev + 1);
    setReviewPile(prev => [...prev, currentCard.id]);
    if (studyMode === 'test') {
      moveToNext();
    }
    toast.error("Don't worry, we'll review this one later!");
  };

  const moveToNext = () => {
    if (currentIndex < flashcards.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setIsFlipped(false);
    } else {
      // Session complete - show summary
      setSessionComplete(true);
    }
  };

  const flipCard = () => {
    setIsFlipped(!isFlipped);
  };

  const restartSession = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCorrectCount(0);
    setIncorrectCount(0);
    setReviewPile([]);
    setSessionComplete(false);
    setFlashcards(flashcardSet.flashcards);
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-100 text-green-800 border-green-200";
      case "medium": return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "hard": return "bg-red-100 text-red-800 border-red-200";
      default: return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* Progress and Stats */}
      <div className="grid md:grid-cols-[2fr_1fr] gap-6">
        <Card className="p-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Progress</span>
              <span>{currentIndex + 1} of {flashcards.length}</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        </Card>

        <div className="flex gap-4 justify-center">
          <Card className="p-4 w-full max-w-none">
            <div className="flex justify-center gap-8">
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">{correctCount}</span>
                </div>
                <span className="text-xs text-muted-foreground">Correct</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-500" />
                  <span className="font-medium">{incorrectCount}</span>
                </div>
                <span className="text-xs text-muted-foreground">Incorrect</span>
              </div>
            </div>
          </Card>

          <div className="flex flex-col gap-2">
            <Button variant="outline" size="sm" onClick={shuffleCards}>
              <Shuffle className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={restartSession}>
              <RotateCcw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Flashcard - Quizlet Style */}
      <div className="relative">
        <Card
          className={`min-h-[500px] cursor-pointer transition-all duration-500 transform-style-preserve-3d ${
            isFlipped ? 'rotate-y-180' : ''
          }`}
          onClick={flipCard}
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
          }}
        >
          {/* Front Side (Question) */}
          <CardContent
            className="absolute inset-0 p-8 flex flex-col justify-center items-center text-center backface-hidden"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <div className="mb-4">
              <Badge className={getDifficultyColor(currentCard.difficulty)}>
                {currentCard.difficulty}
              </Badge>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-2xl font-medium leading-relaxed mb-4">
                {currentCard.question}
              </p>
              <p className="text-sm text-muted-foreground">Click to reveal answer</p>
            </div>
          </CardContent>

          {/* Back Side (Answer) */}
          <CardContent
            className="absolute inset-0 p-8 flex flex-col justify-center items-center text-center backface-hidden bg-primary/5"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)'
            }}
          >
            <div className="mb-4">
              <Badge variant="secondary">Answer</Badge>
            </div>
            <div className="flex-1 flex flex-col justify-center">
              <p className="text-xl leading-relaxed mb-4">
                {currentCard.answer}
              </p>
              <p className="text-sm text-muted-foreground">Click to see question</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex justify-center gap-4">
        <Button
          onClick={handleIncorrect}
          variant="outline"
          className="gap-2 border-red-200 hover:bg-red-50"
        >
          <XCircle className="h-4 w-4 text-red-500" />
          Incorrect
        </Button>
        <Button
          onClick={handleCorrect}
          className="gap-2 bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4" />
          Correct
        </Button>
      </div>

    </div>
  );
};

export default FlashcardSession;