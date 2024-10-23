import { Elysia } from "elysia";
import { svails } from "$lib/elysia";
import { addJob, addWorker } from "$lib/queue";

// Worker to process logs
addWorker("log", async (job) => console.log(job));

const app = new Elysia()
  .use(svails)
  .get("/job", async () => addJob("log", { name: crypto.randomUUID() }))
  .listen(3000);

console.log(`🌐 http://${app.server?.hostname}:${app.server?.port}`);
