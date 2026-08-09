import cloudinary from '../config/cloudinary.js';

// Cloudinary's SDK uploads from a file path or a stream, not a raw
// Buffer directly — and Multer's memoryStorage gives us a Buffer.
// This wraps upload_stream in a Promise so callers can just
// `await uploadImage(buffer)` instead of handling a Node stream.
export function uploadImage(fileBuffer) {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'marketplace-products' },
      (err, result) => {
        if (err) return reject(err);
        resolve(result); // result.secure_url is stored; result.public_id is needed to delete it later
      }
    );
    uploadStream.end(fileBuffer);
  });
}

// Removes an old product image from Cloudinary so replaced/deleted
// images don't pile up as orphaned files.
export async function deleteImage(publicId) {
  if (!publicId) return;
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    // Matches emailService's philosophy: a cleanup failure shouldn't
    // block the product update/delete the request actually asked for.
    console.error('Failed to delete Cloudinary image:', err.message);
  }
}
