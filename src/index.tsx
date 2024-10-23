import { Elysia } from "elysia";
import { Html } from "@elysiajs/html";
import { svails } from "$lib/elysia";
import { sendMail } from "$lib/mailer";
import { addJob, addWorker } from "$lib/queue";

// Worker to process jobs
type Mail = { uuid: string };
addWorker<Mail>("mail", ({ uuid }) => sendMail({
  to: "oddharald@autoblikk.no",
  subject: "New UUID",
  html: <p>{uuid}</p>,
}));

// Business logic starts here
const app = new Elysia()
  .use(svails)
  .get("/mail", () => addJob<Mail>("mail", {
    uuid: crypto.randomUUID()
  }))
  .listen(3000);

console.log(`🌐 http://${app.server?.hostname}:${app.server?.port}`);
