"""
Importa a planilha ESCALA EMEC -BAIXADA 2 10.07.xlsx (aba "ESCALA EQUIPES")
para as tabelas colaboradores_escala e escala_dias no Supabase.

Uso: python scripts/importar_escala.py
"""

import pandas as pd
import requests
from datetime import datetime, timedelta

EXCEL_PATH = "/workspaces/emecbx2/ESCALA EMEC -BAIXADA 2 10.07.xlsx"
SHEET_NAME = "ESCALA EQUIPES"
SUPABASE_URL = "https://byxmnmebvqdxpzcuutak.supabase.co"
SUPABASE_KEY = "sb_publishable_ltY4BfcrdlBw91KH5BHfgg_ZHDurfuZ"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}

COLUNAS_FIXAS = ["EQUIPE", "HORARIO", "COLABORADOR", "LOGIN SAP", "Login Field", "FUNÇÃO", "ESCALA"]


def excel_serial_to_date(serial: float) -> str:
    """Converte número serial do Excel para YYYY-MM-DD."""
    base = datetime(1899, 12, 30)
    return (base + timedelta(days=int(serial))).strftime("%Y-%m-%d")


def main():
    print("=" * 60)
    print("IMPORTAÇÃO DA ESCALA DE TRABALHO")
    print("=" * 60)

    df = pd.read_excel(EXCEL_PATH, sheet_name=SHEET_NAME, header=None)
    print(f"Planilha lida: {df.shape[0]} linhas x {df.shape[1]} colunas")

    # Localizar linha de cabeçalho
    header_row = None
    for i in range(min(10, len(df))):
        if str(df.iloc[i, 0]).strip().upper() == "EQUIPE":
            header_row = i
            break
    if header_row is None:
        print("ERRO: não encontrou linha de cabeçalho (EQUIPE)")
        return
    print(f"Cabeçalho na linha {header_row + 1}")

    date_row = header_row + 1
    data_start = date_row + 1

    headers = [str(df.iloc[header_row, c]).strip().upper() for c in range(df.shape[1])]
    date_serials = df.iloc[date_row]

    # Identificar colunas de data
    colunas_data = []
    for col_idx in range(7, len(headers)):
        val = date_serials.iloc[col_idx]
        if isinstance(val, (datetime,)):
            colunas_data.append((col_idx, val.strftime("%Y-%m-%d")))
        elif pd.notna(val) and isinstance(val, (int, float)):
            d = excel_serial_to_date(val)
            colunas_data.append((col_idx, d))

    print(f"Colunas de data encontradas: {len(colunas_data)}")
    print(f"  Primeira data: {colunas_data[0][1]}")
    print(f"  Última data:   {colunas_data[-1][1]}")

    # Limpar dados anteriores
    print("\nLimpando dados anteriores...")
    r = requests.delete(
        f"{SUPABASE_URL}/rest/v1/escala_dias?id=neq.0",
        headers=HEADERS,
    )
    print(f"  escala_dias: {r.status_code}")
    r = requests.delete(
        f"{SUPABASE_URL}/rest/v1/colaboradores_escala?id=neq.0",
        headers=HEADERS,
    )
    print(f"  colaboradores_escala: {r.status_code}")

    importados = 0
    erros = 0

    for i in range(data_start, len(df)):
        row = df.iloc[i]
        colaborador = str(row[2]).strip() if pd.notna(row[2]) else ""
        if not colaborador or colaborador.upper() in ("VAGO", "-", "NAN"):
            continue

        equipe = str(row[0]).strip() if pd.notna(row[0]) else "—"
        horario = str(row[1]).strip() if pd.notna(row[1]) else ""
        login_sap = str(row[3]).strip() if pd.notna(row[3]) else ""
        login_field = str(row[4]).strip() if pd.notna(row[4]) else ""
        funcao = str(row[5]).strip() if pd.notna(row[5]) else ""
        escala = str(row[6]).strip() if pd.notna(row[6]) else ""

        # Upsert colaborador
        payload = {
            "time_nome": "EMEC Baixada 2",
            "equipe": equipe,
            "horario": horario,
            "colaborador": colaborador,
            "login_sap": login_sap,
            "login_field": login_field,
            "funcao": funcao,
            "escala": escala,
            "ativo": True,
        }
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/colaboradores_escala",
            headers={**HEADERS, "Prefer": "return=representation"},
            json=payload,
        )
        if r.status_code >= 400:
            print(f"  ERRO colaborador {colaborador}: {r.status_code} {r.text[:80]}")
            erros += 1
            continue
        col_id = r.json()[0]["id"]

        # Calcular data_ancora
        data_ancora = None
        if escala.upper() in ("PLANTÃO 1", "PLANTÃO 2"):
            for col_idx, data_str in colunas_data:
                val = str(row[col_idx]).strip().upper() if pd.notna(row[col_idx]) else ""
                if val == "TRABALHA":
                    data_ancora = data_str
                    break

        # Inserir dias
        dias = []
        for col_idx, data_str in colunas_data:
            val = str(row[col_idx]).strip().upper() if pd.notna(row[col_idx]) else ""
            status = "TRABALHA" if val == "TRABALHA" else "FOLGA"
            dias.append({
                "colaborador_id": col_id,
                "data": data_str,
                "status": status,
            })

        if dias:
            r = requests.post(
                f"{SUPABASE_URL}/rest/v1/escala_dias",
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
                json=dias,
            )
            if r.status_code >= 400:
                print(f"  ERRO dias {colaborador}: {r.status_code} {r.text[:80]}")
                erros += 1

        # Atualizar data_ancora
        if data_ancora:
            requests.patch(
                f"{SUPABASE_URL}/rest/v1/colaboradores_escala?id=eq.{col_id}",
                headers=HEADERS,
                json={"data_ancora": data_ancora},
            )

        importados += 1
        print(f"  OK [{importados:2d}] {colaborador[:40]:40s} | {escala:12s} | {len(dias):2d} dias")

    print(f"\n{'=' * 60}")
    print(f"Importados: {importados}   Erros: {erros}")
    print(f"{'=' * 60}")


if __name__ == "__main__":
    main()
