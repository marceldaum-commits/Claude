<?php
/**
 * Template Name: Design-Seite (Inhalt in voller Breite)
 * Template Post Type: page
 *
 * Für Seiten, deren Inhalt komplett aus Blöcken besteht – inklusive eigener
 * Überschrift (H1) im ersten Abschnitt. Alle importierten Seiten nutzen dies.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;
get_header();
?>
<main id="inhalt" class="entry-content design-seite">
	<?php
	while ( have_posts() ) {
		the_post();
		the_content();
	}
	?>
</main>
<?php
get_footer();
