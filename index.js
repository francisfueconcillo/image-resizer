require('dotenv').config();
const { Storage } = require('@google-cloud/storage');
const { PubSub } = require('@google-cloud/pubsub');
const sharp = require('sharp');
const fs = require('fs/promises');
const path = require('path');

const storage = new Storage({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
const bucket = storage.bucket(process.env.FIREBASE_STORAGE_BUCKET);
const pubsub = new PubSub({ keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS });
const subscription = pubsub.subscription(process.env.PUBSUB_SUBSCRIPTION);

const sizes = {
  small: 320,
  medium: 640,
  large: 1280,
};

async function resizeAndUpload(tempFile, originalPath) {
  const segments = originalPath.split('/');
  const baseDir = segments.slice(0, 2).join('/'); // "item/12345"
  const filename = segments[segments.length - 1];


  for (const [size, width] of Object.entries(sizes)) {
    const directory = `${baseDir}/${size}`;
    const resizedBuffer = await sharp(tempFile).resize({ width }).toBuffer();
    const destinationPath = `${directory}/${filename}`;
    await bucket.file(destinationPath).save(resizedBuffer, {
      contentType: 'image/jpeg',
      resumable: false,
    });
    console.log(`✅ Uploaded: ${destinationPath}`);
  }
}

subscription.on('message', async (message) => {
  const { filePath } = JSON.parse(message.data.toString());
  const localTemp = `/tmp/${path.basename(filePath)}`;

  try {
    await bucket.file(filePath).download({ destination: localTemp });
    console.log(`📥 Downloaded: ${filePath}`);

    await resizeAndUpload(localTemp, filePath);
    await fs.unlink(localTemp);
    message.ack();
  } catch (err) {
    console.error('❌ Error processing message:', err);
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