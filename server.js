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

const DOWNLOAD_DIR = path.join(__dirname, "downloads");
if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR);

app.post("/convert", async (req, res) => {
  const { url } = req.body;

  if (!ytdl.validateURL(url)) {
    return res.json({ success: false });
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
      });

  } catch (err) {
    res.json({ success: false });
  }
});

app.get("/download/:id", (req, res) => {
  const file = path.join(DOWNLOAD_DIR, `${req.params.id}.mp3`);
  res.download(file);
});

app.listen(3000, () => console.log("Server running on port 3000"));