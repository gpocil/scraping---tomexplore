import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Configure Multer storage to use dynamic destination based on place_id
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { place_id } = req.body;
        const uploadDir = path.join(__dirname, '../..', 'temp', place_id.toString());

        // Create the directory if it doesn't exist
        fs.mkdirSync(uploadDir, { recursive: true });

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + '-' + file.originalname);
    }
});

const upload = multer({ storage: storage });

export default upload;
