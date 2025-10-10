# Avatar Components Documentation

## Overview

This directory contains optimized avatar components for displaying user profile photos with lazy loading, responsive images, and CDN integration.

## Components

### 1. OptimizedAvatar

A high-performance avatar component with lazy loading and responsive image support.

#### Features
- **Lazy Loading**: Uses Intersection Observer to load images only when visible
- **Responsive Images**: Automatically selects optimal image size using srcset
- **Fallback Support**: Shows initials or icon when no image is available
- **Loading States**: Displays skeleton screen while loading
- **Error Handling**: Gracefully handles image load failures
- **CDN Optimized**: Works with CDN-cached images with long expiry times

#### Usage

```tsx
import OptimizedAvatar from '@/components/users/OptimizedAvatar';

// Basic usage
<OptimizedAvatar
  src={user.profile_image_url}
  alt="John Doe"
  size="md"
  fallbackInitials="JD"
/>

// With lazy loading disabled (for above-the-fold content)
<OptimizedAvatar
  src={user.profile_image_url}
  alt="John Doe"
  size="lg"
  lazy={false}
  priority={true}
/>

// Custom styling
<OptimizedAvatar
  src={user.profile_image_url}
  alt="John Doe"
  size="xl"
  className="border-4 border-blue-500"
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `src` | `string \| null` | - | Image URL |
| `alt` | `string` | - | Alt text for accessibility |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'md'` | Avatar size |
| `fallbackInitials` | `string` | - | Initials to show when no image |
| `className` | `string` | `''` | Additional CSS classes |
| `lazy` | `boolean` | `true` | Enable lazy loading |
| `priority` | `boolean` | `false` | Disable lazy loading for critical images |

#### Size Reference

| Size | Dimensions | Use Case |
|------|------------|----------|
| `sm` | 32px (h-8 w-8) | Small lists, compact views |
| `md` | 40px (h-10 w-10) | Standard lists, tables |
| `lg` | 48px (h-12 w-12) | Cards, detailed views |
| `xl` | 64px (h-16 w-16) | Profile pages, headers |

### 2. UserAvatar

A convenience wrapper around OptimizedAvatar that automatically generates initials from user data.

#### Usage

```tsx
import { UserAvatar } from '@/components/users/OptimizedAvatar';

<UserAvatar
  user={{
    first_name: 'John',
    last_name: 'Doe',
    profile_image_url: 'https://...'
  }}
  alt="John Doe"
  size="md"
/>
```

#### Props

Same as OptimizedAvatar, but:
- `user` object replaces `src` and `fallbackInitials`
- Automatically generates initials from `first_name` and `last_name`
- Uses `profile_image_url` from user object

### 3. ProfilePhotoUpload

A complete profile photo upload component with drag-and-drop, validation, and progress tracking.

#### Features
- **Drag and Drop**: Drag files directly onto the avatar
- **File Validation**: Validates file type and size
- **Upload Progress**: Shows progress indicator during upload
- **Preview**: Shows preview before upload completes
- **Delete Support**: Delete existing profile photos
- **Success/Error Feedback**: Clear visual feedback
- **Responsive**: Works on mobile and desktop

#### Usage

```tsx
import ProfilePhotoUpload from '@/components/users/ProfilePhotoUpload';

<ProfilePhotoUpload
  userId={user.id}
  currentPhotoUrl={user.profile_image_url}
  userName={`${user.first_name} ${user.last_name}`}
  userInitials={getInitials(user.first_name, user.last_name)}
  onUploadSuccess={(urls) => {
    console.log('Upload successful:', urls);
    // Update user state
  }}
  onUploadError={(error) => {
    console.error('Upload failed:', error);
    // Show error message
  }}
  size="xl"
  editable={true}
/>
```

#### Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `userId` | `string` | - | User ID for upload endpoint |
| `currentPhotoUrl` | `string \| null` | - | Current profile photo URL |
| `userName` | `string` | - | User's full name |
| `userInitials` | `string` | - | User's initials for fallback |
| `onUploadSuccess` | `(urls: any) => void` | - | Callback on successful upload |
| `onUploadError` | `(error: string) => void` | - | Callback on upload error |
| `size` | `'sm' \| 'md' \| 'lg' \| 'xl'` | `'xl'` | Avatar size |
| `editable` | `boolean` | `true` | Enable upload/delete actions |

#### File Validation

- **Allowed Types**: JPEG, PNG, GIF, WebP
- **Max File Size**: 10MB
- **Min Dimensions**: 50x50 pixels
- **Max Dimensions**: 4096x4096 pixels

## Helper Functions

### getInitials

Generates initials from first and last name.

```tsx
import { getInitials } from '@/components/users/OptimizedAvatar';

const initials = getInitials('John', 'Doe'); // Returns "JD"
const initials = getInitials('Jane'); // Returns "J"
const initials = getInitials(); // Returns "?"
```

## Performance Optimizations

### 1. Lazy Loading

Images are loaded only when they enter the viewport (with 50px margin):

```tsx
// Lazy loading enabled (default)
<UserAvatar user={user} lazy={true} />

// Lazy loading disabled for critical images
<UserAvatar user={user} lazy={false} priority={true} />
```

**When to disable lazy loading:**
- Above-the-fold content
- Profile page headers
- Critical UI elements

### 2. Responsive Images

The component automatically generates srcset for responsive loading:

```tsx
// Automatically generates:
// srcset="
//   https://.../thumbnail/... 64w,
//   https://.../medium/... 128w,
//   https://.../large/... 256w
// "
```

The browser selects the optimal size based on:
- Device pixel ratio
- Viewport size
- Network conditions

