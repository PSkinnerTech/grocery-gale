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
import { Menu, User, Send } from 'lucide-react';

interface Message {
  id: string;
  content: string;
  sender: 'user' | 'assistant';
  timestamp: Date;
}

interface MealPlan {
  id: string;
  title: string;
  week_start_date: string;
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

        // Load meal plans
        loadMealPlans();

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
      const webhookUrl = 'https://pskinnertech.app.n8n.cloud/webhook-test/1a7e2ba7-25e7-4746-b924-c39e89a7bc36';
      
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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    const messageContent = inputMessage;
    setInputMessage('');
    setLoading(true);

    // Trigger webhook with user message
    try {
      const webhookUrl = 'https://pskinnertech.app.n8n.cloud/webhook-test/1a7e2ba7-25e7-4746-b924-c39e89a7bc36';
      
      await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        mode: 'no-cors',
        body: JSON.stringify({
          user_id: user?.id,
          message: messageContent,
          timestamp: new Date().toISOString(),
          triggered_from: 'user_message',
          event: 'message_sent'
        }),
      });
    } catch (error) {
      console.error('Error triggering webhook:', error);
    }

    // Simulate AI response (in real implementation, this would call your AI service)
    setTimeout(() => {
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: "I'm here to help you plan your meals and create grocery lists! What would you like to work on today?",
        sender: 'assistant',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
      setLoading(false);
    }, 1000);
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
          <div className="flex-1 text-center">
            <h1 className="text-xl font-semibold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
              Gale
            </h1>
          </div>
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
                  <p className="text-sm">{message.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
          <form onSubmit={handleSendMessage} className="max-w-2xl mx-auto">
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
  );
}