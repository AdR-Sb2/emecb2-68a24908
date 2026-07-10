"""
Importa a planilha ALMOXARIFADO ELETROMECANICA BXD2.xlsx para o Supabase.

Regras:
  - cod_sap com mesma descrição → mescla (soma saldos)
  - cod_sap com descrições DIFERENTES → mantém separado com sufixo (_A, _B...)
    e prefixo [REVISAR] na descrição para decisão manual

Uso: python scripts/importar_planilha.py
"""

import pandas as pd
import requests
import time
from collections import OrderedDict, defaultdict

EXCEL_PATH = "/workspaces/emecbx2/ALMOXARIFADO ELETROMECANICA BXD2.xlsx"
SUPABASE_URL = "https://byxmnmebvqdxpzcuutak.supabase.co"
SUPABASE_KEY = "sb_publishable_ltY4BfcrdlBw91KH5BHfgg_ZHDurfuZ"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
}
DELAY = 0.05


def infer_categoria(desc):
    d = desc.upper()
    if any(w in d for w in ["EPI", "LUVA SEG", "ÓCULO", "PROTETOR", "CAPACETE", "MASCARA",
                              "CALÇA SEG", "CAMISA SEG"]):
        return "epi"
    if any(w in d for w in ["CABO", "FIO", "DISJUNTOR", "CONTATOR", "RELE", "FITA ISOL",
                            "TERMINAL", "TOMADA", "INTERRUPTOR", "LÂMPADA", "LAMPADA",
                            "CONECTOR", "CHAVE", "SENSOR", "TRANSFORMADOR", "FUSÍVEL",
                            "FUSIVEL", "MOTOR", "SIRENE", "BOTÃO", "BOTAO"]):
        return "eletrico"
    if any(w in d for w in ["ROLAMENTO", "CORRENTE", "ENGRENAGEM", "MOLA", "PARAFUSO",
                            "PORCA", "ARRUELA", "ANEL", "RETENTOR", "GUIA", "BUCHA",
                            "ABRACADEIRA", "ACOPLAMENTO", "MANGUEIRA", "MANG"]):
        return "mecanico"
    if any(w in d for w in ["TUBO", "CONEXÃO", "CONEXAO", "REGISTRO", "VÁLVULA", "VALVULA",
                            "JOELHO", "TE", "CAP", "LUVA PVC", "NIPLE", "FLANGE",
                            "ADAPTADOR", "REDUÇÃO", "REDUCAO"]):
        return "hidraulico"
    if any(w in d for w in ["LIXA", "SOLDA", "ELETRODO", "DISCO", "SERRA", "BROCA",
                            "FITA VEDA"]):
        return "consumivel"
    return "outros"


def main():
    print("=" * 60)
    print("IMPORTAÇÃO DA PLANILHA DE ALMOXARIFADO")
    print("=" * 60)

    df = pd.read_excel(EXCEL_PATH, sheet_name="ESTOQUE BXD2 (2)", header=None)
    data = df.iloc[2:]

    # ── Parse ──
    rows = []
    for _, row in data.iterrows():
        cod_raw = str(row[0]).strip() if pd.notna(row[0]) else ""
        if not cod_raw or cod_raw in ("0", "0.0"):
            continue
        cod_sap = str(int(float(cod_raw))) if "." in cod_raw else cod_raw
        desc = str(row[1]).strip() if pd.notna(row[1]) else ""
        if not desc:
            continue
        unid = str(row[2]).strip() if pd.notna(row[2]) else "UN"
        if unid == "nan":
            unid = "UN"
        saldo = float(row[5]) if pd.notna(row[5]) else 0
        rows.append({"cod_sap": cod_sap, "descricao": desc, "unidade": unid, "saldo": saldo})

    # ── Group and classify ──
    groups = OrderedDict()
    for r in rows:
        groups.setdefault(r["cod_sap"], []).append(r)

    merged = []
    conflitos = []

    for cod_sap, items in sorted(groups.items()):
        unique_descs = list(OrderedDict.fromkeys(it["descricao"] for it in items))

        if len(unique_descs) == 1:
            total = sum(it["saldo"] for it in items)
            unid = max(it["unidade"] for it in items)
            merged.append({
                "cod_sap": cod_sap,
                "descricao": unique_descs[0],
                "unidade_medida": unid,
                "categoria": infer_categoria(unique_descs[0]),
                "saldo_atual": total,
                "estoque_minimo": 0,
            })
        else:
            for i, it in enumerate(items):
                dup_code = cod_sap if i == 0 else f"{cod_sap}_{chr(64 + i)}"
                merged.append({
                    "cod_sap": dup_code,
                    "descricao": f"[REVISAR] {it['descricao']}",
                    "unidade_medida": it["unidade"],
                    "categoria": infer_categoria(it["descricao"]),
                    "saldo_atual": it["saldo"],
                    "estoque_minimo": 0,
                })
                conflitos.append({
                    "cod_sap_original": cod_sap,
                    "cod_sap_importado": dup_code,
                    "descricao": it["descricao"],
                    "saldo": it["saldo"],
                })

    # ── Summary ──
    normais = [m for m in merged if "REVISAR" not in m["descricao"]]
    revisar = [m for m in merged if "REVISAR" in m["descricao"]]
    print(f"Materiais únicos: {len(normais)} (mesclados)")
    print(f"Conflitantes:     {len(revisar)} (separados com sufixo)")

    # ── Import ──
    print("\nLimpando dados anteriores...")
    requests.delete(
        f"{SUPABASE_URL}/rest/v1/materiais?cod_sap=neq._nonexistent_",
        headers=HEADERS,
    )
    time.sleep(1)

    print("Importando...")
    erros = 0
    for i, m in enumerate(merged):
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/materiais?on_conflict=cod_sap",
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
            json=m,
        )
        if r.status_code >= 400:
            print(f"  ERRO {m['cod_sap']}: {r.status_code} {r.text[:80]}")
            erros += 1
        if (i + 1) % 100 == 0:
            print(f"  ... {i+1}/{len(merged)}")
        time.sleep(DELAY)

    print(f"\n{len(merged) - erros}/{len(merged)} importados ({erros} erros)")

    # ── Conflict log ──
    if conflitos:
        print(f"\n{'='*70}")
        print("CODIGOS CONFLITANTES — PENDENTES DE REVISÃO")
        print(f"{'='*70}")
        for c in conflitos:
            print(f"  {c['cod_sap_original']:>10} → {c['cod_sap_importado']:<15}"
                  f" saldo={c['saldo']:>6}  | {c['descricao'][:55]}")

    # ── Verify ──
    r = requests.get(f"{SUPABASE_URL}/rest/v1/materiais?select=count", headers=HEADERS)
    print(f"\nTotal no banco: {r.json()[0]['count']} materiais")

    from collections import Counter
    r = requests.get(f"{SUPABASE_URL}/rest/v1/materiais?select=categoria", headers=HEADERS)
    cats = Counter(m["categoria"] for m in r.json())
    for cat, qtd in sorted(cats.items(), key=lambda x: -x[1]):
        print(f"  {cat}: {qtd}")


if __name__ == "__main__":
    main()
