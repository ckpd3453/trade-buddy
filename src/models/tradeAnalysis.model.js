import mongoose from 'mongoose';

const tradeAnalysisSchema = new mongoose.Schema({
  tradeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trade',
    required: true
  },
  exitId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exit'
  },
  position: {
    type: String,
    enum: ['Open', 'Close'],
    required: true
  },
  resultClosedPosition: {
    type: String,
    enum: ['Profit', 'Loss', null]
  },
  profitClosedPosition: {
    type: Number,
    default: 0
  },
  lossClosedPosition: {
    type: Number,
    default: 0
  },
  profitAndLossClosedPostion: {
    type: Number,
    default: 0
  },
  profitAndLossOpenPosition: {
    type: Number,
    default: 0
  },
  tradeDuration: {
    type: Number // Number of days
  },
  tradeStrategy: {
    type: String,
    enum: ['Intraday', 'Swing', 'Investment']
  },
  investment: {
    type: Number,
    required: true
  },
  roi: {
    type: Number // Percentage
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model('TradeAnalysis', tradeAnalysisSchema);
