import { GraduationCap } from "lucide-react";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";

const SUGGESTIONS = [
  {
    title: "Explain a topic",
    prompt: "Explain database normalization step by step, with examples of 1NF, 2NF, and 3NF.",
    emoji: "📚",
  },
  {
    title: "Solve a problem",
    prompt: "Solve this problem and show each step: A queue is implemented using two stacks. Explain how enqueue and dequeue work and give the time complexity.",
    emoji: "🧮",
  },
  {
    title: "Quiz me",
    prompt: "Create a 5-question multiple-choice quiz on operating system process scheduling, then reveal the answers.",
    emoji: "🎯",
  },
  {
    title: "Build a study plan",
    prompt: "I have an exam in 10 days. Build a day-by-day revision plan for data structures and algorithms.",
    emoji: "🗓️",
  },
];

export default function StudyAssistant() {
  return (
    <ChatWorkspace
      mode="study"
      title="AI Study Assistant"
      subtitle="Academic explanations, worked examples, quizzes, and revision plans."
      icon={<GraduationCap className="h-5 w-5" />}
      suggestions={SUGGESTIONS}
      emptyTitle="What are we studying?"
      emptyDescription="Ask an academic question, upload lecture material, request a worked solution, or generate a revision plan. The assistant is tuned for university-level study support."
    />
  );
}