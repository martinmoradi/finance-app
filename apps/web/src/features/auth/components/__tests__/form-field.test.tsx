import React from 'react';
import { render, screen } from '@testing-library/react';
import {
  FormField,
  TypedFieldApi,
} from '@/features/auth/components/form-field';
import '@testing-library/jest-dom';

// Create spy mocks for the components
const LabelMock = jest.fn(
  ({ children, ...props }: React.PropsWithChildren<{ htmlFor?: string }>) => (
    <label data-testid='mock-label' {...props}>
      {children}
    </label>
  ),
);

// Mock the imported components
jest.mock('@/components/ui/label', () => ({
  Label: (props: React.PropsWithChildren<{ htmlFor?: string }>) => {
    LabelMock(props);
    return <label data-testid='mock-label'>{props.children}</label>;
  },
}));

jest.mock('@/components/ui/typography', () => ({
  Caption: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <div data-testid='mock-caption' {...props}>
      {children}
    </div>
  ),
  CaptionStrong: ({ children, ...props }: React.PropsWithChildren<any>) => (
    <strong data-testid='mock-caption-strong' {...props}>
      {children}
    </strong>
  ),
}));

describe('FormField Component', () => {
  // Setup a basic field for reuse
  const createMockField = (
    overrides: Partial<TypedFieldApi> = {},
  ): TypedFieldApi => ({
    name: 'test-field',
    state: {
      value: '',
      meta: {
        errors: null,
        isTouched: false,
      },
    },
    handleChange: jest.fn(),
    handleBlur: jest.fn(),
    ...overrides,
  });

  it('renders with label and children', () => {
    const field = createMockField();
    const { container } = render(
      <FormField field={field} label='Test Label'>
        <input data-testid='test-input' aria-label='test input' />
      </FormField>,
    );

    expect(screen.getByTestId('mock-label')).toBeInTheDocument();
    expect(screen.getByTestId('mock-caption-strong')).toHaveTextContent(
      'Test Label',
    );
    expect(screen.getByTestId('test-input')).toBeInTheDocument();
  });

  it('shows required asterisk when required is true', () => {
    const field = createMockField();
    render(
      <FormField field={field} label='Required Field' required={true}>
        <input aria-label='required input' />
      </FormField>,
    );

    const labelContent = screen.getByTestId('mock-caption-strong');
    expect(labelContent.innerHTML).toContain('*');
    expect(labelContent.querySelector('.text-red')).toBeInTheDocument();
  });

  it('renders help text when provided and no errors', () => {
    const field = createMockField();
    render(
      <FormField field={field} label='Test Field' helpText='This is helpful'>
        <input aria-label='help text input' />
      </FormField>,
    );

    const helpText = screen.getByTestId('mock-caption');
    expect(helpText).toHaveAttribute('id', 'test-field-help');
    expect(helpText).toHaveTextContent('This is helpful');
  });

  it('displays error message when field has errors and is touched', () => {
    const field = createMockField({
      state: {
        value: '',
        meta: {
          errors: ['error.required'],
          isTouched: true,
        },
      },
    });

    render(
      <FormField field={field} label='Test Field'>
        <input aria-label='error input' />
      </FormField>,
    );

    const errorMessage = screen.getByTestId('mock-caption');
    expect(errorMessage).toHaveAttribute('id', 'test-field-error');
    expect(errorMessage.querySelector('.text-red')).toHaveTextContent(
      'error.required',
    );
  });

  it('does not show error message when field has errors but is not touched', () => {
    const field = createMockField({
      state: {
        value: '',
        meta: {
          errors: ['error.required'],
          isTouched: false,
        },
      },
    });

    const { container } = render(
      <FormField field={field} label='Test Field' helpText='Help text'>
        <input aria-label='untouched input' />
      </FormField>,
    );

    // Should show help text instead of error
    const helpText = screen.getByTestId('mock-caption');
    expect(helpText).toHaveAttribute('id', 'test-field-help');
    expect(helpText).toHaveTextContent('Help text');
  });

  it('handles object errors with message property', () => {
    const field = createMockField({
      state: {
        value: '',
        meta: {
          errors: [{ message: 'error.invalid' }],
          isTouched: true,
        },
      },
    });

    render(
      <FormField field={field} label='Test Field'>
        <input aria-label='object error input' />
      </FormField>,
    );

    const errorMessage = screen.getByTestId('mock-caption');
    expect(errorMessage.querySelector('.text-red')).toHaveTextContent(
      'error.invalid',
    );
  });

  it('handles non-string, non-object errors by converting to string', () => {
    const field = createMockField({
      state: {
        value: '',
        meta: {
          errors: [123], // Numeric error
          isTouched: true,
        },
      },
    });

    render(
      <FormField field={field} label='Test Field'>
        <input aria-label='numeric error input' />
      </FormField>,
    );

    const errorMessage = screen.getByTestId('mock-caption');
    expect(errorMessage.querySelector('.text-red')).toHaveTextContent('123');
  });

  it('prioritizes error message over help text when both are present', () => {
    const field = createMockField({
      state: {
        value: '',
        meta: {
          errors: ['error.required'],
          isTouched: true,
        },
      },
    });

    render(
      <FormField
        field={field}
        label='Test Field'
        helpText='This help text should not appear'>
        <input aria-label='prioritized error input' />
      </FormField>,
    );

    const errorMessage = screen.getByTestId('mock-caption');
    expect(errorMessage).toHaveAttribute('id', 'test-field-error');
    expect(errorMessage.querySelector('.text-red')).toHaveTextContent(
      'error.required',
    );
    expect(errorMessage).not.toHaveTextContent(
      'This help text should not appear',
    );
  });

  it('correctly sets HTML for attribute on label to match field name', () => {
    // Reset the mock before this test
    LabelMock.mockClear();

    const field = createMockField({ name: 'username' });
    render(
      <FormField field={field} label='Username'>
        <input aria-label='username input' />
      </FormField>,
    );

    // Check that Label was called with the correct htmlFor prop
    expect(LabelMock).toHaveBeenCalled();
    const labelProps = LabelMock.mock.calls[0]?.[0];
    expect(labelProps?.htmlFor).toBe('username');
  });
});
