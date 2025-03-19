import React from 'react';
import { render, screen } from '@testing-library/react';
import { FormLayout } from '@/features/auth/components/form-layout';
import { usePathname } from '@/i18n/navigation';
import { useTranslations } from 'next-intl';

describe('FormLayout Component', () => {
  // Mock translation function
  const mockT = jest.fn((key: string) => {
    const translations: Record<string, string> = {
      'signup.title': 'Create an account',
      'signin.title': 'Sign in to your account',
      'signup.signinPrompt': 'Already have an account?',
      'signin.signupPrompt': "Don't have an account?",
      'signup.signinLink': 'Sign in',
      'signin.signupLink': 'Sign up',
    };
    return translations[key] || key;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (useTranslations as jest.Mock).mockReturnValue(mockT);
  });

  test('renders correctly for signup path', () => {
    // Mock the pathname for signup
    (usePathname as jest.Mock).mockReturnValue('/signup');

    render(
      <FormLayout>
        <div data-testid='form-content'>Test Form Content</div>
      </FormLayout>,
    );

    // Check title is for signup
    expect(screen.getByText('Create an account')).toBeInTheDocument();

    // Check form content is rendered
    expect(screen.getByTestId('form-content')).toBeInTheDocument();
    expect(screen.getByTestId('form-content')).toHaveTextContent(
      'Test Form Content',
    );

    // Check the prompt and link
    expect(screen.getByText('Already have an account?')).toBeInTheDocument();

    // Check the link destination
    const link = screen.getByTestId('navigation-link');
    expect(link).toHaveAttribute('href', '/login');
    expect(link).toHaveTextContent('Sign in');
  });

  test('renders correctly for signin path', () => {
    // Mock the pathname for signin
    (usePathname as jest.Mock).mockReturnValue('/login');

    render(
      <FormLayout>
        <div data-testid='form-content'>Test Form Content</div>
      </FormLayout>,
    );

    // Check title is for signin
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();

    // Check form content is rendered
    expect(screen.getByTestId('form-content')).toBeInTheDocument();

    // Check the prompt and link
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();

    // Check the link destination
    const link = screen.getByTestId('navigation-link');
    expect(link).toHaveAttribute('href', '/signup');
    expect(link).toHaveTextContent('Sign up');
  });

  test('renders correctly for any other path (defaults to signin)', () => {
    // Mock the pathname for some other path
    (usePathname as jest.Mock).mockReturnValue('/some-other-path');

    render(
      <FormLayout>
        <div data-testid='form-content'>Test Form Content</div>
      </FormLayout>,
    );

    // Should default to signin behavior
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    const link = screen.getByTestId('navigation-link');
    expect(link).toHaveAttribute('href', '/signup');
  });

  test('passes children correctly', () => {
    (usePathname as jest.Mock).mockReturnValue('/signup');

    render(
      <FormLayout>
        <button data-testid='custom-button'>Click me</button>
        <input
          data-testid='custom-input'
          placeholder='Enter text'
          aria-label='Test input field'
        />
      </FormLayout>,
    );

    // Check that all children are rendered
    expect(screen.getByTestId('custom-button')).toBeInTheDocument();
    expect(screen.getByTestId('custom-button')).toHaveTextContent('Click me');
    expect(screen.getByTestId('custom-input')).toBeInTheDocument();
    expect(screen.getByTestId('custom-input')).toHaveAttribute(
      'placeholder',
      'Enter text',
    );
  });
});
