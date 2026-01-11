import express from "express";
import { db } from "../../server.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";

const router = express.Router();

router.get("/advisors", requireAdmin, async (req, res) => {
  const snap = await db.collection("academicAdvisors").get();
  res.json({
    advisors: snap.docs.map((d) => ({ id: d.id, ...d.data() })),
  });
});

router.post("/advisors/:advisorId", requireAdmin, async (req, res) => {
  await db
    .collection("academicAdvisors")
    .doc(req.params.advisorId)
    .set(req.body, { merge: true });

  res.json({ ok: true });
});

router.delete("/advisors/:advisorId", requireAdmin, async (req, res) => {
  await db.collection("academicAdvisors").doc(req.params.advisorId).delete();
  res.json({ ok: true });
});

export default router;
