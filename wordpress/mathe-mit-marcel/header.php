<?php
/**
 * Kopfzeile.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;
?><!doctype html>
<html <?php language_attributes(); ?>>
<head>
<meta charset="<?php bloginfo( 'charset' ); ?>">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="theme-color" content="#ffffff">
<?php wp_head(); ?>
</head>
<body <?php body_class(); ?>>
<?php wp_body_open(); ?>
<a class="skip" href="#inhalt"><?php esc_html_e( 'Zum Inhalt springen', 'mathe-mit-marcel' ); ?></a>
<header class="site-header">
	<div class="wrap header-inner">
		<a class="brand" href="<?php echo esc_url( home_url( '/' ) ); ?>" aria-label="<?php echo esc_attr( get_bloginfo( 'name' ) . ' – zur Startseite' ); ?>">
			<span class="brand-mark" aria-hidden="true">✓</span>
			<span class="brand-text"><span class="brand-name">Mathe <span class="hand">mit</span> Marcel</span><span class="brand-sub">Online-Nachhilfe · seit <?php echo esc_html( mmm_opt( 'seit' ) ); ?></span></span>
		</a>
		<?php mmm_render_desktop_nav(); ?>
		<div class="header-actions">
			<?php mmm_render_cart_link(); ?>
			<a class="icon-link" href="<?php echo esc_url( mmm_url( mmm_opt( 'konto_pfad' ) ) ); ?>" aria-label="<?php esc_attr_e( 'Anmelden / Kundenbereich', 'mathe-mit-marcel' ); ?>" title="<?php esc_attr_e( 'Anmelden', 'mathe-mit-marcel' ); ?>"><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg></a>
			<a class="btn btn-primary btn-small cta-desktop" href="<?php echo esc_url( mmm_probestunde_url() ); ?>"><?php esc_html_e( 'Kostenlose Probestunde', 'mathe-mit-marcel' ); ?></a>
			<a class="btn-mini" href="<?php echo esc_url( mmm_probestunde_url() ); ?>"><?php esc_html_e( 'Probestunde', 'mathe-mit-marcel' ); ?></a>
			<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg><span class="label"><?php esc_html_e( 'Menü', 'mathe-mit-marcel' ); ?></span></button>
		</div>
	</div>
	<div class="mobile-menu" id="mobile-menu" hidden>
		<nav class="wrap" aria-label="<?php esc_attr_e( 'Hauptmenü (mobil)', 'mathe-mit-marcel' ); ?>">
			<?php mmm_render_mobile_nav(); ?>
			<div class="mobile-extra">
				<a class="btn btn-primary" href="<?php echo esc_url( mmm_probestunde_url() ); ?>"><?php esc_html_e( 'Kostenlose Probestunde anfragen', 'mathe-mit-marcel' ); ?></a>
				<a class="btn btn-secondary" href="<?php echo esc_url( mmm_url( mmm_opt( 'konto_pfad' ) ) ); ?>"><?php esc_html_e( 'Anmelden (Kundenbereich)', 'mathe-mit-marcel' ); ?></a>
			</div>
		</nav>
	</div>
</header>
