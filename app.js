const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set } = require('firebase/database');
const { getStorage, ref: storageRef, uploadBytes, getDownloadURL } = require('firebase/storage');
const cors = require('cors');
const multer = require('multer');

// Initialize Express
const app = express();
const port = 3000;

// Firebase configuration (using your keys directly)
const firebaseConfig = {
    apiKey: "AIzaSyDi5PhsL1GoiFBNUoDBwGJt7d8T76SapXI",
    authDomain: "bannergen-9e841.firebaseapp.com",
    projectId: "bannergen-9e841",
    storageBucket: "bannergen-9e841.appspot.com",
    messagingSenderId: "143117302117",
    appId: "1:143117302117:web:0b13cf47880796ff2fc98c",
    measurementId: "G-GZ4CWD05GN",
    databaseURL: "https://bannergen-9e841-default-rtdb.firebaseio.com" // Corrected Realtime Database URL
};

// Initialize Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);  // Initialize the Realtime Database
const storage = getStorage(firebaseApp);    // Initialize Firebase Storage

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(process.cwd(), 'public')));

// Configure multer for file uploads
const upload = multer({ storage: multer.memoryStorage() }); // Store files in memory

// Function to upload an image to Firebase Storage
async function uploadImage(file) {
    const storageReference = storageRef(storage, 'images/' + file.originalname);
    await uploadBytes(storageReference, file.buffer);
    const downloadURL = await getDownloadURL(storageReference);
    return downloadURL;
}

// Route to handle the POST request for content generation
app.post('/generate', upload.single('image'), async (req, res) => {
    const { offer, colorPalette, theme, outputSize } = req.body;

    if (!offer || !colorPalette || !theme || !outputSize || !req.file) {
        return res.status(400).json({ message: "All fields are required, including the image." });
    }

    try {
        // Generate a unique ID for this content (using current timestamp)
        const contentId = Date.now().toString();

        // Upload the image to Firebase Storage
        const imageUrl = await uploadImage(req.file);

        // Save form data to Firebase Realtime Database with a unique ID
        await set(ref(database, 'content/' + contentId), {
            imageUrl,       // Store the uploaded image URL
            offer,          // Offer text
            colorPalette,   // Color palette
            theme,          // Theme
            outputSize,     // Output size
            createdAt: new Date().toISOString() // Timestamp of when it was created
        });

        // Respond back with the image URL and success message
        res.json({
            message: "Content generated and saved successfully!",
            imageUrl,
            contentId
        });
    } catch (error) {
        console.error('Error saving content:', error);
        res.status(500).json({ message: "Error saving content.", error: error.message });
    }
});

// Serve index.html on the root route
app.get('/', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'public', 'index.html'));
});

// Start the server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
