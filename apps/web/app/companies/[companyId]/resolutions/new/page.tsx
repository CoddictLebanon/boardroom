"use client";

import React, { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Send, Loader2, Save, FileText, Bot, User, RotateCcw } from "lucide-react";
import Link from "next/link";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

interface Message {
  role: "user" | "assistant";
  content: string;
}

// Component to render formatted resolution preview
function ResolutionPreview({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let currentParagraph: string[] = [];

  const flushParagraph = () => {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(" ").trim();
      if (text) {
        elements.push(
          <p key={elements.length} className="mb-4 text-sm leading-relaxed">
            {text}
          </p>
        );
      }
      currentParagraph = [];
    }
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    // Empty line - flush current paragraph
    if (!trimmedLine) {
      flushParagraph();
      return;
    }

    // Main title: RESOLUTION OF THE BOARD OF DIRECTORS
    if (trimmedLine.match(/^RESOLUTION OF THE BOARD/i)) {
      flushParagraph();
      elements.push(
        <h1 key={elements.length} className="text-lg font-bold text-center mb-2 uppercase tracking-wide">
          {trimmedLine}
        </h1>
      );
      return;
    }

    // Company name line (OF COMPANY NAME)
    if (trimmedLine.match(/^OF\s+[A-Z]/i) && elements.length === 1) {
      elements.push(
        <h2 key={elements.length} className="text-base font-semibold text-center mb-6 uppercase">
          {trimmedLine}
        </h2>
      );
      return;
    }

    // Category line
    if (trimmedLine.match(/^Category:/i)) {
      flushParagraph();
      elements.push(
        <p key={elements.length} className="text-sm font-medium text-muted-foreground mb-6 text-center">
          {trimmedLine}
        </p>
      );
      return;
    }

    // WHEREAS clause
    if (trimmedLine.match(/^WHEREAS/i)) {
      flushParagraph();
      elements.push(
        <p key={elements.length} className="mb-4 text-sm leading-relaxed">
          <span className="font-semibold">WHEREAS</span>
          {trimmedLine.replace(/^WHEREAS,?\s*/i, ", ")}
        </p>
      );
      return;
    }

    // NOW, THEREFORE clause
    if (trimmedLine.match(/^NOW,?\s*THEREFORE/i)) {
      flushParagraph();
      elements.push(
        <p key={elements.length} className="mb-4 text-sm leading-relaxed font-medium">
          {trimmedLine}
        </p>
      );
      return;
    }

    // RESOLVED clause
    if (trimmedLine.match(/^(BE IT\s+)?RESOLVED/i)) {
      flushParagraph();
      const match = trimmedLine.match(/^(BE IT\s+)?(RESOLVED)/i);
      if (match) {
        elements.push(
          <p key={elements.length} className="mb-4 text-sm leading-relaxed">
            {match[1] && <span>{match[1]}</span>}
            <span className="font-semibold">RESOLVED</span>
            {trimmedLine.replace(/^(BE IT\s+)?RESOLVED,?\s*/i, ", ")}
          </p>
        );
      }
      return;
    }

    // FURTHER RESOLVED clause
    if (trimmedLine.match(/^(BE IT\s+)?FURTHER RESOLVED/i)) {
      flushParagraph();
      elements.push(
        <p key={elements.length} className="mb-4 text-sm leading-relaxed">
          <span className="font-semibold">FURTHER RESOLVED</span>
          {trimmedLine.replace(/^(BE IT\s+)?FURTHER RESOLVED,?\s*/i, ", ")}
        </p>
      );
      return;
    }

    // Date/signature lines at the end
    if (trimmedLine.match(/^(Date:|Adopted:|Effective:|Secretary|Chairman|Director)/i)) {
      flushParagraph();
      elements.push(
        <p key={elements.length} className="mb-2 text-sm">
          {trimmedLine}
        </p>
      );
      return;
    }

    // Signature line (underscores)
    if (trimmedLine.match(/^_{3,}/) || trimmedLine.match(/^-{3,}/)) {
      flushParagraph();
      elements.push(
        <div key={elements.length} className="mb-4 mt-8">
          <div className="border-b border-gray-400 w-48 mb-1" />
          <p className="text-xs text-muted-foreground">Signature</p>
        </div>
      );
      return;
    }

    // Regular text - add to current paragraph
    currentParagraph.push(trimmedLine);
  });

  // Flush any remaining paragraph
  flushParagraph();

  return (
    <div className="font-serif">
      {elements}
    </div>
  );
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
  const [isInitialized, setIsInitialized] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const storageKey = `resolution-draft-${companyId}`;

  // Load saved state from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const { messages: savedMessages, draft } = JSON.parse(saved);
        if (savedMessages?.length) setMessages(savedMessages);
        if (draft) setCurrentDraft(draft);
      }
    } catch (e) {
      console.error("Failed to load saved draft:", e);
    }
    setIsInitialized(true);
  }, [storageKey]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    if (!isInitialized) return;
    try {
      if (messages.length > 0 || currentDraft) {
        localStorage.setItem(storageKey, JSON.stringify({
          messages,
          draft: currentDraft,
        }));
      }
    } catch (e) {
      console.error("Failed to save draft:", e);
    }
  }, [messages, currentDraft, storageKey, isInitialized]);

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

    const userMessageContent = inputValue.trim();
    const userMessage: Message = { role: "user", content: userMessageContent };
    // Capture current messages before async operations to avoid race conditions
    const currentMessages = [...messages];
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");
    setError(null);
    setIsLoading(true);

    try {
      const token = await getToken();
      if (!token) {
        setError("Authentication required. Please refresh the page.");
        return;
      }
      const response = await fetch(`${API_URL}/ai/companies/${companyId}/generate-resolution`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          message: userMessageContent,
          conversationHistory: currentMessages,
          currentDraft: currentDraft || undefined,
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

      setMessages(prev => [...prev, assistantMessage]);

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

  // Extract category from draft content
  const extractCategory = (content: string): string => {
    const categoryMatch = content.match(/Category:\s*(\w+)/i);
    if (categoryMatch) {
      const category = categoryMatch[1].toUpperCase();
      const validCategories = ["FINANCIAL", "GOVERNANCE", "HR", "OPERATIONS", "STRATEGIC", "OTHER"];
      if (validCategories.includes(category)) {
        return category;
      }
    }
    return "OTHER";
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
      if (!token) {
        setError("Authentication required. Please refresh the page.");
        return;
      }
      const title = extractTitle(currentDraft);
      const category = extractCategory(currentDraft);

      const response = await fetch(`${API_URL}/companies/${companyId}/resolutions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title,
          content: currentDraft,
          category,
          status: "DRAFT",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to save resolution");
      }

      const resolution = await response.json();

      // Clear localStorage on successful save
      localStorage.removeItem(storageKey);

      // Redirect to the resolutions list (detail page will be created later)
      router.push(`/companies/${companyId}/resolutions`);
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
        <div className="flex gap-2">
          {(messages.length > 0 || currentDraft) && (
            <Button
              variant="outline"
              onClick={() => {
                localStorage.removeItem(storageKey);
                setMessages([]);
                setCurrentDraft("");
                setError(null);
              }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Start New
            </Button>
          )}
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
                id="resolution-chat-input"
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Describe the resolution you need..."
                className="min-h-[80px] resize-none"
                disabled={isLoading}
                aria-label="Chat message input for resolution generation"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading}
                className="self-end"
                aria-label="Send message"
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
            <div className="h-full overflow-y-auto rounded-lg border bg-white p-8">
              {currentDraft ? (
                <ResolutionPreview content={currentDraft} />
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
