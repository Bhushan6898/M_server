import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path, { dirname, join } from 'path';
import cookieParser from 'cookie-parser';
import userroutes from './routes/user/index.js';
import productroutes from './routes/product/index.js';
import routes from './routes/auth/index.js';
import billroutes from './routes/bill/index.js';
import fileUpload from 'express-fileupload';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3001;

// Helper function to get __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Middleware
app.use(cors({
  origin: [
    'https://mahalaxmi-hardware.netlify.app', 
    'http://localhost:3000' 
  ],
  credentials: true  
}));
//hello
app.use(bodyParser.json());
app.use(cookieParser());
app.use(fileUpload({
  useTempFiles:true,
  tempFileDir: "/tmp/" 
}))
// Serve static files from the "uploads" directory

// app.use("/mahaluxmi_hardware", express.static(path.join(__dirname, "mahaluxmi_hardware")));
// Use external routes
app.use("/", routes);
app.use("/user", userroutes);
app.use("/bill", billroutes);
app.use("/product", productroutes);

const DB_URI = process.env.DB_URI;

// Connect to MongoDB
mongoose.connect(DB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });
  })
  .catch((err) => {
    console.log(`DB Connection Error: ${err.message}`);
    process.exit(1); 
  });
