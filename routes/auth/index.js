import express from "express";
import {
  genrateotp,
  server,
  verification,
  getAllUsers,
  getNotification,
  getAllLogs,
  getvissitors
 
} from "../../services/auth/index.js"
import { cheack } from "../../middleware/jwt/index.js";

const routes = express.Router();
routes.get('/ping', server);
routes.post('/verification', verification);
routes.post('/create-otp', genrateotp);
routes.get('/get-client', getAllUsers);
routes.get('/get-notification',cheack, getNotification);
routes.get('/get-logs', getAllLogs);
routes.get('/track', getvissitors);



export default routes;
