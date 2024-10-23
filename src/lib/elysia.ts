import { z } from "zod";
import { Elysia, t } from "elysia";
import { login, register, validateSessionToken } from "$lib/session";
import swagger from "@elysiajs/swagger";

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

// Middleware with docs, auth, register and login
export const svails = (app: Elysia) => app
  .use(swagger())
  .onError(({ code, redirect, error }) => {
    if (code == "NOT_FOUND")
      return redirect("/swagger");
    return { status: "error", message: error.message };
  })
  .derive({ as: "global" }, async ({ request }) => {
    // Validate token from request
    const token = request.headers.get("Authorization")?.split(" ")[1];
    if (!token)
      return { user: null, session: null };
    return validateSessionToken(token);
  })
  .post("/register", async ({ body: { email, password } }) => {
    // Validate user input
    const validation = userSchema.safeParse({ email, password });
    if (!validation.success) {
      const error = validation.error.errors[0];
      throw new Error(error.message);
    }

    // Register user
    await register(email, password);
    const { token } = await login(email, password);
    return { token };
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    response: t.Object({
      token: t.String(),
    }),
  })
  .post("/login", async ({ body: { email, password } }) => {
    // Validate user input
    const validation = userSchema.safeParse({ email, password });
    if (!validation.success) {
      const error = validation.error.errors[0];
      throw new Error(error.message);
    }

    // Login user
    const { token } = await login(email, password);
    return { token };
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    response: t.Object({
      token: t.String(),
    }),
  });
