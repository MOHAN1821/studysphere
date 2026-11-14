import { MessageSquare } from "lucide-react";
import { ChatWorkspace } from "@/components/chat/ChatWorkspace";

const SUGGESTIONS = [
  {
    title: "Plan my week",
    prompt: "Help me plan a realistic weekly study schedule around my classes and assignments.",
    emoji: "🗓️",
  },
  {
    title: "Summarize my notes",
    prompt: "Teach me how to turn messy lecture notes into a concise, exam-ready summary.",
    emoji: "📝",
  },
  {
    title: "Explain a concept",
    prompt: "Explain how neural networks learn, using a simple analogy and a concrete example.",
    emoji: "💡",
  },
  {
    title: "Beat procrastination",
    prompt: "I keep procrastinating on a big assignment. Give me a practical 25-minute plan to start.",
    emoji: "⚡",
  },
];

export default function AIChat() {
  return (
    <ChatWorkspace
      mode="chat"
      title="AI Chat"
      subtitle="Your personal AI assistant for studying, planning, and everyday questions."
      icon={<MessageSquare className="h-5 w-5" />}
      suggestions={SUGGESTIONS}
      emptyTitle="How can I help you today?"
      emptyDescription="Ask anything, brainstorm ideas, summarize material, or turn a messy topic into a clear study plan. Attach notes and documents for context."
    />
  );
}