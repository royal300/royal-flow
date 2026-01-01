// Test script to verify face descriptor data in MongoDB
const mongoose = require('mongoose');
require('dotenv').config();

const { Staff } = require('./models');

async function testFaceData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('✅ Connected to MongoDB');

        const staffWithFaces = await Staff.find({
            faceDescriptor: { $exists: true, $ne: null }
        });

        console.log(`\nFound ${staffWithFaces.length} staff with face data:\n`);

        staffWithFaces.forEach(staff => {
            console.log(`📋 ${staff.name}:`);
            console.log(`   - ID: ${staff.id}`);
            console.log(`   - Descriptor length: ${staff.faceDescriptor?.length || 0}`);
            console.log(`   - Has face image: ${staff.faceImage ? 'Yes' : 'No'}`);

            if (staff.faceDescriptor && staff.faceDescriptor.length !== 128) {
                console.log(`   ⚠️  WARNING: Invalid descriptor length!`);
            }

            // Check if descriptor has valid numbers
            if (staff.faceDescriptor) {
                const hasInvalidValues = staff.faceDescriptor.some(v =>
                    typeof v !== 'number' || isNaN(v) || !isFinite(v)
                );
                if (hasInvalidValues) {
                    console.log(`   ⚠️  WARNING: Descriptor contains invalid values!`);
                }
            }
            console.log('');
        });

        await mongoose.disconnect();
        console.log('✅ Test complete');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

testFaceData();
