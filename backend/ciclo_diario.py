#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
ciclo_diario.py - Detetive da Chuva: ciclo diário (v0.3.0)

ESTADO: proposta de investigação. Indicativo; NÃO é recomendação agronómica.

O que faz (um ciclo por execução, idempotente por dia):
  1. Lê a série diária histórica (CSV exportado do pipeline) e a chuva observada
     da época em curso (CSV opcional ou NASA POWER).
  2. Determina o estado do motor: sem chuva candidata / candidata por confirmar /
     início confirmado (regra V0, sem validação agronómica).
  3. Estima, por enumeração de cenários (observado até hoje + continuação histórica
     de cada época), a probabilidade de início até H dias e o risco de falso início
     por data de plantio, com intervalo.
  4. Regista, SEM o usar por defeito, o ensemble emitido (Open-Meteo) para acumular
     dados "as-of" de validação.
  5. Escreve um ficheiro datado em saidas/<zona>/<época>/ciclo_AAAA-MM-DD.json.
  6. Junta ao JSON a linha de base do calendário fixo (1 e 15 Out, 1 e 15 Nov, por metades
     da série), a grelha de sensibilidade (opcional) e o registo de reprodução (hash da
     especificação, hash das entradas, versões).

Alterações da v0.2.1 (revisão): janela de falso início por defeito = 21 e a grelha marca a
janela REALMENTE usada; diagnóstico de chuva fraca do histórico (artefacto do POWER);
aviso de épocas em falta no fim da série; início por época exportável (--exportar-inicios,
para comparar com a V0 do repositório); detalhe da candidata em formação; texto de apresentação
que nunca mostra 0%/100% como certeza; tolerâncias inatingíveis declaradas.

Alterações da v0.3.0 (sem as flags novas o JSON e o hash da especificação são IDÊNTICOS aos da
v0.2.1, excepto versao_codigo e gerado_em; única excepção declarada, E1: ensemble com datas ISO
desalinhadas, que antes passava em silêncio):
  F0  alinhamento do ensemble com data_ref (E1); --ensemble-ficheiro (ensemble arquivado);
      dias parciais do ensemble (parse_ensemble(exigir_dia_completo), horas_validas_por_dia).
  F1  adaptadores com estado {ok|falhou|nao_pedida, erro, gerado_em}: Open-Meteo determinístico,
      ensemble multivariável (--ensemble-vars), sazonal (arquivo, descritivo), CHIRPS3-GEFS (GeoTIFF
      locais, --chirps-gefs-tif; rasterio opcional).
  F2  bloco previsao_meteorologica (--previsao), separado e rotulado: nunca entra na climatologia.
  F3  verificação de perícia (--validar-pericia DIR): Brier/BSS com bootstrap por ÉPOCA, calibração,
      antecedencia_max_validada; escreve validacao_pericia.json.
  F4  combinação com o histórico (--condicionar-fronteira): continuação só de épocas no mesmo estado.
  F5  --escrever-latest; --mensagem-agricultor (códigos estáveis; activa o modo estrito);
      decisao_integrada=false, indicadores_complementares, automatizacao.
  I9  --fonte-historico / --fonte-observado (power|imerg|chirps3|outra) substituem a inferência.
MODO ESTRITO = --exigir-pericia, --condicionar-fronteira ou --mensagem-agricultor: o ensemble só entra
até K = min(--dias-ensemble, antecedencia_max_validada) dias; a validação de uma antecedência nunca se
extrapola às seguintes. Limiares novos são PROVISÓRIOS (limiares_provisorios: true; entram no hash).

Automatização, em TRÊS camadas separadas (este script NÃO implementa agendador nem notificações):
  1. Execução diária: agendador EXTERNO. Exemplos (um ciclo por dia, idempotente):
       Windows (Agendador de Tarefas):
         schtasks /Create /SC DAILY /ST 06:30 /TN "DetetiveChuva_ciclo" /TR "python C:/detetive/ciclo_diario.py
           --zona huambo --historico C:/detetive/dados/hist_imerg.csv --observado C:/detetive/dados/obs_late.csv
           --fonte-historico imerg --fonte-observado imerg --mensagem-agricultor --escrever-latest
           --saida C:/detetive/saidas"
       cron (Linux/macOS):
         30 6 * * * cd /opt/detetive && python3 ciclo_diario.py --zona huambo --historico dados/hist_imerg.csv
           --observado dados/obs_late.csv --fonte-historico imerg --fonte-observado imerg
           --mensagem-agricultor --escrever-latest --saida saidas >> logs/ciclo.log 2>&1
  2. Actualização dos dados: adaptadores (previsão, ensemble, sazonal, CHIRPS-GEFS). O observado só é
     obtido pelo próprio script se for POWER; qualquer outra fonte (IMERG Late, CHIRPS3) depende de um
     ficheiro externo, e o histórico também (automatizacao.* regista-o).
  3. Notificação (SMS, WhatsApp, e-mail): FORA DO ÂMBITO (automatizacao.notificacao = "nao_implementada").

O que NÃO faz nesta versão:
  - Modelos logísticos por estado (precisam das séries e de validação).
  - Calibração do limiar de "dia seco" do ensemble contra o IMERG.
  - Obtenção de IMERG Late (exige Earthdata): fornecer via --observado.
  - Usar o ensemble no cálculo (só com --dias-ensemble > 0 e perícia demonstrada).
  - (v0.3.0) Obtenção automática do observado e do histórico (IMERG Late exige Earthdata; CHIRPS3),
    CHC Early Estimates, modelos logísticos, bias-correction, decisão integrada com temperatura ou
    humidade (sem critérios agronómicos validados), envio de notificações.

Formatos aceites em --historico e --observado:
  - CSV com colunas data (AAAA-MM-DD), chuva_mm, e opcionalmente gwetroot, t2m;
  - JSON do NASA POWER como guardado pelo pipeline (PRECTOTCORR->chuva_mm,
    GWETROOT->gwetroot, T2M->t2m); neste caso as coordenadas vêm da geometria do JSON.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import math
import platform
import re
import sys
import urllib.parse
import urllib.request
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

import numpy as np
import pandas as pd

VERSAO_CODIGO = "0.3.0"
JANELA_RISCO_DEFAULT = 21   # "três semanas" (PDF/README); 20 é a alternativa em aberto
DIAS_EPOCA = 181          # 1 Set -> 28 Fev (offset 0..180)
Z90 = 1.6449              # IC de 90%
log = logging.getLogger("ciclo_diario")
COBERTURA_MIN = 0.95      # fracção mínima de dias válidos para uma época histórica entrar
TOL_COORD_GRAUS = 0.05    # tolerância entre as coordenadas em uso e a geometria do JSON POWER
# Datas fixas do calendário tradicional (offset desde 1 Set; antes de 29 Fev, sem anos bissextos)
DATAS_FIXAS = {"1 Out": 30, "15 Out": 44, "1 Nov": 61, "15 Nov": 75}

# Coordenadas das cidades-âncora: coincidem com a geometria dos JSON POWER do projecto
# (Huambo; Bié = Cuíto; Huíla = Lubango). NÃO foram confrontadas com uma fonte externa.
ZONAS = {
    "huambo": (-12.776, 15.739),
    "cuito": (-12.383, 16.933), "bie": (-12.383, 16.933),
    "lubango": (-14.917, 13.541), "huila": (-14.917, 13.541),
}

# --------------------------------------------------------------------------- #
# v0.3.0: constantes. I6: o que não está confirmado na documentação fica aqui como «A CONFIRMAR»;
# valor None = não é usado e dá erro explícito (nunca se adivinha). I7: limiares PROVISÓRIOS.
# --------------------------------------------------------------------------- #
HORAS_DIA = 24
FONTES_VALIDAS = ("power", "imerg", "chirps3", "outra")
FONTES_FIAVEIS = ("imerg", "chirps3")          # PROVISÓRIO (I7): fonte declarada tida como fiável
TOLERANCIA_DECISAO_DEFAULT = 0.20              # PROVISÓRIO (F5b)
MIN_EPOCAS_FRONTEIRA = 8                       # PROVISÓRIO (F4)
CLASSES_SECA_FRONTEIRA = (1, 5, 10)            # PROVISÓRIO (F4): 0 | 1-4 | 5-9 | >=10 dias secos
CLASSES_CHUVA_4D_FRONTEIRA = (5.0, 20.0)       # PROVISÓRIO (F4): <5 | 5-20 | >20 mm nos últimos 4 dias
CLASSES_IDADE_FRONTEIRA = (2, 5)               # PROVISÓRIO (F4): 0-1 | 2-4 | >=5 dias de idade
VAL_MIN_EPOCAS, VAL_MIN_EVENTOS, VAL_MIN_NAO_EVENTOS = 8, 30, 30    # PROVISÓRIOS (F3)
VAL_CLASSES = ((0.0, 0.1), (0.1, 0.3), (0.3, 0.6), (0.6, 1.0))      # PROVISÓRIO (F3)
VAL_MIN_PARES_CLASSE, VAL_TOL_CALIBRACAO = 20, 0.15                 # PROVISÓRIOS (F3)
VAL_BOOTSTRAP_B, VAL_SEMENTE, VAL_JANELA_CLIM = 2000, 42, 7         # F3: B e semente fixos
URL_FORECAST = "https://api.open-meteo.com/v1/forecast"             # A CONFIRMAR (dado na especificação; sem rede para verificar)
VARS_PREVISAO_BASE = ("temperature_2m", "precipitation",
                      "et0_fao_evapotranspiration")                 # A CONFIRMAR (idem)
DIAS_PREVISAO_DET = 15                                              # A CONFIRMAR (horizonte do determinístico)
VARS_SOLO_PREVISAO = None        # A CONFIRMAR: nomes das camadas de humidade do solo (não adivinhados)
URL_SAZONAL = None               # A CONFIRMAR: endpoint sazonal (EC46/SEAS5)
MODELOS_SAZONAL = None           # A CONFIRMAR: identificadores dos modelos sazonais
PARAM_SAZONAL_SEMANAL = None     # A CONFIRMAR: parâmetro (e bloco de resposta) das anomalias semanais
PARAM_SAZONAL_MENSAL = None      # A CONFIRMAR: parâmetro (e bloco de resposta) das anomalias mensais
VARS_SAZONAL_SEMANAL = None      # A CONFIRMAR: variáveis semanais (anomalias de precipitação e temperatura)
VARS_SAZONAL_MENSAL = None       # A CONFIRMAR: variáveis mensais
CHIRPS_GEFS_URL_PADRAO = None    # A CONFIRMAR: padrão de nomes/URL do CHIRPS3-GEFS (sem download automático)
CHIRPS_GEFS_MARCA = "c3g"        # só ficheiros «c3g» (a versão CHIRPS2 terminou a 1 Jul 2026)


# --------------------------------------------------------------------------- #
# Regra V0 (candidata; sem validação agronómica)
# --------------------------------------------------------------------------- #
@dataclass(frozen=True)
class Regra:
    limiar_chuva_mm: float = 1.0        # dia chuvoso: >= 1 mm; dia seco: < 1 mm
    acumulado_5d_mm: float = 20.0       # estritamente superior, nos 5 dias desde d
    seca_consecutiva_dias: int = 10     # sequência seca que falha o início
    janela_confirmacao_dias: int = 25   # dias desde d em que não pode haver seca
    limite_procura_off: int = 152       # 31 de Janeiro (offset desde 1 Set)
    limiar_dia_seco_mm: float = 1.0     # dia seco: < limiar (separado de limiar_chuva_mm para a grelha)


def tem_seca_longa(janela, limiar: float, n: int) -> bool:
    """True se há >= n dias secos consecutivos CONHECIDOS (NaN quebra a sequência)."""
    run = 0
    for v in janela:
        if np.isnan(v):
            run = 0
        elif v < limiar:
            run += 1
            if run >= n:
                return True
        else:
            run = 0
    return False


def classificar_dia(chuva: np.ndarray, d: int, r: Regra) -> str:
    """'nao_candidato' | 'indeterminado' | 'falhado' | 'pendente' | 'confirmado'."""
    if d >= len(chuva) or np.isnan(chuva[d]):
        return "indeterminado"
    if chuva[d] < r.limiar_chuva_mm:
        return "nao_candidato"
    w5 = chuva[d:d + 5]
    if np.nansum(w5) <= r.acumulado_5d_mm:
        incompleto = len(w5) < 5 or bool(np.isnan(w5).any())
        return "indeterminado" if incompleto else "nao_candidato"
    w25 = chuva[d:d + r.janela_confirmacao_dias]
    if tem_seca_longa(w25, r.limiar_dia_seco_mm, r.seca_consecutiva_dias):
        return "falhado"
    if len(w25) < r.janela_confirmacao_dias or bool(np.isnan(w25).any()):
        return "pendente"
    return "confirmado"


def inicio_v0(chuva: np.ndarray, r: Regra, max_d: int | None = None,
              tempo_real: bool = False) -> tuple[str, int | None]:
    """
    Percorre os dias por ordem e devolve o primeiro caso não resolvido ou confirmado:
      ('confirmado', d) | ('pendente', d) | ('indeterminado', d) | ('sem_inicio', None)
    Um candidato pendente anterior a um confirmado domina (pode vir a ser o início).
    Em tempo real, 'indeterminado' (candidato em formação) conta como 'pendente'.
    """
    ultimo = r.limite_procura_off if max_d is None else min(r.limite_procura_off, max_d)
    for d in range(0, ultimo + 1):
        c = classificar_dia(chuva, d, r)
        if c in ("confirmado", "pendente", "indeterminado"):
            if tempo_real and c == "indeterminado":
                c = "pendente"
            return c, d
    return "sem_inicio", None


# --------------------------------------------------------------------------- #
# Estatística
# --------------------------------------------------------------------------- #
def wilson(k: int, n: int, z: float = Z90) -> tuple[float, float]:
    if n == 0:
        return (float("nan"), float("nan"))
    p = k / n
    den = 1 + z * z / n
    centro = (p + z * z / (2 * n)) / den
    marg = z * math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den
    return (max(0.0, centro - marg), min(1.0, centro + marg))


def _logbinom(n: int, i: int) -> float:
    return math.lgamma(n + 1) - math.lgamma(i + 1) - math.lgamma(n - i + 1)


def _binom_cdf(k: int, n: int, p: float) -> float:
    """P(X <= k), X ~ Binomial(n, p), em escala logarítmica (estável)."""
    if k < 0:
        return 0.0
    if k >= n:
        return 1.0
    if p <= 0.0:
        return 1.0
    if p >= 1.0:
        return 0.0
    lp, lq = math.log(p), math.log1p(-p)
    termos = [_logbinom(n, i) + i * lp + (n - i) * lq for i in range(k + 1)]
    m = max(termos)
    return min(1.0, math.exp(m) * sum(math.exp(t - m) for t in termos))


