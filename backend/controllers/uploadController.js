import cloudinary from '../config/cloudinary.js';

const uploadBufferToCloudinary = async (buffer, folder = 'bakery/products') => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: 'image'
      },
      (error, result) => {
        if (error) return reject(error);
        resolve(result);
      }
    );

    stream.end(buffer);
  });
};

export const uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Image file is required' });
    }

    const uploadResult = await uploadBufferToCloudinary(req.file.buffer, 'bakery/products');

    return res.json({
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Upload failed' });
  }
};

export const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'At least one image is required' });
    }

    const uploaded = await Promise.all(
      req.files.map(async (file) => {
        const result = await uploadBufferToCloudinary(file.buffer, 'bakery/customer-needs');
        return {
          url: result.secure_url,
          publicId: result.public_id
        };
      })
    );

    return res.json({ images: uploaded });
  } catch (error) {
    return res.status(500).json({ message: error.message || 'Upload failed' });
  }
};
