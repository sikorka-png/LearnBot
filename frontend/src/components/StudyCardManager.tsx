import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, BookOpen, File, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface StudyCard {
  id: string;
  name: string;
  description: string;
  materials: string[];
  color: string;
  knowledge_tree_status: "pending" | "ready";
  focus_study_status: "pending" | "ready";
}

interface StudyCardManagerProps {
  onSelectCard: (card: StudyCard) => void;
  selectedCardId?: string;
  availableMaterials: string[];
}

const StudyCardManager = ({ onSelectCard, selectedCardId, availableMaterials }: StudyCardManagerProps) => {
  const [studyCards, setStudyCards] = useState<StudyCard[]>([]);
  const pollersRef = useRef<Record<number, number>>({});
  const POLL_MS = 30000;

  const colorOptions = [
    { value: "blue", label: "Blue", class: "bg-blue-500" },
    { value: "green", label: "Green", class: "bg-green-500" },
    { value: "purple", label: "Purple", class: "bg-purple-500" },
    { value: "orange", label: "Orange", class: "bg-orange-500" },
    { value: "pink", label: "Pink", class: "bg-pink-500" },
  ];

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newCard, setNewCard] = useState({
    name: "",
    description: "",
    materials: [] as string[],
    color: "blue"
  });

  useEffect(() => () => {
    Object.values(pollersRef.current).forEach(id => window.clearTimeout(id));
    pollersRef.current = {};
  }, []);

  useEffect(() => {
    const fetchStudyCards = async () => {
      try {
        const res = await axios.get("http://localhost:8000/study_card/", {
          withCredentials: true,
        });
        setStudyCards(res.data);
        res.data.forEach((card: StudyCard) => {
          if (card.knowledge_tree_status !== "ready") {
            startPolling(Number(card.id));
          }
        });
      } catch (error) {
        toast.error("Failed to load study cards");
      }
    };
    fetchStudyCards();
  }, []);


  const stopPolling = (cardId: number) => {
    const t = pollersRef.current[cardId];
    if (t) {
      window.clearTimeout(t);
      delete pollersRef.current[cardId];
    }
  };

  const startPolling = (cardId: number) => {
    if (pollersRef.current[cardId]) return;

    const tick = async () => {
      try {
        const { data } = await axios.get(
          `http://localhost:8000/study_card/${cardId}/knowledge-tree/status`,
          { withCredentials: true }
        );
        const status: "pending" | "building" | "ready" | "failed" = data.knowledge_tree_status;

        setStudyCards(prev =>
          prev.map(c =>
            Number(c.id) === Number(cardId) ? { ...c, knowledge_tree_status: status } : c
          )
        );

        if (status === "ready") {
          stopPolling(cardId);
          return;
        }
      } catch (e) {
      }
      pollersRef.current[cardId] = window.setTimeout(tick, POLL_MS);
    };

    tick();
  };

  const handleCreateCard = async () => {
    if (!newCard.name.trim()) {
      toast.error("Card name is required");
      return;
    }

    const cardData: StudyCard = {
      name: newCard.name,
      description: newCard.description,
      materials: newCard.materials,
      color: newCard.color
    };

    try {
      const res = await axios.post("http://localhost:8000/study_card", cardData, {
        withCredentials: true
      });
      setStudyCards(prev => [...prev, res.data]);
      startPolling(res.data.id);
      toast.success("Study card created successfully");
    } catch (e) {
      console.error(e);
      toast.error("Failed to create group");
    }

    setIsDialogOpen(false);
    setNewCard({ name: "", description: "", materials: [], color: "blue" });
  };

  const handleDelete = async (cardId: string) => {
    try {
      await axios.delete(`http://localhost:8000/study_card/${cardId}`, {
        withCredentials: true
      });
      stopPolling(cardId);
      setStudyCards(prev => prev.filter(card => card.id !== cardId));
      toast.success("Study card deleted");
    } catch (e) {
      toast.error("Failed to delete study card");
    }
  };

  const getMaterialsForCard = (materials: string[]) => {
    return availableMaterials.filter(mat => materials.includes(mat));
  };

  const toggleMaterial = (material: string) => {
    setNewCard(prev => ({
      ...prev,
      materials: prev.materials.includes(material)
        ? prev.materials.filter(m => m !== material)
        : [...prev.materials, material]
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Study Cards</h2>
          <p className="text-muted-foreground">Create and manage your study card collections</p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm" onClick={() => {
              setNewCard({ name: "", description: "", materials: [], color: "blue" });
            }}>
              <Plus className="h-4 w-4 mr-2" />
              Create Card
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                Create Study Card
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Card Name</label>
                <Input
                  value={newCard.name}
                  onChange={(e) => setNewCard(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mathematics Basics"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Textarea
                  value={newCard.description}
                  onChange={(e) => setNewCard(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of what this card covers"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <Select value={newCard.color} onValueChange={(value) => setNewCard(prev => ({ ...prev, color: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {colorOptions.map(color => (
                      <SelectItem key={color.value} value={color.value}>
                        <div className="flex items-center gap-2">
                          <div className={`w-4 h-4 rounded-full ${color.class}`} />
                          {color.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium">Select Materials</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableMaterials.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      No materials to select – add them in Materials
                    </p>
                  ) : (
                    availableMaterials.map(material => (
                      <Badge
                        key={material}
                        variant={newCard.materials.includes(material) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleMaterial(material)}
                      >
                        {material}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <Button onClick={handleCreateCard} className="w-full" disabled={!newCard.name.trim() || newCard.materials.length === 0}>
                Create Card
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {studyCards.map((card) => {
          const materials = getMaterialsForCard(card.materials);
          const isSelected = selectedCardId === card.id;

          return (
            <Card
              key={card.id}
              className={`hover:shadow-md transition-all ${
                isSelected
                  ? 'border-primary shadow-md ring-2 ring-primary/20 bg-primary/5'
                  : ''
              }`}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2 flex-1">
                    <div className={`w-3 h-3 rounded-full bg-${card.color}-500 mt-1 flex-shrink-0`} />
                    <div className="flex-1">
                      <CardTitle className={`text-lg ${isSelected ? 'text-primary' : ''}`}>
                        {card.name}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{card.description}</p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => handleDelete(card.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{materials.length} materials</span>
                  </div>

                  <div className="flex flex-wrap gap-1">
                    {materials.slice(0, 3).map((material) => (
                      <Badge key={material} variant="secondary" className="text-xs">
                        {material}
                      </Badge>
                    ))}
                    {materials.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{materials.length - 3} more
                      </Badge>
                    )}
                  </div>

                  <div className="text-xs text-muted-foreground">
                    {card.lastStudied && (
                      <div>Last studied {card.lastStudied.toLocaleDateString()}</div>
                    )}
                  </div>

                  <Button
                    className={`w-full mt-3 ${
                      isSelected
                        ? 'bg-primary/10 text-primary border-primary hover:bg-primary/20'
                        : ''
                    }`}
                    variant={isSelected ? "outline" : "default"}
                    onClick={() => onSelectCard(card)}
                    disabled={card.knowledge_tree_status !== "ready"}
                  >
                    {card.knowledge_tree_status !== "ready" ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Preparing…
                      </>
                    ) : (
                      <>Study This Card</>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {studyCards.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-medium mb-2">No study cards yet</h3>
          <p className="text-muted-foreground mb-4">Create your first study card to organize your learning materials</p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Card
          </Button>
        </div>
      )}
    </div>
  );
};

export default StudyCardManager;