import { Elysia } from "elysia";
import { Html } from "@elysiajs/html";
import { svails } from "$lib/elysia";

// Business logic
const app = new Elysia()
  .use(svails)
  .get("/", () => <h1>Svails!</h1>)
  .listen(3000);

console.log(`🌐 http://${app.server?.hostname}:${app.server?.port}`);
