import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db";
import { properties, propertyMemberships } from "@/db/schema";
import { eq, and, or } from "drizzle-orm";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { NodeHttpHandler } from "@smithy/node-http-handler";
import { Agent } from "https";

const r2 = new S3Client({
  region: "auto",
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
  requestHandler: new NodeHttpHandler({
    httpsAgent: new Agent({ rejectUnauthorized: false }),
  }),
});

type Params = { path: string[] };

export async function GET(req: NextRequest, { params }: { params: Promise<Params> }) {
  const session = await auth();
  if (!session?.user?.id) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { path } = await params;
  const key = path.join("/");

  const userId = session.user.id;

  // Receipt access: user must own the receipt
  const isUserReceipt = key.startsWith(`receipts/${userId}/`);

  // Property image access: user must own the property OR be an active member
  let isPropertyImage = false;
  if (key.startsWith(`properties/`)) {
    const parts = key.split("/");
    const propertyOwnerId = parts[1];

    if (propertyOwnerId === userId) {
      // User owns the property
      isPropertyImage = true;
    } else {
      // Check if user is a member of any property that owns this image
      const [membershipMatch] = await db
        .select({ id: propertyMemberships.id })
        .from(properties)
        .innerJoin(propertyMemberships, eq(properties.id, propertyMemberships.propertyId))
        .where(and(
          or(eq(properties.userId, propertyOwnerId), eq(properties.ownerId, propertyOwnerId)),
          eq(propertyMemberships.userId, userId),
          eq(propertyMemberships.status, "ACTIVE")
        ))
        .limit(1);

      if (membershipMatch) {
        isPropertyImage = true;
      }
    }
  }

  const allowed = isUserReceipt || isPropertyImage;
  if (!allowed) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const res = await r2.send(new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME!,
      Key: key,
    }));

    if (!res.Body) return new NextResponse("Not found", { status: 404 });

    const headers = new Headers();
    if (res.ContentType) headers.set("Content-Type", res.ContentType);
    if (res.ContentLength) headers.set("Content-Length", String(res.ContentLength));

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse((res.Body as any).transformToWebStream(), { headers });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
