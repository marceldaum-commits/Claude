<?php
/**
 * Interaktive Bausteine als Shortcodes. Im Block-Editor als Block
 * "Shortcode" eingefügt, z. B. [mmm_finder].
 *
 *   [mmm_finder]              Angebotsfinder ("Aufgabe 1")
 *   [mmm_tafelbild]           Tafelbild Schritt für Schritt (Mathe, Deutsch, Englisch)
 *   [mmm_team]                Lehrkräfte; filter="ja" zeigt Fach-Filter,
 *                             auswahl="Marcel Daum,Jule Meyer" nur diese
 *   [mmm_probestunde]         Probestunden-Formular (mit Versand)
 *   [mmm_kontaktformular]     Kontaktformular (mit Versand)
 *   [mmm_etikett]             Heftetikett → Probestunde
 *   [mmm_stempel]             Bewertungs-Stempel
 *   [mmm_vertrauen]           Zeile "★★★★★ 5,0 bei 623 Google-Bewertungen …"
 *   [mmm_bewertung_gross]     Große Bewertungsanzeige
 *   [mmm_antwortzeit_satz]    "Unverbindlich. Wir melden uns …"
 *   [mmm_kontaktdaten]        Kasten mit Telefon, E-Mail, WhatsApp
 *   [mmm_telefon_zeile]       "Lieber direkt?" + Telefon
 *   [mmm_telefon] [mmm_email] [mmm_seit] [mmm_bewertung] [mmm_bewertungen]
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

/**
 * GET-Parameter für Vorbelegung (Präfix mmm_, damit WordPress sie nicht als
 * eigene Abfrage-Variablen deutet).
 */
