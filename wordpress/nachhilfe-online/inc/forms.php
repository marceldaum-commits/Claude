<?php
/**
 * Probestunden- und Kontaktformular.
 *
 * - Versand per wp_mail() an die Adresse aus dem Customizer (sonst Admin-E-Mail).
 * - Jede Anfrage wird zusätzlich im Admin unter "Anfragen" gespeichert
 *   (privat), damit nichts verloren geht, falls eine Mail nicht ankommt.
 * - Spam-Schutz ohne Google: unsichtbares Feld (Honeypot), Mindest-Ausfüllzeit
 *   und eine Begrenzung pro Stunde. Keine Einwilligungs-Checkbox nötig.
 * - Gespeicherte Anfragen werden nach der eingestellten Frist automatisch
 *   gelöscht (Customizer, Standard 180 Tage). In der Datenschutzerklärung erwähnen.
 *
 * Zuverlässiger Versand über das Postfach der Domain: siehe inc/mail.php
 * (SMTP ohne Plugin, Zugangsdaten in wp-config.php).
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

add_action( 'init', 'mmm_register_anfragen' );
function mmm_register_anfragen() {
	register_post_type(
		'mmm_anfrage',
		array(
			'labels'          => array(
				'name'          => __( 'Anfragen', 'nachhilfe-online' ),
				'singular_name' => __( 'Anfrage', 'nachhilfe-online' ),
				'menu_name'     => __( 'Anfragen', 'nachhilfe-online' ),
				'all_items'     => __( 'Alle Anfragen', 'nachhilfe-online' ),
				'edit_item'     => __( 'Anfrage ansehen', 'nachhilfe-online' ),
				'not_found'     => __( 'Noch keine Anfragen.', 'nachhilfe-online' ),
			),
			'public'          => false,
			'show_ui'         => true,
			'show_in_menu'    => true,
			'show_in_rest'    => false,
			'menu_position'   => 26,
			'menu_icon'       => 'dashicons-email-alt',
			'supports'        => array( 'title', 'editor' ),
			'capability_type' => 'page',
			'capabilities'    => array( 'create_posts' => 'do_not_allow' ),
			'map_meta_cap'    => true,
		)
	);
}

add_action( 'admin_post_nopriv_mmm_anfrage', 'mmm_handle_anfrage' );
add_action( 'admin_post_mmm_anfrage', 'mmm_handle_anfrage' );

function mmm_post_field( $key, $max = 200, $multiline = false ) {
	if ( ! isset( $_POST[ 'mmm_' . $key ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification -- öffentliches Formular, Schutz über Honeypot/Zeit/Limit.
		return '';
	}
	$raw = wp_unslash( $_POST[ 'mmm_' . $key ] ); // phpcs:ignore WordPress.Security.NonceVerification, WordPress.Security.ValidatedSanitizedInput
	$v   = $multiline ? sanitize_textarea_field( $raw ) : sanitize_text_field( $raw );
	return mb_substr( trim( $v ), 0, $max );
}

function mmm_handle_anfrage() {
	$quelle = wp_validate_redirect( esc_url_raw( mmm_post_field( 'quelle', 500 ) ), home_url( '/' ) );
	$typ    = 'kontakt' === mmm_post_field( 'typ', 20 ) ? 'kontakt' : 'probestunde';

	$f = array(
		'name'      => mmm_post_field( 'name', 80 ),
		'kontakt'   => mmm_post_field( 'kontakt', 120 ),
		'fach'      => mmm_post_field( 'fach', 60 ),
		'klasse'    => mmm_post_field( 'klasse', 80 ),
		'schulform' => mmm_post_field( 'schulform', 60 ),
		'lehrkraft' => mmm_post_field( 'lehrkraft', 80 ),
		'zeiten'    => mmm_post_field( 'zeiten', 200 ),
		'nachricht' => mmm_post_field( 'nachricht', 1500, true ),
	);

	// 1) Bots: Honeypot ausgefüllt oder Formular in unter 3 Sekunden abgeschickt.
	$bot = '' !== mmm_post_field( 'website', 200 );
	$ts  = explode( '.', mmm_post_field( 'ts', 100 ) );
	if ( 2 === count( $ts ) && hash_equals( wp_hash( 'mmm' . $ts[0] ), $ts[1] ) && ( time() - (int) $ts[0] ) < 3 ) {
		$bot = true;
	}
	if ( $bot ) {
		// So tun, als ob alles geklappt hat – Bots bekommen keinen Hinweis.
		wp_safe_redirect( add_query_arg( array( 'mmm_anfrage' => 'danke' ), $quelle ) . '#anfrage' );
		exit;
	}

	// 2) Pflichtfelder.
	$pflicht = 'kontakt' === $typ ? array( 'name', 'kontakt', 'nachricht' ) : array( 'fach', 'klasse', 'name', 'kontakt' );
	foreach ( $pflicht as $p ) {
		if ( '' === $f[ $p ] ) {
			wp_safe_redirect( add_query_arg( array( 'mmm_anfrage' => 'fehler' ), $quelle ) . '#anfrage' );
			exit;
		}
	}

	// 3) Begrenzung: höchstens 5 Anfragen pro Stunde je Anschluss.
	$ip   = isset( $_SERVER['REMOTE_ADDR'] ) ? sanitize_text_field( wp_unslash( $_SERVER['REMOTE_ADDR'] ) ) : '';
	$rkey = 'mmm_rl_' . md5( $ip . gmdate( 'YmdH' ) );
	$cnt  = (int) get_transient( $rkey );
	if ( $cnt >= 5 ) {
		wp_safe_redirect( add_query_arg( array( 'mmm_anfrage' => 'fehler' ), $quelle ) . '#anfrage' );
		exit;
	}
	set_transient( $rkey, $cnt + 1, HOUR_IN_SECONDS );

	// 4) Speichern.
	$labels = array(
		'name'      => 'Name',
		'kontakt'   => 'Handy / E-Mail',
		'fach'      => 'Fach',
		'klasse'    => 'Klasse',
		'schulform' => 'Schulform',
		'lehrkraft' => 'Wunsch-Lehrkraft',
		'zeiten'    => 'Wunschzeiten',
		'nachricht' => 'Nachricht',
	);
	$lines = array();
	foreach ( $labels as $k => $l ) {
		if ( '' !== $f[ $k ] ) {
			$lines[] = $l . ': ' . $f[ $k ];
		}
	}
	$titel = 'kontakt' === $typ
		? sprintf( 'Kontakt: %s', $f['name'] )
		: sprintf( 'Probestunde: %s – %s, %s', $f['name'], $f['fach'], $f['klasse'] );
	$text  = implode( "\n", $lines ) . "\n\nGesendet von: " . $quelle;

	$post_id = wp_insert_post(
		array(
			'post_type'    => 'mmm_anfrage',
			'post_status'  => 'private',
			'post_title'   => $titel,
			'post_content' => $text,
		)
	);
	if ( $post_id && ! is_wp_error( $post_id ) ) {
		update_post_meta( $post_id, '_mmm_typ', $typ );
		update_post_meta( $post_id, '_mmm_kontakt', $f['kontakt'] );
	}

	// 5) Mail an Marcel.
	$to      = mmm_opt( 'email_empfaenger' ) ? mmm_opt( 'email_empfaenger' ) : get_option( 'admin_email' );
	$headers = array( 'Content-Type: text/plain; charset=UTF-8' );
	if ( is_email( $f['kontakt'] ) ) {
		$headers[] = 'Reply-To: ' . str_replace( array( "\r", "\n", '<', '>' ), '', $f['name'] ) . ' <' . $f['kontakt'] . '>';
	}
	$sent = wp_mail( $to, 'Neue ' . $titel, $text . "\n\nAlle Anfragen: " . admin_url( 'edit.php?post_type=mmm_anfrage' ), $headers );
	if ( $post_id && ! is_wp_error( $post_id ) ) {
		update_post_meta( $post_id, '_mmm_mail', $sent ? 1 : 0 );
	}

	// 6) Bestätigung an die Familie (nur bei E-Mail-Adresse).
	if ( is_email( $f['kontakt'] ) ) {
		$t    = mmm_opt( 'antwortzeit' );
		$body = sprintf( "Hallo %s,\n\n", $f['name'] );
		$body .= 'kontakt' === $typ ? "danke für deine Nachricht.\n" : "danke für deine Anfrage zur kostenlosen Probestunde.\n";
		$body .= $t ? sprintf( "Marcel meldet sich innerhalb von %s persönlich bei dir.\n", $t ) : "Marcel meldet sich persönlich bei dir.\n";
		if ( mmm_whatsapp_url() ) {
			$body .= sprintf( "\nSchneller geht's per WhatsApp: %s\n", mmm_whatsapp_url() );
		}
		$body .= sprintf( "\nViele Grüße\n%s\n%s\n%s\n", get_bloginfo( "name" ), mmm_opt( "telefon" ), home_url( "/" ) );
		wp_mail( $f['kontakt'], 'kontakt' === $typ ? 'Deine Nachricht an ' . get_bloginfo( 'name' ) : 'Deine Anfrage zur Probestunde', $body, array( 'Content-Type: text/plain; charset=UTF-8' ) );
	}

	// 7) Danke-Seite (Vorname nur kurz zwischengespeichert, nicht in der URL).
	$token = wp_generate_password( 12, false );
	set_transient( 'mmm_danke_' . strtolower( $token ), strtok( $f['name'], ' ' ), 15 * MINUTE_IN_SECONDS );
	wp_safe_redirect( add_query_arg( array( 'mmm_anfrage' => 'danke', 'mmm_t' => strtolower( $token ) ), $quelle ) . '#anfrage' );
	exit;
}

/**
 * Admin-Liste: Typ, Kontakt, Mail-Status.
 */
