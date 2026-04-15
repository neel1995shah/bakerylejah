# Number Obfuscation Feature

## Overview
A feature has been implemented to allow first-time visitors to see all numeric values displayed using a custom character mapping. Users can toggle between obscured and numeric formats.

## Character Mapping
```
0 → b
1 → a
2 → c
3 → k
4 → g
5 → r
6 → o
7 → u
8 → n
9 → d
```

### Example
- Password `123` displays as `aac` (1→a, 2→c, 3→k)
- Amount `500` displays as `rbb` (5→r, 0→b, 0→b)

## How It Works

### First-Time Visitors
- When users visit the website for the first time, **all numeric values are automatically displayed in obscured format**
- This is controlled by a localStorage flag: `finance-obscured-numbers-mode`

### Toggling the Format
To switch back to numeric format (or vice versa):
1. Navigate to the **Accounts** page
2. **Triple-click** on the "**Accounts**" heading (the clickable title at the top)
3. All pages will immediately update to show the new format

## Implementation Details

### Files Created/Modified

#### New Files:
- **`frontend/src/utils/numberObfuscator.js`** - Core utility functions
  - `obfuscateNumbers()` - Convert numbers to characters
  - `deobfuscateNumbers()` - Convert characters back to numbers
  - `formatNumber()` - Main formatting function with obscured mode support
  - `isObscuredModeEnabled()` - Check current state
  - `toggleObscuredMode()` - Switch between modes
  - `setObscuredMode()` - Explicitly set mode

#### Modified Files:
- **`frontend/src/pages/Accounts.js`**
  - Added triple-click listener on the "Accounts" h1 heading
  - Formats password fields in the accounts table
  - Updates state when obscured mode changes

- **`frontend/src/pages/Dashboard.js`**
  - Formats all displayed numeric stats (Revenue, Profit, Balance, Expenses)
  - Formats Accounts Overview numbers
  - Formats Non-Settled Ledger and P&L entries tables

- **`frontend/src/pages/PAndL.js`**
  - Formats P&L entry amounts (Bet, Win, Charges, Net Profit)
  - Formats totals row

- **`frontend/src/pages/Ledger.js`**
  - Formats ledger entry amounts (In, Out, Total)
  - Formats current total balance

### How Pages Detect Format Changes
Each page uses a storage event listener to detect when the obscured mode is toggled:
```javascript
useEffect(() => {
  const handleStorageChange = () => {
    setObscuredMode(isObscuredModeEnabled());
  };
  
  window.addEventListener('storage', handleStorageChange);
  return () => window.removeEventListener('storage', handleStorageChange);
}, []);
```

This allows real-time updates across all pages when the toggle happens in Accounts page.

## Testing

### Default Behavior
1. Clear browser localStorage for this site
2. Reload the website
3. All numbers should display in character format

### Toggle Feature
1. Navigate to Accounts page
2. Click on the "Accounts" heading 3 times rapidly (within 500ms)
3. All numbers should toggle to numeric format
4. Click again 3 times to toggle back

### Persistence
- The obscured mode setting is saved in browser localStorage
- It persists across page refreshes and browser sessions

## Technical Notes

- The feature gracefully handles edge cases (null/undefined values)
- Only digits 0-9 are replaced; other characters remain unchanged
- Works across all pages without requiring page reload
- Storage listener allows synchronized updates across browser tabs

## Browser Support

Works in all modern browsers that support:
- localStorage API
- storage event listener
- ES6 template literals and destructuring
