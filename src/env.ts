import { z } from "zod";

const schema = z.object({


  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),

  ACCESS_TOKEN_TTL_MIN: z.coerce.number().default(1440),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().default(30),

  BOOTSTRAP_KEY: z.string().min(8),
  SUPERADMIN_EMAIL: z.string().email().optional(),
  SUPERADMIN_PASSWORD: z.string().optional(),
  SUPERADMIN_NAME: z.string().optional(),

  NEXT_PUBLIC_BASE_URL: z.string().optional(),
  NEXT_PUBLIC_ADSENSE_PUBLISHER_ID: z.string().optional(),
  SERPAPI_API_KEY: z.string().optional()
});

export const env = schema.parse(process.env);
