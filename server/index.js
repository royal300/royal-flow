const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Staff, Task, Attendance, DailyReport, Income, Expense, PendingExpense, BankDeposit } = require('./models');
const Settings = require('./settings');
const { validateLocation } = require('./utils/locationValidator');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/royal300', {
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
})
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => {
        console.error('❌ MongoDB connection error:', err.message);
        console.error('Using connection string:', process.env.MONGO_URI ? 'MongoDB Atlas' : 'localhost');
        console.error('Please check:');
        console.error('1. MongoDB Atlas IP whitelist (add 0.0.0.0/0 for testing)');
        console.error('2. Correct username/password in .env');
        console.error('3. Network connectivity');
        process.exit(1);
    });

// --- Staff Endpoints ---
app.get('/api/staff', async (req, res) => {
    try {
        const staff = await Staff.find();
        res.json(staff);
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ error: 'Failed to fetch staff' });
    }
});

app.post('/api/staff', async (req, res) => {
    try {
        const newStaff = new Staff({
            ...req.body,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        });
        await newStaff.save();
        res.json(newStaff);
    } catch (error) {
        console.error('Error creating staff:', error);
        res.status(500).json({ error: 'Failed to create staff' });
    }
});

app.put('/api/staff/:id', async (req, res) => {
    try {
        const updated = await Staff.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
        res.json(updated);
    } catch (error) {
        console.error('Error updating staff:', error);
        res.status(500).json({ error: 'Failed to update staff' });
    }
});

