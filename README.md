# MAG-AS

Desktopowe narzędzie wspierające ewidencję sprzedaży i kalkulację zużycia materiałów w niewielkiej firmie produkcyjnej.

Projekt powstał dla użytkownika, który wcześniej prowadził ten proces w bardzo rozbudowanym arkuszu Excel. Celem pierwszej wersji było przeniesienie najważniejszej logiki do prostszego narzędzia, które można dalej rozwijać na podstawie rzeczywistego feedbacku użytkownika.

## Co robi

MAG-AS pozwala budować gotowe produkty z elementów podstawowych — czyli definiować ich **BOM (Bill of Materials / skład materiałowy)**.

Przykładowo produkt może składać się z kilku różnych materiałów, z których każdy występuje w określonej ilości.

Po zapisaniu sprzedaży programu nie interesuje wyłącznie liczba sprzedanych produktów. Automatycznie rozwija ich skład i zapisuje **snapshot rzeczywistego zużycia materiałów** wynikający z danej sprzedaży.

Dzięki temu można później sprawdzić, ile poszczególnych elementów zostało zużytych w wybranym okresie oraz jaka jest ich łączna wartość.

## Obecne funkcje

- kartoteka materiałów,
- grupowanie materiałów,
- tworzenie produktów z własnym składem materiałowym (BOM),
- sprzedaż gotowych produktów lub pojedynczych materiałów,
- kartoteka klientów,
- historia zamówień,
- automatyczne przeliczanie sprzedaży produktu na zużycie jego komponentów,
- dashboard zużycia materiałów w wybranym okresie,
- kalkulacja wartości netto i brutto zużytych materiałów,
- import danych,
- eksport zestawień,
- lokalna baza SQLite.

## Jak działa

```text
Materiały
   ↓
Definicja produktu + BOM
   ↓
Sprzedaż / zamówienie
   ↓
Rozwinięcie produktu na komponenty
   ↓
Snapshot zużycia materiałów
   ↓
Dashboard / zestawienia / eksport
```

Snapshot jest zapisywany w chwili tworzenia zamówienia. Dzięki temu późniejsza zmiana składu produktu nie zmienia historycznego obrazu materiałów wykorzystanych przy wcześniejszej sprzedaży.

## Technologie

- Node.js
- Express
- Prisma ORM
- SQLite
- React — produkcyjny build frontendu
- JavaScript
- XLSX — import i eksport danych
- Windows BAT / VBS launcher

Repozytorium zawiera kod źródłowy backendu, model danych Prisma, migracje oraz produkcyjny build frontendu używany w wersji desktopowej.

## Uruchomienie z kodu

Wymagany jest Node.js.

```bash
cd app
npm install
```

Skopiuj konfigurację:

```text
.env.example → .env
```

Następnie:

```bash
npm start
```

Aplikacja domyślnie startuje na porcie `3001`. Jeżeli port jest zajęty, automatycznie wyszukuje kolejny wolny port.

## Gotowa wersja Windows

W sekcji **Releases** znajduje się wersja portable z dołączonym środowiskiem Node.js.

Po rozpakowaniu wystarczy uruchomić:

```text
MAG-AS.vbs
```

lub:

```text
MAG-AS.bat
```

## Dane demonstracyjne

Repozytorium zawiera bazę z historycznym katalogiem materiałów oraz jednym testowym klientem.

Baza nie zawiera zamówień ani historii sprzedaży. W obecnym pliku ceny materiałów są wyzerowane.

## Dlaczego ten projekt powstał

Punktem wyjścia nie była potrzeba „napisania programu”, tylko zbyt rozbudowany arkusz Excel używany w codziennej pracy.

Pierwszy etap projektu polegał na odwzorowaniu najważniejszego procesu:

**elementy → produkt złożony → sprzedaż → zużycie materiałów → zestawienie**

Powstała wersja desktopowa została przygotowana do pierwszych testów użytkownika. Dalszy rozwój ma być oparty na rzeczywistym feedbacku z pracy z aplikacją.

## Możliwe kierunki rozwoju

Projekt został celowo zatrzymany na zakresie potrzebnym użytkownikowi w pierwszej wersji. Rozważane kolejne etapy obejmują m.in.:

- bieżące stany magazynowe,
- automatyczne progi minimalne,
- generowanie zamówień do stałych dostawców,
- automatyczne wysyłanie zamówień,
- rozszerzenie modułu zakupowego,
- dalszą integrację procesów magazynowych, sprzedażowych i księgowych.

Te funkcje są **roadmapą**, a nie częścią obecnej wersji.

## Status

**v0.1 — first user-feedback build**

Pierwsza desktopowa wersja jest gotowa i przekazana do testów użytkownika przed kolejną iteracją rozwoju.

## Automatyczna kontrola jakości

Repozytorium zawiera workflow GitHub Actions uruchamiany dla zmian na branchach roboczych oraz pull requestów do `main`.

CI sprawdza obecnie:

- składnię plików JavaScript,
- testy logiki BOM i snapshotów zużycia materiałów,
- sprzedaż materiałów bezpośrednich,
- walidację błędnych pozycji zamówienia,
- agregację dashboardu i kalkulację wartości materiałów,
- filtrowanie danych według grup i zakresu dat,
- parser importu CSV,
- poprawność schematu Prisma,
- możliwość wdrożenia migracji na świeżej bazie SQLite,
- zależności npm pod kątem podatności o poziomie high/critical.

Testy korzystają z wbudowanego `node:test`; do testów logiki biznesowej nie są wymagane zewnętrzne usługi ani dane produkcyjne.
