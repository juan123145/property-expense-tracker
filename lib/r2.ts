import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent } from "https";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  // Corporate SSL inspection proxies replace the certificate chain on outbound HTTPS.
  // This disables verification only for the R2 client so uploads work on this network.
  requestHandler: new NodeHttpHandler({
    httpsAgent: new Agent({ rejectUnauthorized: false }),
  }),
});

export async function uploadToR2(
  key: string,
  body: Uint8Array,
  contentType: string
): Promise<string> {
  await r2.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );
  return `/api/file/${key}`;
}

export async function getFromR2(key: string): Promise<Buffer | null> {
  try {
    const res = await r2.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }));
    if (!res.Body) return null;
    const chunks: Uint8Array[] = [];
    for await (const chunk of res.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  } catch {
    return null;
  }
}

export async function deleteFromR2(urlOrKey: string): Promise<void> {
  let key: string;
  if (urlOrKey.startsWith("/api/file/")) {
    key = urlOrKey.slice("/api/file/".length);
  } else if (urlOrKey.startsWith("http")) {
    const publicBase = (process.env.R2_PUBLIC_URL ?? "").replace(/\/$/, "");
    key = publicBase ? urlOrKey.replace(publicBase + "/", "") : urlOrKey;
  } else if (urlOrKey.startsWith("/receipts/")) {
    key = urlOrKey.slice(1);
  } else if (urlOrKey.startsWith("undefined/")) {
    key = urlOrKey.replace("undefined/", "");
  } else {
    key = urlOrKey;
  }

  try {
    await r2.send(
      new DeleteObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: key,
      })
    );
  } catch (err) {
    console.error("[R2] deleteFromR2 failed for key:", key, err);
    throw err;
  }
}
