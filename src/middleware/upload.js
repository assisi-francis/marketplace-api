import multer from 'multer';

// memoryStorage keeps the file as a Buffer (req.file.buffer) instead
// of writing it to disk — its real destination is Cloudinary, so
// there's no reason to touch the local filesystem at all.
const storage = multer.memoryStorage();

function fileFilter(req, file, cb) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.mimetype)) {
    return cb(new Error('Only JPEG, PNG, or WEBP images are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

export default upload;
