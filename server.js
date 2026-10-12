const express = require("express");
const { createClient } = require("@supabase/supabase-js");

const app = express();
app.use(express.json());

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// POST /register — called by the Roblox script
app.post("/register", async (req, res) => {
  const { placeId, universeId, gameName, creatorId } = req.body;
  if (!placeId || !gameName) {
    return res.status(400).json({ error: "Missing placeId or gameName" });
  }

  const { error } = await supabase.from("games").upsert(
    {
      place_id: String(placeId),
      universe_id: universeId != null ? String(universeId) : null,
      game_name: String(gameName),
      creator_id: creatorId != null ? String(creatorId) : null,
    },
    { onConflict: "place_id", ignoreDuplicates: true }
  );

  if (error) return res.status(500).json({ error: error.message });
  res.json({ status: "ok" });
});

// GET /games — used by the HTML page
app.get("/games", async (req, res) => {
  const { data, error } = await supabase
    .from("games")
    .select("*")
    .order("first_seen", { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// Health check for UptimeRobot
app.get("/health", (req, res) => res.status(200).send("OK"));

// Serve the embedded HTML page at the root
app.get("/", (req, res) => {
  res.type("html").send(HTML_PAGE);
});

// ---------- Embedded HTML ----------
const HTML_PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Script Detector</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: #0f0f0f; color: #fff; padding: 2rem; }
  h1 { text-align: center; margin-bottom: .5rem; color: #00d4ff; }
  .subtitle { text-align: center; color: #888; margin-bottom: 2rem; }
  #loader { text-align: center; padding: 3rem; color: #888; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 1.5rem; max-width: 1200px; margin: 0 auto; }
  .card { background: #1a1a2e; border-radius: 12px; overflow: hidden; border: 1px solid #2a2a4a; }
  .card img { width: 100%; aspect-ratio: 16/9; object-fit: cover; background: #222; }
  .card-body { padding: 1rem; }
  .card-body h3 { font-size: .95rem; margin-bottom: .5rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .card-body .id { font-size: .75rem; color: #666; margin-bottom: .75rem; }
  .join-btn { display: inline-block; background: #00d4ff; color: #000; font-weight: 700; padding: .5rem 1.2rem; border-radius: 6px; text-decoration: none; font-size: .85rem; }
  .empty { text-align: center; padding: 3rem; color: #666; }
</style>
</head>
<body>
<h1>&#128269; Script Detector</h1>
<p class="subtitle">Games that contain my script</p>
<div id="loader">Loading games...</div>
<div class="grid" id="grid"></div>
<script>
  async function thumb(id) {
    try {
      const r = await fetch('https://thumbnails.roblox.com/v1/games/multiget/thumbnails?universeIds=' + id + '&size=768x432&format=Png&isCircular=false');
      const d = await r.json();
      return d.data?.[0]?.thumbnails?.[0]?.imageUrl || null;
    } catch { return null; }
  }
  async function load() {
    const loader = document.getElementById('loader');
    const grid = document.getElementById('grid');
    const res = await fetch('/games');
    const games = await res.json();
    if (!games.length) {
      loader.style.display = 'none';
      grid.innerHTML = '<div class="empty">No games detected yet.</div>';
      return;
    }
    const cards = await Promise.all(games.map(async g => {
      const t = g.universe_id ? await thumb(g.universe_id) : null;
      const img = t || 'https://via.placeholder.com/768x432/222/666?text=No+Thumbnail';
      const name = String(g.game_name).replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]));
      return '<div class="card"><img src="' + img + '" alt="' + name + '"><div class="card-body"><h3>' + name + '</h3><div class="id">Place ID: ' + g.place_id + '</div><a class="join-btn" href="https://www.roblox.com/games/' + g.place_id + '/" target="_blank">&#9654; Join Game</a></div></div>';
    }));
    loader.style.display = 'none';
    grid.innerHTML = cards.join('');
  }
  load();
  setInterval(load, 30000);
</script>
</body>
</html>`;

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
