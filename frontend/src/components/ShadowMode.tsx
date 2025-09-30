
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lightbulb } from "lucide-react";

interface ShadowModeProps {
  topic: string;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const ShadowMode = ({ topic, onComplete, onCancel }: ShadowModeProps) => {
  return (
    <Card className="max-w-3xl mx-auto bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-5 w-5 text-purple-500" />
          Shadow Mode
        </CardTitle>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <div className="space-y-4">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-xl font-medium">Coming Soon</h3>
          <p className="text-muted-foreground">
            Shadow Mode is currently under development
          </p>
          <Button variant="outline" onClick={onCancel} className="mt-6">
            Back to Study Mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ShadowMode;