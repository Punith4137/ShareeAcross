// 🌐 Import required modules
const express = require('express');         // Framework for server
const multer = require('multer');           // Middleware for handling file uploads
const cors = require('cors');               // Middleware to allow Cross-Origin requests
const fs = require('fs');                   // Node.js File System module
const path = require('path');               // For handling file & directory paths

// 🛠 Initialize the Express app
const app = express();
const port = 3000;                          // Server will run on localhost:3000

// 🔧 Middleware Setup
app.use(cors());                            // Enable CORS for all requests
app.use(express.static(__dirname));         // Serve static files from root directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files statically

// 🧠 In-memory object to store filenames temporarily
const fileDB = {};

// 🔢 Utility function to generate a 6-character alphanumeric code
function generateCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; // Characters to choose from
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length)); // Random char added
  }
  return code;
}

// 💾 Configure multer's dynamic storage system
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const code = req.query.code;                         // Get share code from URL query
    if (!code) return cb(new Error("No code provided")); // Return error if no code given

    const uploadPath = path.join(__dirname, 'uploads', code); // Upload folder path for that code
    if (!fs.existsSync(uploadPath)) {                           // Create folder if it doesn’t exist
      fs.mkdirSync(uploadPath, { recursive: true });
      console.log(`📁 Created new folder: ${uploadPath}`);
    }
    cb(null, uploadPath);                            // Set the destination folder for uploaded files
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);                     // Save the uploaded file using its original name
  }
});

const upload = multer({ storage }); // 📎 Apply the multer storage config

// 🎯 Route to generate and return a new unique code
app.get('/generate-code', (req, res) => {
  const code = generateCode();         // Generate random 6-digit code
  fileDB[code] = [];                   // Initialize empty file list for that code
  console.log(`✅ Generated new code: ${code}`);
  res.json({ code });                  // Send code as JSON response
});

// 📤 Upload route to accept multiple files for a code
app.post('/upload', upload.array('files'), (req, res) => {
  const code = req.query.code;                       // Get code from query string
  if (!code) {
    console.log("❌ No code in upload request.");
    return res.status(400).send("Code is required!"); // Error if no code given
  }

  const folderPath = path.join(__dirname, 'uploads', code); // Directory path for this code

  // 🕒 Create a file to mark the folder's creation time if not already present
  const timestampFile = path.join(folderPath, '.createdAt');
  if (!fs.existsSync(timestampFile)) {
    fs.writeFileSync(timestampFile, Date.now().toString()); // Save creation time
    console.log(`🕒 Timestamp created for code: ${code}`);
  }

  // ⚠️ If no files were uploaded, send error
  if (!req.files || req.files.length === 0) {
    console.log(`❌ No files uploaded for code: ${code}`);
    return res.status(400).send("No files uploaded!");
  }

  // 💾 Save uploaded file names into memory DB
  if (!fileDB[code]) fileDB[code] = [];

  req.files.forEach(file => {
    fileDB[code].push(file.originalname);           // Store filename in DB
    console.log(`📁 Uploaded: ${file.originalname}`); // Log upload
  });

  console.log(`✅ Upload complete for code: ${code}`);
  res.send('Files uploaded!');                       // Respond to client
});

// 📥 Route to get list of uploaded files for a specific code
app.get('/files/:code', (req, res) => {
  const code = req.params.code;                      // Get code from URL path
  const dirPath = path.join(__dirname, 'uploads', code); // Path to uploaded files

  if (!fs.existsSync(dirPath)) {                     // If folder doesn't exist, return empty list
    console.log(`❌ Folder not found for code: ${code}`);
    return res.json({ files: [] });
  }

  // 🗂 Get file details (excluding timestamp file)
  const files = fs.readdirSync(dirPath)
    .filter(name => name !== '.createdAt')           // Skip timestamp marker
    .map(filename => {
      const stats = fs.statSync(path.join(dirPath, filename)); // Get file stats
      return {
        name: filename,
        size: stats.size                              // Return file name and size
      };
    });

  console.log(`✅ Files found for code ${code}:`, files.map(f => f.name));
  res.json({ files });                                // Send file list to client
});

// 🧹 Auto-deletion system to remove expired folders older than 5 hours
setInterval(() => {
  const uploadsDir = path.join(__dirname, 'uploads'); // Main uploads folder
  const now = Date.now();

  fs.readdirSync(uploadsDir).forEach(code => {
    const folderPath = path.join(uploadsDir, code);   // Path for each code folder
    const timestampFile = path.join(folderPath, '.createdAt'); // Timestamp file path

    if (fs.existsSync(timestampFile)) {
      const createdAt = parseInt(fs.readFileSync(timestampFile, 'utf-8')); // Read timestamp
      const age = now - createdAt;

      if (age > 5 * 60 * 60 * 1000) {                 // Check if older than 5 hours
        fs.rmSync(folderPath, { recursive: true, force: true }); // Delete folder
        delete fileDB[code];                          // Remove from in-memory DB
        console.log(`🗑️ Deleted expired folder: ${code}`);
      }
    }
  });
}, 5 * 60 * 1000); // Runs every 5 minutes (300,000 ms)

// 🚀 Start the Express server
app.listen(port, () => {
  console.log(`✅ ShareeAcross server running at http://localhost:${port}`);
});
