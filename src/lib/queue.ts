import { db } from "$lib/database";
import { eq, gte, sql, and } from "drizzle-orm";
import { jobTable, type Job as DbJob } from "$lib/schema";

// Types
type Job<T> = Omit<DbJob, "data"> & { data: T };
type Fn<T> = (data: Job<T>) => Promise<void>;

// Workers
export const workers = new Map<string, Fn<any>>();

export async function addJob<T>(type: string, data: T): Promise<number> {
  // Add job to queue
  const job = { type, data: JSON.stringify(data) };
  const jobs = await db.insert(jobTable).values(job).returning({ id: jobTable.id });
  return jobs[0].id;
}

export function setWorker<T>(type: string, fn: Fn<T>) {
  // Set worker for type
  workers.set(type, fn);
}

export async function processJobs() {
  // Get jobs from queue
  const jobs = await db.select()
    .from(jobTable)
    .where(
      and(
        eq(jobTable.status, "pending"),
        gte(jobTable.date, sql`(cast(strftime('%s','now') as int))`)
      )
    );
  if (jobs.length == 0) return;

  // Set status to processing
  const setProcessing = jobs.map((job) => db.update(jobTable).set({ status: "processing" }).where(eq(jobTable.id, job.id)));
  await db.batch(setProcessing);

  // Attach job to worker
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
    .filter((job) => job != undefined)
    .map((job) => db.update(jobTable).set({ status: job.status }).where(eq(jobTable.id, job.id)));
  await db.batch(updateStatus);
}
