const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
    key: { type: String, unique: true, required: true },
    value: mongoose.Schema.Types.Mixed,
    updatedAt: String
});

module.exports = mongoose.model('Settings', settingsSchema);
