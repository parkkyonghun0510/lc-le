# CurrencyInput Component

An enhanced, accessible currency input component with comprehensive formatting, validation, and localization support.

## Features

- **Real-time formatting**: Automatically formats currency values based on locale and currency
- **Smart validation**: Comprehensive validation with min/max values, decimal places, and required fields
- **Accessibility**: Full ARIA support, screen reader announcements, keyboard navigation
- **Localization**: Support for multiple currencies and locales via Intl.NumberFormat
- **User experience**: Cursor position preservation, clear error messages, disabled states
- **Responsive design**: Dark mode support, consistent styling with design system

## Usage

### Basic Usage

```tsx
import { CurrencyInput } from './CurrencyInput';

function MyForm() {
  const [amount, setAmount] = useState('');

  return (
    <CurrencyInput
      label="Loan Amount"
      name="loanAmount"
      value={amount}
      onChange={(e) => setAmount(e.target.value)}
      currency="USD"
      locale="en-US"
    />
  );
}
```

### Advanced Usage

```tsx
<CurrencyInput
  label="Monthly Income"
  name="monthlyIncome"
  value={income}
  onChange={handleIncomeChange}
  currency="KHR"
  locale="km-KH"
  min={100000}
  max={10000000}
  required
  placeholder="Enter monthly income"
  disabled={isSubmitting}
/>
```

## Props

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `label` | string | - | Input label text |
| `name` | string | - | Input name attribute |
| `value` | string | - | Current value (raw numeric string) |
| `onChange` | function | - | Change handler |
| `placeholder` | string | - | Placeholder text |
| `required` | boolean | false | Whether input is required |
| `currency` | string | 'USD' | Currency code (e.g., 'USD', 'KHR', 'EUR') |
| `locale` | string | 'en-US' | Locale for formatting |
| `min` | number | 0 | Minimum allowed value |
| `max` | number | - | Maximum allowed value |
| `step` | number | 0.01 | Step increment |
| `disabled` | boolean | false | Whether input is disabled |
| `icon` | Component | BanknotesIcon | Icon component |
| `aria-label` | string | - | Custom aria-label |
| `aria-describedby` | string | - | Custom aria-describedby |

## Validation

The component provides built-in validation with the following rules:

- **Required fields**: Checks if value is provided when required
- **Numeric validation**: Ensures valid number input
- **Range validation**: Validates against min/max values
- **Decimal places**: Limits to 2 decimal places for currency
- **Zero values**: Configurable whether zero is allowed

## Supported Currencies

- **USD** - US Dollar
- **KHR** - Cambodian Riel
- **EUR** - Euro
- **GBP** - British Pound
- **JPY** - Japanese Yen
- And any other ISO 4217 currency code

## Accessibility Features

- **ARIA attributes**: Complete ARIA labeling and descriptions
- **Screen reader support**: Announces current value and errors
- **Keyboard navigation**: Full keyboard support with arrow keys
- **Focus management**: Proper focus indicators and tab order
- **Error announcements**: Screen readers announce validation errors

## Styling

The component uses Tailwind CSS classes and supports:

- **Dark mode**: Automatic dark mode styling
- **Error states**: Red border and error messages
- **Disabled states**: Opacity and cursor changes
- **Focus states**: Blue ring and border changes
- **Responsive**: Works on all screen sizes

## Examples

### Khmer Riel Currency

```tsx
<CurrencyInput
  label="តម្លៃសរុប"
  name="totalPrice"
  value={totalPrice}
  onChange={setTotalPrice}
  currency="KHR"
  locale="km-KH"
  min={1000}
/>
```

### USD Currency with Range

```tsx
<CurrencyInput
  label="Investment Amount"
  name="investment"
  value={investment}
  onChange={setInvestment}
  currency="USD"
  locale="en-US"
  min={1000}
  max={50000}
  required
/>
```

### Disabled State

```tsx
<CurrencyInput
  label="Previous Balance"
  name="balance"
  value={balance}
  onChange={() => {}} // No-op for disabled
  disabled
/>
```

## Integration with Form Libraries

### React Hook Form

```tsx
import { useForm } from 'react-hook-form';

function LoanForm() {
  const { register, setValue, watch } = useForm();
  const loanAmount = watch('loanAmount');

  return (
    <CurrencyInput
      label="Loan Amount"
      name="loanAmount"
      value={loanAmount || ''}
      onChange={(e) => setValue('loanAmount', e.target.value)}
      required
    />
  );
}
```

## Error Handling

The component provides clear, localized error messages:

- "Amount is required"
- "Please enter a valid number"
- "Amount must be greater than zero"
- "Amount must be at least $X.XX"
- "Amount must be no more than $X.XX"
- "Amount cannot have more than 2 decimal places"

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+

## Dependencies

- React 18+
- Tailwind CSS
- @heroicons/react
- TypeScript