/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      fontFamily: {
        'primary': ['Inter', '-apple-system', 'BlinkMacSystemFont', '"Segoe UI"', 'sans-serif'],
        'mono': ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      animation: {
        'shimmer': 'shimmer 2s infinite linear',
        'slide-up': 'slideUp 0.3s ease-out',
        'bounce-subtle': 'bounceSubtle 1s infinite',
        'pulse-subtle': 'pulseSubtle 2s infinite',
        'fade-in-scale': 'fadeInScale 0.3s ease-out',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideUp: {
          'from': { transform: 'translateY(20px)', opacity: '0' },
          'to': { transform: 'translateY(0)', opacity: '1' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.05)' },
        },
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.8' },
        },
        fadeInScale: {
          'from': { opacity: '0', transform: 'scale(0.95)' },
          'to': { opacity: '1', transform: 'scale(1)' },
        },
      },
      backgroundImage: {
        'primary-gradient': 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
        'secondary-gradient': 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
        'accent-gradient': 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
        'danger-gradient': 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      boxShadow: {
        'card': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        'modern': '0 8px 32px rgba(0, 0, 0, 0.1)',
        'neumorphic': '8px 8px 16px #e0e0e0, -8px -8px 16px #ffffff',
      },
      transitionDuration: {
        '150': '150ms',
        '300': '300ms',
        '500': '500ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0, 0, 0.2, 1)',
        'bounce': 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      colors: {
        'slate': {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: '#94A3B8',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
        },
        // Primary colors from Web version
        'primary': {
          DEFAULT: '#5D5CDE',
          'dark': '#4B46C7',
          'light': '#8B8DF0',
        },
        'success': '#10B981',
        'warning': '#F59E0B',
      },
      spacing: {
        '1': '0.25rem',   /* 4px */
        '2': '0.5rem',    /* 8px */
        '3': '0.75rem',   /* 12px */
        '4': '1rem',      /* 16px */
        '5': '1.25rem',   /* 20px */
        '6': '1.5rem',    /* 24px */
        '8': '2rem',      /* 32px */
        '10': '2.5rem',   /* 40px */
        '12': '3rem',     /* 48px */
        '16': '4rem',     /* 64px */
        '20': '5rem',     /* 80px */
        '24': '6rem',     /* 96px */
      },
    },
  },
  plugins: [],
};
