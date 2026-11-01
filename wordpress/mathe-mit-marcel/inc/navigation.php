<?php
/**
 * Hauptmenü: Desktop mit Dropdowns, Handy als Aufklapp-Liste, Fußzeile in Spalten.
 * Quelle ist das WordPress-Menü an der Position "Hauptmenü". Solange keins
 * zugewiesen ist, wird die Standard-Struktur (mmm_default_menu) gezeigt.
 *
 * Menüaufbau: oberste Ebene = Hauptpunkt (Nachhilfe, Preise …), darunter die
 * Unterpunkte. Die URL des Hauptpunkts wird zur Übersichtsseite
 * ("Alles zu Nachhilfe →"); bei "#" entfällt dieser Link.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

/**
 * Standard-Struktur nach dem Menü-Vorschlag (5 Hauptpunkte).
 */
function mmm_default_menu() {
	return array(
		array( 'Nachhilfe', '/angebot/', array(
			array( 'Online-Nachhilfe – so läuft’s', '/angebot/online-nachhilfe/' ),
			array( 'Lücken schließen', '/angebot/mathe-themen-aufarbeiten/' ),
			array( 'Prüfungsvorbereitung', '/angebot/abschlusspruefungen/' ),
			array( 'Fächer & Klassenstufen', '/faecher-klassenstufen/' ),
			array( 'Das ist dabei', '/angebot/#dabei' ),
			array( 'Für Eltern', '/angebot/#eltern' ),
		) ),
		array( 'Preise', '/stundenpakete-preise/', array(
			array( 'Stundenpakete & Preise', '/stundenpakete-preise/#einzel' ),
			array( 'Erstes Paket buchen', '/stundenpakete-preise/#erstes-paket' ),
			array( 'Weitere Angebote', '/stundenpakete-preise/#weitere' ),
		) ),
		array( 'Team', '/team/', array(
			array( 'Unsere Lehrkräfte', '/team/#lehrkraefte' ),
			array( 'Marcel & unsere Geschichte', '/team/marcel-daum/' ),
			array( 'So unterrichten wir', '/team/#konzept' ),
			array( 'Was Familien sagen', '/#bewertungen' ),
		) ),
		array( 'Kostenlos lernen', '/kostenlos-lernen/', array(
			array( 'Lernstand-Check', '/kostenlos-lernen/#lernstand-check' ),
			array( 'Textaufgaben-Kompass (PDF)', '/kostenlos-lernen/#textaufgaben' ),
			array( 'Arbeitsblätter', '/kostenlos-lernen/#arbeitsblaetter' ),
			array( 'Mathe-Bücher & Leseproben', '/kostenlos-lernen/#buecher' ),
			array( 'Lerntipps & Ratgeber', '/kostenlos-lernen/#lerntipps' ),
		) ),
		array( 'Hilfe', '/faq/', array(
			array( 'Ablauf & wichtige Infos', '/faq/#ablauf' ),
			array( 'Häufige Fragen', '/faq/#fragen' ),
			array( 'Kontakt', '/kontakt/' ),
		) ),
	);
}

function mmm_default_legal_menu() {
	return array(
		array( 'Impressum', '/impressum/' ),
		array( 'Datenschutz', '/datenschutz/' ),
		array( 'AGB', '/agb/' ),
		array( 'Widerruf', '/widerruf/' ),
	);
}

/**
 * Menübaum: [ [titel, url, kinder[ [titel, url], … ]], … ]
 */
function mmm_menu_tree( $location = 'hauptmenue' ) {
	$locations = get_nav_menu_locations();
	if ( empty( $locations[ $location ] ) ) {
		$tree = array();
		foreach ( mmm_default_menu() as $top ) {
			$kids = array();
			foreach ( $top[2] as $k ) {
				$kids[] = array( $k[0], mmm_url( $k[1] ) );
			}
			$tree[] = array( $top[0], mmm_url( $top[1] ), $kids );
		}
		return $tree;
	}
	$items = wp_get_nav_menu_items( $locations[ $location ] );
	if ( ! $items ) {
		return array();
	}
	$tree  = array();
	$index = array();
	foreach ( $items as $it ) {
		if ( ! (int) $it->menu_item_parent ) {
			$index[ $it->ID ] = count( $tree );
			$tree[]           = array( $it->title, $it->url, array() );
		}
	}
	foreach ( $items as $it ) {
		$p = (int) $it->menu_item_parent;
		if ( $p && isset( $index[ $p ] ) ) {
			$tree[ $index[ $p ] ][2][] = array( $it->title, $it->url );
		}
	}
	return $tree;
}

/**
 * Aktuelle Seite erkennen (Pfad ohne Anker).
 */
