import { z } from 'zod';
import { createEndpoint } from 'zite-integrations-backend-sdk';

// Change this to your desired password
const ACCESS_PASSWORD = 'stealth123';

export default createEndpoint({
  description: 'Checks if the provided password is correct',
  inputSchema: z.object({
    password: z.string(),
  }),
  outputSchema: z.object({
    success: z.boolean(),
  }),
  execute: async ({ input }) => {
    return { success: input.password === ACCESS_PASSWORD };
  },
});
