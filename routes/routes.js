const express = require("express");
const rootRouter = express.Router();

const assessmentRouter = require("./assessment");
const authRouter = require("./auth");
const churchRouter = require("./church");
const groupRouter = require("./group");
const group360Router = require("./group360");
const reportRouter = require("./report");
const resultRouter = require("./result");
const submissionRouter = require("./submission");
const submission360Router = require("./submission360");
const userRouter = require("./user");
const emailTemplateRouter = require("./emailTemplate");
const integrationsRouter = require("./integrations");

rootRouter.use('/assessment',assessmentRouter);
rootRouter.use('/auth',authRouter);
rootRouter.use('/church',churchRouter);
rootRouter.use('/group',groupRouter);
rootRouter.use('/group360',group360Router);
rootRouter.use('/report',reportRouter);
rootRouter.use('/result',resultRouter);
rootRouter.use('/submission',submissionRouter);
rootRouter.use('/submission360',submission360Router);
rootRouter.use('/user',userRouter);
rootRouter.use('/emailTemplate',emailTemplateRouter);
rootRouter.use('/integrations',integrationsRouter);

module.exports = rootRouter;
