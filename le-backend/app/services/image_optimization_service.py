"""
Image Optimization Service for User Profile Photos

This service handles:
- Image compression and resizing
- Format conversion (to WebP for better compression)
- Thumbnail generation
- CDN-ready URL generation with longer expiry times
"""

from io import BytesIO
from typing import Optional, Tuple, Dict
from PIL import Image
import logging

logger = logging.getLogger(__name__)

class ImageOptimizationService:
    """Service for optimizing user profile photos"""
    
    # Profile photo size configurations
    SIZES = {
        'thumbnail': (64, 64),      # Small avatar for lists
        'medium': (128, 128),        # Standard avatar
        'large': (256, 256),         # Profile page avatar
        'original': (512, 512)       # Maximum size for originals
    }
    
    # Image quality settings
    JPEG_QUALITY = 85
    WEBP_QUALITY = 80
    PNG_COMPRESSION = 6
    
    # CDN cache duration (7 days for profile photos)
    CDN_CACHE_DURATION = 7 * 24 * 60 * 60  # 7 days in seconds
    
    def __init__(self):
        """Initialize the image optimization service"""
        pass
    
    def optimize_profile_photo(
        self, 
        image_data: bytes, 
        output_format: str = 'webp'
    ) -> Dict[str, bytes]:
        """
        Optimize a profile photo by creating multiple sizes
        
        Args:
            image_data: Raw image bytes
            output_format: Output format ('webp', 'jpeg', 'png')
            
        Returns:
            Dictionary with size names as keys and optimized image bytes as values
        """
        try:
            # Open the image
            img = Image.open(BytesIO(image_data))
            
            # Convert RGBA to RGB if saving as JPEG
            if output_format.lower() == 'jpeg' and img.mode in ('RGBA', 'LA', 'P'):
                # Create white background
                background = Image.new('RGB', img.size, (255, 255, 255))
                if img.mode == 'P':
                    img = img.convert('RGBA')
                background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                img = background
            elif img.mode not in ('RGB', 'RGBA'):
                img = img.convert('RGB')
            
            # Generate optimized versions for each size
            optimized_images = {}
            
            for size_name, dimensions in self.SIZES.items():
                optimized_images[size_name] = self._resize_and_compress(
                    img, dimensions, output_format
                )
            
            return optimized_images
            
        except Exception as e:
            logger.error(f"Failed to optimize profile photo: {str(e)}")
            raise Exception(f"Image optimization failed: {str(e)}")
    
    def _resize_and_compress(
        self, 
        img: Image.Image, 
        size: Tuple[int, int], 
        output_format: str
    ) -> bytes:
        """
        Resize and compress an image
        
        Args:
            img: PIL Image object
            size: Target size (width, height)
            output_format: Output format
            
        Returns:
            Compressed image bytes
        """
        # Create a copy to avoid modifying the original
        img_copy = img.copy()
        
        # Resize using high-quality Lanczos resampling
        img_copy.thumbnail(size, Image.Resampling.LANCZOS)
        
        # Save to bytes buffer with optimization
        buffer = BytesIO()
        
        if output_format.lower() == 'webp':
            img_copy.save(
                buffer, 
                format='WEBP', 
                quality=self.WEBP_QUALITY,
                method=6  # Best compression
            )
        elif output_format.lower() == 'jpeg':
            img_copy.save(
                buffer, 
                format='JPEG', 
                quality=self.JPEG_QUALITY,
                optimize=True
            )
        elif output_format.lower() == 'png':
            img_copy.save(
                buffer, 
                format='PNG', 
                compress_level=self.PNG_COMPRESSION,
                optimize=True
            )
        else:
            raise ValueError(f"Unsupported output format: {output_format}")
        
        return buffer.getvalue()
    
    def validate_image(self, image_data: bytes) -> Tuple[bool, Optional[str]]:
        """
        Validate that the uploaded file is a valid image
        
        Args:
            image_data: Raw image bytes
            
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            img = Image.open(BytesIO(image_data))
            
            # Check if it's a valid image format
            if img.format not in ['JPEG', 'PNG', 'GIF', 'WEBP', 'BMP']:
                return False, f"Unsupported image format: {img.format}"
            
            # Check image dimensions (minimum and maximum)
            width, height = img.size
            if width < 50 or height < 50:
                return False, "Image is too small (minimum 50x50 pixels)"
            
            if width > 4096 or height > 4096:
                return False, "Image is too large (maximum 4096x4096 pixels)"
            
            # Check file size (max 10MB)
            if len(image_data) > 10 * 1024 * 1024:
                return False, "Image file size exceeds 10MB"
            
            return True, None
            
        except Exception as e:
            return False, f"Invalid image file: {str(e)}"
    
    def get_cdn_cache_headers(self) -> Dict[str, str]:
        """
        Get HTTP headers for CDN caching
        
        Returns:
            Dictionary of cache control headers
        """
        return {
            'Cache-Control': f'public, max-age={self.CDN_CACHE_DURATION}, immutable',
            'X-Content-Type-Options': 'nosniff'
        }
    
    def generate_srcset(self, base_url: str, sizes: list = None) -> str:
        """
        Generate srcset attribute for responsive images
        
        Args:
            base_url: Base URL pattern with {size} placeholder
            sizes: List of size names to include
            
        Returns:
            srcset string for HTML img tag
        """
        if sizes is None:
            sizes = ['thumbnail', 'medium', 'large']
        
        srcset_parts = []
        for size_name in sizes:
            if size_name in self.SIZES:
                width = self.SIZES[size_name][0]
                url = base_url.replace('{size}', size_name)
                srcset_parts.append(f"{url} {width}w")
        
        return ", ".join(srcset_parts)


# Global instance
image_optimization_service = ImageOptimizationService()
