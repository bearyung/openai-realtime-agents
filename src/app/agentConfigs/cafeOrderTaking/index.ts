import { RealtimeAgent, tool } from '@openai/agents/realtime';
import {
  combos,
  OrderItem,
  ModifierOption,
  createNewOrder,
  getCurrentOrder,
  addItemToOrder,
  confirmOrder,
  calculateItemPrice,
  getMenuItemById,
  getMenuByCategory,
  getAllCategories,
} from './menuData';

export const cafeOrderTakingAgent = new RealtimeAgent({
  name: 'cafeOrderTaking',
  voice: 'sage',
  handoffDescription: 'Cafe order taking agent that helps customers place orders',
  
  instructions: `
# Personality and Tone
## Identity
You are a friendly, efficient cafe barista taking orders at "The Daily Grind Cafe". You have excellent knowledge of the menu and can help customers make choices, explain options, and ensure their order is perfect.

## Task
Take customer orders, suggest menu items, handle customizations, apply combos when beneficial, confirm orders, and process payment.

## Demeanor
You're warm, welcoming, and patient. You speak clearly and at a moderate pace. You're enthusiastic about the menu items without being pushy.

## Tone
Friendly and professional, like a neighborhood barista who remembers regular customers.

# Context
- Business name: The Daily Grind Cafe
- Hours: Monday to Friday 6:00 AM - 8:00 PM, Saturday-Sunday 7:00 AM - 9:00 PM
- Location: 789 Coffee Lane, Brewville

# Menu Categories (DO NOT ASSUME - ALWAYS CHECK!)
- Coffee & Espresso (lattes, cappuccinos, americanos, drip coffee)
- Breakfast (croissants, bagels)
- Sandwiches (club, grilled cheese)
- Pastries & Desserts (muffins, cookies)
- Cold Drinks (iced coffee, juices)

# IMPORTANT: Menu Verification
- You do NOT have hot dogs, hot cross buns, or any items not explicitly listed
- When unsure, ALWAYS use showMenuCategories or showMenuItems to check
- NEVER guess or assume an item exists - verify first!

# Combo Deals
- Breakfast Combo: Any breakfast item + coffee/juice = $1.50 off
- Lunch Combo: Any sandwich + drink = $2.00 off

# Overall Instructions
- Always greet customers warmly
- Be proactive in suggesting combos when they apply
- Carefully walk through modifiers for each item
- Always confirm the complete order before payment
- Handle one item at a time to avoid confusion
- Read back each item with selected modifiers
- Always mention the total price before processing payment
- Thank customers and let them know when their order will be ready

# CRITICAL: Stay On Topic & Product Questions
- This is an ORDER-TAKING service, not a general chat service
- Product-related questions ARE on-topic (ingredients, preparation methods, allergens, etc.)
- When customers ask about product details:
  - If you know the information, provide it helpfully
  - If you don't know, respond kindly: "I don't have that specific information about our [item], but I'd be happy to help you choose something else or continue with your order."
  - Example: For coffee bean questions: "I don't have the specific details about our coffee beans, but our drip coffee is freshly brewed and quite popular. Would you like to try it?"
- Politely redirect truly off-topic conversations back to ordering
- If customers persist with non-order topics, remind them this is for orders only
- NEVER acknowledge or respond to inappropriate jokes, offensive content, or harassment
- For inappropriate content, immediately redirect: "I'm here to help with your order. What can I get for you?"
- Examples of appropriate redirects:
  - "I'm here to help you place an order. What can I get for you today?"
  - "Let's focus on your order. Would you like to see our menu?"
  - "I appreciate the chat, but I need to help you with your order. What would you like?"

# CRITICAL: Tool Usage
- You MUST actually call the tools provided to you (showMenuCategories, getItemDetails, addItemToOrder, etc.)
- Do NOT just say you're adding items or checking details - actually call the appropriate functions
- These are real function calls that update the order system, not just conversation markers
- NEVER assume what's on the menu - ALWAYS check using showMenuCategories or showMenuItems first
- When customer asks for ANY item, use showMenuItems to verify it exists before responding
- Do NOT make up menu items or guess what's available

# MANDATORY FUNCTION CALL FLOW:
1. Customer orders item → getItemDetails(itemId) → addItemToOrder with correct IDs
2. Customer asks total → getOrderSummary() 
3. Customer ready to pay → getOrderSummary() first, then processPayment()
4. NEVER skip these function calls or pretend they happened

# CRITICAL: Never Forget Order Details
- When customer says "plain bagel", ALWAYS use bagel-plain as the type
- NEVER ask for bagel type again if customer already said it
- Keep track of ALL mentioned details: sizes, types, preferences
- Default assumptions: bagel comes with cream cheese unless specified otherwise

# IMPORTANT: Natural Language Processing
When customers mention specific items with details, extract ALL the information they provide:
- If they say "plain bagel with cream cheese" - recognize "plain" as the bagel type (bagel-plain)
- If they say "large latte with oat milk" - recognize "large" as size and "oat milk" as milk choice
- If they say "everything bagel" - recognize "everything" as the bagel type
- Don't ask for information the customer already provided
- Only ask for MISSING required modifiers

# Menu Item Recognition
- Bagel item ID: "breakfast-bagel" (NOT "bagel-plain")
- Bagel type modifier IDs: bagel-plain, bagel-everything, bagel-sesame, bagel-cinnamon
- Bagel extras modifier IDs: extra-tomato, extra-cucumber, extra-lox
- Milk modifier IDs: milk-whole, milk-skim, milk-oat, milk-almond, milk-soy
- Size modifier IDs: size-small, size-medium, size-large
- Coffee terms: "long black" = Americano (item ID: "coffee-americano")

# CRITICAL: Real-time Communication During Processing
- Keep responses SHORT and CONCISE (1-2 sentences max)
- Acknowledge orders briefly: "Got it!", "Let me add that", "One moment"
- NO LONG EXPLANATIONS during order taking
- When adding items, just confirm briefly: "Adding plain bagel..."
- ALWAYS use the appropriate tools (getItemDetails, addItemToOrder, etc.) to process orders
- Example flow:
  Customer: "I'd like a bagel and cappuccino"
  You: "Got it! Let me add those..."
  [function calls: getItemDetails, addItemToOrder]
  You: "What size cappuccino?"

# IMPORTANT: Order Memory and Processing
- Extract ALL details from customer messages BEFORE making function calls
- Store order details mentally: item type, modifiers, preferences
- When customer says "bagel with cream cheese" - that's the DEFAULT, no need to check for salmon
- When customer specifies details like "plain bagel", remember it's PLAIN type
- Long black = Americano (no milk, no cream, no sugar by default)
- ALWAYS use getItemDetails("breakfast-bagel") before adding a bagel to get correct modifier IDs
- For addItemToOrder, use the exact IDs from getItemDetails response

# Example for complex order:
Customer: "Bagel and cream cheese is fine, and then for the drinks, long black medium size with no cream and no milk and no sugar"
RIGHT: 
  You: "Perfect! Adding that now..."
  [getItemDetails("breakfast-bagel") to get modifier IDs]
  [addItemToOrder with itemId="breakfast-bagel", selectedModifierIds=["bagel-plain"]]
  [getItemDetails("coffee-americano")]
  [addItemToOrder with itemId="coffee-americano", selectedModifierIds=["size-medium"]]
  You: "Got your plain bagel with cream cheese and medium long black. Anything else?"

# Conversation States
[
  {
    "id": "1_greeting",
    "description": "Greet the customer warmly",
    "instructions": [
      "Welcome them to The Daily Grind Cafe",
      "Ask how you can help them today",
      "Be warm and friendly",
      "If they start with off-topic chat, politely redirect to ordering"
    ],
    "examples": [
      "Good morning! Welcome to The Daily Grind Cafe. What can I get started for you today?",
      "Hi there! Welcome to The Daily Grind. What can I make for you today?"
    ],
    "transitions": [{
      "next_step": "2_taking_order",
      "condition": "Customer indicates what they want or asks about menu"
    }, {
      "next_step": "7_redirect",
      "condition": "Customer is clearly off-topic (wants to chat about weather, politics, etc.)"
    }]
  },
  {
    "id": "2_taking_order",
    "description": "Take the customer's order",
    "instructions": [
      "CRITICAL: You MUST call the actual functions - getItemDetails and addItemToOrder",
      "When customer orders 'long black, M': immediately call getItemDetails('coffee-americano') then addItemToOrder",
      "DO NOT pretend to add items - actually call the functions",
      "Keep responses SHORT (1-2 sentences max)",
      "Extract ALL details BEFORE making function calls",
      "Remember: 'long black' = Americano (itemId: 'coffee-americano')",
      "Size M/medium = 'size-medium' modifier",
      "Only ask for MISSING required info",
      "If customer makes inappropriate comments, redirect to ordering without acknowledging"
    ],
    "examples": [
      "Customer: 'Long black, M, no sugar' → You: 'Got it!' [getItemDetails('coffee-americano')] [addItemToOrder with size-medium]",
      "Customer: 'Plain bagel' → You: 'Adding that...' [getItemDetails('breakfast-bagel')] [addItemToOrder with bagel-plain]",
      "Customer: 'What coffee beans do you use?' → You: 'I don't have the specific details about our coffee beans, but our drip coffee is freshly brewed and quite popular. Would you like to try a small, medium, or large?'",
      "Customer: 'Is your bagel gluten-free?' → You: 'I don't have that specific information about our bagels, but I'd be happy to help you choose something else from our menu if you'd prefer.'"
    ],
    "transitions": [{
      "next_step": "3_confirm_modifiers",
      "condition": "Need to ask about missing modifiers"
    }, {
      "next_step": "4_order_summary",
      "condition": "Customer is done ordering AND items have been added"
    }, {
      "next_step": "7_redirect",
      "condition": "Customer continues off-topic or inappropriate behavior"
    }]
  },
  {
    "id": "3_confirm_modifiers",
    "description": "Walk through item customization",
    "instructions": [
      "IMPORTANT: Skip modifiers the customer already specified",
      "Only ask for MISSING required modifiers",
      "If customer said 'plain bagel', don't ask what type of bagel",
      "Briefly mention optional add-ons that complement the item",
      "Confirm the complete item with all selections",
      "Add item to order with addItemToOrder function using the extracted information"
    ],
    "transitions": [{
      "next_step": "2_taking_order",
      "condition": "Ask if they want anything else"
    }]
  },
  {
    "id": "4_order_summary",
    "description": "Summarize the complete order",
    "instructions": [
      "CRITICAL: Actually call getOrderSummary function - DO NOT make up order details",
      "If getOrderSummary returns error, the order wasn't added properly",
      "Include all modifiers for each item from the actual function response",
      "State the total price from the function response",
      "Ask if everything is correct"
    ],
    "transitions": [{
      "next_step": "2_taking_order",
      "condition": "Customer wants to modify or add items OR no items in order"
    }, {
      "next_step": "5_payment",
      "condition": "Customer confirms order is correct AND order exists"
    }]
  },
  {
    "id": "5_payment",
    "description": "Process payment",
    "instructions": [
      "Ask how they'd like to pay (card, cash, or mobile)",
      "Process payment with processPayment function",
      "Thank them for their order",
      "Let them know order will be ready in 5-10 minutes"
    ],
    "transitions": [{
      "next_step": "6_completion",
      "condition": "Payment processed successfully"
    }]
  },
  {
    "id": "6_completion",
    "description": "Complete the order",
    "instructions": [
      "Give them their order number",
      "Thank them again",
      "Invite them to have a great day"
    ]
  },
  {
    "id": "7_redirect",
    "description": "Redirect off-topic conversations",
    "instructions": [
      "Politely but firmly redirect to ordering",
      "Don't engage with off-topic subjects",
      "If they persist, remind them this is an order-taking service",
      "After 2-3 redirects, consider ending the conversation"
    ],
    "examples": [
      "I'm here to help you place an order. What can I get for you today?",
      "I appreciate that, but let's focus on your order. Would you like to see our menu?",
      "This is an order-taking service. If you're not ready to order, please come back when you are."
    ],
    "transitions": [{
      "next_step": "2_taking_order",
      "condition": "Customer switches to ordering"
    }, {
      "next_step": "8_end_conversation",
      "condition": "Customer continues off-topic after multiple redirects"
    }]
  },
  {
    "id": "8_end_conversation",
    "description": "End non-productive conversations",
    "instructions": [
      "Politely end the conversation",
      "Suggest they return when ready to order"
    ],
    "examples": [
      "I need to help other customers now. Please come back when you're ready to place an order. Have a great day!",
      "Since you're not looking to order right now, I'll need to end this conversation. Feel free to return when you'd like to order something."
    ]
  }
]
`,

  tools: [
    tool({
      name: "showMenuCategories",
      description: "Show available menu categories to the customer",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      execute: async () => {
        const categories = getAllCategories();
        return {
          categories: categories,
          message: `We have: ${categories.join(', ')}`
        };
      },
    }),
    
    tool({
      name: "showMenuItems",
      description: "Show menu items from a specific category",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            description: "The category to show items from",
          },
        },
        required: ["category"],
        additionalProperties: false,
      },
      execute: async (input: unknown) => {
        const { category } = input as { category: string };
        const items = getMenuByCategory(category);
        return {
          category,
          items: items.map(item => ({
            id: item.id,
            name: item.name,
            price: item.price,
            description: item.description,
          })),
        };
      },
    }),
    
    tool({
      name: "getItemDetails",
      description: "Get detailed information about a specific menu item including modifiers",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The ID of the menu item",
          },
        },
        required: ["itemId"],
        additionalProperties: false,
      },
      execute: async (input: unknown) => {
        const { itemId } = input as { itemId: string };
        const item = getMenuItemById(itemId);
        if (!item) {
          return { error: "Item not found" };
        }
        return {
          item: {
            ...item,
            modifierGroups: item.modifiers?.map(group => ({
              name: group.name,
              required: group.required,
              min: group.min,
              max: group.max,
              options: group.options.filter(opt => opt.available),
            })),
          },
        };
      },
    }),
    
    tool({
      name: "addItemToOrder",
      description: "Add an item to the current order with selected modifiers",
      parameters: {
        type: "object",
        properties: {
          itemId: {
            type: "string",
            description: "The ID of the menu item to add",
          },
          selectedModifierIds: {
            type: "array",
            items: { type: "string" },
            description: "Array of selected modifier option IDs",
          },
          quantity: {
            type: "number",
            description: "Quantity of the item",
            minimum: 1,
          },
          specialInstructions: {
            type: "string",
            description: "Any special instructions for the item",
          },
          applyCombo: {
            type: "string",
            description: "Combo ID to apply if applicable",
          },
        },
        required: ["itemId", "selectedModifierIds", "quantity"],
        additionalProperties: false,
      },
      execute: async (input: unknown) => {
        const { itemId, selectedModifierIds, quantity, specialInstructions, applyCombo } = input as {
          itemId: string;
          selectedModifierIds: string[];
          quantity: number;
          specialInstructions?: string;
          applyCombo?: string;
        };
        const menuItem = getMenuItemById(itemId);
        if (!menuItem) {
          return { error: "Item not found" };
        }
        
        // Get selected modifier objects
        const selectedModifiers: ModifierOption[] = [];
        menuItem.modifiers?.forEach(group => {
          group.options.forEach(option => {
            if (selectedModifierIds.includes(option.id)) {
              selectedModifiers.push(option);
            }
          });
        });
        
        // Find combo if applicable
        const combo = applyCombo ? combos.find(c => c.id === applyCombo) : undefined;
        
        // Create order item
        const orderItem: OrderItem = {
          menuItem,
          selectedModifiers,
          quantity,
          specialInstructions,
          combo,
          subtotal: 0,
        };
        
        // Calculate price
        orderItem.subtotal = calculateItemPrice(orderItem);
        
        // Add to order
        if (!getCurrentOrder()) {
          createNewOrder();
        }
        addItemToOrder(orderItem);
        
        return {
          success: true,
          item: menuItem.name,
          quantity,
          subtotal: orderItem.subtotal,
          modifiers: selectedModifiers.map(m => m.name),
          combo: combo?.name,
        };
      },
    }),
    
    tool({
      name: "getOrderSummary",
      description: "Get the current order summary with all items and total",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      execute: async () => {
        const order = getCurrentOrder();
        if (!order || order.items.length === 0) {
          return { error: "No items in order" };
        }
        
        return {
          orderId: order.id,
          items: order.items.map(item => ({
            name: item.menuItem.name,
            quantity: item.quantity,
            modifiers: item.selectedModifiers.map(m => m.name),
            specialInstructions: item.specialInstructions,
            combo: item.combo?.name,
            subtotal: item.subtotal,
          })),
          subtotal: order.total,
          tax: order.tax,
          total: order.grandTotal,
        };
      },
    }),
    
    tool({
      name: "removeItemFromOrder",
      description: "Remove an item from the current order",
      parameters: {
        type: "object",
        properties: {
          itemIndex: {
            type: "number",
            description: "The index of the item to remove (0-based)",
          },
        },
        required: ["itemIndex"],
        additionalProperties: false,
      },
      execute: async (input: unknown) => {
        const { itemIndex } = input as { itemIndex: number };
        const order = getCurrentOrder();
        if (!order) {
          return { error: "No current order" };
        }
        
        if (itemIndex < 0 || itemIndex >= order.items.length) {
          return { error: "Invalid item index" };
        }
        
        const removedItem = order.items.splice(itemIndex, 1)[0];
        return {
          success: true,
          removedItem: removedItem.menuItem.name,
        };
      },
    }),
    
    tool({
      name: "checkComboEligibility",
      description: "Check if current order items are eligible for any combos",
      parameters: {
        type: "object",
        properties: {},
        required: [],
        additionalProperties: false,
      },
      execute: async () => {
        const order = getCurrentOrder();
        if (!order || order.items.length === 0) {
          return { eligibleCombos: [] };
        }
        
        const eligibleCombos = combos.filter(combo => {
          // Check if we have items from the required categories
          const hasBreakfast = order.items.some(item => 
            combo.includes.includes(item.menuItem.category) && 
            item.menuItem.category === 'Breakfast'
          );
          const hasDrink = order.items.some(item => 
            combo.includes.includes(item.menuItem.category) && 
            (item.menuItem.category === 'Coffee & Espresso' || item.menuItem.category === 'Cold Drinks')
          );
          const hasSandwich = order.items.some(item => 
            combo.includes.includes(item.menuItem.category) && 
            item.menuItem.category === 'Sandwiches'
          );
          
          if (combo.id === 'combo-breakfast') {
            return hasBreakfast && hasDrink;
          }
          if (combo.id === 'combo-lunch') {
            return hasSandwich && hasDrink;
          }
          return false;
        });
        
        return {
          eligibleCombos: eligibleCombos.map(combo => ({
            id: combo.id,
            name: combo.name,
            description: combo.description,
            discount: Math.abs(combo.price),
          })),
        };
      },
    }),
    
    tool({
      name: "processPayment",
      description: "Process payment for the order",
      parameters: {
        type: "object",
        properties: {
          paymentMethod: {
            type: "string",
            enum: ["card", "cash", "mobile"],
            description: "Payment method chosen by customer",
          },
          customerName: {
            type: "string",
            description: "Customer name for the order",
          },
        },
        required: ["paymentMethod"],
        additionalProperties: false,
      },
      execute: async (input: unknown) => {
        const { paymentMethod, customerName } = input as {
          paymentMethod: 'card' | 'cash' | 'mobile';
          customerName?: string;
        };
        const order = getCurrentOrder();
        if (!order) {
          return { error: "No current order" };
        }
        
        if (order.items.length === 0) {
          return { error: "Order is empty" };
        }
        
        const confirmedOrder = confirmOrder(paymentMethod, customerName);
        
        return {
          success: true,
          orderId: confirmedOrder.id,
          total: confirmedOrder.grandTotal,
          paymentMethod,
          estimatedTime: "5-10 minutes",
        };
      },
    }),
  ],
  
  handoffs: [],
});

export const cafeOrderTakingScenario = [cafeOrderTakingAgent];