// Mock cafe menu data structure
export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  available: boolean;
  modifiers?: ModifierGroup[];
  isComboEligible?: boolean;
}

export interface ModifierGroup {
  id: string;
  name: string;
  required: boolean;
  min: number;
  max: number;
  options: ModifierOption[];
}

export interface ModifierOption {
  id: string;
  name: string;
  price: number;
  available: boolean;
}

export interface Combo {
  id: string;
  name: string;
  description: string;
  price: number;
  includes: string[]; // category names that are included
  available: boolean;
}

export interface OrderItem {
  menuItem: MenuItem;
  selectedModifiers: ModifierOption[];
  quantity: number;
  specialInstructions?: string;
  combo?: Combo;
  subtotal: number;
}

export interface Order {
  id: string;
  items: OrderItem[];
  status: 'pending' | 'confirmed' | 'preparing' | 'ready' | 'completed';
  total: number;
  tax: number;
  grandTotal: number;
  paymentMethod?: 'card' | 'cash' | 'mobile';
  customerName?: string;
  orderTime: Date;
}

// Modifier options for various items
const milkOptions: ModifierOption[] = [
  { id: 'milk-whole', name: 'Whole Milk', price: 0, available: true },
  { id: 'milk-skim', name: 'Skim Milk', price: 0, available: true },
  { id: 'milk-oat', name: 'Oat Milk', price: 0.60, available: true },
  { id: 'milk-almond', name: 'Almond Milk', price: 0.60, available: true },
  { id: 'milk-soy', name: 'Soy Milk', price: 0.60, available: true },
];

const sizeOptions: ModifierOption[] = [
  { id: 'size-small', name: 'Small', price: 0, available: true },
  { id: 'size-medium', name: 'Medium', price: 0.50, available: true },
  { id: 'size-large', name: 'Large', price: 1.00, available: true },
];

const espressoOptions: ModifierOption[] = [
  { id: 'espresso-single', name: 'Single Shot', price: 0, available: true },
  { id: 'espresso-double', name: 'Double Shot', price: 0.75, available: true },
  { id: 'espresso-triple', name: 'Triple Shot', price: 1.50, available: true },
];

const syrupOptions: ModifierOption[] = [
  { id: 'syrup-vanilla', name: 'Vanilla Syrup', price: 0.50, available: true },
  { id: 'syrup-caramel', name: 'Caramel Syrup', price: 0.50, available: true },
  { id: 'syrup-hazelnut', name: 'Hazelnut Syrup', price: 0.50, available: true },
  { id: 'syrup-sf-vanilla', name: 'Sugar-Free Vanilla', price: 0.50, available: true },
];

const breadOptions: ModifierOption[] = [
  { id: 'bread-white', name: 'White Bread', price: 0, available: true },
  { id: 'bread-wheat', name: 'Wheat Bread', price: 0, available: true },
  { id: 'bread-sourdough', name: 'Sourdough', price: 0.50, available: true },
  { id: 'bread-gluten-free', name: 'Gluten-Free', price: 1.00, available: true },
];

const cheeseOptions: ModifierOption[] = [
  { id: 'cheese-cheddar', name: 'Cheddar', price: 0, available: true },
  { id: 'cheese-swiss', name: 'Swiss', price: 0, available: true },
  { id: 'cheese-provolone', name: 'Provolone', price: 0, available: true },
  { id: 'cheese-none', name: 'No Cheese', price: 0, available: true },
];

const toppingOptions: ModifierOption[] = [
  { id: 'topping-lettuce', name: 'Lettuce', price: 0, available: true },
  { id: 'topping-tomato', name: 'Tomato', price: 0, available: true },
  { id: 'topping-onion', name: 'Onion', price: 0, available: true },
  { id: 'topping-pickle', name: 'Pickle', price: 0, available: true },
  { id: 'topping-bacon', name: 'Bacon', price: 1.50, available: true },
  { id: 'topping-avocado', name: 'Avocado', price: 1.00, available: true },
];