def clopper_pearson(k: int, n: int, nivel: float = 0.90) -> tuple[float, float]:
    """IC exacto (Clopper-Pearson), bilateral. Sem scipy: bissecção sobre a CDF binomial."""
    if n == 0:
        return (float("nan"), float("nan"))
    alfa = (1.0 - nivel) / 2.0
    lo_ic, hi_ic = 0.0, 1.0
    if k > 0:                       # P(X >= k | p) = alfa; cresce com p
        a, b = 0.0, 1.0
        for _ in range(80):
            m = (a + b) / 2.0
            if 1.0 - _binom_cdf(k - 1, n, m) < alfa:
                a = m
            else:
                b = m
        lo_ic = (a + b) / 2.0
    if k < n:                       # P(X <= k | p) = alfa; decresce com p
        a, b = 0.0, 1.0
        for _ in range(80):
            m = (a + b) / 2.0
            if _binom_cdf(k, n, m) > alfa:
                a = m
            else:
                b = m
        hi_ic = (a + b) / 2.0
    return lo_ic, hi_ic


def ic_binario(k: int, n: int, metodo: str = "wilson") -> tuple[float, float]:
    return clopper_pearson(k, n) if metodo == "clopper-pearson" else wilson(k, n)


def resumo_binario(eventos, metodo: str = "wilson") -> dict:
    """k de n épocas, p e IC de 90% (frequência explícita: mostra sempre o n)."""
    ev = np.asarray(eventos, dtype=bool)
    n, k = int(len(ev)), int(ev.sum())
    if n == 0:
        return {"k": 0, "n": 0, "p": None, "ic90": [None, None], "metodo_ic": metodo,
                "frequencia": "sem épocas utilizáveis"}
    lo, hi = ic_binario(k, n, metodo)
    return {"k": k, "n": n, "p": k / n, "ic90": [float(lo), float(hi)], "metodo_ic": metodo,
            "frequencia": f"{k} de {n} épocas"}


def ic_proporcao(vals, B: int = 2000, seed: int = 42, metodo: str = "wilson") -> dict:
    """p e IC de 90%. Valores 0/1 -> Wilson ou Clopper-Pearson; fracções -> bootstrap."""
    v = np.asarray(vals, dtype=float)
    v = v[~np.isnan(v)]
    n = len(v)
    if n == 0:
        return {"p": None, "ic90": [None, None], "n_epocas": 0, "metodo_ic": None}
    if np.all((v == 0) | (v == 1)):
        rb = resumo_binario(v.astype(bool), metodo)
        return {"p": rb["p"], "ic90": rb["ic90"], "n_epocas": n, "metodo_ic": rb["metodo_ic"],
                "k": rb["k"], "frequencia": rb["frequencia"]}
    rng = np.random.default_rng(seed)
    med = [rng.choice(v, size=n, replace=True).mean() for _ in range(B)]
    lo, hi = (float(x) for x in np.percentile(med, [5, 95]))
    return {"p": float(v.mean()), "ic90": [lo, hi], "n_epocas": n, "metodo_ic": "bootstrap_epocas"}


def kaplan_meier(tempos: np.ndarray, evento: np.ndarray, t_max: int) -> np.ndarray:
    """S(t) = P(início > t), t = 0..t_max. 'tempos' em offsets; evento False = censurado."""
    S = np.ones(t_max + 1)
    s = 1.0
    for t in range(t_max + 1):
        em_risco = int((tempos >= t).sum())
        d = int(((tempos == t) & evento).sum())
        if em_risco > 0 and d > 0:
            s *= 1.0 - d / em_risco
        S[t] = s
    return S


def prob_condicional_km(tempos, evento, t0: int, H: int, t_max: int,
                        B: int = 1000, seed: int = 42) -> dict:
    """P(início <= t0+H | início > t0), com bootstrap sobre épocas."""
    tempos = np.asarray(tempos)
    evento = np.asarray(evento, dtype=bool)
    t1 = min(t0 + H, t_max)
    t0c = min(max(t0, 0), t_max)

    def _p(tp, ev):
        S = kaplan_meier(tp, ev, t_max)
        return float("nan") if S[t0c] <= 0 else 1.0 - S[t1] / S[t0c]

    p = _p(tempos, evento)
    rng = np.random.default_rng(seed)
    n = len(tempos)
    bs = []
    for _ in range(B):
        idx = rng.integers(0, n, size=n)
        bs.append(_p(tempos[idx], evento[idx]))
    bs = np.array([b for b in bs if not np.isnan(b)])
    ic = [float(x) for x in np.percentile(bs, [5, 95])] if len(bs) else [None, None]
    n_risco = int((tempos > t0c).sum())
    degenerado = ic[0] is not None and ic[0] == ic[1]
    nota = "condiciona a 'início > hoje'; só aplicável sem chuva candidata"
    if degenerado or n_risco < 8:
        nota += (f"; IC por bootstrap pouco fiável (épocas em risco: {n_risco}); "
                 "preferir o IC de Wilson da probabilidade principal")
    return {"p": None if np.isnan(p) else float(p), "ic90": ic, "limite_t": int(t1),
            "n_epocas_em_risco": n_risco, "nota": nota}


def quantis_inicio_km(S: np.ndarray, qs=(0.10, 0.50, 0.90)) -> dict:
    out = {}
    for q in qs:
        # tolerância: 1-S pode dar 0,4999999999999998 quando o quantil cai exactamente numa
        # observação (ex.: mediana de 24 épocas) e o '>=' saltaria para a época seguinte
        idx = np.where(1.0 - S >= q - 1e-9)[0]
        out[f"P{int(q * 100)}"] = int(idx[0]) if len(idx) else None
    return out


# --------------------------------------------------------------------------- #
# Dados
# --------------------------------------------------------------------------- #
def ano_da_epoca(d: date) -> int:
    return d.year if d.month >= 9 else d.year - 1


def rotulo_epoca(ano: int) -> str:
    return f"{ano}/{str(ano + 1)[-2:]}"


def offset_de(d: date, ano: int) -> int:
    return (d - date(ano, 9, 1)).days


def _epoca_de_df(df: pd.DataFrame, ano: int, col: str) -> np.ndarray:
    idx = pd.date_range(pd.Timestamp(ano, 9, 1), periods=DIAS_EPOCA)
    if col not in df.columns:
        return np.full(DIAS_EPOCA, np.nan)
    return df[col].reindex(idx).to_numpy(dtype=float, copy=True)   # cópia gravável


def ler_power_json(caminho: Path) -> tuple[pd.DataFrame, dict]:
    """JSON do NASA POWER (ficheiro guardado do pipeline) -> (DataFrame diário, geometria)."""
    js = json.loads(Path(caminho).read_text(encoding="utf-8"))
    geom = {}
    try:
        lon, lat, *resto = js["geometry"]["coordinates"]
        geom = {"lon": float(lon), "lat": float(lat),
                "elev_m": float(resto[0]) if resto else None,
                "time_standard": (js.get("header") or {}).get("time_standard")}
    except (KeyError, ValueError, TypeError):
        pass
    return parse_power(js), geom


def carregar_csv(caminho: Path) -> pd.DataFrame:
    """CSV (data, chuva_mm, ...) ou JSON do POWER (PRECTOTCORR -> chuva_mm, etc.)."""
    caminho = Path(caminho)
    if caminho.suffix.lower() == ".json":
        df, _ = ler_power_json(caminho)
    else:
        df = pd.read_csv(caminho, parse_dates=["data"]).set_index("data")
    df = df.sort_index()
    return df[~df.index.duplicated(keep="last")]


def carregar_historico(caminho: Path, ano_excluido: int,
                       cobertura_min: float = 0.95) -> tuple[dict, dict, list]:
    """Épocas históricas completas. NÃO preenche lacunas (ffill/bfill é perigoso em chuva)."""
    df = carregar_csv(caminho)
    hist, extras, excluidas = {}, {}, []
    for ano in range(df.index.min().year, df.index.max().year + 1):
        if ano == ano_excluido:
            continue
        chuva = _epoca_de_df(df, ano, "chuva_mm")
        cob = float(np.mean(~np.isnan(chuva)))
        if cob < cobertura_min:
            if cob > 0:
                excluidas.append({"ano": ano, "cobertura": round(cob, 3)})
            continue
        hist[ano] = chuva
        extras[ano] = {"gwetroot": _epoca_de_df(df, ano, "gwetroot"),
                       "t2m": _epoca_de_df(df, ano, "t2m")}
    return hist, extras, excluidas


def parse_power(js: dict) -> pd.DataFrame:
    """JSON da API diária do NASA POWER -> DataFrame (-999 -> NaN)."""
    par = js["properties"]["parameter"]
    out = pd.DataFrame({k: pd.Series(v) for k, v in par.items()})
    out.index = pd.to_datetime(out.index, format="%Y%m%d")
    out = out.replace(-999, np.nan).replace(-999.0, np.nan)
    return out.rename(columns={"PRECTOTCORR": "chuva_mm", "GWETROOT": "gwetroot", "T2M": "t2m"})


def obter_power(lat: float, lon: float, ini: date, fim: date, timeout: int = 60) -> pd.DataFrame:
    # Convenção de hora: o POWER diário usa Local Solar Time por defeito (ver dossiê);
    # o IMERG não está alinhado a isso. Decisão em aberto.
    q = urllib.parse.urlencode({
        "parameters": "PRECTOTCORR,GWETROOT,T2M", "community": "AG",
        "longitude": lon, "latitude": lat,
        "start": ini.strftime("%Y%m%d"), "end": fim.strftime("%Y%m%d"), "format": "JSON"})
    url = f"https://power.larc.nasa.gov/api/temporal/daily/point?{q}"
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return parse_power(json.load(resp))


def _data_iso(s) -> date | None:
    """Interpreta s como data ISO (AAAA-MM-DD); None se não for interpretável (ex.: 'd0')."""
    try:
        return date.fromisoformat(str(s))
    except ValueError:
        return None


def _estado_fonte(estado: str, erro: str | None = None, **extra) -> dict:
    """Estado de uma fonte: ok | falhou | nao_pedida (I3: uma falha nunca interrompe o ciclo)."""
    return {"estado": estado, "erro": erro,
            "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"), **extra}


def _exigir_confirmado(nome: str, valor):
    """I6: constante «A CONFIRMAR» sem valor -> erro explícito (nunca se adivinha)."""
    if valor is None:
        raise RuntimeError(f"{nome} está por confirmar na documentação (constante «A CONFIRMAR» no "
                           "topo de ciclo_diario.py): não é usada sem confirmação")
    return valor


def _agrega_por_soma(variavel: str) -> bool:
    return variavel.startswith("precipitation") or variavel.startswith("et0")


def horas_validas_por_dia(js: dict, variavel: str = "precipitation") -> tuple[np.ndarray, list[str]]:
    """Horas com valor válido por membro e por dia: (membros x dias), lista de dias."""
    h = js["hourly"]
    datas = [t[:10] for t in h["time"]]
    chaves = sorted(k for k in h if k.startswith(variavel))
    dias = sorted(set(datas))
    mat = []
    for k in chaves:
        serie = pd.Series(h[k], dtype=float)
        mat.append(serie.notna().groupby(datas).sum().reindex(dias).fillna(0).to_numpy())
    return np.array(mat), dias


def parse_ensemble(js: dict, exigir_dia_completo: bool = False,
                   variavel: str = "precipitation") -> tuple[np.ndarray, list[str]]:
    """JSON horário do ensemble -> (membros x dias), lista de datas. Precipitação e ET0 somam;
    as outras variáveis fazem a média do dia. Com exigir_dia_completo=True, um dia sem as 24 horas
    válidas fica NaN nesse membro (por defeito mantém-se o comportamento anterior)."""
    h = js["hourly"]
    datas = [t[:10] for t in h["time"]]
    chaves = sorted(k for k in h if k.startswith(variavel))
    dias = sorted(set(datas))
    mat = []
    for k in chaves:
        serie = pd.Series(h[k], dtype=float)
        g = serie.groupby(datas)
        v = (g.sum(min_count=1) if _agrega_por_soma(variavel) else g.mean()).reindex(dias)
        if exigir_dia_completo:
            n = serie.notna().groupby(datas).sum().reindex(dias).fillna(0)
            v = v.where(n >= HORAS_DIA)
        mat.append(v.to_numpy())
    return np.array(mat), dias


def _pedir_ensemble(lat: float, lon: float, modelo: str, dias: int, variavel: str, timeout: int):
    q = urllib.parse.urlencode({
        "latitude": lat, "longitude": lon, "hourly": variavel,
        "models": modelo, "forecast_days": dias, "timezone": "Africa/Luanda"})
    url = f"https://ensemble-api.open-meteo.com/v1/ensemble?{q}"
    with urllib.request.urlopen(url, timeout=timeout) as resp:
        return json.load(resp), url


def obter_ensemble(lat: float, lon: float, modelo: str, dias: int = 15,
                   timeout: int = 60, variaveis=None, exigir_dia_completo: bool = False):
    # Confirmar na documentação: modelo, variáveis, horizonte e RESOLUÇÃO TEMPORAL
    # (somar valores horários pode não ser exacto se o modelo for 3-horário/6-horário).
    # Sem 'variaveis': (mat, datas, meta) como antes. Com 'variaveis' (multivariável): um pedido por
    # variável (uma variável inexistente para o modelo só gera aviso) e devolve
    # ({variavel: matriz membros x dias}, datas, meta); a precipitação é sempre pedida e obrigatória.
    if variaveis is None:
        js, url = _pedir_ensemble(lat, lon, modelo, dias, "precipitation", timeout)
        mat, datas = parse_ensemble(js, exigir_dia_completo=exigir_dia_completo)
        return mat, datas, {"url": url, "modelo": modelo}
    nomes = ["precipitation"] + [v for v in variaveis if v != "precipitation"]
    mats, avisos, urls, datas = {}, [], [], None
    for v in nomes:
        try:
            js, url = _pedir_ensemble(lat, lon, modelo, dias, v, timeout)
            m, d = parse_ensemble(js, exigir_dia_completo=exigir_dia_completo, variavel=v)
            if m.size == 0:
                raise ValueError("resposta sem membros desta variável")
        except Exception as e:  # noqa: BLE001
            if v == "precipitation":
                raise
            avisos.append(f"variável '{v}' indisponível para o modelo {modelo}: {e}")
            continue
        if datas is not None and d != datas:
            avisos.append(f"variável '{v}' com datas diferentes das da precipitação: ignorada")
            continue
        datas = d
        mats[v] = m
        urls.append(url)
    return mats, datas, {"url": urls[0], "urls": urls, "modelo": modelo, "avisos": avisos}


def carregar_ensemble_arquivado(caminho: Path) -> tuple[dict, list[str], dict]:
    """Ensemble arquivado (ensemble_*.json: datas e membros_mm_dia) -> ({variavel: matriz}, datas, meta)."""
    js = json.loads(Path(caminho).read_text(encoding="utf-8"))
    mat = np.array(js["membros_mm_dia"], dtype=float)
    datas = [str(x) for x in js["datas"]]
    if mat.ndim != 2 or mat.shape[1] != len(datas):
        raise ValueError(f"forma inválida: membros_mm_dia {mat.shape} vs {len(datas)} datas")
    mats = {"precipitation": mat}
    for nome, m in (js.get("variaveis") or {}).items():
        mats[nome] = np.array(m, dtype=float)
    return mats, datas, {"modelo": js.get("modelo")}


