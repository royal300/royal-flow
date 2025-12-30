const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { Staff, Task, Attendance, DailyReport } = require('./models');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

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
    const staff = await Staff.find();
    res.json(staff);
});

app.post('/api/staff', async (req, res) => {
    const newStaff = new Staff({
        ...req.body,
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString()
    });
    await newStaff.save();
    res.json(newStaff);
});

app.put('/api/staff/:id', async (req, res) => {
    const updated = await Staff.findOneAndUpdate({ id: req.params.id }, req.body, { new: true });
    res.json(updated);
});

app.delete('/api/staff/:id', async (req, res) => {
    await Staff.deleteOne({ id: req.params.id });
    res.json({ success: true });
});

app.post('/api/auth/login', async (req, res) => {
    const { email, password, role } = req.body;

    if (role === 'admin') {
        if (email === 'admin@royal300.com' && password === 'admin123') {
            return res.json({
                userId: 'admin',
                role: 'admin',
                name: 'Administrator',
                email: 'admin@royal300.com'
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

const PORT = 5001;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
