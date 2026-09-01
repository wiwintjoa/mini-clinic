import { createTheme, rem } from '@mantine/core';
export const clinicTheme = createTheme({
  primaryColor: 'teal',
  defaultRadius: 'md',
  fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif',
  headings: { fontFamily: 'Inter, ui-sans-serif, system-ui, sans-serif', fontWeight: '650' },
  spacing: { xs: rem(8), sm: rem(12), md: rem(16), lg: rem(24), xl: rem(32) },
  colors: { clinic: ['#f0fdfa','#ccfbf1','#99f6e4','#5eead4','#2dd4bf','#14b8a6','#0d9488','#0f766e','#115e59','#134e4a'] },
});