function mmm_get_param( $key, $max = 200 ) {
	if ( empty( $_GET[ 'mmm_' . $key ] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		return '';
	}
	$v = sanitize_text_field( wp_unslash( $_GET[ 'mmm_' . $key ] ) ); // phpcs:ignore WordPress.Security.NonceVerification
	return mb_substr( $v, 0, $max );
}

function mmm_options_html( $list, $selected = '', $placeholder = 'Bitte wählen' ) {
	$out = $placeholder !== null ? '<option value="">' . esc_html( $placeholder ) . '</option>' : '';
	foreach ( $list as $o ) {
		$out .= sprintf( '<option%s>%s</option>', selected( $selected, $o, false ), esc_html( $o ) );
	}
	return $out;
}

function mmm_placeholder( $text ) {
	return '<span class="placeholder">[' . esc_html( $text ) . ']</span>';
}

function mmm_initials( $name ) {
	$p = preg_split( '/\s+/', trim( $name ) );
	return mb_strtoupper( mb_substr( $p[0], 0, 1 ) . mb_substr( end( $p ), 0, 1 ) );
}

/* ---------------------------------------------------------------- Kleinteile */

add_shortcode( 'mmm_telefon', function () {
	return sprintf( '<a href="%s">%s</a>', esc_attr( mmm_tel_href() ), esc_html( mmm_opt( 'telefon' ) ) );
} );
add_shortcode( 'mmm_email', function () {
	$m = mmm_opt( 'email' );
	return sprintf( '<a href="mailto:%1$s">%1$s</a>', esc_html( $m ) );
} );
add_shortcode( 'mmm_seit', function () {
	return esc_html( mmm_opt( 'seit' ) );
} );
add_shortcode( 'mmm_bewertung', function () {
	return esc_html( mmm_opt( 'bewertung' ) );
} );
add_shortcode( 'mmm_bewertungen', function () {
	return esc_html( mmm_opt( 'bewertungen' ) );
} );

add_shortcode( 'mmm_vertrauen', function () {
	return sprintf(
		'<p class="trust"><span><span class="stars" aria-hidden="true">★★★★★</span> <a href="%1$s">%2$s bei %3$s Google-Bewertungen</a></span><span class="more">%4$d Lehrkräfte · seit %5$s</span></p>',
		esc_url( home_url( '/#bewertungen' ) ),
		esc_html( mmm_opt( 'bewertung' ) ),
		esc_html( mmm_opt( 'bewertungen' ) ),
		count( mmm_team() ),
		esc_html( mmm_opt( 'seit' ) )
	);
} );

add_shortcode( 'mmm_stempel', function () {
	return sprintf(
		'<a class="stamp" href="%1$s" aria-label="%2$s"><span><b>%3$s</b><i aria-hidden="true">★★★★★</i><span>%4$s Google-<br>Bewertungen</span></span></a>',
		esc_url( home_url( '/#bewertungen' ) ),
		esc_attr( sprintf( '%s von 5 Sternen bei %s Google-Bewertungen – Bewertungen ansehen', mmm_opt( 'bewertung' ), mmm_opt( 'bewertungen' ) ) ),
		esc_html( mmm_opt( 'bewertung' ) ),
		esc_html( mmm_opt( 'bewertungen' ) )
	);
} );

add_shortcode( 'mmm_bewertung_gross', function () {
	return sprintf(
		'<div class="rating-big"><p class="eyebrow">Was Familien sagen</p><p class="num">%1$s</p><p class="stars" aria-hidden="true">★★★★★</p><p><b>%2$s Google-Bewertungen</b></p><p class="small">Auszug, Originaltexte gekürzt. <a class="ext" href="%3$s" rel="noopener">Alle bei Google </a></p></div>',
		esc_html( mmm_opt( 'bewertung' ) ),
		esc_html( mmm_opt( 'bewertungen' ) ),
		esc_url( mmm_google_url() )
	);
} );

add_shortcode( 'mmm_antwortzeit_satz', function () {
	$t = mmm_opt( 'antwortzeit' );
	$s = $t ? sprintf( 'Unverbindlich. Wir melden uns innerhalb von %s.', esc_html( $t ) ) : 'Unverbindlich. Wir melden uns persönlich bei euch.';
	return '<p class="hero-note">' . $s . '</p>';
} );

add_shortcode( 'mmm_telefon_zeile', function () {
	return sprintf( '<div class="contact-line"><b>Lieber direkt?</b><a href="%s">%s</a></div>', esc_attr( mmm_tel_href() ), esc_html( mmm_opt( 'telefon' ) ) );
} );

add_shortcode( 'mmm_kontaktdaten', function () {
	$wa = mmm_whatsapp_url();
	ob_start();
	?>
	<aside class="side-box" aria-label="Direkter Kontakt">
		<div class="contact-line"><b>Telefon &amp; WhatsApp</b><a href="<?php echo esc_attr( mmm_tel_href() ); ?>"><?php echo esc_html( mmm_opt( 'telefon' ) ); ?></a></div>
		<div class="contact-line"><b>E-Mail</b><a href="mailto:<?php echo esc_attr( mmm_opt( 'email' ) ); ?>"><?php echo esc_html( mmm_opt( 'email' ) ); ?></a></div>
		<div class="contact-line"><b>Erreichbar</b><span><?php echo esc_html( mmm_opt( 'erreichbarkeit' ) ); ?></span></div>
		<div class="contact-line"><b>Sitz</b><span><?php echo esc_html( mmm_opt( 'ort' ) ); ?></span></div>
		<?php if ( $wa ) : ?>
			<a class="btn btn-dark" href="<?php echo esc_url( $wa ); ?>" rel="noopener">Per WhatsApp schreiben</a>
		<?php endif; ?>
		<p class="small">Lieber gleich starten? <a href="<?php echo esc_url( mmm_probestunde_url() ); ?>">Probestunde anfragen →</a></p>
	</aside>
	<?php
	return ob_get_clean();
} );

/* ---------------------------------------------------------------- Team */

function mmm_person_card( $t ) {
	$faecher = $t['faecher'];
	$subj    = $faecher ? esc_html( implode( ' · ', $faecher ) ) : mmm_placeholder( 'Fächer ergänzen' );
	$satz    = $t['satz'] ? esc_html( $t['satz'] ) : mmm_placeholder( 'Persönlicher Satz aus dem Profil' );
	$first   = strtok( $t['name'], ' ' );
	$pre     = add_query_arg(
		array_filter(
			array(
				'mmm_lehrkraft' => $t['name'],
				'mmm_fach'      => $faecher ? $faecher[0] : '',
			)
		),
		mmm_probestunde_url()
	);
	return sprintf(
		'<article class="card person-card" data-subjects="%1$s"><div class="person-head"><span class="avatar" aria-hidden="true">%2$s</span><div><p class="person-role">%3$s</p><p class="person-name">%4$s</p></div></div><p class="subjects">%5$s</p><p>%6$s</p><div class="card-links"><a class="card-link arrow" href="%7$s">Profil ansehen </a><a class="card-link" href="%8$s">Probestunde mit %9$s →</a></div></article>',
		esc_attr( mb_strtolower( implode( ' · ', $faecher ) ) ),
		esc_html( mmm_initials( $t['name'] ) ),
		esc_html( $t['rolle'] ),
		esc_html( $t['name'] ),
		$subj,
		$satz,
		esc_url( mmm_url( $t['url'] ) ),
		esc_url( $pre ),
		esc_html( $first )
	);
}

add_shortcode( 'mmm_team', function ( $atts ) {
	$atts = shortcode_atts( array( 'auswahl' => '', 'filter' => 'nein' ), $atts, 'mmm_team' );
	$team = mmm_team();
	if ( $atts['auswahl'] ) {
		$wanted = array_map( 'trim', explode( ',', $atts['auswahl'] ) );
		$by     = array();
		foreach ( $team as $t ) {
			$by[ $t['name'] ] = $t;
			$by[ $t['slug'] ] = $t;
		}
		$team = array();
		foreach ( $wanted as $w ) {
			if ( isset( $by[ $w ] ) ) {
				$team[] = $by[ $w ];
			}
		}
	}
	$out = '';
	if ( 'ja' === $atts['filter'] ) {
		$subjects = array();
		foreach ( $team as $t ) {
			foreach ( $t['faecher'] as $f ) {
				$subjects[ $f ] = true;
			}
		}
		$order = array( 'Mathematik', 'Physik', 'Chemie', 'Biologie', 'Deutsch', 'Englisch', 'Französisch', 'Latein', 'Spanisch', 'Informatik', 'BWL', 'Geschichte' );
		$out  .= '<div class="filter-row" role="group" aria-label="Nach Fach filtern"><button class="chip" type="button" data-filter="alle" aria-pressed="true">Alle</button>';
		foreach ( $order as $s ) {
			if ( isset( $subjects[ $s ] ) ) {
				$out .= sprintf( '<button class="chip" type="button" data-filter="%s" aria-pressed="false">%s</button>', esc_attr( mb_strtolower( $s ) ), esc_html( $s ) );
			}
		}
		$out .= '</div>';
		$out .= sprintf( '<p class="small" aria-live="polite"><span id="team-count">%d Lehrkräfte</span></p>', count( $team ) );
	}
	$out .= '<div class="grid grid-3">';
	foreach ( $team as $t ) {
		$out .= mmm_person_card( $t );
	}
	$out .= '</div>';
	return $out;
} );

/* ---------------------------------------------------------------- Angebotsfinder */

function mmm_radio_group( $name, $legend, $opts ) {
	$o = '';
	foreach ( $opts as $v => $l ) {
		$o .= sprintf( '<label class="opt"><input type="radio" name="%s" value="%s"><span class="box" aria-hidden="true"></span><span class="txt">%s</span></label>', esc_attr( $name ), esc_attr( $v ), esc_html( $l ) );
	}
	return sprintf( '<fieldset class="q"><legend>%s</legend><div class="opts">%s</div></fieldset>', $legend, $o );
}

add_shortcode( 'mmm_finder', function () {
	$faecher = array( 'Mathematik', 'Deutsch', 'Englisch', 'Physik', 'Chemie', 'Biologie', 'Französisch', 'Latein', 'Spanisch', 'Informatik', 'BWL', 'Anderes Fach' );
	ob_start();
	?>
	<section class="section" id="finder"><div class="wrap">
		<div class="section-head"><div class="task-head"><span class="task-no">Aufgabe 1</span><h2>Was passt zu euch?</h2></div><p>Kreuze an – die Lösung erscheint sofort. Ohne Anmeldung, noch kein Kauf.</p></div>
		<div class="finder">
			<form class="card finder-form" id="finder-form" aria-label="Angebotsfinder" data-counts="<?php echo esc_attr( wp_json_encode( mmm_team_counts() ) ); ?>" data-links="<?php echo esc_attr( wp_json_encode( array( 'luecken' => mmm_url( '/angebot/mathe-themen-aufarbeiten/' ), 'arbeit' => mmm_url( '/angebot/online-nachhilfe/' ), 'pruefung' => mmm_url( '/angebot/abschlusspruefungen/' ), 'fragen' => mmm_url( '/stundenpakete-preise/#weitere' ), 'preise' => mmm_url( '/stundenpakete-preise/' ), 'ueben' => mmm_url( '/kostenlos-lernen/' ), 'alle' => mmm_url( '/angebot/' ) ) ) ); ?>">
				<?php
				echo mmm_radio_group( 'wer', '<b>a)</b> Wer lernt?', array( 'grundschule' => 'Grundschule', 'mittel' => 'Klasse 5–10', 'oberstufe' => 'Klasse 11–13', 'studium' => 'Studium / Sonstiges' ) ); // phpcs:ignore WordPress.Security.EscapeOutput
				echo mmm_radio_group( 'ziel', '<b>b)</b> Worum geht’s gerade?', array( 'luecken' => 'Lücken in den Grundlagen', 'arbeit' => 'Die nächste Klassenarbeit', 'pruefung' => 'Abschlussprüfung', 'fragen' => 'Nur einzelne Fragen', 'ueben' => 'Erst mal selbst üben' ) ); // phpcs:ignore WordPress.Security.EscapeOutput
				?>
				<fieldset class="q"><legend><b>c)</b> Welches Fach?</legend><div class="field"><label class="sr" for="f-fach">Fach</label><select id="f-fach" name="fach"><?php echo mmm_options_html( $faecher, 'Mathematik', null ); // phpcs:ignore ?></select></div></fieldset>
			</form>
			<div class="result" aria-live="polite" id="finder-result">
				<p class="eyebrow">Unsere Empfehlung</p>
				<h3 data-r="title">Erst kostenlos kennenlernen</h3>
				<p data-r="text">Kreuze an, wer lernt und worum es geht – die Empfehlung passt sich sofort an.</p>
				<p class="small" data-r="note"></p>
				<div class="btn-row stack-mobile">
					<a class="btn btn-primary" href="<?php echo esc_url( mmm_probestunde_url() ); ?>" data-finder-cta>Probestunde mit diesen Angaben</a>
					<a class="btn btn-secondary" href="<?php echo esc_url( mmm_url( '/angebot/' ) ); ?>" data-r="link">Alle Angebote</a>
				</div>
			</div>
		</div>
	</div></section>
	<?php
	return ob_get_clean();
} );

