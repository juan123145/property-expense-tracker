import { db } from "@/db";
import { properties, propertyMemberships, users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/admin/set-property-owner
 *
 * Sets a user as the OWNER of a property
 *
 * Body:
 * {
 *   "propertyName": "Lynn",
 *   "userEmail": "fuegourbano809@gmail.com"
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { propertyName, userEmail } = body;

    if (!propertyName || !userEmail) {
      return Response.json(
        { error: "propertyName and userEmail are required" },
        { status: 400 }
      );
    }

    console.log(`\n🔧 Setting up ownership...\n`);
    console.log(`Property: ${propertyName}`);
    console.log(`User Email: ${userEmail}\n`);

    // Step 1: Find property
    console.log(`📍 Finding property "${propertyName}"...`);
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.name, propertyName));

    if (!property) {
      return Response.json(
        { error: `Property "${propertyName}" not found` },
        { status: 404 }
      );
    }
    console.log(`✅ Found property: ${property.id}`);

    // Step 2: Find user
    console.log(`\n👤 Finding user "${userEmail}"...`);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail));

    if (!user) {
      return Response.json(
        { error: `User "${userEmail}" not found` },
        { status: 404 }
      );
    }
    console.log(`✅ Found user: ${user.id}`);

    // Step 3: Update property owner info
    console.log(`\n🔐 Updating property owner info...`);
    await db
      .update(properties)
      .set({
        userId: user.id,
        ownerId: user.id,
      })
      .where(eq(properties.id, property.id));
    console.log(`✅ Property owner info updated`);

    // Step 4: Create/update membership record
    console.log(`\n👥 Setting membership to OWNER...`);
    await db
      .insert(propertyMemberships)
      .values({
        propertyId: property.id,
        userId: user.id,
        role: "OWNER",
        status: "ACTIVE",
        canShare: true,
        acceptedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [propertyMemberships.propertyId, propertyMemberships.userId],
        set: {
          role: "OWNER",
          status: "ACTIVE",
          canShare: true,
          acceptedAt: new Date(),
        },
      });
    console.log(`✅ Membership set to OWNER`);

    // Step 5: Verify
    console.log(`\n✔️ Verifying...`);
    const [verification] = await db
      .select({
        propertyName: properties.name,
        userEmail: users.email,
        role: propertyMemberships.role,
        status: propertyMemberships.status,
        canShare: propertyMemberships.canShare,
      })
      .from(properties)
      .innerJoin(users, eq(properties.userId, users.id))
      .innerJoin(propertyMemberships, eq(propertyMemberships.propertyId, properties.id))
      .where(eq(properties.id, property.id));

    if (!verification || verification.role !== "OWNER") {
      console.error(`❌ Verification failed`);
      return Response.json(
        { error: "Verification failed - ownership not set correctly" },
        { status: 500 }
      );
    }

    const message = `✅ SUCCESS! ${userEmail} is now the OWNER of "${propertyName}"`;
    console.log(`\n${message}\n`);

    return Response.json({
      success: true,
      message,
      property: {
        name: verification.propertyName,
        owner: verification.userEmail,
        role: verification.role,
        status: verification.status,
        canShare: verification.canShare,
      },
    });
  } catch (err) {
    console.error("❌ Error:", err);
    return Response.json(
      {
        error: err instanceof Error ? err.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
