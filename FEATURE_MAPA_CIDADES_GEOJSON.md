# Fronteiras de cidades com GeoJSON no mapa de membros

## Objetivo
Permitir, via switch, desenhar a linha de demarcação das cidades no mapa de membros usando GeoJSON real.

## Contexto atual
- `Member.city` e `Member.state` existem em `backend/accounts/models.py:549-550`.
- `Church.city/state` e `GrowthGroup.city/state` também existem.
- `MemberLocationsView` em `backend/accounts/viewsets.py:2403-2513` devolve `address` formatado nos pontos, mas não `city`/`state` separados.
- Não há GeoJSON, polígonos municipais, tabela IBGE ou endpoint de cidades no repositório.
- `MemberLocationsMap.tsx` já controla layers Leaflet e a legenda.

## Decisões
- Usar **GeoJSON real**, não círculo aproximado por centróide.
- Switch local no mapa de membros, sem query param.
- Exibir inicialmente as cidades presentes nos pontos filtrados de membros.
- Normalizar nome/UF antes de cruzar com as propriedades do GeoJSON.
- Não fazer fetch por ponto; carregar o GeoJSON uma vez (arquivo estático ou endpoint com cache).
- Fronteira é camada visual; não altera filtros, contadores ou geocode.

## Escopo

### Backend
- Incluir `city` e `state` em cada ponto de `member-locations`, ou adicionar bloco `cities` agregado ao payload.
- Preferir serializer enxuto; não reutilizar `MemberSerializer`.
- Testar payload com cidades/UF.

### Dados/GeoJSON
- Definir fonte dos polígonos (por exemplo, base municipal IBGE) e versionar arquivo estático ou servir por endpoint.
- Documentar fonte, licença e data da base.
- Validar tamanho do arquivo e possibilidade de simplificação.

### Frontend
- Carregar GeoJSON uma vez.
- Estado `cityBoundariesEnabled` e ref da camada em `MemberLocationsMap.tsx`.
- `L.geoJSON` com estilo discreto, sem preenchimento ou preenchimento muito leve.
- Tooltip com nome da cidade/UF.
- Limpeza da camada no cleanup.
- Switch + legenda + chaves i18n em `t.memberMap` nos 3 idiomas.

## Fora de escopo
- Delimitação de bairros ou regiões internas.
- Fronteiras oficiais em tempo real.
- Filtrar membros ao clicar em uma cidade.
- Persistência da preferência.

## Riscos
- Acento/caixa/abreviação de UF entre cadastro e GeoJSON podem não casar.
- GeoJSON completo pode ficar pesado; simplificar ou servir comprimido.
- Polígonos podem ficar acima dos marcadores; ajustar `pane`/`zIndex` se necessário.
- Política de privacidade: fronteira mostra cidade, não endereço individual.

## Validação
```bash
cd backend
python manage.py test accounts.tests.MemberLocationsTests --verbosity 1

cd ../frontend
npx tsc --noEmit
npm test
npm run build
```
- Manual: ligar/desligar, filtrar por status, trocar igreja, ver cidades com acentos diferentes.

## Checklist
- [ ] Payload com `city`/`state` ou bloco `cities`.
- [ ] GeoJSON versionado/servido com fonte documentada.
- [ ] Switch e legenda.
- [ ] Normalização cidade/UF.
- [ ] Cleanup da camada.
- [ ] i18n pt/en/es.
