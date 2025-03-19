import { render, screen } from '@testing-library/react';
import { Illustration } from '../illustration';
import '@testing-library/jest-dom';

// Mock the next-intl useTranslations hook
jest.mock('next-intl', () => ({
  useTranslations: () => {
    return (key: string) => {
      const translations: Record<string, string> = {
        headline: 'Mocked Headline Text',
        description: 'Mocked Description Text',
      };
      return translations[key] || key;
    };
  },
}));

// Mock the SVG components individually with the same implementation pattern
jest.mock(
  '@public/illustration-authentication.svg',
  () =>
    function MockIllustration(props: any) {
      return <div data-testid='mock-logo' className={props.className} />;
    },
);

jest.mock(
  '@public/pecunia-large.svg',
  () =>
    function MockLogo(props: any) {
      return <div data-testid='mock-logo' className={props.className} />;
    },
);

// Mock the Typography components
jest.mock('@/components/ui/typography', () => ({
  Display: ({ children }: { children: React.ReactNode }) => (
    <h1 className='text-display'>{children}</h1>
  ),
  Body: ({ children }: { children: React.ReactNode }) => (
    <p className='text-body'>{children}</p>
  ),
}));

describe('Illustration Component', () => {
  it('renders without crashing', () => {
    const { container } = render(<Illustration />);
    expect(container).toBeInTheDocument();
  });

  it('renders the main illustration SVG with correct styling', () => {
    render(<Illustration />);

    // Get all elements with mock-logo test ID
    const logos = screen.getAllByTestId('mock-logo');

    // The first one should be the main illustration (based on the test output)
    const mainIllustration = logos[0];
    expect(mainIllustration).toBeInTheDocument();
    expect(mainIllustration).toHaveClass('w-full');
    expect(mainIllustration).toHaveClass('h-full');
    expect(mainIllustration).toHaveClass('object-fit');
    expect(mainIllustration).toHaveClass('rounded-xl');
  });

  it('renders the Pecunia logo with correct styling', () => {
    render(<Illustration />);

    // Get all elements with mock-logo test ID
    const logos = screen.getAllByTestId('mock-logo');

    // The second one should be the actual logo (based on the test output)
    const logoElement = logos[1];
    expect(logoElement).toBeInTheDocument();
    expect(logoElement).toHaveClass('h-10');
  });

  it('renders the headline text with correct styling', () => {
    render(<Illustration />);
    const headlineElement = screen.getByText('Mocked Headline Text');
    expect(headlineElement).toBeInTheDocument();
    expect(headlineElement).toHaveClass('text-white');
  });

  it('renders the description text with correct styling', () => {
    render(<Illustration />);
    const descriptionElement = screen.getByText('Mocked Description Text');
    expect(descriptionElement).toBeInTheDocument();
    expect(descriptionElement).toHaveClass('text-white');
  });

  it('has the correct layout structure', () => {
    const { container } = render(<Illustration />);

    // Get the root container (parent of all elements)
    const rootElement = container.firstChild;
    expect(rootElement).toHaveClass('relative');

    // Find all absolute positioned divs
    const absoluteDivs = Array.from(container.querySelectorAll('div.absolute'));

    // Check logo wrapper positioning
    const logoWrapper = absoluteDivs.find(
      (el) =>
        el.className.includes('top-10') && el.className.includes('left-10'),
    );
    expect(logoWrapper).toBeTruthy();

    // Check text content wrapper positioning
    const textWrapper = absoluteDivs.find(
      (el) =>
        el.className.includes('left-10') &&
        el.className.includes('max-w-[48rem]') &&
        el.className.includes('top-[80%]'),
    );
    expect(textWrapper).toBeTruthy();

    // Check headline wrapper has margin bottom
    const headlineWrapper = screen
      .getByText('Mocked Headline Text')
      .closest('div');
    expect(headlineWrapper).toHaveClass('mb-6');
  });
});
