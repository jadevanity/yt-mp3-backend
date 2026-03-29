const express = require("express");
const ytdl = require("ytdl-core");
const ffmpeg = require("fluent-ffmpeg");
const ffmpegPath = require("ffmpeg-static");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

ffmpeg.setFfmpegPath(ffmpegPath);

const app = express();
app.use(cors());
app.use(express.json());

// Create downloads folder
const DOWNLOAD_DIR = path.join(__dirname, "downloads");
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

// Convert endpoint
app.post("/convert", async (req, res) => {
  const { url } = req.body;

  if (!url || !ytdl.validateURL(url)) {
    return res.json({ success: false, error: "Invalid URL" });
  }

  const id = Date.now();
  const filePath = path.join(DOWNLOAD_DIR, `${id}.mp3`);

  try {
    const stream = ytdl(url, { quality: "highestaudio" });

    ffmpeg(stream)
      .audioBitrate(128)
      .save(filePath)
      .on("end", () => {
        res.json({
          success: true,
          download: `/download/${id}`
        });
      })
      .on("error", (err) => {
        console.error("FFMPEG ERROR:", err);
        res.json({ success: false, error: "Conversion failed" });
      });

  } catch (err) {
    console.error("SERVER ERROR:", err);
    res.json({ success: false, error: "Server error" });
  }
});

// Download endpoint
app.get("/download/:id", (req, res) => {
  const file = path.join(DOWNLOAD_DIR, `${req.params.id}.mp3`);

  if (fs.existsSync(file)) {
    res.download(file);
  } else {
    res.status(404).send("File not found");
  }
});

// Root test route (optional but helpful)
app.get("/", (req, res) => {
  res.send("YouTube MP3 backend is running");
});

// IMPORTANT: Use Render port
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
