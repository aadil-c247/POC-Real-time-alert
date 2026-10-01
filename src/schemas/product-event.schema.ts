import { z } from "zod";

export const productEventSchema = z.object({
  productId: z.string().min(1),

  category: z.string().min(1),

  productType: z.string().min(1),

  sellerType: z.string().min(1),

  discountPercent: z
    .number()
    .min(0)
    .max(100),

  price: z
    .number()
    .nonnegative(),

  timestamp: z
    .number()
    .int()
    .positive()
});