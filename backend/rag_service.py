"""Module 4: Knowledge Chunking & Strategic RAG Synthesis.

Assembles dynamic context blocks from statistical baselines and decision metrics,
prompts LLMs (Gemini / OpenAI) with formal, objective, and culturally grounded agricultural extension instructions
focused on strategic crop planning and capital/resource protection, and provides a resilient deterministic fallback.
"""

import os
from typing import Dict, Any, Optional
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()

try:
    from src.schemas import DecisionEvaluationResult, AdvisoryStatus
    from src.config import (
        GEMINI_API_KEY,
        OPENAI_API_KEY,
        LLM_PROVIDER,
        LLM_MODEL,
        PROVINCES,
        CROP_PROFILES,
    )
except ImportError:
    from schemas import DecisionEvaluationResult, AdvisoryStatus
    from config import (
        GEMINI_API_KEY,
        OPENAI_API_KEY,
        LLM_PROVIDER,
        LLM_MODEL,
        PROVINCES,
        CROP_PROFILES,
    )


class RAGService:
    """Manages context assembly, strategic grounding prompts, and LLM text generation."""

    def __init__(self):
        self.gemini_client = None
        self.openai_client = None
        self._init_clients()

    def _init_clients(self):
        """Initializes API clients if keys are present in environment."""
        load_dotenv()
        g_key = os.getenv("GEMINI_API_KEY", GEMINI_API_KEY).strip()
        if g_key:
            try:
                from google import genai
                self.gemini_client = genai.Client(api_key=g_key)
            except Exception as e:
                print(f"[!] Aviso ao inicializar Google GenAI: {e}")

        o_key = os.getenv("OPENAI_API_KEY", OPENAI_API_KEY).strip()
        if o_key:
            try:
                from openai import OpenAI
                self.openai_client = OpenAI(api_key=o_key)
            except Exception as e:
                print(f"[!] Aviso ao inicializar OpenAI: {e}")

    def build_context_block(
        self,
        provincia: str,
        cultura: str,
        data_consulta: str,
        eval_result: DecisionEvaluationResult,
    ) -> str:
        """Converts statistical baseline and decision engine results into a structured Markdown chunk."""
        details = eval_result.detalhes_agroclimaticos
        m = eval_result.metricas

        status_verdicts = {
            AdvisoryStatus.FAVORAVEL: "FAVORÁVEL (Condições agroclimáticas estáveis para investimento e sementeira)",
            AdvisoryStatus.AGUARDAR: "AGUARDAR (Aguardar consolidação do solo ou das chuvas antes de semear)",
            AdvisoryStatus.DESFAVORAVEL: "NÃO PLANTAR (Desfavorável / Risco financeiro crítico de perda total de sementes e insumos)",
        }
        verdict_str = status_verdicts.get(eval_result.status, "AGUARDAR")

        try:
            target_dt = datetime.strptime(data_consulta, "%Y-%m-%d")
            ano = target_dt.year
            mes_num = target_dt.month
        except Exception:
            target_dt = datetime.now()
            ano = target_dt.year
            mes_num = target_dt.month

        meses_pt = [
            "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ]
        mes_nome_pt = meses_pt[mes_num] if 1 <= mes_num <= 12 else "Novembro"

        crop_info = CROP_PROFILES.get(cultura, CROP_PROFILES.get("Milho", {}))
        depth_cm = crop_info.get("sowing_depth_cm", 5)

        context_lines = [
            f"### CONTEXTO AGROCLIMÁTICO ESTRATÉGICO - PLANALTO CENTRAL DE ANGOLA",
            f"- **Província:** {provincia} (Zona Agroecológica: {PROVINCES.get(provincia, {}).get('agroecological_zone', 'Planalto Central')})",
            f"- **Cultura Avaliada:** {cultura} (Profundidade de sementeira: {depth_cm} cm)",
            f"- **Período de Planeamento:** {mes_nome_pt} de {ano} (Data: {data_consulta}, Semana do ano: {details.get('semana_iso', 'N/A')})",
            "",
            f"#### 1. Referência Histórica Agroclimática (25 Anos NASA POWER 2000-2024)",
            f"- Precipitação média histórica do mês: {details.get('chuva_media_mensal_mm', 0):.1f} mm/mês",
            f"- Probabilidade histórica de sementeira viável para a semana: {details.get('prob_sementeira_semanal', 50.0):.1f}%",
            f"- Humidade mediana típica na profundidade da raiz: {details.get('p50_raiz_historico', 0.45):.3f}",
            "",
            f"#### 2. Indicadores Hídricos e Térmicos do Período",
            f"- Chuva de referência recente / esperada: {m.chuva_acumulada_recente_mm:.1f} mm",
            f"- Previsão / média semanal de chuva: {m.previsao_7dias_mm:.1f} mm",
            f"- Temperatura de referência: {details.get('temperatura_max_c', 26):.1f} °C",
            f"- Humidade na zona radicular: {m.humidade_solo_raiz:.3f} (Limiar de segurança hídrica: {details.get('p25_root', 0.35):.3f})",
            "",
            f"#### 3. Avaliação Técnica e de Risco Financeiro do Sistema",
            f"- Veredito: **{verdict_str}**",
            f"- Grau de Certeza Agroclimática: {eval_result.score_confianca}%",
            f"- Indicadores Ativados: {', '.join(eval_result.triggers_ativados) or 'Padrão estável'}",
            f"- Justificações Técnicas e Financeiras:",
        ]

        for just in eval_result.justificacoes_tecnicas:
            context_lines.append(f"  * {just}")

        return "\n".join(context_lines)

    def get_system_prompt(self, lang: str = "pt") -> str:
        """Returns the formal, professional system instructions for the LLM."""
        if lang == "en":
            return (
                "You are an Agronomist and Rural Extension Advisor focused on Crop Season Planning and Financial Resource Protection "
                "for smallholder farmers and cooperatives in Angola's Central Plateau (Huambo, Bié, and Huíla). Your goal is to provide "
                "formal, clear, actionable guidance on agronomic viability and protecting farmer investments (seeds, soil preparation, labor).\n\n"
                "STYLE & CONDUCT GUIDELINES:\n"
                "1. FORMAL & RESPECTFUL TONE: Communicate clearly and professionally without slang or overly colloquial terms.\n"
                "2. NO TECHNICAL/COMPUTATIONAL JARGON: NEVER mention terms such as 'Mann-Kendall', 'SARIMA', 'p-value', 'P25', 'P50', "
                "'GWETROOT', 'GWETTOP', 'API', 'APIs', 'Open-Meteo', 'NASA POWER', 'percentiles', 'algorithm', or 'time series'. "
                "Explain insights using practical field language: soil moisture at root depth, recent rainfall, expected rain, temperature, and rainy vs dry season.\n"
                "3. REQUIRED STRUCTURE:\n"
                "   A) FIRST LINE (Bold uppercase verdict naming crop, province, and Month Year):\n"
                "      - Favorable: '**FAVORABLE: [Month Year] presents favorable conditions for planning and sowing [Crop] in [Province] province.**'\n"
                "      - Wait: '**WAIT: It is recommended to wait before investing in sowing [Crop] in [Province] province for [Month Year].**'\n"
                "      - Unfavorable: '**DO NOT PLANT: [Month Year] is unfavorable for rainfed sowing of [Crop] in [Province] province.**'\n"
                "   B) OBJECTIVE JUSTIFICATIONS (2 to 3 concise points covering root-zone soil moisture, 25-year historical context, and investment risk).\n"
                "   C) PRACTICAL FIELD RECOMMENDATION (sowing depth & hand soil-clod test at 5 cm if favorable; seed storage / soil prep / irrigated plots if dry).\n\n"
                "Write in clear, concise English."
            )
        return (
            "És um Engenheiro Agrónomo e Consultor de Extensão Rural focado em Planeamento de Safra e Proteção de Recursos Financeiros "
            "para agricultores e cooperativas no Planalto Central de Angola (Huambo, Bié e Huíla). O teu objetivo é fornecer "
            "orientações técnicas formais, claras e seguras sobre a viabilidade agronómica e a proteção de recursos "
            "financeiros (compra de sementes, preparação de solo e contratação de mão-de-obra) para a cultura e período consultados.\n\n"
            "DIRETRIZES DE ESTILO E CONDUTA:\n"
            "1. TOM FORMAL E PROFISSIONAL: Comunica de forma polida, objetiva, informativa e profissional. "
            "NÃO utilizes tratamentos informais ou coloquiais, tais como 'irmão', 'meu irmão', 'irmão camponês', 'amigo' ou gírias. "
            "A mensagem deve ser respeitosa, sóbria e focada em orientar a tomada de decisão económica e agronómica.\n"
            "2. ISENÇÃO TOTAL DE JARGÃO TÉCNICO ESTATÍSTICO/COMPUTACIONAL: NUNCA mencione termos como: "
            "'Mann-Kendall', 'SARIMA', 'p-valor', 'P25', 'P50', 'GWETROOT', 'GWETTOP', 'APIs', 'Open-Meteo', 'NASA POWER', "
            "'percentis', 'algoritmo' ou 'série temporal'. Transmita as conclusões através de termos práticos de solo, chuva, "
            "reserva de água na raiz, temperatura e época das chuvas vs cacimbo. Evite também utilizar a palavra 'capital' "
            "(use 'recursos financeiros' ou 'investimento').\n"
            "3. ESTRUTURA OBRIGATÓRIA DA RECOMENDAÇÃO:\n"
            "   A) PRIMEIRA LINHA (Veredito explícito em negrito e maiúsculas mencionando a cultura, província e o mês/ano de planeamento):\n"
            "      - Caso favorável: '**FAVORÁVEL: O período de [Mês de Ano] apresenta condições favoráveis para o planeamento e sementeira de [Cultura] na província do [Província].**'\n"
            "      - Caso de espera: '**AGUARDAR: Recomenda-se aguardar antes de investir na sementeira de [Cultura] na província do [Província] para [Mês de Ano].**'\n"
            "      - Caso desfavorável: '**NÃO PLANTAR: O período de [Mês de Ano] é desfavorável para a sementeira em regime de sequeiro de [Cultura] na província do [Província].**'\n"
            "   B) JUSTIFICAÇÕES OBJETIVAS (2 a 3 pontos diretos):\n"
            "      - Avaliação das reservas hídricas do solo na zona da raiz e chuva esperada para o período.\n"
            "      - Enquadramento agroclimático histórico da época na província.\n"
            "      - Impacto na proteção dos recursos e investimento do agricultor (se é seguro investir em sementes e mão-de-obra ou se há risco financeiro de perda).\n"
            "   C) RECOMENDAÇÃO PRÁTICA:\n"
            "      - Se favorável: Dica prática de campo (profundidade de sementeira e teste do torrão na palma da mão a 5 cm).\n"
            "      - Se desfavorável (ex: Cacimbo / seca): Orientação expressa para proteger os recursos financeiros, guardando as sementes para o início das chuvas regulares (outubro/novembro), "
            "ou canalizar os trabalhos para lavoura, calagem, correção do solo ou agricultura irrigada.\n\n"
            "Apresenta a resposta em língua portuguesa de Angola, com excelente clareza sintática e pontuação correta."
        )

    def generate_recommendation(
        self,
        provincia: str,
        cultura: str,
        data_consulta: str,
        eval_result: DecisionEvaluationResult,
        lang: str = "pt",
    ) -> str:
        """Synthesizes the natural language agricultural advisory using LLM or formal fallback."""
        context_block = self.build_context_block(provincia, cultura, data_consulta, eval_result)
        system_prompt = self.get_system_prompt(lang=lang)

        if lang == "en":
            user_content = (
                f"Based on the consolidated agroclimatic summary below, write the formal agricultural extension advisory for the farmer in English:\n\n"
                f"{context_block}\n\n"
                f"Follow the requested structure strictly, maintain a formal informative tone, and avoid any technical jargon."
            )
        else:
            user_content = (
                f"Com base nas informações agroclimáticas consolidadas abaixo, elabore a recomendação formal de orientação técnica para o agricultor:\n\n"
                f"{context_block}\n\n"
                f"Elabore a resposta mantendo rigorosamente a estrutura solicitada, o tom formal e informativo, e sem qualquer jargão técnico."
            )

        if self.gemini_client:
            models_to_try = [
                os.getenv("LLM_MODEL", "gemini-3.5-flash"),
                "gemini-3.5-flash",
                "gemini-3.5-flash-lite",
                "gemini-3.8-flash",
                "gemini-2.5-flash-lite",
            ]
            for model_name in models_to_try:
                try:
                    response = self.gemini_client.models.generate_content(
                        model=model_name,
                        contents=f"{system_prompt}\n\n{user_content}",
                    )
                    if response and response.text:
                        return response.text.strip()
                except Exception as e:
                    print(f"[!] Tentativa com modelo {model_name} falhou: {e}")

        if self.openai_client:
            try:
                model_name = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
                chat_completion = self.openai_client.chat.completions.create(
                    model=model_name,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_content},
                    ],
                    temperature=0.2,
                )
                text = chat_completion.choices[0].message.content
                if text:
                    return text.strip()
            except Exception as e:
                print(f"[!] Erro na chamada à OpenAI ({e}). Utilizando sintetizador formal local...")

        return self._generate_local_agronomist_synthesis(provincia, cultura, data_consulta, eval_result, lang=lang)

    def _generate_local_agronomist_synthesis(
        self,
        provincia: str,
        cultura: str,
        data_consulta: str,
        eval_result: DecisionEvaluationResult,
        lang: str = "pt",
    ) -> str:
        """Formal, objective, and informative agronomic synthesis in Portuguese or English."""
        status = eval_result.status
        m = eval_result.metricas

        try:
            target_dt = datetime.strptime(data_consulta, "%Y-%m-%d")
            ano = target_dt.year
            mes_num = target_dt.month
        except Exception:
            target_dt = datetime.now()
            ano = target_dt.year
            mes_num = target_dt.month

        crop_info = CROP_PROFILES.get(cultura, CROP_PROFILES.get("Milho", {}))
        depth_cm = crop_info.get("sowing_depth_cm", 5)

        if lang == "en":
            months_en = [
                "", "January", "February", "March", "April", "May", "June",
                "July", "August", "September", "October", "November", "December"
            ]
            month_name_en = months_en[mes_num] if 1 <= mes_num <= 12 else "November"
            period_en = f"{month_name_en} {ano}"
            if status == AdvisoryStatus.FAVORAVEL:
                return (
                    f"**FAVORABLE: {period_en} presents favorable conditions for planning and sowing {cultura} in {provincia} province.**\n\n"
                    f"Historical climate records and projected conditions support safe agricultural investment:\n\n"
                    f"1. **Adequate soil water availability:** Root-zone soil moisture ({m.humidade_solo_raiz:.2f}) and expected weekly rainfall "
                    f"({m.previsao_7dias_mm:.1f} mm) satisfy germination and early establishment needs for {cultura}.\n"
                    f"2. **Historical season stability:** 25-year regional records confirm this period falls within the regular rainy season, "
                    f"reducing the risk of severe dry-spell losses.\n"
                    f"3. **Investment protection:** Financial risk of seed loss from early drought is low, supporting field operations.\n\n"
                    f"**Practical field recommendation:** Sow at {depth_cm} cm depth. Before planting, test soil moisture by hand at 5 cm depth: "
                    f"pressed soil should hold a firm clod without crumbling or dripping excess water."
                )
            if status == AdvisoryStatus.AGUARDAR:
                return (
                    f"**WAIT: It is recommended to wait before investing in sowing {cultura} in {provincia} province for {period_en}.**\n\n"
                    f"Despite initial moisture signals, water reserves still require consolidation to protect farmer investments:\n\n"
                    f"1. **Moisture still building:** Root-zone soil moisture ({m.humidade_solo_raiz:.2f}) or rainfall regularity does not yet "
                    f"provide a reliable safety margin for {cultura}.\n"
                    f"2. **Replanting protection:** Sowing prematurely could cause costly replanting if a dry spell follows germination.\n\n"
                    f"**Practical field recommendation:** Use this window to complete land preparation, plowing, and ridge alignment. "
                    f"Keep seeds safely stored until steady rainfall saturates the planting layer."
                )
            return (
                f"**DO NOT PLANT: {period_en} is unfavorable for rainfed sowing of {cultura} in {provincia} province.**\n\n"
                f"Agroclimatic indicators show critical drought risk and high likelihood of crop failure:\n\n"
                f"1. **Severe water deficit (Dry Season):** Soil moisture ({m.humidade_solo_raiz:.2f}) and expected rainfall "
                f"({m.previsao_7dias_mm:.1f} mm) fall critically below biological requirements for {cultura}.\n"
                f"2. **Financial protection alert:** Rainfed sowing during this period risks desiccation and total loss of expenditure "
                f"on seeds, fertilizer, and labor.\n\n"
                f"**Practical field recommendation:** Preserve seeds and financial resources for the start of regular rains (October/November). "
                f"Focus dry-season work on liming, organic matter incorporation, fallow maintenance, or irrigated plots."
            )

        meses_pt = [
            "", "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
            "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
        ]
        mes_nome_pt = meses_pt[mes_num] if 1 <= mes_num <= 12 else "Novembro"
        periodo_str = f"{mes_nome_pt} de {ano}"

        if status == AdvisoryStatus.FAVORAVEL:
            text = (
                f"**FAVORÁVEL: O período de {periodo_str} apresenta condições favoráveis para o planeamento e sementeira de {cultura} na província do {provincia}.**\n\n"
                f"A análise agroclimática histórica e as condições projetadas confirmam um cenário seguro para o investimento agrícola:\n\n"
                f"1. **Disponibilidade hídrica adequada:** As reservas de humidade no solo ({m.humidade_solo_raiz:.2f}) e a precipitação média "
                f"projetada ({m.previsao_7dias_mm:.1f} mm) atendem satisfatoriamente aos requisitos de arranque e germinação da cultura de {cultura}.\n"
                f"2. **Estabilidade histórica da época:** O histórico de 25 anos da região comprova que este período integra a época regular das chuvas, "
                f"proporcionando segurança para a aquisição de sementes e contratação de mão-de-obra sem risco de perdas por seca severa.\n"
                f"3. **Segurança do investimento:** O risco financeiro de perda de sementes por estiagem é baixo, justificando o avanço das operações agrícolas.\n\n"
                f"**Recomendação técnica de campo:** Realize a sementeira a uma profundidade de {depth_cm} cm. Verifique previamente a terra com a mão: "
                f"ao pressionar uma porção de solo recolhida a 5 cm de profundidade, deve formar-se um torrão consistente que não esfarela e sem excesso de água."
            )
        elif status == AdvisoryStatus.AGUARDAR:
            text = (
                f"**AGUARDAR: Recomenda-se aguardar antes de investir na sementeira de {cultura} na província do {provincia} para {periodo_str}.**\n\n"
                f"Apesar de sinais iniciais de humidade, o regime hídrico ainda requer consolidação para proteger o investimento do produtor:\n\n"
                f"1. **Reserva hídrica em consolidação:** O nível de humidade na zona radicular ({m.humidade_solo_raiz:.2f}) ou a regularidade "
                f"das chuvas ainda não oferece a margem de segurança biológica ideal para a cultura de {cultura}.\n"
                f"2. **Proteção contra replante:** Semear precipitadamente neste intervalo pode forçar um replante dispendioso caso ocorra um intervalo seco pós-sementeira.\n\n"
                f"**Recomendação técnica de campo:** Aproveite este período para concluir a preparação do solo, aragem, gradagem e alinhamento das leiras. "
                f"Mantenha as sementes protegidas e aguarde chuvas contínuas que ensopem o solo de forma homogénea."
            )
        else:  # DESFAVORAVEL
            text = (
                f"**NÃO PLANTAR: O período de {periodo_str} é desfavorável para a sementeira em regime de sequeiro de {cultura} na província do {provincia}.**\n\n"
                f"Os dados agroclimáticos indicam elevado risco de insucesso e prejuízo financeiro para o agricultor:\n\n"
                f"1. **Défice hídrico severo (Época Seca / Cacimbo):** A humidade do solo ({m.humidade_solo_raiz:.2f}) e as chuvas esperadas "
                f"({m.previsao_7dias_mm:.1f} mm) estão criticamente abaixo da exigência biológica da cultura de {cultura}.\n"
                f"2. **Alerta de proteção de recursos financeiros:** Semear culturas de sequeiro nesta época resultará na dessecação da semente e perda "
                f"de 100% do investimento financeiro realizado em sementes, adubos e mão-de-obra contratada.\n\n"
                f"**Recomendação técnica de campo:** Guarde os seus recursos financeiros e estoque de sementes para o início da época das chuvas (outubro/novembro). "
                f"Utilize este período exclusivamente para calagem, incorporação de matéria orgânica, pousio ou produção em parcelas com rega assistida (hortícolas)."
            )

        return text


_rag_service_instance: Optional[RAGService] = None


def get_rag_service() -> RAGService:
    global _rag_service_instance
    if _rag_service_instance is None:
        _rag_service_instance = RAGService()
    return _rag_service_instance