/* ---------------------------------------------------------------- Tafelbild */

/**
 * Tafelbild-Beispiele je Fach. Eigene Beispiele: Eintrag ergänzen oder per
 * Filter "mmm_tafelbilder" ändern. Am besten echte Tafelbilder aus dem Unterricht.
 */
function mmm_tafelbilder() {
	return apply_filters(
		'mmm_tafelbilder',
		array(
			array( 'mathe', 'Mathe', 'Beispiel · Prozentrechnung, Klasse 7', 'Eine Jacke kostet 80 €. Im Schlussverkauf wird sie um 25 % reduziert. Wie viel kostet sie jetzt?', array(
				array( '1 · Gesucht', 'der neue Preis' ),
				array( '2 · Gegeben', 'Grundwert 80 € · Rabatt 25 %' ),
				array( '3 · Ansatz', '100 % − 25 % = 75 % bleiben' ),
				array( '4 · Rechnen', '80 € · 0,75 = 60 €' ),
				array( '5 · Prüfen', '25 % von 80 € = 20 € → 80 € − 20 € = 60 € ✓' ),
			) ),
			array( 'deutsch', 'Deutsch', 'Beispiel · das oder dass, Klasse 6', 'Ich hoffe, ___ das Wetter morgen gut wird.', array(
				array( '1 · Frage', '„das“ oder „dass“?' ),
				array( '2 · Test', '„dieses“ oder „welches“ einsetzen: „Ich hoffe, dieses das Wetter …“ – passt nicht' ),
				array( '3 · Regel', 'Passt keins davon → Bindewort → dass' ),
				array( '4 · Lösung', 'Ich hoffe, dass das Wetter morgen gut wird.' ),
				array( '5 · Prüfen', 'Nebensatz mit dem Verb am Ende („wird“) ✓' ),
			) ),
			array( 'englisch', 'Englisch', 'Beispiel · Simple Past, Klasse 6', 'Yesterday I ___ (go) to the cinema.', array(
				array( '1 · Gesucht', 'die richtige Zeitform' ),
				array( '2 · Signalwort', 'yesterday → abgeschlossen, Vergangenheit' ),
				array( '3 · Regel', 'Signalwort der Vergangenheit → Simple Past' ),
				array( '4 · Lösung', 'go → went (unregelmäßig): Yesterday I went to the cinema.' ),
				array( '5 · Prüfen', 'Nicht „have gone“ – das passt nicht zu yesterday ✓' ),
			) ),
		)
	);
}

