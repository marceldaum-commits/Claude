<?php
/**
 * Einrichtungs-Assistent: Design → "Nachhilfe Online einrichten".
 *
 * Legt die Seiten aus content/ an (nur fehlende – bestehende Seiten werden
 * NICHT verändert), erstellt die Menüs und setzt auf Wunsch die Startseite.
 * Gedacht für eine frische Installation oder eine Staging-Kopie in Plesk.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

add_action( 'admin_menu', function () {
	add_theme_page( __( 'Nachhilfe Online einrichten', 'nachhilfe-online' ), __( 'Nachhilfe Online einrichten', 'nachhilfe-online' ), 'manage_options', 'mmm-einrichten', 'mmm_assistant_page' );
} );

function mmm_manifest() {
	$file = MMM_DIR . '/content/manifest.json';
	if ( ! file_exists( $file ) ) {
		return array();
	}
	$data = json_decode( (string) file_get_contents( $file ), true ); // phpcs:ignore WordPress.WP.AlternativeFunctions
	return is_array( $data ) ? $data : array();
}

function mmm_find_page( $entry ) {
	if ( ! empty( $entry['front_page'] ) && get_option( 'page_on_front' ) ) {
		return get_post( (int) get_option( 'page_on_front' ) );
	}
	$path = trim( $entry['path'], '/' );
	return $path ? get_page_by_path( $path ) : get_page_by_path( $entry['slug'] );
}

function mmm_assistant_page() {
	if ( ! current_user_can( 'manage_options' ) ) {
		return;
	}
	$done = array();
	if ( isset( $_POST['mmm_einrichten'] ) && check_admin_referer( 'mmm_einrichten' ) ) {
		$done = mmm_run_setup( ! empty( $_POST['mmm_startseite'] ), ! empty( $_POST['mmm_menues'] ) );
	}
	echo '<div class="wrap"><h1>' . esc_html__( 'Nachhilfe Online einrichten', 'nachhilfe-online' ) . '</h1>';
	if ( $done ) {
		echo '<div class="notice notice-success"><ul style="list-style:disc;padding-left:20px">';
		foreach ( $done as $d ) {
			echo '<li>' . esc_html( $d ) . '</li>';
		}
		echo '</ul></div>';
	}
	echo '<p>Legt die Seiten des neuen Designs an. <strong>Vorhandene Seiten werden nicht verändert</strong> – sie bleiben, wie sie sind. Am besten auf einer Staging-Kopie ausführen (Plesk → WordPress Toolkit → Klonen).</p>';
	echo '<table class="widefat striped" style="max-width:900px"><thead><tr><th>Seite</th><th>Adresse</th><th>Status</th></tr></thead><tbody>';
	foreach ( mmm_manifest() as $e ) {
		$p      = mmm_find_page( $e );
		$status = $p ? sprintf( 'vorhanden (<a href="%s">bearbeiten</a>)', esc_url( get_edit_post_link( $p->ID ) ) ) : '<strong>wird angelegt</strong>';
		$open   = $p && false !== strpos( $p->post_content, 'class="placeholder"' ) ? ' · <span style="color:#b26b00">enthält Platzhalter</span>' : '';
		printf( '<tr><td>%s</td><td><code>%s</code></td><td>%s%s</td></tr>', esc_html( $e['title'] ), esc_html( $e['path'] ), $status, $open ); // phpcs:ignore WordPress.Security.EscapeOutput
	}
	echo '</tbody></table>';
	echo '<form method="post" style="margin-top:20px">';
	wp_nonce_field( 'mmm_einrichten' );
	echo '<p><label><input type="checkbox" name="mmm_menues" value="1" checked> Menüs „Hauptmenü“ und „Rechtliches“ anlegen und zuweisen (nur wenn noch keins zugewiesen ist)</label></p>';
	echo '<p><label><input type="checkbox" name="mmm_startseite" value="1"> Neue Startseite als Startseite der Website festlegen (nur wenn sie neu angelegt wird)</label></p>';
	submit_button( __( 'Jetzt einrichten', 'nachhilfe-online' ), 'primary', 'mmm_einrichten' );
	echo '</form>';
	echo '<h2>Danach</h2><ol><li>Design → Customizer → „Nachhilfe Online“: Telefon, Antwortzeit, Google-Link prüfen.</li><li>Gelb markierte <code>[Platzhalter]</code> in den Seiten ersetzen.</li><li>Schriften in <code>assets/fonts/</code> legen (siehe LIESMICH.txt).</li><li>Probestunden-Formular einmal selbst ausfüllen und prüfen, ob die Mail ankommt.</li></ol></div>';
}

function mmm_run_setup( $set_front, $menus ) {
	$log = array();
	$ids = array();
	foreach ( mmm_manifest() as $e ) {
		$existing = mmm_find_page( $e );
		if ( $existing ) {
			$ids[ $e['slug'] ] = $existing->ID;
			continue;
		}
		$content = file_get_contents( MMM_DIR . '/content/' . basename( $e['file'] ) ); // phpcs:ignore WordPress.WP.AlternativeFunctions
		$parent  = ( $e['parent'] && isset( $ids[ $e['parent'] ] ) ) ? $ids[ $e['parent'] ] : 0;
		$id      = wp_insert_post(
			array(
				'post_type'    => 'page',
				'post_status'  => 'publish',
				'post_title'   => $e['title'],
				'post_name'    => $e['slug'],
				'post_parent'  => $parent,
				'post_content' => wp_slash( (string) $content ),
				'meta_input'   => array(
					'_wp_page_template'   => 'templates/design-seite.php',
					'_mmm_seo_title'      => $e['seo_title'],
					'_mmm_beschreibung'   => $e['description'],
					'_yoast_wpseo_title'  => $e['seo_title'] . ' %%sep%% %%sitename%%',
					'_yoast_wpseo_metadesc' => $e['description'],
					'rank_math_title'     => $e['seo_title'] . ' %sep% %sitename%',
					'rank_math_description' => $e['description'],
				),
			),
			true
		);
		if ( is_wp_error( $id ) ) {
			$log[] = 'Fehler bei ' . $e['title'] . ': ' . $id->get_error_message();
			continue;
		}
		$ids[ $e['slug'] ] = $id;
		$log[]             = 'Angelegt: ' . $e['title'] . ' (' . $e['path'] . ')';
		if ( ! empty( $e['front_page'] ) && $set_front ) {
			update_option( 'show_on_front', 'page' );
			update_option( 'page_on_front', $id );
			$log[] = 'Als Startseite festgelegt: ' . $e['title'];
		}
	}
	if ( $menus ) {
		$log = array_merge( $log, mmm_setup_menus() );
	}
	if ( ! $log ) {
		$log[] = 'Alles war schon vorhanden – nichts geändert.';
	}
	return $log;
}

function mmm_setup_menus() {
	$log       = array();
	$locations = get_nav_menu_locations();
	if ( empty( $locations['hauptmenue'] ) ) {
		$menu_id = wp_create_nav_menu( 'Hauptmenü (Nachhilfe Online)' );
		if ( ! is_wp_error( $menu_id ) ) {
			foreach ( mmm_default_menu() as $pos => $top ) {
				$parent = wp_update_nav_menu_item( $menu_id, 0, array( 'menu-item-title' => $top[0], 'menu-item-url' => home_url( $top[1] ), 'menu-item-status' => 'publish', 'menu-item-position' => $pos ) );
				foreach ( $top[2] as $k ) {
					wp_update_nav_menu_item( $menu_id, 0, array( 'menu-item-title' => $k[0], 'menu-item-url' => home_url( $k[1] ), 'menu-item-status' => 'publish', 'menu-item-parent-id' => $parent ) );
				}
			}
			$locations['hauptmenue'] = $menu_id;
			$log[]                   = 'Hauptmenü angelegt.';
		}
	}
	if ( empty( $locations['rechtliches'] ) ) {
		$menu_id = wp_create_nav_menu( 'Rechtliches (Nachhilfe Online)' );
		if ( ! is_wp_error( $menu_id ) ) {
			foreach ( mmm_default_legal_menu() as $l ) {
				wp_update_nav_menu_item( $menu_id, 0, array( 'menu-item-title' => $l[0], 'menu-item-url' => home_url( $l[1] ), 'menu-item-status' => 'publish' ) );
			}
			$locations['rechtliches'] = $menu_id;
			$log[]                    = 'Menü „Rechtliches“ angelegt.';
		}
	}
	set_theme_mod( 'nav_menu_locations', $locations );
	return $log;
}
