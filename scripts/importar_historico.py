"""
Importa o histórico de movimentações das abas da planilha original
para a tabela movimentacoes no Supabase.

Campos obrigatórios: origem='HISTORICO_PLANILHA', afeta_saldo=false
Divergências de descrição marcam divergencia_cod_sap=true

Uso: python scripts/importar_historico.py
"""

import pandas as pd
import requests
import time
import re
from datetime import datetime
from collections import defaultdict

EXCEL_PATH = "/workspaces/emecbx2/ALMOXARIFADO ELETROMECANICA BXD2.xlsx"
SUPABASE_URL = "https://byxmnmebvqdxpzcuutak.supabase.co"
SUPABASE_KEY = "sb_publishable_ltY4BfcrdlBw91KH5BHfgg_ZHDurfuZ"
HEADERS = {
    "apikey": SUPABASE_KEY,
    "Authorization": f"Bearer {SUPABASE_KEY}",
    "Content-Type": "application/json",
    "Prefer": "return=minimal",
}
DELAY = 0.03

# ── Carregar materiais do banco para resolução de cod_sap ──
def carregar_materiais():
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/materiais?select=cod_sap,descricao",
        headers=HEADERS,
    )
    r.raise_for_status()
    materiais = {}
    for m in r.json():
        materiais[m["cod_sap"]] = m["descricao"]
    return materiais


# ── Util: parse de data ──
def parse_data(val):
    if pd.isna(val):
        return None
    val = str(val).strip()
    if not val or val.upper() in ("ANTIGO", "N/A", ""):
        return None
    # Tentar dd.mm.yy
    try:
        dt = datetime.strptime(val, "%d.%m.%y")
        return dt.isoformat()
    except ValueError:
        pass
    # Tentar dd/mm/yyyy
    try:
        dt = datetime.strptime(val, "%d/%m/%Y")
        return dt.isoformat()
    except ValueError:
        pass
    # Tentar iso yyyy-mm-dd
    try:
        dt = datetime.strptime(val[:10], "%Y-%m-%d")
        return dt.isoformat()
    except ValueError:
        pass
    return None


# ── Util: cod_sap limpo ──
def limpar_cod(val):
    if pd.isna(val):
        return None
    cod_raw = str(val).strip()
    if not cod_raw or cod_raw in ("0", "0.0"):
        return None
    cod = str(int(float(cod_raw))) if re.match(r"^\d+\.\d+$", cod_raw) else cod_raw
    # Remover sufixos de conflito se existirem
    cod = re.sub(r"_[A-Z]$", "", cod)
    return cod


# ── Util: descricao limpa ──
def limpar_desc(val):
    if pd.isna(val):
        return ""
    return str(val).strip()


# ── Util: float limpo ──
def limpar_float(val):
    if pd.isna(val):
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


# ── Resolver cod_sap: encontrar material correspondente ──
def resolver_cod(cod_original, descricao_hist, materiais):
    """Retorna (cod_sap_resolvido, divergencia)"""
    if not cod_original:
        return None, False

    # 1. Tentar match exato
    if cod_original in materiais:
        desc_mat = materiais[cod_original]
        divergencia = False
        if descricao_hist and desc_mat:
            # Normalizar para comparação
            dh = descricao_hist.upper().strip()
            dm = desc_mat.upper().strip()
            # Remover [REVISAR] prefix do material
            dm_clean = re.sub(r"^\[REVISAR\]\s*", "", dm)
            if dh != dm_clean and dh != dm:
                # Pode ser que o material seja um [REVISAR] e a descrição bata com a limpa
                divergencia = True
        return cod_original, divergencia

    # 2. Tentar com sufixo _A, _B...
    for suffix in ("_A", "_B", "_C", "_D"):
        candidate = cod_original + suffix
        if candidate in materiais:
            return candidate, False  # divergência já foi resolvida na importação dos materiais

    # 3. Não encontrou
    return None, False


