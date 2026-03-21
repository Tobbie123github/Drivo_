export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', 'sans-serif'],
        display: ['Montserrat', 'sans-serif'],
      },
      colors: {
        brand: '#00C853',
        'brand-dark': '#00A843',
        'brand-light': '#E8FFF0',
      },
      fontWeight: {
        700: '700',
        800: '800',
        900: '900',
      },
      animation: {
        'slide-up': 'slideUp 0.4s cubic-bezier(0.4,0,0.2,1)',
        'slide-down': 'slideDown 0.3s cubic-bezier(0.4,0,0.2,1)',
        'fade-in': 'fadeIn 0.25s ease',
        'scale-in': 'scaleIn 0.2s ease',
        'pulse-ring': 'pulseRing 1.5s ease infinite',
      },
      keyframes: {
        slideUp: { from:{opacity:0,transform:'translateY(24px)'}, to:{opacity:1,transform:'translateY(0)'} },
        slideDown: { from:{opacity:0,transform:'translateY(-12px)'}, to:{opacity:1,transform:'translateY(0)'} },
        fadeIn: { from:{opacity:0}, to:{opacity:1} },
        scaleIn: { from:{opacity:0,transform:'scale(0.95)'}, to:{opacity:1,transform:'scale(1)'} },
        pulseRing: { '0%,100%':{transform:'scale(1)',opacity:1}, '50%':{transform:'scale(1.4)',opacity:0.4} },
      },
      boxShadow: {
        'brand': '0 0 24px rgba(0,200,83,0.3)',
        'panel': '0 -4px 40px rgba(0,0,0,0.15)',
        'card': '0 4px 24px rgba(0,0,0,0.08)',
        'float': '0 8px 32px rgba(0,0,0,0.2)',
      }
    },
  },
  plugins: [],
}
