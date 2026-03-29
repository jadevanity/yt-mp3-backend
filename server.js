const express = require("express");
const ytdl = require("@distube/ytdl-core");
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
if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
}

app.get("/", (req, res) => {
  res.send("YouTube MP3 backend is running");
});

app.post("/convert", async (req, res) => {
  const { url } = req.body;

  if (!url || !ytdl.validateURL(url)) {
    return res.status(400).json({
      success: false,
      error: "Invalid YouTube URL"
    });
  }

  const id = Date.now().toString();
  const filePath = path.join(DOWNLOAD_DIR, `${id}.mp3`);

  let responded = false;

  try {
    const info = await ytdl.getInfo(url);
    const audioStream = ytdl.downloadFromInfo(info, {
      quality: "highestaudio",
      filter: "audioonly",
      highWaterMark: 1 << 25
    });

    ffmpeg(audioStream)
      .audioBitrate(128)
      .format("mp3")
      .on("end", () => {
        if (!responded) {
          responded = true;
          res.json({
            success: true,
            download: `/download/${id}`
          });
        }
      })
      .on("error", (err) => {
        console.error("FFMPEG ERROR:", err);
        if (!responded) {
          responded = true;
          res.status(500).json({
            success: false,
            error: err.message || "FFmpeg conversion failed"
          });
        }
      })
      .save(filePath);
  } catch (err) {
    console.error("CONVERT ERROR:", err);
    if (!responded) {
      responded = true;
      res.status(500).json({
        success: false,
        error: err.message || "Download/conversion failed"
      });
    }
  }
});

app.get("/download/:id", (req, res) => {
  const file = path.join(DOWNLOAD_DIR, `${req.params.id}.mp3`);

  if (!fs.existsSync(file)) {
    return res.status(404).send("File not found");
  }

  res.download(file, (err) => {
    if (err) {
      console.error("DOWNLOAD ERROR:", err);
    } else {
      fs.unlink(file, (unlinkErr) => {
        if (unlinkErr) {
          console.error("CLEANUP ERROR:", unlinkErr);
        }
      });
    }
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