# ── Importar uma aba ──
def importar_aba(sheet_name, tipo, column_map, materiais):
    """
    column_map: dict com chaves 'cod_sap', 'descricao', 'data', 'qtd',
                          'destino', 'solicitante', 'responsavel', 'obs'
                cada valor é o index da coluna (0-based) ou None
    """
    df = pd.read_excel(EXCEL_PATH, sheet_name=sheet_name, header=None)
    # Pular header row (linha 0)
    data = df.iloc[1:]

    registros = []
    sem_cod = 0
    sem_desc = 0
    importados = 0
    divergencias = []
    cod_nao_encontrado = 0

    for idx, row in data.iterrows():
        # Extrair campos
        cod_raw = row[column_map["cod_sap"]] if column_map.get("cod_sap") is not None else None
        cod_original = limpar_cod(cod_raw)

        descricao = limpar_desc(row[column_map["descricao"]]) if column_map.get("descricao") is not None else ""

        if not cod_original and not descricao:
            continue  # linha vazia

        if not cod_original:
            sem_cod += 1
            continue

        # Resolver cod_sap
        cod_resolvido, divergencia = resolver_cod(cod_original, descricao, materiais)
        if not cod_resolvido:
            cod_nao_encontrado += 1
            continue

        data_val = parse_data(row[column_map["data"]]) if column_map.get("data") is not None else None
        qtd = limpar_float(row[column_map["qtd"]]) if column_map.get("qtd") is not None else None

        if qtd is None or qtd <= 0:
            continue

        destino = str(row[column_map["destino"]]).strip() if column_map.get("destino") is not None and pd.notna(row[column_map["destino"]]) else ""
        solicitante = str(row[column_map["solicitante"]]).strip() if column_map.get("solicitante") is not None and pd.notna(row[column_map["solicitante"]]) else ""
        responsavel = str(row[column_map["responsavel"]]).strip() if column_map.get("responsavel") is not None and pd.notna(row[column_map["responsavel"]]) else ""
        obs = str(row[column_map["obs"]]).strip() if column_map.get("obs") is not None and pd.notna(row[column_map["obs"]]) else ""

        # Se tipo for AJUSTE e não tiver destino, usar "AJUSTE" como fallback
        if tipo == "AJUSTE" and not destino:
            destino = "AJUSTE"

        record = {
            "cod_sap": cod_resolvido,
            "tipo": tipo,
            "quantidade": qtd,
            "data": data_val or datetime.now().isoformat(),
            "destino": destino,
            "solicitante": solicitante,
            "responsavel": responsavel,
            "observacao": obs,
            "criado_por": "HISTORICO_PLANILHA",
            "origem": "HISTORICO_PLANILHA",
            "afeta_saldo": False,
            "divergencia_cod_sap": divergencia,
        }

        if divergencia:
            divergencias.append({
                "cod_sap": cod_resolvido,
                "descricao_planilha": descricao,
                "descricao_cadastro": materiais.get(cod_resolvido, ""),
            })

        registros.append(record)
        importados += 1

    return registros, {
        "importados": importados,
        "sem_cod": sem_cod,
        "sem_desc": sem_desc,
        "cod_nao_encontrado": cod_nao_encontrado,
    }, divergencias


# ── Enviar lote para Supabase ──
def enviar_lote(registros):
    if not registros:
        return 0, []
    erros = []
    # Inserir um por um por causa da trigger e constraints
    for i, rec in enumerate(registros):
        r = requests.post(
            f"{SUPABASE_URL}/rest/v1/movimentacoes",
            headers=HEADERS,
            json=rec,
        )
        if r.status_code >= 400:
            erros.append((rec["cod_sap"], r.status_code, r.text[:100]))
        if (i + 1) % 100 == 0:
            print(f"    ... {i+1}/{len(registros)}")
        time.sleep(DELAY)
    return len(registros) - len(erros), erros


