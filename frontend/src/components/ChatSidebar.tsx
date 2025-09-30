import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, History } from "lucide-react";
import ChatGroupComponent from "@/components/ChatGroup";
import ChatHistory from "@/components/ChatHistory";

interface ChatGroup {
  id: string;
  name: string;
  description: string;
  materials: string[];
  chatCount: number;
  color: string;
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

interface ChatSidebarProps {
  chatGroups: ChatGroup[];
  chatSessions: ChatSession[];
  selectedGroup?: ChatGroup;
  selectedSession?: ChatSession;
  onGroupSelect: (group: ChatGroup) => void;
  onGroupCreate: (group: Omit<ChatGroup, 'id' | 'chatCount'>) => void;
  onGroupEdit: (groupId: string, updatedGroup: Omit<ChatGroup, 'id' | 'chatCount'>) => void;
  onGroupDelete: (groupId: string) => void;
  onSessionSelect: (session: ChatSession) => void;
  onSessionDelete: (sessionId: string) => void;
  onScrollToBottom: () => void;
}

const ChatSidebar = React.memo(({
  chatGroups,
  chatSessions,
  selectedGroup,
  availableMaterials,
  selectedSession,
  onGroupSelect,
  onGroupCreate,
  onGroupEdit,
  onGroupDelete,
  onSessionSelect,
  onSessionDelete,
  onScrollToBottom
}: ChatSidebarProps) => {
  return (
    <Tabs defaultValue="groups" className="h-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="groups" className="text-xs sm:text-sm">
          <Users className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">Groups</span>
        </TabsTrigger>
        <TabsTrigger value="history" className="text-xs sm:text-sm">
          <History className="h-4 w-4 mr-1" />
          <span className="hidden sm:inline">History</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="groups" className="mt-4 h-[calc(100%-60px)]">
        <ChatGroupComponent
          groups={chatGroups}
          onGroupSelect={onGroupSelect}
          onGroupCreate={onGroupCreate}
          onGroupEdit={onGroupEdit}
          onGroupDelete={onGroupDelete}
          selectedGroup={selectedGroup}
          availableMaterials={availableMaterials}
        />
      </TabsContent>

      <TabsContent value="history" className="mt-4 h-[calc(100%-60px)]">
        <ChatHistory
          sessions={chatSessions}
          onSessionSelect={onSessionSelect}
          onSessionDelete={onSessionDelete}
          selectedSession={selectedSession}
          chatGroups={chatGroups}
          onScrollToBottom={onScrollToBottom}
        />
      </TabsContent>
    </Tabs>
  );
});

ChatSidebar.displayName = "ChatSidebar";

export default ChatSidebar;