add_shortcode( 'mmm_tafelbild', function () {
	$boards = mmm_tafelbilder();
	$out    = '<div class="boards" data-boards><div class="board-tabs" role="tablist" aria-label="Fach wählen" hidden>';
	foreach ( $boards as $i => $b ) {
		$out .= sprintf( '<button type="button" role="tab" class="chip" data-board-tab="%1$s" aria-selected="%2$s" aria-controls="board-%1$s">%3$s</button>', esc_attr( $b[0] ), 0 === $i ? 'true' : 'false', esc_html( $b[1] ) );
	}
	$out .= '</div>';
	foreach ( $boards as $b ) {
		$steps = '';
		foreach ( $b[4] as $st ) {
			$txt    = esc_html( $st[1] );
			$txt    = preg_replace( '/ ✓$/u', ' <b class="ok">✓</b>', $txt );
			$steps .= '<li><span class="lbl">' . esc_html( $st[0] ) . '</span><span class="hand">' . $txt . '</span></li>';
		}
		$out .= sprintf(
			'<div class="board paper" data-board data-board-key="%1$s" id="board-%1$s" role="tabpanel" aria-label="%2$s"><p class="board-tag">%3$s</p><p class="board-task">%4$s</p><ol class="board-steps">%5$s</ol><div class="board-ctrl"><button class="btn btn-dark btn-small" type="button" data-board-next hidden>Nächster Schritt</button><span class="small" data-board-count aria-live="polite"></span><span class="board-aha hand" data-board-aha>Aha.</span></div></div>',
			esc_attr( $b[0] ),
			esc_attr( $b[1] ),
			esc_html( $b[2] ),
			esc_html( $b[3] ),
			$steps
		);
	}
	return $out . '</div>';
} );

