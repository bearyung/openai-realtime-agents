"use-client";

import React, { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { TranscriptItem } from "@/app/types";
import Image from "next/image";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { DownloadIcon, ClipboardCopyIcon } from "@radix-ui/react-icons";
import { GuardrailChip } from "./GuardrailChip";

export interface TranscriptProps {
  userText: string;
  setUserText: (val: string) => void;
  onSendMessage: () => void;
  canSend: boolean;
  downloadRecording: () => void;
  isCustomerUI?: boolean;
  onReconnect?: () => void;
}

function Transcript({
  userText,
  setUserText,
  onSendMessage,
  canSend,
  downloadRecording,
  isCustomerUI = false,
  onReconnect,
}: TranscriptProps) {
  const { transcriptItems, toggleTranscriptItemExpand } = useTranscript();
  const transcriptRef = useRef<HTMLDivElement | null>(null);
  const [prevLogs, setPrevLogs] = useState<TranscriptItem[]>([]);
  const [justCopied, setJustCopied] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [latestFunctionCall, setLatestFunctionCall] = useState<{
    name: string;
    status: string;
    timestamp: number;
  } | null>(null);
  const [isAgentLoading, setIsAgentLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [countdownValue, setCountdownValue] = useState<number | null>(null);
  const countdownIntervalRef = useRef<NodeJS.Timeout | null>(null);

  function scrollToBottom() {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }

  useEffect(() => {
    const hasNewMessage = transcriptItems.length > prevLogs.length;
    const hasUpdatedMessage = transcriptItems.some((newItem, index) => {
      const oldItem = prevLogs[index];
      return (
        oldItem &&
        (newItem.title !== oldItem.title || newItem.data !== oldItem.data)
      );
    });

    if (hasNewMessage || hasUpdatedMessage) {
      scrollToBottom();
    }

    // Track function calls and agent loading in customer UI mode
    if (isCustomerUI) {
      const latestItems = [...transcriptItems].sort((a, b) => b.createdAtMs - a.createdAtMs);
      
      // Check for agent loading
      const hasRecentAgentBreadcrumb = latestItems.some(item => 
        item.type === "BREADCRUMB" && 
        item.title?.startsWith("Agent:") && 
        (Date.now() - item.createdAtMs) < 5000 // Within last 5 seconds
      );
      
      // Check if we have a recent AI response
      const hasRecentAIResponse = latestItems.some(item =>
        item.type === "MESSAGE" &&
        item.role === "assistant" &&
        (Date.now() - item.createdAtMs) < 2000 // Within last 2 seconds
      );
      
      // Don't show loading if we're already streaming
      setIsAgentLoading(hasRecentAgentBreadcrumb && !hasRecentAIResponse && !isStreaming);
      
      // Check for order completion breadcrumb
      const orderCompletionItem = latestItems.find(item =>
        item.type === "BREADCRUMB" &&
        (item.title?.startsWith("Order completed:") || item.title?.startsWith("Order ended:")) &&
        !countdownValue && !countdownIntervalRef.current
      );
      
      if (orderCompletionItem && countdownValue === null && !countdownIntervalRef.current) {
        // Check if this is a new completion (within last 2 seconds)
        const isRecent = (Date.now() - orderCompletionItem.createdAtMs) < 2000;
        if (isRecent) {
          // Start countdown
          setCountdownValue(15);
          let count = 15;
          countdownIntervalRef.current = setInterval(() => {
            count--;
            if (count <= 0) {
              clearInterval(countdownIntervalRef.current!);
              countdownIntervalRef.current = null;
              setCountdownValue(0); // 0 means show reload button
            } else {
              setCountdownValue(count);
            }
          }, 15000);
        }
      }
      
      // Track function calls
      for (const item of latestItems) {
        if (item.type === "BREADCRUMB" && item.title) {
          // Check for function call patterns (lowercase 'function call')
          const functionCallMatch = item.title.match(/function call: (\w+)/);
          const functionResultMatch = item.title.match(/function call result: (\w+)/);
          
          if (functionCallMatch) {
            setLatestFunctionCall({
              name: functionCallMatch[1],
              status: 'calling',
              timestamp: item.createdAtMs
            });
            break;
          } else if (functionResultMatch) {
            setLatestFunctionCall({
              name: functionResultMatch[1],
              status: 'success',
              timestamp: item.createdAtMs
            });
            break;
          }
        }
      }
    }

    setPrevLogs(transcriptItems);
  }, [transcriptItems, isCustomerUI]);

  // Autofocus on text box input on load
  useEffect(() => {
    if (canSend && inputRef.current) {
      inputRef.current.focus();
    }
  }, [canSend]);

  // Auto-hide function call status after 3 seconds
  useEffect(() => {
    if (latestFunctionCall) {
      const timer = setTimeout(() => {
        setLatestFunctionCall(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [latestFunctionCall]);

  // Disable word-by-word streaming since we're getting deltas from the API
  // The deltas already provide a natural streaming effect
  useEffect(() => {
    if (!isCustomerUI) return;
    
    const latest = getLatestAIResponse();
    if (latest && latest.status === "IN_PROGRESS") {
      setIsStreaming(true);
    } else if (latest && latest.status === "DONE") {
      setIsStreaming(false);
    }
  }, [isCustomerUI, transcriptItems]);

  const handleCopyTranscript = async () => {
    if (!transcriptRef.current) return;
    try {
      await navigator.clipboard.writeText(transcriptRef.current.innerText);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 1500);
    } catch (error) {
      console.error("Failed to copy transcript:", error);
    }
  };

  // Get the latest AI response for customer UI
  const getLatestAIResponse = () => {
    const sortedItems = [...transcriptItems].sort((a, b) => b.createdAtMs - a.createdAtMs);
    return sortedItems.find(item => 
      item.type === "MESSAGE" && 
      item.role === "assistant" && 
      !item.isHidden
    );
  };

  const latestAIResponse = isCustomerUI ? getLatestAIResponse() : null;
  
  // Clear streaming state when agent is loading
  useEffect(() => {
    if (isAgentLoading) {
      setIsStreaming(false);
    }
  }, [isAgentLoading]);

  // Cleanup countdown on unmount
  useEffect(() => {
    return () => {
      if (countdownIntervalRef.current) {
        clearInterval(countdownIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className={`flex flex-col flex-1 bg-white min-h-0 ${isCustomerUI ? 'relative' : 'rounded-xl'}`}>
      <div className="flex flex-col flex-1 min-h-0">
        {!isCustomerUI && (
          <div className="flex items-center justify-between px-6 py-3 sticky top-0 z-10 text-base border-b bg-white rounded-t-xl">
            <span className="font-semibold">Transcript</span>
            <div className="flex gap-x-2">
              <button
                onClick={handleCopyTranscript}
                className="w-24 text-sm px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center gap-x-1"
              >
                <ClipboardCopyIcon />
                {justCopied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={downloadRecording}
                className="w-40 text-sm px-3 py-1 rounded-md bg-gray-200 hover:bg-gray-300 flex items-center justify-center gap-x-1"
              >
                <DownloadIcon />
                <span>Download Audio</span>
              </button>
            </div>
          </div>
        )}

        {/* Transcript Content */}
        {isCustomerUI ? (
          <div className="flex items-center justify-center h-full p-8">
            {latestAIResponse ? (
              <div className="max-w-4xl px-8">
                <div className={`whitespace-pre-wrap text-3xl leading-relaxed text-gray-800 font-light animate-fadeIn ${
                  isStreaming ? 'typewriter-cursor' : ''
                }`}>
                  <ReactMarkdown>{latestAIResponse.title || ""}</ReactMarkdown>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-xl animate-pulse">Connecting to the next available agent...</div>
            )}
          </div>
        ) : (
          <div
            ref={transcriptRef}
            className={`overflow-auto flex flex-col gap-y-4 h-full p-4`}
          >
          {[...transcriptItems]
            .sort((a, b) => a.createdAtMs - b.createdAtMs)
            .map((item) => {
              const {
                itemId,
                type,
                role,
                data,
                expanded,
                timestamp,
                title = "",
                isHidden,
                guardrailResult,
                status,
              } = item;

            if (isHidden) {
              return null;
            }

            // Hide user messages in customer UI
            if (isCustomerUI && type === "MESSAGE" && role === "user") {
              return null;
            }

            if (type === "MESSAGE") {
              const isUser = role === "user";
              const containerClasses = `flex justify-end flex-col ${
                isUser ? "items-end" : "items-start"
              }`;
              const bubbleBase = isCustomerUI
                ? `max-w-2xl p-6 ${
                    isUser ? "bg-gray-900 text-gray-100" : "bg-gradient-to-r from-blue-50 to-indigo-50 text-gray-800 shadow-lg"
                  }`
                : `max-w-lg p-3 ${
                    isUser ? "bg-gray-900 text-gray-100" : "bg-gray-100 text-black"
                  }`;
              const isBracketedMessage =
                title.startsWith("[") && title.endsWith("]");
              const messageStyle = isBracketedMessage
                ? 'italic text-gray-400'
                : '';
              const displayTitle = isBracketedMessage
                ? title.slice(1, -1)
                : title;

              return (
                <div key={itemId} className={containerClasses}>
                  <div className={isCustomerUI ? "max-w-2xl" : "max-w-lg"}>
                    <div
                      className={`${bubbleBase} rounded-t-xl ${
                        guardrailResult ? "" : "rounded-b-xl"
                      } ${isCustomerUI ? "rounded-2xl animate-fadeIn" : ""}`}
                    >
                      {!isCustomerUI && (
                        <div
                          className={`text-xs ${
                            isUser ? "text-gray-400" : "text-gray-500"
                          } font-mono`}
                        >
                          {timestamp}
                        </div>
                      )}
                      <div className={`whitespace-pre-wrap ${messageStyle} ${
                        isCustomerUI ? "text-xl leading-relaxed" : ""
                      }`}>
                        {status === "IN_PROGRESS" && !isUser && isCustomerUI ? (
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-r from-blue-400 to-indigo-500 loading-pulse flex items-center justify-center">
                              <div className="w-8 h-8 rounded-full bg-white/30 loading-glow"></div>
                            </div>
                            <span className="text-gray-600 animate-pulse">Thinking...</span>
                          </div>
                        ) : (
                          <ReactMarkdown>{displayTitle}</ReactMarkdown>
                        )}
                      </div>
                    </div>
                    {guardrailResult && (
                      <div className="bg-gray-200 px-3 py-2 rounded-b-xl">
                        <GuardrailChip guardrailResult={guardrailResult} />
                      </div>
                    )}
                  </div>
                </div>
              );
            } else if (type === "BREADCRUMB") {
              return (
                <div
                  key={itemId}
                  className={`flex flex-col justify-start items-start ${
                    isCustomerUI ? "text-gray-600 text-base" : "text-gray-500 text-sm"
                  }`}
                >
                  {!isCustomerUI && <span className="text-xs font-mono">{timestamp}</span>}
                  <div
                    className={`whitespace-pre-wrap flex items-center ${
                      isCustomerUI ? "text-lg text-gray-700" : "font-mono text-sm text-gray-800"
                    } ${data ? "cursor-pointer" : ""}`}
                    onClick={() => data && toggleTranscriptItemExpand(itemId)}
                  >
                    {data && (
                      <span
                        className={`text-gray-400 mr-1 transform transition-transform duration-200 select-none ${
                          !isCustomerUI ? "font-mono" : ""
                        } ${expanded ? "rotate-90" : "rotate-0"}`}
                      >
                        ▶
                      </span>
                    )}
                    {title}
                  </div>
                  {expanded && data && (
                    <div className="text-gray-800 text-left">
                      <pre className={`border-l-2 ml-1 border-gray-200 whitespace-pre-wrap break-words ${
                        isCustomerUI ? "text-sm" : "font-mono text-xs"
                      } mb-2 mt-2 pl-2`}>
                        {JSON.stringify(data, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              );
            } else {
              // Fallback if type is neither MESSAGE nor BREADCRUMB
              return (
                <div
                  key={itemId}
                  className="flex justify-center text-gray-500 text-sm italic font-mono"
                >
                  Unknown item type: {type}{" "}
                  <span className="ml-2 text-xs">{timestamp}</span>
                </div>
              );
            }
          })}
          </div>
        )}
      </div>

      {!isCustomerUI && (
        <div className="p-4 flex items-center gap-x-2 flex-shrink-0 border-t border-gray-200">
          <input
            ref={inputRef}
            type="text"
            value={userText}
            onChange={(e) => setUserText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && canSend) {
                onSendMessage();
              }
            }}
            className="flex-1 px-4 py-2 focus:outline-none"
            placeholder="Type a message..."
          />
          <button
            onClick={onSendMessage}
            disabled={!canSend || !userText.trim()}
            className="bg-gray-900 text-white rounded-full px-2 py-2 disabled:opacity-50"
          >
            <Image src="arrow.svg" alt="Send" width={24} height={24} />
          </button>
        </div>
      )}

      {/* Countdown/Reload UI positioned above function call indicator */}
      {isCustomerUI && countdownValue !== null && (
        <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 animate-fadeIn z-10">
          {countdownValue > 0 ? (
            // Countdown circle
            <div className="relative w-16 h-16">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90">
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#e5e7eb"
                  strokeWidth="4"
                  fill="none"
                />
                <circle
                  cx="32"
                  cy="32"
                  r="28"
                  stroke="#6366f1"
                  strokeWidth="4"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 28}`}
                  strokeDashoffset={`${2 * Math.PI * 28 * (1 - countdownValue / 10)}`}
                  className="transition-all duration-1500 ease-linear"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xl font-bold text-gray-800">{countdownValue}</span>
              </div>
            </div>
          ) : (
            // Reload button
            <div className="flex flex-col items-center gap-2">
              <button
                onClick={() => {
                  // Clear countdown and interval
                  setCountdownValue(null);
                  if (countdownIntervalRef.current) {
                    clearInterval(countdownIntervalRef.current);
                    countdownIntervalRef.current = null;
                  }
                  if (onReconnect) {
                    onReconnect();
                  }
                }}
                className="p-3 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                <svg
                  className="w-8 h-8 text-gray-700"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                  />
                </svg>
              </button>
              <p className="text-gray-600 text-xs">Start new order</p>
            </div>
          )}
        </div>
      )}

      {/* Function Call Status Panel for Customer UI */}
      {isCustomerUI && latestFunctionCall && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
          <div className="bg-gray-800 text-white px-6 py-3 rounded-full shadow-lg animate-fadeIn">
            <div className="flex items-center gap-2">
              {latestFunctionCall.status === 'calling' ? (
                <>
                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>
                  <span className="text-sm">Function call: {latestFunctionCall.name}</span>
                </>
              ) : (
                <>
                  <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                  <span className="text-sm">Function call: {latestFunctionCall.name} [success]</span>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Transcript;
