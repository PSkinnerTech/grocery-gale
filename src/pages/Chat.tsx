import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import { Menu, User, Send, RotateCcw, History } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: string; // Changed to string for JSON compatibility
}

interface MealPlan {
  id: string;
  title: string;
  week_start_date: string;
  created_at: string;
}

interface UserProfile {
  first_name: string | null;
  last_name: string | null;
  email: string | null;
}

interface ChatConversation {
  id: string;
  title: string;
  messages: Message[];
  created_at: string;
}

export default function Chat() {
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [mealPlans, setMealPlans] = useState<MealPlan[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const hasTriggeredWebhook = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    const checkOnboardingAndTriggerWebhook = async () => {
      try {
        // Check if user has completed onboarding
        const { data: preferences, error } = await supabase
          .from('dietary_preferences')
          .select('onboarding_completed')
          .eq('user_id', user.id)
          .single();

        if (error || !preferences?.onboarding_completed) {
          navigate('/onboarding');
          return;
        }

        // Load meal plans, user profile, and chat conversations
        loadMealPlans();
        loadUserProfile();
        loadChatConversations();

        // Trigger webhook only once per session
        if (!hasTriggeredWebhook.current) {
          triggerWebhook();
          hasTriggeredWebhook.current = true;
        }
      } catch (error) {
        console.error('Error checking onboarding:', error);
        navigate('/onboarding');
      }
    };

    checkOnboardingAndTriggerWebhook();
  }, [user, navigate]);

  const triggerWebhook = async () => {
    try {
      const webhookUrl = 'https://pskinnertech.app.n8n.cloud/webhook-test/gale';
      
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          user_id: user?.id,
          timestamp: new Date().toISOString(),
          triggered_from: 'chat_interface',
          event: 'user_entered_chat'
        }),
      });

      console.log('Webhook triggered successfully');
    } catch (error) {
      console.error('Error triggering webhook:', error);
    }
  };

  const loadMealPlans = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select('id, title, week_start_date, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setMealPlans(data || []);
    } catch (error) {
      console.error('Error loading meal plans:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setUserProfile(data || null);
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  };

  const loadChatConversations = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('chat_conversations')
        .select('id, title, messages, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;
      setChatConversations((data || []).map(conv => ({
        ...conv,
        messages: conv.messages as unknown as Message[]
      })));
    } catch (error) {
      console.error('Error loading chat conversations:', error);
    }
  };

  const saveCurrentConversation = async () => {
    if (!user || messages.length === 0) return;

    try {
      const title = messages.find(m => m.sender === 'user')?.content.slice(0, 50) + '...' || 'New Conversation';
      
      if (currentConversationId) {
        // Update existing conversation
        const { error } = await supabase
          .from('chat_conversations')
          .update({
            messages: messages as any,
            title: title
          })
          .eq('id', currentConversationId);

        if (error) throw error;
      } else {
        // Create new conversation
        const { data, error } = await supabase
          .from('chat_conversations')
          .insert({
            user_id: user.id,
            title: title,
            messages: messages as any
          })
          .select()
          .single();

        if (error) throw error;
        setCurrentConversationId(data.id);
      }
      
      loadChatConversations();
    } catch (error) {
      console.error('Error saving conversation:', error);
    }
  };

  const loadConversation = (conversation: ChatConversation) => {
    setMessages(conversation.messages);
    setCurrentConversationId(conversation.id);
  };

  const restartChat = async () => {
    if (messages.length > 0) {
      await saveCurrentConversation();
    }
    setMessages([]);
    setCurrentConversationId(null);
    toast({
      title: "Chat restarted",
      description: "Previous conversation has been saved to history."
    });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputMessage;
    setInputMessage('');
    setLoading(true);

    // Record user message timestamp
    if (user) {
      try {
        await supabase
          .from('user_message_activity')
          .upsert({
            user_id: user.id,
            last_message_timestamp: new Date().toISOString()
          }, {
            onConflict: 'user_id'
          });
      } catch (error) {
        console.error('Error recording message timestamp:', error);
      }
    }

    // Send message to n8n webhook and get response
    try {
      const webhookUrl = 'https://pskinnertech.app.n8n.cloud/webhook-test/gale';
      
      // Fetch dietary preferences for the webhook
      let dietaryData = {};
      try {
        const { data: preferences } = await supabase
          .from('dietary_preferences')
          .select('dietary_preference, allergies, meals_per_day, adults_count, children_count')
          .eq('user_id', user?.id)
          .single();
        
        if (preferences) {
          dietaryData = preferences;
        }
      } catch (error) {
        console.error('Error fetching dietary preferences:', error);
      }
      
      const formData = new FormData();
      formData.append('message', messageContent);
      formData.append('timestamp', new Date().toISOString());
      formData.append('user_id', user?.id || '');
      formData.append('first_name', userProfile?.first_name || '');
      formData.append('last_name', userProfile?.last_name || '');
      formData.append('dietary_preference', (dietaryData as any)?.dietary_preference || '');
      formData.append('allergies', (dietaryData as any)?.allergies || '');
      formData.append('meals_per_day', (dietaryData as any)?.meals_per_day?.toString() || '');
      formData.append('adults_count', (dietaryData as any)?.adults_count?.toString() || '');
      formData.append('children_count', (dietaryData as any)?.children_count?.toString() || '');
      
      const response = await fetch(webhookUrl, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const responseText = await response.text();
        let messageContent = "I'm here to help you plan your meals and create grocery lists! What would you like to work on today?";
        
        try {
          // Parse the JSON response and extract the output value
          const parsedResponse = JSON.parse(responseText);
          if (Array.isArray(parsedResponse) && parsedResponse[0]?.output) {
            messageContent = parsedResponse[0].output;
          } else if (parsedResponse?.output) {
            messageContent = parsedResponse.output;
          } else {
            messageContent = responseText;
          }
        } catch (error) {
          // If parsing fails, use the raw response
          messageContent = responseText;
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: messageContent,
          sender: 'assistant',
          timestamp: new Date().toISOString()
        };
        setMessages(prev => [...prev, assistantMessage]);
        
        // Auto-save conversation after response
        setTimeout(() => {
          saveCurrentConversation();
        }, 1000);
      } else {
        throw new Error(`Webhook responded with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error with webhook:', error);
      // Fallback message if webhook fails
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "Sorry, I'm having trouble connecting right now. Please try again.",
        sender: 'assistant',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, assistantMessage]);
    }

    setLoading(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (!user) return null;

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="fixed top-4 left-4 z-50 bg-card border shadow-sm"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="w-80">
          <div className="flex flex-col h-full">
            <div className="pb-4 border-b">
              <h2 className="text-lg font-semibold">Meal Plans</h2>
            </div>
            <ScrollArea className="flex-1 py-4">
              {mealPlans.length > 0 ? (
                <div className="space-y-2">
                  {mealPlans.map((plan) => (
                    <Card key={plan.id} className="p-3 cursor-pointer hover:bg-accent transition-colors">
                      <div className="font-medium text-sm">{plan.title}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {new Date(plan.week_start_date).toLocaleDateString()}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p>No meal plans yet</p>
                  <p className="text-sm mt-1">Start chatting to create your first plan!</p>
                </div>
              )}
            </ScrollArea>
          </div>
        </SheetContent>
      </Sheet>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <header className="border-b bg-card p-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={restartChat}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Restart Chat
            </Button>
          </div>
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Gale
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <History className="h-4 w-4 mr-2" />
                  Chat History
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  <div className="pb-4 border-b">
                    <h2 className="text-lg font-semibold">Chat History</h2>
                  </div>
                  <ScrollArea className="flex-1 py-4">
                    {chatConversations.length > 0 ? (
                      <div className="space-y-2">
                        {chatConversations.map((conversation) => (
                          <Card 
                            key={conversation.id} 
                            className="p-3 cursor-pointer hover:bg-accent transition-colors"
                            onClick={() => loadConversation(conversation)}
                          >
                            <div className="font-medium text-sm">{conversation.title}</div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {new Date(conversation.created_at).toLocaleDateString()}
                            </div>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center text-muted-foreground py-8">
                        <p>No chat history yet</p>
                        <p className="text-sm mt-1">Start a conversation to see it here!</p>
                      </div>
                    )}
                  </ScrollArea>
                </div>
              </SheetContent>
            </Sheet>
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback>
                      <User className="h-4 w-4" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-80">
                <div className="flex flex-col h-full">
                  <div className="pb-4 border-b">
                    <h2 className="text-lg font-semibold">Profile</h2>
                  </div>
                  <div className="flex-1 py-4">
                    <div className="space-y-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Email</p>
                        <p className="font-medium">{user.email}</p>
                      </div>
                    </div>
                  </div>
                  <div className="pt-4 border-t">
                    <Button variant="outline" className="w-full" onClick={handleSignOut}>
                      Sign Out
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">
          <div className="max-w-2xl mx-auto space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="text-lg font-medium mb-2">Welcome to Gale! 🍽️</div>
                <p className="text-muted-foreground">
                  I'm here to help you plan delicious meals and create organized grocery lists.
                </p>
              </div>
            )}
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <Card
                  className={`max-w-xs lg:max-w-md px-4 py-3 ${
                    message.sender === 'user' 
                      ? 'bg-chat-user' 
                      : 'bg-chat-assistant'
                  }`}
                >
                  {message.sender === 'assistant' ? (
                    <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm">{message.content}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </Card>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <Card className="bg-chat-assistant px-4 py-3">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </Card>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input */}
        <div className="border-t bg-card p-4">
          <div className="max-w-2xl mx-auto space-y-3">
            {/* Recommended prompts */}
            <div className="flex flex-wrap gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("Let's create this week's meal plan")}
                className="text-xs"
              >
                Let's create this week's meal plan
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("What was on last week's grocery list?")}
                className="text-xs"
              >
                What was on last week's grocery list?
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInputMessage("I'd like to add some meals to my regular meals list")}
                className="text-xs"
              >
                I'd like to add some meals to my regular meals list
              </Button>
            </div>
            
            <form onSubmit={handleSendMessage}>
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask me about meal planning, recipes, or grocery lists..."
                  className="flex-1"
                  disabled={loading}
                />
                <Button type="submit" disabled={loading || !inputMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}