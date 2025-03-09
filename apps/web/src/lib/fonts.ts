import localFont from 'next/font/local';

export const publicSans = localFont({
  src: [
    {
      path: '../../public/fonts/PublicSans-VariableFont_wght.ttf',
      style: 'normal',
      weight: '100 900', // Variable font covers all weights
    },
    {
      path: '../../public/fonts/PublicSans-Italic-VariableFont_wght.ttf',
      style: 'italic',
      weight: '100 900',
    },
  ],
  display: 'swap',
  variable: '--font-public-sans', // Creates a CSS variable
});
