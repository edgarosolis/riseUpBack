const { Schema, model } = require("mongoose");
const AnswerSchema = require("./answer");

const SubmissionSchema = new Schema({
    assessmentId: { 
      type: Schema.Types.ObjectId, 
      ref: 'Assessment', 
      required: true 
    },
    userId: { 
      type: Schema.Types.ObjectId, 
      ref: 'User', 
      required: true 
    },
    answers: [AnswerSchema],
    finished: { 
        type: Boolean, 
        default: false 
    },
    active: {
        type: Boolean,
        default: true
    },
}, { timestamps: true });
  
SubmissionSchema.index({ userId: 1, assessmentId: 1 });
  
module.exports = model('Submission', SubmissionSchema);