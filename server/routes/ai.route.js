import { Router } from "express";
import { generateIdeas, generateCopy, generateCreative } from "../services/gemini.service.js";

const router = Router();
function validate(body, fields) {
  for (const [field, label] of fields) {
    if (typeof body?.[field] !== "string" || !body[field].trim()) return `${label} is required`;
    if (body[field].length > 3000) return `${label} must be under 3000 characters`;
  }
  return null;
}
async function handle(req, res, required, generator) {
  const error = validate(req.body, required);
  if (error) return res.status(400).json({ message: error });
  try { res.json(await generator(req.body)); }
  catch (err) { console.error("AI route error:", err.message); res.status(err.status || 502).json({ message: err.message || "Generation failed" }); }
}
router.post("/ideas", (req,res) => handle(req,res, [["campaignName","Campaign name"],["audience","Target audience"],["offer","Offer / key message"]], generateIdeas));
router.post("/creative", (req,res) => handle(req,res, [["campaignName","Campaign name"],["audience","Target audience"],["offer","Offer / key message"]], generateCreative));
router.post("/copy", (req,res) => handle(req,res, [["campaignName","Campaign name"],["audience","Target audience"],["offer","Offer / key message"]], generateCopy));
export default router;
