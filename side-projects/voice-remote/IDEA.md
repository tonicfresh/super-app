# Voice Remote — Side-Project

> Eine ultra-minimalistische App: Ein einziger Button. Druecken, sprechen, loslassen — der Super App Agent erledigt den Rest.

## Konzept

Die "Endfassung" der Super App Interaktion. Kein UI, keine Menues, keine Formulare. Nur Sprache.

### Ablauf

1. User oeffnet die App — sieht **einen einzigen Button** (gross, mittig)
2. User drueckt den Button, spricht: *"Leg eine To-Do an: Einkaufen gehen"*
3. User laesst den Button los
4. Audio wird an den Super App Main Agent geschickt (STT via Speech-Modul)
5. Agent verarbeitet den Befehl (gleiche Logik wie PWA Chat / Telegram)
6. Falls Rueckfrage noetig: Antwort wird per TTS ueber den Lautsprecher ausgegeben
7. User antwortet wieder per Button-Druck (Session bleibt offen)
8. Am Ende: Bestaetigung per Sprache — *"Erledigt! To-Do 'Einkaufen gehen' wurde angelegt."*

### Technisch

- **Frontend:** Minimale PWA — ein Screen, ein Button, ein Animationskreis
- **Backend:** Nutzt den bestehenden Super App Voice-Channel (`/api/v1/ai/voice`)
- **STT:** Speech-Modul (super-app-speech)
- **TTS:** Speech-Modul (super-app-speech) oder ElevenLabs
- **Sessions:** Conversation-State bleibt ueber mehrere Spracheingaben erhalten
- **Auth:** Passkey (wie Super App) — einmal einloggen, dann immer offen

### Warum Side-Project?

- Funktioniert erst, wenn Super App + Agent System + Speech-Modul stabil laufen
- Ist ein Showcase / Demo fuer Leute, die das mal ausprobieren wollen
- Extrem einfach gehalten — kein Feature Creep
- Zeigt, was mit der Plattform moeglich ist

### Abhaengigkeiten

- Super App Agent System (Main Agent + Tools)
- Speech-Modul (STT + TTS)
- Super App Auth (Passkey)
- Alle Module, die per Voice gesteuert werden sollen

### Status

**Idee** — wird erst umgesetzt, wenn die Super App Kernfunktionalitaet steht.
