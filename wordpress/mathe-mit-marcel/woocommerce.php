<?php
/**
 * Hülle für alle WooCommerce-Seiten (Shop, Produkt, Kategorie).
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;
get_header();
?>
<main id="inhalt" class="shop-seite">
	<section class="section"><div class="wrap">
		<?php woocommerce_content(); ?>
	</div></section>
</main>
<?php
get_footer();
