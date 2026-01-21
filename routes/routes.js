const express = require("express");
const rootRouter = express.Router();

const assessmentRouter = require("./assessment");
const authRouter = require("./auth");
const reportRouter = require("./report");
const resultRouter = require("./result");
const submissionRouter = require("./submission");
const userRouter = require("./user");

rootRouter.use('/assessment',assessmentRouter);
rootRouter.use('/auth',authRouter);
rootRouter.use('/report',reportRouter);
rootRouter.use('/result',resultRouter);
rootRouter.use('/submission',submissionRouter);
rootRouter.use('/user',userRouter);

module.exports = rootRouter;
