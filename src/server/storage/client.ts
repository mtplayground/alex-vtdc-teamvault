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

function requireStorageConfig() {
  if (
    !config.storage.enabled ||
    !config.storage.endpoint ||
    !config.storage.region ||
    !config.storage.bucket ||
    !config.storage.accessKeyId ||
    !config.storage.secretAccessKey
  ) {
    throw new Error("Object storage is not configured for this deployment.");
  }

  return {
    endpoint: config.storage.endpoint,
    region: config.storage.region,
    bucket: config.storage.bucket,
    accessKeyId: config.storage.accessKeyId,
    secretAccessKey: config.storage.secretAccessKey,
    forcePathStyle: config.storage.forcePathStyle,
  };
}

let cachedClient: S3Client | null = null;

function getStorageClient(): S3Client {
  const storageConfig = requireStorageConfig();
  cachedClient ??= new S3Client({
    endpoint: storageConfig.endpoint,
    region: storageConfig.region,
    forcePathStyle: storageConfig.forcePathStyle,
    requestChecksumCalculation: "WHEN_REQUIRED",
    credentials: {
      accessKeyId: storageConfig.accessKeyId,
      secretAccessKey: storageConfig.secretAccessKey,
    },
  });
  return cachedClient;
}

function getStorageBucket(): string {
  return requireStorageConfig().bucket;
}

export async function assertStorageConfigured(): Promise<void> {
  await getStorageClient().send(new HeadBucketCommand({ Bucket: getStorageBucket() }));
}

export async function putObject(input: Omit<PutObjectCommandInput, "Bucket">): Promise<void> {
  await getStorageClient().send(new PutObjectCommand({ ...input, Bucket: getStorageBucket() }));
}

export async function deleteObject(key: string): Promise<void> {
  await getStorageClient().send(new DeleteObjectCommand({ Bucket: getStorageBucket(), Key: key }));
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
    getStorageClient(),
    new GetObjectCommand({
      Bucket: getStorageBucket(),
      Key: key,
      ResponseContentDisposition: options.contentDisposition,
      ResponseContentType: options.contentType,
    }),
    {
      expiresIn: options.expiresInSeconds ?? 300,
    },
  );
}
