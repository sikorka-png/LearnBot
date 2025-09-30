import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight, CheckSquare } from "lucide-react";
import { cn } from "@/lib/utils";

interface TreeNode {
  id: string;
  topic_name: string;
  chunk_ids: string[];
  mastery_level: number;
  correct: number;
  attempts: number;
  last_seen: string | null;
  next_review: string | null;
  confidence: number;
  flashcards: any[];
  quiz_questions: any[];
  subtopics: TreeNode[];
}

interface TopicTreeProps {
  topicsData: TreeNode[];
  selectedTopics: string[];
  onSelectionChange: (topics: string[]) => void;
}

const getMasteryColor = (level: number) => {
  // 0 = red, 5 = green
  const colors = [
    "bg-red-500 hover:bg-red-600 text-white",
    "bg-red-400 hover:bg-red-500 text-white",
    "bg-orange-500 hover:bg-orange-600 text-white",
    "bg-yellow-500 hover:bg-yellow-600 text-white",
    "bg-lime-500 hover:bg-lime-600 text-white",
    "bg-green-500 hover:bg-green-600 text-white"
  ];
  return colors[Math.min(level, 5)];
};

const TopicTree = ({ topicsData, selectedTopics, onSelectionChange }: TopicTreeProps) => {
  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  const toggleTopic = (topicName: string) => {
    const newExpanded = new Set(expandedTopics);
    if (newExpanded.has(topicName)) {
      newExpanded.delete(topicName);
    } else {
      newExpanded.add(topicName);
    }
    setExpandedTopics(newExpanded);
  };

  const collectAllTopicPaths = (nodes: TreeNode[], base = ""): string[] =>
    nodes.flatMap((n) => {
      const current = base ? `${base}/${n.topic_name}` : n.topic_name;
      const kids = n.subtopics?.length ? collectAllTopicPaths(n.subtopics, current) : [];
      return [current, ...kids];
    });

  const selectAllTopics = () => {
    onSelectionChange(collectAllTopicPaths(topicsData));
  };

  const toggleTopicSelection = (path: string) => {
    const newSelection = selectedTopics.includes(path)
      ? selectedTopics.filter(t => t !== path)
      : [...selectedTopics, path];
    onSelectionChange(newSelection);
  };

  const isTopicSelected = (path: string) => {
    return selectedTopics.includes(path);
  };

  const renderNode = (node: TreeNode, base = "", depth = 0) => {
    const path = base ? `${base}/${node.topic_name}` : node.topic_name;
    const hasChildren = node.subtopics && node.subtopics.length > 0;
    const isExpanded = expandedTopics.has(path);

    return (
      <div key={path} className="space-y-1">
        <div className="flex items-center" style={{ marginLeft: `${depth * 24}px` }}>
          {hasChildren ? (
            <Button
              variant="ghost"
              onClick={() => toggleTopic(path)}
              className="w-full justify-start p-2 h-auto font-medium"
            >
              {isExpanded ? <ChevronDown className="h-4 w-4 mr-2" /> : <ChevronRight className="h-4 w-4 mr-2" />}
              {node.topic_name}
            </Button>
          ) : (
            <Button
              variant={isTopicSelected(path) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTopicSelection(path)}
              className="w-full justify-start text-sm h-8"
            >
              <div className="flex items-center gap-2 w-full">
                <span>{node.topic_name}</span>
                <div className="ml-auto flex items-center gap-1 text-xs">
                  <span className={cn("px-1 rounded text-white", getMasteryColor(node.mastery_level))}>
                    Level {node.mastery_level}
                  </span>
                  {node.attempts > 0 && (
                    <span className="bg-black/10 px-1 rounded">
                      {Math.round((node.correct / node.attempts) * 100)}%
                    </span>
                  )}
                </div>
              </div>
            </Button>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-1">
            {node.subtopics.map((child) => renderNode(child, path, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-card/80 backdrop-blur-sm border">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Topics</span>
          <Button
            variant="outline"
            size="sm"
            onClick={selectAllTopics}
            className="flex items-center gap-2"
          >
            <CheckSquare className="h-4 w-4" />
            Select All Topics
          </Button>
        </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
        <ScrollArea className="h-[400px] px-6">
          <div className="space-y-2 pb-6">
          {topicsData.map((node) => renderNode(node))}
        </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default TopicTree;