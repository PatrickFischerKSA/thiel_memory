# Bahnwärter Thiel Memory

Eigenständige, GitHub-Pages-taugliche Web-App für ein volldigitalisiertes Memory zu Gerhart Hauptmanns *Bahnwärter Thiel*.
Die Anwendung ist vollständig autonom und hat keine technische oder spielerische Abhängigkeit zu anderen Ordnern in diesem Workspace.

## Enthalten

- lokaler Solo- oder Mehrspielermodus für 1 bis 4 Spielende
- 50 Frage-Antwort-Paare aus `memory_mapping_bahnwaerter_thiel_full.json`
- Themendecks für verschiedene Motivbereiche der Novelle
- Lernblick-Funktion für kurze Offenlegung aller Karten
- Quellenbereich mit Hinweis auf die drei verwendeten Ausgangsdateien

## Dateien

- `index.html`: Oberfläche
- `styles.css`: Layout und Gestaltung
- `cards.js`: digitalisierte Kartenpaare und Quellenmetadaten
- `app.js`: Spielmechanik, Punkte und Rendering

## Autonomie

Für den Betrieb der Web-App werden nur die Dateien im Ordner `thiel_memory/` benötigt.
Die drei Ausgangsdateien auf dem Desktop wurden für die Digitalisierung und inhaltliche Ableitung verwendet, sind aber keine Laufzeitabhängigkeiten.

## Hinweis zur Quellenbasis

Die Karteninhalte basieren auf:

- `Hauptmann_Gerhart_-_Bahnwaerter_Thiel.pdf`
- `memory_bahnwaerter_thiel_full.pdf`
- `memory_mapping_bahnwaerter_thiel_full.json`

Ein Teil der Seitenhinweise zur Primärquelle wurde automatisiert aus der bereitgestellten PDF extrahiert und nur dort übernommen, wo die Zuordnung hinreichend eindeutig war.
