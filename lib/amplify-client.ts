import "@/lib/amplify-config";

import { generateClient } from "aws-amplify/data";

import type { Schema } from "@/amplify/data/resource";

/**
 * Uses Cognito User Pool credentials and is intended for authenticated
 * application and administration requests.
 */
export const amplifyClient = generateClient<Schema>();

/**
 * Uses the Cognito Identity Pool guest role for public catalogue requests.
 *
 * The corresponding models must explicitly grant `allow.guest().to(["read"])`
 * in `amplify/data/resource.ts`.
 */
export const publicAmplifyClient = generateClient<Schema>({
  authMode: "identityPool",
});
