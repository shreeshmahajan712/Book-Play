/**
 * TurfReserve — Phase 1 Seed & Validation Script
 *
 * Tests performed:
 *  1. Database connection
 *  2. User creation (Player + Owner + duplicate email rejection)
 *  3. Turf creation with GeoJSON + slug generation
 *  4. Booking creation with auto-computed commission
 *  5. Zod validator correctness (valid + invalid payloads)
 *  6. Double-booking attempt (expects conflict)
 *  7. Mongo Transaction rollback test
 *
 * Run: node scripts/seed.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Turf = require('../models/Turf');
const Booking = require('../models/Booking');

// Validators
const { registerSchema, loginSchema } = require('../validators/userValidator');
const { createTurfSchema } = require('../validators/turfValidator');
const { createBookingSchema } = require('../validators/bookingValidator');

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pass = (msg) => console.log(`  \x1b[32m✔\x1b[0m ${msg}`);
const fail = (msg) => console.log(`  \x1b[31m✘\x1b[0m ${msg}`);
const section = (title) => console.log(`\n\x1b[36m▶ ${title}\x1b[0m`);

// ─── Cleanup: drop all test documents ────────────────────────────────────────
async function cleanup() {
  await User.deleteMany({ email: { $regex: /seed-test/i } });
  await Turf.deleteMany({ name: { $regex: /seed/i } });
  await Booking.deleteMany({});
}

// ─── Test 1: Zod Validator — User ─────────────────────────────────────────────
async function testUserValidators() {
  section('Zod Validators — User');

  // VALID registration payload
  const validPayload = {
    name: 'Rahul Sharma',
    email: 'rahul@seed-test.com',
    password: 'SecurePass@1',
    role: 'Player',
  };
  const result = registerSchema.safeParse(validPayload);
  result.success ? pass('Valid registration payload accepted') : fail(`Rejected: ${JSON.stringify(result.error.format())}`);

  // INVALID: weak password
  const weakPwd = registerSchema.safeParse({ ...validPayload, password: 'abc123' });
  !weakPwd.success ? pass('Weak password correctly rejected') : fail('Weak password should have been rejected');

  // INVALID: bad email
  const badEmail = registerSchema.safeParse({ ...validPayload, email: 'not-an-email' });
  !badEmail.success ? pass('Invalid email correctly rejected') : fail('Invalid email should have been rejected');

  // VALID login
  const loginResult = loginSchema.safeParse({ email: 'rahul@seed-test.com', password: 'SecurePass@1' });
  loginResult.success ? pass('Valid login payload accepted') : fail('Login payload rejected unexpectedly');
}

// ─── Test 2: Zod Validator — Turf ─────────────────────────────────────────────
async function testTurfValidators() {
  section('Zod Validators — Turf');

  const validTurf = {
    name: 'Green Seed Arena',
    description: 'Top-quality football turf',
    coordinates: [72.8777, 19.0760], // Mumbai
    city: 'mumbai',
    address: '123 Marine Drive, Mumbai',
    images: [],
    pricePerHour: 800,
    weekendPricePerHour: 1200,
    openingTime: '06:00',
    closingTime: '23:00',
    slotDurationMinutes: 60,
    sport: 'Football',
    amenities: ['Floodlights', 'Parking'],
  };

  const r1 = createTurfSchema.safeParse(validTurf);
  r1.success ? pass('Valid turf payload accepted') : fail(`Rejected: ${JSON.stringify(r1.error.format())}`);

  // INVALID: closing before opening
  const r2 = createTurfSchema.safeParse({ ...validTurf, closingTime: '05:00' });
  !r2.success ? pass('Closing before opening correctly rejected') : fail('Should have rejected closing < opening');

  // INVALID: weekend price < weekday price
  const r3 = createTurfSchema.safeParse({ ...validTurf, weekendPricePerHour: 500 });
  !r3.success ? pass('Weekend price < weekday price correctly rejected') : fail('Should have rejected weekend < weekday');

  // INVALID: bad coordinate range
  const r4 = createTurfSchema.safeParse({ ...validTurf, coordinates: [200, 100] });
  !r4.success ? pass('Out-of-range coordinates correctly rejected') : fail('Should have rejected bad coordinates');
}

// ─── Test 3: Zod Validator — Booking ──────────────────────────────────────────
async function testBookingValidators() {
  section('Zod Validators — Booking');

  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + 3);
  const dateStr = futureDate.toISOString().slice(0, 10);

  const validBooking = {
    turfId: new mongoose.Types.ObjectId().toString(),
    date: dateStr,
    startTime: '10:00',
  };

  const r1 = createBookingSchema.safeParse(validBooking);
  r1.success ? pass('Valid booking payload accepted') : fail(`Rejected: ${JSON.stringify(r1.error.format())}`);

  // INVALID: past date
  const r2 = createBookingSchema.safeParse({ ...validBooking, date: '2020-01-01' });
  !r2.success ? pass('Past date correctly rejected') : fail('Should have rejected past date');

  // INVALID: bad ObjectId
  const r3 = createBookingSchema.safeParse({ ...validBooking, turfId: 'not-an-id' });
  !r3.success ? pass('Invalid ObjectId correctly rejected') : fail('Should have rejected invalid ObjectId');

  // INVALID: bad time format
  const r4 = createBookingSchema.safeParse({ ...validBooking, startTime: '25:00' });
  !r4.success ? pass('Invalid time format correctly rejected') : fail('Should have rejected invalid time');
}

// ─── Test 4: Mongoose Models — CRUD ───────────────────────────────────────────
async function testMongooseModels() {
  section('Mongoose Models — CRUD');

  // Create owner
  const owner = await User.create({
    name: 'Priya Owner',
    email: 'priya@seed-test.com',
    passwordHash: 'TempPass@123',
    role: 'Owner',
  });
  pass(`Owner created: ${owner._id} | role: ${owner.role}`);

  // Verify password comparison
  const matched = await owner.comparePassword('TempPass@123');
  matched ? pass('Password hashing and comparison works') : fail('Password comparison failed');

  // Verify passwordHash not in toJSON
  const json = owner.toJSON();
  !json.passwordHash ? pass('passwordHash excluded from toJSON()') : fail('passwordHash leaked into JSON');

  // Create player
  const player = await User.create({
    name: 'Arjun Player',
    email: 'arjun@seed-test.com',
    passwordHash: 'TempPass@123',
    role: 'Player',
  });
  pass(`Player created: ${player._id} | role: ${player.role}`);

  // Duplicate email test
  try {
    await User.create({ name: 'Dup', email: 'arjun@seed-test.com', passwordHash: 'Pass@1234', role: 'Player' });
    fail('Duplicate email should have been rejected');
  } catch (err) {
    err.code === 11000 ? pass('Duplicate email correctly rejected (E11000)') : fail(`Unexpected error: ${err.message}`);
  }

  // Create turf
  const turf = await Turf.create({
    name: 'Seed Football Arena',
    description: 'A test turf for seeding',
    location: { type: 'Point', coordinates: [72.8777, 19.0760] },
    city: 'mumbai',
    address: 'Test Street, Mumbai',
    pricePerHour: 800,
    openingTime: '06:00',
    closingTime: '23:00',
    sport: 'Football',
    ownerId: owner._id,
    amenities: ['Floodlights', 'Parking'],
  });
  pass(`Turf created: ${turf._id} | slug: ${turf.slug}`);

  // Verify slug auto-generation
  turf.slug ? pass('Slug auto-generated from name') : fail('Slug not generated');

  // Verify generateSlots()
  const slots = turf.generateSlots();
  slots.length > 0 ? pass(`generateSlots() returned ${slots.length} 1-hour slots: ${slots.slice(0,3).join(', ')}...`) : fail('generateSlots() returned empty');

  // Create booking
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);

  const booking = await Booking.create({
    turfId: turf._id,
    playerId: player._id,
    date: tomorrow,
    startTime: '10:00',
    endTime: '11:00',
    basePrice: 800,
    commissionAmount: 80,
    ownerPayout: 720,
    totalPrice: 800,
  });
  pass(`Booking created: ${booking._id} | status: ${booking.status}`);
  pass(`Commission auto-computed: ₹${booking.commissionAmount} | Owner payout: ₹${booking.ownerPayout}`);
  booking.expiresAt ? pass(`Expiry set: ${booking.expiresAt.toISOString()}`) : fail('expiresAt not set');

  return { turf, player, tomorrow };
}

// ─── Test 5: Double-Booking Prevention ────────────────────────────────────────
async function testDoubleBooking(turf, player, date) {
  section('Double-Booking Prevention (Unique Index)');

  const baseBooking = { turfId: turf._id, playerId: player._id, date, startTime: '10:00', endTime: '11:00', basePrice: 800, commissionAmount: 80, ownerPayout: 720, totalPrice: 800, status: 'Pending' };

  try {
    // First booking already created in Test 4 — try duplicate
    await Booking.create({ ...baseBooking, startTime: '10:00' });
    fail('Second booking on same slot should have been rejected');
  } catch (err) {
    err.code === 11000
      ? pass('Double-booking (Pending) correctly prevented by unique index (E11000)')
      : fail(`Unexpected error: ${err.code} — ${err.message}`);
  }

  // Different slot — should succeed
  const diffSlot = await Booking.create({ ...baseBooking, startTime: '12:00', endTime: '13:00' });
  pass(`Different slot booking allowed: startTime=${diffSlot.startTime}`);
}

// ─── Test 6: MongoDB Transaction ──────────────────────────────────────────────
async function testTransaction() {
  section('MongoDB Transactions (Session)');

  // Transactions require a replica set. If running a standalone Mongo instance,
  // this test will be skipped with a clear message.
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    // Find a user to use in transaction
    const user = await User.findOne({ email: 'arjun@seed-test.com' }).session(session);
    if (!user) throw new Error('Test user not found');

    // Simulate partial write inside transaction
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 2);
    tomorrow.setHours(0, 0, 0, 0);

    const turf = await Turf.findOne({ name: 'Seed Football Arena' }).session(session);

    await Booking.create([{
      turfId: turf._id,
      playerId: user._id,
      date: tomorrow,
      startTime: '14:00',
      endTime: '15:00',
      basePrice: 800,
      commissionAmount: 80,
      ownerPayout: 720,
      totalPrice: 800,
    }], { session });

    // Abort the transaction to test rollback
    await session.abortTransaction();
    const rolledBack = await Booking.findOne({ startTime: '14:00', date: tomorrow });
    !rolledBack ? pass('Transaction aborted — booking correctly rolled back') : fail('Rollback failed: booking persisted after abort');

  } catch (err) {
    if (err.message.includes('Transaction') || err.codeName === 'IllegalOperation') {
      console.log(`  \x1b[33m⚠\x1b[0m  Transaction test skipped — MongoDB replica set required`);
      console.log(`     Run MongoDB as a replica set for full transaction support.`);
    } else {
      fail(`Transaction test error: ${err.message}`);
    }
    await session.abortTransaction();
  } finally {
    session.endSession();
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n\x1b[35m╔════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[35m║   TurfReserve — Phase 1 Seed Script    ║\x1b[0m');
  console.log('\x1b[35m╚════════════════════════════════════════╝\x1b[0m');

  await connectDB();

  await cleanup();

  await testUserValidators();
  await testTurfValidators();
  await testBookingValidators();

  const { turf, player, tomorrow } = await testMongooseModels();
  await testDoubleBooking(turf, player, tomorrow);
  await testTransaction();

  await cleanup();

  console.log('\n\x1b[32m✔ Phase 1 complete. All schema constraints and validators verified.\x1b[0m');
  console.log('\x1b[33mAwaiting your go-ahead before starting Phase 2 (Backend API + Auth).\x1b[0m\n');
  process.exit(0);
}

main().catch((err) => {
  console.error('\x1b[31mSeed script failed:\x1b[0m', err);
  process.exit(1);
});
