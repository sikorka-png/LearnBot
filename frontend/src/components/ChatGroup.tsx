import axios from "axios";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, BookOpen, Users, Edit3, Trash2, Wifi, WifiOff, Loader2 } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

interface ChatGroup {
  id: string;
  name: string;
  description: string;
  materials: string[];
  chatCount: number;
  color: string;
  internetConnection?: boolean;
}

interface ChatGroupProps {
  groups: ChatGroup[];
  onGroupSelect: (group: ChatGroup) => void;
  onGroupCreate: (group: Omit<ChatGroup, 'id' | 'chatCount'>) => void;
  onGroupEdit: (groupId: string, updatedGroup: Omit<ChatGroup, 'id' | 'chatCount'>) => void;
  onGroupDelete: (groupId: string) => void;
  selectedGroup?: ChatGroup;
  availableMaterials: string[];
}

const ChatGroupComponent = ({ groups, onGroupSelect, onGroupCreate, onGroupEdit, onGroupDelete, selectedGroup, availableMaterials }: ChatGroupProps) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<string | null>(null);
  const [groupToEdit, setGroupToEdit] = useState<ChatGroup | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: "",
    description: "",
    materials: [] as string[],
    color: "blue",
    internetConnection: false
  });
  const [editGroup, setEditGroup] = useState({
    name: "",
    description: "",
    materials: [] as string[],
    color: "blue",
    internetConnection: false
  });

  const colorOptions = [
    { value: "blue", label: "Blue", class: "bg-blue-500" },
    { value: "green", label: "Green", class: "bg-green-500" },
    { value: "purple", label: "Purple", class: "bg-purple-500" },
    { value: "orange", label: "Orange", class: "bg-orange-500" },
    { value: "pink", label: "Pink", class: "bg-pink-500" },
  ];

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setCreatingGroup(true);

    try {
      const createdGroup = await onGroupCreate(newGroup);

      if (createdGroup) {
        setNewGroup({ name: "", description: "", materials: [], color: "blue", internetConnection: false });
        setIsCreateOpen(false);
        toast.success("Chat group created successfully");
      }
    } catch {
    } finally {
      setCreatingGroup(false);
    }
  };

  const toggleMaterial = (material: string) => {
    setNewGroup(prev => ({
      ...prev,
      materials: prev.materials.includes(material)
        ? prev.materials.filter(m => m !== material)
        : [...prev.materials, material]
    }));
  };

  const toggleEditMaterial = (material: string) => {
    setEditGroup(prev => ({
      ...prev,
      materials: prev.materials.includes(material)
        ? prev.materials.filter(m => m !== material)
        : [...prev.materials, material]
    }));
  };

  const handleEditGroup = (group: ChatGroup, e: React.MouseEvent) => {
    console.log(group);
    e.stopPropagation();
    setGroupToEdit(group);
    setEditGroup({
      name: group.name,
      description: group.description,
      materials: [...group.materials],
      color: group.color,
      internetConnection: group.internetConnection || false
    });
    setIsEditOpen(true);
  };

  const handleUpdateGroup = async () => {
    if (!editGroup.name.trim()) {
      toast.error("Group name is required");
      return;
    }
    setCreatingGroup(true);

    try {
      const edited = await onGroupEdit(groupToEdit.id, editGroup);
      if (edited) {
        setIsEditOpen(false);
        setGroupToEdit(null);
        toast.success("Chat group updated successfully");
      }
    } catch {
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleDeleteGroup = (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setGroupToDelete(groupId);
  };

  const confirmDelete = () => {
    if (groupToDelete) {
      setGroupToDelete(null);
      Promise.resolve(onGroupDelete(groupToDelete))
        .finally(() => {
          setGroupToDelete(null);
          setDeletingGroupId(null);
        });
    }
  };

  const isFormValid =
    newGroup.name.trim() !== "" &&
    newGroup.materials.length > 0;

  const isEditFormValid =
    editGroup.name.trim() !== "" &&
    editGroup.materials.length > 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Chat Groups</h3>
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Group
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Chat Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  value={newGroup.name}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mathematics, Science, History"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={newGroup.description}
                  onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this group"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <Select value={newGroup.color} onValueChange={(value) => setNewGroup(prev => ({ ...prev, color: value }))}>
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
                        variant={newGroup.materials.includes(material) ? "default" : "outline"}
                        className="cursor-pointer"
                        onClick={() => toggleMaterial(material)}
                      >
                        {material}
                      </Badge>
                    ))
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="internet-connection"
                  checked={newGroup.internetConnection}
                  onCheckedChange={(checked) =>
                    setNewGroup(prev => ({ ...prev, internetConnection: checked as boolean }))
                  }
                />
                <label htmlFor="internet-connection" className="text-sm font-medium">
                  Internet connection
                </label>
              </div>
              <Button
                onClick={handleCreateGroup}
                className="w-full"
                disabled={!isFormValid || creatingGroup}
              >
                {creatingGroup ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Create Group"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Chat Group</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">Group Name</label>
                <Input
                  value={editGroup.name}
                  onChange={(e) => setEditGroup(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Mathematics, Science, History"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Description</label>
                <Input
                  value={editGroup.description}
                  onChange={(e) => setEditGroup(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of this group"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Color</label>
                <Select value={editGroup.color} onValueChange={(value) => setEditGroup(prev => ({ ...prev, color: value }))}>
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
                <label className="text-sm font-medium">Default Materials</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {availableMaterials.map(material => (
                    <Badge
                      key={material}
                      variant={editGroup.materials.includes(material) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleEditMaterial(material)}
                    >
                      {material}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="edit-internet-connection"
                  checked={editGroup.internetConnection}
                  onCheckedChange={(checked) =>
                    setEditGroup(prev => ({ ...prev, internetConnection: checked as boolean }))
                  }
                />
                <label htmlFor="edit-internet-connection" className="text-sm font-medium">
                  Internet connection
                </label>
              </div>
              <Button
                onClick={handleUpdateGroup}
                className="w-full"
                disabled={!isEditFormValid || creatingGroup}
              >
                {creatingGroup ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  "Update Group"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollArea className="h-[calc(100vh-144px)] sm:h-[calc(100vh-460px)] min-h-[550px]">
        <div className="grid gap-3 px-1 pr-3 pt-1 pb-1">
          {groups.map(group => (
            <Card
              key={group.id}
              className={`cursor-pointer transition-all hover:shadow-md ${
                selectedGroup?.id === group.id ? 'ring-2 ring-primary' : ''
              }`}
              onClick={() => onGroupSelect(group)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full bg-${group.color}-500`} />
                    <CardTitle className="text-sm">{group.name}</CardTitle>
                    {group.internetConnection && (
                      <span title="Internet connection enabled">
                        <Wifi className="h-3 w-3 text-green-500" />
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0"
                      onClick={(e) => handleEditGroup(group, e)}
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <AlertDialog open={groupToDelete === group.id} onOpenChange={(open) => !open && setGroupToDelete(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={(e) => {
                            setDeletingGroupId(group.id);
                            handleDeleteGroup(group.id, e);
                          }}
                          disabled={deletingGroupId === group.id}
                        >
                          {deletingGroupId === group.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Chat Group</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{group.name}"? This will also delete all chat sessions in this group. This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeletingGroupId(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-xs text-muted-foreground mb-2">{group.description}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {group.chatCount} chats
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-3 w-3" />
                      {group.materials.length} materials
                    </div>
                  </div>
                </div>
                {group.materials.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {group.materials.slice(0, 2).map(material => (
                      <Badge key={material} variant="secondary" className="text-xs max-w-[120px]">
                        <span className="truncate block">{material}</span>
                      </Badge>
                    ))}
                    {group.materials.length > 2 && (
                      <Badge variant="secondary" className="text-xs">
                        +{group.materials.length - 2} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatGroupComponent;
