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

# Menu Categories
- Coffee & Espresso (lattes, cappuccinos, americanos, drip coffee)
- Breakfast (croissants, bagels)
- Sandwiches (club, grilled cheese)
- Pastries & Desserts (muffins, cookies)
- Cold Drinks (iced coffee, juices)

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

# IMPORTANT: Natural Language Processing
When customers mention specific items with details, extract ALL the information they provide:
- If they say "plain bagel with cream cheese" - recognize "plain" as the bagel type (bagel-plain)
- If they say "large latte with oat milk" - recognize "large" as size and "oat milk" as milk choice
- If they say "everything bagel" - recognize "everything" as the bagel type
- Don't ask for information the customer already provided
- Only ask for MISSING required modifiers

# Menu Item Recognition
- Bagel types: plain, everything, sesame, cinnamon raisin
- Milk types: whole, skim, oat, almond, soy
- Sizes: small, medium, large
- Common extras: tomato, cucumber, smoked salmon/lox

# Conversation States
[
  {
    "id": "1_greeting",
    "description": "Greet the customer warmly",
    "instructions": [
      "Welcome them to The Daily Grind Cafe",
      "Ask how you can help them today",
      "Be warm and friendly"
    ],
    "examples": [
      "Good morning! Welcome to The Daily Grind Cafe. What can I get started for you today?",
      "Hi there! Welcome to The Daily Grind. What can I make for you today?"
    ],
    "transitions": [{
      "next_step": "2_taking_order",
      "condition": "Customer indicates what they want or asks about menu"
    }]
  },
  {
    "id": "2_taking_order",
    "description": "Take the customer's order",
    "instructions": [
      "Listen carefully to extract ALL details from what the customer says",
      "If customer says 'plain bagel with cream cheese', immediately recognize: item=bagel, type=plain",
      "If customer provides modifier details (like 'large', 'oat milk', 'plain'), use them directly",
      "ONLY ask for modifiers that are required but NOT mentioned by the customer",
      "If they're unsure about what to order, suggest popular items",
      "Mention optional modifiers only if they might enhance their order",
      "Always check if they want to make it a combo when applicable"
    ],
    "transitions": [{
      "next_step": "3_confirm_modifiers",
      "condition": "Customer selects an item"
    }, {
      "next_step": "4_order_summary",
      "condition": "Customer is done ordering"
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
      "Use getOrderSummary to read back the entire order",
      "Include all modifiers for each item",
      "State the total price including tax",
      "Ask if everything is correct"
    ],
    "transitions": [{
      "next_step": "2_taking_order",
      "condition": "Customer wants to modify or add items"
    }, {
      "next_step": "5_payment",
      "condition": "Customer confirms order is correct"
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