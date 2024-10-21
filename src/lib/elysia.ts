import { Elysia } from "elysia";
import { validateSessionToken } from "$lib/session";

// Middleware for user and session
export const auth = new Elysia().derive({ as: "global" },
  async ({ request }) => {
    // Validate token from request
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token) return { user: null, session: null };
    return validateSessionToken(token);
  }
);
