import { db } from "$lib/database";
import { eq } from "drizzle-orm";
import { jobTable, type Job as DbJob } from "$lib/schema";

// Types
type Job<T> = Omit<DbJob, "data"> & { data: T };
type Fn<T> = (data: Job<T>) => Promise<void>;

// Workers
export const workers = new Map<string, Fn<any>>();

export async function addJob<T>(type: string, data: T) {
  // Add job to queue
  const job = { type, data: JSON.stringify(data) };
  await db.insert(jobTable).values(job);
}

export async function setWorker<T>(type: string, fn: Fn<T>) {
  // Set worker for type
  workers.set(type, fn);
}

export async function processJobs() {
  // Get jobs from queue
  const jobs = await db.select().from(jobTable).where(eq(jobTable.status, "pending"));
  if (jobs.length == 0) return;

  // Start processing jobs
  const tasks = jobs.map(async (job) => {
    const worker = workers.get(job.type);
    if (worker) {
      // Process job and update status accordingly
      const jobId = await db.transaction(async (tx) => {
        await tx.update(jobTable).set({ status: "processing" }).where(eq(jobTable.id, job.id));
        try {
          await worker(JSON.parse(job.data));
          await tx.update(jobTable).set({ status: "finished" }).where(eq(jobTable.id, job.id));
          return job.id;
        } catch (error) {
          console.error(error);
          await tx.update(jobTable).set({ status: "failed" }).where(eq(jobTable.id, job.id));
        }
      });
      return jobId;
    }
  });

  // Wait for all jobs to finish
  const processedJobs = await Promise.all(tasks);
  return {
    finished: processedJobs.filter(job => job != undefined),
    failed: processedJobs.filter(job => job == undefined)
  };
}