// Menu items
export const menuItems: MenuItem[] = [
  // Coffee & Espresso
  {
    id: 'coffee-latte',
    name: 'Latte',
    category: 'Coffee & Espresso',
    price: 4.50,
    description: 'Smooth espresso with steamed milk and a light foam layer',
    available: true,
    modifiers: [
      {
        id: 'latte-size',
        name: 'Size',
        required: true,
        min: 1,
        max: 1,
        options: sizeOptions,
      },
      {
        id: 'latte-milk',
        name: 'Milk Choice',
        required: true,
        min: 1,
        max: 1,
        options: milkOptions,
      },
      {
        id: 'latte-espresso',
        name: 'Espresso',
        required: false,
        min: 0,
        max: 1,
        options: espressoOptions,
      },
      {
        id: 'latte-syrup',
        name: 'Syrup',
        required: false,
        min: 0,
        max: 2,
        options: syrupOptions,
      },
    ],
    isComboEligible: true,
  },
  {
    id: 'coffee-cappuccino',
    name: 'Cappuccino',
    category: 'Coffee & Espresso',
    price: 4.00,
    description: 'Equal parts espresso, steamed milk, and foam',
    available: true,
    modifiers: [
      {
        id: 'cap-size',
        name: 'Size',
        required: true,
        min: 1,
        max: 1,
        options: sizeOptions,
      },
      {
        id: 'cap-milk',
        name: 'Milk Choice',
        required: true,
        min: 1,
        max: 1,
        options: milkOptions,
      },
    ],
    isComboEligible: true,
  },
  {
    id: 'coffee-americano',
    name: 'Americano',
    category: 'Coffee & Espresso',
    price: 3.50,
    description: 'Espresso shots with hot water',
    available: true,
    modifiers: [
      {
        id: 'americano-size',
        name: 'Size',
        required: true,
        min: 1,
        max: 1,
        options: sizeOptions,
      },
      {
        id: 'americano-espresso',
        name: 'Espresso',
        required: false,
        min: 0,
        max: 1,
        options: espressoOptions,
      },
    ],
    isComboEligible: true,
  },
  {
    id: 'coffee-drip',
    name: 'Drip Coffee',
    category: 'Coffee & Espresso',
    price: 2.50,
    description: 'Fresh brewed coffee',
    available: true,
    modifiers: [
      {
        id: 'drip-size',
        name: 'Size',
        required: true,
        min: 1,
        max: 1,
        options: sizeOptions,
      },
    ],
    isComboEligible: true,
  },
  
  // Breakfast Items
  {
    id: 'breakfast-croissant',
    name: 'Breakfast Croissant',
    category: 'Breakfast',
    price: 7.50,
    description: 'Flaky croissant with egg, cheese, and choice of meat',
    available: true,
    modifiers: [
      {
        id: 'croissant-meat',
        name: 'Meat Choice',
        required: true,
        min: 1,
        max: 1,
        options: [
          { id: 'meat-bacon', name: 'Bacon', price: 0, available: true },
          { id: 'meat-sausage', name: 'Sausage', price: 0, available: true },
          { id: 'meat-ham', name: 'Ham', price: 0, available: true },
          { id: 'meat-none', name: 'No Meat', price: -1.00, available: true },
        ],
      },
      {
        id: 'croissant-cheese',
        name: 'Cheese',
        required: false,
        min: 0,
        max: 1,
        options: cheeseOptions,
      },
    ],
    isComboEligible: true,
  },
  {
    id: 'breakfast-bagel',
    name: 'Bagel with Cream Cheese',
    category: 'Breakfast',
    price: 4.50,
    description: 'Toasted bagel with cream cheese',
    available: true,
    modifiers: [
      {
        id: 'bagel-type',
        name: 'Bagel Type',
        required: true,
        min: 1,
        max: 1,
        options: [
          { id: 'bagel-plain', name: 'Plain', price: 0, available: true },
          { id: 'bagel-everything', name: 'Everything', price: 0, available: true },
          { id: 'bagel-sesame', name: 'Sesame', price: 0, available: true },
          { id: 'bagel-cinnamon', name: 'Cinnamon Raisin', price: 0, available: true },
        ],
      },
      {
        id: 'bagel-extras',
        name: 'Extras',
        required: false,
        min: 0,
        max: 2,
        options: [
          { id: 'extra-tomato', name: 'Tomato', price: 0.50, available: true },
          { id: 'extra-cucumber', name: 'Cucumber', price: 0.50, available: true },
          { id: 'extra-lox', name: 'Smoked Salmon', price: 3.00, available: true },
        ],
      },
    ],
    isComboEligible: true,
  },
  
  // Sandwiches
  {
    id: 'sandwich-club',
    name: 'Club Sandwich',
    category: 'Sandwiches',
    price: 9.50,
    description: 'Triple-decker with turkey, bacon, lettuce, tomato',
    available: true,
    modifiers: [
      {
        id: 'club-bread',
        name: 'Bread Choice',
        required: true,
        min: 1,
        max: 1,
        options: breadOptions,
      },
      {
        id: 'club-toppings',
        name: 'Toppings',
        required: false,
        min: 0,
        max: 6,
        options: toppingOptions,
      },
    ],
    isComboEligible: true,
  },
  {
    id: 'sandwich-grilled-cheese',
    name: 'Grilled Cheese',
    category: 'Sandwiches',
    price: 6.50,
    description: 'Classic grilled cheese sandwich',
    available: true,
    modifiers: [
      {
        id: 'grilled-bread',
        name: 'Bread Choice',
        required: true,
        min: 1,
        max: 1,
        options: breadOptions,
      },
      {
        id: 'grilled-cheese',
        name: 'Cheese Choice',
        required: true,
        min: 1,
        max: 2,
        options: cheeseOptions.filter(c => c.id !== 'cheese-none'),
      },
      {
        id: 'grilled-extras',
        name: 'Add-ons',
        required: false,
        min: 0,
        max: 2,
        options: [
          { id: 'add-bacon', name: 'Bacon', price: 1.50, available: true },
          { id: 'add-tomato', name: 'Tomato', price: 0.50, available: true },
          { id: 'add-ham', name: 'Ham', price: 1.00, available: true },
        ],
      },
    ],
    isComboEligible: true,
  },
  
  // Pastries & Desserts
  {
    id: 'pastry-muffin',
    name: 'Muffin',
    category: 'Pastries & Desserts',
    price: 3.50,
    description: 'Fresh baked muffin',
    available: true,
    modifiers: [
      {
        id: 'muffin-flavor',
        name: 'Flavor',
        required: true,
        min: 1,
        max: 1,
        options: [
          { id: 'muffin-blueberry', name: 'Blueberry', price: 0, available: true },
          { id: 'muffin-chocolate', name: 'Chocolate Chip', price: 0, available: true },
          { id: 'muffin-bran', name: 'Bran', price: 0, available: true },
          { id: 'muffin-banana', name: 'Banana Nut', price: 0, available: true },
        ],
      },
      {
        id: 'muffin-warm',
        name: 'Temperature',
        required: false,
        min: 0,
        max: 1,
        options: [
          { id: 'warm-yes', name: 'Warmed', price: 0, available: true },
        ],
      },
    ],
  },
  {
    id: 'pastry-cookie',
    name: 'Cookie',
    category: 'Pastries & Desserts',
    price: 2.50,
    description: 'Fresh baked cookie',
    available: true,
    modifiers: [
      {
        id: 'cookie-type',
        name: 'Type',
        required: true,
        min: 1,
        max: 1,
        options: [
          { id: 'cookie-chocolate', name: 'Chocolate Chip', price: 0, available: true },
          { id: 'cookie-sugar', name: 'Sugar', price: 0, available: true },
          { id: 'cookie-oatmeal', name: 'Oatmeal Raisin', price: 0, available: true },
          { id: 'cookie-peanut', name: 'Peanut Butter', price: 0, available: true },
        ],
      },
    ],
  },
  
  // Cold Drinks
  {
    id: 'drink-iced-coffee',
    name: 'Iced Coffee',
    category: 'Cold Drinks',
    price: 3.50,
    description: 'Cold brew coffee over ice',
    available: true,
    modifiers: [
      {
        id: 'iced-size',
        name: 'Size',
        required: true,
        min: 1,
        max: 1,
        options: sizeOptions,
      },
      {
        id: 'iced-milk',
        name: 'Milk',
        required: false,
        min: 0,
        max: 1,
        options: milkOptions,
      },
      {
        id: 'iced-syrup',
        name: 'Syrup',
        required: false,
        min: 0,
        max: 2,
        options: syrupOptions,
      },
    ],
    isComboEligible: true,
  },
  {
    id: 'drink-juice',
    name: 'Fresh Juice',
    category: 'Cold Drinks',
    price: 4.00,
    description: 'Fresh squeezed juice',
    available: true,
    modifiers: [
      {
        id: 'juice-type',
        name: 'Juice Type',
        required: true,
        min: 1,
        max: 1,
        options: [
          { id: 'juice-orange', name: 'Orange', price: 0, available: true },
          { id: 'juice-apple', name: 'Apple', price: 0, available: true },
          { id: 'juice-cranberry', name: 'Cranberry', price: 0, available: true },
        ],
      },
      {
        id: 'juice-size',
        name: 'Size',
        required: true,
        min: 1,
        max: 1,
        options: sizeOptions,
      },
    ],
    isComboEligible: true,
  },
];

