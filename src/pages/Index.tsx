
import React from "react";
import ChatApp from "../components/ChatApp";
import { useToast } from "@/components/ui/use-toast";

const Index = () => {
  // Supabase URL and anon key would typically come from environment variables
  // For this demo, we're hardcoding them (they are public keys)
  const supabaseUrl = "https://yuhkhjnkfyteawaudzql.supabase.co";
  const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl1aGtoam5rZnl0ZWF3YXVkenFsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDUyMzgzNjYsImV4cCI6MjA2MDgxNDM2Nn0.m_-FuZ_Rhec7U12ngYnv4ZlgfZ6mvt4DcmJEok9RNlY";
  
  const { toast } = useToast();

  React.useEffect(() => {
    toast({
      title: "Welcome to Compose Chat",
      description: "Sign in or create an account to start chatting.",
    });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <ChatApp supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />
    </div>
  );
};

export default Index;
