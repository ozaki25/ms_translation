module.exports = {
    'env': {
        'browser': true,
        'jquery': true,
    },
    'extends': 'eslint:recommended',
    'rules': {
        'indent': ['error', 4],
        'linebreak-style': ['error', 'unix'],
        'quotes': ['error', 'single'],
        'semi': ['error', 'always'],
        'space-before-blocks': ['error', { 'functions': 'always', 'keywords': 'always' }],
        'eqeqeq': ['error', 'always'],
    },
};