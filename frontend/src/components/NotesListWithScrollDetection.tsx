import { useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Trash2, FolderPlus, Loader2 } from "lucide-react";
import throttle from "lodash.throttle";

interface Note {
  id?: string;
  title: string;
  content: string;
  createdAt: Date;
  isGenerated: boolean;
}

interface NotesListWithScrollDetectionProps {
  notes: Note[];
  currentNote: Note | null;
  addingToMaterials: string | null;
  onSelectNote: (note: Note) => void;
  onConfirmDelete: (noteId: string) => void;
  onAddNoteToMaterials: (note: Note) => void;
  onScrolledToBottom?: () => void;
  loading?: boolean;
  hasMore?: boolean;
}

const NotesListWithScrollDetection = ({
  notes,
  currentNote,
  addingToMaterials,
  onSelectNote,
  onConfirmDelete,
  onAddNoteToMaterials,
  onScrolledToBottom,
  loading,
  hasMore
}: NotesListWithScrollDetectionProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const scrollElement = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]');
    if (!scrollElement) return;

    const handleScroll = throttle(() => {
      const { scrollTop, scrollHeight, clientHeight } = scrollElement;
      const threshold = 10;
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        if (onScrolledToBottom) onScrolledToBottom();
      }
    }, 500);

    scrollElement.addEventListener('scroll', handleScroll);
    return () => scrollElement.removeEventListener('scroll', handleScroll);
  }, [onScrolledToBottom]);

  return (
    <div ref={scrollRef} className="h-full flex flex-col">
      <ScrollArea className="h-[calc(100vh-192px)] sm:h-[calc(100vh-460px)] min-h-[550px]">
        <div className="space-y-2 px-4">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={`cursor-pointer transition-colors bg-card/80 backdrop-blur-sm border ${
                currentNote?.id === note.id ? "bg-primary/10 border-primary" : "hover:bg-accent"
              }`}
              onClick={() => onSelectNote(note)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-sm truncate">{note.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {note.createdAt.toLocaleDateString()}
                    </p>
                    <Badge variant="secondary" className="text-xs mt-1">
                      {note.isGenerated ? "AI Generated" : "Manual"}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddNoteToMaterials(note);
                      }}
                      disabled={addingToMaterials === note.id}
                      className="h-6 w-6 p-0"
                    >
                      {addingToMaterials === note.id ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <FolderPlus className="h-3 w-3" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (note.id) onConfirmDelete(note.id);
                      }}
                      className="h-6 w-6 p-0 text-foreground hover:text-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default NotesListWithScrollDetection;