function mmm_is_current( $url ) {
	$uri  = isset( $_SERVER['REQUEST_URI'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REQUEST_URI'] ) ) : '/';
	$req  = trailingslashit( (string) wp_parse_url( $uri, PHP_URL_PATH ) );
	$path = wp_parse_url( $url, PHP_URL_PATH );
	$frag = wp_parse_url( $url, PHP_URL_FRAGMENT );
	if ( null === $path || $frag ) {
		return false;
	}
	return trailingslashit( $path ) === $req;
}

function mmm_section_current( $top ) {
	if ( mmm_is_current( $top[1] ) && '/' !== wp_parse_url( $top[1], PHP_URL_PATH ) ) {
		return true;
	}
	foreach ( $top[2] as $k ) {
		$path = wp_parse_url( $k[1], PHP_URL_PATH );
		if ( $path && '/' !== $path && mmm_is_current( strtok( $k[1], '#' ) ) ) {
			return true;
		}
	}
	return false;
}

function mmm_chevron() {
	return '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}

/**
 * Desktop-Navigation.
 */
function mmm_render_desktop_nav() {
	$tree = mmm_menu_tree();
	echo '<nav class="main-nav" aria-label="' . esc_attr__( 'Hauptmenü', 'mathe-mit-marcel' ) . '"><ul class="nav-list">';
	foreach ( $tree as $i => $top ) {
		$cls = mmm_section_current( $top ) ? 'nav-item current' : 'nav-item';
		if ( empty( $top[2] ) ) {
			printf( '<li class="%s"><a class="nav-btn" href="%s">%s</a></li>', esc_attr( $cls ), esc_url( $top[1] ), esc_html( $top[0] ) );
			continue;
		}
		printf(
			'<li class="%1$s"><button class="nav-btn" type="button" aria-expanded="false" aria-controls="dd-%2$d">%3$s%4$s</button><div class="dropdown" id="dd-%2$d"><ul>',
			esc_attr( $cls ),
			(int) $i,
			esc_html( $top[0] ),
			mmm_chevron() // phpcs:ignore WordPress.Security.EscapeOutput -- festes SVG.
		);
		if ( $top[1] && '#' !== $top[1] ) {
			/* translators: %s: Name des Hauptpunkts */
			printf( '<li class="overview"><a href="%s">%s →</a></li>', esc_url( $top[1] ), esc_html( sprintf( __( 'Alles zu %s', 'mathe-mit-marcel' ), $top[0] ) ) );
		}
		foreach ( $top[2] as $k ) {
			$cur = mmm_is_current( $k[1] ) ? ' aria-current="page"' : '';
			printf( '<li><a href="%s"%s>%s</a></li>', esc_url( $k[1] ), $cur, esc_html( $k[0] ) ); // phpcs:ignore WordPress.Security.EscapeOutput
		}
		echo '</ul></div></li>';
	}
	echo '</ul></nav>';
}

/**
 * Handy-Navigation (aufklappbar ohne JavaScript dank <details>).
 */
function mmm_render_mobile_nav() {
	foreach ( mmm_menu_tree() as $top ) {
		if ( empty( $top[2] ) ) {
			printf( '<p class="mobile-single"><a href="%s">%s</a></p>', esc_url( $top[1] ), esc_html( $top[0] ) );
			continue;
		}
		printf( '<details%s><summary>%s</summary><ul>', mmm_section_current( $top ) ? ' open' : '', esc_html( $top[0] ) );
		if ( $top[1] && '#' !== $top[1] ) {
			/* translators: %s: Name des Hauptpunkts */
			printf( '<li><a href="%s">%s</a></li>', esc_url( $top[1] ), esc_html( sprintf( __( '%s im Überblick', 'mathe-mit-marcel' ), $top[0] ) ) );
		}
		foreach ( $top[2] as $k ) {
			$cur = mmm_is_current( $k[1] ) ? ' aria-current="page"' : '';
			printf( '<li><a href="%s"%s>%s</a></li>', esc_url( $k[1] ), $cur, esc_html( $k[0] ) ); // phpcs:ignore WordPress.Security.EscapeOutput
		}
		echo '</ul></details>';
	}
}

/**
 * Fußzeile: eine Spalte je Hauptpunkt.
 */
function mmm_render_footer_columns() {
	foreach ( mmm_menu_tree() as $top ) {
		printf( '<div><h3>%s</h3><ul>', esc_html( $top[0] ) );
		$kids = $top[2] ? $top[2] : array( array( $top[0], $top[1] ) );
		foreach ( $kids as $k ) {
			printf( '<li><a href="%s">%s</a></li>', esc_url( $k[1] ), esc_html( $k[0] ) );
		}
		echo '</ul></div>';
	}
}

function mmm_render_legal_links() {
	$locations = get_nav_menu_locations();
	if ( ! empty( $locations['rechtliches'] ) ) {
		$items = wp_get_nav_menu_items( $locations['rechtliches'] );
		foreach ( (array) $items as $it ) {
			printf( '<a href="%s">%s</a>', esc_url( $it->url ), esc_html( $it->title ) );
		}
		return;
	}
	foreach ( mmm_default_legal_menu() as $l ) {
		printf( '<a href="%s">%s</a>', esc_url( mmm_url( $l[1] ) ), esc_html( $l[0] ) );
	}
}

/**
 * Warenkorb-Symbol: nur sichtbar, wenn etwas im Warenkorb liegt (Menü-Vorschlag 4.2).
 */
function mmm_render_cart_link() {
	if ( ! function_exists( 'WC' ) || ! WC()->cart ) {
		return;
	}
	$n = (int) WC()->cart->get_cart_contents_count();
	if ( $n < 1 ) {
		return;
	}
	printf(
		'<a class="icon-link cart-link" href="%1$s" aria-label="%2$s"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h2l2.4 11h11l2-8H6.2" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><circle cx="9.5" cy="19.5" r="1.5"/><circle cx="17" cy="19.5" r="1.5"/></svg><span class="cart-count">%3$d</span></a>',
		esc_url( wc_get_cart_url() ),
		/* translators: %d: Anzahl Artikel */
		esc_attr( sprintf( _n( 'Warenkorb, %d Artikel', 'Warenkorb, %d Artikel', $n, 'mathe-mit-marcel' ), $n ) ),
		$n
	);
}
