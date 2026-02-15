import { z } from 'zod';

export const createSiteSchema = z.object({
  name: z
    .string()
    .min(1, 'Name is required')
    .max(255, 'Name must be 255 characters or less'),
  location: z
    .string()
    .min(1, 'Location is required')
    .max(255, 'Location must be 255 characters or less'),
  emission_limit: z
    .number()
    .positive('Emission limit must be a positive number')
    .finite('Emission limit must be a finite number'),
});

export type CreateSiteDto = z.infer<typeof createSiteSchema>;

