"use client";

import { useRef, useEffect } from "react";
import { useTranscript } from "@/app/contexts/TranscriptContext";
import { useEvent } from "@/app/contexts/EventContext";

export function useHandleSessionHistory() {
  const {
    transcriptItems,
    addTranscriptBreadcrumb,
    addTranscriptMessage,
    updateTranscriptMessage,
    updateTranscriptItem,
  } = useTranscript();

  const { logServerEvent } = useEvent();
  
  // Delta queue system for throttled display
  const deltaQueueRef = useRef<{ itemId: string; delta: string }[]>([]);
  const processingDeltaRef = useRef(false);
  const deltaIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const activeDeltaItemsRef = useRef<Set<string>>(new Set());

  // Process delta queue with throttling
  const processDeltaQueue = () => {
    console.log(`[processDeltaQueue] Queue length: ${deltaQueueRef.current.length}`);
    
    if (deltaQueueRef.current.length === 0) {
      console.log(`[processDeltaQueue] Queue empty, stopping interval`);
      processingDeltaRef.current = false;
      if (deltaIntervalRef.current) {
        clearInterval(deltaIntervalRef.current);
        deltaIntervalRef.current = null;
      }
      // Clear all active items when queue is empty
      activeDeltaItemsRef.current.clear();
      return;
    }

    const { itemId, delta } = deltaQueueRef.current.shift()!;
    console.log(`[processDeltaQueue] Processing delta: "${delta}" for itemId: ${itemId}`);
    
    // Always append since message might already exist with empty text
    console.log(`[processDeltaQueue] Appending delta to message`);
    updateTranscriptMessage(itemId, delta, true);
    
    // Check if this was the last delta for this item
    const hasMoreDeltasForItem = deltaQueueRef.current.some(d => d.itemId === itemId);
    if (!hasMoreDeltasForItem) {
      activeDeltaItemsRef.current.delete(itemId);
      console.log(`[processDeltaQueue] No more deltas for itemId: ${itemId}, removing from active set`);
    }
  };

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (deltaIntervalRef.current) {
        clearInterval(deltaIntervalRef.current);
      }
    };
  }, []);

  /* ----------------------- helpers ------------------------- */

  const extractMessageText = (content: any[] = []): string => {
    if (!Array.isArray(content)) return "";

    return content
      .map((c) => {
        if (!c || typeof c !== "object") return "";
        if (c.type === "input_text") return c.text ?? "";
        if (c.type === "audio") return c.transcript ?? "";
        return "";
      })
      .filter(Boolean)
      .join("\n");
  };

  const extractFunctionCallByName = (name: string, content: any[] = []): any => {
    if (!Array.isArray(content)) return undefined;
    return content.find((c: any) => c.type === 'function_call' && c.name === name);
  };

  const maybeParseJson = (val: any) => {
    if (typeof val === 'string') {
      try {
        return JSON.parse(val);
      } catch {
        console.warn('Failed to parse JSON:', val);
        return val;
      }
    }
    return val;
  };

  const extractLastAssistantMessage = (history: any[] = []): any => {
    if (!Array.isArray(history)) return undefined;
    return history.reverse().find((c: any) => c.type === 'message' && c.role === 'assistant');
  };

  const extractModeration = (obj: any) => {
    if ('moderationCategory' in obj) return obj;
    if ('outputInfo' in obj) return extractModeration(obj.outputInfo);
    if ('output' in obj) return extractModeration(obj.output);
    if ('result' in obj) return extractModeration(obj.result);
  };

  // Temporary helper until the guardrail_tripped event includes the itemId in the next version of the SDK
  const sketchilyDetectGuardrailMessage = (text: string) => {
    return text.match(/Failure Details: (\{.*?\})/)?.[1];
  };

  /* ----------------------- event handlers ------------------------- */

  function handleAgentToolStart(details: any, _agent: any, functionCall: any) {
    const lastFunctionCall = extractFunctionCallByName(functionCall.name, details?.context?.history);
    const function_name = lastFunctionCall?.name;
    const function_args = lastFunctionCall?.arguments;

    addTranscriptBreadcrumb(
      `function call: ${function_name}`,
      function_args
    );    
  }
  function handleAgentToolEnd(details: any, _agent: any, _functionCall: any, result: any) {
    const lastFunctionCall = extractFunctionCallByName(_functionCall.name, details?.context?.history);
    addTranscriptBreadcrumb(
      `function call result: ${lastFunctionCall?.name}`,
      maybeParseJson(result)
    );
  }

  function handleHistoryAdded(item: any) {
    console.log("[handleHistoryAdded] ", item);
    if (!item || item.type !== 'message') return;

    const { itemId, role, content = [] } = item;
    if (itemId && role) {
      const isUser = role === "user";
      let text = extractMessageText(content);

      if (isUser && !text) {
        text = "[Transcribing...]";
      }

      // If the guardrail has been tripped, this message is a message that gets sent to the 
      // assistant to correct it, so we add it as a breadcrumb instead of a message.
      const guardrailMessage = sketchilyDetectGuardrailMessage(text);
      if (guardrailMessage) {
        const failureDetails = JSON.parse(guardrailMessage);
        addTranscriptBreadcrumb('Output Guardrail Active', { details: failureDetails });
      } else {
        console.log(`[handleHistoryAdded] Adding message - itemId: ${itemId}, role: ${role}, text: "${text}"`);
        addTranscriptMessage(itemId, role, text);
      }
    }
  }

  function handleHistoryUpdated(items: any[]) {
    console.log("[handleHistoryUpdated] ", items);
    items.forEach((item: any) => {
      if (!item || item.type !== 'message') return;

      const { itemId, content = [] } = item;

      // Skip if we're actively processing deltas for this item
      if (activeDeltaItemsRef.current.has(itemId)) {
        console.log(`[handleHistoryUpdated] Skipping update for itemId: ${itemId} - deltas in progress`);
        return;
      }

      const text = extractMessageText(content);

      if (text) {
        updateTranscriptMessage(itemId, text, false);
      }
    });
  }

  function handleTranscriptionDelta(item: any) {
    const itemId = item.item_id;
    const deltaText = item.delta || "";
    console.log(`[handleTranscriptionDelta] itemId: ${itemId}, delta: "${deltaText}"`);
    
    if (itemId && deltaText) {
      // Mark this item as actively receiving deltas
      activeDeltaItemsRef.current.add(itemId);
      
      // Add to queue instead of processing immediately
      deltaQueueRef.current.push({ itemId, delta: deltaText });
      console.log(`[handleTranscriptionDelta] Queue length: ${deltaQueueRef.current.length}`);
      
      // Start processing if not already running
      if (!processingDeltaRef.current) {
        processingDeltaRef.current = true;
        if (!deltaIntervalRef.current) {
          console.log(`[handleTranscriptionDelta] Starting delta processing interval`);
          deltaIntervalRef.current = setInterval(processDeltaQueue, 200); // 200ms between words
        }
      }
    }
  }

  function handleTranscriptionCompleted(item: any) {
    // History updates don't reliably end in a completed item, 
    // so we need to handle finishing up when the transcription is completed.
    const itemId = item.item_id;
    const finalTranscript =
        !item.transcript || item.transcript === "\n"
        ? "[inaudible]"
        : item.transcript;
    if (itemId) {
      // Check if deltas are still being processed for this item
      if (activeDeltaItemsRef.current.has(itemId)) {
        console.log(`[handleTranscriptionCompleted] Deltas still processing for itemId: ${itemId}, skipping final transcript update`);
        // Just update the status
        updateTranscriptItem(itemId, { status: 'DONE' });
        return;
      }
      
      // Clear any pending deltas for this item
      deltaQueueRef.current = deltaQueueRef.current.filter(d => d.itemId !== itemId);
      
      // Check if we already have content for this item
      const existingItem = transcriptItems.find((i) => i.itemId === itemId);
      
      // Always update with the final transcript to ensure we have the complete text
      updateTranscriptMessage(itemId, finalTranscript, false);
      
      updateTranscriptItem(itemId, { status: 'DONE' });

      // If guardrailResult still pending, mark PASS.
      if (existingItem?.guardrailResult?.status === 'IN_PROGRESS') {
        updateTranscriptItem(itemId, {
          guardrailResult: {
            status: 'DONE',
            category: 'NONE',
            rationale: '',
          },
        });
      }
    }
  }

  function handleGuardrailTripped(details: any, _agent: any, guardrail: any) {
    console.log("[guardrail tripped]", details, _agent, guardrail);
    const moderation = extractModeration(guardrail.result.output.outputInfo);
    logServerEvent({ type: 'guardrail_tripped', payload: moderation });

    // find the last assistant message in details.context.history
    const lastAssistant = extractLastAssistantMessage(details?.context?.history);

    if (lastAssistant && moderation) {
      const category = moderation.moderationCategory ?? 'NONE';
      const rationale = moderation.moderationRationale ?? '';
      const offendingText: string | undefined = moderation?.testText;

      updateTranscriptItem(lastAssistant.itemId, {
        guardrailResult: {
          status: 'DONE',
          category,
          rationale,
          testText: offendingText,
        },
      });
    }
  }

  const handlersRef = useRef({
    handleAgentToolStart,
    handleAgentToolEnd,
    handleHistoryUpdated,
    handleHistoryAdded,
    handleTranscriptionDelta,
    handleTranscriptionCompleted,
    handleGuardrailTripped,
  });

  return handlersRef;
}