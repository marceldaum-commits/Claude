<?php
/**
 * Grundeinstellungen, Menüs, Skripte, Schriften.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

add_action( 'after_setup_theme', 'mmm_setup' );
function mmm_setup() {
	load_theme_textdomain( 'nachhilfe-online', MMM_DIR . '/languages' );
	add_theme_support( 'title-tag' );
	add_theme_support( 'post-thumbnails' );
	add_theme_support( 'responsive-embeds' );
	add_theme_support( 'html5', array( 'search-form', 'comment-form', 'comment-list', 'gallery', 'caption', 'style', 'script', 'navigation-widgets' ) );
	add_theme_support( 'editor-styles' );
	add_editor_style( array( 'style.css', 'assets/css/editor.css' ) );

	register_nav_menus(
		array(
			'hauptmenue'  => __( 'Hauptmenü (Kopf- und Fußzeile)', 'nachhilfe-online' ),
			'rechtliches' => __( 'Rechtliches (Fußzeile unten)', 'nachhilfe-online' ),
		)
	);
}

/**
 * Block-Stil "Dunkel" für Buttons (zusätzlich zu Standard und "Kontur").
 */
add_action( 'init', 'mmm_block_styles' );
function mmm_block_styles() {
	if ( function_exists( 'register_block_style' ) ) {
		register_block_style( 'core/button', array( 'name' => 'dunkel', 'label' => __( 'Dunkel', 'nachhilfe-online' ) ) );
	}
}

/**
 * Styles und Skripte. Keine Google-Server: Schriften werden lokal aus
 * assets/fonts/ geladen (DSGVO), siehe assets/fonts/LIESMICH.txt.
 */
add_action( 'wp_enqueue_scripts', 'mmm_assets' );
function mmm_assets() {
	$ver = MMM_VERSION . '-' . filemtime( MMM_DIR . '/style.css' );
	wp_enqueue_style( 'mmm-style', get_stylesheet_uri(), array(), $ver );
	$fonts = mmm_font_face_css();
	if ( $fonts ) {
		wp_add_inline_style( 'mmm-style', $fonts );
	}
	wp_enqueue_script( 'mmm-theme', MMM_URI . '/assets/js/theme.js', array(), $ver, array( 'in_footer' => true, 'strategy' => 'defer' ) );
}

/**
 * @font-face nur für Schriftdateien, die wirklich im Theme liegen.
 */
function mmm_font_face_css() {
	$faces = array(
		array( 'Bricolage Grotesque', 700, 'bricolage-grotesque-700' ),
		array( 'Bricolage Grotesque', 800, 'bricolage-grotesque-800' ),
		array( 'Lexend', 400, 'lexend-400' ),
		array( 'Lexend', 600, 'lexend-600' ),
		array( 'Lexend', 700, 'lexend-700' ),
		array( 'Kalam', 400, 'kalam-400' ),
		array( 'Kalam', 700, 'kalam-700' ),
	);
	$css = '';
	foreach ( $faces as $f ) {
		foreach ( array( 'woff2' => 'woff2', 'woff' => 'woff', 'ttf' => 'truetype' ) as $ext => $format ) {
			$file = '/assets/fonts/' . $f[2] . '.' . $ext;
			if ( file_exists( MMM_DIR . $file ) ) {
				$css .= sprintf(
					"@font-face{font-family:'%s';font-style:normal;font-weight:%d;font-display:swap;src:url('%s') format('%s');}\n",
					$f[0],
					$f[1],
					esc_url( MMM_URI . $file ),
					$format
				);
				break;
			}
		}
	}
	return $css;
}

/**
 * Schriften auch im Block-Editor.
 */
add_action( 'enqueue_block_editor_assets', 'mmm_editor_assets' );
function mmm_editor_assets() {
	$fonts = mmm_font_face_css();
	if ( $fonts ) {
		wp_register_style( 'mmm-editor-fonts', false, array(), MMM_VERSION );
		wp_enqueue_style( 'mmm-editor-fonts' );
		wp_add_inline_style( 'mmm-editor-fonts', $fonts );
	}
}

/**
 * Unnötiges aus dem <head> (schnellere Seite).
 */
remove_action( 'wp_head', 'print_emoji_detection_script', 7 );
remove_action( 'wp_print_styles', 'print_emoji_styles' );
remove_action( 'admin_print_scripts', 'print_emoji_detection_script' );
remove_action( 'admin_print_styles', 'print_emoji_styles' );
remove_action( 'wp_head', 'wp_generator' );
remove_action( 'wp_head', 'wlwmanifest_link' );
remove_action( 'wp_head', 'rsd_link' );

/**
 * Body-Klassen: klebende Leiste am Handy, Design-Seite.
 */
add_filter( 'body_class', 'mmm_body_class' );
function mmm_body_class( $classes ) {
	if ( mmm_show_sticky_cta() ) {
		$classes[] = 'has-sticky';
	}
	return $classes;
}

/**
 * Ob die klebende Probestunden-Leiste am Handy erscheint.
 * Nicht auf Formular-, Rechts- und Shop-Kassenseiten.
 */
function mmm_show_sticky_cta() {
	$aus = array( 'probestunde', 'kontakt', 'impressum', 'datenschutz', 'agb', 'widerruf', 'login', 'registrieren' );
	if ( is_page( $aus ) ) {
		return false;
	}
	if ( function_exists( 'is_cart' ) && ( is_cart() || is_checkout() || is_account_page() ) ) {
		return false;
	}
	return (bool) apply_filters( 'mmm_show_sticky_cta', true );
}

/**
 * Hilfsfunktion: interner Pfad → volle URL (funktioniert auch auf Staging-Domains).
 */
function mmm_url( $path ) {
	if ( preg_match( '#^(https?:|mailto:|tel:|\#)#', $path ) ) {
		return $path;
	}
	return home_url( $path );
}
