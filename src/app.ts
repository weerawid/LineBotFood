import express, {  Request, Response, NextFunction, RequestHandler } from 'express';
import { webhook } from './controller/webhook.controller.js';
import bodyParser from 'body-parser';
import { middleware } from '@line/bot-sdk';
import { updateContext } from './core/context/app_context.js';
import { helperContext } from './core/middleware/helper.js';
import { logger } from './core/middleware/logger.js';

const app = express();
const middleWareLine = middleware({
 channelSecret: process.env.LINE_CHANNEL_SECRET ?? ""
})

app.post("/webhook", middleWareLine, helperContext, logger, webhook);
app.post("/webhook-test", bodyParser.json(), helperContext, logger, webhook);

app.get('/', (req, res)=>{
  res.json('Line Bot Food')
});

export default app