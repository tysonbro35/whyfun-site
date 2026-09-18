// Waitlist submissions from /join. The page posts here (same origin), this
// checks the fields and forwards them to a GoHighLevel inbound webhook, whose
// URL lives in the GHL_WEBHOOK_URL environment variable on Vercel. Nothing is
// stored here.
module.exports = async function (req, res) {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ ok: false, error: "method" });
  }
  const url = process.env.GHL_WEBHOOK_URL;
  if (!url) return res.status(503).json({ ok: false, error: "not connected" });

  const b = (req.body && typeof req.body === "object") ? req.body : {};
  const clean = (v, n) => String(v || "").replace(/\s+/g, " ").trim().slice(0, n);
  const name = clean(b.name, 120), email = clean(b.email, 200), phone = clean(b.phone, 40);

  // the hidden "company" field is a honeypot: people never fill it, bots do
  if (clean(b.company, 10)) return res.status(200).json({ ok: true });

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || phone.replace(/\D/g, "").length < 7) {
    return res.status(400).json({ ok: false, error: "invalid" });
  }

  const payload = {
    name, email, phone,
    first_name: name.split(" ")[0],
    last_name: name.split(" ").slice(1).join(" "),
    source: "whyfun.org waitlist",
    page: "/join",
    submitted_at: new Date().toISOString(),
  };
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    if (!r.ok) return res.status(502).json({ ok: false, error: "upstream " + r.status });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "upstream" });
  }
  return res.status(200).json({ ok: true });
};
