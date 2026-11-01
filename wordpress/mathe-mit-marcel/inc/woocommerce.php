<?php
/**
 * WooCommerce-Grundlage. Bewusst schlank: Standard-Vorlagen von WooCommerce,
 * nur im Heft-Design gestylt (siehe style.css, Abschnitt WooCommerce).
 * Der Shop wird später separat ausgebaut.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

add_action( 'after_setup_theme', function () {
	add_theme_support( 'woocommerce' );
	add_theme_support( 'wc-product-gallery-zoom' );
	add_theme_support( 'wc-product-gallery-lightbox' );
	add_theme_support( 'wc-product-gallery-slider' );
} );

if ( ! class_exists( 'WooCommerce' ) ) {
	return;
}

// Artikelnummer und Kategorien auf Produktseiten ausblenden (Analyse C8).
add_filter( 'wc_product_sku_enabled', '__return_false' );
remove_action( 'woocommerce_single_product_summary', 'woocommerce_template_single_meta', 40 );

// Eigene Hülle statt der Standard-Wrapper.
remove_action( 'woocommerce_before_main_content', 'woocommerce_output_content_wrapper', 10 );
remove_action( 'woocommerce_after_main_content', 'woocommerce_output_content_wrapper_end', 10 );
remove_action( 'woocommerce_sidebar', 'woocommerce_get_sidebar', 10 );

// Shop-Skripte nicht auf Infoseiten laden (Analyse E2).
add_action( 'wp_enqueue_scripts', function () {
	if ( is_woocommerce() || is_cart() || is_checkout() || is_account_page() ) {
		return;
	}
	wp_dequeue_script( 'wc-cart-fragments' );
	wp_dequeue_script( 'woocommerce' );
	wp_dequeue_script( 'wc-add-to-cart' );
	wp_dequeue_style( 'woocommerce-general' );
	wp_dequeue_style( 'woocommerce-layout' );
	wp_dequeue_style( 'woocommerce-smallscreen' );
}, 99 );
