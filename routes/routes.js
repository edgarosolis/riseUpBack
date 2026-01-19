const express = require("express");
const rootRouter = express.Router();

const assessmentRouter = require("./assessment");
const authRouter = require("./auth");
const submissionRouter = require("./submission");
const userRouter = require("./user");

rootRouter.use('/assessment',assessmentRouter);
rootRouter.use('/auth',authRouter);
rootRouter.use('/submission',submissionRouter);
rootRouter.use('/user',userRouter);

module.exports = rootRouter;
