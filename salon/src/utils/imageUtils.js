/**
 * Compresses and resizes an image file to specified dimensions and quality
 * @param {File} file - The image file to process
 * @param {number} width - Target width in pixels
 * @param {number} height - Target height in pixels
 * @param {number} quality - JPEG quality (0-1)
 * @returns {Promise<File>} - Compressed image file
 */
export function compressImage(file, width = 300, height = 300, quality = 0.8) {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    
    img.onload = () => {
      // Set canvas dimensions
      canvas.width = width
      canvas.height = height
      
      // Calculate dimensions to maintain aspect ratio
      const aspectRatio = img.width / img.height
      let drawWidth = width
      let drawHeight = height
      let offsetX = 0
      let offsetY = 0
      
      if (aspectRatio > 1) {
        // Wider than tall
        drawHeight = width / aspectRatio
        offsetY = (height - drawHeight) / 2
      } else {
        // Taller than wide
        drawWidth = height * aspectRatio
        offsetX = (width - drawWidth) / 2
      }
      
      // Fill with white background
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, width, height)
      
      // Draw image centered
      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight)
      
      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            // Create new file with .jpg extension
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, '.jpg'), {
              type: 'image/jpeg',
              lastModified: Date.now(),
            })
            resolve(compressedFile)
          } else {
            reject(new Error('Canvas to blob conversion failed'))
          }
        },
        'image/jpeg',
        quality
      )
    }
    
    img.onerror = () => {
      reject(new Error('Image loading failed'))
    }
    
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Validates if file is an image
 * @param {File} file - File to validate
 * @returns {boolean} - True if file is an image
 */
export function isImageFile(file) {
  return file && file.type.startsWith('image/')
}

/**
 * Validates file size
 * @param {File} file - File to validate
 * @param {number} maxSizeMB - Maximum size in MB
 * @returns {boolean} - True if file size is valid
 */
export function isValidFileSize(file, maxSizeMB = 10) {
  return file && file.size <= maxSizeMB * 1024 * 1024
}