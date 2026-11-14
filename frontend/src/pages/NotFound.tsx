import { Link } from "react-router-dom";
import { Compass, Home, MessageSquare } from "lucide-react";
import { PageContainer } from "@/components/layout/Sidebar";

export default function NotFound() {
  return (
    <PageContainer className="flex min-h-[70dvh] items-center justify-center">
      <div className="surface max-w-md p-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl accent-gradient text-white shadow-accent-lg">
          <Compass className="h-7 w-7" />
        </div>
        <p className="text-xs font-bold uppercase tracking-[0.2em] accent-text">404</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-[rgb(var(--text-main))]">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-[rgb(var(--text-muted))]">
          The page you are looking for does not exist. Head back to your dashboard or ask the AI assistant.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          <Link to="/" className="btn-accent">
            <Home className="h-4 w-4" /> Dashboard
          </Link>
          <Link to="/chat" className="btn-outline">
            <MessageSquare className="h-4 w-4" /> AI Chat
          </Link>
        </div>
      </div>
    </PageContainer>
  );
}