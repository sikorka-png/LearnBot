import axios from "axios";
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Upload, Link as LinkIcon, File, Trash2, ExternalLink, Loader2 } from "lucide-react";
import Navigation from "@/components/Navigation";
import { toast } from "sonner";

interface Material {
  id: string;
  name: string;
  type: "file" | "url" | "note";
  content?: string;
  url?: string;
  uploadDate: string | Date;
  size?: string;
}

const Materials = () => {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [urlInput, setUrlInput] = useState("");
  const tabLoaded = useRef(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFileUploading, setIsFileUploading] = useState(false);
  const [isUrlAdding, setIsUrlAdding] = useState(false);
  const [deletingMaterialId, setDeletingMaterialId] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showCannotDelete, setShowCannotDelete] = useState(false);
  const [materialToDelete, setMaterialToDelete] = useState<Material | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const typeLabels: Record<string, string> = {
    file: "File",
    url: "URL",
    note: "Note",
  };

  useEffect(() => {
    if (tabLoaded.current) return;

    setIsLoading(true);
    axios.get("http://localhost:8000/file/list", {
      withCredentials: true
      })
      .then((res) => {
        const fetchedMaterials: Material[] = res.data.map((file: any) => ({
          id: file.id,
          name: file.filename,
          type: file.type,
          uploadDate: new Date(file.created_at),
          size: file.size != null ? `${(file.size / 1024 / 1024).toFixed(2)} MB` : undefined,
          url: file.type === "url" ? file.filename : undefined
        }));

        setMaterials(prev => [...prev, ...fetchedMaterials]);
        tabLoaded.current = true;
      })
      .catch(() => {
        toast.error("Failed to load uploaded files.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const processFiles = async (files: FileList) => {
    setIsFileUploading(true);

    for (const file of Array.from(files)) {
      const formData = new FormData();
      formData.append("upload_file", file);

      try {
        const response = await axios.post("http://localhost:8000/file/upload", formData, {
          withCredentials: true,
          headers: {
            "Content-Type": "multipart/form-data"
          }
        });

        const newMaterial: Material = {
          id: response.data.id,
          name: file.name,
          type: "file",
          uploadDate: new Date(),
          size: `${(file.size / 1024 / 1024).toFixed(2)} MB`
        };

        setMaterials(prev => [...prev, newMaterial]);
        toast.success(`Uploaded ${file.name}`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      } finally {
        setIsFileUploading(false);
      }
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    await processFiles(files);
    event.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragOver) setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX;
    const y = e.clientY;

    if (x < rect.left || x >= rect.right || y < rect.top || y >= rect.bottom) {
      setIsDragOver(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    if (isFileUploading) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await processFiles(files);
    }
  };

  const handleUrlAdd = async () => {
    if (!urlInput.trim()) return;
    setIsUrlAdding(true);
    try {
      const parsedUrl = new URL(urlInput);

      const response = await axios.post(
        "http://localhost:8000/file/upload/url",
        null,
        {
          params: { url: urlInput },
          withCredentials: true,
        }
      );
      const newMaterial: Material = {
          id: response.data.id,
          name: urlInput,
          type: "url",
          uploadDate: new Date(),
          url: urlInput
        };

      setMaterials(prev => [...prev, newMaterial]);
      setUrlInput("");
      toast.success("URL added successfully");
    } catch (err) {
      toast.error("Please enter a valid URL or check backend connection.");
    } finally {
      setIsUrlAdding(false);
    }
  };

  const checkIfMaterialUsed = async (materialId: string) => {
    try {
      setDeletingMaterialId(materialId);
      const res = await axios.get(`http://localhost:8000/file/used/${materialId}`, {
        withCredentials: true
      });
      return res.data.used;
    } catch (error) {
      console.error("Unknown error:", error);
      return false;
    } finally {
      setDeletingMaterialId(null);
    }
  };

  const handleDeleteClick = async (material: Material) => {
    if (await checkIfMaterialUsed(material.id)) {
      setMaterialToDelete(material);
      setShowCannotDelete(true);
    } else {
      setMaterialToDelete(material);
      setShowDeleteConfirm(true);
    }
  };

  const confirmDelete = async () => {
    if (!materialToDelete) return;

    setShowDeleteConfirm(false);
    setDeletingMaterialId(materialToDelete.id);
    try {
      await axios.delete(`http://localhost:8000/file/${materialToDelete.id}`, {
        withCredentials: true
      });

      setMaterials(prev => prev.filter(m => m.id !== materialToDelete.id));
      toast.success("Material removed");
    } catch (error) {
      toast.error("Failed to delete material");
      console.error("Delete error:", error);
    } finally {
      setDeletingMaterialId(null);
      setMaterialToDelete(null);
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

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Materials Manager</h1>
          <p className="text-muted-foreground">Upload files or add URLs to build your personalized knowledge base</p>
        </div>

        <Tabs defaultValue="upload" className="mb-8">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="url">Add URLs</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <Card className="bg-card/80 backdrop-blur-sm border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  File Upload
                </CardTitle>
                <CardDescription>
                  Upload PDFs, documents, images, or text files to add to your learning materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div
                  className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isDragOver
                      ? "border-primary bg-primary/5"
                      : "border-muted-foreground/25"
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                >
                  {isFileUploading ? (
                    <>
                      <Loader2 className="h-12 w-12 mx-auto mb-4 text-primary animate-spin" />
                      <p className="text-lg font-medium mb-2">Processing files...</p>
                      <p className="text-muted-foreground mb-4">Please wait while we upload your files</p>
                    </>
                  ) : (
                    <>
                      <Upload className={`h-12 w-12 mx-auto mb-4 ${isDragOver ? "text-primary" : "text-muted-foreground"}`} />
                      <p className="text-lg font-medium mb-2">
                        {isDragOver ? "Drop files to upload" : "Drag and drop files here"}
                      </p>
                      <p className="text-muted-foreground mb-4">or click to browse</p>
                    </>
                  )}
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    disabled={isFileUploading}
                  />
                  <Button asChild disabled={isFileUploading}>
                    <label htmlFor="file-upload" className={isFileUploading ? "cursor-not-allowed" : "cursor-pointer"}>
                      {isFileUploading ? "Uploading..." : "Choose Files"}
                    </label>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="url" className="space-y-4">
            <Card className="bg-card/80 backdrop-blur-sm border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <LinkIcon className="h-5 w-5" />
                  URL Input
                </CardTitle>
                <CardDescription>
                  Add web pages, articles, or online resources to your materials
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  <Input
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/article"
                    onKeyPress={(e) => e.key === "Enter" && !isUrlAdding && handleUrlAdd()}
                    disabled={isUrlAdding}
                  />
                  <Button onClick={handleUrlAdd} disabled={isUrlAdding}>
                    {isUrlAdding ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Adding...
                      </>
                    ) : (
                      "Add URL"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Materials List */}
        <Card className="bg-card/80 backdrop-blur-sm border">
          <CardHeader>
            <CardTitle>Your Materials ({materials.length})</CardTitle>
            <CardDescription>
              All your uploaded files and added URLs will appear here
            </CardDescription>
          </CardHeader>
          <CardContent>
            {materials.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <File className="h-12 w-12 mx-auto mb-4" />
                <p>No materials uploaded yet</p>
                <p className="text-sm">Upload files or add URLs to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {materials.map((material) => (
                  <div key={material.id} className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                      {material.type === "file" ? (
                        <File className="h-5 w-5 text-primary flex-shrink-0" />
                      ) : (
                        <LinkIcon className="h-5 w-5 text-primary flex-shrink-0" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium truncate pr-2">{material.name}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground mt-1">
                        <Badge variant="outline" className="flex-shrink-0">
                          {material.type === "file" ? "File" : "URL"}
                        </Badge>
                        {material.size && <span className="flex-shrink-0">{material.size}</span>}
                        <span className="flex-shrink-0">{material.uploadDate.toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {material.type === "url" && material.url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => window.open(material.url, "_blank")}
                          className="h-8 w-8 p-0"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(material)}
                        disabled={deletingMaterialId === material.id}
                        className="h-8 w-8 p-0"
                      >
                        {deletingMaterialId === material.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Material</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{materialToDelete?.name}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cannot Delete Dialog */}
      <Dialog open={showCannotDelete} onOpenChange={setShowCannotDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cannot Delete Material</DialogTitle>
            <DialogDescription>
              The material "{materialToDelete?.name}" cannot be deleted because it is currently being used in your studies or other activities.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowCannotDelete(false)}>
              OK
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Materials;