# Proveniência — `angola-provincias-2021.json`

Limites provinciais de Angola, simplificados para desenho em SVG. Ficheiro preparado na Fase 6.1
(2026-11-12). Contém **apenas geometria e identificação** (código ISO e nome); não contém
indicadores agroclimáticos nem dados do backend.

> **Aviso.** Estes limites **não são uma representação oficial** da divisão político-administrativa
> de Angola. Representam a divisão de **18 províncias** (ano de referência 2021). A Lei n.º 14/24,
> de 5 de Setembro, fixou **21 províncias** a partir de 1 de Janeiro de 2025; as províncias criadas
> a partir de Luanda, Cuando Cubango e Moxico **não** estão representadas. Huambo, Bié, Huíla e
> Cunene não foram alteradas por essa lei.

## 1. Fonte

| Campo | Valor |
|---|---|
| Conjunto de dados | geoBoundaries — gbOpen, Angola (AGO), nível ADM1 (Province) |
| `boundaryID` | `AGO-ADM1-26408823` |
| Ano representado | 2021 |
| Origem dos limites | U.S. Census Bureau (`boundarySource`) |
| Licença | **Public Domain** (`boundaryLicense`), conforme o ficheiro de metadados publicado no commit indicado abaixo |
| Fonte da licença (metadados) | www.census.gov/geographies/mapping-files/time-series/demo/international-programs/subnationalpopulation.html |
| Actualização dos dados de origem | 19 de Janeiro de 2023 (`sourceDataUpdateDate`) |
| Construção pelo geoBoundaries | 12 de Dezembro de 2023 (`buildDate`) |
| Repositório | https://github.com/wmgeolab/geoBoundaries |
| Commit fixado | `9469f09592ced973a3448cf66b6100b741b64c0d` (2023-12-13, «gB Core Data Update 2023-12-12 23:03») |
| Ficheiro de origem | `releaseData/gbOpen/AGO/ADM1/geoBoundaries-AGO-ADM1.geojson` (resolução completa) |
| URL utilizado | https://media.githubusercontent.com/media/wmgeolab/geoBoundaries/9469f09592ced973a3448cf66b6100b741b64c0d/releaseData/gbOpen/AGO/ADM1/geoBoundaries-AGO-ADM1.geojson |
| SHA-256 da origem | `205b8b63b0ac0819e964b129f25e67f5af9c092afbc0504f1f28c15b6e44cfd8` (confere com o ponteiro Git LFS do commit) |
| SHA-256 dos metadados | `6897df4120622fef7043056b39a4e389bf8b8575431cb51844f9e06ec7bb89f3` |
| Data de obtenção | 2026-11-12 |

Citação pedida pelo projecto geoBoundaries: Runfola, D. et al. (2020) *geoBoundaries: A global
database of political administrative boundaries.* PLoS ONE 15(4): e0231866.

A licença de domínio público não exige atribuição; a citação acima é mantida por boa prática
científica. **Não** foi usado o nível ADM0 do geoBoundaries (licença CC BY-SA 2.0, origem
OpenStreetMap).

## 2. Identificadores

As 18 províncias mantêm o nome (`nome`, de `shapeName`) e o código ISO 3166-2 (`iso`, de `shapeISO`)
exactamente como na fonte. Nenhum nome foi alterado para corresponder a identificadores internos.

| `iso` | `nome` | `iso` | `nome` |
|---|---|---|---|
| AO-BGO | Bengo | AO-HUI | Huíla |
| AO-BGU | Benguela | AO-LNO | Lunda Norte |
| AO-BIE | Bié | AO-LSU | Lunda Sul |
| AO-CAB | Cabinda | AO-LUA | Luanda |
| AO-CCU | Cuando Cubango | AO-MAL | Malanje |
| AO-CNN | Cunene | AO-MOX | Moxico |
| AO-CNO | Cuanza Norte | AO-NAM | Namibe |
| AO-CUS | Cuanza Sul | AO-UIG | Uíge |
| AO-HUA | Huambo | AO-ZAI | Zaire |

## 3. Processamento

O processo é reprodutível com os scripts de `scripts/geo/` (ver `scripts/geo/README.md`), que
descarregam a fonte fixada, confirmam o SHA-256 e os metadados, simplificam e validam:

```sh
node scripts/geo/build.mjs --check   # confirma que este ficheiro é reproduzido byte a byte
node scripts/geo/build.mjs           # gera, valida e só então substitui o ficheiro
```

Ferramenta: **mapshaper 0.7.101** (MPL-2.0), executado com `npx` fora da aplicação; não é uma
dependência do frontend. Comando equivalente:

```sh
mapshaper -i geoBoundaries-AGO-ADM1.geojson \
  -filter-islands min-area=1km2 \
  -explode \
  -simplify interval=300 keep-shapes \
  -dissolve shapeISO copy-fields=shapeName \
  -filter-fields shapeISO,shapeName \
  -rename-fields iso=shapeISO,nome=shapeName \
  -sort iso \
  -o angola-provincias-2021.json format=geojson precision=0.0001 rfc7946
```