### 3. CDN Caching

Images are served with long-lived URLs (7 days) for optimal CDN caching:

```
Cache-Control: public, max-age=604800, immutable
```

This means:
- Images are cached for 7 days
- No revalidation needed
- Faster load times
- Reduced bandwidth

## Integration Examples

### User List

```tsx
import { UserAvatar } from '@/components/users/OptimizedAvatar';

function UserList({ users }) {
  return (
    <div className="space-y-2">
      {users.map(user => (
        <div key={user.id} className="flex items-center space-x-3">
          <UserAvatar
            user={user}
            alt={`${user.first_name} ${user.last_name}`}
            size="md"
            lazy={true}
          />
          <div>
            <div className="font-medium">{user.first_name} {user.last_name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

### User Card

```tsx
import { UserAvatar } from '@/components/users/OptimizedAvatar';

function UserCard({ user }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center space-x-4">
        <UserAvatar
          user={user}
          alt={`${user.first_name} ${user.last_name}`}
          size="lg"
          lazy={false}
          priority={true}
        />
        <div>
          <h3 className="text-lg font-semibold">
            {user.first_name} {user.last_name}
          </h3>
          <p className="text-gray-500">{user.role}</p>
        </div>
      </div>
    </div>
  );
}
```

### Profile Page

```tsx
import ProfilePhotoUpload from '@/components/users/ProfilePhotoUpload';
import { getInitials } from '@/components/users/OptimizedAvatar';

function ProfilePage({ user, isOwnProfile }) {
  const handleUploadSuccess = (urls) => {
    // Update user state
    setUser({ ...user, profile_image_url: urls.primary_url });
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow p-8">
        <div className="flex flex-col items-center">
          <ProfilePhotoUpload
            userId={user.id}
            currentPhotoUrl={user.profile_image_url}
            userName={`${user.first_name} ${user.last_name}`}
            userInitials={getInitials(user.first_name, user.last_name)}
            onUploadSuccess={handleUploadSuccess}
            size="xl"
            editable={isOwnProfile}
          />
          <h1 className="mt-4 text-2xl font-bold">
            {user.first_name} {user.last_name}
          </h1>
          <p className="text-gray-500">{user.email}</p>
        </div>
      </div>
    </div>
  );
}
```

## Accessibility

All avatar components include proper accessibility features:

- **Alt Text**: Required `alt` prop for screen readers
- **ARIA Labels**: Automatic labeling for interactive elements
- **Keyboard Navigation**: Full keyboard support for upload component
- **Focus Indicators**: Clear focus states for interactive elements
- **Error Messages**: Screen reader accessible error messages

## Browser Support

- **Modern Browsers**: Full support (Chrome, Firefox, Safari, Edge)
- **Intersection Observer**: Polyfill available for older browsers
- **WebP Format**: Fallback to JPEG/PNG for unsupported browsers
- **Lazy Loading**: Graceful degradation to eager loading

## Testing

### Unit Tests

```tsx
import { render, screen } from '@testing-library/react';
import { UserAvatar } from '@/components/users/OptimizedAvatar';

test('renders avatar with image', () => {
  const user = {
    first_name: 'John',
    last_name: 'Doe',
    profile_image_url: 'https://example.com/photo.jpg'
  };

  render(<UserAvatar user={user} alt="John Doe" />);
  
  const img = screen.getByAlt('John Doe');
  expect(img).toBeInTheDocument();
  expect(img).toHaveAttribute('src', user.profile_image_url);
});

test('renders fallback initials when no image', () => {
  const user = {
    first_name: 'John',
    last_name: 'Doe',
    profile_image_url: null
  };

  render(<UserAvatar user={user} alt="John Doe" />);
  
  expect(screen.getByText('JD')).toBeInTheDocument();
});
```

## Troubleshooting

### Images Not Loading

1. **Check Network Tab**: Verify image URLs are correct
2. **Check CORS**: Ensure MinIO/S3 CORS is configured
3. **Check Expiry**: Presigned URLs expire after 7 days
4. **Check Console**: Look for JavaScript errors

### Lazy Loading Not Working

1. **Check Browser Support**: Intersection Observer may need polyfill
2. **Check Viewport**: Images must be in or near viewport
3. **Check Priority**: `priority={true}` disables lazy loading
4. **Check Console**: Look for Intersection Observer errors

### Upload Failing

1. **Check File Size**: Must be < 10MB
2. **Check File Type**: Must be JPEG, PNG, GIF, or WebP
3. **Check Permissions**: User must have permission to upload
4. **Check Network**: Verify API endpoint is accessible

## Best Practices

1. **Use Lazy Loading**: Enable for lists and grids
2. **Disable for Critical Images**: Use `priority={true}` for above-the-fold
3. **Provide Alt Text**: Always include descriptive alt text
4. **Use Appropriate Sizes**: Match size to use case
5. **Handle Errors**: Provide fallback for missing images
6. **Test Performance**: Monitor load times and bandwidth
7. **Optimize Images**: Use WebP format when possible
8. **Cache Properly**: Leverage CDN caching for best performance

## Migration Guide

### From Old Avatar Component

```tsx
// Old
<div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600">
  {user.profile_image_url ? (
    <img src={user.profile_image_url} alt="Profile" />
  ) : (
    <span>{user.first_name?.[0]}{user.last_name?.[0]}</span>
  )}
</div>

// New
<UserAvatar
  user={user}
  alt={`${user.first_name} ${user.last_name}`}
  size="md"
/>
```

Benefits:
- Automatic lazy loading
- Responsive images
- Better error handling
- Consistent styling
- Improved performance