# --------------------------------------------------------------------------- #
# v0.3.0 F1: adaptadores (parsing puro separado do pedido; estado ok|falhou|nao_pedida)
# --------------------------------------------------------------------------- #
def _agreg_diaria(h: dict, nome: str, como: str, datas: list[str], dias: list[str]):
    """Agrega uma variável horária por dia; dia sem as 24 horas válidas -> None."""
    if nome not in h:
        return None
    serie = pd.Series(h[nome], dtype=float)
    g = serie.groupby(datas)
    v = {"soma": g.sum(min_count=1), "media": g.mean(), "min": g.min(), "max": g.max()}[como]
    n = serie.notna().groupby(datas).sum().reindex(dias).fillna(0)
    return [None if (np.isnan(x) or nn < HORAS_DIA) else float(x)
            for x, nn in zip(v.reindex(dias).to_numpy(), n.to_numpy())]


def parse_previsao_det(js: dict, camadas_solo=None) -> dict:
    """Open-Meteo determinístico (horário) -> agregação diária: temperatura (média, mín, máx),
    humidade do solo (média por camada), ET0 e precipitação (soma). Valores brutos, sem anomalia."""
    h = js["hourly"]
    datas = [t[:10] for t in h["time"]]
    dias = sorted(set(datas))
    out = {"datas": dias, "unidades": js.get("hourly_units") or {},
           "temperatura_2m": {c: _agreg_diaria(h, "temperature_2m", c, datas, dias)
                              for c in ("media", "min", "max")},
           "et0_fao_evapotranspiration": _agreg_diaria(h, "et0_fao_evapotranspiration", "soma", datas, dias),
           "precipitacao": _agreg_diaria(h, "precipitation", "soma", datas, dias)}
    if camadas_solo:
        out["humidade_solo"] = {c: _agreg_diaria(h, c, "media", datas, dias) for c in camadas_solo}
    return out


def obter_previsao_det(lat: float, lon: float, past_days: int = 0, timeout: int = 60) -> dict:
    """Previsão determinística (Open-Meteo Forecast). Nunca levanta: devolve estado ok|falhou."""
    try:
        variaveis, erro_solo, solo = list(VARS_PREVISAO_BASE), None, None
        try:
            solo = list(_exigir_confirmado("VARS_SOLO_PREVISAO", VARS_SOLO_PREVISAO))
            variaveis += solo
        except RuntimeError as e:
            erro_solo = str(e)
        q = urllib.parse.urlencode({
            "latitude": lat, "longitude": lon, "hourly": ",".join(variaveis),
            "past_days": past_days, "forecast_days": DIAS_PREVISAO_DET, "timezone": "Africa/Luanda"})
        url = f"{URL_FORECAST}?{q}"
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            js = json.load(resp)
        diario = parse_previsao_det(js, solo)
        if erro_solo:
            diario["humidade_solo"] = {"estado": "falhou", "erro": erro_solo}
        return _estado_fonte("ok", None, url=url, past_days=past_days, diario=diario)
    except Exception as e:  # noqa: BLE001
        return _estado_fonte("falhou", str(e))


def parse_sazonal(js: dict, blocos: dict) -> dict:
    """Anomalias sazonais -> {'semanal'|'mensal': {'tempos': [...], variável: média dos membros}}.
    'blocos' mapeia 'semanal'/'mensal' para a chave do bloco na resposta. Só descritivo e arquivo."""
    out = {}
    for rot, chave in blocos.items():
        b = js.get(chave)
        if not b:
            continue
        grupos = {}
        for k, v in b.items():
            if k == "time":
                continue
            grupos.setdefault(re.sub(r"_member\d+$", "", k), []).append(np.array(v, dtype=float))
        out[rot] = {"tempos": list(b.get("time", [])),
                    **{k: [None if np.isnan(x) else float(x) for x in np.nanmean(np.vstack(vs), axis=0)]
                       for k, vs in grupos.items()}}
    return out


def obter_sazonal(lat: float, lon: float, timeout: int = 60) -> dict:
    """Sazonal (EC46/SEAS5). Todas as constantes estão «A CONFIRMAR»: sem elas, erro explícito."""
    try:
        url_base = _exigir_confirmado("URL_SAZONAL", URL_SAZONAL)
        modelos = _exigir_confirmado("MODELOS_SAZONAL", MODELOS_SAZONAL)
        ps = _exigir_confirmado("PARAM_SAZONAL_SEMANAL", PARAM_SAZONAL_SEMANAL)
        pm = _exigir_confirmado("PARAM_SAZONAL_MENSAL", PARAM_SAZONAL_MENSAL)
        vs = _exigir_confirmado("VARS_SAZONAL_SEMANAL", VARS_SAZONAL_SEMANAL)
        vm = _exigir_confirmado("VARS_SAZONAL_MENSAL", VARS_SAZONAL_MENSAL)
        q = urllib.parse.urlencode({"latitude": lat, "longitude": lon, "models": ",".join(modelos),
                                    ps: ",".join(vs), pm: ",".join(vm)})
        url = f"{url_base}?{q}"
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            js = json.load(resp)
        return _estado_fonte("ok", None, url=url, dados=parse_sazonal(js, {"semanal": ps, "mensal": pm}))
    except Exception as e:  # noqa: BLE001
        return _estado_fonte("falhou", str(e))


def valor_no_ponto(tif, lat: float, lon: float):
    """Valor BRUTO de um GeoTIFF no ponto (None se nodata ou fora da grelha). rasterio é opcional (I2)."""
    try:
        import rasterio
        from rasterio.windows import Window
    except ImportError as e:
        raise RuntimeError("rasterio não está instalado: o bloco CHIRPS-GEFS não pode ser lido "
                           "(pip install rasterio); o ciclo continua sem ele") from e
    with rasterio.open(tif) as src:
        crs = src.crs
        if crs is not None and not crs.is_geographic:
            raise RuntimeError(f"CRS {crs} não geográfico: lon/lat não aplicáveis sem reprojecção")
        linha, col = src.index(lon, lat)
        if not (0 <= linha < src.height and 0 <= col < src.width):
            return None
        v = float(src.read(1, window=Window(col, linha, 1, 1))[0, 0])
        nd = src.nodata
    if np.isnan(v) or (nd is not None and not np.isnan(nd) and v == nd):
        return None
    return v


def ler_chirps_gefs(tifs, lat: float, lon: float) -> dict:
    """Totais brutos do CHIRPS3-GEFS (GeoTIFF locais, só «c3g»). Aceita 'N=caminho' (N = 5, 10 ou 15
    dias) para declarar a acumulação; sem prefixo, fica sem acumulação declarada (não se adivinha pelo
    nome). NÃO calcula dias secos (média de ensemble) nem percentis contra histórico de outra fonte (I5)."""
    totais, erros = [], []
    for t in tifs:
        acum, caminho = None, str(t)
        m = re.match(r"^(5|10|15)d?=(.+)$", caminho)
        if m:
            acum, caminho = int(m.group(1)), m.group(2)
        nome = Path(caminho).name
        if CHIRPS_GEFS_MARCA not in nome.lower():
            erros.append(f"{nome}: só se aceitam ficheiros «{CHIRPS_GEFS_MARCA}» (CHIRPS3-GEFS)")
            continue
        try:
            totais.append({"ficheiro": nome, "acumulado_dias": acum, "valor": valor_no_ponto(caminho, lat, lon),
                           "unidade": "a confirmar", "rotulo": "valor bruto (média de ensemble)"})
        except Exception as e:  # noqa: BLE001
            erros.append(f"{nome}: {e}")
    return _estado_fonte("ok" if totais else "falhou", "; ".join(erros) or None, totais=totais)


# --------------------------------------------------------------------------- #
# Cenários e agregação
# --------------------------------------------------------------------------- #
def construir_cenarios(obs: np.ndarray, ultimo_obs: int, hist: dict, hoje_off: int,
                       ens: np.ndarray | None, dias_ens: int, estrito: bool = False,
                       info: dict | None = None) -> dict:
    """
    Para cada época histórica: observado até ao último dia observado + continuação histórica.
    Lacunas dentro do observado e entre o último dia observado e hoje vêm da época histórica.
    Com dias_ens > 0 (só com perícia demonstrada): os primeiros dias desde hoje vêm de cada
    membro do ensemble, e a continuação histórica segue-se SEM ser condicionada ao fim do
    membro (pressuposto a documentar e testar).
    Modo estrito (v0.3.0): um NaN do ensemble NÃO sobrescreve a época histórica (mantém o valor
    histórico nesse dia) e os dias afectados ficam em info["dias_ensemble_invalidos"].
    """
    cen = {}
    invalidos = set()
    for ano, base in hist.items():
        seq = base.copy()
        pre = obs[:ultimo_obs + 1].copy()
        falta = np.isnan(pre)
        pre[falta] = base[:ultimo_obs + 1][falta]
        seq[:ultimo_obs + 1] = pre
        if dias_ens > 0 and ens is not None:
            seqs = []
            for m in range(ens.shape[0]):
                s2 = seq.copy()
                n = min(dias_ens, ens.shape[1], DIAS_EPOCA - hoje_off)
                if estrito:
                    vals = ens[m, :n]
                    ok = ~np.isnan(vals)
                    invalidos.update(int(i) for i in np.where(~ok)[0])
                    s2[hoje_off:hoje_off + n][ok] = vals[ok]
                else:
                    s2[hoje_off:hoje_off + n] = ens[m, :n]
                seqs.append(s2)
            cen[ano] = seqs
        else:
            cen[ano] = [seq]
    if info is not None:
        info["dias_ensemble_invalidos"] = sorted(invalidos)
    return cen


def avaliar_cenarios(cen: dict, hoje_off: int, H: int, W: int, r: Regra) -> dict:
    inicio_por_ep, risco_por_ep, excluidas = [], [], []
    for ano, seqs in cen.items():
        ini_m, risco_m = [], []
        for seq in seqs:
            estado, d = inicio_v0(seq, r)
            if estado == "indeterminado":
                continue
            ini_m.append(float(estado == "confirmado" and d <= hoje_off + H))
            riscos = []
            for p in range(hoje_off, hoje_off + H):
                jan = seq[p:p + W]
                riscos.append(np.nan if (len(jan) < W or np.isnan(jan).any())
                              else float(tem_seca_longa(jan, r.limiar_dia_seco_mm,
                                                         r.seca_consecutiva_dias)))
            risco_m.append(riscos)
        if not ini_m:
            excluidas.append(ano)
            continue
        inicio_por_ep.append(float(np.mean(ini_m)))
        risco_por_ep.append(_media_sem_nan(np.array(risco_m, dtype=float)))
    return {"inicio": np.array(inicio_por_ep),
            "risco": np.array(risco_por_ep) if risco_por_ep else np.empty((0, H)),
            "excluidas_indeterminadas": excluidas}


def _media_sem_nan(m: np.ndarray) -> np.ndarray:
    """Média por coluna ignorando NaN; coluna toda NaN -> NaN (sem RuntimeWarning)."""
    cont = (~np.isnan(m)).sum(axis=0)
    soma = np.nansum(m, axis=0)
    return np.where(cont > 0, soma / np.maximum(cont, 1), np.nan)


# --------------------------------------------------------------------------- #
# Linha de base: calendário fixo e grelha de sensibilidade (só climatologia)
# --------------------------------------------------------------------------- #
def risco_epocas_data(hist: dict, off: int, W: int, n_seca: int, limiar: float) -> dict:
    """Numa data fixa (offset desde 1 Set): em que épocas houve >= n_seca dias secos
    (< limiar) nos W dias desde essa data. Épocas com lacunas na janela ficam de fora."""
    anos, ev = [], []
    for ano, ch in sorted(hist.items()):
        jan = ch[off:off + W]
        if len(jan) < W or bool(np.isnan(jan).any()):
            continue
        anos.append(ano)
        ev.append(tem_seca_longa(jan, limiar, n_seca))
    return {"anos": anos, "eventos": np.array(ev, dtype=bool)}


def calendario_fixo(hist: dict, r: Regra, W: int, metodo: str = "wilson") -> dict:
    """Em quantas épocas semear numa data fixa teria sido seguido de seca longa, para a série
    completa e para cada metade. Qualquer regra 'inteligente' tem de bater esta linha de base."""
    anos = sorted(hist)
    meio = len(anos) // 2
    primeira = set(anos[:meio])
    datas = {}
    for rot, off in DATAS_FIXAS.items():
        res = risco_epocas_data(hist, off, W, r.seca_consecutiva_dias, r.limiar_dia_seco_mm)
        ev = res["eventos"]
        m1 = np.array([y in primeira for y in res["anos"]], dtype=bool)
        datas[rot] = {"serie_completa": resumo_binario(ev, metodo),
                      "primeira_metade": resumo_binario(ev[m1], metodo),
                      "segunda_metade": resumo_binario(ev[~m1], metodo)}
    return {
        "definicao": (f"época com >= {r.seca_consecutiva_dias} dias secos (< {r.limiar_dia_seco_mm} mm) "
                      f"nos {W} dias desde a data"),
        "metades": {"primeira": [anos[0], anos[meio - 1]], "segunda": [anos[meio], anos[-1]],
                    "nota": "corte ao meio da série (decisão em aberto); descritivo, sem teste"},
        "datas": datas,
    }


def grelha_sensibilidade(hist: dict, r: Regra, metodo: str = "wilson",
                         limiares=(1.0, 2.0, 3.0), secas=(7, 10), janelas=(20, 21),
                         janela_actual: int | None = None) -> dict:
    """Robustez do risco de seca ao limiar de dia seco, à duração da seca e à janela.
    As sequências secas dependem muito da chuva fraca: ver a coluna do limiar.
    'janela_actual' é a janela REALMENTE em uso (por defeito, a primeira da grelha, como antes);
    se não estiver na grelha, acrescenta-se para a linha da especificação existir sempre."""
    if janela_actual is None:
        janela_actual = janelas[0]
    elif janela_actual not in janelas:
        janelas = tuple(sorted(set(janelas) | {janela_actual}))
    linhas = []
    for lim in limiares:
        for sec in secas:
            for jan in janelas:
                datas = {}
                for rot, off in DATAS_FIXAS.items():
                    rb = resumo_binario(
                        risco_epocas_data(hist, off, jan, sec, lim)["eventos"], metodo)
                    datas[rot] = {"k": rb["k"], "n": rb["n"],
                                  "p": None if rb["p"] is None else round(rb["p"], 3)}
                linhas.append({
                    "limiar_dia_seco_mm": lim, "seca_dias": sec, "janela_dias": jan,
                    "especificacao_actual": bool(lim == r.limiar_dia_seco_mm
                                                 and sec == r.seca_consecutiva_dias
                                                 and jan == janela_actual),
                    "datas": datas})
    return {"linhas": linhas,
            "janela_actual": janela_actual,
            "nota": ("pré-declarada: 3 limiares x 2 durações x janelas; 'especificacao_actual' "
                     "assinala a linha com a regra e a janela em uso (janela_actual)")}


