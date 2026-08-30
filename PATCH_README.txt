MAG-AS — CI / test hardening patch

Wgraj zawartość tej paczki na branch `testy`, zachowując strukturę katalogów.

Najważniejsze nowe pliki:
- .github/workflows/ci.yml
- .github/dependabot.yml
- .nvmrc
- LICENSE
- app/tests/*
- app/scripts/check_syntax.mjs
- app/scripts/check_prisma.mjs
- app/src/services/csvService.js

Zmodyfikowane:
- app/package.json
- app/src/routes/import.js
- app/src/services/orderService.js
- app/src/services/dashboardService.js
- README.md

Po wgraniu GitHub Actions powinien uruchomić job:
- Tests and quality checks

Jeśli npm audit będzie czerwony, NIE używaj `npm audit fix --force`.
Najpierw sprawdź raport; MAG-AS ma starsze zależności i może wymagać osobnej decyzji dotyczącej konkretnego pakietu.
