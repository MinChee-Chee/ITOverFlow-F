import next from 'eslint-config-next';
import tailwindcss from 'eslint-plugin-tailwindcss';

const config = [
  // Ignore build artifacts and generated assets
  {
    ignores: ['.next', 'node_modules', 'dist', 'out', 'chroma-env/**'],
  },
  // Next.js base rules (includes TypeScript support)
  ...next,
  // Tailwind CSS linting using the flat config plus a few pragmatic overrides
  {
    plugins: {
      tailwindcss,
    },
    rules: {
      ...tailwindcss.configs['flat/recommended'].rules,
      // Relax rules that are noisy for this project
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react/no-unescaped-entities': 'off',
      'import/no-anonymous-default-export': 'off',
    },
  },
];

export default config;
