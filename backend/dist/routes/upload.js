"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const uuid_1 = require("uuid");
const fs_1 = __importDefault(require("fs"));
const auth_1 = require("../middleware/auth");
const router = express_1.default.Router();
// Ensure uploads directory exists
const uploadsDir = process.env.UPLOAD_PATH || 'uploads';
if (!fs_1.default.existsSync(uploadsDir)) {
    fs_1.default.mkdirSync(uploadsDir, { recursive: true });
}
// Configure multer for file uploads
const storage = multer_1.default.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${(0, uuid_1.v4)()}${path_1.default.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});
const upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880') // 5MB default
    },
    fileFilter: (req, file, cb) => {
        // Allow images, documents, and other common file types
        const allowedTypes = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|csv|zip/;
        const extname = allowedTypes.test(path_1.default.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (mimetype && extname) {
            return cb(null, true);
        }
        else {
            cb(new Error(`File type not allowed. Allowed types: ${allowedTypes.source.replace(/\|/g, ', ')}`));
        }
    }
});
// Upload single file
router.post('/single', [
    auth_1.authenticateToken,
    auth_1.requireManager,
    upload.single('file')
], async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded'
            });
        }
        const file = req.file;
        const fileUrl = `/uploads/${file.filename}`;
        res.json({
            success: true,
            message: 'File uploaded successfully',
            data: {
                filename: file.filename,
                originalName: file.originalname,
                url: fileUrl,
                size: file.size,
                mimetype: file.mimetype
            }
        });
    }
    catch (error) {
        console.error('Upload single file error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload file'
        });
    }
});
// Upload multiple files
router.post('/multiple', [
    auth_1.authenticateToken,
    auth_1.requireManager,
    upload.array('files', 10)
], async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No files uploaded'
            });
        }
        const uploadedFiles = files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            url: `/uploads/${file.filename}`,
            size: file.size,
            mimetype: file.mimetype
        }));
        res.json({
            success: true,
            message: `${files.length} file(s) uploaded successfully`,
            data: uploadedFiles
        });
    }
    catch (error) {
        console.error('Upload multiple files error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload files'
        });
    }
});
// Upload product images
router.post('/product-images', [
    auth_1.authenticateToken,
    auth_1.requireManager,
    upload.array('images', 10)
], async (req, res) => {
    try {
        const files = req.files;
        if (!files || files.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No images uploaded'
            });
        }
        // Validate that all files are images
        const imageTypes = /jpeg|jpg|png|gif|webp/;
        for (const file of files) {
            const extname = imageTypes.test(path_1.default.extname(file.originalname).toLowerCase());
            const mimetype = imageTypes.test(file.mimetype);
            if (!mimetype || !extname) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid image file: ${file.originalname}. Only image files are allowed.`
                });
            }
        }
        const uploadedImages = files.map(file => ({
            filename: file.filename,
            originalName: file.originalname,
            url: `/uploads/${file.filename}`,
            size: file.size,
            mimetype: file.mimetype
        }));
        res.json({
            success: true,
            message: `${files.length} image(s) uploaded successfully`,
            data: uploadedImages
        });
    }
    catch (error) {
        console.error('Upload product images error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to upload images'
        });
    }
});
// Delete file
router.delete('/:filename', [
    auth_1.authenticateToken,
    auth_1.requireManager
], async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(uploadsDir, filename);
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
        // Delete file
        fs_1.default.unlinkSync(filePath);
        res.json({
            success: true,
            message: 'File deleted successfully'
        });
    }
    catch (error) {
        console.error('Delete file error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete file'
        });
    }
});
// Get file info
router.get('/:filename/info', [
    auth_1.authenticateToken,
    auth_1.requireManager
], async (req, res) => {
    try {
        const { filename } = req.params;
        const filePath = path_1.default.join(uploadsDir, filename);
        // Check if file exists
        if (!fs_1.default.existsSync(filePath)) {
            return res.status(404).json({
                success: false,
                message: 'File not found'
            });
        }
        const stats = fs_1.default.statSync(filePath);
        res.json({
            success: true,
            data: {
                filename,
                url: `/uploads/${filename}`,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime
            }
        });
    }
    catch (error) {
        console.error('Get file info error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get file info'
        });
    }
});
// List uploaded files
router.get('/', [
    auth_1.authenticateToken,
    auth_1.requireManager
], async (req, res) => {
    try {
        const files = fs_1.default.readdirSync(uploadsDir)
            .filter(file => {
            const filePath = path_1.default.join(uploadsDir, file);
            return fs_1.default.statSync(filePath).isFile();
        })
            .map(filename => {
            const filePath = path_1.default.join(uploadsDir, filename);
            const stats = fs_1.default.statSync(filePath);
            return {
                filename,
                url: `/uploads/${filename}`,
                size: stats.size,
                createdAt: stats.birthtime,
                modifiedAt: stats.mtime
            };
        })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()); // Sort by newest first
        res.json({
            success: true,
            data: files
        });
    }
    catch (error) {
        console.error('List files error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to list files'
        });
    }
});
// Error handling middleware for multer
router.use((error, req, res, next) => {
    if (error instanceof multer_1.default.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: `File too large. Maximum size allowed: ${process.env.MAX_FILE_SIZE || '5MB'}`
            });
        }
        if (error.code === 'LIMIT_FILE_COUNT') {
            return res.status(400).json({
                success: false,
                message: 'Too many files uploaded'
            });
        }
    }
    if (error.message.includes('File type not allowed')) {
        return res.status(400).json({
            success: false,
            message: error.message
        });
    }
    console.error('Upload error:', error);
    res.status(500).json({
        success: false,
        message: 'File upload failed'
    });
});
exports.default = router;
//# sourceMappingURL=upload.js.map