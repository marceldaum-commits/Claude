<?php
/**
 * Theme "Nachhilfe Online" – Funktionen.
 *
 * Aufbau:
 *   inc/setup.php        Grundeinstellungen, Menüs, Skripte, Schriften
 *   inc/settings.php     Einstellungen im Customizer (Telefon, Bewertung …)
 *   inc/team-data.php    Lehrkräfte (für Team-Seite, Finder, Formular)
 *   inc/navigation.php   Hauptmenü (Desktop, Handy, Fußzeile)
 *   inc/shortcodes.php   Interaktive Bausteine ([mmm_finder] usw.)
 *   inc/forms.php        Probestunden- und Kontaktformular mit Versand
 *   inc/mail.php         Mailversand über SMTP des Postfachs (ohne Plugin)
 *   inc/seo.php          Titel, Beschreibung, Open Graph, Schema (falls kein SEO-Plugin)
 *   inc/woocommerce.php  WooCommerce-Grundlage
 *   inc/assistant.php    Einrichtungs-Assistent (Design → Nachhilfe Online)
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

define( 'MMM_VERSION', '1.0.0' );
define( 'MMM_DIR', get_template_directory() );
define( 'MMM_URI', get_template_directory_uri() );

foreach ( array( 'setup', 'settings', 'team-data', 'navigation', 'shortcodes', 'forms', 'mail', 'seo', 'woocommerce', 'assistant' ) as $mmm_file ) {
	require_once MMM_DIR . '/inc/' . $mmm_file . '.php';
}
