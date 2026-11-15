"""Pydantic v2 schemas for the Agricultural Decision Support System.
"""

from datetime import date
from enum import Enum
from typing import Optional, Dict, Any, List
import unicodedata
from pydantic import BaseModel, Field, field_validator


class AdvisoryStatus(str, Enum):
    """Veredito agronómico determinístico."""
    FAVORAVEL = "FAVORAVEL"
    AGUARDAR = "AGUARDAR"
    DESFAVORAVEL = "DESFAVORAVEL"


class AdvisoryRequest(BaseModel):
    """Payload de requisição para consulta de orientação de sementeira."""
    provincia: str = Field(
        ...,
        description="Província de Angola selecionada (Huambo, Bié ou Huíla)",
        examples=["Huambo"]
    )
    cultura: str = Field(
        default="Milho",
        description="Cultura agrícola (Milho, Feijão ou Soja)",
        examples=["Milho"]
    )
    data_consulta: str = Field(
        default_factory=lambda: date.today().isoformat(),
        description="Data de planeamento (YYYY-MM-DD). Se omitida, assume a data atual.",
        examples=["2026-11-12"]
    )
    municipio: Optional[str] = Field(
        default=None,
        description="Optional specific municipality within the province (e.g. Caála, Bailundo, Kuito, Matala)",
        examples=["Caála"]
    )
    lang: str = Field(
        default="pt",
        description="Language for advisory narrative output: 'pt' (Portuguese - Angola, default) or 'en' (English)",
        examples=["pt"]
    )

    @field_validator("lang", mode="before")
    @classmethod
    def normalize_lang(cls, v: Any) -> str:
        if v is None:
            return "pt"
        raw = str(v).strip().lower()
        if raw in ("pt", "pt-ao"):
            return "pt"
        if raw in ("en", "en-us"):
            return "en"
        raise ValueError("Unsupported language. Use 'pt', 'pt-AO', 'en', or 'en-US'.")

    @field_validator("data_consulta", mode="before")
    @classmethod
    def set_default_data_consulta(cls, v: Any) -> str:
        if v is None or not str(v).strip():
            return date.today().isoformat()
        return str(v).strip()

    @field_validator("provincia")
    @classmethod
    def validate_provincia(cls, v: str) -> str:
        if not v or not str(v).strip():
            raise ValueError("O agricultor deve selecionar a província (Huambo, Bié ou Huíla).")
        
        # Normalize accents for resilient matching (e.g. Bie -> Bié, Huila -> Huíla)
        raw = v.strip()
        normalized = unicodedata.normalize("NFKD", raw).encode("ASCII", "ignore").decode("utf-8").strip().title()
        
        mapping = {
            "Bie": "Bié",
            "Huambo": "Huambo",
            "Huila": "Huíla",
        }
        
        if normalized in mapping:
            return mapping[normalized]
            
        raise ValueError(
            f"Província '{v}' não suportada. Selecione uma das seguintes províncias: Huambo, Bié ou Huíla."
        )


class AdvisoryMetrics(BaseModel):
    """Métricas agroclimáticas observadas e previstas."""
    chuva_acumulada_recente_mm: float = Field(
        ...,
        description="Precipitação acumulada recente nos últimos 3 a 5 dias (mm)",
        examples=[24.5]
    )
    humidade_solo_raiz: float = Field(
        ...,
        description="Humidade atual estimada na zona radicular (fração de 0 a 1)",
        examples=[0.42]
    )
    previsao_7dias_mm: float = Field(
        ...,
        description="Precipitação total prevista para os próximos 7 dias (mm)",
        examples=[18.0]
    )


class AdvisoryResponse(BaseModel):
    """Payload de resposta padrão do endpoint de aconselhamento agronómico."""
    status: AdvisoryStatus = Field(
        ...,
        description="Veredito agronómico determinístico (FAVORAVEL, AGUARDAR ou DESFAVORAVEL)",
        examples=["FAVORAVEL"]
    )
    score_confianca: int = Field(
        ...,
        ge=0,
        le=100,
        description="Pontuação objetiva de confiança da recomendação (0-100%)",
        examples=[85]
    )
    metricas: AdvisoryMetrics = Field(
        ...,
        description="Métricas agroclimáticas observadas e previstas"
    )
    recomendacao_extensao: str = Field(
        ...,
        description="Texto completo formal, simples e sem jargões para o agricultor",
        examples=["**FAVORÁVEL: O período atual é favorável para a sementeira de Milho na província do Huambo...**"]
    )
    content_language: str = Field(
        default="pt",
        description="Effective language returned for narrative content ('pt' or 'en')",
        examples=["pt"]
    )


class DecisionEvaluationResult(BaseModel):
    """Resultado determinístico interno do motor de avaliação."""
    status: AdvisoryStatus
    score_confianca: int
    triggers_ativados: List[str]
    justificacoes_tecnicas: List[str]
    metricas: AdvisoryMetrics
    is_fallback_weather: bool = False
    content_language: str = "pt"
    detalhes_agroclimaticos: Dict[str, Any] = Field(default_factory=dict)


class ProvinceInfo(BaseModel):
    """Metadados geográficos das províncias suportadas."""
    id: str = Field(examples=["huambo"])
    nome: str = Field(examples=["Huambo"])
    latitude: float = Field(examples=[-12.7761])
    longitude: float = Field(examples=[15.7392])
    altitude_m: int = Field(examples=[1700])
    zona_agroecologica: str = Field(examples=["Planalto Central Tropical de Altitude"])


class CropInfo(BaseModel):
    """Metadados agronómicos das culturas suportadas."""
    id: str = Field(examples=["milho"])
    nome: str = Field(examples=["Milho"])
    nome_cientifico: str = Field(examples=["Zea mays"])
    icone: str = Field(examples=["🌽"])
    profundidade_sementeira_cm: int = Field(examples=[5])
    min_chuva_abertura_mm: float = Field(examples=[20.0])
    notas_agronomicas: str = Field(examples=["Cultura base de segurança alimentar no Planalto Central."])
