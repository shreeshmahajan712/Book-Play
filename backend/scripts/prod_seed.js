require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Turf = require('../models/Turf');

async function seed() {
  try {
    await connectDB();
    console.log('Connected to MongoDB...');

    // 1. Clear existing test data to prevent duplicates (keeps the DB clean for the demo)
    await Turf.deleteMany({ ownerId: { $exists: true } }); 
    await User.deleteMany({ email: 'owner@bookplay.com' });

    // 2. Create an Owner User
    const owner = await User.create({
      name: 'Demo Owner',
      email: 'owner@bookplay.com',
      passwordHash: 'Owner@123',
      role: 'Owner'
    });
    console.log('✅ Owner created: owner@bookplay.com');

    // 3. Create Diverse Sample Turfs
    const turfs = [
      {
        name: 'Skyline Football Arena',
        description: 'Premium 5-a-side football turf with high-quality artificial grass and FIFA standard floodlights.',
        location: { type: 'Point', coordinates: [72.8777, 19.0760] },
        city: 'mumbai',
        address: 'Andheri West, Mumbai',
        pricePerHour: 1200,
        weekendPricePerHour: 1500,
        openingTime: '06:00',
        closingTime: '23:00',
        sport: 'Football',
        ownerId: owner._id,
        amenities: ['Floodlights', 'Changing Room', 'Parking', 'Water'],
        images: ['https://images.unsplash.com/photo-1556129984-477a51441801?q=80&w=1000&auto=format&fit=crop']
      },
      {
        name: 'Box Cricket Central',
        description: 'Perfect for box cricket matches. Well-maintained nets, astroturf, and bright LED lighting.',
        location: { type: 'Point', coordinates: [72.8347, 18.9220] },
        city: 'mumbai',
        address: 'Marine Drive, Mumbai',
        pricePerHour: 800,
        weekendPricePerHour: 1000,
        openingTime: '07:00',
        closingTime: '22:00',
        sport: 'Cricket',
        ownerId: owner._id,
        amenities: ['Nets', 'Floodlights', 'Equipment Rental', 'Seating Area'],
        images: ['https://images.unsplash.com/photo-1531415074968-036ba1b575da?q=80&w=1000&auto=format&fit=crop']
      },
      {
        name: 'Smashers Badminton Hub',
        description: 'Indoor wooden courts with excellent shock absorption and anti-glare lighting.',
        location: { type: 'Point', coordinates: [77.2090, 28.6139] },
        city: 'delhi',
        address: 'Connaught Place, New Delhi',
        pricePerHour: 500,
        weekendPricePerHour: 700,
        openingTime: '05:00',
        closingTime: '21:00',
        sport: 'Badminton',
        ownerId: owner._id,
        amenities: ['Indoor', 'AC', 'Washrooms', 'Pro Shop'],
        images: ['https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?q=80&w=1000&auto=format&fit=crop']
      },
      {
        name: 'Grand Slam Tennis Club',
        description: 'Professional clay courts maintained daily. Ideal for both beginners and pros.',
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
        city: 'bangalore',
        address: 'Indiranagar, Bangalore',
        pricePerHour: 1000,
        weekendPricePerHour: 1200,
        openingTime: '06:00',
        closingTime: '20:00',
        sport: 'Tennis',
        ownerId: owner._id,
        amenities: ['Clay Court', 'Coaching', 'Cafe', 'Parking'],
        images: ['https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?q=80&w=1000&auto=format&fit=crop']
      },
      {
        name: 'Hoops Basketball Court',
        description: 'Full-size outdoor basketball court with a high-grip synthetic surface and glass backboards.',
        location: { type: 'Point', coordinates: [73.8567, 18.5204] },
        city: 'pune',
        address: 'Koregaon Park, Pune',
        pricePerHour: 600,
        weekendPricePerHour: 800,
        openingTime: '07:00',
        closingTime: '22:00',
        sport: 'Basketball',
        ownerId: owner._id,
        amenities: ['Scoreboard', 'Floodlights', 'Bleachers'],
        images: ['https://images.unsplash.com/photo-1519861531473-9200262188bf?q=80&w=1000&auto=format&fit=crop']
      },
      {
        name: 'Olympus Multi-Sport Complex',
        description: 'Large complex offering various indoor and outdoor sports facilities.',
        location: { type: 'Point', coordinates: [80.2707, 13.0827] },
        city: 'chennai',
        address: 'Adyar, Chennai',
        pricePerHour: 1000,
        weekendPricePerHour: 1200,
        openingTime: '05:00',
        closingTime: '23:00',
        sport: 'Multi-Sport',
        ownerId: owner._id,
        amenities: ['Showers', 'Lockers', 'Cafeteria', 'Equipment Rental'],
        images: ['https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=1000&auto=format&fit=crop']
      }
    ];

    await Turf.insertMany(turfs);
    console.log(`✅ ${turfs.length} Turfs created across multiple cities.`);

    console.log('\n🚀 Extended Database seeding successful! Your friends will be impressed.');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

seed();
