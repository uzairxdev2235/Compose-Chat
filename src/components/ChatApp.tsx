
import React, { useEffect, useState, useRef } from 'react';
import { createClient, SupabaseClient, Session } from '@supabase/supabase-js';
import { Send, LogIn, LogOut, UserPlus, MessageCircle, Menu, X, User } from 'lucide-react';

// Types for our app
interface Message {
  id: number;
  created_at: string;
  content: string;
  user_id: string;
  user_email: string;
  profile_url?: string;
}

interface Profile {
  id: string;
  username: string;
  avatar_url?: string;
  updated_at?: string;
}

interface ChatAppProps {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

const ChatApp: React.FC<ChatAppProps> = ({ supabaseUrl, supabaseAnonKey }) => {
  // State
  const [session, setSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [view, setView] = useState<'chat' | 'login' | 'signup'>('login');
  const [error, setError] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profiles, setProfiles] = useState<Record<string, Profile>>({});
  
  // Initialize Supabase client
  const supabase: SupabaseClient = createClient(supabaseUrl, supabaseAnonKey);

  // Effect to check and set initial session
  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) fetchMessages();
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) fetchMessages();
    });

    // Cleanup subscription
    return () => subscription.unsubscribe();
  }, []);

  // Effect to scroll to bottom on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Effect to subscribe to new messages
  useEffect(() => {
    if (!session) return;

    // Subscribe to new messages
    const messagesSubscription = supabase
      .channel('public:messages')
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages' 
      }, (payload) => {
        const newMessage = payload.new as Message;
        setMessages(prev => [...prev, newMessage]);
        fetchProfiles([newMessage.user_id]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(messagesSubscription);
    };
  }, [session, supabase]);

  // Fetch messages from Supabase
  const fetchMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      if (data) {
        setMessages(data);
        // Get unique user IDs
        const userIds = [...new Set(data.map(msg => msg.user_id))];
        fetchProfiles(userIds);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Fetch profiles for users
  const fetchProfiles = async (userIds: string[]) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .in('id', userIds);

      if (error) throw error;
      
      if (data) {
        // Create a map of user_id to profile
        const profileMap = data.reduce((acc, profile) => {
          acc[profile.id] = profile;
          return acc;
        }, {} as Record<string, Profile>);
        
        setProfiles(prev => ({ ...prev, ...profileMap }));
      }
    } catch (error) {
      console.error('Error fetching profiles:', error);
    }
  };

  // Send a new message
  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !session) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert([
          { 
            content: newMessage, 
            user_id: session.user.id,
            user_email: session.user.email 
          }
        ])
        .select();

      if (error) throw error;
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Sign in with email and password
  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      setEmail('');
      setPassword('');
      setView('chat');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign up with email and password
  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      setLoading(true);
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });
      if (error) throw error;
      setEmail('');
      setPassword('');
      setError('Check your email for the confirmation link.');
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Sign out
  const signOut = async () => {
    try {
      setLoading(true);
      await supabase.auth.signOut();
      setView('login');
      setMenuOpen(false);
    } catch (error) {
      console.error('Error signing out:', error);
    } finally {
      setLoading(false);
    }
  };

  // Format timestamp to human readable
  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit'
    });
  };

  // Helper to scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Get initials from email for avatar fallback
  const getInitials = (email: string) => {
    return email.substring(0, 2).toUpperCase();
  };

  // Render the login view
  const renderLogin = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="compose-card w-full max-w-md p-6 space-y-6">
        <div className="flex items-center justify-center mb-8">
          <MessageCircle className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-primary">Compose Chat</h1>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={signIn} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="compose-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="compose-input w-full"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="compose-button bg-primary hover:bg-primary/90 text-white w-full py-2 flex items-center justify-center gap-2"
          >
            {loading ? 'Loading...' : (
              <>
                <LogIn size={18} />
                Sign In
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-sm text-gray-600">
            Don't have an account?{" "}
            <button
              onClick={() => {
                setError(null);
                setView('signup');
              }}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign Up
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  // Render the signup view
  const renderSignup = () => (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
      <div className="compose-card w-full max-w-md p-6 space-y-6">
        <div className="flex items-center justify-center mb-8">
          <MessageCircle className="h-8 w-8 text-primary mr-2" />
          <h1 className="text-2xl font-bold text-primary">Compose Chat</h1>
        </div>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <form onSubmit={signUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="compose-input w-full"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="compose-input w-full"
              required
              minLength={6}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="compose-button bg-primary hover:bg-primary/90 text-white w-full py-2 flex items-center justify-center gap-2"
          >
            {loading ? 'Loading...' : (
              <>
                <UserPlus size={18} />
                Sign Up
              </>
            )}
          </button>
        </form>

        <div className="text-center pt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              onClick={() => {
                setError(null);
                setView('login');
              }}
              className="text-primary hover:text-primary/80 font-medium"
            >
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  // Render the chat view
  const renderChat = () => {
    if (!session) return null;

    return (
      <div className="flex flex-col h-screen bg-background">
        {/* Header */}
        <header className="bg-white shadow-sm py-3 px-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <MessageCircle className="h-6 w-6 text-primary mr-2" />
              <h1 className="text-lg font-semibold">Compose Chat</h1>
            </div>
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="compose-ripple p-2 rounded-full hover:bg-gray-100"
            >
              {menuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>

            {menuOpen && (
              <div className="absolute right-4 top-14 z-10 compose-card min-w-[180px] py-2 animate-fade-in">
                <div className="flex items-center px-4 py-2 border-b border-gray-100">
                  <div className="compose-avatar bg-primary/10 w-8 h-8 flex items-center justify-center text-sm mr-2">
                    {session.user?.email ? getInitials(session.user.email) : "?"}
                  </div>
                  <div className="overflow-hidden">
                    <div className="font-medium truncate">
                      {session.user?.email}
                    </div>
                  </div>
                </div>
                <button
                  onClick={signOut}
                  className="flex items-center w-full px-4 py-2 text-left hover:bg-gray-100 text-sm"
                >
                  <LogOut size={16} className="mr-2" />
                  Sign Out
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center py-10">
                <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">No messages yet. Start the conversation!</p>
              </div>
            ) : (
              messages.map((msg) => {
                const isSelf = session.user.id === msg.user_id;
                const profile = profiles[msg.user_id];
                
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex ${isSelf ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 max-w-[85%]`}>
                      <div className="compose-avatar bg-primary/10 w-8 h-8 flex-shrink-0 flex items-center justify-center text-sm">
                        {profile?.avatar_url ? (
                          <img 
                            src={profile.avatar_url} 
                            alt={profile.username || msg.user_email} 
                            className="w-full h-full object-cover rounded-full"
                          />
                        ) : (
                          getInitials(msg.user_email)
                        )}
                      </div>
                      <div>
                        <div 
                          className={`compose-message-bubble ${
                            isSelf 
                              ? 'bg-primary text-white' 
                              : 'bg-white border border-gray-200'
                          }`}
                        >
                          {msg.content}
                        </div>
                        <div className={`text-xs text-gray-500 mt-1 ${isSelf ? 'text-right' : 'text-left'}`}>
                          {formatTimestamp(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Message input */}
        <footer className="border-t border-gray-200 px-4 py-3 bg-white">
          <form onSubmit={sendMessage} className="flex gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              className="compose-input flex-1"
            />
            <button
              type="submit"
              disabled={!newMessage.trim()}
              className={`compose-button p-3 ${
                newMessage.trim() 
                  ? 'bg-primary text-white hover:bg-primary/90' 
                  : 'bg-gray-200 text-gray-400'
              }`}
            >
              <Send size={18} />
            </button>
          </form>
        </footer>
      </div>
    );
  };

  // Conditionally render views
  if (loading && !session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-pulse flex flex-col items-center">
          <MessageCircle className="h-10 w-10 text-primary/50 mb-4" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (session && view !== 'chat') {
    setView('chat');
  }

  switch (view) {
    case 'signup':
      return renderSignup();
    case 'chat':
      return renderChat();
    default:
      return renderLogin();
  }
};

export default ChatApp;
