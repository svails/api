import { Elysia } from "elysia";
import { svails } from "$lib/elysia";

// Business logic
const app = new Elysia()
  .use(svails)
  .listen(3000);

console.log(`🌐 http://${app.server?.hostname}:${app.server?.port}`);
