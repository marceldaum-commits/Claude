<?php
/**
 * Lehrkräfte. Quelle: Team-Seite der bisherigen Website (Stand 31.10.2026).
 * Die Profilseiten (/team/…/) bleiben die bestehenden WordPress-Seiten.
 *
 * Ändern: Eintrag anpassen, hinzufügen oder löschen. "satz" leer lassen,
 * wenn noch kein persönlicher Satz vorliegt – dann erscheint ein Hinweis.
 * Per Filter "mmm_team" lässt sich die Liste auch aus einem Plugin ändern.
 *
 * @package MatheMitMarcel
 */

defined( 'ABSPATH' ) || exit;

function mmm_team() {
	$team = array(
		array( 'marcel-daum', 'Marcel Daum', 'Inhaber · Mathe-Coach', 'Mathematik, Physik, BWL', 'Seit 2001 in der Nachhilfe · erklärt erst die Idee, dann die Formel.' ),
		array( 'aaron-schwarz', 'Aaron Schwarz', 'Fachlehrkraft', 'Mathematik, Physik', '' ),
		array( 'adriana-lugoli', 'Adriana Llugolli', 'Fachlehrkraft', 'Mathematik, Englisch, Französisch', 'Studiert Grundschullehramt – mit Französisch, Englisch, Mathe und Deutsch.' ),
		array( 'alica-kuc', 'Alisa Kuc', 'Fachlehrkraft', 'Deutsch, Englisch, Spanisch, Biologie, Geschichte', '' ),
		array( 'chantal-amelia-pereira', 'Chantal Amélia Pereira', 'Fachlehrkraft', 'Englisch, Chemie, Physik', 'Studiert Zahnmedizin · Chemie, Physik und Englisch begleiten sie seit Studienbeginn.' ),
		array( 'christoph-korff', 'Christoph Korff', 'Fachlehrkraft', 'Mathematik, Biologie, Chemie, Physik', 'Studiert Medizin · „Gemeinsam finden wir heraus, welche Erklärung für dich funktioniert.“' ),
		array( 'emilio-accardi', 'Emilio Accardi', 'Fachlehrkraft', 'Mathematik, Englisch', 'Studiert Journalistik · spielt Gitarre, Fußball und Basketball.' ),
		array( 'helene-hasselberg', 'Helene Hasselberg', 'Fachlehrkraft', 'Mathematik, Englisch, Informatik', 'Studiert Informatik · spielt Tennis und schaut gern Fußball.' ),
		array( 'hendrik-korff', 'Hendrik Korff', 'Fachlehrkraft', 'Mathematik', '' ),
		array( 'joelina-woeckener', 'Joelina Wöckener', 'Fachlehrkraft', 'Mathematik, Deutsch, Englisch', 'Kreativ beim Malen, in der Musik und beim Gestalten ihrer Stunden.' ),
		array( 'jule-meyer', 'Jule Meyer', 'Fachlehrkraft', 'Mathematik, Deutsch, Englisch', 'Der schönste Moment: wenn es in der Stunde „Klick“ macht.' ),
		array( 'lena-kreymeier', 'Lena Kreymeier', 'Fachlehrkraft', 'Mathematik, Physik', '' ),
		array( 'lewin-beatty', 'Lewin Beatty', 'Fachlehrkraft', 'Mathematik', '' ),
		array( 'lilli-jacksteit', 'Lilli Jacksteit', 'Fachlehrkraft', 'Mathematik, Deutsch, Biologie', 'Studiert Grundschullehramt im Master · freut sich über jeden schlechten Witz.' ),
		array( 'maike-petra-jost', 'Maike Petra Jost', 'Fachlehrkraft', 'Mathematik, Französisch', 'Begleitet mit Geduld, bis das Vertrauen in die eigenen Fähigkeiten wieder da ist.' ),
		array( 'maja-schroeder', 'Maja Schroeder', 'Fachlehrkraft', 'Mathematik, Biologie', 'Studiert Psychologie · zeigt, dass Lernen mit Freude und Selbstvertrauen gehen kann.' ),
		array( 'pauline-meyer', 'Pauline Meyer', 'Fachlehrkraft', 'Mathematik, Englisch, Französisch, Biologie', 'Studiert Biomedizin · erklärt Kompliziertes, bis es gar nicht mehr kompliziert wirkt.' ),
		array( 'sandra-gessner', 'Sandra Gessner', 'Fachlehrkraft', '', 'Studiert Psychologie in Wiesbaden · viel Zeit mit ihren Hunden und im Hundesport.' ),
		array( 'selinay-yazlak', 'Selinay Yazlak', 'Fachlehrkraft', 'Mathematik, Latein', 'Studiert Medizin · Mathe-LK im Abi: „Die richtige Erklärung ist enorm wichtig.“' ),
		array( 'xenia-struempfler', 'Xenia Strümpfler', 'Fachlehrkraft', 'Mathematik, Biologie', 'Master Molekulare Medizin · erklärt so lange, bis es wirklich verständlich ist.' ),
	);
	$out = array();
	foreach ( $team as $t ) {
		$out[] = array(
			'slug'    => $t[0],
			'name'    => $t[1],
			'rolle'   => $t[2],
			'faecher' => $t[3] ? array_map( 'trim', explode( ',', $t[3] ) ) : array(),
			'satz'    => $t[4],
			'url'     => '/team/' . $t[0] . '/',
		);
	}
	return apply_filters( 'mmm_team', $out );
}

/**
 * Anzahl Lehrkräfte je Fach (Schlüssel klein geschrieben).
 */
function mmm_team_counts() {
	$c = array();
	foreach ( mmm_team() as $t ) {
		foreach ( $t['faecher'] as $f ) {
			$k       = mb_strtolower( $f );
			$c[ $k ] = isset( $c[ $k ] ) ? $c[ $k ] + 1 : 1;
		}
	}
	return $c;
}

/**
 * Fächer für Auswahlfelder.
 */
function mmm_faecher_liste() {
	return array( 'Mathematik', 'Deutsch', 'Englisch', 'Physik', 'Chemie', 'Biologie', 'Französisch', 'Latein', 'Spanisch', 'Informatik', 'BWL / Wirtschaft', 'Geschichte', 'Geografie', 'Anderes Fach' );
}

function mmm_klassen_liste() {
	$k = array();
	for ( $i = 1; $i <= 13; $i++ ) {
		$k[] = 'Klasse ' . $i;
	}
	return array_merge( $k, array( 'Uni / Studium', 'Sonstiges' ) );
}

function mmm_schulformen_liste() {
	return array( 'Grundschule', 'Haupt-/Mittelschule', 'Realschule', 'Gymnasium', 'FOS', 'BOS', 'Universität', 'Sonstiges' );
}
