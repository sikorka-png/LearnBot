
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mic } from "lucide-react";

interface AudioStudyProps {
  topic: string;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const AudioStudy = ({ topic, onComplete, onCancel }: AudioStudyProps) => {
  return (
    <Card className="max-w-4xl mx-auto bg-gradient-to-br from-pink-50 to-purple-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="h-5 w-5 text-pink-500" />
          Audio Study Session
        </CardTitle>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <div className="space-y-4">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-xl font-medium">Coming Soon</h3>
          <p className="text-muted-foreground">
            Audio Study mode is currently under development
          </p>
          <Button variant="outline" onClick={onCancel} className="mt-6">
            Back to Study Mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AudioStudy;