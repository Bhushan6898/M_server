// models/Visitor.js
import mongoose from 'mongoose';

const visitorSchema = new mongoose.Schema({
  date: {
    type: String, // e.g. "2025-07-15"
    required: true,
    unique: true,
  },
  count: {
    type: Number,
    default: 1,
  },
});

export const VisitorModel = mongoose.model('Visitor', visitorSchema);
