import { z } from "zod";
import { Elysia, t } from "elysia";
import { auth } from "$lib/elysia";
import { login, register } from "$lib/session";
import { swagger } from "@elysiajs/swagger";

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

const app = new Elysia()
  .use(auth)
  .use(swagger())
  .onError(({ code, redirect, error }) => {
    if (code == "NOT_FOUND") {
      return redirect("/swagger");
    } else {
      return {
        status: "error",
        message: error.message,
      };
    }
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
    return login(email, password);
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
    return login(email, password);
  }, {
    body: t.Object({
      email: t.String(),
      password: t.String(),
    }),
    response: t.Object({
      token: t.String(),
    }),
  })
  .listen(process.env.PORT ?? 3000);

console.log(`🌐 API running at http://${app.server?.hostname}:${app.server?.port}`);