// Combo meals
export const combos: Combo[] = [
  {
    id: 'combo-breakfast',
    name: 'Breakfast Combo',
    description: 'Any breakfast item with a coffee or juice',
    price: -1.50, // discount amount
    includes: ['Breakfast', 'Coffee & Espresso', 'Cold Drinks'],
    available: true,
  },
  {
    id: 'combo-lunch',
    name: 'Lunch Combo',
    description: 'Any sandwich with a drink',
    price: -2.00, // discount amount
    includes: ['Sandwiches', 'Coffee & Espresso', 'Cold Drinks'],
    available: true,
  },
];

// Helper functions
export function calculateItemPrice(item: OrderItem): number {
  let price = item.menuItem.price;
  
  // Add modifier prices
  item.selectedModifiers.forEach(modifier => {
    price += modifier.price;
  });
  
  // Apply combo discount if applicable
  if (item.combo) {
    price += item.combo.price; // combo price is negative for discounts
  }
  
  return price * item.quantity;
}

export function calculateOrderTotal(items: OrderItem[]): {
  subtotal: number;
  tax: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const tax = subtotal * 0.08; // 8% tax
  const total = subtotal + tax;
  
  return {
    subtotal: Math.round(subtotal * 100) / 100,
    tax: Math.round(tax * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

// Mock order storage
let currentOrder: Order | null = null;
let orderIdCounter = 1000;

export function createNewOrder(): Order {
  const orderId = `ORD-${orderIdCounter++}`;
  currentOrder = {
    id: orderId,
    items: [],
    status: 'pending',
    total: 0,
    tax: 0,
    grandTotal: 0,
    orderTime: new Date(),
  };
  return currentOrder;
}

export function getCurrentOrder(): Order | null {
  return currentOrder;
}

export function addItemToOrder(item: OrderItem): void {
  if (!currentOrder) {
    createNewOrder();
  }
  currentOrder!.items.push(item);
  updateOrderTotals();
}

export function updateOrderTotals(): void {
  if (!currentOrder) return;
  
  const totals = calculateOrderTotal(currentOrder.items);
  currentOrder.total = totals.subtotal;
  currentOrder.tax = totals.tax;
  currentOrder.grandTotal = totals.total;
}

export function confirmOrder(paymentMethod: 'card' | 'cash' | 'mobile', customerName?: string): Order {
  if (!currentOrder) {
    throw new Error('No current order to confirm');
  }
  
  currentOrder.status = 'confirmed';
  currentOrder.paymentMethod = paymentMethod;
  currentOrder.customerName = customerName;
  
  const confirmedOrder = { ...currentOrder };
  currentOrder = null; // Reset for next order
  
  return confirmedOrder;
}

export function getMenuItemById(id: string): MenuItem | undefined {
  return menuItems.find(item => item.id === id);
}

export function getMenuByCategory(category: string): MenuItem[] {
  return menuItems.filter(item => item.category === category);
}

export function getAllCategories(): string[] {
  return [...new Set(menuItems.map(item => item.category))];
}