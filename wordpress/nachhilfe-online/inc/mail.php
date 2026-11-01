<?php
/**
 * Mailversand über das Postfach der Domain (SMTP) – ohne Plugin.
 *
 * Zugangsdaten gehören NICHT in den Code, sondern in wp-config.php
 * (Werte aus Bitwarden), oberhalb von "That's all, stop editing!":
 *
 *   define( 'MMM_SMTP_HOST', 'smtp.strato.de' );   // Server des Postfachs
 *   define( 'MMM_SMTP_PORT', 465 );                // 465 = SSL, 587 = STARTTLS
 *   define( 'MMM_SMTP_SECURE', 'ssl' );            // 'ssl' oder 'tls'
 *   define( 'MMM_SMTP_USER', 'kontakt@…' );        // Postfach
 *   define( 'MMM_SMTP_PASS', '…' );                // Passwort aus Bitwarden
 *   define( 'MMM_SMTP_FROM_NAME', 'Nachhilfe Online' );
 *
 * Fehlen die Konstanten, verschickt WordPress wie bisher (PHP mail()).
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

add_action( 'phpmailer_init', 'mmm_smtp' );
function mmm_smtp( $mailer ) {
	if ( ! defined( 'MMM_SMTP_HOST' ) || ! defined( 'MMM_SMTP_USER' ) || ! defined( 'MMM_SMTP_PASS' ) ) {
		return;
	}
	$mailer->isSMTP();
	$mailer->Host       = MMM_SMTP_HOST;
	$mailer->Port       = defined( 'MMM_SMTP_PORT' ) ? (int) MMM_SMTP_PORT : 465;
	$mailer->SMTPSecure = defined( 'MMM_SMTP_SECURE' ) ? MMM_SMTP_SECURE : 'ssl';
	$mailer->SMTPAuth   = true;
	$mailer->Username   = MMM_SMTP_USER;
	$mailer->Password   = MMM_SMTP_PASS;
	// Absender = Postfach, sonst lehnen viele Server (und Spamfilter) die Mail ab.
	$mailer->setFrom( MMM_SMTP_USER, defined( 'MMM_SMTP_FROM_NAME' ) ? MMM_SMTP_FROM_NAME : get_bloginfo( 'name' ), false );
}

/**
 * Fehlgeschlagene Mails im PHP-Fehlerprotokoll vermerken (ohne Inhalt/Empfänger).
 */
add_action( 'wp_mail_failed', function ( $error ) {
	if ( is_wp_error( $error ) ) {
		error_log( 'Nachhilfe Online: Mailversand fehlgeschlagen – ' . $error->get_error_message() ); // phpcs:ignore WordPress.PHP.DevelopmentFunctions
	}
} );
