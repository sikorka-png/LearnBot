import axios from "axios";
import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Send, Bot, User, BookOpen, History, Users, Plus, Menu } from "lucide-react";
import Navigation from "@/components/Navigation";
import ChatSidebar from "@/components/ChatSidebar";
import VirtualizedMessageList from "@/components/VirtualizedMessageList";
import { toast } from "sonner";
import { useIsMobile } from "@/hooks/use-mobile";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
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

interface ChatSession {
  id: string;
  title: string;
  groupId: string;
  groupName: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

const Chat = () => {
  const [shouldScrollToBottom, setShouldScrollToBottom] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI learning assistant. Select a chat group to start learning with your organized materials, or browse your chat history to continue previous conversations.",
      role: "assistant",
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<ChatGroup>();
  const [selectedSession, setSelectedSession] = useState<ChatSession>();
  const [generalGroup, setGeneralGroup] = useState<ChatGroup | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();
  const [activeTab, setActiveTab] = useState<"groups" | "history">("groups");
  const [historyPage, setHistoryPage] = useState(0);
  const [hasMoreHistory, setHasMoreHistory] = useState(true);
  const isHistoryLoading = useRef(false);
  const limit = 10;
  const [availableMaterials, setAvailableMaterials] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      axios.get("http://localhost:8000/chat/groups", { withCredentials: true }),
      axios.get("http://localhost:8000/chat/group/general", { withCredentials: true })
    ])
      .then(([groupsRes, generalRes]) => {
        const general = generalRes.data;
        setGeneralGroup(general);

        const groups = groupsRes.data;
        const hasGeneral = groups.some((g: any) => g.id === general.id);
        const allGroups = hasGeneral ? groups : [general, ...groups];

        setChatGroups(allGroups);
        setSelectedGroup(general);
        setSelectedSession(undefined);
        setMessages([
          {
            id: "init-1",
            content: "Hello! I'm your AI learning assistant. Select a chat group to start learning with your organized materials, or browse your chat history to continue previous conversations.",
            role: "assistant",
            timestamp: new Date()
          }
        ]);
      })
      .catch(() => toast.error("Failed to load chat groups or general"));
  }, []);

   useEffect(() => {
    setShouldScrollToBottom(true);
    const timeout = setTimeout(() => setShouldScrollToBottom(false), 100);
    return () => clearTimeout(timeout);
  }, [messages]);

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

  useEffect(() => {
    if (!isLoading) {
      inputRef.current?.focus();
    }
  }, [isLoading]);

  useEffect(() => {
    loadMoreHistory();
  }, []);

  const loadMoreHistory = useCallback(async () => {
    if (isHistoryLoading.current || !hasMoreHistory) return;
    isHistoryLoading.current = true;

    try {
      const res = await axios.get(
        `http://localhost:8000/chat/history?offset=${historyPage * limit}&limit=${limit}`,
        { withCredentials: true }
      );

      const newSessions: ChatSession[] = res.data.map((session: any) => ({
        ...session,
        timestamp: new Date(session.timestamp)
      }));

      setChatSessions(prev => [...prev, ...newSessions]);
      setHistoryPage(prev => prev + 1);

      if (newSessions.length < limit) {
        setHasMoreHistory(false);
      }
    } catch {
      toast.error("Failed to fetch history");
    } finally {
      isHistoryLoading.current = false;
    }
  }, [hasMoreHistory, historyPage]);

  const [chatGroups, setChatGroups] = useState<ChatGroup[]>([]);

  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      content: input,
      role: "user",
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      const res = await axios.post("http://localhost:8000/chat/message/send", {
        content: input,
        group_id: selectedSession ? Number(selectedSession.groupId) : Number(selectedGroup.id),
        chat_id: selectedSession ? Number(selectedSession.id) : null
      }, {
        withCredentials: true
      });

      const aiMessage: Message = {
        id: res.data.id.toString(),
        content: res.data.content,
        role: "assistant",
        timestamp: new Date(res.data.date)
      };

      setMessages(prev => [...prev, aiMessage]);
      setIsLoading(false);

      if (!selectedSession) {
        const newSession: ChatSession = {
          id: res.data.chat_id.toString(),
          title: userMessage.content,
          groupId: selectedGroup.id,
          groupName: selectedGroup.name,
          lastMessage: aiMessage.content,
          timestamp: new Date(res.data.date),
          messageCount: 2
        };
        setSelectedSession(newSession);
        setChatSessions(prev => [newSession, ...prev]);
      }
    } catch (error) {
      toast.error("Failed to send message");
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey && !isLoading) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleGroupSelect = (group: ChatGroup) => {
    setSelectedGroup(group);
    setSelectedSession(undefined);
    setSidebarOpen(false);

    const welcomeMessage: Message = {
      id: Date.now().toString(),
      content: `Welcome to your ${group.name} chat! I have access to your materials: ${group.materials.join(", ")}. What would you like to learn about today?`,
      role: "assistant",
      timestamp: new Date()
    };
    
    setMessages([welcomeMessage]);
    setShouldScrollToBottom(true);
    toast.success(`Started new chat in ${group.name} group`);
  };

  const handleGroupCreate = async (newGroup: Omit<ChatGroup, 'id' | 'chatCount'>): Promise<ChatGroup | null> => {
    try {
      const res = await axios.post("http://localhost:8000/chat/group/create", newGroup, {
        withCredentials: true
      });
      setChatGroups(prev => [...prev, res.data]);
      return res.data;
    } catch (e) {
      console.error(e);
      toast.error("Failed to create group");
      return null;
    }
  };

  const handleGroupEdit = async (groupId: string, updatedGroup: Omit<ChatGroup, 'id' | 'chatCount'>) => {
    try {
      await axios.put(`http://localhost:8000/chat/group/${groupId}`, updatedGroup, {
        withCredentials: true
      });
      setChatGroups(prev => prev.map(group =>
        group.id === groupId
          ? { ...group, ...updatedGroup }
          : group
      ));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(prev => prev ? { ...prev, ...updatedGroup } : prev);
      }
      return true;
    } catch (e) {
      toast.error("Failed to update group");
      return false;
    }
  };

  const handleGroupDelete = async (groupId: string) => {
    try {
      await axios.delete(`http://localhost:8000/chat/group/${groupId}`, {
        withCredentials: true
      });

      setChatGroups(prev => prev.filter(g => g.id !== groupId));
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(undefined);
      }

      toast.success("Group deleted");
    } catch (error) {
      toast.error("Failed to delete group");
    }
  };

  const handleSessionSelect = async (session: ChatSession) => {
    setSelectedSession(session);
    setSidebarOpen(false);

    try {
      const res = await axios.get(`http://localhost:8000/chat/messages/${session.id}`, {
        withCredentials: true
      });

      const fetchedMessages: Message[] = res.data.map((msg: any) => ({
        id: msg.id.toString(),
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.date)
      }));

      setMessages(fetchedMessages);
      setShouldScrollToBottom(true);
      toast.success(`Loaded chat: ${session.title}`);
    } catch (error) {
      toast.error("Failed to load messages");
    }
  };

  const handleSessionDelete = async (sessionId: string) => {
    try {
      await axios.delete(`http://localhost:8000/chat/history/${sessionId}`, {
        withCredentials: true
      });

      setChatSessions(prev => prev.filter(s => s.id !== sessionId));
      if (selectedSession?.id === sessionId) {
        setSelectedSession(undefined);
      }

      toast.success("Chat deleted successfully");
    } catch (error) {
      toast.error("Failed to delete chat");
    }
  };

  const startNewChat = () => {
    if (!generalGroup) {
      toast.error("General group not loaded");
      return;
    }

    setSelectedGroup(generalGroup);
    setSelectedSession(undefined);
    setMessages([
      {
        id: "new-1",
        content: "Hello! I'm your AI learning assistant. Select a chat group to start learning with your organized materials, or browse your chat history to continue previous conversations.",
        role: "assistant",
        timestamp: new Date()
      }
    ]);
    setShouldScrollToBottom(true);
  };

  const sidebarContent = useMemo(() => (
    <ChatSidebar
      chatGroups={chatGroups.filter(group => group.id !== generalGroup?.id)}
      chatSessions={chatSessions}
      selectedGroup={selectedGroup}
      selectedSession={selectedSession}
      onGroupSelect={handleGroupSelect}
      availableMaterials={availableMaterials}
      onGroupCreate={handleGroupCreate}
      onGroupEdit={handleGroupEdit}
      onGroupDelete={handleGroupDelete}
      onSessionSelect={handleSessionSelect}
      onSessionDelete={handleSessionDelete}
      onScrollToBottom={loadMoreHistory}
    />
  ), [chatGroups, chatSessions, selectedGroup, selectedSession]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-100 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      <Navigation />
        {/* Floating Background Elements */}
        <div className="fixed inset-0 pointer-events-none">
          <div className="absolute top-32 left-16 w-72 h-72 bg-blue-400/10 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute top-20 right-24 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute bottom-32 left-1/3 w-80 h-80 bg-pink-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <div className="mb-4 sm:mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* Mobile hamburger menu */}
            {isMobile && (
              <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-80 p-4">
                  {sidebarContent}
                </SheetContent>
              </Sheet>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2 text-foreground">AI Chat Tutor</h1>
              <p className="text-xs sm:text-sm text-muted-foreground">
                {selectedGroup ? `Chatting in ${selectedGroup.name}` :
                 selectedSession ? `Continuing: ${selectedSession.title}` :
                 "Select a group or session to start learning"}
              </p>
            </div>
          </div>
          <Button onClick={startNewChat} variant="outline" size={isMobile ? "sm" : "default"}>
            <Plus className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">New Chat (General)</span>
          </Button>
        </div>

        <div className={`grid gap-3 sm:gap-6 h-[calc(100vh-200px)] sm:h-[calc(100vh-404px)] ${
          isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3 lg:grid-cols-4'
        }`}>
          {/* Desktop/Tablet Sidebar */}
          {!isMobile && (
            <div className={`${isMobile ? 'hidden' : 'block'} md:col-span-1`}>
              {sidebarContent}
            </div>
          )}

          {/* Chat Interface */}
          <div className={`${isMobile ? 'col-span-1' : 'md:col-span-2 lg:col-span-3'}`}>
            {/* Active Materials - Compressed on tablet */}
            {selectedGroup && (
              <Card className="mb-3 sm:mb-4 bg-card/80 backdrop-blur-sm border">
                <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
                  <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} flex items-center gap-2 text-card-foreground`}>
                    <div className={`w-3 h-3 rounded-full bg-${selectedGroup.color}-500`} />
                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="truncate">Active Materials - {selectedGroup.name}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className={isMobile ? 'pt-0' : ''}>
                  <div className="flex gap-1 sm:gap-2 flex-wrap">
                    {selectedGroup.materials.map(material => (
                      <Badge key={material} variant="secondary" className="text-xs">
                        {material}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Chat Interface */}
            <Card className={`h-full flex flex-col ${
              isMobile
                ? 'max-h-[calc(100vh-250px)] min-h-[400px]'
                : 'max-h-[calc(100vh-404px)] min-h-[500px] lg:min-h-[616px]'
            } bg-card/80 backdrop-blur-sm border`}>
              <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'} flex-shrink-0`}>
                <CardTitle className={`${isMobile ? 'text-base' : 'text-lg'} text-card-foreground truncate`}>
                  {selectedSession ? selectedSession.title :
                   selectedGroup ? `${selectedGroup.name} Chat` :
                   "New Chat (General)"}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 flex flex-col p-0 min-h-0">
                <VirtualizedMessageList
                  messages={messages}
                  isLoading={isLoading}
                  scrollToBottom={shouldScrollToBottom}
                />

                <div className={`${isMobile ? 'p-3' : 'p-6'} border-t flex-shrink-0`}>
                  <div className="flex gap-2">
                    <Input
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={selectedGroup ?
                        `Ask about ${selectedGroup.name}...` :
                        "Select a group or start a new chat..."}
                      onKeyPress={handleKeyPress}
                      className={isMobile ? 'text-sm' : ''}
                    />
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      size={isMobile ? "sm" : "default"}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;
