<?php
/**
 * Normale Seite (z. B. Impressum, Datenschutz, AGB): Titel als Kopf, Text darunter.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;
get_header();
while ( have_posts() ) :
	the_post();
	?>
	<main id="inhalt">
		<section class="page-hero"><div class="wrap"><div class="hero-text">
			<?php if ( has_excerpt() ) : ?><p class="eyebrow"><?php echo esc_html( get_the_excerpt() ); ?></p><?php endif; ?>
			<h1><?php the_title(); ?></h1>
		</div></div></section>
		<section class="section"><div class="wrap"><div class="entry-content plain prose">
			<?php the_content(); ?>
		</div></div></section>
	</main>
	<?php
endwhile;
get_footer();
