import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // Minimal shadcn required variables
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',

        // Actual color palette
        beige: {
          '500': 'hsl(var(--beige-500))',
          '100': 'hsl(var(--beige-100))',
        },
        grey: {
          '900': 'hsl(var(--grey-900))',
          '500': 'hsl(var(--grey-500))',
          '300': 'hsl(var(--grey-300))',
          '100': 'hsl(var(--grey-100))',
        },
        green: 'hsl(var(--green))',
        yellow: 'hsl(var(--yellow))',
        cyan: 'hsl(var(--cyan))',
        navy: 'hsl(var(--navy))',
        red: 'hsl(var(--red))',
        purple: 'hsl(var(--purple))',
        'purple-alt': 'hsl(var(--purple-alt))',
        turquoise: 'hsl(var(--turquoise))',
        brown: 'hsl(var(--brown))',
        magenta: 'hsl(var(--magenta))',
        blue: 'hsl(var(--blue))',
        'navy-grey': 'hsl(var(--navy-grey))',
        'army-green': 'hsl(var(--army-green))',
        gold: 'hsl(var(--gold))',
        orange: 'hsl(var(--orange))',
        white: 'hsl(var(--white))',
      },
      fontFamily: {
        sans: ['var(--font-public-sans)', 'sans-serif'],
      },
      fontSize: {
        display: [
          '3.2rem',
          {
            lineHeight: '120%',
            letterSpacing: '0px',
            fontWeight: '700',
          },
        ],
        heading: [
          '2rem',
          {
            lineHeight: '120%',
            letterSpacing: '0px',
            fontWeight: '700',
          },
        ],
        subheading: [
          '1.6rem',
          {
            lineHeight: '150%',
            letterSpacing: '0px',
            fontWeight: '700',
          },
        ],
        body: [
          '1.4rem',
          {
            lineHeight: '150%',
            letterSpacing: '0px',
            fontWeight: '400',
          },
        ],
        'body-bold': [
          '1.4rem',
          {
            lineHeight: '150%',
            letterSpacing: '0px',
            fontWeight: '700',
          },
        ],
        caption: [
          '1.2rem',
          {
            lineHeight: '150%',
            letterSpacing: '0px',
            fontWeight: '400',
          },
        ],
        'caption-bold': [
          '1.2rem',
          {
            lineHeight: '150%',
            letterSpacing: '0px',
            fontWeight: '700',
          },
        ],
      },
      spacing: {
        '50': '0.4rem', // 4px
        '100': '0.8rem', // 8px
        '150': '1.2rem', // 12px
        '200': '1.6rem', // 16px
        '250': '2rem', // 20px
        '300': '2.4rem', // 24px
        '400': '3.2rem', // 32px
        '500': '4rem', // 40px
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 0.2rem)',
        sm: 'calc(var(--radius) - 0.4rem)',
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
