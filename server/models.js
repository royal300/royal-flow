const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: String,
  position: String,
  avatar: String,
  createdAt: String
});

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  description: String,
  assignedTo: String,
  createdBy: String,
  createdByName: String,
  priority: String,
  status: String,
  deadline: String,
  createdAt: String,
  updatedAt: String,
  comments: [{
    id: String,
    taskId: String,
    authorId: String,
    authorName: String,
    content: String,
    createdAt: String
  }],
  statusHistory: [{
    id: String,
    taskId: String,
    previousStatus: String,
    newStatus: String,
    updatedBy: String,
    updatedByName: String,
    updatedAt: String
  }],
  files: [String]
});

const attendanceSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  staffId: String,
  date: String,
  clockIn: String,
  clockOut: String,
  status: String,
  workingHours: Number
});

const dailyReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  staffId: String,
  staffName: String,
  date: String,
  content: String,
  createdAt: String,
  updatedAt: String
});

module.exports = {
  Staff: mongoose.model('Staff', staffSchema),
  Task: mongoose.model('Task', taskSchema),
  Attendance: mongoose.model('Attendance', attendanceSchema),
  DailyReport: mongoose.model('DailyReport', dailyReportSchema)
};
