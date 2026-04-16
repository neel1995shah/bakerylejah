const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const LedgerEntry = require('./backend/models/LedgerEntry');
const User = require('./backend/models/User');
const { applyEntryCodes } = require('./backend/utils/entryCodes');

const test = async () => {
    try {
        await mongoose.connect('mongodb://localhost:27017/test_db', { useNewUrlParser: true, useUnifiedTopology: true });
        console.log('Connected to local test DB');

        const user = new User({ username: 'testuser', pin: '1234' });
        await user.save();

        const token = jwt.sign({ userId: user._id, username: 'testuser' }, 'TESTSECRET');
        console.log('Token:', token);

        const entry = new LedgerEntry({ userId: user._id, date: new Date(), name: 'Test Entry', in: 100 });
        await entry.save();

        const entries = await LedgerEntry.find({ userId: user._id }).sort({ date: 1, createdAt: 1 });
        applyEntryCodes(entries);

        const buildRunningEntries = (entries) => {
            let runningTotal = 0;
            return entries.map((entry) => {
                runningTotal = runningTotal + Number(entry.in || 0) - Number(entry.out || 0);
                return {
                ...entry.toObject(),
                total: runningTotal
                };
            });
        };

        const rows = buildRunningEntries(entries);
        console.log('Runs successfully:', rows);

    } catch (error) {
        console.error('Error occurred:', error.message, error.stack);
    } finally {
        await mongoose.disconnect();
    }
};

test();
