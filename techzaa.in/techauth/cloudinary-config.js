// Cloudinary Configuration for Medical Receipt Uploads
// Replace these values with your actual Cloudinary credentials

const CLOUDINARY_CONFIG = {
  cloudName: "dow5ohgj9", // Replace with your Cloudinary cloud name
  uploadPreset: "glampack_hr_uploads", // Replace with your unsigned upload preset
  folder: "glampack-hr/medical-receipts", // Folder in Cloudinary to organize uploads
  apiUrl: "https://api.cloudinary.com/v1_1", // Cloudinary API base URL
};

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file to upload (image or PDF)
 * @param {Function} onProgress - Optional callback for upload progress
 * @returns {Promise<object>} Upload result with URL and public_id
 */
async function uploadToCloudinary(file, onProgress = null) {
  // Validate file
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (file.size > maxSize) {
    throw new Error("File size exceeds 5MB limit");
  }

  // Allowed file types
  const allowedTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/gif",
    "image/webp",
    "application/pdf",
  ];
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Invalid file type. Please upload an image or PDF");
  }

  // Create form data
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);
  formData.append("folder", CLOUDINARY_CONFIG.folder);

  // Add tags for organization
  formData.append("tags", "medical-receipt,hr-system");

  // Build upload URL
  const uploadUrl = `${CLOUDINARY_CONFIG.apiUrl}/${CLOUDINARY_CONFIG.cloudName}/auto/upload`;

  try {
    // Create XMLHttpRequest for progress tracking
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener("progress", (e) => {
          if (e.lengthComputable) {
            const percentComplete = (e.loaded / e.total) * 100;
            onProgress(percentComplete);
          }
        });
      }

      // Handle completion
      xhr.addEventListener("load", () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve({
            url: response.secure_url,
            publicId: response.public_id,
            format: response.format,
            resourceType: response.resource_type,
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            created: response.created_at,
          });
        } else {
          reject(new Error(`Upload failed with status ${xhr.status}`));
        }
      });

      // Handle errors
      xhr.addEventListener("error", () => {
        reject(
          new Error(
            "Upload failed. Please check your connection and try again."
          )
        );
      });

      xhr.addEventListener("abort", () => {
        reject(new Error("Upload cancelled"));
      });

      // Send request
      xhr.open("POST", uploadUrl);
      xhr.send(formData);
    });
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
}

/**
 * Delete a file from Cloudinary (requires server-side implementation)
 * Note: Deletion requires API secret, so this should be done via your Cloudflare Worker
 * @param {string} publicId - The public ID of the file to delete
 * @returns {Promise<object>} Deletion result
 */
async function deleteFromCloudinary(publicId) {
  // This needs to be implemented in your Cloudflare Worker
  // as it requires the API secret which should not be exposed to the browser
  console.warn("File deletion should be implemented in the Cloudflare Worker");

  // Example: Call your worker endpoint
  // return workerRequest('/api/cloudinary/delete', 'DELETE', { publicId });
}

/**
 * Generate a thumbnail URL from Cloudinary URL
 * @param {string} url - Original Cloudinary URL
 * @param {number} width - Thumbnail width
 * @param {number} height - Thumbnail height
 * @returns {string} Thumbnail URL
 */
function getCloudinaryThumbnail(url, width = 200, height = 200) {
  if (!url || !url.includes("cloudinary.com")) return url;

  // Insert transformation parameters into the URL
  const transformation = `w_${width},h_${height},c_fill,q_auto,f_auto`;
  return url.replace("/upload/", `/upload/${transformation}/`);
}

/**
 * Validate Cloudinary configuration
 * @returns {boolean} True if configuration is valid
 */
function isCloudinaryConfigured() {
  return (
    CLOUDINARY_CONFIG.cloudName !== "YOUR_CLOUD_NAME" &&
    CLOUDINARY_CONFIG.uploadPreset !== "YOUR_UPLOAD_PRESET"
  );
}
