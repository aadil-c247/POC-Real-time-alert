export interface ProductEvent {
  productId: string;
  category: string;
  productType: string;
  sellerType: string;
  discountPercent: number;
  price: number;
  timestamp: number;
}