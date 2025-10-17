# Address Picker - useRef Fix for Initialization

## Problem
Even with the `isInitializing` state flag, the address picker was still only loading the province. The district, commune, and village were being cleared by the cascade effects.

### Why State Didn't Work
```typescript
const [isInitializing, setIsInitializing] = useState(false);

// In initialization:
setIsInitializing(true);
setSelectedProvince(province);  // This triggers province useEffect
setSelectedDistrict(district);  // This triggers district useEffect
setIsInitializing(false);       // But this happens AFTER effects run!
```

The problem: `setIsInitializing(false)` is queued, but the effects for province/district/commune run **before** the state update completes. So `isInitializing` is still `true` when we check it, but by the time the effects run, it might be `false`.

## Solution: Use useRef Instead of useState

### Why useRef Works
```typescript
const isInitializingRef = useRef(false);

// In initialization:
isInitializingRef.current = true;   // Immediate, synchronous
setSelectedProvince(province);       // Triggers effect
// Effect checks: isInitializingRef.current === true ✓ Skips clearing
setSelectedDistrict(district);
// Effect checks: isInitializingRef.current === true ✓ Skips clearing
setTimeout(() => {
  isInitializingRef.current = false; // After all updates
}, 50);
```

**Key difference**: 
- `useState`: Asynchronous, batched updates
- `useRef`: Synchronous, immediate updates

## Changes Made

### 1. Import useRef
```typescript
import React, { useState, useEffect, useRef } from 'react';
```

### 2. Replace State with Ref
```typescript
// Before:
const [isInitializing, setIsInitializing] = useState(false);

// After:
const isInitializingRef = useRef(false);
```

### 3. Update Initialization Logic
```typescript
// Set ref immediately (synchronous)
isInitializingRef.current = true;

// Load all selections...

// Clear ref after delay
setTimeout(() => {
  isInitializingRef.current = false;
}, 50);
```

### 4. Check Ref in Effects
```typescript
useEffect(() => {
  if (isInitializingRef.current) return;  // Check ref, not state
  
  // ... cascade clearing logic
}, [selectedProvince]);
```

## How It Works Now

### Timeline of Execution

```
T=0ms:   isInitializingRef.current = true
T=0ms:   setSelectedProvince(province)
T=1ms:   Province effect runs → checks ref → ref is true → SKIPS clearing
T=1ms:   setSelectedDistrict(district)  
T=2ms:   District effect runs → checks ref → ref is true → SKIPS clearing
T=2ms:   setSelectedCommune(commune)
T=3ms:   Commune effect runs → checks ref → ref is true → SKIPS clearing
T=3ms:   setSelectedVillage(village)
T=4ms:   Village effect runs → checks ref → ref is true → SKIPS clearing
T=50ms:  isInitializingRef.current = false
T=51ms+: Normal operation resumes
```

### Result
All four levels load successfully:
- ✅ Province: បន្ទាយមានជ័យ (01)
- ✅ District: ភ្នំស្រុក (0103)
- ✅ Commune: ស្ពានស្រែង (010304)
- ✅ Village: គោកចារ (01030404)

## Testing with Your Data

Your saved data:
```json
{
  "current_address": "គោកចារ, ស្ពានស្រែង, ភ្នំស្រុក, បន្ទាយមានជ័យ",
  "province": "01",
  "district": "0103",
  "commune": "010304",
  "village": "01030404"
}
```

When you reopen the modal:
1. Finds province "01" → បន្ទាយមានជ័យ ✓
2. Loads districts for "01" → finds "0103" → ភ្នំស្រុក ✓
3. Loads communes for "0103" → finds "010304" → ស្ពានស្រែង ✓
4. Loads villages for "010304" → finds "01030404" → គោកចារ ✓

All dropdowns now show the correct selections!

## Key Takeaway

When you need to prevent effects from running during a batch of state updates:
- ❌ Don't use `useState` - it's asynchronous
- ✅ Use `useRef` - it's synchronous and immediate

This is a common pattern in React when you need a "flag" that effects can check immediately, without waiting for the next render cycle.

## No External Storage Still!

This solution still uses only React's built-in features:
- ✓ No cookies
- ✓ No localStorage
- ✓ Just useRef for synchronous flag checking
- ✓ All data flows through React state and props

The fix is purely about **timing** - ensuring the flag is set before effects run, not after.