app.delete('/api/staff/:id', async (req, res) => {
    try {
        await Staff.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting staff:', error);
        res.status(500).json({ error: 'Failed to delete staff' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;

    if (role === 'admin') {
        if (email === 'royal300' && password === 'R@12345') {
            return res.json({
                userId: 'admin',
                role: 'admin',
                name: 'Administrator',
                email: 'royal300'
            });
        }
    }

    const staff = await Staff.findOne({ email, password });
    if (staff) {
        return res.json({
            userId: staff.id,
            role: 'staff',
            name: staff.name,
            email: staff.email
        });
    }

    res.status(401).json({ error: 'Invalid credentials' });
});

// --- Task Endpoints ---
app.get('/api/tasks', async (req, res) => {
    const tasks = await Task.find();
    res.json(tasks);
});

app.post('/api/tasks', async (req, res) => {
    const newTask = new Task({
        ...req.body,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        comments: [],
        statusHistory: []
    });
    await newTask.save();
    res.json(newTask);
});

app.put('/api/tasks/:id', async (req, res) => {
    const data = { ...req.body, updatedAt: new Date().toISOString() };
    const updated = await Task.findOneAndUpdate({ id: req.params.id }, data, { new: true });
    res.json(updated);
});

app.delete('/api/tasks/:id', async (req, res) => {
    await Task.deleteOne({ id: req.params.id });
    res.json({ success: true });
});

// --- Attendance Endpoints ---
app.get('/api/attendance', async (req, res) => {
    const records = await Attendance.find();
    res.json(records);
});

app.post('/api/attendance', async (req, res) => {
    const newRecord = new Attendance({
        ...req.body,
        id: crypto.randomUUID()
    });
    await newRecord.save();
    res.json(newRecord);
});

app.put('/api/attendance/:id', async (req, res) => {
    const updated = await Attendance.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updated);
});

// --- Daily Report Endpoints ---
app.get('/api/daily-reports', async (req, res) => {
    const reports = await DailyReport.find().sort({ date: -1 });
    res.json(reports);
});

app.post('/api/daily-reports', async (req, res) => {
    const newReport = new DailyReport({
        ...req.body,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    });
    await newReport.save();
    res.json(newReport);
});

app.put('/api/daily-reports/:id', async (req, res) => {
    const data = { ...req.body, updatedAt: new Date().toISOString() };
    const updated = await DailyReport.findOneAndUpdate({ id: req.params.id }, data, { new: true });
    res.json(updated);
});

app.delete('/api/daily-reports/:id', async (req, res) => {
    await DailyReport.deleteOne({ id: req.params.id });
    res.json({ success: true });
});

// --- Biometric Endpoints ---

// Register face for a staff member
app.post('/api/staff/:id/register-face', async (req, res) => {
    try {
        const { faceDescriptor, faceImage } = req.body;

        if (!faceDescriptor || !Array.isArray(faceDescriptor)) {
            return res.status(400).json({ error: 'Invalid face descriptor' });
        }

        // Face descriptors from face-api.js are always 128 dimensions
        if (faceDescriptor.length !== 128) {
            console.error('Invalid descriptor length:', faceDescriptor.length);
            return res.status(400).json({
                error: `Invalid face descriptor length: ${faceDescriptor.length}. Expected 128.`
            });
        }

        console.log('Registering face for staff:', req.params.id);
        console.log('Descriptor length:', faceDescriptor.length);

        const updated = await Staff.findOneAndUpdate(
            { id: req.params.id },
            { faceDescriptor, faceImage },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Staff not found' });
        }

        console.log('Face registered successfully for:', updated.name);
        res.json({ success: true, staff: updated });
    } catch (error) {
        console.error('Face registration error:', error);
        res.status(500).json({ error: 'Failed to register face' });
    }
});

// Get all staff with registered biometric data
app.get('/api/staff/biometric', async (req, res) => {
    try {
        const staff = await Staff.find({
            faceDescriptor: { $exists: true, $ne: null, $not: { $size: 0 } }
        }).select('id name faceDescriptor').lean(); // Use .lean() to get plain objects

        console.log(`Found ${staff.length} staff with biometric data`);

        // Convert to plain objects and ensure descriptors are arrays
        const staffData = staff.map(s => {
            const descriptor = s.faceDescriptor;

            // Ensure descriptor is a proper array
            let descriptorArray;
            if (Array.isArray(descriptor)) {
                descriptorArray = descriptor;
            } else if (descriptor && typeof descriptor === 'object') {
                // Convert object to array (in case Mongoose returns it as object)
                descriptorArray = Object.values(descriptor);
            } else {
                console.error(`Invalid descriptor type for ${s.name}:`, typeof descriptor);
                return null;
            }

            if (descriptorArray.length !== 128) {
                console.warn(`WARNING: ${s.name} has invalid descriptor length: ${descriptorArray.length}`);
                return null;
            }

            console.log(`✓ ${s.name}: descriptor is valid array with ${descriptorArray.length} elements`);

            return {
                id: s.id,
                name: s.name,
                descriptor: descriptorArray
            };
        }).filter(s => s !== null); // Remove invalid entries

        console.log(`Returning ${staffData.length} valid staff records`);
        res.json(staffData);
    } catch (error) {
        console.error('Error fetching biometric staff:', error);
        res.status(500).json({ error: 'Failed to fetch biometric data' });
    }
});

// Process face scan for attendance
app.post('/api/attendance/scan', async (req, res) => {
    try {
        console.log('🔍 Attendance scan request received');
        const { staffId, staffName } = req.body;
        console.log('Staff ID:', staffId, 'Name:', staffName);

        if (!staffId || !staffName) {
            console.error('Missing staffId or staffName');
            return res.status(400).json({ error: 'Staff ID and name required' });
        }

        const today = new Date().toISOString().split('T')[0];
        const now = new Date();
        const nowISO = now.toISOString();
        console.log('Date:', today, 'Time:', nowISO);

        // Get late threshold from settings (default 9:00 AM)
        let lateThresholdSetting = await Settings.findOne({ key: 'lateThreshold' });
        const lateThresholdHour = lateThresholdSetting?.value || 9; // Default 9 AM

        // Check if already checked in today
        const existingRecord = await Attendance.findOne({ staffId, date: today });
        console.log('Existing record:', existingRecord ? 'Found' : 'Not found');

        if (existingRecord) {
            // Update check-out time
            console.log('Updating check-out for:', staffName);
            existingRecord.checkOut = nowISO;

            // Calculate working hours
            if (existingRecord.checkIn) {
                const checkInTime = new Date(existingRecord.checkIn);
                const workingMs = now - checkInTime;
                existingRecord.workingHours = Math.round((workingMs / (1000 * 60 * 60)) * 100) / 100;
            }

            await existingRecord.save();
            console.log('✅ Check-out saved successfully');

            return res.json({
                type: 'checkout',
                record: existingRecord,
                message: `Goodbye, ${staffName}! Checked out.`
            });
        } else {
            // Create new check-in record
            console.log('Creating new check-in for:', staffName);

            // Determine status based on time
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const currentTimeInMinutes = currentHour * 60 + currentMinute;
            const thresholdInMinutes = lateThresholdHour * 60;

            const status = currentTimeInMinutes > thresholdInMinutes ? 'late' : 'present';
            console.log(`Time check: ${currentHour}:${currentMinute} vs threshold ${lateThresholdHour}:00 → ${status}`);

            const newRecord = new Attendance({
                id: crypto.randomUUID(),
                staffId,
                staffName,
                date: today,
                checkIn: nowISO,
                status,
                workingHours: 0
            });

            await newRecord.save();
            console.log('✅ Check-in saved successfully');

            return res.json({
                type: 'checkin',
                record: newRecord,
                message: `Welcome, ${staffName}! Checked in${status === 'late' ? ' (Late)' : ''}.`
            });
        }
    } catch (error) {
        console.error('❌ Attendance scan error:', error);
        res.status(500).json({ error: 'Failed to process attendance' });
    }
});

// --- Settings Endpoints ---

// Get a setting by key
app.get('/api/settings/:key', async (req, res) => {
    try {
        const setting = await Settings.findOne({ key: req.params.key });
        if (!setting) {
            return res.json({ key: req.params.key, value: null });
        }
        res.json(setting);
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Failed to fetch setting' });
    }
});

// Update a setting
app.put('/api/settings/:key', async (req, res) => {
    try {
        const { value } = req.body;
        const setting = await Settings.findOneAndUpdate(
            { key: req.params.key },
            { value, updatedAt: new Date().toISOString() },
            { upsert: true, new: true }
        );
        console.log(`✅ Setting updated: ${req.params.key} = ${value}`);
        res.json(setting);
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Failed to update setting' });
    }
});

// Delete face data for a staff member
app.delete('/api/staff/:id/face', async (req, res) => {
    try {
        const updated = await Staff.findOneAndUpdate(
            { id: req.params.id },
            { $unset: { faceDescriptor: "", faceImage: "" } },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Staff not found' });
        }

        console.log(`✅ Face data removed for: ${updated.name}`);
        res.json({ success: true, staff: updated });
    } catch (error) {
        console.error('Error deleting face:', error);
        res.status(500).json({ error: 'Failed to delete face data' });
    }
});

// --- Location Validation Endpoint ---
app.post('/api/validate-location', async (req, res) => {
    try {
        const { latitude, longitude } = req.body;

        console.log('📍 Location validation request:', { latitude, longitude });

        if (!latitude || !longitude) {
            return res.status(400).json({
                allowed: false,
                message: 'Latitude and longitude are required'
            });
        }

        // Get office coordinates from environment
        const officeLat = parseFloat(process.env.OFFICE_LATITUDE);
        const officeLon = parseFloat(process.env.OFFICE_LONGITUDE);
        const officeRadius = parseFloat(process.env.OFFICE_RADIUS);

        if (!officeLat || !officeLon || !officeRadius) {
            console.error('❌ Office location not configured in environment');
            return res.status(500).json({
                allowed: false,
                message: 'Office location not configured'
            });
        }

        // Validate location
        const result = validateLocation(
            parseFloat(latitude),
            parseFloat(longitude),
            officeLat,
            officeLon,
            officeRadius
        );

        console.log('✅ Validation result:', result);
        res.json(result);
    } catch (error) {
        console.error('❌ Location validation error:', error);
        res.status(500).json({
            allowed: false,
            message: 'Failed to validate location'
        });
    }
});



// --- Income Endpoints ---
app.get('/api/income', async (req, res) => {
    try {
        const incomeRecords = await Income.find().sort({ date: -1 });
        res.json(incomeRecords);
    } catch (error) {
        console.error('Error fetching income:', error);
        res.status(500).json({ error: 'Failed to fetch income records' });
    }
});

app.post('/api/income', async (req, res) => {
    try {
        const newIncome = new Income({
            ...req.body,
            id: crypto.randomUUID(),
            createdAt: new Date().toISOString()
        });
        await newIncome.save();
        res.json(newIncome);
    } catch (error) {
        console.error('Error creating income:', error);
        res.status(500).json({ error: 'Failed to create income record' });
    }
});

app.delete('/api/income/:id', async (req, res) => {
    try {
        await Income.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.put('/api/income/:id', async (req, res) => {
    try {
        const data = { ...req.body, updatedAt: new Date().toISOString() };
        const updated = await Income.findOneAndUpdate({ id: req.params.id }, data, { new: true });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// --- Expense Endpoints ---
app.get('/api/expense', async (req, res) => {
    try {
        const conditions = [];
        if (req.query.staffId) conditions.push({ staffId: req.query.staffId });
        if (req.query.staffName) conditions.push({ staffName: new RegExp(`^${req.query.staffName.trim()}$`, 'i') });
        const query = conditions.length > 0 ? { $or: conditions } : {};
        const expenseRecords = await Expense.find(query).sort({ date: -1 });
        res.json(expenseRecords);
    } catch (error) {
        console.error('Error fetching expense:', error);
        res.status(500).json({ error: 'Failed to fetch expense records' });
    }
});

app.post('/api/expense', async (req, res) => {
    try {
        const newExpense = new Expense({
            ...req.body,
            id: crypto.randomUUID(),
            status: req.body.status || 'Approved',
            createdAt: new Date().toISOString()
        });
        await newExpense.save();
        res.json(newExpense);
    } catch (error) {
        console.error('Error creating expense:', error);
        res.status(500).json({ error: 'Failed to create expense record' });
    }
});

app.delete('/api/expense/:id', async (req, res) => {
    try {
        await Expense.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.put('/api/expense/:id', async (req, res) => {
    try {
        const data = { ...req.body, updatedAt: new Date().toISOString() };
        const updated = await Expense.findOneAndUpdate({ id: req.params.id }, data, { new: true });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

// --- External Website Expense Endpoint (for xyz.com) ---
app.post('/api/external/add-expense', async (req, res) => {
    try {
        const {
            date,
            clientName,
            category,
            amount,
            gst = false,
            isGst = false,
            bank = 'HDFC',
            paymentMethod = 'GPay',
            remarks = ''
        } = req.body;

        if (!date || !clientName || !category || amount === undefined || amount === null || amount === '') {
            return res.status(400).json({ error: 'Please provide date, clientName, category, and amount' });
        }

        // 1. Format date cleanly as YYYY-MM-DD
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ error: 'Invalid date format provided' });
        }
        const formattedDate = dateObj.toISOString().split('T')[0];

        // 2. Extract full month name and year matching existing system convention
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const month = monthNames[dateObj.getMonth()];
        const year = dateObj.getFullYear().toString();

        // 3. GST Calculation (18% inclusive check)
        const amountVal = Number(amount);
        if (isNaN(amountVal)) {
            return res.status(400).json({ error: 'Amount must be a valid number' });
        }
        const hasGst = Boolean(gst || isGst || gst === 'true' || isGst === 'true');
        const withoutGstVal = hasGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
        const gstVal = hasGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

        // 4. Create and save Expense directly (keeping rfNo blank, bank HDFC by default)
        const newExpense = new Expense({
            id: crypto.randomUUID(),
            staffId: 'website_user',
            staffName: 'Website Portal (xyz.com)',
            status: 'Approved',
            date: formattedDate,
            category: category.trim(),
            paymentMethod: paymentMethod.trim(),
            bank: (bank || 'HDFC').trim(),
            clientName: clientName.trim(),
            rfNo: '', // Kept blank as requested so admin can update later
            amount: amountVal,
            isGst: hasGst,
            gstAmount: gstVal,
            withoutGstAmount: withoutGstVal,
            month: month,
            year: year,
            remarks: remarks ? remarks.trim() : '',
            createdAt: new Date().toISOString()
        });

        await newExpense.save();
        console.log(`✅ External Expense Added: ₹${amountVal} | Client: ${clientName} | Bank: ${newExpense.bank} | GST: ${hasGst ? `₹${gstVal}` : 'No'}`);

        res.json({
            success: true,
            message: 'Expense added successfully from external website!',
            expenseId: newExpense.id,
            expense: newExpense
        });
    } catch (error) {
        console.error('❌ Error in /api/external/add-expense:', error);
        res.status(500).json({ error: 'Failed to add external expense record' });
    }
});

// --- External Website Pending Expense Endpoint (for 3rd party websites) ---
app.post('/api/external/add-pending-expense', async (req, res) => {
    try {
        const {
            submittedBy,
            submitBy,
            staffName,
            date,
            clientName,
            category = 'Meta AD',
            amount,
            gst = false,
            isGst = false,
            bank = 'HDFC',
            paymentMethod = 'GPay',
            paymentMode,
            remarks = '',
            rfNo = ''
        } = req.body;

        if (!date || !clientName || amount === undefined || amount === null || amount === '') {
            return res.status(400).json({ error: 'Please provide date, clientName, and amount' });
        }

        // 1. Format date cleanly as YYYY-MM-DD
        const dateObj = new Date(date);
        if (isNaN(dateObj.getTime())) {
            return res.status(400).json({ error: 'Invalid date format provided' });
        }
        const formattedDate = dateObj.toISOString().split('T')[0];

        // 2. Extract full month name and year matching existing system convention
        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        const month = monthNames[dateObj.getMonth()];
        const year = dateObj.getFullYear().toString();

        // 3. GST Calculation (18% inclusive check)
        const amountVal = Number(amount);
        if (isNaN(amountVal)) {
            return res.status(400).json({ error: 'Amount must be a valid number' });
        }
        const hasGst = Boolean(gst || isGst || gst === 'true' || isGst === 'true');
        const withoutGstVal = hasGst ? Number((amountVal / 1.18).toFixed(2)) : amountVal;
        const gstVal = hasGst ? Number((amountVal - withoutGstVal).toFixed(2)) : 0;

        // 4. Determine submitted by name and payment mode
        const submitterName = (submittedBy || submitBy || staffName || '3rd Party Portal').trim();
        const mode = (paymentMode || paymentMethod || 'GPay').trim();

        // 5. Create and save PendingExpense
        const newPendingExpense = new PendingExpense({
            id: crypto.randomUUID(),
            staffId: 'external_user',
            staffName: submitterName,
            status: 'Pending',
            date: formattedDate,
            category: (category || 'Meta AD').trim(),
            paymentMethod: mode,
            bank: (bank || 'HDFC').trim(),
            clientName: clientName.trim(),
            rfNo: rfNo ? rfNo.trim() : '',
            amount: amountVal,
            isGst: hasGst,
            gstAmount: gstVal,
            withoutGstAmount: withoutGstVal,
            month: month,
            year: year,
            remarks: remarks ? remarks.trim() : '',
            createdAt: new Date().toISOString()
        });

        await newPendingExpense.save();
        console.log(`✅ External Pending Expense Added: ₹${amountVal} | Client: ${clientName} | Submitter: ${submitterName} | Category: ${newPendingExpense.category}`);

        res.json({
            success: true,
            message: 'Pending expense added successfully from 3rd party website!',
            pendingExpenseId: newPendingExpense.id,
            pendingExpense: newPendingExpense
        });
    } catch (error) {
        console.error('❌ Error in /api/external/add-pending-expense:', error);
        res.status(500).json({ error: 'Failed to add external pending expense record' });
    }
});

// --- Pending Expense Endpoints ---
app.get('/api/pending-expense', async (req, res) => {
    try {
        const conditions = [];
        if (req.query.staffId) conditions.push({ staffId: req.query.staffId });
        if (req.query.staffName) conditions.push({ staffName: new RegExp(`^${req.query.staffName.trim()}$`, 'i') });
        const query = conditions.length > 0 ? { $or: conditions } : {};
        const records = await PendingExpense.find(query).sort({ date: -1 });
        res.json(records);
    } catch (error) {
        console.error('Error fetching pending expenses:', error);
        res.status(500).json({ error: 'Failed to fetch pending expenses' });
    }
});

app.post('/api/pending-expense', async (req, res) => {
    try {
        const newRecord = new PendingExpense({
            ...req.body,
            id: crypto.randomUUID(),
            status: req.body.status || 'Pending',
            createdAt: new Date().toISOString()
        });
        await newRecord.save();
        res.json(newRecord);
    } catch (error) {
        console.error('Error creating pending expense:', error);
        res.status(500).json({ error: 'Failed to create pending expense' });
    }
});

app.delete('/api/pending-expense/:id', async (req, res) => {
    try {
        await PendingExpense.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.put('/api/pending-expense/:id', async (req, res) => {
    try {
        const data = { ...req.body, updatedAt: new Date().toISOString() };
        const updated = await PendingExpense.findOneAndUpdate({ id: req.params.id }, data, { new: true });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.post('/api/pending-expense/:id/approve', async (req, res) => {
    try {
        const record = await PendingExpense.findOne({ id: req.params.id });
        if (!record) {
            return res.status(404).json({ error: 'Pending expense not found' });
        }
        const newExpense = new Expense({
            id: crypto.randomUUID(),
            staffId: record.staffId,
            staffName: record.staffName,
            status: 'Approved',
            date: record.date,
            category: record.category,
            bank: record.bank,
            clientName: record.clientName,
            paymentMethod: record.paymentMethod,
            rfNo: record.rfNo,
            amount: record.amount,
            isGst: record.isGst,
            gstAmount: record.gstAmount,
            withoutGstAmount: record.withoutGstAmount,
            month: record.month,
            year: record.year,
            remarks: record.remarks,
            createdAt: new Date().toISOString()
        });
        await newExpense.save();
        await PendingExpense.deleteOne({ id: req.params.id });
        res.json({ success: true, expense: newExpense });
    } catch (error) {
        console.error('Error approving pending expense:', error);
        res.status(500).json({ error: 'Failed to approve pending expense' });
    }
});

app.post('/api/pending-expense/approve-all', async (req, res) => {
    try {
        const records = await PendingExpense.find();
        if (!records || records.length === 0) {
            return res.json({ success: true, count: 0 });
        }
        const expensesToCreate = records.map(record => ({
            id: crypto.randomUUID(),
            staffId: record.staffId,
            staffName: record.staffName,
            status: 'Approved',
            date: record.date,
            category: record.category,
            bank: record.bank,
            clientName: record.clientName,
            paymentMethod: record.paymentMethod,
            rfNo: record.rfNo,
            amount: record.amount,
            isGst: record.isGst,
            gstAmount: record.gstAmount,
            withoutGstAmount: record.withoutGstAmount,
            month: record.month,
            year: record.year,
            remarks: record.remarks,
            createdAt: new Date().toISOString()
        }));
        await Expense.insertMany(expensesToCreate);
        await PendingExpense.deleteMany({});
        res.json({ success: true, count: expensesToCreate.length });
    } catch (error) {
        console.error('Error approving all pending expenses:', error);
        res.status(500).json({ error: 'Failed to approve all pending expenses' });
    }
});

// --- Bank Deposit Endpoints ---
app.get('/api/bank-deposit', async (req, res) => {
    try {
        const deposits = await BankDeposit.find();
        res.json(deposits);
    } catch (error) {
        console.error('Error fetching bank deposits:', error);
        res.status(500).json({ error: 'Failed to fetch bank deposits' });
    }
});

app.post('/api/bank-deposit', async (req, res) => {
    try {
        const newDeposit = new BankDeposit({
            ...req.body,
            id: Date.now().toString(),
            createdAt: new Date().toISOString()
        });
        await newDeposit.save();
        res.json(newDeposit);
    } catch (error) {
        console.error('Error adding bank deposit:', error);
        res.status(500).json({ error: 'Failed to add bank deposit record' });
    }
});

app.delete('/api/bank-deposit/:id', async (req, res) => {
    try {
        await BankDeposit.deleteOne({ id: req.params.id });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

app.put('/api/bank-deposit/:id', async (req, res) => {
    try {
        const data = { ...req.body, updatedAt: new Date().toISOString() };
        const updated = await BankDeposit.findOneAndUpdate({ id: req.params.id }, data, { new: true });
        res.json(updated);
    } catch (e) {
        res.status(500).json({ error: 'Failed' });
    }
});

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
