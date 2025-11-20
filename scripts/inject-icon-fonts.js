const fs = require('fs');
const path = require('path');

// Path to the generated index.html
const indexPath = path.join(__dirname, '../dist/index.html');

// Read the current HTML
let html = fs.readFileSync(indexPath, 'utf8');

// Icon font links to inject
const iconFontsHTML = `
  <!-- Icon Fonts for @expo/vector-icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css" crossorigin="anonymous" />
  <style>
    @font-face {
      font-family: 'FontAwesome5_Brands';
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Brands.ttf') format('truetype');
      font-display: swap;
    }
    @font-face {
      font-family: 'FontAwesome5_Regular';
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Regular.ttf') format('truetype');
      font-display: swap;
    }
    @font-face {
      font-family: 'FontAwesome5_Solid';
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14/build/vendor/react-native-vector-icons/Fonts/FontAwesome5_Solid.ttf') format('truetype');
      font-display: swap;
    }
    @font-face {
      font-family: 'Ionicons';
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14/build/vendor/react-native-vector-icons/Fonts/Ionicons.ttf') format('truetype');
      font-display: swap;
    }
    @font-face {
      font-family: 'MaterialCommunityIcons';
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14/build/vendor/react-native-vector-icons/Fonts/MaterialCommunityIcons.ttf') format('truetype');
      font-display: swap;
    }
    @font-face {
      font-family: 'MaterialIcons';
      src: url('https://cdn.jsdelivr.net/npm/@expo/vector-icons@14/build/vendor/react-native-vector-icons/Fonts/MaterialIcons.ttf') format('truetype');
      font-display: swap;
    }
  </style>
`;

// Inject before </head>
html = html.replace('</head>', `${iconFontsHTML}</head>`);

// Write back
fs.writeFileSync(indexPath, html, 'utf8');

console.log('✅ Icon fonts injected successfully into dist/index.html');
