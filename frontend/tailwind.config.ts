/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: 'oklch(0.65 0.18 230)', hover: 'oklch(0.72 0.18 230)' },
        success: 'oklch(0.65 0.16 150)',
        danger: 'oklch(0.55 0.22 25)',
        warning: 'oklch(0.70 0.15 85)',
        info: 'oklch(0.60 0.10 200)',
        grid: 'oklch(0.25 0.01 260)',
      },
      fontFamily: {
        display: ['JetBrains Mono', 'Fira Code', 'monospace'],
        body: ['IBM Plex Sans', 'sans-serif'],
      },
      spacing: { '1': '4px', '2': '8px', '3': '12px', '4': '16px', '5': '24px', '6': '32px', '7': '48px', '8': '64px' },
      borderRadius: { none: '0', sm: '4px', md: '8px' },
      boxShadow: {
        none: 'none',
        sm: '0 1px 2px oklch(0 0 0 / 0.08)',
        md: '0 4px 8px oklch(0 0 0 / 0.12)',
      },
    },
  },
  plugins: [],
};
