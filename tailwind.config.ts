import type { Config } from 'tailwindcss';
const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: { 50: '#f0f6ff', 100: '#e1eefe', 200: '#c0dbfa', 300: '#8ec0f5', 400: '#5a9ee9', 500: '#1f6fc1', 600: '#155aa3', 700: '#114a85', 800: '#0f3b69', 900: '#0c2d50' },
        risk: { low: '#16a34a', medium: '#d97706', high: '#dc2626' },
      },
      fontFamily: {
        sans: ['system-ui', '-apple-system', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif'],
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [],
};
export default config;
