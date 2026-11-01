<?php
/**
 * Seite nicht gefunden.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;
get_header();
?>
<main id="inhalt">
	<section class="page-hero"><div class="wrap"><div class="hero-text">
		<p class="eyebrow">Fehler 404</p>
		<h1>Hä? Diese Seite gibt’s nicht.</h1>
		<p class="lead">Vielleicht wurde sie verschoben. Hier geht’s weiter:</p>
		<div class="btn-row stack-mobile">
			<a class="btn btn-primary" href="<?php echo esc_url( mmm_probestunde_url() ); ?>">Kostenlose Probestunde</a>
			<a class="btn btn-secondary" href="<?php echo esc_url( home_url( '/' ) ); ?>">Zur Startseite</a>
			<a class="btn btn-secondary" href="<?php echo esc_url( home_url( '/faq/' ) ); ?>">Hilfe</a>
		</div>
	</div></div></section>
</main>
<?php
get_footer();
