"""CLI Entrypoint for the Agricultural Decision Support System.

Verifies the presence of the 3 raw NASA POWER JSON files,
processes the agroclimatic baseline if not yet generated,
and starts the FastAPI production/development server.
"""

import sys
import argparse
from pathlib import Path

# Add project root to sys.path
PROJECT_ROOT = Path(__file__).resolve().parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.config import (
    PROVINCES,
    RAW_DATA_DIR,
    PROCESSED_BASELINE_PATH,
    SERVER_HOST,
    SERVER_PORT,
)
from src.baseline_engine import BaselineEngine


def check_raw_files() -> bool:
    """Verifies that all three raw NASA POWER JSON files exist in the data folder."""
    print("=" * 70)
    print(" 🌽 SISTEMA DE SUPORTE À DECISÃO AGRÍCOLA - PLANALTO CENTRAL DE ANGOLA")
    print("=" * 70)
    print("[1/3] Verificação dos ficheiros brutos da NASA POWER (2000-2024)...")

    all_found = True
    for prov_name, prov_info in PROVINCES.items():
        expected_file = RAW_DATA_DIR / prov_info["raw_file"]
        if expected_file.exists():
            size_mb = expected_file.stat().st_size / (1024 * 1024)
            print(f"  [✓] {prov_name:<8} : {expected_file.name} ({size_mb:.2f} MB)")
        else:
            print(f"  [✗] {prov_name:<8} : FICHEIRO EM FALTA: {expected_file}")
            all_found = False

    return all_found


def ensure_baseline_processed(force_recompute: bool = False) -> bool:
    """Checks for processed baseline; computes it if absent or forced."""
    print("\n[2/3] Verificação da Linha de Base Agroclimática Pré-computada...")
    engine = BaselineEngine()

    if PROCESSED_BASELINE_PATH.exists() and not force_recompute:
        size_kb = PROCESSED_BASELINE_PATH.stat().st_size / 1024
        print(f"  [✓] Linha de base encontrada: {PROCESSED_BASELINE_PATH.name} ({size_kb:.1f} KB)")
        # Quick validation of contents
        try:
            baseline = engine.load_baseline()
            num_provinces = len(baseline.get("provincias", {}))
            print(f"  [✓] {num_provinces} províncias indexadas com sucesso (Huambo, Bié, Huíla).")
            return True
        except Exception as e:
            print(f"  [!] Aviso: Erro ao ler ficheiro existente ({e}). A recalcular...")

    print("  [*] A processar séries diárias de 25 anos (2000-2024) e testes de Mann-Kendall...")
    try:
        engine.process_all_provinces(save_to_file=True)
        print("  [✓] Matrizes e curvas de sementeira calculadas e gravadas com sucesso.")
        return True
    except Exception as e:
        print(f"  [✗] Falha no processamento da linha de base: {e}")
        return False


def start_server(host: str, port: int, reload: bool = False):
    """Starts the Uvicorn ASGI server hosting the FastAPI application."""
    import uvicorn
    print("\n[3/3] A iniciar o servidor FastAPI da API de Decisão Agrícola...")
    print(f"  [✓] Servidor disponível em: http://{host}:{port}")
    print(f"  [✓] Documentação Swagger UI: http://{host}:{port}/docs")
    print(f"  [✓] Endpoint principal: POST http://{host}:{port}/api/v1/advisory\n")
    print("=" * 70)

    uvicorn.run("main:app", host=host, port=port, reload=reload)


def main():
    parser = argparse.ArgumentParser(
        description="Ponto de entrada do Sistema de Suporte à Decisão Agrícola para Angola."
    )
    parser.add_argument(
        "--host",
        type=str,
        default=SERVER_HOST,
        help=f"Host para o servidor FastAPI (padrão: {SERVER_HOST})",
    )
    parser.add_argument(
        "--port",
        type=int,
        default=SERVER_PORT,
        help=f"Porta para o servidor FastAPI (padrão: {SERVER_PORT})",
    )
    parser.add_argument(
        "--reload",
        action="store_true",
        help="Ativar hot reload para desenvolvimento",
    )
    parser.add_argument(
        "--recompute-baseline",
        action="store_true",
        help="Forçar o reprocessamento das estatísticas da linha de base",
    )
    parser.add_argument(
        "--no-server",
        action="store_true",
        help="Apenas validar ficheiros e pré-processar a linha de base sem iniciar o servidor",
    )

    args = parser.parse_args()

    # Step 1: Validate raw NASA files
    if not check_raw_files():
        print("\n[ERRO CRÍTICO] Ficheiros brutos da NASA POWER em falta no diretório 'data/'.")
        print("Certifique-se de que os três ficheiros JSON estão presentes antes de prosseguir.")
        sys.exit(1)

    # Step 2: Ensure baseline is precomputed
    if not ensure_baseline_processed(force_recompute=args.recompute_baseline):
        print("\n[ERRO CRÍTICO] Não foi possível gerar a linha de base.")
        sys.exit(1)

    # Step 3: Run FastAPI server (unless --no-server specified)
    if args.no_server:
        print("\n[✓] Linha de base validada e pronta. Opção --no-server ativada. Encerrando.")
        sys.exit(0)

    start_server(host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
