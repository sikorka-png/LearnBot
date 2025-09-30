
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";

interface ChallengeGANProps {
  topic: string;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const ChallengeGAN = ({ topic, onComplete, onCancel }: ChallengeGANProps) => {
  return (
    <Card className="max-w-2xl mx-auto bg-gradient-to-br from-orange-50 to-red-50">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-orange-500" />
          Challenge GAN
        </CardTitle>
      </CardHeader>
      <CardContent className="py-12 text-center">
        <div className="space-y-4">
          <div className="text-6xl mb-4">🚧</div>
          <h3 className="text-xl font-medium">Coming Soon</h3>
          <p className="text-muted-foreground">
            Challenge GAN mode is currently under development
          </p>
          <Button variant="outline" onClick={onCancel} className="mt-6">
            Back to Study Mode
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default ChallengeGAN;