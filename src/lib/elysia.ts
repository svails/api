import { z } from "zod";
import { folder } from "$lib/files";
import { login, register } from "$lib/session";
import { Elysia, t } from "elysia";
import { staticPlugin } from "@elysiajs/static";
import swagger from "@elysiajs/swagger";

const userSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: "Password must be at least 8 characters long" }),
});

// Middleware with docs, auth, register and login
export const svails = (app: Elysia) => app
  .use(swagger({ path: "/docs" }))
  .use(staticPlugin({
    assets: folder,
    prefix: `/${folder.slice(0, -1)}`,
  }))
  .onError(({ code, redirect, error }) => {
    // Redirect to docs if not found
    if (code == "NOT_FOUND")
      return redirect("/docs");
    return { status: "error", message: error.message };
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
