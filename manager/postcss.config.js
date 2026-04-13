// postcss.config.js
module.exports = {
    plugins: [
      require('postcss-prefix-selector')({
        prefix: '.invoice-scope',
        transform: (prefix, selector, prefixed) => {
          // keep html/body selectable
          if (selector.startsWith('html') || selector.startsWith('body')) {
            return prefix;
          }
          return prefixed;
        },
      }),
      require('autoprefixer'),      // optional but typical
    ],
  };