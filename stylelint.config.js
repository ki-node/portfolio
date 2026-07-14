export default {
  extends: ['stylelint-config-standard'],
  ignoreFiles: ['coverage/**', 'dist/**', 'dist-embedded/**', 'node_modules/**'],
  rules: {
    'alpha-value-notation': null,
    'color-function-alias-notation': null,
    'color-function-notation': null,
    'color-hex-length': null,
    'custom-property-empty-line-before': null,
    'declaration-empty-line-before': null,
    'declaration-block-no-redundant-longhand-properties': null,
    'media-feature-range-notation': null,
    'no-descending-specificity': null,
    'property-no-vendor-prefix': null,
    'rule-empty-line-before': null,
    'selector-class-pattern': null,
    'value-keyword-case': null,
  },
};
