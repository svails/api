import { db } from "$lib/database";
import { eq, lte, sql, and } from "drizzle-orm";
import { jobTable, type Job as DbJob } from "$lib/schema";

// Types
type Expand<T> = T extends infer O ? { [K in keyof O]: O[K] } : never;
type Job<T> = Expand<Omit<DbJob, "data"> & { data: T }>;
type Fn<T> = (data: Job<T>) => Promise<void>;
type Delay = {
  milliseconds?: number;
  seconds?: number;
  minutes?: number;
  hours?: number;
  days?: number;
  months?: number;
  years?: number;
};
type Config = {
  delay: Delay;
};

// Dates helper
function calculateDate(dateOrConfig: Date | Config): Date {
  if (dateOrConfig instanceof Date) {
    // Schedule for that date
    return dateOrConfig;
  } else {
    // Schedule for later
    const now = new Date();
    const delay = dateOrConfig.delay;
    return new Date(
      now.getFullYear() + (delay.years || 0),
      now.getMonth() + (delay.months || 0),
      now.getDate() + (delay.days || 0),
      now.getHours() + (delay.hours || 0),
      now.getMinutes() + (delay.minutes || 0),
      now.getSeconds() + (delay.seconds || 0),
      now.getMilliseconds() + (delay.milliseconds || 0),
    );
  }
}

// Workers
const workers = new Map<string, Fn<any>>();

// Add jobs in batches from memory
var jobsBatch = new Array();
setInterval(async () => {
  if (jobsBatch.length > 0) {
    await db.batch(jobsBatch);
    jobsBatch.length = 0;
  }
}, 10);

export async function addJob<T>(type: string, data: T, dateOrConfig?: Date | Config): Promise<void> {
  // Add job to queue
  const date = dateOrConfig ? calculateDate(dateOrConfig) : new Date(Date.now());
  const job = { type, data: JSON.stringify(data), date };
  jobsBatch.push(db.insert(jobTable).values(job));
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
  const jobs = await getJobs.all({ date: Date.now() });
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
