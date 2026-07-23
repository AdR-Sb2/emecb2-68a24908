"""
Importa a planilha NOVA_RELACAO_EAT_2026.xlsx (aba RELACAO DE ELEVATORIAS)
e cruza com a aba ELEVATORIAS BXD2 da planilha de almoxarifado.

Uso: python scripts/importar_elevatorias.py
"""

import pandas as pd
import requests
import time
import json
import os
from datetime import datetime

EXCEL_PATH_EAT = "/workspaces/emecbx2/NOVA_RELACAO_EAT_2026.xlsx"
EXCEL_PATH_ALMOX = "/workspaces/emecbx2/ALMOXARIFADO ELETROMECANICA BXD2.xlsx"
SUPABASE_URL = os.environ.get("SUPABASE_URL", "https://byxmnmebvqdxpzcuutak.supabase.co")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY", "")
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
DELAY = 0.05

# Schema de mapeamento: colunas da planilha -> colunas do banco + tabela
COLUMN_MAP = {
    "ELEVATORIAS": ("elevatorias", "nome"),
    "PLANTA": ("elevatorias", "planta"),
    "TIPO": ("elevatorias", "tipo"),
    "MUNICIPIO": ("elevatorias", "municipio"),
    "SUPERINTENDENCIA": ("elevatorias", "superintendencia"),
    "ENDERECO": ("elevatorias", "endereco"),
    "BAIRRO": ("elevatorias", "bairro"),
    "CEP": ("elevatorias", "cep"),
    "LATITUDE": ("elevatorias", "latitude"),
    "LONGITUDE": ("elevatorias", "longitude"),
    "INICIO_OPERACAO": ("elevatorias", "inicio_operacao"),
    "CARACTERISTICAS_AREA": ("elevatorias", "caracteristicas_area"),
    "GRUPO": ("elevatorias", "grupo"),
    "FUNCAO": ("elevatorias", "funcao"),
}

# Campos que vao para tabelas de dados mestres
EQUIP_COLS = {
    "POTENCIA_MOTOR_CV": ("elevatoria_equipamento", "potencia_motor_cv"),
    "RPM": ("elevatoria_equipamento", "rpm"),
    "MARCA_MOTOR": ("elevatoria_equipamento", "marca_motor"),
    "CARCACA_MOTOR": ("elevatoria_equipamento", "carcaca_motor"),
    "TAG_MOTOR": ("elevatoria_equipamento", "tag_motor"),
    "TENSAO_V": ("elevatoria_equipamento", "tensao_v"),
    "CORRENTE_A": ("elevatoria_equipamento", "corrente_a"),
    "MANCAIS_LA": ("elevatoria_equipamento", "mancais_la"),
    "MANCAIS_LOA": ("elevatoria_equipamento", "mancais_loa"),
    "MODELO_BOMBA": ("elevatoria_equipamento", "modelo_bomba"),
    "TAG_BOMBA": ("elevatoria_equipamento", "tag_bomba"),
    "MARCA_BOMBA": ("elevatoria_equipamento", "marca_bomba"),
    "DIAMETRO_ROTOR_POL": ("elevatoria_equipamento", "diametro_rotor_pol"),
    "DIAMETRO_ROTOR_MM": ("elevatoria_equipamento", "diametro_rotor_mm"),
    "TIPO_CONSTRUTIVO_ELEVATORIA": ("elevatoria_equipamento", "tipo_construtivo_elevatoria"),
    "BOMBA_DRENO": ("elevatoria_equipamento", "bomba_dreno"),
    "PONTA_EIXO_MOTOR": ("elevatoria_equipamento", "ponta_eixo_motor"),
    "SENTIDO_MONTAGEM_MOTOR": ("elevatoria_equipamento", "sentido_montagem_motor"),
    "FLANGE": ("elevatoria_equipamento", "flange"),
    "FORMA_CONSTRUTIVA_BOMBA": ("elevatoria_equipamento", "forma_construtiva_bomba"),
    "VAZAO_APROXIMADA_M3H": ("elevatoria_equipamento", "vazao_aproximada_m3h"),
    "AMT_APROXIMADA": ("elevatoria_equipamento", "amt_aproximada"),
    "CAPACIDADE_TRATAMENTO": ("elevatoria_equipamento", "capacidade_tratamento"),
    "PROCEDENCIA_MCA": ("elevatoria_equipamento", "procedencia_mca"),
    "COD_SAP": ("elevatoria_equipamento", "cod_sap"),
}

