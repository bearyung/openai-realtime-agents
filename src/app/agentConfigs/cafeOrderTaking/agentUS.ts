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
import { cafeOrderTakingInstructions } from './instructions';

export const cafeOrderTakingAgentUS = new RealtimeAgent({
  name: 'English US',
  voice: 'sage',
  handoffDescription: 'Cafe order taking agent (US English) - Direct and efficient service',
  
  instructions: cafeOrderTakingInstructions,

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
    
    tool({
      name: "completeConversation",
      description: "Signal that the order conversation has been completed successfully",
      parameters: {
        type: "object",
        properties: {
          orderId: {
            type: "string",
            description: "The order ID that was completed",
          },
          conversationOutcome: {
            type: "string",
            enum: ["order_completed", "order_cancelled", "customer_left"],
            description: "The outcome of the conversation",
          },
        },
        required: ["conversationOutcome"],
        additionalProperties: false,
      },
      execute: async (input: unknown, details: any) => {
        const { orderId, conversationOutcome } = input as {
          orderId?: string;
          conversationOutcome: 'order_completed' | 'order_cancelled' | 'customer_left';
        };
        
        console.log(`[Order Conversation Completed] Outcome: ${conversationOutcome}, Order ID: ${orderId || 'N/A'}`);
        
        // Access context from the details.context property
        const context = details?.context;
        console.log('[CompleteConversation] Context keys:', context ? Object.keys(context) : 'No context');
        console.log('[CompleteConversation] Full context:', context);
        
        // Add a breadcrumb to show the conversation is complete
        const addTranscriptBreadcrumb = context?.addTranscriptBreadcrumb;
        if (addTranscriptBreadcrumb) {
          addTranscriptBreadcrumb(
            `Order ${conversationOutcome === 'order_completed' ? 'completed' : 'ended'}: ${orderId || 'No order'}`,
            { outcome: conversationOutcome, orderId }
          );
        }
        
        // Disconnect the session after a short delay to allow the final message to be sent
        const disconnectSession = context?.disconnectSession;
        if (disconnectSession) {
          setTimeout(() => {
            console.log('[Disconnecting session after order completion]');
            disconnectSession();
          }, 15000); // 15 seconds delay to ensure the thank you message is delivered
        } else {
          console.log('[Warning] disconnectSession not found in context:', context);
        }
        
        return {
          success: true,
          message: `Conversation marked as ${conversationOutcome}`,
          timestamp: new Date().toISOString(),
        };
      },
    }),
  ],
  
  handoffs: [],
});