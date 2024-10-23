import fs from "fs/promises";
import { DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

// S3
const useS3 = process.env.AWS_ACCESS_KEY_ID && process.env.AWS_ENDPOINT_URL_S3 && process.env.AWS_SECRET_ACCESS_KEY && process.env.BUCKET_NAME && process.env.AWS_REGION;
const client = useS3 ? new S3Client({ region: process.env.AWS_REGION, endpoint: process.env.AWS_ENDPOINT_URL_S3 }) : undefined;

// Create folder for local files
export const folder = "files/";
await fs.mkdir(folder, { recursive: true });

export function urlFor(path: string): string {
  return "/" + folder + path;
}

export async function upload(path: string, data: File) {
  if (client) {
    await client.send(new PutObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: path,
      Body: data
    }));
  } else {
    await Bun.write(folder + path, data);
  }
}

export async function download(path: string): Promise<ReadableStream | Blob | undefined> {
  if (client) {
    const data = await client.send(new GetObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: path,
    }));
    if (data.Body)
      return data.Body.transformToWebStream();
  } else {
    return Bun.file(folder + path);
  }
}

export async function remove(path: string) {
  if (client) {
    await client.send(new DeleteObjectCommand({
      Bucket: process.env.BUCKET_NAME,
      Key: path,
    }));
  } else {
    await fs.unlink(folder + path);
  }
}

export async function exists(path: string): Promise<boolean> {
  if (client) {
    try {
      await client.send(new HeadObjectCommand({
        Bucket: process.env.BUCKET_NAME,
        Key: path,
      }));
      return true;
    } catch (_) {
      return false;
    }
  } else {
    return fs.exists(folder + path);
  }
}

export async function list(path: string = "."): Promise<string[] | undefined> {
  if (client) {
    const data = await client.send(new ListObjectsV2Command({
      Bucket: process.env.BUCKET_NAME,
      Prefix: path,
    }));
    if (data.Contents)
      return data.Contents.flatMap(item => (item.Key ? [item.Key] : []));
  } else {
    return fs.readdir(folder + path);
  }
}
