const mongoose = require('mongoose');

const staffSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  department: String,
  position: String,
  avatar: String,
  faceDescriptor: [Number], // Face embedding for biometric recognition
  faceImage: String, // Base64 encoded face snapshot
  createdAt: String
});

const taskSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  title: String,
  description: String,
  assignedStaff: [String], // Array of staff IDs
  clientName: String,
  clientWap: String,
  campaignName: String,
  year: String,
  location: String,
  platforms: [{
    name: String,
    startDate: String,
    endDate: String,
    amount: Number,
    times: [String],
    status: { type: String, default: 'Pending' }
  }],
  remarks: String,
  createdBy: String,
  createdByName: String,
  priority: String,
  status: { type: String, default: 'Pending' },
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
  staffName: String, // Staff name for display
  date: String,
  checkIn: String, // Biometric check-in time
  checkOut: String, // Biometric check-out time
  status: String,
  workingHours: Number
});

const dailyReportSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  staffId: String,
  staffName: String,
  date: String,
  content: String,
  reportType: String,
  clientName: String,
  creativeType: String,
  itemCount: Number,
  createdAt: String,
  updatedAt: String
}, { strict: false });

const incomeSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: String,
  clientName: String,
  category: String,
  paymentMethod: String,
  bank: String,
  amount: Number,
  isGst: Boolean,
  gstAmount: Number,
  withoutGstAmount: Number,
  month: String,
  year: String,
  invoiceNumber: String,
  rfNo: String,
  chequeNo: String,
  remarks: String,
  createdAt: String
});

const expenseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  staffId: String,
  staffName: String,
  status: { type: String, default: 'Approved' },
  date: String,
  category: String,
  paymentMethod: String,
  bank: String,
  clientName: String,
  rfNo: String,
  amount: Number,
  isGst: Boolean,
  gstAmount: Number,
  withoutGstAmount: Number,
  month: String,
  year: String,
  remarks: String,
  createdAt: String
});

const pendingExpenseSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  staffId: String,
  staffName: String,
  status: { type: String, default: 'Pending' },
  date: String,
  category: String,
  paymentMethod: String,
  bank: String,
  clientName: String,
  rfNo: String,
  amount: Number,
  isGst: Boolean,
  gstAmount: Number,
  withoutGstAmount: Number,
  month: String,
  year: String,
  remarks: String,
  createdAt: String,
  updatedAt: String
});

const bankDepositSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  date: String,
  type: String, // 'Cash' or 'Cheque'
  bank: String,
  amount: Number,
  chequeNo: String,
  bankName: String,
  month: String,
  year: String,
  remarks: String,
  createdAt: String,
  updatedAt: String
});

module.exports = {
  Staff: mongoose.model('Staff', staffSchema),
  Task: mongoose.model('Task', taskSchema),
  Attendance: mongoose.model('Attendance', attendanceSchema),
  DailyReport: mongoose.model('DailyReport', dailyReportSchema),
  Income: mongoose.model('Income', incomeSchema),
  Expense: mongoose.model('Expense', expenseSchema),
  PendingExpense: mongoose.model('PendingExpense', pendingExpenseSchema),
  BankDeposit: mongoose.model('BankDeposit', bankDepositSchema)
};
