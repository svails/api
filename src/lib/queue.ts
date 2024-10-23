import { db } from "$lib/database";
import { jobTable } from "$lib/schema";
import { eq, lte, sql, and, or } from "drizzle-orm";

// Start event loop
const workers = new Map();
setInterval(processJobs, 100);

export function addWorker<T>(type: string, fn: (job: T) => Promise<void>) {
  // Set worker for type
  workers.set(type, fn);
}

export async function addJob<T>(type: string, data: T, date?: Date) {
  // Add job to queue
  const job = { type, data: JSON.stringify(data), date: date || new Date(Date.now()) };
  await db.insert(jobTable).values(job);
}

// Pre-compile query for perfomance
const getJobs = db.select()
  .from(jobTable)
  .where(
    and(
      or(
        eq(jobTable.status, "pending"),
        eq(jobTable.status, "failed"),
      ),
      lte(jobTable.date, sql.placeholder("date"))
    )
  ).prepare();

export async function processJobs() {
  // Get jobs from queue
  const jobs = await getJobs.all({ date: Date.now() });
  if (jobs.length == 0)
    return;

  // @ts-ignore: Attach job to worker
  await db.batch(jobs.map((job) => db.update(jobTable).set({ status: "processing" }).where(eq(jobTable.id, job.id))));
  const tasks = jobs.map(async (job) => {
    const worker = workers.get(job.type);
    if (worker) {
      // Process job
      try {
        await worker(JSON.parse(job.data));
        return { id: job.id, status: "finished" };
      } catch (error) {
        console.error(error);
        return { id: job.id, status: "failed" };
      }
    }
  });

  // Wait for all jobs to finish
  const processedJobs = await Promise.all(tasks);
  const updateStatus = processedJobs
    .filter(job => job != undefined)
    .map(job => db.update(jobTable).set({ status: job.status }).where(eq(jobTable.id, job.id)));

  // @ts-ignore: Update status for all jobs
  await db.batch(updateStatus);
}
