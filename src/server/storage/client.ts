import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
  type PutObjectCommandInput,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { config } from "../config";

export const storageClient = new S3Client({
  endpoint: config.storage.endpoint,
  region: config.storage.region,
  forcePathStyle: config.storage.forcePathStyle,
  credentials: {
    accessKeyId: config.storage.accessKeyId,
    secretAccessKey: config.storage.secretAccessKey,
  },
});

export const storageBucket = config.storage.bucket;

export async function assertStorageConfigured(): Promise<void> {
  await storageClient.send(new HeadBucketCommand({ Bucket: storageBucket }));
}

export async function putObject(input: Omit<PutObjectCommandInput, "Bucket">): Promise<void> {
  await storageClient.send(new PutObjectCommand({ ...input, Bucket: storageBucket }));
}

export async function deleteObject(key: string): Promise<void> {
  await storageClient.send(new DeleteObjectCommand({ Bucket: storageBucket, Key: key }));
}

export async function getReadUrl(
  key: string,
  options: {
    expiresInSeconds?: number;
    contentDisposition?: string;
    contentType?: string;
  } = {},
): Promise<string> {
  return getSignedUrl(
    storageClient,
    new GetObjectCommand({
      Bucket: storageBucket,
      Key: key,
      ResponseContentDisposition: options.contentDisposition,
      ResponseContentType: options.contentType,
    }),
    {
      expiresIn: options.expiresInSeconds ?? 300,
    },
  );
}
