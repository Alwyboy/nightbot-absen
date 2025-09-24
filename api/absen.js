import express from "express";
import { createClient } from "@supabase/supabase-js";

const app = express();
app.use(express.json());

// Supabase client
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper: nomor absen berikutnya
async function getNextNumber() {
  const { data } = await supabase
    .from("attendance")
    .select("number")
    .order("number", { ascending: false })
    .limit(1);
  if (data && data.length > 0) return data[0].number + 1;
  return 1;
}

app.get("/api/absen", async (req, res) => {
  const user = (req.query.user || "anonymous").toLowerCase();
  const command = (req.query.command || "").toLowerCase();

  if (!user || !command) return res.send("Parameter user & command diperlukan!");

  // ==== Fleksibel: semua kata yang mengandung "absen" ====
  if (command.includes("absen") && !command.includes("cekabsen") && !command.includes("reset")) {
    const { data: existing } = await supabase
      .from("attendance")
      .select("*")
      .eq("username", user)
      .limit(1);

    if (existing && existing.length > 0) {
      return res.send(`Halo ${user}, kamu sudah absen dengan nomor ${existing[0].number}.`);
    }

    const nextNumber = await getNextNumber();
    await supabase.from("attendance").insert([{ username: user, number: nextNumber }]);
    return res.send(`Halo ${user}, absen kamu tercatat dengan nomor ${nextNumber}.`);
  }

  // ==== Debug cekabsen ====
  if (command.includes("cekabsen")) {
    const { data: all, error } = await supabase
      .from("attendance")
      .select("*")
      .order("number");

    if (error) return res.send(`Error mengakses database: ${error.message}`);

    if (!all || all.length === 0) return res.send("Belum ada yang absen. (0 row terdeteksi)");

    const list = all.map(a => `${a.number}. ${a.username}`).join(", ");
    return res.send(`Jumlah row terdeteksi: ${all.length}. Daftar absen: ${list}`);
  }

  // ==== Reset absen ====
  if (command.includes("resetabsen")) {
    await supabase.from("attendance").delete().neq("id", 0);
    return res.send("Absensi berhasil di-reset. Siap mulai lagi!");
  }

  return res.send("Command tidak dikenali. Gunakan: absen, cekabsen, resetabsen.");
});

export default app;
