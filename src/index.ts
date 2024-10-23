import { Elysia } from "elysia";
import { svails } from "$lib/elysia";
import { addJob, addWorker } from "$lib/queue";
import { sendMail } from "$lib/mailer";

// Worker to process logs
type Mail = { uuid: string };
addWorker<Mail>("mail", async (job) => sendMail({
  to: "oddharald@autoblikk.no",
  subject: "New UUID",
  html: `<h1>${job.uuid}</h1>`,
}));

const app = new Elysia()
  .use(svails)
  .get("/mail", async () => addJob<Mail>("mail", { uuid: crypto.randomUUID() }))
  .listen(3000);

console.log(`🌐 http://${app.server?.hostname}:${app.server?.port}`);