| Passo | Razão |
|---|---|
| `-filter-islands min-area=1km2` | Remove explicitamente 19 ilhéus destacados com menos de 1 km² (≈ 3 km² no total), invisíveis à escala nacional. |
| `-explode` + `keep-shapes` | Cada parte (incluindo ilhas maiores) é protegida individualmente durante a simplificação. |
| `-simplify interval=300` | Simplificação Visvalingam ponderada (predefinição), com detalhe de ~300 m. O mapshaper simplifica cada fronteira partilhada uma única vez, preservando a topologia entre províncias vizinhas. Foi escolhido o intervalo de 300 m por ser o menos detalhado (dos testados: 300, 500, 600, 700, 800 e 1000 m) que cumpre o critério de fidelidade da secção 5. |
| `-dissolve shapeISO` | Volta a agrupar as partes por província. |
| `precision=0.0001` | Coordenadas com 4 casas decimais (~11 m). |
| `rfc7946` | GeoJSON conforme a RFC 7946 (WGS 84, anéis exteriores anti-horários, sem `crs`). |
| `-sort iso` | Ordem estável das províncias; a geração é reprodutível byte a byte. |

## 4. Tamanho

| | Original (resolução completa) | Final |
|---|---|---|
| Ficheiro | 5 808 891 bytes (≈ 5,5 MB) | 204 112 bytes (≈ 199 KB) |
| Comprimido (gzip) | ≈ 1,2 MB | ≈ 61 KB |
| Vértices | 146 723 | 10 979 |
| Anéis | 44 | 25 |

SHA-256 do ficheiro final: `973dc8abe425698b28c44f626c7ca38c649a90555d157c401241b2603dab74f0`.

## 5. Validação (2026-11-12)

Mesmos testes aplicados ao original e ao ficheiro final (`scripts/geo/validate.mjs`):

| Verificação | Original | Final |
|---|---|---|
| Províncias / ISO únicos | 18 / 18 | 18 / 18 |
| Huambo, Bié, Huíla | AO-HUA, AO-BIE, AO-HUI | AO-HUA, AO-BIE, AO-HUI |
| Anéis inválidos (não fechados ou < 4 pontos) | 0 | 0 |
| Auto-intersecções | 0 | 0 |
| Sobreposição entre províncias (soma das áreas − área da união) | 0 km² | 0 km² |
| Falhas (buracos na união das províncias) | 0 | 0 |
| Área total (esférica) | 1 252 218 km² | 1 252 211 km² |
| Desvio máximo de área por província | — | 0,016 % (Cabinda) |
| RFC 7946 (orientação dos anéis, sem `crs`/`bbox`) | — | cumpre |
| Casas decimais | — | ≤ 4 |
| Reprodutibilidade | — | idêntico byte a byte (`build.mjs --check`) |

**Critério de fidelidade:** cada parte do original entre 5 e 1000 km² (ilhas e faixas costeiras)
mantém pelo menos 90 % dos seus vértices a menos de 1 km da geometria simplificada.

| Parte | Localização aproximada | Cobertura |
|---|---|---|
| Luanda, 6,41 km² | 13,12° E, 8,93° S | 100 % |
| Luanda, 17,65 km² (faixa costeira estreita) | 13,09° E, 8,93° S | 90 % |
| Namibe, 88,87 km² | 11,71° E, 16,61° S | 100 % |

Comparação visual do ficheiro final (original sobreposto ao simplificado, à escala nacional, no
Planalto Central e no litoral de Luanda ampliado): sem diferenças perceptíveis à escala nacional nem
no Planalto Central; no litoral de Luanda ampliado, só desaparecem os ilhéus com menos de 1 km² e
as faixas costeiras estreitas perdem pequenos detalhes.

## 6. Limitações conhecidas

- **Divisão anterior a 2025**: 18 províncias, não as 21 da Lei n.º 14/24 (ver aviso no início).
- **Precisão espacial não documentada** pela fonte. Os limites são ilustrativos e não têm valor
  oficial ou jurídico.
- **Ilhas e litoral generalizados**: foram removidos 19 ilhéus com menos de 1 km². Uma parte de
  1,64 km² no litoral de Luanda (≈ 13,25° E, 8,78° S) fica simplificada (abaixo do limiar de 5 km²
  do critério de fidelidade).
- **Sem limites marítimos** e sem outros níveis administrativos (municípios, comunas).
- **Troços rectos** em algumas fronteiras (por exemplo, a leste) existem na fonte; não resultam da
  simplificação.
- O ficheiro destina-se a visualização à escala nacional; não deve ser usado para cálculos de área,
  distância ou localização precisa.

## 7. Correspondência com o backend (proposta)

O backend identifica as províncias por `id` (`/api/v1/provinces`) e não devolve códigos espaciais.
Proposta de correspondência **explícita**, sem correspondência automática por nomes:

| `id` no backend | `nome` no backend | `iso` neste ficheiro | `nome` neste ficheiro |
|---|---|---|---|
| `huambo` | Huambo | `AO-HUA` | Huambo |
| `bie` | Bié | `AO-BIE` | Bié |
| `huila` | Huíla | `AO-HUI` | Huíla |

Uma província do backend sem entrada nesta tabela não deve ser associada a nenhuma forma do mapa.
A tabela será transcrita para a configuração do frontend quando o mapa for implementado.
