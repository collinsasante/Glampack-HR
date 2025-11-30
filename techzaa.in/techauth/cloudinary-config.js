// Cloudinary Configuration for Medical Receipt Uploads
// Credentials are fetched from backend API for security

let CLOUDINARY_CONFIG = null;

/**
 * Fetch Cloudinary configuration from backend API
 * @returns {Promise<object>} Cloudinary configuration
 */
async function getCloudinaryConfig() {
  if (CLOUDINARY_CONFIG) return CLOUDINARY_CONFIG;

  try {
    const response = await fetch(`${API_CONFIG.workerUrl}/api/cloudinary/config`);
    if (!response.ok) {
      throw new Error(`Failed to fetch Cloudinary config: ${response.status}`);
    }
    CLOUDINARY_CONFIG = await response.json();
    return CLOUDINARY_CONFIG;
  } catch (error) {
    throw new Error('Unable to load upload configuration. Please try again later.');
  }
}

/**
 * Upload a file to Cloudinary via Worker proxy
 * @param {File} file - The file to upload (image or PDF)
 * @param {Function} onProgress - Optional callback for upload progress
 * @returns {Promise<object>} Upload result with URL and public_id
 */
async function uploadToCloudinary(file, onProgress = null) {
  // Fetch config from backend first (to ensure folder is set correctly)
  const config = await getCloudinaryConfig();

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
  formData.append("folder", config.folder);
  formData.append("tags", "medical-receipt,hr-system");

  // Upload via Worker proxy (no direct Cloudinary access due to CSP)
  const uploadUrl = `${API_CONFIG.workerUrl}/api/cloudinary/upload`;

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
            url: response.url,
            publicId: response.publicId,
            format: response.format,
            resourceType: response.resourceType,
            bytes: response.bytes,
            width: response.width,
            height: response.height,
            created: response.created,
          });
        } else {
          let errorMsg = `Upload failed with status ${xhr.status}`;
          try {
            const errorData = JSON.parse(xhr.responseText);
            if (errorData.message) errorMsg = errorData.message;
          } catch (e) {
            // Use default message
          }
          reject(new Error(errorMsg));
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

      // Send request to Worker proxy
      xhr.open("POST", uploadUrl);
      xhr.send(formData);
    });
  } catch (error) {
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
 * @returns {Promise<boolean>} True if configuration is valid
 */
async function isCloudinaryConfigured() {
  try {
    const config = await getCloudinaryConfig();
    return (
      config.cloudName &&
      config.uploadPreset &&
      config.cloudName !== "YOUR_CLOUD_NAME" &&
      config.uploadPreset !== "YOUR_UPLOAD_PRESET"
    );
  } catch (error) {
    return false;
  }
}
