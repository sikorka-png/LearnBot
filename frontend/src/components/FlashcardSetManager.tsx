import axios from "axios";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, BookOpen, Sparkles, Play, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface BackendFlashcard {
  id: number;
  definition: string;
  answer: string;
  flashcard_set_id: number;
}

interface BackendFlashcardSet {
  id: number;
  user_id: number;
  source_filenames: string[];
  created_at: string;
  flashcards: BackendFlashcard[];
}

export interface Flashcard {
  id: string;
  question: string;
  answer: string;
  difficulty: "easy" | "medium" | "hard";
}

export interface FlashcardSet {
  id: string;
  name: string;
  description: string;
  flashcards: Flashcard[];
  createdAt: string;
  aiGenerated: boolean;
}

interface FlashcardSetManagerProps {
  onStudySet: (set: FlashcardSet) => void;
  selectedTopics?: string[];
  onLoaded?: () => void;
  onError?: () => void;
  studyCardId: number | string;
}

const FlashcardSetManager = ({ onStudySet, selectedTopics = [], onLoaded, onError, studyCardId }: FlashcardSetManagerProps) => {
  const [sets, setSets] = useState<FlashcardSet[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingSet, setEditingSet] = useState<FlashcardSet | null>(null);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);
  const [newSetName, setNewSetName] = useState("");
  const [newSetDescription, setNewSetDescription] = useState("");
  const [generatingForSet, setGeneratingForSet] = useState<string | null>(null);
  const [cardForm, setCardForm] = useState<{ question: string; answer: string; difficulty: "easy" | "medium" | "hard" }>({ question: "", answer: "", difficulty: "medium" });

  const mapFromBackend = (b: BackendFlashcardSet): FlashcardSet => ({
    id: String(b.id),
    name: b.name,
    description: b.description,
    flashcards: (b.flashcards ?? []).map(c => ({
      id: String(c.id),
      question: c.definition,
      answer: c.answer,
      difficulty: "medium",
    })),
    createdAt: b.created_at?.split("T")[0] ?? "",
    aiGenerated: false,
  });

  const loadSets = async () => {
    setIsLoading(true);
    try {
      const { data } = await axios.get<BackendFlashcardSet[]>(
        "http://localhost:8000/flashcard/",
        { withCredentials: true }
      );
      setSets((data ?? []).map(mapFromBackend));
      onLoaded?.();
    } catch {
      toast.error("Error loading flashcards");
      onError?.();
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadSets(); }, []);

  const [isCreatingSet, setIsCreatingSet] = useState(false);

  const handleCreateSet = async () => {
    if (!newSetName.trim()) {
      toast.error("Please enter a set name");
      return;
    }

    setIsCreatingSet(true);
    toast.info("Creating flashcard set...");

    try {
      const { data } = await axios.post(
        "http://localhost:8000/flashcard/",
        {
          study_card_id: Number(studyCardId),
          flashcards_needed: 15,
          name: newSetName,
          description: newSetDescription,
          topics: selectedTopics.map(t => t.split("/").pop()!).filter(Boolean),
        },
        { withCredentials: true }
      );

      const newSet = mapFromBackend(data);
      setSets(prev => [newSet, ...prev]);

      setNewSetName("");
      setNewSetDescription("");
      setIsCreateDialogOpen(false);
      toast.success("Flashcard set created!");
    } catch (error) {
      toast.error("Failed to create flashcard set");
    } finally {
      setIsCreatingSet(false);
    }
  };

  const handleDeleteSet = async (setId: string) => {
    try {
      await axios.delete(
        `http://localhost:8000/flashcard/${setId}`,
        { withCredentials: true }
      );

      setSets(prev => prev.filter(set => set.id !== setId));
      toast.success("Flashcard set deleted");
    } catch (error) {
      toast.error("Failed to delete flashcard set");
    }
  };

  const handleAddCard = async (setId: string) => {
    if (!cardForm.question.trim() || !cardForm.answer.trim()) {
      toast.error("Please fill in both question and answer");
      return;
    }

    try {
      const { data } = await axios.post<BackendFlashcard>(
        `http://localhost:8000/flashcard/${setId}/cards`,
        {
          definition: cardForm.question,
          answer: cardForm.answer,
        },
        { withCredentials: true }
      );

      const newCard: Flashcard = {
        id: String(data.id),
        question: data.definition,
        answer: data.answer,
        difficulty: cardForm.difficulty,
      };

      setSets(prev => prev.map(set =>
        set.id === setId
          ? { ...set, flashcards: [...set.flashcards, newCard] }
          : set
      ));

      if (editingSet?.id === setId) {
        setEditingSet(prev =>
          prev ? { ...prev, flashcards: [...prev.flashcards, newCard] } : prev
        );
      }

      setCardForm({ question: "", answer: "", difficulty: "medium" });
      toast.success("Flashcard added!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to add flashcard");
    }
  };

  const handleEditCard = async (setId: string, cardId: string) => {
    if (!cardForm.question.trim() || !cardForm.answer.trim()) {
      toast.error("Please fill in both question and answer");
      return;
    }

    try {
      await axios.put(
        `http://localhost:8000/flashcard/${setId}/cards/${cardId}`,
        {
          definition: cardForm.question,
          answer: cardForm.answer,
        },
        { withCredentials: true }
      );

      setSets(prev => prev.map(set =>
        set.id === setId
          ? {
              ...set,
              flashcards: set.flashcards.map(card =>
                card.id === cardId
                  ? { ...card, question: cardForm.question, answer: cardForm.answer, difficulty: cardForm.difficulty }
                  : card
              )
            }
          : set
      ));

      if (editingSet?.id === setId) {
        setEditingSet(prev =>
          prev
            ? {
                ...prev,
                flashcards: prev.flashcards.map(card =>
                  card.id === cardId
                    ? { ...card, question: cardForm.question, answer: cardForm.answer, difficulty: cardForm.difficulty }
                    : card
                ),
              }
            : prev
        );
      }

      setEditingCardId(null);
      setCardForm({ question: "", answer: "", difficulty: "medium" });
      toast.success("Flashcard updated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to update flashcard");
    }
  };

  const handleDeleteCard = async (setId: string, cardId: string) => {
    try {
      await axios.delete(`http://localhost:8000/flashcard/${setId}/cards/${cardId}`, {
        withCredentials: true,
      });

      setSets(prev =>
        prev.map(set =>
          set.id === setId
            ? { ...set, flashcards: set.flashcards.filter(card => card.id !== cardId) }
            : set
        )
      );

      if (editingSet?.id === setId) {
        setEditingSet(prev =>
          prev ? { ...prev, flashcards: prev.flashcards.filter(card => card.id !== cardId) } : prev
        );
      }

      toast.success("Flashcard deleted");
    } catch (err) {
      toast.error("Error deleting flashcard");
    }
  };

  const generateAIFlashcards = async (setId: string) => {
    const set = sets.find(s => s.id === setId);
    if (!set) return;

    setGeneratingForSet(setId);
    toast.info("Generating AI flashcards...");

    try {
      const { data } = await axios.post<BackendFlashcard[]>(
        `http://localhost:8000/flashcard/${setId}/generate`,
        {
          study_card_id: Number(studyCardId),
          flashcards_needed: 10,
          topics: selectedTopics.map(t => t.split("/").pop()!).filter(Boolean),
        },
        { withCredentials: true }
      );

      const newCards: Flashcard[] = (data ?? []).map(c => ({
        id: String(c.id),
        question: c.definition,
        answer: c.answer,
        difficulty: "medium",
      }));

      setSets(prev => prev.map(s =>
        s.id === setId ? { ...s, flashcards: [...s.flashcards, ...newCards] } : s
      ));

      if (editingSet?.id === setId) {
        setEditingSet(prev => prev ? { ...prev, flashcards: [...prev.flashcards, ...newCards] } : prev);
      }

      toast.success(`Added ${newCards.length} AI flashcards`);
    } catch (e) {
      console.error(e);
      toast.error("Failed to generate AI flashcards");
    } finally {
      setGeneratingForSet(null);
    }
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
    <div className="space-y-6">
      {/* Header - Only show when not editing */}
      {!editingSet && (
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">Flashcard Sets</h2>
            <p className="text-muted-foreground">Manage your flashcard collections</p>
          </div>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Generate New Set
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Generate New Flashcard Set</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Set Name</label>
                  <Input
                    value={newSetName}
                    onChange={(e) => setNewSetName(e.target.value)}
                    placeholder="Enter set name..."
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Textarea
                    value={newSetDescription}
                    onChange={(e) => setNewSetDescription(e.target.value)}
                    placeholder="Enter description..."
                  />
                </div>
                {selectedTopics.length > 0 && (
                  <div>
                    <label className="text-sm font-medium">Selected Topics</label>
                    <div className="mt-2 flex flex-wrap gap-1">
                      {selectedTopics.map((topic, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {topic.split('/').pop()}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
                <Button onClick={handleCreateSet} className="w-full" disabled={isCreatingSet}>
                  {isCreatingSet ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Generate Set"
                  )}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Sets Grid or Edit Mode */}
      {editingSet ? (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">Manage "{editingSet.name}"</h3>
            <Button variant="outline" onClick={() => setEditingSet(null)}>
              Back to Sets
            </Button>
          </div>

          {selectedTopics.length > 0 && (
            <div>
              <label className="text-sm font-medium">Selected Topics</label>
              <div className="mt-2 flex flex-wrap gap-1">
                {selectedTopics.map((topic, index) => (
                  <Badge key={index} variant="secondary" className="text-xs">
                    {topic.split('/').pop()}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left Column - Add New Card & AI Generation */}
            <div className="space-y-6 flex flex-col justify-center h-full">
              {/* Generate AI Cards */}
              <Button
                onClick={() => generateAIFlashcards(editingSet.id)}
                variant="outline"
                className="gap-2 w-full"
                disabled={generatingForSet === editingSet.id}
              >
                {generatingForSet === editingSet.id ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Generate AI Flashcards
                  </>
                )}
              </Button>

              {/* Add/Edit New Card */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    {editingCardId ? "Edit Flashcard" : "Add New Flashcard"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Question</label>
                    <Textarea
                      value={cardForm.question}
                      onChange={(e) => setCardForm(prev => ({ ...prev, question: e.target.value }))}
                      placeholder="Enter the question..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Answer</label>
                    <Textarea
                      value={cardForm.answer}
                      onChange={(e) => setCardForm(prev => ({ ...prev, answer: e.target.value }))}
                      placeholder="Enter the answer..."
                      className="min-h-[80px]"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Difficulty</label>
                    <select
                      value={cardForm.difficulty}
                      onChange={(e) => setCardForm(prev => ({ ...prev, difficulty: e.target.value as "easy" | "medium" | "hard" }))}
                      className="w-full p-2 border rounded-md"
                    >
                      <option value="easy">Easy</option>
                      <option value="medium">Medium</option>
                      <option value="hard">Hard</option>
                    </select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => editingCardId ? handleEditCard(editingSet.id, editingCardId) : handleAddCard(editingSet.id)}
                      className="flex-1"
                    >
                      {editingCardId ? "Update Flashcard" : "Add Flashcard"}
                    </Button>
                    {editingCardId && (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setEditingCardId(null);
                          setCardForm({ question: "", answer: "", difficulty: "medium" });
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Existing Cards */}
            <div className="space-y-4">
              <ScrollArea className="h-[600px] pr-4">
                <div className="space-y-3">
                  {editingSet.flashcards.map((card) => (
                    <Card key={card.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">Q:</span>
                            <p className="text-sm mt-1">{card.question}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-muted-foreground">A:</span>
                            <p className="text-sm text-muted-foreground mt-1">{card.answer}</p>
                          </div>
                          <Badge className={getDifficultyColor(card.difficulty)}>
                            {card.difficulty}
                          </Badge>
                        </div>
                        <div className="flex gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingCardId(card.id);
                              setCardForm({
                                question: card.question,
                                answer: card.answer,
                                difficulty: card.difficulty
                              });
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteCard(editingSet.id, card.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {sets.map((set) => (
            <Card key={set.id} className="relative group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{set.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{set.description}</p>
                  </div>
                  <span>{set.flashcards.length} cards</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Action buttons */}
                <div className="flex gap-2">
                  <Button
                    onClick={() => onStudySet(set)}
                    disabled={set.flashcards.length === 0}
                    className="flex-1 gap-2"
                  >
                    <Play className="h-4 w-4" />
                    Study
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditingSet(set)}
                  >
                    <BookOpen className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Flashcard Set</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{set.name}"? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteSet(set.id)}>
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}


    </div>
  );
};

export default FlashcardSetManager;