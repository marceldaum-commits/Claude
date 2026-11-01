<?php
/**
 * Einstellungen im Customizer: Design → Customizer → "Mathe mit Marcel".
 * Alles, was sich ändern kann (Telefon, Bewertung, Antwortzeit …), steht hier
 * statt fest im Text.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

/**
 * Standardwerte (aus der bisherigen Website übernommen).
 */
function mmm_defaults() {
	return array(
		'telefon'          => '+49 170 3141596',
		'whatsapp'         => '491703141596',
		'email'            => 'marcel.daum@mathenachhilfe-online.com',
		'email_empfaenger' => '',
		'erreichbarkeit'   => 'täglich 9–17 Uhr',
		'antwortzeit'      => '',
		'bewertung'        => '5,0',
		'bewertungen'      => '623',
		'google_url'       => '',
		'seit'             => '2001',
		'ort'              => 'Aschaffenburg',
		'probestunde_pfad' => '/probestunde/',
		'konto_pfad'       => '/login/',
		'loeschfrist'      => 180,
	);
}

/**
 * Wert lesen.
 */
function mmm_opt( $key ) {
	$d = mmm_defaults();
	$v = get_theme_mod( 'mmm_' . $key, isset( $d[ $key ] ) ? $d[ $key ] : '' );
	return is_string( $v ) ? trim( $v ) : $v;
}

function mmm_probestunde_url() {
	return mmm_url( mmm_opt( 'probestunde_pfad' ) );
}

function mmm_whatsapp_url() {
	$n = preg_replace( '/\D+/', '', (string) mmm_opt( 'whatsapp' ) );
	return $n ? 'https://wa.me/' . $n : '';
}

function mmm_tel_href() {
	return 'tel:' . preg_replace( '/[^\d+]/', '', (string) mmm_opt( 'telefon' ) );
}

function mmm_google_url() {
	$u = mmm_opt( 'google_url' );
	return $u ? $u : 'https://www.google.com/search?q=' . rawurlencode( 'Mathenachhilfe-Online Marcel Daum ' . mmm_opt( 'ort' ) );
}

add_action( 'customize_register', 'mmm_customize' );
function mmm_customize( $wp_customize ) {
	$wp_customize->add_section(
		'mmm',
		array(
			'title'       => __( 'Mathe mit Marcel', 'mathe-mit-marcel' ),
			'description' => __( 'Kontaktdaten, Bewertung und Formulare. Diese Werte erscheinen automatisch überall auf der Website.', 'mathe-mit-marcel' ),
			'priority'    => 30,
		)
	);
	$fields = array(
		'telefon'          => array( 'Telefon (Anzeige)', 'text', '' ),
		'whatsapp'         => array( 'WhatsApp-Nummer (nur Ziffern, mit Ländervorwahl, z. B. 491703141596)', 'text', '' ),
		'email'            => array( 'E-Mail für Kundinnen und Kunden (wird angezeigt)', 'email', '' ),
		'email_empfaenger' => array( 'Formular-Anfragen gehen an (leer = Admin-E-Mail)', 'email', '' ),
		'erreichbarkeit'   => array( 'Erreichbarkeit', 'text', '' ),
		'antwortzeit'      => array( 'Antwortzeit, z. B. "24 Stunden" (nur eintragen, wenn sie sicher eingehalten wird; leer = kein Versprechen)', 'text', '' ),
		'bewertung'        => array( 'Google-Bewertung (z. B. 5,0)', 'text', '' ),
		'bewertungen'      => array( 'Anzahl Google-Bewertungen', 'text', '' ),
		'google_url'       => array( 'Link zum Google-Unternehmensprofil (Bewertungen)', 'url', '' ),
		'seit'             => array( 'Nachhilfe seit (Jahr)', 'text', '' ),
		'ort'              => array( 'Ort', 'text', '' ),
		'probestunde_pfad' => array( 'Seite der Probestunde (Pfad)', 'text', '' ),
		'konto_pfad'       => array( 'Kundenbereich / Anmelden (Pfad)', 'text', '' ),
		'loeschfrist'      => array( 'Gespeicherte Anfragen automatisch löschen nach … Tagen (0 = nie)', 'number', '' ),
	);
	$d = mmm_defaults();
	foreach ( $fields as $key => $f ) {
		$sanitize = 'sanitize_text_field';
		if ( 'email' === $f[1] ) {
			$sanitize = 'sanitize_email';
		} elseif ( 'url' === $f[1] ) {
			$sanitize = 'esc_url_raw';
		} elseif ( 'number' === $f[1] ) {
			$sanitize = 'absint';
		}
		$wp_customize->add_setting( 'mmm_' . $key, array( 'default' => $d[ $key ], 'sanitize_callback' => $sanitize ) );
		$wp_customize->add_control( 'mmm_' . $key, array( 'label' => $f[0], 'section' => 'mmm', 'type' => $f[1] ) );
	}
}
