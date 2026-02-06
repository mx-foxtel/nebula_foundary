
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { movieChat } = require('./movie-chat');
const { searchVAIS } = require('./vais');
const logger = require('./logger');
const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

const db = admin.firestore();

const app = express();

// Security configuration
const API_KEY = process.env.API_KEY || '';

app.use(cors());
app.use(express.json());

// API Key authentication middleware
const apiKeyAuth = (req, res, next) => {
  // Skip auth if no API key is configured (development mode)
  if (!API_KEY) {
    return next();
  }

  const providedKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!providedKey || providedKey !== API_KEY) {
    logger.warn(`Unauthorized request to ${req.path} from ${req.ip}`);
    return res.status(401).json({ error: 'Unauthorized: Invalid or missing API key' });
  }

  next();
};

// Health check endpoint (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Apply API key auth to all /api routes
app.use('/api', apiKeyAuth);

const { Storage } = require('@google-cloud/storage');
const { PubSub } = require('@google-cloud/pubsub');
const storage = new Storage();
const pubsub = new PubSub();

app.get('/api/movies', async (req, res) => {
  try {

    const collectionName = process.env.FIRESTORE_COLLECTION || 'media_assets';
    const moviesCollection = db.collection(collectionName);
    const snapshot = await moviesCollection.get();
    if (snapshot.empty) {

      return res.status(404).send('No movies found');
    }
    const movies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const moviesWithSignedUrls = await Promise.all(movies.map(async (movie) => {
      logger.log(`Processing movie: ${movie.id}, source: ${movie.source}, file_path: ${movie.file_path}`);

      // Check if it's a YouTube video (explicit source OR detected in file_path)
      const isYouTube = movie.source === 'youtube' ||
        (movie.file_path && (movie.file_path.includes('youtube.com') || movie.file_path.includes('youtu.be')));

      if (isYouTube) {
        // Clean up file_path if it was accidentally prefixed with gs://
        let cleanUrl = movie.file_path;
        if (cleanUrl && cleanUrl.startsWith('gs://')) {
          cleanUrl = cleanUrl.replace('gs://', '');
        }

        // If public_url is missing or looks like a GCS signed URL (which would be wrong for YT), use the clean URL
        if (!movie.public_url || movie.public_url.startsWith('https://storage.googleapis.com/')) {
          movie.public_url = cleanUrl;
        }

        // Ensure source is set correctly for the frontend to render the YouTube player
        movie.source = 'youtube';
        return movie;
      }

      if ((!movie.public_url || !movie.public_url.startsWith('https://storage.googleapis.com/')) && movie.file_path && movie.file_path.startsWith('gs://')) {
        try {
          const [bucketName, ...filePathParts] = movie.file_path.replace('gs://', '').split('/');
          const gcsPath = filePathParts.join('/');
          const options = {
            version: 'v4',
            action: 'read',
            expires: Date.now() + 15 * 60 * 1000, // 15 minutes
          };
          const [url] = await storage.bucket(bucketName).file(gcsPath).getSignedUrl(options);
          movie.public_url = url;
        } catch (error) {
          logger.error(`Error generating signed URL for ${movie.file_path}:`, error);
          // Leave public_url as is if signing fails
        }
      }
      return movie;
    }));


    res.json(moviesWithSignedUrls);
  } catch (error) {
    logger.error('Error fetching movies:', error);
    res.status(500).send('Error fetching movies');
  }
});

// Upload endpoints
const GCS_UPLOAD_BUCKET = process.env.GCS_UPLOAD_BUCKET || 'poc-metadata-gen2-input';
const PUBSUB_INGESTION_TOPIC = process.env.PUBSUB_INGESTION_TOPIC || 'central-ingestion-topic';

app.post('/api/upload/signed-url', async (req, res) => {
  try {
    const { fileName, contentType } = req.body;

    if (!fileName || !contentType) {
      return res.status(400).json({ error: 'fileName and contentType are required' });
    }

    // Generate a unique asset ID
    const timestamp = Date.now();
    const sanitizedName = fileName.replace(/[^a-zA-Z0-9.-]/g, '-').toLowerCase();
    const baseName = sanitizedName.replace(/\.[^/.]+$/, '');
    const extension = sanitizedName.split('.').pop();
    const assetId = `${baseName}-${timestamp}`;
    const filePath = `uploads/${assetId}.${extension}`;

    const bucket = storage.bucket(GCS_UPLOAD_BUCKET);
    const file = bucket.file(filePath);

    const [signedUrl] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType: contentType,
    });

    res.json({
      signedUrl,
      assetId,
      filePath: `gs://${GCS_UPLOAD_BUCKET}/${filePath}`,
    });
  } catch (error) {
    logger.error('Error generating signed URL:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
});

