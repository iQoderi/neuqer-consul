module.exports = {
    root: true,
    parserOptions: {
        ecmascript: 6,
        sourceType: 'module',
    },
    env: {
        browser: true,
        node: true,
        mocha: true,
    },
    extends: 'airbnb',
    rules: {
        indent: ["error", 4]
    }
};