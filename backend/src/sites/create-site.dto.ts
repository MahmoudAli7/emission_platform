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
  latitude: z
    .number()
    .min(-90, 'Latitude must be between -90 and 90')
    .max(90, 'Latitude must be between -90 and 90')
    .optional()
    .nullable(),
  longitude: z
    .number()
    .min(-180, 'Longitude must be between -180 and 180')
    .max(180, 'Longitude must be between -180 and 180')
    .optional()
    .nullable(),
});

export type CreateSiteDto = z.infer<typeof createSiteSchema>;

