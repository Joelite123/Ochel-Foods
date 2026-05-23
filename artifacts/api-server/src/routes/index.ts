import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import referralsRouter from "./referrals.js";
import ordersRouter from "./orders.js";
import newsletterRouter from "./newsletter.js";
import subscribeRouter from "./newsletter-subscribe.js";
import menuRouter from "./menu.js";
import printStreamRouter from "./print-stream.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/menu", menuRouter);
router.use("/referrals", referralsRouter);
router.use("/orders", ordersRouter);
router.use("/newsletter", newsletterRouter);
router.use("/subscribe", subscribeRouter);
router.use(printStreamRouter);

export default router;
