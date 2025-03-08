const fs = require('fs');
const path = require('path');

// Ruta al archivo del logo
const logoPath = path.join(__dirname, 'assets', 'logo.png');

// Leer el archivo como buffer
try {
  const logoBuffer = fs.readFileSync(logoPath);
  // Convertir a base64
  const logoBase64 = logoBuffer.toString('base64');
  // Guardar en un archivo temporal
  fs.writeFileSync('logo_base64.txt', logoBase64);
  console.log('Logo convertido a base64 y guardado en logo_base64.txt');
} catch (error) {
  console.error('Error al procesar el logo:', error);
}
