import express from "express";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import { connectDB, getDB } from "./db.js";
import userRoutes from "./routes/userRoutes.js";
import productsRoutes from "./routes/productsRoutes.js";
import petsRoutes from "./routes/petsRoutes.js";
import adminRoutes from "./routes/adminroutes.js";
import ordersRoutes from "./routes/ordersRoutes.js";

import { initFirebase } from "./firebaseAdmin.js"; // ✅ correct
  
dotenv.config();
// initFirebase();

const app = express();
app.use(express.json());
app.use(cors());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "../public")));
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

await connectDB();
const db = getDB();

const users = db.collection("users");
const products = db.collection("products");
const pets = db.collection("pets");
const orders = db.collection("orders");

app.use("/users", userRoutes(users));
app.use("/products", productsRoutes(products));
app.use("/pets", petsRoutes(pets, users));
app.use("/admin", adminRoutes(users, pets, products))
app.use("/orders", ordersRoutes(orders, users));

app.get("/api/health", (req, res) => res.json({ ok: true }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Server http://localhost:${port}`));
