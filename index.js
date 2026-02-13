require('dotenv').config();
const { PubSub } = require('@google-cloud/pubsub');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');
const os = require('os');
const { put } = require('@vercel/blob');

const pubsub = new PubSub({
  keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});

const subscription = pubsub.subscription(process.env.PUBSUB_SUBSCRIPTION);

const sizes = {
  small: 320,
  medium: 640,
  large: 1280,
};

async function downloadFromBlob(url, localPath) {
  const response = await fetch(url);
  const buffer = Buffer.from(await response.arrayBuffer());
  await fs.writeFile(localPath, buffer);
}

async function resizeAndUpload(localTemp, filePath) {
  const segments = filePath.split('/');
  const baseDir = segments.slice(0, 2).join('/'); // item/123
  const filename = segments[segments.length - 1];

  for (const [size, width] of Object.entries(sizes)) {
    const directory = `${baseDir}/${size}`;
    const destinationPath = `${directory}/${filename}`;

    const resizedBuffer = await sharp(localTemp)
      .resize({ width })
      .jpeg({ quality: 85 })
      .toBuffer();

    await put(destinationPath, resizedBuffer, {
      access: 'public',
      contentType: 'image/jpeg',
      token: process.env.BLOB_READ_WRITE_TOKEN,
    });

    console.log(`✅ Uploaded: ${destinationPath}`);
  }
}

subscription.on('message', async (message) => {
  const { filePath } = message.json;

  console.log(`📩 Received message for: ${filePath}`);

  const filename = path.basename(filePath);
  const localTemp = path.join(os.tmpdir(), filename);

  try {
    // Blob public URL format:
    const blobUrl = `${process.env.BLOB_BASE_URL}/${filePath}`;

    console.log(`📥 Downloading from: ${blobUrl}`);

    await downloadFromBlob(blobUrl, localTemp);

    await resizeAndUpload(localTemp, filePath);

    await fs.unlink(localTemp);

    message.ack();
    console.log('✅ Message acknowledged');
  } catch (err) {
    console.error('❌ Processing failed:', err);
    // Do NOT ack → PubSub will retry
  }
});


// Adding a route so it can be run as a web service
const express = require('express');
const app = express();

const PORT = process.env.PORT || 3000;
app.get('/', (req, res) => res.send('Image resizer worker is running!'));
app.listen(PORT, () => {
  console.log(`Web server listening on port ${PORT}`);
});