/* ---------------------------------------------------------------- Heftetikett */

add_shortcode( 'mmm_etikett', function () {
	ob_start();
	?>
	<form class="label-form" id="etikett" method="get" action="<?php echo esc_url( mmm_probestunde_url() ); ?>" aria-labelledby="etikett-h">
		<p class="eyebrow">Hausaufgabe für heute</p>
		<h2 id="etikett-h">Probestunde anfragen.</h2>
		<div class="label-lines">
			<label class="label-line" for="e-name"><span>Name</span><input id="e-name" name="mmm_name" autocomplete="given-name" placeholder="Vorname" maxlength="80"></label>
			<label class="label-line" for="e-fach"><span>Fach</span><select id="e-fach" name="mmm_fach"><?php echo mmm_options_html( mmm_faecher_liste(), '', 'bitte wählen' ); // phpcs:ignore ?></select></label>
			<label class="label-line" for="e-klasse"><span>Klasse</span><select id="e-klasse" name="mmm_klasse"><?php echo mmm_options_html( mmm_klassen_liste(), '', 'bitte wählen' ); // phpcs:ignore ?></select></label>
		</div>
		<div class="btn-row stack-mobile"><button class="btn btn-primary" type="submit">Weiter zur Anfrage</button><span class="small">Einmalig kostenlos pro Schülerin oder Schüler.</span></div>
	</form>
	<?php
	return ob_get_clean();
} );