ELETR_COLS = {
    "BT_MT": ("elevatoria_eletrica", "bt_mt"),
    "TRAFO_KVA": ("elevatoria_eletrica", "trafo_kva"),
    "NUM_CLIENTE": ("elevatoria_eletrica", "num_cliente"),
    "MEDIDOR": ("elevatoria_eletrica", "medidor"),
    "MEDIDOR_APURADO": ("elevatoria_eletrica", "medidor_apurado"),
    "UNIDADE_CONSUMO": ("elevatoria_eletrica", "unidade_consumo"),
    "ENDERECO_CONCESSIONARIA": ("elevatoria_eletrica", "endereco_concessionaria"),
    "TAG_PAINEL": ("elevatoria_eletrica", "tag_painel"),
    "TIPO_ACIONAMENTO": ("elevatoria_eletrica", "tipo_acionamento"),
    "FABRICANTE_ACIONAMENTO": ("elevatoria_eletrica", "fabricante_acionamento"),
    "MODELO_ACIONAMENTO": ("elevatoria_eletrica", "modelo_acionamento"),
    "CLP": ("elevatoria_eletrica", "clp"),
    "PCP": ("elevatoria_eletrica", "pcp"),
}

HIDRA_COLS = {
    "SUCCAO": ("elevatoria_hidraulica", "succao"),
    "RECALQUE": ("elevatoria_hidraulica", "recalque"),
    "TRONCO": ("elevatoria_hidraulica", "tronco"),
    "DISTANCIA_ATE_ELEV": ("elevatoria_hidraulica", "distancia_ate_elev"),
    "TOMADA_RETAGUARDA": ("elevatoria_hidraulica", "tomada_retaguarda"),
    "TOMADA_RECALQUE": ("elevatoria_hidraulica", "tomada_recalque"),
    "ELETRODO_SUPERIOR": ("elevatoria_hidraulica", "eletrodo_superior"),
    "ELETRODO_INFERIOR": ("elevatoria_hidraulica", "eletrodo_inferior"),
    "TIPO_RECALQUE": ("elevatoria_hidraulica", "tipo_recalque"),
    "COTA_ELEVATORIA": ("elevatoria_hidraulica", "cota_elevatoria"),
    "COTA_MAXIMA": ("elevatoria_hidraulica", "cota_maxima"),
    "DISTANCIA_ELEV_COORDENACAO": ("elevatoria_hidraulica", "distancia_elev_coordenacao"),
}

ROLAMENTO_MAP = {
    "TIPO": ("elevatoria_rolamentos_selos", "tipo"),
    "ROLAMENTO_MOTOR": ("elevatoria_rolamentos_selos", "rolamento_motor"),
    "ROLAMENTO_BOMBA": ("elevatoria_rolamentos_selos", "rolamento_bomba"),
    "B_ACOPLAMENTO": ("elevatoria_rolamentos_selos", "b_acoplamento"),
    "GAXETA": ("elevatoria_rolamentos_selos", "gaxeta"),
    "SELO_MECANICO": ("elevatoria_rolamentos_selos", "selo_mecanico"),
    "DATA_TROCA": ("elevatoria_rolamentos_selos", "data_troca"),
}


def clean_val(v):
    """Trata valor para armazenar no banco (None se vazio/invalido, nunca string vazia)."""
    if pd.isna(v):
        return None
    s = str(v).strip()
    if s == "" or s == "nan":
        return None
    return s


