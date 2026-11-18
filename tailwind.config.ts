import type { Config } from 'tailwindcss';

// Tokens copied from MoMo's public UI kit @momo-kits/foundation (Consts/colors+spacing+radius.ts, theme.ts, Text/styles.ts).
export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: '#A50064', // pink_MoMo_Branding
        primary: '#EB2F96', // pink_03, theme primary
        pinkdeep: '#BC2678', // pink_01
        tonal: '#FDEAF4', // pink_09, background.tonal
        selected: '#FEF4FA', // pink_10
        pinkline: '#F7ACD5', // pink_07
        page: '#F2F2F6', // background.default
        ink: '#303233', // text.default (black_17)
        ink2: '#484848', // text.secondary (black_15)
        hint: '#646464', // black_13 (kit hint #727272, darkened for contrast on grey)
        line: '#E8E8E8', // border.default (black_04)
        line2: '#D8D8D8', // black_06
        ok: '#34C759', // green_03
        okdeep: '#2A9F47', // green_01
        okbg: '#D6F4DE', // green_08
        headerTint: '#FDCADE', // theme gradient
      },
      fontFamily: {
        sans: ['"Momo Trust Sans"', 'system-ui', 'sans-serif'],
        display: ['"Momo Trust Display"', '"Momo Trust Sans"', 'sans-serif'],
      },
      fontSize: {
        // name: [size, lineHeight] from Text/styles.ts
        'headline-l': ['28px', '40px'],
        headline: ['24px', '34px'],
        'header-m': ['18px', '26px'],
        header: ['16px', '22px'],
        'header-s': ['14px', '20px'],
        body: ['14px', '20px'],
        desc: ['12px', '18px'],
        'desc-xs': ['10px', '14px'],
      },
      borderRadius: { xs: '4px', s: '8px', m: '12px', l: '16px', xl: '24px' },
      boxShadow: { light: '2px 2px 10px rgba(48,50,51,0.07)' },
    },
  },
  plugins: [],
} satisfies Config;
