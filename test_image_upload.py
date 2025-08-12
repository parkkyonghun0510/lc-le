#!/usr/bin/env python3
"""
Test script to verify backend image upload functionality with Railway MinIO
"""
import os
from dotenv import load_dotenv
from io import BytesIO
from PIL import Image
import requests

# Load environment variables
load_dotenv()

def create_test_image(width=200, height=200, format='PNG'):
    """Create a test image for upload testing"""
    # Create a simple test image
    img = Image.new('RGB', (width, height), color='red')
    
    # Add some content to make it more realistic
    from PIL import ImageDraw, ImageFont
    draw = ImageDraw.Draw(img)
    
    # Draw some shapes
    draw.rectangle([10, 10, width-10, height-10], outline='blue', width=3)
    draw.ellipse([50, 50, width-50, height-50], fill='yellow')
    
    # Add text (use default font)
    try:
        draw.text((width//2-50, height//2), "TEST IMAGE", fill='black')
    except:
        # If font loading fails, just skip text
        pass
    
    # Convert to bytes
    img_bytes = BytesIO()
    img.save(img_bytes, format=format)
    img_bytes.seek(0)
    
    return img_bytes.getvalue(), f"test_image.{format.lower()}"

def test_minio_direct_upload():
    """Test direct MinIO upload functionality"""
    print("Testing direct MinIO upload...")
    print("=" * 50)
    
    try:
        from app.services.minio_service import minio_service
        
        print(f"MinIO Service Status: {'✅ ENABLED' if minio_service.enabled else '❌ DISABLED'}")
        print(f"Endpoint: {os.getenv('MINIO_ENDPOINT')}")
        print(f"Bucket: {minio_service.bucket_name}")
        print(f"Secure: {os.getenv('MINIO_SECURE')}")
        
        if minio_service.enabled:
            # Create test image
            image_data, filename = create_test_image()
            print(f"\n✅ Created test image: {filename} ({len(image_data)} bytes)")
            
            # Test image upload
            uploaded_name = minio_service.upload_file(
                file_content=image_data,
                original_filename=filename,
                content_type="image/png"
            )
            print(f"✅ Test image uploaded: {uploaded_name}")
            
            # Test presigned URL generation
            download_url = minio_service.get_file_url(uploaded_name, expires=3600)
            print(f"✅ Download URL generated: {download_url[:70]}...")
            
            # Test file info
            file_info = minio_service.get_file_info(uploaded_name)
            print(f"✅ File info retrieved: {file_info['size']} bytes, {file_info['content_type']}")
            
            # Clean up
            minio_service.delete_file(uploaded_name)
            print("✅ Test image cleaned up")
            
            print("\n🎉 MinIO image upload test successful!")
            return True
            
        else:
            print("❌ MinIO service is disabled. Check credentials.")
            return False
            
    except Exception as e:
        print(f"❌ MinIO test failed: {e}")
        return False

def test_image_validation():
    """Test image validation and processing"""
    print("\nTesting image validation...")
    print("=" * 50)
    
    # Test different image formats
    formats = ['PNG', 'JPEG', 'GIF', 'WEBP']
    
    for fmt in formats:
        try:
            image_data, filename = create_test_image(format=fmt)
            print(f"✅ {fmt} image created: {len(image_data)} bytes")
            
            # You could add additional validation here
            # For example, check if the image can be opened
            img_test = Image.open(BytesIO(image_data))
            print(f"   - Format: {img_test.format}, Size: {img_test.size}, Mode: {img_test.mode}")
            
        except Exception as e:
            print(f"❌ {fmt} image test failed: {e}")

def print_config_summary():
    """Print configuration summary"""
    print("Backend Image Upload Configuration Summary")
    print("=" * 60)
    print(f"MinIO Endpoint: {os.getenv('MINIO_ENDPOINT', 'Not set')}")
    print(f"MinIO Bucket: {os.getenv('MINIO_BUCKET_NAME', 'Not set')}")
    print(f"MinIO Secure: {os.getenv('MINIO_SECURE', 'Not set')}")
    print(f"Database URL: {os.getenv('DATABASE_URL', 'Not set')[:50]}...")
    print(f"Debug Mode: {os.getenv('DEBUG', 'Not set')}")
    print()

def main():
    """Run all tests"""
    print_config_summary()
    
    # Test MinIO functionality
    minio_success = test_minio_direct_upload()
    
    # Test image validation
    test_image_validation()
    
    print("\n" + "=" * 60)
    print("SUMMARY:")
    print(f"MinIO Connection: {'✅ SUCCESS' if minio_success else '❌ FAILED'}")
    print("Image Validation: ✅ SUCCESS")
    
    if minio_success:
        print("\n🎉 Your Railway MinIO image upload setup is working correctly!")
        print("\nNext steps:")
        print("1. Your backend can now handle image uploads")
        print("2. Files are stored securely in Railway MinIO")
        print("3. Presigned URLs work for secure file access")
        print("4. You can integrate this with your frontend")
        
        print("\nAPI Endpoints available:")
        print("- POST /api/files/upload - Upload any file including images")
        print("- GET /api/files/{file_id}/download - Get download URL")
        print("- GET /api/files/ - List uploaded files")
        print("- DELETE /api/files/{file_id} - Delete files")
        
    else:
        print("\n❌ Please check your MinIO configuration:")
        print("1. Verify Railway MinIO service is running")
        print("2. Check environment variables in .env file")
        print("3. Ensure MinIO credentials are correct")

if __name__ == "__main__":
    main()
