<?php
/**
 * Fallback für Beiträge, Archive und Suche (z. B. Ratgeber-Artikel).
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;
get_header();
?>
<main id="inhalt">
	<section class="page-hero"><div class="wrap"><div class="hero-text">
		<p class="eyebrow"><?php esc_html_e( 'Ratgeber', 'nachhilfe-online' ); ?></p>
		<h1><?php echo is_singular() ? esc_html( get_the_title() ) : esc_html( wp_strip_all_tags( get_the_archive_title() ? get_the_archive_title() : __( 'Lerntipps & Ratgeber', 'nachhilfe-online' ) ) ); ?></h1>
	</div></div></section>
	<section class="section"><div class="wrap">
		<?php if ( is_singular() ) : ?>
			<?php while ( have_posts() ) : the_post(); ?>
				<article class="entry-content plain prose"><?php the_content(); ?></article>
			<?php endwhile; ?>
		<?php elseif ( have_posts() ) : ?>
			<div class="grid grid-3">
				<?php while ( have_posts() ) : the_post(); ?>
					<article class="card"><h2 class="h-sm"><a href="<?php the_permalink(); ?>"><?php the_title(); ?></a></h2><p><?php echo esc_html( wp_trim_words( get_the_excerpt(), 24 ) ); ?></p><a class="card-link arrow" href="<?php the_permalink(); ?>"><?php esc_html_e( 'Weiterlesen', 'nachhilfe-online' ); ?> </a></article>
				<?php endwhile; ?>
			</div>
			<div class="pagination"><?php the_posts_pagination(); ?></div>
		<?php else : ?>
			<p><?php esc_html_e( 'Hier gibt es noch nichts.', 'nachhilfe-online' ); ?></p>
		<?php endif; ?>
	</div></section>
</main>
<?php
get_footer();
