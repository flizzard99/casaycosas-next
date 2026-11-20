import { defineConfig } from 'eslint/config';
import next from 'eslint-config-next/core-web-vitals';

export default defineConfig(
  next,
  {
    files: ['src/context/CartContext.tsx'],
    rules: { 'react-hooks/set-state-in-effect': 'off' },
  },
);
