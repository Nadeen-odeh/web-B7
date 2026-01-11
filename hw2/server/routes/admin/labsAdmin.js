import express from "express";
import { db } from "../../server.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";

const router = express.Router();

router.get("/labs/:yearbook/:semester", requireAdmin, async (req, res) => {
  const doc = await db
    .collection("lab_schedule")
    .doc(req.params.yearbook)
    .collection("semesters")
    .doc(String(req.params.semester))
    .get();

  if (!doc.exists) return res.status(404).json({ error: "not found" });
  res.json({ doc: doc.data() });
});

router.put("/labs/:yearbook/:semester", requireAdmin, async (req, res) => {
  await db
    .collection("lab_schedule")
    .doc(req.params.yearbook)
    .collection("semesters")
    .doc(String(req.params.semester))
    .set(req.body, { merge: false });

  res.json({ ok: true });
});

export default router;
