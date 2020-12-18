const mongoose = require("mongoose");

const utilsSchema = new mongoose.Schema({
    timings: {
        type: Object,
    },
    totalQuestions: {
        type: Object,
    },
});

module.exports = Utils = mongoose.model("Utils", utilsSchema);
