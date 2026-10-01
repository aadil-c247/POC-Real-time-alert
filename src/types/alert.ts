export interface CreateAlertInput {
  userId: number;
  minimumDiscountPercent: number;
  categories: string[];
  productTypes: string[];
  sellerTypes: string[];
  isActive?: boolean;
}

export interface UpdateAlertInput {
  minimumDiscountPercent?: number;
  categories?: string[];
  productTypes?: string[];
  sellerTypes?: string[];
  isActive?: boolean;
}

export interface AlertConfig {
  id: number;
  userId: number;
  minimumDiscountPercent: number;
  categories: string[];
  productTypes: string[];
  sellerTypes: string[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}