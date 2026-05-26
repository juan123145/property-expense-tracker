import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function fixOwner() {
  const client = await pool.connect();
  try {
    console.log('\n🔧 Setting up ownership...\n');
    console.log('Property: Lynn');
    console.log('User Email: fuegourbano809@gmail.com\n');

    // Step 1: Find property
    console.log('📍 Finding property "Lynn"...');
    const propResult = await client.query(
      'SELECT id FROM properties WHERE name = $1',
      ['Lynn']
    );
    
    if (propResult.rows.length === 0) {
      console.error('❌ Property "Lynn" not found');
      process.exit(1);
    }
    
    const propertyId = propResult.rows[0].id;
    console.log(`✅ Found property: ${propertyId}`);

    // Step 2: Find user
    console.log('\n👤 Finding user "fuegourbano809@gmail.com"...');
    const userResult = await client.query(
      'SELECT id FROM users WHERE email = $1',
      ['fuegourbano809@gmail.com']
    );
    
    if (userResult.rows.length === 0) {
      console.error('❌ User "fuegourbano809@gmail.com" not found');
      process.exit(1);
    }
    
    const userId = userResult.rows[0].id;
    console.log(`✅ Found user: ${userId}`);

    // Step 3: Update property owner info
    console.log('\n🔐 Updating property owner info...');
    await client.query(
      'UPDATE properties SET user_id = $1, owner_id = $2 WHERE id = $3',
      [userId, userId, propertyId]
    );
    console.log('✅ Property owner info updated');

    // Step 4: Create/update membership record
    console.log('\n👥 Setting membership to OWNER...');
    await client.query(
      `INSERT INTO property_memberships (property_id, user_id, role, status, can_share, accepted_at, created_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
       ON CONFLICT (property_id, user_id) 
       DO UPDATE SET role = $3, status = $4, can_share = $5, accepted_at = NOW()`,
      [propertyId, userId, 'OWNER', 'ACTIVE', true]
    );
    console.log('✅ Membership set to OWNER');

    // Step 5: Verify
    console.log('\n✔️ Verifying...');
    const verifyResult = await client.query(
      `SELECT p.name, u.email, pm.role, pm.status, pm.can_share
       FROM properties p
       LEFT JOIN users u ON p.user_id = u.id
       LEFT JOIN property_memberships pm ON p.id = pm.property_id AND pm.user_id = u.id
       WHERE p.id = $1`,
      [propertyId]
    );

    if (verifyResult.rows.length > 0) {
      const row = verifyResult.rows[0];
      if (row.role === 'OWNER') {
        console.log('\n✅ SUCCESS! Ownership set correctly:\n');
        console.log(`   Property: ${row.name}`);
        console.log(`   Owner: ${row.email}`);
        console.log(`   Role: ${row.role}`);
        console.log(`   Status: ${row.status}`);
        console.log(`   Can Share: ${row.can_share}`);
        console.log(`\n✅ fuegourbano809@gmail.com is now the OWNER of "Lynn"\n`);
        process.exit(0);
      }
    }
    
    console.error('\n❌ Verification failed');
    process.exit(1);

  } catch (err) {
    console.error('\n❌ Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    pool.end();
  }
}

fixOwner();
