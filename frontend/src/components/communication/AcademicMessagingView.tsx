"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  MessageSquare,
  Send,
  User,
  Clock,
  Edit2,
  Trash2,
  Check,
  CheckCheck,
  Shield,
  BookOpen,
} from "lucide-react";
import { fetchApi } from "@/lib/api-client";
import {
  ConversationItem,
  DirectMessageItem,
} from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/utils";
import { getUserAvatarUrl } from "@/lib/avatar";

interface AcademicMessagingViewProps {
  currentUserId: string;
  currentUserRole: string;
}

export const AcademicMessagingView: React.FC<AcademicMessagingViewProps> = ({
  currentUserId,
  currentUserRole,
}) => {
  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DirectMessageItem[]>([]);
  const [inputText, setInputText] = useState("");
  const [isLoadingConv, setIsLoadingConv] = useState(false);
  const [isLoadingMsg, setIsLoadingMsg] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Edit message state
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = useCallback(async () => {
    setIsLoadingConv(true);
    try {
      const resp = await fetchApi<ConversationItem[]>("/messages/conversations");
      if (resp.success && resp.data) {
        setConversations(resp.data);
        if (resp.data.length > 0 && !activeConvId) {
          setActiveConvId(resp.data[0].id);
        }
      }
    } catch {
      // non-blocking
    } finally {
      setIsLoadingConv(false);
    }
  }, [activeConvId]);

  const loadMessages = useCallback(async (convId: string) => {
    setIsLoadingMsg(true);
    try {
      const resp = await fetchApi<DirectMessageItem[]>(`/messages/conversations/${convId}/messages`);
      if (resp.success && resp.data) {
        setMessages(resp.data);
        setTimeout(scrollToBottom, 100);
      }
    } catch {
      // non-blocking
    } finally {
      setIsLoadingMsg(false);
    }
  }, []);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
      const interval = setInterval(() => loadMessages(activeConvId), 15000); // 15s poll
      return () => clearInterval(interval);
    }
  }, [activeConvId, loadMessages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !activeConvId || isSending) return;

    const bodyToSend = inputText.trim();
    setInputText("");
    setIsSending(true);

    try {
      const resp = await fetchApi<DirectMessageItem>(`/messages/conversations/${activeConvId}/messages`, {
        method: "POST",
        body: JSON.stringify({ body: bodyToSend }),
      });
      if (resp.success && resp.data) {
        const newMsg = resp.data;
        setMessages((prev) => [...prev, newMsg]);
        setTimeout(scrollToBottom, 50);
        loadConversations(); // refresh snippet
      }
    } catch {
      // non-blocking
    } finally {
      setIsSending(false);
    }
  };

  const handleEditMessage = async (msgId: string) => {
    if (!editBody.trim()) return;
    try {
      const resp = await fetchApi<DirectMessageItem>(`/messages/${msgId}`, {
        method: "PATCH",
        body: JSON.stringify({ body: editBody.trim() }),
      });
      if (resp.success && resp.data) {
        const updatedMsg = resp.data;
        setMessages((prev) => prev.map((m) => (m.id === msgId ? updatedMsg : m)));
        setEditingMsgId(null);
        setEditBody("");
      }
    } catch {
      // non-blocking
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    try {
      const resp = await fetchApi<DirectMessageItem>(`/messages/${msgId}`, {
        method: "DELETE",
      });
      if (resp.success && resp.data) {
        const deletedMsg = resp.data;
        setMessages((prev) => prev.map((m) => (m.id === msgId ? deletedMsg : m)));
      }
    } catch {
      // non-blocking
    }
  };

  const activeConv = conversations.find((c) => c.id === activeConvId);

  return (
    <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden grid grid-cols-1 md:grid-cols-12 min-h-[550px]">
      {/* Left Sidebar: Conversations List */}
      <div className="md:col-span-4 border-r border-border flex flex-col bg-muted/20">
        <div className="p-4 border-b border-border bg-muted/40 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-foreground">Conversations</h3>
          </div>
          <Badge variant="outline" className="text-[10px] font-bold">
            {conversations.length} Active
          </Badge>
        </div>

        <div className="flex-1 overflow-y-auto divide-y divide-border">
          {isLoadingConv && conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">Loading threads...</div>
          ) : conversations.length === 0 ? (
            <div className="p-6 text-center text-xs text-muted-foreground">
              No conversations yet. Messages from faculty or students will appear here.
            </div>
          ) : (
            conversations.map((conv) => {
              const otherUser = conv.participants.find((p) => p.user_id !== currentUserId);
              const isSelected = conv.id === activeConvId;

              return (
                <div
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={`p-3 cursor-pointer transition-colors flex items-start gap-3 ${
                    isSelected ? "bg-primary/10 border-l-4 border-l-primary" : "hover:bg-muted/40"
                  }`}
                >
                  <img
                    src={getUserAvatarUrl(otherUser)}
                    alt={otherUser?.user_name || "User"}
                    className="h-9 w-9 rounded-full object-cover shrink-0 border border-slate-200 dark:border-slate-800"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = "/default-avatar.jpg";
                    }}
                  />

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-foreground truncate">
                        {otherUser?.user_name || conv.title || "Academic Chat"}
                      </span>
                      {conv.unread_messages_count > 0 && (
                        <span className="h-4 min-w-[16px] px-1 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                          {conv.unread_messages_count}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                      <Badge variant="outline" className="text-[8px] font-bold py-0 h-3.5 px-1">
                        {otherUser?.user_role || "USER"}
                      </Badge>
                      {conv.course_name && <span className="truncate">• {conv.course_name}</span>}
                    </div>

                    {conv.last_message && (
                      <p className="text-[11px] text-muted-foreground truncate">
                        {conv.last_message.body}
                      </p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Message Thread */}
      <div className="md:col-span-8 flex flex-col bg-background">
        {activeConv ? (
          <>
            {/* Thread Header */}
            <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
              <div className="space-y-0.5">
                <h4 className="text-sm font-bold text-foreground flex items-center gap-2">
                  {activeConv.participants.find((p) => p.user_id !== currentUserId)?.user_name || activeConv.title}
                  <Badge variant="outline" className="text-[9px] uppercase font-bold py-0 h-4">
                    {activeConv.participants.find((p) => p.user_id !== currentUserId)?.user_role || "ACADEMIC"}
                  </Badge>
                </h4>
                {activeConv.course_name && (
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <BookOpen className="h-3 w-3" /> {activeConv.course_name}
                  </p>
                )}
              </div>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <Shield className="h-3 w-3 text-emerald-500" /> Academic Encrypted Scope
              </span>
            </div>

            {/* Message Feed */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 min-h-[380px] max-h-[450px]">
              {isLoadingMsg && messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Loading message history...</div>
              ) : messages.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  Start a conversation. All messages are securely scoped to authorized academic counterparts.
                </div>
              ) : (
                messages.map((m) => {
                  const isMine = m.sender_id === currentUserId;
                  const isEditing = editingMsgId === m.id;

                  return (
                    <div
                      key={m.id}
                      className={`flex flex-col ${isMine ? "items-end" : "items-start"}`}
                    >
                      <div className="flex items-center gap-1.5 mb-1 px-1">
                        <span className="text-[10px] font-bold text-muted-foreground">
                          {isMine ? "You" : m.sender_name}
                        </span>
                        <span className="text-[9px] text-muted-foreground">
                          {formatDate(m.created_at)}
                        </span>
                      </div>

                      <div className="group relative max-w-[80%]">
                        {isEditing ? (
                          <div className="flex items-center gap-1 bg-card border border-border p-1.5 rounded-xl shadow-md">
                            <Input
                              value={editBody}
                              onChange={(e) => setEditBody(e.target.value)}
                              className="text-xs h-7"
                              autoFocus
                            />
                            <Button
                              size="sm"
                              className="h-7 text-xs px-2"
                              onClick={() => handleEditMessage(m.id)}
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 text-xs px-2"
                              onClick={() => setEditingMsgId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        ) : (
                          <div
                            className={`p-3 rounded-2xl text-xs leading-relaxed ${
                              isMine
                                ? "bg-primary text-primary-foreground rounded-tr-sm"
                                : "bg-muted border border-border text-foreground rounded-tl-sm"
                            }`}
                          >
                            <p className="whitespace-pre-wrap">{m.body}</p>
                            {m.is_edited && (
                              <span className="text-[9px] opacity-70 block text-right mt-1">
                                (edited)
                              </span>
                            )}
                          </div>
                        )}

                        {/* Edit / Delete actions for own active messages */}
                        {isMine && !m.is_deleted && !isEditing && (
                          <div className="absolute top-1 -left-14 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-background/80 backdrop-blur-sm border rounded-md p-0.5">
                            <button
                              onClick={() => {
                                setEditingMsgId(m.id);
                                setEditBody(m.body);
                              }}
                              className="p-1 text-muted-foreground hover:text-foreground"
                              title="Edit message"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                            <button
                              onClick={() => handleDeleteMessage(m.id)}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Delete message"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer Bar */}
            <form onSubmit={handleSendMessage} className="p-3 border-t border-border bg-muted/20 flex gap-2">
              <Input
                placeholder="Type your message..."
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className="text-xs bg-background"
                disabled={isSending}
              />
              <Button type="submit" size="sm" disabled={isSending || !inputText.trim()} className="gap-1 font-bold">
                <Send className="h-3.5 w-3.5" /> Send
              </Button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground">
            <MessageSquare className="h-10 w-10 mb-2 opacity-40 text-primary" />
            <p className="text-xs font-semibold">Select a conversation on the left to start messaging</p>
          </div>
        )}
      </div>
    </div>
  );
};
