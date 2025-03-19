import { TypedFieldApi } from '@/features/auth/components/form-field';
import { TextInputField } from '@/features/auth/components/text-input-field';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';

// Mock the dependencies
jest.mock('@/components/ui/input', () => ({
  Input: jest.fn(
    ({
      id,
      name,
      type,
      value,
      placeholder,
      onChange,
      onBlur,
      error,
      disabled,
      required,
      autoComplete,
      'aria-invalid': ariaInvalid,
      'aria-describedby': ariaDescribedBy,
    }) => (
      <input
        data-testid='mock-input'
        id={id}
        name={name}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        autoComplete={autoComplete}
        aria-invalid={ariaInvalid}
        aria-describedby={ariaDescribedBy}
        data-error={error ? 'true' : 'false'}
        aria-label='test input' // Adding aria-label to fix ESLint issue
      />
    ),
  ),
}));

jest.mock('@/features/auth/components/form-field', () => ({
  FormField: jest.fn(({ field, label, helpText, required, children }) => (
    <div data-testid='mock-form-field'>
      <div data-testid='form-field-label'>{label}</div>
      <div data-testid='form-field-required'>{required ? 'true' : 'false'}</div>
      <div data-testid='form-field-help-text'>{helpText}</div>
      {children}
    </div>
  )),
}));

describe('TextInputField', () => {
  // Common props used in tests
  const mockField: TypedFieldApi<string> = {
    name: 'test-field',
    state: {
      value: '',
      meta: {
        errors: [],
        isTouched: false,
      },
    },
    handleChange: jest.fn(),
    handleBlur: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default props', () => {
    render(<TextInputField field={mockField} label='Test Label' />);

    expect(screen.getByTestId('mock-form-field')).toBeInTheDocument();
    expect(screen.getByTestId('mock-input')).toBeInTheDocument();
    expect(screen.getByTestId('form-field-label')).toHaveTextContent(
      'Test Label',
    );
  });

  it('renders with custom props and passes them correctly', () => {
    render(
      <TextInputField
        field={mockField}
        label='Email'
        placeholder='Enter your email'
        helpText="We won't share your email"
        type='email'
        disabled={true}
        required={true}
        autoComplete='email'
      />,
    );

    const input = screen.getByTestId('mock-input');

    expect(input).toHaveAttribute('type', 'email');
    expect(input).toHaveAttribute('placeholder', 'Enter your email');
    expect(input).toHaveAttribute('disabled');
    expect(input).toHaveAttribute('required');
    expect(input).toHaveAttribute('autoComplete', 'email');

    expect(screen.getByTestId('form-field-help-text')).toHaveTextContent(
      "We won't share your email",
    );
    expect(screen.getByTestId('form-field-required')).toHaveTextContent('true');
  });

  it('handles value changes correctly', () => {
    render(<TextInputField field={mockField} label='Test Field' />);

    const input = screen.getByTestId('mock-input');
    fireEvent.change(input, { target: { value: 'new value' } });

    expect(mockField.handleChange).toHaveBeenCalledWith('new value');
  });

  it('handles blur events correctly', () => {
    render(<TextInputField field={mockField} label='Test Field' />);

    const input = screen.getByTestId('mock-input');
    fireEvent.blur(input);

    expect(mockField.handleBlur).toHaveBeenCalled();
  });

  it('sets aria-invalid and error attributes when field has errors and is touched', () => {
    const fieldWithErrors = {
      ...mockField,
      state: {
        value: '',
        meta: {
          errors: ['This field is required'],
          isTouched: true,
        },
      },
    };

    render(<TextInputField field={fieldWithErrors} label='Test Field' />);

    const input = screen.getByTestId('mock-input');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAttribute('data-error', 'true');
  });

  it('sets appropriate aria-describedby when field has errors', () => {
    const fieldWithErrors = {
      ...mockField,
      state: {
        value: '',
        meta: {
          errors: ['This field is required'],
          isTouched: true,
        },
      },
    };

    render(<TextInputField field={fieldWithErrors} label='Test Field' />);

    const input = screen.getByTestId('mock-input');
    expect(input).toHaveAttribute('aria-describedby', 'test-field-error');
  });

  it('sets appropriate aria-describedby when field has helpText and no errors', () => {
    render(
      <TextInputField
        field={mockField}
        label='Test Field'
        helpText='This is help text'
      />,
    );

    const input = screen.getByTestId('mock-input');
    expect(input).toHaveAttribute('aria-describedby', 'test-field-help');
  });

  it('handles different input types correctly', () => {
    const { rerender } = render(
      <TextInputField field={mockField} label='Test Field' type='email' />,
    );

    expect(screen.getByTestId('mock-input')).toHaveAttribute('type', 'email');

    rerender(
      <TextInputField field={mockField} label='Test Field' type='tel' />,
    );

    expect(screen.getByTestId('mock-input')).toHaveAttribute('type', 'tel');

    rerender(
      <TextInputField field={mockField} label='Test Field' type='url' />,
    );

    expect(screen.getByTestId('mock-input')).toHaveAttribute('type', 'url');

    // Test default type
    rerender(<TextInputField field={mockField} label='Test Field' />);

    expect(screen.getByTestId('mock-input')).toHaveAttribute('type', 'text');
  });

  it('handles empty string correctly', () => {
    const fieldWithEmptyString = {
      ...mockField,
      state: {
        value: '',
        meta: {
          errors: [],
          isTouched: false,
        },
      },
    };

    render(<TextInputField field={fieldWithEmptyString} label='Test Field' />);

    const input = screen.getByTestId('mock-input');
    expect(input).toHaveAttribute('value', '');
  });
});
