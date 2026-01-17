"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2, Save, FileText, Bot, User } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function NewResolutionChatPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId as string;
  const { getToken } = useAuth();

  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [currentDraft, setCurrentDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Scroll to bottom of messages when new messages are added
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Extract resolution content from assistant message
  const extractResolutionContent = (content: string): string | null => {
    // Look for "RESOLUTION OF THE BOARD" and extract everything from there
    const resolutionMatch = content.match(/RESOLUTION OF THE BOARD[\s\S]*/i);
    if (resolutionMatch) {
      return resolutionMatch[0].trim();
    }
    return null;
  };

  // Send message to AI
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: inputValue.trim() };
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue("");
    setError(null);
    setIsLoading(true);

    try {
      const token = await getToken();
      const response = await fetch(`${API_URL}/ai/companies/${companyId}/generate-resolution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: updatedMessages,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to generate resolution");
      }

      const data = await response.json();
      const assistantMessage: Message = {
        role: "assistant",
        content: data.content || data.message || "",
      };

      setMessages([...updatedMessages, assistantMessage]);

      // Extract resolution content if present
      const resolutionContent = extractResolutionContent(assistantMessage.content);
      if (resolutionContent) {
        setCurrentDraft(resolutionContent);
      }
    } catch (err) {
      console.error("Error sending message:", err);
      setError(err instanceof Error ? err.message : "Failed to send message. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Enter key to send message (Shift+Enter for new line)
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Extract title from draft content
  const extractTitle = (content: string): string => {
    // Try to find a title pattern like "RESOLUTION TO..." or first meaningful line
    const lines = content.split("\n").filter((line) => line.trim());

    // Look for a line that starts with "RESOLUTION" and has more context
    for (const line of lines) {
      const match = line.match(/RESOLUTION\s+(OF\s+THE\s+BOARD\s+)?(TO\s+|FOR\s+|ON\s+|REGARDING\s+)?(.+)/i);
      if (match && match[3]) {
        // Clean up the extracted title
        let title = match[3].trim();
        // Remove trailing punctuation
        title = title.replace(/[.,:;]+$/, "");
        // Truncate if too long
        if (title.length > 100) {
          title = title.substring(0, 100) + "...";
        }
        return title;
      }
    }

    // Fallback: use the first line that's not just "RESOLUTION OF THE BOARD"
    for (const line of lines) {
      const cleaned = line.trim();
      if (cleaned && !cleaned.match(/^RESOLUTION\s+OF\s+THE\s+BOARD\s*$/i)) {
        let title = cleaned.replace(/^RESOLUTION\s+(OF\s+THE\s+BOARD\s+)?/i, "");
        if (title.length > 100) {
          title = title.substring(0, 100) + "...";
        }
        return title || "New Resolution";
      }
    }

    return "New Resolution";
  };

  // Save draft to API
  const saveDraft = async () => {
    if (!currentDraft.trim()) {
      setError("No resolution content to save. Please generate a resolution first.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const token = await getToken();
      const title = extractTitle(currentDraft);

      const response = await fetch(`${API_URL}/companies/${companyId}/resolutions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content: currentDraft,
          status: "DRAFT",
          generatedBy: "AI",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save resolution");
      }

      const resolution = await response.json();

      // Redirect to the resolution detail page
      router.push(`/companies/${companyId}/resolutions/${resolution.id}`);
    } catch (err) {
      console.error("Error saving draft:", err);
      setError(err instanceof Error ? err.message : "Failed to save draft. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/companies/${companyId}/resolutions`}>
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Draft Resolution with AI</h1>
            <p className="text-muted-foreground">
              Chat with AI to create your board resolution
            </p>
          </div>
        </div>
        <Button
          onClick={saveDraft}
          disabled={!currentDraft.trim() || isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save as Draft
            </>
          )}
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 rounded-lg bg-red-50 p-4 text-sm text-red-600">
          {error}
        </div>
      )}

      {/* Main Content - Split Panels */}
      <div className="flex-1 flex gap-4 min-h-0">
        {/* Chat Panel - 40% */}
        <Card className="w-[40%] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Bot className="h-5 w-5" />
              AI Assistant
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col min-h-0 pt-0">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto space-y-4 mb-4 pr-2">
              {messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <Bot className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">
                    Start by describing the resolution you need.
                  </p>
                  <p className="text-xs mt-2">
                    For example: &quot;Create a resolution to approve the Q4 budget of $500,000&quot;
                  </p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex gap-3 ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    {message.role === "assistant" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                        <Bot className="h-4 w-4 text-purple-600" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-lg px-4 py-2 text-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <pre className="whitespace-pre-wrap font-sans">{message.content}</pre>
                    </div>
                    {message.role === "user" && (
                      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-4 w-4 text-gray-600" />
                      </div>
                    )}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="flex gap-3 justify-start">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-purple-600" />
                  </div>
                  <div className="bg-muted rounded-lg px-4 py-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="flex gap-2">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the resolution you need..."
                className="min-h-[80px] resize-none"
                disabled={isLoading}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="self-end"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview Panel - 60% */}
        <Card className="w-[60%] flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5" />
              Resolution Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 min-h-0 pt-0">
            <div className="h-full overflow-y-auto rounded-lg border bg-muted/30 p-6">
              {currentDraft ? (
                <pre className="whitespace-pre-wrap font-serif text-sm leading-relaxed">
                  {currentDraft}
                </pre>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                  <FileText className="h-12 w-12 mb-4 opacity-50" />
                  <p className="text-sm">
                    Your resolution will appear here as you chat with the AI.
                  </p>
                  <p className="text-xs mt-2">
                    The preview updates automatically when the AI generates resolution content.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
