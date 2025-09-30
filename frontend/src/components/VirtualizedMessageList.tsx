import React, { useRef, useEffect } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Bot, User } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import ReactMarkdown from "react-markdown";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
}

interface VirtualizedMessageListProps {
  messages: Message[];
  isLoading: boolean;
  scrollToBottom?: boolean;
}

const VirtualizedMessageList: React.FC<VirtualizedMessageListProps> = ({
  messages,
  isLoading,
  scrollToBottom = false
}) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  // Add loading message if isLoading
  const allItems = React.useMemo(() => {
    const items = [...messages];
    if (isLoading) {
      items.push({
        id: "loading",
        content: "...",
        role: "assistant" as const,
        timestamp: new Date()
      });
    }
    return items;
  }, [messages, isLoading]);

  const virtualizer = useVirtualizer({
    count: allItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 80, // Estimated height per message
    overscan: 5,
    measureElement: el => el.getBoundingClientRect().height
  });

  // Auto-scroll to bottom when new messages are added or when scrollToBottom changes
  useEffect(() => {
    if (scrollToBottom && parentRef.current && allItems.length > 0) {
      requestAnimationFrame(() => {
        virtualizer.scrollToIndex(allItems.length - 1, {
          align: 'end',
          behavior: 'auto'
        });
      });
    }
  }, [allItems.length, scrollToBottom, virtualizer]);




  const renderMessage = (message: Message, isLoadingMessage: boolean) => {
    if (isLoadingMessage) {
      return (
        <div className="flex gap-2 sm:gap-3 justify-start">
          <div className="w-6 h-6 sm:w-8 sm:h-8 aspect-square rounded-full bg-secondary flex items-center justify-center">
            <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
          </div>
          <div className="bg-muted rounded-lg p-2 sm:p-3">
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce delay-100"></div>
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-muted-foreground rounded-full animate-bounce delay-200"></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div
        className={`flex gap-2 sm:gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}
      >
        <div className={`flex gap-2 sm:gap-3 ${
          isMobile ? 'max-w-[85%]' : 'max-w-[80%]'
        } ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
          <div className={`w-6 h-6 sm:w-8 sm:h-8 aspect-square rounded-full flex items-center justify-center ${
            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
          }`}>
            {message.role === "user" ?
              <User className="h-3 w-3 sm:h-4 sm:w-4" /> :
              <Bot className="h-3 w-3 sm:h-4 sm:w-4" />
            }
          </div>
          <div className={`rounded-lg p-2 sm:p-3 ${
            message.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-black dark:text-white"
          }`}>
            {message.role === "assistant" ? (
              <div className="text-xs sm:text-sm prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-li:my-0">
                <ReactMarkdown
                  components={{
                    p: ({ children }) => <p className="text-xs sm:text-sm mb-1 last:mb-0">{children}</p>,
                    h1: ({ children }) => <h1 className="text-sm sm:text-base font-bold mb-1">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-xs sm:text-sm font-bold mb-1">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-xs sm:text-sm font-semibold mb-1">{children}</h3>,
                    ul: ({ children }) => <ul className="list-disc pl-4 mb-1 text-xs sm:text-sm">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-4 mb-1 text-xs sm:text-sm">{children}</ol>,
                    li: ({ children }) => <li className="mb-0.5">{children}</li>,
                    code: ({ children }) => <code className="bg-background/20 px-1 py-0.5 rounded text-xs">{children}</code>,
                    pre: ({ children }) => <pre className="bg-background/20 p-2 rounded overflow-x-auto text-xs mb-1">{children}</pre>,
                    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                    em: ({ children }) => <em className="italic">{children}</em>,
                  }}
                >
                  {message.content}
                </ReactMarkdown>
              </div>
            ) : (
              <p className="text-xs sm:text-sm">{message.content}</p>
            )}
            <p className="text-xs opacity-70 mt-1">
              {message.timestamp.toLocaleTimeString()}
            </p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={parentRef}
      className="flex-1 overflow-auto px-3 sm:px-6 custom-scrollbar"
      style={{
        height: '100%',
      }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const message = allItems[virtualItem.index];
          const isLoadingMessage = message.id === "loading";

          return (
            <div
              key={virtualItem.key}
              ref={virtualizer.measureElement}
              data-index={virtualItem.index}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              className={`space-y-1 sm:space-y-2 py-1 sm:py-2 ${virtualItem.index === 0 ? 'pt-1 sm:pt-2' : ''}`}
            >
              {renderMessage(message, isLoadingMessage)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default VirtualizedMessageList;