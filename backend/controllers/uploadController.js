import cloudinary from '../config/cloudinary.js';

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const uploadResult = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'bakery/products',
          resource_type: 'image'
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );

      stream.end(req.file.buffer);
    });

    return res.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Upload failed' });
  }
};
