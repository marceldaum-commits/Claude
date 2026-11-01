<?php
/**
 * Fußzeile.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;
?>
<footer class="site-footer">
	<div class="wrap">
		<div class="footer-grid">
			<div class="footer-brand">
				<span class="brand-name">Mathe <span class="hand">mit</span> Marcel</span>
				<p><?php echo esc_html( sprintf( 'Persönliche Online-Nachhilfe in Mathe und weiteren Fächern. Seit %s, von Marcel Daum und Team aus %s.', mmm_opt( 'seit' ), mmm_opt( 'ort' ) ) ); ?></p>
				<p><a href="<?php echo esc_attr( mmm_tel_href() ); ?>"><?php echo esc_html( mmm_opt( 'telefon' ) ); ?></a><br><a href="mailto:<?php echo esc_attr( mmm_opt( 'email' ) ); ?>"><?php echo esc_html( mmm_opt( 'email' ) ); ?></a></p>
				<p>★ <?php echo esc_html( sprintf( '%s bei %s Google-Bewertungen', mmm_opt( 'bewertung' ), mmm_opt( 'bewertungen' ) ) ); ?></p>
				<p><a href="<?php echo esc_url( home_url( '/online-nachhilfe-aschaffenburg/' ) ); ?>"><?php echo esc_html( sprintf( 'Online-Nachhilfe für %s & Umgebung →', mmm_opt( 'ort' ) ) ); ?></a></p>
			</div>
			<?php mmm_render_footer_columns(); ?>
		</div>
		<div class="footer-bottom">
			<span>© <?php echo esc_html( gmdate( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?> · Marcel Daum, <?php echo esc_html( mmm_opt( 'ort' ) ); ?></span>
			<nav aria-label="<?php esc_attr_e( 'Rechtliches', 'mathe-mit-marcel' ); ?>"><?php mmm_render_legal_links(); ?></nav>
		</div>
	</div>
</footer>
<?php if ( mmm_show_sticky_cta() ) : ?>
<div class="sticky-cta" data-sticky inert>
	<a class="btn btn-primary" href="<?php echo esc_url( mmm_probestunde_url() ); ?>"><?php esc_html_e( 'Kostenlose Probestunde', 'mathe-mit-marcel' ); ?></a>
	<?php if ( mmm_whatsapp_url() ) : ?>
	<a class="btn btn-secondary wa" href="<?php echo esc_url( mmm_whatsapp_url() ); ?>" rel="noopener" aria-label="<?php esc_attr_e( 'Per WhatsApp schreiben', 'mathe-mit-marcel' ); ?>">WhatsApp</a>
	<?php endif; ?>
</div>
<?php endif; ?>
<?php wp_footer(); ?>
</body>
</html>
