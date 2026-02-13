# Image Resizer
A background worker that resizes images from Firebase Cloud Storage.



## Setup
- Create PubSub topic and subscription
- `gcloud pubsub subscriptions create <subscription-name> \
  --topic=<topic> \
  --project=<project-id>`

- Track pubsub messages
- `gcloud pubsub subscriptions pull <subscription-name> --limit=5 --project <project-id>`