def importar_elevatorias():
    print("=" * 60)
    print("IMPORTACAO DE ELEVATORIAS")
    print("=" * 60)

    # 1. Ler planilha principal
    print(f"\nLendo {EXCEL_PATH_EAT}...")
    try:
        df = pd.read_excel(EXCEL_PATH_EAT, sheet_name="RELAÇÃO DE ELEVATÓRIAS")
    except Exception:
        try:
            df = pd.read_excel(EXCEL_PATH_EAT, sheet_name="RELACAO DE ELEVATORIAS")
        except Exception:
            print("ERRO: Aba RELAÇÃO DE ELEVATÓRIAS nao encontrada")
            return

    # Normalizar nomes das colunas
    df.columns = [str(c).strip().upper().replace(" ", "_").replace("Ç", "C")
                  .replace("Ã", "A").replace("Õ", "O").replace("Ê", "E")
                  for c in df.columns]

    print(f"Colunas encontradas: {list(df.columns)}")
    print(f"Linhas: {len(df)}")

    # 2. Ler planilha de almoxarifado (aba ELEVATORIAS BXD2)
    print(f"\nLendo {EXCEL_PATH_ALMOX} (aba ELEVATORIAS BXD2)...")
    rolamentos_data = {}
    try:
        df_almox = pd.read_excel(EXCEL_PATH_ALMOX, sheet_name="ELEVATÓRIAS BXD2")
        df_almox.columns = [str(c).strip().upper().replace(" ", "_").replace("Ç", "C")
                            .replace("Ã", "A").replace("Õ", "O").replace("Ê", "E")
                            for c in df_almox.columns]
        print(f"Colunas almox: {list(df_almox.columns)}")

        nome_col = None
        for c in df_almox.columns:
            if "ELEVAT" in c or "NOME" in c:
                nome_col = c
                break
        if nome_col:
            for _, row in df_almox.iterrows():
                nome = clean_val(row.get(nome_col))
                if nome:
                    dados = {}
                    for planilha_col, (tabela, campo) in ROLAMENTO_MAP.items():
                        v = clean_val(row.get(planilha_col)) if planilha_col in df_almox.columns else None
                        dados[campo] = v
                    rolamentos_data[nome.upper()] = dados
            print(f"  {len(rolamentos_data)} registros de rolamentos lidos")
        else:
            print("  AVISO: Coluna de nome nao encontrada na planilha de almoxarifado")
    except Exception as e:
        print(f"  AVISO: Nao foi possivel ler aba ELEVATORIAS BXD2: {e}")

    # 3. Importar cada elevatoria
    importados = 0
    erros = 0
    pendencias_concil = []

    for idx, row in df.iterrows():
        nome_elev = clean_val(row.get("ELEVATORIAS"))
        if not nome_elev:
            continue

        # Dados basicos
        elev_data = {}
        for planilha_col, (tabela, campo) in COLUMN_MAP.items():
            if planilha_col in df.columns:
                v = clean_val(row.get(planilha_col))
                if v is not None:
                    elev_data[campo] = v

        # ---- INSERIR/UPSERT elevatorias ----
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/elevatorias",
            headers={**HEADERS, "Prefer": "return=representation"},
            json=elev_data,
        )
        if r.status_code >= 400:
            print(f"  ERRO ao criar elevatoria '{nome_elev}': {r.status_code} {r.text[:80]}")
            erros += 1
            continue

        created = r.json()
        elev_id = created[0]["id"] if isinstance(created, list) else created.get("id")
        if not elev_id:
            print(f"  ERRO: ID nao retornado para '{nome_elev}'")
            erros += 1
            continue

        # ---- Dados de equipamento ----
        equip_data = {"elevatoria_id": elev_id}
        for planilha_col, (tabela, campo) in {**EQUIP_COLS, **ELETR_COLS, **HIDRA_COLS}.items():
            if planilha_col in df.columns:
                v = clean_val(row.get(planilha_col))
                if v is not None:
                    equip_data[campo] = v

        if len(equip_data) > 1:  # tem pelo menos 1 campo alem do elevatoria_id
            requests.post(
                f"{SUPABASE_URL}/rest/v1/elevatoria_equipamento",
                headers=HEADERS,
                json={k: v for k, v in equip_data.items() if k.startswith("elevatoria_id") or
                      k in dict(EQUIP_COLS).values() or False},
            )

        # ---- Rolamentos (cruzar pelo nome) ----
        nome_key = nome_elev.upper()
        if nome_key in rolamentos_data:
            rol_data = {"elevatoria_id": elev_id, **rolamentos_data[nome_key]}
            requests.post(
                f"{SUPABASE_URL}/rest/v1/elevatoria_rolamentos_selos",
                headers=HEADERS,
                json=rol_data,
            )
        else:
            # Tentar fuzzy match
            matched = False
            for rol_nome in rolamentos_data:
                # Verifica se o nome da planilha contem o nome do almox ou vice-versa
                if nome_key in rol_nome or rol_nome in nome_key:
                    rol_data = {"elevatoria_id": elev_id, **rolamentos_data[rol_nome]}
                    requests.post(
                        f"{SUPABASE_URL}/rest/v1/elevatoria_rolamentos_selos",
                        headers=HEADERS,
                        json=rol_data,
                    )
                    matched = True
                    pendencias_concil.append({
                        "elevatoria_planilha": nome_elev,
                        "elevatoria_almox": rol_nome,
                        "status": "MATCH_PARCIAL",
                        "nota": "Match por substring - revisar"
                    })
                    break
            if not matched:
                pendencias_concil.append({
                    "elevatoria_planilha": nome_elev,
                    "elevatoria_almox": None,
                    "status": "NAO_ENCONTRADO",
                    "nota": "Nome nao encontrado na planilha de almoxarifado"
                })

        importados += 1
        if (idx + 1) % 20 == 0:
            print(f"  ... {idx+1}/{len(df)}")
        time.sleep(DELAY)

    print(f"\n{importados} elevatórias importadas ({erros} erros)")

    # 4. Relatorio de conciliacao
    if pendencias_concil:
        print(f"\n{'='*70}")
        print("RELATORIO DE PENDENCIAS DE CONCILIACAO")
        print(f"{'='*70}")
        for p in pendencias_concil:
            print(f"  {p['elevatoria_planilha']:<40} | {str(p['elevatoria_almox'] or '---'):<40} | {p['status']:<20} | {p['nota']}")

        # Salvar relatorio em JSON
        relatorio_path = f"relatorio_conciliacao_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(relatorio_path, "w", encoding="utf-8") as f:
            json.dump(pendencias_concil, f, ensure_ascii=False, indent=2)
        print(f"\nRelatorio salvo em: {relatorio_path}")


if __name__ == "__main__":
    importar_elevatorias()