add_filter( 'manage_mmm_anfrage_posts_columns', function ( $cols ) {
	return array(
		'cb'          => $cols['cb'],
		'title'       => __( 'Anfrage', 'nachhilfe-online' ),
		'mmm_kontakt' => __( 'Kontakt', 'nachhilfe-online' ),
		'mmm_mail'    => __( 'Mail', 'nachhilfe-online' ),
		'date'        => $cols['date'],
	);
} );
add_action( 'manage_mmm_anfrage_posts_custom_column', function ( $col, $post_id ) {
	if ( 'mmm_kontakt' === $col ) {
		echo esc_html( get_post_meta( $post_id, '_mmm_kontakt', true ) );
	} elseif ( 'mmm_mail' === $col ) {
		echo get_post_meta( $post_id, '_mmm_mail', true ) ? '✓ verschickt' : '<strong style="color:#b42318">✗ nicht verschickt – bitte selbst melden</strong>';
	}
}, 10, 2 );

/**
 * Automatisches Löschen alter Anfragen (täglich).
 */
add_action( 'init', function () {
	if ( ! wp_next_scheduled( 'mmm_anfragen_aufraeumen' ) ) {
		wp_schedule_event( time() + HOUR_IN_SECONDS, 'daily', 'mmm_anfragen_aufraeumen' );
	}
} );
add_action( 'switch_theme', function () {
	wp_clear_scheduled_hook( 'mmm_anfragen_aufraeumen' );
} );
add_action( 'mmm_anfragen_aufraeumen', function () {
	$tage = (int) mmm_opt( 'loeschfrist' );
	if ( $tage < 1 ) {
		return;
	}
	$alt = get_posts(
		array(
			'post_type'      => 'mmm_anfrage',
			'post_status'    => 'any',
			'posts_per_page' => 200,
			'fields'         => 'ids',
			'date_query'     => array( array( 'before' => $tage . ' days ago' ) ),
		)
	);
	foreach ( $alt as $id ) {
		wp_delete_post( $id, true );
	}
} );
