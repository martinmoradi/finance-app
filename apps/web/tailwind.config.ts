import type { Config } from 'tailwindcss';

export default {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
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

      spacing: {
        // Base values
        0: '0',
        px: '0.1rem', // 1px

        // Core spacing scale
        0.5: '0.2rem', // 2px
        1: '0.4rem', // 4px
        1.5: '0.6rem', // 6px
        2: '0.8rem', // 8px
        2.5: '1rem', // 10px
        3: '1.2rem', // 12px
        3.5: '1.4rem', // 14px
        4: '1.6rem', // 16px
        5: '2rem', // 20px
        6: '2.4rem', // 24px
        7: '2.8rem', // 28px
        8: '3.2rem', // 32px
        9: '3.6rem', // 36px
        10: '4rem', // 40px
        11: '4.4rem', // 44px
        12: '4.8rem', // 48px
        13: '5.2rem', // 52px
        14: '5.6rem', // 56px
        16: '6.4rem', // 64px
        18: '7.2rem', // 72px
        20: '8rem', // 80px
        24: '9.6rem', // 96px
        28: '11.2rem', // 112px
        32: '12.8rem', // 128px
        36: '14.4rem', // 144px
        40: '16rem', // 160px
        44: '17.6rem', // 176px
        48: '19.2rem', // 192px
        52: '20.8rem', // 208px
        56: '22.4rem', // 224px
        60: '24rem', // 240px
        64: '25.6rem', // 256px
        72: '28.8rem', // 288px
        80: '32rem', // 320px
        96: '38.4rem', // 384px
      },
      borderRadius: {
        xl: 'calc(var(--radius) + 0.4rem)', // 1.2rem (12px)
        lg: 'var(--radius)', // 0.8rem (8px)
        md: 'calc(var(--radius) - 0.2rem)', // 0.6rem (6px)
        sm: 'calc(var(--radius) - 0.4rem)', // 0.4rem (4px)
      },
      fontFamily: {
        sans: ['var(--font-public-sans)', 'sans-serif'],
      },
      fontSize: {
        // Tailwind font sizes
        xs: '1.2rem', // 12px
        sm: '1.4rem', // 14px
        base: '1.6rem', // 16px
        lg: '1.8rem', // 18px
        xl: '2rem', // 20px
        '2xl': '2.4rem', // 24px
        '3xl': '3rem', // 30px
        '4xl': '3.6rem', // 36px
        '5xl': '4.8rem', // 48px
        '6xl': '6rem', // 60px
        '7xl': '7.2rem', // 72px
        '8xl': '9.6rem', // 96px
        '9xl': '12.8rem', // 128px

        // Custom text styles
        display: [
          'var(--font-size-display)',
          {
            lineHeight: 'var(--line-height-tight)',
            fontWeight: '700',
          },
        ],
        heading: [
          'var(--font-size-heading)',
          {
            lineHeight: 'var(--line-height-tight)',
            fontWeight: '700',
          },
        ],
        subheading: [
          'var(--font-size-subheading)',
          {
            lineHeight: 'var(--line-height-tight)',
            fontWeight: '700',
          },
        ],
        body: [
          'var(--font-size-body)',
          {
            lineHeight: 'var(--line-height-normal)',
            fontWeight: '400',
          },
        ],
        'body-bold': [
          'var(--font-size-body)',
          {
            lineHeight: 'var(--line-height-normal)',
            fontWeight: '700',
          },
        ],
        caption: [
          'var(--font-size-caption)',
          {
            lineHeight: 'var(--line-height-normal)',
            fontWeight: '400',
          },
        ],
        'caption-bold': [
          'var(--font-size-caption)',
          {
            lineHeight: 'var(--line-height-normal)',
            fontWeight: '700',
          },
        ],
      },
    },
  },
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  plugins: [require('tailwindcss-animate')],
} satisfies Config;