/* ---------------------------------------------------------------- Formulare */

function mmm_form_state() {
	$state = isset( $_GET['mmm_anfrage'] ) ? sanitize_key( wp_unslash( $_GET['mmm_anfrage'] ) ) : ''; // phpcs:ignore WordPress.Security.NonceVerification
	$name  = '';
	if ( 'danke' === $state && ! empty( $_GET['mmm_t'] ) ) { // phpcs:ignore WordPress.Security.NonceVerification
		$token = sanitize_key( wp_unslash( $_GET['mmm_t'] ) ); // phpcs:ignore WordPress.Security.NonceVerification
		$name  = (string) get_transient( 'mmm_danke_' . $token );
		if ( '' === $name ) {
			$state = 'danke-alt';
		}
	}
	return array( $state, $name );
}

function mmm_form_hidden( $typ ) {
	$ts = (string) time();
	return sprintf(
		'<input type="hidden" name="action" value="mmm_anfrage"><input type="hidden" name="mmm_typ" value="%s"><input type="hidden" name="mmm_ts" value="%s"><input type="hidden" name="mmm_quelle" value="%s"><div class="hp" aria-hidden="true"><label for="%s-web">Website</label><input id="%s-web" name="mmm_website" tabindex="-1" autocomplete="off"></div>',
		esc_attr( $typ ),
		esc_attr( $ts . '.' . wp_hash( 'mmm' . $ts ) ),
		esc_url( get_permalink() ),
		esc_attr( $typ ),
		esc_attr( $typ )
	);
}

function mmm_field_msg( $id, $text ) {
	return sprintf( '<span class="field-msg" id="%s-msg" hidden>%s</span>', esc_attr( $id ), esc_html( $text ) );
}

function mmm_danke_box( $name, $typ ) {
	$t  = mmm_opt( 'antwortzeit' );
	$wa = mmm_whatsapp_url();
	$h  = $name ? sprintf( 'Danke, %s!', esc_html( $name ) ) : 'Danke!';
	$s  = $t ? sprintf( 'Marcel meldet sich innerhalb von %s bei dir.', esc_html( $t ) ) : 'Marcel meldet sich persönlich bei dir.';
	$out  = '<div class="success" id="anfrage" tabindex="-1"><p class="eyebrow">' . ( 'kontakt' === $typ ? 'Nachricht angekommen' : 'Anfrage angekommen' ) . '</p>';
	$out .= '<h2>' . $h . '</h2><p>' . ( 'kontakt' === $typ ? 'Deine Nachricht ist bei uns angekommen. ' : 'Deine Anfrage ist bei uns angekommen. ' ) . $s . '</p>';
	if ( $wa ) {
		$out .= '<p>Schneller geht’s per WhatsApp:</p><div class="btn-row"><a class="btn btn-dark" href="' . esc_url( $wa ) . '" rel="noopener">Jetzt per WhatsApp schreiben</a></div>';
	}
	return $out . '</div>';
}

function mmm_error_box() {
	return '<p class="form-error" role="alert">Das hat leider nicht geklappt. Bitte prüfe die Felder mit * und sende die Anfrage noch einmal – oder ruf uns an: <a href="' . esc_attr( mmm_tel_href() ) . '">' . esc_html( mmm_opt( 'telefon' ) ) . '</a>.</p>';
}

