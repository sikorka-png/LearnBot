
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Wand2, File } from "lucide-react";

interface AIEnhanceDialogProps {
  onEnhance: (instructions: string, selectedMaterials?: string[]) => void;
  isEnhancing: boolean;
  disabled: boolean;
  materials: string[];
}

const AIEnhanceDialog = ({ onEnhance, isEnhancing, disabled, materials }: AIEnhanceDialogProps) => {
  const [open, setOpen] = useState(false);
  const [instructions, setInstructions] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterials(prev =>
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  const handleEnhance = () => {
    if (!instructions.trim()) return;

    onEnhance(instructions, selectedMaterials);
    setOpen(false);
    setInstructions("");
    setSelectedMaterials([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0"
        >
          {isEnhancing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
              Enhancing...
            </>
          ) : (
            <>
              <Wand2 className="h-4 w-4 mr-2" />
              AI Enhance
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>AI Enhancement Instructions</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="instructions" className="text-sm font-medium">
              What to fix or improve?
            </Label>
            <Textarea
              id="instructions"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="e.g., Improve clarity, add more examples, fix grammar, reorganize structure..."
              className="mt-1"
              rows={3}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">
              Select Materials
            </Label>
            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
              {materials.map((materialId) => {
                const isSelected = selectedMaterials.includes(materialId);
                return (
                  <Badge
                    key={materialId}
                    variant={isSelected ? "default" : "outline"}
                    className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors text-xs"
                    onClick={() => toggleMaterial(materialId)}
                  >
                    <File className="h-3 w-3 mr-1" />
                    {materialId}
                  </Badge>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEnhance}
              disabled={!instructions.trim() || selectedMaterials.length === 0}
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Enhance Notes
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AIEnhanceDialog;
