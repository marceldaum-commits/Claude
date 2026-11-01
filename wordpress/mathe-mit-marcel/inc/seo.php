<?php
/**
 * Titel, Meta-Beschreibung, Open Graph und Schema.org – nur, wenn kein
 * SEO-Plugin (Yoast, Rank Math, SEOPress) aktiv ist. Werte kommen aus den
 * Seiten-Feldern _mmm_seo_title / _mmm_beschreibung (vom Import gesetzt).
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

function mmm_seo_plugin_active() {
	return defined( 'WPSEO_VERSION' ) || class_exists( 'RankMath' ) || defined( 'SEOPRESS_VERSION' );
}

function mmm_meta_description() {
	if ( is_singular() ) {
		$d = get_post_meta( get_queried_object_id(), '_mmm_beschreibung', true );
		if ( $d ) {
			return $d;
		}
		$ex = get_the_excerpt( get_queried_object_id() );
		if ( $ex ) {
			return wp_trim_words( $ex, 28, '…' );
		}
	}
	return get_bloginfo( 'description' );
}

add_filter( 'pre_get_document_title', function ( $title ) {
	if ( mmm_seo_plugin_active() || ! is_singular() ) {
		return $title;
	}
	$t = get_post_meta( get_queried_object_id(), '_mmm_seo_title', true );
	return $t ? $t . ' | ' . get_bloginfo( 'name' ) : $title;
} );

add_action( 'wp_head', function () {
	if ( mmm_seo_plugin_active() ) {
		return;
	}
	$desc  = mmm_meta_description();
	$title = wp_get_document_title();
	$url   = is_singular() ? get_permalink() : home_url( add_query_arg( array() ) );
	$img   = MMM_URI . '/assets/og-bild.png';
	if ( $desc ) {
		printf( '<meta name="description" content="%s">' . "\n", esc_attr( $desc ) );
	}
	printf( '<meta property="og:type" content="website"><meta property="og:locale" content="de_DE"><meta property="og:site_name" content="%s">' . "\n", esc_attr( get_bloginfo( 'name' ) ) );
	printf( '<meta property="og:title" content="%s"><meta property="og:description" content="%s"><meta property="og:url" content="%s">' . "\n", esc_attr( $title ), esc_attr( $desc ), esc_url( $url ) );
	if ( file_exists( MMM_DIR . '/assets/og-bild.png' ) ) {
		printf( '<meta property="og:image" content="%s"><meta property="og:image:width" content="1200"><meta property="og:image:height" content="630"><meta name="twitter:card" content="summary_large_image">' . "\n", esc_url( $img ) );
	}
}, 1 );

/**
 * Schema.org: Organisation mit Bewertung (Startseite), FAQ (Seite /faq/).
 */
add_action( 'wp_head', function () {
	if ( mmm_seo_plugin_active() ) {
		return;
	}
	if ( is_front_page() ) {
		$data = array(
			'@context'        => 'https://schema.org',
			'@type'           => 'EducationalOrganization',
			'name'            => get_bloginfo( 'name' ),
			'url'             => home_url( '/' ),
			'telephone'       => mmm_opt( 'telefon' ),
			'email'           => mmm_opt( 'email' ),
			'foundingDate'    => mmm_opt( 'seit' ),
			'founder'         => array( '@type' => 'Person', 'name' => 'Marcel Daum' ),
			'address'         => array( '@type' => 'PostalAddress', 'addressLocality' => mmm_opt( 'ort' ), 'addressCountry' => 'DE' ),
			'aggregateRating' => array( '@type' => 'AggregateRating', 'ratingValue' => str_replace( ',', '.', mmm_opt( 'bewertung' ) ), 'bestRating' => '5', 'reviewCount' => mmm_opt( 'bewertungen' ) ),
		);
		echo '<script type="application/ld+json">' . wp_json_encode( $data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . '</script>' . "\n";
	}
	if ( is_page( 'faq' ) ) {
		$content = get_post_field( 'post_content', get_queried_object_id() );
		if ( preg_match_all( '#<details[^>]*>\s*<summary>(.*?)</summary>(.*?)</details>#s', $content, $m, PREG_SET_ORDER ) ) {
			$items = array();
			foreach ( $m as $qa ) {
				$items[] = array(
					'@type'          => 'Question',
					'name'           => wp_strip_all_tags( $qa[1] ),
					'acceptedAnswer' => array( '@type' => 'Answer', 'text' => trim( preg_replace( '/\s+/', ' ', wp_strip_all_tags( do_shortcode( $qa[2] ) ) ) ) ),
				);
			}
			echo '<script type="application/ld+json">' . wp_json_encode( array( '@context' => 'https://schema.org', '@type' => 'FAQPage', 'mainEntity' => $items ), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES ) . '</script>' . "\n";
		}
	}
}, 5 );
