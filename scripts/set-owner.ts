import { db } from "../db/index";
import { properties, propertyMemberships, users } from "../db/schema";
import { eq } from "drizzle-orm";

/**
 * Set a user as OWNER of a property
 * Usage: npx ts-node scripts/set-owner.ts <propertyName> <userEmail>
 * Example: npx ts-node scripts/set-owner.ts "Lynn" "fuegourbano809@gmail.com"
 */
async function setOwner(propertyName: string, userEmail: string) {
  try {
    console.log(`\n🔧 Setting up ownership...\n`);
    console.log(`Property: ${propertyName}`);
    console.log(`User Email: ${userEmail}\n`);

    // Step 1: Find the property
    console.log(`📍 Finding property "${propertyName}"...`);
    const [property] = await db
      .select()
      .from(properties)
      .where(eq(properties.name, propertyName));

    if (!property) {
      console.error(`❌ Property "${propertyName}" not found`);
      process.exit(1);
    }
    console.log(`✅ Found property: ${property.id}`);

    // Step 2: Find the user
    console.log(`\n👤 Finding user "${userEmail}"...`);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, userEmail));

    if (!user) {
      console.error(`❌ User "${userEmail}" not found`);
      process.exit(1);
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

    if (verification && verification.role === "OWNER") {
      console.log(`\n✅ SUCCESS! Ownership set correctly:\n`);
      console.log(`   Property: ${verification.propertyName}`);
      console.log(`   Owner: ${verification.userEmail}`);
      console.log(`   Role: ${verification.role}`);
      console.log(`   Status: ${verification.status}`);
      console.log(`   Can Share: ${verification.canShare}`);
      console.log(`\n✅ ${userEmail} is now the OWNER of "${propertyName}"\n`);
      process.exit(0);
    } else {
      console.error(`\n❌ Verification failed - role is ${verification?.role}`);
      process.exit(1);
    }
  } catch (err) {
    console.error(`\n❌ Error:`, err instanceof Error ? err.message : String(err));
    process.exit(1);
  }
}

// Get command line arguments
const propertyName = process.argv[2];
const userEmail = process.argv[3];

if (!propertyName || !userEmail) {
  console.log(`\n📖 Usage: npx ts-node scripts/set-owner.ts <propertyName> <userEmail>`);
  console.log(`\n📝 Example: npx ts-node scripts/set-owner.ts "Lynn" "fuegourbano809@gmail.com"\n`);
  process.exit(1);
}

setOwner(propertyName, userEmail);
