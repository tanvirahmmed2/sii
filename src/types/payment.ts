export type TenantPaymentGatewayCode =
  | 'bkash'
  | 'nagad'
  | 'rocket'
  | 'upay'
  | 'sslcommerz'
  | 'shurjopay'
  | 'aamarpay'
  | 'uddokapay';

export interface TenantPaymentConfig {
  id: string;
  website_id: string;
  gateway_code: TenantPaymentGatewayCode;
  is_enabled: boolean;
  environment: 'sandbox' | 'production';
  encrypted_credentials: string;
  created_at: string;
  updated_at: string;
}

export interface PaymentInitiationRequest {
  websiteId: string;
  amount: number;
  currency: 'BDT' | 'USD';
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  callbackUrl: string;
  cancelUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface PaymentInitiationResponse {
  success: boolean;
  redirectUrl?: string;
  gatewayTransactionId?: string;
  paymentUrl?: string;
  error?: string;
  rawResponse?: Record<string, unknown>;
}

export interface PaymentVerificationRequest {
  websiteId: string;
  gatewayTransactionId: string;
  paymentRef?: string;
  additionalParams?: Record<string, string>;
}

export interface PaymentVerificationResponse {
  success: boolean;
  isPaid: boolean;
  transactionId: string;
  amount: number;
  currency: string;
  paidAt?: string;
  paymentMethod?: string;
  status: 'COMPLETED' | 'PENDING' | 'FAILED' | 'CANCELLED';
  rawResponse?: Record<string, unknown>;
  error?: string;
}
