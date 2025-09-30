
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NewPassword from "./pages/NewPassword";
import Account from "./pages/Account";
import Pricing from "./pages/Pricing";
import Notes from "./pages/Notes";
import Materials from "./pages/Materials";
import StudyMode from "./pages/StudyMode";
import StudySessions from "./pages/StudySessions";
import ExamMode from "./pages/ExamMode";
import ExamDetails from "./pages/ExamDetails";
import Chat from "./pages/Chat";
import Contact from "./pages/Contact";
import Blog from "./pages/Blog";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <TooltipProvider>
        <Toaster />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/new-password" element={<NewPassword />} />
            <Route path="/account" element={<Account />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/materials" element={<Materials />} />
            <Route path="/study-mode" element={<StudyMode />} />
            <Route path="/exam-mode" element={<ExamMode />} />
            <Route path="/exam-details" element={<ExamDetails />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;