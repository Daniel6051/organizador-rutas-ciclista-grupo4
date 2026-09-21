// backend/services/emailService.js
const nodemailer = require('nodemailer');

// El transporter se crea una sola vez y se reutiliza en toda la app.
// Requiere estas variables de entorno en backend/.env:
//   EMAIL_USER=celedondaniel21@gmail.com
//   EMAIL_PASS=xxxx xxxx xxxx xxxx   <-- contraseña de aplicación de Gmail (NO tu contraseña normal)
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // true solo para el puerto 465
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  family: 4, // fuerza IPv4 (evita el ECONNREFUSED por IPv6 en algunas redes de Windows)
  tls: {
    // Necesario en redes donde un antivirus (Avast/Kaspersky/ESET, etc.)
    // intercepta el tráfico HTTPS con su propio certificado.
    // Solo para desarrollo local; no usar así en producción.
    rejectUnauthorized: false,
  },
});

// Verifica la conexión al arrancar el backend (opcional pero útil para debug)
transporter.verify((error) => {
  if (error) {
    console.error('❌ Error configurando el servicio de email:', error.message);
  } else {
    console.log('✅ Servicio de email listo para enviar mensajes');
  }
});

/**
 * Envía el email de recuperación de contraseña con un link/token.
 * @param {string} destinatario - email del usuario
 * @param {string} token - token de reset (sin hashear, va en la URL)
 */
async function enviarEmailRecuperacion(destinatario, token) {
  // Si tu app usa deep linking (Expo), el link puede abrir la app directamente.
  // Si todavía no lo tenés configurado, mandamos el token para que el usuario
  // lo pegue en la pantalla "Recuperar contraseña" de la app.
  const resetUrl = `${process.env.APP_DEEP_LINK || 'organizadorrutas://reset-password'}?token=${token}`;

  const mailOptions = {
    from: `"Organizador de Rutas" <${process.env.EMAIL_USER}>`,
    to: destinatario,
    subject: 'Recuperación de contraseña - Organizador de Rutas',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto;">
        <h2 style="color: #2e7d32;">Recuperar contraseña</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p>Tu código de verificación es:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #2e7d32;">
          ${token}
        </p>
        <p>Este código expira en 15 minutos. Si no pediste este cambio, ignorá este email.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
        <p style="font-size: 12px; color: #999;">
          Organizador de Rutas y Mantenimiento Ciclista
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}

module.exports = { enviarEmailRecuperacion };