# --------------------------------------------------------------------------- #
# Reprodução: especificação congelável e hashes das entradas
# --------------------------------------------------------------------------- #
def sha256_ficheiro(caminho: Path) -> str:
    h = hashlib.sha256()
    with open(caminho, "rb") as f:
        for bloco in iter(lambda: f.read(1 << 20), b""):
            h.update(bloco)
    return h.hexdigest()


def especificacao(r: Regra, a: argparse.Namespace) -> dict:
    """Tudo o que muda o resultado e deve ficar fixado ANTES de ver resultados."""
    espec = {"regra_v0": asdict(r), "horizonte_dias": a.horizonte,
             "janela_risco_dias": a.janela_risco, "tolerancias": [float(t) for t in a.tolerancias],
             "ic_metodo": a.ic, "cobertura_min_epoca": COBERTURA_MIN,
             "dias_ensemble": a.dias_ensemble, "dias_epoca": DIAS_EPOCA}
    espec.update(especificacao_v030(a))     # v0.3.0: vazio sem as flags novas (hash idêntico)
    return espec


def hash_especificacao(espec: dict) -> str:
    canon = json.dumps(espec, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    return hashlib.sha256(canon.encode("utf-8")).hexdigest()


def primeira_abaixo(datas: list[date], his: list, tol: float):
    for d, hi in zip(datas, his):
        if hi is not None and not np.isnan(hi) and hi < tol:
            return d.isoformat()
    return None


def percentil_rank(valor: float, ref: np.ndarray) -> float | None:
    ref = ref[~np.isnan(ref)]
    return None if len(ref) == 0 or np.isnan(valor) else float(100.0 * np.mean(ref <= valor))


def descritivos(obs_ex: dict, hist_ex: dict, ultimo_obs: int, janela: int = 7) -> dict:
    """Estado do solo e da temperatura, DESCRITIVO. Sem limiares agronómicos."""
    if ultimo_obs < 0:
        return {}
    a, b = max(0, ultimo_obs - janela + 1), ultimo_obs + 1
    out = {}
    for var in ("gwetroot", "t2m"):
        atual = float(np.nanmean(obs_ex[var][a:b])) if np.any(~np.isnan(obs_ex[var][a:b])) else np.nan
        ref = np.array([np.nanmean(h[var][a:b]) if np.any(~np.isnan(h[var][a:b])) else np.nan
                        for h in hist_ex.values()])
        if np.isnan(atual) or np.all(np.isnan(ref)):
            continue
        d = {"media_ultimos_dias": round(atual, 4), "janela_dias": b - a,
             "percentil_climatologico": percentil_rank(atual, ref)}
        if var == "t2m":
            d["anomalia_vs_media_historica"] = round(atual - float(np.nanmean(ref)), 3)
        out[var] = d
    if out:
        out["nota"] = "descritivo; limiares agronómicos por validar; não entra no estado"
    return out


# --------------------------------------------------------------------------- #
# Grau de confiança (pior de três componentes)
# --------------------------------------------------------------------------- #
_NIVEIS = ["Baixa", "Média", "Alta"]


def grau_confianca(largura_ic: float | None, usa_ensemble: bool, pericia_demonstrada: bool,
                   fonte_obs: str, provisorio: bool, lacuna_dias: int,
                   hist_power: bool = False) -> dict:
    # Limiares PROVISÓRIOS: fixar antes de ver resultados.
    if largura_ic is None:
        prec = 0
    else:
        prec = 2 if largura_ic <= 0.20 else (1 if largura_ic <= 0.40 else 0)
    qual = 2
    if fonte_obs == "power" or hist_power:
        qual = 0                       # reanálise (observado OU histórico do risco); diverge do IMERG
    if provisorio:
        qual = min(qual, 1)
    if lacuna_dias > 7:
        qual = 0
    elif lacuna_dias > 2:
        qual = min(qual, 1)
    if not usa_ensemble:
        per, per_txt = None, "nao_aplicavel_so_climatologia"
    else:
        per = 2 if pericia_demonstrada else 0
        per_txt = _NIVEIS[per]
    comps = [x for x in (prec, qual, per) if x is not None]
    return {"grau": _NIVEIS[min(comps)],
            "componentes": {"precisao": _NIVEIS[prec], "qualidade_dados": _NIVEIS[qual],
                            "pericia": per_txt},
            "limiares_provisorios": True}


# --------------------------------------------------------------------------- #
# Apresentação, diagnóstico e avisos (v0.2.1)
# --------------------------------------------------------------------------- #
def _pt(x: float) -> str:
    return f"{x:.2f}".replace(".", ",")


def texto_apresentacao(ci: dict) -> str:
    """Texto para a interface: frequência 'k de n' + IC. Nunca mostra 0%/100% como certeza."""
    p, ic = ci.get("p"), ci.get("ic90") or [None, None]
    if p is None or ic[0] is None:
        return "sem épocas utilizáveis"
    freq = ci.get("frequencia") or f"{ci.get('n_epocas', 0)} épocas"
    if p >= 1.0:
        return f"{freq}; limite inferior do IC90 = {_pt(ic[0])} (não é certeza)"
    if p <= 0.0:
        return f"{freq}; limite superior do IC90 = {_pt(ic[1])} (não é ausência de risco)"
    return f"{freq} (p ≈ {_pt(p)}; IC90 {_pt(ic[0])}–{_pt(ic[1])})"


def tolerancias_inatingiveis(pontos: list, tolerancias, metodo: str) -> dict | None:
    """Com n épocas, o melhor limite superior possível (0 eventos em n) já pode ser > tolerância.
    Exacto com 1 membro por época (0/1); com ensemble é só indicativo."""
    ns = [pt["n_epocas"] for pt in pontos if pt.get("n_epocas")]
    if not ns:
        return None
    n = max(ns)
    lim = float(ic_binario(0, n, metodo)[1])
    return {"n_epocas_max": n, "limite_superior_minimo_ic90": round(lim, 3),
            "tolerancias_inatingiveis": [f"{int(round(t * 100))}%" for t in tolerancias if t <= lim],
            "nota": "tolerância <= limite superior mínimo nunca é cumprida (0 eventos em n épocas)"}


def diagnostico_historico(hist: dict, r: Regra, ultimo_dia, hist_power: bool) -> dict:
    """Fracção de dias abaixo do limiar de dia seco e de dias exactamente 0 (todas as épocas).
    Séries de reanálise com muita chuva fraca (POWER/MERRA-2) subestimam as sequências secas."""
    ch = np.concatenate(list(hist.values())) if hist else np.array([])
    v = ch[~np.isnan(ch)]
    out = {"n_epocas": len(hist), "epocas": [min(hist), max(hist)] if hist else None,
           "ultimo_dia_serie": ultimo_dia.isoformat() if ultimo_dia is not None else None,
           "dias_validos": int(len(v)),
           "dias_abaixo_do_limiar_pct": round(float(100 * np.mean(v < r.limiar_dia_seco_mm)), 1)
           if len(v) else None,
           "dias_zero_pct": round(float(100 * np.mean(v == 0)), 1) if len(v) else None}
    if hist_power:
        out["aviso"] = ("histórico POWER: correlação diária com o IMERG baixa (0,12-0,29 no dossiê) e "
                        "extremos que o IMERG não vê; o risco de seca a partir desta série NÃO é "
                        "apresentável. Refazer com o IMERG (--imerg-dir / CSV diário do IMERG).")
    return out


def avisos_serie(hist: dict, ultimo_dia, ano_epoca_atual: int) -> list[str]:
    """Épocas em falta entre o fim da série e a época em curso."""
    if not hist:
        return []
    ultima = max(hist)
    falta = [rotulo_epoca(y) for y in range(ultima + 1, ano_epoca_atual)]
    av = []
    if falta:
        fim = ultimo_dia.isoformat() if ultimo_dia is not None else "?"
        av.append(f"histórico sem as épocas {', '.join(falta)} (a série termina em {fim}; "
                  f"última época completa: {rotulo_epoca(ultima)}): descarregar de novo para as incluir.")
    return av


def detalhe_candidata(obs: np.ndarray, d: int, ultimo_obs: int, r: Regra) -> dict:
    """Quão firme é a candidata pendente: um dia >= 1 mm ainda 'em formação' não é um início provável."""
    dias_obs = ultimo_obs - d + 1
    return {"dia_candidato_offset": int(d), "dias_observados_desde_a_candidata": int(dias_obs),
            "em_formacao": bool(dias_obs < 5),
            "acumulado_5d_conhecido_mm": round(float(np.nansum(obs[d:d + 5])), 1),
            "dias_ate_poder_confirmar": int(max(0, d + r.janela_confirmacao_dias - 1 - ultimo_obs)),
            "nota": "em_formacao = menos de 5 dias observados: não apresentar como início provável"}


# --------------------------------------------------------------------------- #
# v0.3.0 - modo estrito, fontes declaradas (I9), validação de perícia (F3)
# --------------------------------------------------------------------------- #
def modo_estrito(a) -> bool:
    """MODO ESTRITO: --exigir-pericia, --condicionar-fronteira ou --mensagem-agricultor (I4)."""
    return bool(getattr(a, "exigir_pericia", False) or getattr(a, "condicionar_fronteira", False)
                or getattr(a, "mensagem_agricultor", False))


def limiares_novos_activos(a) -> bool:
    """True se alguma flag da v0.3.0 que introduz limiares PROVISÓRIOS (I7) está activa."""
    return bool(modo_estrito(a) or getattr(a, "fonte_historico", None)
                or getattr(a, "fonte_observado", None))


def especificacao_v030(a) -> dict:
    """Parâmetros novos: só entram na especificação (e no hash) quando activos (I1, I7)."""
    ex = {}
    if modo_estrito(a):
        ex["modo_estrito"] = True
    if getattr(a, "condicionar_fronteira", False):
        ex["condicionar_fronteira"] = {
            "min_epocas": MIN_EPOCAS_FRONTEIRA, "classes_seca_dias": list(CLASSES_SECA_FRONTEIRA),
            "classes_chuva_4d_mm": list(CLASSES_CHUVA_4D_FRONTEIRA),
            "classes_idade_dias": list(CLASSES_IDADE_FRONTEIRA),
            "relaxamento": ["chuva_4d", "idade"]}
    if getattr(a, "mensagem_agricultor", False):
        ex["mensagem_agricultor"] = {"tolerancia_decisao": float(a.tolerancia_decisao)}
    fh, fo = getattr(a, "fonte_historico", None), getattr(a, "fonte_observado", None)
    if fh or fo:
        ex["fontes_declaradas"] = {"historico": fh, "observado": fo, "fiaveis": list(FONTES_FIAVEIS)}
    return ex


def estado_fontes_declaradas(fh, fo) -> dict:
    """Modo estrito: as duas fontes têm de vir declaradas e fiáveis (imerg/chirps3); senão, «fonte não fiável»."""
    motivos = []
    for rot, v in (("histórico", fh), ("observado", fo)):
        if v is None:
            motivos.append(f"fonte do {rot} não declarada")
        elif v not in FONTES_FIAVEIS:
            motivos.append(f"fonte do {rot} declarada como '{v}' (não fiável)")
    return {"historico": fh, "observado": fo, "fiaveis": list(FONTES_FIAVEIS), "motivos": motivos,
            "estado": "fonte não fiável" if motivos else "fontes declaradas fiáveis"}


def ler_antecedencia_validada(caminho) -> tuple[int, str | None]:
    """Antecedência máxima validada (dias) do ficheiro --validacao. Só com o booleano da v0.2.1, ou sem
    ficheiro, é 0 (modo estrito), com aviso."""
    if not caminho or not Path(caminho).exists():
        return 0, ("sem ficheiro de validação de perícia (--validacao): antecedência validada = 0 dias; "
                   "o ensemble não entra no cálculo.")
    js = json.loads(Path(caminho).read_text(encoding="utf-8"))
    if "antecedencia_max_validada" in js:
        try:
            return max(0, int(js["antecedencia_max_validada"])), None
        except (TypeError, ValueError):
            return 0, "antecedencia_max_validada ilegível no ficheiro de validação: tratada como 0."
    return 0, ("o ficheiro de validação só tem o booleano pericia_demonstrada (formato da v0.2.1): "
               "tratado como antecedência 0 no modo estrito.")


def evento_candidata_v0(chuva: np.ndarray, i: int, r: Regra):
    """Dia i é candidato V0 (chuva >= limiar e acumulado dos 5 dias desde i > 20 mm). None se a janela
    de 5 dias não é totalmente válida."""
    w = np.asarray(chuva[i:i + 5], dtype=float)
    if len(w) < 5 or bool(np.isnan(w).any()):
        return None
    return bool(w[0] >= r.limiar_chuva_mm and w.sum() > r.acumulado_5d_mm)


def eventos_por_epoca(hist: dict, r: Regra) -> dict:
    """Por época: array (DIAS_EPOCA) com 1/0 = dia candidato V0; NaN se a janela de 5 dias é inválida."""
    out = {}
    for ano, ch in hist.items():
        ev = np.full(DIAS_EPOCA, np.nan)
        for i in range(DIAS_EPOCA - 4):
            e = evento_candidata_v0(ch, i, r)
            if e is not None:
                ev[i] = float(e)
        out[ano] = ev
    return out


def frequencia_climatologica(ev_hist: dict, off: int, excluir_ano=None,
                             janela: int = VAL_JANELA_CLIM):
    """Frequência do evento no dia 'off' (janela +/- 'janela' dias), leave-one-season-out."""
    lo, hi = max(0, off - janela), min(DIAS_EPOCA - 5, off + janela)
    vals = [ev_hist[y][lo:hi + 1] for y in ev_hist if y != excluir_ano]
    if not vals:
        return None
    v = np.concatenate(vals)
    v = v[~np.isnan(v)]
    return float(v.mean()) if len(v) else None


def eventos_observados(chuva: pd.Series, r: Regra) -> dict:
    """{data: evento V0 candidato} do observado de verificação (só datas com janela de 5 dias válida)."""
    idx = pd.date_range(chuva.index.min(), chuva.index.max())
    arr = chuva.reindex(idx).to_numpy(dtype=float)
    out = {}
    for i, dia in enumerate(idx):
        e = evento_candidata_v0(arr, i, r)
        if e is not None:
            out[dia.date()] = e
    return out


def pares_antecedencia(arquivos: list, L: int, obs_ev: dict, ev_hist: dict, r: Regra) -> list:
    """Pares (p previsto, o observado, fc climatológico) para a antecedência L. Convenção: o dia de
    emissão é o índice 0; o evento «candidata V0 no índice L» exige os índices L a L+4 válidos em todos os
    membros, logo cada ficheiro só entra se n_dias >= L+5."""
    pares = []
    for arq in arquivos:
        ens = arq["ens"]
        if ens.shape[1] < L + 5:
            continue
        w = ens[:, L:L + 5]
        if bool(np.isnan(w).any()):
            continue
        t = arq["emissao"] + timedelta(days=L)
        o = obs_ev.get(t)
        if o is None:
            continue
        epoca = ano_da_epoca(t)
        off = offset_de(t, epoca)
        if not (0 <= off <= DIAS_EPOCA - 5):
            continue
        fc = frequencia_climatologica(ev_hist, off, excluir_ano=epoca)
        if fc is None:
            continue
        p = float(np.mean((w[:, 0] >= r.limiar_chuva_mm) & (w.sum(axis=1) > r.acumulado_5d_mm)))
        pares.append({"epoca": epoca, "data": t, "p": p, "o": float(o), "fc": fc})
    return pares


def bss_ic90(sf: np.ndarray, sc: np.ndarray, grupos: np.ndarray, B: int = VAL_BOOTSTRAP_B,
             seed: int = VAL_SEMENTE, unidade: str = "epoca") -> list:
    """IC90 do BSS por bootstrap. A UNIDADE DE REAMOSTRAGEM É A ÉPOCA AGRÍCOLA: pares diários da mesma
    época não são independentes. unidade='par' existe só para demonstrar que daria um IC demasiado estreito."""
    if unidade == "epoca":
        g = np.unique(grupos)
        sf_u = np.array([sf[grupos == x].sum() for x in g])
        sc_u = np.array([sc[grupos == x].sum() for x in g])
    else:
        sf_u, sc_u = np.asarray(sf, dtype=float), np.asarray(sc, dtype=float)
    S = len(sf_u)
    if S < 2:
        return [None, None]
    rng = np.random.default_rng(seed)
    idx = rng.integers(0, S, size=(B, S))
    num, den = sf_u[idx].sum(axis=1), sc_u[idx].sum(axis=1)
    ok = den > 0
    if int(ok.sum()) < B // 2:
        return [None, None]
    b = 1.0 - num[ok] / den[ok]
    return [float(np.percentile(b, 5)), float(np.percentile(b, 95))]


def calibracao_classes(p: np.ndarray, o: np.ndarray) -> dict:
    """Calibração por classes [0-0,1], (0,1-0,3], (0,3-0,6], (0,6-1]. «ok» se todas as classes com
    >= 20 pares têm |freq - prob média| <= 0,15 e há >= 2 classes com >= 20 pares; senão «inconclusiva»."""
    rot = ["[0;0,1]", "(0,1;0,3]", "(0,3;0,6]", "(0,6;1]"]
    classes = []
    for i, (lo, hi) in enumerate(VAL_CLASSES):
        m = (p >= lo) & (p <= hi) if i == 0 else (p > lo) & (p <= hi)
        n = int(m.sum())
        classes.append({"classe": rot[i], "n_pares": n,
                        "prob_media": float(p[m].mean()) if n else None,
                        "freq_obs": float(o[m].mean()) if n else None})
    grandes = [c for c in classes if c["n_pares"] >= VAL_MIN_PARES_CLASSE]
    ok = len(grandes) >= 2 and all(abs(c["freq_obs"] - c["prob_media"]) <= VAL_TOL_CALIBRACAO
                                   for c in grandes)
    return {"classes": classes, "estado": "ok" if ok else "inconclusiva"}


def avaliar_antecedencia(pares: list, B: int = VAL_BOOTSTRAP_B, seed: int = VAL_SEMENTE,
                         unidade: str = "epoca") -> dict:
    """Brier, BSS (contra a climatologia do dia), IC90, calibração e veredicto de UMA antecedência."""
    n = len(pares)
    p = np.array([x["p"] for x in pares], dtype=float)
    o = np.array([x["o"] for x in pares], dtype=float)
    fc = np.array([x["fc"] for x in pares], dtype=float)
    ep = np.array([x["epoca"] for x in pares])
    n_ep, n_ev = len(set(ep.tolist())), int(o.sum())
    out = {"estado": "avaliada", "n_pares": n, "n_epocas": n_ep, "n_eventos": n_ev,
           "n_nao_eventos": n - n_ev, "brier": None, "brier_climatologia": None, "bss": None,
           "bss_ic90": [None, None], "calibracao": None}
    if n:
        sf, sc = (p - o) ** 2, (fc - o) ** 2
        out["brier"], out["brier_climatologia"] = float(sf.mean()), float(sc.mean())
        if out["brier_climatologia"] > 0:
            out["bss"] = 1.0 - out["brier"] / out["brier_climatologia"]
            out["bss_ic90"] = bss_ic90(sf, sc, ep, B, seed, unidade)
        out["calibracao"] = calibracao_classes(p, o)
    motivos = []
    if n_ep < VAL_MIN_EPOCAS:
        motivos.append(f"épocas: {n_ep} < {VAL_MIN_EPOCAS} (faltam {VAL_MIN_EPOCAS - n_ep})")
    if n_ev < VAL_MIN_EVENTOS:
        motivos.append(f"eventos: {n_ev} < {VAL_MIN_EVENTOS} (faltam {VAL_MIN_EVENTOS - n_ev})")
    if n - n_ev < VAL_MIN_NAO_EVENTOS:
        motivos.append(f"não-eventos: {n - n_ev} < {VAL_MIN_NAO_EVENTOS} "
                       f"(faltam {VAL_MIN_NAO_EVENTOS - (n - n_ev)})")
    lo = out["bss_ic90"][0]
    if lo is None or not lo > 0:
        motivos.append("limite inferior do IC90 do BSS não é > 0" if lo is not None
                       else "BSS/IC90 não calculáveis")
    if out["calibracao"] is None or out["calibracao"]["estado"] != "ok":
        motivos.append("calibração inconclusiva ou falhada")
    out["cumpre"], out["motivos_nao_cumpre"] = not motivos, motivos
    return out


def validar_pericia(a: argparse.Namespace) -> dict:
    """F3: lê os ensemble_*.json arquivados em DIR e o observado de verificação; escreve
    DIR/validacao_pericia.json. Só a MESMA fonte no histórico e no observado (I5)."""
    fh, fo = a.fonte_historico, a.fonte_observado
    if not fh or not fo:
        raise SystemExit("--validar-pericia exige --fonte-historico e --fonte-observado declaradas")
    if fh != fo:
        raise SystemExit(f"fontes diferentes (histórico '{fh}' vs observado '{fo}'): a verificação "
                         "compara previsão, observado e climatologia da MESMA fonte (I5)")
    if not a.observado:
        raise SystemExit("--validar-pericia exige --observado (CSV de verificação)")
    r = Regra()
    avisos = []
    if fh == "outra":
        avisos.append("fonte 'outra' declarada nos dois lados: não é possível confirmar que é a mesma.")
    hist, _, _ = carregar_historico(Path(a.historico), ano_excluido=-1, cobertura_min=COBERTURA_MIN)
    ev_hist = eventos_por_epoca(hist, r)
    obs_ev = eventos_observados(carregar_csv(Path(a.observado))["chuva_mm"], r)
    por_data, ignorados, sem_dia_completo = {}, [], 0
    for f in sorted(Path(a.validar_pericia).rglob("ensemble_*.json")):
        try:
            js = json.loads(f.read_text(encoding="utf-8"))
            emissao = _data_iso(js["datas"][0])
            if emissao is None:
                ignorados.append(f"{f.name}: datas não interpretáveis como ISO")
                continue
            ens = np.array(js["membros_mm_dia"], dtype=float)
            if ens.ndim != 2 or ens.shape[1] != len(js["datas"]):
                raise ValueError("forma inválida")
        except Exception as e:  # noqa: BLE001
            ignorados.append(f"{f.name}: {e}")
            continue
        if not js.get("dia_completo_exigido"):
            sem_dia_completo += 1
        por_data[emissao] = {"emissao": emissao, "ens": ens}    # um por data: fica o último (por nome)
    arquivos = [por_data[d] for d in sorted(por_data)]
    if sem_dia_completo:
        avisos.append(f"{sem_dia_completo} ficheiro(s) arquivado(s) sem dia_completo_exigido: dias parciais "
                      "podem estar somados; arquivar em modo estrito.")
    n_max = max((x["ens"].shape[1] for x in arquivos), default=0)
    det, amax, contiguo = {}, 0, True
    for L in range(1, n_max + 1):
        if L > n_max - 5:
            det[str(L)] = {"estado": "nao_avaliavel",
                           "motivo": f"n_dias máximo = {n_max} < L+5 = {L + 5}", "cumpre": False}
            continue
        det[str(L)] = avaliar_antecedencia(pares_antecedencia(arquivos, L, obs_ev, ev_hist, r))
        if contiguo and det[str(L)]["cumpre"]:
            amax = L
        else:
            contiguo = False
    d1 = det.get("1") or {}
    faltam = ({"epocas": max(0, VAL_MIN_EPOCAS - d1.get("n_epocas", 0)),
               "eventos": max(0, VAL_MIN_EVENTOS - d1.get("n_eventos", 0)),
               "nao_eventos": max(0, VAL_MIN_NAO_EVENTOS - d1.get("n_nao_eventos", 0))}
              if d1.get("estado") == "avaliada" else None)
    espec = {"b": VAL_BOOTSTRAP_B, "semente": VAL_SEMENTE, "janela_clim_dias": VAL_JANELA_CLIM,
             "min_epocas": VAL_MIN_EPOCAS, "min_eventos": VAL_MIN_EVENTOS,
             "min_nao_eventos": VAL_MIN_NAO_EVENTOS, "classes": [list(c) for c in VAL_CLASSES],
             "min_pares_classe": VAL_MIN_PARES_CLASSE, "tolerancia_calibracao": VAL_TOL_CALIBRACAO,
             "regra_v0": asdict(r)}
    res = {"versao_codigo": VERSAO_CODIGO,
           "estado_documento": "proposta de investigação - indicativo, NÃO é recomendação",
           "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
           "zona": a.zona, "fonte_historico": fh, "fonte_observado": fo,
           "convencao": ("dia de emissão = índice 0; antecedência L = evento «candidata V0 no índice L», "
                         "com os índices L a L+4 válidos em todos os membros; só L <= n_dias-5"),
           "especificacao": {"hash": hash_especificacao(espec), "parametros": espec},
           "limiares_provisorios": True,
           "n_ficheiros_ensemble": len(arquivos), "ficheiros_ignorados": ignorados,
           "n_dias_max": n_max, "por_antecedencia": det,
           "antecedencia_max_validada": amax, "pericia_demonstrada": amax >= 1,
           "faltam_para_antecedencia_1": faltam, "avisos": avisos}
    if amax < 1:
        res["motivo_nao_demonstrada"] = (d1.get("motivos_nao_cumpre") or ["sem ficheiros de ensemble "
                                                                          "utilizáveis"])
    escrever_json(Path(a.validar_pericia) / "validacao_pericia.json", res)
    return res


# --------------------------------------------------------------------------- #
# v0.3.0 F4 - combinação com o histórico (condicionamento na fronteira ensemble/histórico)
# --------------------------------------------------------------------------- #
_NIVEIS_FRONTEIRA = (("seca", "chuva_4d", "candidata", "idade"), ("seca", "candidata", "idade"),
                     ("seca", "candidata"))
_NOMES_NIVEL_FRONTEIRA = ("estado completo (seca, chuva de 4 dias, candidata e idade)",
                          "sem a chuva dos últimos 4 dias", "sem a idade da candidata")


def estado_fronteira(chuva: np.ndarray, D: int, r: Regra) -> dict:
    """Estado da sequência em D (índice do último dia usado), só com dados até D, em 3 dimensões:
    classe da seca terminada em D; classe da chuva dos últimos 4 dias [PROVISÓRIO]; candidata pendente
    segundo classificar_dia (sim/não) e, se sim, a idade. Início já confirmado é um valor próprio de
    «candidata», para nunca emparelhar um membro sem candidata com uma época que já começou."""
    seq = np.array(chuva, dtype=float)
    seq[D + 1:] = np.nan
    run = 0
    for v in seq[D::-1]:
        if np.isnan(v) or v >= r.limiar_dia_seco_mm:
            break
        run += 1
    a, b, c = CLASSES_SECA_FRONTEIRA
    seca = "0" if run < a else ("1-4" if run < b else ("5-9" if run < c else ">=10"))
    s4 = float(np.nansum(seq[max(0, D - 3):D + 1]))
    lo, hi = CLASSES_CHUVA_4D_FRONTEIRA
    chuva4 = "<5" if s4 < lo else ("5-20" if s4 <= hi else ">20")
    cod, d = inicio_v0(seq, r, max_d=D, tempo_real=True)
    if cod == "confirmado":
        cand, idade = "confirmado", None
    elif cod == "pendente":
        i1, i2 = CLASSES_IDADE_FRONTEIRA
        cand, idade = "sim", ("0-1" if D - d < i1 else ("2-4" if D - d < i2 else ">=5"))
    else:
        cand, idade = "nao", None
    return {"seca": seca, "chuva_4d": chuva4, "candidata": cand, "idade": idade}


def construir_cenarios_fronteira(obs: np.ndarray, ultimo_obs: int, hist_cond: dict, hoje_off: int,
                                 ens: np.ndarray, K: int, r: Regra, data_ref: date):
    """Mantém construir_cenarios como está. Usa só os primeiros K dias de cada membro (I4); D é o último
    dia usado. Para cada membro só servem de continuação as épocas (de hist_cond) cujo ESTADO em D coincide
    com o do membro; se restarem < MIN_EPOCAS_FRONTEIRA relaxa por ordem (chuva dos 4 dias, depois a idade
    da candidata). Se algum membro ficar com < MIN_EPOCAS_FRONTEIRA mesmo assim, devolve (None, info) e o
    ensemble não entra neste ciclo. A V0 é avaliada depois sobre observado + membro + continuação."""
    D = hoje_off + K - 1
    est_h = {ano: estado_fronteira(ch, D, r) for ano, ch in hist_cond.items()}
    membros, niveis, n_anos, falhas = [], [], [], []
    for m in range(ens.shape[0]):
        seq_m = np.full(DIAS_EPOCA, np.nan)
        seq_m[:ultimo_obs + 1] = obs[:ultimo_obs + 1]
        seq_m[hoje_off:D + 1] = ens[m, :K]
        est_m = estado_fronteira(seq_m, D, r)
        escolhido = None
        for nivel, dims in enumerate(_NIVEIS_FRONTEIRA):
            anos = {y for y, e in est_h.items() if all(e[k] == est_m[k] for k in dims)}
            if len(anos) >= MIN_EPOCAS_FRONTEIRA:
                escolhido = (nivel, anos)
                break
        if escolhido is None:
            falhas.append(m)
            continue
        membros.append((m, escolhido[1]))
        niveis.append(escolhido[0])
        n_anos.append(len(escolhido[1]))
    base_info = {"K": int(K), "dia_D_offset": int(D),
                 "dia_D": (data_ref + timedelta(days=K - 1)).isoformat(),
                 "n_membros": int(ens.shape[0]), "min_epocas": MIN_EPOCAS_FRONTEIRA,
                 "niveis": list(_NOMES_NIVEL_FRONTEIRA)}
    if falhas:
        motivo = (f"condicionamento de fronteira: {len(falhas)} de {ens.shape[0]} membros com "
                  f"< {MIN_EPOCAS_FRONTEIRA} épocas compatíveis mesmo com o relaxamento máximo: "
                  "o ensemble não entra neste ciclo")
        return None, {"motivo": motivo, "saida": {"condicao_fronteira": {**base_info, "aplicada": False,
                                                                       "motivo": motivo}}}
    cen, invalidos = {}, set()
    for ano, base in hist_cond.items():
        pre = obs[:ultimo_obs + 1].copy()
        falta = np.isnan(pre)
        pre[falta] = base[:ultimo_obs + 1][falta]
        seq = base.copy()
        seq[:ultimo_obs + 1] = pre
        seqs = []
        for m, anos in membros:
            if ano not in anos:
                continue
            s2 = seq.copy()
            vals = ens[m, :K]
            ok = ~np.isnan(vals)
            invalidos.update(int(i) for i in np.where(~ok)[0])
            s2[hoje_off:D + 1][ok] = vals[ok]
            seqs.append(s2)
        if seqs:
            cen[ano] = seqs
    por_nivel = {str(n): int(sum(1 for x in niveis if x == n)) for n in range(3)}
    return cen, {"saida": {
        "nivel_condicao_fronteira": int(max(niveis)),
        "epocas_compativeis_fronteira": {"n_membros": len(membros), "minimo": int(min(n_anos)),
                                         "mediana": float(np.median(n_anos)), "maximo": int(max(n_anos))},
        "condicao_fronteira": {**base_info, "aplicada": True, "membros_por_nivel": por_nivel,
                               "dias_ensemble_invalidos": sorted(invalidos)}}}


# --------------------------------------------------------------------------- #
# v0.3.0 F2 - bloco previsao_meteorologica (separado da climatologia, I4)
# --------------------------------------------------------------------------- #
def _so_estado(d: dict) -> dict:
    return {k: d.get(k) for k in ("estado", "erro", "gerado_em")}


def bloco_previsao(a, lat: float, lon: float, ens, datas_ens, ens_vars, ens_estado: dict,
                   modelo: str, data_ref: date, r: Regra, ante, fora_epoca: bool) -> dict:
    """Previsão meteorológica: NUNCA se funde com a climatologia num único número."""
    b = {"rotulo": "previsão meteorológica, não é climatologia",
         "nota": "blocos separados: não entra na climatologia nem se funde com ela num único número",
         "antecedencia_max_validada": ante}
    if fora_epoca:
        b.update({"disponivel": False, "motivo": "data_ref fora da época: nada foi pedido",
                  "estado_fontes": {"ensemble": ens_estado}})
        return b
    iso = _data_iso(datas_ens[0]) if (ens is not None and datas_ens) else None
    if ens is not None and iso == data_ref:
        M, n = ens.shape
        pontos = []
        for L in range(0, n - 4):
            w = ens[:, L:L + 5]
            if bool(np.isnan(w).any()):
                continue
            k = int(((w[:, 0] >= r.limiar_chuva_mm) & (w.sum(axis=1) > r.acumulado_5d_mm)).sum())
            pontos.append({"data": (data_ref + timedelta(days=L)).isoformat(), "antecedencia_dias": L,
                           "k_membros": k, "n_membros": int(M), "fraccao": k / M,
                           "validada": None if ante is None else bool(1 <= L <= ante)})
        b["candidata_v0_por_dia"] = {
            "definicao": (f"dia com chuva >= {r.limiar_chuva_mm} mm e acumulado dos 5 dias desde esse dia "
                          f"> {r.acumulado_5d_mm} mm (condição de candidata da V0; não inclui a confirmação)"),
            "modelo": modelo, "n_membros": int(M), "pontos": pontos}
        if n >= r.seca_consecutiva_dias:
            k = sum(1 for m in range(M) if tem_seca_longa(ens[m], r.limiar_dia_seco_mm,
                                                          r.seca_consecutiva_dias))
            b["seca_longa_no_ensemble"] = {
                "rotulo": "perícia não verificada para este evento", "janela_dias": int(n),
                "definicao": f">= {r.seca_consecutiva_dias} dias secos (< {r.limiar_dia_seco_mm} mm) seguidos",
                "k_membros": int(k), "n_membros": int(M), "fraccao": k / M,
                "nota": "nunca entra na climatologia"}
        else:
            b["seca_longa_no_ensemble"] = {"disponivel": False, "motivo":
                                           f"janela do ensemble ({n} dias) < {r.seca_consecutiva_dias} dias"}
        extra = {k: v for k, v in (ens_vars or {}).items() if k != "precipitation"}
        if extra:
            b["ensemble_variaveis"] = {
                "rotulo": "valores brutos do modelo (média do dia por membro), sem anomalia",
                "variaveis": {k: {"media": [None if np.isnan(x) else float(x) for x in np.nanmean(v, axis=0)],
                                  "min": [None if np.isnan(x) else float(x) for x in np.nanmin(v, axis=0)],
                                  "max": [None if np.isnan(x) else float(x) for x in np.nanmax(v, axis=0)]}
                              for k, v in extra.items()}}
    else:
        b["candidata_v0_por_dia"] = {"disponivel": False, "motivo": (
            "sem ensemble utilizável" if ens is None else
            "datas do ensemble não coincidem com data_ref (ou não são interpretáveis)")}
    sem_rede = bool(a.sem_rede)
    chirps = (ler_chirps_gefs(a.chirps_gefs_tif, lat, lon) if a.chirps_gefs_tif
              else _estado_fonte("nao_pedida", "sem --chirps-gefs-tif"))
    det = (_estado_fonte("nao_pedida", "--sem-rede") if sem_rede
           else obter_previsao_det(lat, lon, a.past_days))
    saz = (_estado_fonte("nao_pedida", "--sem-rede") if sem_rede else obter_sazonal(lat, lon))
    b["chirps_gefs"] = {"rotulo": "totais brutos do CHIRPS3-GEFS (média de ensemble); sem dias secos e sem "
                                  "percentis contra histórico de outra fonte", "totais": chirps.get("totais", [])}
    b["deterministico"] = {"rotulo": "valores brutos do modelo determinístico; sem anomalia (sem "
                                     "climatologia da mesma fonte)", "diario": det.get("diario")}
    b["sazonal"] = {"rotulo": "tendência, não para datas", "dados": saz.get("dados")}
    b["estado_fontes"] = {"ensemble": ens_estado, "previsao_deterministica": _so_estado(det),
                          "sazonal": _so_estado(saz), "chirps_gefs": _so_estado(chirps)}
    return b


# --------------------------------------------------------------------------- #
# v0.3.0 F5 - mensagem ao agricultor (códigos estáveis), indicadores e automatização
# --------------------------------------------------------------------------- #
CODIGOS_DECISAO = ("FAVORAVEL_INDICATIVO", "AGUARDAR_RISCO_ELEVADO", "AGUARDAR_SEM_CHUVA_CANDIDATA",
                   "AGUARDAR_CANDIDATA_EM_FORMACAO")
FRASE_SO_CHUVA = ("Esta indicação considera apenas a chuva; temperatura e humidade do solo são "
                  "apresentadas à parte e ainda não entram na decisão.")


def codigo_mensagem(saida: dict, tolerancia: float) -> tuple[str, dict]:
    """Código da mensagem, derivado APENAS de campos já calculados. FORA_DA_EPOCA vem antes de
    SEM_BASE_FIAVEL porque fora da época o observado nem é lido (senão nunca seria alcançável)."""
    estado = saida.get("estado_motor")
    if estado == "fora_da_epoca":
        return "FORA_DA_EPOCA", {}
    obs = saida.get("observacao") or {}
    grau = (saida.get("grau_confianca") or {}).get("grau")
    fd = saida.get("fontes_declaradas") or {}
    sem_base = []
    if saida.get("risco_historico_fonte_fiavel") is False:
        sem_base.append("fonte do histórico não fiável")
    if fd.get("estado") != "fontes declaradas fiáveis":
        sem_base.append("fonte do histórico ou do observado não declarada como fiável")
    if obs.get("fonte_chuva") == "power":
        sem_base.append("observado vem do POWER")
    if obs.get("ultimo_dia_observado") is None:
        sem_base.append("sem observado da época")
    if grau is None or grau == "Baixa":
        sem_base.append("grau de confiança Baixa ou não calculado")
    if sem_base:
        return "SEM_BASE_FIAVEL", {"motivos": sem_base}
    if estado == "sem_chuva_candidata":
        return "AGUARDAR_SEM_CHUVA_CANDIDATA", {}
    if estado == "candidata_por_confirmar" and (saida.get("candidata_detalhe") or {}).get("em_formacao"):
        return "AGUARDAR_CANDIDATA_EM_FORMACAO", {}
    pontos = (saida.get("curva_risco_falso_inicio") or {}).get("pontos") or []
    hi = pontos[0]["ic90"][1] if pontos else None
    if hi is None:
        return "SEM_BASE_FIAVEL", {"motivos": ["sem risco de falso início calculado para hoje"]}
    return (("FAVORAVEL_INDICATIVO" if hi < tolerancia else "AGUARDAR_RISCO_ELEVADO"),
            {"limite_superior_ic90_hoje": hi, "tolerancia": tolerancia})


def frase_previsao(prev: dict | None) -> str | None:
    """Previsão meteorológica numa frase SEPARADA, com a antecedência validada; nunca como climatologia."""
    pontos = ((prev or {}).get("candidata_v0_por_dia") or {}).get("pontos")
    if not pontos:
        return None
    ante = (prev or {}).get("antecedencia_max_validada") or 0
    if ante < 1:
        return ("Previsão meteorológica (à parte, não é climatologia): a sua perícia ainda não está "
                "demonstrada (antecedência validada: 0 dias), pelo que não foi usada.")
    validos = [p for p in pontos if 1 <= p["antecedencia_dias"] <= ante]
    if not validos:
        return None
    p = max(validos, key=lambda x: (x["fraccao"], -x["antecedencia_dias"]))
    d = date.fromisoformat(p["data"])
    return (f"Previsão meteorológica (à parte, não é climatologia; antecedência validada: {ante} dia(s)): "
            f"para {d.day:02d}/{d.month:02d}, {p['k_membros']} de {p['n_membros']} membros do ensemble "
            "apontam para chuva candidata.")


def construir_mensagem(saida: dict, tolerancia: float) -> dict:
    codigo, ctx = codigo_mensagem(saida, tolerancia)
    periodo = f"época {saida.get('epoca')}, de 1 de setembro a 28 de fevereiro"
    base = f"Indicativo, sem validação agronómica ({periodo})."
    H = saida.get("horizonte_dias")
    prob = (saida.get("probabilidade_inicio_ate_horizonte") or {}).get("texto_apresentacao")
    pontos = (saida.get("curva_risco_falso_inicio") or {}).get("pontos") or []
    risco = pontos[0].get("texto_apresentacao") if pontos else None
    if codigo == "FORA_DA_EPOCA":
        corpo = (f"Fora da época agrícola ({periodo}): sem estado do motor e sem indicação de plantio. "
                 "Indicativo, sem validação agronómica.")
    elif codigo == "SEM_BASE_FIAVEL":
        corpo = (f"Sem base fiável para sugerir data de plantio; consultar técnico agrícola. {base}")
    elif codigo == "AGUARDAR_SEM_CHUVA_CANDIDATA":
        corpo = (f"{base} Ainda não há chuva candidata nesta época: aguardar. Nas épocas históricas "
                 f"comparáveis, o início ocorreu nos {H} dias seguintes em {prob}.")
    elif codigo == "AGUARDAR_CANDIDATA_EM_FORMACAO":
        corpo = (f"{base} Há uma chuva candidata ainda em formação (menos de 5 dias observados): aguardar. "
                 f"Nas épocas históricas comparáveis, o início ocorreu nos {H} dias seguintes em {prob}.")
    elif codigo == "FAVORAVEL_INDICATIVO":
        corpo = (f"{base} O risco histórico de falso início associado a plantar hoje é baixo (limite "
                 f"superior do IC90 abaixo de {_pt(tolerancia)}): {risco}. Não é garantia de data nem de "
                 "rendimento.")
    else:
        corpo = (f"{base} Aguardar: o risco histórico de falso início associado a plantar hoje não é baixo "
                 f"(limite superior do IC90 = {_pt(ctx['limite_superior_ic90_hoje'])}; tolerância "
                 f"{_pt(tolerancia)}): {risco}.")
    partes = [corpo]
    if codigo not in ("FORA_DA_EPOCA", "SEM_BASE_FIAVEL"):
        fp = frase_previsao(saida.get("previsao_meteorologica"))
        if fp:
            partes.append(fp)
    if codigo in CODIGOS_DECISAO:
        partes.append(FRASE_SO_CHUVA)
    return {"codigo": codigo, "texto": " ".join(partes), "contexto": ctx,
            "linguagem": "«associado a», nunca causal; sem promessa de rendimento nem de data",
            "limiares_provisorios": True}


def indicadores_complementares(obs_ex: dict, ultimo_obs: int, prev: dict | None, janela: int = 7) -> dict:
    """Temperatura, humidade do solo e ET0 em VALOR BRUTO, sem limiares nem veredictos (I5: sem
    climatologia da mesma fonte, a anomalia fica null)."""
    def observada(var):
        if ultimo_obs < 0:
            return None
        v = obs_ex[var][max(0, ultimo_obs - janela + 1):ultimo_obs + 1]
        return ({"valor_medio_ultimos_dias": round(float(np.nanmean(v)), 4), "janela_dias": int(len(v)),
                 "fonte": "ficheiro observado (fonte não comparada com a do modelo)"}
                if np.any(~np.isnan(v)) else None)
    det = ((prev or {}).get("deterministico") or {}).get("diario") or {}
    nota = "anomalia: null (sem climatologia da MESMA fonte); valor bruto"
    return {"estado": "sem_criterio_agronomico_validado",
            "nota": "valores brutos de fontes diferentes, sem limiares nem veredictos; não entram na decisão",
            "temperatura": {"observada": observada("t2m"), "prevista": det.get("temperatura_2m"),
                            "anomalia": None, "nota_anomalia": nota},
            "humidade_solo": {"observada": observada("gwetroot"), "prevista": det.get("humidade_solo"),
                              "anomalia": None, "nota_anomalia": nota},
            "et0": {"observada": None, "prevista": det.get("et0_fao_evapotranspiration"),
                    "anomalia": None, "nota_anomalia": nota}}


def _mensagem_final(saida: dict, a: argparse.Namespace) -> dict:
    """Fecha o JSON: com --mensagem-agricultor acrescenta mensagem_agricultor (a partir do que já foi
    calculado). Sem a flag não faz nada (I1)."""
    if getattr(a, "mensagem_agricultor", False):
        saida["mensagem_agricultor"] = construir_mensagem(saida, float(a.tolerancia_decisao))
    return saida


# --------------------------------------------------------------------------- #
# Ciclo
# --------------------------------------------------------------------------- #
def _json_seguro(o):
    if isinstance(o, (np.floating, np.integer, np.bool_)):
        return o.item()
    if isinstance(o, np.ndarray):
        return o.tolist()
    if isinstance(o, (date, datetime)):
        return o.isoformat()
    raise TypeError(f"não serializável: {type(o)}")


def escrever_json(caminho: Path, obj: dict) -> None:
    caminho.parent.mkdir(parents=True, exist_ok=True)
    tmp = caminho.with_suffix(caminho.suffix + ".tmp")
    tmp.write_text(json.dumps(obj, ensure_ascii=False, indent=2, default=_json_seguro),
                   encoding="utf-8")
    tmp.replace(caminho)   # escrita atómica; reexecutar no mesmo dia reescreve o mesmo ficheiro


def correr_ciclo(a: argparse.Namespace) -> dict:
    r = Regra()
    espec = especificacao(r, a)
    espec_hash = hash_especificacao(espec)
    if a.hash_especificacao and not espec_hash.startswith(a.hash_especificacao.lower()):
        raise SystemExit("especificação diferente da congelada: esperado "
                         f"{a.hash_especificacao}, actual {espec_hash[:16]}. Não correr com outra "
                         "especificação sem a registar de novo.")
    data_ref = date.fromisoformat(a.data_ref) if a.data_ref else date.today()
    ano = ano_da_epoca(data_ref)
    hoje_off = offset_de(data_ref, ano)
    fora_epoca = hoje_off >= DIAS_EPOCA     # 1 Mar - 31 Ago: sem época em curso
    H, W = a.horizonte, a.janela_risco
    estrito = modo_estrito(a)
    fh_decl, fo_decl = getattr(a, "fonte_historico", None), getattr(a, "fonte_observado", None)

    # --- coordenadas: --lat/--lon > geometria do JSON do histórico > tabela ZONAS ----------
    hist_json = Path(a.historico).suffix.lower() == ".json"
    g = ler_power_json(Path(a.historico))[1] if hist_json else {}
    if hist_json and fh_decl and fh_decl != "power":
        raise SystemExit(f"--fonte-historico {fh_decl} incoerente com um histórico em JSON do POWER "
                         "(o formato já prova a fonte).")
    # I9: a fonte declarada substitui a inferência (hist_json passa a ser só o FORMATO do ficheiro)
    hist_power = (fh_decl == "power") if fh_decl else hist_json
    hist_fiavel = (fh_decl in FONTES_FIAVEIS) if fh_decl else (not hist_json)
    lat_z, elev = ZONAS.get(a.zona), None
    if a.lat is not None and a.lon is not None:
        lat, lon, origem_coord = a.lat, a.lon, "argumentos --lat/--lon"
    elif g:
        if lat_z and (abs(lat_z[0] - g["lat"]) > TOL_COORD_GRAUS
                      or abs(lat_z[1] - g["lon"]) > TOL_COORD_GRAUS):
            raise SystemExit(f"zona '{a.zona}' incoerente com o histórico: a geometria do JSON é "
                             f"({g['lat']}, {g['lon']}) e a tabela ZONAS diz {lat_z}. "
                             "Ficheiro de outra zona?")
        lat, lon, elev = g["lat"], g["lon"], g.get("elev_m")
        origem_coord = "geometria do JSON POWER do histórico"
    elif lat_z:
        (lat, lon), origem_coord = lat_z, "tabela ZONAS (por verificar)"
    else:
        raise SystemExit("coordenadas desconhecidas: usar --zona conhecida, --lat/--lon "
                         "ou um histórico em JSON do POWER")
    if g and (abs(lat - g["lat"]) > TOL_COORD_GRAUS or abs(lon - g["lon"]) > TOL_COORD_GRAUS):
        raise SystemExit(f"--lat/--lon ({lat}, {lon}) não coincidem com a geometria do histórico "
                         f"({g['lat']}, {g['lon']}): o histórico é de outro local.")

    avisos, motivos = [], []
    if hist_power:
        avisos.append("histórico de chuva vem do POWER/MERRA-2 (reanálise, não observação): a V0 "
                      "é sensível ao viés de chuva fraca; comparar com uma série IMERG. O risco de "
                      "seca a 1 mm tende a ser subestimado (ver calendario_fixo e a grelha); não "
                      "mostrar 'risco baixo' com esta fonte.")

    hist, hist_ex, excl_cob = carregar_historico(Path(a.historico), ano_excluido=ano,
                                                 cobertura_min=COBERTURA_MIN)
    if len(hist) < 10:
        raise SystemExit(f"Histórico insuficiente: {len(hist)} épocas completas.")
    if excl_cob:
        avisos.append(f"épocas excluídas por cobertura < {int(COBERTURA_MIN * 100)}%: {excl_cob}")
    # último dia do HISTÓRICO: só dados anteriores à época em curso (nada da época avaliada entra)
    _idx_h = carregar_csv(Path(a.historico)).index
    _idx_h = _idx_h[_idx_h < pd.Timestamp(ano, 9, 1)]
    ultimo_dia_serie = _idx_h.max().date() if len(_idx_h) else None
    avisos.extend(avisos_serie(hist, ultimo_dia_serie, ano))
    if not fora_epoca and hoje_off + H + W > DIAS_EPOCA:
        avisos.append(f"horizonte + janela ultrapassam o fim da época ({DIAS_EPOCA} dias): "
                      "as datas finais usam menos épocas ou ficam sem valor.")

    entradas = {"historico": {"ficheiro": Path(a.historico).name,
                              "sha256": sha256_ficheiro(Path(a.historico))}}
    if a.observado:
        entradas["observado"] = {"ficheiro": Path(a.observado).name,
                                 "sha256": sha256_ficheiro(Path(a.observado))}
    if fh_decl:
        entradas["historico"]["fonte_declarada"] = fh_decl
    if fo_decl:
        entradas.setdefault("observado", {})["fonte_declarada"] = fo_decl
    if estrito and a.validacao and Path(a.validacao).exists():
        entradas["validacao"] = {"ficheiro": Path(a.validacao).name,
                                 "sha256": sha256_ficheiro(Path(a.validacao))}

    # --- observado da época em curso ------------------------------------------------
    obs = np.full(DIAS_EPOCA, np.nan)
    obs_ex = {"gwetroot": np.full(DIAS_EPOCA, np.nan), "t2m": np.full(DIAS_EPOCA, np.nan)}
    fonte_obs, provisorio = "nenhuma", False
    if not fora_epoca:
        if a.observado:
            df = carregar_csv(Path(a.observado))
            obs = _epoca_de_df(df, ano, "chuva_mm")
            for v in obs_ex:
                obs_ex[v] = _epoca_de_df(df, ano, v)
            fonte_obs, provisorio = "csv", bool(a.obs_provisorio)
        elif not a.sem_rede:
            try:
                df = obter_power(lat, lon, date(ano, 9, 1), data_ref - timedelta(days=1))
                obs = _epoca_de_df(df, ano, "chuva_mm")
                for v in obs_ex:
                    obs_ex[v] = _epoca_de_df(df, ano, v)
                fonte_obs = "power"
                avisos.append("chuva observada vem do POWER (reanálise; diverge do IMERG).")
            except Exception as e:  # noqa: BLE001
                motivos.append(f"falha a obter o observado (POWER): {e}")
    # só usar dias até ontem (nada de data_ref em diante entra no cálculo)
    obs[hoje_off:] = np.nan
    validos = np.where(~np.isnan(obs))[0]
    ultimo_obs = int(validos[-1]) if len(validos) else -1
    lacuna = (hoje_off - 1 - ultimo_obs) if ultimo_obs >= 0 else None
    # I9: observado declarado como POWER, ou obtido do POWER pelo script, conta como POWER (qualidade Baixa)
    fonte_obs_grau = "power" if (fonte_obs == "power" or fo_decl == "power") else fonte_obs
    if fo_decl and fonte_obs == "power" and fo_decl != "power":
        avisos.append(f"--fonte-observado {fo_decl} contradiz o observado obtido do POWER: "
                      "tratado como POWER.")

    # --- ensemble: recolhido SEMPRE (validação futura), usado só se pedido -----------
    ens, ens_meta = None, {"recolhido": False, "usado_no_calculo": False}
    datas_ens, ens_vars, ens_erro = None, None, None
    if a.ensemble_ficheiro and not fora_epoca:           # F0b: ensemble arquivado em vez da rede
        try:
            caminho_e = Path(a.ensemble_ficheiro)
            ens_vars, datas_ens, meta_f = carregar_ensemble_arquivado(caminho_e)
            ens = ens_vars["precipitation"]
            ens_meta = {"recolhido": False, "origem": "ficheiro", "n_membros": int(ens.shape[0]),
                        "n_dias": int(ens.shape[1]), "ficheiro": caminho_e.name, **meta_f,
                        "usado_no_calculo": False}
            entradas["ensemble"] = {"ficheiro": caminho_e.name, "sha256": sha256_ficheiro(caminho_e)}
        except Exception as e:  # noqa: BLE001
            ens, ens_vars, datas_ens, ens_erro = None, None, None, str(e)
            avisos.append(f"ensemble arquivado indisponível: {e}")
    elif not a.sem_rede and not fora_epoca:
        try:
            kw = {}
            if estrito:
                kw["exigir_dia_completo"] = True
            if a.ensemble_vars:
                kw["variaveis"] = list(a.ensemble_vars)
            ens, datas_ens, meta = obter_ensemble(lat, lon, a.modelo_ensemble, **kw)
            if isinstance(ens, dict):
                ens_vars, ens = ens, ens["precipitation"]
            hora = datetime.now(timezone.utc).strftime("%H%M")
            ficheiro = Path(a.saida) / a.zona / rotulo_epoca(ano).replace("/", "-") / \
                f"ensemble_{data_ref.isoformat()}_{hora}Z.json"
            arquivo = {"data_ref": data_ref, "datas": datas_ens, "membros_mm_dia": ens, **meta}
            if estrito:
                arquivo["dia_completo_exigido"] = True
            if ens_vars:
                arquivo["variaveis"] = {k: v for k, v in ens_vars.items() if k != "precipitation"}
            escrever_json(ficheiro, arquivo)
            ens_meta = {"recolhido": True, "n_membros": int(ens.shape[0]),
                        "n_dias": int(ens.shape[1]), "ficheiro": ficheiro.name, **meta,
                        "usado_no_calculo": False}
        except Exception as e:  # noqa: BLE001
            if isinstance(ens, dict):
                ens = None
            ens_erro = str(e)
            avisos.append(f"ensemble indisponível: {e}")
    if ens is not None:
        ens_estado = _estado_fonte("ok", None, origem="ficheiro" if a.ensemble_ficheiro else "rede")
    elif ens_erro:
        ens_estado = _estado_fonte("falhou", ens_erro)
    else:
        ens_estado = _estado_fonte("nao_pedida", "--sem-rede" if a.sem_rede else "fora da época")
    # F0a: alinhamento (E1). ISO e != data_ref -> não usado, em qualquer modo. Não interpretável
    # ('d0'...): o legado segue; o modo estrito trata-o como desalinhado.
    alinhado = None
    if ens is not None:
        d0 = _data_iso(datas_ens[0]) if datas_ens else None
        if d0 is not None:
            alinhado = (d0 == data_ref)
        elif estrito:
            alinhado = False
        if alinhado is False:
            ens_meta["alinhado"] = False
            avisos.append(f"ensemble desalinhado (primeira data '{datas_ens[0] if datas_ens else None}', "
                          f"data_ref {data_ref}): não é usado no cálculo.")
        elif alinhado is True and estrito:
            ens_meta["alinhado"] = True
    dias_ens = a.dias_ensemble if (ens is not None and a.dias_ensemble > 0) else 0
    if alinhado is False:
        dias_ens = 0
    ante = None
    if estrito:       # I4: só K = min(--dias-ensemble, antecedencia_max_validada) dias; K = 0 -> não entra
        ante, aviso_val = ler_antecedencia_validada(a.validacao)
        if aviso_val:
            avisos.append(aviso_val)
        K = 0
        if ens is not None and alinhado:
            K = min(a.dias_ensemble, ante, int(ens.shape[1]), DIAS_EPOCA - hoje_off)
        dias_ens = max(K, 0)
        ens_meta["antecedencia_max_validada"] = ante
        ens_meta["dias_pedidos"] = a.dias_ensemble
    if dias_ens > 0:
        ens_meta["usado_no_calculo"] = True
        ens_meta["dias_usados"] = dias_ens
        if estrito:
            avisos.append(f"ensemble usado só até {dias_ens} dia(s) (antecedência máxima validada: "
                          f"{ante}); a validação não se extrapola às antecedências seguintes.")
        else:
            avisos.append("ensemble usado no cálculo SEM perícia validada pelo pipeline.")

    # --- climatologia (descritiva) ---------------------------------------------------
    tempos, evento, indet, inicios_ep = [], [], [], []
    for ano_h, ch in sorted(hist.items()):
        est, d = inicio_v0(ch, r)
        inicios_ep.append({"epoca": rotulo_epoca(ano_h), "estado": est, "offset": d,
                           "data": (date(ano_h, 9, 1) + timedelta(days=d)).isoformat()
                           if d is not None else None})
        if est == "indeterminado":
            indet.append(ano_h)
        elif est == "confirmado":
            tempos.append(d); evento.append(True)
        else:
            tempos.append(r.limite_procura_off); evento.append(False)
    tempos, evento = np.array(tempos), np.array(evento)
    S = kaplan_meier(tempos, evento, r.limite_procura_off)
    q = quantis_inicio_km(S)
    base = date(ano, 9, 1)
    clim = {"n_epocas": int(len(tempos)), "epocas_sem_inicio_ate_31jan": int((~evento).sum()),
            "epocas_indeterminadas": indet,
            "inicio_quantis_km": {k: (base + timedelta(days=v)).isoformat() if v is not None
                                  else None for k, v in q.items()},
            "inicios_por_epoca": inicios_ep,
            "nota": "climatologia condicional; não é previsão"}
    if getattr(a, "exportar_inicios", None):
        destino_ini = Path(a.exportar_inicios)
        destino_ini.parent.mkdir(parents=True, exist_ok=True)
        pd.DataFrame(inicios_ep).to_csv(destino_ini, index=False)

    saida = {
        "versao_codigo": VERSAO_CODIGO,
        "estado_documento": "proposta de investigação - indicativo, NÃO é recomendação",
        "gerado_em": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "zona": a.zona, "coordenadas": {"lat": lat, "lon": lon, "elev_m": elev,
                                        "origem": origem_coord, "verificadas": False},
        "fonte_historico": "power_json" if hist_json else "csv",
        "risco_historico_fonte_fiavel": hist_fiavel,
        "epoca": rotulo_epoca(ano), "data_ref": data_ref.isoformat(), "offset_hoje": hoje_off,
        "regra_v0": asdict(r), "horizonte_dias": H, "janela_risco_dias": W,
        "especificacao": {"hash": espec_hash, "parametros": espec},
        "entradas": entradas,
        "ambiente": {"python": platform.python_version(), "numpy": np.__version__,
                     "pandas": pd.__version__},
        "observacao": {"fonte_chuva": fonte_obs, "provisoria": provisorio,
                       "ultimo_dia_observado": (base + timedelta(days=ultimo_obs)).isoformat()
                       if ultimo_obs >= 0 else None, "lacuna_dias": lacuna,
                       "time_standard_power": "LST (por defeito da API)",
                       "time_standard_historico": g.get("time_standard")},
        "climatologia": clim,
        "diagnostico_historico": diagnostico_historico(hist, r, ultimo_dia_serie, hist_power),
        "calendario_fixo": calendario_fixo(hist, r, W, a.ic),
        "ensemble": ens_meta,
    }
    if estrito:
        saida["modo_estrito"] = True
        saida["fontes_declaradas"] = estado_fontes_declaradas(fh_decl, fo_decl)
    if limiares_novos_activos(a):
        saida["limiares_provisorios"] = True
    if a.previsao:
        ante_v = ante if estrito else (ler_antecedencia_validada(a.validacao)[0]
                                       if a.validacao and Path(a.validacao).exists() else None)
        saida["previsao_meteorologica"] = bloco_previsao(
            a, lat, lon, ens, datas_ens, ens_vars, ens_estado, ens_meta.get("modelo") or a.modelo_ensemble,
            data_ref, r, ante_v, fora_epoca)
    if a.mensagem_agricultor:
        saida["decisao_integrada"] = False
        saida["indicadores_complementares"] = indicadores_complementares(
            obs_ex, ultimo_obs, saida.get("previsao_meteorologica"))
        saida["automatizacao"] = {"observado_fonte_automatica": fonte_obs == "power",
                                  "historico_fonte_automatica": False, "notificacao": "nao_implementada"}
    if not fora_epoca:
        for rot, off in DATAS_FIXAS.items():
            saida["calendario_fixo"]["datas"][rot]["ja_passou_nesta_epoca"] = bool(off < hoje_off)
    if a.grelha_sensibilidade:
        saida["grelha_sensibilidade"] = grelha_sensibilidade(hist, r, a.ic, janela_actual=W)

    # --- sem observação: só climatologia ---------------------------------------------
    if ultimo_obs < 0:
        if fora_epoca:
            motivos.append(f"data_ref {data_ref} fora da época (1 Set - 28 Fev): sem estado do motor")
            saida["estado_motor"] = "fora_da_epoca"
        else:
            motivos.append("sem chuva observada da época em curso: estado desconhecido")
            saida["estado_motor"] = "desconhecido"
        saida.update({"caiu_para_climatologia": True, "motivos": motivos, "avisos": avisos})
        return _mensagem_final(saida, a)

    # --- estado do motor ---------------------------------------------------------------
    cod, d_est = inicio_v0(obs, r, max_d=ultimo_obs, tempo_real=True)
    estado_nome = {"sem_inicio": "sem_chuva_candidata", "pendente": "candidata_por_confirmar",
                   "confirmado": "inicio_confirmado"}[cod]
    primeira_falhada = next((d for d in range(0, ultimo_obs + 1)
                             if classificar_dia(obs, d, r) == "falhado"), None)
    saida["estado_motor"] = estado_nome
    saida["data_chuva_candidata_ou_inicio"] = (base + timedelta(days=d_est)).isoformat() \
        if d_est is not None else None
    saida["primeira_chuva_candidata_falhada"] = (base + timedelta(days=primeira_falhada)).isoformat() \
        if primeira_falhada is not None else None

    if cod == "pendente":
        det = detalhe_candidata(obs, d_est, ultimo_obs, r)
        saida["candidata_detalhe"] = det
        if det["em_formacao"]:
            avisos.append("candidata ainda em formação (< 5 dias observados desde o dia candidato): "
                          "não apresentar como início provável.")
    if cod == "sem_inicio":
        saida["climatologia_km_condicional"] = prob_condicional_km(
            tempos, evento, hoje_off, H, r.limite_procura_off)
    saida["descritivos"] = descritivos(obs_ex, hist_ex, ultimo_obs)

    # --- cenários ----------------------------------------------------------------------
    # Condicionar: só entram épocas que, NESTA data, estavam no mesmo estado do motor que a
    # época em curso. Sem isto, a continuação viria de épocas já na fase chuvosa, o que é
    # incompatível com o observado e inflaciona a probabilidade (em 'sem chuva candidata' a
    # enumeração passa a coincidir com o Kaplan-Meier condicional).
    if cod == "confirmado":
        hist_cond = dict(hist)
    else:
        hist_cond = {}
        for ano_h, ch in hist.items():
            trunc = ch.copy()
            trunc[ultimo_obs + 1:] = np.nan
            c_h, _ = inicio_v0(trunc, r, max_d=ultimo_obs, tempo_real=True)
            if c_h == cod:
                hist_cond[ano_h] = ch
    saida["epocas_compativeis"] = {"n": len(hist_cond), "de": len(hist),
                                   "anos": sorted(hist_cond)}
    if len(hist_cond) < 8:
        avisos.append(f"apenas {len(hist_cond)} épocas compatíveis com o estado actual: "
                      "intervalos muito largos.")
    if len(hist_cond) == 0:
        motivos.append("nenhuma época histórica no mesmo estado: sem probabilidade")
        saida.update({"caiu_para_climatologia": True, "motivos": motivos, "avisos": avisos})
        return _mensagem_final(saida, a)
    if a.condicionar_fronteira and dias_ens > 0:
        cen, fr = construir_cenarios_fronteira(obs, ultimo_obs, hist_cond, hoje_off, ens, dias_ens, r,
                                               data_ref)
        saida.update(fr["saida"])
        if cen is None:        # < MIN_EPOCAS_FRONTEIRA mesmo com o relaxamento máximo: só climatologia
            dias_ens = 0
            ens_meta["usado_no_calculo"] = False
            ens_meta.pop("dias_usados", None)
            motivos.append(fr["motivo"])
            avisos.append(fr["motivo"])
            cen = construir_cenarios(obs, ultimo_obs, hist_cond, hoje_off, ens, 0)
        else:
            ens_meta["dias_ensemble_invalidos"] = fr["saida"]["condicao_fronteira"]["dias_ensemble_invalidos"]
    elif estrito:
        inval = {}
        cen = construir_cenarios(obs, ultimo_obs, hist_cond, hoje_off, ens, dias_ens, estrito=True,
                                 info=inval)
        if dias_ens > 0:
            ens_meta["dias_ensemble_invalidos"] = inval["dias_ensemble_invalidos"]
    else:
        cen = construir_cenarios(obs, ultimo_obs, hist_cond, hoje_off, ens, dias_ens)
    res = avaliar_cenarios(cen, hoje_off, H, W, r)
    if res["excluidas_indeterminadas"]:
        avisos.append(f"cenários indeterminados excluídos: {res['excluidas_indeterminadas']}")
    pin = ic_proporcao(res["inicio"], metodo=a.ic)
    saida["probabilidade_inicio_ate_horizonte"] = {
        **pin, "definicao": f"V0 cumprida (início d) com d <= hoje+{H} dias, dado o observado até hoje",
        "rotulo": "cenário condicional (não é previsão)",
        "texto_apresentacao": texto_apresentacao(pin),
        "p_extrema": bool(pin["p"] is not None and pin["p"] in (0.0, 1.0))}

    datas = [data_ref + timedelta(days=i) for i in range(H)]
    curva, his = [], []
    for i, dt in enumerate(datas):
        ci = ic_proporcao(res["risco"][:, i], metodo=a.ic) if len(res["risco"]) else \
            {"p": None, "ic90": [None, None], "n_epocas": 0}
        curva.append({"data_plantio": dt.isoformat(), **ci, "texto_apresentacao": texto_apresentacao(ci)})
        his.append(ci["ic90"][1])
    saida["curva_risco_falso_inicio"] = {
        "definicao": (f"P(>= {r.seca_consecutiva_dias} dias secos (< {r.limiar_dia_seco_mm} mm) "
                      f"seguidos nos {W} dias desde a data)"),
        "pontos": curva}
    saida["primeira_data_abaixo_da_tolerancia"] = {
        f"{int(round(t * 100))}%": primeira_abaixo(datas, his, t) for t in a.tolerancias}
    saida["tolerancias_atingiveis"] = tolerancias_inatingiveis(curva, a.tolerancias, a.ic)
    saida["primeira_data_abaixo_da_tolerancia_fiavel"] = hist_fiavel
    saida["primeira_data_abaixo_da_tolerancia_nota"] = (
        "usa o LIMITE SUPERIOR do IC90; None = nenhuma data cumpre. Com ~25 épocas, "
        "tolerâncias baixas podem ser inatingíveis por construção; escolher a primeira data "
        "de uma curva ruidosa é optimista. Com histórico POWER (fiavel=false) não apresentar "
        "estas datas como 'risco baixo'.")

    larg = None
    if pin["p"] is not None:
        larg = pin["ic90"][1] - pin["ic90"][0]
    pericia = False
    if a.validacao and Path(a.validacao).exists():
        pericia = bool(json.loads(Path(a.validacao).read_text(encoding="utf-8"))
                       .get("pericia_demonstrada", False))
    if estrito:
        pericia = ante >= 1
    saida["grau_confianca"] = grau_confianca(larg, dias_ens > 0, pericia, fonte_obs_grau,
                                             provisorio, lacuna if lacuna is not None else 99,
                                             hist_power=hist_power)
    saida["pericia_demonstrada"] = pericia
    saida["caiu_para_climatologia"] = dias_ens == 0
    if dias_ens == 0:
        if estrito:
            motivos.append(f"ensemble não entra no cálculo (modo estrito: antecedência validada {ante}, "
                           f"dias pedidos {a.dias_ensemble}): só observado + climatologia")
        else:
            motivos.append("perícia do ensemble não demonstrada: só observado + climatologia")
    saida["motivos"], saida["avisos"] = motivos, avisos
    return _mensagem_final(saida, a)


def main(argv=None) -> int:
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawTextHelpFormatter)
    p.add_argument("--zona", default="huambo")
    p.add_argument("--lat", type=float); p.add_argument("--lon", type=float)
    p.add_argument("--historico", required=True,
                   help="CSV diário histórico (data, chuva_mm, ...) ou JSON do NASA POWER")
    p.add_argument("--observado", help="CSV da época em curso (ex.: IMERG Late)")
    p.add_argument("--obs-provisorio", action="store_true", help="marca o observado como provisório")
    p.add_argument("--data-ref", help="AAAA-MM-DD (por defeito, hoje)")
    p.add_argument("--saida", default="saidas")
    p.add_argument("--horizonte", type=int, default=25)
    p.add_argument("--janela-risco", type=int, default=JANELA_RISCO_DEFAULT,
                   help="20 ou 21 (por defeito 21, 'três semanas'): decisão em aberto; "
                        "mudar altera o hash da especificação")
    p.add_argument("--exportar-inicios", metavar="CSV",
                   help="escreve o início V0 por época (para comparar com a V0 do repositório)")
    p.add_argument("--dias-ensemble", type=int, default=0,
                   help="0 = não usar (por defeito, perícia não demonstrada)")
    p.add_argument("--modelo-ensemble", default="ecmwf_ifs025", help="CONFIRMAR na documentação")
    p.add_argument("--validacao", help='JSON {"pericia_demonstrada": true/false}')
    p.add_argument("--tolerancias", type=float, nargs="+", default=[0.10, 0.20, 0.30])
    p.add_argument("--ic", choices=["wilson", "clopper-pearson"], default="wilson",
                   help="IC de 90% das proporções 0/1 (decisão em aberto; CP é exacto e mais largo)")
    p.add_argument("--grelha-sensibilidade", action="store_true",
                   help="junta a grelha 1/2/3 mm x seca 7/10 d x janela 20/21 d (só climatologia)")
    p.add_argument("--hash-especificacao",
                   help="hash (ou prefixo) da especificação congelada; recusa correr com outra")
    p.add_argument("--sem-rede", action="store_true", help="não chamar APIs (POWER, Open-Meteo)")
    # ---- v0.3.0 ----
    p.add_argument("--fonte-historico", choices=FONTES_VALIDAS,
                   help="fonte declarada do histórico (substitui a inferência por formato)")
    p.add_argument("--fonte-observado", choices=FONTES_VALIDAS,
                   help="fonte declarada do observado (substitui a inferência)")
    p.add_argument("--exigir-pericia", action="store_true",
                   help="modo estrito: o ensemble só entra até a antecedência validada (--validacao)")
    p.add_argument("--condicionar-fronteira", action="store_true",
                   help="modo estrito: continuação histórica só de épocas no mesmo estado do membro")
    p.add_argument("--mensagem-agricultor", action="store_true",
                   help="modo estrito: bloco mensagem_agricultor (código estável + texto em português)")
    p.add_argument("--tolerancia-decisao", type=float, default=TOLERANCIA_DECISAO_DEFAULT,
                   help="PROVISÓRIO: limite superior do IC90 do risco de hoje abaixo do qual a mensagem "
                        "é FAVORAVEL_INDICATIVO")
    p.add_argument("--ensemble-ficheiro", metavar="CAMINHO",
                   help="ensemble_*.json arquivado, em vez de ir à rede")
    p.add_argument("--ensemble-vars", nargs="+",
                   help="variáveis horárias adicionais do ensemble (defeito: só precipitation)")
    p.add_argument("--previsao", action="store_true",
                   help="junta o bloco previsao_meteorologica (separado da climatologia)")
    p.add_argument("--past-days", type=int, default=0, help="past_days do Open-Meteo determinístico")
    p.add_argument("--chirps-gefs-tif", nargs="+", metavar="[N=]TIF",
                   help="GeoTIFF locais do CHIRPS3-GEFS (só «c3g»); N=5|10|15 declara a acumulação")
    p.add_argument("--validar-pericia", metavar="DIR",
                   help="verifica a perícia dos ensemble_*.json arquivados em DIR (precisa de --observado, "
                        "--historico e as duas fontes declaradas IGUAIS); escreve DIR/validacao_pericia.json")
    p.add_argument("--escrever-latest", action="store_true",
                   help="escreve também saidas/<zona>/latest.json (escrita atómica)")
    a = p.parse_args(argv)
    if (a.lat is None) != (a.lon is None):
        p.error("--lat e --lon vão sempre juntos")
    if (a.zona not in ZONAS and a.lat is None
            and not a.historico.lower().endswith(".json")):
        p.error("zona desconhecida: indicar --lat e --lon (ou usar um histórico JSON do POWER)")
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")

    if a.validar_pericia:
        resv = validar_pericia(a)
        log.info("escrito %s (antecedência máxima validada: %s)",
                 Path(a.validar_pericia) / "validacao_pericia.json", resv["antecedencia_max_validada"])
        return 0

    res = correr_ciclo(a)
    data_ref = res["data_ref"]
    destino = Path(a.saida) / a.zona / res["epoca"].replace("/", "-") / f"ciclo_{data_ref}.json"
    escrever_json(destino, res)
    if a.escrever_latest:
        escrever_json(Path(a.saida) / a.zona / "latest.json", res)
    log.info("escrito %s (estado: %s)", destino, res.get("estado_motor"))
    return 0


if __name__ == "__main__":
    sys.exit(main())
