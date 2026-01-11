import express from "express";
import cors from "cors";
import "dotenv/config";
import firebase_admin from "firebase-admin";
import { readFileSync } from "fs";

// routes
import yearbooksRoutes from "./routes/public/yearbooks.js";
import labsRoutes from "./routes/public/labs.js";
import advisorRoutes from "./routes/public/advisor.js";
import askRoutes from "./routes/public/ask.js";

import coursesAdminRoutes from "./routes/admin/coursesAdmin.js";
import advisorsAdminRoutes from "./routes/admin/advisorsAdmin.js";
import labsAdminRoutes from "./routes/admin/labsAdmin.js";
import uploadAdminRoutes from "./routes/admin/uploadAdmin.js";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/files", express.static("files"));
app.use("/api", askRoutes);
// ======================
// Firebase init
// ======================
if (!firebase_admin.apps.length) {
  const serviceAccount = JSON.parse(
    readFileSync("./keys/serviceAccountKey.json", "utf8")
  );

  firebase_admin.initializeApp({
    credential: firebase_admin.credential.cert(serviceAccount),
  });
}

export const db = firebase_admin.firestore();

// ======================
// Routes
// ======================
app.use("/api", yearbooksRoutes);
app.use("/api", labsRoutes);
app.use("/api", advisorRoutes);

app.use("/api/admin", coursesAdminRoutes);
app.use("/api/admin", advisorsAdminRoutes);
app.use("/api/admin", labsAdminRoutes);
app.use("/api/admin", uploadAdminRoutes);
app.use("/api", askRoutes);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
