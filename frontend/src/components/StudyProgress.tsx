
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Clock, Trophy, Target } from "lucide-react";

interface StudySession {
  id: string;
  type: "flashcards" | "quiz" | "focused" | "exam" | "challenge-gan" | "shadow-mode" | "socratic-tutor" | "audio-study" | "speed-drill" | "peer-review" | "memory-palace";
  topic: string;
  duration: number;
  score?: number;
  completed: boolean;
  date: Date;
}

interface StudyProgressProps {
  sessions: StudySession[];
}

const StudyProgress = ({ sessions }: StudyProgressProps) => {
  const completedSessions = sessions.filter(s => s.completed);
  const totalStudyTime = completedSessions.reduce((acc, session) => acc + session.duration, 0);
  const averageScore = completedSessions.length > 0
    ? completedSessions.filter(s => s.score).reduce((acc, session) => acc + (session.score || 0), 0) / completedSessions.filter(s => s.score).length
    : 0;

  const getSessionTypeLabel = (type: StudySession["type"]) => {
    switch (type) {
      case "flashcards": return "Flashcards";
      case "quiz": return "Quiz";
      case "focused": return "Focused Study";
      case "exam": return "Exam";
      case "challenge-gan": return "Challenge GAN";
      case "shadow-mode": return "Shadow Mode";
      case "socratic-tutor": return "Socratic Tutor";
      case "audio-study": return "Audio Study";
      case "speed-drill": return "Speed Drill";
      case "peer-review": return "Peer Review";
      case "memory-palace": return "Memory Palace";
      default: return type;
    }
  };

  const getSessionTypeColor = (type: StudySession["type"]) => {
    switch (type) {
      case "flashcards": return "bg-yellow-100 text-yellow-800";
      case "quiz": return "bg-green-100 text-green-800";
      case "focused": return "bg-blue-100 text-blue-800";
      case "exam": return "bg-red-100 text-red-800";
      case "challenge-gan": return "bg-orange-100 text-orange-800";
      case "shadow-mode": return "bg-purple-100 text-purple-800";
      case "socratic-tutor": return "bg-cyan-100 text-cyan-800";
      case "audio-study": return "bg-pink-100 text-pink-800";
      case "speed-drill": return "bg-red-100 text-red-800";
      case "peer-review": return "bg-indigo-100 text-indigo-800";
      case "memory-palace": return "bg-emerald-100 text-emerald-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedSessions.length}</div>
            <p className="text-xs text-muted-foreground">
              Completed sessions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Study Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalStudyTime}m</div>
            <p className="text-xs text-muted-foreground">
              Total minutes studied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Score</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(averageScore)}%</div>
            <p className="text-xs text-muted-foreground">
              Across all scored sessions
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Recent Sessions
          </CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              No study sessions yet. Start your first session to see your progress!
            </p>
          ) : (
            <div className="space-y-4">
              {sessions.slice(0, 10).map((session) => (
                <div key={session.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <Badge className={getSessionTypeColor(session.type)}>
                      {getSessionTypeLabel(session.type)}
                    </Badge>
                    <div>
                      <p className="font-medium">{session.topic}</p>
                      <p className="text-sm text-muted-foreground">
                        {session.date.toLocaleDateString()} • {session.duration} minutes
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    {session.completed ? (
                      <div className="flex items-center gap-2">
                        {session.score && (
                          <span className="text-lg font-bold">{session.score}%</span>
                        )}
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          Completed
                        </Badge>
                      </div>
                    ) : (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        In Progress
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default StudyProgress;