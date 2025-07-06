import { v2 as cloudinary } from 'cloudinary';
 const name=process.env.CLOUDE_NAME;
  const api_key=process.env.API_KEY;
   const api_secrete=process.env.SECRET_KEY;
 cloudinary.config({ 
        cloud_name: name, 
        api_key: api_key, 
        api_secret: api_secrete
    });
   
  
    
   export const uploadToCloudinary = async (filePath, publicId, folder = "uploads") => {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      public_id: publicId,
      overwrite: false,
      unique_filename: false,
    });

    return result;
  } catch (error) {
    if (error.http_code === 409) {
      return { duplicate: true, message: "Duplicate file." };
    }
    throw new Error("Cloudinary upload failed: " + error.message);
  }
};
