import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
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
import { MessageSquare, Search, Calendar, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import throttle from "lodash.throttle";

interface ChatSession {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

interface ChatGroup {
  id: string;
  name: string;
  description: string;
  materials: string[];
  chatCount: number;
  color: string;
  internetConnection?: boolean;
}

interface ChatHistoryProps {
  sessions: ChatSession[];
  onSessionSelect: (session: ChatSession) => void;
  onSessionDelete: (sessionId: string) => void;
  selectedSession?: ChatSession;
  chatGroups: ChatGroup[];
  onScrollToBottom?: () => void;
}

const ChatHistory = ({ sessions, chatGroups, onSessionSelect, onSessionDelete, selectedSession, onScrollToBottom }: ChatHistoryProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [sessionToDelete, setSessionToDelete] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const filteredSessions = sessions.filter(session =>
    session.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.groupName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    session.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    const area = scrollRef.current;
    if (!area || !onScrollToBottom) return;

    const viewport = area.querySelector('[data-radix-scroll-area-viewport]');
    if (!viewport) return;

    const handleScroll = throttle(() => {
      const nearBottom = viewport.scrollTop + viewport.clientHeight >= viewport.scrollHeight - 50;
      if (nearBottom) onScrollToBottom();
    }, 500);

    viewport.addEventListener("scroll", handleScroll);
    return () => viewport.removeEventListener("scroll", handleScroll);
  }, [onScrollToBottom]);

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  const handleDeleteSession = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionToDelete(sessionId);
  };

  const confirmDelete = () => {
    if (sessionToDelete) {
      Promise.resolve(onSessionDelete(sessionToDelete))
        .finally(() => {
          setSessionToDelete(null);
          setDeletingSessionId(null);
        });
    }
  };

  const colorClasses: Record<string, string> = {
    blue: "bg-blue-500",
    green: "bg-green-500",
    purple: "bg-purple-500",
    orange: "bg-orange-500",
    pink: "bg-pink-500",
  };

  const getGroupColor = (groupId: string) => {
    const group = chatGroups.find(group => group.id === groupId);
    return group ? colorClasses[group.color] || "bg-gray-500" : "bg-gray-500";
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Chat History</h3>
        <Badge variant="secondary">{sessions.length} sessions</Badge>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search chat history..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      <ScrollArea className="h-[calc(100vh-192px)] sm:h-[calc(100vh-460px)] min-h-[550px]" ref={scrollRef}>
        <div ref={scrollRef} className="space-y-3 px-1 pr-3 pt-1 pb-1">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MessageSquare className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No chat sessions found</p>
              {searchTerm && (
                <p className="text-sm">Try adjusting your search terms</p>
              )}
            </div>
          ) : (
            filteredSessions.map(session => (
              <Card
                key={session.id}
                className={`cursor-pointer transition-all hover:shadow-sm group ${
                  selectedSession?.id === session.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onSessionSelect(session)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-medium text-sm truncate">{session.title}</h4>
                        <Badge variant="outline" className="text-xs flex items-center gap-1 max-w-24">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getGroupColor(session.groupId)}`} />
                          <span className="truncate">{session.groupName}</span>
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                        {session.lastMessage}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <MessageSquare className="h-3 w-3" />
                            {session.messageCount} messages
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(session.timestamp)}
                          </div>
                        </div>
                      </div>
                    </div>
                    <AlertDialog open={sessionToDelete === session.id} onOpenChange={(open) => !open && setSessionToDelete(null)}>
                      <AlertDialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0 ml-2"
                          onClick={(e) => {
                            setDeletingSessionId(session.id);
                            handleDeleteSession(session.id, e);
                          }}
                          disabled={deletingSessionId === session.id}
                        >
                          {deletingSessionId === session.id ? (
                            <Loader2 className="h-3 w-3 animate-spin" />
                          ) : (
                            <Trash2 className="h-3 w-3" />

                          )}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Chat Session</AlertDialogTitle>
                          <AlertDialogDescription>
                            Are you sure you want to delete "{session.title}"? This action cannot be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel onClick={() => setDeletingSessionId(null)}>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default ChatHistory;
