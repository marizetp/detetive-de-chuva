# Preparação dos dados geográficos

Gera e valida `frontend/src/data/geo/angola-provincias-2021.json` a partir de uma versão fixada do
geoBoundaries. A proveniência completa está em `frontend/src/data/geo/PROVENIENCIA.md`.

Estes scripts **não fazem parte da aplicação**: ficam fora de `frontend/`, não são importados pelo
código, não entram no bundle do Vite e não acrescentam dependências ao `package.json`.

## Requisitos

- Node.js ≥ 22 (só módulos nativos: `fetch`, `crypto`, `zlib`, `child_process`).
- `npx` (vem com o npm). O mapshaper é executado na versão fixada **0.7.101** com
  `npx --yes mapshaper@0.7.101`; o npm guarda-o na sua cache, fora do projecto.
- Rede na primeira execução (fonte ≈ 5,8 MB). A fonte fica em cache em
  `<pasta temporária do sistema>/detetive-da-chuva-geo`, ou na pasta indicada por `GEO_WORK_DIR`.

## Comandos (a partir da raiz do repositório)

```sh
# Confirmar que o ficheiro existente é reprodutível (não escreve nada)
node scripts/geo/build.mjs --check

# Gerar de novo, validar e, só se for válido, substituir o ficheiro final
node scripts/geo/build.mjs

# Validar um ficheiro qualquer contra a fonte fixada
node scripts/geo/validate.mjs [caminho/para/ficheiro.json]
```

Todos terminam com código 1 se alguma verificação falhar; nesse caso o ficheiro final não é alterado.

## O que é verificado

| Etapa | Verificação |
|---|---|
| Fonte | SHA-256 e tamanho de cada ficheiro iguais aos do ponteiro Git LFS do commit fixado |
| Metadados | `boundaryID`, ano, licença (`Public Domain`), origem e número de unidades iguais aos esperados |
| Identidade | 18 províncias; ISO únicos; Huambo (AO-HUA), Bié (AO-BIE) e Huíla (AO-HUI); nomes iguais aos da fonte; só as propriedades `iso` e `nome`; ordem por ISO |
| Topologia | anéis fechados e com ≥ 4 pontos; sem auto-intersecções; sem sobreposições (soma das áreas = área da união); sem falhas novas (buracos na união) |
| Fidelidade | desvio de área ≤ 0,5 % por província; partes do original entre 5 e 1000 km² com ≥ 90 % dos vértices a menos de 1 km da geometria simplificada |
| Formato | RFC 7946 (sem `crs`/`bbox`, anéis exteriores anti-horários, buracos horários); ≤ 4 casas decimais |
| Reprodutibilidade (`--check`) | o ficheiro gerado coincide byte a byte com o existente |

## Alterar parâmetros

Todos os parâmetros estão em `config.mjs` (fonte, versão do mapshaper, simplificação e critérios).
Qualquer alteração muda o resultado: gerar de novo, rever a comparação visual e actualizar
`PROVENIENCIA.md` (parâmetros, tamanhos e SHA-256).