app.post('/api/upload/publish', async (req, res) => {
  try {
    const { assetId, fileName, filePath, contentType } = req.body;

    if (!assetId || !fileName || !filePath || !contentType) {
      return res.status(400).json({ error: 'assetId, fileName, filePath, and contentType are required' });
    }

    // Determine file category from content type
    let fileCategory = 'video';
    if (contentType.startsWith('audio/')) {
      fileCategory = 'audio';
    }

    // Extract base file name without extension
    const baseName = fileName.replace(/\.[^/.]+$/, '');

    const message = {
      asset_id: assetId,
      file_location: filePath,
      content_type: contentType,
      file_category: fileCategory,
      file_name: baseName,
      source: 'GCS',
    };

    const topic = pubsub.topic(PUBSUB_INGESTION_TOPIC);
    const messageBuffer = Buffer.from(JSON.stringify(message));
    const messageId = await topic.publishMessage({ data: messageBuffer });

    logger.log(`Published message ${messageId} for asset ${assetId}`);

    res.json({ success: true, messageId });
  } catch (error) {
    logger.error('Error publishing message:', error);
    res.status(500).json({ error: 'Failed to publish message' });
  }
});

app.get('/api/upload/status/:assetId', async (req, res) => {
  try {
    const { assetId } = req.params;

    if (!assetId) {
      return res.status(400).json({ error: 'assetId is required' });
    }

    const collectionName = process.env.FIRESTORE_COLLECTION || 'media_assets';
    const docRef = db.collection(collectionName).doc(assetId);
    const doc = await docRef.get();

    if (!doc.exists) {
      // Asset not yet created - return pending status
      return res.json({
        assetId,
        fileName: assetId,
        summary: { status: 'pending' },
        transcription: { status: 'pending' },
        previews: { status: 'pending' },
      });
    }

    const data = doc.data();

    // Map the Firestore data to status response
    const response = {
      assetId,
      fileName: data.file_name || assetId,
      summary: {
        status: data.summary?.status || (data.summary ? 'completed' : 'pending'),
        data: data.summary,
      },
      transcription: {
        status: data.transcription?.status || (data.transcription ? 'completed' : 'pending'),
        data: data.transcription,
      },
      previews: {
        status: data.previews?.status || (data.previews?.clips?.length > 0 ? 'completed' : 'pending'),
        data: data.previews,
      },
    };

    res.json(response);
  } catch (error) {
    logger.error('Error fetching asset status:', error);
    res.status(500).json({ error: 'Failed to fetch asset status' });
  }
});

app.get('/api/search', async (req, res) => {
  const { q } = req.query;

  if (!q) {
    return res.status(400).send('Query parameter "q" is required');
  }
  try {
    logger.log('Search query: ', q)
    const results = await searchVAIS(q);
    logger.log('Search query provided results.')

    res.json(results);
  } catch (error) {
    logger.error('Error in search endpoint:', error);
    res.status(500).send('Error performing search');
  }
});

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*'
  }
});

const PORT = process.env.PORT || 3001;

// Socket.IO authentication middleware
io.use((socket, next) => {
  // Skip auth if no API key is configured (development mode)
  if (!API_KEY) {
    return next();
  }

  const apiKey = socket.handshake.auth?.apiKey || socket.handshake.query?.apiKey;

  if (!apiKey || apiKey !== API_KEY) {
    logger.warn(`Unauthorized Socket.IO connection attempt from ${socket.handshake.address}`);
    return next(new Error('Unauthorized: Invalid or missing API key'));
  }

  next();
});

io.on('connection', (socket) => {
  logger.log(`Socket.IO client connected: ${socket.id}`);

  socket.on('disconnect', () => {
    logger.log(`Socket.IO client disconnected: ${socket.id}`);
  });

  socket.on('chat message', async (msg) => {
    try {
      const result = await movieChat(msg);
      socket.emit('chat message', result);
    } catch (e) {
      logger.error(e);
      socket.emit('error', 'An error occurred');
    }
  });
});

server.listen(PORT, () => {

});