const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;

// ── Middleware ──────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Serve all HTML/CSS from the parent folder as static files
app.use(express.static(path.join(__dirname, "..")));

// ── Helpers ─────────────────────────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, "data");

function readJSON(filename) {
  return JSON.parse(fs.readFileSync(path.join(DATA_DIR, filename), "utf-8"));
}

function writeJSON(filename, data) {
  fs.writeFileSync(
    path.join(DATA_DIR, filename),
    JSON.stringify(data, null, 2),
    "utf-8"
  );
}

// ════════════════════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ════════════════════════════════════════════════════════════════════════════

// POST /api/signup/admin
app.post("/api/signup/admin", (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ success: false, message: "ID and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  const db = readJSON("users.json");
  const exists = db.admins.find((a) => a.id === id);
  if (exists) {
    return res.status(409).json({ success: false, message: "Admin ID already exists." });
  }

  db.admins.push({ id, password });
  writeJSON("users.json", db);
  res.json({ success: true, message: "Admin account created." });
});

// POST /api/signup/user
app.post("/api/signup/user", (req, res) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ success: false, message: "ID and password are required." });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  const db = readJSON("users.json");
  const exists = db.users.find((u) => u.id === id);
  if (exists) {
    return res.status(409).json({ success: false, message: "User ID already exists." });
  }

  db.users.push({ id, password });
  writeJSON("users.json", db);
  res.json({ success: true, message: "User account created." });
});

// POST /api/login/admin
app.post("/api/login/admin", (req, res) => {
  const { id, password } = req.body;
  const db = readJSON("users.json");
  const admin = db.admins.find((a) => a.id === id && a.password === password);
  if (admin) {
    res.json({ success: true, message: "Admin login successful." });
  } else {
    res.status(401).json({ success: false, message: "Invalid Admin ID or Password." });
  }
});

// POST /api/login/user
app.post("/api/login/user", (req, res) => {
  const { id, password } = req.body;
  const db = readJSON("users.json");
  const user = db.users.find((u) => u.id === id && u.password === password);
  if (user) {
    res.json({ success: true, message: "User login successful." });
  } else {
    res.status(401).json({ success: false, message: "Invalid User ID or Password." });
  }
});

// ════════════════════════════════════════════════════════════════════════════
//  HOSPITAL ROUTES
// ════════════════════════════════════════════════════════════════════════════

// GET /api/hospitals  → list all hospitals (id + name only)
app.get("/api/hospitals", (req, res) => {
  const db = readJSON("hospitals.json");
  const list = db.hospitals.map((h) => ({ id: h.id, name: h.name }));
  res.json(list);
});

// GET /api/hospitals/:id  → full details of one hospital
app.get("/api/hospitals/:id", (req, res) => {
  const db = readJSON("hospitals.json");
  const hospital = db.hospitals.find((h) => h.id === req.params.id);
  if (!hospital) return res.status(404).json({ message: "Hospital not found." });
  res.json(hospital);
});

// ── Admin update sub-routes ──────────────────────────────────────────────────

// Helper to get & save a hospital by id
function getHospital(id, db) {
  return db.hospitals.find((h) => h.id === id);
}

// PUT /api/hospitals/:id/beds
app.put("/api/hospitals/:id/beds", (req, res) => {
  const { total, available } = req.body;
  const db = readJSON("hospitals.json");
  const h = getHospital(req.params.id, db);
  if (!h) return res.status(404).json({ message: "Hospital not found." });

  h.beds = { total: Number(total), available: Number(available) };
  writeJSON("hospitals.json", db);
  res.json({ success: true, beds: h.beds });
});

// PUT /api/hospitals/:id/medicines  (add or update a medicine)
app.put("/api/hospitals/:id/medicines", (req, res) => {
  const { name, stock } = req.body;
  const db = readJSON("hospitals.json");
  const h = getHospital(req.params.id, db);
  if (!h) return res.status(404).json({ message: "Hospital not found." });

  const existing = h.medicines.find((m) => m.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.stock = Number(stock);
  } else {
    h.medicines.push({ name, stock: Number(stock) });
  }
  writeJSON("hospitals.json", db);
  res.json({ success: true, medicines: h.medicines });
});

// PUT /api/hospitals/:id/bloodbank
app.put("/api/hospitals/:id/bloodbank", (req, res) => {
  const { type, units } = req.body;
  const db = readJSON("hospitals.json");
  const h = getHospital(req.params.id, db);
  if (!h) return res.status(404).json({ message: "Hospital not found." });

  h.bloodBank[type] = Number(units);
  writeJSON("hospitals.json", db);
  res.json({ success: true, bloodBank: h.bloodBank });
});

// PUT /api/hospitals/:id/doctors  (add or update a doctor)
app.put("/api/hospitals/:id/doctors", (req, res) => {
  const { name, department, timing } = req.body;
  const db = readJSON("hospitals.json");
  const h = getHospital(req.params.id, db);
  if (!h) return res.status(404).json({ message: "Hospital not found." });

  const existing = h.doctors.find((d) => d.name.toLowerCase() === name.toLowerCase());
  if (existing) {
    existing.department = department;
    existing.timing = timing;
  } else {
    h.doctors.push({ name, department, timing });
  }
  writeJSON("hospitals.json", db);
  res.json({ success: true, doctors: h.doctors });
});

// PUT /api/hospitals/:id/opsections  (add or update OP section)
app.put("/api/hospitals/:id/opsections", (req, res) => {
  const { department, time } = req.body;
  const db = readJSON("hospitals.json");
  const h = getHospital(req.params.id, db);
  if (!h) return res.status(404).json({ message: "Hospital not found." });

  const existing = h.opSections.find((o) => o.department.toLowerCase() === department.toLowerCase());
  if (existing) {
    existing.time = time;
  } else {
    h.opSections.push({ department, time });
  }
  writeJSON("hospitals.json", db);
  res.json({ success: true, opSections: h.opSections });
});

// PUT /api/hospitals/:id/facilities  (add a facility)
app.put("/api/hospitals/:id/facilities", (req, res) => {
  const { facility } = req.body;
  const db = readJSON("hospitals.json");
  const h = getHospital(req.params.id, db);
  if (!h) return res.status(404).json({ message: "Hospital not found." });

  if (!h.facilities.includes(facility)) {
    h.facilities.push(facility);
    writeJSON("hospitals.json", db);
  }
  res.json({ success: true, facilities: h.facilities });
});

// ── Start server ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Smart Hospital backend running at http://localhost:${PORT}`);
  console.log(`   API base: http://localhost:${PORT}/api`);
});
