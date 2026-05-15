import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import referralsRouter from "./referrals.js";
import ordersRouter from "./orders.js";
import newsletterRouter from "./newsletter.js";
import subscribeRouter from "./newsletter-subscribe.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/referrals", referralsRouter);
router.use("/orders", ordersRouter);
router.use("/newsletter", newsletterRouter);
router.use("/subscribe", subscribeRouter);

export default router;
