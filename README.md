# Image Resizer
A background worker that resizes images from Firebase Cloud Storage.



## Setup
- Create PubSub topic and subscription
- `gcloud pubsub subscriptions create image-resizer-sub \
  --topic=ibentamo-new-images \
  --project=<project-id>`