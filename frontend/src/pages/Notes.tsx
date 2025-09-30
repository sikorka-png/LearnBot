import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { NotebookPen, Sparkles, Download, Save, Trash2, File as FileIcon, FolderPlus, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";
import RichTextEditor from "@/components/RichTextEditor";
import AIEnhanceDialog from "@/components/AIEnhanceDialog";
import html2pdf from "html2pdf.js";
import NotesListWithScrollDetection from "@/components/NotesListWithScrollDetection";

interface Note {
  id?: string;
  title: string;
  content: string;
  createdAt: Date;
  isGenerated: boolean;
}

const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [topic, setTopic] = useState("");
  const [focusArea, setFocusArea] = useState("");
  const [selectedMaterials, setSelectedMaterials] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [addingToMaterials, setAddingToMaterials] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [noteToDelete, setNoteToDelete] = useState<string | null>(null);

  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const LIMIT = 10;
  const isNotesLoading = useRef(false);

  const fetchNotes = async (newOffset = 0, append = false) => {
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:8000/notes?offset=${newOffset}&limit=${LIMIT}`, { withCredentials: true });
      const fetchedNotes = res.data.map((note: any) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        isGenerated: note.is_generated,
        createdAt: new Date(note.created_at)
      }));
      setNotes(prev => append ? [...prev, ...fetchedNotes] : fetchedNotes);
      setOffset(newOffset + fetchedNotes.length);
      setHasMore(fetchedNotes.length === LIMIT);
    } catch (err) {
      toast.error("Failed to load notes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(0, false);
  }, []);

  const loadMoreNotes = () => {
    if (isNotesLoading.current || loading || !hasMore) return;
    isNotesLoading.current = true;
    fetchNotes(offset, true).finally(() => {
      isNotesLoading.current = false;
    });
  };

  useEffect(() => {
    axios.get("http://localhost:8000/file/list", { withCredentials: true })
      .then((res) => {
        const filenames = res.data.map((file: any) => file.filename);
        setAvailableMaterials(filenames);
      })
      .catch(() => {
        toast.error("Failed to load materials");
      });
  }, []);

  const toggleMaterial = (materialId: string) => {
    setSelectedMaterials(prev => 
      prev.includes(materialId)
        ? prev.filter(id => id !== materialId)
        : [...prev, materialId]
    );
  };

  function extractImages(html: string): { cleaned: string; placeholders: Record<string, string> } {
    const imgTags = html.match(/<img[^>]+>/g) || [];
    const placeholders: Record<string, string> = {};
    let cleaned = html;

    imgTags.forEach((tag, i) => {
      const key = `[[IMG_${i}]]`;
      placeholders[key] = tag;
      cleaned = cleaned.replace(tag, key);
    });

    return { cleaned, placeholders };
  }

  function restoreImages(html: string, placeholders: Record<string, string>): string {
    let restored = html;
    for (const [key, tag] of Object.entries(placeholders)) {
      restored = restored.replace(key, tag);
    }
    return restored;
  }


  const enhanceNotes = async (instructions: string, selectedMaterials?: string[]) => {
    if (!noteContent.trim()) {
      toast.error("Please add some content to enhance");
      return;
    }

    try {
      setIsEnhancing(true);
      const { cleaned, placeholders } = extractImages(noteContent);
      console.error(cleaned);
      const response = await axios.post(
        "http://localhost:8000/notes/enhance",
        {
          content: cleaned,
          improvement: instructions,
          filenames: selectedMaterials ?? []
        },
        { withCredentials: true }
      );
      const enhancedContent = restoreImages(response.data.content, placeholders);
      setNoteContent(enhancedContent);
      toast.success("Notes enhanced with AI insights!");
    } catch (error) {
      toast.error("Failed to enhance notes");
      console.error(error);
    } finally {
      setIsEnhancing(false);
    }
  };


  const generateNotes = async () => {
    setIsGenerating(true);

    try {
      const response = await axios.post(
        "http://localhost:8000/notes/generate",
        {
          topic,
          focus: focusArea,
          filenames: selectedMaterials
        },
        { withCredentials: true }
      );

      const generatedContent = response.data.content;

      const newNote: Note = {
        title: `${topic || "Untitled"} - Study Notes`,
        content: generatedContent,
        createdAt: new Date(),
        isGenerated: true
      };

      setNotes(prev => [newNote, ...prev]);
      setCurrentNote(newNote);
      setNoteTitle(newNote.title);
      setNoteContent(newNote.content);
      setTopic("");
      setFocusArea("");
      setSelectedMaterials([]);
      toast.success("Notes generated successfully!");
    } catch (error: any) {
      console.error("Generation failed:", error);
      toast.error("Failed to generate notes. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };


  const saveNote = () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      toast.error("Please enter both title and content");
      return;
    }

    if (currentNote?.id) {
      axios.patch("http://localhost:8000/notes/edit", {
        id: currentNote.id,
        title: noteTitle,
        content: noteContent
      }, { withCredentials: true })
      .then(() => {
        setNotes(prev => prev.map(note =>
          note.id === currentNote.id
            ? { ...note, title: noteTitle, content: noteContent }
            : note
        ));
        setCurrentNote({ ...currentNote, title: noteTitle, content: noteContent });
        toast.success("Note updated successfully!");
      })
      .catch(err => {
        toast.error("Failed to update note: " + (err.response?.data?.detail || "Unknown error"));
      });
    } else {
      axios.post("http://localhost:8000/notes/create", {
        title: noteTitle,
        content: noteContent,
        is_generated: currentNote?.isGenerated ?? false
      }, { withCredentials: true })
      .then(res => {
        const newNote: Note = {
          id: res.data.id,
          title: noteTitle,
          content: noteContent,
          isGenerated: currentNote?.isGenerated ?? false,
          createdAt: new Date()
        };
        setNotes(prev => [newNote, ...prev]);
        setCurrentNote(newNote);
        toast.success("Note saved successfully!");
      })
      .catch(err => {
        toast.error("Failed to save note: " + (err.response?.data?.detail || "Unknown error"));
      });
    }
  };

  const deleteNote = async () => {
    try {
      await axios.delete(`http://localhost:8000/notes/${noteToDelete}`, {
        withCredentials: true
      });

      setNotes(prev => prev.filter(note => note.id !== noteToDelete));

      if (currentNote?.id === noteToDelete) {
        setCurrentNote(null);
        setNoteTitle("");
        setNoteContent("");
      }

      toast.success("Note deleted successfully!");
    } catch (err: any) {
      toast.error("Failed to delete note");
    } finally {
      setDeleteDialogOpen(false);
      setNoteToDelete(null);
    }
  };

  const confirmDelete = (noteId: string) => {
    setNoteToDelete(noteId);
    setDeleteDialogOpen(true);
  };

  const selectNote = (note: Note) => {
    setCurrentNote(note);
    setNoteTitle(note.title);
    setNoteContent(note.content);
  };

  const createNewNote = () => {
    setCurrentNote(null);
    setNoteTitle("");
    setNoteContent("");
  };

  const downloadNote = () => {
    if (!currentNote) return;

    const wrapper = document.createElement("div");
    wrapper.innerHTML = currentNote.content;

    const style = document.createElement("style");
    style.textContent = `
      * {
        page-break-inside: avoid;
        break-inside: avoid;
      }
      h1, h2, h3, h4, h5, h6 {
        font-weight: bold;
        margin-top: 24px;
        margin-bottom: 12px;
      }
      h1 { font-size: 24px; }
      h2 { font-size: 20px; }
      h3 { font-size: 18px; }
      h4 { font-size: 16px; }
      h5 { font-size: 14px; }
      h6 { font-size: 13px; }
      p {
        margin: 8px 0;
        line-height: 1.5;
      }
      ul, ol {
        padding-left: 20px;
        margin: 10px 0;
      }
      li {
        margin: 4px 0;
      }
      code {
        font-family: monospace;
        background-color: #f4f4f4;
        padding: 2px 4px;
        border-radius: 4px;
      }
      pre {
        background-color: #f4f4f4;
        padding: 10px;
        overflow-x: auto;
        border-radius: 6px;
      }
      body {
        font-family: 'Arial', sans-serif;
        color: black;
        background: white;
        padding: 20px;
      }
    `;
    wrapper.prepend(style);

    // Wymuś rozmiar jak A4
    wrapper.style.width = "210mm";
    wrapper.style.boxSizing = "border-box";

    html2pdf().from(wrapper).set({
      margin: [10, 10, 10, 10],
      filename: `${currentNote.title}.pdf`,
      html2canvas: {
        scale: 2,
        useCORS: true,
      },
      jsPDF: {
        unit: "mm",
        format: "a4",
        orientation: "portrait",
      },
    }).save();

    toast.success("PDF downloaded successfully!");
  };

  const addNoteToMaterials = async (note: Note) => {
    try {
      setAddingToMaterials(note.id);
      const cleanedContent = note.content.replace(/<img[^>]*>/g, "");

      const blob = new Blob([cleanedContent], { type: "text/plain" });
      const file = new File([blob], `${note.title}.txt`, { type: "text/plain" });

      const formData = new FormData();
      formData.append("upload_file", file);

      await axios.post("http://localhost:8000/file/upload/note", formData, {
        withCredentials: true,
        headers: { "Content-Type": "multipart/form-data" }
      });

      toast.success("Note added to materials as text file!");
      setAddingToMaterials(null);
    } catch (error) {
      console.error("Failed to upload note as material", error);
      toast.error("Failed to add note to materials");
      setAddingToMaterials(null);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
      {/* Floating Background Elements */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-20 right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
      </div>
      
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">AI Notes Generator</h1>
          <p className="text-muted-foreground">
            Generate comprehensive study notes on any topic or create your own
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-300px)]">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Tabs defaultValue="generate" className="h-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="generate">Create</TabsTrigger>
                <TabsTrigger value="saved">Saved</TabsTrigger>
              </TabsList>

              <div className="mt-4">
                <Button onClick={createNewNote} variant="outline" className="w-full">
                  <NotebookPen className="h-4 w-4 mr-2" />
                  New Note
                </Button>
              </div>

              <TabsContent value="generate" className="mt-4">
                <Card className="bg-card/80 backdrop-blur-sm border">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="h-5 w-5" />
                      AI Generator
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Enter Topic
                        </label>
                        <Input
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="Leave blank for general notes"
                          onKeyPress={(e) => e.key === "Enter" && generateNotes()}
                        />
                      </div>
                      
                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Focus Area (Optional)
                        </label>
                        <Input
                          value={focusArea}
                          onChange={(e) => setFocusArea(e.target.value)}
                          placeholder="Specific aspect to focus on"
                        />
                      </div>

                      <div>
                        <label className="text-sm font-medium mb-2 block">
                          Select Materials
                        </label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar">
                          {availableMaterials.map(material => (
                            <Badge
                              key={material}
                              variant={selectedMaterials.includes(material) ? "default" : "outline"}
                              className="cursor-pointer"
                              onClick={() => toggleMaterial(material)}
                            >
                              <FileIcon className="h-3 w-3 mr-1" />
                              {material}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <Button 
                        onClick={generateNotes} 
                        disabled={isGenerating || selectedMaterials.length === 0}
                        className="w-full"
                      >
                        {isGenerating ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                            Generating...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-4 w-4 mr-2" />
                            Generate Notes
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="saved" className="mt-4 h-[calc(100%-60px)]">
                <NotesListWithScrollDetection
                  notes={notes}
                  currentNote={currentNote}
                  addingToMaterials={addingToMaterials}
                  onSelectNote={selectNote}
                  onConfirmDelete={confirmDelete}
                  onAddNoteToMaterials={addNoteToMaterials}
                  onScrolledToBottom={loadMoreNotes}
                  loading={loading}
                  hasMore={hasMore}
                />
              </TabsContent>
            </Tabs>
          </div>

          {/* Note Editor */}
          <div className="lg:col-span-3">
            <Card className="h-full flex flex-col max-h-[calc(100vh-300px)] min-h-[616px] bg-card/80 backdrop-blur-sm border">
              <CardHeader className="pb-3 flex-shrink-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {currentNote ? "Edit Note" : "New Note"}
                  </CardTitle>
                  <div className="flex gap-2">
                    {currentNote && (
                      <Button variant="outline" size="sm" onClick={downloadNote}>
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                    <AIEnhanceDialog
                      onEnhance={enhanceNotes}
                      isEnhancing={isEnhancing}
                      disabled={!noteContent.trim()}
                      materials={availableMaterials}
                    />
                    <Button size="sm" onClick={saveNote} disabled={!noteTitle.trim() || !noteContent.trim()}>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-4 space-y-4 min-h-0 overflow-hidden">
                <div className="flex-shrink-0">
                  <label className="text-sm font-medium mb-2 block">Title</label>
                  <Input
                    value={noteTitle}
                    onChange={(e) => setNoteTitle(e.target.value)}
                    placeholder="Enter note title..."
                  />
                </div>
                <div className="flex-1 flex flex-col min-h-0">
                  <label className="text-sm font-medium mb-2 block">Content</label>
                  <div className="flex-1 min-h-[400px] max-h-[calc(100vh-400px)]">
                    <RichTextEditor
                      value={noteContent}
                      onChange={setNoteContent}
                      placeholder="Start typing your notes here or generate AI notes..."
                      className="h-full min-h-[400px] max-h-[calc(100vh-400px)]"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Note</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this note? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteNote}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Notes;