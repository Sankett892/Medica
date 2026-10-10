import { createClerkClient } from '@clerk/backend';
import { config } from './env.js';

export const clerkClient = (config.CLERK_SECRET_KEY && config.CLERK_SECRET_KEY !== 'sk_test_placeholder')
  ? createClerkClient({ secretKey: config.CLERK_SECRET_KEY })
  : null;
