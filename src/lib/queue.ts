import { db } from "$lib/database";
import { eq, lte, sql, and } from "drizzle-orm";
import { jobTable, type Job as DbJob } from "$lib/schema";

// Types
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type Job<T> = Expand<Omit<DbJob, "data"> & { data: T }>;
type Fn<T> = (data: Job<T>) => Promise<void>;

// Workers
const workers = new Map<string, Fn<any>>();

export async function addJob<T>(type: string, data: T, date?: Date): Promise<void> {
  // Add job to queue
  const job = { type, data: JSON.stringify(data), date: date || new Date(Date.now()) };
  await db.insert(jobTable).values(job);
}

export function setWorker<T>(type: string, fn: Fn<T>) {
  // Set worker for type
  workers.set(type, fn);
}

// Pre-compile queries
const getJobs = db.select()
  .from(jobTable)
  .where(
    and(
      eq(jobTable.status, "pending"),
      lte(jobTable.date, sql.placeholder("date"))
    )
  ).prepare();

export async function processJobs() {
  // Get jobs from queue
  const date = Math.floor(Date.now() / 1000);
  const jobs = await getJobs.all({ date });
  if (jobs.length == 0) return;

  // Attach job to worker
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
    .filter((job) => job != undefined)
    .map((job) => db.update(jobTable).set({ status: job.status }).where(eq(jobTable.id, job.id)));
  await db.batch(updateStatus);
}