# ── Main ──
def main():
    print("=" * 70)
    print("IMPORTAÇÃO DO HISTÓRICO DE MOVIMENTAÇÕES")
    print("=" * 70)

    # Carregar materiais do banco
    print("\nCarregando materiais cadastrados...")
    materiais = carregar_materiais()
    print(f"  {len(materiais)} materiais encontrados")

    # ── Configuração das abas ──
    # Colunas (0-based): A=0, B=1, C=2, ...
    abas = [
        {
            "sheet": "Entrada de Materiais",
            "tipo": "ENTRADA",
            "cols": {
                "data": 0,        # A = Data
                "cod_sap": 1,     # B = Cód.do Material
                "descricao": 2,   # C = Descrição do material
                "qtd": 3,         # D = Qntd.
                "destino": None,  # não tem
                "solicitante": None,
                "responsavel": 6, # G = Recebedor
                "obs": 7,         # H = Observações
            },
        },
        {
            "sheet": "SAIDA DE MATERIAIS",
            "tipo": "SAIDA",
            "cols": {
                "data": 0,        # A
                "cod_sap": 1,     # B
                "descricao": 2,   # C
                "qtd": 5,         # F (pula CONDIÇÃO e Baixa)
                "destino": 7,     # H
                "solicitante": 8, # I
                "responsavel": 9, # J
                "obs": 10,        # K
            },
        },
        {
            "sheet": "Ajustes de Saida",
            "tipo": "AJUSTE",
            "cols": {
                "data": 0,        # A
                "cod_sap": 1,     # B
                "descricao": 2,   # C
                "qtd": 5,         # F (pula CONDIÇÃO e Baixa)
                "destino": None,  # será "AJUSTE" fallback
                "solicitante": None,
                "responsavel": None,
                "obs": None,
            },
        },
        {
            "sheet": "Saidas até 28.02.2026",
            "tipo": "SAIDA",
            "cols": {
                "data": 0,
                "cod_sap": 1,
                "descricao": 2,
                "qtd": 5,
                "destino": 7,
                "solicitante": 8,
                "responsavel": 9,
                "obs": 10,
            },
        },
    ]

    total_geral = 0
    total_erros = 0
    todas_divergencias = []
    resumo_abas = []

    for aba in abas:
        print(f"\n{'='*70}")
        print(f"ABA: {aba['sheet']}  →  tipo={aba['tipo']}")
        print(f"{'='*70}")

        registros, stats, divergencias = importar_aba(
            aba["sheet"],
            aba["tipo"],
            aba["cols"],
            materiais,
        )

        print(f"  Registros para importar: {stats['importados']}")
        if stats['sem_cod'] > 0:
            print(f"  ⚠  {stats['sem_cod']} linhas sem código SAP (ignoradas)")
        if stats['cod_nao_encontrado'] > 0:
            print(f"  ⚠  {stats['cod_nao_encontrado']} códigos não encontrados no cadastro (ignorados)")

        print(f"  Enviando para Supabase...")
        ok, erros = enviar_lote(registros)

        total_geral += ok
        total_erros += len(erros)
        todas_divergencias.extend(divergencias)

        resumo_abas.append({
            "aba": aba["sheet"],
            "tipo": aba["tipo"],
            "total": ok,
            "erros": len(erros),
            "divergencias": len(divergencias),
        })

        if erros:
            print(f"  ❌ {len(erros)} erros:")
            for cod, status, msg in erros[:5]:
                print(f"     {cod}: HTTP {status} - {msg}")
            if len(erros) > 5:
                print(f"     ... e mais {len(erros)-5}")

    # ── Resumo final ──
    print(f"\n{'='*70}")
    print("RESUMO DA IMPORTAÇÃO")
    print(f"{'='*70}")
    for r in resumo_abas:
        div_str = f", {r['divergencias']} divergências" if r['divergencias'] > 0 else ""
        err_str = f", {r['erros']} erros" if r['erros'] > 0 else ""
        print(f"  {r['aba']:<30} → {r['total']:>4} registros ({r['tipo']}){div_str}{err_str}")
    print(f"\n  TOTAL: {total_geral} registros importados")
    if total_erros:
        print(f"  ERROS: {total_erros}")

    # ── Divergências ──
    if todas_divergencias:
        print(f"\n{'='*70}")
        print(f"DIVERGÊNCIAS DE CÓDIGO SAP ({len(todas_divergencias)} casos)")
        print("Código SAP com descrição divergente entre histórico e cadastro atual:")
        print(f"{'='*70}")
        for d in todas_divergencias:
            print(f"  {d['cod_sap']}")
            print(f"    Planilha:  {d['descricao_planilha'][:60]}")
            print(f"    Cadastro:  {d['descricao_cadastro'][:60]}")
            print()

    # ── Verificação ──
    print(f"\n{'='*70}")
    print("VERIFICAÇÃO PÓS-IMPORTAÇÃO")
    print(f"{'='*70}")

    # Total no banco
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/movimentacoes?select=count&origem=eq.HISTORICO_PLANILHA",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
    )
    total_hist = r.json()[0]["count"]
    print(f"  Registros com origem=HISTORICO_PLANILHA: {total_hist}")

    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/movimentacoes?select=count&origem=eq.SISTEMA",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
    )
    total_sis = r.json()[0]["count"]
    print(f"  Registros com origem=SISTEMA:            {total_sis}")

    # Amostra de 5 materiais para confirmar saldo
    r = requests.get(
        f"{SUPABASE_URL}/rest/v1/materiais?select=cod_sap,descricao,saldo_atual&order=cod_sap.asc&limit=5",
        headers={"apikey": SUPABASE_KEY, "Authorization": f"Bearer {SUPABASE_KEY}"},
    )
    print(f"\n  Amostra de saldos (5 primeiros materiais):")
    for m in r.json():
        print(f"    {m['cod_sap']:<15} {m['descricao'][:40]:<42} saldo={m['saldo_atual']}")


if __name__ == "__main__":
    main()
