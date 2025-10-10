# User Guide: Profile Photo Upload

## How to Upload Your Profile Photo

### Step 1: Navigate to Your Profile
1. Go to `http://localhost:3000/profile`
2. You'll see your profile page with your current information

### Step 2: Upload Your Photo

You have **two ways** to upload a photo:

#### Option A: Click to Upload
1. Click on your avatar (the circular image at the top)
2. A file picker will open
3. Select an image file (JPEG, PNG, GIF, or WebP)
4. The photo will automatically upload and optimize

#### Option B: Drag and Drop
1. Drag an image file from your computer
2. Drop it onto your avatar
3. The photo will automatically upload and optimize

### Step 3: Wait for Upload
- You'll see a progress indicator while the photo uploads
- The system automatically creates 4 optimized sizes
- A success message will appear when complete

### Step 4: Delete Photo (Optional)
- Click the "Delete" button next to "Upload Photo"
- Confirm the deletion
- Your avatar will revert to showing your initials

## File Requirements

### Supported Formats
- ✅ JPEG (.jpg, .jpeg)
- ✅ PNG (.png)
- ✅ GIF (.gif)
- ✅ WebP (.webp)

### Size Limits
- **Maximum file size**: 10MB
- **Minimum dimensions**: 50x50 pixels
- **Maximum dimensions**: 4096x4096 pixels

### Recommended
- **Square images** work best (e.g., 500x500, 1000x1000)
- **Good lighting** for clear photos
- **Centered face** for profile photos
- **File size**: 1-5MB for best quality

## What Happens After Upload?

### Automatic Optimization
The system automatically:
1. **Validates** your image (size, format, dimensions)
2. **Creates 4 sizes**:
   - Thumbnail (64x64) - for lists
   - Medium (128x128) - standard avatar
   - Large (256x256) - profile pages
   - Original (512x512) - maximum size
3. **Converts to WebP** - for smaller file sizes (95% reduction!)
4. **Stores in cloud** - with CDN caching for fast loading

### Where Your Photo Appears
Your profile photo will appear:
- ✅ In the user list (`/users`)
- ✅ On user cards
- ✅ In your profile header
- ✅ In navigation menus
- ✅ In comments and activity logs

## Troubleshooting

### Upload Fails

**"File size exceeds 10MB"**
- Compress your image before uploading
- Use online tools like TinyPNG or Squoosh

**"Unsupported file type"**
- Make sure your file is JPEG, PNG, GIF, or WebP
- Check the file extension

**"Image is too small"**
- Use an image at least 50x50 pixels
- Recommended: 500x500 or larger

**"Image is too large"**
- Resize your image to under 4096x4096 pixels
- Use image editing software

### Photo Not Showing

**Clear your browser cache**
```
Chrome: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
Firefox: Ctrl+Shift+Delete (Windows) or Cmd+Shift+Delete (Mac)
Safari: Cmd+Option+E (Mac)
```

**Check your internet connection**
- Make sure you're connected to the internet
- Try refreshing the page

**Try a different browser**
- Test in Chrome, Firefox, or Safari
- Clear cache and cookies

## Privacy & Security

### Who Can See Your Photo?
- All users in the system can see your profile photo
- Photos are stored securely in cloud storage
- Only you (and admins) can change your photo

### Who Can Upload Photos?
- **You** can upload your own photo
- **Admins** can upload photos for any user
- **Managers** can upload photos for any user

### Data Storage
- Photos are stored in MinIO/S3 cloud storage
- URLs expire after 7 days (automatically refreshed)
- Photos are cached by CDN for fast loading
- Deleted photos are permanently removed

## Tips for Best Results

### Photo Quality
1. **Use good lighting** - Natural light works best
2. **Center your face** - Make sure you're in the center
3. **Neutral background** - Solid colors work well
4. **Professional appearance** - Dress appropriately
5. **Recent photo** - Use a current photo

### Technical Tips
1. **Square crop** - Crop to square before uploading
2. **High resolution** - Use at least 500x500 pixels
3. **Compress first** - Reduce file size before upload
4. **Test upload** - Try with a small file first
5. **Check preview** - Verify it looks good before saving

### Accessibility
- Your photo helps colleagues recognize you
- Initials are shown if no photo is uploaded
- Screen readers announce your name with the photo
- Photos are optimized for all devices

## Performance Benefits

### Fast Loading
- **95% smaller files** - WebP compression
- **CDN caching** - Photos load in 10-50ms
- **Lazy loading** - Only visible photos load
- **Responsive images** - Right size for your device

### Bandwidth Savings
- Original: 500KB → Optimized: 5-15KB
- 95%+ bandwidth reduction
- Faster page loads
- Better mobile experience

## Need Help?

### Common Questions

**Q: Can I upload multiple photos?**
A: No, you can only have one profile photo at a time.

**Q: Can I crop my photo?**
A: Not yet, but this feature is coming soon. For now, crop before uploading.

**Q: What if I don't want a photo?**
A: That's fine! Your initials will be shown instead.

**Q: Can I change my photo anytime?**
A: Yes, upload a new photo anytime to replace the old one.

**Q: Is my photo backed up?**
A: Yes, photos are stored in cloud storage with backups.

### Contact Support
If you're still having issues:
1. Check this guide again
2. Try a different browser
3. Contact your system administrator
4. Report the issue with error details

## What's Next?

### Coming Soon
- 🔜 Image cropping tool
- 🔜 Filters and effects
- 🔜 Face detection and auto-crop
- 🔜 Photo history
- 🔜 Batch upload for admins
- 🔜 AI enhancement

### Feedback
We'd love to hear your feedback!
- What features would you like?
- How can we improve the upload experience?
- Any issues or suggestions?

---

**Last Updated**: January 10, 2025
**Version**: 1.0
