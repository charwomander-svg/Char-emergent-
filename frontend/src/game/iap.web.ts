export interface Product {
  id?: string;
  productId?: string;
  displayPrice?: string;
}

export interface Purchase {
  productId?: string | null;
  productIds?: string[] | null;
  purchaseToken?: string | null;
  transactionId?: string | null;
  orderId?: string | null;
  transactionDate?: number | string | null;
  purchaseState?: "pending" | "purchased" | "unknown" | null;
  quantity?: number | null;
}

export interface PurchaseError {
  code?: string;
  message?: string;
}

export const ErrorCode = {
  UserCancelled: "E_USER_CANCELLED",
} as const;

type Subscription = { remove(): void };

export async function initConnection() {
  return false;
}

export async function endConnection() {
  return undefined;
}

export async function fetchProducts() {
  return [] as Product[];
}

export async function requestPurchase() {
  throw new Error("In-app purchases are not available on web.");
}

export async function finishTransaction() {
  return undefined;
}

export function purchaseErrorListener(_listener: (error: PurchaseError) => void): Subscription {
  return { remove() {} };
}

export function purchaseUpdatedListener(_listener: (purchase: Purchase) => void): Subscription {
  return { remove() {} };
}