add_shortcode( 'mmm_probestunde', function () {
	list( $state, $name ) = mmm_form_state();
	if ( 'danke' === $state || 'danke-alt' === $state ) {
		return mmm_danke_box( $name, 'probestunde' );
	}
	$pre = array(
		'fach'      => mmm_get_param( 'fach', 60 ),
		'klasse'    => mmm_get_param( 'klasse', 30 ),
		'name'      => mmm_get_param( 'name', 80 ),
		'lehrkraft' => mmm_get_param( 'lehrkraft', 80 ),
		'notiz'     => mmm_get_param( 'notiz', 300 ),
	);
	$team_json = array();
	foreach ( mmm_team() as $t ) {
		$team_json[] = array( 'n' => $t['name'], 's' => mb_strtolower( implode( ' · ', $t['faecher'] ) ) );
	}
	$names = wp_list_pluck( mmm_team(), 'name' );
	ob_start();
	if ( array_filter( $pre ) ) {
		echo '<p class="prefill-note">Deine Angaben sind schon eingetragen – bitte nur noch ergänzen.</p>';
	}
	if ( 'fehler' === $state ) {
		echo mmm_error_box(); // phpcs:ignore WordPress.Security.EscapeOutput
	}
	?>
	<form class="form-card" id="anfrage" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" data-validate novalidate>
		<?php echo mmm_form_hidden( 'probestunde' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		<fieldset class="form-step"><legend><span>Schritt 1</span>Worum geht’s?</legend>
			<div class="field-row">
				<div class="field"><label for="p-fach">Fach *</label><select id="p-fach" name="mmm_fach" required aria-describedby="p-fach-msg"><?php echo mmm_options_html( mmm_faecher_liste(), $pre['fach'] ); // phpcs:ignore ?></select><?php echo mmm_field_msg( 'p-fach', 'Bitte wähle ein Fach.' ); // phpcs:ignore ?></div>
				<div class="field"><label for="p-klasse">Klasse *</label><select id="p-klasse" name="mmm_klasse" required aria-describedby="p-klasse-msg"><?php echo mmm_options_html( mmm_klassen_liste(), $pre['klasse'] ); // phpcs:ignore ?></select><?php echo mmm_field_msg( 'p-klasse', 'Bitte wähle die Klasse.' ); // phpcs:ignore ?></div>
			</div>
			<div class="field-row">
				<div class="field"><label for="p-schule">Schulform <span class="opt">(optional)</span></label><select id="p-schule" name="mmm_schulform"><?php echo mmm_options_html( mmm_schulformen_liste() ); // phpcs:ignore ?></select></div>
				<div class="field"><label for="p-lehr">Wunsch-Lehrkraft <span class="opt">(optional)</span></label><select id="p-lehr" name="mmm_lehrkraft" data-team="<?php echo esc_attr( wp_json_encode( $team_json ) ); ?>" aria-describedby="p-lehr-hint"><?php echo mmm_options_html( $names, $pre['lehrkraft'], 'Empfehlt mir jemanden' ); // phpcs:ignore ?></select><span class="hint" id="p-lehr-hint" aria-live="polite">Wähle zuerst ein Fach – dann zeigen wir passende Lehrkräfte.</span></div>
			</div>
		</fieldset>
		<fieldset class="form-step"><legend><span>Schritt 2</span>Wie erreichen wir euch?</legend>
			<div class="field-row">
				<div class="field"><label for="p-name">Name *</label><input id="p-name" name="mmm_name" autocomplete="name" required maxlength="80" value="<?php echo esc_attr( $pre['name'] ); ?>" aria-describedby="p-name-msg"><?php echo mmm_field_msg( 'p-name', 'Wie dürfen wir dich ansprechen?' ); // phpcs:ignore ?></div>
				<div class="field"><label for="p-kontakt">Handy oder E-Mail *</label><input id="p-kontakt" name="mmm_kontakt" autocomplete="email" required maxlength="120" aria-describedby="p-kontakt-msg"><?php echo mmm_field_msg( 'p-kontakt', 'Bitte Handynummer oder E-Mail angeben, damit wir antworten können.' ); // phpcs:ignore ?></div>
			</div>
			<p class="hint">Bei Kindern bitte die Kontaktdaten eines Elternteils angeben.</p>
			<div class="field"><label for="p-zeit">Wunschzeiten <span class="opt">(optional)</span></label><input id="p-zeit" name="mmm_zeiten" maxlength="200" placeholder="z. B. nachmittags, Mo/Mi"></div>
			<div class="field"><label for="p-msg">Was soll besprochen werden? <span class="opt">(optional)</span></label><textarea id="p-msg" name="mmm_nachricht" maxlength="1500"><?php echo esc_textarea( $pre['notiz'] ); ?></textarea></div>
		</fieldset>
		<p class="form-error" hidden>Bitte fülle die Felder mit * aus.</p>
		<div class="btn-row stack-mobile"><button class="btn btn-primary" type="submit">Probestunde anfragen</button></div>
		<p class="small">Wir nutzen deine Angaben nur, um uns wegen der Probestunde bei dir zu melden. <a href="<?php echo esc_url( mmm_url( '/datenschutz/' ) ); ?>">Datenschutzhinweise</a></p>
	</form>
	<?php
	return ob_get_clean();
} );

add_shortcode( 'mmm_kontaktformular', function () {
	list( $state, $name ) = mmm_form_state();
	if ( 'danke' === $state || 'danke-alt' === $state ) {
		return mmm_danke_box( $name, 'kontakt' );
	}
	ob_start();
	if ( 'fehler' === $state ) {
		echo mmm_error_box(); // phpcs:ignore WordPress.Security.EscapeOutput
	}
	?>
	<form class="form-card" id="anfrage" method="post" action="<?php echo esc_url( admin_url( 'admin-post.php' ) ); ?>" data-validate novalidate>
		<?php echo mmm_form_hidden( 'kontakt' ); // phpcs:ignore WordPress.Security.EscapeOutput ?>
		<h2 class="h-sm">Deine Nachricht</h2>
		<div class="field-row">
			<div class="field"><label for="k-name">Name *</label><input id="k-name" name="mmm_name" autocomplete="name" required maxlength="80" aria-describedby="k-name-msg"><?php echo mmm_field_msg( 'k-name', 'Bitte gib deinen Namen an.' ); // phpcs:ignore ?></div>
			<div class="field"><label for="k-kontakt">E-Mail oder Handynummer *</label><input id="k-kontakt" name="mmm_kontakt" autocomplete="email" required maxlength="120" aria-describedby="k-kontakt-msg"><?php echo mmm_field_msg( 'k-kontakt', 'Bitte E-Mail oder Handynummer angeben.' ); // phpcs:ignore ?></div>
		</div>
		<div class="field"><label for="k-klasse">Schulform und Klasse <span class="opt">(optional)</span></label><input id="k-klasse" name="mmm_klasse" maxlength="80" placeholder="z. B. Realschule, 9. Klasse"></div>
		<div class="field"><label for="k-msg">Nachricht *</label><textarea id="k-msg" name="mmm_nachricht" maxlength="1500" required aria-describedby="k-msg-msg"></textarea><?php echo mmm_field_msg( 'k-msg', 'Worum geht es? Ein Satz reicht.' ); // phpcs:ignore ?><span class="hint"><span data-count>0</span> / 1500 Zeichen</span></div>
		<p class="form-error" hidden>Bitte fülle die Felder mit * aus.</p>
		<div class="btn-row"><button class="btn btn-primary" type="submit">Nachricht senden</button></div>
		<p class="small">Wir nutzen deine Angaben nur, um dir zu antworten. <a href="<?php echo esc_url( mmm_url( '/datenschutz/' ) ); ?>">Datenschutzhinweise</a></p>
	</form>
	<?php
	return ob_get_clean();
} );
