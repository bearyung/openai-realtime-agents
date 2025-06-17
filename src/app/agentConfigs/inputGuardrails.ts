import { GuardrailOutput } from '@/app/types';

// Track conversation state per session
const conversationTrackers = new Map<string, {
  messageCount: number;
  lastOrderIntent: number;
  offTopicCount: number;
  warningsSent: number;
  startTime: number;
}>();

export interface InputGuardrailResult {
  shouldBlock: boolean;
  reason?: string;
  suggestedResponse?: string;
}

// Detects if user message is related to ordering
async function detectOrderIntent(message: string): Promise<boolean> {
  const orderKeywords = [
    'order', 'want', 'like', 'get', 'have', 'menu', 'price', 'cost',
    'coffee', 'latte', 'cappuccino', 'bagel', 'sandwich', 'muffin',
    'drink', 'food', 'breakfast', 'lunch', 'small', 'medium', 'large',
    'add', 'remove', 'change', 'hot', 'cold', 'iced', 'cream', 'sugar',
    // Product-related questions
    'bean', 'beans', 'ingredient', 'made', 'contain', 'gluten', 'dairy',
    'vegan', 'vegetarian', 'organic', 'allergen', 'allergy', 'nut', 'soy',
    'decaf', 'caffeine', 'calorie', 'fresh', 'roast', 'brew', 'prepare',
    'what kind', 'which type', 'how is', 'what is'
  ];
  
  const lowerMessage = message.toLowerCase();
  return orderKeywords.some(keyword => lowerMessage.includes(keyword));
}

// Input guardrail to prevent off-topic conversations
export function createInputGuardrail(sessionId: string) {
  return {
    name: 'conversation_relevance_guardrail',
    
    async execute(userInput: string): Promise<InputGuardrailResult> {
      // Get or create tracker for this session
      let tracker = conversationTrackers.get(sessionId);
      if (!tracker) {
        tracker = {
          messageCount: 0,
          lastOrderIntent: 0,
          offTopicCount: 0,
          warningsSent: 0,
          startTime: Date.now()
        };
        conversationTrackers.set(sessionId, tracker);
      }
      
      tracker.messageCount++;
      
      // Check if message is order-related
      const hasOrderIntent = await detectOrderIntent(userInput);
      
      if (hasOrderIntent) {
        tracker.lastOrderIntent = tracker.messageCount;
        tracker.offTopicCount = 0; // Reset off-topic count
        return { shouldBlock: false };
      }
      
      // If not order-related, increment off-topic count
      tracker.offTopicCount++;
      
      // Allow some chitchat at the beginning
      if (tracker.messageCount <= 3) {
        return { shouldBlock: false };
      }
      
      // If too many off-topic messages in a row
      if (tracker.offTopicCount >= 3) {
        tracker.warningsSent++;
        
        if (tracker.warningsSent >= 2) {
          // Hard block after 2 warnings
          return {
            shouldBlock: true,
            reason: 'Too many off-topic messages',
            suggestedResponse: "I'm sorry, but this service is specifically for placing orders at The Daily Grind Cafe. If you're not looking to order, please free up the line for other customers. Thank you!"
          };
        }
        
        // First warning
        return {
          shouldBlock: true,
          reason: 'Off-topic conversation',
          suggestedResponse: "I'm here to help you place an order at The Daily Grind Cafe. Would you like to see our menu or place an order? If not, I'll need to help other customers."
        };
      }
      
      // Check for excessive conversation length
      if (tracker.messageCount > 20 && 
          (tracker.messageCount - tracker.lastOrderIntent) > 10) {
        return {
          shouldBlock: true,
          reason: 'Conversation too long without ordering',
          suggestedResponse: "We've been chatting for a while now. If you'd like to place an order, I'm happy to help. Otherwise, I need to assist other customers. What would you like to order today?"
        };
      }
      
      return { shouldBlock: false };
    }
  };
}

// Cleanup old sessions (call periodically)
export function cleanupOldSessions() {
  const ONE_HOUR = 60 * 60 * 1000;
  const now = Date.now();
  
  for (const [sessionId, tracker] of conversationTrackers.entries()) {
    if (now - tracker.startTime > ONE_HOUR) {
      conversationTrackers.delete(sessionId);
    }
  }
}

// Rate limiting per session
export function createRateLimitGuardrail(sessionId: string) {
  const rateLimits = new Map<string, {
    tokens: number;
    lastRefill: number;
  }>();
  
  const MAX_TOKENS_PER_MINUTE = 1000;
  const REFILL_RATE = MAX_TOKENS_PER_MINUTE / 60; // tokens per second
  
  return {
    name: 'rate_limit_guardrail',
    
    async execute(estimatedTokens: number = 50): Promise<InputGuardrailResult> {
      let limit = rateLimits.get(sessionId);
      const now = Date.now();
      
      if (!limit) {
        limit = { tokens: MAX_TOKENS_PER_MINUTE, lastRefill: now };
        rateLimits.set(sessionId, limit);
      }
      
      // Refill tokens based on time passed
      const secondsPassed = (now - limit.lastRefill) / 1000;
      limit.tokens = Math.min(
        MAX_TOKENS_PER_MINUTE,
        limit.tokens + (REFILL_RATE * secondsPassed)
      );
      limit.lastRefill = now;
      
      // Check if we have enough tokens
      if (limit.tokens < estimatedTokens) {
        return {
          shouldBlock: true,
          reason: 'Rate limit exceeded',
          suggestedResponse: "I'm sorry, you're sending messages too quickly. Please wait a moment before continuing."
        };
      }
      
      // Deduct tokens
      limit.tokens -= estimatedTokens;
      
      return { shouldBlock: false };
    }
  };
}