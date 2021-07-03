module.exports = {
    "ignorePatterns": [
        "webpack.config.js", 
        ".eslintrc.*",
        "webpack.config.prod.js",
        "webpack.config.dev.js"
    ],
    "env": {
        "browser": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "rules": {
    }
};
